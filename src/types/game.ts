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

export interface CoreAbilityLevels {
  // 💧 물의 코어 (WATER)
  water_initial_shield?: number;     // 시작 수호 쉴드
  water_shield_on_hit?: number;      // 타격 시 쉴드 회복
  water_thorns_reflect?: number;     // 피격 피해 반사
  water_life_steal?: number;         // 타격 피해 흡혈
  water_shield_burst?: number;       // 쉴드 유지 시 데미지 증폭

  // 🔥 불의 코어 (FIRE)
  fire_flat_damage?: number;         // 고정 화염 관통 데미지
  fire_str_ratio?: number;           // 힘(STR) 비례 화염 계수
  fire_burn_dot?: number;            // 화염 도트 지속 피해
  fire_damage_multiplier?: number;   // 화염 폭발 증폭
  fire_supernova?: number;           // 5타 주기 초신성 폭발

  // 🌪️ 바람의 코어 (WIND)
  wind_hit_evasion?: number;         // 명중 및 회피율 상승
  wind_multi_hit_chance?: number;    // 연격 발동 확률
  wind_multi_hit_damage?: number;    // 연격 데미지 배율
  wind_combo_burst?: number;         // 10타 누적 태풍 강타
  wind_absolute_evasion?: number;    // 잔상 분신 절대 회피

  // ⚡ 번개의 코어 (ELECTRIC)
  electric_flat_damage?: number;     // 기본 번개 추가 피해
  electric_stun_chance?: number;     // 감전 기절 유도 확률
  electric_stun_duration?: number;   // 기절 지속 시간 증가
  electric_execution_damage?: number;// 기절 적 처형 추가 데미지
  electric_chain_overload?: number;  // 과부하 방전 추가 낙뢰

  // 하위 호환성 (Legacy fallback)
  initialShield?: number;
  shieldOnHit?: number;
  lifeSteal?: number;
  thornsReflect?: number;
  multiHitMastery?: number;
  elementalBurst?: number;
  elementalResonance?: number;
}

export interface RebirthUpgrades {
  // 기본 스탯 (Flat & %)
  flatStr: number;
  flatDex: number;
  flatCon: number;
  percentStr: number;
  percentDex: number;
  percentCon: number;
  // 유틸리티
  goldGainPercent: number;
  expGainPercent: number;
  coreFragmentDropRatePercent: number;
  oneShotLeapBonus: number;
  // 하위 호환성용 옵셔널 (구 저장 데이터 호환)
  flatAttack?: number;
  percentAttack?: number;
  flatDefense?: number;
  percentDefense?: number;
  flatHp?: number;
  percentHp?: number;
}

export type DefeatReason = 'HEALTH' | 'TIMEOUT';

export interface DamageDetails {
  normal: number;
  core: number;
  isCombo?: boolean;
  comboHits?: number;
  attemptHits?: number;
  successfulHits?: number;
  attackSpeed?: number;
  isOneShotLeap?: boolean;
  leapedStages?: number;
  absorbedByShield?: number;
  attackStage?: number;
  turn?: number;
}

export interface GameState {
  player: Player;
  currentEnemy: Enemy | null;
  stage: number;
  maxStage: number;
  allTimeMaxStage?: number;
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
  battleTurn: number;
  reincarnationPoints: number;
  // [신규 영구 재화 및 연구]
  coreFragments: number;             // 💎 사냥 드랍 코어 조각
  boxFragments: number;              // 📦 박스 조각
  rebirthUpgrades: RebirthUpgrades;  // 🌟 환생 RP 무한 업그레이드
  coreAbilities: CoreAbilityLevels;  // 🔮 코어 조각 영구 특화 레벨
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
  // [PVP 대전 및 프로필]
  playerName: string;
  pvpSnapshot: import('./pvp').PvpProfile | null;
  pvpRating: number;
  pvpWins: number;
  pvpLosses: number;
  pvpBattleLogs: import('./pvp').PvpBattleLog[];
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
  duration?: number;
  requiredSkillId?: string | null;
}