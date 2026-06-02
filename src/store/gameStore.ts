import { create } from 'zustand';
import type { GameState, Player, Stats, Core } from '../types/game';
import { loadStateFromLocalStorage, saveStateToLocalStorage } from './utils/localStorage';

// [피버 모드 설정] 5초 단위 가속 배율
const BATTLE_SPEED_CONFIG = [
  { threshold: 0, multiplier: 1 },
  { threshold: 5000, multiplier: 5 },
  { threshold: 10000, multiplier: 10 }
];

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
  distributeStat: (stat: 'str' | 'dex' | 'con', amount: number) => void;
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

const initialStats: Stats = { str: 10, dex: 10, con: 10 };
// [추가] 실시간 계산 엔진
export const getComputedStats = (stats: Stats) => ({
  attack: 20 + (stats.str * 2),
  defense: 5 + (stats.dex * 0.5),
  maxHealth: 100 + (stats.con * 20),
  attackSpeed: 1.0 + (stats.dex * 0.01),
  evasion: 0.05 + (stats.dex * 0.001)
});
const initialPlayer: Player = { id: 'player', name: 'Slayer', level: 1, stats: initialStats, currentHealth: 100, experience: 0, nextLevelExperience: 100, statPoints: 0, gold: 0 };

const getInitialStoreState = (): GameState => {
  const loadedState = loadStateFromLocalStorage();
  return loadedState || {
    player: initialPlayer, currentEnemy: null, stage: 1, isAutoBattle: true, gameStatus: 'IDLE',
    playerCores: [], equippedCore: null, lastOnlineTime: Date.now(), lastDamageDealt: { normal: 0, core: 0 },
    battleStartTime: 0 // 전투 시작 시간 추가
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
        stats: { str: baseStr, dex: 10, con: baseCon },
        currentHealth: getComputedStats({ str: baseStr, dex: 10, con: baseCon }).maxHealth,
        goldReward: Math.floor(10 * stageMultiplier * (isBoss ? 5 : 1)), expReward: Math.floor(20 * stageMultiplier * (isBoss ? 3 : 1)),
      },
      gameStatus: 'BATTLE',
      battleStartTime: Date.now() // 전투 시작 시간 기록
    };
  }),

  attackEnemy: () => set((state) => {
    if (!state.currentEnemy) return {};

    // [피버 모드] 경과 시간 및 배율 계산
    const elapsedTime = Date.now() - (state.battleStartTime || Date.now());
    const config = BATTLE_SPEED_CONFIG.slice().reverse().find(c => elapsedTime >= c.threshold) || BATTLE_SPEED_CONFIG[0];
    const multiplier = config.multiplier;

    // 공격력 계산 (배율 적용)
    const playerComputed = getComputedStats(state.player.stats);
    const enemyComputed = getComputedStats(state.currentEnemy.stats);
    const normalDamage = Math.max(1, (playerComputed.attack - enemyComputed.defense) * multiplier);

    let coreDamage = 0;
    if (state.equippedCore) {
      const stats = getCoreStats(state.equippedCore.type, state.equippedCore.level);
      if (state.equippedCore.type === 'FIRE') {
        coreDamage = ((stats.fireDamage || 0) + Math.floor(playerComputed.attack * (stats.fireDamageRatio || 0))) * multiplier;
      }
    }

    const totalDamage = normalDamage + coreDamage;
    const newEnemyHealth = state.currentEnemy.currentHealth - totalDamage;

    if (newEnemyHealth <= 0) {
      const { expReward, goldReward } = state.currentEnemy;
      let { experience: e, level: l, nextLevelExperience: n, statPoints: s } = state.player;
      e += expReward;
      if (e >= n) { l += 1; e -= n; n = Math.floor(n * 1.2); s += 3; }
      const playerComputed = getComputedStats(state.player.stats);
      return {
        player: { ...state.player, experience: e, gold: state.player.gold + goldReward, level: l, nextLevelExperience: n, statPoints: s, currentHealth: playerComputed.maxHealth },
        currentEnemy: null, stage: state.stage + 1, gameStatus: 'VICTORY',
        lastDamageDealt: { normal: normalDamage, core: coreDamage }
      };
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

  distributeStat: (stat, amount) => set((state) => {
    const actualAmount = Math.min(amount, state.player.statPoints);
    if (actualAmount <= 0) return state;
    return {
      player: {
        ...state.player,
        stats: { ...state.player.stats, [stat]: state.player.stats[stat] + actualAmount },
        statPoints: state.player.statPoints - actualAmount
      }
    };
  }),
  resetStats: () => set((state) => ({ player: { ...state.player, stats: initialStats, statPoints: (state.player.level - 1) * 3 } })),
  attackPlayer: () => set((state) => {
    // 1. 적이 없으면 공격받지 않음
    if (!state.currentEnemy) return {};

    // 2. 데미지 계산
// 상단에서 적의 스탯도 계산해야 합니다
    const enemyComputed = getComputedStats(state.currentEnemy.stats);
    const playerComputed = getComputedStats(state.player.stats);
    const damage = Math.max(1, enemyComputed.attack - playerComputed.defense);
    const nextHealth = Math.max(0, state.player.currentHealth - damage);

    // 3. 체력이 0이 되면 패배 처리
    if (nextHealth <= 0) {
      return {
        player: { ...state.player, currentHealth: 0 },
        currentEnemy: null,   // 적을 없애야 전투 루프가 멈춤
        gameStatus: 'DEFEAT'  // 패배 상태로 전환
      };
    }

    // 4. 생존 시 체력만 갱신
    return {
      player: { ...state.player, currentHealth: nextHealth }
    };
  }),

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
  retryCurrentFloor: () => set((state) => {
    const computed = getComputedStats(state.player.stats); // 계산값 가져오기
    return {
      player: { ...state.player, currentHealth: computed.maxHealth },
      currentEnemy: null,
      stage: Math.max(1, Math.floor((state.stage - 1) / 5) * 5 + 1),
      gameStatus: 'IDLE'
    };
  }),
  spendGold: (amount) => set((state) => ({ player: { ...state.player, gold: Math.max(0, state.player.gold - amount) } })),
  removeCore: (coreId) => set((state) => ({ playerCores: state.playerCores.filter(c => c.id !== coreId), equippedCore: state.equippedCore?.id === coreId ? null : state.equippedCore })),
}));

useGameStore.subscribe((state) => saveStateToLocalStorage(state));