# Wave 2 handoff for Deployer (Mezo testnet only)

STATUS (2026-10-31): DONE on testnet. v3 (`0x4632…1835` / `0x02c9…D6f6`, block 16482570) then v4 harvest-checkpoint fix (`0xc2B6…0dda` / `0x01CA…521E`, block 16487793). Live app wired to v4. Original deploy brief below (historical). Wave 2 AKINDO submit still needs user OK.

Original deploy brief below.


Network: Mezo testnet, chain ID 31611, RPC `https://rpc.test.mezo.org`, explorer `https://explorer.test.mezo.org`.
Zero spend beyond free testnet gas. Never call `settleRound` on seeded demo circles on the current v2 contract.

## What changed (local commits on `main`)

1. Real sMUSD integration on testnet through `MUSDSavingsRateAdapter`.
2. Yield accounting fix: closing circles receive yield that the vault auto-claims inside `withdraw` (no stranded yield on the adapter).
3. Docs/UI no longer claim sMUSD is mainnet-only. Truth: sMUSD works on testnet; Wave 1 live deploy still has `adapter = 0` until you redeploy.
4. Get MUSD + Who pays sections in README and the web home page. `/create/` already exists. Circle lists stay on-chain only.

## Contracts to deploy

Deploy **two** contracts in one `Deploy.s.sol` run:

| Order | Contract | Constructor args |
| --- | --- | --- |
| 1 | `MUSDSavingsRateAdapter` | `vault_ = 0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16` (testnet sMUSD proxy) |
| 2 | `AjoCircle` | `adapter = <MUSDSavingsRateAdapter address from step 1>` (constructor calls `bind()`) |

Do **not** set `DEPLOY_MOCK_ADAPTER` or `YIELD_ADAPTER`. Do **not** use the mainnet vault address on testnet.

Verified vault facts (2026-10-31):

- `musdToken()` = `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` (testnet MUSD)
- `name()` = "MUSD Savings Rate", `symbol()` = "sMUSD"
- Implementation behind proxy: `0x92d12f0a60906b39d81acd9bf8977b6c824cd98c`
- ABI used: `deposit(uint256)`, `withdraw(uint256)` (auto-claims yield), `claimYield()`, `claimableYield(address)`

## Deploy command

From the repo that has the Wave 2 commits (after the user allows push, or from this box checkout):

```bash
cd contracts
# keystore already used for Wave 1: mezo-testnet-deployer (0x7E084Cb20EBe4a3ca1353EF24c96D048AAB50146)
TOKEN_ADDRESS=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503 \
SMUSD_VAULT=0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16 \
forge script script/Deploy.s.sol --rpc-url mezo_testnet --account mezo-testnet-deployer --broadcast -vvvv
```

Expected console logs:

- `MUSDSavingsRateAdapter deployed at <ADAPTER>`
- `AjoCircle deployed at <AJO>`
- `Yield adapter (0 = none) <ADAPTER>`

Save the broadcast JSON under `deployments/` (e.g. `mezo-testnet-v3.json`) and append a section to `deployments/mezo-testnet.md`.

Optional: leave `CREATE_DEMO_CIRCLE` unset. Seed new demo circles only if the user asks. Do not touch circles 1–5 on the old v2 address.

## Verification

1. Sourcify / explorer verify both `MUSDSavingsRateAdapter` and `AjoCircle` (same optimizer: solc 0.8.24, `paris`, runs 200).
2. Sanity calls (replace addresses):

```bash
cast call <ADAPTER> "asset()(address)" --rpc-url https://rpc.test.mezo.org
# expect 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503
cast call <ADAPTER> "owner()(address)" --rpc-url https://rpc.test.mezo.org
# expect <AJO>
cast call <AJO> "yieldAdapter()(address)" --rpc-url https://rpc.test.mezo.org
# expect <ADAPTER>
cast call <AJO> "yieldAsset()(address)" --rpc-url https://rpc.test.mezo.org
# expect testnet MUSD
```

3. Optional local fork regression (nothing broadcast):

```bash
cd contracts
MEZO_TESTNET_RPC=https://rpc.test.mezo.org forge test --match-path 'test/fork/*' -vv
```

4. Manual smoke (test funds only): create a 3-member collateral circle in MUSD, start it, confirm adapter `principal()` rises, complete rounds, confirm members can claim collateral (+ any yield), and adapter MUSD balance is 0 after close.

## Web app env updates (after contract deploy; Pages redeploy needs user go-ahead)

```bash
cd web
NEXT_PUBLIC_CHAIN=mezoTestnet \
NEXT_PUBLIC_AJO_ADDRESS=0xc2B6e4Bec56F1fd129D4bCd1CB8e4271303B0dda \
NEXT_PUBLIC_DEPLOY_BLOCK=16487793 \
npm run build
npx -p node@22 -p wrangler wrangler pages deploy out --project-name ajocircle --branch main
```

Also regenerate the ABI if needed: `forge build` then `cd web && npm run abi`.

After redeploy, the home **Powered by MUSD** banner should show "On: MUSD Savings Vault via …" instead of the "adapter not wired yet" message.

## What Builder already tested locally

- `forge test --no-match-path 'test/fork/*'`: 33 passed (19 AjoCircle + 14 yield, including `test_ClosingCircleReceivesYieldAutoClaimedOnFinalWithdraw`)
- `MEZO_TESTNET_RPC=https://rpc.test.mezo.org forge test --match-path 'test/fork/*'`: testnet fork PASS; mainnet fork skipped without `MEZO_MAINNET_RPC`

## Out of scope for Deployer

- Pushing to GitHub (user go-ahead)
- Cloudflare Pages redeploy (user go-ahead)
- Wave 2 AKINDO submission / public posts (Myself And Jobs / user)
- Mainnet deploy or any real-fund spend
- Calling `settleRound` on existing seeded demo circles on v2
