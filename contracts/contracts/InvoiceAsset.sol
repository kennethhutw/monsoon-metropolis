// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ComplianceRegistry} from "./ComplianceRegistry.sol";

/// @title InvoiceAsset
/// @notice ERC-721 NFT representing each verified invoice. Each token embeds CVA
///         metadata, transfer restrictions, and full traceability. Minting is
///         gated by ComplianceRegistry; anti-double-financing is enforced by an
///         atomic invoice-hash registry.
/// @dev TODO (production): Replace string cvaTokenId with on-chain CVA verification —
///      call the Cleanverse CVA Registry to verify token authenticity before mint.
///      Interface: ICleanverseCVARegistry.verify(cvaTokenId) returns (bool).
contract InvoiceAsset is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    enum FinancingStatus {
        NONE, // Not yet used as collateral
        COLLATERALIZED, // Locked in FinancingPool
        REPAID, // Financing fully repaid, NFT released
        DEFAULTED // Buyer failed to pay
    }

    struct InvoiceData {
        bytes32 invoiceHash; // SHA-256(companyId + invoiceNumber + amount)
        uint256 amount; // Invoice amount in USD (6 decimals)
        uint256 issuedAt; // Invoice date (timestamp)
        uint256 dueDate; // Payment due date (timestamp)
        address exporterWallet; // CVI-verified seller wallet
        address buyerWallet; // CVI-verified buyer wallet
        string cvaTokenId; // Cleanverse CVA token reference
        bool buyerConfirmed; // Notice of Assignment status
        uint256 confirmedAt; // Timestamp of buyer confirmation
    }

    ComplianceRegistry public registry;
    address public financingPool;

    uint256 private _tokenIdCounter;

    mapping(uint256 => InvoiceData) public invoices;
    mapping(bytes32 => bool) public hashExists; // Anti-double-financing
    mapping(uint256 => FinancingStatus) public financingStatus;

    event InvoiceMinted(
        uint256 indexed tokenId,
        bytes32 indexed invoiceHash,
        address indexed exporter,
        address buyer,
        uint256 amount,
        string cvaTokenId
    );

    event BuyerConfirmed(uint256 indexed tokenId, address indexed buyer, uint256 confirmedAt);

    event FinancingStatusUpdated(uint256 indexed tokenId, FinancingStatus oldStatus, FinancingStatus newStatus);

    event ReceivableDisputed(uint256 indexed tokenId, address indexed buyer, string reason);

    modifier onlyFinancingPool() {
        require(msg.sender == financingPool, "InvoiceAsset: caller is not FinancingPool");
        _;
    }

    constructor(
        address initialOwner,
        address registryAddress
    ) ERC721("Monsoon Invoice Asset", "MINV") Ownable(initialOwner) {
        require(registryAddress != address(0), "InvoiceAsset: zero address");
        registry = ComplianceRegistry(registryAddress);
    }

    // ── Minting ───────────────────────────────────────────────────

    /// @notice Mint a new invoice NFT (exporter only)
    /// @dev Checks: exporter CVI active, buyer CVI active, hash not duplicate
    function mintInvoice(
        bytes32 invoiceHash,
        uint256 amount,
        uint256 dueDate,
        address buyerWallet,
        string calldata cvaTokenId,
        string calldata metadataURI
    ) external returns (uint256 tokenId) {
        require(
            registry.isVerifiedAs(msg.sender, ComplianceRegistry.RoleType.EXPORTER),
            "InvoiceAsset: exporter not CVI-verified"
        );
        require(
            registry.isVerifiedAs(buyerWallet, ComplianceRegistry.RoleType.BUYER),
            "InvoiceAsset: buyer not CVI-verified"
        );
        require(!hashExists[invoiceHash], "InvoiceAsset: invoice already financed");
        require(amount > 0, "InvoiceAsset: amount must be positive");
        require(dueDate > block.timestamp, "InvoiceAsset: due date must be in the future");

        // Register hash atomically with mint — the single source of anti-double-financing
        hashExists[invoiceHash] = true;

        _tokenIdCounter += 1;
        tokenId = _tokenIdCounter;

        invoices[tokenId] = InvoiceData({
            invoiceHash: invoiceHash,
            amount: amount,
            issuedAt: block.timestamp,
            dueDate: dueDate,
            exporterWallet: msg.sender,
            buyerWallet: buyerWallet,
            cvaTokenId: cvaTokenId,
            buyerConfirmed: false,
            confirmedAt: 0
        });

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit InvoiceMinted(tokenId, invoiceHash, msg.sender, buyerWallet, amount, cvaTokenId);
    }

    // ── Buyer Confirmation (NoA) ──────────────────────────────────

    /// @notice Buyer confirms receivable — digital Notice of Assignment
    /// @dev Only callable by the buyer wallet specified in InvoiceData
    function confirmReceivable(uint256 tokenId) external {
        InvoiceData storage invoice = invoices[tokenId];
        require(invoice.buyerWallet == msg.sender, "InvoiceAsset: caller is not the buyer");
        require(!invoice.buyerConfirmed, "InvoiceAsset: already confirmed");

        invoice.buyerConfirmed = true;
        invoice.confirmedAt = block.timestamp;

        emit BuyerConfirmed(tokenId, msg.sender, block.timestamp);
    }

    /// @notice Buyer disputes an invoice
    function disputeReceivable(uint256 tokenId, string calldata reason) external {
        InvoiceData storage invoice = invoices[tokenId];
        require(invoice.buyerWallet == msg.sender, "InvoiceAsset: caller is not the buyer");
        require(!invoice.buyerConfirmed, "InvoiceAsset: cannot dispute a confirmed receivable");

        emit ReceivableDisputed(tokenId, msg.sender, reason);
    }

    // ── Financing Pool Interface ──────────────────────────────────

    /// @notice Lock NFT as collateral (called by FinancingPool)
    function setCollateralized(uint256 tokenId) external onlyFinancingPool {
        _updateFinancingStatus(tokenId, FinancingStatus.COLLATERALIZED);
    }

    /// @notice Release NFT after repayment (called by FinancingPool)
    function setRepaid(uint256 tokenId) external onlyFinancingPool {
        _updateFinancingStatus(tokenId, FinancingStatus.REPAID);
    }

    /// @notice Mark NFT as defaulted (called by FinancingPool)
    function setDefaulted(uint256 tokenId) external onlyFinancingPool {
        _updateFinancingStatus(tokenId, FinancingStatus.DEFAULTED);
    }

    /// @notice Reset financing status to NONE (called by FinancingPool when a
    ///         bank rejects a case and the NFT is returned to the exporter)
    function setAvailable(uint256 tokenId) external onlyFinancingPool {
        _updateFinancingStatus(tokenId, FinancingStatus.NONE);
    }

    function _updateFinancingStatus(uint256 tokenId, FinancingStatus newStatus) internal {
        FinancingStatus oldStatus = financingStatus[tokenId];
        financingStatus[tokenId] = newStatus;
        emit FinancingStatusUpdated(tokenId, oldStatus, newStatus);
    }

    // ── View functions ────────────────────────────────────────────

    function getInvoiceData(uint256 tokenId) external view returns (InvoiceData memory) {
        return invoices[tokenId];
    }

    function isHashDuplicate(bytes32 hash) external view returns (bool) {
        return hashExists[hash];
    }

    function getExporterTokens(address exporter) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(exporter);
        uint256[] memory tokenIds = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(exporter, i);
        }
        return tokenIds;
    }

    function isBuyerConfirmed(uint256 tokenId) external view returns (bool) {
        return invoices[tokenId].buyerConfirmed;
    }

    // ── Admin ─────────────────────────────────────────────────────

    function setFinancingPool(address pool) external onlyOwner {
        require(pool != address(0), "InvoiceAsset: zero address");
        financingPool = pool;
    }

    function setRegistry(address registryAddress) external onlyOwner {
        require(registryAddress != address(0), "InvoiceAsset: zero address");
        registry = ComplianceRegistry(registryAddress);
    }

    // ── Transfer Restrictions ─────────────────────────────────────
    // NOTE: The PRD's TransferBlocked event cannot actually be observed on-chain —
    // any path that would emit it also reverts via require(), and reverted
    // transactions discard their logs. It is intentionally not emitted here.

    /// @dev OpenZeppelin v5 replaces `_beforeTokenTransfer` with `_update`.
    ///      Minting (from == address(0)) and transfers into the FinancingPool
    ///      (collateral lock) bypass the CVI-recipient check; all other transfers
    ///      require the recipient to hold a valid CVI, and collateralized tokens
    ///      cannot move at all.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);

        if (from != address(0) && to != financingPool) {
            require(
                financingStatus[tokenId] != FinancingStatus.COLLATERALIZED,
                "InvoiceAsset: token is locked as collateral"
            );
            require(registry.isVerified(to), "InvoiceAsset: recipient must hold valid CVI");
        }

        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 amount) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, amount);
    }

    // ── Required overrides (multiple inheritance) ───────────────────

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
