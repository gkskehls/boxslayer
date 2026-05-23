import React from 'react';
import { useGameStore } from '../store/gameStore';

interface TownScreenProps {
  onNavigate: (screen: 'BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN') => void;
}

const TownScreen: React.FC<TownScreenProps> = ({ onNavigate }) => {
  const { player, stage } = useGameStore();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <h2 className="text-3xl font-bold text-yellow-400 mb-6">마을 (Town)</h2>
      <p className="text-xl text-neutral-300 mb-8">현재 스테이지: {stage} | 레벨: {player.level}</p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <button
          onClick={() => onNavigate('BATTLE_SCREEN')}
          className="px-6 py-4 bg-red-600 text-white text-xl font-bold rounded-lg hover:bg-red-500 transition-colors"
        >
          전투 시작
        </button>
        <button
          onClick={() => onNavigate('STATS_SCREEN')}
          className="px-6 py-4 bg-blue-600 text-white text-xl font-bold rounded-lg hover:bg-blue-500 transition-colors"
        >
          스탯 관리
        </button>
        <button
          onClick={() => onNavigate('CORE_SCREEN')}
          className="px-6 py-4 bg-purple-600 text-white text-xl font-bold rounded-lg hover:bg-purple-500 transition-colors"
        >
          코어 관리
        </button>
        <button
          onClick={() => onNavigate('SHOP_SCREEN')}
          className="px-6 py-4 bg-green-600 text-white text-xl font-bold rounded-lg hover:bg-green-500 transition-colors"
        >
          상점
        </button>
      </div>
    </div>
  );
};

export default TownScreen;