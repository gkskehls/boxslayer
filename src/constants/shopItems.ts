// src/constants/shopItems.ts

export type ShopItemType = 'TIMED_BUFF';

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
  duration?: number; // 초 단위 (시간제 버프)
  requiredSkillId?: string | null; // null이면 조건 없음
}

export const SHOP_ITEMS: ShopItem[] = [
  // --- 1. 시간제 파밍 버프 (골드, 경험치) ---
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

  // --- 2. 속성 코어 극한 각성 버프 ---
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
