// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AjoCircle} from "../../src/AjoCircle.sol";
import {MUSDSavingsRateAdapter} from "../../src/yield/MUSDSavingsRateAdapter.sol";

/// @notice Local-fork checks of MUSDSavingsRateAdapter against real Mezo sMUSD vaults.
///         Nothing is broadcast: forge runs everything in a local fork.
///         Testnet (preferred for Wave 2):
///           MEZO_TESTNET_RPC=https://rpc.test.mezo.org forge test --match-path test/fork/* -vv
///         Mainnet (optional):
///           MEZO_MAINNET_RPC=https://mainnet.mezo.public.validationcloud.io forge test --match-path test/fork/* -vv
contract MUSDSavingsRateForkTest is Test {
    // Mezo testnet (31611)
    address constant TESTNET_MUSD = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503;
    address constant TESTNET_SMUSD = 0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16;
    // Demo wallet funded on testnet (see deployments/mezo-testnet.md)
    address constant TESTNET_WHALE = 0x010F69291D5D4B1f4759A2268d6d6594D207B5B8;

    // Mezo mainnet (31612)
    address constant MAINNET_MUSD = 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186;
    address constant MAINNET_SMUSD = 0xb4D498029af77680cD1eF828b967f010d06C51CC;
    address constant MAINNET_WHALE = 0x05684Eb12131B48E491B9bc6514800Bc94f2cbF4;

    function test_Fork_Testnet_CircleRoundTripThroughRealSavingsVault() public {
        string memory rpc = vm.envOr("MEZO_TESTNET_RPC", string(""));
        if (bytes(rpc).length == 0) {
            vm.skip(true);
            return;
        }
        _roundTrip(rpc, TESTNET_SMUSD, TESTNET_MUSD, TESTNET_WHALE);
    }

    function test_Fork_Mainnet_CircleRoundTripThroughRealSavingsVault() public {
        string memory rpc = vm.envOr("MEZO_MAINNET_RPC", string(""));
        if (bytes(rpc).length == 0) {
            vm.skip(true);
            return;
        }
        _roundTrip(rpc, MAINNET_SMUSD, MAINNET_MUSD, MAINNET_WHALE);
    }

    function _roundTrip(string memory rpc, address vault, address musd, address whale) internal {
        vm.createSelectFork(rpc);

        MUSDSavingsRateAdapter adapter = new MUSDSavingsRateAdapter(vault);
        assertEq(address(adapter.musd()), musd);
        AjoCircle ajo = new AjoCircle(address(adapter));
        assertEq(ajo.yieldAsset(), musd);

        address[3] memory ppl = [makeAddr("ada"), makeAddr("bayo"), makeAddr("chi")];
        uint256 amount = 10e18; // small: demo wallets hold hundreds of test MUSD
        uint256 need = 4 * amount;
        for (uint256 i; i < 3; i++) {
            vm.prank(whale);
            IERC20(musd).transfer(ppl[i], need);
            vm.prank(ppl[i]);
            IERC20(musd).approve(address(ajo), type(uint256).max);
        }
        uint256 id = ajo.createCircle(musd, amount, 3, 600, false, true, "fork");
        for (uint256 i; i < 3; i++) {
            vm.prank(ppl[i]);
            ajo.join(id);
        }
        ajo.start(id);
        assertEq(adapter.principal(), 3 * amount);
        assertEq(IERC20(musd).balanceOf(address(ajo)), 0);

        vm.warp(block.timestamp + 1 days);
        for (uint256 r; r < 3; r++) {
            for (uint256 i; i < 3; i++) {
                vm.prank(ppl[i]);
                ajo.contribute(id);
            }
        }
        assertEq(adapter.principal(), 0);
        assertEq(IERC20(musd).balanceOf(address(adapter)), 0, "no stranded yield on adapter after close");
        for (uint256 i; i < 3; i++) {
            uint256 c = ajo.claimable(id, ppl[i]);
            assertGe(c, amount, "full collateral back (+ any yield)");
            vm.prank(ppl[i]);
            ajo.claimPayout(id);
            assertGe(IERC20(musd).balanceOf(ppl[i]), 4 * amount, "nobody lost principal");
        }
    }
}
