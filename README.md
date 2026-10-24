# AjoCircle: onchain ajo / esusu savings circles

> Rotating savings with stablecoins. The smart contract keeps the books, so nobody has to trust the treasurer.

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
- **Shareable.** Each circle has an invite link (`/circle/<id>`) that you can drop into the family WhatsApp group.
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
  index, and harvest happens before every change in principal). At close it is credited to `claimable` pro rata
  to each member's remaining collateral. A defaulter whose collateral was slashed earns less. An exited member
  earns nothing. If nobody has collateral left, the yield is split equally among the members who didn't exit.
- **Optional per deployment.** `new AjoCircle(adapter)`. `address(0)` means plain MUSD/USDC rails, used for Arc
  and for Mezo testnet. Only circles that use the adapter's asset *and* require collateral are routed.
- **Adapter contract** ([`IYieldAdapter`](contracts/src/yield/IYieldAdapter.sol)): single owner (bound once by the
  AjoCircle constructor), principal-protected, instant `withdraw`, and yield paid in the asset. AjoCircle checks
  balance deltas and reverts on any shortfall.

| Adapter | Source | Network | Status |
| --- | --- | --- | --- |
| `MUSDSavingsRateAdapter` | MUSD Savings Vault / sMUSD `0xb4D498029af77680cD1eF828b967f010d06C51CC` (impl `MUSDSavingsRate` `0xb33c3f97…9e87`), no withdrawal fee, 0h time-lock | Mezo **mainnet** 31612 | Unit-tested against a mock with the same ABI, plus a **local fork test against the real vault** (`test/fork/`) |
| `MockYieldAdapter` | holds the token; "yield" is whatever gets sent to it | any | tests / local demo |

### Why Mezo testnet ships without yield

Checked on 2026-10-24 with `eth_call` against `https://rpc.test.mezo.org` (chain 31611):

1. **The MUSD Savings Vault isn't on testnet.** `cast codesize 0xb4D4…51CC` on testnet returns `0`. The same goes
   for the Ditto MUSD vault `0x9171…14F8`. No `MUSDSavingsRate` deployment is published for testnet in
   `mezo-org/musd` (only `matsnet/` core contracts), `mezo-org/tigris` (`deployments/testnet/` has the DEX and
   gauges only) or the docs.
2. **The only callable MUSD sink on testnet is the StabilityPool**, `0x1CCA7E410eE41739792eA0A24e00349Dd247680e`
   (from `musd/solidity/artifacts/deployments/matsnet/StabilityPool.json`). `musd()` returns testnet MUSD and
   `getTotalMUSDDeposits()` returns ≈86.23M. But it isn't a safe home for ajo money:
   - **Principal shrinks.** Liquidations burn depositors' MUSD. The protocol (PCV `0x4dDD…80Af`) deposited 100M,
     and `getCompoundedMUSDDeposit` now reads 86.23M, which is **−13.8%**.
   - **Withdrawals can be frozen.** `eth_call withdrawFromSP(1)` from the PCV reverts with *"StabilityPool:
     Cannot withdraw while there are troves with ICR < MCR"*. The lowest trove is at 109.1% ICR against a 110% MCR.
   - **The yield is BTC, not MUSD.** Liquidation gains are paid in collateral.

   Each of these breaks the "payouts on time, principal intact" promise, so we don't route anything there.
3. On testnet, AjoCircle is therefore deployed with `adapter = address(0)` (native MUSD). The interface, the
   adapters, the UI and the tests are all in place. Turning on yield for a mainnet deployment is one env var:
   `SMUSD_VAULT=0xb4D4…51CC`.

Re-check the testnet facts:
```bash
cast codesize 0xb4D498029af77680cD1eF828b967f010d06C51CC --rpc-url https://rpc.test.mezo.org        # 0
cast call 0x1CCA7E410eE41739792eA0A24e00349Dd247680e "getCompoundedMUSDDeposit(address)(uint256)" \
  0x4dDD70f4C603b6089c07875Be02fEdFD626b80Af --rpc-url https://rpc.test.mezo.org
cast call 0x1CCA7E410eE41739792eA0A24e00349Dd247680e "withdrawFromSP(uint256)" 1 \
  --from 0x4dDD70f4C603b6089c07875Be02fEdFD626b80Af --rpc-url https://rpc.test.mezo.org   # reverts (ICR < MCR)
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
can stay in the contract.  the shuffled order uses onchain pseudo-randomness, which block producers
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
│   ├── test/fork/             opt-in fork test against the real Mezo mainnet sMUSD vault
│   └── script/Deploy.s.sol    env-driven deploy script (no keys in code), optional adapter
└── web/                       Next.js 15 (App Router) + wagmi 2 + viem 2, TypeScript
    ├── src/lib/chains.ts      Mezo testnet / Mezo / Arc / Arc testnet / anvil definitions
    ├── src/lib/config.ts      chain picked by NEXT_PUBLIC_CHAIN, injected-wallet wagmi config
    ├── src/components/        CreateCircle, CircleList, CircleView (+ yield panel), MusdBanner, History, Connect
    └── src/app/circle/[id]    the shareable circle page
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
# optional: run the adapter against the real Mezo mainnet sMUSD vault in a LOCAL fork (nothing is sent)
MEZO_MAINNET_RPC=https://mainnet.mezo.public.validationcloud.io forge test --match-path 'test/fork/*' -vv
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
This deploys with no yield adapter, which is the intended setup for testnet (see above). For a Mezo **mainnet**
deployment with sMUSD yield, add `SMUSD_VAULT=0xb4D498029af77680cD1eF828b967f010d06C51CC`, use
`--rpc-url https://mainnet.mezo.public.validationcloud.io` and set `NEXT_PUBLIC_CHAIN=mezo`.
Gas on Mezo is paid in BTC, which you can get from the [faucet](https://faucet.test.mezo.org/). To get test MUSD,
borrow it against test BTC at [testnet.mezo.org](https://testnet.mezo.org). Note that borrowing has a
**minimum debt of 2,000 MUSD**.

### Frontend
```bash
cd web
cp .env.example .env.local   # set NEXT_PUBLIC_CHAIN, NEXT_PUBLIC_AJO_ADDRESS, NEXT_PUBLIC_DEPLOY_BLOCK
npm install
npm run build && npm start   # or: npm run dev
```
After changing the contract, regenerate the ABI with `forge build` and then `npm run abi`.

## Deployed addresses

| Network | AjoCircle | Deploy block | Explorer | Live app |
| --- | --- | --- | --- | --- |
| Mezo testnet (31611), no adapter | `0x94A5014b54bF748660AC0D953De67416fe34ea2C` | `16336238` | [explorer](https://explorer.test.mezo.org/address/0x94A5014b54bF748660AC0D953De67416fe34ea2C) · [Sourcify](https://repo.sourcify.dev/31611/0x94A5014b54bF748660AC0D953De67416fe34ea2C) | `TBD` |
| Arc mainnet (5042) | `TBD` | `TBD` | https://explorer.arc.io/address/TBD | `TBD` |

Mezo testnet deploy tx: [0xdef687…5a06](https://explorer.test.mezo.org/tx/0xdef687fbcbb0fdc8c46378e5249d5f88a034a88548300e2b8f15bcb317ce5a06). Full record and demo-wallet transactions: [`deployments/mezo-testnet.md`](deployments/mezo-testnet.md).

Pitch deck: [`docs/AjoCircle-Mezo-deck.pdf`](docs/AjoCircle-Mezo-deck.pdf)

## Team

Solo build by **bosso**, solo builder (Solidity / TS / Next.js).
- X: [@bossonormal1](https://x.com/bossonormal1)
- LinkedIn: [ibukun-o-a9453a232](https://www.linkedin.com/in/ibukun-o-a9453a232)

## License
MIT
