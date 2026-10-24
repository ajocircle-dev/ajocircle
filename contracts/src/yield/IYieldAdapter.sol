// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IYieldAdapter
/// @notice Minimal interface AjoCircle uses to park idle member collateral in a yield source.
///
/// Requirements for an adapter (AjoCircle relies on all of them):
///   - Single owner: `bind()` is called once by the AjoCircle constructor; only the owner may move funds.
///   - Principal-protected and instantly liquid: `withdraw(amount, to)` must deliver exactly `amount` of `asset()`
///     in the same transaction (no time-lock, no queue, no haircut). If a source cannot promise this, do not wrap it.
///   - Yield is paid in `asset()` via `harvest`.
interface IYieldAdapter {
    /// @notice Token the adapter accepts and returns (e.g. MUSD).
    function asset() external view returns (address);

    /// @notice One-time: makes msg.sender the owner. Reverts if already bound.
    function bind() external;

    /// @notice Pull `amount` of `asset()` from the owner and put it to work.
    function deposit(uint256 amount) external;

    /// @notice Return exactly `amount` of principal to `to`, immediately.
    function withdraw(uint256 amount, address to) external;

    /// @notice Send all accrued yield (in `asset()`) to `to`. Returns the amount sent.
    function harvest(address to) external returns (uint256);

    /// @notice Principal currently deposited by the owner.
    function principal() external view returns (uint256);

    /// @notice Yield that `harvest` would send right now.
    function pendingYield() external view returns (uint256);
}
