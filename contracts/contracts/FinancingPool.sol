// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ComplianceRegistry} from "./ComplianceRegistry.sol";
import {InvoiceAsset} from "./InvoiceAsset.sol";

/// @title FinancingPool
/// @notice Manages the full financing lifecycle — bank deposits liquidity,
///         exporter locks an invoice NFT as collateral, the pool disburses
///         funds, the buyer repays, and the pool auto-settles and releases
///         the NFT.
/// @dev TODO (production): Replace mock USDC with the real Monad/Base USDC
///      address. Integrate Cleanverse CCP Protocol for pre-transaction rule
///      checks. Add Travel Rule data emission on disburse() and repay().
///      Interface: ICleanverseCCP.check(from, to, amount, travelRuleData).
contract FinancingPool is Ownable, ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;

    enum CaseStatus {
        PENDING_APPROVAL, // Submitted, awaiting bank review
        APPROVED, // Bank approved, ready to disburse
        DISBURSED, // Funds sent to exporter
        REPAID, // Buyer paid, case closed
        DEFAULTED, // Past due, default triggered
        REJECTED // Bank rejected
    }

    struct FinancingCase {
        uint256 tokenId;
        address exporter;
        address buyer;
        uint256 invoiceAmount; // Full invoice value
        uint256 advanceAmount; // Disbursed to exporter
        uint256 repaymentAmount; // advanceAmount + interest
        uint256 disbursedAt;
        uint256 dueDate;
        CaseStatus status;
        bytes32 ccpAuditHash; // CCP Protocol audit reference
    }

    ComplianceRegistry public registry;
    InvoiceAsset public invoiceAsset;
    IERC20 public stablecoin; // USDC on Monad Testnet

    address public bankWallet; // Authorized bank address (CVI verified)
    uint256 public financingRateBps; // Interest rate in basis points (e.g. 300 = 3%)
    uint256 public advanceRateBps; // Advance rate (e.g. 8000 = 80%)

    uint256 private _caseIdCounter;
    mapping(uint256 => FinancingCase) public cases; // caseId => case
    uint256[] public activeCaseIds;

    event CaseSubmitted(
        uint256 indexed caseId,
        uint256 indexed tokenId,
        address indexed exporter,
        uint256 invoiceAmount,
        uint256 advanceAmount
    );

    event CaseApproved(
        uint256 indexed caseId,
        address indexed approver, // Bank wallet
        uint256 riskScore, // Off-chain AI score (stored for audit via this event)
        bytes32 ccpAuditHash
    );

    event CaseRejected(uint256 indexed caseId, string reason);

    event FundsDisbursed(uint256 indexed caseId, address indexed exporter, uint256 amount, uint256 disbursedAt);

    event RepaymentReceived(uint256 indexed caseId, address indexed buyer, uint256 amount, uint256 repaidAt);

    event DefaultTriggered(uint256 indexed caseId, uint256 overdueBy);

    event LiquidityDeposited(address indexed bank, uint256 amount);
    event LiquidityWithdrawn(address indexed bank, uint256 amount);

    modifier onlyBank() {
        require(msg.sender == bankWallet, "FinancingPool: caller is not bank");
        _;
    }

    constructor(
        address initialOwner,
        address registryAddress,
        address invoiceAssetAddress,
        address stablecoinAddress,
        address bankWalletAddress,
        uint256 initialFinancingRateBps,
        uint256 initialAdvanceRateBps
    ) Ownable(initialOwner) {
        require(registryAddress != address(0), "FinancingPool: zero address");
        require(invoiceAssetAddress != address(0), "FinancingPool: zero address");
        require(stablecoinAddress != address(0), "FinancingPool: zero address");
        require(bankWalletAddress != address(0), "FinancingPool: zero address");
        require(initialAdvanceRateBps <= 10000, "FinancingPool: advance rate exceeds 100%");

        registry = ComplianceRegistry(registryAddress);
        invoiceAsset = InvoiceAsset(invoiceAssetAddress);
        stablecoin = IERC20(stablecoinAddress);
        bankWallet = bankWalletAddress;
        financingRateBps = initialFinancingRateBps;
        advanceRateBps = initialAdvanceRateBps;
    }

    // ── Bank Liquidity Management ─────────────────────────────────

    /// @notice Bank deposits USDC into financing pool
    function depositLiquidity(uint256 amount) external onlyBank {
        require(amount > 0, "FinancingPool: amount must be positive");
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        emit LiquidityDeposited(msg.sender, amount);
    }

    /// @notice Bank withdraws idle liquidity
    function withdrawLiquidity(uint256 amount) external onlyBank nonReentrant {
        require(amount > 0, "FinancingPool: amount must be positive");
        require(amount <= stablecoin.balanceOf(address(this)), "FinancingPool: insufficient pool balance");
        stablecoin.safeTransfer(msg.sender, amount);
        emit LiquidityWithdrawn(msg.sender, amount);
    }

    // ── Exporter — Submit Case ────────────────────────────────────

    /// @notice Exporter locks invoice NFT and submits financing request
    /// @dev Requires: CVI active, buyer confirmed, NFT owned by exporter.
    ///      The exporter must first call `invoiceAsset.approve(pool, tokenId)`
    ///      (or `setApprovalForAll`) — this contract calls `safeTransferFrom`
    ///      on the exporter's behalf, which requires prior ERC-721 approval.
    function submitCase(uint256 tokenId) external returns (uint256 caseId) {
        require(
            registry.isVerifiedAs(msg.sender, ComplianceRegistry.RoleType.EXPORTER),
            "FinancingPool: exporter not CVI-verified"
        );
        require(invoiceAsset.ownerOf(tokenId) == msg.sender, "FinancingPool: caller does not own token");
        require(invoiceAsset.isBuyerConfirmed(tokenId), "FinancingPool: receivable not confirmed by buyer");

        InvoiceAsset.InvoiceData memory invoice = invoiceAsset.getInvoiceData(tokenId);
        uint256 advanceAmount = calculateAdvanceAmount(invoice.amount);

        _caseIdCounter += 1;
        caseId = _caseIdCounter;

        cases[caseId] = FinancingCase({
            tokenId: tokenId,
            exporter: msg.sender,
            buyer: invoice.buyerWallet,
            invoiceAmount: invoice.amount,
            advanceAmount: advanceAmount,
            repaymentAmount: 0,
            disbursedAt: 0,
            dueDate: invoice.dueDate,
            status: CaseStatus.PENDING_APPROVAL,
            ccpAuditHash: bytes32(0)
        });
        activeCaseIds.push(caseId);

        invoiceAsset.safeTransferFrom(msg.sender, address(this), tokenId);
        invoiceAsset.setCollateralized(tokenId);

        emit CaseSubmitted(caseId, tokenId, msg.sender, invoice.amount, advanceAmount);
    }

    // ── Bank — Approve / Reject ───────────────────────────────────

    /// @notice Bank approves financing case
    /// @param riskScore Off-chain AI risk score (stored for audit transparency)
    /// @param ccpAuditHash Reference to CCP Protocol compliance report
    function approveCase(uint256 caseId, uint256 riskScore, bytes32 ccpAuditHash) external onlyBank {
        FinancingCase storage fc = cases[caseId];
        require(fc.status == CaseStatus.PENDING_APPROVAL, "FinancingPool: case not pending approval");

        fc.status = CaseStatus.APPROVED;
        fc.ccpAuditHash = ccpAuditHash;

        emit CaseApproved(caseId, msg.sender, riskScore, ccpAuditHash);
    }

    /// @notice Bank rejects financing case — NFT returned to exporter
    function rejectCase(uint256 caseId, string calldata reason) external onlyBank {
        FinancingCase storage fc = cases[caseId];
        require(fc.status == CaseStatus.PENDING_APPROVAL, "FinancingPool: case not pending approval");

        fc.status = CaseStatus.REJECTED;
        _removeActiveCase(caseId);

        invoiceAsset.setAvailable(fc.tokenId);
        invoiceAsset.safeTransferFrom(address(this), fc.exporter, fc.tokenId);

        emit CaseRejected(caseId, reason);
    }

    // ── Disbursement ──────────────────────────────────────────────

    /// @notice Disburse advance amount to exporter (called after approval)
    function disburse(uint256 caseId) external onlyBank nonReentrant {
        FinancingCase storage fc = cases[caseId];
        require(fc.status == CaseStatus.APPROVED, "FinancingPool: case not approved");
        require(fc.dueDate > block.timestamp, "FinancingPool: invoice already past due");
        require(fc.advanceAmount <= stablecoin.balanceOf(address(this)), "FinancingPool: insufficient pool liquidity");

        uint256 tenureDays = (fc.dueDate - block.timestamp) / 1 days;
        fc.repaymentAmount = calculateRepaymentAmount(fc.advanceAmount, tenureDays);
        fc.disbursedAt = block.timestamp;
        fc.status = CaseStatus.DISBURSED;

        stablecoin.safeTransfer(fc.exporter, fc.advanceAmount);

        emit FundsDisbursed(caseId, fc.exporter, fc.advanceAmount, block.timestamp);
    }

    // ── Repayment ─────────────────────────────────────────────────

    /// @notice Buyer repays financing — triggers auto-settlement
    /// @dev Accepts exact repaymentAmount in USDC
    function repay(uint256 caseId) external nonReentrant {
        FinancingCase storage fc = cases[caseId];
        require(fc.status == CaseStatus.DISBURSED, "FinancingPool: case not disbursed");

        stablecoin.safeTransferFrom(msg.sender, address(this), fc.repaymentAmount);

        emit RepaymentReceived(caseId, msg.sender, fc.repaymentAmount, block.timestamp);

        _settle(caseId);
    }

    /// @notice Auto-settlement logic after repayment
    /// @dev Distributes: bank principal + interest, releases NFT to exporter
    function _settle(uint256 caseId) internal {
        FinancingCase storage fc = cases[caseId];

        fc.status = CaseStatus.REPAID;
        _removeActiveCase(caseId);

        stablecoin.safeTransfer(bankWallet, fc.repaymentAmount);

        invoiceAsset.setRepaid(fc.tokenId);
        invoiceAsset.safeTransferFrom(address(this), fc.exporter, fc.tokenId);
    }

    // ── Default Handling ──────────────────────────────────────────

    /// @notice Trigger default on overdue case
    function triggerDefault(uint256 caseId) external onlyBank {
        FinancingCase storage fc = cases[caseId];
        require(fc.status == CaseStatus.DISBURSED, "FinancingPool: case not disbursed");
        require(block.timestamp > fc.dueDate, "FinancingPool: not yet overdue");

        fc.status = CaseStatus.DEFAULTED;
        _removeActiveCase(caseId);

        invoiceAsset.setDefaulted(fc.tokenId);

        emit DefaultTriggered(caseId, block.timestamp - fc.dueDate);
    }

    // ── View Functions ────────────────────────────────────────────

    function getCase(uint256 caseId) external view returns (FinancingCase memory) {
        return cases[caseId];
    }

    function getActiveCases() external view returns (uint256[] memory) {
        return activeCaseIds;
    }

    function getPoolBalance() external view returns (uint256) {
        return stablecoin.balanceOf(address(this));
    }

    /// @dev Example: 80% advance on $100,000 invoice = $80,000
    function calculateAdvanceAmount(uint256 invoiceAmount) public view returns (uint256) {
        return (invoiceAmount * advanceRateBps) / 10000;
    }

    /// @dev Example: $80,000 advance, 3% annualized, 60-day tenure = $394.52 interest
    function calculateRepaymentAmount(uint256 advanceAmount, uint256 tenureDays) public view returns (uint256) {
        uint256 interest = (advanceAmount * financingRateBps * tenureDays) / (10000 * 365);
        return advanceAmount + interest;
    }

    // ── Admin ─────────────────────────────────────────────────────

    function setAdvanceRate(uint256 newRateBps) external onlyOwner {
        require(newRateBps <= 10000, "FinancingPool: rate exceeds 100%");
        advanceRateBps = newRateBps;
    }

    function setFinancingRate(uint256 newRateBps) external onlyOwner {
        financingRateBps = newRateBps;
    }

    function setBankWallet(address newBank) external onlyOwner {
        require(newBank != address(0), "FinancingPool: zero address");
        bankWallet = newBank;
    }

    // ── Internal helpers ─────────────────────────────────────────

    function _removeActiveCase(uint256 caseId) internal {
        uint256 length = activeCaseIds.length;
        for (uint256 i = 0; i < length; i++) {
            if (activeCaseIds[i] == caseId) {
                activeCaseIds[i] = activeCaseIds[length - 1];
                activeCaseIds.pop();
                break;
            }
        }
    }

    // ── ERC721 Receiver ────────────────────────────────────────────

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
