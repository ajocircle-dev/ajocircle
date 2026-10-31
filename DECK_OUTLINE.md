# AjoCircle: pitch deck (final copy, 7 slides, exported as a PDF)

Mezo Buildathon Wave 1 · Track 2: Access & Distribution for MUSD.
Theme: dark navy with Bitcoin orange (#F7931A) accents, matching the app's "Powered by MUSD" banner.
Each slide has one idea and at most 4 lines. Source tags in [brackets] go on the slide in small grey type, and
full URLs are under **Sources** at the end. Every figure was checked against the opened source on 24 Oct 2026.
Figures we couldn't confirm were dropped.

---

## Slide 1: Ajo works. The trust doesn't.
**On slide**
- **28.0%** of Nigerian adults saved through a savings club or a person outside the family in 2024, up from 24.7% in
  2021. [Global Findex 2025, World Bank]
- **11.7M** adults use a savings group and **13.1M** use a savings/thrift collector. [EFInA A2F 2023, Table 1]
- One treasurer holds the cash and the records live in a chat, so if the organiser disappears, everyone loses.
- Members who've already collected can stop paying, and the group has no recourse.

**Visual:** a phone showing a messy WhatsApp ajo group ("who never pay?") beside a cash envelope, with a red "trust" tag.

**Speaker notes:** "Ajo, also called esusu, isn't a niche. More than one in four Nigerian adults save this way, and
the share is growing. EFInA counts nearly 12 million adults in savings groups and another 13 million who hand cash to
a thrift collector. The habit is strong, but the system around it is fragile: a single person holds the money, and
when someone stops paying after collecting, the group can only complain on WhatsApp."

## Slide 2: AjoCircle: the same circle, enforced by code
**On slide**
- Your community's ajo, run by a smart contract on Mezo, with every contribution held in **MUSD** (BTC-backed dollars).
- **Create → Join → Contribute → Close:** members join from one invite link and post one contribution as collateral.
- The last contribution of each round **pays the pot automatically** in the same transaction.
- If someone misses a round, anyone can settle it after the deadline: their collateral covers it and they're publicly flagged.

**Visual:** a 4-step flow (Create → Join → Contribute/Payout → Close) around a circle of 3 avatars, next to the app home
screen with the "Powered by MUSD" banner.

**Speaker notes:** "We didn't invent a new product, we encoded the one people already trust. The payout order is
locked when the circle starts. No treasurer ever holds the pot: the contract pays it out the moment the last member
pays. Defaults are handled by rules everyone agreed to up front, not by chasing people. And because it's in MUSD,
the savings hold dollar value between rounds."

## Slide 3: Mezo / MUSD integration
**On slide**
- MUSD is the unit for every contribution, pot and collateral deposit, so each circle creates recurring MUSD demand and transfers.
- Idle collateral is routed through `IYieldAdapter` to the **MUSD Savings Vault (sMUSD)**, and yield is shared back to members at close.
- Safe by design: the pot is never routed, so payouts are never delayed, and a principal shortfall reverts.
- **sMUSD integration works on Mezo testnet** (vault `0x6f461c…e16`, fork-tested); Wave 2 wires the adapter

**Visual:** Members → AjoCircle (pot stays here) → collateral → MUSDSavingsRateAdapter → MUSD Savings Vault
(testnet `0x6f461c…e16`) → yield back to members. Put the MUSD and Mezo logos on the arrows.

**Speaker notes:** "Every circle is MUSD distribution. Real people get MUSD and use it every week. Collateral would
otherwise sit idle, so it earns in Mezo's MUSD Savings Vault (sMUSD) and that yield goes back to the members.
sMUSD is live on Mezo testnet and mainnet; Wave 2 wires the adapter on testnet. We chose the Savings Vault over the
Stability Pool because a pool's principal can shrink in liquidations, and ajo money can't take that risk."

## Slide 4: Demo
**On slide**
- Deployed on Mezo testnet: contract `0x94A5…ea2C`, with source verified on Sourcify.
- Shown in the demo: create a circle, join by link, contribute, the auto-payout, and settling a missed round.
- Every action emits an onchain event, and the History tab is rebuilt from the chain.
- Links: live app · GitHub repo · explorer.test.mezo.org

**Visual:** 3 screenshots (invite/join, "pot sent" in History, members table with the defaulter badge), plus a QR
code to the live app.

**Speaker notes:** "This is running on Mezo testnet now. I'll create a three-person circle, join it from the
invite link, and contribute. The last contribution triggers the payout in the same transaction. Then I let a
round lapse and settle it, and you can see the collateral cover the missed payment and the member get flagged.
There's no backend: the history you see is read straight from contract events."

## Slide 5: Market: Nigeria first
**On slide**
- **133.3M** Nigerian adults (15+) in 2024, and **83.8%** own a mobile phone. [Global Findex 2025]
- **63.3%** of adults have an account in 2024, but **39% (40M)** still use informal financial services. [Findex 2025; EFInA A2F 2023]
- Saving through savings clubs is just as common across Sub-Saharan Africa: **28.1%** of adults in 2024. [Global Findex 2025]
- First users: market traders, church and alumni groups, and office ajo, which already pool money every week.

**Visual:** a map of Nigeria with Lagos highlighted, and 3 big-number tiles: 28.0% save in clubs · 83.8% own a phone ·
39% use informal finance.

**Speaker notes:** "Nigeria is the beachhead. Most adults now own a phone, and a majority have an account, yet
two in five still rely on informal finance, and saving through clubs is going up, not down. That's the gap
AjoCircle fills: a habit people already have, moved onto a phone and denominated in MUSD. The same behaviour exists
across Sub-Saharan Africa, where it's called chama or tontine, so the model travels."

## Slide 6: Roadmap: next 3 milestones
**On slide**
1. **Wave 2 (Nov 2–15):** wire sMUSD yield on Mezo testnet, Get MUSD paths without a large trove, then a
   WhatsApp/Telegram bot for reminders. Mainnet only with the user's explicit go-ahead.
2. **Pilot (Dec):** 5 real ajo circles in Lagos (target of about 50 members) with naira ↔ MUSD on/off-ramp partners.
3. **Q1 2027:** a good-payer reputation score from repayment history, larger circles, VRF payout order, and an audit.

**Visual:** a 3-node timeline with a bot icon, a people icon and a shield icon.

**Speaker notes:** "Next, we wire sMUSD yield on testnet and meet users where they already coordinate, in WhatsApp.
December is about real circles with real people in Lagos. The pilot numbers are targets, not traction. After
that, repayment history becomes a reputation score, which opens the door to credit later."

## Slide 7: Team (placeholder, fill in when team info arrives)
**On slide**
- **[Name]**, [role], [one-line credential]
- **[Name]**, [role], [one-line credential]
- Contact: [email] · [X/Telegram] · GitHub [repo link]

**Visual:** headshots in circles (it's a savings *circle*), plus one line on why this team understands ajo.

**Speaker notes:** "[Placeholder: who we are, why we're the people to build this, and the ask: feedback from
Mezo and intros to on-ramp partners for the Lagos pilot.]"

---

## Sources
Every figure was checked on 24 Oct 2026 against the source as opened.

1. **Global Findex 2025, World Bank:** Global Findex Database 2025 (CSV), Nigeria and "Sub-Saharan Africa
   (excluding high income)" rows, group = all. Data download page:
   https://www.worldbank.org/en/publication/globalfindex/download-data
   CSV: https://thedocs.worldbank.org/en/doc/be6615202d1f08a25855c8ac2d615122-0050012025/related/GlobalFindexDatabase2025.csv
   Variable definitions (glossary): https://thedocs.worldbank.org/en/doc/be6615202d1f08a25855c8ac2d615122-0050012025/related/GlobalFindex2025-glossary.xlsx

   | Figure | Variable | Value |
   | --- | --- | --- |
   | Nigeria, saved using a savings club or person outside the family, 2024 | `fin17c` | 0.2804 |
   | Nigeria, same indicator, 2021 | `fin17c` | 0.2473 |
   | SSA (excluding high income), same indicator, 2024 | `fin17c` | 0.2810 |
   | Nigeria, account ownership, 2024 | `account_t_d` | 0.6326 |
   | Nigeria, owns a mobile phone, 2024 | `con1` | 0.8377 |
   | Nigeria, adult population (15+), 2024 | `pop_adult` | 133,329,232 |

   The 2021 figure, 24.7%, also matches *The Little Data Book on Financial Inclusion 2022*, Nigeria page:
   https://documents1.worldbank.org/curated/en/099731410142211021/pdf/IDU-bbc001f3-973f-4bf0-a8db-909f3bff190a.pdf
2. **EFInA, Access to Financial Services in Nigeria (A2F) 2023 Survey Report** (adults aged 18+):
   https://a2f.ng/wp-content/uploads/2024/07/A2F-2023-SURVEY-REPORT-1.pdf
   - Table 1 ("Financial products and service usage by adult population", p. 48), 2023: "Savings group that you save
     with or borrow from" 11.7M; "Savings/thrift collector/merchant" 13.1M.
   - Same page (p. 48), Section 4 text: "In 2023, 39% (40 million) of Nigerians utilized informal financial services, up from 31% in 2020."
