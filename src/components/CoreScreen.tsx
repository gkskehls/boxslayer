// src/components/CoreScreen.tsx

import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { CoreType } from '../types/game';
import { formatNumber } from '../utils/format';
import { CORE_ABILITIES_CONFIG, calculateCoreAbilityCost, calculateTotalSpentCoreFragments } from '../data/rebirthConfig';

const CORE_INFO_MAP: Record<
  CoreType,
  {
    name: string;
    icon: string;
    borderColor: string;
    bgColor: string;
    textColor: string;
    tagline: string;
    summary: string;
    scalingStat: string;
  }
> = {
  FIRE: {
    name: '불의 코어 (Flame)',
    icon: '🔥',
    borderColor: 'border-red-600',
    bgColor: 'bg-red-50',
    textColor: 'text-red-800',
    tagline: '방어 무시 / 지속 화염 피해',
    summary: '공격 시 적의 방어력을 무시하는 고정 화염 피해를 입힙니다. STR(힘)에 비례해 위력이 증가합니다.',
    scalingStat: '주 스탯: STR (힘)',
  },
  WATER: {
    name: '물의 코어 (Water)',
    icon: '💧',
    borderColor: 'border-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    tagline: '보호막 생성 / 피해 반사 / 타격 회복',
    summary: '전투 시작 시 쉴드를 얻고 타격마다 쉴드를 회복하며 적의 피해를 반사합니다. CON(체력)에 비례합니다.',
    scalingStat: '주 스탯: CON (체력)',
  },
  WIND: {
    name: '바람의 코어 (Wind)',
    icon: '🌪️',
    borderColor: 'border-emerald-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    tagline: '명중·회피 / 연격(Multi-Hit) 폭격',
    summary: '명중률과 회피율이 상승하며, 연속 공격 시 추가 타격 및 절대 회피 잔상을 활성화합니다.',
    scalingStat: '주 스탯: DEX (민첩)',
  },
  ELECTRIC: {
    name: '번개의 코어 (Electric)',
    icon: '⚡',
    borderColor: 'border-yellow-600',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-900',
    tagline: '추가 번개 피해 / 기절(Stun) / 처형',
    summary: '방어력을 무시하는 번개 피해를 주며, 적을 기절시키고 기절한 적에게 치명적인 추가 피해를 입힙니다.',
    scalingStat: '주 스탯: STR / DEX 균등',
  },
};

const CoreScreen: React.FC = () => {
  const {
    equippedCore,
    selectCore,
    upgradeCore,
    upgradeCoreAbility,
    resetCoreAbilities,
    coreAbilities,
    coreFragments,
    player,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'EQUIP' | 'ABILITIES'>('EQUIP');
  const [selectedType, setSelectedType] = useState<CoreType>(equippedCore?.type || 'FIRE');
  const [goldUpgradeMultiplier, setGoldUpgradeMultiplier] = useState<1 | 10>(1);

  const coreTypes: CoreType[] = ['FIRE', 'WATER', 'WIND', 'ELECTRIC'];
  const currentInfo = CORE_INFO_MAP[selectedType];
  const isSelectedEquipped = equippedCore?.type === selectedType;
  const totalSpentCoreFragments = calculateTotalSpentCoreFragments(coreAbilities);

  const handleResetCoreAbilities = () => {
    if (totalSpentCoreFragments <= 0) {
      alert("투자된 코어 조각이 없습니다.");
      return;
    }
    if (window.confirm(`코어 특화 연구에 투자된 모든 코어 조각을 초기화하시겠습니까?\n\n투자된 코어 조각 (💎 ${formatNumber(totalSpentCoreFragments)})이 100% 전액 환급됩니다.`)) {
      resetCoreAbilities();
    }
  };

  // 골드 강화 비용 계산
  const getGoldUpgradeCost = (currentLvl: number, count: number) => {
    let cost = 0;
    for (let i = 0; i < count; i++) {
      cost += 100 * (currentLvl + i);
    }
    return cost;
  };

  const currentLevel = equippedCore && isSelectedEquipped ? equippedCore.level : 1;
  const goldCost = getGoldUpgradeCost(currentLevel, goldUpgradeMultiplier);
  const canAffordGold = player.gold >= goldCost && isSelectedEquipped;

  return (
    <div
      className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-4 text-stone-900 font-mono select-none flex-grow"
      style={{
        backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* 1. 상단 재화 현황 바 */}
      <div className="bg-stone-300 p-2.5 rounded-none border-4 border-black w-full flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-black text-stone-600 uppercase leading-none">CORE_RESEARCH_LAB</span>
          <span className="text-xs font-black text-black">
            장착 코어: {equippedCore ? CORE_INFO_MAP[equippedCore.type].name : '미장착 (선택 필요)'}
          </span>
        </div>
        <div className="flex gap-3 text-right">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-stone-600 leading-none">보유 골드</span>
            <span className="text-xs font-black text-yellow-700">🪙 {formatNumber(player.gold)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-stone-600 leading-none">코어 조각</span>
            <span className="text-xs font-black text-cyan-700">💎 {formatNumber(coreFragments)}</span>
          </div>
        </div>
      </div>

      {/* 2. 서브 탭 전환: [코어 장착 & 골드 강화] / [💎 코어 조각 독립 연구] */}
      <div className="flex gap-1 w-full">
        <button
          onClick={() => setActiveTab('EQUIP')}
          className={`flex-1 py-2 text-xs font-black border-2 border-black transition-all cursor-pointer uppercase ${
            activeTab === 'EQUIP'
              ? 'bg-amber-300 text-black shadow-none translate-x-[1px] translate-y-[1px]'
              : 'bg-stone-200 text-stone-700 hover:bg-stone-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
          }`}
        >
          ⚔️ 코어 장착 & 기본 강화
        </button>
        <button
          onClick={() => setActiveTab('ABILITIES')}
          className={`flex-1 py-2 text-xs font-black border-2 border-black transition-all cursor-pointer uppercase ${
            activeTab === 'ABILITIES'
              ? 'bg-cyan-300 text-black shadow-none translate-x-[1px] translate-y-[1px]'
              : 'bg-stone-200 text-stone-700 hover:bg-stone-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
          }`}
        >
          💎 코어 독립 특화 연구
        </button>
      </div>

      {/* 3. 코어 장착 & 골드 기본 강화 탭 */}
      {activeTab === 'EQUIP' && (
        <div className="flex flex-col gap-3">
          {/* 4대 속성 코어 선택 버튼 그리드 */}
          <div className="grid grid-cols-4 gap-1.5">
            {coreTypes.map(type => {
              const info = CORE_INFO_MAP[type];
              const isEquipped = equippedCore?.type === type;
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`p-2 rounded-none border-2 border-black flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-amber-200 shadow-none translate-x-[1px] translate-y-[1px]'
                      : 'bg-stone-100 hover:bg-stone-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  {isEquipped && (
                    <span className="absolute -top-1.5 -right-1 bg-green-600 text-white text-[8px] font-black px-1 border border-black leading-tight">
                      장착중
                    </span>
                  )}
                  <span className="text-xl">{info.icon}</span>
                  <span className="text-[10px] font-black text-black mt-1 leading-tight">{type}</span>
                </button>
              );
            })}
          </div>

          {/* 선택된 코어 상세 및 장착/강화 패널 */}
          <div className={`p-3.5 border-4 border-black ${currentInfo.bgColor} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3`}>
            <div className="flex justify-between items-start border-b-2 border-stone-300 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-3xl p-1.5 bg-white border-2 border-black">{currentInfo.icon}</span>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-black text-black">{currentInfo.name}</span>
                  <span className="text-[10px] font-bold text-stone-600">{currentInfo.tagline}</span>
                  <span className="text-[10px] font-black text-blue-700 mt-0.5">{currentInfo.scalingStat}</span>
                </div>
              </div>
              {isSelectedEquipped && (
                <span className="text-xs font-black text-black bg-amber-300 px-2 py-1 border border-black">
                  Lv.{equippedCore.level}
                </span>
              )}
            </div>

            <p className="text-[11px] text-stone-800 leading-relaxed text-left bg-white/70 p-2 border border-stone-400">
              {currentInfo.summary}
            </p>

            {/* 장착 또는 골드 레벨업 액션 버튼 */}
            <div className="flex gap-2 items-center pt-1">
              {!equippedCore ? (
                <button
                  onClick={() => selectCore(selectedType)}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white text-xs font-black rounded-none border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer uppercase tracking-wider"
                >
                  이 코어로 장착하기 (회차 고정)
                </button>
              ) : isSelectedEquipped ? (
                <div className="flex gap-2 w-full items-center">
                  <div className="flex gap-0.5 bg-stone-200 p-0.5 border border-black">
                    {([1, 10] as const).map(mult => (
                      <button
                        key={mult}
                        onClick={() => setGoldUpgradeMultiplier(mult)}
                        className={`px-2 py-1 text-[10px] font-black border border-black ${
                          goldUpgradeMultiplier === mult ? 'bg-black text-yellow-300' : 'bg-white text-stone-800'
                        }`}
                      >
                        +{mult}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => upgradeCore(goldUpgradeMultiplier)}
                    disabled={!canAffordGold}
                    className={`flex-1 py-2 text-xs font-black rounded-none border-2 border-black transition-all flex justify-between px-3 items-center cursor-pointer ${
                      canAffordGold
                        ? 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                        : 'bg-stone-300 text-stone-400 border-stone-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <span>기본 속성 +{goldUpgradeMultiplier} 강화</span>
                    <span className="text-[10px]">🪙 {formatNumber(goldCost)}</span>
                  </button>
                </div>
              ) : (
                <div className="w-full p-2 bg-stone-200 border-2 border-black text-[10px] text-stone-600 text-center font-bold">
                  ⚠️ 이번 회차에는 다른 코어가 장착되어 있습니다. (환생 시 교체 가능)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. 💎 코어 조각 독립 특화 연구 탭 (코어별 분리 탭 적용) */}
      {activeTab === 'ABILITIES' && (
        <div className="flex flex-col gap-2.5">
          {/* 상단 안내 패널 */}
          <div className="bg-cyan-50 p-2.5 border-2 border-cyan-800 flex justify-between items-center text-left">
            <div>
              <span className="text-xs font-black text-cyan-900 block">💎 코어별 독립 특화 연구</span>
              <span className="text-[10px] text-cyan-700">각 코어 장착 시 발동되는 고유 메커니즘을 영구 연구합니다. (환생 시 유지)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-cyan-800">💎 {formatNumber(coreFragments)}</span>
              {totalSpentCoreFragments > 0 && (
                <button
                  type="button"
                  onClick={handleResetCoreAbilities}
                  title={`투자된 ${formatNumber(totalSpentCoreFragments)}개 100% 환급`}
                  className="bg-stone-100 hover:bg-red-50 text-red-600 border-2 border-red-600 px-1.5 py-0.5 text-[9px] font-black tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer leading-tight whitespace-nowrap"
                >
                  🔄 초기화
                </button>
              )}
            </div>
          </div>

          {/* 코어별 연구 카테고리 선택 탭 */}
          <div className="grid grid-cols-4 gap-1">
            {coreTypes.map(type => {
              const info = CORE_INFO_MAP[type];
              const isSelected = selectedType === type;
              const isEquipped = equippedCore?.type === type;

              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`py-1.5 px-1 rounded-none border-2 border-black flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-cyan-300 text-black shadow-none translate-x-[1px] translate-y-[1px]'
                      : 'bg-stone-200 text-stone-700 hover:bg-stone-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  {isEquipped && (
                    <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[7px] font-black px-0.5 border border-black leading-none">
                      ON
                    </span>
                  )}
                  <span className="text-base">{info.icon}</span>
                  <span className="text-[9px] font-black leading-tight mt-0.5">{type}</span>
                </button>
              );
            })}
          </div>

          {/* 선택된 코어 연구 헤더 안내 */}
          <div className={`p-2 border-2 border-black ${currentInfo.bgColor} flex justify-between items-center text-left`}>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{currentInfo.icon}</span>
              <div>
                <span className="text-xs font-black text-black block">{currentInfo.name} 연구</span>
                <span className="text-[9px] font-bold text-stone-600">{currentInfo.tagline}</span>
              </div>
            </div>
            {isSelectedEquipped ? (
              <span className="text-[10px] font-black text-green-700 bg-green-100 px-1.5 py-0.5 border border-green-700">
                ⚡ 현재 전투 적용 중
              </span>
            ) : (
              <span className="text-[9px] font-bold text-stone-500 bg-white/70 px-1.5 py-0.5 border border-stone-400">
                장착 시 발동
              </span>
            )}
          </div>

          {/* 해당 코어의 독립 특화 연구 목록 */}
          <div className="flex flex-col gap-2">
            {CORE_ABILITIES_CONFIG.filter(c => c.coreType === selectedType).map(config => {
              const currentLvl = coreAbilities ? (coreAbilities[config.id] || 0) : 0;
              const cost = calculateCoreAbilityCost(config, currentLvl);
              const isMax = config.maxLevel !== undefined && currentLvl >= config.maxLevel;
              const canAfford = coreFragments >= cost && !isMax;
              const currentValue = currentLvl * config.valuePerLevel;

              return (
                <div
                  key={config.id}
                  className="bg-stone-50 p-2.5 rounded-none border-2 border-black flex justify-between items-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="flex items-start gap-2 max-w-[65%]">
                    <span className="text-xl p-1 bg-stone-200 border border-black">{config.icon}</span>
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-black">{config.name}</span>
                        <span className="text-[10px] font-bold text-stone-500">Lv.{currentLvl}</span>
                      </div>
                      <span className="text-[10px] text-stone-600 leading-tight mt-0.5">{config.desc}</span>
                      <span className="text-[10px] font-black text-cyan-800 mt-0.5">
                        현재 효과: +{currentValue.toFixed(1)}{config.unit}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => upgradeCoreAbility(config.id)}
                    disabled={!canAfford}
                    className={`px-3 py-2 rounded-none border-2 border-black text-xs font-black transition-all flex flex-col items-center justify-center min-w-[75px] cursor-pointer ${
                      canAfford
                        ? 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                        : 'bg-stone-300 text-stone-400 border-stone-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isMax ? (
                      <span>MAX</span>
                    ) : (
                      <>
                        <span>연구 +1</span>
                        <span className="text-[9px] font-bold text-stone-900 leading-none">
                          💎 {formatNumber(cost)}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoreScreen;
