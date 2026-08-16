// src/components/CoreScreen.tsx

import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { CoreType } from '../types/game';
import { formatNumber } from '../utils/format';
import { CORE_ABILITIES_CONFIG, calculateCoreAbilityCost, calculateTotalSpentCoreFragments } from '../data/rebirthConfig';

interface CoreThemeInfo {
  name: string;
  shortName: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  btnStyle: string;
  tagline: string;
  summary: string;
  scalingStat: string;
}

const CORE_INFO_MAP: Record<CoreType, CoreThemeInfo> = {
  FIRE: {
    name: '불의 코어',
    shortName: '불',
    badgeBg: 'bg-red-100',
    badgeBorder: 'border-red-600',
    badgeText: 'text-red-700',
    btnStyle: 'bg-red-100 text-red-700 border-red-600',
    tagline: '방어 무시 / 지속 화염 피해',
    summary: '공격 시 적의 방어력을 무시하는 고정 화염 피해를 입힙니다. STR(힘)에 비례해 위력이 증가합니다.',
    scalingStat: '주 스탯: STR (힘)',
  },
  WATER: {
    name: '물의 코어',
    shortName: '물',
    badgeBg: 'bg-blue-100',
    badgeBorder: 'border-blue-600',
    badgeText: 'text-blue-700',
    btnStyle: 'bg-blue-100 text-blue-700 border-blue-600',
    tagline: '보호막 생성 / 피해 반사 / 타격 회복',
    summary: '전투 시작 시 쉴드를 얻고 타격마다 쉴드를 회복하며 적의 피해를 반사합니다. CON(체력)에 비례합니다.',
    scalingStat: '주 스탯: CON (체력)',
  },
  WIND: {
    name: '바람의 코어',
    shortName: '바람',
    badgeBg: 'bg-emerald-100',
    badgeBorder: 'border-emerald-600',
    badgeText: 'text-emerald-700',
    btnStyle: 'bg-emerald-100 text-emerald-700 border-emerald-600',
    tagline: '명중·회피 / 연격(Multi-Hit) 폭격',
    summary: '명중률과 회피율이 상승하며, 연속 공격 시 추가 타격 및 절대 회피 잔상을 활성화합니다.',
    scalingStat: '주 스탯: DEX (민첩)',
  },
  ELECTRIC: {
    name: '전기의 코어',
    shortName: '전기',
    badgeBg: 'bg-amber-100',
    badgeBorder: 'border-amber-600',
    badgeText: 'text-amber-800',
    btnStyle: 'bg-amber-100 text-amber-800 border-amber-600',
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
    if (window.confirm(`코어 특화 연구에 투자된 모든 코어 조각을 초기화하시겠습니까?\n\n투자된 코어 조각 (${formatNumber(totalSpentCoreFragments)}개)이 100% 전액 환급됩니다.`)) {
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
      className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-3 font-mono text-xs text-stone-900 select-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-grow"
      style={{
        backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* 최상단 타이틀 & 연구 초기화 버튼 영역 (스탯/환생창과 동일 구조) */}
      <div className="flex justify-between items-center border-b-4 border-black pb-2 w-full">
        <div>
          <h2 className="text-sm font-black text-stone-500 tracking-widest uppercase leading-tight">
            -[ CORE ]-
          </h2>
          <span className="text-[10px] font-bold text-stone-500">속성 원소 및 특화 연구</span>
        </div>
        <button
          type="button"
          onClick={handleResetCoreAbilities}
          title={totalSpentCoreFragments > 0 ? `투자된 ${formatNumber(totalSpentCoreFragments)}개 100% 환급` : "코어 연구 초기화"}
          className="bg-stone-200 border-2 border-red-600 hover:bg-red-50 text-red-600 px-2.5 py-1 rounded-none text-[10px] font-black tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer break-keep"
        >
          연구 초기화
        </button>
      </div>

      {/* 1. 상단 재화 현황 바 */}
      <div className="bg-stone-300 p-3 rounded-none border-4 border-black w-full flex justify-between items-center font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block leading-tight">EQUIPPED</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {equippedCore ? (
              <span className={`px-2 py-0.5 border-2 text-[11px] font-black ${CORE_INFO_MAP[equippedCore.type].badgeBorder} ${CORE_INFO_MAP[equippedCore.type].badgeBg} ${CORE_INFO_MAP[equippedCore.type].badgeText}`}>
                {CORE_INFO_MAP[equippedCore.type].name} Lv.{equippedCore.level}
              </span>
            ) : (
              <span className="text-xs font-black text-stone-600">미장착 (선택 필요)</span>
            )}
          </div>
        </div>
        <div className="flex gap-3 text-right">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block leading-tight">골드</span>
            <span className="text-sm font-black text-amber-700 font-mono leading-tight">{formatNumber(player.gold)} G</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block leading-tight">코어 조각</span>
            <span className="text-sm font-black text-cyan-800 font-mono leading-tight">{formatNumber(coreFragments)}개</span>
          </div>
        </div>
      </div>

      {/* 2. 서브 탭 전환: [장착] / [연구] (간결한 2글자 탭) */}
      <div className="flex gap-1 w-full">
        <button
          type="button"
          onClick={() => setActiveTab('EQUIP')}
          className={`flex-1 py-1.5 text-[11px] font-black border-2 border-black transition-all cursor-pointer uppercase ${
            activeTab === 'EQUIP'
              ? 'bg-amber-300 text-black shadow-none translate-x-[1px] translate-y-[1px]'
              : 'bg-stone-200 text-stone-700 hover:bg-stone-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
          }`}
        >
          장착
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ABILITIES')}
          className={`flex-1 py-1.5 text-[11px] font-black border-2 border-black transition-all cursor-pointer uppercase ${
            activeTab === 'ABILITIES'
              ? 'bg-cyan-300 text-black shadow-none translate-x-[1px] translate-y-[1px]'
              : 'bg-stone-200 text-stone-700 hover:bg-stone-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
          }`}
        >
          연구
        </button>
      </div>

      {/* 3. 코어 장착 탭 */}
      {activeTab === 'EQUIP' && (
        <div className="flex flex-col gap-3">
          {/* 4대 속성 코어 선택 버튼 그리드 (각 원소 고유 색상 유지, 선택 시 입체적으로 눌린 효과만 부여) */}
          <div className="grid grid-cols-4 gap-1.5">
            {coreTypes.map(type => {
              const info = CORE_INFO_MAP[type];
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`py-2 px-1 rounded-none border-2 transition-all cursor-pointer ${info.btnStyle} ${
                    isSelected
                      ? 'border-b-2 translate-x-[2px] translate-y-[2px] shadow-none font-black ring-1 ring-black/20'
                      : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:brightness-95 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                  }`}
                >
                  <span className="text-xs font-black leading-tight block">{info.shortName}</span>
                </button>
              );
            })}
          </div>

          {/* 선택된 코어 상세 및 장착/강화 카드 */}
          <div className="p-3.5 rounded-none border-4 border-stone-800 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3">
            <div className="flex justify-between items-start border-b-2 border-stone-200 pb-2">
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 border-2 text-xs font-black ${currentInfo.badgeBorder} ${currentInfo.badgeBg} ${currentInfo.badgeText}`}>
                    {currentInfo.name}
                  </span>
                  <span className="text-[10px] font-black text-purple-700">{currentInfo.scalingStat}</span>
                </div>
                <span className="text-[11px] font-bold text-stone-600 mt-1">{currentInfo.tagline}</span>
              </div>
              {isSelectedEquipped && (
                <span className="text-xs font-black text-black bg-amber-300 px-2 py-0.5 border-2 border-black whitespace-nowrap">
                  Lv.{equippedCore.level}
                </span>
              )}
            </div>

            <p className="text-[11px] text-stone-700 leading-relaxed text-left bg-stone-100 p-2.5 border-2 border-stone-300 font-bold">
              {currentInfo.summary}
            </p>

            {/* 장착 또는 골드 레벨업 액션 */}
            <div className="flex gap-2 items-center pt-1">
              {!equippedCore ? (
                <button
                  type="button"
                  onClick={() => selectCore(selectedType)}
                  className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-black rounded-none border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer uppercase tracking-wider"
                >
                  이 코어로 장착하기 (회차 고정)
                </button>
              ) : isSelectedEquipped ? (
                <div className="flex gap-2 w-full items-center">
                  <div className="flex gap-0.5 bg-stone-200 p-0.5 border-2 border-black">
                    {([1, 10] as const).map(mult => (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => setGoldUpgradeMultiplier(mult)}
                        className={`px-2 py-1 text-[10px] font-black border border-black cursor-pointer ${
                          goldUpgradeMultiplier === mult ? 'bg-black text-yellow-300' : 'bg-white text-stone-800'
                        }`}
                      >
                        +{mult}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => upgradeCore(goldUpgradeMultiplier)}
                    disabled={!canAffordGold}
                    className={`flex-1 py-2 text-xs font-black rounded-none border-2 border-black transition-all flex justify-between px-3 items-center ${
                      canAffordGold
                        ? 'bg-amber-300 hover:bg-amber-200 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer'
                        : 'bg-stone-300 text-stone-400 border-stone-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <span>속성 강화 +{goldUpgradeMultiplier}</span>
                    <span className="text-[10px] font-mono">{formatNumber(goldCost)} G</span>
                  </button>
                </div>
              ) : (
                <div className="w-full p-2 bg-stone-100 border-2 border-stone-400 text-[10px] text-stone-600 text-center font-bold">
                  이번 회차에는 다른 코어가 장착되어 있습니다. (환생 시 교체 가능)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. 코어 연구 탭 (원소별 분리 탭 & 일관된 카드 목록) */}
      {activeTab === 'ABILITIES' && (
        <div className="flex flex-col gap-3">
          {/* 코어별 연구 카테고리 선택 탭 (4대 속성 고유 색상 유지, 선택 시 입체적으로 눌린 효과만 부여) */}
          <div className="grid grid-cols-4 gap-1.5">
            {coreTypes.map(type => {
              const info = CORE_INFO_MAP[type];
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`py-2 px-1 rounded-none border-2 transition-all cursor-pointer ${info.btnStyle} ${
                    isSelected
                      ? 'border-b-2 translate-x-[2px] translate-y-[2px] shadow-none font-black ring-1 ring-black/20'
                      : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:brightness-95 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                  }`}
                >
                  <span className="text-xs font-black leading-tight block">{info.shortName}</span>
                </button>
              );
            })}
          </div>

          {/* 선택된 코어 연구 헤더 안내 */}
          <div className="p-2.5 border-2 border-black bg-stone-200 flex justify-between items-center text-left">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 border-2 text-[11px] font-black ${currentInfo.badgeBorder} ${currentInfo.badgeBg} ${currentInfo.badgeText}`}>
                {currentInfo.name} 연구
              </span>
              <span className="text-[10px] font-bold text-stone-600">{currentInfo.tagline}</span>
            </div>
            {isSelectedEquipped ? (
              <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 border border-emerald-700">
                전투 적용 중
              </span>
            ) : (
              <span className="text-[10px] font-bold text-stone-500 bg-white px-1.5 py-0.5 border border-stone-400">
                장착 시 발동
              </span>
            )}
          </div>

          {/* 해당 코어의 독립 특화 연구 목록 (상점/환생과 동일한 디자인) */}
          <div className="flex flex-col gap-3 w-full">
            {CORE_ABILITIES_CONFIG.filter(c => c.coreType === selectedType).map(config => {
              const currentLvl = coreAbilities ? (coreAbilities[config.id] || 0) : 0;
              const cost = calculateCoreAbilityCost(config, currentLvl);
              const isMax = config.maxLevel !== undefined && currentLvl >= config.maxLevel;
              const canAfford = coreFragments >= cost && !isMax;
              const currentValue = currentLvl * config.valuePerLevel;

              return (
                <div
                  key={config.id}
                  className="flex items-center justify-between p-3 rounded-none border-4 border-stone-800 bg-white gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  {/* 좌측 정보 */}
                  <div className="text-left flex-1 min-w-0">
                    <h3 className="text-xs font-black text-black leading-none truncate">
                      {config.name}
                      <span className="text-[10px] font-bold text-stone-500 ml-1.5">Lv.{currentLvl}</span>
                    </h3>
                    <p className="text-[10px] font-bold text-stone-500 mt-1 leading-tight">{config.desc}</p>
                    <p className="text-[11px] font-black mt-1 text-cyan-800 font-mono tracking-tighter">
                      적용: +{currentValue.toFixed(1)}{config.unit}
                    </p>
                  </div>

                  {/* 우측 연구 버튼 */}
                  <button
                    type="button"
                    onClick={() => upgradeCoreAbility(config.id)}
                    disabled={!canAfford}
                    className={`px-3 py-2 rounded-none border-2 border-black font-black text-xs transition-all whitespace-nowrap leading-none uppercase tracking-wider ${
                      canAfford
                        ? 'bg-stone-100 hover:bg-stone-50 text-cyan-800 border-b-[4px] shadow-[1px_1px_0px_rgba(255,255,255,0.6)_inset] active:border-b-2 active:translate-y-[2px] cursor-pointer'
                        : 'bg-stone-300 border-stone-400 text-stone-400 opacity-40 shadow-none cursor-not-allowed'
                    }`}
                  >
                    {isMax ? 'MAX' : `+1 UP (${cost.toLocaleString()}개)`}
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
