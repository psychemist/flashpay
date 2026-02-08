'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Header } from '@/components/Header';
import { OrgRegistryABI, PayrollABI, ERC20ABI } from '@/lib/abis';
import { contractAddresses } from '@/lib/wagmi';
import { parseUnits, formatUnits } from 'viem';
import Link from 'next/link';

// Test employee addresses for demo
const TEST_EMPLOYEES = [
    { name: 'Alice', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' },
    { name: 'Bob', address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' },
    { name: 'Charlie', address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' },
];

export default function PayrollPage() {
    const { address, isConnected, chainId } = useAccount();
    const [orgId, setOrgId] = useState<bigint>(1n);
    const [step, setStep] = useState<'setup' | 'employees' | 'execute'>('setup');
    const [roleName, setRoleName] = useState('Developer');
    const [salary, setSalary] = useState('5000');
    const [refreshKey, setRefreshKey] = useState(0);

    const chainAddresses = chainId && chainId in contractAddresses
        ? contractAddresses[chainId as keyof typeof contractAddresses]
        : null;

    // Read org data
    const { data: orgData, refetch: refetchOrg } = useReadContract({
        address: chainAddresses?.orgRegistry,
        abi: OrgRegistryABI,
        functionName: 'getOrganization',
        args: [orgId],
    });

    // Read role count
    const { data: roleCount, refetch: refetchRoles } = useReadContract({
        address: chainAddresses?.orgRegistry,
        abi: OrgRegistryABI,
        functionName: 'getRoleCount',
        args: [orgId],
    });

    // Read payroll preview
    const { data: payrollPreview, refetch: refetchPayroll } = useReadContract({
        address: chainAddresses?.orgRegistry,
        abi: OrgRegistryABI,
        functionName: 'calculatePayroll',
        args: [orgId],
    });

    // Read active employees
    const { data: activeEmployees, refetch: refetchEmployees } = useReadContract({
        address: chainAddresses?.orgRegistry,
        abi: OrgRegistryABI,
        functionName: 'getActiveEmployees',
        args: [orgId],
    });

    // Read USDC balance
    const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
        address: chainAddresses?.usdc,
        abi: ERC20ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
    });

    const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    // Refetch all data after successful transaction
    useEffect(() => {
        if (isSuccess) {
            setTimeout(() => {
                refetchOrg();
                refetchRoles();
                refetchPayroll();
                refetchEmployees();
                refetchBalance();
                reset(); // Reset the transaction state
            }, 2000); // Wait for blockchain to update
        }
    }, [isSuccess, refetchOrg, refetchRoles, refetchPayroll, refetchEmployees, refetchBalance, reset]);

    const org = orgData as {
        id: bigint;
        admin: string;
        name: string;
        treasury: string;
        payrollCycle: bigint;
        lastPayrollTime: bigint;
        active: boolean;
    } | undefined;

    const payroll = payrollPreview as [bigint, string[], bigint[]] | undefined;
    const employees = activeEmployees as string[] | undefined;

    const handleCreateRole = () => {
        if (!chainAddresses?.orgRegistry) return;
        const salaryInUsdc = parseUnits(salary, 6);
        const periodDuration = BigInt(30 * 24 * 60 * 60); // 30 days

        writeContract({
            address: chainAddresses.orgRegistry,
            abi: OrgRegistryABI,
            functionName: 'createRole',
            args: [orgId, roleName, salaryInUsdc, periodDuration],
        });
    };

    const handleAddEmployee = (employeeAddress: string) => {
        if (!chainAddresses?.orgRegistry) return;
        const roleId = 0n; // First role (roles start at 0)

        writeContract({
            address: chainAddresses.orgRegistry,
            abi: OrgRegistryABI,
            functionName: 'addEmployee',
            args: [orgId, employeeAddress as `0x${string}`, roleId],
        });
    };

    const handleApproveUSDC = () => {
        if (!chainAddresses?.usdc || !chainAddresses?.payroll || !payroll) return;

        writeContract({
            address: chainAddresses.usdc,
            abi: ERC20ABI,
            functionName: 'approve',
            args: [chainAddresses.payroll, payroll[0]],
        });
    };

    const handleExecutePayroll = () => {
        if (!chainAddresses?.payroll) return;

        writeContract({
            address: chainAddresses.payroll,
            abi: PayrollABI,
            functionName: 'executePayrollFromRegistry',
            args: [orgId],
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

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
                        ← Back to Dashboard
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <div className="text-4xl mb-4">💸</div>
                    <h1 className="text-2xl font-bold">Payroll Management</h1>
                    <p className="text-gray-400 mt-2">Set up employees and execute payroll</p>
                </div>

                {/* Org Selector */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Organization ID</label>
                    <input
                        type="number"
                        value={orgId.toString()}
                        onChange={(e) => setOrgId(BigInt(e.target.value || '1'))}
                        className="w-32 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                        min="1"
                    />
                    {org && org.active && (
                        <span className="ml-4 text-green-400">✓ {org.name}</span>
                    )}
                    {org && !org.active && (
                        <span className="ml-4 text-red-400">Organization not found</span>
                    )}
                </div>

                {/* Step Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['setup', 'employees', 'execute'] as const).map((s, i) => (
                        <button
                            key={s}
                            onClick={() => setStep(s)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${step === s
                                ? 'bg-indigo-500 text-white'
                                : 'bg-gray-800 text-gray-400 hover:text-white'
                                }`}
                        >
                            {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Step Content */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                    {step === 'setup' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold">1. Create a Role</h2>
                            <p className="text-gray-400 text-sm">Define a role with a salary for your employees</p>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Role Name</label>
                                    <input
                                        type="text"
                                        value={roleName}
                                        onChange={(e) => setRoleName(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Salary (USDC)</label>
                                    <input
                                        type="number"
                                        value={salary}
                                        onChange={(e) => setSalary(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleCreateRole}
                                    disabled={isPending || isConfirming}
                                    className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium disabled:opacity-50"
                                >
                                    {isPending ? 'Confirm...' : isConfirming ? 'Creating...' : 'Create Role'}
                                </button>
                                <span className="text-gray-400 text-sm">
                                    Current roles: {roleCount?.toString() || '0'}
                                </span>
                            </div>

                            {isSuccess && (
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
                                    Role created! Move to step 2 to add employees.
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'employees' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold">2. Add Employees</h2>
                            <p className="text-gray-400 text-sm">Add test employees to the organization</p>

                            <div className="space-y-3">
                                {TEST_EMPLOYEES.map((emp) => (
                                    <div key={emp.address} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                                        <div>
                                            <span className="font-medium">{emp.name}</span>
                                            <span className="text-gray-400 text-sm ml-2 font-mono">
                                                {emp.address.slice(0, 10)}...
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleAddEmployee(emp.address)}
                                            disabled={isPending || isConfirming}
                                            className="px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-sm font-medium disabled:opacity-50"
                                        >
                                            Add Employee
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-gray-700">
                                <p className="text-gray-400 text-sm">
                                    Active employees: {employees?.length || 0}
                                </p>
                                {employees && employees.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {employees.map((addr, i) => (
                                            <div key={i} className="text-sm font-mono text-gray-300">
                                                • {addr}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'execute' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold">3. Execute Payroll</h2>

                            {/* Transaction Status */}
                            {(isPending || isConfirming) && (
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="animate-spin h-5 w-5 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
                                        <span className="text-yellow-400">
                                            {isPending ? 'Please confirm in your wallet...' : 'Transaction processing...'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {isSuccess && (
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-green-400">Transaction successful!</span>
                                    </div>
                                    {hash && (
                                        <a
                                            href={`https://sepolia.basescan.org/tx/${hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-indigo-400 hover:underline mt-2 block"
                                        >
                                            View on BaseScan →
                                        </a>
                                    )}
                                </div>
                            )}

                            {payroll && payroll[1].length > 0 ? (
                                <>
                                    <div className="p-4 bg-gray-800 rounded-lg">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-gray-400">Total Payout</span>
                                            <span className="text-2xl font-bold text-green-400">
                                                {formatUnits(payroll[0], 6)} USDC
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            {payroll[1].length} recipients
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-800 rounded-lg space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Your USDC Balance (Treasury)</span>
                                            <span className="font-mono">
                                                {usdcBalance ? formatUnits(usdcBalance as bigint, 6) : '0'} USDC
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Note: You must have USDC in your wallet (the treasury) and approve the Payroll contract to spend it.
                                        </p>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleApproveUSDC}
                                            disabled={isPending || isConfirming}
                                            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isPending ? '⏳ Confirming...' : '1. Approve USDC'}
                                        </button>
                                        <button
                                            onClick={handleExecutePayroll}
                                            disabled={isPending || isConfirming}
                                            className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isPending ? '⏳ Confirming...' : '2. Execute Payroll'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <p>No employees configured. Add employees in step 2 first.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            <strong>Error:</strong> {error.message}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
