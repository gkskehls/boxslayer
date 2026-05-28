// src/components/Shop.tsx
import React from 'react';
import type {Core} from '../types/core';

// 임시 코어 데이터 (실제로는 서버에서 가져오거나 상태 관리 스토어에서 관리)
const sampleCores: Core[] = [
  {
    id: 'core-fire-001',
    name: '불의 코어 (초급)',
    type: 'Fire',
    description: '몸통박치기 시 추가 화속성 데미지를 입힙니다.',
    price: 100,
  },
  {
    id: 'core-water-001',
    name: '물의 코어 (초급)',
    type: 'Water',
    description: '일정 시간마다 보호막을 생성합니다.',
    price: 120,
  },
  {
    id: 'core-wind-001',
    name: '바람의 코어 (초급)',
    type: 'Wind',
    description: '공격 속도를 약간 증가시킵니다.',
    price: 110,
  },
  {
    id: 'core-electric-001',
    name: '전기의 코어 (초급)',
    type: 'Electric',
    description: '일정 확률로 적을 기절시킵니다.',
    price: 130,
  },
];

const Shop: React.FC = () => {
  // TODO: 플레이어의 현재 골드 상태를 가져와야 합니다. (예: Zustand 스토어)
  const playerGold = 500; // 임시 값

  const handlePurchase = (core: Core) => {
    if (playerGold >= core.price) {
      alert(`${core.name}을(를) 구매했습니다! (남은 골드: ${playerGold - core.price})`);
      // TODO: 실제 구매 로직 (골드 차감, 인벤토리에 코어 추가 등) 구현
    } else {
      alert('골드가 부족합니다.');
    }
  };

  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">상점</h2>

      <div className="mb-4 text-right">
        <span className="text-lg">내 골드: {playerGold}</span>
      </div>

      <div className="space-y-4">
        {sampleCores.map((core) => (
          <div key={core.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
            <div>
              <h3 className="text-xl font-semibold">{core.name}</h3>
              <p className="text-sm text-gray-300">{core.description}</p>
              <p className="text-md font-bold mt-1">가격: {core.price} 골드</p>
            </div>
            <button
              onClick={() => handlePurchase(core)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={playerGold < core.price}
            >
              구매
            </button>
          </div>
        ))}
      </div>

      {/* TODO: 상점 닫기 버튼 또는 메인 허브로 돌아가는 버튼 추가 */}
    </div>
  );
};

export default Shop;
