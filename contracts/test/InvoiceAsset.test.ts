import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

const { viem, networkHelpers } = await network.create();

const RoleType = { NONE: 0, EXPORTER: 1, BUYER: 2, BANK: 3, ADMIN: 4 } as const;
const KYB_HASH = keccak256(toBytes("kyb-doc-001"));
const CVI_TOKEN_ID = "cvi-001";
const CVA_TOKEN_ID = "cva-001";
const INVOICE_AMOUNT = 100_000_000_000n; // $100,000 at 6 decimals
const METADATA_URI = "ipfs://invoice-metadata";

async function futureDueDate(daysFromNow = 60) {
  const latest = await networkHelpers.time.latest();
  return BigInt(latest + daysFromNow * 24 * 60 * 60);
}

function invoiceHashFor(label: string) {
  return keccak256(toBytes(label));
}

describe("InvoiceAsset", () => {
  async function deployFixture() {
    const [owner, admin, exporter, buyer, stranger] = await viem.getWalletClients();

    const registry = await viem.deployContract("ComplianceRegistry", [owner.account.address]);
    await registry.write.setAdmin([admin.account.address, true], { account: owner.account });

    const invoiceAsset = await viem.deployContract("InvoiceAsset", [owner.account.address, registry.address]);

    // Register exporter + buyer as CVI-verified; `stranger` deliberately left unverified.
    await registry.write.registerCVI(
      [exporter.account.address, RoleType.EXPORTER, CVI_TOKEN_ID, KYB_HASH, 0n],
      { account: admin.account },
    );
    await registry.write.registerCVI([buyer.account.address, RoleType.BUYER, CVI_TOKEN_ID, KYB_HASH, 0n], {
      account: admin.account,
    });

    return { registry, invoiceAsset, owner, admin, exporter, buyer, stranger };
  }

  async function mintedFixture() {
    const base = await deployFixture();
    const dueDate = await futureDueDate();

    const hash = invoiceHashFor("invoice-001");
    await base.invoiceAsset.write.mintInvoice(
      [hash, INVOICE_AMOUNT, dueDate, base.buyer.account.address, CVA_TOKEN_ID, METADATA_URI],
      { account: base.exporter.account },
    );

    return { ...base, tokenId: 1n, invoiceHash: hash, dueDate };
  }

  it("mints an invoice NFT to the exporter when both parties are CVI-verified", async () => {
    const { invoiceAsset, exporter, buyer, tokenId } = await networkHelpers.loadFixture(mintedFixture);

    assert.equal(
      (await invoiceAsset.read.ownerOf([tokenId])).toLowerCase(),
      exporter.account.address.toLowerCase(),
    );

    const data = await invoiceAsset.read.getInvoiceData([tokenId]);
    assert.equal(data.exporterWallet.toLowerCase(), exporter.account.address.toLowerCase());
    assert.equal(data.buyerWallet.toLowerCase(), buyer.account.address.toLowerCase());
    assert.equal(data.amount, INVOICE_AMOUNT);
    assert.equal(data.buyerConfirmed, false);
  });

  it("rejects minting when the exporter is not CVI-verified", async () => {
    const { invoiceAsset, buyer, stranger } = await networkHelpers.loadFixture(deployFixture);
    const dueDate = await futureDueDate();

    await viem.assertions.revertWith(
      invoiceAsset.write.mintInvoice(
        [invoiceHashFor("invoice-002"), INVOICE_AMOUNT, dueDate, buyer.account.address, CVA_TOKEN_ID, METADATA_URI],
        { account: stranger.account },
      ),
      "InvoiceAsset: exporter not CVI-verified",
    );
  });

  it("rejects minting when the buyer is not CVI-verified", async () => {
    const { invoiceAsset, exporter, stranger } = await networkHelpers.loadFixture(deployFixture);
    const dueDate = await futureDueDate();

    await viem.assertions.revertWith(
      invoiceAsset.write.mintInvoice(
        [
          invoiceHashFor("invoice-003"),
          INVOICE_AMOUNT,
          dueDate,
          stranger.account.address,
          CVA_TOKEN_ID,
          METADATA_URI,
        ],
        { account: exporter.account },
      ),
      "InvoiceAsset: buyer not CVI-verified",
    );
  });

  it("rejects minting the same invoice hash twice (anti-double-financing)", async () => {
    const { invoiceAsset, exporter, buyer, invoiceHash } = await networkHelpers.loadFixture(mintedFixture);
    const dueDate = await futureDueDate();

    assert.equal(await invoiceAsset.read.isHashDuplicate([invoiceHash]), true);

    await viem.assertions.revertWith(
      invoiceAsset.write.mintInvoice(
        [invoiceHash, INVOICE_AMOUNT, dueDate, buyer.account.address, CVA_TOKEN_ID, METADATA_URI],
        { account: exporter.account },
      ),
      "InvoiceAsset: invoice already financed",
    );
  });

  it("lets the buyer confirm a receivable (Notice of Assignment)", async () => {
    const { invoiceAsset, buyer, tokenId } = await networkHelpers.loadFixture(mintedFixture);

    await viem.assertions.emitWithArgs(
      invoiceAsset.write.confirmReceivable([tokenId], { account: buyer.account }),
      invoiceAsset,
      "BuyerConfirmed",
      [tokenId, buyer.account.address, (confirmedAt: bigint) => confirmedAt > 0n],
    );

    assert.equal(await invoiceAsset.read.isBuyerConfirmed([tokenId]), true);
  });

  it("rejects confirmReceivable from a wallet that is not the named buyer", async () => {
    const { invoiceAsset, exporter, tokenId } = await networkHelpers.loadFixture(mintedFixture);

    await viem.assertions.revertWith(
      invoiceAsset.write.confirmReceivable([tokenId], { account: exporter.account }),
      "InvoiceAsset: caller is not the buyer",
    );
  });

  it("rejects confirming the same receivable twice", async () => {
    const { invoiceAsset, buyer, tokenId } = await networkHelpers.loadFixture(mintedFixture);

    await invoiceAsset.write.confirmReceivable([tokenId], { account: buyer.account });

    await viem.assertions.revertWith(
      invoiceAsset.write.confirmReceivable([tokenId], { account: buyer.account }),
      "InvoiceAsset: already confirmed",
    );
  });

  it("blocks transfer to a wallet without a valid CVI", async () => {
    const { invoiceAsset, exporter, stranger, tokenId } = await networkHelpers.loadFixture(mintedFixture);

    await viem.assertions.revertWith(
      invoiceAsset.write.transferFrom([exporter.account.address, stranger.account.address, tokenId], {
        account: exporter.account,
      }),
      "InvoiceAsset: recipient must hold valid CVI",
    );
  });

  it("blocks transfer of a collateralized token even to a CVI-verified wallet", async () => {
    const { invoiceAsset, owner, exporter, buyer, stranger, tokenId } = await networkHelpers.loadFixture(
      mintedFixture,
    );

    // Simulate the FinancingPool role with `stranger`'s address so this test
    // stays isolated from the FinancingPool contract itself.
    await invoiceAsset.write.setFinancingPool([stranger.account.address], { account: owner.account });
    await invoiceAsset.write.setCollateralized([tokenId], { account: stranger.account });

    await viem.assertions.revertWith(
      invoiceAsset.write.transferFrom([exporter.account.address, buyer.account.address, tokenId], {
        account: exporter.account,
      }),
      "InvoiceAsset: token is locked as collateral",
    );
  });

  it("allows transfer to a CVI-verified wallet when not collateralized", async () => {
    const { invoiceAsset, exporter, buyer, tokenId } = await networkHelpers.loadFixture(mintedFixture);

    await invoiceAsset.write.transferFrom([exporter.account.address, buyer.account.address, tokenId], {
      account: exporter.account,
    });

    assert.equal((await invoiceAsset.read.ownerOf([tokenId])).toLowerCase(), buyer.account.address.toLowerCase());
  });
});
