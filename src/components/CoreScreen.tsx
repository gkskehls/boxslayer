// src/components/CoreScreen.tsx

import React, { useState } from 'react';
import { useGameStore, getCoreStats } from '../store/gameStore';
import type { Core } from '../types/game';

const getCoreTypeColor = (type: string) => {
  switch (type) {
    case 'FIRE': return 'border-red-500 bg-red-900/30 text-red-200';
    case 'WATER': return 'border-blue-500 bg-blue-900/30 text-blue-200';
    case 'WIND': return 'border-green-500 bg-green-900/30 text-green-200';
    case 'ELECTRIC': return 'border-yellow-500 bg-yellow-900/30 text-yellow-200';
    default: return 'border-neutral-600 bg-neutral-700/50 text-neutral-300';
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
      <div className="max-w-md mx-auto p-2 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-2 shadow-xl text-xs">
        <h2 className="text-lg font-extrabold text-yellow-400 text-center">코어 관리</h2>
        <div className="text-center text-yellow-300 font-bold -mt-1">보유 골드: {player.gold.toLocaleString()} G</div>

        {/* 장착 슬롯 영역 */}
        <div className="bg-neutral-800 p-2 rounded-lg border border-neutral-700 flex items-center gap-2">
          <h3 className="font-bold text-blue-400 text-[11px] whitespace-nowrap">장착 중</h3>
          <div className={`flex-1 p-2 rounded border h-12 flex items-center justify-center cursor-pointer ${equippedCore ? getCoreTypeColor(equippedCore.type) : 'border-neutral-600 bg-neutral-700/50'}`}
               onClick={() => { if (equippedCore) { setSelectedCore(equippedCore); setIsEquippedSelected(true); } }}>
            {equippedCore ? (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm truncate">{equippedCore.name}</span>
                  <span className="font-bold text-[12px] opacity-80">Lv.{equippedCore.level}</span>
                </div>
            ) : <span className="text-[10px] text-neutral-500">코어를 선택하여 장착하세요</span>}
          </div>
        </div>

        {/* 인벤토리 영역 */}
        <div className="bg-neutral-800 p-2 rounded-lg border border-neutral-700">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-yellow-400 text-[11px]">보유 코어 (환생 시 획득)</h3>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {playerCores.map((core, i) => {
              const isDisabled = equippedCore !== null;
              return (
                  <div key={`${core.id}-${i}`}
                       className={`p-1.5 rounded border flex flex-col items-center justify-center transition-all 
                        ${isDisabled ? 'border-neutral-700 bg-neutral-800 opacity-40 cursor-not-allowed grayscale' : `cursor-pointer ${getCoreTypeColor(core.type)}`}`}
                       onClick={() => {
                         if (!isDisabled) {
                           setSelectedCore(core);
                           setIsEquippedSelected(false);
                         }
                       }}>
                    <span className="font-bold text-[9px] mb-0.5 truncate max-w-full">{core.name}</span>
                    <span className="font-bold text-[12px]">Lv.{core.level}</span>
                  </div>
              );
            })}
          </div>
        </div>

        {/* 선택된 코어 상세 및 액션 영역 */}
        {displayCore && (
            <div className={`p-3 rounded-lg border ${getCoreTypeColor(displayCore.type)}`}>
              <div className="flex justify-between items-end mb-1">
                <div className="text-base font-extrabold">{displayCore.name}</div>
                <div className="text-xs font-bold">현재 레벨: {displayCore.level}</div>
              </div>
              <p className="mb-2 p-2 bg-black/20 rounded text-[12px] leading-relaxed">
                {getCoreStats(displayCore.type, displayCore.level).desc}
              </p>

              {/* 장착 전 (인벤토리 선택 상태) */}
              {!isEquippedSelected && !equippedCore && (
                  <div className="flex gap-2">
                    <button onClick={handleEquip}
                            className="flex-1 py-2 rounded font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-md">
                      이 코어로 결정 및 장착
                    </button>
                  </div>
              )}

              {/* 장착 후 (장착 코어 선택 상태) - 강화 버튼 노출 */}
              {isEquippedSelected && (
                  <div className="space-y-1.5">
                    <div className="text-[9px] text-neutral-300 text-center tracking-tighter">
                      비용: +1 ({getBatchCost(1)}G) | +10 ({getBatchCost(10)}G) | +100 ({getBatchCost(100)}G)
                    </div>
                    <div className="flex gap-1.5">
                      {[1, 10, 100].map(amt => (
                          <button key={amt} onClick={() => upgradeCore(amt)}
                                  className="flex-1 py-2 bg-yellow-700 hover:bg-yellow-600 rounded font-bold text-sm shadow-md">
                            +{amt}
                          </button>
                      ))}
                      {/* [신규] MAX 강화 버튼 */}
                      <button onClick={() => {
                        const max = getMaxUpgrades();
                        if (max > 0) upgradeCore(max);
                        else upgradeCore(1); // 0일 경우 1을 넘겨서 '골드 부족' 알림 유도
                      }}
                              className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-black text-sm shadow-md border border-red-400/50">
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