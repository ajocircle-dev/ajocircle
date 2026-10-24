# AjoCircle: pitch deck outline (7 slides, plus a team placeholder)

Mezo Buildathon Wave 1 · Track 2: Access & Distribution for MUSD.
Theme: dark navy with Bitcoin orange (#F7931A) accents, which match the app's "Powered by MUSD" banner.
Keep it to one idea per slide and at most 4 bullets.

---

## 1. Problem: Ajo runs on trust and WhatsApp
- Rotating savings (ajo / esusu) are one of the most common ways Nigerians save. [VERIFY with a figure from
  EFInA A2F 2023 or World Bank Findex 2021: share of adults saving through a savings club or person outside the family]
- One treasurer holds the cash and records live in a chat thread, so a disappearing organiser means everyone loses.
- Members who've already collected can stop paying, and the group has no recourse.
- Savings are in naira, so they lose value between rounds.

**Visual:** a phone showing a messy WhatsApp ajo group ("who never pay?") next to a cash envelope, with a
red "trust" label.

## 2. Solution: AjoCircle, your ajo without the trust problem
- The same circle the community already runs, enforced by a smart contract on Mezo.
- Everything is in **MUSD**, a BTC-backed dollar stablecoin, so savings hold their value.
- Collateral and public default flags replace "chasing people on WhatsApp".
- One invite link to share in the family group.

**Visual:** the app's home screen with the "Powered by MUSD" banner. The tagline goes in large type.

## 3. How it works
- **Create**: amount, members, round length, optional collateral.
- **Join** via link, posting one contribution as collateral. The creator **starts**, and the payout order is locked.
- **Contribute** each round. The last payment **auto-pays the pot** in the same transaction.
- **Miss a round**: anyone settles after the deadline, collateral covers it, and the member is flagged.
  **Close**: collateral plus yield is returned.

**Visual:** a 4-step horizontal flow (Create → Join → Contribute/Payout → Close) with the 3 member avatars
passing a coin around a circle.

## 4. Mezo / MUSD integration: extend, don't detour
- MUSD is the unit of account for every contribution, pot and collateral, so each circle is recurring MUSD demand.
- Idle collateral goes into the **MUSD Savings Vault (sMUSD)** through `IYieldAdapter`. It's composable with Mezo
  Earn: no lock-up, and yield is shared back at close.
- Safe by design: the pot is never routed, so payouts are never delayed. Principal-shortfall checks revert.
- Testnet runs native MUSD, because the sMUSD vault is mainnet-only. The adapter is fork-tested against the real
  vault (`0xb4D4…51CC`).

**Visual:** architecture diagram showing Members → AjoCircle (pot stays here) → collateral → MUSDSavingsRateAdapter →
MUSD Savings Vault → yield back to members. Put the MUSD and Mezo logos on the arrows.

## 5. Demo
- A live circle on Mezo testnet: join, contribute, auto-payout, a defaulter settled.
- Every action is an onchain event, and the history is rebuilt straight from the chain.
- Links: live app · repo · contract on explorer.test.mezo.org.

**Visual:** 3 screenshots (invite/join, "pot sent" in History, members table with the defaulter badge), plus a QR
code to the live app.

## 6. Market and traction: Nigeria first
- **Market:** Nigeria has more than 200M people, a young and mobile-first population, and an existing ajo/esusu
  habit, so there's no behaviour to teach. [VERIFY with figures from EFInA / Findex / GSMA]
- **Wedge:** market traders, church and alumni groups, and office ajo, which are groups that already pool money every week.
- **Traction (honest):** Wave 1 build is live on Mezo testnet with 32 tests passing. Pilot conversations: [TBD, add real
  names or counts if any].
- **Why MUSD:** dollar savings backed by BTC with no bank account needed. Every circle adds MUSD TVL and recurring
  transfers.

**Visual:** a map of Nigeria with Lagos highlighted. Use 3 big-number tiles (population, % using savings groups,
mobile share) and leave the [VERIFY] numbers blank until they're sourced.

## 7. Roadmap: next 3 milestones
1. **Wave 2 (Nov 2–15):** WhatsApp/Telegram bot for reminders, "who's paid" and invite links (meeting users where
   they already are). Mainnet deploy with sMUSD yield switched on.
2. **Pilot (Dec):** 5 real ajo circles in Lagos with about 50 members, on naira ↔ MUSD on/off-ramp partners.
3. **Q1 2027:** reputation from repayment history (good-payer score), larger circles, VRF payout order and an audit.

**Visual:** a 3-node timeline, with a bot icon at node 1, a people icon at node 2 and a shield icon at node 3.

---

## Team (placeholder slide)
- **[Name]**, role, one-line credential (e.g. "built X", "ran a 30-person ajo for 4 years").
- **[Name]**, role.
- Contact: [email] · [X/Telegram] · GitHub [link]

**Visual:** headshots in circles (it's a savings *circle*), plus a single line on why this team understands ajo.
