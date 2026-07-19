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
  // --- 1. 임시 스탯 펌핑 (환생 전까지 영구 유지) ---
  {
    id: "stat_temp_1",
    name: "초급 훈련 교본",
    description: "보너스 스탯 포인트를 10 얻습니다. (환생 시 초기화)",
    type: "TEMP_STAT",
    cost: 5000,
    effect: { target: "statPoints", value: 10 },
    requiredSkillId: null
  },
  {
    id: "stat_temp_2",
    name: "중급 훈련 교본",
    description: "보너스 스탯 포인트를 50 얻습니다. (환생 시 초기화)",
    type: "TEMP_STAT",
    cost: 30000,
    effect: { target: "statPoints", value: 50 },
    requiredSkillId: null
  },
  {
    id: "stat_temp_3",
    name: "한계 돌파의 비약",
    description: "보너스 스탯 포인트를 300 얻습니다. (환생 시 초기화)",
    type: "TEMP_STAT",
    cost: 250000,
    effect: { target: "statPoints", value: 300 },
    requiredSkillId: "skill_basic_master" // 예: 기초 훈련 마스터 노드
  },

  // --- 2. 시간제 기본 버프 (골드, 경험치, 속도 등) ---
  {
    id: "buff_gold_2x",
    name: "황금 고블린의 축복",
    description: "30분 동안 획득하는 골드가 2배로 증가합니다.",
    type: "TIMED_BUFF",
    cost: 10000,
    effect: { target: "goldMultiplier", value: 2.0 },
    duration: 1800, // 30분
    requiredSkillId: null
  },
  {
    id: "buff_exp_2x",
    name: "현자의 스크롤",
    description: "30분 동안 획득하는 경험치가 2배로 증가합니다.",
    type: "TIMED_BUFF",
    cost: 15000,
    effect: { target: "expMultiplier", value: 2.0 },
    duration: 1800,
    requiredSkillId: null
  },
  {
    id: "buff_speed_up",
    name: "신속의 물약",
    description: "15분 동안 공격 속도가 1.5배 빨라집니다.",
    type: "TIMED_BUFF",
    cost: 20000,
    effect: { target: "atkSpeedMultiplier", value: 1.5 },
    duration: 900, // 15분
    requiredSkillId: null
  },
  {
    id: "buff_berserk",
    name: "광폭화 캡슐",
    description: "10분 동안 공격력이 3배가 되지만, 방어력이 0이 됩니다.",
    type: "TIMED_BUFF",
    cost: 50000,
    effect: { target: "berserkMode", value: 1 }, // 1 = 활성화
    duration: 600, // 10분
    requiredSkillId: null
  },
  {
    id: "buff_boss_tracker",
    name: "보스 추적기",
    description: "20분 동안 일반 몬스터를 건너뛰고 보스만 상대합니다.",
    type: "TIMED_BUFF",
    cost: 80000,
    effect: { target: "bossTracking", value: 1 }, // 1 = 활성화
    duration: 1200, // 20분
    requiredSkillId: null
  },

  // --- 3. 코어 스킬 조건부 특수 버프 ---
  {
    id: "buff_core_fire",
    name: "초열의 가열로 (특수)",
    description: "30분 동안 불 코어의 고정 데미지가 10배 폭발합니다.",
    type: "TIMED_BUFF",
    cost: 100000,
    effect: { target: "fireExtreme", value: 10.0 },
    duration: 1800,
    requiredSkillId: "fire_core_3" // 불 코어 3단계 해금 조건
  },
  {
    id: "buff_core_wind",
    name: "태풍의 눈 (특수)",
    description: "30분 동안 바람 코어 콤보 폭발 요구 타격수가 5회로 감소합니다.",
    type: "TIMED_BUFF",
    cost: 100000,
    effect: { target: "windExtreme", value: 5.0 },
    duration: 1800,
    requiredSkillId: "wind_core_3"
  },
  {
    id: "buff_core_water",
    name: "절대 영도의 방패 (특수)",
    description: "30분 동안 물 코어의 반사 데미지가 500%로 증폭됩니다.",
    type: "TIMED_BUFF",
    cost: 100000,
    effect: { target: "waterExtreme", value: 5.0 },
    duration: 1800,
    requiredSkillId: "water_core_3"
  },
  {
    id: "buff_core_earth",
    name: "대지의 결속 (특수)",
    description: "30분 동안 최대 체력이 5배, 방어력이 3배 증가합니다.",
    type: "TIMED_BUFF",
    cost: 100000,
    effect: { target: "earthExtreme", value: 1 },
    duration: 1800,
    requiredSkillId: "earth_core_3"
  }
];