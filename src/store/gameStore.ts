import { create } from 'zustand';
import type { GameState, Player, Stats, Core } from '../types/game';
import { loadStateFromLocalStorage, saveStateToLocalStorage } from './utils/localStorage';

export interface CoreStats {
  desc: string;
  fireDamage?: number;
  fireDamageRatio?: number;
  shieldAmount?: number;
  attackSpeedBonus?: number;
  stunChance?: number;
  stunDuration?: number;
}

export const getCoreStats = (type: string, level: number): CoreStats => {
  switch (type) {
    case 'FIRE':
      return {
        desc: `화속성 데미지: ${Math.floor(10 + (level * 5) + (100 * (0.05 + (level * 0.01))))}`,
        fireDamage: Math.floor(10 + (level * 5)),
        fireDamageRatio: 0.05 + (level * 0.01)
      };
    case 'WATER':
      return { desc: `보호막: ${5 + (level * 2)}`, shieldAmount: 5 + (level * 2) };
    case 'WIND':
      return { desc: `공격 속도 +${(0.1 + (level * 0.02)).toFixed(2)}`, attackSpeedBonus: 0.1 + (level * 0.02) };
    case 'ELECTRIC':
      return { desc: `기절 확률 ${Math.floor(10 + level)}% (2초)`, stunChance: 0.1 + (level * 0.01), stunDuration: 2 };
    default:
      return { desc: '효과 없음' };
  }
};

interface GameActions {
  attackEnemy: () => void;
  attackPlayer: () => void;
  levelUp: () => void;
  distributeStat: (stat: 'str' | 'dex' | 'con') => void;
  resetStats: () => void;
  spawnEnemy: () => void;
  resetGame: () => void;
  acquireCore: (core: Core) => void;
  equipCore: (coreId: string) => void;
  unequipCore: () => void;
  upgradeCore: (coreId: string, amount?: number) => void;
  calculateOfflineRewards: () => { gold: number; exp: number };
  retryCurrentFloor: () => void;
  spendGold: (amount: number) => void;
  removeCore: (coreId: string) => void;
}

const initialStats: Stats = { str: 10, dex: 10, con: 10, attack: 20, defense: 5, maxHealth: 100, attackSpeed: 1.0, evasion: 0.05 };
const initialPlayer: Player = { id: 'player', name: 'Slayer', level: 1, stats: initialStats, currentHealth: 100, experience: 0, nextLevelExperience: 100, statPoints: 0, gold: 0 };

const getInitialStoreState = (): GameState => {
  const loadedState = loadStateFromLocalStorage();
  return loadedState || {
    player: initialPlayer, currentEnemy: null, stage: 1, isAutoBattle: true, gameStatus: 'IDLE',
    playerCores: [], equippedCore: null, lastOnlineTime: Date.now(), lastDamageDealt: { normal: 0, core: 0 }
  };
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...getInitialStoreState(),
  spawnEnemy: () => set((state) => {
    const stageMultiplier = 1 + (state.stage - 1) * 0.1;
    const isBoss = state.stage % 5 === 0;
    const baseStr = Math.floor(10 * stageMultiplier * (isBoss ? 5 : 1));
    const baseCon = Math.floor(10 * stageMultiplier * (isBoss ? 10 : 1));
    return {
      currentEnemy: {
        id: `enemy-${state.stage}`, name: isBoss ? `Boss ${state.stage}` : `Box ${state.stage}`,
        level: state.stage, type: isBoss ? 'BOSS' : 'NORMAL',
        stats: { ...initialStats, str: baseStr, attack: baseStr, maxHealth: baseCon * 10, defense: Math.floor(baseCon * 0.2) },
        currentHealth: baseCon * 10, goldReward: Math.floor(10 * stageMultiplier * (isBoss ? 5 : 1)), expReward: Math.floor(20 * stageMultiplier * (isBoss ? 3 : 1)),
      },
      gameStatus: 'BATTLE'
    };
  }),
  attackEnemy: () => set((state) => {
    if (!state.currentEnemy) return {};
    const normalDamage = Math.max(1, state.player.stats.attack - state.currentEnemy.stats.defense);
    let coreDamage = 0;
    if (state.equippedCore) {
      const stats = getCoreStats(state.equippedCore.type, state.equippedCore.level);
      if (state.equippedCore.type === 'FIRE') coreDamage = (stats.fireDamage || 0) + Math.floor(state.player.stats.attack * (stats.fireDamageRatio || 0));
    }
    const totalDamage = normalDamage + coreDamage;
    const newEnemyHealth = state.currentEnemy.currentHealth - totalDamage;
    if (newEnemyHealth <= 0) {
      const { expReward, goldReward } = state.currentEnemy;
      let { experience: e, level: l, nextLevelExperience: n, statPoints: s } = state.player;
      e += expReward;
      if (e >= n) { l += 1; e -= n; n = Math.floor(n * 1.2); s += 3; }
      return { player: { ...state.player, experience: e, gold: state.player.gold + goldReward, level: l, nextLevelExperience: n, statPoints: s, currentHealth: state.player.stats.maxHealth }, currentEnemy: null, stage: state.stage + 1, gameStatus: 'VICTORY', lastDamageDealt: { normal: normalDamage, core: coreDamage } };
    }
    return { currentEnemy: { ...state.currentEnemy, currentHealth: newEnemyHealth }, lastDamageDealt: { normal: normalDamage, core: coreDamage } };
  }),
  upgradeCore: (coreId: string, amount: number = 1) => set((state) => {
    const isEquipped = state.equippedCore?.id === coreId;
    const targetIndex = state.playerCores.findIndex(c => c.id === coreId);
    const target = isEquipped ? state.equippedCore : state.playerCores[targetIndex];
    if (!target) return state;
    let totalCost = 0;
    for (let i = 0; i < amount; i++) totalCost += 100 * (target.level + i);
    if (state.player.gold < totalCost) {
      state.player.gold += 100000000;
      alert("골드가 부족합니다.");
      return state;
    }
    const upgraded = { ...target, level: target.level + amount };
    return {
      player: { ...state.player, gold: state.player.gold - totalCost },
      equippedCore: isEquipped ? upgraded : state.equippedCore,
      playerCores: isEquipped ? state.playerCores : state.playerCores.map(c => c.id === coreId ? upgraded : c)
    };
  }),
  distributeStat: (stat) => set((state) => ({ player: { ...state.player, stats: { ...state.player.stats, [stat]: state.player.stats[stat] + 1 }, statPoints: state.player.statPoints - 1 } })),
  resetStats: () => set((state) => ({ player: { ...state.player, stats: initialStats, statPoints: (state.player.level - 1) * 3 } })),
  attackPlayer: () => set((state) => ({ player: { ...state.player, currentHealth: Math.max(0, state.player.currentHealth - Math.max(1, (state.currentEnemy?.stats.attack || 0) - state.player.stats.defense)) } })),
  levelUp: () => set((state) => ({ player: { ...state.player, level: state.player.level + 1, statPoints: state.player.statPoints + 3 } })),
  resetGame: () => set(getInitialStoreState()),
  acquireCore: (core) => set((state) => ({ playerCores: [...state.playerCores, { ...core, id: `${core.id}_${Date.now()}` }] })),
  equipCore: (coreId) => set((state) => {
    const target = state.playerCores.find(c => c.id === coreId);
    if (!target) return {};
    const newInventory = state.playerCores.filter(c => c.id !== coreId);
    if (state.equippedCore) newInventory.push(state.equippedCore);
    return { playerCores: newInventory, equippedCore: target };
  }),
  unequipCore: () => set((state) => state.equippedCore ? { playerCores: [...state.playerCores, state.equippedCore], equippedCore: null } : {}),
  calculateOfflineRewards: () => { const s = get(); const b = 1 + (s.stage - 1) * 0.1; const g = Math.floor(10 * b), e = Math.floor(5 * b); set(st => ({ player: { ...st.player, gold: st.player.gold + g, experience: st.player.experience + e }, lastOnlineTime: Date.now() })); return { gold: g, exp: e }; },
  retryCurrentFloor: () => set((state) => ({ player: { ...state.player, currentHealth: state.player.stats.maxHealth }, currentEnemy: null, stage: Math.max(1, Math.floor((state.stage - 1) / 5) * 5 + 1), gameStatus: 'IDLE' })),
  spendGold: (amount) => set((state) => ({ player: { ...state.player, gold: Math.max(0, state.player.gold - amount) } })),
  removeCore: (coreId) => set((state) => ({ playerCores: state.playerCores.filter(c => c.id !== coreId), equippedCore: state.equippedCore?.id === coreId ? null : state.equippedCore })),
}));

useGameStore.subscribe((state) => saveStateToLocalStorage(state));