import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Core } from '../types/game';

// 1. 계산 함수 (능력치 및 비용)
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

  return (
      <div className="max-w-4xl mx-auto p-8 rounded-2xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-8 shadow-2xl">
        <h2 className="text-4xl font-extrabold text-yellow-400 mb-6 text-center tracking-wide">코어 관리</h2>
        <div className="text-center text-yellow-300 font-bold text-lg mb-4">
          보유 골드: {player.gold.toLocaleString()} G
        </div>
        {/* 장착 섹션 */}
        <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700">
          <h3 className="text-xl font-bold text-blue-400 mb-4">장착된 코어</h3>
          <div className="flex justify-center">
            <div
                className={`p-4 rounded-lg border w-24 h-24 flex flex-col items-center justify-center cursor-pointer 
            ${equippedCore ? getCoreTypeColor(equippedCore.type) : 'border-neutral-600 bg-neutral-700/50'}`}
                onClick={() => { if (equippedCore) { setSelectedCore(equippedCore); setIsEquippedSelected(true); } }}
            >
              {equippedCore ? (
                  <>
                    <span className="font-bold text-xs">{equippedCore.name}</span>
                    <span className="text-[10px]">Lv.{equippedCore.level}</span>
                  </>
              ) : <span className="text-xs text-neutral-500">비어있음</span>}
            </div>
          </div>
        </div>

        {/* 인벤토리 섹션 */}
        <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700">
          <h3 className="text-2xl font-bold text-yellow-400 mb-4 flex justify-between">
            <span>코어 인벤토리</span>
            <button onClick={() => setShowAcquireModal(true)} className="px-4 py-2 bg-blue-600 text-sm font-bold rounded-lg hover:bg-blue-500">테스트 획득</button>
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {playerCores.map((core, index) => (
                <div
                    key={`${core.id}-${index}`}
                    className={`p-4 rounded-lg border cursor-pointer ${getCoreTypeColor(core.type)}`}
                    onClick={() => { setSelectedCore(core); setIsEquippedSelected(false); }}
                >
                  <span className="font-bold text-sm">{core.name}</span>
                  <p className="text-[10px]">Lv.{core.level}</p>
                </div>
            ))}
          </div>
        </div>

        {/* 상세 정보 섹션 */}
        {selectedCore && (
            <div className={`p-6 rounded-xl border ${getCoreTypeColor(selectedCore.type)}`}>
              <h3 className="text-xl font-bold mb-2">{selectedCore.name} (Lv.{selectedCore.level})</h3>
              <p className="text-sm mb-4">효과: {getCoreStats(selectedCore.type, selectedCore.level).desc}</p>
              <div className="flex gap-3">
                <button
                    onClick={() => {
                      if (isEquippedSelected) {
                        unequipCore();
                      } else {
                        equipCore(selectedCore.id);
                      }
                      setSelectedCore(null);
                    }}
                    className={`flex-1 py-2 rounded ${isEquippedSelected ? 'bg-red-600' : 'bg-blue-600'}`}
                >
                  {isEquippedSelected ? '해제' : '장착'}
                </button>
                <button
                    onClick={() => {
                      // 1. 강화 실행
                      upgradeCore(selectedCore.id);

                      // 2. 강화 직후, 스토어의 최신 상태에서 현재 선택된 코어를 다시 찾아서 selectedCore를 갱신
                      // (이 로직은 버튼 클릭 시점에 일어나는 동기적인 갱신입니다)
                      const updatedCore = isEquippedSelected
                          ? useGameStore.getState().equippedCore
                          : useGameStore.getState().playerCores.find(c => c.id === selectedCore.id);

                      if (updatedCore) {
                        setSelectedCore(updatedCore);
                      }
                    }}
                    className="flex-1 py-2 bg-yellow-600 rounded"
                >
                  강화 ({getUpgradeCost(selectedCore.level)}G)
                </button>
              </div>
            </div>
        )}

        {/* [여기서부터] 모달 추가 위치 */}
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
                <button
                    onClick={() => setShowAcquireModal(false)}
                    className="col-span-2 py-2 bg-neutral-700"
                >
                  닫기
                </button>
              </div>
            </div>
        )}
        {/* [여기까지] */}
      </div>
  );
};

export default CoreScreen;