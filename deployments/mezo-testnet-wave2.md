# AjoCircle Mezo TESTNET Wave 2 (v3) deployment

Network: Mezo testnet, chain ID 31611, RPC https://rpc.test.mezo.org, explorer https://explorer.test.mezo.org
TESTNET ONLY. Zero real spend. No secrets in this file. Keystores live in ~/.foundry/keystores, passwords in /home/box/.secrets (600).

Source commit: `749384f` (local, not pushed). Deploy broadcast commit field: `749384f`.
33 unit tests passed before deploy (`forge test --no-match-path 'test/fork/*'`).

Token: MUSD (testnet) `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` (18 decimals)
sMUSD vault (testnet): `0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16`
Deployer: `0x7E084Cb20EBe4a3ca1353EF24c96D048AAB50146` (keystore `mezo-testnet-deployer`)

Do NOT call settleRound (or otherwise touch) seeded demo circles on v1 `0xB6Ba9770baE20B19A815dB6Ea4cf4b5d5e248d3e` or v2 `0x94A5014b54bF748660AC0D953De67416fe34ea2C`.

## Contracts

### 1. MUSDSavingsRateAdapter
- Constructor: `vault_ = 0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16`
- Address: `0x02c9711eaD8b6d101A542eEC8DA2b41Cbe7eD6f6`
  - Explorer: https://explorer.test.mezo.org/address/0x02c9711eaD8b6d101A542eEC8DA2b41Cbe7eD6f6
- Deploy tx: `0x999085102fc3120dafa6ae6f1228944dd827bb7018b7c55934c1aa4192e7f9a3`
  - Explorer: https://explorer.test.mezo.org/tx/0x999085102fc3120dafa6ae6f1228944dd827bb7018b7c55934c1aa4192e7f9a3
- Deploy block: 16482570
- Verification: Sourcify exact_match (https://repo.sourcify.dev/31611/0x02c9711eaD8b6d101A542eEC8DA2b41Cbe7eD6f6). Blockscout API verifier returned 404 HTML (same as Wave 1); standard JSON ready at `/workspace/mezo-wave2-verify/MUSDSavingsRateAdapter.standard-input.json` for the explorer web form.

### 2. AjoCircle (Wave 2 / v3)
- Constructor: `adapter = 0x02c9711eaD8b6d101A542eEC8DA2b41Cbe7eD6f6` (constructor calls `bind()`)
- Address: `0x463203F3Cd12653bEa11FfCd22512B11e2a91835`
  - Explorer: https://explorer.test.mezo.org/address/0x463203F3Cd12653bEa11FfCd22512B11e2a91835
- Deploy tx: `0xf08a412b6eebbafa8c01ba8e17657da002f01d03a9b8f8c6cf40a49b533dd88b`
  - Explorer: https://explorer.test.mezo.org/tx/0xf08a412b6eebbafa8c01ba8e17657da002f01d03a9b8f8c6cf40a49b533dd88b
- Deploy block: 16482570
- Verification: Sourcify exact_match (https://repo.sourcify.dev/31611/0x463203F3Cd12653bEa11FfCd22512B11e2a91835). Blockscout API same 404; standard JSON at `/workspace/mezo-wave2-verify/AjoCircle.standard-input.json`.

Broadcast JSON: `deployments/mezo-testnet-v3.json`

## Sanity calls (all matched handoff)

```
adapter.asset()        = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503
adapter.owner()        = 0x463203F3Cd12653bEa11FfCd22512B11e2a91835
adapter.vault()        = 0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16
ajo.yieldAdapter()     = 0x02c9711eaD8b6d101A542eEC8DA2b41Cbe7eD6f6
ajo.yieldAsset()       = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503
```

## Web env values (wired into live app)

```
NEXT_PUBLIC_CHAIN=mezoTestnet
NEXT_PUBLIC_AJO_ADDRESS=0x463203F3Cd12653bEa11FfCd22512B11e2a91835
NEXT_PUBLIC_DEPLOY_BLOCK=16482570
```

Also regenerate ABI if needed: `forge build` then `cd web && npm run abi`.

## End-to-end circle (NEW contract only)

Circle id: 1, name "Wave2 Yield Smoke"
Params: token MUSD, contribution 10 MUSD, maxMembers 2, roundLength 60 s, randomOrder false, requireCollateral true.
Creator/member 0: deployer `0x7E084Cb20EBe4a3ca1353EF24c96D048AAB50146`
Member 1: mezo-demo-1 `0x010F69291D5D4B1f4759A2268d6d6594D207B5B8`
Payout order (join order): deployer, then demo-1.
Run window: Sat Oct 31 2026 ~10:45 to 10:48 WAT (Africa/Lagos).

| # | Step | Wallet | Tx | Block |
|---|---|---|---|---|
| 1 | createCircle | deployer | [0xbc294349…8209](https://explorer.test.mezo.org/tx/0xbc2943498038a563345332de14a3c636d4874583c1319953a383735441458209) | 16482585 |
| 2 | approve 30 MUSD | deployer | [0x9b301aec…7e62](https://explorer.test.mezo.org/tx/0x9b301aec092c60d1e5fce3e5b8068f12b2c56564b19592a1a0f4b446fa267e62) | 16482586 |
| 3 | join(1) | deployer | [0x5a1d7dd9…0fa3](https://explorer.test.mezo.org/tx/0x5a1d7dd97870ac8c66df8dfeff1bc9d66c0897bd3d1128ba70265423dbe60fa3) | 16482587 |
| 4 | approve 30 MUSD | demo-1 | [0x0d1b5cdd…0c8a](https://explorer.test.mezo.org/tx/0x0d1b5cdd11a88e47ef125db2010ce4d5d3ec5cb6a4caed26953b052ab20b0c8a) | 16482588 |
| 5 | join(1) | demo-1 | [0xe17064be…f2b6](https://explorer.test.mezo.org/tx/0xe17064be177084ff5d4dc3e435634d412fc3e087f7e9732e17e14ee32d37f2b6) | 16482589 |
| 6 | start(1) (routes 20 MUSD collateral into sMUSD) | deployer | [0x29a4d834…ed7e](https://explorer.test.mezo.org/tx/0x29a4d834bc72089662a716d064a15e23a183e05bf4f805db34ed92466daced7e) | 16482590 |
| 7 | contribute(1) r0 | deployer | [0x395f5c95…7ae5](https://explorer.test.mezo.org/tx/0x395f5c9501a1582c3868a86fb647d2c626609bec82c9115e2b0ec5b3bb007ae5) | 16482632 |
| 8 | contribute(1) r0 (auto-pays 20 MUSD to deployer) | demo-1 | [0x0537d3dc…e18a](https://explorer.test.mezo.org/tx/0x0537d3dc0d24213f5952003673e4fc1224838bd3817b95fff730cc9e077ee18a) | 16482633 |
| 9 | contribute(1) r1 | deployer | [0x90628732…2582](https://explorer.test.mezo.org/tx/0x906287321e72889e58d08b0e5401e0f94521880def8517d7bd53076cd1e52582) | 16482635 |
| 10 | contribute(1) r1 (auto-pays 20 MUSD to demo-1, closes, unroutes) | demo-1 | [0x25bb32ea…170c](https://explorer.test.mezo.org/tx/0x25bb32eabc0044b111dc7d8d4aea5b7f4ab08413642d0e3a82dccc691908170c) | 16482636 |
| 11 | claimPayout(1) (10 MUSD collateral) | deployer | [0xc6277b5b…40b9](https://explorer.test.mezo.org/tx/0xc6277b5b0d9625802b15600c7b13f62bb02d118571f286010e2ba127726b40b9) | 16482638 |
| 12 | claimPayout(1) (10 MUSD collateral) | demo-1 | [0x4f1e37f6…c683](https://explorer.test.mezo.org/tx/0x4f1e37f6b1cd7d7dacbcab0e4567221f282f11fc9a50abe1ba9d7ed0e1b3c683) | 16482639 |

No settleRound calls: both members paid every round, so contribute auto-completed each round. Old v1/v2 demo circles were not touched.

### Yield / vault readings

After start (block 16482590):
- adapter.principal = 20e18
- vault.balanceOf(adapter) = 20e18 (sMUSD shares track 1:1 principal here)
- vault.claimableYield(adapter) = 0
- adapter.pendingYield = 0
- ajo.getYield(1) = (routed 20e18, earned 0, distributed 0)
- ajo MUSD balance = 0 (collateral fully routed)

After ~90 s wait (still before contributions): claimableYield and pendingYield still 0.

After close (block 16482636):
- status = Completed (2)
- adapter.principal = 0, vault.balanceOf(adapter) = 0, adapter MUSD = 0
- ajo held 20e18 claimable collateral until claims; after both claims ajo MUSD = 0
- getYield(1) = (0, 0, 0)
- yieldEarned[1][deployer] = 0, yieldEarned[1][demo-1] = 0

Observed yield reaching the closing circle: **0 MUSD**. Collateral routing into sMUSD and full unroute on close both worked. Over this short (~3 min) park, the testnet vault reported no claimableYield for the adapter. Deviation from an ideal smoke that shows positive yield: none accrued in the window. Longer park or a higher vault rate would be needed to observe non-zero yield on testnet.

Final member MUSD balances (Africa/Lagos ~10:48): deployer 195 MUSD, demo-1 460 MUSD (net flat vs pre-circle after collateral reclaim and pot payouts).

## Notes / deviations

1. Blockscout CLI/API verify returns Next.js 404 HTML (not usable). Sourcify exact_match is the verified source of truth. Standard-input JSON left under `/workspace/mezo-wave2-verify/` for a manual explorer web-form submit if wanted.
2. Some `cast send --json` receipts briefly returned null from the RPC; all txs still landed (recovered by scanning blocks). No resends of the same action were needed beyond the successful on-chain receipts listed above.
3. CREATE_DEMO_CIRCLE left unset (per handoff). Only the manual e2e circle above was created on the new contract.
4. Not pushed. Not Pages-redeployed. No Wave 2 submission or public posts.


## How sMUSD yield accrues on testnet (Builder research, 2026-10-31)

Vault: `0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16`.

- Accrual is index-based (`yieldIndex` / `claimableYield`), not continuous per-block interest.
- Index bumps when MUSD is pushed via `receiveProtocolYield` or `receiveYieldFromStrategy` (permissionless entry points; strategy currently returns 0 from `claimYield()`).
- Observed in the last ~10k blocks: several `ProtocolYieldReceived` events of ~1.02 MUSD, spaced ~870 blocks apart. `pendingYield()` was 0; vault `pcv` is `address(0)`.
- Mezo user docs describe weekly fee distribution into the vault; that matches discrete index bumps, not a drip rate.
- Smoke circle 1 closed with 0 yield because it was open only a few minutes between bumps. That is expected, not a bug in AjoCircle or the adapter.
- After close, adapter `principal()`, `pendingYield()`, vault `balanceOf(adapter)`, and vault `claimableYield(adapter)` were all 0 (no stranded funds).

## Web wiring

Live Pages env:

```
NEXT_PUBLIC_CHAIN=mezoTestnet
NEXT_PUBLIC_AJO_ADDRESS=0x463203F3Cd12653bEa11FfCd22512B11e2a91835
NEXT_PUBLIC_DEPLOY_BLOCK=16482570
```
