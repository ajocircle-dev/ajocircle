# AKINDO submission draft: Mezo Buildathon Wave 1

Deadline: **Mon 26 Oct 2026, 16:00 WAT** (15:00 UTC). Live app: https://ajocircle.pages.dev · repo: https://github.com/ajocircle-dev/ajocircle
Required materials are a live link, a public repo, the deck and the 2-minute video.

---

**Project name**
AjoCircle

**Category (3–5 words)**
Onchain community savings circles

**TL;DR**
AjoCircle puts Nigeria's ajo/esusu rotating savings circles onchain in MUSD. Friends pool BTC-backed dollars, the
contract pays each round's pot automatically, collateral covers missed payments, and idle collateral can earn in
Mezo's MUSD Savings Vault. It's the same savings habit, without the treasurer you have to trust.

**How it works (incl. MUSD use)**
1. A creator sets up a circle: contribution in MUSD, number of members, round length, optional collateral, and
   join-order or shuffled payouts. Members join through a shareable invite link and post one contribution as collateral.
2. Each round every member contributes MUSD. When the last payment lands, the contract sends the whole pot to that
   round's recipient in the same transaction.
3. If someone misses the deadline, anyone can settle the round. The missed payment is slashed from collateral, the
   recipient still gets a full pot, and the member is flagged as a defaulter onchain. Members who haven't been paid
   can exit early by forfeiting their collateral and their turn.
4. **MUSD use:** MUSD is the unit of account for every contribution, pot and collateral. Through an `IYieldAdapter`,
   collateral (never the pot) can be routed into the **MUSD Savings Vault (sMUSD)**, which has no lock-up. The yield is
   shared back to members pro rata at close. The sMUSD vault is live on Mezo testnet
   (`0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16`) and mainnet. Wave 2 wired the adapter on testnet (AjoCircle
   `0x463203F3Cd12653bEa11FfCd22512B11e2a91835`, adapter `0x02c9711eaD8b6d101A542eEC8DA2b41Cbe7eD6f6`). Circle 2
   proved yield reaches a closing circle: **67454618812000 wei** total, of which ~0.0000228 MUSD was natural
   protocol yield and ~0.0000447 MUSD was a synthetic testnet donation used only while diagnosing a harvest
   checkpoint bug (do not present the donation as organic). A local adapter fix (always `claimYield` + live
   `pendingYield`) is ready but not live until a redeploy; the live adapter is still the pre-fix build.

**Target group**
Nigerian (and wider African) informal savers who already run ajo/esusu/chama groups: market traders, church and
alumni groups, office colleagues and diaspora families. Mostly mobile-first, often underbanked, and wanting
dollar-denominated savings.

**Tech stack**
Solidity 0.8.24, Foundry and OpenZeppelin 5 (SafeERC20, ReentrancyGuard). Unit, fuzz and yield accounting tests,
plus opt-in forks against the real Mezo testnet (and optional mainnet) sMUSD vault. Next.js 15, React 19, wagmi 2
and viem 2 (TypeScript). Mezo testnet (chain 31611), MUSD `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`.
sMUSD testnet vault `0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16`.

**Track**
Track 2: Access and Distribution for MUSD/MEZO

**Chain**
Mezo (testnet for Wave 1/2; sMUSD yield on testnet for Wave 2)

**Project status**
Working MVP. The contracts are complete and tested, and the web app covers create, invite, join, contribute,
auto-payout, settle/default, early exit, claim, the yield panel and the onchain history.
Live on Mezo testnet: Wave 2 contract [`0x463203F3Cd12653bEa11FfCd22512B11e2a91835`](https://explorer.test.mezo.org/address/0x463203F3Cd12653bEa11FfCd22512B11e2a91835) (sMUSD adapter `0x02c9711eaD8b6d101A542eEC8DA2b41Cbe7eD6f6`) · app https://ajocircle.pages.dev (circle pages: `https://ajocircle.pages.dev/circle/?id=N`) · repo https://github.com/ajocircle-dev/ajocircle

**Readiness**
Testnet MVP (demo-ready). Unaudited, and not for real funds yet.

**Next 3 milestones**
1. **Wave 2 (Nov 2–15):** sMUSD collateral yield is wired on Mezo testnet (circle 2 proved yield at close).
   Next: redeploy the harvest-checkpoint adapter fix when the user OKs, then WhatsApp/Telegram reminders.
   Mainnet only with the user's explicit go-ahead.
2. **December pilot:** 5 real ajo circles in Lagos (about 50 members), with naira ↔ MUSD on/off-ramp partners for
   onboarding.
3. **Q1 2027:** onchain good-payer reputation from repayment history, VRF-based payout order, larger circles and a
   security audit.

**Team info**
[TBD: names, roles, one-line backgrounds, contact email used at registration, X/Telegram, GitHub.]
Note: KYB is required before any MEZO payout, so prepare ID, proof of address and a W-8BEN/W-9 early.
