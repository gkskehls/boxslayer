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
  equipCore: (coreId: string) => void;
  unequipCore: () => void;
  upgradeCore: (coreId: string) => void;
  calculateOfflineRewards: () => { gold: number; exp: number };
  retryCurrentFloor: () => void;
  spendGold: (amount: number) => void;
}

const initialStats: Stats = { str: 10, dex: 10, con: 10, attack: 20, defense: 5, maxHealth: 100, attackSpeed: 1.0, evasion: 0.05 };
const initialPlayer: Player = { id: 'player', name: 'Slayer', level: 1, stats: initialStats, currentHealth: 100, experience: 0, nextLevelExperience: 100, statPoints: 0, gold: 0 };
// Core 능력치 계산 함수
const getCoreStats = (type: string, level: number) => {
  switch (type) {
    case 'FIRE':
      return {
        fireDamage: 10 + (level * 5),
        fireDamageRatio: 0.05 + (level * 0.01)
      };
    case 'WATER':
      return { shieldAmount: 5 + (level * 2) };
    case 'WIND':
      return { attackSpeedBonus: 0.1 + (level * 0.02) };
    case 'ELECTRIC':
      return { stunChance: 0.1 + (level * 0.01), stunDuration: 2 };
    default:
      return {};
  }
};
const getInitialStoreState = (): GameState => {
  const loadedState = loadStateFromLocalStorage();
  return loadedState || {
    player: initialPlayer,
    currentEnemy: null,
    stage: 1,
    isAutoBattle: true,
    gameStatus: 'IDLE',
    playerCores: [],
    equippedCore: null,
    lastOnlineTime: Date.now(),
    lastDamageDealt: { normal: 0, core: 0 }
  };
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...getInitialStoreState(),

  spawnEnemy: () => set((state) => {
    const stageMultiplier = 1 + (state.stage - 1) * 0.1;
    const isBoss = state.stage % 5 === 0;

    // 1. 공민체 기본 스탯 결정
    const baseStr = Math.floor(10 * stageMultiplier * (isBoss ? 5 : 1));
    const baseDex = Math.floor(10 * stageMultiplier * (isBoss ? 2 : 1));
    const baseCon = Math.floor(10 * stageMultiplier * (isBoss ? 10 : 1)); // 보스는 체력 특화

    // 2. 파생 능력치 계산 (기획 문서 16.1, 16.2 기반)
    const maxHealth = baseCon * 10; // 체(VIT) * 10 (기획 문서 9.2 초기 가이드라인 활용)
    const defense = Math.floor(baseCon * 0.2); // 방어력 = 체(VIT) * 0.2
    const attack = baseStr; // 공격력 = 힘(STR)

    return {
      currentEnemy: {
        id: `enemy-${state.stage}`,
        name: isBoss ? `Boss ${state.stage}` : `Box ${state.stage}`,
        level: state.stage,
        type: isBoss ? 'BOSS' : 'NORMAL',
        stats: {
          str: baseStr,
          dex: baseDex,
          con: baseCon,
          attack: attack,
          defense: defense,
          maxHealth: maxHealth,
          attackSpeed: 1.0,
          evasion: 0.05
        },
        currentHealth: maxHealth, // 체력 파생
        goldReward: Math.floor(10 * stageMultiplier * (isBoss ? 5 : 1)),
        expReward: Math.floor(20 * stageMultiplier * (isBoss ? 3 : 1)),
      },
      gameStatus: 'BATTLE'
    };
  }),

  attackEnemy: () => set((state) => {
    if (!state.currentEnemy) return {};

    // 1. 일반 데미지 (기존과 동일)
    const normalDamage = Math.max(1, state.player.stats.attack - state.currentEnemy.stats.defense);

    // 2. 불 코어 데미지 로직 개선
    let coreDamage = 0;
    if (state.equippedCore) {
      // 실시간 계산!
      const stats = getCoreStats(state.equippedCore.type, state.equippedCore.level);

      if (state.equippedCore.type === 'FIRE') {
        coreDamage = (stats.fireDamage || 0) + (state.player.stats.attack * (stats.fireDamageRatio || 0));
      }
    }

    const totalDamage = normalDamage + coreDamage;
    const newEnemyHealth = state.currentEnemy.currentHealth - totalDamage;

    // 2. 적 처치 시 승리 로직 (기존 로직 포함)
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
          currentHealth: state.player.stats.maxHealth
        },
        currentEnemy: null,
        stage: state.stage + 1,
        gameStatus: 'VICTORY',
        lastDamageDealt: { normal: normalDamage, core: coreDamage }
      };
    }

    // 3. 전투 중일 때 상태 업데이트
    return {
      currentEnemy: { ...state.currentEnemy, currentHealth: newEnemyHealth },
      lastDamageDealt: { normal: normalDamage, core: coreDamage }
    };
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
    const rawDamage = Math.max(1, state.currentEnemy.stats.attack - state.player.stats.defense);
    const newHealth = Math.max(0, state.player.currentHealth - rawDamage);
    if (newHealth <= 0) return { player: { ...state.player, currentHealth: 0 }, currentEnemy: null, gameStatus: 'DEFEAT' };
    return { player: { ...state.player, currentHealth: newHealth } };
  }),

  levelUp: () => set((state) => ({ player: { ...state.player, level: state.player.level + 1, statPoints: state.player.statPoints + 3 } })),
  resetGame: () => set(getInitialStoreState()),
  acquireCore: (core) => set((state) => ({
    playerCores: [
      ...state.playerCores,
      { ...core, id: `${core.id}_${Date.now()}` } // 항상 유니크한 ID 생성
    ]
  })),

  equipCore: (coreId) => set((state) => {
    // 1. 인벤토리에서 대상 코어 찾기
    const targetCore = state.playerCores.find((c) => c.id === coreId);
    if (!targetCore) return {};

    // 2. 현재 장착된 코어를 해제하고 인벤토리로 이동 (강화 상태 유지)
    const previousCore = state.equippedCore;

    // 3. 인벤토리 리스트 재구성 (대상 코어 제거 + 기존 장착 코어 추가)
    const newInventory = state.playerCores.filter((c) => c.id !== coreId);
    if (previousCore) {
      newInventory.push(previousCore);
    }

    return {
      playerCores: newInventory,
      equippedCore: targetCore // 강화된 객체 그대로 장착
    };
  }),

  unequipCore: () => set((state) => {
    if (!state.equippedCore) return {};
    // 장착 중인 코어를 인벤토리로 이동
    return {
      playerCores: [...state.playerCores, state.equippedCore],
      equippedCore: null
    };
  }),

  upgradeCore: (coreId) => set((state) => {
    const isEquipped = state.equippedCore?.id === coreId;
    const targetIndex = state.playerCores.findIndex(c => c.id === coreId);
    const target = isEquipped ? state.equippedCore : state.playerCores[targetIndex];

    if (!target) return state;

    // 1. 강화 비용 계산 (getUpgradeCost와 동일한 로직)
    const cost = 100 * target.level;

    // 2. [가장 중요] 골드 부족 시 예외 처리 (여기서 걸러져서 -가 안 됩니다)
    if (state.player.gold < cost) {
      console.warn("골드가 부족합니다.");
      state.player.gold = 100000000;
      return state; // 상태 변경 없이 종료
    }

    // 3. 레벨업 처리
    const upgraded = { ...target, level: target.level + 1 };

    return {
      player: { ...state.player, gold: state.player.gold - cost },
      equippedCore: isEquipped ? upgraded : state.equippedCore,
      playerCores: isEquipped
          ? state.playerCores
          : state.playerCores.map(c => c.id === coreId ? upgraded : c)
    };
  }),

  calculateOfflineRewards: () => {
    const state = get();
    const duration = (Date.now() - state.lastOnlineTime) / 1000;
    const bonus = 1 + (state.stage - 1) * 0.1;
    const gold = Math.floor(duration * 1 * bonus), exp = Math.floor(duration * 0.5 * bonus);
    set((s) => ({ player: { ...s.player, gold: s.player.gold + gold, experience: s.player.experience + exp }, lastOnlineTime: Date.now() }));
    return { gold, exp };
  },

  retryCurrentFloor: () => set((state) => ({ player: { ...state.player, currentHealth: state.player.stats.maxHealth }, currentEnemy: null, stage: Math.max(1, Math.floor((state.stage - 1) / 5) * 5 + 1), gameStatus: 'IDLE' })),
  spendGold: (amount) => set((state) => ({ player: { ...state.player, gold: Math.max(0, state.player.gold - amount) } })),
}));

useGameStore.subscribe((state) => saveStateToLocalStorage(state));