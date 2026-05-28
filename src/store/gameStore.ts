import { create } from 'zustand';
import type { GameState, Player, Enemy, Stats, Core } from '../types/game';
import { loadStateFromLocalStorage, saveStateToLocalStorage } from './utils/localStorage';

interface GameActions {
  attackEnemy: () => void;
  attackPlayer: (damage: number) => void;
  levelUp: () => void;
  distributeStat: (stat: keyof Stats) => void;
  spawnEnemy: () => void;
  resetGame: () => void;
  // Core Actions
  acquireCore: (core: Core) => void;
  equipCore: (coreId: string, slotIndex: number) => void;
  unequipCore: (slotIndex: number) => void;
  upgradeCore: (coreId: string) => void;
  // Offline Rewards
  calculateOfflineRewards: () => { gold: number; exp: number };
  // Retry on Defeat
  retryCurrentFloor: () => void;
  // Gold Actions (상점에서 사용하기 위해 추가)
  spendGold: (amount: number) => void;
}

const initialStats: Stats = {
  attack: 10,
  defense: 5,
  maxHealth: 100,
  attackSpeed: 1,
};

const initialPlayer: Player = {
  id: 'player',
  name: 'Slayer',
  level: 1,
  stats: initialStats,
  currentHealth: 100,
  experience: 0,
  nextLevelExperience: 100,
  statPoints: 0,
  gold: 0,
};

const getInitialStoreState = (): GameState => {
  const loadedState = loadStateFromLocalStorage();
  if (loadedState) {
    return {
      ...loadedState,
      gameStatus: 'IDLE',
      currentEnemy: null,
      playerCores: loadedState.playerCores || [],
      equippedCores: loadedState.equippedCores || [null, null, null],
      lastOnlineTime: loadedState.lastOnlineTime || Date.now(),
      player: {
        ...loadedState.player,
        gold: loadedState.player.gold || 0,
      }
    };
  }
  return {
    player: initialPlayer,
    currentEnemy: null,
    stage: 1,
    isAutoBattle: true,
    gameStatus: 'IDLE',
    playerCores: [],
    equippedCores: [null, null, null],
    lastOnlineTime: Date.now(),
  };
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...getInitialStoreState(),

  spawnEnemy: () => set((state) => {
    const stageMultiplier = 1 + (state.stage - 1) * 0.1;
    const isBoss = state.stage % 5 === 0;
    const enemy: Enemy = {
      id: `enemy-${state.stage}`,
      name: isBoss ? `Boss Box ${state.stage}` : `Box ${state.stage}`,
      level: state.stage,
      type: isBoss ? 'BOSS' : 'NORMAL',
      stats: {
        attack: Math.floor(8 * stageMultiplier * (isBoss ? 2 : 1)),
        defense: Math.floor(3 * stageMultiplier * (isBoss ? 1.5 : 1)),
        maxHealth: Math.floor(50 * stageMultiplier * (isBoss ? 5 : 1)),
        attackSpeed: 0.8 + (isBoss ? 0.2 : 0),
      },
      currentHealth: Math.floor(50 * stageMultiplier * (isBoss ? 5 : 1)),
      goldReward: state.stage * 10 * (isBoss ? 5 : 1),
      expReward: state.stage * 20 * (isBoss ? 3 : 1),
    };
    return { currentEnemy: enemy, gameStatus: 'BATTLE' };
  }),

  attackEnemy: () => set((state) => {
    if (!state.currentEnemy) return {};
    const damage = Math.max(1, state.player.stats.attack - state.currentEnemy.stats.defense);
    const newEnemyHealth = state.currentEnemy.currentHealth - damage;

    if (newEnemyHealth <= 0) {
      const newExp = state.player.experience + state.currentEnemy.expReward;
      const newPlayer = { ...state.player, experience: newExp, gold: state.player.gold + state.currentEnemy.goldReward };

      if (newPlayer.experience >= newPlayer.nextLevelExperience) {
        newPlayer.level += 1;
        newPlayer.experience -= newPlayer.nextLevelExperience;
        newPlayer.nextLevelExperience = Math.floor(newPlayer.nextLevelExperience * 1.5);
        newPlayer.statPoints += 3;
      }

      return {
        player: newPlayer,
        currentEnemy: null,
        stage: state.stage + 1,
        gameStatus: 'VICTORY',
      };
    }

    return {
      currentEnemy: { ...state.currentEnemy, currentHealth: newEnemyHealth }
    };
  }),

  attackPlayer: (damage: number) => set((state) => {
    const actualDamage = Math.max(1, damage - state.player.stats.defense);
    const newHealth = state.player.currentHealth - actualDamage;

    if (newHealth <= 0) {
      return {
        player: { ...state.player, currentHealth: 0 },
        gameStatus: 'DEFEAT'
      };
    }

    return {
      player: { ...state.player, currentHealth: newHealth }
    };
  }),

  distributeStat: (stat: keyof Stats) => set((state) => {
    if (state.player.statPoints <= 0) return {};
    const newStats = { ...state.player.stats };
    switch (stat) {
      case 'attack': newStats.attack += 1; break;
      case 'defense': newStats.defense += 1; break;
      case 'maxHealth': newStats.maxHealth += 10; break;
      case 'attackSpeed': newStats.attackSpeed += 0.05; break;
    }
    return {
      player: {
        ...state.player,
        stats: newStats,
        statPoints: state.player.statPoints - 1,
        currentHealth: stat === 'maxHealth' ? state.player.currentHealth + 10 : state.player.currentHealth
      }
    };
  }),

  levelUp: () => set((state) => ({
    player: { ...state.player, level: state.player.level + 1, statPoints: state.player.statPoints + 3 }
  })),

  resetGame: () => {
    set({
      player: initialPlayer,
      currentEnemy: null,
      stage: 1,
      gameStatus: 'IDLE',
      playerCores: [],
      equippedCores: [null, null, null],
      lastOnlineTime: Date.now(),
    });
    saveStateToLocalStorage(getInitialStoreState());
  },

  acquireCore: (core: Core) => set((state) => ({
    playerCores: [...state.playerCores, core],
  })),

  equipCore: (coreId: string, slotIndex: number) => set((state) => {
    const coreToEquip = state.playerCores.find((c: Core) => c.id === coreId);
    if (!coreToEquip || slotIndex < 0 || slotIndex >= state.equippedCores.length) return {};
    const newEquippedCores = [...state.equippedCores];
    const newPlayerCores = state.playerCores.filter((c: Core) => c.id !== coreId);
    if (newEquippedCores[slotIndex]) newPlayerCores.push(newEquippedCores[slotIndex] as Core);
    newEquippedCores[slotIndex] = coreToEquip;
    return { playerCores: newPlayerCores, equippedCores: newEquippedCores };
  }),

  unequipCore: (slotIndex: number) => set((state) => {
    if (slotIndex < 0 || slotIndex >= state.equippedCores.length || !state.equippedCores[slotIndex]) return {};
    const coreToUnequip = state.equippedCores[slotIndex] as Core;
    const newEquippedCores = [...state.equippedCores];
    newEquippedCores[slotIndex] = null;
    return { playerCores: [...state.playerCores, coreToUnequip], equippedCores: newEquippedCores };
  }),

  upgradeCore: (coreId: string) => set((state) => {
    const coreIndex = state.playerCores.findIndex((c: Core) => c.id === coreId);
    const equippedCoreIndex = state.equippedCores.findIndex((c: Core | null) => c && c.id === coreId);
    if (coreIndex === -1 && equippedCoreIndex === -1) return {};
    const targetCore = coreIndex !== -1 ? state.playerCores[coreIndex] : state.equippedCores[equippedCoreIndex] as Core;
    const upgradedCore = {
      ...targetCore,
      level: targetCore.level + 1,
      effects: { ...targetCore.effects, fireDamage: (targetCore.effects.fireDamage || 0) + 10 },
      upgradeCost: Math.floor(targetCore.upgradeCost * 1.5),
    };
    const newPlayerCores = [...state.playerCores];
    const newEquippedCores = [...state.equippedCores];
    if (coreIndex !== -1) newPlayerCores[coreIndex] = upgradedCore;
    else newEquippedCores[equippedCoreIndex] = upgradedCore;
    return { playerCores: newPlayerCores, equippedCores: newEquippedCores };
  }),

  calculateOfflineRewards: () => {
    const state = get();
    const now = Date.now();
    const offlineDurationSeconds = Math.floor((now - state.lastOnlineTime) / 1000);
    if (offlineDurationSeconds <= 0) return { gold: 0, exp: 0 };
    const earnedGold = offlineDurationSeconds * 1;
    const earnedExp = offlineDurationSeconds * 0.5;
    set((s) => ({
      player: { ...s.player, gold: s.player.gold + earnedGold, experience: s.player.experience + earnedExp },
      lastOnlineTime: now,
    }));
    return { gold: earnedGold, exp: earnedExp };
  },

  retryCurrentFloor: () => set((state) => ({
    player: { ...state.player, currentHealth: state.player.stats.maxHealth },
    currentEnemy: null,
    stage: Math.floor((state.stage - 1) / 10) * 10 + 1,
    gameStatus: 'IDLE',
  })),

  // [추가된 기능] 상점에서 골드 사용
  spendGold: (amount: number) => set((state) => ({
    player: { ...state.player, gold: Math.max(0, state.player.gold - amount) }
  })),
}));

useGameStore.subscribe((state) => saveStateToLocalStorage(state));