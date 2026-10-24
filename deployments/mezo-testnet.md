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
