// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AjoCircle} from "../src/AjoCircle.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {MockYieldAdapter} from "../src/yield/MockYieldAdapter.sol";
import {MUSDSavingsRateAdapter} from "../src/yield/MUSDSavingsRateAdapter.sol";

/// @dev Mirrors the MUSDSavingsRate surface we use: 1:1 principal, yield claimed separately in MUSD.
contract MockSavingsRate {
    MockERC20 public immutable musdToken;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public claimableYield;

    constructor(MockERC20 musd_) {
        musdToken = musd_;
    }

    function deposit(uint256 amount) external {
        balanceOf[msg.sender] += amount;
        musdToken.transferFrom(msg.sender, address(this), amount);
    }

    function withdraw(uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        musdToken.transfer(msg.sender, amount);
    }

    function claimYield() external returns (uint256 y) {
        y = claimableYield[msg.sender];
        claimableYield[msg.sender] = 0;
        musdToken.transfer(msg.sender, y);
    }

    function addYield(address account, uint256 amount) external {
        musdToken.mint(address(this), amount);
        claimableYield[account] += amount;
    }
}

contract AjoCircleYieldTest is Test {
    AjoCircle ajo;
    MockERC20 musd;
    MockYieldAdapter adapter;

    address creator = makeAddr("creator");
    address ada = makeAddr("ada");
    address bayo = makeAddr("bayo");
    address chi = makeAddr("chi");
    address dayo = makeAddr("dayo");
    address[4] people;

    uint256 constant AMOUNT = 100e18;
    uint64 constant ROUND = 7 days;

    function setUp() public {
        musd = new MockERC20("Mezo USD", "MUSD", 18);
        adapter = new MockYieldAdapter(address(musd));
        ajo = new AjoCircle(address(adapter));
        people = [ada, bayo, chi, dayo];
        for (uint256 i; i < people.length; i++) {
            musd.mint(people[i], 10_000e18);
            vm.prank(people[i]);
            musd.approve(address(ajo), type(uint256).max);
        }
    }

    // ---------------------------------------------------------------- helpers
    function _circle(address token, bool collateral) internal returns (uint256 id) {
        vm.prank(creator);
        id = ajo.createCircle(token, AMOUNT, 3, ROUND, false, collateral, "Yaba Ajo");
        for (uint256 i; i < 3; i++) {
            vm.prank(people[i]);
            ajo.join(id);
        }
        vm.prank(creator);
        ajo.start(id);
    }

    function _payRound(uint256 id) internal {
        for (uint256 i; i < 3; i++) {
            if (ajo.getMember(id, people[i]).exited) continue;
            if (!ajo.hasPaid(id, ajo.getCircle(id).currentRound, people[i])) {
                vm.prank(people[i]);
                ajo.contribute(id);
            }
        }
    }

    function _claim(uint256 id, address who) internal {
        if (ajo.claimable(id, who) > 0) {
            vm.prank(who);
            ajo.claimPayout(id);
        }
    }

    function _accrue(uint256 amount) internal {
        musd.mint(address(adapter), amount); // simulated interest
    }

    // ---------------------------------------------------------------- wiring
    function test_AdapterBoundAndAssetSet() public view {
        assertEq(address(ajo.yieldAdapter()), address(adapter));
        assertEq(ajo.yieldAsset(), address(musd));
        assertEq(adapter.owner(), address(ajo));
    }

    function test_AdapterCannotBeReboundOrDrained() public {
        vm.expectRevert(MockYieldAdapter.AlreadyBound.selector);
        adapter.bind();
        vm.expectRevert(MockYieldAdapter.NotOwner.selector);
        adapter.withdraw(1, address(this));
        // a second AjoCircle cannot hijack an adapter that is already in use
        vm.expectRevert(MockYieldAdapter.AlreadyBound.selector);
        new AjoCircle(address(adapter));
    }

    // ---------------------------------------------------------------- routing
    function test_CollateralRoutedAtStart_PotNeverRouted() public {
        uint256 id = _circle(address(musd), true);
        assertEq(adapter.principal(), 3 * AMOUNT, "all collateral routed");
        assertEq(musd.balanceOf(address(ajo)), 0, "nothing idle in ajo");
        (uint256 routed,,) = ajo.getYield(id);
        assertEq(routed, 3 * AMOUNT);

        // two of three pay: pot (200) stays in AjoCircle, adapter untouched
        vm.prank(ada);
        ajo.contribute(id);
        vm.prank(bayo);
        ajo.contribute(id);
        assertEq(musd.balanceOf(address(ajo)), 2 * AMOUNT, "pot liquid in contract");
        assertEq(adapter.principal(), 3 * AMOUNT);

        // last payment pushes the payout on time, straight from the liquid pot
        uint256 before = musd.balanceOf(ada);
        vm.prank(chi);
        ajo.contribute(id);
        assertEq(musd.balanceOf(ada) - before, 3 * AMOUNT, "on-time payout");
    }

    function test_NoRoutingWithoutCollateralOrForOtherToken() public {
        _circle(address(musd), false);
        assertEq(adapter.principal(), 0, "no collateral, nothing routed");

        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        for (uint256 i; i < 3; i++) {
            usdc.mint(people[i], 10_000e18);
            vm.prank(people[i]);
            usdc.approve(address(ajo), type(uint256).max);
        }
        uint256 id = _circle(address(usdc), true);
        assertEq(adapter.principal(), 0, "other token not routed");
        assertEq(usdc.balanceOf(address(ajo)), 3 * AMOUNT);
        (uint256 routed, uint256 earned,) = ajo.getYield(id);
        assertEq(routed + earned, 0);
    }

    // ---------------------------------------------------------------- accrual & distribution
    function test_YieldAccruesAndIsDistributedEquallyOnClose() public {
        uint256 id = _circle(address(musd), true);
        _accrue(30e18);
        (, uint256 earned,) = ajo.getYield(id);
        assertEq(earned, 30e18, "pending yield visible");

        _payRound(id);
        _payRound(id);
        _payRound(id); // closes

        (uint256 routed, uint256 e2, uint256 distributed) = ajo.getYield(id);
        assertEq(routed, 0);
        assertEq(distributed, 30e18);
        assertEq(e2, 30e18);
        assertEq(adapter.principal(), 0, "all collateral pulled back");
        for (uint256 i; i < 3; i++) {
            assertEq(ajo.yieldEarned(id, people[i]), 10e18, "equal collateral -> equal yield");
            assertEq(ajo.claimable(id, people[i]), AMOUNT + 10e18, "collateral + yield");
            uint256 before = musd.balanceOf(people[i]);
            _claim(id, people[i]);
            assertEq(musd.balanceOf(people[i]) - before, AMOUNT + 10e18);
        }
        assertEq(musd.balanceOf(address(ajo)), 0, "fully paid out");
    }

    function test_YieldProRataToRemainingCollateral_DefaulterEarnsLess() public {
        uint256 id = _circle(address(musd), true);
        // round 0: chi misses -> 100 slashed from chi's collateral (pulled back from the adapter)
        vm.prank(ada);
        ajo.contribute(id);
        vm.prank(bayo);
        ajo.contribute(id);
        vm.warp(block.timestamp + ROUND + 1);
        ajo.settleRound(id);
        assertEq(adapter.principal(), 2 * AMOUNT, "slashed collateral unrouted");
        assertEq(ajo.claimable(id, ada), 3 * AMOUNT, "ada's round-0 pot complete despite default");

        _accrue(20e18); // only ada + bayo collateral is earning now
        _payRound(id);
        _payRound(id);

        assertEq(ajo.yieldEarned(id, ada), 10e18);
        assertEq(ajo.yieldEarned(id, bayo), 10e18);
        assertEq(ajo.yieldEarned(id, chi), 0, "defaulter lost collateral -> no yield");
        _claim(id, ada);
        _claim(id, bayo);
        _claim(id, chi);
        assertEq(musd.balanceOf(address(ajo)), 0);
    }

    function test_YieldAttributedToCirclesByRoutedPrincipalOverTime() public {
        uint256 a = _circle(address(musd), true); // 300 routed
        _accrue(30e18); // all to circle a
        vm.prank(creator);
        uint256 b = ajo.createCircle(address(musd), 2 * AMOUNT, 3, ROUND, false, true, "Second");
        for (uint256 i; i < 3; i++) {
            vm.prank(people[i]);
            ajo.join(b);
        }
        vm.prank(creator);
        ajo.start(b); // +600 routed, harvest happens before b's principal lands
        _accrue(90e18); // 1/3 to a, 2/3 to b
        (, uint256 ea,) = ajo.getYield(a);
        (, uint256 eb,) = ajo.getYield(b);
        assertApproxEqAbs(ea, 60e18, 1);
        assertApproxEqAbs(eb, 60e18, 1);
    }

    function test_ExitForfeitUnroutesAndYieldSkipsExited() public {
        uint256 id = _circle(address(musd), true);
        vm.prank(chi);
        ajo.exitCircle(id); // forfeits 100 collateral into the pot
        assertEq(adapter.principal(), 2 * AMOUNT);
        _accrue(10e18);
        _payRound(id);
        _payRound(id);
        _payRound(id); // chi's turn: pot split, then close
        assertEq(uint8(ajo.getCircle(id).status), uint8(AjoCircle.Status.Completed));
        assertEq(ajo.yieldEarned(id, chi), 0);
        assertEq(ajo.yieldEarned(id, ada) + ajo.yieldEarned(id, bayo), 10e18);
        for (uint256 i; i < 3; i++) _claim(id, people[i]);
        assertEq(musd.balanceOf(address(ajo)), 0);
    }

    // ---------------------------------------------------------------- zero yield
    function test_ZeroYield_WithdrawalsAndPayoutsUnchanged() public {
        uint256 id = _circle(address(musd), true);
        uint256[3] memory start;
        for (uint256 i; i < 3; i++) start[i] = musd.balanceOf(people[i]) + AMOUNT; // + posted collateral
        _payRound(id);
        _payRound(id);
        _payRound(id);
        (,, uint256 distributed) = ajo.getYield(id);
        assertEq(distributed, 0);
        for (uint256 i; i < 3; i++) {
            assertEq(ajo.yieldEarned(id, people[i]), 0);
            assertEq(ajo.claimable(id, people[i]), AMOUNT, "collateral back, no yield");
            _claim(id, people[i]);
            assertEq(musd.balanceOf(people[i]), start[i], "net zero: paid 3x, received 3x + collateral");
        }
        assertEq(adapter.principal(), 0);
        assertEq(musd.balanceOf(address(ajo)), 0);
        assertEq(musd.balanceOf(address(adapter)), 0);
    }

    function test_ZeroYield_AllDefaultSettlementStillWorks() public {
        uint256 id = _circle(address(musd), true);
        for (uint256 r; r < 3; r++) {
            vm.warp(block.timestamp + ROUND + 1);
            ajo.settleRound(id);
        }
        assertEq(uint8(ajo.getCircle(id).status), uint8(AjoCircle.Status.Completed));
        assertEq(adapter.principal(), 0);
        // round 0 slashes everyone's full collateral into ada's pot; later pots are empty
        assertEq(ajo.claimable(id, ada), 3 * AMOUNT);
        assertEq(ajo.claimable(id, bayo), 0);
        assertEq(ajo.claimable(id, chi), 0);
        _claim(id, ada);
        assertEq(musd.balanceOf(address(ajo)), 0);
    }

    function test_YieldAfterAllCollateralSlashedGoesToMembersEqually() public {
        uint256 id = _circle(address(musd), true);
        _accrue(9e18);
        for (uint256 r; r < 3; r++) {
            vm.warp(block.timestamp + ROUND + 1);
            ajo.settleRound(id);
        }
        // yield accrued before the slash; nobody has collateral left -> equal split among non-exited
        for (uint256 i; i < 3; i++) assertEq(ajo.yieldEarned(id, people[i]), 3e18);
        for (uint256 i; i < 3; i++) _claim(id, people[i]);
        assertEq(musd.balanceOf(address(ajo)), 0);
    }

    // ---------------------------------------------------------------- fuzz: solvency with yield
    function testFuzz_SolventWithYield(uint96 y1, uint96 y2, bool chiDefaults) public {
        uint256 id = _circle(address(musd), true);
        _accrue(uint256(y1) % 1e24);
        if (chiDefaults) {
            vm.prank(ada);
            ajo.contribute(id);
            vm.prank(bayo);
            ajo.contribute(id);
            vm.warp(block.timestamp + ROUND + 1);
            ajo.settleRound(id);
        } else {
            _payRound(id);
        }
        _accrue(uint256(y2) % 1e24);
        _payRound(id);
        _payRound(id);
        uint256 owed;
        for (uint256 i; i < 3; i++) owed += ajo.claimable(id, people[i]);
        assertLe(owed, musd.balanceOf(address(ajo)), "solvent");
        for (uint256 i; i < 3; i++) _claim(id, people[i]);
        // floor() in yield-per-unit accounting can leave a few wei behind, never a deficit
        assertLe(musd.balanceOf(address(ajo)), 3, "only rounding dust left");
        assertEq(adapter.principal(), 0);
    }

    // ---------------------------------------------------------------- MUSD Savings Rate adapter
    function test_SavingsRateAdapter_RoundTripAndHarvest() public {
        MockSavingsRate vault = new MockSavingsRate(musd);
        MUSDSavingsRateAdapter sAdapter = new MUSDSavingsRateAdapter(address(vault));
        AjoCircle ajo2 = new AjoCircle(address(sAdapter));
        assertEq(ajo2.yieldAsset(), address(musd));
        for (uint256 i; i < 3; i++) {
            vm.prank(people[i]);
            musd.approve(address(ajo2), type(uint256).max);
        }
        vm.prank(creator);
        uint256 id = ajo2.createCircle(address(musd), AMOUNT, 3, ROUND, false, true, "sMUSD circle");
        for (uint256 i; i < 3; i++) {
            vm.prank(people[i]);
            ajo2.join(id);
        }
        vm.prank(creator);
        ajo2.start(id);
        assertEq(vault.balanceOf(address(sAdapter)), 3 * AMOUNT, "collateral in sMUSD");

        vault.addYield(address(sAdapter), 6e18);
        (, uint256 earned,) = ajo2.getYield(id);
        assertEq(earned, 6e18);

        for (uint256 r; r < 3; r++) {
            for (uint256 i; i < 3; i++) {
                vm.prank(people[i]);
                ajo2.contribute(id);
            }
        }
        assertEq(vault.balanceOf(address(sAdapter)), 0);
        for (uint256 i; i < 3; i++) {
            assertEq(ajo2.yieldEarned(id, people[i]), 2e18);
            vm.prank(people[i]);
            ajo2.claimPayout(id);
        }
        assertEq(musd.balanceOf(address(ajo2)), 0);
        vm.expectRevert(MUSDSavingsRateAdapter.NotOwner.selector);
        sAdapter.deposit(1);
    }
}
