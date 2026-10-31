# AjoCircle: onchain ajo / esusu savings circles

> Rotating savings with stablecoins. The smart contract keeps the books, so nobody has to trust the treasurer.

**Live demo: [ajocircle.pages.dev](https://ajocircle.pages.dev)** (Mezo testnet, chain 31611; Wave 2 contract `0x463203F3Cd12653bEa11FfCd22512B11e2a91835`, sMUSD adapter `0x02c9711eaD8b6d101A542eEC8DA2b41Cbe7eD6f6`)

## Problem

Millions of Nigerians save through **ajo / esusu** (chama in Kenya, tontine in francophone Africa): a group
agrees on an amount, everyone pays in each week or month, and one member takes the whole pot each round until
everyone has had a turn. It is one of the most widely used savings tools on the continent, and it runs almost
entirely on **trust and WhatsApp**:

- one person (the *alajo* or organiser) holds everyone's cash and can disappear with it;
- records live in chat threads and notebooks, so disputes about who paid are common;
- a member who has already collected the pot can stop paying, and the group has little recourse;
- it is hard to save in a currency that holds its value when the naira is losing ground.

## Solution

AjoCircle puts the circle in a smart contract and denominates it in a stablecoin (**MUSD** on Mezo, **USDC** on Arc):

- **No custodian.** Contributions go into the contract and the pot goes straight to that round's recipient.
- **Transparent ledger.** Everyone sees who has paid, who is next and the full history, all read from onchain events.
- **Built-in enforcement.** A circle can require **collateral** (one contribution). If someone misses a round,
  *anyone* can settle it after the deadline: the missed payment is slashed from collateral, the recipient still
  gets a full pot, and the member is publicly flagged as a defaulter.
- **Fair ordering.** The payout order is either join order or shuffled at start.
- **Shareable.** Each circle has an invite link (`/circle/?id=N`, e.g. `https://ajocircle.pages.dev/circle/?id=1`) that you can drop into the family WhatsApp group.
- **Collateral that earns (MUSD).** On Mezo, collateral that would otherwise sit idle for the whole circle can be
  routed into the **MUSD Savings Vault (sMUSD)** through a small adapter. The yield goes back to members when the
  circle closes. See [MUSD yield](#musd-yield).

## MUSD yield

**The design rule is that payouts never wait on the yield source.**

- **What is routed.** Only **member collateral** is routed. It is posted at `join` and normally only needed at
  close, so it is the one balance that really is idle. The round **pot is never routed**: it stays in AjoCircle
  and is paid out in the same transaction as the last contribution.
- **When.** All collateral goes into the adapter at `start`. It is pulled back in the same transaction whenever it
  is needed: slashed at `settleRound`, forfeited at `exitCircle`, or returned at close.
- **Who gets the yield.** Yield is attributed to circles pro rata to routed principal over time (MasterChef-style
  index). Harvest runs before and after every unroute, so yield that Mezo's vault auto-claims inside `withdraw`
  is credited to the closing circle instead of being stranded on the adapter. At close it is credited to
  `claimable` pro rata to each member's remaining collateral. A defaulter whose collateral was slashed earns less.
  An exited member earns nothing. If nobody has collateral left, the yield is split equally among the members who
  didn't exit.
- **Optional per deployment.** `new AjoCircle(adapter)`. `address(0)` means plain MUSD/USDC rails (used for Arc).
  Only circles that use the adapter's asset *and* require collateral are routed.
- **Adapter contract** ([`IYieldAdapter`](contracts/src/yield/IYieldAdapter.sol)): single owner (bound once by the
  AjoCircle constructor), principal-protected, instant `withdraw`, and yield paid in the asset. AjoCircle checks
  balance deltas and reverts on any shortfall.

| Adapter | Source | Network | Status |
| --- | --- | --- | --- |
| `MUSDSavingsRateAdapter` | MUSD Savings Vault / sMUSD testnet `0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16` (impl `0x92d12f0a…d98c`); mainnet `0xb4D498029af77680cD1eF828b967f010d06C51CC` | Mezo testnet 31611 and mainnet 31612 | Unit-tested against a mock with the same ABI (including auto-claim on withdraw), plus **local fork tests** against the real testnet vault (`MEZO_TESTNET_RPC=… forge test --match-path 'test/fork/*'`) |
| `MockYieldAdapter` | holds the token; "yield" is whatever gets sent to it | any | tests / local demo |

### Wave 2: sMUSD on Mezo testnet

Checked on 2026-10-31 against `https://rpc.test.mezo.org`:

1. **sMUSD is live on testnet** at `0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16` (`name()` = "MUSD Savings Rate",
   `symbol()` = "sMUSD", `musdToken()` = testnet MUSD `0x1189…c503`). It is a TransparentUpgradeableProxy; the
   implementation matches the mainnet `MUSDSavingsRate` surface (`deposit` / `withdraw` / `claimYield` /
   `claimableYield`). `withdraw` auto-claims yield to the caller before returning principal.
2. **StabilityPool is still not used.** It can shrink principal in liquidations and freeze withdrawals. AjoCircle
   only wraps the Savings Vault.
3. **Live Wave 2 deploy (v3):** AjoCircle `0x463203F3Cd12653bEa11FfCd22512B11e2a91835` with
   `MUSDSavingsRateAdapter` `0x02c9711eaD8b6d101A542eEC8DA2b41Cbe7eD6f6` (vault above), deploy block `16482570`.
   Record: [`deployments/mezo-testnet-wave2.md`](deployments/mezo-testnet-wave2.md). Prior v2 (no adapter) remains
   at `0x94A5014b54bF748660AC0D953De67416fe34ea2C` for historical demo circles; do not call `settleRound` on them.

#### How sMUSD yield actually accrues (honest)

Mezo product docs say vault yield is fee revenue distributed on a weekly cadence and shows up in the sMUSD
redemption value. On-chain the Savings Rate vault uses a separate `yieldIndex` / `claimableYield` ledger:

- Anyone (or protocol ops) can push MUSD in via `receiveProtocolYield(amount)` or
  `receiveYieldFromStrategy()`. Each push raises `yieldIndex`. Depositors then earn
  `balance * (yieldIndex - userYieldIndex) / 1e18` as claimable MUSD. `withdraw` auto-claims that before
  returning principal.
- There is **no continuous per-block interest**. A deposit that sits between two index bumps earns zero until
  the next bump after it deposited.
- Observed on testnet (blocks ~16472692–16482691): multiple `ProtocolYieldReceived` events of about 1.02 MUSD
  each, roughly every ~870 blocks. `strategy.claimYield()` returned 0 and vault `pendingYield()` was 0 at
  check time. Vault `pcv` is `address(0)` on this testnet deployment.
- The Wave 2 smoke circle (create to close in ~3 minutes, blocks 16482585–16482639) therefore correctly showed
  **0 yield**: it deposited after the latest index bump and closed before the next one. Longer-lived collateral
  that spans a protocol push will show non-zero `claimableYield` / AjoCircle yield.
- Unit tests cover non-zero yield by having the mock vault auto-claim on withdraw; fork tests deposit/withdraw
  against the real vault without requiring a live yield bump.

```bash
cast call 0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16 "musdToken()(address)" --rpc-url https://rpc.test.mezo.org
cast call 0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16 "name()(string)" --rpc-url https://rpc.test.mezo.org
MEZO_TESTNET_RPC=https://rpc.test.mezo.org forge test --match-path 'test/fork/*' -vv
```

## How a circle works

| Phase | What happens |
| --- | --- |
| **Open** | The creator picks the token, contribution, member count *N*, round length, payout order and whether collateral is required. Members `join` (posting collateral if required) and can `leave` for a full refund. The creator can `cancelCircle` to refund everyone. |
| **Active** | The creator calls `start` once the circle is full. Each round every active member calls `contribute`. When the last one pays, the pot is **auto-paid** to the recipient. After the deadline, anyone can call `settleRound`: unpaid members are slashed and flagged, and the pot is credited to the recipient, who withdraws it with `claimPayout`. |
| **Completed** | After *N* rounds the circle closes and any remaining collateral becomes claimable (`claimPayout`). |

**Early exit after start** (`exitCircle`) is only allowed for a member who has **not yet received a payout**.
They forfeit their collateral (added to the current pot) and their own payout turn, and stop owing
contributions. When their turn comes, that round's pot is split equally between the remaining active members.
A member who has already been paid **cannot** exit, because they still owe the circle. If they stop paying, they
are handled as a defaulter.

**Known limitations (hackathon scope):** the yield adapter is trusted at deploy time. If it stops returning
principal instantly, `settleRound`, `exitCircle` and the final round revert until it does (pots already paid are
unaffected), so only wrap principal-protected, instant-withdraw sources. Yield accounting rounds down, so a few wei
can stay in the contract. The shuffled order uses onchain pseudo-randomness, which block producers
can influence (use a VRF in production). Collateral covers one missed payment, so a member with no collateral
left only makes that round's pot smaller. Fee-on-transfer and rebasing tokens are not supported. There is a
cap of 50 members per circle so loops stay bounded. The contracts are **unaudited**.

## Architecture

```
ajocircle/
├── contracts/                 Foundry project (Solidity 0.8.24, OpenZeppelin 5.1)
│   ├── src/AjoCircle.sol      single multi-circle contract: SafeERC20 + ReentrancyGuard, events for every action
│   ├── src/MockERC20.sol      mintable token for tests and local anvil
│   ├── src/yield/             IYieldAdapter, MUSDSavingsRateAdapter (sMUSD), MockYieldAdapter
│   ├── test/AjoCircle.t.sol   happy path, missed payment, early exit, edge cases, fuzz (no adapter)
│   ├── test/AjoCircleYield.t.sol  routing, accrual, pro-rata distribution, zero-yield, solvency fuzz
│   ├── test/fork/             opt-in fork tests against real Mezo testnet (and optional mainnet) sMUSD vaults
│   └── script/Deploy.s.sol    env-driven deploy script (no keys in code), optional adapter
└── web/                       Next.js 15 (App Router) + wagmi 2 + viem 2, TypeScript
    ├── src/lib/chains.ts      Mezo testnet / Mezo / Arc / Arc testnet / anvil definitions
    ├── src/lib/config.ts      chain picked by NEXT_PUBLIC_CHAIN, injected-wallet wagmi config
    ├── src/components/        CreateCircle, CircleList, CircleView (+ yield panel), MusdBanner, History, Connect
    └── src/app/circle          the shareable circle page (/circle/?id=N, static-export friendly)
```

- One contract hosts any number of circles (`circleId` 1, 2, …), and each circle has its own ERC-20 token.
- The frontend reads state through view functions (`getCircle`, `getMembers`, `getPayoutOrder`, `getMember`,
  `roundStatus`, `claimable`) and builds history from contract events (`eth_getLogs` in chunks from `NEXT_PUBLIC_DEPLOY_BLOCK`).
- Contributing is approve then `contribute`, and the UI only asks for approval when the allowance is too low.
- The contracts compile for `evm_version = paris` (no PUSH0), in line with Mezo's recommended `london` target. The bytecode also runs on Arc and anvil.

### Stablecoin integration

| Network | Chain ID | Token | Address | Decimals |
| --- | --- | --- | --- | --- |
| Mezo testnet | 31611 | MUSD | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` | 18 |
| Mezo mainnet | 31612 | MUSD | `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186` | 18 |
| Arc mainnet | 5042 | USDC (ERC-20 interface) | `0x3600000000000000000000000000000000000000` | 6 |
| Arc testnet | 5042002 | USDC (ERC-20 interface) | `0x3600000000000000000000000000000000000000` | 6 |

Sources: [Mezo contracts reference](https://mezo.org/docs/users/resources/contracts-reference/), [Arc contract addresses](https://docs.arc.io/arc/references/contract-addresses.md).

## How to run

### Prerequisites
Foundry, Node 20+, and a browser wallet (MetaMask, Rabby, etc.).

### Contracts
```bash
git submodule update --init --recursive
cd contracts
forge build
forge test -vv
# optional: run the adapter against the real Mezo testnet sMUSD vault in a LOCAL fork (nothing is sent)
MEZO_TESTNET_RPC=https://rpc.test.mezo.org forge test --match-path 'test/fork/*' -vv
# optional mainnet fork:
# MEZO_MAINNET_RPC=https://mainnet.mezo.public.validationcloud.io forge test --match-path 'test/fork/*' -vv
```

### Local end-to-end (anvil)
```bash
anvil                                    # terminal 1
cd contracts                             # terminal 2
DEPLOY_MOCK_TOKEN=true DEPLOY_MOCK_ADAPTER=true CREATE_DEMO_CIRCLE=true \
  forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key <one of anvil's printed dev keys>
cd ../web && npm install
NEXT_PUBLIC_CHAIN=anvil NEXT_PUBLIC_AJO_ADDRESS=<AjoCircle address> \
  NEXT_PUBLIC_DEFAULT_TOKEN=<MockERC20 address> npm run dev
# to show yield locally: after `start`, send some mock tokens to the MockYieldAdapter address
```

### Testnet deploy (Mezo)
```bash
cd contracts
cast wallet import deployer --interactive         # store the key in Foundry's encrypted keystore
TOKEN_ADDRESS=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503 \
  forge script script/Deploy.s.sol --rpc-url mezo_testnet --account deployer --broadcast
```
Wave 1 shipped with no yield adapter. For Wave 2 on Mezo **testnet** with sMUSD yield, add
`SMUSD_VAULT=0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16` (see [`docs/WAVE2_HANDOFF.md`](docs/WAVE2_HANDOFF.md)).
For Mezo **mainnet**, use `SMUSD_VAULT=0xb4D498029af77680cD1eF828b967f010d06C51CC` and
`--rpc-url https://mainnet.mezo.public.validationcloud.io` with `NEXT_PUBLIC_CHAIN=mezo`.
Gas on Mezo is paid in BTC ([testnet faucet](https://faucet.test.mezo.org/)). Ways to get MUSD without a large trove
are listed under [Get MUSD](#get-musd) below.

### Frontend
```bash
cd web
cp .env.example .env.local   # set NEXT_PUBLIC_CHAIN, NEXT_PUBLIC_AJO_ADDRESS, NEXT_PUBLIC_DEPLOY_BLOCK
npm install
npm run build && npm start   # or: npm run dev
```
After changing the contract, regenerate the ABI with `forge build` and then `npm run abi`.

### Static hosting (live site)
The web app is a fully static Next.js export (`output: 'export'`), hosted on Cloudflare Pages at https://ajocircle.pages.dev.
Circle pages are resolved on the client, so the route is `/circle/?id=N` (ids start at 1). To redeploy after a web change:
```bash
cd web
NEXT_PUBLIC_CHAIN=mezoTestnet \
NEXT_PUBLIC_AJO_ADDRESS=0x463203F3Cd12653bEa11FfCd22512B11e2a91835 \
NEXT_PUBLIC_DEPLOY_BLOCK=16482570 \
npm run build            # writes the static site to web/out
npx -p node@22 -p wrangler wrangler pages deploy out --project-name ajocircle --branch main
```
For a GitHub Pages project site, also set `NEXT_PUBLIC_BASE_PATH=/ajocircle`.

## Deployed addresses

| Network | AjoCircle | Deploy block | Explorer | Live app |
| --- | --- | --- | --- | --- |
| Mezo testnet (31611), Wave 2 sMUSD adapter | `0x463203F3Cd12653bEa11FfCd22512B11e2a91835` | `16482570` | [explorer](https://explorer.test.mezo.org/address/0x463203F3Cd12653bEa11FfCd22512B11e2a91835) · [Sourcify](https://repo.sourcify.dev/31611/0x463203F3Cd12653bEa11FfCd22512B11e2a91835) | [ajocircle.pages.dev](https://ajocircle.pages.dev) |
| Mezo testnet (31611), Wave 1 no adapter (historical) | `0x94A5014b54bF748660AC0D953De67416fe34ea2C` | `16336238` | [explorer](https://explorer.test.mezo.org/address/0x94A5014b54bF748660AC0D953De67416fe34ea2C) · [Sourcify](https://repo.sourcify.dev/31611/0x94A5014b54bF748660AC0D953De67416fe34ea2C) | (retired from live app) |
| Arc mainnet (5042) | `TBD` | `TBD` | https://explorer.arc.io/address/TBD | `TBD` |

Wave 2 adapter: `0x02c9711eaD8b6d101A542eEC8DA2b41Cbe7eD6f6`. Deploy tx: [0xf08a41…d88b](https://explorer.test.mezo.org/tx/0xf08a412b6eebbafa8c01ba8e17657da002f01d03a9b8f8c6cf40a49b533dd88b). Full record: [`deployments/mezo-testnet-wave2.md`](deployments/mezo-testnet-wave2.md). Wave 1 notes: [`deployments/mezo-testnet.md`](deployments/mezo-testnet.md).

Pitch deck: [`docs/AjoCircle-Mezo-deck.pdf`](docs/AjoCircle-Mezo-deck.pdf)

## Get MUSD

Savers do not need to open a ~2,000 MUSD trove. Verified options:

| Option | What it is | Link |
| --- | --- | --- |
| Banxa on-ramp | Buy MUSD with card / Apple Pay / Google Pay / bank transfer inside Mezo Borrow | [Mezo Banxa post](https://mezo.org/blog/buy-musd-directly-with-your-card-banxa-is-live-on-mezo/) · [mezo.org](https://mezo.org) |
| Mezo Swap | Swap BTC / USDC / USDT for MUSD onchain | [Swap feature](https://mezo.org/feature/swap) · [Swap docs](https://mezo.org/docs/users/mezo-earn/pools/mezo-swap/) |
| MUSD bridge | Bridge MUSD between Mezo, Ethereum and Base (Wormhole NTT; Portal UI) | [Bridge docs](https://mezo.org/docs/users/musd/musd-bridge/) · [Portal](https://portalbridge.com) · [announcement](https://mezo.org/blog/mezo-and-musd-go-multichain-with-wormhole/) |
| Borrow vs BTC | Still available; protocol minimum debt is about 2,000 MUSD | [MUSD overview](https://mezo.org/docs/users/musd/) |
| Testnet | Free test BTC from the faucet, then borrow test MUSD | [faucet](https://faucet.test.mezo.org/) · [testnet.mezo.org](https://testnet.mezo.org) |

The in-app **Get MUSD** section on the home page links the same sources.

## Who pays and how it sustains itself

- **Protocol fee:** 0%. AjoCircle takes no cut of contributions, collateral or sMUSD yield.
- **Gas:** each user (or anyone calling `settleRound`) pays their own Mezo gas in BTC.
- **Yield:** when an adapter is wired, collateral yield from Mezo's sMUSD vault is shared among that circle's members. AjoCircle takes no performance fee.
- **Sustainability today:** hackathon and grant work (Mezo Wave 1/2), not user fees. Any future fee will be disclosed in the UI and docs before a deploy that turns it on.

Circles listed in the app are read live from the contract. Outside users are still needed for circles run by people outside the team; the app already has [Start your own circle](https://ajocircle.pages.dev/create/).

## Team

Solo build by **bosso**, solo builder (Solidity / TS / Next.js).
- X: [@bossonormal1](https://x.com/bossonormal1)
- LinkedIn: [ibukun-o-a9453a232](https://www.linkedin.com/in/ibukun-o-a9453a232)

## License
MIT
