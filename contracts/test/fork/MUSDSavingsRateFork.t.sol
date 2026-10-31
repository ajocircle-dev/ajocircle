// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AjoCircle} from "../../src/AjoCircle.sol";
import {MUSDSavingsRateAdapter} from "../../src/yield/MUSDSavingsRateAdapter.sol";

/// @dev Minimal surface for permissionless protocol yield push on the real vault.
interface ISavingsVaultYield {
    function receiveProtocolYield(uint256 amount) external;
    function claimableYield(address account) external view returns (uint256);
    function yieldIndex() external view returns (uint256);
    function supplyYieldIndex(address account) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

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

    /// @notice Index bump leaves claimableYield storage at 0; fixed adapter harvests without dust sMUSD.
    function test_Fork_Testnet_HarvestClaimsIndexOnlyYieldWithoutDust() public {
        string memory rpc = vm.envOr("MEZO_TESTNET_RPC", string(""));
        if (bytes(rpc).length == 0) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(rpc);

        MUSDSavingsRateAdapter adapter = new MUSDSavingsRateAdapter(TESTNET_SMUSD);
        adapter.bind();

        uint256 principalAmt = 20e18;
        uint256 pushAmt = 2e18; // small testnet donation into the vault index
        vm.prank(TESTNET_WHALE);
        IERC20(TESTNET_MUSD).transfer(address(this), principalAmt + pushAmt);
        IERC20(TESTNET_MUSD).approve(address(adapter), principalAmt);
        adapter.deposit(principalAmt);

        ISavingsVaultYield v = ISavingsVaultYield(TESTNET_SMUSD);
        uint256 idxBefore = v.yieldIndex();
        assertEq(v.claimableYield(address(adapter)), 0);
        assertEq(v.supplyYieldIndex(address(adapter)), idxBefore);

        IERC20(TESTNET_MUSD).approve(TESTNET_SMUSD, pushAmt);
        v.receiveProtocolYield(pushAmt);

        uint256 idxAfter = v.yieldIndex();
        assertGt(idxAfter, idxBefore, "index bumped");
        assertEq(v.claimableYield(address(adapter)), 0, "storage claimable still 0 after index bump");
        uint256 pending = adapter.pendingYield();
        assertGt(pending, 0, "pendingYield sees uncheckpointed share");
        // Share ~= principal * deltaIndex / 1e18 (floor); well below the full push (other depositors exist).
        assertLe(pending, pushAmt);

        uint256 before = IERC20(TESTNET_MUSD).balanceOf(address(this));
        uint256 got = adapter.harvest(address(this));
        assertEq(got, pending, "harvest returns what pendingYield reported");
        assertEq(IERC20(TESTNET_MUSD).balanceOf(address(this)) - before, got);
        assertEq(v.claimableYield(address(adapter)), 0);
        assertEq(adapter.pendingYield(), 0);
        assertEq(v.balanceOf(address(adapter)), principalAmt, "no dust sMUSD left on adapter shares");
        assertEq(adapter.principal(), principalAmt);

        // Clean up: withdraw principal back so the fork leaves no stranded test funds in the adapter.
        adapter.withdraw(principalAmt, address(this));
        assertEq(adapter.principal(), 0);
        assertEq(IERC20(TESTNET_MUSD).balanceOf(address(adapter)), 0);
    }
}
