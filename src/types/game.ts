export type EnemyType = 'NORMAL' | 'ELITE' | 'BOSS';

export interface Stats {
  str: number;
  dex: number;
  con: number;
  attack: number;
  defense: number;
  maxHealth: number;
  attackSpeed: number;
  evasion: number;
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
}