# Wave 2 adapter harvest-checkpoint fix (Deployer handoff)

STATUS: **LOCAL ONLY.** Builder fixed the adapter in source and tests. Do **not** push, do **not** redeploy
Pages, do **not** deploy contracts until the user explicitly OKs this follow-up.

Network: Mezo testnet 31611 only. Zero real spend. Never call `settleRound` on seeded demos on v1/v2, and do
not disturb circles 1–2 on live v3 unless the user asks for a new proof circle on a new deploy.

## Why a redeploy is needed

Live v3 adapter `0x02c9711eaD8b6d101A542eEC8DA2b41Cbe7eD6f6` (bound to AjoCircle
`0x463203F3Cd12653bEa11FfCd22512B11e2a91835`) gates `harvest` on `vault.claimableYield(this) > 0`. That
mapping is storage-only and stays 0 after a `yieldIndex` bump until `_updateYieldFor` runs. So mid-circle
`harvest` / `pendingYield` / UI miss index-only yield unless something checkpoints first (Deployer used a
1 wei sMUSD transfer). Close still worked because `withdraw` always checkpoints then pays.

**Fix in source:** `harvest` always calls `vault.claimYield()` (which checkpoints then pays). `pendingYield`
returns stored claimable + uncheckpointed index share + idle MUSD on the adapter. No dust.

## Can the adapter be swapped on the live AjoCircle?

**No.** `AjoCircle.yieldAdapter` is `immutable`, set in the constructor, which also calls `adapter.bind()`.
There is no `setAdapter` / migrate path. Replacing the adapter **requires a new AjoCircle** that binds a
**new** `MUSDSavingsRateAdapter` in one deploy.

Old v3 circles stay on the old adapter forever. Seeded v1/v2 demos stay untouched.

## Deploy (when user OKs)

Same as original Wave 2 deploy: one `Deploy.s.sol` run, two contracts.

```bash
cd contracts
TOKEN_ADDRESS=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503 \
SMUSD_VAULT=0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16 \
forge script script/Deploy.s.sol --rpc-url mezo_testnet --account mezo-testnet-deployer --broadcast -vvvv
```

Do **not** set `DEPLOY_MOCK_ADAPTER` or `YIELD_ADAPTER`.

Expected: new `MUSDSavingsRateAdapter` then new `AjoCircle(adapter)` with `bind()` in the constructor.

Save broadcast as e.g. `deployments/mezo-testnet-v4.json`, append `deployments/mezo-testnet-wave2.md` (or a
v4 note). Verify both on Sourcify.

### Sanity

```bash
cast call <NEW_ADAPTER> "asset()(address)" --rpc-url https://rpc.test.mezo.org
# expect testnet MUSD
cast call <NEW_ADAPTER> "owner()(address)" --rpc-url https://rpc.test.mezo.org
# expect <NEW_AJO>
cast call <NEW_AJO> "yieldAdapter()(address)" --rpc-url https://rpc.test.mezo.org
# expect <NEW_ADAPTER>
```

Optional: short collateral circle spanning a natural `ProtocolYieldReceived` (or, only if diagnosing, a
documented synthetic push). Confirm `pendingYield` / `getYield` show yield **without** a dust sMUSD transfer,
then close and confirm members receive yield.

### Web / Pages (separate user OK)

```bash
cd web
NEXT_PUBLIC_CHAIN=mezoTestnet \
NEXT_PUBLIC_AJO_ADDRESS=<NEW_AJO> \
NEXT_PUBLIC_DEPLOY_BLOCK=<deploy_block> \
npm run build
# only with user OK:
# npx -p node@22 -p wrangler wrangler pages deploy out --project-name ajocircle --branch main
```

## Builder verification already done (local)

- `forge test --no-match-path 'test/fork/*'`: 35 passed (includes
  `test_SavingsRateAdapter_HarvestCheckpointsIndexOnlyYield` and
  `test_SavingsRateAdapter_IndexYieldVisibleToCircleWithoutDust`)
- `MEZO_TESTNET_RPC=https://rpc.test.mezo.org forge test --match-path 'test/fork/*'`:
  round-trip PASS + `test_Fork_Testnet_HarvestClaimsIndexOnlyYieldWithoutDust` PASS (mainnet fork skipped)

## Out of scope until user OK

- Push to GitHub
- Cloudflare Pages redeploy
- On-chain deploy of adapter / AjoCircle
- Wave 2 AKINDO submission / public posts
- Mainnet or any real-fund spend
