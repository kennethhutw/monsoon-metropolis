// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice Test/demo-only ERC-20 stand-in for USDC (6 decimals), for use on
///         Hardhat's local network and testnets where a real USDC deployment
///         is not available. Minting is intentionally permissionless — this
///         contract must never be deployed to mainnet.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
