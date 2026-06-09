// [수정 후]
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
  // 이제 불필요한 unequipCore, removeCore, acquireCore를 제거하고 장착/강화에 집중합니다.
  const { player, playerCores, equippedCore, equipCore, upgradeCore } = useGameStore();
  const [selectedCore, setSelectedCore] = useState<Core | null>(null);
  const [isEquippedSelected, setIsEquippedSelected] = useState(false);

  // [신규] 장착 코어를 볼 때는 최신 상태(equippedCore)를, 인벤토리를 볼 때는 선택된 코어(selectedCore)를 참조합니다.
  const displayCore = isEquippedSelected ? equippedCore : selectedCore;

  const getBatchCost = (amount: number) => {
    if (!displayCore) return "0";
    let cost = 0;
    // selectedCore 대신 실시간 displayCore를 사용해 비용 계산
    for (let i = 0; i < amount; i++) cost += 100 * (displayCore.level + i);
    return cost.toLocaleString();
  };

  const handleEquip = () => {
    if (!selectedCore) return;
    if (window.confirm("한 번 장착하면 환생 전까지 다른 코어로 변경하거나 해제할 수 없습니다. 정말 장착하시겠습니까?")) {
      equipCore(selectedCore.id);
      setSelectedCore(null);
    }
  };

  return (
      <div className="max-w-md mx-auto p-3 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-3 shadow-xl text-xs">
        <h2 className="text-xl font-extrabold text-yellow-400 text-center">코어 관리</h2>
        <div className="text-center text-yellow-300 font-bold">보유 골드: {player.gold.toLocaleString()} G</div>

        {/* 장착 슬롯 영역 */}
        <div className="bg-neutral-800 p-2 rounded-lg border border-neutral-700 flex items-center gap-3">
          <h3 className="font-bold text-blue-400 text-sm whitespace-nowrap">장착 중</h3>
          <div className={`flex-1 p-2 rounded border h-14 flex items-center justify-center cursor-pointer ${equippedCore ? getCoreTypeColor(equippedCore.type) : 'border-neutral-600 bg-neutral-700/50'}`}
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
        <div className="bg-neutral-800 p-3 rounded-lg border border-neutral-700">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-yellow-400">보유 코어 (환생 시 획득)</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {playerCores.map((core, i) => {
              // 이미 코어가 장착되어 있으면 인벤토리의 코어들은 시각적으로 비활성화 처리
              const isDisabled = equippedCore !== null;
              return (
                  <div key={`${core.id}-${i}`}
                       className={`p-2 rounded border flex flex-col items-center justify-center transition-all 
                        ${isDisabled ? 'border-neutral-700 bg-neutral-800 opacity-40 cursor-not-allowed grayscale' : `cursor-pointer ${getCoreTypeColor(core.type)}`}`}
                       onClick={() => {
                         // 장착된 코어가 없을 때만 인벤토리 코어 상세 정보를 볼 수 있음
                         if (!isDisabled) {
                           setSelectedCore(core);
                           setIsEquippedSelected(false);
                         }
                       }}>
                    <span className="font-bold text-[10px] mb-1">{core.name}</span>
                    <span className="font-bold text-[14px]">Lv.{core.level}</span>
                  </div>
              );
            })}
          </div>
        </div>

        {/* 선택된 코어 상세 및 액션 영역 */}
        {displayCore && (
            <div className={`p-4 rounded-lg border ${getCoreTypeColor(displayCore.type)}`}>
              <div className="text-lg font-extrabold mb-1">{displayCore.name}</div>
              <div className="text-xs font-bold mb-3">현재 레벨: {displayCore.level}</div>
              <p className="mb-4 p-2 bg-black/20 rounded text-[13px] leading-relaxed">
                {getCoreStats(displayCore.type, displayCore.level).desc}
              </p>

              {/* 장착 전 (인벤토리 선택 상태) */}
              {!isEquippedSelected && !equippedCore && (
                  <div className="flex gap-2 mb-4">
                    <button onClick={handleEquip}
                            className="flex-1 py-3 rounded font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white">
                      이 코어로 결정 및 장착
                    </button>
                  </div>
              )}

              {/* 장착 후 (장착 코어 선택 상태) - 강화 버튼 노출 */}
              {isEquippedSelected && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-neutral-300 text-center">
                      비용: +1 ({getBatchCost(1)}G) | +10 ({getBatchCost(10)}G) | +100 ({getBatchCost(100)}G)
                    </div>
                    <div className="flex gap-2">
                      {[1, 10, 100].map(amt => (
                          // 백엔드 수정 사항에 맞게 인자(coreId) 없이 amount만 넘깁니다.
                          <button key={amt} onClick={() => upgradeCore(amt)}
                                  className="flex-1 py-3 bg-yellow-700 hover:bg-yellow-600 rounded font-bold text-sm">
                            +{amt}
                          </button>
                      ))}
                    </div>
                  </div>
              )}
            </div>
        )}
      </div>
  );
};

export default CoreScreen;