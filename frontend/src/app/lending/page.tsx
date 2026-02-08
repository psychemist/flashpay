'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Header } from '@/components/Header';
import { ERC20ABI, LendingPoolABI, OrgRegistryABI } from '@/lib/abis';
import { contractAddresses } from '@/lib/wagmi';
import { parseUnits, formatUnits } from 'viem';
import Link from 'next/link';

export default function LendingPage() {
    const { address, isConnected, chainId } = useAccount();
    const [borrowAmount, setBorrowAmount] = useState('1000');
    const [lendAmount, setLendAmount] = useState('5000');
    const [duration, setDuration] = useState('30');

    const chainAddresses = chainId && chainId in contractAddresses
        ? contractAddresses[chainId as keyof typeof contractAddresses]
        : null;

    // Get user's org ID
    const { data: orgId } = useReadContract({
        address: chainAddresses?.orgRegistry,
        abi: OrgRegistryABI,
        functionName: 'employeeToOrg',
        args: [address as `0x${string}`],
    });

    // Read USDC balance
    const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
        address: chainAddresses?.usdc,
        abi: ERC20ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
    });

    // Read pool balance
    const { data: poolBalance, refetch: refetchPool } = useReadContract({
        address: chainAddresses?.lendingPool,
        abi: LendingPoolABI,
        functionName: 'poolBalance',
    });

    // Read max borrowable
    const { data: maxBorrow } = useReadContract({
        address: chainAddresses?.lendingPool,
        abi: LendingPoolABI,
        functionName: 'getMaxBorrow',
        args: [orgId || 0n, address as `0x${string}`],
    });

    // Read current loan
    const { data: currentLoan, refetch: refetchLoan } = useReadContract({
        address: chainAddresses?.lendingPool,
        abi: LendingPoolABI,
        functionName: 'getLoan',
        args: [orgId || 0n, address as `0x${string}`],
    });

    // Read amount owed
    const { data: amountOwed, refetch: refetchOwed } = useReadContract({
        address: chainAddresses?.lendingPool,
        abi: LendingPoolABI,
        functionName: 'calculateOwed',
        args: [orgId || 0n, address as `0x${string}`],
    });

    const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Refetch after successful transaction
    useEffect(() => {
        if (isSuccess) {
            setTimeout(() => {
                refetchBalance();
                refetchPool();
                refetchLoan();
                refetchOwed();
                reset();
            }, 2000);
        }
    }, [isSuccess, refetchBalance, refetchPool, refetchLoan, refetchOwed, reset]);

    const handleBorrow = () => {
        if (!chainAddresses?.lendingPool || !orgId) return;
        const durationSeconds = BigInt(parseInt(duration) * 24 * 60 * 60);

        writeContract({
            address: chainAddresses.lendingPool,
            abi: LendingPoolABI,
            functionName: 'borrow',
            args: [orgId, parseUnits(borrowAmount, 6), durationSeconds],
        });
    };

    const handleRepay = () => {
        if (!chainAddresses?.lendingPool || !orgId || !amountOwed) return;

        writeContract({
            address: chainAddresses.lendingPool,
            abi: LendingPoolABI,
            functionName: 'repay',
            args: [orgId, amountOwed as bigint],
        });
    };

    const handleApproveAndFund = () => {
        if (!chainAddresses?.usdc || !chainAddresses?.lendingPool) return;

        writeContract({
            address: chainAddresses.usdc,
            abi: ERC20ABI,
            functionName: 'approve',
            args: [chainAddresses.lendingPool, parseUnits(lendAmount, 6)],
        });
    };

    const handleFundPool = () => {
        if (!chainAddresses?.lendingPool) return;

        writeContract({
            address: chainAddresses.lendingPool,
            abi: LendingPoolABI,
            functionName: 'fundPool',
            args: [parseUnits(lendAmount, 6)],
        });
    };

    // Check if contracts are deployed
    const isContractDeployed = chainAddresses?.lendingPool !== '0x0000000000000000000000000000000000000000';

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

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
                        ← Back to Dashboard
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <div className="text-4xl mb-4">🏦</div>
                    <h1 className="text-2xl font-bold">Payroll Lending</h1>
                    <p className="text-gray-400 mt-2">Borrow against your LP positions via Uniswap v4 Hook</p>
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-sm text-indigo-400">
                        <span>⚡</span> Powered by LendingPool + PayrollHook
                    </div>
                </div>

                {!isContractDeployed && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-400">
                            <span>⚠️</span>
                            <span>LendingPool contract not deployed yet. UI is in demo mode.</span>
                        </div>
                    </div>
                )}

                {/* Transaction Status */}
                {(isPending || isConfirming) && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin h-5 w-5 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
                            <span className="text-yellow-400">
                                {isPending ? 'Confirm in wallet...' : 'Processing...'}
                            </span>
                        </div>
                    </div>
                )}

                {isSuccess && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-green-400">Transaction successful!</span>
                        </div>
                    </div>
                )}

                {/* Pool Stats */}
                <div className="mb-6 p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <div className="text-gray-400 text-sm">Pool Balance</div>
                            <div className="text-lg font-semibold text-green-400">
                                {poolBalance ? formatUnits(poolBalance as bigint, 6) : '0'} USDC
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400 text-sm">Your Max Borrow</div>
                            <div className="text-lg font-semibold">
                                {maxBorrow ? formatUnits(maxBorrow as bigint, 6) : '0'} USDC
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400 text-sm">Your Org ID</div>
                            <div className="text-lg font-semibold">
                                {orgId ? orgId.toString() : 'N/A'}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400 text-sm">Your USDC</div>
                            <div className="text-lg font-semibold">
                                {usdcBalance ? formatUnits(usdcBalance as bigint, 6) : '0'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Borrow Card */}
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="text-2xl">💰</span> Borrow
                        </h2>

                        {currentLoan && (currentLoan as any).active ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <div className="text-sm text-gray-400 mb-2">Active Loan</div>
                                    <div className="text-2xl font-bold text-red-400">
                                        {amountOwed ? formatUnits(amountOwed as bigint, 6) : '0'} USDC
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Due: {new Date(Number((currentLoan as any).dueDate) * 1000).toLocaleDateString()}
                                    </div>
                                </div>
                                <button
                                    onClick={handleRepay}
                                    disabled={isPending || isConfirming}
                                    className="w-full py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold disabled:opacity-50"
                                >
                                    Repay Full Amount
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Amount (USDC)
                                    </label>
                                    <input
                                        type="number"
                                        value={borrowAmount}
                                        onChange={(e) => setBorrowAmount(e.target.value)}
                                        placeholder="1000"
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Duration
                                    </label>
                                    <select
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg outline-none"
                                    >
                                        <option value="7">7 days</option>
                                        <option value="14">14 days</option>
                                        <option value="30">30 days</option>
                                        <option value="60">60 days</option>
                                    </select>
                                </div>

                                <div className="p-4 bg-gray-800 rounded-lg space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Interest Rate</span>
                                        <span className="text-green-400">5% APR</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Max LTV</span>
                                        <span>50%</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleBorrow}
                                    disabled={isPending || isConfirming || !isContractDeployed}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
                                >
                                    Borrow Now
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Lend Card */}
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="text-2xl">📈</span> Lend
                        </h2>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-800 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Your USDC Balance</span>
                                    <span className="font-mono font-semibold">
                                        {usdcBalance ? formatUnits(usdcBalance as bigint, 6) : '0'} USDC
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Amount to Deposit (USDC)
                                </label>
                                <input
                                    type="number"
                                    value={lendAmount}
                                    onChange={(e) => setLendAmount(e.target.value)}
                                    placeholder="5000"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>

                            <div className="p-4 bg-gray-800 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Expected APY</span>
                                    <span className="text-green-400">~4.5%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Collateralized By</span>
                                    <span>Employee LP Positions</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleApproveAndFund}
                                    disabled={isPending || isConfirming}
                                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold disabled:opacity-50"
                                >
                                    1. Approve
                                </button>
                                <button
                                    onClick={handleFundPool}
                                    disabled={isPending || isConfirming || !isContractDeployed}
                                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-semibold disabled:opacity-50"
                                >
                                    2. Deposit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        <strong>Error:</strong> {error.message}
                    </div>
                )}
            </main>
        </div>
    );
}
