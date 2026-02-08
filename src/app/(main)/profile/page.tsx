'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    image?: string;
    rating: number;
    tokenBalance: number;
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
}

interface TokenTransaction {
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
}

export default function ProfilePage() {
    const { data: session } = useSession();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [userRes, tokenRes] = await Promise.all([
                    fetch('/api/user'),
                    fetch('/api/user/tokens'),
                ]);
                const userData = await userRes.json();
                const tokenData = await tokenRes.json();

                if (userData.success) setProfile(userData.data);
                if (tokenData.success) setTransactions(tokenData.data?.history || []);
            } catch {
                console.error('Failed to fetch profile');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-400">Loading profile...</div>
            </div>
        );
    }

    const winRate = profile && profile.totalGames > 0
        ? Math.round((profile.wins / profile.totalGames) * 100)
        : 0;

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/play" className="text-primary hover:underline mb-4 inline-block">
                    &larr; Back to Play
                </Link>

                <h1 className="text-3xl font-bold mb-8">Profile</h1>

                {/* User Info */}
                <div className="card mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-3xl">
                            {profile?.image ? (
                                <img src={profile.image} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                '&#128100;'
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{profile?.name || session?.user?.name}</h2>
                            <p className="text-gray-400">{profile?.email || session?.user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card text-center">
                        <div className="text-3xl font-bold text-primary">{profile?.rating || 1200}</div>
                        <div className="text-sm text-gray-400">Rating</div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card text-center">
                        <div className="text-3xl font-bold text-secondary">{profile?.tokenBalance?.toLocaleString() || '---'}</div>
                        <div className="text-sm text-gray-400">Tokens</div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card text-center">
                        <div className="text-3xl font-bold">{profile?.totalGames || 0}</div>
                        <div className="text-sm text-gray-400">Total Games</div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card text-center">
                        <div className="text-3xl font-bold text-green-400">{winRate}%</div>
                        <div className="text-sm text-gray-400">Win Rate</div>
                    </motion.div>
                </div>

                {/* Win/Loss/Draw */}
                <div className="card mb-8">
                    <h3 className="text-lg font-bold mb-4">Game Results</h3>
                    <div className="flex gap-8">
                        <div>
                            <span className="text-green-400 text-2xl font-bold">{profile?.wins || 0}</span>
                            <span className="text-gray-400 text-sm ml-2">Wins</span>
                        </div>
                        <div>
                            <span className="text-red-400 text-2xl font-bold">{profile?.losses || 0}</span>
                            <span className="text-gray-400 text-sm ml-2">Losses</span>
                        </div>
                        <div>
                            <span className="text-gray-300 text-2xl font-bold">{profile?.draws || 0}</span>
                            <span className="text-gray-400 text-sm ml-2">Draws</span>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="card">
                    <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
                    {transactions.length === 0 ? (
                        <p className="text-gray-500 text-sm">No transactions yet</p>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {transactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                                    <div>
                                        <div className="text-sm">{tx.description || tx.type.replace(/_/g, ' ')}</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(tx.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-400' : tx.amount < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
