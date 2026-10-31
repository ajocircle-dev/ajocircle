// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IYieldAdapter} from "./IYieldAdapter.sol";

/// @notice Subset of Mezo's MUSD Savings Rate vault (sMUSD). Signatures match the verified
///         `MUSDSavingsRate` implementation used behind:
///         - Mezo testnet (31611) proxy `0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16`
///           (impl `0x92d12f0a60906b39d81acd9bf8977b6c824cd98c`)
///         - Mezo mainnet (31612) proxy `0xb4D498029af77680cD1eF828b967f010d06C51CC`
///           (impl `0xb33c3f97bf3b7df59417d114c694353e42929e87`)
///         `withdraw` auto-claims yield to the caller before returning principal.
///         `claimYield` checkpoints via `_updateYieldFor` then pays; `claimableYield` is a
///         storage mapping that stays stale after a raw `yieldIndex` bump until that checkpoint.
interface IMUSDSavingsRate {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function claimYield() external returns (uint256);
    function claimableYield(address account) external view returns (uint256);
    function yieldIndex() external view returns (uint256);
    function supplyYieldIndex(address account) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function musdToken() external view returns (address);
}

/// @title MUSDSavingsRateAdapter
/// @notice Parks AjoCircle collateral in the MUSD Savings Rate vault (sMUSD): no withdrawal fee, 0h time-lock.
/// @dev Works on Mezo testnet and mainnet. Every fund movement is checked by balance deltas, so if the vault
///      ever returns less than the principal the call reverts instead of silently under-collateralising a circle.
///      Fork-test against the target network's vault before deploying.
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

    /// @dev The vault's withdraw auto-claims yield into this adapter before transferring `amount` of principal.
    ///      Only principal is forwarded to `to`; leftover yield stays here for the next `harvest`.
    function withdraw(uint256 amount, address to) external onlyOwner {
        principal -= amount;
        uint256 before = musd.balanceOf(address(this));
        vault.withdraw(amount);
        if (musd.balanceOf(address(this)) - before < amount) revert ShortWithdrawal();
        musd.safeTransfer(to, amount);
    }

    /// @dev Always call `vault.claimYield()`. The vault checkpoints (`_updateYieldFor`) before paying, so
    ///      index-only yield after a `ProtocolYieldReceived` / strategy push is claimed without a dust
    ///      sMUSD transfer. Do not gate on `claimableYield` storage: that mapping stays 0 until a checkpoint.
    function harvest(address to) external onlyOwner returns (uint256 y) {
        vault.claimYield();
        // Any MUSD here is yield: principal lives in the vault (tracked by `principal`), never idle on this contract,
        // except leftover auto-claimed by a prior vault.withdraw that has not been harvested yet.
        y = musd.balanceOf(address(this));
        if (y > 0) musd.safeTransfer(to, y);
    }

    /// @dev Live pending = stored claimable + uncheckpointed index share + idle MUSD on this contract.
    ///      Matches what `harvest` would pull after `claimYield` checkpoints.
    function pendingYield() external view returns (uint256) {
        uint256 shares = vault.balanceOf(address(this));
        uint256 stored = vault.claimableYield(address(this));
        uint256 uncheckpointed;
        if (shares > 0) {
            uint256 idx = vault.yieldIndex();
            uint256 userIdx = vault.supplyYieldIndex(address(this));
            if (idx > userIdx) {
                uncheckpointed = (shares * (idx - userIdx)) / 1e18;
            }
        }
        return stored + uncheckpointed + musd.balanceOf(address(this));
    }
}
