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
  core?: Core | null;
  shield?: number; // [신규] 적의 보호막
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

export type DefeatReason = 'HEALTH' | 'TIMEOUT';

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
    shieldRecovered?: number;
  };
  lastDamageTaken: {
    normal: number;
    core: number;
  };
  lastLeechedHealth?: number;
  lastEnemyShieldRecovered?: number; // [신규] 적이 회복한 쉴드 양
  battleStartTime: number;
  reincarnationPoints: number;
  unlockedSkills: string[];
  playerShield?: number;
  enemyShield?: number;
  windHitCount?: number;
  hasWindEvasion?: boolean;
  elecHitCount?: number;
  isEnemyStunned?: boolean;
  lastReflectedDamage?: number;
  lastEnemyEvadedTime?: number;
  lastPlayerEvadedTime?: number;
  activeBuffs: Record<string, number>;
  defeatReason?: DefeatReason;
  isPlayerStunned?: boolean;
  playerStunEndTime?: number;
}

export type SkillNodeType = 'NORMAL' | 'NOTABLE' | 'KEYSTONE';

export interface CoreEffect {
  // FIRE
  strRatio?: number;
  baseDamageMultiplier?: number;
  baseDamageFlat?: number;

  // WATER
  shieldPerHitRatio?: number;
  initialShieldMultiplier?: number;
  reflectRatio?: number;

  // WIND
  hitEvasionBonus?: number;
  comboThreshold?: number;
  comboDamageMultiplier?: number;
  evasionThreshold?: number;

  // ELECTRIC
  stunThreshold?: number;
  stunDuration?: number;
  stunDamageMultiplier?: number;
  executeDamageMultiplier?: number;
}

export interface SkillEffects {
  str?: number;
  dex?: number;
  con?: number;
  statPoints?: number;
  goldMultiplier?: number;
  expMultiplier?: number;
  feverMultiplier?: number;
  startStageBonus?: number;
  rpBonusMultiplier?: number;
  offlineRewardMultiplier?: number;
  coreBonus?: number;
  multiHitRequired?: number;
  multiHitDamageBonus?: number;
  evasionChanceBonus?: number;
  coreEffects?: Partial<Record<CoreType, CoreEffect>>;
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
  duration?: number;
  requiredSkillId?: string | null;
}