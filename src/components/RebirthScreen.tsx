// src/components/RebirthScreen.tsx

import React, { useState } from 'react';
import { useGameStore, calculateReincarnationPoints, getComputedStats } from '../store/gameStore';
import { formatNumber } from '../utils/format';
import { REBIRTH_UPGRADES_CONFIG, calculateRebirthUpgradeCost, calculateTotalSpentRP } from '../data/rebirthConfig';

const RebirthScreen: React.FC = () => {
  const {
    stage,
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
    if (window.confirm(`정말로 환생하시겠습니까?\n\n[보존되는 재화]\n• 🌟 환생 포인트(RP) 및 환생 스탯/유틸 레벨\n• 💎 코어 조각 및 코어 연구 레벨\n• 📦 박스 조각\n\n[초기화되는 항목]\n• 🪙 골드 및 현재 층수(1층 복귀)\n• 레벨, 경험치, 기본 스탯 포인트\n\n획득 예정: +${formatNumber(potentialPoints)} RP`)) {
      reincarnate();
    }
  };

  const handleResetRebirth = () => {
    if (totalSpentRP <= 0) {
      alert("투자된 환생 포인트가 없습니다.");
      return;
    }
    if (window.confirm(`환생 스탯 및 유틸리티 강화에 투자된 환생 포인트를 초기화하시겠습니까?\n\n투자된 모든 포인트 (🌟 ${formatNumber(totalSpentRP)} RP)가 100% 전액 환급됩니다.`)) {
      resetRebirthUpgrades();
    }
  };

  const filteredConfigs = REBIRTH_UPGRADES_CONFIG.filter(cfg => cfg.category === activeCategory);

  return (
    <div
      className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-4 text-stone-900 font-mono select-none flex-grow"
      style={{
        backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* 1. 상단 환생 실행 배너 */}
      <div className="bg-stone-200 p-3 rounded-none border-4 border-black w-full flex flex-col gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest block">REBIRTH_SANCTUARY</span>
            <span className="text-xs font-black text-black">현재 최고 도달: STG.{stage}</span>
          </div>
          <div className="text-right flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest block">보유 환생 포인트</span>
              <span className="text-sm font-black text-purple-700">🌟 {formatNumber(reincarnationPoints)} RP</span>
            </div>
            {totalSpentRP > 0 && (
              <button
                type="button"
                onClick={handleResetRebirth}
                title={`투자된 ${formatNumber(totalSpentRP)} RP 100% 환급`}
                className="bg-stone-100 hover:bg-red-50 text-red-600 border-2 border-red-600 px-2 py-1 text-[10px] font-black tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer leading-tight whitespace-nowrap"
              >
                🔄 RP 초기화
              </button>
            )}
          </div>
        </div>

        {/* 환생 실행 버튼 */}
        <div className="flex gap-2 items-center pt-1 border-t-2 border-stone-300">
          <div className="flex-1 text-left">
            <span className="text-[11px] font-bold text-stone-600 block leading-tight">환생 시 획득 가능:</span>
            <span className="text-xs font-black text-purple-600">+{formatNumber(potentialPoints)} RP</span>
          </div>
          <button
            onClick={handleReincarnate}
            disabled={potentialPoints <= 0}
            className={`px-4 py-2 text-xs font-black rounded-none border-2 border-black transition-all font-mono tracking-widest uppercase cursor-pointer ${
              potentialPoints > 0
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                : 'bg-stone-300 text-stone-500 cursor-not-allowed border-stone-400'
            }`}
          >
            환생 실행 (REBIRTH)
          </button>
        </div>
      </div>

      {/* 2. 환생 스탯 강화 카테고리 탭 (기본 스탯 / 유틸리티) & 구매 배수 선택 */}
      <div className="flex justify-between items-center gap-1">
        <div className="flex gap-1 flex-1">
          {(['STAT', 'UTILITY'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 py-1.5 text-[11px] font-black border-2 border-black transition-all cursor-pointer uppercase ${
                activeCategory === cat
                  ? 'bg-amber-300 text-black shadow-none translate-x-[1px] translate-y-[1px]'
                  : 'bg-stone-200 text-stone-700 hover:bg-stone-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
              }`}
            >
              {cat === 'STAT' ? '스탯 강화 (STR/DEX/CON)' : '유틸리티'}
            </button>
          ))}
        </div>

        {/* 구매 단위 선택 (+1 / +10 / +100) */}
        <div className="flex gap-0.5 bg-stone-300 p-0.5 border-2 border-black">
          {([1, 10, 100] as const).map(mult => (
            <button
              key={mult}
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
      <div className="bg-stone-200/90 p-2.5 rounded-none border-2 border-black grid grid-cols-3 gap-2 text-center text-xs font-mono shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <div className="bg-white/80 p-1 border border-black/30">
          <span className="text-[10px] text-stone-500 font-bold block">공격력 (ATK)</span>
          <span className="text-red-700 font-black text-xs">{formatNumber(computed.attack)}</span>
        </div>
        <div className="bg-white/80 p-1 border border-black/30">
          <span className="text-[10px] text-stone-500 font-bold block">방어력 (DEF)</span>
          <span className="text-blue-700 font-black text-xs">{formatNumber(computed.defense)}</span>
        </div>
        <div className="bg-white/80 p-1 border border-black/30">
          <span className="text-[10px] text-stone-500 font-bold block">최대체력 (HP)</span>
          <span className="text-green-700 font-black text-xs">{formatNumber(computed.maxHealth)}</span>
        </div>
      </div>

      {/* 3. 업그레이드 항목 목록 (스탯창 형태의 무한 성장 보드) */}
      <div className="flex flex-col gap-2">
        {filteredConfigs.map(config => {
          const currentLevel = rebirthUpgrades ? (rebirthUpgrades[config.id] || 0) : 0;
          const cost = calculateRebirthUpgradeCost(config, currentLevel, purchaseMultiplier);
          const isMax = config.maxLevel !== undefined && currentLevel >= config.maxLevel;
          const canAfford = reincarnationPoints >= cost && !isMax;
          const currentValue = currentLevel * config.valuePerLevel;

          return (
            <div
              key={config.id}
              className="bg-stone-50 p-2.5 rounded-none border-2 border-black flex justify-between items-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              {/* 좌측 정보 */}
              <div className="flex items-start gap-2 max-w-[65%]">
                <span className="text-xl p-1 bg-stone-200 border border-black">{config.icon}</span>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-black">{config.name}</span>
                    <span className="text-[10px] font-bold text-stone-500">Lv.{currentLevel}</span>
                  </div>
                  <span className="text-[10px] text-stone-600 leading-tight mt-0.5">{config.desc}</span>
                  <span className="text-[10px] font-black text-blue-700 mt-0.5">
                    현재 적용: +{config.isPercent ? `${currentValue.toFixed(1)}%` : formatNumber(currentValue)}
                  </span>
                </div>
              </div>

              {/* 우측 강화 버튼 */}
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() => upgradeRebirthStat(config.id, purchaseMultiplier)}
                  disabled={!canAfford}
                  className={`px-3 py-1.5 rounded-none border-2 border-black text-xs font-black transition-all flex flex-col items-center justify-center min-w-[75px] cursor-pointer ${
                    canAfford
                      ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                      : 'bg-stone-300 text-stone-400 border-stone-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isMax ? (
                    <span>MAX</span>
                  ) : (
                    <>
                      <span>+{purchaseMultiplier} UP</span>
                      <span className="text-[9px] font-bold text-stone-900 leading-none">
                        🌟 {formatNumber(cost)}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. 하단 요약 인포 바 */}
      <div className="bg-stone-200 p-2 border-2 border-black flex justify-between items-center text-[10px] font-bold text-stone-700">
        <span>최종 공격력: <b className="text-red-700">{formatNumber(computed.attack)}</b></span>
        <span>최종 방어력: <b className="text-blue-700">{formatNumber(computed.defense)}</b></span>
        <span>최대 체력: <b className="text-green-700">{formatNumber(computed.maxHealth)}</b></span>
      </div>
    </div>
  );
};

export default RebirthScreen;
