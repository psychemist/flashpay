# FlashPay ⚡

**Payment streaming, automated payroll, and LP-backed employee lending platform.**

> Built for HackMoney 2026 | Targeting $56K in prizes

## Features

- **Automated Payroll** - Rule-based batch payments with single-click execution
- **LP-Backed Lending** - Employees provide LP, borrow against positions via Uniswap v4 hooks
- **Multi-Token Payouts** - Sui integration for paying in employee's preferred token
- **Cross-Chain Payments** - LI.FI bridging for multi-chain payroll
- **Salary Streaming** - Real-time payments via Yellow Network state channels
- **Human-Readable Addresses** - ENS resolution for payroll recipients

## Architecture

```
├── contracts/          # Foundry (EVM)
│   ├── OrgRegistry.sol    → Organization & employee management
│   ├── Payroll.sol        → Batch payroll execution
│   ├── PayrollHook.sol    → Uniswap v4 LP tracking + loans
│   └── LendingPool.sol    → Collateralized employee lending
│
├── sui-contracts/      # Move (Sui)
│   ├── multi_token_payroll.move  → Multi-token org payroll
│   └── token_swap.move           → DeepBook swap integration
│
└── frontend/           # Next.js + wagmi + RainbowKit
    └── src/lib/
        ├── circle.ts     → Circle Wallets SDK
        ├── lifi.ts       → LI.FI cross-chain
        ├── ens.ts        → ENS resolution
        └── yellow.ts     → Nitrolite streaming
```

## Quick Start

### EVM Contracts
```bash
cd contracts
forge test -vv              # 9 tests passing
forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast
```

### Sui Contracts
```bash
cd sui-contracts
sui move build
sui client publish --gas-budget 100000000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Prize Integrations

| Sponsor | Prize | Integration |
|---------|-------|-------------|
| **Yellow Network** | $15K | Nitrolite SDK - salary streaming via state channels |
| **Uniswap Foundation** | $10K | v4 Hooks - LP position tracking + collateralized loans |
| **Sui** | $10K | Move contracts - multi-token payroll with PTBs |
| **Arc/Circle** | $10K | Circle Wallets SDK - embedded wallets + USDC |
| **LI.FI** | $6K | Cross-chain payroll execution |
| **ENS** | $5K | Human-readable payment addresses |

## Key Flows

### 1. Organization Setup
1. Admin creates org → mints NFT → sets treasury
2. Creates roles with salaries
3. Adds employees to roles

### 2. LP-Backed Lending
1. Employee adds liquidity to whitelisted pool
2. Hook tracks position automatically
3. Employee borrows against collateral
4. Loans deducted from payroll

### 3. Cross-Chain Payroll
1. Admin initiates payroll
2. System checks employee chain preferences
3. LI.FI routes payments across chains
4. Employees receive on preferred chain

### 4. Salary Streaming
1. Org opens Yellow Network channels
2. Salary streams in real-time
3. Employees withdraw anytime

## Environment Variables

```bash
# Frontend
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=
NEXT_PUBLIC_CIRCLE_API_KEY=
NEXT_PUBLIC_YELLOW_API_KEY=

# Contracts
PRIVATE_KEY=
```

## License

MIT
