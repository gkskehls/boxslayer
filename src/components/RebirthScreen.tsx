// src/components/RebirthScreen.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // 모달 상태 관리
  const [showRebirthModal, setShowRebirthModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showFloorWarningModal, setShowFloorWarningModal] = useState(false);
  const [rebirthResult, setRebirthResult] = useState<{ gainedRp: number } | null>(null);

  const potentialPoints = calculateReincarnationPoints(stage);
  const computed = getComputedStats(player.stats, unlockedSkills, activeBuffs, rebirthUpgrades);
  const totalSpentRP = calculateTotalSpentRP(rebirthUpgrades);

  const handleOpenRebirthModal = () => {
    if (potentialPoints <= 0) {
      setShowFloorWarningModal(true);
      return;
    }
    setShowRebirthModal(true);
  };

  const handleConfirmRebirth = () => {
    const gained = potentialPoints;
    reincarnate();
    setShowRebirthModal(false);
    setRebirthResult({ gainedRp: gained });
  };

  const handleOpenResetModal = () => {
    if (totalSpentRP <= 0) {
      return;
    }
    setShowResetModal(true);
  };

  const handleConfirmReset = () => {
    resetRebirthUpgrades();
    setShowResetModal(false);
  };

  const filteredConfigs = REBIRTH_UPGRADES_CONFIG.filter(cfg => cfg.category === activeCategory);

  return (
    <div
      className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-3 font-mono text-xs text-stone-900 select-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-grow relative"
      style={{
        backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* 최상단 타이틀 & RP 초기화 버튼 영역 */}
      <div className="flex justify-between items-center border-b-4 border-black pb-2 w-full">
        <div>
          <h2 className="text-sm font-black text-stone-500 tracking-widest uppercase leading-tight">
            -[ REBIRTH ]-
          </h2>
          <span className="text-[10px] font-bold text-stone-500">영구 성장 및 환생 성소</span>
        </div>
        <button
          type="button"
          onClick={handleOpenResetModal}
          disabled={totalSpentRP <= 0}
          title={totalSpentRP > 0 ? `투자된 ${formatNumber(totalSpentRP)} RP 100% 환급` : "투자된 RP 없음"}
          className={`px-2.5 py-1 rounded-none text-[10px] font-black tracking-wider transition-all break-keep border-2 ${
            totalSpentRP > 0
              ? 'bg-stone-200 border-red-600 hover:bg-red-50 text-red-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer'
              : 'bg-stone-200 border-stone-400 text-stone-400 opacity-40 shadow-none cursor-not-allowed'
          }`}
        >
          RP 초기화
        </button>
      </div>

      {/* 1. 상단 단일 환생 정보 & 실행 패널 */}
      <div className="bg-stone-200/90 p-3 rounded-none border-4 border-black w-full flex items-center justify-between gap-3 font-mono shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {/* 좌측: 메트릭 */}
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
          onClick={handleOpenRebirthModal}
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

      {/* 3. 업그레이드 항목 목록 */}
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

      {/* ================= 🌟 환생 확인 팝업 모달 (오프라인 보상 창 스타일) ================= */}
      <AnimatePresence>
        {showRebirthModal && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 font-mono select-none backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-stone-100 border-4 border-neutral-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 max-w-sm w-full text-stone-900 flex flex-col gap-3"
            >
              {/* 모달 상단 헤더 */}
              <div className="flex justify-between items-center pb-2 border-b-2 border-neutral-900">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm md:text-base font-black text-stone-900 tracking-wider">
                    🌟 환생 의식 (Rebirth)
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-neutral-900 text-yellow-300 px-2 py-0.5 border border-neutral-800">
                  STG.{stage} ➔ 1F
                </span>
              </div>

              {/* 획득 예정 환생 포인트 카드 */}
              <div className="bg-stone-200 border-2 border-stone-400 p-2.5 flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] text-stone-600 font-bold">획득 예정 환생 포인트</span>
                  <span className="text-purple-700 font-black text-base md:text-lg font-mono">
                    +{formatNumber(potentialPoints)} RP
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-stone-600 font-mono font-bold pt-1 border-t border-stone-300">
                  <span>현재 도달: STG.{stage}</span>
                  <span className="text-purple-900">환생 후 총 보유: {formatNumber(reincarnationPoints + potentialPoints)} RP</span>
                </div>
              </div>

              {/* 보존 vs 초기화 상세 내역 그리드 */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* 보존 항목 */}
                <div className="bg-emerald-50/90 border border-emerald-500 p-2 flex flex-col gap-1 text-left">
                  <span className="text-[10px] text-emerald-800 font-black flex items-center gap-1">
                    <span>🛡️</span> 영구 보존 항목
                  </span>
                  <ul className="text-[9px] text-emerald-900 font-bold space-y-0.5 pl-1 leading-tight">
                    <li>• 환생 포인트 및 영구 강화</li>
                    <li>• 코어 조각 및 연구 마스터리</li>
                    <li>• 박스 조각 및 PVP 대전 점수</li>
                  </ul>
                </div>

                {/* 초기화 항목 */}
                <div className="bg-rose-50/90 border border-rose-400 p-2 flex flex-col gap-1 text-left">
                  <span className="text-[10px] text-rose-800 font-black flex items-center gap-1">
                    <span>🔄</span> 회차 초기화 항목
                  </span>
                  <ul className="text-[9px] text-rose-900 font-bold space-y-0.5 pl-1 leading-tight">
                    <li>• 보유 골드 (0 G로 리셋)</li>
                    <li>• 현재 도달 층수 (1층 복귀)</li>
                    <li>• 레벨 및 기본 스탯 포인트</li>
                  </ul>
                </div>
              </div>

              {/* 안내 문구 박스 */}
              <div className="bg-stone-200/70 border border-stone-300 p-2 text-[10px] text-stone-600 leading-relaxed text-center">
                환생 시 획득한 <span className="font-bold text-purple-700">RP</span>로 영구 스탯을 강화하여 다음 회차를 훨씬 빠르고 강력하게 돌파할 수 있습니다.
              </div>

              {/* 하단 버튼 액션 */}
              <div className="flex gap-2 pt-1 border-t-2 border-neutral-900">
                <button
                  type="button"
                  onClick={() => setShowRebirthModal(false)}
                  className="flex-1 py-2 bg-stone-300 hover:bg-stone-400 border-2 border-neutral-900 text-stone-800 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRebirth}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer tracking-wider"
                >
                  환생 실행하기 ✨
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= 🎉 환생 완료 축하 모달 ================= */}
      <AnimatePresence>
        {rebirthResult && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 font-mono select-none backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-stone-100 border-4 border-neutral-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 max-w-sm w-full text-stone-900 flex flex-col gap-3 text-center"
            >
              <div className="flex justify-between items-center pb-2 border-b-2 border-neutral-900">
                <span className="text-sm md:text-base font-black text-stone-900 tracking-wider">
                  🎉 환생 완료!
                </span>
                <span className="text-[10px] font-bold bg-purple-700 text-yellow-300 px-2 py-0.5 border border-neutral-800">
                  성공
                </span>
              </div>

              <div className="bg-purple-50 border-2 border-purple-400 p-3 flex flex-col items-center justify-center gap-1">
                <span className="text-xs font-bold text-stone-600">획득한 환생 포인트</span>
                <span className="text-purple-700 font-black text-xl font-mono">
                  +{formatNumber(rebirthResult.gainedRp)} RP
                </span>
                <span className="text-[10px] text-purple-900 font-bold">
                  총 보유 RP: {formatNumber(reincarnationPoints)} RP
                </span>
              </div>

              <p className="text-[11px] text-stone-700 font-bold leading-relaxed">
                새로운 1층 여정이 시작되었습니다!<br />
                강화된 스탯으로 더 높은 층수에 도전해보세요.
              </p>

              <div className="pt-1 border-t-2 border-neutral-900">
                <button
                  type="button"
                  onClick={() => setRebirthResult(null)}
                  className="w-full py-2 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-black text-xs border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer tracking-wider"
                >
                  성소 확인하기 🚀
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= ⚠️ 5층 미만 층수 부족 안내 모달 ================= */}
      <AnimatePresence>
        {showFloorWarningModal && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 font-mono select-none backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-stone-100 border-4 border-neutral-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 max-w-sm w-full text-stone-900 flex flex-col gap-3 text-center"
            >
              <div className="flex justify-between items-center pb-2 border-b-2 border-neutral-900">
                <span className="text-sm md:text-base font-black text-stone-900 tracking-wider">
                  ⚠️ 환생 조건 안내
                </span>
                <span className="text-[10px] font-bold bg-neutral-900 text-red-400 px-2 py-0.5 border border-neutral-800">
                  STG.{stage} / 5F
                </span>
              </div>

              <div className="bg-stone-200 border-2 border-stone-400 p-3 text-xs leading-relaxed text-stone-700">
                환생 포인트를 획득하려면 <span className="font-black text-red-600">최소 5층 이상</span> 도달해야 합니다.
                <div className="mt-1 text-[10px] text-stone-500 font-bold">
                  (현재 층수: STG.{stage})
                </div>
              </div>

              <div className="pt-1 border-t-2 border-neutral-900">
                <button
                  type="button"
                  onClick={() => setShowFloorWarningModal(false)}
                  className="w-full py-2 bg-stone-300 hover:bg-stone-400 text-stone-800 font-bold text-xs border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= 🔄 RP 초기화 확인 모달 ================= */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 font-mono select-none backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-stone-100 border-4 border-neutral-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 max-w-sm w-full text-stone-900 flex flex-col gap-3"
            >
              <div className="flex justify-between items-center pb-2 border-b-2 border-neutral-900">
                <span className="text-sm md:text-base font-black text-stone-900 tracking-wider">
                  🔄 RP 환급 초기화
                </span>
                <span className="text-[10px] font-bold bg-neutral-900 text-yellow-300 px-2 py-0.5 border border-neutral-800">
                  100% 환급
                </span>
              </div>

              <div className="bg-stone-200 border-2 border-stone-400 p-3 flex flex-col items-center justify-center gap-1 text-center">
                <span className="text-[11px] text-stone-600 font-bold">환급 예정 환생 포인트</span>
                <span className="text-purple-700 font-black text-lg font-mono">
                  +{formatNumber(totalSpentRP)} RP
                </span>
              </div>

              <div className="bg-rose-50 border border-rose-300 p-2 text-[10px] text-rose-800 leading-relaxed">
                모든 환생 스탯 및 유틸리티 강화 레벨이 0으로 초기화되며, 투자되었던 <span className="font-bold">{formatNumber(totalSpentRP)} RP</span>가 전액 환급됩니다.
              </div>

              <div className="flex gap-2 pt-1 border-t-2 border-neutral-900">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2 bg-stone-300 hover:bg-stone-400 border-2 border-neutral-900 text-stone-800 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer tracking-wider"
                >
                  초기화 실행
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RebirthScreen;

