import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Core, CoreEffect } from '../types/game';

const CoreScreen: React.FC = () => {
  const { playerCores, equippedCores, acquireCore, equipCore, unequipCore, upgradeCore } = useGameStore(); // player 제거
  const [selectedCore, setSelectedCore] = useState<Core | null>(null);
  const [showAcquireModal, setShowAcquireModal] = useState(false);

  // 임시 코어 데이터 (테스트용)
  const tempCores: Core[] = [
    { id: 'fire_core_1', name: '불의 코어', type: 'FIRE', level: 1, effects: { fireDamage: 10 }, upgradeCost: 100, description: '몸통박치기 시 추가 화속성 데미지' },
    { id: 'water_core_1', name: '물의 코어', type: 'WATER', level: 1, effects: { shieldAmount: 5 }, upgradeCost: 100, description: '일정 시간마다 보호막 생성' },
    { id: 'wind_core_1', name: '바람의 코어', type: 'WIND', level: 1, effects: { attackSpeedBonus: 0.1 }, upgradeCost: 100, description: '공격 속도 증가' },
    { id: 'electric_core_1', name: '전기의 코어', type: 'ELECTRIC', level: 1, effects: { stunChance: 0.1, stunDuration: 2 }, upgradeCost: 100, description: '일정 확률로 적 기절' },
  ];

  const handleAcquireCore = (core: Core) => {
    acquireCore(core);
    setSelectedCore(core); // 획득 후 바로 선택하여 상세 정보 표시
    setShowAcquireModal(false);
  };

  const getEffectDescription = (effects: CoreEffect): string => {
    let desc = [];
    if (effects.fireDamage) desc.push(`화속성 데미지 +${effects.fireDamage}`);
    if (effects.fireDamageRatio) desc.push(`공격력의 ${effects.fireDamageRatio * 100}% 화속성 데미지`);
    if (effects.shieldAmount) desc.push(`보호막 +${effects.shieldAmount}`);
    if (effects.slowChance) desc.push(`둔화 확률 ${effects.slowChance * 100}%`);
    if (effects.slowAmount) desc.push(`둔화 효과 ${effects.slowAmount * 100}%`);
    if (effects.attackSpeedBonus) desc.push(`공격 속도 +${effects.attackSpeedBonus}`);
    if (effects.evasionChance) desc.push(`회피 확률 ${effects.evasionChance * 100}%`);
    if (effects.stunChance) desc.push(`기절 확률 ${effects.stunChance * 100}%`);
    if (effects.stunDuration) desc.push(`기절 지속 ${effects.stunDuration}초`);
    return desc.join(', ') || '특수 효과 없음';
  };

  return (
      <div className="max-w-4xl mx-auto p-6 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-6">
        <h2 className="text-3xl font-bold text-yellow-400 mb-4 text-center">코어 관리</h2>

        {/* Equipped Cores */}
        <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700">
          <h3 className="text-xl font-bold text-blue-400 mb-3">장착된 코어</h3>
          <div className="grid grid-cols-3 gap-4">
            {equippedCores.map((core, index) => (
                <div
                    key={index}
                    className={`p-3 rounded-lg border ${core ? 'border-green-500 bg-green-900/20' : 'border-neutral-600 bg-neutral-700/50'} flex flex-col items-center justify-center h-24 cursor-pointer`}
                    onClick={() => core ? setSelectedCore(core) : null}
                >
                  {core ? (
                      <>
                        <span className="font-bold text-sm">{core.name}</span>
                        <span className="text-xs text-neutral-300">Lv.{core.level}</span>
                      </>
                  ) : (
                      <span className="text-neutral-500 text-sm">비어있음</span>
                  )}
                </div>
            ))}
          </div>
        </div>

        {/* Core Inventory */}
        <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700">
          <h3 className="text-xl font-bold text-yellow-400 mb-3 flex justify-between items-center">
            <span>코어 인벤토리</span>
            <button
                onClick={() => setShowAcquireModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-500 transition-colors"
            >
              코어 획득 (테스트)
            </button>
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {playerCores.length > 0 ? (
                playerCores.map((core) => (
                    <div
                        key={core.id}
                        className="p-3 rounded-lg border border-neutral-600 bg-neutral-700/50 flex flex-col items-center justify-center h-24 cursor-pointer hover:bg-neutral-700"
                        onClick={() => setSelectedCore(core)}
                    >
                      <span className="font-bold text-sm">{core.name}</span>
                      <span className="text-xs text-neutral-300">Lv.{core.level}</span>
                    </div>
                ))
            ) : (
                <div className="col-span-4 text-center text-neutral-500 italic py-4">
                  보유한 코어가 없습니다.
                </div>
            )}
          </div>
        </div>

        {/* Core Detail / Actions */}
        {selectedCore && (
            <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700">
              <h3 className="text-xl font-bold text-purple-400 mb-3">{selectedCore.name} (Lv.{selectedCore.level})</h3>
              <p className="text-sm text-neutral-300 mb-2">{selectedCore.description}</p>
              <p className="text-sm text-neutral-300 mb-4">효과: {getEffectDescription(selectedCore.effects)}</p>

              <div className="flex gap-4">
                {/* Equip Button */}
                <select
                    className="bg-neutral-700 text-white p-2 rounded-lg flex-1"
                    onChange={(e) => {
                      const slotIndex = parseInt(e.target.value);
                      if (!isNaN(slotIndex)) {
                        equipCore(selectedCore.id, slotIndex);
                        setSelectedCore(null); // 장착 후 선택 해제
                      }
                    }}
                    value="" // Controlled component, default empty
                >
                  <option value="" disabled>장착 슬롯 선택</option>
                  {equippedCores.map((core, index) => (
                      <option key={index} value={index} disabled={!!core}>
                        {index + 1}번 슬롯 {core ? `(${core.name} 장착됨)` : '(비어있음)'}
                      </option>
                  ))}
                </select>

                {/* Unequip Button (if equipped) */}
                {equippedCores.some(c => c && c.id === selectedCore.id) && (
                    <button
                        onClick={() => {
                          const slotIndex = equippedCores.findIndex(c => c && c.id === selectedCore.id);
                          if (slotIndex !== -1) {
                            unequipCore(slotIndex);
                            setSelectedCore(null); // 해제 후 선택 해제
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-500 transition-colors shadow-md"
                    >
                      해제
                    </button>
                )}

                {/* Upgrade Button */}
                <button
                    onClick={() => {
                      upgradeCore(selectedCore.id);
                      setSelectedCore(null); // 강화 후 선택 해제 (업데이트된 코어 정보를 다시 불러오기 위함)
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white text-sm font-bold rounded-lg hover:bg-yellow-500 transition-colors shadow-md"
                >
                  강화 ({selectedCore.upgradeCost} 골드)
                </button>
              </div>
              <button
                  onClick={() => setSelectedCore(null)}
                  className="mt-4 w-full px-4 py-2 bg-neutral-600 text-white text-sm font-bold rounded-lg hover:bg-neutral-500 transition-colors shadow-md"
              >
                닫기
              </button>
            </div>
        )}

        {/* Acquire Core Modal (for testing) */}
        {showAcquireModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-neutral-800 p-8 rounded-lg border border-neutral-700 text-center w-full max-w-md">
                <h3 className="text-2xl font-bold text-yellow-400 mb-4">코어 획득</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {tempCores.map(core => (
                      <button
                          key={core.id}
                          onClick={() => handleAcquireCore(core)}
                          className="p-3 rounded-lg border border-blue-600 bg-blue-900/20 text-white hover:bg-blue-800/50 transition-colors"
                      >
                        <span className="font-bold">{core.name}</span> (Lv.{core.level})
                      </button>
                  ))}
                </div>
                <button
                    onClick={() => setShowAcquireModal(false)}
                    className="px-6 py-2 bg-neutral-600 text-white text-lg font-bold rounded-lg hover:bg-neutral-500 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
        )}
      </div>
  );
};

export default CoreScreen;