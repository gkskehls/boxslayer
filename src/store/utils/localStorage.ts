import type { GameState } from '../../types/game';
import { SKILL_TREE_DATA } from '../../constants/skills';

const LOCAL_STORAGE_KEY = 'boxslayer-game-state';

export const loadStateFromLocalStorage = (): GameState | null => {
    try {
        const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (serializedState === null) {
            return null;
        }
        const parsedState = JSON.parse(serializedState);
        // Basic validation to ensure it's a GameState
        if (parsedState && parsedState.player && parsedState.player.stats) {
            // Ensure currentHealth doesn't exceed maxHealth if stats changed
            parsedState.player.currentHealth = Math.min(parsedState.player.currentHealth, parsedState.player.stats.maxHealth);
            // Initialize playerCores and equippedCore if they don't exist in loaded state
            parsedState.playerCores = parsedState.playerCores || [];
            parsedState.equippedCore = parsedState.equippedCore || null;
            // Initialize lastOnlineTime if it doesn't exist
            parsedState.lastOnlineTime = parsedState.lastOnlineTime || Date.now();

            // Initialize PVP state
            parsedState.playerName = parsedState.playerName || '박스슬레이어';
            parsedState.pvpSnapshot = parsedState.pvpSnapshot || null;
            parsedState.pvpRating = parsedState.pvpRating || 1000;
            parsedState.pvpWins = parsedState.pvpWins || 0;
            parsedState.pvpLosses = parsedState.pvpLosses || 0;
            parsedState.pvpBattleLogs = parsedState.pvpBattleLogs || [];

            // Sanitize unlockedSkills and refund RP for removed legacy skills
            if (Array.isArray(parsedState.unlockedSkills)) {
                let refundedRP = 0;
                const validUnlockedSkills: string[] = [];

                parsedState.unlockedSkills.forEach((skillId: string) => {
                    if (SKILL_TREE_DATA[skillId]) {
                        validUnlockedSkills.push(skillId);
                    } else {
                        // 레가시 노드가 제거되었으므로 어림잡아 RP 환불 (기본 1~10 RP)
                        refundedRP += 5;
                    }
                });

                if (!validUnlockedSkills.includes('core_origin')) {
                    validUnlockedSkills.unshift('core_origin');
                }

                parsedState.unlockedSkills = validUnlockedSkills;
                if (refundedRP > 0) {
                    parsedState.reincarnationPoints = (parsedState.reincarnationPoints || 0) + refundedRP;
                }
            } else {
                parsedState.unlockedSkills = ['core_origin'];
            }

            return parsedState as GameState;
        }
        return null;
    } catch (error) {
        console.error("Error loading state from localStorage:", error);
        return null;
    }
};

export const saveStateToLocalStorage = (state: GameState) => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
    } catch (error) {
        console.error("Error saving state to localStorage:", error);
    }
};