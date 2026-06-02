import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface TownScreenProps {
  onNavigate: (screen: 'BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN') => void;
}

// eslint-disable-next-line no-empty-pattern
const TownScreen: React.FC<TownScreenProps> = () => {
    // 보상 확인/수령 함수, 보상 데이터를 위한 useState 추가
    const { player, stage, canClaimRewards, calculateOfflineRewards } = useGameStore();
    const [rewards, setRewards] = useState<{ gold: number; exp: number } | null>(null);

  return (
      <div className="max-w-4xl mx-auto p-6 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-6 items-center justify-center">

          {/* 1. 보상 아이콘 버튼 (1분 경과 시 등장) */}
          {canClaimRewards() && (
              <button
                  onClick={() => setRewards(calculateOfflineRewards())}
                  className="fixed top-20 right-4 p-4 bg-yellow-600 rounded-full shadow-lg z-50 hover:bg-yellow-500 transition-transform hover:scale-110"
              >
                  🎁
              </button>
          )}

          {/* 2. 보상 팝업 (버튼 누르면 등장) */}
          {rewards && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                  <div className="bg-neutral-800 p-8 rounded-lg border border-neutral-700 text-center shadow-lg max-w-sm mx-auto">
                      <h3 className="text-3xl font-bold text-yellow-400 mb-4">보상 획득!</h3>
                      <p className="text-xl text-neutral-300 mb-2">골드: <span className="text-yellow-500 font-bold">{Math.floor(rewards.gold)}</span></p>
                      <p className="text-xl text-neutral-300 mb-4">경험치: <span className="text-blue-500 font-bold">{Math.floor(rewards.exp)}</span></p>
                      <button
                          onClick={() => setRewards(null)}
                          className="mt-6 px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500"
                      >
                          확인
                      </button>
                  </div>
              </div>
          )}

        <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 w-full text-center">
          <h2 className="text-3xl font-bold text-yellow-400 mb-4">마을 (Town)</h2>
          <p className="text-xl text-neutral-300">현재 스테이지: <span className="font-bold text-white">{stage}</span> | 레벨: <span className="font-bold text-white">{player.level}</span></p>
        </div>
      </div>
  );
};

export default TownScreen;