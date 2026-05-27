export type EnemyType = 'NORMAL' | 'ELITE' | 'BOSS';

export interface Stats {
  attack: number;
  defense: number;
  maxHealth: number;
  attackSpeed: number; // Attacks per second
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
  gold: number; // Player에 골드 필드 추가
}

export interface Enemy extends Entity {
  type: EnemyType;
  goldReward: number;
  expReward: number;
}

// --- Core System Types ---
export type CoreType = 'FIRE' | 'WATER' | 'WIND' | 'ELECTRIC';

export interface CoreEffect {
  // 불 코어: 민첩 스탯 차이로 공격이 빗나가더라도 고정 화속성 데미지를 입힙니다.
  // 또는 몸통박치기 시 일정 확률로 추가 화속성 데미지
  fireDamage?: number; // 고정 화속성 데미지
  fireDamageRatio?: number; // 현재 공격력의 일정 %를 화속성 데미지로

  // 물 코어: 일정 시간마다 보호막을 생성하거나, 적에게 둔화 효과를 부여합니다.
  shieldAmount?: number; // 보호막 흡수량
  slowChance?: number; // 둔화 효과 발동 확률 (0-1)
  slowDuration?: number; // 둔화 효과 지속 시간 (초)
  slowAmount?: number; // 둔화 효과량 (예: 이동 속도 감소 %)

  // 바람 코어: 공격 속도를 증가시키거나, 일정 확률로 적의 공격을 회피합니다.
  attackSpeedBonus?: number; // 공격 속도 증가량 (ASPD 스탯에 직접 더해짐)
  evasionChance?: number; // 회피 확률 (0-1)

  // 전기 코어: 일정 확률로 적을 기절시키거나, 주변 적에게 연쇄 데미지를 입힙니다.
  stunChance?: number; // 기절 확률 (0-1)
  stunDuration?: number; // 기절 지속 시간 (초)
  chainDamage?: number; // 연쇄 데미지 (추후 다수 적 구현 시)
}

export interface Core {
  id: string;
  name: string;
  type: CoreType;
  level: number;
  effects: CoreEffect;
  upgradeCost: number; // 코어 강화 비용
  description: string;
}

export interface GameState {
  player: Player;
  currentEnemy: Enemy | null;
  stage: number;
  isAutoBattle: boolean;
  gameStatus: 'IDLE' | 'BATTLE' | 'VICTORY' | 'DEFEAT';
  playerCores: Core[]; // 플레이어가 보유한 코어 인벤토리
  equippedCores: (Core | null)[]; // 플레이어가 장착한 코어 슬롯 (예: 3개 슬롯)
  lastOnlineTime: number; // 마지막 접속 시간 (유닉스 타임스탬프, 밀리초)
}