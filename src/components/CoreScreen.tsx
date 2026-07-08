// src/components/CoreScreen.tsx

import React, { useState } from 'react';
import { useGameStore, getCoreStats } from '../store/gameStore';
import type { Core } from '../types/game';

/* [RENEWAL] 레트로 아케이드 섀시에 맞춘 속성별 고유 픽셀 보더 & 틴트 컬러 맵
   - 현대식 어두운 반투명 색상을 배제하고, 클래식 도트 게임 특유의 직관적이고 산뜻한 하드 틴트로 전환합니다.
*/
const getCoreTypeColor = (type: string) => {
  switch (type) {
    case 'FIRE': return 'border-red-600 bg-red-50 text-red-700';
    case 'WATER': return 'border-blue-600 bg-blue-50 text-blue-700';
    case 'WIND': return 'border-green-600 bg-green-50 text-green-700';
    case 'ELECTRIC': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
    default: return 'border-stone-500 bg-stone-200 text-stone-700';
  }
};

const CoreScreen: React.FC = () => {
  const { player, playerCores, equippedCore, equipCore, upgradeCore } = useGameStore();

  // [수정됨] 화면 진입 시 장착된 코어가 있다면 자동으로 선택된 상태가 되도록 초기값 설정
  const [selectedCore, setSelectedCore] = useState<Core | null>(equippedCore);
  const [isEquippedSelected, setIsEquippedSelected] = useState(!!equippedCore);

  const displayCore = isEquippedSelected ? equippedCore : selectedCore;

  const getBatchCost = (amount: number) => {
    if (!displayCore) return "0";
    let cost = 0;
    for (let i = 0; i < amount; i++) cost += 100 * (displayCore.level + i);
    return cost.toLocaleString();
  };

  // [신규] 이차방정식 근의 공식을 활용하여 현재 골드로 가능한 최대 강화 횟수(MAX) 계산
  const getMaxUpgrades = () => {
    if (!displayCore || player.gold <= 0) return 0;
    const L = displayCore.level;
    const G = player.gold / 50; // 등차수열 합공식 치환용 상수
    const n = Math.floor((1 - 2 * L + Math.sqrt(Math.pow(2 * L - 1, 2) + 4 * G)) / 2);
    return Math.max(0, n);
  };

  const handleEquip = () => {
    if (!selectedCore) return;
    if (window.confirm("한 번 장착하면 환생 전까지 다른 코어로 변경하거나 해제할 수 없습니다. 정말 장착하시겠습니까?")) {
      equipCore(selectedCore.id);
      setSelectedCore(null);
    }
  };

  // [수정됨] 불필요한 스크롤을 막기 위해 전체적인 여백(p, gap, mb)을 촘촘하게 축소했습니다.
  return (
      /* [RENEWAL] 게임기 본체 전용 프레임 일체화 마감
         - 각진 모서리, 단단한 border-4 border-black, 모눈종이 격자무늬 라인이 내장된 모니터 공간입니다.
      */
      <div 
          className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-3 text-stone-900 font-mono select-none text-xs shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
          style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
          }}
      >
        <div className="w-full text-center border-b-4 border-black pb-2">
            <h2 className="text-sm font-black text-stone-500 tracking-widest uppercase leading-none">-[ CORE_MATRIX ]-</h2>
            <div className="text-amber-700 font-black text-xs mt-1.5 font-mono">보유 골드: {player.gold.toLocaleString()} G</div>
        </div>

        {/* 장착 슬롯 영역 (하드웨어 소켓 무드로 리폼) */}
        <div className="bg-stone-200 p-2.5 rounded-none border-4 border-black flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="font-black text-stone-600 text-[11px] whitespace-nowrap uppercase tracking-tighter">SLOT_ON</h3>
          <div 
              className={`flex-1 p-2 rounded-none border-2 border-black h-12 flex items-center justify-center cursor-pointer transition-all
                ${equippedCore 
                  ? `${getCoreTypeColor(equippedCore.type)} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:brightness-105` 
                  : 'border-dashed border-stone-400 bg-stone-300/40 text-stone-400 font-bold'
                }`}
               onClick={() => { if (equippedCore) { setSelectedCore(equippedCore); setIsEquippedSelected(true); } }}
          >
            {equippedCore ? (
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-black text-xs truncate uppercase tracking-tight">{equippedCore.name}</span>
                  <span className="font-black text-xs border border-current px-1 py-0.5 leading-none bg-white/40">LV.{equippedCore.level}</span>
                </div>
            ) : <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">EMPTY SOCKET</span>}
          </div>
        </div>

        {/* 인벤토리 영역 (칩셋 보드 스타일 마감) */}
        <div className="bg-stone-200 p-2.5 rounded-none border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-black text-stone-600 text-[11px] uppercase tracking-wider">INVENTORY (REBIRTH REWARD)</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {playerCores.map((core, i) => {
              const isDisabled = equippedCore !== null;
              return (
                  <div key={`${core.id}-${i}`}
                       className={`p-2 rounded-none border-2 border-black flex flex-col items-center justify-center transition-all select-none
                        ${isDisabled 
                          ? 'border-stone-300 bg-stone-300/60 text-stone-400 opacity-40 cursor-not-allowed line-through font-bold' 
                          : `cursor-pointer ${getCoreTypeColor(core.type)} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`
                        }`}
                       onClick={() => {
                         if (!isDisabled) {
                           setSelectedCore(core);
                           setIsEquippedSelected(false);
                         }
                       }}
                  >
                    <span className="font-black text-[9px] mb-1 truncate max-w-full uppercase tracking-tight">{core.name}</span>
                    <span className="font-black text-xs border border-current px-1 py-0.5 bg-white/40 leading-none">LV.{core.level}</span>
                  </div>
              );
            })}
          </div>
        </div>

        {/* 선택된 코어 상세 및 액션 영역 (중앙 모니터 내부 창 팝업 기믹 연출) */}
        {displayCore && (
            <div className={`p-3 rounded-none border-4 border-black flex flex-col gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${getCoreTypeColor(displayCore.type)}`}>
              <div className="flex justify-between items-end border-b border-black/10 pb-1.5 w-full">
                <div className="text-sm font-black uppercase tracking-wider">{displayCore.name}</div>
                <div className="text-[10px] font-black border border-current px-1 bg-white/30">LEVEL: {displayCore.level}</div>
              </div>
              <p className="p-2 bg-white/50 border border-black/10 text-[11px] font-bold leading-normal break-keep">
                {getCoreStats(displayCore.type, displayCore.level).desc}
              </p>

              {/* 장착 전 (인벤토리 선택 상태) */}
              {!isEquippedSelected && !equippedCore && (
                  <div className="flex gap-2 w-full mt-1">
                    <button onClick={handleEquip}
                            className="flex-1 py-2 rounded-none font-black text-xs bg-blue-600 hover:bg-blue-500 text-white border-2 border-black border-b-4 shadow-[1px_1px_0px_rgba(255,255,255,0.3)_inset] active:border-b-2 active:translate-y-[2px] cursor-pointer tracking-wider uppercase">
                      EQUIP CORE [장착]
                    </button>
                  </div>
              )}

              {/* 장착 후 (장착 코어 선택 상태) - 강화 버튼 노출 */}
              {isEquippedSelected && (
                  <div className="space-y-2 mt-1">
                    <div className="text-[9px] font-black text-stone-500 text-center tracking-tight font-mono border-b border-black/10 pb-1">
                      UPGRADE COST: +1 ({getBatchCost(1)}G) | +10 ({getBatchCost(10)}G) | +100 ({getBatchCost(100)}G)
                    </div>
                    <div className="flex gap-1 w-full">
                      {[1, 10, 100].map(amt => (
                          <button key={amt} onClick={() => upgradeCore(amt)}
                                  className="flex-1 py-2 bg-stone-100 hover:bg-stone-50 text-black border-2 border-black border-b-4 font-black text-xs active:border-b-2 active:translate-y-[2px] cursor-pointer shadow-[1px_1px_0px_rgba(255,255,255,0.6)_inset]">
                            +{amt}
                          </button>
                      ))}
                      {/* [신규] MAX 강화 버튼 (강렬한 하드웨어 비상 제어 스위치 기믹 연출) */}
                      <button onClick={() => {
                        const max = getMaxUpgrades();
                        if (max > 0) upgradeCore(max);
                        else upgradeCore(1); // 0일 경우 1을 넘겨서 '골드 부족' 알림 유도
                      }}
                              className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white border-2 border-black border-b-4 font-black text-xs active:border-b-2 active:translate-y-[2px] cursor-pointer shadow-[1px_1px_0px_rgba(255,255,255,0.3)_inset]">
                        MAX
                      </button>
                    </div>
                  </div>
              )}
            </div>
        )}
      </div>
  );
};

export default CoreScreen;