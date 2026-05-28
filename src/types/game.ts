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

export type CoreType = 'FIRE' | 'WATER' | 'WIND' | 'ELECTRIC';
export interface CoreEffect {
  fireDamage?: number; fireDamageRatio?: number;
  shieldAmount?: number; slowChance?: number; slowDuration?: number; slowAmount?: number;
  attackSpeedBonus?: number; evasionChance?: number;
  stunChance?: number; stunDuration?: number; chainDamage?: number;
}

export interface Core {
  id: string; name: string; type: CoreType; level: number;
  effects: CoreEffect; upgradeCost: number; description: string; price: number;
}

export interface GameState {
  player: Player;
  currentEnemy: Enemy | null;
  stage: number;
  isAutoBattle: boolean;
  gameStatus: 'IDLE' | 'BATTLE' | 'VICTORY' | 'DEFEAT';
  playerCores: Core[];
  equippedCores: (Core | null)[];
  lastOnlineTime: number;
}