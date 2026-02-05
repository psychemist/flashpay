'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Header } from '@/components/Header';
import { OrgRegistryABI } from '@/lib/abis';
import { contractAddresses } from '@/lib/wagmi';
import { useState } from 'react';
import { parseUnits, formatUnits } from 'viem';
import Link from 'next/link';

export default function DashboardPage() {
    const { address, isConnected, chainId } = useAccount();
    const [orgId, setOrgId] = useState<bigint>(1n);

    // Get contract address for current chain
    const chainAddresses = chainId && chainId in contractAddresses
        ? contractAddresses[chainId as keyof typeof contractAddresses]
        : null;

    // Try to read organization data
    const { data: orgData, isLoading: orgLoading } = useReadContract({
        address: chainAddresses?.orgRegistry,
        abi: OrgRegistryABI,
        functionName: 'getOrganization',
        args: [orgId],
    });

    // Check if user is admin
    const { data: isAdmin } = useReadContract({
        address: chainAddresses?.orgRegistry,
        abi: OrgRegistryABI,
        functionName: 'isOrgAdmin',
        args: [orgId, address as `0x${string}`],
    });

    // Get payroll calculation
    const { data: payrollData } = useReadContract({
        address: chainAddresses?.orgRegistry,
        abi: OrgRegistryABI,
        functionName: 'calculatePayroll',
        args: [orgId],
    });

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gray-950">
                <Header />
                <div className="max-w-7xl mx-auto px-4 py-16 text-center">
                    <h1 className="text-2xl font-bold mb-4">Please connect your wallet</h1>
                    <p className="text-gray-400">Connect your wallet to access the dashboard</p>
                </div>
            </div>
        );
    }

    const org = orgData as {
        id: bigint;
        admin: string;
        name: string;
        treasury: string;
        payrollCycle: bigint;
        lastPayrollTime: bigint;
        active: boolean;
    } | undefined;

    const payroll = payrollData as [bigint, string[], bigint[]] | undefined;

    return (
        <div className="min-h-screen bg-gray-950">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
                    <p className="text-gray-400">
                        Connected: <span className="text-indigo-400 font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <Link
                        href="/organization/create"
                        className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6 hover:border-indigo-500/40 transition-colors group"
                    >
                        <div className="text-3xl mb-3">🏢</div>
                        <h3 className="font-semibold mb-1 group-hover:text-indigo-400 transition-colors">Create Organization</h3>
                        <p className="text-sm text-gray-400">Set up your company for payroll</p>
                    </Link>

                    <Link
                        href="/payroll"
                        className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6 hover:border-green-500/40 transition-colors group"
                    >
                        <div className="text-3xl mb-3">💸</div>
                        <h3 className="font-semibold mb-1 group-hover:text-green-400 transition-colors">Run Payroll</h3>
                        <p className="text-sm text-gray-400">Execute batch payments</p>
                    </Link>

                    <Link
                        href="/lending"
                        className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-xl p-6 hover:border-pink-500/40 transition-colors group"
                    >
                        <div className="text-3xl mb-3">🏦</div>
                        <h3 className="font-semibold mb-1 group-hover:text-pink-400 transition-colors">LP Lending</h3>
                        <p className="text-sm text-gray-400">Provide liquidity & borrow</p>
                    </Link>
                </div>

                {/* Organization Status */}
                {chainAddresses?.orgRegistry !== '0x0000000000000000000000000000000000000000' && org && org.active ? (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Org Info */}
                        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span className="text-2xl">🏢</span> Organization
                            </h2>
                            <div className="space-y-3">
                                <InfoRow label="Name" value={org.name} />
                                <InfoRow label="Admin" value={`${org.admin.slice(0, 6)}...${org.admin.slice(-4)}`} />
                                <InfoRow label="Treasury" value={`${org.treasury.slice(0, 6)}...${org.treasury.slice(-4)}`} />
                                <InfoRow label="Payroll Cycle" value={`${Number(org.payrollCycle) / 86400} days`} />
                                {isAdmin && (
                                    <div className="pt-2">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/10 text-green-400 text-sm rounded-full border border-green-500/20">
                                            ✓ You are admin
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payroll Preview */}
                        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span className="text-2xl">💰</span> Payroll Preview
                            </h2>
                            {payroll && payroll[1].length > 0 ? (
                                <div className="space-y-3">
                                    <InfoRow
                                        label="Total Amount"
                                        value={`${formatUnits(payroll[0], 6)} USDC`}
                                        highlight
                                    />
                                    <InfoRow label="Recipients" value={payroll[1].length.toString()} />
                                    <div className="pt-4">
                                        <Link
                                            href="/payroll"
                                            className="w-full inline-flex justify-center items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition-colors"
                                        >
                                            Execute Payroll
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm">No employees configured yet</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
                        <div className="text-4xl mb-4">🚀</div>
                        <h2 className="text-xl font-semibold mb-2">Get Started</h2>
                        <p className="text-gray-400 mb-6 max-w-md mx-auto">
                            {chainAddresses?.orgRegistry === '0x0000000000000000000000000000000000000000'
                                ? 'Contracts not yet deployed on this network. Deploy to Base Sepolia to get started.'
                                : 'Create your organization to start managing payroll and employee benefits.'}
                        </p>
                        <Link
                            href="/organization/create"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all"
                        >
                            Create Organization
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">{label}</span>
            <span className={`font-mono ${highlight ? 'text-lg font-semibold text-indigo-400' : 'text-sm'}`}>
                {value}
            </span>
        </div>
    );
}
