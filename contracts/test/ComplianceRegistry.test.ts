import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

const { viem, networkHelpers } = await network.create();

const RoleType = { NONE: 0, EXPORTER: 1, BUYER: 2, BANK: 3, ADMIN: 4 } as const;
const KYB_HASH = keccak256(toBytes("kyb-doc-001"));
const CVI_TOKEN_ID = "cvi-001";

describe("ComplianceRegistry", () => {
  async function deployFixture() {
    const [owner, admin, exporter, buyer, stranger] = await viem.getWalletClients();

    const registry = await viem.deployContract("ComplianceRegistry", [owner.account.address]);
    await registry.write.setAdmin([admin.account.address, true], { account: owner.account });

    return { registry, owner, admin, exporter, buyer, stranger };
  }

  it("lets an admin register a CVI, activating isVerified/isVerifiedAs", async () => {
    const { registry, admin, exporter } = await networkHelpers.loadFixture(deployFixture);

    await registry.write.registerCVI(
      [exporter.account.address, RoleType.EXPORTER, CVI_TOKEN_ID, KYB_HASH, 0n],
      { account: admin.account },
    );

    assert.equal(await registry.read.isVerified([exporter.account.address]), true);
    assert.equal(await registry.read.isVerifiedAs([exporter.account.address, RoleType.EXPORTER]), true);
    assert.equal(await registry.read.isVerifiedAs([exporter.account.address, RoleType.BUYER]), false);
  });

  it("rejects registerCVI from a non-admin caller", async () => {
    const { registry, exporter, stranger } = await networkHelpers.loadFixture(deployFixture);

    await viem.assertions.revertWith(
      registry.write.registerCVI(
        [exporter.account.address, RoleType.EXPORTER, CVI_TOKEN_ID, KYB_HASH, 0n],
        { account: stranger.account },
      ),
      "ComplianceRegistry: caller is not admin",
    );
  });

  it("lets an admin revoke an active CVI and emits CVIRevoked", async () => {
    const { registry, admin, exporter } = await networkHelpers.loadFixture(deployFixture);

    await registry.write.registerCVI(
      [exporter.account.address, RoleType.EXPORTER, CVI_TOKEN_ID, KYB_HASH, 0n],
      { account: admin.account },
    );

    await viem.assertions.emitWithArgs(
      registry.write.revokeCVI([exporter.account.address, "AML hit"], { account: admin.account }),
      registry,
      "CVIRevoked",
      [exporter.account.address, "AML hit", (revokedAt: bigint) => revokedAt > 0n],
    );

    assert.equal(await registry.read.isVerified([exporter.account.address]), false);
  });

  it("rejects revokeCVI from a non-admin caller", async () => {
    const { registry, admin, exporter, stranger } = await networkHelpers.loadFixture(deployFixture);

    await registry.write.registerCVI(
      [exporter.account.address, RoleType.EXPORTER, CVI_TOKEN_ID, KYB_HASH, 0n],
      { account: admin.account },
    );

    await viem.assertions.revertWith(
      registry.write.revokeCVI([exporter.account.address, "AML hit"], { account: stranger.account }),
      "ComplianceRegistry: caller is not admin",
    );
  });

  it("isVerified is false for a wallet that was never registered", async () => {
    const { registry, stranger } = await networkHelpers.loadFixture(deployFixture);
    assert.equal(await registry.read.isVerified([stranger.account.address]), false);
  });

  it("isVerified is false once expiresAt has passed", async () => {
    const { registry, admin, exporter } = await networkHelpers.loadFixture(deployFixture);

    const latest = await networkHelpers.time.latest();
    const expiresAt = BigInt(latest) + 60n;

    await registry.write.registerCVI(
      [exporter.account.address, RoleType.EXPORTER, CVI_TOKEN_ID, KYB_HASH, expiresAt],
      { account: admin.account },
    );

    assert.equal(await registry.read.isVerified([exporter.account.address]), true);

    await networkHelpers.time.increaseTo(expiresAt + 1n);

    assert.equal(await registry.read.isVerified([exporter.account.address]), false);
  });

  it("only the owner can add/remove admins", async () => {
    const { registry, exporter, stranger } = await networkHelpers.loadFixture(deployFixture);

    // Ownable (OZ v5) reverts with the custom error OwnableUnauthorizedAccount,
    // not a require() string reason.
    await viem.assertions.revertWithCustomError(
      registry.write.setAdmin([exporter.account.address, true], { account: stranger.account }),
      registry,
      "OwnableUnauthorizedAccount",
    );
  });
});
