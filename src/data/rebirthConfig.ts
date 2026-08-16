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
    name: '기본 힘 (STR)',
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
    name: '힘 증폭 (STR %)',
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
    name: '기본 민첩 (DEX)',
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
    name: '민첩 증폭 (DEX %)',
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
    name: '기본 체력 (CON)',
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
    name: '체력 증폭 (CON %)',
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
    name: '골드 획득량 (%)',
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
    name: '경험치 획득량 (%)',
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
    name: '💎 코어 조각 드랍률',
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
  name: string;
  icon: string;
  desc: string;
  baseCost: number;       // 코어 조각 기본 비용
  costMultiplier: number;
  valuePerLevel: number;
  unit: string;
  maxLevel?: number;
}

export const CORE_ABILITIES_CONFIG: CoreAbilityConfig[] = [
  // 💧 1. 물의 코어 (WATER) - 방어막/반사/흡혈/생존 특화
  {
    id: 'water_initial_shield',
    coreType: 'WATER',
    name: '시작 수호 쉴드',
    icon: '🛡️',
    desc: '물 코어 장착 시 전투 시작 때 최대 체력의 일정 비율만큼 쉴드를 생성합니다.',
    baseCost: 5,
    costMultiplier: 1.22,
    valuePerLevel: 2.5,
    unit: '%',
    maxLevel: 40, // 최대 100%
  },
  {
    id: 'water_shield_on_hit',
    coreType: 'WATER',
    name: '조류의 충전 (Shield On Hit)',
    icon: '🔋',
    desc: '물 코어 장착 시 공격할 때마다 최대 체력의 일정 비율만큼 쉴드를 회복합니다.',
    baseCost: 8,
    costMultiplier: 1.25,
    valuePerLevel: 0.5,
    unit: '%',
    maxLevel: 30,
  },
  {
    id: 'water_thorns_reflect',
    coreType: 'WATER',
    name: '해일의 가시 (Thorns Reflect)',
    icon: '🌀',
    desc: '물 코어 장착 시 피격당할 때 받은 피해의 일부를 적에게 즉시 반사합니다.',
    baseCost: 6,
    costMultiplier: 1.22,
    valuePerLevel: 2.0,
    unit: '%',
    maxLevel: 50, // 최대 100%
  },
  {
    id: 'water_life_steal',
    coreType: 'WATER',
    name: '생명 갈취 (Life Steal)',
    icon: '🩸',
    desc: '물 코어 장착 시 적에게 가한 총 데미지의 일부를 체력으로 흡수합니다.',
    baseCost: 10,
    costMultiplier: 1.28,
    valuePerLevel: 0.5,
    unit: '%',
    maxLevel: 30,
  },
  {
    id: 'water_shield_burst',
    coreType: 'WATER',
    name: '수호 공명 (Shield Resonance)',
    icon: '🌊',
    desc: '물 코어 장착 시 쉴드가 유지되는 동안 적에게 가하는 모든 피해가 증폭됩니다.',
    baseCost: 15,
    costMultiplier: 1.30,
    valuePerLevel: 2.0,
    unit: '%',
    maxLevel: 40,
  },

  // 🔥 2. 불의 코어 (FIRE) - 방어무시/힘계수/지속화상/초신성 폭발 특화
  {
    id: 'fire_flat_damage',
    coreType: 'FIRE',
    name: '작열의 불꽃 (Flame Strike)',
    icon: '🔥',
    desc: '불 코어 장착 시 공격할 때 적의 방어력을 무시하는 고정 화염 관통 피해를 줍니다.',
    baseCost: 5,
    costMultiplier: 1.20,
    valuePerLevel: 6,
    unit: ' 피해',
  },
  {
    id: 'fire_str_ratio',
    coreType: 'FIRE',
    name: '근력의 연소 (Ignite STR)',
    icon: '💪',
    desc: '불 코어 장착 시 힘(STR) 스탯에 비례한 추가 화염 피해 계수를 상승시킵니다.',
    baseCost: 10,
    costMultiplier: 1.26,
    valuePerLevel: 5.0,
    unit: '%',
    maxLevel: 40,
  },
  {
    id: 'fire_burn_dot',
    coreType: 'FIRE',
    name: '지옥불 화상 (Infernal Burn)',
    icon: '🌋',
    desc: '불 코어 장착 시 매 타격마다 적에게 틱당 화염 지속 피해(DoT)를 추가로 누적합니다.',
    baseCost: 8,
    costMultiplier: 1.24,
    valuePerLevel: 3.0,
    unit: '%',
    maxLevel: 40,
  },
  {
    id: 'fire_damage_multiplier',
    coreType: 'FIRE',
    name: '화염 폭발 (Flame Burst)',
    icon: '💥',
    desc: '불 코어 장착 시 화염으로 인한 모든 피해량을 최종 백분율로 증폭합니다.',
    baseCost: 15,
    costMultiplier: 1.30,
    valuePerLevel: 2.5,
    unit: '%',
    maxLevel: 50,
  },
  {
    id: 'fire_supernova',
    coreType: 'FIRE',
    name: '초신성 폭발 (Supernova)',
    icon: '☄️',
    desc: '불 코어 장착 시 5회 공격마다 공격력의 150%에 달하는 강력한 폭발 피해를 발동합니다.',
    baseCost: 20,
    costMultiplier: 1.35,
    valuePerLevel: 5.0,
    unit: '% 폭발피해',
    maxLevel: 40,
  },

  // 🌪️ 3. 바람의 코어 (WIND) - 명중회피/질풍연격/폭풍강타/절대잔상 특화
  {
    id: 'wind_hit_evasion',
    coreType: 'WIND',
    name: '질풍의 궤적 (Wind Swiftness)',
    icon: '🍃',
    desc: '바람 코어 장착 시 기본 명중률과 회피율이 추가로 상승합니다.',
    baseCost: 6,
    costMultiplier: 1.22,
    valuePerLevel: 0.5,
    unit: '%',
    maxLevel: 40,
  },
  {
    id: 'wind_multi_hit_chance',
    coreType: 'WIND',
    name: '질풍 연격 (Multi-Hit Chance)',
    icon: '⚡',
    desc: '바람 코어 장착 시 매 공격마다 2~3연타 연격(Multi-Hit)을 발동할 확률이 증가합니다.',
    baseCost: 10,
    costMultiplier: 1.28,
    valuePerLevel: 1.5,
    unit: '%',
    maxLevel: 40, // 최대 60%
  },
  {
    id: 'wind_multi_hit_damage',
    coreType: 'WIND',
    name: '연격 증폭 (Combo Multiplier)',
    icon: '🌪️',
    desc: '바람 코어 장착 시 연격 발동 타격들의 데미지 배율이 추가 상승합니다.',
    baseCost: 12,
    costMultiplier: 1.30,
    valuePerLevel: 4.0,
    unit: '%',
    maxLevel: 40,
  },
  {
    id: 'wind_combo_burst',
    coreType: 'WIND',
    name: '태풍의 눈 (Gale Finisher)',
    icon: '🌀',
    desc: '바람 코어 장착 시 10회 타격 누적 시마다 공격력 150%의 폭풍 강타를 날립니다.',
    baseCost: 15,
    costMultiplier: 1.32,
    valuePerLevel: 5.0,
    unit: '% 강타피해',
    maxLevel: 40,
  },
  {
    id: 'wind_absolute_evasion',
    coreType: 'WIND',
    name: '잔상 분신 (Phantom Dodge)',
    icon: '💨',
    desc: '바람 코어 장착 시 8회 타격마다 다음 적의 공격을 1회 100% 절대 회피합니다.',
    baseCost: 20,
    costMultiplier: 1.35,
    valuePerLevel: 1.0,
    unit: '회',
    maxLevel: 1, // 활성화형
  },

  // ⚡ 4. 번개의 코어 (ELECTRIC) - 추가뇌전/감전기절/전류지속/처형/과부하 특화
  {
    id: 'electric_flat_damage',
    coreType: 'ELECTRIC',
    name: '뇌전의 스파크 (Lightning Spark)',
    icon: '⚡',
    desc: '번개 코어 장착 시 공격할 때 방어 무시 번개 피해를 추가로 가산합니다.',
    baseCost: 5,
    costMultiplier: 1.20,
    valuePerLevel: 5,
    unit: ' 피해',
  },
  {
    id: 'electric_stun_chance',
    coreType: 'ELECTRIC',
    name: '감전 유도 (Shock Charge)',
    icon: '🧲',
    desc: '번개 코어 장착 시 매 타격마다 적을 감전 기절(Stun)시킬 확률이 증가합니다.',
    baseCost: 10,
    costMultiplier: 1.26,
    valuePerLevel: 1.0,
    unit: '%',
    maxLevel: 40,
  },
  {
    id: 'electric_stun_duration',
    coreType: 'ELECTRIC',
    name: '전류 지속 (Shock Hold)',
    icon: '⏱️',
    desc: '번개 코어 장착 시 기절 지속 시간이 늘어납니다 (+100ms / Lv).',
    baseCost: 8,
    costMultiplier: 1.25,
    valuePerLevel: 0.1,
    unit: '초',
    maxLevel: 30, // 최대 +3초
  },
  {
    id: 'electric_execution_damage',
    coreType: 'ELECTRIC',
    name: '뇌신 처형 (Executioner)',
    icon: '👑',
    desc: '번개 코어 장착 시 기절(Stun) 상태인 적을 공격할 때 가하는 데미지가 폭발적으로 증폭됩니다.',
    baseCost: 15,
    costMultiplier: 1.30,
    valuePerLevel: 5.0,
    unit: '%',
    maxLevel: 50,
  },
  {
    id: 'electric_chain_overload',
    coreType: 'ELECTRIC',
    name: '과부하 방전 (Overload Bolt)',
    icon: '🌩️',
    desc: '번개 코어 장착 시 기절 중인 적을 공격할 때마다 강력한 추가 낙뢰(공격력 50%)를 떨어뜨립니다.',
    baseCost: 20,
    costMultiplier: 1.35,
    valuePerLevel: 3.0,
    unit: '% 낙뢰피해',
    maxLevel: 40,
  },
];

export const calculateCoreAbilityCost = (config: CoreAbilityConfig, currentLevel: number): number => {
  return Math.floor(config.baseCost * Math.pow(config.costMultiplier, currentLevel));
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
