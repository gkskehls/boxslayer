// src/components/Shop.tsx

import React from 'react';
import { useGameStore } from '../store/gameStore';
import type { Core } from '../types/game';

// 1. 상점 전용 데이터 타입 정의 (인터페이스와 별개로 상점용 정보만 담음)
interface ShopItem {
  core: Core;
  description: string;
  price: number;
}

const shopItems: ShopItem[] = [
  { core: { id: 'fire_core_1', name: '불의 코어', type: 'FIRE', level: 1 }, description: '화속성 데미지 추가', price: 100 },
  { core: { id: 'water_core_1', name: '물의 코어', type: 'WATER', level: 1 }, description: '보호막 생성', price: 120 },
  { core: { id: 'wind_core_1', name: '바람의 코어', type: 'WIND', level: 1 }, description: '공격 속도 증가', price: 110 },
  { core: { id: 'electric_core_1', name: '전기의 코어', type: 'ELECTRIC', level: 1 }, description: '적 기절', price: 130 },
];

const Shop: React.FC = () => {
  const { player, spendGold, acquireCore } = useGameStore();

  const handlePurchase = (item: ShopItem) => {
    if (player.gold >= item.price) {
      spendGold(item.price);
      acquireCore(item.core); // Core 인터페이스에 맞는 데이터만 전달
      alert(`${item.core.name}을(를) 구매했습니다!`);
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
          {shopItems.map((item) => (
              <div key={item.core.id} className="flex flex-col sm:flex-row items-center justify-between bg-neutral-700 p-4 rounded-lg border border-neutral-600 gap-4">
                <div className="text-center sm:text-left w-full sm:w-auto">
                  <h3 className="text-lg font-semibold">{item.core.name}</h3>
                  <p className="text-xs text-neutral-300">{item.description}</p>
                  <p className="text-sm font-bold mt-1 text-green-400">가격: {item.price} 골드</p>
                </div>
                <button
                    onClick={() => handlePurchase(item)}
                    className={`w-full sm:w-auto px-6 py-2 rounded-lg font-bold transition-colors ${
                        player.gold >= item.price ? 'bg-blue-600 hover:bg-blue-500' : 'bg-neutral-600 cursor-not-allowed'
                    }`}
                    disabled={player.gold < item.price}
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