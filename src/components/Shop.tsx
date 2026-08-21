// src/components/Shop.tsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import type { ShopItem } from '../types/game';
import { SHOP_ITEMS } from '../constants/shopItems';
import { formatNumber } from '../utils/format';
import { Zap } from 'lucide-react';

// 초 단위 시간을 mm:ss 포맷으로 변환
const formatTime = (seconds: number) => {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const Shop: React.FC = () => {
  const { player, buyShopItem, unlockedSkills, activeBuffs } = useGameStore();
  const [now, setNow] = useState(() => Date.now());
  const [activeHoldItemId, setActiveHoldItemId] = useState<string | null>(null);

  const holdTimerRef = useRef<number | null>(null);
  const intervalTimerRef = useRef<number | null>(null);
  const holdTicksRef = useRef<number>(0);

  // 타이머 작동 (1초마다 UI 갱신)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // 롱 프레스 종료 시 타이머 정리 함수
  const clearPressTimers = useCallback(() => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (intervalTimerRef.current !== null) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }
    holdTicksRef.current = 0;
    setActiveHoldItemId(null);
  }, []);

  // 구매 버튼을 누르기 시작했을 때
  const handlePressStart = useCallback((item: ShopItem) => {
    const currentGold = useGameStore.getState().player.gold;
    if (currentGold < item.cost) return;

    setActiveHoldItemId(item.id);

    // 1. 즉시 1회 구매 실행
    buyShopItem(item, 1);

    // 2. 150ms 동안 꾸욱 누르고 있으면 초고속 가속 연속 구매 시작
    holdTicksRef.current = 0;
    holdTimerRef.current = window.setTimeout(() => {
      intervalTimerRef.current = window.setInterval(() => {
        const gold = useGameStore.getState().player.gold;
        const maxAffordable = Math.floor(gold / item.cost);
        if (maxAffordable <= 0) {
          clearPressTimers();
          return;
        }

        holdTicksRef.current += 1;
        const ticks = holdTicksRef.current;
        let batch = 1;

        // 30ms 틱 수에 따른 기하급수적 대량 구매 가속 (ticks: 10=300ms, 25=750ms, 50=1.5s, 80=2.4s)
        if (ticks > 80) {
          batch = 500;
        } else if (ticks > 50) {
          batch = 100;
        } else if (ticks > 25) {
          batch = 25;
        } else if (ticks > 10) {
          batch = 5;
        }

        const toBuy = Math.min(batch, maxAffordable);
        if (toBuy > 0) {
          buyShopItem(item, toBuy);
        } else {
          clearPressTimers();
        }
      }, 30);
    }, 150);
  }, [buyShopItem, clearPressTimers]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      clearPressTimers();
    };
  }, [clearPressTimers]);

  return (
      <div
          className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-3 font-mono text-xs text-stone-900 select-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-grow"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
      >
        <div className="w-full text-center border-b-4 border-black pb-2">
          <h2 className="text-sm font-black text-stone-500 tracking-widest uppercase leading-none">-[ BLACK_MARKET ]-</h2>
        </div>

        <div className="bg-stone-300 p-3 rounded-none border-4 border-black w-full flex justify-between items-center font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sticky top-0 z-10">
          <div>
            <span className="text-[10px] font-black text-neutral-500 tracking-wider uppercase block leading-none">CASH_REGISTER</span>
            <span className="text-[10px] text-stone-600 font-bold flex items-center gap-1 mt-0.5">
              <Zap className="w-2.5 h-2.5 text-amber-600 inline" />
              버튼을 꾹 누르면 초고속 연속 구매
            </span>
          </div>
          <span className="text-sm font-black text-amber-700 font-mono">보유 골드: {formatNumber(player.gold)} G</span>
        </div>

        <div className="flex flex-col gap-3 w-full mt-1">
          {SHOP_ITEMS.map((item) => {
            const isUnlocked = !item.requiredSkillId || unlockedSkills.includes(item.requiredSkillId);
            const canAfford = player.gold >= item.cost;
            const isActive = activeBuffs[item.id] && activeBuffs[item.id] > now;
            const remainingTime = isActive ? Math.ceil((activeBuffs[item.id] - now) / 1000) : 0;
            const isHolding = activeHoldItemId === item.id;

            // 잠긴 아이템 처리
            if (!isUnlocked) {
              return (
                  <div key={item.id} className="flex items-center justify-center p-4 rounded-none border-4 border-stone-400 bg-stone-200 gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] opacity-60" role="region" aria-label="선행 스킬 해금 필요">
                    <span className="text-xs font-black text-stone-500 tracking-widest">🔒 선행 스킬 해금 필요</span>
                  </div>
              )
            }

            // 해금된 아이템 카드
            return (
                <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-none border-4 border-stone-800 bg-white gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative"
                >
                  {/* 타이머 뱃지 */}
                  {isActive && (
                      <div className="absolute -top-3 -right-3 bg-red-600 text-white border-2 border-black px-2 py-1 text-[10px] font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10 animate-pulse">
                        버프 켜짐 [{formatTime(remainingTime)}]
                      </div>
                  )}

                  <div className="text-left flex-1 min-w-0">
                    <h3 className="text-xs font-black uppercase tracking-tight text-black">
                      {item.type === 'TEMP_STAT' ? '📈' : '⏳'} {item.name}
                    </h3>
                    <p className="text-[10px] font-bold text-stone-500 mt-1 leading-tight">{item.description}</p>
                    <p className="text-[11px] font-black mt-1 text-amber-700 font-mono tracking-tighter">
                      {item.cost.toLocaleString()} G
                    </p>
                  </div>

                  <button
                      type="button"
                      onMouseDown={() => handlePressStart(item)}
                      onMouseUp={clearPressTimers}
                      onMouseLeave={clearPressTimers}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        handlePressStart(item);
                      }}
                      onTouchEnd={clearPressTimers}
                      onTouchCancel={clearPressTimers}
                      onContextMenu={(e) => e.preventDefault()}
                      disabled={!canAfford}
                      className={`px-3 py-2 rounded-none border-2 border-black font-black text-xs transition-all whitespace-nowrap leading-none uppercase tracking-wider select-none
                        ${canAfford
                          ? isHolding
                            ? 'bg-amber-400 text-black border-b-2 translate-y-[2px] shadow-none scale-95'
                            : 'bg-stone-100 hover:bg-stone-50 text-blue-700 border-b-[4px] shadow-[1px_1px_0px_rgba(255,255,255,0.6)_inset] active:border-b-2 active:translate-y-[2px] cursor-pointer'
                          : 'bg-stone-300 border-stone-400 text-stone-400 opacity-40 shadow-none cursor-not-allowed'
                      }`}
                  >
                    {isHolding ? '구매중⚡' : isActive ? '연장' : '구매'}
                  </button>
                </div>
            )
          })}
        </div>
      </div>
  );
};

export default Shop;