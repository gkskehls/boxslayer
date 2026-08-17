// src/data/rebirthConfig.ts

import type { RebirthUpgrades, CoreAbilityLevels, CoreType } from '../types/game';

export interface RebirthUpgradeConfig {
  id: keyof RebirthUpgrades;
  name: string;
  category: 'STAT' | 'UTILITY';
  icon: string;
  desc: string;
  baseCost: number;
  costMultiplier: number;
  valuePerLevel: number;
  isPercent: boolean;
  maxLevel?: number;
}

export const REBIRTH_UPGRADES_CONFIG: RebirthUpgradeConfig[] = [
  // 1. 기본 스탯 계열 (모든 전투력은 STR, DEX, CON 스탯에 의해서만 계산)
  {
    id: 'flatStr',
    name: '기본 힘',
    category: 'STAT',
    icon: '💪',
    desc: '기본 힘 스탯을 영구히 증가시킵니다. (+1 / Lv)',
    baseCost: 2,
    costMultiplier: 1.15,
    valuePerLevel: 1,
    isPercent: false,
  },
  {
    id: 'percentStr',
    name: '힘 증폭',
    category: 'STAT',
    icon: '🔥',
    desc: '총 힘 스탯을 백분율로 증폭합니다. (+1.5% / Lv)',
    baseCost: 10,
    costMultiplier: 1.25,
    valuePerLevel: 1.5,
    isPercent: true,
  },
  {
    id: 'flatDex',
    name: '기본 민첩',
    category: 'STAT',
    icon: '🏃',
    desc: '기본 민첩 스탯을 영구히 증가시킵니다. (+1 / Lv)',
    baseCost: 2,
    costMultiplier: 1.15,
    valuePerLevel: 1,
    isPercent: false,
  },
  {
    id: 'percentDex',
    name: '민첩 증폭',
    category: 'STAT',
    icon: '🌪️',
    desc: '총 민첩 스탯을 백분율로 증폭합니다. (+1.5% / Lv)',
    baseCost: 10,
    costMultiplier: 1.25,
    valuePerLevel: 1.5,
    isPercent: true,
  },
  {
    id: 'flatCon',
    name: '기본 체력',
    category: 'STAT',
    icon: '🛡️',
    desc: '기본 체력 스탯을 영구히 증가시킵니다. (+1 / Lv)',
    baseCost: 2,
    costMultiplier: 1.15,
    valuePerLevel: 1,
    isPercent: false,
  },
  {
    id: 'percentCon',
    name: '체력 증폭',
    category: 'STAT',
    icon: '💖',
    desc: '총 체력 스탯을 백분율로 증폭합니다. (+1.5% / Lv)',
    baseCost: 10,
    costMultiplier: 1.25,
    valuePerLevel: 1.5,
    isPercent: true,
  },

  // 2. 유틸리티 계열
  {
    id: 'goldGainPercent',
    name: '골드 획득량',
    category: 'UTILITY',
    icon: '🪙',
    desc: '사냥 및 오프라인 골드 획득량을 증폭합니다. (+5% / Lv)',
    baseCost: 5,
    costMultiplier: 1.2,
    valuePerLevel: 5,
    isPercent: true,
  },
  {
    id: 'expGainPercent',
    name: '경험치 획득량',
    category: 'UTILITY',
    icon: '📚',
    desc: '사냥 및 오프라인 경험치 획득량을 증폭합니다. (+5% / Lv)',
    baseCost: 5,
    costMultiplier: 1.2,
    valuePerLevel: 5,
    isPercent: true,
  },
  {
    id: 'coreFragmentDropRatePercent',
    name: '코어 조각 드랍률',
    category: 'UTILITY',
    icon: '💎',
    desc: '적 처치 시 코어 조각 드랍 확률 및 수량을 증폭합니다. (+3% / Lv)',
    baseCost: 10,
    costMultiplier: 1.25,
    valuePerLevel: 3,
    isPercent: true,
  },
  {
    id: 'oneShotLeapBonus',
    name: '원샷 도약 추가 층수',
    category: 'UTILITY',
    icon: '🚀',
    desc: '적을 1방에 처치할 때 추가로 건너뛰는 층수를 늘립니다. (+1층 / 5Lv)',
    baseCost: 50,
    costMultiplier: 1.4,
    valuePerLevel: 0.2,
    isPercent: false,
    maxLevel: 25,
  },
];

// 비용 계산 헬퍼
export const calculateRebirthUpgradeCost = (config: RebirthUpgradeConfig, currentLevel: number, count: number = 1): number => {
  let total = 0;
  for (let i = 0; i < count; i++) {
    const lvl = currentLevel + i;
    total += Math.floor(config.baseCost * Math.pow(config.costMultiplier, lvl));
  }
  return total;
};

// 🔮 코어 조각 독립 연구 기능 설정
export interface CoreAbilityConfig {
  id: keyof CoreAbilityLevels;
  coreType: CoreType;
  tier: 1 | 2 | 3 | 4 | 5;
  name: string;
  icon: string;
  desc: string;
  activationNote?: string;
  baseCost: number;       // 코어 조각 기본 비용 (1, 10, 100, 1000, 10000)
  costMultiplier: number;
  valuePerLevel: number;
  unit: string;
  maxLevel?: number;
  requiredAbilityId?: keyof CoreAbilityLevels;
}

export const CORE_ABILITIES_CONFIG: CoreAbilityConfig[] = [
  // 1. 물의 코어 (WATER) - 방어막/반사/흡혈/생존 특화
  {
    id: 'water_initial_shield',
    coreType: 'WATER',
    tier: 1,
    name: '시작 수호 쉴드',
    icon: '🛡️',
    desc: '전투 시작 시 생성되는 기본 수호 쉴드량을 추가로 증가시킵니다.',
    activationNote: '기본 시작 쉴드 강화',
    baseCost: 1,
    costMultiplier: 1.20,
    valuePerLevel: 2.0,
    unit: '%',
    maxLevel: 40,
  },
  {
    id: 'water_shield_on_hit',
    coreType: 'WATER',
    tier: 2,
    name: '타격 쉴드 충전',
    icon: '🌊',
    desc: '공격 타격할 때마다 최대 체력의 일정 비율만큼 쉴드를 실시간 회복합니다.',
    activationNote: '해금 시 타격 쉴드 충전 능력 활성화',
    baseCost: 10,
    costMultiplier: 1.25,
    valuePerLevel: 0.4,
    unit: '%',
    maxLevel: 30,
    requiredAbilityId: 'water_initial_shield',
  },
  {
    id: 'water_life_steal',
    coreType: 'WATER',
    tier: 3,
    name: '생명 갈취',
    icon: '🩸',
    desc: '적에게 가한 총 데미지의 일부를 체력으로 즉시 흡혈 회복합니다.',
    activationNote: '해금 시 체력 흡혈 능력 활성화',
    baseCost: 100,
    costMultiplier: 1.28,
    valuePerLevel: 0.5,
    unit: '%',
    maxLevel: 30,
    requiredAbilityId: 'water_shield_on_hit',
  },
  {
    id: 'water_thorns_reflect',
    coreType: 'WATER',
    tier: 4,
    name: '가시 반사',
    icon: '🌀',
    desc: '피격당할 때 받은 피해의 일부를 적에게 즉시 반사합니다.',
    activationNote: '해금 시 피해 반사 능력 활성화',
    baseCost: 1000,
    costMultiplier: 1.30,
    valuePerLevel: 2.0,
    unit: '%',
    maxLevel: 50,
    requiredAbilityId: 'water_life_steal',
  },
  {
    id: 'water_shield_burst',
    coreType: 'WATER',
    tier: 5,
    name: '수호 공명',
    icon: '💎',
    desc: '쉴드가 유지되는 동안 적에게 가하는 모든 공격 피해가 크게 증폭됩니다.',
    activationNote: '해금 시 쉴드 유지 중 피해 증폭 활성화',
    baseCost: 10000,
    costMultiplier: 1.35,
    valuePerLevel: 2.0,
    unit: '%',
    maxLevel: 40,
    requiredAbilityId: 'water_thorns_reflect',
  },

  // 2. 불의 코어 (FIRE) - 방어무시/힘계수/지속화상/초신성 폭발 특화
  {
    id: 'fire_flat_damage',
    coreType: 'FIRE',
    tier: 1,
    name: '작열의 불꽃',
    icon: '🔥',
    desc: '공격할 때 적의 방어력을 무시하는 고정 화염 관통 데미지를 추가합니다.',
    activationNote: '기본 화염 추가 피해 강화',
    baseCost: 1,
    costMultiplier: 1.20,
    valuePerLevel: 4,
    unit: ' 피해',
  },
  {
    id: 'fire_str_ratio',
    coreType: 'FIRE',
    tier: 2,
    name: '근력 연소',
    icon: '💥',
    desc: '힘(STR) 스탯에 비례한 추가 화염 관통 피해 계수를 활성화합니다.',
    activationNote: '해금 시 STR 비례 화염 추가 피해 활성화',
    baseCost: 10,
    costMultiplier: 1.25,
    valuePerLevel: 4.0,
    unit: '%',
    maxLevel: 40,
    requiredAbilityId: 'fire_flat_damage',
  },
  {
    id: 'fire_burn_dot',
    coreType: 'FIRE',
    tier: 3,
    name: '지옥불 화상',
    icon: '🌋',
    desc: '매 타격마다 적에게 틱당 화염 지속 피해(DoT)를 추가로 누적합니다.',
    activationNote: '해금 시 지속 화상 피해 활성화',
    baseCost: 100,
    costMultiplier: 1.28,
    valuePerLevel: 2.5,
    unit: '%',
    maxLevel: 40,
    requiredAbilityId: 'fire_str_ratio',
  },
  {
    id: 'fire_damage_multiplier',
    coreType: 'FIRE',
    tier: 4,
    name: '화염 폭발',
    icon: '☄️',
    desc: '화염으로 인한 모든 속성 피해량을 최종 백분율로 증폭합니다.',
    activationNote: '해금 시 화염 피해 백분율 증폭 활성화',
    baseCost: 1000,
    costMultiplier: 1.30,
    valuePerLevel: 2.5,
    unit: '%',
    maxLevel: 50,
    requiredAbilityId: 'fire_burn_dot',
  },
  {
    id: 'fire_supernova',
    coreType: 'FIRE',
    tier: 5,
    name: '초신성 폭발',
    icon: '🌟',
    desc: '5회 공격마다 공격력의 150%에 달하는 강력한 초신성 폭발 피해를 발동합니다.',
    activationNote: '해금 시 5타 주기 초신성 대폭발 활성화',
    baseCost: 10000,
    costMultiplier: 1.35,
    valuePerLevel: 5.0,
    unit: '% 폭발피해',
    maxLevel: 40,
    requiredAbilityId: 'fire_damage_multiplier',
  },

  // 3. 바람의 코어 (WIND) - 명중회피/질풍연격/폭풍강타/절대잔상 특화
  {
    id: 'wind_hit_evasion',
    coreType: 'WIND',
    tier: 1,
    name: '질풍의 궤적',
    icon: '🍃',
    desc: '기본 명중률과 회피율을 추가로 상승시킵니다.',
    activationNote: '기본 명중/회피 강화',
    baseCost: 1,
    costMultiplier: 1.20,
    valuePerLevel: 0.5,
    unit: '%',
    maxLevel: 40,
  },
  {
    id: 'wind_multi_hit_chance',
    coreType: 'WIND',
    tier: 2,
    name: '질풍 연격',
    icon: '⚔️',
    desc: '매 공격마다 2~3연타 연격(Multi-Hit)을 발동할 확률을 활성화합니다.',
    activationNote: '해금 시 연격(Multi-Hit) 발동 능력 활성화',
    baseCost: 10,
    costMultiplier: 1.25,
    valuePerLevel: 1.5,
    unit: '%',
    maxLevel: 40,
    requiredAbilityId: 'wind_hit_evasion',
  },
  {
    id: 'wind_multi_hit_damage',
    coreType: 'WIND',
    tier: 3,
    name: '연격 증폭',
    icon: '🌪️',
    desc: '연격(Multi-Hit) 발동 타격들의 데미지 배율을 추가 상승시킵니다.',
    activationNote: '해금 시 연격 타격 데미지 증폭 활성화',
    baseCost: 100,
    costMultiplier: 1.28,
    valuePerLevel: 3.0,
    unit: '%',
    maxLevel: 40,
    requiredAbilityId: 'wind_multi_hit_chance',
  },
  {
    id: 'wind_combo_burst',
    coreType: 'WIND',
    tier: 4,
    name: '태풍의 눈',
    icon: '🌀',
    desc: '10회 타격 누적 시마다 공격력 150%의 폭풍 강타를 날립니다.',
    activationNote: '해금 시 10타 주기 태풍 강타 활성화',
    baseCost: 1000,
    costMultiplier: 1.30,
    valuePerLevel: 5.0,
    unit: '% 강타피해',
    maxLevel: 40,
    requiredAbilityId: 'wind_multi_hit_damage',
  },
  {
    id: 'wind_absolute_evasion',
    coreType: 'WIND',
    tier: 5,
    name: '잔상 분신',
    icon: '👤',
    desc: '8회 타격 누적 시 다음 적의 공격을 1회 100% 절대 회피합니다.',
    activationNote: '해금 시 8타 주기 100% 절대 회피 활성화',
    baseCost: 10000,
    costMultiplier: 1.35,
    valuePerLevel: 1.0,
    unit: '회',
    maxLevel: 1,
    requiredAbilityId: 'wind_combo_burst',
  },

  // 4. 번개의 코어 (ELECTRIC) - 추가뇌전/감전기절/전류지속/처형/과부하 특화
  {
    id: 'electric_flat_damage',
    coreType: 'ELECTRIC',
    tier: 1,
    name: '뇌전 스파크',
    icon: '⚡',
    desc: '공격할 때 방어 무시 번개 피해를 추가로 가산합니다.',
    activationNote: '기본 번개 추가 피해 강화',
    baseCost: 1,
    costMultiplier: 1.20,
    valuePerLevel: 3,
    unit: ' 피해',
  },
  {
    id: 'electric_stun_chance',
    coreType: 'ELECTRIC',
    tier: 2,
    name: '감전 유도',
    icon: '💫',
    desc: '매 타격마다 적을 감전 기절(Stun)시킬 확률을 활성화합니다.',
    activationNote: '해금 시 적 감전 기절(Stun) 능력 활성화',
    baseCost: 10,
    costMultiplier: 1.25,
    valuePerLevel: 1.0,
    unit: '%',
    maxLevel: 40,
    requiredAbilityId: 'electric_flat_damage',
  },
  {
    id: 'electric_stun_duration',
    coreType: 'ELECTRIC',
    tier: 3,
    name: '전류 지속',
    icon: '⏱️',
    desc: '감전 기절 지속 시간을 연장합니다 (+100ms / Lv).',
    activationNote: '해금 시 기절 지속 시간 연장',
    baseCost: 100,
    costMultiplier: 1.28,
    valuePerLevel: 0.1,
    unit: '초',
    maxLevel: 30,
    requiredAbilityId: 'electric_stun_chance',
  },
  {
    id: 'electric_execution_damage',
    coreType: 'ELECTRIC',
    tier: 4,
    name: '뇌신 처형',
    icon: '🗡️',
    desc: '기절(Stun) 상태인 적을 공격할 때 가하는 데미지가 폭발적으로 증폭됩니다.',
    activationNote: '해금 시 기절 적 대상 처형 데미지 활성화',
    baseCost: 1000,
    costMultiplier: 1.30,
    valuePerLevel: 5.0,
    unit: '%',
    maxLevel: 50,
    requiredAbilityId: 'electric_stun_duration',
  },
  {
    id: 'electric_chain_overload',
    coreType: 'ELECTRIC',
    tier: 5,
    name: '과부하 방전',
    icon: '⚡',
    desc: '기절 중인 적을 공격할 때마다 공격력 50%의 강력한 추가 낙뢰를 떨어뜨립니다.',
    activationNote: '해금 시 기절 적 타격 시 추가 낙뢰 발동 활성화',
    baseCost: 10000,
    costMultiplier: 1.35,
    valuePerLevel: 3.0,
    unit: '% 낙뢰피해',
    maxLevel: 40,
    requiredAbilityId: 'electric_execution_damage',
  },
];

export const calculateCoreAbilityCost = (config: CoreAbilityConfig, currentLevel: number): number => {
  return Math.floor(config.baseCost * Math.pow(config.costMultiplier, currentLevel));
};

/**
 * 층수(Stage)에 따른 적의 코어 연구 티어(단계) 해금 기준
 * 플레이어의 코어 조각 획득 속도(평균 100층당 1개)와 동일하게 동기화:
 * - 1~99층: Tier 0 (코어 장착, 0연구 기본 상태: 기초 고정 속성 피해/기초 쉴드/기초 명중)
 * - 100~999층: Tier 1 (1개 해금 수준: 기초 스펙 강화)
 * - 1,000~9,999층: Tier 2 (10개 해금 수준: 근력계수/타격쉴드충전/질풍연격/감전기절)
 * - 10,000~99,999층: Tier 3 (100개 해금 수준: 지속화상/생명갈취/연격증폭/기절연장)
 * - 100,000~999,999층: Tier 4 (1,000개 해금 수준: 화염폭발/가시반사/태풍강타/뇌신처형)
 * - 1,000,000층+: Tier 5 (10,000개 해금 수준: 초신성/수호공명/잔상회피/과부하방전)
 */
export const getEnemyCoreTier = (stage: number): number => {
  if (stage >= 1000000) return 5;
  if (stage >= 100000) return 4;
  if (stage >= 10000) return 3;
  if (stage >= 1000) return 2;
  if (stage >= 100) return 1;
  return 0;
};

export const canUnlockCoreAbility = (
  config: CoreAbilityConfig,
  currentAbilities: Partial<CoreAbilityLevels> | undefined
): { canUnlock: boolean; reason?: string } => {
  if (!config.requiredAbilityId) {
    return { canUnlock: true };
  }
  const requiredLvl = currentAbilities?.[config.requiredAbilityId] || 0;
  if (requiredLvl <= 0) {
    const parentConfig = CORE_ABILITIES_CONFIG.find(c => c.id === config.requiredAbilityId);
    return {
      canUnlock: false,
      reason: `선행 연구 [${parentConfig?.name || '이전 단계'}] 1Lv 이상 필요`,
    };
  }
  return { canUnlock: true };
};

export const calculateTotalSpentRP = (rebirthUpgrades?: Partial<RebirthUpgrades>): number => {
  if (!rebirthUpgrades) return 0;
  let total = 0;
  for (const config of REBIRTH_UPGRADES_CONFIG) {
    const lvl = rebirthUpgrades[config.id] || 0;
    if (lvl > 0) {
      total += calculateRebirthUpgradeCost(config, 0, lvl);
    }
  }
  return total;
};

export const calculateTotalSpentCoreFragments = (coreAbilities?: Partial<CoreAbilityLevels>): number => {
  if (!coreAbilities) return 0;
  let total = 0;
  for (const config of CORE_ABILITIES_CONFIG) {
    const lvl = coreAbilities[config.id] || 0;
    for (let i = 0; i < lvl; i++) {
      total += calculateCoreAbilityCost(config, i);
    }
  }
  return total;
};
