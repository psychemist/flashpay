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
        orgRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        payroll: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        usdc: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    },
    // Base mainnet
    8453: {
        orgRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        payroll: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // USDC on Base
    },
} as const;

export type SupportedChainId = keyof typeof contractAddresses;
