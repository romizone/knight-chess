// Sound Manager using Howler.js

import { Howl, Howler } from 'howler';
import { Move } from '@/types';
import { SOUNDS } from '../chess/constants';

type SoundName = keyof typeof SOUNDS;

class SoundManager {
    private sounds: Map<string, Howl> = new Map();
    private enabled: boolean = true;
    private volume: number = 0.7;
    private initialized: boolean = false;

    /**
     * Initialize all sounds
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        for (const [key, path] of Object.entries(SOUNDS)) {
            try {
                this.sounds.set(key, new Howl({
                    src: [path],
                    preload: true,
                    volume: this.volume,
                    html5: true, // Better for mobile
                }));
            } catch (error) {
                console.warn(`Failed to load sound: ${key}`, error);
            }
        }

        this.initialized = true;
    }

    /**
     * Play a sound by name
     */
    play(sound: SoundName): void {
        if (!this.enabled) return;

        const howl = this.sounds.get(sound);
        if (howl) {
            howl.play();
        }
    }

    /**
     * Play appropriate sound for a move
     */
    playMoveSound(move: Move): void {
        if (!this.enabled) return;

        if (move.isCheckmate) {
            this.play('checkmate');
        } else if (move.isCheck) {
            this.play('check');
        } else if (move.isCastling) {
            this.play('castle');
        } else if (move.promotion) {
            this.play('promote');
        } else if (move.captured) {
            this.play('capture');
        } else {
            this.play('move');
        }
    }

    /**
     * Play game start sound
     */
    playGameStart(): void {
        this.play('gameStart');
    }

    /**
     * Play game end sound
     */
    playGameEnd(): void {
        this.play('gameEnd');
    }

    /**
     * Play low time warning
     */
    playLowTime(): void {
        this.play('lowTime');
    }

    /**
     * Play illegal move sound
     */
    playIllegal(): void {
        this.play('illegal');
    }

    /**
     * Play notification sound
     */
    playNotify(): void {
        this.play('notify');
    }

    /**
     * Play draw sound
     */
    playDraw(): void {
        this.play('draw');
    }

    /**
     * Play click sound
     */
    playClick(): void {
        this.play('click');
    }

    /**
     * Enable/disable sounds
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            Howler.mute(true);
        } else {
            Howler.mute(false);
        }
    }

    /**
     * Get enabled state
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Set global volume
     */
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        Howler.volume(this.volume);
    }

    /**
     * Get current volume
     */
    getVolume(): number {
        return this.volume;
    }

    /**
     * Stop all sounds
     */
    stopAll(): void {
        Howler.stop();
    }
}

// Export singleton instance
export const soundManager = new SoundManager();

// React hook for sound manager
import { useEffect, useState, useCallback } from 'react';

export function useSound() {
    const [enabled, setEnabled] = useState(true);
    const [volume, setVolume] = useState(0.7);

    useEffect(() => {
        soundManager.initialize();
    }, []);

    const toggleSound = useCallback(() => {
        const newState = !enabled;
        setEnabled(newState);
        soundManager.setEnabled(newState);
    }, [enabled]);

    const updateVolume = useCallback((newVolume: number) => {
        setVolume(newVolume);
        soundManager.setVolume(newVolume);
    }, []);

    return {
        enabled,
        volume,
        toggleSound,
        setVolume: updateVolume,
        playMove: (move: Move) => soundManager.playMoveSound(move),
        playGameStart: () => soundManager.playGameStart(),
        playGameEnd: () => soundManager.playGameEnd(),
        playLowTime: () => soundManager.playLowTime(),
        playIllegal: () => soundManager.playIllegal(),
        playClick: () => soundManager.playClick(),
    };
}
