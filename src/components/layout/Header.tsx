'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

interface SessionUser {
    tokenBalance?: number;
    name?: string | null;
    email?: string | null;
    image?: string | null;
}

export default function Header() {
    const { data: session } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="bg-surface border-b border-gray-700 px-4 py-3">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl">&#9822;</span>
                    <span className="text-lg font-bold">
                        Knight <span className="text-primary">Chess</span>
                    </span>
                </Link>

                {session ? (
                    <div className="flex items-center gap-4">
                        {/* Token Badge */}
                        <div className="token-badge">
                            <span>&#129689;</span>
                            <span>{(session.user as SessionUser)?.tokenBalance?.toLocaleString() ?? '---'}</span>
                        </div>

                        {/* Nav Links */}
                        <nav className="hidden md:flex items-center gap-4 text-sm text-gray-400">
                            <Link href="/play" className="hover:text-primary transition-colors">Play</Link>
                            <Link href="/leaderboard" className="hover:text-primary transition-colors">Leaderboard</Link>
                            <Link href="/profile" className="hover:text-primary transition-colors">Profile</Link>
                            <Link href="/settings" className="hover:text-primary transition-colors">Settings</Link>
                        </nav>

                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm overflow-hidden"
                            >
                                {session.user?.image ? (
                                    <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    session.user?.name?.charAt(0)?.toUpperCase() || '?'
                                )}
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 top-10 bg-surface border border-gray-700 rounded-lg shadow-xl py-2 w-48 z-50">
                                    <div className="px-4 py-2 border-b border-gray-700">
                                        <div className="font-semibold text-sm truncate">{session.user?.name}</div>
                                        <div className="text-xs text-gray-400 truncate">{session.user?.email}</div>
                                    </div>
                                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 md:hidden" onClick={() => setMenuOpen(false)}>
                                        Profile
                                    </Link>
                                    <Link href="/settings" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 md:hidden" onClick={() => setMenuOpen(false)}>
                                        Settings
                                    </Link>
                                    <button
                                        onClick={() => signOut({ callbackUrl: '/' })}
                                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <Link href="/login" className="btn btn-primary text-sm px-4 py-2">
                        Sign In
                    </Link>
                )}
            </div>
        </header>
    );
}
