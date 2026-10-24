# AjoCircle — Mezo TESTNET deployments

Network: Mezo testnet, chain ID 31611, RPC https://rpc.test.mezo.org, explorer https://explorer.test.mezo.org
TESTNET ONLY. No secrets in this file. Keystores live in ~/.foundry/keystores, passwords in /home/box/.secrets (600).

Token: MUSD (testnet) `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` (18 decimals)
Deployer: `0x7E084Cb20EBe4a3ca1353EF24c96D048AAB50146` (keystore `mezo-testnet-deployer`)

## AjoCircle v2 (current — use this for the web app)
- Commit: `31dcaf9a725b2cfd27bbd30079afdf463653bcea` (main, 32 tests pass / 1 skipped)
- Constructor: yield adapter = `0x0000000000000000000000000000000000000000` (no yield; YIELD_ADAPTER/SMUSD_VAULT/DEPLOY_MOCK_ADAPTER unset)
- Address: `0x94A5014b54bF748660AC0D953De67416fe34ea2C` — https://explorer.test.mezo.org/address/0x94A5014b54bF748660AC0D953De67416fe34ea2C
- Deploy tx: `0xdef687fbcbb0fdc8c46378e5249d5f88a034a88548300e2b8f15bcb317ce5a06` — https://explorer.test.mezo.org/tx/0xdef687fbcbb0fdc8c46378e5249d5f88a034a88548300e2b8f15bcb317ce5a06
- Deploy block: 16336238
- Broadcast: deployments/mezo-testnet-v2.json
- Verification: Sourcify exact_match (https://repo.sourcify.dev/31611/0x94A5014b54bF748660AC0D953De67416fe34ea2C). Blockscout submission queued ("Pending in queue"); explorer verifier has verified 0 contracts in 24h (last Oct 21).

Live app: https://ajocircle.pages.dev (Cloudflare Pages, static export; circle pages at https://ajocircle.pages.dev/circle/?id=N, ids start at 1)

Web env: NEXT_PUBLIC_CHAIN=mezoTestnet, NEXT_PUBLIC_AJO_ADDRESS=0x94A5014b54bF748660AC0D953De67416fe34ea2C, NEXT_PUBLIC_DEPLOY_BLOCK=16336238

## AjoCircle v1 (safety net)
- Commit: `788b7bb` (19 tests), built from a clean `git archive` copy at /workspace/ajocircle-v1
- Address: `0xB6Ba9770baE20B19A815dB6Ea4cf4b5d5e248d3e` — https://explorer.test.mezo.org/address/0xB6Ba9770baE20B19A815dB6Ea4cf4b5d5e248d3e
- Deploy tx: `0x3bd1212c523dfebfeeabeaf12c69362cc4048d49d76f3147a24aa74236ff2d3a` — https://explorer.test.mezo.org/tx/0x3bd1212c523dfebfeeabeaf12c69362cc4048d49d76f3147a24aa74236ff2d3a
- Deploy block: 16336174
- Broadcast: deployments/mezo-testnet-v1.json
- Verification: Sourcify exact_match; Blockscout queued (same as above). Web ABI for v1 is the one at commit 788b7bb.

## MUSD trove (deployer)
- openTrove tx: `0x154dde4c758ddb58c77ad6a98179948c6c2b41f7b5b8cffd7b05078c453d6832` — https://explorer.test.mezo.org/tx/0x154dde4c758ddb58c77ad6a98179948c6c2b41f7b5b8cffd7b05078c453d6832 (block 16336206)
- Borrowed 1,800 MUSD; total debt 2,001.8 MUSD (1,800 + 1.8 borrowing fee at 0.1% + 200 gas compensation)
- Collateral: 0.037281711648613505 BTC; ICR ≈ 150% (1.4998 at open, price 80,530.49)
- Status: active (1)

## Demo wallets (keystores mezo-demo-1..3)
| Wallet | Address | 500 MUSD tx | 0.002 BTC tx |
|---|---|---|---|
| mezo-demo-1 | `0x010F69291D5D4B1f4759A2268d6d6594D207B5B8` | [0x4a1e268b…e6e0](https://explorer.test.mezo.org/tx/0x4a1e268b4d77ae0fef3ea184c4a1a46619bb725da5f75e8de37f56196632e6e0) | [0xe903c7bf…5dca](https://explorer.test.mezo.org/tx/0xe903c7bf108b3fd02241f42f27e2bc5a4540fdbac8438030da22690bd2275dca) |
| mezo-demo-2 | `0x6c3c54F1234DCa73f4279fc0B021090E29828915` | [0xf2c609d5…edda](https://explorer.test.mezo.org/tx/0xf2c609d5a4dd9f6a4342373f212fc6069d3ae16309ea9a1dcdfb864de185edda) | [0x5a804b5f…ba1e](https://explorer.test.mezo.org/tx/0x5a804b5fda37ad8ebb8bcbc2e0aaf16b83db644733bc96187d31035cc7ddba1e) |
| mezo-demo-3 | `0xd02a4AaA0E3E4465b87E854458985Bbd000609ba` | [0xb5d4de44…666a](https://explorer.test.mezo.org/tx/0xb5d4de445f6784ca572b01568ede083e5ed3d032e22976c1b27c142b79b4666a) | [0x91983d5b…0757](https://explorer.test.mezo.org/tx/0x91983d5b6a85b649349bdb4d56129f166f5b5e82aa3f9721407b0a0933c00757) |

Balances after funding (Oct 24 2026 ~09:50 WAT): each demo wallet 500 MUSD + 0.002 BTC; deployer 300 MUSD + ~0.00672 BTC.

## Demo circle "Yaba Market Ajo" (v2, circle id 1)
Created Oct 24 2026 ~11:08 WAT on AjoCircle v2 `0x94A5014b54bF748660AC0D953De67416fe34ea2C`. Page: https://ajocircle.pages.dev/circle/?id=1
- Params (DEMO_SCRIPT.md "Before you record"): token MUSD, contribution 10 MUSD (1e19), maxMembers 3, roundLength 600 s (10 min), requireCollateral true, randomOrder false (not in script; web form default, payout in join order so A/Ada is first recipient), name "Yaba Market Ajo" (stored on-chain).
- Creator mezo-demo-1 (not auto-joined; joined separately). Each member approved exactly 10 MUSD and posted 10 MUSD collateral on join.
- State after setup: circleCount=1, status Open (0), 3/3 members, activeMembers 3, pot 0, contract holds 30 MUSD collateral. NOT started — creator (demo-1) must call start(1).

| Step | Wallet | Tx | Block |
|---|---|---|---|
| createCircle | mezo-demo-1 | [0x29d0b96a…90df](https://explorer.test.mezo.org/tx/0x29d0b96aef19b7dc01615f3f1e0e8e43a02db58b30fc2b11be88b811cb4e90df) | 16337397 |
| approve 10 MUSD | mezo-demo-1 | [0x8a9bf442…84df](https://explorer.test.mezo.org/tx/0x8a9bf442ad15154c8afa603909267d11010b1e472bdaf31b4c6be9a90fdc84df) | 16337401 |
| join(1) | mezo-demo-1 | [0xf5e42488…001e](https://explorer.test.mezo.org/tx/0xf5e42488e265cc42132c87fb37626ef5dc89370362059f48064ebd73399b001e) | 16337403 |
| approve 10 MUSD | mezo-demo-2 | [0x98209f52…242b](https://explorer.test.mezo.org/tx/0x98209f526c551329efc656cfad01e61592f21644abdaae433fa1c0df3f25242b) | 16337404 |
| join(1) | mezo-demo-2 | [0x0901ae8f…137c](https://explorer.test.mezo.org/tx/0x0901ae8fdcacc3624a41afa33228dc319e7d5d5789f3cc76258099a3cae7137c) | 16337405 |
| approve 10 MUSD | mezo-demo-3 | [0xf9826ee9…bcd3](https://explorer.test.mezo.org/tx/0xf9826ee96a568513dfa0430eeda5bcbec6fbe1e229c4e0dc6028514cf1c5bcd3) | 16337406 |
| join(1) | mezo-demo-3 | [0x5ac23587…77ad](https://explorer.test.mezo.org/tx/0x5ac235878ff7c01b8f50892b35438d1ec648dcbd6e8c3ef0206383fc503077ad) | 16337408 |

Balances after (Oct 24 2026 11:09 WAT): each demo wallet 490 MUSD (allowance to AjoCircle 0); BTC demo-1 0.00199999990502, demo-2 0.00199999996089, demo-3 0.00199999996057.

### Circle 1 update — demo-3 left (Oct 24 2026 11:11 WAT)
- `leave(1)` by mezo-demo-3: [0xb3e1538f…beef](https://explorer.test.mezo.org/tx/0xb3e1538f7788180fc85762b317d29cb4751e0170657aa12529460baa5d17beef) (block 16337448). MemberLeft refunded 10 MUSD collateral; demo-3 balance back to 500 MUSD, allowance to AjoCircle 0.
- Right after the leave: status Open (0), 2/3 members (demo-1, demo-2), activeMembers 2, NOT started (start(1) intentionally not called — the start happens on camera from the app as demo-1).
- Note: at 11:16 WAT a third wallet `0xED42844Cd35d734fec3B65dF486158C443896b41` (funded from the deployer at block 16337484 with 50 MUSD + 0.002 BTC, not by this run) joined circle 1 ([0xec272655…7df8](https://explorer.test.mezo.org/tx/0xec272655f9d2c442e3479ca726d8228945c87f8426dbe48168271ae9510d7df8), block 16337511). Circle 1 is therefore again 3/3, still Open, contract holds 30 MUSD collateral for it.

## Completed demo circle "Surulere Traders Ajo" (v2, circle id 2)
Run Oct 24 2026 11:12–11:16 WAT on AjoCircle v2 `0x94A5014b54bF748660AC0D953De67416fe34ea2C`. Page: https://ajocircle.pages.dev/circle/?id=2
- Params: token MUSD, contribution 10 MUSD (1e19), maxMembers 3, roundLength 60 s (= contract MIN_ROUND_LENGTH), requireCollateral true, randomOrder false, creator mezo-demo-1.
- Payout order (join order): round 0 → demo-1, round 1 → demo-2, round 2 → demo-3.
- Round 0: all 3 paid → 30 MUSD pushed to demo-1 (PayoutSent).
- Round 1: demo-1 and demo-2 paid; demo-3 deliberately missed the deadline. After the deadline demo-1 called `settleRound(2)`: demo-3's 10 MUSD collateral was slashed into the pot (CollateralSlashed + MemberDefaulted), and 30 MUSD was credited to demo-2 (PayoutCredited, claimed later). The contract has no late-payment path: `contribute` only pays the current round, so demo-3 could not pay round 1 late.
- Round 2: all 3 paid → 30 MUSD pushed to demo-3 → CircleCompleted; collateral returned (claimable) to demo-1 (10) and demo-2 (10); demo-3 had 0 left.
- Claims: demo-1 claimed 10 MUSD (collateral); demo-2 claimed 40 MUSD (30 round-1 payout + 10 collateral).

| # | Step | Wallet | Tx | Block |
|---|---|---|---|---|
| 1 | createCircle | mezo-demo-1 | [0xfff4005f…7273](https://explorer.test.mezo.org/tx/0xfff4005f1890b948a8ad3cd9fea155c8bc4f45961c6c11ee9dbeea0588fe7273) | 16337455 |
| 2 | approve 10 MUSD (collateral) | mezo-demo-1 | [0x31e6b1c6…629c](https://explorer.test.mezo.org/tx/0x31e6b1c639412f081a8a65ee19309f24d620aa2b8e2c8c3452023a893850629c) | 16337456 |
| 3 | join(2) | mezo-demo-1 | [0xfe1e00b7…d5a2](https://explorer.test.mezo.org/tx/0xfe1e00b73f5349462c83c6779601d335974c2982483dd7c5c05c13d9d4e6d5a2) | 16337464 |
| 4 | approve 10 MUSD (collateral) | mezo-demo-2 | [0xb63fdc96…5f32](https://explorer.test.mezo.org/tx/0xb63fdc96602955b6e39698ad225030858035de2b807f2da2166a34ff5fd55f32) | 16337465 |
| 5 | join(2) | mezo-demo-2 | [0xa279e5e8…fc87](https://explorer.test.mezo.org/tx/0xa279e5e858e423961a7de7473692b9517b2de7c13aa46b8b8d055c13237dfc87) | 16337466 |
| 6 | approve 10 MUSD (collateral) | mezo-demo-3 | [0x9cac901b…25e2](https://explorer.test.mezo.org/tx/0x9cac901bebab6593e6b6082ca9adaa08f99e3dcff573fb4d7f72d8b73f1e25e2) | 16337467 |
| 7 | join(2) | mezo-demo-3 | [0x3149648c…41ab](https://explorer.test.mezo.org/tx/0x3149648c98fccf06c03121827e99d994e59cac4da4f05b2960732115903841ab) | 16337468 |
| 8 | start(2) | mezo-demo-1 | [0x66f63e3f…0bb1](https://explorer.test.mezo.org/tx/0x66f63e3f03d5c006251d090721a8d1fe7d3818518520145d02e1172da8fb0bb1) | 16337469 |
| 9 | approve 10 MUSD (r0) | mezo-demo-1 | [0x652f66e6…7a11](https://explorer.test.mezo.org/tx/0x652f66e63121fa441e6ed67b78469757248da02caa63f448b6f8314f9d0e7a11) | 16337470 |
| 10 | contribute(2) r0 | mezo-demo-1 | [0xf4f6f60d…34a2](https://explorer.test.mezo.org/tx/0xf4f6f60d135bf3a2aec77048fcd251c573d11334c644159c41bf32c3f81c34a2) | 16337471 |
| 11 | approve 10 MUSD (r0) | mezo-demo-2 | [0x805ac4a2…ec6d](https://explorer.test.mezo.org/tx/0x805ac4a21f0486f4858246e59dbd8703ed803bb6bb08d73d3430cab2c396ec6d) | 16337472 |
| 12 | contribute(2) r0 | mezo-demo-2 | [0x57a50cec…d40f](https://explorer.test.mezo.org/tx/0x57a50cec5f4fe9fd4c85deaab301d10d503fec3fe6ba7a01fd0eb24bfbe8d40f) | 16337473 |
| 13 | approve 10 MUSD (r0) | mezo-demo-3 | [0x66525053…6d45](https://explorer.test.mezo.org/tx/0x66525053ee5ed3013f4d44cf458c23d735938c7404ebc9ce71defc6d93af6d45) | 16337481 |
| 14 | contribute(2) r0 | mezo-demo-3 | [0x7f9373d6…ab28](https://explorer.test.mezo.org/tx/0x7f9373d623530032d85187812f0bd0e20c3f0b23d3b326f7074a4ca73eafab28) | 16337482 |
| 15 | approve 10 MUSD (r1) | mezo-demo-1 | [0xd7de305d…3e0d](https://explorer.test.mezo.org/tx/0xd7de305dd2b17d85e61e33695c43849b8dcab181dd5bbb0eedb824ce04323e0d) | 16337484 |
| 16 | contribute(2) r1 | mezo-demo-1 | [0xf8c9edf4…04c6](https://explorer.test.mezo.org/tx/0xf8c9edf4a2cefe4e6e2fe2248391b0797590b19d3afc7d21c2a188cf8d5e04c6) | 16337485 |
| 17 | approve 10 MUSD (r1) | mezo-demo-2 | [0xeb3725a0…f07b](https://explorer.test.mezo.org/tx/0xeb3725a09d281af5fb021b795be3523f4aa3c575b33d5d790b139f4a6969f07b) | 16337486 |
| 18 | contribute(2) r1 | mezo-demo-2 | [0x91e72d9b…4dc8](https://explorer.test.mezo.org/tx/0x91e72d9b38c9221982ffa7220fbc825b0f4779002774f7b6a87f414811c64dc8) | 16337487 |
| 19 | settleRound(2) r1 (demo-3 slashed) | mezo-demo-1 | [0x3eb90cfa…69cd](https://explorer.test.mezo.org/tx/0x3eb90cfa8795149803f9e72547d7ec1e58543423efc1b122fd436f05676669cd) | 16337501 |
| 20 | approve 10 MUSD (r2) | mezo-demo-1 | [0x5bb8e349…da3f](https://explorer.test.mezo.org/tx/0x5bb8e3490fa8096cd7a974d6e56c5f2faa08f7b56fbe221371f67c36a581da3f) | 16337502 |
| 21 | contribute(2) r2 | mezo-demo-1 | [0x7f0dbee6…a220](https://explorer.test.mezo.org/tx/0x7f0dbee6d96bf1072722ae1fb9ffac08f6d473c323049943a05afeec2b0da220) | 16337503 |
| 22 | approve 10 MUSD (r2) | mezo-demo-2 | [0x29784c80…bdf7](https://explorer.test.mezo.org/tx/0x29784c8016677edb8f3abe03b4522864fcff0a35df68993c6f44950c6cbbbdf7) | 16337504 |
| 23 | contribute(2) r2 | mezo-demo-2 | [0x7c412ac7…9377](https://explorer.test.mezo.org/tx/0x7c412ac7b0457fbe105850d578369e0fbcb6ad3964578784e13aa446f0d89377) | 16337505 |
| 24 | approve 10 MUSD (r2) | mezo-demo-3 | [0xb2222ea1…b5f9](https://explorer.test.mezo.org/tx/0xb2222ea11cdab741f088cc01a05e8f08b75339263d30c8db482eec89007cb5f9) | 16337506 |
| 25 | contribute(2) r2 | mezo-demo-3 | [0xaedf92d5…9d83](https://explorer.test.mezo.org/tx/0xaedf92d57e085f024cbb5122575692992ce1e408e10a6b5954171ca2dc5e9d83) | 16337507 |
| 26 | claimPayout(2) | mezo-demo-1 | [0x82fa8612…3143](https://explorer.test.mezo.org/tx/0x82fa8612346c1ddb57c25fdda0dab5f6de17beb05c1074a00236373dcd403143) | 16337509 |
| 27 | claimPayout(2) | mezo-demo-2 | [0x53ed02b1…c233](https://explorer.test.mezo.org/tx/0x53ed02b10fcadf5828bdec5382e506949d436fe07560397c9e59b5087fcac233) | 16337510 |

Final on-chain state (circle 2): status Completed (2), currentRound 2, roundDeadline 0, pot 0, claimable 0 for all members.
| Member | Payout received | Collateral | defaulted / missedPayments | Net MUSD |
|---|---|---|---|---|
| demo-1 | 30 (round 0, pushed) | 10 returned | no / 0 | 0 |
| demo-2 | 30 (round 1, credited then claimed) | 10 returned | no / 0 | 0 |
| demo-3 | 30 (round 2, pushed) | 10 slashed in round 1 | yes / 1 | 0 (paid 20 + 10 slashed, got 30) |

Balances after (Oct 24 2026 11:16 WAT): demo-1 490 MUSD / 0.001999999666 BTC; demo-2 490 MUSD / 0.001999999837 BTC; demo-3 500 MUSD / 0.001999999835 BTC; all allowances to AjoCircle 0. Deployer 250 MUSD / ~0.0047183 BTC (down 50 MUSD + 0.002 BTC from the transfer to 0xED42…6b41 above).

## Dashboard demo circles (v2, circle ids 3–5)
Seeded Oct 24 2026 11:21–11:24 WAT on AjoCircle v2 `0x94A5014b54bF748660AC0D953De67416fe34ea2C` so the dashboard shows circles in varied states. Every tx was simulated (`cast call`) before sending; each approve was for the exact amount. All txs status 1. Circles 1 and 2 were not touched. circleCount after seeding = 5.

### "Ikeja Tech Ajo" (circle id 3) — Active, mid-way
Page: https://ajocircle.pages.dev/circle/?id=3
- Params: token MUSD, contribution 15 MUSD (1.5e19), maxMembers 3, roundLength 86400 s (1 day), randomOrder false, requireCollateral true, creator mezo-demo-2.
- Members / payout order (join order): round 0 → `0x6c3c…8915` (demo-2), round 1 → `0x7E08…0146` (deployer), round 2 → `0xd02a…09ba` (demo-3).
- Round 0 (index 0): all 3 paid → 45 MUSD pushed to demo-2 (PayoutSent, tx 14).
- Round 1 (index 1 = "round 2 of 3" in the UI): demo-2 and deployer paid; demo-3 has NOT paid.
- State: status Active (1), currentRound 1, pot 30 MUSD, startedAt 2026-10-24 11:22:14 WAT, round-1 deadline 2026-10-25 11:22:43 WAT. Each member holds 15 MUSD collateral. After that deadline anyone can call `settleRound(3)`, which would slash demo-3's collateral and credit 45 MUSD to the deployer; until then it stays Active mid-round.

| # | Step | Wallet | Tx | Block |
|---|---|---|---|---|
| 1 | createCircle "Ikeja Tech Ajo" | mezo-demo-2 | [0xd3008a51…ed46](https://explorer.test.mezo.org/tx/0xd3008a51789373db1eb324359ddc1729ace2d27a3ae563b8382502a91d0ded46) | 16337593 |
| 2 | approve 15 MUSD (collateral) | mezo-demo-2 | [0xf59c44ee…33ef](https://explorer.test.mezo.org/tx/0xf59c44ee0f7e6205439a49e6cf11b9cf88b16d4d078530f5916d5425b69333ef) | 16337594 |
| 3 | join(3) | mezo-demo-2 | [0xd47739a6…5a25](https://explorer.test.mezo.org/tx/0xd47739a6b2e4f51648ae9bbf1a4065aaac3d808f7a1f90a9b531d870b8075a25) | 16337595 |
| 4 | approve 15 MUSD (collateral) | mezo-testnet-deployer | [0x81bb5584…daf0](https://explorer.test.mezo.org/tx/0x81bb55847e8926d32fa175a830797dc2af814813229893a4806823ad12ffdaf0) | 16337596 |
| 5 | join(3) | mezo-testnet-deployer | [0xb6b86de4…8096](https://explorer.test.mezo.org/tx/0xb6b86de4c1e072021eb9db4d1750d22e23895a59bc61d63821aa60c1838d8096) | 16337597 |
| 6 | approve 15 MUSD (collateral) | mezo-demo-3 | [0xeac6fbb6…3769](https://explorer.test.mezo.org/tx/0xeac6fbb6db06d2d0c9701df85a38a83579a25fdf645f68610b0a4bf595403769) | 16337598 |
| 7 | join(3) | mezo-demo-3 | [0x1190b0d4…8dd6](https://explorer.test.mezo.org/tx/0x1190b0d4942981dec90b456f591c7309ce86afebd3a62940f0dd3a931e218dd6) | 16337599 |
| 8 | start(3) | mezo-demo-2 | [0x2bb64fbb…b077](https://explorer.test.mezo.org/tx/0x2bb64fbbf42feba8bd063b5941285be022a5896263a3aaacd0853e6a40e8b077) | 16337600 |
| 9 | approve 15 MUSD (r0) | mezo-demo-2 | [0x7b2bc449…5ad0](https://explorer.test.mezo.org/tx/0x7b2bc44967bfd6a958c6ed11bbc7a17b7c7fee3ec827d492d531a6c1aa8f5ad0) | 16337601 |
| 10 | contribute(3) r0 | mezo-demo-2 | [0x21192554…a565](https://explorer.test.mezo.org/tx/0x211925549eb6da4279ca3f7ac5e8354e78b5f3c462d8404c858201ad4429a565) | 16337602 |
| 11 | approve 15 MUSD (r0) | mezo-testnet-deployer | [0xa3eb1f06…1b56](https://explorer.test.mezo.org/tx/0xa3eb1f0642157b7b5ecc5439ca1adaea885ead5468ff9ba84382c6cd71201b56) | 16337603 |
| 12 | contribute(3) r0 | mezo-testnet-deployer | [0xbb35889e…5396](https://explorer.test.mezo.org/tx/0xbb35889ea5ce0f80cc24a0595559348e82f8375a3b0397dace6d6826e1155396) | 16337604 |
| 13 | approve 15 MUSD (r0) | mezo-demo-3 | [0xe64b1538…4916](https://explorer.test.mezo.org/tx/0xe64b1538d8bec324e564a49f88fbb20a218ac2fe56645e3ba63381edbd614916) | 16337605 |
| 14 | contribute(3) r0 | mezo-demo-3 | [0xbc6c68e1…7be5](https://explorer.test.mezo.org/tx/0xbc6c68e16ebe0e4d48f3be3d900efa826ea8e5c576c2b9d2f9a01c0c963c7be5) | 16337607 |
| 15 | approve 15 MUSD (r1) | mezo-demo-2 | [0x2cbe33e8…e153](https://explorer.test.mezo.org/tx/0x2cbe33e8de0221902d6ccee802b4bbbcfe89fce5e5129fb3797792054792e153) | 16337608 |
| 16 | contribute(3) r1 | mezo-demo-2 | [0x0941c6c8…15fc](https://explorer.test.mezo.org/tx/0x0941c6c8b8860bf6bc9e9f3de63b598d14065cb1a7d369adff3cbc66d07c15fc) | 16337609 |
| 17 | approve 15 MUSD (r1) | mezo-testnet-deployer | [0xa61ea3cd…3153](https://explorer.test.mezo.org/tx/0xa61ea3cd01eb8c7a2b75da7dcfb75af1718ee05057124506c734c1d170473153) | 16337610 |
| 18 | contribute(3) r1 | mezo-testnet-deployer | [0xf88b92c2…0dc4](https://explorer.test.mezo.org/tx/0xf88b92c2322cccf863bd99c59f7fe6b2813ba76fb2e863e7171fbc0d527a0dc4) | 16337612 |

### "Lekki Mums Esusu" (circle id 4) — Open, 2 of 4 seats
Page: https://ajocircle.pages.dev/circle/?id=4
- Params: token MUSD, contribution 20 MUSD (2e19), maxMembers 4, roundLength 86400 s, randomOrder false, requireCollateral true, creator mezo-demo-3.
- Members: `0xd02a…09ba` (demo-3) (creator), `0x010F…B5B8` (demo-1). Each posted 20 MUSD collateral.
- State: status Open (0), 2/4 members, activeMembers 2, pot 0, not started (2 open seats).

| # | Step | Wallet | Tx | Block |
|---|---|---|---|---|
| 1 | createCircle "Lekki Mums Esusu" | mezo-demo-3 | [0x2a0d9fe8…416a](https://explorer.test.mezo.org/tx/0x2a0d9fe8b86aced3990d2a017bbea610977d29144885eb6203c0e200fb0f416a) | 16337613 |
| 2 | approve 20 MUSD (collateral) | mezo-demo-3 | [0x23a3adaf…86e1](https://explorer.test.mezo.org/tx/0x23a3adafc49a7aeaabef0a9e260550cf397fa8943dd7bd00b26c16a2607e86e1) | 16337614 |
| 3 | join(4) | mezo-demo-3 | [0x994a3a43…7999](https://explorer.test.mezo.org/tx/0x994a3a431c6f23e81ba79a4b4ebe94fccd566e12912c8d5b160b262fbb3d7999) | 16337615 |
| 4 | approve 20 MUSD (collateral) | mezo-demo-1 | [0x24921dc7…b913](https://explorer.test.mezo.org/tx/0x24921dc780d066004ef0a15efe0b4885d7ad7224202fa0da92b155c0114ab913) | 16337616 |
| 5 | join(4) | mezo-demo-1 | [0x12826acc…b612](https://explorer.test.mezo.org/tx/0x12826acc52a65ff387e78640e863f0e8f9fc76e0d477cb3d3bd544a71c13b612) | 16337617 |

### "Kano Traders Circle" (circle id 5) — Active, first round, random order
Page: https://ajocircle.pages.dev/circle/?id=5
- Params: token MUSD, contribution 10 MUSD (1e19), maxMembers 3, roundLength 86400 s, randomOrder TRUE, requireCollateral true, creator mezo-demo-1.
- Join order: demo-1, demo-2, deployer. Random order needs nothing extra: `start()` shuffles in the same tx (Fisher–Yates seeded with prevrandao + previous blockhash + circleId + timestamp; not secure randomness, fine for a demo).
- Resulting payout order: round 0 → `0x6c3c…8915` (demo-2), round 1 → `0x7E08…0146` (deployer), round 2 → `0x010F…B5B8` (demo-1).
- State: status Active (1), currentRound 0 (first round), pot 0, no contributions yet, startedAt 2026-10-24 11:24:07 WAT, round-0 deadline 2026-10-25 11:24:07 WAT. Each member holds 10 MUSD collateral.

| # | Step | Wallet | Tx | Block |
|---|---|---|---|---|
| 1 | createCircle "Kano Traders Circle" | mezo-demo-1 | [0x10db5c9c…d761](https://explorer.test.mezo.org/tx/0x10db5c9c1b266cf28a34b283ff6ce84a028fee5768c1f1e564cb73336486d761) | 16337619 |
| 2 | approve 10 MUSD (collateral) | mezo-demo-1 | [0x380283e2…a797](https://explorer.test.mezo.org/tx/0x380283e21d94ae74b1b1ea746727d57f73bffad64cec0a36c0ee8970499ca797) | 16337621 |
| 3 | join(5) | mezo-demo-1 | [0x6be4acb7…52ed](https://explorer.test.mezo.org/tx/0x6be4acb7ba2810917ea7b930a74a1e54eb81ad24735f7d89887b8dd734da52ed) | 16337622 |
| 4 | approve 10 MUSD (collateral) | mezo-demo-2 | [0xe3fcd314…5a93](https://explorer.test.mezo.org/tx/0xe3fcd3143143f72eb875aa1272c421547ddd17b3efb4b311652ac7dd294b5a93) | 16337623 |
| 5 | join(5) | mezo-demo-2 | [0x8520a225…25dc](https://explorer.test.mezo.org/tx/0x8520a2250fa081cab8b440613ec8d7677cf0aa81b2bca53877141f08809e25dc) | 16337624 |
| 6 | approve 10 MUSD (collateral) | mezo-testnet-deployer | [0xabb72328…df56](https://explorer.test.mezo.org/tx/0xabb723284e764791fbc8e43dc4f95552325e5bdb76ce4ca749e8ed0e5fe6df56) | 16337625 |
| 7 | join(5) | mezo-testnet-deployer | [0xf7ba0f6f…834b](https://explorer.test.mezo.org/tx/0xf7ba0f6f451a72d98a5c902df417526b715a3db372e67174aed95561db65834b) | 16337626 |
| 8 | start(5) | mezo-demo-1 | [0xd1fb44d8…4ff2](https://explorer.test.mezo.org/tx/0xd1fb44d8e8002c1c44b00266b367205785561a74a40dd9b1b246d5e82fb44ff2) | 16337627 |

Balances after seeding (Oct 24 2026 ~11:25 WAT), all allowances to AjoCircle 0: demo-1 460 MUSD / 0.0019999995 BTC; demo-2 480 MUSD / 0.0019999995 BTC; demo-3 450 MUSD / 0.0019999996 BTC; deployer 195 MUSD / ~0.0047183 BTC. AjoCircle holds 175 MUSD (circle 1: 30 collateral; circle 3: 45 collateral + 30 pot; circle 4: 40 collateral; circle 5: 30 collateral). No gas top-ups were needed.
