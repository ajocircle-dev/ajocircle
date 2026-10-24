// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IYieldAdapter} from "./IYieldAdapter.sol";

/// @notice Subset of Mezo's MUSD Savings Rate vault (sMUSD). Signatures taken from the verified
///         implementation `MUSDSavingsRate` (0xb33c3f97bf3b7df59417d114c694353e42929e87) behind the MAINNET
///         proxy 0xb4D498029af77680cD1eF828b967f010d06C51CC. There is no testnet (31611) deployment.
interface IMUSDSavingsRate {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function claimYield() external returns (uint256);
    function claimableYield(address account) external view returns (uint256);
    function musdToken() external view returns (address);
}

/// @title MUSDSavingsRateAdapter
/// @notice Parks AjoCircle collateral in the MUSD Savings Rate vault (sMUSD): no withdrawal fee, 0h time-lock.
/// @dev MAINNET ONLY (chain 31612) until Mezo ships the vault on testnet. Every fund movement is checked by
///      balance deltas, so if the vault ever returns less than the principal the call reverts instead of
///      silently under-collateralising a circle. Fork-test against mainnet before any real deployment.
contract MUSDSavingsRateAdapter is IYieldAdapter {
    using SafeERC20 for IERC20;

    IMUSDSavingsRate public immutable vault;
    IERC20 public immutable musd;
    address public owner;
    uint256 public principal;

    error AlreadyBound();
    error NotOwner();
    error ShortWithdrawal();

    constructor(address vault_) {
        vault = IMUSDSavingsRate(vault_);
        musd = IERC20(IMUSDSavingsRate(vault_).musdToken());
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function asset() external view returns (address) {
        return address(musd);
    }

    function bind() external {
        if (owner != address(0)) revert AlreadyBound();
        owner = msg.sender;
    }

    function deposit(uint256 amount) external onlyOwner {
        principal += amount;
        musd.safeTransferFrom(msg.sender, address(this), amount);
        musd.forceApprove(address(vault), amount);
        vault.deposit(amount);
    }

    function withdraw(uint256 amount, address to) external onlyOwner {
        principal -= amount;
        uint256 before = musd.balanceOf(address(this));
        vault.withdraw(amount);
        if (musd.balanceOf(address(this)) - before < amount) revert ShortWithdrawal();
        musd.safeTransfer(to, amount);
    }

    function harvest(address to) external onlyOwner returns (uint256 y) {
        if (vault.claimableYield(address(this)) > 0) vault.claimYield();
        y = musd.balanceOf(address(this)); // adapter holds no idle principal, so any balance is yield
        if (y > 0) musd.safeTransfer(to, y);
    }

    function pendingYield() external view returns (uint256) {
        return vault.claimableYield(address(this)) + musd.balanceOf(address(this));
    }
}
