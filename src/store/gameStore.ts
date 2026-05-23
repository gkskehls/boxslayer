import { create } from 'zustand';
import type { GameState, Player, Enemy, Stats, Core } from '../types/game'; // Core 타입 추가

// Helper functions for localStorage
const LOCAL_STORAGE_KEY = 'boxslayer-game-state';

const loadStateFromLocalStorage = (): GameState | null => {
  try {
    const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (serializedState === null) {
      return null;
    }
    const parsedState = JSON.parse(serializedState);
    // Basic validation to ensure it's a GameState
    if (parsedState && parsedState.player && parsedState.player.stats) {
      // Ensure currentHealth doesn't exceed maxHealth if stats changed
      parsedState.player.currentHealth = Math.min(parsedState.player.currentHealth, parsedState.player.stats.maxHealth);
      // Initialize playerCores and equippedCores if they don't exist in loaded state
      parsedState.playerCores = parsedState.playerCores || [];
      parsedState.equippedCores = parsedState.equippedCores || [null, null, null]; // 3 slots for example
      return parsedState as GameState;
    }
    return null;
  } catch (error) {
    console.error("Error loading state from localStorage:", error);
    return null;
  }
};

const saveStateToLocalStorage = (state: GameState) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
  } catch (error) {
    console.error("Error saving state to localStorage:", error);
  }
};

interface GameActions {
  attackEnemy: () => void;
  attackPlayer: (damage: number) => void;
  levelUp: () => void;
  distributeStat: (stat: keyof Stats) => void;
  spawnEnemy: () => void;
  resetGame: () => void;
  // Core Actions
  acquireCore: (core: Core) => void;
  equipCore: (coreId: string, slotIndex: number) => void;
  unequipCore: (slotIndex: number) => void;
  upgradeCore: (coreId: string) => void;
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

// Initial state for the store, potentially loaded from localStorage
const getInitialStoreState = (): GameState => {
  const loadedState = loadStateFromLocalStorage();
  if (loadedState) {
    return {
      ...loadedState,
      gameStatus: 'IDLE', // Always start as IDLE on load
      currentEnemy: null, // Clear current enemy on load
    };
  }
  return {
    player: initialPlayer,
    currentEnemy: null,
    stage: 1,
    isAutoBattle: true,
    gameStatus: 'IDLE',
    playerCores: [], // Initial empty core inventory
    equippedCores: [null, null, null], // Initial 3 empty core slots
  };
};

export const useGameStore = create<GameState & GameActions>((set) => ({ // 'get' 매개변수 제거
  ...getInitialStoreState(),

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
    switch (stat) {
      case 'attack':
        newStats.attack += 1;
        break;
      case 'defense':
        newStats.defense += 1;
        break;
      case 'maxHealth':
        newStats.maxHealth += 10;
        break;
      case 'attackSpeed':
        newStats.attackSpeed += 0.05;
        break;
    }

    return {
      player: {
        ...state.player,
        stats: newStats,
        statPoints: state.player.statPoints - 1,
        currentHealth: stat === 'maxHealth' ? state.player.currentHealth + 10 : state.player.currentHealth // 최대체력 증가 시 현재 체력도 같이 증가
      }
    };
  }),

  levelUp: () => set((state) => ({
    player: { ...state.player, level: state.player.level + 1, statPoints: state.player.statPoints + 3 }
  })),

  resetGame: () => {
    set({
      player: initialPlayer,
      currentEnemy: null,
      stage: 1,
      gameStatus: 'IDLE',
      playerCores: [],
      equippedCores: [null, null, null],
    });
    // After resetting, save the initial state to localStorage
    saveStateToLocalStorage(getInitialStoreState()); // Save the default initial state
  },

  // Core Actions
  acquireCore: (core: Core) => set((state) => ({
    playerCores: [...state.playerCores, core],
  })),

  equipCore: (coreId: string, slotIndex: number) => set((state) => {
    const coreToEquip = state.playerCores.find(c => c.id === coreId);
    if (!coreToEquip || slotIndex < 0 || slotIndex >= state.equippedCores.length) {
      return {}; // Invalid core or slot
    }

    const newEquippedCores = [...state.equippedCores];
    const newPlayerCores = state.playerCores.filter(c => c.id !== coreId);

    // If there's already a core in the slot, move it back to inventory
    if (newEquippedCores[slotIndex]) {
      newPlayerCores.push(newEquippedCores[slotIndex] as Core);
    }

    newEquippedCores[slotIndex] = coreToEquip;

    return {
      playerCores: newPlayerCores,
      equippedCores: newEquippedCores,
    };
  }),

  unequipCore: (slotIndex: number) => set((state) => {
    if (slotIndex < 0 || slotIndex >= state.equippedCores.length || !state.equippedCores[slotIndex]) {
      return {}; // Invalid slot or no core equipped
    }

    const coreToUnequip = state.equippedCores[slotIndex] as Core;
    const newEquippedCores = [...state.equippedCores];
    newEquippedCores[slotIndex] = null;

    return {
      playerCores: [...state.playerCores, coreToUnequip],
      equippedCores: newEquippedCores,
    };
  }),

  upgradeCore: (coreId: string) => set((state) => {
    const coreIndex = state.playerCores.findIndex(c => c.id === coreId);
    const equippedCoreIndex = state.equippedCores.findIndex(c => c && c.id === coreId);

    if (coreIndex === -1 && equippedCoreIndex === -1) {
      return {}; // Core not found
    }

    // Determine if core is in inventory or equipped
    const targetCore = coreIndex !== -1 ? state.playerCores[coreIndex] : state.equippedCores[equippedCoreIndex] as Core;

    // For simplicity, let's assume upgrade cost is always met for now
    // In a real game, you'd check for gold/resources
    const upgradedCore = {
      ...targetCore,
      level: targetCore.level + 1,
      // Example: Increase fireDamage by 10 per level
      effects: {
        ...targetCore.effects,
        fireDamage: (targetCore.effects.fireDamage || 0) + 10,
        // Add more specific upgrade logic for other effects
      },
      upgradeCost: Math.floor(targetCore.upgradeCost * 1.5), // Increase cost
    };

    const newPlayerCores = [...state.playerCores];
    const newEquippedCores = [...state.equippedCores];

    if (coreIndex !== -1) {
      newPlayerCores[coreIndex] = upgradedCore;
    } else {
      newEquippedCores[equippedCoreIndex] = upgradedCore;
    }

    return {
      playerCores: newPlayerCores,
      equippedCores: newEquippedCores,
    };
  }),
}));

// Subscribe to state changes to automatically save
useGameStore.subscribe(
  (state) => {
    // For simplicity, let's save the entire state on every change.
    // A more optimized approach would be to debounce this or only save specific parts.
    saveStateToLocalStorage(state);
  }
);