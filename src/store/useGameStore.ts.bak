import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameState {
  gold: number;
  gameStatus: 'idle' | 'fighting' | 'reward';
  // 액션들
  spendGold: (amount: number) => void;
  addGold: (amount: number) => void;
  attackPlayer: (damage: number) => void;
  attackEnemy: () => void;
  spawnEnemy: () => void;
  calculateOfflineRewards: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      gold: 1000, // 초기 자본
      gameStatus: 'idle',

      spendGold: (amount) => 
        set((state) => ({ 
          gold: Math.max(0, state.gold - amount) 
        })),

      addGold: (amount) => 
        set((state) => ({ 
          gold: state.gold + amount 
        })),

      attackPlayer: (damage) => {
        console.log(`${damage}만큼 데미지를 입었습니다.`);
      },

      attackEnemy: () => {
        console.log("적을 공격합니다.");
      },

      spawnEnemy: () => {
        set({ gameStatus: 'fighting' });
        console.log("적이 나타났습니다.");
      },

      calculateOfflineRewards: () => {
        const reward = 500;
        set((state) => ({ gold: state.gold + reward }));
        console.log(`${reward} 골드 오프라인 보상 획득!`);
      },
    }),
    { name: 'boxslayer-storage' } // 브라우저에 골드 정보 등을 저장 (선택 사항)
  )
);