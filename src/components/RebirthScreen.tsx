// src/components/RebirthScreen.tsx

import React, { useState } from 'react';
import { useGameStore, calculateReincarnationPoints, getComputedStats } from '../store/gameStore';
import { formatNumber } from '../utils/format';
import { REBIRTH_UPGRADES_CONFIG, calculateRebirthUpgradeCost, calculateTotalSpentRP } from '../data/rebirthConfig';

const RebirthScreen: React.FC = () => {
  const {
    stage,
    maxStage,
    allTimeMaxStage,
    reincarnationPoints,
    rebirthUpgrades,
    upgradeRebirthStat,
    resetRebirthUpgrades,
    reincarnate,
    player,
    unlockedSkills,
    activeBuffs,
  } = useGameStore();

  const [activeCategory, setActiveCategory] = useState<'STAT' | 'UTILITY'>('STAT');
  const [purchaseMultiplier, setPurchaseMultiplier] = useState<1 | 10 | 100>(1);

  const potentialPoints = calculateReincarnationPoints(stage);
  const computed = getComputedStats(player.stats, unlockedSkills, activeBuffs, rebirthUpgrades);
  const totalSpentRP = calculateTotalSpentRP(rebirthUpgrades);

  const handleReincarnate = () => {
    if (potentialPoints <= 0) {
      alert("환생 포인트를 획득하려면 최소 5층 이상 도달해야 합니다.");
      return;
    }
    if (window.confirm(`정말로 환생하시겠습니까?\n\n[보존되는 재화]\n• 환생 포인트(RP) 및 환생 스탯/유틸 레벨\n• 코어 조각 및 코어 연구 레벨\n• 박스 조각\n\n[초기화되는 항목]\n• 골드 및 현재 층수(1층 복귀)\n• 레벨, 경험치, 기본 스탯 포인트\n\n획득 예정: +${formatNumber(potentialPoints)} RP`)) {
      reincarnate();
    }
  };

  const handleResetRebirth = () => {
    if (totalSpentRP <= 0) {
      alert("투자된 환생 포인트가 없습니다.");
      return;
    }
    if (window.confirm(`환생 스탯 및 유틸리티 강화에 투자된 환생 포인트를 초기화하시겠습니까?\n\n투자된 모든 포인트 (${formatNumber(totalSpentRP)} RP)가 100% 전액 환급됩니다.`)) {
      resetRebirthUpgrades();
    }
  };

  const filteredConfigs = REBIRTH_UPGRADES_CONFIG.filter(cfg => cfg.category === activeCategory);

  return (
    <div
      className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-3 font-mono text-xs text-stone-900 select-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-grow"
      style={{
        backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* 최상단 타이틀 & RP 초기화 버튼 영역 (스탯창과 동일한 구조) */}
      <div className="flex justify-between items-center border-b-4 border-black pb-2 w-full">
        <div>
          <h2 className="text-sm font-black text-stone-500 tracking-widest uppercase leading-tight">
            -[ REBIRTH ]-
          </h2>
          <span className="text-[10px] font-bold text-stone-500">영구 성장 및 환생 성소</span>
        </div>
        <button
          type="button"
          onClick={handleResetRebirth}
          title={totalSpentRP > 0 ? `투자된 ${formatNumber(totalSpentRP)} RP 100% 환급` : "환생 포인트 초기화"}
          className="bg-stone-200 border-2 border-red-600 hover:bg-red-50 text-red-600 px-2.5 py-1 rounded-none text-[10px] font-black tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer break-keep"
        >
          RP 초기화
        </button>
      </div>

      {/* 1. 상단 단일 환생 정보 & 실행 패널 (타이틀 상단 / 내용 하단 2줄 정렬 + 우측 환생 버튼) */}
      <div className="bg-stone-200/90 p-3 rounded-none border-4 border-black w-full flex items-center justify-between gap-3 font-mono shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {/* 좌측: 타이틀(상단) + 내용(하단) 2줄로 간략 정렬된 메트릭 */}
        <div className="grid grid-cols-3 gap-2 flex-1 min-w-0">
          <div>
            <span className="text-[10px] font-bold text-stone-500 block leading-tight">최고 기록</span>
            <span className="text-xs font-black text-stone-900 truncate block mt-0.5">STG.{allTimeMaxStage || maxStage || stage}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-stone-500 block leading-tight">보유 RP</span>
            <span className="text-xs font-black text-purple-700 truncate block mt-0.5">{formatNumber(reincarnationPoints)}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-stone-500 block leading-tight">획득 RP</span>
            <span className="text-xs font-black text-purple-700 truncate block mt-0.5">+{formatNumber(potentialPoints)}</span>
          </div>
        </div>

        {/* 우측: 환생 실행 버튼 */}
        <button
          type="button"
          onClick={handleReincarnate}
          disabled={potentialPoints <= 0}
          className={`px-3.5 py-2.5 rounded-none border-2 border-black font-black text-xs transition-all whitespace-nowrap leading-none tracking-wider shrink-0 ${
            potentialPoints > 0
              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer'
              : 'bg-stone-300 border-stone-400 text-stone-400 opacity-40 shadow-none cursor-not-allowed'
          }`}
        >
          환생
        </button>
      </div>

      {/* 2. 환생 스탯 강화 카테고리 탭 & 구매 배수 선택 */}
      <div className="flex justify-between items-center gap-1">
        <div className="flex gap-1 flex-1">
          {(['STAT', 'UTILITY'] as const).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 py-1.5 text-[11px] font-black border-2 border-black transition-all cursor-pointer uppercase ${
                activeCategory === cat
                  ? 'bg-amber-300 text-black shadow-none translate-x-[1px] translate-y-[1px]'
                  : 'bg-stone-200 text-stone-700 hover:bg-stone-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
              }`}
            >
              {cat === 'STAT' ? '스탯 강화' : '유틸리티'}
            </button>
          ))}
        </div>

        {/* 구매 단위 선택 (+1 / +10 / +100) */}
        <div className="flex gap-0.5 bg-stone-300 p-0.5 border-2 border-black">
          {([1, 10, 100] as const).map(mult => (
            <button
              key={mult}
              type="button"
              onClick={() => setPurchaseMultiplier(mult)}
              className={`px-1.5 py-0.5 text-[10px] font-black border border-black transition-all cursor-pointer ${
                purchaseMultiplier === mult
                  ? 'bg-black text-yellow-300'
                  : 'bg-stone-100 text-stone-700 hover:bg-white'
              }`}
            >
              +{mult}
            </button>
          ))}
        </div>
      </div>

      {/* 실시간 적용 스탯 미니 모니터 */}
      <div className="bg-stone-200 p-2.5 rounded-none border-4 border-black grid grid-cols-3 gap-2 text-center text-xs font-mono shadow-[inset_2px_2px_0px_rgba(0,0,0,0.05)]">
        <div className="bg-white p-1.5 border-2 border-stone-400">
          <span className="text-[10px] text-stone-500 font-bold block">공격력 (ATK)</span>
          <span className="text-red-700 font-black text-xs">{formatNumber(computed.attack)}</span>
        </div>
        <div className="bg-white p-1.5 border-2 border-stone-400">
          <span className="text-[10px] text-stone-500 font-bold block">방어력 (DEF)</span>
          <span className="text-blue-700 font-black text-xs">{formatNumber(computed.defense)}</span>
        </div>
        <div className="bg-white p-1.5 border-2 border-stone-400">
          <span className="text-[10px] text-stone-500 font-bold block">최대체력 (HP)</span>
          <span className="text-green-700 font-black text-xs">{formatNumber(computed.maxHealth)}</span>
        </div>
      </div>

      {/* 3. 업그레이드 항목 목록 (상점 및 스탯창과 일치된 카드 스타일) */}
      <div className="flex flex-col gap-3 w-full">
        {filteredConfigs.map(config => {
          const currentLevel = rebirthUpgrades ? (rebirthUpgrades[config.id] || 0) : 0;
          const cost = calculateRebirthUpgradeCost(config, currentLevel, purchaseMultiplier);
          const isMax = config.maxLevel !== undefined && currentLevel >= config.maxLevel;
          const canAfford = reincarnationPoints >= cost && !isMax;
          const currentValue = currentLevel * config.valuePerLevel;

          return (
            <div
              key={config.id}
              className="flex items-center justify-between p-3 rounded-none border-4 border-stone-800 bg-white gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              {/* 좌측 정보 */}
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm shrink-0">{config.icon}</span>
                  <h3 className="text-xs font-black text-black leading-none truncate">
                    {config.name}
                    <span className="text-[10px] font-bold text-stone-500 ml-1.5">Lv.{currentLevel}</span>
                  </h3>
                </div>
                <p className="text-[10px] font-bold text-stone-500 mt-1 leading-tight">{config.desc}</p>
                <p className="text-[11px] font-black mt-1 text-purple-700 font-mono tracking-tighter">
                  적용: +{config.isPercent ? `${currentValue.toFixed(1)}%` : formatNumber(currentValue)}
                </p>
              </div>

              {/* 우측 강화 버튼 */}
              <button
                type="button"
                onClick={() => upgradeRebirthStat(config.id, purchaseMultiplier)}
                disabled={!canAfford}
                className={`px-3 py-2 rounded-none border-2 border-black font-black text-xs transition-all whitespace-nowrap leading-none uppercase tracking-wider ${
                  canAfford
                    ? 'bg-stone-100 hover:bg-stone-50 text-purple-700 border-b-[4px] shadow-[1px_1px_0px_rgba(255,255,255,0.6)_inset] active:border-b-2 active:translate-y-[2px] cursor-pointer'
                    : 'bg-stone-300 border-stone-400 text-stone-400 opacity-40 shadow-none cursor-not-allowed'
                }`}
              >
                {isMax ? 'MAX' : `+${purchaseMultiplier} UP (${cost.toLocaleString()} RP)`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RebirthScreen;
