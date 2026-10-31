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


## Circle 2: Wave2 Yield Proof (2026-10-31)

Circle id: 2, name "Wave2 Yield Proof"
Params: token MUSD, contribution 10 MUSD, maxMembers 2, roundLength 10800 s (3 h), randomOrder false, requireCollateral true.
Creator/member 0: deployer `0x7E084Cb20EBe4a3ca1353EF24c96D048AAB50146`
Member 1: mezo-demo-1 `0x010F69291D5D4B1f4759A2268d6d6594D207B5B8`
Payout order (join order): deployer, then demo-1.
Start block: 16482778 (startedAt 1793440704, Africa/Lagos ~11:05 WAT). Close block: 16482979 (~11:12 WAT). Final status: Completed (2).
No settleRound. Old v1/v2 demos and circle 1 were not touched.

| # | Step | Wallet | Tx | Block |
|---|---|---|---|---|
| 1 | createCircle | deployer | [0xf99f3f1a…d903](https://explorer.test.mezo.org/tx/0xf99f3f1a353234d52556de131db3f37a5d11db931aa956c9a0d03660e9add903) | 16482770 |
| 2 | approve (collateral+contribs) | deployer | [0xfe30f07b…843a](https://explorer.test.mezo.org/tx/0xfe30f07b3ec65fbd5fa6b814f77a784615107cbfa75fadafbff68b2f50e3843a) | 16482771 |
| 3 | join(2) | deployer | [0x0355253a…aecf](https://explorer.test.mezo.org/tx/0x0355253a433f22d24b24976b08db06b80d77e0408b075aab803c54f89ccbaecf) | 16482772 |
| 4 | approve | demo-1 | [0x90616bbe…1f18](https://explorer.test.mezo.org/tx/0x90616bbe04ebf54b2f6b36f6ff5af0600cefa257855832949165517130d61f18) | 16482776 |
| 5 | join(2) | demo-1 | [0xed5bfa7f…115f](https://explorer.test.mezo.org/tx/0xed5bfa7f762d3db17664c3e1314463d7230f52d4d4b263978ec8daae0348115f) | 16482777 |
| 6 | start(2) (routes 20 MUSD into sMUSD) | deployer | [0x646e8b2e…d474](https://explorer.test.mezo.org/tx/0x646e8b2eb72ea06b20597b9ed18964f43d89c7f2c6ba2cf3ff8a957bae53d474) | 16482778 |
| 7 | contribute(2) r0 | deployer | [0x44abba0e…fce7](https://explorer.test.mezo.org/tx/0x44abba0ebfdd9127f09e9e8582f0902744c94e825c4629d6a9761794a1e8fce7) | 16482782 |
| 8 | contribute(2) r0 (pays 20 MUSD to deployer) | demo-1 | [0x6ab73ce8…e27c](https://explorer.test.mezo.org/tx/0x6ab73ce85a4e1cc75fe7bd25f3659565bd13c486cd59c676243f1e40d0cbe27c) | 16482787 |
| 9 | contribute(2) r1 | deployer | [0x065621d4…cfdb](https://explorer.test.mezo.org/tx/0x065621d4fd54b7af0a2099f56690cbb75afce88162bab92c180af1178750cfdb) | 16482788 |
| 10 | approve 10 MUSD | demo-1 | [0xadc869f7…463ab](https://explorer.test.mezo.org/tx/0xadc869f73dcc91788136bff3ecb6ad18498eb37a0b555b2bb9090d875d3463ab) | 16482977 |
| 11 | contribute(2) r1 (pays demo-1, closes, unroutes, harvests) | demo-1 | [0x4dfa0776…9931](https://explorer.test.mezo.org/tx/0x4dfa0776938d3dfa0b8aaa412ea26e4a0daf5ac70555691c5d574e714ce59931) | 16482979 |
| 12 | claimPayout(2) | deployer | [0x2d099d9d…4c19](https://explorer.test.mezo.org/tx/0x2d099d9d6a0f164907c05af3b10ed130225e94511a2439db7e8bbba966af4c19) | 16482988 |
| 13 | claimPayout(2) | demo-1 | [0xe175f4ed…7e11](https://explorer.test.mezo.org/tx/0xe175f4edbc6f3f17d19385f071f6c66a06bc1ab9ab236542774fe66a5e227e11) | 16482990 |

### ProtocolYieldReceived cadence (pre-close)

Prior pushes (for cadence): block 16481054 (~1.020 MUSD), block 16481919 (~1.019 MUSD). Gap 16481919-16481054 = 865 blocks.
First push after start (16482778):

- tx [0x66a179e4…4204](https://explorer.test.mezo.org/tx/0x66a179e4e870086bea02dbbcce555921d7d8a4800611ba4390f5949c55a44204) @ block **16482783**, amount 1019839684883823156 wei (~1.020 MUSD). Gap from prior = 864 blocks.

Optional permissionless bump (deployer donated 2 MUSD testnet MUSD into the vault to enlarge the index delta while diagnosing claimableYield=0):

- approve: [0x54a2b721…9691](https://explorer.test.mezo.org/tx/0x54a2b7218792b63f7ae20b45e73d0e8224d18015b9c11862ff6d901af18b9691) @ 16482934
- receiveProtocolYield(2e18): [0x8150d9a2…db0c](https://explorer.test.mezo.org/tx/0x8150d9a2023c13ef4c606999c1d77497fb2954234406ae1167a928860bb6db0c) @ **16482935**, amount 2e18

### Why vault.claimableYield(adapter) stayed 0 after the index bump

Verified vault source (`MUSDSavingsRate`): `claimableYield` is a **storage mapping**, not a live view of `balance * (yieldIndex - supplyYieldIndex) / 1e18`. Accrual is written only inside `_updateYieldFor`, which runs on deposit/withdraw/transfer/claimYield. A raw index bump does not change the mapping until the adapter is checkpointed.

After the natural push, `supplyYieldIndex(adapter)` was still the pre-bump index and `claimableYield(adapter)` read 0 even though the formula share was ~2.278e13 wei. `previewRedeem` / ERC4626 convert helpers are not on this vault (shares track 1:1 principal; yield is a separate ledger).

Checkpoint used to materialize claimableYield (1 wei sMUSD transfer into the adapter, which triggers `_beforeTokenTransfer` -> `_updateYieldFor(adapter)`):

- deployer approve+deposit 1 MUSD for sMUSD: approve [0xc5d1a5b4…a1af](https://explorer.test.mezo.org/tx/0xc5d1a5b4bd7f4c4b2e8b8801f35f89e3ada5fb9daceff9568848cb4ebd70a1af) @ 16482962, deposit [0xabf283a6…f4d6](https://explorer.test.mezo.org/tx/0xabf283a60d19d3bc9286a492f692f8ffee1ffc566e54bcc5378f230a68fdf4d6) @ 16482964
- transfer 1 wei sMUSD to adapter: [0xd01b8c4e…4317](https://explorer.test.mezo.org/tx/0xd01b8c4e9f5d4c0db69faf7764c171e21d1d8c27030a2613aaecebb5f2b24317) @ 16482966

Note: adapter `harvest` gates `vault.claimYield()` on `claimableYield > 0` first, so it cannot self-checkpoint index-only yield; close still works because `withdraw` always calls `_claimYield` (which updates then pays) before returning principal.

### Readings immediately before final contribute (block ~16482975, Africa/Lagos 11:12 WAT)

- vault.yieldIndex = 163061009324957253790
- vault.supplyYieldIndex(adapter) = 163061009324957253790 (after checkpoint)
- vault.claimableYield(adapter) = **67454618812000** (~6.745e-5 MUSD)
- adapter.pendingYield = 67454618812000
- adapter.principal = 20e18
- vault.balanceOf(adapter) = 20e18 + 1 (extra 1 wei from checkpoint transfer)
- ajo.getYield(2) = (routed 20e18, earned 67454618812000, distributed 0)
- Of that claimable: ~22780314561120 attributable to the natural ~1.02 MUSD push; ~44674304250880 to the 2 MUSD donated push

### Yield captured on close (final contribute tx 0x4dfa0776…9931)

Events in the close tx (selected):

- vault `YieldClaimed(adapter, 67454618812000)` (auto-claim on withdraw)
- AjoCircle yield credit to each member: 33727309406000 (pro-rata half)
- `CircleCompleted(2)`

After close, before claims:

- ajo MUSD = 20000067454618812000 (20e18 collateral + full yield)
- claimable(2, deployer) = claimable(2, demo-1) = 10000033727309406000 each
- adapter.principal = 0; vault.balanceOf(adapter) = 1 (stranded 1 wei sMUSD from checkpoint); claimableYield(adapter) = 0; pendingYield = 0

Member MUSD balances:

| Who | Before close | After final contrib (pot) | After claimPayout | Net vs before close |
|---|---|---|---|---|
| deployer | 182e18 | 182e18 (already got r0 pot earlier) | 192000033727309406000 | +10e18 collateral + 33727309406000 yield |
| demo-1 | 440e18 | 450e18 (+10e18 r1 pot) | 460000033727309406000 | +10e18 pot +10e18 collateral + 33727309406000 yield |

Observed yield reaching the closing circle: **67454618812000 wei total** (~6.745e-5 MUSD), split evenly. `yieldEarned(2, member)` = 33727309406000 each. getYield(2) after close = (0, 67454618812000, 67454618812000).

### Yield attribution (honest split)

Closing circle 2 received **67454618812000 wei** total (~6.745e-5 MUSD):

| Source | Approx share (wei) | Approx MUSD | Notes |
| --- | ---: | ---: | --- |
| Natural `ProtocolYieldReceived` @ block 16482783 ([0x66a179e4…4204](https://explorer.test.mezo.org/tx/0x66a179e4e870086bea02dbbcce555921d7d8a4800611ba4390f5949c55a44204)) | 22780314561120 | ~0.0000228 | Organic protocol push (~1.02 MUSD into vault) |
| Synthetic test donation `receiveProtocolYield(2e18)` @ block 16482935 ([0x8150d9a2…db0c](https://explorer.test.mezo.org/tx/0x8150d9a2023c13ef4c606999c1d77497fb2954234406ae1167a928860bb6db0c)) | 44674304250880 | ~0.0000447 | Executor diagnosis only; **not** organic yield |
| **Total to circle** | **67454618812000** | **~6.745e-5** | Split 50/50 to deployer and demo-1 |

### Adapter note for Builder (issue + fix status)

`claimableYield` on the vault is a **storage** mapping. Index bumps do not update it until `_updateYieldFor` runs (deposit / withdraw / transfer / `claimYield`). The **live** v3 adapter `0x02c9711eaD8b6d101A542eEC8DA2b41Cbe7eD6f6` gates `harvest` on `claimableYield > 0`, so it cannot self-checkpoint index-only yield; Deployer forced a checkpoint with a 1 wei sMUSD transfer ([0xd01b8c4e…4317](https://explorer.test.mezo.org/tx/0xd01b8c4e9f5d4c0db69faf7764c171e21d1d8c27030a2613aaecebb5f2b24317)). Close still credited yield because `withdraw` always checkpoints.

**Local fix (not pushed, not redeployed):** `harvest` always calls `vault.claimYield()`; `pendingYield` adds the live uncheckpointed index share. No dust. Unit + testnet fork coverage added. Live app remains on the pre-fix adapter until user OK to redeploy (requires **new adapter + new AjoCircle**; `yieldAdapter` is immutable). Handoff: [`docs/WAVE2_ADAPTER_FIX_HANDOFF.md`](../docs/WAVE2_ADAPTER_FIX_HANDOFF.md).

