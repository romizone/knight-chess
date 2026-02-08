'use client';

import { useEffect, useState, useCallback } from 'react';
import { COLORS } from '@/lib/chess/constants';

interface TimerProps {
    initialTime: number; // in seconds
    increment: number; // seconds to add after move
    isActive: boolean;
    onTimeout: () => void;
    onTimeUpdate?: (time: number) => void;
}

export default function Timer({
    initialTime,
    increment: _increment,
    isActive,
    onTimeout,
    onTimeUpdate,
}: TimerProps) {
    // _increment is accepted as a prop but managed externally
    void _increment;
    const [timeRemaining, setTimeRemaining] = useState(initialTime);

    // Reset timer when initialTime changes
    useEffect(() => {
        setTimeRemaining(initialTime);
    }, [initialTime]);

    // Timer countdown
    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                const newTime = prev - 1;
                if (newTime <= 0) {
                    clearInterval(interval);
                    onTimeout();
                    return 0;
                }
                onTimeUpdate?.(newTime);
                return newTime;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive, onTimeout, onTimeUpdate]);

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Determine timer color based on time remaining
    const getTimerClass = (): { bg: string; text: string } => {
        if (timeRemaining <= 10) {
            return { bg: 'rgba(229, 57, 53, 0.2)', text: COLORS.timer.critical };
        }
        if (timeRemaining <= 30) {
            return { bg: 'rgba(251, 140, 0, 0.2)', text: COLORS.timer.warning };
        }
        return { bg: 'rgba(129, 182, 76, 0.2)', text: COLORS.timer.normal };
    };

    const timerStyle = getTimerClass();

    return (
        <div
            className={`timer font-mono text-2xl md:text-3xl font-bold px-4 py-2 rounded-lg text-center min-w-[100px] transition-all ${isActive ? 'ring-2 ring-offset-2 ring-offset-gray-900' : ''
                } ${timeRemaining <= 10 && isActive ? 'animate-pulse' : ''}`}
            style={{
                backgroundColor: timerStyle.bg,
                color: timerStyle.text,
                boxShadow: isActive ? `0 0 20px ${timerStyle.text}40` : 'none',
            }}
        >
            {formatTime(timeRemaining)}
        </div>
    );
}

// Export a hook for managing timers
export function useGameTimer(
    baseTime: number,
    increment: number
) {
    const [whiteTime, setWhiteTime] = useState(baseTime);
    const [blackTime, setBlackTime] = useState(baseTime);
    const [activeTimer, setActiveTimer] = useState<'white' | 'black' | null>(null);

    const startTimer = useCallback((color: 'white' | 'black') => {
        setActiveTimer(color);
    }, []);

    const stopTimer = useCallback(() => {
        setActiveTimer(null);
    }, []);

    const switchTimer = useCallback((from: 'white' | 'black') => {
        // Add increment to the player who just moved
        if (from === 'white') {
            setWhiteTime(prev => prev + increment);
            setActiveTimer('black');
        } else {
            setBlackTime(prev => prev + increment);
            setActiveTimer('white');
        }
    }, [increment]);

    const resetTimers = useCallback(() => {
        setWhiteTime(baseTime);
        setBlackTime(baseTime);
        setActiveTimer(null);
    }, [baseTime]);

    return {
        whiteTime,
        blackTime,
        activeTimer,
        startTimer,
        stopTimer,
        switchTimer,
        resetTimers,
        setWhiteTime,
        setBlackTime,
    };
}
