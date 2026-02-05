'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Header } from '@/components/Header';
import { OrgRegistryABI } from '@/lib/abis';
import { contractAddresses } from '@/lib/wagmi';
import { parseUnits } from 'viem';
import Link from 'next/link';

export default function CreateOrganizationPage() {
    const { address, isConnected, chainId } = useAccount();
    const [name, setName] = useState('');
    const [treasury, setTreasury] = useState('');
    const [payrollCycleDays, setPayrollCycleDays] = useState('30');

    const chainAddresses = chainId && chainId in contractAddresses
        ? contractAddresses[chainId as keyof typeof contractAddresses]
        : null;

    const { writeContract, data: hash, isPending, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!chainAddresses?.orgRegistry) return;

        const treasuryAddress = treasury || address;
        const cycleSeconds = BigInt(parseInt(payrollCycleDays) * 24 * 60 * 60);

        writeContract({
            address: chainAddresses.orgRegistry,
            abi: OrgRegistryABI,
            functionName: 'createOrganization',
            args: [name, treasuryAddress as `0x${string}`, cycleSeconds],
        });
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gray-950">
                <Header />
                <div className="max-w-7xl mx-auto px-4 py-16 text-center">
                    <h1 className="text-2xl font-bold mb-4">Please connect your wallet</h1>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950">
            <Header />

            <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
                        ← Back to Dashboard
                    </Link>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
                    <div className="text-center mb-8">
                        <div className="text-4xl mb-4">🏢</div>
                        <h1 className="text-2xl font-bold">Create Organization</h1>
                        <p className="text-gray-400 mt-2">Set up your company for automated payroll</p>
                    </div>

                    {isSuccess ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-green-400 mb-2">Organization Created!</h2>
                            <p className="text-gray-400 mb-4">Your organization has been registered on-chain.</p>
                            <div className="flex gap-4 justify-center">
                                <Link
                                    href="/dashboard"
                                    className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition-colors"
                                >
                                    Go to Dashboard
                                </Link>
                                <a
                                    href={`https://sepolia.basescan.org/tx/${hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                                >
                                    View Transaction
                                </a>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Organization Name *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Acme Corporation"
                                    required
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Treasury Address
                                </label>
                                <input
                                    type="text"
                                    value={treasury}
                                    onChange={(e) => setTreasury(e.target.value)}
                                    placeholder={address || '0x...'}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                />
                                <p className="text-gray-500 text-xs mt-1">
                                    Leave empty to use your connected wallet
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Payroll Cycle (Days)
                                </label>
                                <select
                                    value={payrollCycleDays}
                                    onChange={(e) => setPayrollCycleDays(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="7">Weekly (7 days)</option>
                                    <option value="14">Bi-weekly (14 days)</option>
                                    <option value="30">Monthly (30 days)</option>
                                </select>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    Error: {error.message}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isPending || isConfirming || !name}
                                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Creating...' : 'Create Organization'}
                            </button>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
