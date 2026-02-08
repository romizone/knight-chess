// Sound Settings Store

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SoundStore {
    soundEnabled: boolean;
    volume: number;
    setEnabled: (enabled: boolean) => void;
    setVolume: (volume: number) => void;
    toggleSound: () => void;
}

export const useSoundStore = create<SoundStore>()(
    persist(
        (set, get) => ({
            soundEnabled: true,
            volume: 0.7,

            setEnabled: (enabled: boolean) => set({ soundEnabled: enabled }),

            setVolume: (volume: number) => set({ volume: Math.max(0, Math.min(1, volume)) }),

            toggleSound: () => set({ soundEnabled: !get().soundEnabled }),
        }),
        {
            name: 'knight-chess-sound',
        }
    )
);
