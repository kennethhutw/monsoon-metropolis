import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

const { viem, networkHelpers } = await network.create();

const RoleType = { NONE: 0, EXPORTER: 1, BUYER: 2, BANK: 3, ADMIN: 4 } as const;
const CaseStatus = {
  PENDING_APPROVAL: 0,
  APPROVED: 1,
  DISBURSED: 2,
  REPAID: 3,
  DEFAULTED: 4,
  REJECTED: 5,
} as const;

const KYB_HASH = keccak256(toBytes("kyb-doc-001"));
const CVI_TOKEN_ID = "cvi-001";
const CVA_TOKEN_ID = "cva-001";
const INVOICE_AMOUNT = 100_000_000_000n; // $100,000 at 6 decimals
const METADATA_URI = "ipfs://invoice-metadata";
const ADVANCE_RATE_BPS = 8000n; // 80%
const FINANCING_RATE_BPS = 300n; // 3% annualized
const POOL_LIQUIDITY = 1_000_000_000_000n; // $1,000,000 at 6 decimals

async function futureDueDate(daysFromNow = 60) {
  const latest = await networkHelpers.time.latest();
  return BigInt(latest + daysFromNow * 24 * 60 * 60);
}

describe("FinancingPool", () => {
  async function deployFixture() {
    const [owner, admin, exporter, buyer, bank, stranger] = await viem.getWalletClients();

    const registry = await viem.deployContract("ComplianceRegistry", [owner.account.address]);
    await registry.write.setAdmin([admin.account.address, true], { account: owner.account });

    const invoiceAsset = await viem.deployContract("InvoiceAsset", [owner.account.address, registry.address]);
    const usdc = await viem.deployContract("MockUSDC", []);

    const pool = await viem.deployContract("FinancingPool", [
      owner.account.address,
      registry.address,
      invoiceAsset.address,
      usdc.address,
      bank.account.address,
      FINANCING_RATE_BPS,
      ADVANCE_RATE_BPS,
    ]);

    await invoiceAsset.write.setFinancingPool([pool.address], { account: owner.account });

    await registry.write.registerCVI(
      [exporter.account.address, RoleType.EXPORTER, CVI_TOKEN_ID, KYB_HASH, 0n],
      { account: admin.account },
    );
    await registry.write.registerCVI([buyer.account.address, RoleType.BUYER, CVI_TOKEN_ID, KYB_HASH, 0n], {
      account: admin.account,
    });
    await registry.write.registerCVI([bank.account.address, RoleType.BANK, CVI_TOKEN_ID, KYB_HASH, 0n], {
      account: admin.account,
    });

    // Fund the bank with mock USDC and have it deposit liquidity into the pool.
    await usdc.write.mint([bank.account.address, POOL_LIQUIDITY]);
    await usdc.write.approve([pool.address, POOL_LIQUIDITY], { account: bank.account });
    await pool.write.depositLiquidity([POOL_LIQUIDITY], { account: bank.account });

    return { registry, invoiceAsset, usdc, pool, owner, admin, exporter, buyer, bank, stranger };
  }

  async function confirmedInvoiceFixture() {
    const base = await deployFixture();
    const dueDate = await futureDueDate();
    const hash = keccak256(toBytes("invoice-001"));

    await base.invoiceAsset.write.mintInvoice(
      [hash, INVOICE_AMOUNT, dueDate, base.buyer.account.address, CVA_TOKEN_ID, METADATA_URI],
      { account: base.exporter.account },
    );
    await base.invoiceAsset.write.confirmReceivable([1n], { account: base.buyer.account });
    await base.invoiceAsset.write.approve([base.pool.address, 1n], { account: base.exporter.account });

    return { ...base, tokenId: 1n, dueDate };
  }

  async function submittedCaseFixture() {
    const base = await confirmedInvoiceFixture();
    await base.pool.write.submitCase([base.tokenId], { account: base.exporter.account });
    return { ...base, caseId: 1n };
  }

  async function approvedCaseFixture() {
    const base = await submittedCaseFixture();
    await base.pool.write.approveCase([base.caseId, 42n, keccak256(toBytes("ccp-report-001"))], {
      account: base.bank.account,
    });
    return base;
  }

  async function disbursedCaseFixture() {
    const base = await approvedCaseFixture();
    await base.pool.write.disburse([base.caseId], { account: base.bank.account });
    return base;
  }

  it("lets a CVI-verified exporter submit a confirmed, owned invoice as collateral", async () => {
    const { pool, invoiceAsset, exporter, tokenId, caseId } = await networkHelpers.loadFixture(
      submittedCaseFixture,
    );

    assert.equal((await invoiceAsset.read.ownerOf([tokenId])).toLowerCase(), pool.address.toLowerCase());

    const financingCase = await pool.read.getCase([caseId]);
    assert.equal(financingCase.status, CaseStatus.PENDING_APPROVAL);
    assert.equal(financingCase.advanceAmount, (INVOICE_AMOUNT * ADVANCE_RATE_BPS) / 10000n);
    assert.equal(financingCase.exporter.toLowerCase(), exporter.account.address.toLowerCase());
  });

  it("rejects submitCase when the buyer has not confirmed the receivable", async () => {
    const base = await networkHelpers.loadFixture(deployFixture);
    const dueDate = await futureDueDate();
    const hash = keccak256(toBytes("invoice-unconfirmed"));

    await base.invoiceAsset.write.mintInvoice(
      [hash, INVOICE_AMOUNT, dueDate, base.buyer.account.address, CVA_TOKEN_ID, METADATA_URI],
      { account: base.exporter.account },
    );
    await base.invoiceAsset.write.approve([base.pool.address, 1n], { account: base.exporter.account });

    await viem.assertions.revertWith(
      base.pool.write.submitCase([1n], { account: base.exporter.account }),
      "FinancingPool: receivable not confirmed by buyer",
    );
  });

  it("rejects submitCase from a wallet that does not own the token", async () => {
    const { pool, stranger, tokenId } = await networkHelpers.loadFixture(confirmedInvoiceFixture);

    await viem.assertions.revert(pool.write.submitCase([tokenId], { account: stranger.account }));
  });

  it("lets the bank approve a pending case and emits CaseApproved with the CCP hash", async () => {
    const { pool, bank, caseId } = await networkHelpers.loadFixture(submittedCaseFixture);
    const ccpHash = keccak256(toBytes("ccp-report-001"));

    await viem.assertions.emitWithArgs(
      pool.write.approveCase([caseId, 42n, ccpHash], { account: bank.account }),
      pool,
      "CaseApproved",
      [caseId, bank.account.address, 42n, ccpHash],
    );

    const financingCase = await pool.read.getCase([caseId]);
    assert.equal(financingCase.status, CaseStatus.APPROVED);
  });

  it("rejects approveCase from a non-bank caller", async () => {
    const { pool, stranger, caseId } = await networkHelpers.loadFixture(submittedCaseFixture);

    await viem.assertions.revertWith(
      pool.write.approveCase([caseId, 42n, keccak256(toBytes("ccp"))], { account: stranger.account }),
      "FinancingPool: caller is not bank",
    );
  });

  it("settles repayment in full: bank receives principal + interest, NFT returns to exporter", async () => {
    const { pool, invoiceAsset, usdc, bank, buyer, exporter, tokenId, caseId } = await networkHelpers.loadFixture(
      disbursedCaseFixture,
    );

    const financingCase = await pool.read.getCase([caseId]);
    const repaymentAmount = financingCase.repaymentAmount;
    assert.ok(repaymentAmount > financingCase.advanceAmount, "repayment should include interest");

    await usdc.write.mint([buyer.account.address, repaymentAmount]);
    await usdc.write.approve([pool.address, repaymentAmount], { account: buyer.account });

    const bankBalanceBefore = await usdc.read.balanceOf([bank.account.address]);

    await viem.assertions.emitWithArgs(
      pool.write.repay([caseId], { account: buyer.account }),
      pool,
      "RepaymentReceived",
      [caseId, buyer.account.address, repaymentAmount, (repaidAt: bigint) => repaidAt > 0n],
    );

    const bankBalanceAfter = await usdc.read.balanceOf([bank.account.address]);
    assert.equal(bankBalanceAfter - bankBalanceBefore, repaymentAmount);

    assert.equal((await invoiceAsset.read.ownerOf([tokenId])).toLowerCase(), exporter.account.address.toLowerCase());

    const settledCase = await pool.read.getCase([caseId]);
    assert.equal(settledCase.status, CaseStatus.REPAID);
  });

  it("rejects repay with an insufficient (unapproved / wrong) amount", async () => {
    const { pool, usdc, buyer, caseId } = await networkHelpers.loadFixture(disbursedCaseFixture);

    const financingCase = await pool.read.getCase([caseId]);

    // Buyer only approves half the required repayment amount.
    const shortAmount = financingCase.repaymentAmount / 2n;
    await usdc.write.mint([buyer.account.address, shortAmount]);
    await usdc.write.approve([pool.address, shortAmount], { account: buyer.account });

    // SafeERC20 bubbles up the underlying ERC20 custom error (insufficient allowance).
    await viem.assertions.revertWithCustomError(
      pool.write.repay([caseId], { account: buyer.account }),
      usdc,
      "ERC20InsufficientAllowance",
    );
  });
});
