/**
 * ENS Name Resolution
 * Resolve human-readable names to addresses for payroll
 */

import { createPublicClient, http } from 'viem';
import { normalize } from 'viem/ens';
import { mainnet } from 'viem/chains';

// ENS resolver client (uses mainnet for resolution)
const ensClient = createPublicClient({
    chain: mainnet,
    transport: http(),
});

// Types
export interface ResolvedAddress {
    name: string;
    address: `0x${string}`;
    avatar?: string;
    contentHash?: string;
}

export interface ENSBatchResult {
    resolved: ResolvedAddress[];
    failed: string[];
}

/**
 * Resolve a single ENS name to address
 */
export async function resolveENSName(
    name: string
): Promise<`0x${string}` | null> {
    try {
        const address = await ensClient.getEnsAddress({
            name: normalize(name),
        });
        return address;
    } catch (error) {
        console.error(`Failed to resolve ${name}:`, error);
        return null;
    }
}

/**
 * Resolve address to ENS name (reverse lookup)
 */
export async function resolveAddress(
    address: `0x${string}`
): Promise<string | null> {
    try {
        const name = await ensClient.getEnsName({
            address,
        });
        return name;
    } catch (error) {
        console.error(`Failed to reverse resolve ${address}:`, error);
        return null;
    }
}

/**
 * Get ENS avatar for a name
 */
export async function getENSAvatar(name: string): Promise<string | null> {
    try {
        const avatar = await ensClient.getEnsAvatar({
            name: normalize(name),
        });
        return avatar;
    } catch (error) {
        console.error(`Failed to get avatar for ${name}:`, error);
        return null;
    }
}

/**
 * Resolve full ENS profile
 */
export async function getENSProfile(
    name: string
): Promise<ResolvedAddress | null> {
    try {
        const normalizedName = normalize(name);

        const [address, avatar] = await Promise.all([
            ensClient.getEnsAddress({ name: normalizedName }),
            ensClient.getEnsAvatar({ name: normalizedName }).catch(() => null),
        ]);

        if (!address) return null;

        return {
            name,
            address,
            avatar: avatar || undefined,
        };
    } catch (error) {
        console.error(`Failed to get profile for ${name}:`, error);
        return null;
    }
}

/**
 * Batch resolve ENS names for payroll
 * Accepts mix of ENS names and addresses
 */
export async function batchResolveForPayroll(
    recipients: string[]
): Promise<ENSBatchResult> {
    const resolved: ResolvedAddress[] = [];
    const failed: string[] = [];

    await Promise.all(
        recipients.map(async (recipient) => {
            // Check if already an address
            if (recipient.startsWith('0x') && recipient.length === 42) {
                resolved.push({
                    name: recipient,
                    address: recipient as `0x${string}`,
                });
                return;
            }

            // Try to resolve as ENS name
            if (recipient.endsWith('.eth') || recipient.includes('.')) {
                const profile = await getENSProfile(recipient);
                if (profile) {
                    resolved.push(profile);
                } else {
                    failed.push(recipient);
                }
                return;
            }

            // Unknown format
            failed.push(recipient);
        })
    );

    return { resolved, failed };
}

/**
 * Validate and normalize payroll recipient
 * Returns address if valid, null otherwise
 */
export async function validateRecipient(
    input: string
): Promise<`0x${string}` | null> {
    // Already an address
    if (input.startsWith('0x') && input.length === 42) {
        return input as `0x${string}`;
    }

    // ENS name
    if (input.endsWith('.eth') || input.includes('.')) {
        return resolveENSName(input);
    }

    return null;
}

// React hook for ENS resolution
export function useENS() {
    return {
        resolveName: resolveENSName,
        resolveAddress,
        getAvatar: getENSAvatar,
        getProfile: getENSProfile,
        batchResolve: batchResolveForPayroll,
        validateRecipient,
    };
}
