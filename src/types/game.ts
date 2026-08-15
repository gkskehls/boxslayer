// src/types/game.ts

export type EnemyType = 'NORMAL';

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
  tempStatPoints: number;
  gold: number;
}

export interface Enemy extends Entity {
  type: EnemyType;
  maxHealth: number;
  goldReward: number;
  expReward: number;
  core?: Core | null;
  shield?: number;
}

export type CoreType = 'FIRE' | 'WATER' | 'WIND' | 'ELECTRIC';

export interface Core {
  id?: string;
  name: string;
  type: CoreType;
  level: number;
}

export type DefeatReason = 'HEALTH' | 'TIMEOUT';

export interface DamageDetails {
  normal: number;
  core: number;
  isCombo?: boolean;
  comboHits?: number;
  isOneShotLeap?: boolean;
  leapedStages?: number;
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
  lastDamageDealt: DamageDetails & { shieldRecovered?: number };
  lastDamageTaken: DamageDetails;
  lastLeechedHealth: number;
  lastEnemyShieldRecovered: number;
  battleStartTime: number;
  reincarnationPoints: number;
  unlockedSkills: string[];
  playerShield: number;
  enemyShield: number;
  windHitCount: number;
  hasWindEvasion: boolean;
  elecHitCount: number;
  lastReflectedDamage: number;
  lastEnemyEvadedTime: number;
  lastPlayerEvadedTime: number;
  activeBuffs: Record<string, number>;
  defeatReason?: DefeatReason;
  playerStunEndTime: number;
  enemyStunEndTime: number;
}

export type SkillNodeType = 'NORMAL' | 'NOTABLE' | 'KEYSTONE';

export interface CoreEffect {
  strRatio?: number;
  baseDamageMultiplier?: number;
  baseDamageFlat?: number;
  shieldPerHitRatio?: number;
  initialShieldMultiplier?: number;
  reflectRatio?: number;
  hitEvasionBonus?: number;
  comboThreshold?: number;
  comboDamageMultiplier?: number;
  evasionThreshold?: number;
  stunThreshold?: number;
  stunDuration?: number;
  executeDamageMultiplier?: number;
}

export interface SkillEffects {
  str?: number;
  dex?: number;
  con?: number;
  strPercent?: number;  // 예: 0.05 = +5%
  dexPercent?: number;  // 예: 0.05 = +5%
  conPercent?: number;  // 예: 0.05 = +5%
  comboChance?: number;      // 연격 발동 확률 (예: 0.15 = 15%)
  comboMultiplier?: number;  // 연격 데미지 배율 (예: 1.5 = 150%)
  comboHitsAdded?: number;   // 연격 시 추가 타격 수 (예: +1회)
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