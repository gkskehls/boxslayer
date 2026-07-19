// src/store/gameStore.ts

import { create } from 'zustand';
import type { GameState, Player, Stats, Core, ShopItem } from '../types/game';
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
  buyShopItem: (item: ShopItem) => void; 
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
  let maxHealth = 100 + (finalStats.con * 2);

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

const getInitialStoreState = (): any => {
  const loadedState = loadStateFromLocalStorage();

  if (loadedState) {
    return {
      ...loadedState,
      reincarnationPoints: loadedState.reincarnationPoints || 0,
      unlockedSkills: loadedState.unlockedSkills || ['core_origin'],
      maxStage: loadedState.maxStage || loadedState.stage || 1,
      lastEnemyEvadedTime: 0,
      lastPlayerEvadedTime: 0,
      activeBuffs: loadedState.activeBuffs || {}
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
    lastPlayerEvadedTime: 0,
    activeBuffs: {}
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
      lastPlayerEvadedTime: 0,
      activeBuffs: {}
    };
  }),

  spawnEnemy: () => set((state) => {
    const now = Date.now();
    const isBossTrackerActive = state.activeBuffs['buff_boss_tracker'] && state.activeBuffs['buff_boss_tracker'] > now;
    
    // [수정] 보스 추적기 발동 시 일반 층을 완전히 건너뛰고 다음 5의 배수(보스층)로 강제 워프!
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

    let initialShield = 0;
    if (state.equippedCore?.type === 'WATER') {
      const waterStats = getCoreStats('WATER', state.equippedCore.level);
      const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs);
      initialShield = Math.floor(playerComputed.maxHealth * (waterStats.initialRatio || 0));
    }

    // [수정] 획득 재화 2배 버프를 스폰될 때 적의 능력치에 아예 박아버려서 UI에도 확실히 표시되게 변경
    const goldMult = (state.activeBuffs['buff_gold_2x'] && state.activeBuffs['buff_gold_2x'] > now) ? 2.0 : 1.0;
    const expMult = (state.activeBuffs['buff_exp_2x'] && state.activeBuffs['buff_exp_2x'] > now) ? 2.0 : 1.0;

    return {
      stage: nextStage, // 워프된 스테이지 저장
      maxStage: Math.max(state.maxStage || 1, nextStage),
      currentEnemy: {
        id: `enemy-${nextStage}`,
        name: isBoss ? `BOSS ${nextStage}` : `BOX ${nextStage}`,
        level: nextStage,
        type: isBoss ? 'BOSS' : 'NORMAL',
        stats: stats,
        currentHealth: Math.floor(getComputedStats(stats).maxHealth),
        goldReward: Math.floor((10 + nextStage) * (isBoss ? 2 : 1) * goldMult), // 여기서 미리 2배 곱하기
        expReward: Math.floor((20 + (nextStage * 20)) * (isBoss ? 2 : 1) * expMult), // 여기서 미리 2배 곱하기
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

    const now = Date.now();
    const playerComputed = getComputedStats(state.player.stats, state.unlockedSkills, state.activeBuffs);
    const enemyComputed = getComputedStats(state.currentEnemy.stats);

    let hitChance = 0.9 + ((playerComputed.accuracy - enemyComputed.evasion) * 0.01);

    if (state.equippedCore?.type === 'WIND') {
      const windStats = getCoreStats('WIND', state.equippedCore.level);
      hitChance += (windStats.hitEvasionBonus || 0);
    }

    const finalHitChance = Math.max(0.1, Math.min(1.0, hitChance));
    const isEvaded = Math.random() > finalHitChance;

    const elapsedTime = now - (state.battleStartTime || now);
    const config = BATTLE_SPEED_CONFIG.slice().reverse().find(c => elapsedTime >= c.threshold) || BATTLE_SPEED_CONFIG[0];
    
    const speedMult = (state.activeBuffs['buff_speed_up'] && state.activeBuffs['buff_speed_up'] > now) ? 1.5 : 1.0;
    const hitCount = Math.floor(config.multiplier * playerComputed.modifiers.feverMultiplier * speedMult);

    let normalDamage = 0;
    let coreDamage = 0;
    let nextShield = state.playerShield || 0;
    let currentWindHits = state.windHitCount || 0;
    let nextWindEvasion = state.hasWindEvasion || false;
    let currentElecHits = state.elecHitCount || 0;
    let nextEnemyStunned = state.isEnemyStunned || false;

    if (!isEvaded) {
      const baseNormalDamage = Math.floor(Math.max(1, playerComputed.attack - enemyComputed.defense));
      normalDamage = baseNormalDamage * hitCount;

      if (state.equippedCore) {
        const stats = getCoreStats(state.equippedCore.type, state.equippedCore.level);
        if (state.equippedCore.type === 'FIRE') {
          const myStr = state.player.stats.str;
          const strBonusDamage = myStr * (stats.fireDamageRatio || 0);
          const baseCoreDamage = (stats.fireDamage || 0) + strBonusDamage;
          const isFireExtreme = state.activeBuffs['buff_core_fire'] && state.activeBuffs['buff_core_fire'] > now;
          coreDamage = Math.floor(baseCoreDamage * hitCount * (isFireExtreme ? 10 : 1));
        }
        else if (state.equippedCore.type === 'WATER') {
          const regenAmount = Math.floor(playerComputed.maxHealth * (stats.regenRatio || 0));
          const totalRegen = regenAmount * hitCount;
          nextShield = Math.min(playerComputed.maxHealth * 20000, nextShield + totalRegen);
        }
        else if (state.equippedCore.type === 'WIND') {
          coreDamage += Math.floor(playerComputed.attack);
          currentWindHits += hitCount;
          const isWindExtreme = state.activeBuffs['buff_core_wind'] && state.activeBuffs['buff_core_wind'] > now;
          const comboThreshold = isWindExtreme ? 5 : 15;
          const evasionThreshold = 20;

          if (currentWindHits >= comboThreshold) {
            coreDamage += Math.floor(playerComputed.attack);
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

    const totalDamage = Math.floor(normalDamage + coreDamage);
    const newEnemyHealth = Math.max(0, Math.floor(state.currentEnemy.currentHealth - totalDamage));

    if (newEnemyHealth <= 0) {
      // [수정] 스폰될 때 이미 2배 버프가 곱해져서 생성되었으므로 화면에 뜨는 그대로 줍니다!
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
        lastDamageDealt: { normal: Math.floor(normalDamage), core: Math.floor(coreDamage) },
        playerShield: nextShield,
        windHitCount: currentWindHits,
        hasWindEvasion: nextWindEvasion,
        elecHitCount: currentElecHits,
        isEnemyStunned: nextEnemyStunned,
        lastEnemyEvadedTime: isEvaded ? now : state.lastEnemyEvadedTime
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
      lastEnemyEvadedTime: isEvaded ? now : state.lastEnemyEvadedTime
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

    let hitChance = 0.9 + ((enemyComputed.accuracy - playerComputed.evasion) * 0.01);

    hitChance -= playerComputed.modifiers.evasionChanceBonus;
    if (state.equippedCore?.type === 'WIND') {
      const windStats = getCoreStats('WIND', state.equippedCore.level);
      hitChance -= (windStats.hitEvasionBonus || 0);
    }

    const finalHitChance = Math.max(0.1, Math.min(1.0, hitChance));

    if (state.equippedCore?.type === 'WIND' && state.hasWindEvasion) {
      return { hasWindEvasion: false, lastPlayerEvadedTime: now };
    }

    if (Math.random() > finalHitChance) {
      return { lastPlayerEvadedTime: now };
    }

    const damage = Math.floor(Math.max(1, enemyComputed.attack - playerComputed.defense));
    let remainingShield = state.playerShield || 0;
    let actualHealthDamage = 0;

    if (remainingShield >= damage) {
      remainingShield -= damage;
    } else {
      actualHealthDamage = damage - remainingShield;
      remainingShield = 0;
    }

    const nextHealth = Math.max(0, Math.floor(state.player.currentHealth - actualHealthDamage));
    let enemyNextHealth = state.currentEnemy.currentHealth;
    let actualReflectedDmg = 0;

    if (state.equippedCore?.type === 'WATER') {
      const stats = getCoreStats('WATER', state.equippedCore.level);
      const isWaterExtreme = state.activeBuffs['buff_core_water'] && state.activeBuffs['buff_core_water'] > now;
      actualReflectedDmg = Math.floor(damage * (stats.reflectRatio || 0) * (isWaterExtreme ? 5 : 1));

      if (actualReflectedDmg > 0) {
        enemyNextHealth = Math.max(0, Math.floor(enemyNextHealth - actualReflectedDmg)); 
      }
    }

    if (nextHealth <= 0) {
      return {
        player: { ...state.player, currentHealth: 0 },
        playerShield: 0,
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
    const computed = getComputedStats(s.player.stats, s.unlockedSkills, s.activeBuffs);
    const bonusMultiplier = 1 + computed.modifiers.offlineRewardMultiplier;

    // [수정] 오프라인 보상 정산 시에도 시간제 버프 배율을 곱해줍니다!
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