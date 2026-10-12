// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ComplianceRegistry
/// @notice Central whitelist of CVI-verified wallets. InvoiceAsset and FinancingPool
///         query this registry before executing any state-changing function.
/// @dev TODO (production): Replace admin-only registration with the Cleanverse CVI
///      Oracle. The oracle would call registerCVI() automatically upon CVI issuance.
///      Interface: ICleanverseCVIOracle.
contract ComplianceRegistry is Ownable {
    enum RoleType {
        NONE,
        EXPORTER,
        BUYER,
        BANK,
        ADMIN
    }

    struct CVIRecord {
        bool isActive;
        uint256 issuedAt;
        uint256 expiresAt; // 0 = no expiry
        string cviTokenId; // Cleanverse CVI token reference
        bytes32 kybDataHash; // Hash of off-chain KYB data — no PII stored on-chain
        RoleType role;
    }

    struct RevocationRecord {
        uint256 revokedAt;
        string reason;
    }

    mapping(address => bool) public admins;
    mapping(address => CVIRecord) public cviRecords;
    mapping(address => RevocationRecord[]) public revocationHistory;

    event CVIRegistered(address indexed wallet, RoleType role, string cviTokenId, uint256 issuedAt);
    event CVIRevoked(address indexed wallet, string reason, uint256 revokedAt);
    event CVIRenewed(address indexed wallet, uint256 newExpiresAt);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    modifier onlyAdmin() {
        require(admins[msg.sender], "ComplianceRegistry: caller is not admin");
        _;
    }

    modifier onlyVerified() {
        require(isVerified(msg.sender), "ComplianceRegistry: caller not CVI-verified");
        _;
    }

    modifier onlyVerifiedAs(RoleType role) {
        require(isVerifiedAs(msg.sender, role), "ComplianceRegistry: caller not verified for role");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ── Admin functions ──────────────────────────────────────────

    /// @notice Register a CVI-verified wallet
    /// @dev Only callable by admin (Cleanverse oracle or platform admin)
    function registerCVI(
        address wallet,
        RoleType role,
        string calldata cviTokenId,
        bytes32 kybDataHash,
        uint256 expiresAt
    ) external onlyAdmin {
        require(wallet != address(0), "ComplianceRegistry: zero address");
        require(role != RoleType.NONE, "ComplianceRegistry: invalid role");

        cviRecords[wallet] = CVIRecord({
            isActive: true,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            cviTokenId: cviTokenId,
            kybDataHash: kybDataHash,
            role: role
        });

        emit CVIRegistered(wallet, role, cviTokenId, block.timestamp);
    }

    /// @notice Revoke a wallet's CVI (e.g. AML hit, KYB expired)
    function revokeCVI(address wallet, string calldata reason) external onlyAdmin {
        require(cviRecords[wallet].isActive, "ComplianceRegistry: not active");

        cviRecords[wallet].isActive = false;
        revocationHistory[wallet].push(RevocationRecord({revokedAt: block.timestamp, reason: reason}));

        emit CVIRevoked(wallet, reason, block.timestamp);
    }

    /// @notice Renew an existing CVI with new expiry
    function renewCVI(address wallet, uint256 newExpiresAt) external onlyAdmin {
        require(cviRecords[wallet].issuedAt != 0, "ComplianceRegistry: wallet never registered");

        cviRecords[wallet].isActive = true;
        cviRecords[wallet].expiresAt = newExpiresAt;

        emit CVIRenewed(wallet, newExpiresAt);
    }

    /// @notice Add or remove admin addresses
    function setAdmin(address admin, bool status) external onlyOwner {
        require(admin != address(0), "ComplianceRegistry: zero address");
        admins[admin] = status;

        if (status) {
            emit AdminAdded(admin);
        } else {
            emit AdminRemoved(admin);
        }
    }

    // ── View functions ────────────────────────────────────────────

    /// @notice Check if wallet has active, non-expired CVI (used by other contracts)
    function isVerified(address wallet) public view returns (bool) {
        CVIRecord storage record = cviRecords[wallet];
        if (!record.isActive) {
            return false;
        }
        if (record.expiresAt != 0 && record.expiresAt <= block.timestamp) {
            return false;
        }
        return true;
    }

    /// @notice Check if wallet has active CVI with specific role
    function isVerifiedAs(address wallet, RoleType role) public view returns (bool) {
        return isVerified(wallet) && cviRecords[wallet].role == role;
    }

    /// @notice Get full CVI record for a wallet
    function getCVIRecord(address wallet) external view returns (CVIRecord memory) {
        return cviRecords[wallet];
    }

    /// @notice Get the number of revocation events recorded for a wallet
    function getRevocationCount(address wallet) external view returns (uint256) {
        return revocationHistory[wallet].length;
    }
}
