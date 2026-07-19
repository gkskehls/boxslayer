// src/components/Shop.tsx

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { ShopItem } from '../types/game';

// 📦 확정된 상점 아이템 리스트 (JSON 명세 기반)
const SHOP_ITEMS: ShopItem[] = [
  {
    id: "stat_temp_1", name: "초급 훈련 교본", type: "TEMP_STAT", cost: 5000,
    description: "보너스 스탯 포인트를 10 얻습니다. (환생 시 초기화)",
    effect: { target: "statPoints", value: 10 }, requiredSkillId: null
  },
  {
    id: "stat_temp_2", name: "중급 훈련 교본", type: "TEMP_STAT", cost: 30000,
    description: "보너스 스탯 포인트를 50 얻습니다. (환생 시 초기화)",
    effect: { target: "statPoints", value: 50 }, requiredSkillId: null
  },
  {
    id: "stat_temp_3", name: "한계 돌파의 비약", type: "TEMP_STAT", cost: 250000,
    description: "보너스 스탯 포인트를 300 얻습니다. (환생 시 초기화)",
    effect: { target: "statPoints", value: 300 }, requiredSkillId: "skill_basic_master"
  },
  {
    id: "buff_gold_2x", name: "황금 고블린의 축복", type: "TIMED_BUFF", cost: 10000, duration: 1800,
    description: "30분 동안 획득하는 골드가 2배로 증가합니다.",
    effect: { target: "goldMultiplier", value: 2.0 }, requiredSkillId: null
  },
  {
    id: "buff_exp_2x", name: "현자의 스크롤", type: "TIMED_BUFF", cost: 15000, duration: 1800,
    description: "30분 동안 획득하는 경험치가 2배로 증가합니다.",
    effect: { target: "expMultiplier", value: 2.0 }, requiredSkillId: null
  },
  {
    id: "buff_speed_up", name: "신속의 물약", type: "TIMED_BUFF", cost: 20000, duration: 900,
    description: "15분 동안 공격 속도가 1.5배 빨라집니다.",
    effect: { target: "atkSpeedMultiplier", value: 1.5 }, requiredSkillId: null
  },
  {
    id: "buff_berserk", name: "광폭화 캡슐", type: "TIMED_BUFF", cost: 50000, duration: 600,
    description: "10분 동안 공격력이 3배가 되지만, 방어력이 0이 됩니다.",
    effect: { target: "berserkMode", value: 1 }, requiredSkillId: null
  },
  {
    id: "buff_boss_tracker", name: "보스 추적기", type: "TIMED_BUFF", cost: 80000, duration: 1200,
    description: "20분 동안 일반 몬스터를 건너뛰고 보스만 상대합니다.",
    effect: { target: "bossTracking", value: 1 }, requiredSkillId: null
  },
  {
    id: "buff_core_fire", name: "초열의 가열로 (특수)", type: "TIMED_BUFF", cost: 100000, duration: 1800,
    description: "30분 동안 불 코어의 고정 데미지가 10배 폭발합니다.",
    effect: { target: "fireExtreme", value: 10.0 }, requiredSkillId: "fire_core_3"
  },
  {
    id: "buff_core_wind", name: "태풍의 눈 (특수)", type: "TIMED_BUFF", cost: 100000, duration: 1800,
    description: "30분 동안 바람 콤보 요구 타격수가 5회로 감소합니다.",
    effect: { target: "windExtreme", value: 5.0 }, requiredSkillId: "wind_core_3"
  },
  {
    id: "buff_core_water", name: "절대 영도의 방패 (특수)", type: "TIMED_BUFF", cost: 100000, duration: 1800,
    description: "30분 동안 물 코어의 반사 데미지가 500%로 증폭됩니다.",
    effect: { target: "waterExtreme", value: 5.0 }, requiredSkillId: "water_core_3"
  },
  {
    id: "buff_core_earth", name: "대지의 결속 (특수)", type: "TIMED_BUFF", cost: 100000, duration: 1800,
    description: "30분 동안 최대 체력이 5배, 방어력이 3배 증가합니다.",
    effect: { target: "earthExtreme", value: 1 }, requiredSkillId: "earth_core_3"
  }
];

// 초 단위 시간을 mm:ss 포맷으로 변환
const formatTime = (seconds: number) => {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const Shop: React.FC = () => {
  const { player, buyShopItem, unlockedSkills, activeBuffs } = useGameStore();
  const [now, setNow] = useState(Date.now());

  // 타이머 작동 (1초마다 UI 갱신)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePurchase = (item: ShopItem) => {
    buyShopItem(item);
  };

  return (
      <div 
          className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-3 font-mono text-xs text-stone-900 select-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] pb-24"
          style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
          }}
      >
        <div className="w-full text-center border-b-4 border-black pb-2">
            <h2 className="text-sm font-black text-stone-500 tracking-widest uppercase leading-none">-[ BLACK_MARKET ]-</h2>
        </div>

        <div className="bg-stone-300 p-3 rounded-none border-4 border-black w-full flex justify-between items-center font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sticky top-0 z-10">
          <span className="text-[10px] font-black text-neutral-500 tracking-wider uppercase leading-none">CASH_REGISTER</span>
          <span className="text-sm font-black text-amber-700">보유 골드: {player.gold.toLocaleString()} G</span>
        </div>

        <div className="flex flex-col gap-3 w-full mt-1">
          {SHOP_ITEMS.map((item) => {
            const isUnlocked = !item.requiredSkillId || unlockedSkills.includes(item.requiredSkillId);
            const canAfford = player.gold >= item.cost;
            const isActive = activeBuffs[item.id] && activeBuffs[item.id] > now;
            const remainingTime = isActive ? Math.ceil((activeBuffs[item.id] - now) / 1000) : 0;

            // 잠긴 아이템 처리
            if (!isUnlocked) {
              return (
                <div key={item.id} className="flex items-center justify-center p-4 rounded-none border-4 border-stone-400 bg-stone-200 gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] opacity-60">
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
                      onClick={() => handlePurchase(item)}
                      disabled={!canAfford}
                      className={`px-3 py-2 rounded-none border-2 border-black font-black text-xs transition-all whitespace-nowrap leading-none uppercase tracking-wider
                        ${canAfford 
                          ? 'bg-stone-100 hover:bg-stone-50 text-blue-700 border-b-[4px] shadow-[1px_1px_0px_rgba(255,255,255,0.6)_inset] active:border-b-2 active:translate-y-[2px] cursor-pointer' 
                          : 'bg-stone-300 border-stone-400 text-stone-400 opacity-40 shadow-none cursor-not-allowed'
                        }`}
                  >
                    {isActive ? '연장' : '구매'}
                  </button>
                </div>
            )
          })}
        </div>
      </div>
  );
};

export default Shop;