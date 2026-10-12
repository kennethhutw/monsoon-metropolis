# Monsoon — Smart Contract PRD
**Version:** 1.0  
**Date:** 2026-07-30  
**Project:** Cleanverse Build: Trusted Assets Hackathon — RWA Track  
**Target Chain:** Monad Testnet (primary) · Base Testnet (fallback)  
**Language:** Solidity ^0.8.20  
**Framework:** Hardhat · OpenZeppelin · ethers.js

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Monsoon Contracts                  │
│                                                     │
│  ┌──────────────────────┐                           │
│  │  ComplianceRegistry  │◄── Cleanverse CVI Oracle  │
│  │  (Access Control)    │                           │
│  └──────────┬───────────┘                           │
│             │ whitelist check                        │
│             ▼                                        │
│  ┌──────────────────────┐   ┌─────────────────────┐ │
│  │    InvoiceAsset      │──►│   FinancingPool      │ │
│  │    (ERC-721 NFT)     │   │   (Lending Logic)    │ │
│  └──────────────────────┘   └─────────────────────┘ │
│             │                          │             │
│   CVA Token │                          │ CCP Events  │
│             ▼                          ▼             │
│        Monad Testnet Blockchain                      │
└─────────────────────────────────────────────────────┘
```

**Contract Interaction Flow:**
1. `ComplianceRegistry` gates all access — only CVI-verified wallets proceed
2. `InvoiceAsset` mints invoice NFTs with CVA metadata and transfer restrictions
3. `FinancingPool` accepts NFT collateral, manages disbursement and repayment
4. All critical events emit CCP-compatible audit logs

---

## 2. Contract 1 — ComplianceRegistry.sol

### 2.1 Purpose
Central whitelist of CVI-verified wallets. All other contracts query this registry before executing any state-changing function.

### 2.2 State Variables

```solidity
// Owner and admin management
address public owner;
mapping(address => bool) public admins;

// CVI Registry
mapping(address => CVIRecord) public cviRecords;

struct CVIRecord {
    bool isActive;
    uint256 issuedAt;
    uint256 expiresAt;       // 0 = no expiry
    string cviTokenId;       // Cleanverse CVI token reference
    bytes32 kybDataHash;     // Hash of off-chain KYB data
    RoleType role;           // EXPORTER | BUYER | BANK
}

enum RoleType { NONE, EXPORTER, BUYER, BANK, ADMIN }

// Revocation log
mapping(address => RevocationRecord[]) public revocationHistory;

struct RevocationRecord {
    uint256 revokedAt;
    string reason;
}
```

### 2.3 Events

```solidity
event CVIRegistered(address indexed wallet, RoleType role, string cviTokenId, uint256 issuedAt);
event CVIRevoked(address indexed wallet, string reason, uint256 revokedAt);
event CVIRenewed(address indexed wallet, uint256 newExpiresAt);
event AdminAdded(address indexed admin);
event AdminRemoved(address indexed admin);
```

### 2.4 Functions

```solidity
// ── Admin functions ──────────────────────────────────────────

/// @notice Register a CVI-verified wallet
/// @dev Only callable by admin (Cleanverse oracle or platform admin)
function registerCVI(
    address wallet,
    RoleType role,
    string calldata cviTokenId,
    bytes32 kybDataHash,
    uint256 expiresAt
) external onlyAdmin

/// @notice Revoke a wallet's CVI (e.g. AML hit, KYB expired)
function revokeCVI(
    address wallet,
    string calldata reason
) external onlyAdmin

/// @notice Renew an existing CVI with new expiry
function renewCVI(
    address wallet,
    uint256 newExpiresAt
) external onlyAdmin

/// @notice Add or remove admin addresses
function setAdmin(address admin, bool status) external onlyOwner

// ── View functions ────────────────────────────────────────────

/// @notice Check if wallet has active CVI (used by other contracts)
function isVerified(address wallet) external view returns (bool)

/// @notice Check if wallet has active CVI with specific role
function isVerifiedAs(address wallet, RoleType role) external view returns (bool)

/// @notice Get full CVI record for a wallet
function getCVIRecord(address wallet) external view returns (CVIRecord memory)

// ── Modifiers ─────────────────────────────────────────────────

modifier onlyAdmin()
modifier onlyVerified()
modifier onlyVerifiedAs(RoleType role)
```

### 2.5 Security Requirements
- Only `admin` addresses can register or revoke CVI — not self-service
- Expired CVI returns `isVerified = false` automatically
- `kybDataHash` stores SHA-256 of off-chain KYB documents for audit trail
- No PII stored on-chain

### 2.6 TODO — Production Integration
```solidity
// TODO: Replace admin-only registration with Cleanverse CVI Oracle
// Oracle will call registerCVI() automatically upon CVI issuance
// Interface: ICleanverseCVIOracle
```

---

## 3. Contract 2 — InvoiceAsset.sol

### 3.1 Purpose
ERC-721 NFT representing each verified invoice. Each token embeds CVA metadata, transfer restrictions, and full traceability. Minting is gated by ComplianceRegistry.

### 3.2 Inheritance

```solidity
contract InvoiceAsset is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
```

### 3.3 State Variables

```solidity
ComplianceRegistry public registry;

uint256 private _tokenIdCounter;

mapping(uint256 => InvoiceData) public invoices;
mapping(bytes32 => bool) public hashExists;          // Anti-double-financing
mapping(uint256 => FinancingStatus) public financingStatus;

struct InvoiceData {
    bytes32 invoiceHash;          // SHA-256(companyId + invoiceNumber + amount)
    uint256 amount;               // Invoice amount in USD (6 decimals)
    uint256 issuedAt;             // Invoice date (timestamp)
    uint256 dueDate;              // Payment due date (timestamp)
    address exporterWallet;       // CVI-verified seller wallet
    address buyerWallet;          // CVI-verified buyer wallet
    string cvaTokenId;            // Cleanverse CVA token reference
    bool buyerConfirmed;          // Notice of Assignment status
    uint256 confirmedAt;          // Timestamp of buyer confirmation
}

enum FinancingStatus {
    NONE,           // Not yet used as collateral
    COLLATERALIZED, // Locked in FinancingPool
    REPAID,         // Financing fully repaid, NFT released
    DEFAULTED       // Buyer failed to pay
}
```

### 3.4 Events

```solidity
event InvoiceMinted(
    uint256 indexed tokenId,
    bytes32 indexed invoiceHash,
    address indexed exporter,
    address buyer,
    uint256 amount,
    string cvaTokenId
);

event BuyerConfirmed(
    uint256 indexed tokenId,
    address indexed buyer,
    uint256 confirmedAt
);

event FinancingStatusUpdated(
    uint256 indexed tokenId,
    FinancingStatus oldStatus,
    FinancingStatus newStatus
);

event TransferBlocked(
    uint256 indexed tokenId,
    address from,
    address to,
    string reason
);
```

### 3.5 Functions

```solidity
// ── Minting ───────────────────────────────────────────────────

/// @notice Mint a new invoice NFT (exporter only)
/// @dev Checks: exporter CVI active, buyer CVI active, hash not duplicate
function mintInvoice(
    bytes32 invoiceHash,
    uint256 amount,
    uint256 dueDate,
    address buyerWallet,
    string calldata cvaTokenId,
    string calldata metadataURI       // IPFS URI with invoice metadata
) external returns (uint256 tokenId)

// ── Buyer Confirmation (NoA) ──────────────────────────────────

/// @notice Buyer confirms receivable — digital Notice of Assignment
/// @dev Only callable by the buyer wallet specified in InvoiceData
function confirmReceivable(uint256 tokenId) external

/// @notice Buyer disputes an invoice
function disputeReceivable(uint256 tokenId, string calldata reason) external

// ── Financing Pool Interface ──────────────────────────────────

/// @notice Lock NFT as collateral (called by FinancingPool)
function setCollateralized(uint256 tokenId) external onlyFinancingPool

/// @notice Release NFT after repayment (called by FinancingPool)
function setRepaid(uint256 tokenId) external onlyFinancingPool

/// @notice Mark NFT as defaulted (called by FinancingPool)
function setDefaulted(uint256 tokenId) external onlyFinancingPool

// ── Transfer Restrictions ─────────────────────────────────────

/// @notice Override ERC-721 transfer — only to CVI-verified wallets
/// @dev Collateralized tokens cannot be transferred at all
function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
) internal override

// ── View functions ────────────────────────────────────────────

function getInvoiceData(uint256 tokenId) external view returns (InvoiceData memory)
function isHashDuplicate(bytes32 hash) external view returns (bool)
function getExporterTokens(address exporter) external view returns (uint256[] memory)
function isBuyerConfirmed(uint256 tokenId) external view returns (bool)

// ── Admin ─────────────────────────────────────────────────────

function setFinancingPool(address pool) external onlyOwner
function setRegistry(address registry) external onlyOwner
```

### 3.6 Transfer Restriction Logic

```solidity
function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override {
    // Allow minting (from == address(0))
    if (from == address(0)) {
        super._beforeTokenTransfer(from, to, tokenId);
        return;
    }

    // Block transfer if collateralized
    require(
        financingStatus[tokenId] != FinancingStatus.COLLATERALIZED,
        "InvoiceAsset: token is locked as collateral"
    );

    // Block transfer to non-CVI wallets
    require(
        registry.isVerified(to),
        "InvoiceAsset: recipient must hold valid CVI"
    );

    emit TransferBlocked — only emitted if blocked

    super._beforeTokenTransfer(from, to, tokenId);
}
```

### 3.7 Anti-Double-Financing Logic

```solidity
function mintInvoice(..., bytes32 invoiceHash, ...) external {
    // Check duplicate BEFORE minting
    require(!hashExists[invoiceHash], "InvoiceAsset: invoice already financed");
    
    // Register hash atomically with mint
    hashExists[invoiceHash] = true;
    
    // ... rest of mint logic
}
```

### 3.8 TODO — Production Integration
```solidity
// TODO: Replace string cvaTokenId with on-chain CVA verification
// Call Cleanverse CVA Registry to verify token authenticity before mint
// Interface: ICleanverseCVARegistry.verify(cvaTokenId) returns (bool)
```

---

## 4. Contract 3 — FinancingPool.sol

### 4.1 Purpose
Manages the full financing lifecycle — bank deposits liquidity, exporter locks invoice NFT as collateral, pool disburses funds, buyer repays, pool auto-settles and releases NFT.

### 4.2 State Variables

```solidity
ComplianceRegistry public registry;
InvoiceAsset public invoiceAsset;
IERC20 public stablecoin;             // USDC on Monad Testnet

address public bankWallet;            // Authorized bank address (CVI verified)
uint256 public financingRateBps;      // Interest rate in basis points (e.g. 300 = 3%)
uint256 public advanceRateBps;        // Advance rate (e.g. 8000 = 80%)

mapping(uint256 => FinancingCase) public cases;  // tokenId => case
uint256[] public activeCaseIds;

struct FinancingCase {
    uint256 tokenId;
    address exporter;
    address buyer;
    uint256 invoiceAmount;       // Full invoice value
    uint256 advanceAmount;       // Disbursed to exporter
    uint256 repaymentAmount;     // advanceAmount + interest
    uint256 disbursedAt;
    uint256 dueDate;
    CaseStatus status;
    bytes32 ccpAuditHash;        // CCP Protocol audit reference
}

enum CaseStatus {
    PENDING_APPROVAL,    // Submitted, awaiting bank review
    APPROVED,            // Bank approved, ready to disburse
    DISBURSED,           // Funds sent to exporter
    REPAID,              // Buyer paid, case closed
    DEFAULTED,           // Past due, default triggered
    REJECTED             // Bank rejected
}
```

### 4.3 Events

```solidity
event CaseSubmitted(
    uint256 indexed caseId,
    uint256 indexed tokenId,
    address indexed exporter,
    uint256 invoiceAmount,
    uint256 advanceAmount
);

event CaseApproved(
    uint256 indexed caseId,
    address indexed approver,        // Bank wallet
    uint256 riskScore,               // Off-chain AI score (stored for audit)
    bytes32 ccpAuditHash
);

event CaseRejected(uint256 indexed caseId, string reason);

event FundsDisbursed(
    uint256 indexed caseId,
    address indexed exporter,
    uint256 amount,
    uint256 disbursedAt
);

event RepaymentReceived(
    uint256 indexed caseId,
    address indexed buyer,
    uint256 amount,
    uint256 repaidAt
);

event DefaultTriggered(uint256 indexed caseId, uint256 overdueBy);

event LiquidityDeposited(address indexed bank, uint256 amount);
event LiquidityWithdrawn(address indexed bank, uint256 amount);
```

### 4.4 Functions

```solidity
// ── Bank Liquidity Management ─────────────────────────────────

/// @notice Bank deposits USDC into financing pool
function depositLiquidity(uint256 amount) external onlyBank

/// @notice Bank withdraws idle liquidity
function withdrawLiquidity(uint256 amount) external onlyBank

// ── Exporter — Submit Case ────────────────────────────────────

/// @notice Exporter locks invoice NFT and submits financing request
/// @dev Requires: CVI active, buyer confirmed, NFT owned by exporter
function submitCase(uint256 tokenId) external returns (uint256 caseId)

// ── Bank — Approve / Reject ───────────────────────────────────

/// @notice Bank approves financing case
/// @param riskScore Off-chain AI risk score (stored for audit transparency)
/// @param ccpAuditHash Reference to CCP Protocol compliance report
function approveCase(
    uint256 caseId,
    uint256 riskScore,
    bytes32 ccpAuditHash
) external onlyBank

/// @notice Bank rejects financing case — NFT returned to exporter
function rejectCase(uint256 caseId, string calldata reason) external onlyBank

// ── Disbursement ──────────────────────────────────────────────

/// @notice Disburse advance amount to exporter (called after approval)
/// @dev Automatically called after approveCase, or manually triggered
function disburse(uint256 caseId) external onlyBank

// ── Repayment ─────────────────────────────────────────────────

/// @notice Buyer repays financing — triggers auto-settlement
/// @dev Accepts exact repaymentAmount in USDC
function repay(uint256 caseId) external

/// @notice Auto-settlement logic after repayment
/// @dev Distributes: bank principal + interest, releases NFT to exporter
function _settle(uint256 caseId) internal

// ── Default Handling ──────────────────────────────────────────

/// @notice Trigger default on overdue case
function triggerDefault(uint256 caseId) external onlyBank

// ── View Functions ────────────────────────────────────────────

function getCase(uint256 caseId) external view returns (FinancingCase memory)
function getActiveCases() external view returns (uint256[] memory)
function getPoolBalance() external view returns (uint256)
function calculateAdvanceAmount(uint256 invoiceAmount) external view returns (uint256)
function calculateRepaymentAmount(uint256 advanceAmount, uint256 tenure) external view returns (uint256)

// ── Admin ─────────────────────────────────────────────────────

function setAdvanceRate(uint256 newRateBps) external onlyOwner
function setFinancingRate(uint256 newRateBps) external onlyOwner
function setBankWallet(address newBank) external onlyOwner
```

### 4.5 Settlement Logic

```solidity
function _settle(uint256 caseId) internal {
    FinancingCase storage fc = cases[caseId];
    
    uint256 interest = fc.repaymentAmount - fc.advanceAmount;
    
    // 1. Return principal + interest to bank
    stablecoin.transfer(bankWallet, fc.repaymentAmount);
    
    // 2. Release NFT back to exporter
    invoiceAsset.setRepaid(fc.tokenId);
    invoiceAsset.safeTransferFrom(address(this), fc.exporter, fc.tokenId);
    
    // 3. Update case status
    fc.status = CaseStatus.REPAID;
    
    emit RepaymentReceived(caseId, msg.sender, fc.repaymentAmount, block.timestamp);
}
```

### 4.6 Advance Rate Calculation

```solidity
// Example: 80% advance on $100,000 invoice = $80,000 disbursed
// Interest: 3% annualized, 60-day tenure = $80,000 × 3% × (60/365) = $394.52

function calculateRepaymentAmount(
    uint256 advanceAmount,
    uint256 tenureDays
) public view returns (uint256) {
    uint256 interest = (advanceAmount * financingRateBps * tenureDays) / (10000 * 365);
    return advanceAmount + interest;
}
```

### 4.7 TODO — Production Integration
```solidity
// TODO: Replace mock USDC with real Monad/Base USDC address
// TODO: Integrate Cleanverse CCP Protocol for pre-transaction rule checks
// TODO: Add Travel Rule data emission on disburse() and repay()
// Interface: ICleanverseCCP.check(from, to, amount, travelRuleData)
```

---

## 5. Deployment Config

### 5.1 Contract Deployment Order
```
1. ComplianceRegistry.sol    (no dependencies)
2. InvoiceAsset.sol          (depends on ComplianceRegistry)
3. FinancingPool.sol         (depends on ComplianceRegistry + InvoiceAsset)

Post-deployment:
4. InvoiceAsset.setFinancingPool(FinancingPool.address)
5. ComplianceRegistry.setAdmin(platformAdmin)
6. Register initial bank wallet CVI
```

### 5.2 Hardhat Config

```typescript
// hardhat.config.ts
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    monadTestnet: {
      url: process.env.MONAD_RPC_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
      chainId: 41454,
    },
    baseTestnet: {
      url: "https://sepolia.base.org",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
      chainId: 84532,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
};
```

### 5.3 Environment Variables

```env
# Deployer
DEPLOYER_PRIVATE_KEY=0x...
DEPLOYER_ADDRESS=0x...

# Networks
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_EXPLORER_API=https://testnet.monadexplorer.com/api

# USDC (Mock on testnet)
MOCK_USDC_ADDRESS=0x_TODO

# Post-deploy (fill after deployment)
COMPLIANCE_REGISTRY_ADDRESS=0x_TODO
INVOICE_ASSET_ADDRESS=0x_TODO
FINANCING_POOL_ADDRESS=0x_TODO

# Cleanverse (TODO: Real keys after onboarding)
CLEANVERSE_API_KEY=mock_key
CLEANVERSE_CVI_ORACLE_ADDRESS=0x_TODO
```

---

## 6. Test Coverage Requirements

| Contract | Function | Test Cases |
|---|---|---|
| ComplianceRegistry | `registerCVI` | ✅ success, ❌ non-admin caller, ❌ duplicate wallet |
| ComplianceRegistry | `revokeCVI` | ✅ success, ❌ non-admin, ✅ emit event |
| ComplianceRegistry | `isVerified` | ✅ active CVI, ❌ revoked, ❌ expired, ❌ unregistered |
| InvoiceAsset | `mintInvoice` | ✅ success, ❌ no CVI, ❌ duplicate hash, ❌ buyer not CVI |
| InvoiceAsset | `confirmReceivable` | ✅ buyer confirms, ❌ wrong caller, ❌ already confirmed |
| InvoiceAsset | `_beforeTokenTransfer` | ❌ to non-CVI wallet, ❌ collateralized token, ✅ valid transfer |
| FinancingPool | `submitCase` | ✅ success, ❌ not confirmed, ❌ not NFT owner |
| FinancingPool | `approveCase` | ✅ bank approves, ❌ non-bank, ✅ emit CCP hash |
| FinancingPool | `repay` | ✅ full repayment, ❌ wrong amount, ✅ NFT released |
| FinancingPool | `_settle` | ✅ bank receives funds, ✅ NFT returned, ✅ status updated |

**Target:** 90%+ line coverage via Hardhat + chai

---

## 7. Security Checklist

- [ ] Reentrancy guard on `repay()` and `disburse()` (use OpenZeppelin `ReentrancyGuard`)
- [ ] Integer overflow protection (Solidity 0.8.x built-in)
- [ ] Access control: all state-changing functions gated by role checks
- [ ] No `tx.origin` usage — always `msg.sender`
- [ ] USDC transfer return value checked (`SafeERC20`)
- [ ] NFT transfer atomicity — no state change if transfer fails
- [ ] Events emitted for all state changes (audit trail)
- [ ] No selfdestruct
- [ ] Proxy pattern NOT used for hackathon (simplicity over upgradeability)

---

## 8. Development Phases

| Phase | Scope | Target |
|---|---|---|
| **Phase 1 — Hackathon** | All 3 contracts, mock USDC, Monad Testnet deploy | Aug 8–9, 2026 |
| **Phase 2 — CVI Oracle** | Real Cleanverse CVI oracle integration | Post-hackathon |
| **Phase 3 — CVA On-chain** | Real CVA Registry verification | Post-hackathon |
| **Phase 4 — CCP Protocol** | Travel Rule + compliance report emission | Q4 2026 |
| **Phase 5 — Audit** | External security audit before mainnet | Q1 2027 |

---

## 9. Contract Interface Summary (for App integration)

```typescript
// TypeScript interfaces for frontend integration

interface ComplianceRegistryInterface {
  isVerified(wallet: string): Promise<boolean>
  isVerifiedAs(wallet: string, role: number): Promise<boolean>
  getCVIRecord(wallet: string): Promise<CVIRecord>
}

interface InvoiceAssetInterface {
  mintInvoice(hash: bytes32, amount: bigint, dueDate: bigint, buyer: string, cvaId: string, uri: string): Promise<bigint>  // returns tokenId
  confirmReceivable(tokenId: bigint): Promise<void>
  getInvoiceData(tokenId: bigint): Promise<InvoiceData>
  isHashDuplicate(hash: bytes32): Promise<boolean>
}

interface FinancingPoolInterface {
  submitCase(tokenId: bigint): Promise<bigint>  // returns caseId
  getCase(caseId: bigint): Promise<FinancingCase>
  repay(caseId: bigint): Promise<void>
  getPoolBalance(): Promise<bigint>
  calculateRepaymentAmount(advance: bigint, tenure: bigint): Promise<bigint>
}
```

---

*Monsoon Smart Contract PRD v1.0 — Kenneth / Taiwan Financial Training Institute*
