// src/constants/shopItems.ts

export type ShopItemType = 'TEMP_STAT' | 'TIMED_BUFF';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: ShopItemType;
  cost: number;
  effect: {
    target: string;
    value: number;
  };
  duration?: number; // 초 단위 (시간제 버프에만 존재)
  requiredSkillId?: string | null; // null이면 조건 없음
}

export const SHOP_ITEMS: ShopItem[] = [
  // --- 1. 임시 스탯 펌핑 (환생 전까지 유지) ---
  {
    id: "stat_temp_1",
    name: "초급 훈련 교본",
    description: "보너스 스탯 포인트 +1을 얻습니다. (환생 시 초기화)",
    type: "TEMP_STAT",
    cost: 5000,
    effect: { target: "statPoints", value: 1 },
    requiredSkillId: null
  },
  {
    id: "stat_temp_2",
    name: "중급 훈련 교본",
    description: "보너스 스탯 포인트 +10을 얻습니다. (환생 시 초기화)",
    type: "TEMP_STAT",
    cost: 45000,
    effect: { target: "statPoints", value: 10 },
    requiredSkillId: null
  },
  {
    id: "stat_temp_3",
    name: "한계 돌파의 비약",
    description: "보너스 스탯 포인트 +100을 얻습니다. (환생 시 초기화)",
    type: "TEMP_STAT",
    cost: 400000,
    effect: { target: "statPoints", value: 100 },
    requiredSkillId: null
  },

  // --- 2. 시간제 파밍 버프 (골드, 경험치) ---
  {
    id: "buff_gold_2x",
    name: "황금 상인의 축복",
    description: "30분 동안 획득하는 골드가 2배로 증가합니다.",
    type: "TIMED_BUFF",
    cost: 10000,
    effect: { target: "goldMultiplier", value: 2.0 },
    duration: 1800,
    requiredSkillId: null
  },
  {
    id: "buff_exp_2x",
    name: "현자의 비전서",
    description: "30분 동안 획득하는 경험치가 2배로 증가합니다.",
    type: "TIMED_BUFF",
    cost: 10000,
    effect: { target: "expMultiplier", value: 2.0 },
    duration: 1800,
    requiredSkillId: null
  },

  // --- 3. 속성 코어 극한 각성 버프 ---
  {
    id: "buff_berserk",
    name: "광전사의 분노",
    description: "10분 동안 공격력이 3배로 증가하고 방어력이 0이 됩니다.",
    type: "TIMED_BUFF",
    cost: 50000,
    effect: { target: "attackMultiplier", value: 3.0 },
    duration: 600,
    requiredSkillId: null
  },
  {
    id: "buff_core_earth",
    name: "대지의 가호",
    description: "10분 동안 최대 체력이 5배, 방어력이 3배로 증가합니다.",
    type: "TIMED_BUFF",
    cost: 50000,
    effect: { target: "defenseMultiplier", value: 3.0 },
    duration: 600,
    requiredSkillId: null
  },
];
