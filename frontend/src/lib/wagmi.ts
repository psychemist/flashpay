import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia, base } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'FlashPay',
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo',
    chains: [baseSepolia, base],
    ssr: true,
});

// Contract addresses - update after deployment
export const contractAddresses = {
    // Base Sepolia testnet
    84532: {
        orgRegistry: '0x802cd92d3777e6865017a250b33ddd61f94c1f24' as `0x${string}`,
        payroll: '0xb227606e0350ab106ff8a608d50a537f63deeaa4' as `0x${string}`,
        usdc: '0x936721eb348aac1f1a11b5288f7ef2f70c46c720' as `0x${string}`,
        payrollHook: '0x326Bea970689fef8577DcAFcDB95A5448fE9D0C6' as `0x${string}`,
        lendingPool: '0x8dA7Af87EC45E41669AD84c03B7B8de922fdE0F4' as `0x${string}`,
    },
    // Base mainnet
    8453: {
        orgRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        payroll: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // USDC on Base
        payrollHook: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        lendingPool: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    },
} as const;

export type SupportedChainId = keyof typeof contractAddresses;
