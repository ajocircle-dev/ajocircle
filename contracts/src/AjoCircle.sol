// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IYieldAdapter} from "./yield/IYieldAdapter.sol";

/// @title AjoCircle
/// @notice Onchain rotating savings circles (ajo / esusu / chama / tontine).
///
/// One contract hosts many circles. Lifecycle of a circle:
///   1. Open:      creator calls `createCircle`; members `join` (posting collateral if required) or `leave`
///                 for a full refund. The creator may `cancelCircle` (everyone is refunded).
///   2. Active:    once full, the creator calls `start`. Each round every active member `contribute`s
///                 `contributionAmount`. When the last active member pays, the pot is pushed to that
///                 round's recipient automatically. If the round deadline passes first, anyone may call
///                 `settleRound`: unpaid members have one contribution slashed from their collateral (if any)
///                 and are flagged as defaulters, and the pot is credited to the recipient (pull via `claimPayout`).
///   3. Completed: after N rounds the circle closes and each member's remaining collateral becomes claimable.
///
/// Early exit after start (`exitCircle`): only allowed for a member who has NOT yet received a payout.
/// The member forfeits their collateral (added to the current pot) and their own future payout. They stop
/// owing contributions. When the exited member's payout round arrives, that pot is split equally between
/// the remaining active members. A member who has already been paid cannot exit: they still owe the circle,
/// and if they stop paying they are handled as a defaulter.
///
/// Optional MUSD yield (`yieldAdapter`, set once at deploy; address(0) = plain token rails, e.g. Arc/USDC):
/// in circles that use the adapter's asset and require collateral, all member collateral is routed into the
/// adapter when the circle starts. Collateral is the only idle balance that is guaranteed to sit still for the
/// whole circle; the round pot is NEVER routed, so payouts never wait on the yield source. Collateral is pulled
/// back (instantly, principal-protected per IYieldAdapter) when it is slashed, forfeited, or returned at close.
/// Yield is attributed to circles pro rata to routed principal over time and, at close, credited to members
/// pro rata to the collateral they still hold (defaulters who lost collateral earn less).
///
/// Known limitations (hackathon scope): fee-on-transfer / rebasing tokens are not supported; a defaulter with
/// no collateral left simply makes that round's pot smaller; the randomized payout order uses onchain
/// pseudo-randomness that a block producer can influence.
contract AjoCircle is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MIN_MEMBERS = 2;
    uint256 public constant MAX_MEMBERS = 50;
    uint256 public constant MIN_ROUND_LENGTH = 60; // seconds; keeps demos fast while preventing zero-length rounds
    uint256 internal constant ACC = 1e27; // precision for yield-per-unit accounting

    /// @notice Where idle collateral earns yield. address(0) disables yield routing entirely.
    IYieldAdapter public immutable yieldAdapter;
    /// @notice Token the adapter accepts (only circles in this token are routed). address(0) if no adapter.
    address public immutable yieldAsset;

    enum Status {
        Open,
        Active,
        Completed,
        Cancelled
    }

    struct Circle {
        address creator;
        IERC20 token;
        uint256 contributionAmount;
        uint64 roundLength;
        uint64 roundDeadline;
        uint64 startedAt;
        uint16 maxMembers;
        uint16 currentRound; // 0-based
        uint16 activeMembers; // members that have not exited
        bool randomOrder;
        bool requireCollateral;
        Status status;
        uint256 pot; // tokens collected for the current round
        string name;
    }

    struct Member {
        bool joined;
        bool exited;
        bool defaulted;
        bool receivedPayout;
        uint16 missedPayments;
        uint256 collateral;
    }

    struct YieldInfo {
        uint256 routed; // collateral of this circle currently inside the adapter
        uint256 debt; // routed * accYieldPerUnit at last sync (MasterChef-style)
        uint256 accrued; // yield attributed to the circle, not yet distributed
        uint256 distributed; // yield credited to members at close
    }

    uint256 public circleCount;

    /// @notice Sum of `routed` over all circles.
    uint256 public totalRouted;
    /// @notice Cumulative yield per routed token, scaled by 1e27.
    uint256 public accYieldPerUnit;
    /// @notice Yield harvested while nothing was routed; folded in at the next harvest.
    uint256 public unallocatedYield;
    mapping(uint256 => YieldInfo) internal _yield;
    /// @notice Yield credited to a member when their circle closed (already included in `claimable`).
    mapping(uint256 => mapping(address => uint256)) public yieldEarned;

    mapping(uint256 => Circle) internal _circles;
    mapping(uint256 => address[]) internal _members; // join order
    mapping(uint256 => address[]) internal _payoutOrder; // set at start
    mapping(uint256 => mapping(address => Member)) internal _memberInfo;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) internal _paid; // circle => round => member
    /// @notice Tokens a user can withdraw via `claimPayout` (payouts, forfeited-pot shares, returned collateral).
    mapping(uint256 => mapping(address => uint256)) public claimable;

    // ------------------------------------------------------------------ events
    event CircleCreated(
        uint256 indexed circleId,
        address indexed creator,
        address token,
        uint256 contributionAmount,
        uint16 maxMembers,
        uint64 roundLength,
        bool randomOrder,
        bool requireCollateral,
        string name
    );
    event MemberJoined(uint256 indexed circleId, address indexed member, uint256 collateral);
    event MemberLeft(uint256 indexed circleId, address indexed member, uint256 refunded);
    event CircleCancelled(uint256 indexed circleId);
    event CircleStarted(uint256 indexed circleId, address[] payoutOrder, uint64 firstDeadline);
    event ContributionMade(uint256 indexed circleId, uint256 indexed round, address indexed member, uint256 amount);
    event CollateralSlashed(uint256 indexed circleId, uint256 indexed round, address indexed member, uint256 amount);
    event MemberDefaulted(uint256 indexed circleId, uint256 indexed round, address indexed member);
    event MemberExited(uint256 indexed circleId, uint256 indexed round, address indexed member, uint256 forfeited);
    event PayoutSent(uint256 indexed circleId, uint256 indexed round, address indexed recipient, uint256 amount);
    event PayoutCredited(uint256 indexed circleId, uint256 indexed round, address indexed recipient, uint256 amount);
    event ForfeitedPotSplit(uint256 indexed circleId, uint256 indexed round, uint256 amount, uint256 recipients);
    event RoundSettled(uint256 indexed circleId, uint256 indexed round, address indexed caller);
    event RoundStarted(uint256 indexed circleId, uint256 indexed round, address recipient, uint64 deadline);
    event CollateralReturned(uint256 indexed circleId, address indexed member, uint256 amount);
    event CircleCompleted(uint256 indexed circleId);
    event Claimed(uint256 indexed circleId, address indexed account, uint256 amount);
    event CollateralRouted(uint256 indexed circleId, uint256 amount);
    event CollateralUnrouted(uint256 indexed circleId, uint256 amount);
    event YieldHarvested(uint256 amount);
    event YieldDistributed(uint256 indexed circleId, address indexed member, uint256 amount);

    // ------------------------------------------------------------------ errors
    error InvalidParams();
    error NotCreator();
    error WrongStatus();
    error CircleFull();
    error AlreadyMember();
    error NotMember();
    error NotFull();
    error AlreadyPaid();
    error RoundNotOver();
    error MemberHasExited();
    error AlreadyReceivedPayout();
    error NothingToClaim();
    error UnknownCircle();
    error AdapterShortfall();

    /// @param adapter Optional IYieldAdapter (e.g. MUSD savings). Pass address(0) for no yield routing.
    constructor(address adapter) {
        yieldAdapter = IYieldAdapter(adapter);
        if (adapter != address(0)) {
            IYieldAdapter(adapter).bind();
            address a = IYieldAdapter(adapter).asset();
            yieldAsset = a;
            IERC20(a).forceApprove(adapter, type(uint256).max);
        }
    }

    modifier exists(uint256 circleId) {
        if (circleId == 0 || circleId > circleCount) revert UnknownCircle();
        _;
    }

    // ------------------------------------------------------------------ open phase

    /// @notice Create a new circle. The creator is NOT auto-joined; call `join` to take a seat.
    function createCircle(
        address token,
        uint256 contributionAmount,
        uint16 maxMembers,
        uint64 roundLength,
        bool randomOrder,
        bool requireCollateral,
        string calldata name
    ) external returns (uint256 circleId) {
        if (
            token == address(0) || contributionAmount == 0 || maxMembers < MIN_MEMBERS
                || maxMembers > MAX_MEMBERS || roundLength < MIN_ROUND_LENGTH || bytes(name).length > 64
        ) revert InvalidParams();

        circleId = ++circleCount;
        Circle storage c = _circles[circleId];
        c.creator = msg.sender;
        c.token = IERC20(token);
        c.contributionAmount = contributionAmount;
        c.maxMembers = maxMembers;
        c.roundLength = roundLength;
        c.randomOrder = randomOrder;
        c.requireCollateral = requireCollateral;
        c.status = Status.Open;
        c.name = name;

        emit CircleCreated(
            circleId, msg.sender, token, contributionAmount, maxMembers, roundLength, randomOrder,
            requireCollateral, name
        );
    }

    /// @notice Take a seat. If the circle requires collateral, one contribution is pulled (approve first).
    function join(uint256 circleId) external nonReentrant exists(circleId) {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Open) revert WrongStatus();
        if (_members[circleId].length >= c.maxMembers) revert CircleFull();
        Member storage m = _memberInfo[circleId][msg.sender];
        if (m.joined) revert AlreadyMember();

        m.joined = true;
        _members[circleId].push(msg.sender);
        c.activeMembers++;

        uint256 collateral;
        if (c.requireCollateral) {
            collateral = c.contributionAmount;
            m.collateral = collateral;
            c.token.safeTransferFrom(msg.sender, address(this), collateral);
        }
        emit MemberJoined(circleId, msg.sender, collateral);
    }

    /// @notice Leave before the circle starts and get any collateral back.
    function leave(uint256 circleId) external nonReentrant exists(circleId) {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Open) revert WrongStatus();
        Member storage m = _memberInfo[circleId][msg.sender];
        if (!m.joined) revert NotMember();

        uint256 refund = m.collateral;
        delete _memberInfo[circleId][msg.sender];
        _removeMemberPreservingOrder(circleId, msg.sender);
        c.activeMembers--;

        if (refund > 0) c.token.safeTransfer(msg.sender, refund);
        emit MemberLeft(circleId, msg.sender, refund);
    }

    /// @notice Creator can cancel an Open circle; every member's collateral is refunded.
    function cancelCircle(uint256 circleId) external nonReentrant exists(circleId) {
        Circle storage c = _circles[circleId];
        if (msg.sender != c.creator) revert NotCreator();
        if (c.status != Status.Open) revert WrongStatus();
        c.status = Status.Cancelled;

        address[] storage members = _members[circleId];
        for (uint256 i; i < members.length; i++) {
            Member storage m = _memberInfo[circleId][members[i]];
            uint256 refund = m.collateral;
            if (refund > 0) {
                m.collateral = 0;
                c.token.safeTransfer(members[i], refund);
            }
            emit MemberLeft(circleId, members[i], refund);
        }
        emit CircleCancelled(circleId);
    }

    /// @notice Creator starts a full circle. Fixes the payout order and opens round 0.
    function start(uint256 circleId) external nonReentrant exists(circleId) {
        Circle storage c = _circles[circleId];
        if (msg.sender != c.creator) revert NotCreator();
        if (c.status != Status.Open) revert WrongStatus();
        address[] storage members = _members[circleId];
        if (members.length != c.maxMembers) revert NotFull();

        address[] memory order = members; // copy of join order
        if (c.randomOrder) {
            // Fisher-Yates shuffle seeded with onchain data.
            // NOT secure randomness: block producers / sequencers can influence prevrandao and the block.
            // Good enough for a friendly savings circle demo; use a VRF for anything adversarial.
            uint256 seed = uint256(
                keccak256(abi.encodePacked(block.prevrandao, blockhash(block.number - 1), circleId, block.timestamp))
            );
            for (uint256 i = order.length - 1; i > 0; i--) {
                uint256 j = uint256(keccak256(abi.encodePacked(seed, i))) % (i + 1);
                (order[i], order[j]) = (order[j], order[i]);
            }
        }
        _payoutOrder[circleId] = order;

        c.status = Status.Active;
        c.startedAt = uint64(block.timestamp);
        c.currentRound = 0;
        c.roundDeadline = uint64(block.timestamp) + c.roundLength;

        if (_routes(c)) _route(circleId, uint256(c.contributionAmount) * members.length);

        emit CircleStarted(circleId, order, c.roundDeadline);
        emit RoundStarted(circleId, 0, order[0], c.roundDeadline);
    }

    // ------------------------------------------------------------------ active phase

    /// @notice Pay this round's contribution (approve first). Auto-pays the recipient when everyone has paid.
    function contribute(uint256 circleId) external nonReentrant exists(circleId) {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Active) revert WrongStatus();
        Member storage m = _memberInfo[circleId][msg.sender];
        if (!m.joined) revert NotMember();
        if (m.exited) revert MemberHasExited();
        uint256 round = c.currentRound;
        if (_paid[circleId][round][msg.sender]) revert AlreadyPaid();

        _paid[circleId][round][msg.sender] = true;
        c.pot += c.contributionAmount;
        c.token.safeTransferFrom(msg.sender, address(this), c.contributionAmount);
        emit ContributionMade(circleId, round, msg.sender, c.contributionAmount);

        if (_allActivePaid(circleId, round)) _completeRound(circleId, true);
    }

    /// @notice After the round deadline, anyone can settle the round: unpaid members are slashed/flagged and
    ///         the pot is credited to the recipient (claim with `claimPayout`).
    function settleRound(uint256 circleId) external nonReentrant exists(circleId) {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Active) revert WrongStatus();
        if (block.timestamp <= c.roundDeadline) revert RoundNotOver();
        uint256 round = c.currentRound;

        address[] storage members = _members[circleId];
        uint256 slashed;
        for (uint256 i; i < members.length; i++) {
            address who = members[i];
            Member storage m = _memberInfo[circleId][who];
            if (m.exited || _paid[circleId][round][who]) continue;

            uint256 cover = m.collateral >= c.contributionAmount ? c.contributionAmount : m.collateral;
            if (cover > 0) {
                m.collateral -= cover;
                c.pot += cover;
                slashed += cover;
                emit CollateralSlashed(circleId, round, who, cover);
            }
            m.defaulted = true;
            m.missedPayments++;
            emit MemberDefaulted(circleId, round, who);
        }
        if (slashed > 0 && _routes(c)) _unroute(circleId, slashed);
        emit RoundSettled(circleId, round, msg.sender);
        _completeRound(circleId, false);
    }

    /// @notice Leave an active circle before receiving a payout. Forfeits collateral and the member's own payout.
    function exitCircle(uint256 circleId) external nonReentrant exists(circleId) {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Active) revert WrongStatus();
        Member storage m = _memberInfo[circleId][msg.sender];
        if (!m.joined) revert NotMember();
        if (m.exited) revert MemberHasExited();
        if (m.receivedPayout) revert AlreadyReceivedPayout();

        uint256 round = c.currentRound;
        uint256 forfeited = m.collateral;
        m.collateral = 0;
        m.exited = true;
        c.activeMembers--;
        c.pot += forfeited;
        if (forfeited > 0 && _routes(c)) _unroute(circleId, forfeited);
        emit MemberExited(circleId, round, msg.sender, forfeited);

        // If everyone still active has already paid, the round can complete now.
        if (c.activeMembers > 0 && _allActivePaid(circleId, round)) _completeRound(circleId, true);
    }

    /// @notice Withdraw everything credited to you in a circle (deadline payouts, forfeited-pot shares,
    ///         collateral returned at close).
    function claimPayout(uint256 circleId) external nonReentrant exists(circleId) {
        uint256 amount = claimable[circleId][msg.sender];
        if (amount == 0) revert NothingToClaim();
        claimable[circleId][msg.sender] = 0;
        _circles[circleId].token.safeTransfer(msg.sender, amount);
        emit Claimed(circleId, msg.sender, amount);
    }

    // ------------------------------------------------------------------ internal

    function _allActivePaid(uint256 circleId, uint256 round) internal view returns (bool) {
        address[] storage members = _members[circleId];
        for (uint256 i; i < members.length; i++) {
            address who = members[i];
            if (_memberInfo[circleId][who].exited) continue;
            if (!_paid[circleId][round][who]) return false;
        }
        return true;
    }

    function _completeRound(uint256 circleId, bool push) internal {
        Circle storage c = _circles[circleId];
        uint256 round = c.currentRound;
        address recipient = _payoutOrder[circleId][round];
        uint256 amount = c.pot;
        c.pot = 0;

        Member storage r = _memberInfo[circleId][recipient];
        r.receivedPayout = true;

        if (r.exited && c.activeMembers > 0) {
            // Exited member forfeits their turn: split the pot between remaining active members.
            _splitForfeitedPot(circleId, round, amount);
        } else if (amount > 0) {
            if (push) {
                c.token.safeTransfer(recipient, amount);
                emit PayoutSent(circleId, round, recipient, amount);
            } else {
                claimable[circleId][recipient] += amount;
                emit PayoutCredited(circleId, round, recipient, amount);
            }
        }

        uint16 next = c.currentRound + 1;
        if (next >= c.maxMembers) {
            _close(circleId);
        } else {
            c.currentRound = next;
            c.roundDeadline = uint64(block.timestamp) + c.roundLength;
            emit RoundStarted(circleId, next, _payoutOrder[circleId][next], c.roundDeadline);
        }
    }

    function _splitForfeitedPot(uint256 circleId, uint256 round, uint256 amount) internal {
        Circle storage c = _circles[circleId];
        address[] storage members = _members[circleId];
        uint256 share = amount / c.activeMembers;
        uint256 dust = amount - share * c.activeMembers;
        bool dustGiven;
        for (uint256 i; i < members.length; i++) {
            address who = members[i];
            if (_memberInfo[circleId][who].exited) continue;
            uint256 credit = share;
            if (!dustGiven) {
                credit += dust;
                dustGiven = true;
            }
            claimable[circleId][who] += credit;
        }
        emit ForfeitedPotSplit(circleId, round, amount, c.activeMembers);
    }

    function _close(uint256 circleId) internal {
        Circle storage c = _circles[circleId];
        c.status = Status.Completed;
        c.roundDeadline = 0;
        address[] storage members = _members[circleId];

        uint256 yieldOut;
        uint256 totalCol; // == remaining routed principal when routing is on
        if (_routes(c)) {
            YieldInfo storage y = _yield[circleId];
            if (y.routed > 0) _unroute(circleId, y.routed); // harvests + syncs first
            yieldOut = y.accrued;
            y.accrued = 0;
            y.distributed = yieldOut;
            for (uint256 i; i < members.length; i++) {
                totalCol += _memberInfo[circleId][members[i]].collateral;
            }
        }
        if (yieldOut > 0) _distributeYield(circleId, yieldOut, totalCol);

        for (uint256 i; i < members.length; i++) {
            Member storage m = _memberInfo[circleId][members[i]];
            uint256 col = m.collateral;
            if (col > 0) {
                m.collateral = 0;
                claimable[circleId][members[i]] += col;
                emit CollateralReturned(circleId, members[i], col);
            }
        }
        emit CircleCompleted(circleId);
    }

    // ------------------------------------------------------------------ yield (internal)

    function _routes(Circle storage c) internal view returns (bool) {
        return address(yieldAdapter) != address(0) && c.requireCollateral && address(c.token) == yieldAsset;
    }

    /// @dev Pull accrued yield from the adapter into this contract and spread it over routed principal.
    ///      Measures the balance delta instead of trusting the adapter's return value.
    function _harvest() internal {
        uint256 before = IERC20(yieldAsset).balanceOf(address(this));
        yieldAdapter.harvest(address(this));
        uint256 got = IERC20(yieldAsset).balanceOf(address(this)) - before;
        if (got > 0) emit YieldHarvested(got);
        got += unallocatedYield;
        if (got == 0) return;
        if (totalRouted == 0) {
            unallocatedYield = got;
        } else {
            unallocatedYield = 0;
            accYieldPerUnit += (got * ACC) / totalRouted;
        }
    }

    function _sync(uint256 circleId) internal {
        YieldInfo storage y = _yield[circleId];
        uint256 cum = (y.routed * accYieldPerUnit) / ACC;
        y.accrued += cum - y.debt;
        y.debt = cum; // so a later sync only adds newly harvested yield
    }

    function _setRouted(uint256 circleId, uint256 routed) internal {
        YieldInfo storage y = _yield[circleId];
        y.routed = routed;
        y.debt = (routed * accYieldPerUnit) / ACC;
    }

    function _route(uint256 circleId, uint256 amount) internal {
        if (amount == 0) return;
        _harvest();
        _sync(circleId);
        totalRouted += amount;
        _setRouted(circleId, _yield[circleId].routed + amount);
        yieldAdapter.deposit(amount);
        emit CollateralRouted(circleId, amount);
    }

    function _unroute(uint256 circleId, uint256 amount) internal {
        // Harvest any already-claimable yield first, then pull principal. Mezo's MUSDSavingsRate.withdraw
        // calls receiveYieldFromStrategy + _claimYield before returning principal, so fresh yield can land
        // on the adapter in the same call. Harvest again WHILE this circle's routed amount still counts
        // toward totalRouted, then reduce routed. Otherwise that auto-claimed yield is stranded on the
        // adapter (or parked as unallocatedYield once totalRouted hits 0), and a closing circle misses it.
        _harvest();
        _sync(circleId);
        uint256 before = IERC20(yieldAsset).balanceOf(address(this));
        yieldAdapter.withdraw(amount, address(this));
        if (IERC20(yieldAsset).balanceOf(address(this)) - before < amount) revert AdapterShortfall();
        _harvest();
        _sync(circleId);
        totalRouted -= amount;
        _setRouted(circleId, _yield[circleId].routed - amount);
        emit CollateralUnrouted(circleId, amount);
    }

    /// @dev Pro rata to remaining collateral; if nobody has collateral left, equally among members who did not
    ///      exit; if everyone exited, to the creator. Rounding dust goes to the first recipient.
    function _distributeYield(uint256 circleId, uint256 amount, uint256 totalCol) internal {
        address[] storage members = _members[circleId];
        uint256 eligible;
        if (totalCol == 0) {
            for (uint256 i; i < members.length; i++) {
                if (!_memberInfo[circleId][members[i]].exited) eligible++;
            }
            if (eligible == 0) {
                _creditYield(circleId, _circles[circleId].creator, amount);
                return;
            }
        }
        uint256 given;
        address first;
        for (uint256 i; i < members.length; i++) {
            Member storage m = _memberInfo[circleId][members[i]];
            uint256 share;
            if (totalCol > 0) {
                if (m.collateral == 0) continue;
                share = (amount * m.collateral) / totalCol;
            } else {
                if (m.exited) continue;
                share = amount / eligible;
            }
            if (first == address(0)) first = members[i];
            given += share;
            _creditYield(circleId, members[i], share);
        }
        if (amount > given) _creditYield(circleId, first, amount - given);
    }

    function _creditYield(uint256 circleId, address who, uint256 amount) internal {
        if (amount == 0) return;
        claimable[circleId][who] += amount;
        yieldEarned[circleId][who] += amount;
        emit YieldDistributed(circleId, who, amount);
    }

    function _removeMemberPreservingOrder(uint256 circleId, address who) internal {
        address[] storage members = _members[circleId];
        uint256 len = members.length;
        for (uint256 i; i < len; i++) {
            if (members[i] == who) {
                for (uint256 j = i; j + 1 < len; j++) {
                    members[j] = members[j + 1];
                }
                members.pop();
                return;
            }
        }
    }

    // ------------------------------------------------------------------ views

    function getCircle(uint256 circleId) external view exists(circleId) returns (Circle memory) {
        return _circles[circleId];
    }

    function getMembers(uint256 circleId) external view returns (address[] memory) {
        return _members[circleId];
    }

    function getPayoutOrder(uint256 circleId) external view returns (address[] memory) {
        return _payoutOrder[circleId];
    }

    function getMember(uint256 circleId, address who) external view returns (Member memory) {
        return _memberInfo[circleId][who];
    }

    function hasPaid(uint256 circleId, uint256 round, address who) external view returns (bool) {
        return _paid[circleId][round][who];
    }

    /// @notice Recipient of the current round (address(0) if not active).
    function currentRecipient(uint256 circleId) external view returns (address) {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Active) return address(0);
        return _payoutOrder[circleId][c.currentRound];
    }

    /// @notice Yield position of a circle. `earned` is an estimate that includes not-yet-harvested yield.
    /// @return routed Collateral currently earning in the adapter.
    /// @return earned Yield attributed so far (estimate while active; final amount once completed).
    /// @return distributed Yield credited to members at close.
    function getYield(uint256 circleId)
        external
        view
        returns (uint256 routed, uint256 earned, uint256 distributed)
    {
        YieldInfo storage y = _yield[circleId];
        routed = y.routed;
        distributed = y.distributed;
        if (distributed > 0) return (routed, distributed, distributed);
        uint256 acc = accYieldPerUnit;
        if (address(yieldAdapter) != address(0) && totalRouted > 0) {
            acc += ((yieldAdapter.pendingYield() + unallocatedYield) * ACC) / totalRouted;
        }
        earned = y.accrued + (y.routed * acc) / ACC - y.debt;
    }

    /// @notice Paid-status of every member for a round, aligned with `getMembers`.
    function roundStatus(uint256 circleId, uint256 round) external view returns (address[] memory members, bool[] memory paid) {
        members = _members[circleId];
        paid = new bool[](members.length);
        for (uint256 i; i < members.length; i++) {
            paid[i] = _paid[circleId][round][members[i]];
        }
    }
}
