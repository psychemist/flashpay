/**
 * Circle Wallets SDK Integration
 * Provides embedded wallet creation and USDC payment settlement
 */

// Circle Wallet Types
export interface CircleWallet {
    id: string;
    address: string;
    blockchain: 'ETH' | 'BASE' | 'MATIC';
    createDate: string;
    state: 'LIVE' | 'PENDING' | 'FROZEN';
}

export interface CircleTransfer {
    id: string;
    source: { type: 'wallet'; id: string };
    destination: { type: 'blockchain'; address: string; chain: string };
    amount: { amount: string; currency: 'USD' | 'USDC' };
    status: 'PENDING' | 'COMPLETE' | 'FAILED';
}

// Circle API Client
export class CircleWalletService {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.circle.com/v1/w3s';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async request<T>(
        method: 'GET' | 'POST',
        path: string,
        body?: object
    ): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            throw new Error(`Circle API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Create a new embedded wallet for an employee
     */
    async createWallet(
        userId: string,
        blockchain: 'ETH' | 'BASE' | 'MATIC' = 'BASE'
    ): Promise<CircleWallet> {
        return this.request<CircleWallet>('POST', '/wallets', {
            idempotencyKey: `wallet-${userId}-${Date.now()}`,
            blockchains: [blockchain],
            metadata: [{ name: 'userId', value: userId }],
        });
    }

    /**
     * Get wallet by ID
     */
    async getWallet(walletId: string): Promise<CircleWallet> {
        return this.request<CircleWallet>('GET', `/wallets/${walletId}`);
    }

    /**
     * Get wallets for a user
     */
    async getWalletsByUser(userId: string): Promise<CircleWallet[]> {
        const result = await this.request<{ wallets: CircleWallet[] }>(
            'GET',
            `/wallets?userId=${userId}`
        );
        return result.wallets;
    }

    /**
     * Transfer USDC to a blockchain address
     */
    async transferUSDC(
        sourceWalletId: string,
        destinationAddress: string,
        amount: string,
        blockchain: string = 'BASE'
    ): Promise<CircleTransfer> {
        return this.request<CircleTransfer>('POST', '/transfers', {
            idempotencyKey: `transfer-${sourceWalletId}-${Date.now()}`,
            source: { type: 'wallet', id: sourceWalletId },
            destination: {
                type: 'blockchain',
                address: destinationAddress,
                chain: blockchain,
            },
            amount: { amount, currency: 'USDC' },
        });
    }

    /**
     * Execute batch payroll via Circle
     */
    async executeBatchPayroll(
        sourceWalletId: string,
        payments: Array<{ address: string; amount: string }>,
        blockchain: string = 'BASE'
    ): Promise<CircleTransfer[]> {
        const transfers: CircleTransfer[] = [];

        for (const payment of payments) {
            const transfer = await this.transferUSDC(
                sourceWalletId,
                payment.address,
                payment.amount,
                blockchain
            );
            transfers.push(transfer);
        }

        return transfers;
    }
}

// React Hook for Circle Wallets
export function useCircleWallet(apiKey: string) {
    const service = new CircleWalletService(apiKey);

    return {
        createWallet: service.createWallet.bind(service),
        getWallet: service.getWallet.bind(service),
        transferUSDC: service.transferUSDC.bind(service),
        executeBatchPayroll: service.executeBatchPayroll.bind(service),
    };
}
