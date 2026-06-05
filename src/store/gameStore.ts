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

// 환생 포인트 계산식 (스테이지 + 레벨 + 코어레벨 총합)
export const calculateReincarnationPoints = (stage: number, level: number, cores: Core[]): number => {
  const stagePoints = Math.floor(stage / 5); // 5스테이지당 1포인트
  const levelPoints = Math.floor(level / 10); // 10레벨당 1포인트
  const corePoints = Math.floor(cores.reduce((sum, core) => sum + core.level, 0) / 10); // 코어 레벨 합산 10당 1포인트

  return Math.max(0, stagePoints + levelPoints + corePoints);
};

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
  canClaimRewards: () => boolean;
  reincarnate: () => void;
}

const initialStats: Stats = { str: 10, dex: 10, con: 10 };
// [추가] 실시간 계산 엔진
export const getComputedStats = (stats: Stats) => ({
  attack: 20 + (stats.str * 2),
  defense: 5 + (stats.con * 0.2), // dex에서 con 영역으로 이관 (CON * 0.2)
  maxHealth: 100 + (stats.con * 2),
  attackSpeed: 1.0 + (stats.dex * 0.01),
  evasion: stats.dex // 회피/적중 계산을 위해 원본 dex 값 보존
});
// [확인] initialPlayer 정의
const initialPlayer: Player = {
  id: 'player',
  name: 'Slayer',
  level: 1,
  stats: initialStats,
  currentHealth: 100,
  experience: 0,
  nextLevelExperience: 100,
  statPoints: 0,
  gold: 0 // 확인 완료 (0이어야 합니다)
};

// [수정] getInitialStoreState 함수에서 reincarnationPoints 초기화
const getInitialStoreState = (): GameState => {
  const loadedState = loadStateFromLocalStorage();
  if (loadedState) return loadedState;

  return {
    player: initialPlayer,
    currentEnemy: null,
    stage: 1,
    isAutoBattle: true,
    gameStatus: 'IDLE',
    playerCores: [],
    equippedCore: null,
    lastOnlineTime: Date.now(),
    lastDamageDealt: { normal: 0, core: 0 },
    battleStartTime: 0,
    reincarnationPoints: 0 // [추가] 초기값 0
  };
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...getInitialStoreState(),

  reincarnate: () => set((state) => {
    const pointsEarned = calculateReincarnationPoints(
        state.stage,
        state.player.level,
        [...state.playerCores, ...(state.equippedCore ? [state.equippedCore] : [])]
    );

    return {
      // 1. 포인트 누적 및 초기화
      reincarnationPoints: (state.reincarnationPoints || 0) + pointsEarned,

      // 2. 플레이어 초기화
      player: {
        ...initialPlayer,
        gold: 0 // 골드는 초기화
      },

      // 3. 게임 상태 초기화
      stage: 1,
      currentEnemy: null,
      gameStatus: 'IDLE',

      // 4. 코어 레벨 초기화 (레벨만 1로 되돌림)
      playerCores: state.playerCores.map(c => ({ ...c, level: 1 })),
      equippedCore: state.equippedCore ? { ...state.equippedCore, level: 1 } : null,

      // 5. 기타 상태
      battleStartTime: 0,
      lastDamageDealt: { normal: 0, core: 0 }
    };
  }),

    spawnEnemy: () => set((state) => {
        const isBoss = state.stage % 5 === 0;

        // 기본이 되는 뼈대 스탯
        const baseStat = 1 + (state.stage * 0.3);

        // 층별 가중치 초기화
        let strMult = 1.0, dexMult = 1.0, conMult = 1.0;

        // 100층 단위 통곡의 벽 (체력 10배 기믹)
        if (state.stage % 100 === 0) {
            strMult = 2.0;
            dexMult = 2.0;
            conMult = 10.0;
        } else {
            // 1~10층 단위 로테이션 테마
            const stageMod = state.stage % 10;
            switch (stageMod) {
                case 1: strMult = 1.0; dexMult = 1.0; conMult = 1.0; break; // 표준
                case 2: strMult = 1.6; dexMult = 0.7; conMult = 0.7; break; // 힘 특화
                case 3: strMult = 0.7; dexMult = 1.6; conMult = 0.7; break; // 민첩 특화
                case 4: strMult = 0.7; dexMult = 0.7; conMult = 1.6; break; // 체력 특화
                case 5: strMult = 1.5; dexMult = 1.5; conMult = 1.5; break; // 5층 소형 보스
                case 6: strMult = 1.3; dexMult = 1.3; conMult = 0.4; break; // 힘+민 하이브리드
                case 7: strMult = 0.4; dexMult = 1.3; conMult = 1.3; break; // 민+체 하이브리드
                case 8: strMult = 1.3; dexMult = 0.4; conMult = 1.3; break; // 체+힘 하이브리드
                case 9: strMult = 1.0; dexMult = 1.0; conMult = 1.1; break; // 체력 10% 추가
                case 0: strMult = 2.0; dexMult = 2.0; conMult = 2.0; break; // 10층 중간 보스
            }
        }

        const stats = {
            // 스탯이 0으로 떨어지지 않게 최소값 1 보장
            str: Math.max(1, Math.floor(baseStat * strMult)),
            dex: Math.max(1, Math.floor(baseStat * dexMult)),
            con: Math.max(1, Math.floor(baseStat * conMult))
        };

    return {
      currentEnemy: {
        id: `enemy-${state.stage}`,
        name: isBoss ? `BOSS ${state.stage}` : `BOX ${state.stage}`,
        level: state.stage,
        type: isBoss ? 'BOSS' : 'NORMAL',
        stats: stats,
        // 이제 stats.con이 작으므로 체력이 1300이 되지 않음
        currentHealth: getComputedStats(stats).maxHealth,
        goldReward: Math.floor((10 + state.stage) * (isBoss ? 2 : 1)),
        expReward: Math.floor((20 + (state.stage * 2)) * (isBoss ? 2 : 1)),
      },
      gameStatus: 'BATTLE',
      battleStartTime: Date.now()
    };
  }),

  attackEnemy: () => set((state) => {
    if (!state.currentEnemy) return {};

    const playerComputed = getComputedStats(state.player.stats);
    const enemyComputed = getComputedStats(state.currentEnemy.stats);

    // [DEX 차이에 따른 회피 및 적중 로직]
    // 공식: 회피율(%) = (상대 DEX - 내 DEX) / 50. 차이가 50 이상이면 100% 강제 회피.
    const dexDifference = enemyComputed.evasion - playerComputed.evasion;
    const evasionChance = Math.min(1, Math.max(0, dexDifference / 50));

    if (Math.random() < evasionChance) {
      // 회피 발생 시 데미지 0 처리 및 즉시 반환
      return {
        lastDamageDealt: { normal: 0, core: 0 }
      };
    }

    // [피버 모드] 데미지 증폭이 아닌 '연타(Hit Count)' 개념으로 최종 데미지에 곱함
    const elapsedTime = Date.now() - (state.battleStartTime || Date.now());
    const config = BATTLE_SPEED_CONFIG.slice().reverse().find(c => elapsedTime >= c.threshold) || BATTLE_SPEED_CONFIG[0];
    const hitCount = config.multiplier;

    // 방어력을 먼저 뺀 순수 데미지에 연타 횟수를 곱함 (방어력 가치 보존)
    const baseNormalDamage = Math.max(1, playerComputed.attack - enemyComputed.defense);
    const normalDamage = baseNormalDamage * hitCount;

    let coreDamage = 0;
    if (state.equippedCore) {
      const stats = getCoreStats(state.equippedCore.type, state.equippedCore.level);
      if (state.equippedCore.type === 'FIRE') {
        // 불 코어의 고정 화속성 데미지도 연타 횟수만큼 적용 (방어력 무시 및 회피 불가 판정)
        const baseCoreDamage = (stats.fireDamage || 0) + Math.floor(playerComputed.attack * (stats.fireDamageRatio || 0));
        coreDamage = baseCoreDamage * hitCount;
      }
    }

    const totalDamage = normalDamage + coreDamage;
    const newEnemyHealth = state.currentEnemy.currentHealth - totalDamage;

    if (newEnemyHealth <= 0) {
      const { expReward, goldReward } = state.currentEnemy;
      let { experience: e, level: l, nextLevelExperience: n, statPoints: s } = state.player;
      e += expReward;
      if (e >= n) { l += 1; e -= n; n = Math.floor(n * 1.2); s += 3; }
      return {
        player: { ...state.player, experience: e, gold: state.player.gold + goldReward, level: l, nextLevelExperience: n, statPoints: s, currentHealth: playerComputed.maxHealth },
        currentEnemy: { ...state.currentEnemy, currentHealth: newEnemyHealth },
        stage: state.stage + 1,
        gameStatus: 'VICTORY',
        lastDamageDealt: { normal: normalDamage, core: coreDamage }
      };
    }
    return {
      currentEnemy: { ...state.currentEnemy, currentHealth: newEnemyHealth },
      lastDamageDealt: { normal: normalDamage, core: coreDamage }
    };
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
  calculateOfflineRewards: () => {
    const s = get();
    // 접속하지 않은 시간만큼 보상을 계산하도록 변경 (분 단위)
    const diff = Date.now() - s.lastOnlineTime;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return { gold: 0, exp: 0 };

    const b = 1 + (s.stage - 1) * 0.1;
    // 경과한 시간(분)만큼 보상 곱하기
    const g = Math.floor(10 * b * minutes), e = Math.floor(5 * b * minutes);

    set(st => ({
      player: { ...st.player, gold: st.player.gold + g, experience: st.player.experience + e },
      lastOnlineTime: Date.now()
    }));
    return { gold: g, exp: e };
  },
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
  canClaimRewards: () => (Date.now() - get().lastOnlineTime) >= 60000,
}));

useGameStore.subscribe((state) => saveStateToLocalStorage(state));