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
import type { PvpProfile, PvpBattleLog } from '../types/pvp';
import { loadStateFromLocalStorage, saveStateToLocalStorage } from './utils/localStorage';
import {
  REBIRTH_UPGRADES_CONFIG,
  CORE_ABILITIES_CONFIG,
  calculateRebirthUpgradeCost,
  calculateCoreAbilityCost,
  calculateTotalSpentRP,
  calculateTotalSpentCoreFragments,
  canUnlockCoreAbility,
  getEnemyCoreTier,
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

export const calculateSuccessfulHits = (attemptHits: number, hitChance: number): number => {
  const safeChance = Math.max(0.1, Math.min(1.0, hitChance));
  if (attemptHits <= 0) return 0;
  if (attemptHits <= 50) {
    let count = 0;
    for (let i = 0; i < attemptHits; i++) {
      if (Math.random() < safeChance) count++;
    }
    return count;
  }
  // 대량 타수 통계 근사 (이항 분포 정규 근사)
  const mean = attemptHits * safeChance;
  const variance = attemptHits * safeChance * (1 - safeChance);
  const stdDev = Math.sqrt(Math.max(0.0001, variance));
  const u1 = Math.max(1e-6, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const hits = Math.round(mean + z * stdDev);
  return Math.max(0, Math.min(attemptHits, hits));
};

export const getCoreStats = (type: CoreType, level: number, _unlockedSkills?: string[]): CoreStats => {
  void _unlockedSkills;
  const coreLevel = level > 0 ? level : 1;
  const finalEffects: CoreEffect = {};

  switch (type) {
    case 'FIRE': finalEffects.baseDamageFlat = 1 + (coreLevel * 0.5); break;
    case 'WATER': finalEffects.initialShieldMultiplier = 0.05 + (coreLevel * 0.005); break;
    case 'WIND': finalEffects.hitEvasionBonus = 0.015 + (coreLevel * 0.001); break;
    case 'ELECTRIC': finalEffects.baseDamageFlat = 2 + (coreLevel * 0.3); break;
  }

  let description = '';
  if (type === 'FIRE') {
    description = `기본 화염 피해: +${finalEffects.baseDamageFlat?.toFixed(1) || 0}`;
  } else if (type === 'WATER') {
    description = `시작 쉴드: 최대 체력의 +${((finalEffects.initialShieldMultiplier || 0) * 100).toFixed(1)}%`;
  } else if (type === 'WIND') {
    description = `명중/회피 보너스: +${((finalEffects.hitEvasionBonus || 0) * 100).toFixed(1)}%`;
  } else if (type === 'ELECTRIC') {
    description = `기본 번개 피해: +${finalEffects.baseDamageFlat?.toFixed(1) || 0}`;
  }

  return { desc: description, effects: finalEffects };
};

export const calculateCombatPower = (
  stats: Stats,
  equippedCore: { type: CoreType; level: number } | null,
  rebirthUpgrades: RebirthUpgrades,
  unlockedSkills: string[] = []
): number => {
  const computed = getComputedStats(stats, unlockedSkills, {}, rebirthUpgrades);
  const coreBonus = equippedCore ? equippedCore.level * 150 : 0;
  const attackSpeedFactor = Math.sqrt(Math.max(1, computed.attackSpeed));
  const power = Math.floor(
    (computed.attack * 2.2 * attackSpeedFactor) +
    computed.defense * 2.8 +
    computed.maxHealth * 0.5 +
    (computed.finalStr + computed.finalDex + computed.finalCon) * 3.5 +
    coreBonus
  );
  return Math.max(100, power);
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
  buyShopItem: (item: ShopItem, count?: number) => void;
  setDefeat: (reason: DefeatReason) => void;
  upgradeRebirthStat: (statKey: keyof RebirthUpgrades, count?: number) => void;
  resetRebirthUpgrades: () => void;
  upgradeCoreAbility: (abilityKey: keyof CoreAbilityLevels) => void;
  resetCoreAbilities: () => void;
  incrementBattleTurn: () => void;
  // [PVP]
  setPlayerName: (name: string) => void;
  savePvpSnapshot: () => PvpProfile;
  recordPvpResult: (
    win: boolean,
    ratingChange: number,
    opponentName: string,
    opponentLevel: number
  ) => void;
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

  // 민첩(DEX) 기반 상한선 없는 무한 연격(공속) 공식: 1.0 + 0.15 * (DEX^0.55)
  const attackSpeed = Number((1.0 + 0.15 * Math.pow(Math.max(0, finalDex), 0.55)).toFixed(2));

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
    attackSpeed,
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
  battleTurn: 1,
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
  playerName: '박스슬레이어',
  pvpSnapshot: null,
  pvpRating: 1000,
  pvpWins: 0,
  pvpLosses: 0,
  pvpBattleLogs: [],
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

  incrementBattleTurn: () => set((state) => ({ battleTurn: (state.battleTurn || 1) + 1 })),

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

    const unlockCheck = canUnlockCoreAbility(config, state.coreAbilities);
    if (!unlockCheck.canUnlock) {
      alert(unlockCheck.reason || "선행 연구를 먼저 해금해야 합니다.");
      return state;
    }

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
    const enemyTier = getEnemyCoreTier(nextStage);

    const statVal = 3 + Math.floor(0.09 * Math.pow(Math.max(0, nextStage - 1), 1.5));
    const stats = { str: statVal, dex: statVal, con: statVal };
    const enemyComputed = getComputedStats(stats);
    const enemyHp = enemyComputed.maxHealth;

    const coreTypes: CoreType[] = ['FIRE', 'WATER', 'WIND', 'ELECTRIC'];
    const coreTypeIndex = Math.floor((Math.max(1, nextStage) - 1) / 5) % coreTypes.length;
    const coreType = coreTypes[coreTypeIndex];
    const coreLevel = Math.max(1, Math.floor(nextStage / 10)); // 10층당 1코어레벨

    const enemyCore: Core = {
      id: `enemy_core_${nextStage}`,
      name: `${coreType} 코어`,
      type: coreType,
      level: coreLevel,
    };

    let enemyInitialShield = 0;
    // 💧 물 코어: 1층부터 기본 수호 쉴드(최대체력의 5%) 보유
    if (enemyCore.type === 'WATER') {
      const waterStats = getCoreStats('WATER', enemyCore.level);
      const shieldBonus = enemyTier >= 1 ? 0.02 : 0; // Tier 1 이상 시 쉴드 확장
      enemyInitialShield = Math.floor(enemyHp * ((waterStats.effects.initialShieldMultiplier || 0.05) + shieldBonus));
    }

    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs, state.rebirthUpgrades);
    
    // 코어 독립 연구 기능: 💧 물의 코어 - 시작 수호 쉴드 (기본 소량 + 연구 해금 시 추가)
    const waterInitialLvl = (state.coreAbilities?.water_initial_shield || 0);
    let playerInitialShield = 0;
    if (state.equippedCore?.type === 'WATER') {
      const waterStats = getCoreStats('WATER', state.equippedCore.level, state.unlockedSkills);
      const baseInitialShield = Math.floor(playerComputed.maxHealth * (waterStats.effects.initialShieldMultiplier || 0.05));
      const abilityShieldBonus = Math.floor(playerComputed.maxHealth * (waterInitialLvl * 0.02));
      playerInitialShield = baseInitialShield + abilityShieldBonus;
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
        goldReward: Math.floor((30 + (nextStage * 6) + (Math.pow(nextStage, 1.4) * 3.5)) * goldMult),
        expReward: Math.floor((50 + (nextStage * 18) + (Math.pow(nextStage, 1.35) * 4.5)) * expMult),
        core: enemyCore,
        shield: enemyInitialShield,
      },
      gameStatus: 'BATTLE',
      battleStartTime: Date.now(),
      battleTurn: 1,
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
    if (state.gameStatus !== 'BATTLE' || !state.currentEnemy || state.currentEnemy.currentHealth <= 0) return state;

    const now = Date.now();
    if (now < state.playerStunEndTime) return state;

    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs, state.rebirthUpgrades);
    const enemyComputed = getComputedStats(state.currentEnemy.stats);

    // 1. 공속 및 가상 연격(Multi-Hit) 타수 산출 (DEX 기반 무한 스케일링 + 바람 코어 증폭)
    let windSpeedBonus = 1.0;
    if (state.equippedCore?.type === 'WIND') {
      const windMultiChanceLvl = state.coreAbilities?.wind_multi_hit_chance || 0;
      const windMultiDmgLvl = state.coreAbilities?.wind_multi_hit_damage || 0;
      windSpeedBonus = 1.0 + (state.equippedCore.level * 0.02) + (windMultiChanceLvl * 0.03) + (windMultiDmgLvl * 0.02);
    }
    const effectiveAttackSpeed = Number((playerComputed.attackSpeed * windSpeedBonus).toFixed(2));
    const floorHits = Math.max(1, Math.floor(effectiveAttackSpeed));
    const extraChance = effectiveAttackSpeed - floorHits;
    const attemptHits = floorHits + (Math.random() < extraChance ? 1 : 0);

    // 2. 명중/회피 계산 및 성공 유효 타수 산출
    let hitChance = 0.95 + ((playerComputed.accuracy - enemyComputed.evasion) * 0.01);
    if (state.equippedCore?.type === 'WIND') {
      const windStats = getCoreStats('WIND', state.equippedCore.level, state.unlockedSkills);
      const windEvasionLvl = state.coreAbilities?.wind_hit_evasion || 0;
      hitChance += (windStats.effects.hitEvasionBonus || 0) + (windEvasionLvl * 0.005);
    }
    const enemyTier = getEnemyCoreTier(state.stage);
    const enemyCore = state.currentEnemy.core;
    if (enemyCore?.type === 'WIND' && enemyTier >= 1) {
      hitChance -= (0.015 + (enemyCore.level * 0.001));
    }

    const finalHitChance = Math.max(0.1, Math.min(1.0, hitChance));
    const successfulHits = calculateSuccessfulHits(attemptHits, finalHitChance);
    const isEvaded = successfulHits === 0;

    let coreDamage = 0;
    let shieldRecovered = 0;
    let nextPlayerShield = state.playerShield;
    let currentWindHits = state.windHitCount;
    let nextWindEvasion = state.hasWindEvasion;
    let currentElecHits = state.elecHitCount;
    let nextEnemyStunEndTime = state.enemyStunEndTime;

    // 3. 코어 발동 (절대 독립 발동: 일반 공격 미스/회피에 영향받지 않고 100% 무조건 발동 + 공속 배수 스케일링)
    if (state.equippedCore) {
      const coreType = state.equippedCore.type;
      const coreLvl = state.equippedCore.level;

      if (coreType === 'WATER') {
        // 💧 물의 코어: 타격 쉴드 충전 (연구 해금 시 쉴드 회복도 공속 배수만큼 증폭)
        const shieldOnHitLvl = state.coreAbilities?.water_shield_on_hit || 0;
        if (shieldOnHitLvl > 0) {
          shieldRecovered = Math.floor(playerComputed.maxHealth * (shieldOnHitLvl * 0.004) * effectiveAttackSpeed);
        }
      } else if (coreType === 'FIRE') {
        // 🔥 불의 코어: 기본 화염 피해 + 연구(작열/STR계수/지속화상/화염폭발) * 공속 배수 스케일링
        const flatDmgLvl = state.coreAbilities?.fire_flat_damage || 0;
        const strRatioLvl = state.coreAbilities?.fire_str_ratio || 0;
        const burnDotLvl = state.coreAbilities?.fire_burn_dot || 0;
        const dmgMultLvl = state.coreAbilities?.fire_damage_multiplier || 0;
        const supernovaLvl = state.coreAbilities?.fire_supernova || 0;

        const baseFlat = (1 + (coreLvl * 0.5)) + (flatDmgLvl * 4);
        const strBonusDamage = strRatioLvl > 0 ? (state.player.stats.str * (strRatioLvl * 0.04)) : 0;
        const dmgMultiplier = (1 + (dmgMultLvl * 0.025)) * (1 + (burnDotLvl * 0.025));

        const baseCoreDmg = (baseFlat + strBonusDamage) * dmgMultiplier;
        const randomMultiplier = 0.85 + Math.random() * 0.3;
        coreDamage = Math.floor(baseCoreDmg * randomMultiplier * effectiveAttackSpeed);

        // 초신성 폭발 (5타 주기) - 해금 시 발동
        if (supernovaLvl > 0) {
          currentWindHits += attemptHits;
          if (currentWindHits >= 5) {
            const supernovaMult = 1.5 + (supernovaLvl * 0.05);
            coreDamage += Math.floor(playerComputed.attack * supernovaMult * Math.sqrt(effectiveAttackSpeed));
            currentWindHits = 0;
          }
        }
      } else if (coreType === 'WIND') {
        // 🌪️ 바람의 코어: 태풍의 눈(10타 폭풍 강타) & 잔상 분신(8타 절대 회피)
        const comboBurstLvl = state.coreAbilities?.wind_combo_burst || 0;
        const absoluteEvaLvl = state.coreAbilities?.wind_absolute_evasion || 0;

        if (comboBurstLvl > 0 || absoluteEvaLvl > 0) {
          currentWindHits += attemptHits;
          if (comboBurstLvl > 0 && currentWindHits >= 10) {
            const burstMult = 1.5 + (comboBurstLvl * 0.05);
            coreDamage += Math.floor(playerComputed.attack * burstMult * Math.sqrt(effectiveAttackSpeed));
            currentWindHits = 0;
          }
          if (absoluteEvaLvl > 0 && currentWindHits >= 8) {
            nextWindEvasion = true;
          }
        }
      } else if (coreType === 'ELECTRIC') {
        // ⚡ 번개의 코어: 뇌전 스파크(기본관통+연구) * 공속 배수 스케일링, 감전기절, 뇌신처형
        const flatDmgLvl = state.coreAbilities?.electric_flat_damage || 0;
        const stunChanceLvl = state.coreAbilities?.electric_stun_chance || 0;
        const stunDurLvl = state.coreAbilities?.electric_stun_duration || 0;
        const execLvl = state.coreAbilities?.electric_execution_damage || 0;
        const overloadLvl = state.coreAbilities?.electric_chain_overload || 0;

        const baseElecDmg = ((2 + (coreLvl * 0.3)) + (flatDmgLvl * 3)) * effectiveAttackSpeed;
        coreDamage += Math.floor(baseElecDmg);

        if (stunChanceLvl > 0) {
          if (now < state.enemyStunEndTime) {
            const execMult = execLvl > 0 ? (0.3 + (execLvl * 0.05)) : 0;
            const overloadMult = overloadLvl > 0 ? (0.4 + (overloadLvl * 0.03)) : 0;
            if (execMult > 0 || overloadMult > 0) {
              coreDamage += Math.floor(playerComputed.attack * (execMult + overloadMult) * Math.sqrt(effectiveAttackSpeed));
            }
          } else {
            const stunChance = Math.min(0.5, stunChanceLvl * 0.01 * (1 + attemptHits * 0.02));
            currentElecHits += attemptHits;
            if (currentElecHits >= 10 || Math.random() < stunChance) {
              const stunDurationMs = Math.floor(1200 + (stunDurLvl * 100));
              nextEnemyStunEndTime = now + stunDurationMs;
              currentElecHits = 0;
            }
          }
        }
      }
    }

    nextPlayerShield = Math.min(playerComputed.maxHealth * 10, nextPlayerShield + shieldRecovered);

    // 4. 기본 물리 공격 데미지 계산 (유효 타수 * 타수당 데미지)
    let normalDamage = 0;
    if (!isEvaded) {
      const baseOneHitDamage = Math.floor(Math.max(1, playerComputed.attack - enemyComputed.defense));
      const randomMultiplier = 0.85 + Math.random() * 0.3;
      normalDamage = Math.floor(baseOneHitDamage * randomMultiplier * successfulHits);

      // 물의 코어: 수호 공명 (연구 해금 시 쉴드 유지 중 피해 증폭)
      if (state.equippedCore?.type === 'WATER' && nextPlayerShield > 0) {
        const shieldBurstLvl = state.coreAbilities?.water_shield_burst || 0;
        if (shieldBurstLvl > 0) {
          normalDamage = Math.floor(normalDamage * (1 + (shieldBurstLvl * 0.02)));
        }
      }
    }

    const totalDamage = normalDamage + coreDamage;

    // 물의 코어: 생명 갈취 (연구 해금 시 흡혈 - 코어 피해 포함 총 데미지 기준 발동)
    let leechedHealth = 0;
    if (state.equippedCore?.type === 'WATER') {
      const lifeStealLvl = state.coreAbilities?.water_life_steal || 0;
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

      // 💎 코어 조각 & 📦 박스 조각 드랍 계산
      const dropBonus = 1 + (playerComputed.modifiers.coreFragmentDropBonus || 0);
      const baseChance = 0.01 * (1 + state.stage / 5000);
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
        gameStatus: 'VICTORY',
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
        enemyShield: 0,
        playerShield: nextPlayerShield,
        windHitCount: currentWindHits,
        hasWindEvasion: nextWindEvasion,
        elecHitCount: currentElecHits,
        enemyStunEndTime: nextEnemyStunEndTime,
        lastEnemyEvadedTime: isEvaded ? now : 0,
        lastLeechedHealth: leechedHealth,
        lastDamageDealt: {
          normal: normalDamage,
          core: coreDamage,
          shieldRecovered,
          absorbedByShield: absorbedByEnemyShield,
          isCombo: attemptHits > 1,
          comboHits: successfulHits,
          attemptHits,
          successfulHits,
          attackSpeed: effectiveAttackSpeed,
          isOneShotLeap: isOneShot,
          leapedStages,
          attackStage: state.stage,
          turn: state.battleTurn || 1
        }
      };
    }

    return {
      currentEnemy: {
        ...state.currentEnemy,
        currentHealth: newEnemyHealth
      },
      player: {
        ...state.player,
        currentHealth: newPlayerHp
      },
      enemyShield: remainingEnemyShield,
      playerShield: nextPlayerShield,
      windHitCount: currentWindHits,
      hasWindEvasion: nextWindEvasion,
      elecHitCount: currentElecHits,
      enemyStunEndTime: nextEnemyStunEndTime,
      lastEnemyEvadedTime: isEvaded ? now : 0,
      lastLeechedHealth: leechedHealth,
      lastDamageDealt: {
        normal: normalDamage,
        core: coreDamage,
        shieldRecovered,
        absorbedByShield: absorbedByEnemyShield,
        isCombo: attemptHits > 1,
        comboHits: successfulHits,
        attemptHits,
        successfulHits,
        attackSpeed: effectiveAttackSpeed,
        attackStage: state.stage,
        turn: state.battleTurn || 1
      }
    };
  }),

  attackPlayer: () => set((state) => {
    if (state.gameStatus !== 'BATTLE' || !state.currentEnemy || state.currentEnemy.currentHealth <= 0) return state;

    const now = Date.now();
    if (now < state.enemyStunEndTime) return state;

    const enemyComputed = getComputedStats(state.currentEnemy.stats);
    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs, state.rebirthUpgrades);

    const enemyTier = getEnemyCoreTier(state.stage);
    const enemyCore = state.currentEnemy.core;

    // 1. 적 공속 및 연격(Multi-Hit) 타수 산출 (DEX 기반)
    const enemyWindBonus = enemyCore?.type === 'WIND' ? (1 + (enemyCore.level * 0.02) + (enemyTier >= 1 ? 0.2 : 0)) : 1.0;
    const effectiveEnemySpeed = Number((enemyComputed.attackSpeed * enemyWindBonus).toFixed(2));
    const floorEnemyHits = Math.max(1, Math.floor(effectiveEnemySpeed));
    const extraEnemyChance = effectiveEnemySpeed - floorEnemyHits;
    const enemyAttemptHits = floorEnemyHits + (Math.random() < extraEnemyChance ? 1 : 0);

    // 2. 적 명중률 및 성공 유효 타수
    let hitChance = 0.95 + ((enemyComputed.accuracy - playerComputed.evasion) * 0.01);
    if (enemyCore?.type === 'WIND') {
      const windBonus = 0.015 + (enemyCore.level * 0.001) + (enemyTier >= 1 ? 0.005 : 0);
      hitChance += windBonus;
    }
    hitChance -= playerComputed.modifiers.evasionChanceBonus;
    if (state.equippedCore?.type === 'WIND') {
      const windStats = getCoreStats('WIND', state.equippedCore.level, state.unlockedSkills);
      const windEvaLvl = state.coreAbilities?.wind_hit_evasion || 0;
      hitChance -= ((windStats.effects.hitEvasionBonus || 0) + (windEvaLvl * 0.005));
    }

    const finalHitChance = Math.max(0.1, Math.min(1.0, hitChance));
    let isPlayerEvaded: boolean;
    let enemySuccessfulHits: number;
    let nextHasWindEvasion = state.hasWindEvasion;

    if (state.equippedCore?.type === 'WIND' && state.hasWindEvasion) {
      nextHasWindEvasion = false;
      isPlayerEvaded = true;
      enemySuccessfulHits = 0;
    } else {
      enemySuccessfulHits = calculateSuccessfulHits(enemyAttemptHits, finalHitChance);
      isPlayerEvaded = enemySuccessfulHits === 0;
    }

    // 3. 적 일반 물리 공격 데미지
    let normalDamage = 0;
    if (!isPlayerEvaded) {
      const baseDamage = Math.floor(Math.max(1, enemyComputed.attack - playerComputed.defense));
      const randomMultiplier = 0.85 + Math.random() * 0.3;
      normalDamage = Math.floor(baseDamage * randomMultiplier * enemySuccessfulHits);
    }

    const randomMultiplier = 0.85 + Math.random() * 0.3;
    let coreDamage = 0;
    let nextPlayerStunEndTime = state.playerStunEndTime;
    let enemyShieldRecovered = 0;
    let nextEnemyShield = state.enemyShield;

    // 4. 적 코어 절대 발동 (공속 배수 스케일링)
    if (enemyCore) {
      if (enemyCore.type === 'FIRE') {
        const baseFlat = enemyTier >= 1 ? (1 + (enemyCore.level * 0.5)) : 1;
        const strBonus = enemyTier >= 2 ? (state.currentEnemy.stats.str * 0.04) : 0;
        const burnMult = enemyTier >= 3 ? 1.25 : 1.0;
        const fireMult = enemyTier >= 4 ? 1.25 : 1.0;

        coreDamage = Math.floor((baseFlat + strBonus) * burnMult * fireMult * randomMultiplier * effectiveEnemySpeed);
      } else if (enemyCore.type === 'ELECTRIC') {
        const baseElecFlat = enemyTier >= 1 ? (2 + (enemyCore.level * 0.3)) : 2;
        coreDamage = Math.floor(baseElecFlat * randomMultiplier * effectiveEnemySpeed);

        if (enemyTier >= 2 && Math.random() < 0.08) {
          const stunDuration = enemyTier >= 3 ? 1500 : 1200;
          nextPlayerStunEndTime = now + stunDuration;
        }

        if (enemyTier >= 4 && now < state.playerStunEndTime) {
          const execBonus = Math.floor(enemyComputed.attack * 0.3 * Math.sqrt(effectiveEnemySpeed));
          coreDamage += execBonus;
        }
      } else if (enemyCore.type === 'WATER') {
        if (enemyTier >= 2) {
          enemyShieldRecovered = Math.floor(state.currentEnemy.maxHealth * 0.004 * effectiveEnemySpeed);
          nextEnemyShield += enemyShieldRecovered;
        }
        if (enemyTier >= 5 && nextEnemyShield > 0) {
          normalDamage = Math.floor(normalDamage * 1.2);
        }
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
    
    // 코어 연구 기능: 💧 물의 코어 - 가시 반사 (연구 해금 시에만 피해 반사 활성화)
    let actualReflectedDmg = 0;
    if (state.equippedCore?.type === 'WATER') {
      const thornsLvl = state.coreAbilities?.water_thorns_reflect || 0;
      if (thornsLvl > 0) {
        const reflectPercent = thornsLvl * 0.02; // 레벨당 2% 반사
        actualReflectedDmg = Math.floor(totalDamage * reflectPercent);
      }
    }

    if (actualReflectedDmg > 0) {
      enemyNextHealth = Math.max(0, enemyNextHealth - actualReflectedDmg);
    }

    // 💧 물의 코어: Tier 3 (10,000층+) 생명 갈취 (1% 흡혈)
    if (enemyCore?.type === 'WATER' && enemyTier >= 3) {
      const enemyLeeched = Math.floor(totalDamage * 0.01);
      enemyNextHealth = Math.min(state.currentEnemy.maxHealth, enemyNextHealth + enemyLeeched);
    }

    if (nextHealth <= 0) {
      return {
        player: { ...state.player, currentHealth: 0 },
        playerShield: 0,
        gameStatus: 'DEFEAT',
        defeatReason: 'HEALTH',
        lastDamageTaken: {
          normal: normalDamage,
          core: coreDamage,
          absorbedByShield: absorbedByPlayerShield,
          attemptHits: enemyAttemptHits,
          successfulHits: enemySuccessfulHits,
          comboHits: enemySuccessfulHits,
          attackSpeed: effectiveEnemySpeed,
          attackStage: state.stage,
          turn: state.battleTurn || 1
        },
        lastReflectedDamage: actualReflectedDmg,
        lastEnemyShieldRecovered: enemyShieldRecovered,
        lastPlayerEvadedTime: isPlayerEvaded ? now : 0,
        hasWindEvasion: nextHasWindEvasion,
        playerStunEndTime: 0,
      };
    }

    if (enemyNextHealth <= 0) {
      const { expReward, goldReward } = state.currentEnemy;
      let newExp = state.player.experience + expReward;
      let newLevel = state.player.level;
      let newNextExp = state.player.nextLevelExperience;
      let statPointsGained = 0;

      while (newExp >= newNextExp) {
        newExp -= newNextExp;
        newLevel++;
        newNextExp = getRequiredExpForLevel(newLevel);
        statPointsGained += 3;
      }

      const nextStageNumber = state.stage + 1;

      return {
        gameStatus: 'VICTORY',
        currentEnemy: { ...state.currentEnemy, currentHealth: 0 },
        player: {
          ...state.player,
          experience: newExp,
          level: newLevel,
          nextLevelExperience: newNextExp,
          statPoints: state.player.statPoints + statPointsGained,
          gold: state.player.gold + goldReward,
          currentHealth: nextHealth,
        },
        stage: nextStageNumber,
        maxStage: Math.max(state.maxStage || 1, nextStageNumber),
        allTimeMaxStage: Math.max(state.allTimeMaxStage || 1, state.maxStage || 1, nextStageNumber),
        playerShield: remainingPlayerShield,
        enemyShield: 0,
        lastDamageTaken: {
          normal: normalDamage,
          core: coreDamage,
          absorbedByShield: absorbedByPlayerShield,
          attemptHits: enemyAttemptHits,
          successfulHits: enemySuccessfulHits,
          comboHits: enemySuccessfulHits,
          attackSpeed: effectiveEnemySpeed,
          attackStage: state.stage,
          turn: state.battleTurn || 1
        },
        lastReflectedDamage: actualReflectedDmg,
        lastEnemyShieldRecovered: enemyShieldRecovered,
        lastPlayerEvadedTime: isPlayerEvaded ? now : 0,
        hasWindEvasion: nextHasWindEvasion,
        playerStunEndTime: 0,
      };
    }

    return {
      player: { ...state.player, currentHealth: nextHealth },
      playerShield: remainingPlayerShield,
      enemyShield: nextEnemyShield,
      currentEnemy: { ...state.currentEnemy, currentHealth: enemyNextHealth },
      lastDamageTaken: {
        normal: normalDamage,
        core: coreDamage,
        absorbedByShield: absorbedByPlayerShield,
        attemptHits: enemyAttemptHits,
        successfulHits: enemySuccessfulHits,
        comboHits: enemySuccessfulHits,
        attackSpeed: effectiveEnemySpeed,
        attackStage: state.stage,
        turn: state.battleTurn || 1
      },
      lastReflectedDamage: actualReflectedDmg,
      lastEnemyShieldRecovered: enemyShieldRecovered,
      lastPlayerEvadedTime: isPlayerEvaded ? now : 0,
      hasWindEvasion: nextHasWindEvasion,
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

    const baseEnemyExp = Math.floor(50 + (s.stage * 18) + (Math.pow(s.stage, 1.35) * 4.5));
    const baseEnemyGold = Math.floor(30 + (s.stage * 6) + (Math.pow(s.stage, 1.4) * 3.5));

    // 오프라인 방치 파밍 속도: 분당 2.0마리 (온라인 실시간 전투 대비 약 25~35% 효율로 조정하여 실제 전투 플레이 메리트 대폭 강화)
    const killsPerMinute = 2.0;
    const g = Math.floor(baseEnemyGold * killsPerMinute * minutes * bonusMultiplier);
    const e = Math.floor(baseEnemyExp * killsPerMinute * minutes * bonusMultiplier);

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

  buyShopItem: (item, count = 1) => set((state) => {
    if (count <= 0) return state;
    const maxAffordable = Math.floor(state.player.gold / item.cost);
    const actualCount = Math.min(count, maxAffordable);
    if (actualCount <= 0) {
      if (count === 1) {
        alert("골드가 부족합니다.");
      }
      return state;
    }

    const totalCost = item.cost * actualCount;
    const newGold = state.player.gold - totalCost;

    if (item.type === 'TIMED_BUFF') {
      const durationMs = (item.duration || 0) * 1000 * actualCount;
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

  setPlayerName: (name: string) => {
    const trimmed = name.trim().slice(0, 14);
    if (!trimmed) return;
    set((state) => {
      const updatedSnapshot = state.pvpSnapshot ? { ...state.pvpSnapshot, playerName: trimmed } : null;
      return {
        playerName: trimmed,
        pvpSnapshot: updatedSnapshot,
      };
    });
  },

  savePvpSnapshot: () => {
    const state = get();
    const combatPower = calculateCombatPower(
      state.player.stats,
      state.equippedCore,
      state.rebirthUpgrades,
      state.unlockedSkills
    );

    const snapshot: PvpProfile = {
      userId: 'local_player',
      playerName: state.playerName || '박스슬레이어',
      level: state.player.level,
      stats: { ...state.player.stats },
      equippedCore: state.equippedCore
        ? { type: state.equippedCore.type, level: state.equippedCore.level, name: state.equippedCore.name }
        : null,
      unlockedSkills: [...state.unlockedSkills],
      rebirthUpgrades: { ...state.rebirthUpgrades },
      combatPower,
      pvpScore: state.pvpRating || 1000,
      pvpWins: state.pvpWins || 0,
      pvpLosses: state.pvpLosses || 0,
      allTimeMaxStage: state.allTimeMaxStage || state.maxStage || 1,
      updatedAt: Date.now(),
    };

    set({ pvpSnapshot: snapshot });
    return snapshot;
  },

  recordPvpResult: (win, ratingChange, opponentName, opponentLevel) => {
    set((state) => {
      const currentRating = state.pvpRating || 1000;
      const newRating = Math.max(100, currentRating + ratingChange);
      const newWins = win ? (state.pvpWins || 0) + 1 : (state.pvpWins || 0);
      const newLosses = !win ? (state.pvpLosses || 0) + 1 : (state.pvpLosses || 0);

      const logItem: PvpBattleLog = {
        id: `pvp_log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: Date.now(),
        opponentName,
        opponentLevel,
        isWin: win,
        scoreDelta: ratingChange,
      };

      const updatedLogs = [logItem, ...(state.pvpBattleLogs || [])].slice(0, 30);

      const updatedSnapshot = state.pvpSnapshot ? {
        ...state.pvpSnapshot,
        pvpScore: newRating,
        pvpWins: newWins,
        pvpLosses: newLosses,
      } : null;

      return {
        pvpRating: newRating,
        pvpWins: newWins,
        pvpLosses: newLosses,
        pvpBattleLogs: updatedLogs,
        pvpSnapshot: updatedSnapshot,
      };
    });
  },
}));

useGameStore.subscribe((state) => {
  const gameState = Object.fromEntries(
      Object.entries(state).filter(([, value]) => typeof value !== 'function')
  );
  saveStateToLocalStorage(gameState as unknown as GameState);
});
