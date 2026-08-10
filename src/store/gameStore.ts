// src/store/gameStore.ts

import { create } from 'zustand';
import type { GameState, Player, Stats, Core, ShopItem, DefeatReason, CoreType, CoreEffect } from '../types/game';
import { loadStateFromLocalStorage, saveStateToLocalStorage } from './utils/localStorage';
import { SKILL_TREE_DATA } from '../constants/skills';

export interface CoreStats {
  desc: string;
  effects: CoreEffect;
}

export const calculateReincarnationPoints = (stage: number, level: number, cores: Core[]): number => {
  const stagePoints = Math.floor(stage / 5);
  const levelPoints = Math.floor(level / 10);
  const corePoints = Math.floor(cores.reduce((sum, core) => sum + core.level, 0) / 10);
  return Math.max(0, stagePoints + levelPoints + corePoints);
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
  upgradeCore: (amount?: number) => void;
  calculateOfflineRewards: () => { gold: number; exp: number };
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
    feverMultiplier: 1.0,
    evasionChanceBonus: 0
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
      if (skill.effects.feverMultiplier) modifiers.feverMultiplier = Math.max(modifiers.feverMultiplier, skill.effects.feverMultiplier);
      if (skill.effects.evasionChanceBonus) modifiers.evasionChanceBonus += skill.effects.evasionChanceBonus;
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
    const pointsEarned = calculateReincarnationPoints(
        state.stage,
        state.player.level,
        [...state.playerCores, ...(state.equippedCore ? [state.equippedCore] : [])]
    );
    const unlockedSkills = state.unlockedSkills;
    const startStage = 1 + (getComputedStats(initialStats, unlockedSkills).modifiers.startStageBonus || 0);

    set({
      ...initialGameState,
      reincarnationPoints: state.reincarnationPoints + pointsEarned,
      unlockedSkills,
      stage: startStage,
      maxStage: startStage,
      playerCores: [
        { id: `core_fire_init`, name: '불의 코어', type: 'FIRE', level: 1 },
        { id: `core_water_init`, name: '물의 코어', type: 'WATER', level: 1 },
        { id: `core_wind_init`, name: '바람의 코어', type: 'WIND', level: 1 },
        { id: `core_elec_init`, name: '번개의 코어', type: 'ELECTRIC', level: 1 }
      ],
    });
  },

  spawnEnemy: () => {
    const state = get();
    const now = Date.now();
    const isBossTrackerActive = state.activeBuffs['buff_boss_tracker'] && state.activeBuffs['buff_boss_tracker'] > now;

    let nextStage = state.stage;
    if (isBossTrackerActive && nextStage % 5 !== 0) {
      nextStage = nextStage + (5 - (nextStage % 5));
    }
    const isBoss = nextStage % 5 === 0;

    // 기획 스펙 19.1 몬스터 스탯 지수 스케일링
    // 일반 몬스터 HP: 100 * (1.082 ^ (stage - 1))
    // 일반 몬스터 ATK: 12 * (1.065 ^ (stage - 1))
    // 보스 몬스터 HP: 일반의 3.5배
    const normalHp = Math.floor(100 * Math.pow(1.082, Math.max(0, nextStage - 1)));
    const normalAtk = Math.floor(12 * Math.pow(1.065, Math.max(0, nextStage - 1)));

    const enemyHp = isBoss ? Math.floor(normalHp * 3.5) : normalHp;
    const enemyAtk = isBoss ? Math.floor(normalAtk * 1.25) : normalAtk;

    const stats = {
      str: Math.max(1, Math.floor(enemyAtk / 2)),
      dex: Math.max(1, Math.floor(10 + nextStage * 0.5)),
      con: Math.max(1, Math.floor((enemyHp - 100) / 5))
    };

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

    const goldMult = (state.activeBuffs['buff_gold_2x'] && state.activeBuffs['buff_gold_2x'] > now) ? 2.0 : 1.0;
    const expMult = (state.activeBuffs['buff_exp_2x'] && state.activeBuffs['buff_exp_2x'] > now) ? 2.0 : 1.0;

    set({
      stage: nextStage,
      maxStage: Math.max(state.maxStage, nextStage),
      currentEnemy: {
        id: `enemy-${nextStage}`,
        name: isBoss ? `BOSS ${nextStage}` : `BOX ${nextStage}`,
        level: nextStage,
        type: isBoss ? 'BOSS' : 'NORMAL',
        stats: stats,
        currentHealth: enemyHp,
        goldReward: Math.floor((10 + nextStage) * (isBoss ? 3 : 1) * goldMult),
        expReward: Math.floor((20 + (nextStage * 5)) * (isBoss ? 3 : 1) * expMult),
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
      const { expReward, goldReward } = state.currentEnemy;
      let newExp = state.player.experience + expReward;
      const goldGained = goldReward;
      let newLevel = state.player.level;
      let newNextExp = state.player.nextLevelExperience;
      let statPointsGained = 0;

      while (newExp >= newNextExp) {
        newExp -= newNextExp;
        newLevel++;
        newNextExp = Math.floor(newNextExp * 1.1);
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
          gold: state.player.gold + goldGained,
          currentHealth: Math.floor(playerComputed.maxHealth)
        },
        stage: state.stage + 1,
        maxStage: Math.max(state.maxStage, state.stage + 1),
        gameStatus: 'VICTORY',
        lastDamageDealt: { normal: normalDamage, core: coreDamage, shieldRecovered, isCombo, comboHits },
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
        enemyShieldRecovered = Math.floor(enemyComputed.maxHealth * effects.shieldPerHitRatio);
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
      enemyNextHealth = Math.min(enemyComputed.maxHealth, enemyNextHealth + amountLeeched);
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
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return { gold: 0, exp: 0 };

    const b = 1 + (s.stage - 1) * 0.1;
    const computed = getComputedStats(s.player.stats, s.unlockedSkills, s.activeBuffs);
    const bonusMultiplier = 1 + computed.modifiers.offlineRewardMultiplier;

    const now = Date.now();
    const goldMult = (s.activeBuffs['buff_gold_2x'] && s.activeBuffs['buff_gold_2x'] > now) ? 2.0 : 1.0;
    const expMult = (s.activeBuffs['buff_exp_2x'] && s.activeBuffs['buff_exp_2x'] > now) ? 2.0 : 1.0;

    const g = Math.floor(10 * b * minutes * bonusMultiplier * goldMult);
    const e = Math.floor(5 * b * minutes * bonusMultiplier * expMult);

    set({
      player: { ...s.player, gold: s.player.gold + g, experience: s.player.experience + e },
      lastOnlineTime: Date.now()
    });
    return { gold: g, exp: e };
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