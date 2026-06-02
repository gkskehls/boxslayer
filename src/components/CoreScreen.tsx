import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Core } from '../types/game';

// 1. 계산 함수들
const getCoreStats = (type: string, level: number) => {
  switch (type) {
    case 'FIRE': return { desc: `화속성 데미지: ${10 + (level * 5)} + (공격력 * ${(5 + level)}%)` };
    case 'WATER': return { desc: `보호막: ${5 + (level * 2)}` };
    case 'WIND': return { desc: `공격 속도 +${(0.1 + (level * 0.02)).toFixed(2)}` };
    case 'ELECTRIC': return { desc: `기절 확률 ${(10 + level)}% (2초)` };
    default: return { desc: '효과 없음' };
  }
};

const getUpgradeCost = (level: number) => 100 * level;

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
  const { player, playerCores, equippedCore, acquireCore, equipCore, unequipCore, upgradeCore } = useGameStore();
  const [selectedCore, setSelectedCore] = useState<Core | null>(null);
  const [isEquippedSelected, setIsEquippedSelected] = useState(false);
  const [showAcquireModal, setShowAcquireModal] = useState(false);

  const tempCores: Core[] = [
    { id: 'fire_core_1', name: '불의 코어', type: 'FIRE', level: 1 },
    { id: 'water_core_1', name: '물의 코어', type: 'WATER', level: 1 },
    { id: 'wind_core_1', name: '바람의 코어', type: 'WIND', level: 1 },
    { id: 'electric_core_1', name: '전기의 코어', type: 'ELECTRIC', level: 1 },
  ];

  const getBatchCost = (amount: number) => {
    if (!selectedCore) return "0";
    let cost = 0;
    for (let i = 0; i < amount; i++) {
      cost += getUpgradeCost(selectedCore.level + i);
    }
    return cost.toLocaleString();
  };

  return (
      <div className="max-w-md mx-auto p-3 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-3 shadow-xl text-xs">
        <h2 className="text-xl font-extrabold text-yellow-400 text-center">코어 관리</h2>
        <div className="text-center text-yellow-300 font-bold">보유 골드: {player.gold.toLocaleString()} G</div>

        {/* 장착 섹션 - 가로형 레이아웃 */}
        <div className="bg-neutral-800 p-2 rounded-lg border border-neutral-700 flex items-center gap-3">
          <h3 className="font-bold text-blue-400 text-sm whitespace-nowrap">장착 중</h3>
          <div
              className={`flex-1 p-2 rounded border h-14 flex items-center justify-center cursor-pointer 
          ${equippedCore ? getCoreTypeColor(equippedCore.type) : 'border-neutral-600 bg-neutral-700/50'}`}
              onClick={() => { if (equippedCore) { setSelectedCore(equippedCore); setIsEquippedSelected(true); } }}
          >
            {equippedCore ? (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm truncate">{equippedCore.name}</span>
                  <span className="font-bold text-[12px] opacity-80">Lv.{equippedCore.level}</span>
                </div>
            ) : <span className="text-[10px] text-neutral-500">비어있음</span>}
          </div>
        </div>

        {/* 인벤토리 섹션 */}
        <div className="bg-neutral-800 p-3 rounded-lg border border-neutral-700">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-yellow-400">인벤토리</h3>
            <button onClick={() => setShowAcquireModal(true)} className="px-2 py-1 bg-blue-600 font-bold rounded hover:bg-blue-500">획득</button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {playerCores.map((core, index) => (
                <div
                    key={`${core.id}-${index}`}
                    className={`p-2 rounded border cursor-pointer flex flex-col items-center justify-center ${getCoreTypeColor(core.type)}`}
                    onClick={() => { setSelectedCore(core); setIsEquippedSelected(false); }}
                >
                  <span className="font-bold text-[14px]">Lv.{core.level}</span>
                </div>
            ))}
          </div>
        </div>

        {/* 상세 정보 섹션 */}
        {selectedCore && (
            <div className={`p-4 rounded-lg border ${getCoreTypeColor(selectedCore.type)}`}>
              <div className="text-lg font-extrabold mb-1">{selectedCore.name}</div>
              <div className="text-xs font-bold mb-3">현재 레벨: {selectedCore.level}</div>
              <p className="mb-4 p-2 bg-black/20 rounded text-[13px] leading-relaxed">{getCoreStats(selectedCore.type, selectedCore.level).desc}</p>

              <div className="flex gap-2 mb-4">
                <button
                    onClick={() => {
                      if (isEquippedSelected) { unequipCore(); } else { equipCore(selectedCore.id); }
                      setSelectedCore(null);
                    }}
                    className={`flex-1 py-3 rounded font-bold text-sm ${isEquippedSelected ? 'bg-red-600' : 'bg-blue-600'}`}
                >
                  {isEquippedSelected ? '해제' : '장착'}
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] text-neutral-300 text-center">
                  비용: +1 ({getBatchCost(1)}G) | +10 ({getBatchCost(10)}G) | +100 ({getBatchCost(100)}G)
                </div>
                <div className="flex gap-2">
                  {[1, 10, 100].map((amount) => (
                      <button
                          key={amount}
                          onClick={() => {
                            upgradeCore(selectedCore.id, amount);
                            const updatedCore = isEquippedSelected
                                ? useGameStore.getState().equippedCore
                                : useGameStore.getState().playerCores.find(c => c.id === selectedCore.id);
                            if (updatedCore) setSelectedCore(updatedCore);
                          }}
                          className="flex-1 py-3 bg-yellow-700 hover:bg-yellow-600 rounded font-bold text-sm"
                      >
                        +{amount}
                      </button>
                  ))}
                </div>
              </div>
            </div>
        )}

        {/* 모달 */}
        {showAcquireModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-neutral-900 p-6 rounded-lg grid grid-cols-2 gap-4">
                {tempCores.map(c => (
                    <button
                        key={c.id}
                        onClick={() => { acquireCore(c); setShowAcquireModal(false); }}
                        className={`p-4 border ${getCoreTypeColor(c.type)}`}
                    >
                      {c.name}
                    </button>
                ))}
                <button onClick={() => setShowAcquireModal(false)} className="col-span-2 py-2 bg-neutral-700">닫기</button>
              </div>
            </div>
        )}
      </div>
  );
};

export default CoreScreen;