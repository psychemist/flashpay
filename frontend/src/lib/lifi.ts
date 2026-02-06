/**
 * LI.FI SDK Integration
 * Cross-chain payroll execution with automatic bridging and swaps
 * 
 * To use: npm install @lifi/sdk
 */

// Types
export interface CrossChainPayment {
    recipient: string;
    amount: string;
    sourceChain: number;
    destinationChain: number;
    sourceToken: string;
    destinationToken: string;
}

export interface PayrollRoute {
    id: string;
    fromChainId: number;
    toChainId: number;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
    estimatedGas: string;
    steps: RouteStep[];
}

export interface RouteStep {
    type: 'swap' | 'bridge' | 'cross';
    tool: string;
    fromToken: string;
    toToken: string;
    fromChainId: number;
    toChainId: number;
}

// LI.FI API endpoint
const LIFI_API = 'https://li.quest/v1';

// LI.FI Service using REST API
export class LiFiPayrollService {
    private readonly integrator = 'flashpay';

    /**
     * Get quote for cross-chain payment using LI.FI REST API
     */
    async getPayrollQuote(payment: CrossChainPayment): Promise<PayrollRoute> {
        const params = new URLSearchParams({
            fromChain: payment.sourceChain.toString(),
            toChain: payment.destinationChain.toString(),
            fromToken: payment.sourceToken,
            toToken: payment.destinationToken,
            fromAmount: payment.amount,
            fromAddress: payment.recipient,
            toAddress: payment.recipient,
            integrator: this.integrator,
        });

        const response = await fetch(`${LIFI_API}/quote?${params}`);
        if (!response.ok) {
            throw new Error(`LI.FI API error: ${response.statusText}`);
        }

        const quote = await response.json();

        return {
            id: quote.id || `quote-${Date.now()}`,
            fromChainId: quote.action?.fromChainId || payment.sourceChain,
            toChainId: quote.action?.toChainId || payment.destinationChain,
            fromToken: quote.action?.fromToken?.address || payment.sourceToken,
            toToken: quote.action?.toToken?.address || payment.destinationToken,
            fromAmount: quote.action?.fromAmount || payment.amount,
            toAmount: quote.estimate?.toAmount || payment.amount,
            estimatedGas: quote.estimate?.gasCosts?.[0]?.amount || '0',
            steps: (quote.includedSteps || []).map((step: {
                type: string;
                tool: string;
                action: {
                    fromToken: { address: string };
                    toToken: { address: string };
                    fromChainId: number;
                    toChainId: number;
                };
            }) => ({
                type: step.type as 'swap' | 'bridge' | 'cross',
                tool: step.tool,
                fromToken: step.action?.fromToken?.address,
                toToken: step.action?.toToken?.address,
                fromChainId: step.action?.fromChainId,
                toChainId: step.action?.toChainId,
            })),
        };
    }

    /**
     * Get transaction data for execution
     */
    async getTransactionRequest(quote: PayrollRoute): Promise<{
        to: string;
        data: string;
        value: string;
        chainId: number;
    }> {
        const response = await fetch(`${LIFI_API}/quote/contractCalls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quote }),
        });

        if (!response.ok) {
            throw new Error(`LI.FI API error: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get payment status
     */
    async getPaymentStatus(txHash: string, fromChain: number): Promise<string> {
        const response = await fetch(
            `${LIFI_API}/status?txHash=${txHash}&fromChain=${fromChain}`
        );

        if (!response.ok) return 'UNKNOWN';

        const data = await response.json();
        return data.status || 'PENDING';
    }

    /**
     * Execute batch cross-chain payroll
     */
    async getBatchQuotes(
        payments: CrossChainPayment[]
    ): Promise<Map<string, PayrollRoute>> {
        const results = new Map<string, PayrollRoute>();

        for (const payment of payments) {
            try {
                const quote = await this.getPayrollQuote(payment);
                results.set(payment.recipient, quote);
            } catch (error) {
                console.error(`Failed quote for ${payment.recipient}:`, error);
            }
        }

        return results;
    }
}

// Common chain IDs and USDC addresses
export const CHAIN_CONFIG = {
    ethereum: {
        chainId: 1,
        usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
    base: {
        chainId: 8453,
        usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    arbitrum: {
        chainId: 42161,
        usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
    optimism: {
        chainId: 10,
        usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    },
    polygon: {
        chainId: 137,
        usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    },
} as const;

// React hook for LI.FI integration
export function useLiFiPayroll() {
    const service = new LiFiPayrollService();

    return {
        getQuote: service.getPayrollQuote.bind(service),
        getTransactionRequest: service.getTransactionRequest.bind(service),
        getStatus: service.getPaymentStatus.bind(service),
        getBatchQuotes: service.getBatchQuotes.bind(service),
        chains: CHAIN_CONFIG,
    };
}
