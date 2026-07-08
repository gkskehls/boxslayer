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

/* [RENEWAL] 코어 화면과의 통일성을 높이기 위해 상점 아이템 카드에도 속성별 레트로 원색 틴트를 입혀줍니다. */
const getShopItemColor = (type: string) => {
  switch (type) {
    case 'FIRE': return 'border-red-600 bg-red-50 text-stone-900';
    case 'WATER': return 'border-blue-600 bg-blue-50 text-stone-900';
    case 'WIND': return 'border-green-600 bg-green-50 text-stone-900';
    case 'ELECTRIC': return 'border-yellow-500 bg-yellow-50 text-stone-900';
    default: return 'border-stone-500 bg-stone-200 text-stone-900';
  }
};

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
      /* [RENEWAL] 미니 오락기 테마 일체형 상점 모니터 섀시
         - max-w-md 규격 매핑 및 굵은 border-4 border-black 마감.
         - 오프라인 도트 액정 질감을 가동하기 위해 연한 연회색 모눈 격자판(linear-gradient) 주입.
      */
      <div 
          className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-3 font-mono text-xs text-stone-900 select-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
          style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
          }}
      >
        {/* 상단 8비트 허브 대문 */}
        <div className="w-full text-center border-b-4 border-black pb-2">
            <h2 className="text-sm font-black text-stone-500 tracking-widest uppercase leading-none">-[ SLAYER_SHOP ]-</h2>
        </div>

        {/* 금전 등록기 테마의 보유 재화 표시판 */}
        <div className="bg-stone-300 p-3 rounded-none border-4 border-black w-full flex justify-between items-center font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-[10px] font-black text-neutral-500 tracking-wider uppercase leading-none">CASH_REGISTER</span>
          <span className="text-sm font-black text-amber-700">보유 골드: {player.gold.toLocaleString()} G</span>
        </div>

        {/* 아이템 매대 리스트 */}
        <div className="flex flex-col gap-3 w-full mt-1">
          {shopItems.map((item) => {
            const canAfford = player.gold >= item.price;
            return (
                /* 개별 아이템 상품 모Module화
                   - 각 코어 고유 속성 컬러를 입혀 상점 매대 무드를 산뜻하게 정돈했습니다.
                   - shadow-[4px_4px...]를 심어 오락기 내부 케이스에 입체적으로 거치된 느낌을 줍니다.
                */
                <div 
                    key={item.core.id} 
                    className={`flex items-center justify-between p-3 rounded-none border-4 gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${getShopItemColor(item.core.type)}`}
                >
                  <div className="text-left flex-1 min-w-0">
                    <h3 className="text-xs font-black uppercase tracking-tight text-black">{item.core.name}</h3>
                    <p className="text-[10px] font-bold text-stone-500 truncate mt-0.5">{item.description}</p>
                    <p className="text-[11px] font-black mt-1 text-amber-700 font-mono tracking-tighter">
                      {item.price.toLocaleString()} G
                    </p>
                  </div>

                  {/* 기계식 푸시 버튼 질감 부여
                     - 골드가 충분할 때만 도톰한 하단 border-b-[4px]가 주어지며, 누르면 translate 기믹으로 쫀득하게 들어갑니다.
                     - 잔액이 부족하면 회색으로 죽고 클릭 불가능 상태임을 촉각적으로 표현(opacity-30, cursor-not-allowed)합니다.
                  */}
                  <button
                      onClick={() => handlePurchase(item)}
                      disabled={!canAfford}
                      className={`px-4 py-2 rounded-none border-2 border-black font-black text-xs transition-all whitespace-nowrap leading-none uppercase tracking-wider
                        ${canAfford 
                          ? 'bg-stone-100 hover:bg-stone-50 text-green-700 border-b-[4px] shadow-[1px_1px_0px_rgba(255,255,255,0.6)_inset] active:border-b-2 active:translate-y-[2px] cursor-pointer' 
                          : 'bg-stone-300 border-stone-400 text-stone-400 opacity-30 shadow-none cursor-not-allowed'
                        }`}
                  >
                    BUY [구매]
                  </button>
                </div>
            )
          })}
        </div>
      </div>
  );
};

export default Shop;