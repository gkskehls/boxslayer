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
}

export interface Enemy extends Entity {
  type: EnemyType;
  goldReward: number;
  expReward: number;
}

export interface GameState {
  player: Player;
  currentEnemy: Enemy | null;
  stage: number;
  isAutoBattle: boolean;
  gameStatus: 'IDLE' | 'BATTLE' | 'VICTORY' | 'DEFEAT';
}
