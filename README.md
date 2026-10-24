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

**Known limitations (hackathon scope):** the shuffled order uses onchain pseudo-randomness, which block producers
can influence (use a VRF in production). Collateral covers one missed payment, so a member with no collateral
left only makes that round's pot smaller. Fee-on-transfer and rebasing tokens are not supported. There is a
cap of 50 members per circle so loops stay bounded. The contracts are **unaudited**.

## Architecture

```
ajocircle/
├── contracts/                 Foundry project (Solidity 0.8.24, OpenZeppelin 5.1)
│   ├── src/AjoCircle.sol      single multi-circle contract: SafeERC20 + ReentrancyGuard, events for every action
│   ├── src/MockERC20.sol      mintable token for tests and local anvil
│   ├── test/AjoCircle.t.sol   happy path, missed payment, early exit, edge cases, fuzz
│   └── script/Deploy.s.sol    env-driven deploy script (no keys in code)
└── web/                       Next.js 15 (App Router) + wagmi 2 + viem 2, TypeScript
    ├── src/lib/chains.ts      Mezo testnet / Arc / Arc testnet / anvil definitions
    ├── src/lib/config.ts      chain picked by NEXT_PUBLIC_CHAIN, injected-wallet wagmi config
    ├── src/components/        CreateCircle, CircleList, CircleView, History (event log), Connect
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
```

### Local end-to-end (anvil)
```bash
anvil                                    # terminal 1
cd contracts                             # terminal 2
DEPLOY_MOCK_TOKEN=true CREATE_DEMO_CIRCLE=true \
  forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key <one of anvil's printed dev keys>
cd ../web && npm install
NEXT_PUBLIC_CHAIN=anvil NEXT_PUBLIC_AJO_ADDRESS=<AjoCircle address> \
  NEXT_PUBLIC_DEFAULT_TOKEN=<MockERC20 address> npm run dev
```

### Testnet deploy (Mezo)
```bash
cd contracts
cast wallet import deployer --interactive         # store the key in Foundry's encrypted keystore
TOKEN_ADDRESS=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503 \
  forge script script/Deploy.s.sol --rpc-url mezo_testnet --account deployer --broadcast
```
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
| Mezo testnet (31611) | `TBD` | `TBD` | https://explorer.test.mezo.org/address/TBD | `TBD` |
| Arc mainnet (5042) | `TBD` | `TBD` | https://explorer.arc.io/address/TBD | `TBD` |

Example transactions (contribution and payout): `TBD`

## License
MIT
