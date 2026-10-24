# AjoCircle: 2-minute pitch video (Mezo Buildathon Wave 1, Track 2: Access & Distribution)

**Hard limit: 2:00.** The voice-over is about 255 words, roughly 1:50 at 140 wpm, which leaves room to breathe. Record the
screen at 1080p, and cut any dead air while transactions confirm.
**Framing:** *Extend, don't detour.* AjoCircle doesn't ask people to adopt a new habit. It brings Mezo's MUSD to
a savings habit that millions of Nigerians already have.

## Before you record
- Mezo testnet app running (`NEXT_PUBLIC_CHAIN=mezoTestnet`). There are three wallets (A = creator/Ada, B = Bayo, C = Chi), each
  with test BTC for gas and enough test MUSD. Borrowing test MUSD has a 2,000 MUSD minimum.
- Pre-create **"Yaba Market Ajo"**: 10 MUSD, 3 members, 10-minute rounds, collateral on. A and B have already joined.
- Have a **second, completed circle** ready so the closing and claim screens show without waiting.
- Explorer tab open on the AjoCircle contract. Keep one shot of `README.md#musd-yield` or the yield panel ready.

## Shot list and voice-over

| Time | On screen | Voice-over |
| --- | --- | --- |
| **0:00–0:15** | Photo or b-roll of a market and a WhatsApp group, then the AjoCircle home page with the **Powered by MUSD** banner | "In Nigeria, millions of people save through *ajo*, also called esusu: friends pay into a pot, and each round one person takes it all. It works, but it runs on trust, WhatsApp and one treasurer holding everyone's naira." |
| **0:15–0:30** | Zoom on the banner | "AjoCircle keeps the ajo and swaps the rails. The circle lives in a smart contract on Mezo, and every contribution, pot and collateral is **MUSD**, a dollar stablecoin backed by Bitcoin. No custodian, and no savings melting with the naira." |
| **0:30–0:50** | Wallet C opens the invite link, clicks **Approve & join** (collateral), and A clicks **Start** | "The organiser shares one link in the family group. Chi joins and posts one contribution as collateral. The circle is full, so it starts and the payout order is locked onchain." |
| **0:50–1:10** | A, B and C click **Contribute**. On the third click the **next payout** box flips and the History shows *pot sent to Ada* | "Everyone pays 10 MUSD. When the last payment lands, the contract pays the 30 MUSD pot to this round's recipient in the same transaction. There's no treasurer and no waiting." |
| **1:10–1:30** | Completed circle: the members table shows a **defaulter** badge; History shows *collateral slashed*, *pot credited* | "If someone misses a round, anyone can settle it after the deadline. Their collateral covers the payment, the recipient still gets a full pot, and the missed payment is on the public record." |
| **1:30–1:45** | Yield panel ("Collateral earning", "+ yield") or the README MUSD-yield table | "Collateral would normally sit idle. AjoCircle can route it into Mezo's **MUSD Savings Vault** through an adapter, with no lock-up, and share the yield back at close. The pot never leaves the contract, so payouts stay on time. Mainnet uses sMUSD, and testnet runs plain MUSD." |
| **1:45–2:00** | Logo, repo URL, live link, "Track 2: Access & Distribution" | "AjoCircle meets ajo savers where they already are and brings them onto BTC-backed MUSD rails. Next we're adding WhatsApp reminders, naira on-ramps and pilots with real market circles. AjoCircle: your ajo, without the trust problem." |

## Cut-down rules
- If you're over time, shorten 1:10–1:30 to one sentence ("Miss a round and your collateral covers it.").
- Don't wait on camera for block confirmations. Cut to the confirmed state.
- Say "MUSD" clearly at least three times, because Mezo integration is 30% of the score.
- Be honest on screen: the yield panel only shows on a deployment with an adapter. On testnet, the banner reads
  "Off on this deployment (sMUSD vault is mainnet-only)". Use the README table for that shot if needed.
