// src/components/Shop.tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import type { Core } from '../types/game';

const sampleCores: Core[] = [
  {
    id: 'core-fire-001', name: '불의 코어', type: 'FIRE', description: '화속성 데미지 추가',
    price: 100, level: 1, effects: { fireDamage: 5 }, upgradeCost: 50
  },
  {
    id: 'core-water-001', name: '물의 코어', type: 'WATER', description: '보호막 생성',
    price: 120, level: 1, effects: { shieldAmount: 20 }, upgradeCost: 60
  },
  {
    id: 'core-wind-001', name: '바람의 코어', type: 'WIND', description: '공격 속도 증가',
    price: 110, level: 1, effects: { attackSpeedBonus: 0.1 }, upgradeCost: 55
  },
  {
    id: 'core-electric-001', name: '전기의 코어', type: 'ELECTRIC', description: '적 기절',
    price: 130, level: 1, effects: { stunChance: 0.1 }, upgradeCost: 65
  },
];

const Shop: React.FC = () => {
  const { player, spendGold, acquireCore } = useGameStore();

  const handlePurchase = (core: Core) => {
    if (player.gold >= core.price) {
      spendGold(core.price);
      acquireCore(core);
      alert(`${core.name}을(를) 구매했습니다!`);
    } else {
      alert('골드가 부족합니다.');
    }
  };

  return (
      <div className="p-4 bg-neutral-800 text-white rounded-xl shadow-lg w-full max-w-md mx-auto border border-neutral-700">
        <h2 className="text-2xl font-bold mb-6 text-center text-yellow-400">상점</h2>

        <div className="mb-6 p-3 bg-neutral-900 rounded-lg text-right border border-neutral-700">
          <span className="text-lg">보유 골드: <span className="text-yellow-500 font-bold">{player.gold}</span></span>
        </div>

        <div className="space-y-4">
          {sampleCores.map((core) => (
              <div key={core.id} className="flex flex-col sm:flex-row items-center justify-between bg-neutral-700 p-4 rounded-lg border border-neutral-600 gap-4">
                <div className="text-center sm:text-left w-full sm:w-auto">
                  <h3 className="text-lg font-semibold">{core.name}</h3>
                  <p className="text-xs text-neutral-300">{core.description}</p>
                  <p className="text-sm font-bold mt-1 text-green-400">가격: {core.price} 골드</p>
                </div>

                <button
                    onClick={() => handlePurchase(core)}
                    className={`w-full sm:w-auto px-6 py-2 rounded-lg font-bold transition-colors ${
                        player.gold >= core.price
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                    }`}
                    disabled={player.gold < core.price}
                >
                  구매
                </button>
              </div>
          ))}
        </div>
      </div>
  );
};

export default Shop;