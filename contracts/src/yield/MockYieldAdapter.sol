// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IYieldAdapter} from "./IYieldAdapter.sol";

/// @notice Test/demo adapter: holds the asset itself. "Yield" is any balance above principal,
///         e.g. tokens minted or sent straight to this contract to simulate interest.
contract MockYieldAdapter is IYieldAdapter {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public owner;
    uint256 public principal;

    error AlreadyBound();
    error NotOwner();

    constructor(address token_) {
        token = IERC20(token_);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function asset() external view returns (address) {
        return address(token);
    }

    function bind() external {
        if (owner != address(0)) revert AlreadyBound();
        owner = msg.sender;
    }

    function deposit(uint256 amount) external onlyOwner {
        principal += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdraw(uint256 amount, address to) external onlyOwner {
        principal -= amount;
        token.safeTransfer(to, amount);
    }

    function harvest(address to) external onlyOwner returns (uint256 y) {
        y = pendingYield();
        if (y > 0) token.safeTransfer(to, y);
    }

    function pendingYield() public view returns (uint256) {
        uint256 bal = token.balanceOf(address(this));
        return bal > principal ? bal - principal : 0;
    }
}
