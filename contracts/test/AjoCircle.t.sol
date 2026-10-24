// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AjoCircle} from "../src/AjoCircle.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract AjoCircleTest is Test {
    AjoCircle ajo;
    MockERC20 musd;

    address creator = makeAddr("creator");
    address ada = makeAddr("ada");
    address bayo = makeAddr("bayo");
    address chi = makeAddr("chi");
    address dayo = makeAddr("dayo");

    uint256 constant AMOUNT = 100e18;
    uint64 constant ROUND = 7 days;

    function setUp() public {
        ajo = new AjoCircle();
        musd = new MockERC20("Mezo USD", "MUSD", 18);
        address[4] memory people = [ada, bayo, chi, dayo];
        for (uint256 i; i < people.length; i++) {
            musd.mint(people[i], 10_000e18);
            vm.prank(people[i]);
            musd.approve(address(ajo), type(uint256).max);
        }
    }

    // ---------------------------------------------------------------- helpers
    function _create(uint16 n, bool random, bool collateral) internal returns (uint256 id) {
        vm.prank(creator);
        id = ajo.createCircle(address(musd), AMOUNT, n, ROUND, random, collateral, "Lagos Friends");
    }

    function _join(uint256 id, address who) internal {
        vm.prank(who);
        ajo.join(id);
    }

    function _contribute(uint256 id, address who) internal {
        vm.prank(who);
        ajo.contribute(id);
    }

    function _fullCircle(bool collateral) internal returns (uint256 id) {
        id = _create(3, false, collateral);
        _join(id, ada);
        _join(id, bayo);
        _join(id, chi);
        vm.prank(creator);
        ajo.start(id);
    }

    // ---------------------------------------------------------------- happy path
    function test_HappyPath_FullCycleWithCollateral() public {
        uint256 id = _fullCircle(true);
        assertEq(musd.balanceOf(address(ajo)), 3 * AMOUNT, "collateral held");

        address[] memory order = ajo.getPayoutOrder(id);
        assertEq(order[0], ada);
        assertEq(order[1], bayo);
        assertEq(order[2], chi);

        uint256 adaBefore = musd.balanceOf(ada);
        _contribute(id, ada);
        _contribute(id, bayo);
        _contribute(id, chi); // auto-payout to ada
        assertEq(musd.balanceOf(ada), adaBefore - AMOUNT + 3 * AMOUNT, "ada got pot");
        assertEq(ajo.getCircle(id).currentRound, 1);

        _contribute(id, ada);
        _contribute(id, bayo);
        _contribute(id, chi); // to bayo
        _contribute(id, ada);
        _contribute(id, bayo);
        _contribute(id, chi); // to chi -> circle closes

        AjoCircle.Circle memory c = ajo.getCircle(id);
        assertEq(uint8(c.status), uint8(AjoCircle.Status.Completed));

        // Collateral is returned at close via claimPayout.
        address[3] memory ppl = [ada, bayo, chi];
        for (uint256 i; i < 3; i++) {
            assertEq(ajo.claimable(id, ppl[i]), AMOUNT);
            vm.prank(ppl[i]);
            ajo.claimPayout(id);
            assertEq(musd.balanceOf(ppl[i]), 10_000e18, "everyone net zero");
        }
        assertEq(musd.balanceOf(address(ajo)), 0);
    }

    function test_HappyPath_EmitsPayoutEvent() public {
        uint256 id = _fullCircle(false);
        _contribute(id, ada);
        _contribute(id, bayo);
        vm.expectEmit(true, true, true, true);
        emit AjoCircle.PayoutSent(id, 0, ada, 3 * AMOUNT);
        _contribute(id, chi);
    }

    // ---------------------------------------------------------------- missed payment
    function test_MissedPayment_SlashesCollateralAndFlagsDefaulter() public {
        uint256 id = _fullCircle(true);
        _contribute(id, ada);
        _contribute(id, bayo);
        // chi misses round 0

        vm.expectRevert(AjoCircle.RoundNotOver.selector);
        ajo.settleRound(id);

        vm.warp(block.timestamp + ROUND + 1);
        vm.expectEmit(true, true, true, true);
        emit AjoCircle.CollateralSlashed(id, 0, chi, AMOUNT);
        vm.prank(dayo); // anyone can settle
        ajo.settleRound(id);

        AjoCircle.Member memory m = ajo.getMember(id, chi);
        assertTrue(m.defaulted);
        assertEq(m.missedPayments, 1);
        assertEq(m.collateral, 0);

        // Recipient (ada) got a full pot, credited for pull.
        assertEq(ajo.claimable(id, ada), 3 * AMOUNT);
        uint256 before = musd.balanceOf(ada);
        vm.prank(ada);
        ajo.claimPayout(id);
        assertEq(musd.balanceOf(ada), before + 3 * AMOUNT);
        assertEq(ajo.getCircle(id).currentRound, 1);
    }

    function test_MissedPayment_NoCollateral_PotIsShort() public {
        uint256 id = _fullCircle(false);
        _contribute(id, ada);
        vm.warp(block.timestamp + ROUND + 1);
        ajo.settleRound(id);
        assertEq(ajo.claimable(id, ada), AMOUNT);
        assertTrue(ajo.getMember(id, bayo).defaulted);
        assertTrue(ajo.getMember(id, chi).defaulted);
    }

    function test_MissedPayment_DefaulterCanStillPayLaterRounds() public {
        uint256 id = _fullCircle(true);
        _contribute(id, ada);
        _contribute(id, bayo);
        vm.warp(block.timestamp + ROUND + 1);
        ajo.settleRound(id);
        // round 1: chi pays again normally
        _contribute(id, ada);
        _contribute(id, bayo);
        _contribute(id, chi);
        assertEq(ajo.getCircle(id).currentRound, 2);
    }

    // ---------------------------------------------------------------- early exit
    function test_EarlyExit_BeforeStart_Refunds() public {
        uint256 id = _create(3, false, true);
        _join(id, ada);
        _join(id, bayo);
        uint256 before = musd.balanceOf(ada);
        vm.prank(ada);
        ajo.leave(id);
        assertEq(musd.balanceOf(ada), before + AMOUNT);
        address[] memory members = ajo.getMembers(id);
        assertEq(members.length, 1);
        assertEq(members[0], bayo);
        // seat is free again; ada can rejoin
        _join(id, ada);
        assertEq(ajo.getMembers(id).length, 2);
    }

    function test_EarlyExit_AfterStart_ForfeitsTurnAndSplitsPot() public {
        uint256 id = _fullCircle(true); // order: ada, bayo, chi
        // round 0
        _contribute(id, ada);
        _contribute(id, bayo);
        _contribute(id, chi);
        // round 1 (recipient bayo): bayo exits before being paid
        _contribute(id, ada);
        vm.prank(bayo);
        ajo.exitCircle(id);
        AjoCircle.Member memory m = ajo.getMember(id, bayo);
        assertTrue(m.exited);
        assertEq(m.collateral, 0);
        assertEq(ajo.getCircle(id).activeMembers, 2);

        // chi pays -> all active paid -> bayo's pot (ada + chi + bayo's forfeited collateral) split ada/chi
        _contribute(id, chi);
        assertEq(ajo.claimable(id, ada), (3 * AMOUNT) / 2);
        assertEq(ajo.claimable(id, chi), (3 * AMOUNT) / 2);
        assertEq(ajo.getCircle(id).currentRound, 2);

        // exited member cannot contribute
        vm.prank(bayo);
        vm.expectRevert(AjoCircle.MemberHasExited.selector);
        ajo.contribute(id);

        // round 2 (recipient chi): only ada and chi owe
        uint256 chiBefore = musd.balanceOf(chi);
        _contribute(id, ada);
        _contribute(id, chi);
        assertEq(musd.balanceOf(chi), chiBefore - AMOUNT + 2 * AMOUNT);
        assertEq(uint8(ajo.getCircle(id).status), uint8(AjoCircle.Status.Completed));
        // contract holds exactly what is claimable
        uint256 owed = ajo.claimable(id, ada) + ajo.claimable(id, chi) + ajo.claimable(id, bayo);
        assertEq(musd.balanceOf(address(ajo)), owed);
        assertEq(ajo.claimable(id, bayo), 0);
    }

    function test_EarlyExit_AfterPayout_Reverts() public {
        uint256 id = _fullCircle(false);
        _contribute(id, ada);
        _contribute(id, bayo);
        _contribute(id, chi);
        vm.prank(ada);
        vm.expectRevert(AjoCircle.AlreadyReceivedPayout.selector);
        ajo.exitCircle(id);
    }

    function test_EarlyExit_LastUnpaidMemberCompletesRound() public {
        uint256 id = _fullCircle(false);
        _contribute(id, ada);
        _contribute(id, bayo);
        uint256 before = musd.balanceOf(ada);
        vm.prank(chi);
        ajo.exitCircle(id); // all remaining active have paid -> auto payout
        assertEq(musd.balanceOf(ada), before + 2 * AMOUNT);
        assertEq(ajo.getCircle(id).currentRound, 1);
    }

    // ---------------------------------------------------------------- edge cases
    function test_Cancel_RefundsEveryone() public {
        uint256 id = _create(3, false, true);
        _join(id, ada);
        _join(id, bayo);
        vm.prank(ada);
        vm.expectRevert(AjoCircle.NotCreator.selector);
        ajo.cancelCircle(id);
        vm.prank(creator);
        ajo.cancelCircle(id);
        assertEq(musd.balanceOf(ada), 10_000e18);
        assertEq(musd.balanceOf(bayo), 10_000e18);
        vm.prank(chi);
        vm.expectRevert(AjoCircle.WrongStatus.selector);
        ajo.join(id);
    }

    function test_Join_Reverts() public {
        uint256 id = _create(2, false, false);
        _join(id, ada);
        vm.prank(ada);
        vm.expectRevert(AjoCircle.AlreadyMember.selector);
        ajo.join(id);
        _join(id, bayo);
        vm.prank(chi);
        vm.expectRevert(AjoCircle.CircleFull.selector);
        ajo.join(id);
        vm.expectRevert(AjoCircle.UnknownCircle.selector);
        ajo.join(99);
    }

    function test_Start_Reverts() public {
        uint256 id = _create(3, false, false);
        _join(id, ada);
        vm.prank(creator);
        vm.expectRevert(AjoCircle.NotFull.selector);
        ajo.start(id);
        _join(id, bayo);
        _join(id, chi);
        vm.prank(ada);
        vm.expectRevert(AjoCircle.NotCreator.selector);
        ajo.start(id);
        vm.prank(creator);
        ajo.start(id);
        vm.prank(creator);
        vm.expectRevert(AjoCircle.WrongStatus.selector);
        ajo.start(id);
        vm.prank(dayo);
        vm.expectRevert(AjoCircle.WrongStatus.selector);
        ajo.leave(id);
    }

    function test_Contribute_Reverts() public {
        uint256 id = _fullCircle(false);
        vm.prank(dayo);
        vm.expectRevert(AjoCircle.NotMember.selector);
        ajo.contribute(id);
        _contribute(id, ada);
        vm.prank(ada);
        vm.expectRevert(AjoCircle.AlreadyPaid.selector);
        ajo.contribute(id);
    }

    function test_CreateCircle_InvalidParams() public {
        vm.expectRevert(AjoCircle.InvalidParams.selector);
        ajo.createCircle(address(0), AMOUNT, 3, ROUND, false, false, "x");
        vm.expectRevert(AjoCircle.InvalidParams.selector);
        ajo.createCircle(address(musd), 0, 3, ROUND, false, false, "x");
        vm.expectRevert(AjoCircle.InvalidParams.selector);
        ajo.createCircle(address(musd), AMOUNT, 1, ROUND, false, false, "x");
        vm.expectRevert(AjoCircle.InvalidParams.selector);
        ajo.createCircle(address(musd), AMOUNT, 3, 10, false, false, "x");
    }

    function test_RandomOrder_IsPermutationOfMembers() public {
        uint256 id = _create(4, true, false);
        _join(id, ada);
        _join(id, bayo);
        _join(id, chi);
        _join(id, dayo);
        vm.prevrandao(bytes32(uint256(12345)));
        vm.prank(creator);
        ajo.start(id);
        address[] memory order = ajo.getPayoutOrder(id);
        assertEq(order.length, 4);
        address[4] memory ppl = [ada, bayo, chi, dayo];
        for (uint256 i; i < 4; i++) {
            uint256 hits;
            for (uint256 j; j < 4; j++) {
                if (order[j] == ppl[i]) hits++;
            }
            assertEq(hits, 1, "each member appears exactly once");
        }
    }

    function test_MultipleCirclesAreIsolated() public {
        uint256 a = _fullCircle(false);
        uint256 b = _create(2, false, false);
        _join(b, dayo);
        _join(b, ada);
        vm.prank(creator);
        ajo.start(b);
        _contribute(b, dayo);
        _contribute(b, ada); // pays dayo in circle b
        assertEq(ajo.getCircle(a).currentRound, 0);
        assertEq(ajo.getCircle(b).currentRound, 1);
        assertFalse(ajo.hasPaid(a, 0, ada));
    }

    function test_ClaimNothing_Reverts() public {
        uint256 id = _fullCircle(false);
        vm.prank(ada);
        vm.expectRevert(AjoCircle.NothingToClaim.selector);
        ajo.claimPayout(id);
    }

    function test_SettleThroughWholeCircle_WithDefaults() public {
        uint256 id = _fullCircle(true);
        for (uint256 r; r < 3; r++) {
            _contribute(id, ada); // only ada ever pays
            vm.warp(block.timestamp + ROUND + 1);
            ajo.settleRound(id);
        }
        assertEq(uint8(ajo.getCircle(id).status), uint8(AjoCircle.Status.Completed));
        // contract solvency: balance == total claimable
        uint256 owed = ajo.claimable(id, ada) + ajo.claimable(id, bayo) + ajo.claimable(id, chi);
        assertEq(musd.balanceOf(address(ajo)), owed);
        assertEq(ajo.getMember(id, bayo).missedPayments, 3);
    }

    function testFuzz_HappyPathSolvency(uint96 amount, uint8 nRaw) public {
        vm.assume(amount > 0 && amount < 1e24);
        uint16 n = uint16(bound(nRaw, 2, 8));
        vm.prank(creator);
        uint256 id = ajo.createCircle(address(musd), amount, n, ROUND, true, true, "fuzz");
        address[] memory ppl = new address[](n);
        for (uint256 i; i < n; i++) {
            ppl[i] = address(uint160(0x1000 + i));
            musd.mint(ppl[i], uint256(amount) * (n + 1));
            vm.startPrank(ppl[i]);
            musd.approve(address(ajo), type(uint256).max);
            ajo.join(id);
            vm.stopPrank();
        }
        vm.prank(creator);
        ajo.start(id);
        for (uint256 r; r < n; r++) {
            for (uint256 i; i < n; i++) {
                vm.prank(ppl[i]);
                ajo.contribute(id);
            }
        }
        for (uint256 i; i < n; i++) {
            vm.prank(ppl[i]);
            ajo.claimPayout(id);
            assertEq(musd.balanceOf(ppl[i]), uint256(amount) * (n + 1));
        }
        assertEq(musd.balanceOf(address(ajo)), 0);
    }
}
