'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import Link from 'next/link';

export function Header() {
    const { isConnected } = useAccount();

    return (
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">⚡</span>
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            FlashPay
                        </span>
                    </Link>

                    {/* Navigation */}
                    {isConnected && (
                        <nav className="hidden md:flex items-center gap-6">
                            <Link
                                href="/dashboard"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/organization"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                Organization
                            </Link>
                            <Link
                                href="/payroll"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                Payroll
                            </Link>
                            <Link
                                href="/lending"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                Lending
                            </Link>
                        </nav>
                    )}

                    {/* Connect Button */}
                    <ConnectButton
                        showBalance={false}
                        chainStatus="icon"
                        accountStatus="address"
                    />
                </div>
            </div>
        </header>
    );
}
