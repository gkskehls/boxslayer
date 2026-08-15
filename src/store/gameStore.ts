// src/store/gameStore.ts

import { create } from 'zustand';
import type { GameState, Player, Stats, Core, ShopItem, DefeatReason, CoreType, CoreEffect } from '../types/game';
import { loadStateFromLocalStorage, saveStateToLocalStorage } from './utils/localStorage';
import { SKILL_TREE_DATA } from '../constants/skills';

export interface CoreStats {
  desc: string;
  effects: CoreEffect;
}

export const calculateReincarnationPoints = (stage: number): number => {
  if (stage < 5) return 0;
  // 층수 가중치 공식: 오직 층수만 반영하되, 고층 등반 시 기하급수적 RP 보상 부여
  // (예: 50층 -> 14 RP, 100층 -> 36 RP, 200층 -> 106 RP, 500층 -> 516 RP, 1000층 -> 1,866 RP)
  const basePoints = Math.floor(stage / 5);
  const acceleration = 1 + (stage / 120);
  return Math.floor(basePoints * acceleration);
};

export const getRequiredExpForLevel = (level: number): number => {
  // 다항식(Polynomial) 수식 적용: 기존 1.1^level 지수 수식의 고층 레벨업 마비 방지
  return Math.floor(100 * Math.pow(level, 1.5));
};

export const getUnlockedEnemySkillsForStage = (stage: number): string[] => {
  if (stage < 200) {
    return []; // 0~199층: 0단계 (미해금 - 스킬 없음)
  }
  const allSkills = Object.keys(SKILL_TREE_DATA);
  if (stage >= 1000) {
    return allSkills; // 1,000층 이상: 3차 스킬까지 전체 해금
  } else if (stage >= 500) {
    return allSkills.filter(id => {
      const match = id.match(/_node_(\d+)/);
      if (!match) return true;
      const nodeNum = parseInt(match[1], 10);
      return nodeNum <= 60; // 500~999층: 2차 스킬까지 해금
    });
  } else {
    return allSkills.filter(id => {
      const match = id.match(/_node_(\d+)/);
      if (!match) return true;
      const nodeNum = parseInt(match[1], 10);
      return nodeNum <= 30; // 200~499층: 1차 스킬 해금
    });
  }
};

export const getCoreStats = (type: CoreType, level: number, unlockedSkills: string[] = []): CoreStats => {
  const coreLevel = level > 0 ? level : 1;
  const finalEffects: CoreEffect = {};

  switch (type) {
    case 'FIRE': finalEffects.baseDamageFlat = 1 + (coreLevel * 0.5); break;
    case 'WATER': finalEffects.initialShieldMultiplier = 0.2 + (coreLevel * 0.02); break;
    case 'WIND': finalEffects.hitEvasionBonus = 0.02 + (coreLevel * 0.002); break;
    case 'ELECTRIC': finalEffects.baseDamageFlat = 1 + (coreLevel * 0.2); break;
  }

  unlockedSkills.forEach(skillId => {
    const skill = SKILL_TREE_DATA[skillId];
    const coreEffect = skill?.effects?.coreEffects?.[type];
    if (coreEffect) {
      Object.keys(coreEffect).forEach(key => {
        const effectKey = key as keyof CoreEffect;
        const value = coreEffect[effectKey] || 0;
        if (effectKey === 'baseDamageMultiplier' || effectKey === 'initialShieldMultiplier') {
          finalEffects[effectKey] = (finalEffects[effectKey] || 1) * value;
        } else {
          finalEffects[effectKey] = (finalEffects[effectKey] || 0) + value;
        }
      });
    }
  });

  if (finalEffects.strRatio) finalEffects.strRatio += (coreLevel * 0.001);
  if (finalEffects.shieldPerHitRatio) finalEffects.shieldPerHitRatio += (coreLevel * 0.0001);
  if (finalEffects.reflectRatio) finalEffects.reflectRatio += (coreLevel * 0.001);
  if (finalEffects.hitEvasionBonus) finalEffects.hitEvasionBonus += (coreLevel * 0.0002);

  let description = '효과 없음';
  if (type === 'FIRE') {
    description = `기본 화염 피해: +${finalEffects.baseDamageFlat?.toFixed(1) || 0}`;
    if (finalEffects.strRatio) description += `\n힘 계수: +${(finalEffects.strRatio * 100).toFixed(0)}%`;
    if (finalEffects.baseDamageMultiplier && finalEffects.baseDamageMultiplier > 1) description += `\n피해 증폭: ${finalEffects.baseDamageMultiplier.toFixed(1)}배`;
  } else if (type === 'WATER') {
    description = `시작 쉴드: +${((finalEffects.initialShieldMultiplier || 0) * 100).toFixed(0)}%`;
    if (finalEffects.shieldPerHitRatio) description += `\n타격 시 쉴드 회복: +${(finalEffects.shieldPerHitRatio * 100).toFixed(2)}%`;
    if (finalEffects.reflectRatio) description += `\n피해 반사: +${(finalEffects.reflectRatio * 100).toFixed(0)}%`;
  } else if (type === 'WIND') {
    description = `명중/회피 보너스: +${((finalEffects.hitEvasionBonus || 0) * 100).toFixed(1)}%`;
    if (finalEffects.comboThreshold) description += `\n${finalEffects.comboThreshold}회마다 연격`;
    if (finalEffects.evasionThreshold) description += `\n${finalEffects.evasionThreshold}회마다 확정 회피`;
  } else if (type === 'ELECTRIC') {
    description = `기본 번개 피해: +${finalEffects.baseDamageFlat?.toFixed(1) || 0}`;
    if (finalEffects.stunThreshold) description += `\n${finalEffects.stunThreshold}회마다 ${finalEffects.stunDuration || 0}초 기절`;
    if (finalEffects.executeDamageMultiplier) description += `\n기절한 적에게 ${finalEffects.executeDamageMultiplier * 100}% 추가 피해`;
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
  retryCurrentFloor: () => void;
  spendGold: (amount: number) => void;
  removeCore: (coreId: string) => void;
  canClaimRewards: () => boolean;
  reincarnate: () => void;
  unlockSkill: (skillId: string) => void;
  resetSkills: () => void;
  buyShopItem: (item: ShopItem) => void;
  setDefeat: (reason: DefeatReason) => void;
}

const initialStats: Stats = { str: 10, dex: 10, con: 10 };

export const getComputedStats = (stats: Stats, unlockedSkills: string[] = [], activeBuffs: Record<string, number> = {}) => {
  let baseStr = stats.str;
  let baseDex = stats.dex;
  let baseCon = stats.con;

  let percentStr = 0;
  let percentDex = 0;
  let percentCon = 0;

  let comboChance = 0;
  let comboMultiplier = 1.5; // 기본 연격 데미지 배율은 1.5배 (150%)에서 시작
  let comboHitsAdded = 0;

  const modifiers = {
    offlineRewardMultiplier: 0,
    startStageBonus: 0,
    evasionChanceBonus: 0,
    goldMultiplier: 0,
    expMultiplier: 0,
    rpBonusMultiplier: 0,
  };

  unlockedSkills.forEach(skillId => {
    const skill = SKILL_TREE_DATA[skillId];
    if (skill?.effects) {
      // 1) 고정형 보너스 스탯 누적
      if (skill.effects.str) baseStr += skill.effects.str;
      if (skill.effects.dex) baseDex += skill.effects.dex;
      if (skill.effects.con) baseCon += skill.effects.con;

      // 2) 백분율(%) 보너스 스탯 누적
      if (skill.effects.strPercent) percentStr += skill.effects.strPercent;
      if (skill.effects.dexPercent) percentDex += skill.effects.dexPercent;
      if (skill.effects.conPercent) percentCon += skill.effects.conPercent;

      // 3) 연격(Combo) 옵션 누적
      if (skill.effects.comboChance) comboChance += skill.effects.comboChance;
      if (skill.effects.comboMultiplier) comboMultiplier += skill.effects.comboMultiplier;
      if (skill.effects.comboHitsAdded) comboHitsAdded += skill.effects.comboHitsAdded;

      // 4) 기타 유틸리티 누적
      if (skill.effects.offlineRewardMultiplier) modifiers.offlineRewardMultiplier += skill.effects.offlineRewardMultiplier;
      if (skill.effects.startStageBonus) modifiers.startStageBonus += skill.effects.startStageBonus;
      if (skill.effects.evasionChanceBonus) modifiers.evasionChanceBonus += skill.effects.evasionChanceBonus;
      if (skill.effects.goldMultiplier) modifiers.goldMultiplier += skill.effects.goldMultiplier;
      if (skill.effects.expMultiplier) modifiers.expMultiplier += skill.effects.expMultiplier;
      if (skill.effects.rpBonusMultiplier) modifiers.rpBonusMultiplier += skill.effects.rpBonusMultiplier;
    }
  });

  // 고정형 보너스 가산 후 백분율(%) 보너스 복리 계산
  const finalStr = Math.floor(baseStr * (1 + percentStr));
  const finalDex = Math.floor(baseDex * (1 + percentDex));
  const finalCon = Math.floor(baseCon * (1 + percentCon));

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
    attackSpeed: 2.0, // 공격 속도는 기획에 명세된 규칙대로 완전히 2.0초로 고정
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
      const state: GameState = { ...initialGameState, ...loadedState };
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

  reincarnate: () => {
    const state = get();
    const unlockedSkills = state.unlockedSkills;
    const computed = getComputedStats(initialStats, unlockedSkills);
    const basePoints = calculateReincarnationPoints(state.stage);
    const rpMultiplier = 1 + (computed.modifiers.rpBonusMultiplier || 0);
    const pointsEarned = Math.floor(basePoints * rpMultiplier);
    const startStage = 1 + (computed.modifiers.startStageBonus || 0);

    set({
      ...initialGameState,
      reincarnationPoints: state.reincarnationPoints + pointsEarned,
      unlockedSkills,
      stage: startStage,
      maxStage: startStage,
      playerCores: [],
      equippedCore: null,
    });
  },

  spawnEnemy: () => {
    const state = get();
    const now = Date.now();
    const nextStage = state.stage;

    // 기획 스펙 19.1 몬스터 스탯 지수 스케일링 (보스 인위적 배율 제거, 단일 연속 성장)
    // 몬스터 HP: 50 * (1.026 ^ (stage - 1)) (50층까지 노스탯으로도 무난히 진행 가능)
    // 몬스터 ATK: 5 * (1.020 ^ (stage - 1))
    const enemyHp = Math.max(10, Math.floor(50 * Math.pow(1.026, Math.max(0, nextStage - 1))));

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

    // 몬스터 스탯 단일 선형 수식 (1층~200층 및 200층 이후 무한 확장)
    // 공식: Stat = 3 + Math.floor((stage - 1) * 0.286432)  (또는 Math.floor(((stage - 1) * 57) / 199))
    // 1층: 각 3 (총합 9) -> 200층: 각 60 (총합 180, 플레이어 예상 스탯과 동일) -> 500층: 각 145 -> 1,000층: 각 289
    const statVal = 3 + Math.floor(((nextStage - 1) * 57) / 199);
    const stats = { str: statVal, dex: statVal, con: statVal };

    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs);
    let playerInitialShield = 0;
    if (state.equippedCore?.type === 'WATER') {
      const waterStats = getCoreStats('WATER', state.equippedCore.level, state.unlockedSkills);
      playerInitialShield = Math.floor(playerComputed.maxHealth * (waterStats.effects.initialShieldMultiplier || 0));
    }

    let enemyInitialShield = 0;
    if (enemyCore.type === 'WATER') {
      const unlockedEnemySkills = getUnlockedEnemySkillsForStage(nextStage);
      const waterStats = getCoreStats('WATER', enemyCore.level, unlockedEnemySkills);
      enemyInitialShield = Math.floor(enemyHp * (waterStats.effects.initialShieldMultiplier || 0));
    }

    const skillGoldMult = 1 + (playerComputed.modifiers.goldMultiplier || 0);
    const skillExpMult = 1 + (playerComputed.modifiers.expMultiplier || 0);

    const goldMult = ((state.activeBuffs['buff_gold_2x'] && state.activeBuffs['buff_gold_2x'] > now) ? 2.0 : 1.0) * skillGoldMult;
    const expMult = ((state.activeBuffs['buff_exp_2x'] && state.activeBuffs['buff_exp_2x'] > now) ? 2.0 : 1.0) * skillExpMult;

    set({
      stage: nextStage,
      maxStage: Math.max(state.maxStage, nextStage),
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
      playerShield: playerInitialShield,
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

    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs);
    const enemyComputed = getComputedStats(state.currentEnemy.stats);

    let hitChance = 0.95 + ((playerComputed.accuracy - enemyComputed.evasion) * 0.01);
    if (state.equippedCore?.type === 'WIND') {
      const windStats = getCoreStats('WIND', state.equippedCore.level, state.unlockedSkills);
      hitChance += (windStats.effects.hitEvasionBonus || 0);
    }

    const finalHitChance = Math.max(0.1, Math.min(1.0, hitChance));
    const isEvaded = Math.random() > finalHitChance;

    // 피버타임은 데미지를 뻥튀기하는 시스템이 아니라 전투 시뮬레이션 배속(시간가속) 시스템임
    const hitCount = 1;

    let coreDamage = 0;
    let shieldRecovered = 0;
    let nextPlayerShield = state.playerShield;
    let currentWindHits = state.windHitCount;
    let nextWindEvasion = state.hasWindEvasion;
    let currentElecHits = state.elecHitCount;
    let nextEnemyStunEndTime = state.enemyStunEndTime;

    if (state.equippedCore) {
      const coreStats = getCoreStats(state.equippedCore.type, state.equippedCore.level, state.unlockedSkills);
      const effects = coreStats.effects;

      if (state.equippedCore.type === 'FIRE') {
        const strBonusDamage = state.player.stats.str * (effects.strRatio || 0);
        const baseCoreDamage = (effects.baseDamageFlat || 0) + strBonusDamage;
        const isFireExtreme = state.activeBuffs['buff_core_fire'] && state.activeBuffs['buff_core_fire'] > now;
        const randomMultiplier = 0.85 + Math.random() * 0.3;
        coreDamage = Math.floor(baseCoreDamage * (effects.baseDamageMultiplier || 1) * randomMultiplier * hitCount * (isFireExtreme ? 10 : 1));
      } else if (state.equippedCore.type === 'WATER') {
        const regenAmount = Math.floor(playerComputed.maxHealth * (effects.shieldPerHitRatio || 0));
        shieldRecovered = regenAmount * hitCount;
        nextPlayerShield = Math.min(playerComputed.maxHealth * 20000, nextPlayerShield + shieldRecovered);
      } else if (state.equippedCore.type === 'WIND') {
        currentWindHits += hitCount;
        const isWindExtreme = state.activeBuffs['buff_core_wind'] && state.activeBuffs['buff_core_wind'] > now;
        const comboThreshold = isWindExtreme ? 5 : (effects.comboThreshold || 15);
        if (currentWindHits >= comboThreshold) {
          const comboCount = Math.floor(currentWindHits / comboThreshold);
          coreDamage += Math.floor(playerComputed.attack * (effects.comboDamageMultiplier || 1) * comboCount);
          currentWindHits %= comboThreshold;
        }
        if (currentWindHits >= (effects.evasionThreshold || 20)) {
          nextWindEvasion = true;
        }
      } else if (state.equippedCore.type === 'ELECTRIC') {
        if (now < state.enemyStunEndTime) {
          coreDamage += Math.floor(playerComputed.attack * (effects.executeDamageMultiplier || 0.5));
        } else {
          currentElecHits += hitCount;
          const stunThreshold = effects.stunThreshold || 10;
          if (currentElecHits >= stunThreshold) {
            nextEnemyStunEndTime = now + ((effects.stunDuration || 1) * 1000);
            currentElecHits = 0;
          }
        }
      }
    }

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

    const baseNormalDamage = Math.floor(Math.max(1, playerComputed.attack - enemyComputed.defense));
    const randomMultiplier = 0.85 + Math.random() * 0.3;

    // 연격(Combo/Multi-Hit) 확률 주사위
    const isCombo = playerComputed.comboChance > 0 && Math.random() < playerComputed.comboChance;
    const comboHits = isCombo ? (1 + (playerComputed.comboHitsAdded || 0)) : 1;
    const comboMult = isCombo ? (playerComputed.comboMultiplier || 1.5) : 1.0;

    const normalDamage = Math.floor(baseNormalDamage * randomMultiplier * hitCount * comboHits * comboMult);

    const totalDamage = normalDamage + coreDamage;
    let remainingEnemyShield = state.enemyShield;
    let actualHealthDamage = 0;

    if (remainingEnemyShield >= totalDamage) {
      remainingEnemyShield -= totalDamage;
    } else {
      actualHealthDamage = totalDamage - remainingEnemyShield;
      remainingEnemyShield = 0;
    }

    const newEnemyHealth = Math.max(0, state.currentEnemy.currentHealth - actualHealthDamage);

    if (newEnemyHealth <= 0) {
      // 1타 처치(원킬) 판정: 적이 풀 체력인 상태에서 1번의 타격으로 즉시 파괴된 경우
      const isOneShot = state.currentEnemy.currentHealth === state.currentEnemy.maxHealth;
      const leapedStages = isOneShot ? 3 : 1; // 원샷 시 +3층 도약

      const { expReward, goldReward } = state.currentEnemy;
      const totalExpReward = expReward * leapedStages;
      const totalGoldReward = goldReward * leapedStages;

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
        maxStage: Math.max(state.maxStage, nextStageNumber),
        gameStatus: 'VICTORY',
        lastDamageDealt: {
          normal: normalDamage,
          core: coreDamage,
          shieldRecovered,
          isCombo,
          comboHits,
          isOneShotLeap: isOneShot,
          leapedStages
        },
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
      currentEnemy: { ...state.currentEnemy, currentHealth: newEnemyHealth },
      lastDamageDealt: { normal: normalDamage, core: coreDamage, shieldRecovered, isCombo, comboHits },
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
    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs);

    let hitChance = 0.95 + ((enemyComputed.accuracy - playerComputed.evasion) * 0.01);
    const enemyCore = state.currentEnemy.core;
    const enemyUnlockedSkills = getUnlockedEnemySkillsForStage(state.stage);
    if (enemyCore?.type === 'WIND') {
      const enemyCoreStats = getCoreStats(enemyCore.type, enemyCore.level, enemyUnlockedSkills);
      hitChance += (enemyCoreStats.effects.hitEvasionBonus || 0);
    }
    hitChance -= playerComputed.modifiers.evasionChanceBonus;
    if (state.equippedCore?.type === 'WIND') {
      const windStats = getCoreStats('WIND', state.equippedCore.level, state.unlockedSkills);
      hitChance -= (windStats.effects.hitEvasionBonus || 0);
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
    let amountLeeched = 0;
    let enemyShieldRecovered = 0;
    let nextEnemyShield = state.enemyShield;

    if (enemyCore) {
      const enemyCoreStats = getCoreStats(enemyCore.type, enemyCore.level, enemyUnlockedSkills);
      const effects = enemyCoreStats.effects;
      if (enemyCore.type === 'FIRE' && effects.baseDamageFlat) {
        const strBonus = state.currentEnemy.stats.str * (effects.strRatio || 0);
        coreDamage = Math.floor(((effects.baseDamageFlat || 0) + strBonus) * randomMultiplier);
      }
      if (enemyCore.type === 'ELECTRIC' && effects.stunThreshold) {
        if (Math.random() < 0.1) {
          nextPlayerStunEndTime = now + ((effects.stunDuration || 2) * 1000);
        }
      }
      if (enemyCore.type === 'WATER' && effects.shieldPerHitRatio) {
        enemyShieldRecovered = Math.floor(state.currentEnemy.maxHealth * effects.shieldPerHitRatio);
        nextEnemyShield += enemyShieldRecovered;
      }
    }

    const totalDamage = normalDamage + coreDamage;
    let remainingPlayerShield = state.playerShield;
    let actualHealthDamage = 0;

    if (remainingPlayerShield >= totalDamage) {
      remainingPlayerShield -= totalDamage;
    } else {
      actualHealthDamage = totalDamage - remainingPlayerShield;
      remainingPlayerShield = 0;
    }

    const nextHealth = Math.max(0, state.player.currentHealth - actualHealthDamage);
    let enemyNextHealth = state.currentEnemy.currentHealth;
    let actualReflectedDmg = 0;

    if (state.equippedCore?.type === 'WATER') {
      const coreStats = getCoreStats('WATER', state.equippedCore.level, state.unlockedSkills);
      const isWaterExtreme = state.activeBuffs['buff_core_water'] && state.activeBuffs['buff_core_water'] > now;
      actualReflectedDmg = Math.floor(totalDamage * (coreStats.effects.reflectRatio || 0) * (isWaterExtreme ? 5 : 1));
      if (actualReflectedDmg > 0) {
        enemyNextHealth = Math.max(0, enemyNextHealth - actualReflectedDmg);
      }
    }

    if (enemyCore?.type === 'WATER') {
      amountLeeched = Math.floor(actualHealthDamage * 0.01);
      enemyNextHealth = Math.min(state.currentEnemy.maxHealth, enemyNextHealth + amountLeeched);
    }

    if (nextHealth <= 0) {
      return {
        player: { ...state.player, currentHealth: 0 },
        playerShield: 0,
        gameStatus: 'DEFEAT',
        defeatReason: 'HEALTH',
        lastDamageTaken: { normal: normalDamage, core: coreDamage },
        lastReflectedDamage: actualReflectedDmg,
        lastLeechedHealth: amountLeeched,
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
      lastDamageTaken: { normal: normalDamage, core: coreDamage },
      lastReflectedDamage: actualReflectedDmg,
      lastLeechedHealth: amountLeeched,
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
    let totalCost = 0;
    for (let i = 0; i < amount; i++) totalCost += 100 * (target.level + i);
    if (state.player.gold < totalCost) {
      alert("골드가 부족합니다.");
      return {};
    }
    const upgraded = { ...target, level: target.level + amount };
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
    const diff = Date.now() - s.lastOnlineTime;
    const rawMinutes = Math.floor(diff / 60000);

    if (rawMinutes < 1) return { gold: 0, exp: 0, minutes: 0, levelsGained: 0 };

    // 오프라인 방치 보상 상한선: 최대 12시간 (720분)
    const minutes = Math.min(rawMinutes, 720);

    const computed = getComputedStats(s.player.stats, s.unlockedSkills, s.activeBuffs);
    const bonusMultiplier = 1 + computed.modifiers.offlineRewardMultiplier;

    const now = Date.now();
    const skillGoldMult = 1 + (computed.modifiers.goldMultiplier || 0);
    const skillExpMult = 1 + (computed.modifiers.expMultiplier || 0);

    const goldMult = ((s.activeBuffs['buff_gold_2x'] && s.activeBuffs['buff_gold_2x'] > now) ? 2.0 : 1.0) * skillGoldMult;
    const expMult = ((s.activeBuffs['buff_exp_2x'] && s.activeBuffs['buff_exp_2x'] > now) ? 2.0 : 1.0) * skillExpMult;

    // 80% 오프라인 효율성 (1분당 약 8마리 처치 기준)
    const baseEnemyExp = Math.floor(20 + (s.stage * 8) + (Math.pow(s.stage, 1.3) * 2));
    const baseEnemyGold = Math.floor(10 + (s.stage * 2) + (Math.pow(s.stage, 1.35) * 1.5));

    const g = Math.floor((baseEnemyGold * 8 / 60) * minutes * 60 * bonusMultiplier * goldMult);
    const e = Math.floor((baseEnemyExp * 8 / 60) * minutes * 60 * bonusMultiplier * expMult);

    // 오프라인 경험치 수령 후 즉시 레벨업 루프 처리
    let newLevel = s.player.level;
    let newExp = s.player.experience + e;
    let newNextExp = s.player.nextLevelExperience || getRequiredExpForLevel(newLevel);
    let statPointsGained = 0;
    let levelsGained = 0;

    while (newExp >= newNextExp) {
      newExp -= newNextExp;
      newLevel++;
      levelsGained++;
      newNextExp = getRequiredExpForLevel(newLevel);
      statPointsGained += 3;
    }

    set({
      player: {
        ...s.player,
        gold: s.player.gold + g,
        level: newLevel,
        experience: newExp,
        nextLevelExperience: newNextExp,
        statPoints: s.player.statPoints + statPointsGained,
      },
      lastOnlineTime: Date.now()
    });

    return { gold: g, exp: e, minutes, levelsGained };
  },
  retryCurrentFloor: () => set((state) => {
    const computed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs);
    return {
      player: { ...state.player, currentHealth: Math.floor(computed.maxHealth) },
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

  resetSkills: () => set((state) => {
    if (window.confirm('정말로 모든 스킬을 초기화하시겠습니까? 사용한 환생 포인트는 모두 돌려받지만, 스탯은 초기화됩니다.')) {
      const refundedPoints = state.unlockedSkills
          .filter(id => id !== 'core_origin')
          .reduce((sum, id) => sum + (SKILL_TREE_DATA[id]?.cost || 0), 0);

      const statPointsFromLevels = (state.player.level - 1) * 3;
      const tempStatPoints = state.player.tempStatPoints || 0;

      return {
        reincarnationPoints: state.reincarnationPoints + refundedPoints,
        unlockedSkills: ['core_origin'],
        player: {
          ...state.player,
          stats: initialStats,
          statPoints: statPointsFromLevels + tempStatPoints,
        }
      };
    }
    return state;
  }),

  buyShopItem: (item) => set((state) => {
    if (state.player.gold < item.cost) {
      alert("골드가 부족합니다.");
      return state;
    }

    if (item.requiredSkillId && !state.unlockedSkills.includes(item.requiredSkillId)) {
      alert("이 아이템을 구매하기 위한 선행 스킬을 해금하지 않았습니다.");
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