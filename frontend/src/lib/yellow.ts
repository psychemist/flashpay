/**
 * Yellow Network Nitrolite SDK Integration
 * Enables instant off-chain salary streaming with state channels
 */

// Types
export interface StreamChannel {
    id: string;
    sender: string;
    recipient: string;
    token: string;
    totalAmount: string;
    streamedAmount: string;
    startTime: number;
    endTime: number;
    ratePerSecond: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
}

export interface StreamPayment {
    recipient: string;
    amount: string;
    duration: number; // seconds
    token?: string;
}

export interface NitroliteConfig {
    apiKey: string;
    environment: 'testnet' | 'mainnet';
    chainId: number;
}

/**
 * Yellow Network Nitrolite Streaming Service
 * Uses state channels for instant, low-cost salary streaming
 */
export class NitroliteStreamingService {
    private readonly config: NitroliteConfig;
    private readonly baseUrl: string;
    private channels: Map<string, StreamChannel> = new Map();

    constructor(config: NitroliteConfig) {
        this.config = config;
        this.baseUrl = config.environment === 'mainnet'
            ? 'https://api.yellow.org/nitrolite/v1'
            : 'https://testnet-api.yellow.org/nitrolite/v1';
    }

    private async request<T>(
        method: 'GET' | 'POST' | 'PUT',
        path: string,
        body?: object
    ): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.config.apiKey,
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            throw new Error(`Nitrolite API error: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Create a new salary streaming channel
     */
    async createStream(
        payment: StreamPayment,
        sender: string
    ): Promise<StreamChannel> {
        const ratePerSecond = BigInt(payment.amount) / BigInt(payment.duration);

        const channel: StreamChannel = {
            id: `stream-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            sender,
            recipient: payment.recipient,
            token: payment.token || 'USDC',
            totalAmount: payment.amount,
            streamedAmount: '0',
            startTime: Math.floor(Date.now() / 1000),
            endTime: Math.floor(Date.now() / 1000) + payment.duration,
            ratePerSecond: ratePerSecond.toString(),
            status: 'ACTIVE',
        };

        // In production: Call Nitrolite SDK to open state channel
        // const result = await this.request<StreamChannel>('POST', '/channels', {
        //   recipient: payment.recipient,
        //   amount: payment.amount,
        //   duration: payment.duration,
        // });

        this.channels.set(channel.id, channel);
        return channel;
    }

    /**
     * Get current streamed amount for a channel
     */
    getStreamedAmount(channelId: string): string {
        const channel = this.channels.get(channelId);
        if (!channel || channel.status !== 'ACTIVE') return '0';

        const now = Math.floor(Date.now() / 1000);
        const elapsed = Math.min(now - channel.startTime, channel.endTime - channel.startTime);
        const streamed = BigInt(channel.ratePerSecond) * BigInt(elapsed);

        return streamed.toString();
    }

    /**
     * Calculate real-time balance for recipient
     */
    getRecipientBalance(recipientAddress: string): string {
        let totalBalance = BigInt(0);

        for (const channel of this.channels.values()) {
            if (channel.recipient === recipientAddress && channel.status === 'ACTIVE') {
                totalBalance += BigInt(this.getStreamedAmount(channel.id));
            }
        }

        return totalBalance.toString();
    }

    /**
     * Withdraw streamed funds (settle state channel)
     */
    async withdrawStream(channelId: string): Promise<string> {
        const channel = this.channels.get(channelId);
        if (!channel) throw new Error('Channel not found');

        const streamedAmount = this.getStreamedAmount(channelId);

        // In production: Call Nitrolite SDK to settle channel
        // const txHash = await this.request<string>('POST', `/channels/${channelId}/withdraw`);

        channel.streamedAmount = streamedAmount;

        // Return mock tx hash
        return `0x${Math.random().toString(16).slice(2)}`;
    }

    /**
     * Create batch streaming for payroll
     */
    async createBatchStreams(
        payments: StreamPayment[],
        sender: string
    ): Promise<StreamChannel[]> {
        const streams: StreamChannel[] = [];

        for (const payment of payments) {
            const stream = await this.createStream(payment, sender);
            streams.push(stream);
        }

        return streams;
    }

    /**
     * Get all active streams for an organization
     */
    getActiveStreams(senderAddress: string): StreamChannel[] {
        return Array.from(this.channels.values()).filter(
            (channel) => channel.sender === senderAddress && channel.status === 'ACTIVE'
        );
    }

    /**
     * Pause a stream
     */
    async pauseStream(channelId: string): Promise<void> {
        const channel = this.channels.get(channelId);
        if (!channel) throw new Error('Channel not found');

        channel.status = 'PAUSED';
        channel.streamedAmount = this.getStreamedAmount(channelId);
    }

    /**
     * Resume a paused stream
     */
    async resumeStream(channelId: string): Promise<void> {
        const channel = this.channels.get(channelId);
        if (!channel) throw new Error('Channel not found');
        if (channel.status !== 'PAUSED') throw new Error('Channel is not paused');

        channel.status = 'ACTIVE';
        channel.startTime = Math.floor(Date.now() / 1000);
    }

    /**
     * Cancel a stream and return remaining funds
     */
    async cancelStream(channelId: string): Promise<string> {
        const channel = this.channels.get(channelId);
        if (!channel) throw new Error('Channel not found');

        channel.status = 'CANCELLED';
        channel.streamedAmount = this.getStreamedAmount(channelId);

        const remaining = BigInt(channel.totalAmount) - BigInt(channel.streamedAmount);

        // In production: Settle channel and return remaining to sender
        return remaining.toString();
    }
}

// React hook for Yellow Network streaming
export function useYellowStreaming(config: NitroliteConfig) {
    const service = new NitroliteStreamingService(config);

    return {
        createStream: service.createStream.bind(service),
        createBatchStreams: service.createBatchStreams.bind(service),
        getStreamedAmount: service.getStreamedAmount.bind(service),
        getRecipientBalance: service.getRecipientBalance.bind(service),
        withdrawStream: service.withdrawStream.bind(service),
        pauseStream: service.pauseStream.bind(service),
        resumeStream: service.resumeStream.bind(service),
        cancelStream: service.cancelStream.bind(service),
        getActiveStreams: service.getActiveStreams.bind(service),
    };
}

// Utility to convert monthly salary to streaming params
export function monthlySalaryToStream(
    monthlySalary: string,
    recipient: string
): StreamPayment {
    // 30 days in seconds
    const MONTH_SECONDS = 30 * 24 * 60 * 60;

    return {
        recipient,
        amount: monthlySalary,
        duration: MONTH_SECONDS,
    };
}
