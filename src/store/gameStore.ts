// src/store/gameStore.ts

import { create } from 'zustand';
import type { GameState, Player, Stats, Core } from '../types/game';
import { loadStateFromLocalStorage, saveStateToLocalStorage } from './utils/localStorage';

interface GameActions {
  attackEnemy: () => void;
  attackPlayer: () => void;
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

const initialStats: Stats = { str: 10, dex: 10, con: 10, attack: 20, defense: 5, maxHealth: 100, attackSpeed: 1.0, evasion: 0.05 };
const initialPlayer: Player = { id: 'player', name: 'Slayer', level: 1, stats: initialStats, currentHealth: 100, experience: 0, nextLevelExperience: 100, statPoints: 0, gold: 0 };

const getInitialStoreState = (): GameState => {
  const loadedState = loadStateFromLocalStorage();
  return loadedState || { player: initialPlayer, currentEnemy: null, stage: 1, isAutoBattle: true, gameStatus: 'IDLE', playerCores: [], equippedCores: [null, null, null], lastOnlineTime: Date.now() };
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...getInitialStoreState(),

  spawnEnemy: () => set((state) => {
    const stageMultiplier = 1 + (state.stage - 1) * 0.1;
    const isBoss = state.stage % 5 === 0;
    const goldReward = Math.floor(10 * (1 + (state.stage - 1) * 0.2) * (isBoss ? 5 : 1));
    const expReward = Math.floor(20 * (1 + (state.stage - 1) * 0.15) * (isBoss ? 3 : 1));
    return {
      currentEnemy: {
        id: `enemy-${state.stage}`, name: isBoss ? `Boss ${state.stage}` : `Box ${state.stage}`,
        level: state.stage, type: isBoss ? 'BOSS' : 'NORMAL',
        stats: {
          str: 10, dex: 10, con: 10,
          attack: Math.floor(20 * stageMultiplier),
          defense: Math.floor(5 * stageMultiplier),
          // [수정됨] 최대 체력에도 보스일 경우 5배 곱해주기 적용!
          maxHealth: Math.floor(100 * stageMultiplier * (isBoss ? 5 : 1)),
          attackSpeed: 1.0, evasion: 0.05
        },
        currentHealth: Math.floor(100 * stageMultiplier * (isBoss ? 5 : 1)),
        goldReward, expReward,
      },
      gameStatus: 'BATTLE'
    };
  }),

  attackEnemy: () => set((state) => {
    if (!state.currentEnemy) return {};
    const damage = Math.max(1, state.player.stats.attack - state.currentEnemy.stats.defense);
    const newEnemyHealth = state.currentEnemy.currentHealth - damage;

    // 적 처치 시 (다음 층으로 넘어갈 때)
    if (newEnemyHealth <= 0) {
      const { expReward, goldReward } = state.currentEnemy;
      let { experience: e, level: l, nextLevelExperience: n, statPoints: s } = state.player;
      e += expReward;
      if (e >= n) { l += 1; e -= n; n = Math.floor(n * 1.2); s += 3; }

      return {
        player: {
          ...state.player,
          experience: e,
          gold: state.player.gold + goldReward,
          level: l,
          nextLevelExperience: n,
          statPoints: s,
          currentHealth: state.player.stats.maxHealth // [수정됨] 다음 층으로 갈 때 체력 100% 회복
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

  resetStats: () => set((state) => ({ player: { ...state.player, stats: initialStats, statPoints: (state.player.level - 1) * 3 } })),

  attackPlayer: () => set((state) => {
    if (!state.currentEnemy) return {};
    const enemyDamage = state.currentEnemy.stats.attack;
    const rawDamage = Math.max(1, enemyDamage - state.player.stats.defense);
    const newHealth = Math.max(0, state.player.currentHealth - rawDamage);

    if (newHealth <= 0) {
      return {
        player: { ...state.player, currentHealth: 0 },
        currentEnemy: null,
        // ▼ 이 곳에 있던 stage 깎는 공식을 지웠습니다! (retryCurrentFloor에서만 깎도록)
        gameStatus: 'DEFEAT'
      };
    }
    return { player: { ...state.player, currentHealth: newHealth } };
  }),

  levelUp: () => set((state) => ({ player: { ...state.player, level: state.player.level + 1, statPoints: state.player.statPoints + 3 } })),
  resetGame: () => set(getInitialStoreState()),
  acquireCore: (core) => set((state) => ({ playerCores: [...state.playerCores, core] })),

  equipCore: (coreId, slotIndex) => set((state) => {
    const c = state.playerCores.find((i) => i.id === coreId);
    if (!c) return {};
    const e = [...state.equippedCores];
    e[slotIndex] = c;
    return { playerCores: state.playerCores.filter((i) => i.id !== coreId), equippedCores: e };
  }),

  unequipCore: (slotIndex) => set((state) => {
    const c = state.equippedCores[slotIndex];
    if (!c) return {};
    const e = [...state.equippedCores];
    e[slotIndex] = null;
    return { playerCores: [...state.playerCores, c], equippedCores: e };
  }),

  upgradeCore: (coreId) => set((state) => {
    const cIdx = state.playerCores.findIndex((c) => c.id === coreId);
    const eIdx = state.equippedCores.findIndex((c) => c && c.id === coreId);
    if (cIdx === -1 && eIdx === -1) return {};
    const target = cIdx !== -1 ? state.playerCores[cIdx] : state.equippedCores[eIdx] as Core;
    if (state.player.gold < target.upgradeCost) return {};
    const up: Core = { ...target, level: target.level + 1, upgradeCost: Math.floor(target.upgradeCost * 1.5), effects: { ...target.effects, fireDamage: (target.effects.fireDamage || 0) + 5, shieldAmount: (target.effects.shieldAmount || 0) + 10, attackSpeedBonus: (target.effects.attackSpeedBonus || 0) + 0.01, stunChance: Math.min(0.5, (target.effects.stunChance || 0) + 0.02) } };
    const pC = [...state.playerCores], eC = [...state.equippedCores];
    if (cIdx !== -1) pC[cIdx] = up; else eC[eIdx] = up;
    return { player: { ...state.player, gold: state.player.gold - target.upgradeCost }, playerCores: pC, equippedCores: eC };
  }),

  calculateOfflineRewards: () => {
    const state = get();
    const duration = (Date.now() - state.lastOnlineTime) / 1000;
    const bonus = 1 + (state.stage - 1) * 0.1;
    const gold = Math.floor(duration * 1 * bonus), exp = Math.floor(duration * 0.5 * bonus);
    set((s) => ({ player: { ...s.player, gold: s.player.gold + gold, experience: s.player.experience + exp }, lastOnlineTime: Date.now() }));
    return { gold, exp };
  },

  retryCurrentFloor: () => set((state) => ({
    player: { ...state.player, currentHealth: state.player.stats.maxHealth },
    currentEnemy: null,
    stage: Math.max(1, Math.floor((state.stage - 2) / 10) * 10 + 1),
    gameStatus: 'IDLE'
  })),

  spendGold: (amount) => set((state) => ({ player: { ...state.player, gold: Math.max(0, state.player.gold - amount) } })),
}));

useGameStore.subscribe((state) => saveStateToLocalStorage(state));