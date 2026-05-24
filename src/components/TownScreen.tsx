import React from 'react';
import { useGameStore } from '../store/gameStore';

interface TownScreenProps {
  onNavigate: (screen: 'BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN') => void;
}

const TownScreen: React.FC<TownScreenProps> = ({ onNavigate }) => {
  const { player, stage } = useGameStore();

  return (
    <div className="max-w-4xl mx-auto p-6 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-6 items-center justify-center">
      <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 w-full text-center">
        <h2 className="text-3xl font-bold text-yellow-400 mb-4">마을 (Town)</h2>
        <p className="text-xl text-neutral-300">현재 스테이지: <span className="font-bold text-white">{stage}</span> | 레벨: <span className="font-bold text-white">{player.level}</span></p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md bg-neutral-800 p-4 rounded-lg border border-neutral-700">
        <button
          onClick={() => onNavigate('BATTLE_SCREEN')}
          className="px-6 py-4 bg-red-600 text-white text-xl font-bold rounded-lg hover:bg-red-500 transition-colors shadow-md"
        >
          전투 시작
        </button>
        <button
          onClick={() => onNavigate('STATS_SCREEN')}
          className="px-6 py-4 bg-blue-600 text-white text-xl font-bold rounded-lg hover:bg-blue-500 transition-colors shadow-md"
        >
          스탯 관리
        </button>
        <button
          onClick={() => onNavigate('CORE_SCREEN')}
          className="px-6 py-4 bg-purple-600 text-white text-xl font-bold rounded-lg hover:bg-purple-500 transition-colors shadow-md"
        >
          코어 관리
        </button>
        <button
          onClick={() => onNavigate('SHOP_SCREEN')}
          className="px-6 py-4 bg-green-600 text-white text-xl font-bold rounded-lg hover:bg-green-500 transition-colors shadow-md"
        >
          상점
        </button>
      </div>
    </div>
  );
};

export default TownScreen;