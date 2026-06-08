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
  gold: number;
}

export interface Enemy extends Entity {
  type: EnemyType;
  goldReward: number;
  expReward: number;
}

// 1. 코어 타입 정의 (이제 데이터 구조가 단순해집니다)
export type CoreType = 'FIRE' | 'WATER' | 'WIND' | 'ELECTRIC';

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
  playerShield?: number; // [신규] 물 코어용 쉴드 상태값
  windHitCount?: number;  // [신규] 바람 코어: 연격 및 회피용 누적 타격 수
  hasWindEvasion?: boolean; // [신규] 바람 코어: 확정 회피 충전 여부 (true일 때 다음 적 공격 1회 무조건 무시)
  elecHitCount?: number;    // [신규] 번개 코어: 기절용 누적 타격 수
  isEnemyStunned?: boolean;  // [신규] 번개 코어: 적의 기절 상태 여부
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
  // [신규 추가] 바람 코어 및 특수 기믹용 스탯
  multiHitRequired?: number; // 연격에 필요한 타격 횟수 (예: 15, 5 등)
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