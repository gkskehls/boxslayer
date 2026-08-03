// src/store/gameStore.ts

import { create } from 'zustand';
import type { GameState, Player, Stats, Core, ShopItem, DefeatReason, CoreType, CoreEffect } from '../types/game';
import { loadStateFromLocalStorage, saveStateToLocalStorage } from './utils/localStorage';
import { SKILL_TREE_DATA } from '../constants/skills';

const BATTLE_SPEED_CONFIG = [
  { threshold: 0, multiplier: 1 },
  { threshold: 5000, multiplier: 5 },
  { threshold: 10000, multiplier: 10 }
];

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

// [리팩토링] 스킬 데이터 기반으로 코어 스탯을 동적으로 계산하는 함수
export const getCoreStats = (type: CoreType, level: number, unlockedSkills: string[] = []): CoreStats => {
  const coreLevel = level > 0 ? level : 1;
  const finalEffects: CoreEffect = {};

  // 1. 코어 기본 능력치 설정
  switch (type) {
    case 'FIRE':
      finalEffects.baseDamageFlat = 1 + (coreLevel * 0.5);
      break;
    case 'WATER':
      finalEffects.initialShieldMultiplier = 0.2 + (coreLevel * 0.02);
      break;
    case 'WIND':
      finalEffects.hitEvasionBonus = 0.02 + (coreLevel * 0.002);
      break;
    case 'ELECTRIC':
      finalEffects.baseDamageFlat = 1 + (coreLevel * 0.2); // 번개는 기본 피해량이 다름
      break;
  }

  // 2. 해금된 스킬 효과를 순회하며 합산
  unlockedSkills.forEach(skillId => {
    const skill = SKILL_TREE_DATA[skillId];
    const coreEffect = skill?.effects?.coreEffects?.[type];

    if (coreEffect) {
      Object.keys(coreEffect).forEach(key => {
        const effectKey = key as keyof CoreEffect;
        const value = coreEffect[effectKey] || 0;
        
        // 곱연산 효과 처리
        if (effectKey === 'baseDamageMultiplier' || effectKey === 'initialShieldMultiplier') {
            finalEffects[effectKey] = (finalEffects[effectKey] || 1) * value;
        } else { // 합연산 효과 처리
            finalEffects[effectKey] = (finalEffects[effectKey] || 0) + value;
        }
      });
    }
  });
  
  // 3. 레벨 기반 추가 계수 적용 (필요 시)
  if (finalEffects.strRatio) finalEffects.strRatio += (coreLevel * 0.001);
  if (finalEffects.shieldPerHitRatio) finalEffects.shieldPerHitRatio += (coreLevel * 0.0001);
  if (finalEffects.reflectRatio) finalEffects.reflectRatio += (coreLevel * 0.001);
  if (finalEffects.hitEvasionBonus) finalEffects.hitEvasionBonus += (coreLevel * 0.0002);

  // 4. 설명 텍스트 생성 (UI 표시용)
  let description = '효과 없음';
  if (type === 'FIRE') {
    description = `기본 화염 피해: +${finalEffects.baseDamageFlat?.toFixed(1) || 0}`;
    if (finalEffects.strRatio) description += `\n힘 계수: +${(finalEffects.strRatio * 100).toFixed(0)}%`;
    if (finalEffects.baseDamageMultiplier && finalEffects.baseDamageMultiplier > 1) description += `\n피해 증폭: ${finalEffects.baseDamageMultiplier.toFixed(1)}배`;
  } else if (type === 'WATER') {
    description = `시작 쉴드: +${(finalEffects.initialShieldMultiplier || 0).toFixed(1)}%`;
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

  let attack = 20 + (finalStats.str * 2);
  let defense = 5 + (finalStats.con * 0.2);
  let maxHealth = 100 + (finalStats.con * 5);

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
    attack,
    defense,
    maxHealth,
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
  tempStatPoints: 0,
  gold: 0
};

const getInitialStoreState = (): GameState => {
  const loadedState = loadStateFromLocalStorage();

  if (loadedState) {
    return {
      ...loadedState,
      reincarnationPoints: loadedState.reincarnationPoints || 0,
      unlockedSkills: loadedState.unlockedSkills || ['core_origin'],
      maxStage: loadedState.maxStage || loadedState.stage || 1,
      lastEnemyEvadedTime: 0,
      lastPlayerEvadedTime: 0,
      activeBuffs: loadedState.activeBuffs || {},
      isPlayerStunned: false,
      playerStunEndTime: 0,
      lastDamageTaken: { normal: 0, core: 0 },
      lastLeechedHealth: 0,
      lastEnemyShieldRecovered: 0,
    } as GameState;
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
    lastDamageDealt: { normal: 0, core: 0, shieldRecovered: 0 },
    lastDamageTaken: { normal: 0, core: 0 },
    lastLeechedHealth: 0,
    lastEnemyShieldRecovered: 0,
    lastReflectedDamage: 0,
    battleStartTime: 0,
    reincarnationPoints: 0,
    unlockedSkills: ['core_origin'],
    maxStage: 1,
    lastEnemyEvadedTime: 0,
    lastPlayerEvadedTime: 0,
    activeBuffs: {},
    isPlayerStunned: false,
    playerStunEndTime: 0,
  } as GameState;
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...getInitialStoreState(),

  setDefeat: (reason: DefeatReason) => set({ gameStatus: 'DEFEAT', defeatReason: reason }),

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
      lastDamageDealt: { normal: 0, core: 0, shieldRecovered: 0 },
      lastDamageTaken: { normal: 0, core: 0 },
      lastLeechedHealth: 0,
      lastEnemyShieldRecovered: 0,
      lastReflectedDamage: 0,
      lastEnemyEvadedTime: 0,
      lastPlayerEvadedTime: 0,
      activeBuffs: {},
      isPlayerStunned: false,
      playerStunEndTime: 0,
    };
  }),

  spawnEnemy: () => set((state) => {
    const now = Date.now();
    const isBossTrackerActive = state.activeBuffs['buff_boss_tracker'] && state.activeBuffs['buff_boss_tracker'] > now;
    
    let nextStage = state.stage;
    if (isBossTrackerActive && nextStage % 5 !== 0) {
      nextStage = nextStage + (5 - (nextStage % 5));
    }
    const isBoss = nextStage % 5 === 0;

    const baseStat = 1 + (nextStage * 0.3);
    let strMult = 1.0, dexMult = 1.0, conMult = 1.0;

    if (nextStage % 100 === 0) {
      strMult = 2.0; dexMult = 2.0; conMult = 10.0;
    } else {
      const stageMod = nextStage % 10;
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
      // 적은 모든 스킬을 해금했다고 가정
      const unlockedEnemySkills = Object.keys(SKILL_TREE_DATA);
      const waterStats = getCoreStats('WATER', enemyCore.level, unlockedEnemySkills);
      const enemyComputed = getComputedStats(stats);
      enemyInitialShield = Math.floor(enemyComputed.maxHealth * (waterStats.effects.initialShieldMultiplier || 0));
    }

    const goldMult = (state.activeBuffs['buff_gold_2x'] && state.activeBuffs['buff_gold_2x'] > now) ? 2.0 : 1.0;
    const expMult = (state.activeBuffs['buff_exp_2x'] && state.activeBuffs['buff_exp_2x'] > now) ? 2.0 : 1.0;

    return {
      stage: nextStage,
      maxStage: Math.max(state.maxStage || 1, nextStage),
      currentEnemy: {
        id: `enemy-${nextStage}`,
        name: isBoss ? `BOSS ${nextStage}` : `BOX ${nextStage}`,
        level: nextStage,
        type: isBoss ? 'BOSS' : 'NORMAL',
        stats: stats,
        currentHealth: Math.floor(getComputedStats(stats).maxHealth),
        goldReward: Math.floor((10 + nextStage) * (isBoss ? 2 : 1) * goldMult),
        expReward: Math.floor((20 + (nextStage * 5)) * (isBoss ? 2 : 1) * expMult),
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
      isEnemyStunned: false,
      isPlayerStunned: false,
      playerStunEndTime: 0,
    };
  }),

  attackEnemy: () => set((state) => {
    if (state.gameStatus !== 'BATTLE' || !state.currentEnemy) return state;

    const now = Date.now();
    if (state.isPlayerStunned && now < (state.playerStunEndTime || 0)) {
      return state;
    }

    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs);
    const enemyComputed = getComputedStats(state.currentEnemy.stats);

    let hitChance = 0.95 + ((playerComputed.accuracy - enemyComputed.evasion) * 0.01);

    if (state.equippedCore?.type === 'WIND') {
      const windStats = getCoreStats('WIND', state.equippedCore.level, state.unlockedSkills);
      hitChance += (windStats.effects.hitEvasionBonus || 0);
    }

    const finalHitChance = Math.max(0.1, Math.min(1.0, hitChance));
    const isEvaded = Math.random() > finalHitChance;

    const elapsedTime = now - (state.battleStartTime || now);
    const config = BATTLE_SPEED_CONFIG.slice().reverse().find(c => elapsedTime >= c.threshold) || BATTLE_SPEED_CONFIG[0];
    
    const speedMult = (state.activeBuffs['buff_speed_up'] && state.activeBuffs['buff_speed_up'] > now) ? 1.5 : 1.0;
    const hitCount = Math.floor(config.multiplier * playerComputed.modifiers.feverMultiplier * speedMult);

    let normalDamage = 0;
    let coreDamage = 0;
    let shieldRecovered = 0;
    let nextPlayerShield = state.playerShield || 0;
    let currentWindHits = state.windHitCount || 0;
    let nextWindEvasion = state.hasWindEvasion || false;
    let currentElecHits = state.elecHitCount || 0;
    let nextEnemyStunned = state.isEnemyStunned || false;

    if (state.equippedCore) {
      const coreStats = getCoreStats(state.equippedCore.type, state.equippedCore.level, state.unlockedSkills);
      const effects = coreStats.effects;

      if (state.equippedCore.type === 'FIRE') {
        const myStr = state.player.stats.str;
        const strBonusDamage = myStr * (effects.strRatio || 0);
        const baseCoreDamage = (effects.baseDamageFlat || 0) + strBonusDamage;
        const isFireExtreme = state.activeBuffs['buff_core_fire'] && state.activeBuffs['buff_core_fire'] > now;
        const randomMultiplier = 0.85 + Math.random() * 0.3;
        coreDamage = Math.floor(baseCoreDamage * (effects.baseDamageMultiplier || 1) * randomMultiplier * hitCount * (isFireExtreme ? 10 : 1));
      }
      else if (state.equippedCore.type === 'WATER') {
        const regenAmount = Math.floor(playerComputed.maxHealth * (effects.shieldPerHitRatio || 0));
        shieldRecovered = regenAmount * hitCount;
        nextPlayerShield = Math.min(playerComputed.maxHealth * 20000, (nextPlayerShield || 0) + shieldRecovered);
      }
      else if (state.equippedCore.type === 'WIND') {
        currentWindHits += hitCount;
        const isWindExtreme = state.activeBuffs['buff_core_wind'] && state.activeBuffs['buff_core_wind'] > now;
        const comboThreshold = isWindExtreme ? 5 : (effects.comboThreshold || 15);
        const evasionThreshold = effects.evasionThreshold || 20;

        if (currentWindHits >= comboThreshold) {
          const comboCount = Math.floor(currentWindHits / comboThreshold);
          coreDamage += Math.floor(playerComputed.attack * (effects.comboDamageMultiplier || 1) * comboCount);
          currentWindHits %= comboThreshold;
        }
        if (currentWindHits >= evasionThreshold) {
          nextWindEvasion = true;
        }
      }
      else if (state.equippedCore.type === 'ELECTRIC') {
        if (nextEnemyStunned) {
          coreDamage += Math.floor(playerComputed.attack * (effects.executeDamageMultiplier || 0.5));
          nextEnemyStunned = false;
        } else {
          currentElecHits += hitCount;
          const stunThreshold = effects.stunThreshold || 10;
          if (currentElecHits >= stunThreshold) {
            nextEnemyStunned = true;
            currentElecHits = 0;
          }
        }
      }
    }

    if (isEvaded) {
      return {
        ...state,
        lastDamageDealt: { normal: 0, core: coreDamage, shieldRecovered },
        lastEnemyEvadedTime: now,
        playerShield: nextPlayerShield,
        windHitCount: currentWindHits,
        hasWindEvasion: nextWindEvasion,
        elecHitCount: currentElecHits,
        isEnemyStunned: nextEnemyStunned,
      };
    }
    
    const baseNormalDamage = Math.floor(Math.max(1, playerComputed.attack - enemyComputed.defense));
    const randomMultiplier = 0.85 + Math.random() * 0.3;
    normalDamage = Math.floor(baseNormalDamage * randomMultiplier * hitCount);

    const totalDamage = Math.floor(normalDamage + coreDamage);
    
    let remainingEnemyShield = state.enemyShield || 0;
    let actualHealthDamage = 0;

    if (remainingEnemyShield >= totalDamage) {
      remainingEnemyShield -= totalDamage;
    } else {
      actualHealthDamage = totalDamage - remainingEnemyShield;
      remainingEnemyShield = 0;
    }

    const newEnemyHealth = Math.max(0, Math.floor(state.currentEnemy.currentHealth - actualHealthDamage));

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
        maxStage: Math.max(state.maxStage || 1, state.stage + 1),
        gameStatus: 'VICTORY',
        lastDamageDealt: { normal: Math.floor(normalDamage), core: Math.floor(coreDamage), shieldRecovered },
        playerShield: nextPlayerShield,
        enemyShield: 0,
        windHitCount: currentWindHits,
        hasWindEvasion: nextWindEvasion,
        elecHitCount: currentElecHits,
        isEnemyStunned: nextEnemyStunned,
        lastEnemyEvadedTime: 0
      };
    }

    return {
      currentEnemy: { ...state.currentEnemy, currentHealth: newEnemyHealth },
      lastDamageDealt: { normal: Math.floor(normalDamage), core: Math.floor(coreDamage), shieldRecovered },
      playerShield: nextPlayerShield,
      enemyShield: remainingEnemyShield,
      windHitCount: currentWindHits,
      hasWindEvasion: nextWindEvasion,
      elecHitCount: currentElecHits,
      isEnemyStunned: nextEnemyStunned,
      lastEnemyEvadedTime: 0
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

  resetStats: () => set((state) => ({ 
      player: { 
          ...state.player, 
          stats: initialStats, 
          statPoints: (state.player.level - 1) * 3 + (state.player.tempStatPoints || 0) 
      } 
  })),

  attackPlayer: () => set((state) => {
    if (state.gameStatus !== 'BATTLE' || !state.currentEnemy || state.currentEnemy.currentHealth <= 0) return state;
    if (state.isEnemyStunned) return state;

    const now = Date.now();
    const enemyComputed = getComputedStats(state.currentEnemy.stats);
    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs);

    let hitChance = 0.95 + ((enemyComputed.accuracy - playerComputed.evasion) * 0.01);

    const enemyCore = state.currentEnemy.core;
    if (enemyCore && enemyCore.type === 'WIND') {
      const enemyCoreStats = getCoreStats(enemyCore.type, enemyCore.level, Object.keys(SKILL_TREE_DATA));
      hitChance += (enemyCoreStats.effects.hitEvasionBonus || 0);
    }

    hitChance -= playerComputed.modifiers.evasionChanceBonus;
    if (state.equippedCore?.type === 'WIND') {
      const windStats = getCoreStats('WIND', state.equippedCore.level, state.unlockedSkills);
      hitChance -= (windStats.effects.hitEvasionBonus || 0);
    }

    const finalHitChance = Math.max(0.1, Math.min(1.0, hitChance));

    if (state.equippedCore?.type === 'WIND' && state.hasWindEvasion) {
      return { ...state, hasWindEvasion: false, lastPlayerEvadedTime: now, lastDamageTaken: { normal: 0, core: 0 } };
    }

    if (Math.random() > finalHitChance) {
      return { ...state, lastPlayerEvadedTime: now, lastDamageTaken: { normal: 0, core: 0 } };
    }

    const baseDamage = Math.floor(Math.max(1, enemyComputed.attack - playerComputed.defense));
    const randomMultiplier = 0.85 + Math.random() * 0.3;
    let normalDamage = Math.floor(baseDamage * randomMultiplier);
    let coreDamage = 0;
    
    let isPlayerStunned = false;
    let playerStunEndTime = 0;
    let amountLeeched = 0;
    let enemyShieldRecovered = 0;
    let nextEnemyShield = state.enemyShield || 0;

    if (enemyCore) {
      const enemyCoreStats = getCoreStats(enemyCore.type, enemyCore.level, Object.keys(SKILL_TREE_DATA));
      const effects = enemyCoreStats.effects;

      if (enemyCore.type === 'FIRE' && effects.baseDamageFlat) {
        const strBonus = state.currentEnemy.stats.str * (effects.strRatio || 0);
        coreDamage = Math.floor(((effects.baseDamageFlat || 0) + strBonus) * randomMultiplier);
      }
      if (enemyCore.type === 'ELECTRIC' && effects.stunThreshold) {
        // For simplicity, enemy stun chance is fixed
        if (Math.random() < 0.1) {
          isPlayerStunned = true;
          playerStunEndTime = now + ((effects.stunDuration || 2) * 1000);
        }
      }
      if (enemyCore.type === 'WATER' && effects.shieldPerHitRatio) {
        enemyShieldRecovered = Math.floor(enemyComputed.maxHealth * effects.shieldPerHitRatio);
        nextEnemyShield += enemyShieldRecovered;
      }
    }

    const totalDamage = normalDamage + coreDamage;
    let remainingPlayerShield = state.playerShield || 0;
    let actualHealthDamage = 0;

    if (remainingPlayerShield >= totalDamage) {
      remainingPlayerShield -= totalDamage;
    } else {
      actualHealthDamage = totalDamage - remainingPlayerShield;
      remainingPlayerShield = 0;
    }

    const nextHealth = Math.max(0, Math.floor(state.player.currentHealth - actualHealthDamage));
    let enemyNextHealth = state.currentEnemy.currentHealth;
    let actualReflectedDmg = 0;

    if (state.equippedCore?.type === 'WATER') {
      const coreStats = getCoreStats('WATER', state.equippedCore.level, state.unlockedSkills);
      const isWaterExtreme = state.activeBuffs['buff_core_water'] && state.activeBuffs['buff_core_water'] > now;
      actualReflectedDmg = Math.floor(totalDamage * (coreStats.effects.reflectRatio || 0) * (isWaterExtreme ? 5 : 1));
      if (actualReflectedDmg > 0) {
        enemyNextHealth = Math.max(0, Math.floor(enemyNextHealth - actualReflectedDmg)); 
      }
    }

    if (enemyCore && enemyCore.type === 'WATER') {
      // Simplified leech for enemy
      amountLeeched = Math.floor(actualHealthDamage * 0.01);
      enemyNextHealth = Math.min(enemyComputed.maxHealth, enemyNextHealth + amountLeeched);
    }

    if (nextHealth <= 0) {
      return {
        ...state,
        player: { ...state.player, currentHealth: 0 },
        playerShield: 0,
        gameStatus: 'DEFEAT',
        defeatReason: 'HEALTH',
        lastDamageTaken: { normal: normalDamage, core: coreDamage },
        lastReflectedDamage: actualReflectedDmg,
        lastLeechedHealth: amountLeeched,
        lastEnemyShieldRecovered: enemyShieldRecovered,
        lastPlayerEvadedTime: 0,
        isPlayerStunned: false,
        playerStunEndTime: 0,
      };
    }

    return {
      ...state,
      player: { ...state.player, currentHealth: nextHealth },
      playerShield: remainingPlayerShield,
      enemyShield: nextEnemyShield,
      currentEnemy: { ...state.currentEnemy, currentHealth: enemyNextHealth },
      lastDamageTaken: { normal: normalDamage, core: coreDamage },
      lastReflectedDamage: actualReflectedDmg,
      lastLeechedHealth: amountLeeched,
      lastEnemyShieldRecovered: enemyShieldRecovered,
      lastPlayerEvadedTime: 0,
      isPlayerStunned: isPlayerStunned,
      playerStunEndTime: playerStunEndTime,
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
    const computed = getComputedStats(s.player.stats, s.unlockedSkills, s.activeBuffs);
    const bonusMultiplier = 1 + computed.modifiers.offlineRewardMultiplier;

    const now = Date.now();
    const goldMult = (s.activeBuffs['buff_gold_2x'] && s.activeBuffs['buff_gold_2x'] > now) ? 2.0 : 1.0;
    const expMult = (s.activeBuffs['buff_exp_2x'] && s.activeBuffs['buff_exp_2x'] > now) ? 2.0 : 1.0;

    const g = Math.floor(10 * b * minutes * bonusMultiplier * goldMult);
    const e = Math.floor(5 * b * minutes * bonusMultiplier * expMult);

    set(st => ({
      player: { ...st.player, gold: st.player.gold + g, experience: st.player.experience + e },
      lastOnlineTime: Date.now()
    }));
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

  buyShopItem: (item: ShopItem) => set((state) => {
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

useGameStore.subscribe((state) => saveStateToLocalStorage(state));