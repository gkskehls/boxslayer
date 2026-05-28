import { create } from 'zustand';
import type { GameState, Player, Stats, Core } from '../types/game';
import { saveStateToLocalStorage } from './utils/localStorage';

interface GameActions {
  attackEnemy: () => void;
  attackPlayer: (damage: number) => void;
  levelUp: () => void;
  distributeStat: (stat: 'str' | 'dex' | 'con') => void;
  resetStats: () => void;
  spawnEnemy: () => void;
  resetGame: () => void;
  acquireCore: (core: Core) => void;
  equipCore: (coreId: string, slotIndex: number) => void;
  unequipCore: (slotIndex: number) => void;
  upgradeCore: (coreId: string) => void;
  calculateOfflineRewards: () => { gold: number; exp: number };
  retryCurrentFloor: () => void;
  spendGold: (amount: number) => void;
}

const initialStats: Stats = {
  str: 10, dex: 10, con: 10,
  attack: 20, defense: 5, maxHealth: 100,
  attackSpeed: 1.0, evasion: 0.05,
};

const initialPlayer: Player = {
  id: 'player', name: 'Slayer', level: 1, stats: initialStats,
  currentHealth: 100, experience: 0, nextLevelExperience: 100,
  statPoints: 0, gold: 0,
};

export const useGameStore = create<GameState & GameActions>((set) => ({
  player: initialPlayer,
  currentEnemy: null,
  stage: 1,
  isAutoBattle: true,
  gameStatus: 'IDLE',
  playerCores: [],
  equippedCores: [null, null, null],
  lastOnlineTime: Date.now(),

  spawnEnemy: () => set((state) => {
    const stageMultiplier = 1 + (state.stage - 1) * 0.1;
    const isBoss = state.stage % 5 === 0;
    const goldReward = Math.floor(10 * (1 + (state.stage - 1) * 0.2) * (isBoss ? 5 : 1));
    const expReward = Math.floor(20 * (1 + (state.stage - 1) * 0.15) * (isBoss ? 3 : 1));

    return {
      currentEnemy: {
        id: `enemy-${state.stage}`, name: isBoss ? `Boss ${state.stage}` : `Box ${state.stage}`,
        level: state.stage, type: isBoss ? 'BOSS' : 'NORMAL',
        stats: { str: 10, dex: 10, con: 10, attack: Math.floor(8 * stageMultiplier), defense: 3, maxHealth: 50, attackSpeed: 1, evasion: 0.05 },
        currentHealth: Math.floor(50 * stageMultiplier),
        goldReward, expReward,
      },
      gameStatus: 'BATTLE'
    };
  }),

  attackEnemy: () => set((state) => {
    if (!state.currentEnemy) return {};
    const damage = Math.max(1, state.player.stats.attack - state.currentEnemy.stats.defense);
    const newEnemyHealth = state.currentEnemy.currentHealth - damage;

    if (newEnemyHealth <= 0) {
      const expReward = state.currentEnemy.expReward;
      const goldReward = state.currentEnemy.goldReward;

      let newExp = state.player.experience + expReward;
      let newLevel = state.player.level;
      let nextLevelExp = state.player.nextLevelExperience;
      let newStatPoints = state.player.statPoints;

      if (newExp >= nextLevelExp) {
        newLevel += 1;
        newExp -= nextLevelExp;
        nextLevelExp = Math.floor(nextLevelExp * 1.2);
        newStatPoints += 3;
      }

      return {
        player: {
          ...state.player,
          experience: newExp,
          gold: state.player.gold + goldReward,
          level: newLevel,
          nextLevelExperience: nextLevelExp,
          statPoints: newStatPoints
        },
        currentEnemy: null,
        stage: state.stage + 1,
        gameStatus: 'VICTORY'
      };
    }
    return { currentEnemy: { ...state.currentEnemy, currentHealth: newEnemyHealth } };
  }),

  distributeStat: (stat) => set((state) => {
    if (state.player.statPoints <= 0) return {};
    const newStats = { ...state.player.stats };
    if (stat === 'str') { newStats.str += 1; newStats.attack += 2; }
    else if (stat === 'dex') { newStats.dex += 1; newStats.attackSpeed += 0.02; newStats.evasion += 0.01; }
    else if (stat === 'con') { newStats.con += 1; newStats.maxHealth += 20; }
    return { player: { ...state.player, stats: newStats, statPoints: state.player.statPoints - 1 } };
  }),

  resetStats: () => set((state) => ({
    player: { ...state.player, stats: initialStats, statPoints: (state.player.level - 1) * 3 }
  })),

  attackPlayer: (dmg) => set((state) => ({ player: { ...state.player, currentHealth: Math.max(0, state.player.currentHealth - dmg) } })),
  levelUp: () => set((state) => ({ player: { ...state.player, level: state.player.level + 1, statPoints: state.player.statPoints + 3 } })),
  resetGame: () => set({ player: initialPlayer, stage: 1, currentEnemy: null }),

  acquireCore: () => {}, equipCore: () => {}, unequipCore: () => {}, upgradeCore: () => {},
  calculateOfflineRewards: () => ({ gold: 0, exp: 0 }),
  retryCurrentFloor: () => {},
  spendGold: () => {},
}));

useGameStore.subscribe((state) => saveStateToLocalStorage(state));