// src/types/game.ts

export type EnemyType = 'NORMAL' | 'ELITE' | 'BOSS';

export interface Stats {
  str: number;
  dex: number;
  con: number;
}

export interface Entity {
  id: string;
  name: string;
  level: number;
  stats: Stats;
  currentHealth: number;
}

export interface Player extends Entity {
  experience: number;
  nextLevelExperience: number;
  statPoints: number;
  tempStatPoints: number; // [신규] 상점에서 구매한 임시 스탯 포인트 (환생 시 초기화)
  gold: number;
}

export interface Enemy extends Entity {
  type: EnemyType;
  goldReward: number;
  expReward: number;
}

// 1. 코어 타입 정의 (이제 데이터 구조가 단순해집니다)
export type CoreType = 'FIRE' | 'WATER' | 'WIND' | 'ELECTRIC' | 'EARTH';

// 2. Core 인터페이스 단순화: 이제 데이터 저장에는 id, type, level만 사용합니다.
export interface Core {
  id: string;
  name: string;
  type: CoreType;
  level: number;
}

export interface GameState {
  player: Player;
  currentEnemy: Enemy | null;
  stage: number;
  maxStage: number;
  isAutoBattle: boolean;
  gameStatus: 'IDLE' | 'BATTLE' | 'VICTORY' | 'DEFEAT';
  playerCores: Core[];
  equippedCore: Core | null;
  lastOnlineTime: number;
  lastDamageDealt: {
    normal: number;
    core: number;
  };
  battleStartTime: number;
  reincarnationPoints: number;
  unlockedSkills: string[];
  playerShield?: number; // 물 코어용 쉴드 상태값
  windHitCount?: number;  // 바람 코어: 연격 및 회피용 누적 타격 수
  hasWindEvasion?: boolean; // 바람 코어: 확정 회피 충전 여부
  elecHitCount?: number;    // 번개 코어: 기절용 누적 타격 수
  isEnemyStunned?: boolean;  // 번개 코어: 적의 기절 상태 여부
  lastReflectedDamage?: number; // 물 코어 반사 데미지 표시용
  activeBuffs: Record<string, number>; // [신규] 활성화된 상점 버프 (키: buffId, 값: 종료 타임스탬프)
}

export type SkillNodeType = 'NORMAL' | 'NOTABLE' | 'KEYSTONE';

export interface SkillEffects {
  str?: number;
  dex?: number;
  con?: number;
  goldMultiplier?: number;
  expMultiplier?: number;
  feverMultiplier?: number;
  startStageBonus?: number;
  rpBonusMultiplier?: number;
  offlineRewardMultiplier?: number;
  coreBonus?: number;
  multiHitRequired?: number; // 연격에 필요한 타격 횟수
  multiHitDamageBonus?: number; // 연격 데미지 추가 증가율 (%)
  evasionChanceBonus?: number; // 추가 회피 확률 (%)
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  type: SkillNodeType;
  cost: number;
  requires: string[];
  effects: SkillEffects;
}

// [신규] 상점 아이템 타입 정의
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