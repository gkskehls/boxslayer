// src/store/gameStore.ts

import { create } from 'zustand';
import type {
  GameState,
  Player,
  Stats,
  Core,
  ShopItem,
  DefeatReason,
  CoreType,
  CoreEffect,
  RebirthUpgrades,
  CoreAbilityLevels
} from '../types/game';
import { loadStateFromLocalStorage, saveStateToLocalStorage } from './utils/localStorage';
import {
  REBIRTH_UPGRADES_CONFIG,
  CORE_ABILITIES_CONFIG,
  calculateRebirthUpgradeCost,
  calculateCoreAbilityCost,
  calculateTotalSpentRP,
  calculateTotalSpentCoreFragments,
} from '../data/rebirthConfig';

export interface CoreStats {
  desc: string;
  effects: CoreEffect;
}

export const calculateReincarnationPoints = (stage: number): number => {
  if (stage < 5) return 0;
  const basePoints = Math.floor(stage / 5);
  const acceleration = 1 + (stage / 120);
  return Math.floor(basePoints * acceleration);
};

export const getRequiredExpForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(level, 1.5));
};

export const getCoreStats = (type: CoreType, level: number, _unlockedSkills?: string[]): CoreStats => {
  void _unlockedSkills;
  const coreLevel = level > 0 ? level : 1;
  const finalEffects: CoreEffect = {};

  switch (type) {
    case 'FIRE': finalEffects.baseDamageFlat = 1 + (coreLevel * 0.5); break;
    case 'WATER': finalEffects.initialShieldMultiplier = 0.2 + (coreLevel * 0.02); break;
    case 'WIND': finalEffects.hitEvasionBonus = 0.02 + (coreLevel * 0.002); break;
    case 'ELECTRIC': finalEffects.baseDamageFlat = 1 + (coreLevel * 0.2); break;
  }

  let description = '';
  if (type === 'FIRE') {
    description = `기본 화염 피해: +${finalEffects.baseDamageFlat?.toFixed(1) || 0}`;
    if (finalEffects.strRatio) description += `\nSTR 계수: +${(finalEffects.strRatio * 100).toFixed(0)}%`;
  } else if (type === 'WATER') {
    description = `시작 쉴드: 최대 체력의 +${((finalEffects.initialShieldMultiplier || 0) * 100).toFixed(0)}%`;
  } else if (type === 'WIND') {
    description = `명중/회피 보너스: +${((finalEffects.hitEvasionBonus || 0) * 100).toFixed(1)}%`;
  } else if (type === 'ELECTRIC') {
    description = `기본 번개 피해: +${finalEffects.baseDamageFlat?.toFixed(1) || 0}`;
  }

  return { desc: description, effects: finalEffects };
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
  selectCore: (coreType: CoreType) => void;
  upgradeCore: (amount?: number) => void;
  calculateOfflineRewards: () => { gold: number; exp: number; minutes: number; levelsGained: number };
  claimOfflineRewards: () => { gold: number; exp: number; minutes: number; levelsGained: number };
  retryCurrentFloor: () => void;
  spendGold: (amount: number) => void;
  removeCore: (coreId: string) => void;
  canClaimRewards: () => boolean;
  reincarnate: () => void;
  unlockSkill: (skillId: string) => void;
  resetSkills: () => void;
  buyShopItem: (item: ShopItem) => void;
  setDefeat: (reason: DefeatReason) => void;
  upgradeRebirthStat: (statKey: keyof RebirthUpgrades, count?: number) => void;
  resetRebirthUpgrades: () => void;
  upgradeCoreAbility: (abilityKey: keyof CoreAbilityLevels) => void;
  resetCoreAbilities: () => void;
}

const initialStats: Stats = { str: 10, dex: 10, con: 10 };

const defaultRebirthUpgrades: RebirthUpgrades = {
  flatStr: 0,
  flatDex: 0,
  flatCon: 0,
  percentStr: 0,
  percentDex: 0,
  percentCon: 0,
  flatAttack: 0,
  percentAttack: 0,
  flatDefense: 0,
  percentDefense: 0,
  flatHp: 0,
  percentHp: 0,
  goldGainPercent: 0,
  expGainPercent: 0,
  coreFragmentDropRatePercent: 0,
  oneShotLeapBonus: 0,
};

const defaultCoreAbilities: CoreAbilityLevels = {
  // WATER
  water_initial_shield: 0,
  water_shield_on_hit: 0,
  water_thorns_reflect: 0,
  water_life_steal: 0,
  water_shield_burst: 0,
  // FIRE
  fire_flat_damage: 0,
  fire_str_ratio: 0,
  fire_burn_dot: 0,
  fire_damage_multiplier: 0,
  fire_supernova: 0,
  // WIND
  wind_hit_evasion: 0,
  wind_multi_hit_chance: 0,
  wind_multi_hit_damage: 0,
  wind_combo_burst: 0,
  wind_absolute_evasion: 0,
  // ELECTRIC
  electric_flat_damage: 0,
  electric_stun_chance: 0,
  electric_stun_duration: 0,
  electric_execution_damage: 0,
  electric_chain_overload: 0,
};

export const getComputedStats = (
  stats: Stats,
  _unlockedSkills?: string[],
  activeBuffs: Record<string, number> = {},
  rebirthUpgrades: RebirthUpgrades = defaultRebirthUpgrades
) => {
  void _unlockedSkills;
  const rUpg = rebirthUpgrades || defaultRebirthUpgrades;

  const baseStr = stats.str + (rUpg.flatStr || 0);
  const baseDex = stats.dex + (rUpg.flatDex || 0);
  const baseCon = stats.con + (rUpg.flatCon || 0);

  const percentStr = (rUpg.percentStr || 0) * 0.015;
  const percentDex = (rUpg.percentDex || 0) * 0.015;
  const percentCon = (rUpg.percentCon || 0) * 0.015;

  const comboChance = 0;
  const comboMultiplier = 1.5;
  const comboHitsAdded = 0;

  const modifiers = {
    offlineRewardMultiplier: (rUpg.goldGainPercent || 0) * 0.05,
    startStageBonus: 0,
    evasionChanceBonus: 0,
    goldMultiplier: (rUpg.goldGainPercent || 0) * 0.05,
    expMultiplier: (rUpg.expGainPercent || 0) * 0.05,
    rpBonusMultiplier: 0,
    coreFragmentDropBonus: (rUpg.coreFragmentDropRatePercent || 0) * 0.03,
    oneShotLeapBonus: Math.floor((rUpg.oneShotLeapBonus || 0) * 0.2),
  };

  const finalStr = Math.floor(baseStr * (1 + percentStr));
  const finalDex = Math.floor(baseDex * (1 + percentDex));
  const finalCon = Math.floor(baseCon * (1 + percentCon));

  // 모든 전투력(공격력, 방어력, 체력)은 STR, DEX, CON 스탯에 의해서만 100% 산출
  let attack = 20 + (finalStr * 2);
  let defense = 5 + (finalCon * 0.2);
  let maxHealth = 100 + (finalCon * 5);

  const now = Date.now();
  if (activeBuffs['buff_berserk'] && activeBuffs['buff_berserk'] > now) {
    attack *= 3;
    defense = 0;
  }
  if (activeBuffs['buff_core_earth'] && activeBuffs['buff_core_earth'] > now) {
    maxHealth *= 5;
    defense *= 3;
  }

  return {
    finalStr,
    finalDex,
    finalCon,
    skillBonusStats: {
      str: Math.max(0, finalStr - stats.str),
      dex: Math.max(0, finalDex - stats.dex),
      con: Math.max(0, finalCon - stats.con),
    },
    attack,
    defense,
    maxHealth,
    attackSpeed: 2.0,
    accuracy: finalDex,
    evasion: finalDex,
    comboChance,
    comboMultiplier,
    comboHitsAdded,
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
  tempStatPoints: 0,
  gold: 0
};

const initialGameState: GameState = {
  player: initialPlayer,
  currentEnemy: null,
  stage: 1,
  maxStage: 1,
  allTimeMaxStage: 1,
  isAutoBattle: true,
  gameStatus: 'IDLE',
  playerCores: [],
  equippedCore: null,
  lastOnlineTime: Date.now(),
  lastDamageDealt: { normal: 0, core: 0, shieldRecovered: 0 },
  lastDamageTaken: { normal: 0, core: 0 },
  lastLeechedHealth: 0,
  lastEnemyShieldRecovered: 0,
  battleStartTime: 0,
  reincarnationPoints: 0,
  coreFragments: 0,
  boxFragments: 0,
  rebirthUpgrades: defaultRebirthUpgrades,
  coreAbilities: defaultCoreAbilities,
  unlockedSkills: ['core_origin'],
  playerShield: 0,
  enemyShield: 0,
  windHitCount: 0,
  hasWindEvasion: false,
  elecHitCount: 0,
  lastReflectedDamage: 0,
  lastEnemyEvadedTime: 0,
  lastPlayerEvadedTime: 0,
  activeBuffs: {},
  defeatReason: undefined,
  playerStunEndTime: 0,
  enemyStunEndTime: 0,
};

const getInitialStoreState = (): GameState => {
  try {
    const loadedState = loadStateFromLocalStorage();
    if (loadedState && typeof loadedState === 'object') {
      const state: GameState = {
        ...initialGameState,
        ...loadedState,
        rebirthUpgrades: { ...defaultRebirthUpgrades, ...(loadedState.rebirthUpgrades || {}) },
        coreAbilities: { ...defaultCoreAbilities, ...(loadedState.coreAbilities || {}) },
      };
      state.player = { ...initialPlayer, ...(loadedState.player || {}) };
      return state;
    }
  } catch (error) {
    console.error("Failed to load state from localStorage", error);
  }
  return initialGameState;
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...getInitialStoreState(),

  setDefeat: (reason) => set({ gameStatus: 'DEFEAT', defeatReason: reason }),

  upgradeRebirthStat: (statKey, count = 1) => set((state) => {
    const config = REBIRTH_UPGRADES_CONFIG.find(c => c.id === statKey);
    if (!config) return state;

    const currentLvl = state.rebirthUpgrades ? (state.rebirthUpgrades[statKey] || 0) : 0;
    if (config.maxLevel !== undefined && currentLvl >= config.maxLevel) {
      alert("최대 레벨에 도달했습니다.");
      return state;
    }

    const actualCount = config.maxLevel !== undefined
      ? Math.min(count, config.maxLevel - currentLvl)
      : count;

    const cost = calculateRebirthUpgradeCost(config, currentLvl, actualCount);
    if (state.reincarnationPoints < cost) {
      alert("환생 포인트(RP)가 부족합니다.");
      return state;
    }

    return {
      reincarnationPoints: state.reincarnationPoints - cost,
      rebirthUpgrades: {
        ...state.rebirthUpgrades,
        [statKey]: currentLvl + actualCount,
      }
    };
  }),

  resetRebirthUpgrades: () => set((state) => {
    const totalRefund = calculateTotalSpentRP(state.rebirthUpgrades);
    return {
      reincarnationPoints: state.reincarnationPoints + totalRefund,
      rebirthUpgrades: { ...defaultRebirthUpgrades },
    };
  }),

  upgradeCoreAbility: (abilityKey) => set((state) => {
    const config = CORE_ABILITIES_CONFIG.find(c => c.id === abilityKey);
    if (!config) return state;

    const currentLvl = state.coreAbilities ? (state.coreAbilities[abilityKey] || 0) : 0;
    if (config.maxLevel !== undefined && currentLvl >= config.maxLevel) {
      alert("최대 연구 레벨에 도달했습니다.");
      return state;
    }

    const cost = calculateCoreAbilityCost(config, currentLvl);
    if (state.coreFragments < cost) {
      alert("코어 조각(💎)이 부족합니다.");
      return state;
    }

    return {
      coreFragments: state.coreFragments - cost,
      coreAbilities: {
        ...state.coreAbilities,
        [abilityKey]: currentLvl + 1,
      }
    };
  }),

  resetCoreAbilities: () => set((state) => {
    const totalRefund = calculateTotalSpentCoreFragments(state.coreAbilities);
    return {
      coreFragments: state.coreFragments + totalRefund,
      coreAbilities: { ...defaultCoreAbilities },
    };
  }),

  reincarnate: () => {
    const state = get();
    const computed = getComputedStats(initialStats, state.unlockedSkills, {}, state.rebirthUpgrades);
    const basePoints = calculateReincarnationPoints(state.stage);
    const rpMultiplier = 1 + (computed.modifiers.rpBonusMultiplier || 0);
    const pointsEarned = Math.floor(basePoints * rpMultiplier);
    const startStage = 1;
    const currentRunMax = Math.max(state.maxStage || 1, state.stage);
    const updatedAllTimeMax = Math.max(state.allTimeMaxStage || 1, currentRunMax);

    set({
      ...initialGameState,
      reincarnationPoints: state.reincarnationPoints + pointsEarned,
      coreFragments: state.coreFragments,
      boxFragments: state.boxFragments,
      rebirthUpgrades: state.rebirthUpgrades,
      coreAbilities: state.coreAbilities,
      unlockedSkills: state.unlockedSkills,
      stage: startStage,
      maxStage: startStage,
      allTimeMaxStage: updatedAllTimeMax,
      playerCores: [],
      equippedCore: null,
    });
  },

  spawnEnemy: () => {
    const state = get();
    const now = Date.now();
    const nextStage = state.stage;

    const coreTypes: CoreType[] = ['FIRE', 'WATER', 'WIND', 'ELECTRIC'];
    const coreTypeIndex = (nextStage % 7) % 4;
    const coreType = coreTypes[coreTypeIndex];
    const coreLevel = Math.max(1, Math.floor(nextStage / 10));
    const enemyCore: Core = {
      id: `enemy_core_${nextStage}`,
      name: `${coreType} 코어`,
      type: coreType,
      level: coreLevel,
    };

    const statVal = 3 + Math.floor(0.09 * Math.pow(Math.max(0, nextStage - 1), 1.5));
    const stats = { str: statVal, dex: statVal, con: statVal };

    const enemyComputed = getComputedStats(stats);
    const enemyHp = enemyComputed.maxHealth;

    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs, state.rebirthUpgrades);
    
    // 코어 독립 연구 기능: 💧 물의 코어 - 시작 수호 쉴드
    const waterInitialLvl = (state.coreAbilities?.water_initial_shield || state.coreAbilities?.initialShield || 0);
    let playerInitialShield = 0;
    if (state.equippedCore?.type === 'WATER') {
      const abilityShieldBonus = playerComputed.maxHealth * (waterInitialLvl * 0.025);
      const waterStats = getCoreStats('WATER', state.equippedCore.level, state.unlockedSkills);
      playerInitialShield = abilityShieldBonus + Math.floor(playerComputed.maxHealth * (waterStats.effects.initialShieldMultiplier || 0.1));
    }

    let enemyInitialShield = 0;
    if (enemyCore.type === 'WATER') {
      const waterStats = getCoreStats('WATER', enemyCore.level);
      enemyInitialShield = Math.floor(enemyHp * (waterStats.effects.initialShieldMultiplier || 0));
    }

    const skillGoldMult = 1 + (playerComputed.modifiers.goldMultiplier || 0);
    const skillExpMult = 1 + (playerComputed.modifiers.expMultiplier || 0);

    const goldMult = ((state.activeBuffs['buff_gold_2x'] && state.activeBuffs['buff_gold_2x'] > now) ? 2.0 : 1.0) * skillGoldMult;
    const expMult = ((state.activeBuffs['buff_exp_2x'] && state.activeBuffs['buff_exp_2x'] > now) ? 2.0 : 1.0) * skillExpMult;

    set({
      stage: nextStage,
      maxStage: Math.max(state.maxStage || 1, nextStage),
      allTimeMaxStage: Math.max(state.allTimeMaxStage || 1, state.maxStage || 1, nextStage),
      currentEnemy: {
        id: `enemy-${nextStage}`,
        name: `BOX ${nextStage}`,
        level: nextStage,
        type: 'NORMAL',
        stats: stats,
        maxHealth: enemyHp,
        currentHealth: enemyHp,
        goldReward: Math.floor((10 + (nextStage * 2) + (Math.pow(nextStage, 1.35) * 1.5)) * goldMult),
        expReward: Math.floor((20 + (nextStage * 8) + (Math.pow(nextStage, 1.3) * 2)) * expMult),
        core: enemyCore,
        shield: enemyInitialShield,
      },
      gameStatus: 'BATTLE',
      battleStartTime: Date.now(),
      playerShield: Math.floor(playerInitialShield),
      enemyShield: enemyInitialShield,
      windHitCount: 0,
      hasWindEvasion: false,
      elecHitCount: 0,
      enemyStunEndTime: 0,
      playerStunEndTime: 0,
    });
  },

  attackEnemy: () => set((state) => {
    if (state.gameStatus !== 'BATTLE' || !state.currentEnemy) return state;

    const now = Date.now();
    if (now < state.playerStunEndTime) return state;

    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs, state.rebirthUpgrades);
    const enemyComputed = getComputedStats(state.currentEnemy.stats);

    // 1. 명중/회피 계산 (바람 코어 특화 적용)
    let hitChance = 0.95 + ((playerComputed.accuracy - enemyComputed.evasion) * 0.01);
    if (state.equippedCore?.type === 'WIND') {
      const windStats = getCoreStats('WIND', state.equippedCore.level, state.unlockedSkills);
      const windEvasionLvl = state.coreAbilities?.wind_hit_evasion || 0;
      hitChance += (windStats.effects.hitEvasionBonus || 0) + (windEvasionLvl * 0.005);
    }

    const finalHitChance = Math.max(0.1, Math.min(1.0, hitChance));
    const isEvaded = Math.random() > finalHitChance;

    const hitCount = 1;
    let coreDamage = 0;
    let shieldRecovered = 0;
    let nextPlayerShield = state.playerShield;
    let currentWindHits = state.windHitCount;
    let nextWindEvasion = state.hasWindEvasion;
    let currentElecHits = state.elecHitCount;
    let nextEnemyStunEndTime = state.enemyStunEndTime;

    // 2. 코어별 고유 독립 연구 스킬 계산
    if (state.equippedCore) {
      const coreType = state.equippedCore.type;
      const coreLvl = state.equippedCore.level;

      if (coreType === 'WATER') {
        // 💧 물의 코어: 쉴드 회복 (기본 + 조류의 충전 연구)
        const shieldOnHitLvl = state.coreAbilities?.water_shield_on_hit || state.coreAbilities?.shieldOnHit || 0;
        const waterStats = getCoreStats('WATER', coreLvl, state.unlockedSkills);
        const baseRatio = waterStats.effects.shieldPerHitRatio || 0.02;
        const totalShieldRatio = baseRatio + (shieldOnHitLvl * 0.005);
        shieldRecovered = Math.floor(playerComputed.maxHealth * totalShieldRatio * hitCount);
      } else if (coreType === 'FIRE') {
        // 🔥 불의 코어: 작열의 불꽃, 힘 계수, 화염폭발, 초신성
        const flatDmgLvl = state.coreAbilities?.fire_flat_damage || 0;
        const strRatioLvl = state.coreAbilities?.fire_str_ratio || 0;
        const dmgMultLvl = state.coreAbilities?.fire_damage_multiplier || 0;
        const burnDotLvl = state.coreAbilities?.fire_burn_dot || 0;
        const supernovaLvl = state.coreAbilities?.fire_supernova || 0;

        const fireStats = getCoreStats('FIRE', coreLvl, state.unlockedSkills);
        const strRatio = (fireStats.effects.strRatio || 0.5) + (strRatioLvl * 0.05);
        const baseFlat = (fireStats.effects.baseDamageFlat || 0) + (flatDmgLvl * 6);
        const dmgMultiplier = (1 + (dmgMultLvl * 0.025)) * (1 + (burnDotLvl * 0.03));

        const strBonusDamage = state.player.stats.str * strRatio;
        const baseCoreDmg = (baseFlat + strBonusDamage) * dmgMultiplier;
        const randomMultiplier = 0.85 + Math.random() * 0.3;
        coreDamage = Math.floor(baseCoreDmg * randomMultiplier * hitCount);

        // 초신성 (5타마다 폭발)
        currentWindHits += hitCount; // 타수 카운터 공용 활용
        if (currentWindHits >= 5) {
          const supernovaMult = 1.5 + (supernovaLvl * 0.05);
          coreDamage += Math.floor(playerComputed.attack * supernovaMult);
          currentWindHits = 0;
        }
      } else if (coreType === 'WIND') {
        // 🌪️ 바람의 코어: 태풍의 눈(10타 폭풍 강타) & 잔상 분신(8타 절대 회피)
        const comboBurstLvl = state.coreAbilities?.wind_combo_burst || 0;
        const absoluteEvaLvl = state.coreAbilities?.wind_absolute_evasion || 0;

        currentWindHits += hitCount;
        if (currentWindHits >= 10) {
          const burstMult = 1.5 + (comboBurstLvl * 0.05);
          coreDamage += Math.floor(playerComputed.attack * burstMult);
          currentWindHits = 0;
        }
        if (absoluteEvaLvl > 0 && currentWindHits >= 8) {
          nextWindEvasion = true;
        }
      } else if (coreType === 'ELECTRIC') {
        // ⚡ 번개의 코어: 뇌전 스파크, 감전 기절, 전류 지속, 뇌신 처형, 과부하 방전
        const flatDmgLvl = state.coreAbilities?.electric_flat_damage || 0;
        const stunChanceLvl = state.coreAbilities?.electric_stun_chance || 0;
        const stunDurLvl = state.coreAbilities?.electric_stun_duration || 0;
        const execLvl = state.coreAbilities?.electric_execution_damage || 0;
        const overloadLvl = state.coreAbilities?.electric_chain_overload || 0;

        const baseElecDmg = 10 + (flatDmgLvl * 5);
        coreDamage += baseElecDmg;

        if (now < state.enemyStunEndTime) {
          // 기절 중인 적에게 처형 및 과부하 낙뢰
          const execMult = 0.5 + (execLvl * 0.05);
          const overloadMult = 0.5 + (overloadLvl * 0.03);
          coreDamage += Math.floor(playerComputed.attack * (execMult + overloadMult));
        } else {
          // 기절 확률 체크
          const stunChance = 0.10 + (stunChanceLvl * 0.01);
          currentElecHits += hitCount;
          if (currentElecHits >= 8 || Math.random() < stunChance) {
            const stunDurationMs = Math.floor(1500 + (stunDurLvl * 100));
            nextEnemyStunEndTime = now + stunDurationMs;
            currentElecHits = 0;
          }
        }
      }
    }

    nextPlayerShield = Math.min(playerComputed.maxHealth * 10, nextPlayerShield + shieldRecovered);

    if (isEvaded) {
      return {
        lastDamageDealt: { normal: 0, core: coreDamage, shieldRecovered },
        lastEnemyEvadedTime: now,
        playerShield: nextPlayerShield,
        windHitCount: currentWindHits,
        hasWindEvasion: nextWindEvasion,
        elecHitCount: currentElecHits,
        enemyStunEndTime: nextEnemyStunEndTime,
      };
    }

    // 3. 기본 공격 및 연격(Multi-Hit) 계산
    const baseNormalDamage = Math.floor(Math.max(1, playerComputed.attack - enemyComputed.defense));
    const randomMultiplier = 0.85 + Math.random() * 0.3;

    // 바람 코어 연격 연구
    let multiHitChance = 0;
    let comboDamageBonus = 1.4;
    if (state.equippedCore?.type === 'WIND') {
      const windMultiChanceLvl = state.coreAbilities?.wind_multi_hit_chance || state.coreAbilities?.multiHitMastery || 0;
      const windMultiDmgLvl = state.coreAbilities?.wind_multi_hit_damage || 0;
      multiHitChance = windMultiChanceLvl * 0.015;
      comboDamageBonus = 1.4 + (windMultiDmgLvl * 0.04);
    }

    const isCombo = multiHitChance > 0 && Math.random() < multiHitChance;
    const comboHits = isCombo ? (Math.random() < 0.25 ? 3 : 2) : 1;
    const comboMult = isCombo ? comboDamageBonus : 1.0;

    let normalDamage = Math.floor(baseNormalDamage * randomMultiplier * hitCount * comboHits * comboMult);

    // 물의 코어: 수호 공명 (쉴드 유지 중 피해 증폭)
    if (state.equippedCore?.type === 'WATER' && nextPlayerShield > 0) {
      const shieldBurstLvl = state.coreAbilities?.water_shield_burst || 0;
      normalDamage = Math.floor(normalDamage * (1 + (shieldBurstLvl * 0.02)));
    }

    const totalDamage = normalDamage + coreDamage;

    // 물의 코어: 생명 갈취 (흡혈)
    let leechedHealth = 0;
    if (state.equippedCore?.type === 'WATER') {
      const lifeStealLvl = state.coreAbilities?.water_life_steal || state.coreAbilities?.lifeSteal || 0;
      if (lifeStealLvl > 0) {
        leechedHealth = Math.floor(totalDamage * (lifeStealLvl * 0.005));
      }
    }

    let remainingEnemyShield = state.enemyShield;
    let actualHealthDamage = 0;
    const absorbedByEnemyShield = Math.min(remainingEnemyShield, totalDamage);

    if (remainingEnemyShield >= totalDamage) {
      remainingEnemyShield -= totalDamage;
    } else {
      actualHealthDamage = totalDamage - remainingEnemyShield;
      remainingEnemyShield = 0;
    }

    const newEnemyHealth = Math.max(0, state.currentEnemy.currentHealth - actualHealthDamage);
    const newPlayerHp = Math.min(playerComputed.maxHealth, state.player.currentHealth + leechedHealth);

    if (newEnemyHealth <= 0) {
      const isOneShot = state.currentEnemy.currentHealth === state.currentEnemy.maxHealth;
      const extraLeap = playerComputed.modifiers.oneShotLeapBonus || 0;
      const leapedStages = isOneShot ? (3 + extraLeap) : 1;

      const { expReward, goldReward } = state.currentEnemy;
      const totalExpReward = expReward * leapedStages;
      const totalGoldReward = goldReward * leapedStages;

      // 💎 코어 조각 & 📦 박스 조각 드랍 계산 (전투 승리 시에만 드랍, 오프라인 보상 지급 불가)
      // 기준: 100회 전투(약 100층)당 평균 1개 획득 (기본 드랍률 1.0%), 원샷 3층 도약 시 약 300층당 1개 체감
      const dropBonus = 1 + (playerComputed.modifiers.coreFragmentDropBonus || 0);
      const baseChance = 0.01 * (1 + state.stage / 5000); // 1층: 1%, 1000층: 1.2%, 5000층: 2.0%
      const finalCoreDropChance = Math.min(0.05, baseChance * dropBonus);
      const finalBoxDropChance = Math.min(0.05, baseChance);

      let coreFragmentsGained = 0;
      if (Math.random() < finalCoreDropChance) {
        coreFragmentsGained = 1;
      }

      let boxFragmentsGained = 0;
      if (Math.random() < finalBoxDropChance) {
        boxFragmentsGained = 1;
      }

      let newExp = state.player.experience + totalExpReward;
      const goldGained = totalGoldReward;
      let newLevel = state.player.level;
      let newNextExp = state.player.nextLevelExperience;
      let statPointsGained = 0;

      while (newExp >= newNextExp) {
        newExp -= newNextExp;
        newLevel++;
        newNextExp = getRequiredExpForLevel(newLevel);
        statPointsGained += 3;
      }

      const nextStageNumber = state.stage + leapedStages;

      return {
        currentEnemy: { ...state.currentEnemy, currentHealth: 0 },
        player: {
          ...state.player,
          experience: newExp,
          level: newLevel,
          nextLevelExperience: newNextExp,
          statPoints: state.player.statPoints + statPointsGained,
          gold: state.player.gold + goldGained,
          currentHealth: Math.floor(playerComputed.maxHealth)
        },
        stage: nextStageNumber,
        maxStage: Math.max(state.maxStage || 1, nextStageNumber),
        allTimeMaxStage: Math.max(state.allTimeMaxStage || 1, state.maxStage || 1, nextStageNumber),
        coreFragments: state.coreFragments + coreFragmentsGained,
        boxFragments: (state.boxFragments || 0) + boxFragmentsGained,
        gameStatus: 'VICTORY',
        lastDamageDealt: {
          normal: normalDamage,
          core: coreDamage,
          shieldRecovered,
          absorbedByShield: absorbedByEnemyShield,
          isCombo,
          comboHits,
          isOneShotLeap: isOneShot,
          leapedStages
        },
        lastLeechedHealth: leechedHealth,
        playerShield: nextPlayerShield,
        enemyShield: 0,
        windHitCount: currentWindHits,
        hasWindEvasion: nextWindEvasion,
        elecHitCount: currentElecHits,
        enemyStunEndTime: nextEnemyStunEndTime,
        lastEnemyEvadedTime: 0
      };
    }

    return {
      player: { ...state.player, currentHealth: newPlayerHp },
      currentEnemy: { ...state.currentEnemy, currentHealth: newEnemyHealth },
      lastDamageDealt: { normal: normalDamage, core: coreDamage, shieldRecovered, absorbedByShield: absorbedByEnemyShield, isCombo, comboHits },
      lastLeechedHealth: leechedHealth,
      playerShield: nextPlayerShield,
      enemyShield: remainingEnemyShield,
      windHitCount: currentWindHits,
      hasWindEvasion: nextWindEvasion,
      elecHitCount: currentElecHits,
      enemyStunEndTime: nextEnemyStunEndTime,
      lastEnemyEvadedTime: 0
    };
  }),

  attackPlayer: () => set((state) => {
    if (state.gameStatus !== 'BATTLE' || !state.currentEnemy || state.currentEnemy.currentHealth <= 0) return state;

    const now = Date.now();
    if (now < state.enemyStunEndTime) return state;

    const enemyComputed = getComputedStats(state.currentEnemy.stats);
    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs, state.rebirthUpgrades);

    let hitChance = 0.95 + ((enemyComputed.accuracy - playerComputed.evasion) * 0.01);
    const enemyCore = state.currentEnemy.core;
    if (enemyCore?.type === 'WIND') {
      const enemyCoreStats = getCoreStats(enemyCore.type, enemyCore.level);
      hitChance += (enemyCoreStats.effects.hitEvasionBonus || 0);
    }
    hitChance -= playerComputed.modifiers.evasionChanceBonus;
    if (state.equippedCore?.type === 'WIND') {
      const windStats = getCoreStats('WIND', state.equippedCore.level, state.unlockedSkills);
      const windEvaLvl = state.coreAbilities?.wind_hit_evasion || 0;
      hitChance -= ((windStats.effects.hitEvasionBonus || 0) + (windEvaLvl * 0.005));
    }

    const finalHitChance = Math.max(0.1, Math.min(1.0, hitChance));
    if (state.equippedCore?.type === 'WIND' && state.hasWindEvasion) {
      return { hasWindEvasion: false, lastPlayerEvadedTime: now, lastDamageTaken: { normal: 0, core: 0 } };
    }
    if (Math.random() > finalHitChance) {
      return { lastPlayerEvadedTime: now, lastDamageTaken: { normal: 0, core: 0 } };
    }

    const baseDamage = Math.floor(Math.max(1, enemyComputed.attack - playerComputed.defense));
    const randomMultiplier = 0.85 + Math.random() * 0.3;
    const normalDamage = Math.floor(baseDamage * randomMultiplier);
    let coreDamage = 0;
    let nextPlayerStunEndTime = state.playerStunEndTime;
    let enemyShieldRecovered = 0;
    let nextEnemyShield = state.enemyShield;

    if (enemyCore) {
      const enemyCoreStats = getCoreStats(enemyCore.type, enemyCore.level);
      const effects = enemyCoreStats.effects;
      if (enemyCore.type === 'FIRE' && effects.baseDamageFlat) {
        const strBonus = state.currentEnemy.stats.str * (effects.strRatio || 0.5);
        coreDamage = Math.floor(((effects.baseDamageFlat || 0) + strBonus) * randomMultiplier);
      }
      if (enemyCore.type === 'ELECTRIC' && Math.random() < 0.1) {
        nextPlayerStunEndTime = now + 2000;
      }
      if (enemyCore.type === 'WATER') {
        enemyShieldRecovered = Math.floor(state.currentEnemy.maxHealth * 0.02);
        nextEnemyShield += enemyShieldRecovered;
      }
    }

    const totalDamage = normalDamage + coreDamage;
    let remainingPlayerShield = state.playerShield;
    let actualHealthDamage = 0;
    const absorbedByPlayerShield = Math.min(remainingPlayerShield, totalDamage);

    if (remainingPlayerShield >= totalDamage) {
      remainingPlayerShield -= totalDamage;
    } else {
      actualHealthDamage = totalDamage - remainingPlayerShield;
      remainingPlayerShield = 0;
    }

    const nextHealth = Math.max(0, state.player.currentHealth - actualHealthDamage);
    let enemyNextHealth = state.currentEnemy.currentHealth;
    
    // 코어 연구 기능: 💧 물의 코어 - 해일의 가시 (반사 피해)
    let actualReflectedDmg = 0;
    if (state.equippedCore?.type === 'WATER') {
      const thornsLvl = state.coreAbilities?.water_thorns_reflect || state.coreAbilities?.thornsReflect || 0;
      const reflectPercent = 0.15 + (thornsLvl * 0.02); // 기본 15% + 레벨당 2%
      actualReflectedDmg = Math.floor(totalDamage * reflectPercent);
    }

    if (actualReflectedDmg > 0) {
      enemyNextHealth = Math.max(0, enemyNextHealth - actualReflectedDmg);
    }

    if (nextHealth <= 0) {
      return {
        player: { ...state.player, currentHealth: 0 },
        playerShield: 0,
        gameStatus: 'DEFEAT',
        defeatReason: 'HEALTH',
        lastDamageTaken: { normal: normalDamage, core: coreDamage, absorbedByShield: absorbedByPlayerShield },
        lastReflectedDamage: actualReflectedDmg,
        lastEnemyShieldRecovered: enemyShieldRecovered,
        lastPlayerEvadedTime: 0,
        playerStunEndTime: 0,
      };
    }

    return {
      player: { ...state.player, currentHealth: nextHealth },
      playerShield: remainingPlayerShield,
      enemyShield: nextEnemyShield,
      currentEnemy: { ...state.currentEnemy, currentHealth: enemyNextHealth },
      lastDamageTaken: { normal: normalDamage, core: coreDamage, absorbedByShield: absorbedByPlayerShield },
      lastReflectedDamage: actualReflectedDmg,
      lastEnemyShieldRecovered: enemyShieldRecovered,
      lastPlayerEvadedTime: 0,
      playerStunEndTime: nextPlayerStunEndTime,
    };
  }),

  upgradeCore: (amount = 1) => set((state) => {
    const target = state.equippedCore;
    if (!target) {
      alert("장착된 코어가 없습니다.");
      return {};
    }
    if (amount <= 0) return {};

    let totalCost = 0;
    let actualCount = 0;
    for (let i = 0; i < amount; i++) {
      const stepCost = 100 * (target.level + i);
      if (state.player.gold < totalCost + stepCost) {
        break;
      }
      totalCost += stepCost;
      actualCount++;
    }

    if (actualCount === 0) {
      alert("골드가 부족합니다.");
      return {};
    }

    const upgraded = { ...target, level: target.level + actualCount };
    return {
      player: { ...state.player, gold: state.player.gold - totalCost },
      equippedCore: upgraded
    };
  }),

  distributeStat: (stat, amount) => set((state) => {
    const actualAmount = Math.min(amount, state.player.statPoints);
    if (actualAmount <= 0) return {};
    return {
      player: {
        ...state.player,
        stats: { ...state.player.stats, [stat]: state.player.stats[stat] + actualAmount },
        statPoints: state.player.statPoints - actualAmount
      }
    };
  }),

  resetStats: () => set((state) => ({
    player: {
      ...state.player,
      stats: initialStats,
      statPoints: (state.player.level - 1) * 3 + (state.player.tempStatPoints || 0)
    }
  })),

  levelUp: () => set((state) => ({ player: { ...state.player, level: state.player.level + 1, statPoints: state.player.statPoints + 3 } })),
  resetGame: () => set(getInitialStoreState()),
  selectCore: (coreType: CoreType) => set((state) => {
    if (state.equippedCore) {
      alert("이번 회차에서는 이미 코어를 선택했습니다. 코어 변경은 환생 후에만 가능합니다.");
      return {};
    }
    const CORE_NAMES: Record<CoreType, string> = {
      FIRE: '불의 코어',
      WATER: '물의 코어',
      WIND: '바람의 코어',
      ELECTRIC: '번개의 코어',
    };
    const newCore: Core = {
      id: `core_${coreType.toLowerCase()}`,
      name: CORE_NAMES[coreType] || `${coreType} 코어`,
      type: coreType,
      level: 1,
    };
    return {
      equippedCore: newCore,
      playerCores: [newCore],
    };
  }),
  acquireCore: (core) => set((state) => ({ playerCores: [...state.playerCores, { ...core, id: `${core.id}_${Date.now()}` }] })),
  equipCore: (coreId) => set((state) => {
    if (state.equippedCore) {
      alert("이번 회차에서는 이미 코어를 장착했습니다. 코어 교체는 환생 후에만 가능합니다.");
      return {};
    }
    const target = state.playerCores.find(c => c.id === coreId);
    if (!target) return {};
    const newInventory = state.playerCores.filter(c => c.id !== coreId);
    return { playerCores: newInventory, equippedCore: target };
  }),
  unequipCore: () => set((state) => {
    if (state.equippedCore) {
      return { playerCores: [...state.playerCores, state.equippedCore], equippedCore: null };
    }
    return {};
  }),

  calculateOfflineRewards: () => {
    const s = get();
    const diff = Date.now() - (s.lastOnlineTime || Date.now());
    const rawMinutes = Math.floor(diff / 60000);
    if (rawMinutes < 1) return { gold: 0, exp: 0, minutes: 0, levelsGained: 0 };

    const minutes = Math.min(rawMinutes, 720);
    const computed = getComputedStats(s.player.stats, s.unlockedSkills, s.activeBuffs, s.rebirthUpgrades);
    const bonusMultiplier = 1 + computed.modifiers.offlineRewardMultiplier;

    const baseEnemyExp = Math.floor(20 + (s.stage * 8) + (Math.pow(s.stage, 1.3) * 2));
    const baseEnemyGold = Math.floor(10 + (s.stage * 2) + (Math.pow(s.stage, 1.35) * 1.5));

    const g = Math.floor((baseEnemyGold * 8 / 60) * minutes * 60 * bonusMultiplier);
    const e = Math.floor((baseEnemyExp * 8 / 60) * minutes * 60 * bonusMultiplier);

    let newLevel = s.player.level;
    let newExp = s.player.experience + e;
    let newNextExp = s.player.nextLevelExperience || getRequiredExpForLevel(newLevel);
    let levelsGained = 0;

    while (newExp >= newNextExp) {
      newExp -= newNextExp;
      newLevel++;
      levelsGained++;
      newNextExp = getRequiredExpForLevel(newLevel);
    }

    return { gold: g, exp: e, minutes, levelsGained };
  },

  claimOfflineRewards: () => {
    const s = get();
    const rewards = s.calculateOfflineRewards();
    if (rewards.minutes < 1) return rewards;

    let newLevel = s.player.level;
    let newExp = s.player.experience + rewards.exp;
    let newNextExp = s.player.nextLevelExperience || getRequiredExpForLevel(newLevel);
    let statPointsGained = 0;

    while (newExp >= newNextExp) {
      newExp -= newNextExp;
      newLevel++;
      newNextExp = getRequiredExpForLevel(newLevel);
      statPointsGained += 3;
    }

    set({
      player: {
        ...s.player,
        gold: s.player.gold + rewards.gold,
        level: newLevel,
        experience: newExp,
        nextLevelExperience: newNextExp,
        statPoints: s.player.statPoints + statPointsGained,
      },
      lastOnlineTime: Date.now()
    });

    return rewards;
  },

  retryCurrentFloor: () => set((state) => {
    const computed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs, state.rebirthUpgrades);
    return {
      player: { ...state.player, currentHealth: Math.floor(computed.maxHealth) },
      currentEnemy: null,
      stage: Math.max(1, state.stage - 10),
      gameStatus: 'IDLE'
    };
  }),

  spendGold: (amount) => set((state) => ({ player: { ...state.player, gold: Math.max(0, state.player.gold - amount) } })),
  removeCore: (coreId) => set((state) => ({ playerCores: state.playerCores.filter(c => c.id !== coreId), equippedCore: state.equippedCore?.id === coreId ? null : state.equippedCore })),
  canClaimRewards: () => (Date.now() - (get().lastOnlineTime || Date.now())) >= 60000,
  
  unlockSkill: (_skillId) => set((state) => {
    void _skillId;
    return state;
  }),
  resetSkills: () => set((state) => state),

  buyShopItem: (item) => set((state) => {
    if (state.player.gold < item.cost) {
      alert("골드가 부족합니다.");
      return state;
    }

    const newGold = state.player.gold - item.cost;

    if (item.type === 'TEMP_STAT') {
      return {
        player: {
          ...state.player,
          gold: newGold,
          statPoints: state.player.statPoints + item.effect.value,
          tempStatPoints: (state.player.tempStatPoints || 0) + item.effect.value
        }
      };
    } else if (item.type === 'TIMED_BUFF') {
      const durationMs = (item.duration || 0) * 1000;
      const now = Date.now();
      const currentEndTime = (state.activeBuffs[item.id] && state.activeBuffs[item.id] > now)
          ? state.activeBuffs[item.id]
          : now;

      return {
        player: { ...state.player, gold: newGold },
        activeBuffs: {
          ...state.activeBuffs,
          [item.id]: currentEndTime + durationMs
        }
      };
    }
    return state;
  }),
}));

useGameStore.subscribe((state) => {
  const gameState = Object.fromEntries(
      Object.entries(state).filter(([, value]) => typeof value !== 'function')
  );
  saveStateToLocalStorage(gameState as unknown as GameState);
});
