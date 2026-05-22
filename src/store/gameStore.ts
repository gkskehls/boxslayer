import { create } from 'zustand';
import type { GameState, Player, Enemy, Stats } from '../types/game';

interface GameActions {
  attackEnemy: () => void;
  attackPlayer: (damage: number) => void;
  levelUp: () => void;
  distributeStat: (stat: keyof Stats) => void;
  spawnEnemy: () => void;
  resetGame: () => void;
}

const initialStats: Stats = {
  attack: 10,
  defense: 5,
  maxHealth: 100,
  attackSpeed: 1,
};

const initialPlayer: Player = {
  id: 'player',
  name: 'Slayer',
  level: 1,
  stats: initialStats,
  currentHealth: 100,
  experience: 0,
  nextLevelExperience: 100,
  statPoints: 0,
};

export const useGameStore = create<GameState & GameActions>((set) => ({
  player: initialPlayer,
  currentEnemy: null,
  stage: 1,
  isAutoBattle: true,
  gameStatus: 'IDLE',

  spawnEnemy: () => set((state) => {
    const stageMultiplier = 1 + (state.stage - 1) * 0.1;
    const isBoss = state.stage % 5 === 0;
    const enemy: Enemy = {
      id: `enemy-${state.stage}`,
      name: isBoss ? `Boss Box ${state.stage}` : `Box ${state.stage}`,
      level: state.stage,
      type: isBoss ? 'BOSS' : 'NORMAL',
      stats: {
        attack: Math.floor(8 * stageMultiplier * (isBoss ? 2 : 1)),
        defense: Math.floor(3 * stageMultiplier * (isBoss ? 1.5 : 1)),
        maxHealth: Math.floor(50 * stageMultiplier * (isBoss ? 5 : 1)),
        attackSpeed: 0.8 + (isBoss ? 0.2 : 0),
      },
      currentHealth: Math.floor(50 * stageMultiplier * (isBoss ? 5 : 1)),
      goldReward: state.stage * 10 * (isBoss ? 5 : 1),
      expReward: state.stage * 20 * (isBoss ? 3 : 1),
    };
    return { currentEnemy: enemy, gameStatus: 'BATTLE' };
  }),

  attackEnemy: () => set((state) => {
    if (!state.currentEnemy) return {};
    const damage = Math.max(1, state.player.stats.attack - state.currentEnemy.stats.defense);
    const newEnemyHealth = state.currentEnemy.currentHealth - damage;

    if (newEnemyHealth <= 0) {
      const newExp = state.player.experience + state.currentEnemy.expReward;
      let newPlayer = { ...state.player, experience: newExp };
      
      if (newPlayer.experience >= newPlayer.nextLevelExperience) {
        newPlayer.level += 1;
        newPlayer.experience -= newPlayer.nextLevelExperience;
        newPlayer.nextLevelExperience = Math.floor(newPlayer.nextLevelExperience * 1.5);
        newPlayer.statPoints += 3;
      }

      return {
        player: newPlayer,
        currentEnemy: null,
        stage: state.stage + 1,
        gameStatus: 'VICTORY',
      };
    }

    return {
      currentEnemy: { ...state.currentEnemy, currentHealth: newEnemyHealth }
    };
  }),

  attackPlayer: (damage: number) => set((state) => {
    const actualDamage = Math.max(1, damage - state.player.stats.defense);
    const newHealth = state.player.currentHealth - actualDamage;

    if (newHealth <= 0) {
      return {
        player: { ...state.player, currentHealth: 0 },
        gameStatus: 'DEFEAT'
      };
    }

    return {
      player: { ...state.player, currentHealth: newHealth }
    };
  }),

  distributeStat: (stat: keyof Stats) => set((state) => {
    if (state.player.statPoints <= 0) return {};
    
    const newStats = { ...state.player.stats };
    if (stat === 'maxHealth') {
        newStats[stat] += 20;
    } else if (stat === 'attackSpeed') {
        newStats[stat] += 0.05;
    } else {
        newStats[stat] += 2;
    }

    return {
      player: {
        ...state.player,
        stats: newStats,
        statPoints: state.player.statPoints - 1,
        currentHealth: stat === 'maxHealth' ? state.player.currentHealth + 20 : state.player.currentHealth
      }
    };
  }),

  levelUp: () => set((state) => ({
      player: { ...state.player, level: state.player.level + 1, statPoints: state.player.statPoints + 3 }
  })),

  resetGame: () => set({
    player: initialPlayer,
    currentEnemy: null,
    stage: 1,
    gameStatus: 'IDLE'
  }),
}));
