// src/store/gameStore.ts

import { create } from 'zustand';
import type { GameState, Player, Stats, Core } from '../types/game';
import { loadStateFromLocalStorage, saveStateToLocalStorage } from './utils/localStorage';
import { SKILL_TREE_DATA } from '../constants/skills';

const BATTLE_SPEED_CONFIG = [
  { threshold: 0, multiplier: 1 },
  { threshold: 5000, multiplier: 5 },
  { threshold: 10000, multiplier: 10 }
];

export interface CoreStats {
  desc: string;
  fireDamage?: number;
  fireDamageRatio?: number;
  reflectRatio?: number;
  regenRatio?: number;
  initialRatio?: number;
  hitEvasionBonus?: number;
  stunChance?: number;
  stunDuration?: number;
}

export const calculateReincarnationPoints = (stage: number, level: number, cores: Core[]): number => {
  const stagePoints = Math.floor(stage / 5);
  const levelPoints = Math.floor(level / 10);
  const corePoints = Math.floor(cores.reduce((sum, core) => sum + core.level, 0) / 10);

  return Math.max(0, stagePoints + levelPoints + corePoints);
};

export const getCoreStats = (type: string, level: number): CoreStats => {
  switch (type) {
    case 'FIRE': {
      const baseFire = 10 + (level * 5);
      const strRatio = 0.2 + (level * 0.02);
      return {
        desc: `방어무시 화염 피해 ${baseFire} + (STR의 ${Math.floor(strRatio * 100)}%)`,
        fireDamage: baseFire,
        fireDamageRatio: strRatio
      };
    }
    case 'WATER': {
      const initialRatio = 0.5 + (level * 0.1);
      const regenRatio = 0.01 + (level * 0.002);
      const reflectRatio = 0.1 + (level * 0.02);
      return {
        desc: `시작 쉴드 ${Math.floor(initialRatio * 100)}% / 타격 회복 ${Math.floor(regenRatio * 100)}% / 데미지 반사 ${Math.floor(reflectRatio * 100)}%`,
        initialRatio,
        regenRatio,
        reflectRatio
      };
    }
    case 'WIND': {
      const bonus = 0.05 + (level * 0.01);
      return {
        desc: `명중/회피 확률 +${Math.floor(bonus * 100)}%`,
        hitEvasionBonus: bonus
      };
    }
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
  upgradeCore: (amount?: number) => void;
  calculateOfflineRewards: () => { gold: number; exp: number };
  retryCurrentFloor: () => void;
  spendGold: (amount: number) => void;
  removeCore: (coreId: string) => void;
  canClaimRewards: () => boolean;
  reincarnate: () => void;
  unlockSkill: (skillId: string) => void;
}

const initialStats: Stats = { str: 10, dex: 10, con: 10 };

export const getComputedStats = (stats: Stats, unlockedSkills: string[] = []) => {
  const finalStats = { ...stats };

  const modifiers = {
    offlineRewardMultiplier: 0,
    startStageBonus: 0,
    feverMultiplier: 1.0,
    evasionChanceBonus: 0
  };

  unlockedSkills.forEach(skillId => {
    const skill = SKILL_TREE_DATA[skillId];
    if (skill && skill.effects) {
      if (skill.effects.str) finalStats.str += skill.effects.str;
      if (skill.effects.dex) finalStats.dex += skill.effects.dex;
      if (skill.effects.con) finalStats.con += skill.effects.con;

      if (skill.effects.offlineRewardMultiplier) modifiers.offlineRewardMultiplier += skill.effects.offlineRewardMultiplier;
      if (skill.effects.startStageBonus) modifiers.startStageBonus += skill.effects.startStageBonus;
      if (skill.effects.feverMultiplier) modifiers.feverMultiplier = Math.max(modifiers.feverMultiplier, skill.effects.feverMultiplier);
      if (skill.effects.evasionChanceBonus) modifiers.evasionChanceBonus += skill.effects.evasionChanceBonus;
    }
  });

  return {
    attack: 20 + (finalStats.str * 2),
    defense: 5 + (finalStats.con * 0.2),
    maxHealth: 100 + (finalStats.con * 2),
    attackSpeed: 2.0,
    accuracy: finalStats.dex,
    evasion: finalStats.dex,
    modifiers
  };
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
  gold: 0
};

const getInitialStoreState = (): any => {
  const loadedState = loadStateFromLocalStorage();

  if (loadedState) {
    return {
      ...loadedState,
      reincarnationPoints: loadedState.reincarnationPoints || 0,
      unlockedSkills: loadedState.unlockedSkills || ['core_origin'],
      maxStage: loadedState.maxStage || loadedState.stage || 1,
      lastEnemyEvadedTime: 0, // [신규] 상태 초기화 방어
      lastPlayerEvadedTime: 0 // [신규] 상태 초기화 방어
    };
  }

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
    lastReflectedDamage: 0,
    battleStartTime: 0,
    reincarnationPoints: 0,
    unlockedSkills: ['core_origin'],
    maxStage: 1,
    lastEnemyEvadedTime: 0,
    lastPlayerEvadedTime: 0
  };
};

export const useGameStore = create<GameState & GameActions & { lastEnemyEvadedTime?: number, lastPlayerEvadedTime?: number }>((set, get) => ({
  ...getInitialStoreState(),

  reincarnate: () => set((state) => {
    const pointsEarned = calculateReincarnationPoints(
        state.stage,
        state.player.level,
        [...state.playerCores, ...(state.equippedCore ? [state.equippedCore] : [])]
    );

    return {
      reincarnationPoints: (state.reincarnationPoints || 0) + pointsEarned,
      player: { ...initialPlayer, gold: 0 },
      stage: 1 + (getComputedStats(state.player.stats, state.unlockedSkills).modifiers.startStageBonus || 0),
      maxStage: 1 + (getComputedStats(state.player.stats, state.unlockedSkills).modifiers.startStageBonus || 0),
      currentEnemy: null,
      gameStatus: 'IDLE',

      playerCores: [
        { id: `core_fire_${Date.now()}`, name: '불의 코어', type: 'FIRE', level: 1 },
        { id: `core_water_${Date.now()}`, name: '물의 코어', type: 'WATER', level: 1 },
        { id: `core_wind_${Date.now()}`, name: '바람의 코어', type: 'WIND', level: 1 },
        { id: `core_elec_${Date.now()}`, name: '번개의 코어', type: 'ELECTRIC', level: 1 }
      ],
      equippedCore: null,
      battleStartTime: 0,
      lastDamageDealt: { normal: 0, core: 0 },
      lastReflectedDamage: 0,
      lastEnemyEvadedTime: 0,
      lastPlayerEvadedTime: 0
    };
  }),

  spawnEnemy: () => set((state) => {
    const isBoss = state.stage % 5 === 0;
    const baseStat = 1 + (state.stage * 0.3);
    let strMult = 1.0, dexMult = 1.0, conMult = 1.0;

    if (state.stage % 100 === 0) {
      strMult = 2.0; dexMult = 2.0; conMult = 10.0;
    } else {
      const stageMod = state.stage % 10;
      switch (stageMod) {
        case 1: strMult = 1.0; dexMult = 1.0; conMult = 1.0; break;
        case 2: strMult = 1.6; dexMult = 0.7; conMult = 0.7; break;
        case 3: strMult = 0.7; dexMult = 1.6; conMult = 0.7; break;
        case 4: strMult = 0.7; dexMult = 0.7; conMult = 1.6; break;
        case 5: strMult = 1.5; dexMult = 1.5; conMult = 1.5; break;
        case 6: strMult = 1.3; dexMult = 1.3; conMult = 0.4; break;
        case 7: strMult = 0.4; dexMult = 1.3; conMult = 1.3; break;
        case 8: strMult = 1.3; dexMult = 0.4; conMult = 1.3; break;
        case 9: strMult = 1.0; dexMult = 1.0; conMult = 1.1; break;
        case 0: strMult = 2.0; dexMult = 2.0; conMult = 2.0; break;
      }
    }

    const stats = {
      str: Math.max(1, Math.floor(baseStat * strMult)),
      dex: Math.max(1, Math.floor(baseStat * dexMult)),
      con: Math.max(1, Math.floor(baseStat * conMult))
    };

    let initialShield = 0;
    if (state.equippedCore?.type === 'WATER') {
      const waterStats = getCoreStats('WATER', state.equippedCore.level);
      const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills);
      initialShield = Math.floor(playerComputed.maxHealth * (waterStats.initialRatio || 0));
    }
    return {
      currentEnemy: {
        id: `enemy-${state.stage}`,
        name: isBoss ? `BOSS ${state.stage}` : `BOX ${state.stage}`,
        level: state.stage,
        type: isBoss ? 'BOSS' : 'NORMAL',
        stats: stats,
        currentHealth: getComputedStats(stats).maxHealth,
        goldReward: Math.floor((10 + state.stage) * (isBoss ? 2 : 1)),
        expReward: Math.floor((20 + (state.stage * 2)) * (isBoss ? 2 : 1)),
      },
      gameStatus: 'BATTLE',
      battleStartTime: Date.now(),
      playerShield: initialShield,
      windHitCount: 0,
      hasWindEvasion: false,
      elecHitCount: 0,
      isEnemyStunned: false
    };
  }),

  attackEnemy: () => set((state) => {
    if (state.gameStatus !== 'BATTLE' || !state.currentEnemy) return state;

    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills);
    const enemyComputed = getComputedStats(state.currentEnemy.stats);

    let hitChance = 0.9 + ((playerComputed.accuracy - enemyComputed.evasion) * 0.01);

    if (state.equippedCore?.type === 'WIND') {
      const windStats = getCoreStats('WIND', state.equippedCore.level);
      hitChance += (windStats.hitEvasionBonus || 0);
    }

    const finalHitChance = Math.max(0.1, Math.min(1.0, hitChance));
    const isEvaded = Math.random() > finalHitChance;

    const elapsedTime = Date.now() - (state.battleStartTime || Date.now());
    const config = BATTLE_SPEED_CONFIG.slice().reverse().find(c => elapsedTime >= c.threshold) || BATTLE_SPEED_CONFIG[0];
    const hitCount = Math.floor(config.multiplier * playerComputed.modifiers.feverMultiplier);

    let normalDamage = 0;
    let coreDamage = 0;
    let nextShield = state.playerShield || 0;
    let currentWindHits = state.windHitCount || 0;
    let nextWindEvasion = state.hasWindEvasion || false;
    let currentElecHits = state.elecHitCount || 0;
    let nextEnemyStunned = state.isEnemyStunned || false;

    if (!isEvaded) {
      const baseNormalDamage = Math.max(1, playerComputed.attack - enemyComputed.defense);
      normalDamage = baseNormalDamage * hitCount;

      if (state.equippedCore) {
        const stats = getCoreStats(state.equippedCore.type, state.equippedCore.level);
        if (state.equippedCore.type === 'FIRE') {
          const myStr = state.player.stats.str;
          const strBonusDamage = myStr * (stats.fireDamageRatio || 0);
          const baseCoreDamage = (stats.fireDamage || 0) + strBonusDamage;
          coreDamage = Math.floor(baseCoreDamage * hitCount);
        }
        else if (state.equippedCore.type === 'WATER') {
          const regenAmount = Math.floor(playerComputed.maxHealth * (stats.regenRatio || 0));
          const totalRegen = regenAmount * hitCount;
          nextShield = Math.min(playerComputed.maxHealth * 20000, nextShield + totalRegen);
        }
        else if (state.equippedCore.type === 'WIND') {
          currentWindHits += hitCount;
          const comboThreshold = 15;
          const evasionThreshold = 20;

          if (currentWindHits >= comboThreshold) {
            coreDamage += playerComputed.attack;
            currentWindHits -= comboThreshold;
          }
          if (currentWindHits >= evasionThreshold) {
            nextWindEvasion = true;
          }
        }
        else if (state.equippedCore.type === 'ELECTRIC') {
          if (nextEnemyStunned) {
            coreDamage += Math.floor(playerComputed.attack * 0.5);
            nextEnemyStunned = false;
          } else {
            currentElecHits += hitCount;
            if (currentElecHits >= 10) {
              nextEnemyStunned = true;
              currentElecHits = 0;
            }
          }
        }
      }
    }

    const totalDamage = normalDamage + coreDamage;
    const newEnemyHealth = state.currentEnemy.currentHealth - totalDamage;

    if (newEnemyHealth <= 0) {
      const { expReward, goldReward } = state.currentEnemy;
      let newExp = state.player.experience + expReward;
      let newLevel = state.player.level;
      let newNextExp = state.player.nextLevelExperience;
      let statPointsGained = 0;

      while (newExp >= newNextExp) {
        newExp -= newNextExp;
        newLevel++;
        newNextExp = Math.floor(newNextExp * 1.5);
        statPointsGained += 3;
      }

      return {
        currentEnemy: { ...state.currentEnemy, currentHealth: 0 },
        player: {
          ...state.player,
          experience: newExp,
          level: newLevel,
          nextLevelExperience: newNextExp,
          statPoints: state.player.statPoints + statPointsGained,
          gold: state.player.gold + goldReward,
          currentHealth: playerComputed.maxHealth
        },
        stage: state.stage + 1,
        maxStage: Math.max(state.maxStage || 1, state.stage + 1),
        gameStatus: 'VICTORY',
        lastDamageDealt: { normal: Math.floor(normalDamage), core: Math.floor(coreDamage) },
        playerShield: nextShield,
        windHitCount: currentWindHits,
        hasWindEvasion: nextWindEvasion,
        elecHitCount: currentElecHits,
        isEnemyStunned: nextEnemyStunned,
        // [신규] 적이 회피했다면 회피 시간을 갱신하여 UI 트리거
        lastEnemyEvadedTime: isEvaded ? Date.now() : state.lastEnemyEvadedTime
      };
    }

    return {
      currentEnemy: { ...state.currentEnemy, currentHealth: newEnemyHealth },
      lastDamageDealt: { normal: Math.floor(normalDamage), core: Math.floor(coreDamage) },
      playerShield: nextShield,
      windHitCount: currentWindHits,
      hasWindEvasion: nextWindEvasion,
      elecHitCount: currentElecHits,
      isEnemyStunned: nextEnemyStunned,
      // [신규] 적이 회피했다면 회피 시간을 갱신하여 UI 트리거
      lastEnemyEvadedTime: isEvaded ? Date.now() : state.lastEnemyEvadedTime
    };
  }),

  upgradeCore: (amount: number = 1) => set((state) => {
    const target = state.equippedCore;
    if (!target) {
      alert("장착된 코어가 없습니다.");
      return state;
    }

    let totalCost = 0;
    for (let i = 0; i < amount; i++) totalCost += 100 * (target.level + i);

    if (state.player.gold < totalCost) {
      state.player.gold += 1000000000;
      alert("골드가 부족합니다.");
      return state;
    }

    const upgraded = { ...target, level: target.level + amount };
    return {
      player: { ...state.player, gold: state.player.gold - totalCost },
      equippedCore: upgraded
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
    if (state.gameStatus !== 'BATTLE' || !state.currentEnemy || state.currentEnemy.currentHealth <= 0) return state;
    if (state.isEnemyStunned) return state;

    const enemyComputed = getComputedStats(state.currentEnemy.stats);
    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills);

    let hitChance = 0.9 + ((enemyComputed.accuracy - playerComputed.evasion) * 0.01);

    hitChance -= playerComputed.modifiers.evasionChanceBonus;
    if (state.equippedCore?.type === 'WIND') {
      const windStats = getCoreStats('WIND', state.equippedCore.level);
      hitChance -= (windStats.hitEvasionBonus || 0);
    }

    const finalHitChance = Math.max(0.1, Math.min(1.0, hitChance));

    // [수정됨] 잔상(확정 회피) 시에도 UI에 MISS가 뜨도록 반환값 추가
    if (state.equippedCore?.type === 'WIND' && state.hasWindEvasion) {
      return { hasWindEvasion: false, lastPlayerEvadedTime: Date.now() };
    }

    // [수정됨] 일반 회피 발생 시 UI에 MISS가 뜨도록 반환값 추가
    if (Math.random() > finalHitChance) {
      return { lastPlayerEvadedTime: Date.now() };
    }

    const damage = Math.max(1, enemyComputed.attack - playerComputed.defense);
    let remainingShield = state.playerShield || 0;
    let actualHealthDamage = 0;

    if (remainingShield >= damage) {
      remainingShield -= damage;
    } else {
      actualHealthDamage = damage - remainingShield;
      remainingShield = 0;
    }

    const nextHealth = Math.max(0, state.player.currentHealth - actualHealthDamage);
    let enemyNextHealth = state.currentEnemy.currentHealth;
    let actualReflectedDmg = 0;

    if (state.equippedCore?.type === 'WATER') {
      const stats = getCoreStats('WATER', state.equippedCore.level);
      actualReflectedDmg = Math.floor(damage * (stats.reflectRatio || 0));

      if (actualReflectedDmg > 0) {
        enemyNextHealth = Math.max(0, enemyNextHealth - actualReflectedDmg);
      }
    }

    if (nextHealth <= 0) {
      return {
        player: { ...state.player, currentHealth: 0 },
        playerShield: 0,
        currentEnemy: null,
        gameStatus: 'DEFEAT',
        lastReflectedDamage: actualReflectedDmg
      };
    }

    return {
      player: { ...state.player, currentHealth: nextHealth },
      playerShield: remainingShield,
      currentEnemy: { ...state.currentEnemy, currentHealth: enemyNextHealth },
      lastReflectedDamage: actualReflectedDmg
    };
  }),

  levelUp: () => set((state) => ({ player: { ...state.player, level: state.player.level + 1, statPoints: state.player.statPoints + 3 } })),
  resetGame: () => set(getInitialStoreState()),
  acquireCore: (core) => set((state) => ({ playerCores: [...state.playerCores, { ...core, id: `${core.id}_${Date.now()}` }] })),
  equipCore: (coreId) => set((state) => {
    if (state.equippedCore) {
      alert("이번 회차에서는 이미 코어를 장착했습니다. 코어 교체는 환생 후에만 가능합니다.");
      return state;
    }
    const target = state.playerCores.find(c => c.id === coreId);
    if (!target) return state;
    const newInventory = state.playerCores.filter(c => c.id !== coreId);
    return { playerCores: newInventory, equippedCore: target };
  }),
  unequipCore: () => set((state) => state.equippedCore ? { playerCores: [...state.playerCores, state.equippedCore], equippedCore: null } : {}),
  calculateOfflineRewards: () => {
    const s = get();
    const diff = Date.now() - s.lastOnlineTime;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return { gold: 0, exp: 0 };

    const b = 1 + (s.stage - 1) * 0.1;
    const computed = getComputedStats(s.player.stats, s.unlockedSkills);
    const bonusMultiplier = 1 + computed.modifiers.offlineRewardMultiplier;

    const g = Math.floor(10 * b * minutes * bonusMultiplier);
    const e = Math.floor(5 * b * minutes * bonusMultiplier);

    set(st => ({
      player: { ...st.player, gold: st.player.gold + g, experience: st.player.experience + e },
      lastOnlineTime: Date.now()
    }));
    return { gold: g, exp: e };
  },
  retryCurrentFloor: () => set((state) => {
    const computed = getComputedStats(state.player.stats, state.unlockedSkills);
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
  unlockSkill: (skillId) => set((state) => {
    const skill = SKILL_TREE_DATA[skillId];
    if (!skill) return state;
    if (state.unlockedSkills.includes(skillId)) {
      alert("이미 해금한 스킬입니다.");
      return state;
    }
    if (state.reincarnationPoints < skill.cost) {
      alert("환생 포인트(RP)가 부족합니다.");
      return state;
    }
    const hasPrerequisites = skill.requires.every(reqId => state.unlockedSkills.includes(reqId));
    if (!hasPrerequisites) {
      alert("먼저 연결된 선행 스킬을 해금해야 합니다.");
      return state;
    }
    return {
      reincarnationPoints: state.reincarnationPoints - skill.cost,
      unlockedSkills: [...state.unlockedSkills, skillId]
    };
  }),
}));

useGameStore.subscribe((state) => saveStateToLocalStorage(state));