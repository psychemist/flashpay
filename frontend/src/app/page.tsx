'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { Header } from '@/components/Header';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            HackMoney 2026
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              FlashPay
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
            Payment streaming, automated payroll, and LP-backed employee lending.
            <span className="text-white"> All in one platform.</span>
          </p>

          {!isConnected ? (
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          ) : (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all transform hover:scale-105"
            >
              Go to Dashboard
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <FeatureCard
            icon="💰"
            title="Automated Payroll"
            description="Rule-based payroll execution with single-click confirmation. No more manual calculations."
          />
          <FeatureCard
            icon="🔄"
            title="Salary Streaming"
            description="Real-time salary accrual with continuous streaming via Yellow Network."
          />
          <FeatureCard
            icon="🏦"
            title="LP-Backed Lending"
            description="Employees provide liquidity and borrow against their positions via Uniswap v4 hooks."
          />
          <FeatureCard
            icon="🌐"
            title="Multi-Chain Payouts"
            description="Pay employees on their preferred chain with automatic bridging via LI.FI."
          />
          <FeatureCard
            icon="🪙"
            title="Multi-Token Support"
            description="Sui integration for multi-token payouts with DeepBook swaps."
          />
          <FeatureCard
            icon="🔒"
            title="Privacy First"
            description="Employer cannot view individual loan details. Only aggregate deductions visible."
          />
        </div>

        {/* Prize Integrations */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-center mb-8">Built With</h2>
          <div className="flex flex-wrap justify-center gap-6">
            <PrizeBadge name="Uniswap v4" color="pink" />
            <PrizeBadge name="Sui" color="blue" />
            <PrizeBadge name="Circle/Arc" color="green" />
            <PrizeBadge name="LI.FI" color="purple" />
            <PrizeBadge name="Yellow Network" color="yellow" />
            <PrizeBadge name="ENS" color="indigo" />
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}

function PrizeBadge({ name, color }: { name: string; color: string }) {
  const colorClasses: Record<string, string> = {
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };

  return (
    <span className={`px-4 py-2 rounded-full border ${colorClasses[color]} text-sm font-medium`}>
      {name}
    </span>
  );
}
