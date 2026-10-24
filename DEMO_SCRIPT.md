# AjoCircle demo video script (about 2.5 minutes)

**Setup before recording:** three browser profiles with wallets (Ada, Bayo, Chi), each holding test MUSD and a
little test BTC for gas. Deploy AjoCircle on Mezo testnet. Create a "demo" circle with 3 members and a short round
length (for example 3 minutes) so the missed-payment flow can be shown live. Have one circle already mid-way
through as a fallback.

---

### 0:00–0:20 · The problem (talking head or slides)
> "Over the next few minutes I'll show you AjoCircle. Millions of Nigerians save through ajo, also called esusu.
> A group pays in every week and one person takes the pot each round. It works, but it runs on trust and
> WhatsApp. The organiser holds the cash, the records are chat messages, and if someone collects early and
> stops paying, the group has no recourse."

### 0:20–0:35 · The idea
> "AjoCircle puts the circle in a smart contract on Mezo, denominated in MUSD, Mezo's Bitcoin-backed dollar.
> Nobody holds the money, everyone can see the ledger, and the rules are enforced by code."

### 0:35–1:05 · Create and invite (screen: Ada)
- Connect wallet. The header shows **Mezo Testnet**.
- Fill in **Start a circle**: name "Lagos Family Ajo", MUSD (prefilled), 50 MUSD, 3 members, 3-minute rounds, collateral on.
> "Ada creates a circle. Each round everyone pays 50 MUSD and one person takes 150. Collateral is on, so every
> member locks one contribution as a security deposit."
- Click **Create circle**, land on `/circle/1`, then click **Copy invite link**.
> "This link goes straight into the family WhatsApp group."

### 1:05–1:30 · Join and start (screens: Ada, Bayo, Chi)
- Each person opens the link and clicks **Approve & join**. Members go to 3/3 and collateral shows as 50 each.
- Ada clicks **Start circle**. The Rounds table fills with the payout order.
> "Once the circle is full, Ada starts it. The payout order is locked onchain, either by join order or shuffled."

### 1:30–1:55 · Contribute and auto-payout
- Ada and Bayo each click **Approve & Contribute 50 MUSD**. The Members table shows ✅ paid.
- Chi contributes last. The pot goes to Ada automatically, the History shows "Round 1 pot 150 MUSD sent to Ada",
  and the round advances.
> "When the last person pays, the contract sends the pot instantly. There's no treasurer and no waiting."

### 1:55–2:25 · Missed payment
- In round 2, Ada and Bayo pay but Chi doesn't. The countdown reaches zero and **Settle round** appears.
- Click it (from any wallet).
> "Chi missed the deadline. Anyone can settle the round. Chi's collateral covers the missed payment, Bayo still
> gets the full pot, and Chi is flagged as a defaulter for everyone to see."
- Show the "defaulter ×1" badge and the History lines "collateral slashed" and "flagged as defaulter".

### 2:25–2:45 · Wrap-up
- Show the explorer link for a contribution transaction on explorer.test.mezo.org.
> "Every contribution, payout and penalty is an MUSD transaction on Mezo, so savings stay in a Bitcoin-backed
> dollar instead of a depreciating currency. Next we're adding recurring reminders through WhatsApp and
> Telegram bots, and putting idle pots to work in MUSD yield. AjoCircle: your ajo, without the trust problem."

---

**Arc version:** keep the same flow, but say "USDC on Arc", show the build inside **Arc Studio**, and end on the
real mainnet USDC transaction on explorer.arc.io, which the Arc rules require.
