// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AjoCircle} from "../../src/AjoCircle.sol";
import {MUSDSavingsRateAdapter} from "../../src/yield/MUSDSavingsRateAdapter.sol";

/// @notice Local-fork check of MUSDSavingsRateAdapter against the REAL Mezo mainnet sMUSD vault.
///         Nothing is broadcast: forge runs everything in a local fork.
///         Skipped unless MEZO_MAINNET_RPC is set, e.g.
///           MEZO_MAINNET_RPC=https://rpc-http.mezo.boar.network forge test --match-path test/fork/*
contract MUSDSavingsRateForkTest is Test {
    address constant MUSD = 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186;
    address constant SMUSD_VAULT = 0xb4D498029af77680cD1eF828b967f010d06C51CC;
    address constant WHALE = 0x05684Eb12131B48E491B9bc6514800Bc94f2cbF4; // EOA holding MUSD at time of writing

    function test_Fork_CircleRoundTripThroughRealSavingsVault() public {
        string memory rpc = vm.envOr("MEZO_MAINNET_RPC", string(""));
        if (bytes(rpc).length == 0) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(rpc);

        MUSDSavingsRateAdapter adapter = new MUSDSavingsRateAdapter(SMUSD_VAULT);
        AjoCircle ajo = new AjoCircle(address(adapter));
        assertEq(ajo.yieldAsset(), MUSD);

        address[3] memory ppl = [makeAddr("ada"), makeAddr("bayo"), makeAddr("chi")];
        uint256 amount = 100e18;
        for (uint256 i; i < 3; i++) {
            vm.prank(WHALE);
            IERC20(MUSD).transfer(ppl[i], 4 * amount);
            vm.prank(ppl[i]);
            IERC20(MUSD).approve(address(ajo), type(uint256).max);
        }
        uint256 id = ajo.createCircle(MUSD, amount, 3, 600, false, true, "fork");
        for (uint256 i; i < 3; i++) {
            vm.prank(ppl[i]);
            ajo.join(id);
        }
        ajo.start(id);
        assertEq(adapter.principal(), 3 * amount);
        assertEq(IERC20(MUSD).balanceOf(address(ajo)), 0);

        vm.warp(block.timestamp + 1 days);
        for (uint256 r; r < 3; r++) {
            for (uint256 i; i < 3; i++) {
                vm.prank(ppl[i]);
                ajo.contribute(id);
            }
        }
        assertEq(adapter.principal(), 0);
        for (uint256 i; i < 3; i++) {
            uint256 c = ajo.claimable(id, ppl[i]);
            assertGe(c, amount, "full collateral back (+ any yield)");
            vm.prank(ppl[i]);
            ajo.claimPayout(id);
            assertGe(IERC20(MUSD).balanceOf(ppl[i]), 4 * amount, "nobody lost principal");
        }
    }
}
