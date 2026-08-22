// src/components/DungeonScreen.tsx

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { DUNGEON_LIST, getAvailableDungeonsToday, isWeekendAllOpen } from '../data/dungeonConfig';
import type { DungeonType, DungeonRewardResult } from '../types/dungeon';
import { DungeonBattleScreen } from './DungeonBattleScreen';
import { formatNumber } from '../utils/format';
import { Sparkles, Ticket, PlusCircle, ChevronRight, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const DungeonScreen: React.FC = () => {
  const {
    dungeonState,
    checkAndRefillDungeonTickets,
    purchaseDungeonTicket,
    sweepDungeonFloor,
  } = useGameStore();

  // 진입 시 매일 티켓 자동 완충 확인
  useEffect(() => {
    checkAndRefillDungeonTickets();
  }, [checkAndRefillDungeonTickets]);

  const [selectedDungeon, setSelectedDungeon] = useState<DungeonType | null>(null);
  const [activeBattle, setActiveBattle] = useState<{ type: DungeonType; floor: number } | null>(null);
  const [sweepRewardModal, setSweepRewardModal] = useState<{ rewards: DungeonRewardResult; floor: number; type: DungeonType } | null>(null);
  const [rechargeToast, setRechargeToast] = useState<string | null>(null);

  const availableDungeonIds = getAvailableDungeonsToday();
  const isWeekend = isWeekendAllOpen();

  const handleRechargeTickets = () => {
    purchaseDungeonTicket();
    setRechargeToast('🎟️ 차원 티켓 +3장 충전 완료! (테스트 무료 무제한)');
    setTimeout(() => {
      setRechargeToast(null);
    }, 2200);
  };

  // 활성 전투 화면이 실행 중일 때
  if (activeBattle) {
    return (
      <DungeonBattleScreen
        dungeonType={activeBattle.type}
        floor={activeBattle.floor}
        onExit={() => setActiveBattle(null)}
      />
    );
  }

  const currentDungeonConfig = selectedDungeon ? DUNGEON_LIST.find((d) => d.id === selectedDungeon) : null;
  const currentProgress = selectedDungeon ? dungeonState.progress[selectedDungeon] || { maxClearedFloor: 0, floors: {} } : null;

  // 다음 도전 가능 층수
  const nextChallengingFloor = currentProgress ? currentProgress.maxClearedFloor + 1 : 1;

  const handleStartBattle = (floor: number) => {
    if (dungeonState.tickets <= 0) {
      alert('남은 차원 티켓이 없습니다! 상단의 [충전] 버튼을 눌러 무료로 충전하세요.');
      return;
    }
    if (!selectedDungeon) return;
    setActiveBattle({ type: selectedDungeon, floor });
  };

  const handleSweep = (floor: number) => {
    if (!selectedDungeon) return;
    if (dungeonState.tickets <= 0) {
      alert('남은 차원 티켓이 없습니다! 상단의 [충전] 버튼을 눌러 무료로 충전하세요.');
      return;
    }
    const reward = sweepDungeonFloor(selectedDungeon, floor);
    if (reward) {
      setSweepRewardModal({ rewards: reward, floor, type: selectedDungeon });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-3 bg-stone-200 border-4 border-black flex flex-col gap-2.5 select-none text-black font-mono shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
      {/* 무료 충전 완료 알림 토스트 팝업 */}
      <AnimatePresence>
        {rechargeToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-neutral-950 text-amber-300 px-3.5 py-1.5 border-2 border-amber-400 font-mono font-black text-xs shadow-[0_0_15px_rgba(251,191,36,0.8)] pointer-events-none whitespace-nowrap flex items-center gap-1.5"
          >
            <span>{rechargeToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. 상단 타이틀 & 티켓 충전 현황 바 */}
      <div className="bg-stone-100 p-2.5 border-4 border-black flex justify-between items-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h2 className="text-xs sm:text-sm font-black tracking-wider text-neutral-800 flex items-center gap-1.5">
            <span>🌀</span>
            <span>차원의 균열</span>
            <span className="text-[9px] text-amber-700 font-bold bg-amber-100 px-1 border border-amber-300">
              요일 던전
            </span>
          </h2>
          <p className="text-[9px] text-neutral-500 font-bold mt-0.5">
            {isWeekend ? '🌟 주말 특권: 5대 차원 전체 개방!' : '요일별 특화 재화 파밍 (환생 시 100% 영구 보존)'}
          </p>
        </div>

        {/* 티켓 충전 버튼 및 잔여량 */}
        <div className="flex items-center gap-1.5 bg-stone-200 p-1 border-2 border-black">
          <div className="flex items-center gap-1 text-xs font-black">
            <Ticket className="w-3.5 h-3.5 text-amber-600" />
            <span className={dungeonState.tickets > 0 ? 'text-amber-700 font-black' : 'text-red-600 font-black'}>
              {dungeonState.tickets}
            </span>
            <span className="text-[9px] text-neutral-500">장</span>
          </div>

          <button
            onClick={handleRechargeTickets}
            title="테스트용: 무료 무제한 티켓 충전 (+3장)"
            className="px-2 py-0.5 bg-yellow-400 hover:bg-yellow-300 text-[10px] font-black border border-black active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
          >
            <PlusCircle className="w-3 h-3" />
            <span>무료충전</span>
          </button>
        </div>
      </div>

      {/* 2. 메인 컨텐츠: 던전 진입 뷰 (초간결 상단 배치 UI) or 5대 요일 던전 선택 목록 */}
      {selectedDungeon && currentDungeonConfig && currentProgress ? (
        <div className="flex flex-col gap-2.5">
          {/* 일체형 콤팩트 던전 헤더 & 최고 단계 정보 */}
          <div
            className="p-2.5 border-4 border-black flex flex-col gap-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            style={{ backgroundColor: currentDungeonConfig.accentColor }}
          >
            <div className="flex justify-between items-center">
              <button
                onClick={() => setSelectedDungeon(null)}
                className="px-2 py-0.5 bg-stone-100 hover:bg-white text-[10px] font-black border-2 border-black active:translate-x-0.5 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              >
                ← 목록으로
              </button>

              <div className="flex items-center gap-1.5">
                <span className="text-base">{currentDungeonConfig.icon}</span>
                <span className="text-xs font-black text-black">
                  {currentDungeonConfig.name}
                </span>
              </div>

              <div className="bg-black text-amber-300 text-[10px] font-black px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                최고: {currentProgress.maxClearedFloor > 0 ? `${currentProgress.maxClearedFloor}단계` : '미클리어'}
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-bold text-neutral-900/90 pt-1 border-t border-black/20">
              <span>보상: {currentDungeonConfig.rewardIcon} {currentDungeonConfig.rewardName} 특화</span>
              <span>추천 코어: {currentDungeonConfig.recommendedCore}</span>
            </div>
          </div>

          {/* 던전 공략 팁 (1줄 콤팩트) */}
          <div className="bg-amber-50 px-2 py-1.5 border-2 border-amber-400 text-amber-950 text-[10px] font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="truncate">{currentDungeonConfig.gimmickText}</span>
          </div>

          {/* [핵심 UI 1] 신규 도전 (Next Challenge) 카드 - 상단 집중 배치 */}
          <div className="bg-amber-100 p-2.5 border-4 border-amber-600 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ring-2 ring-amber-400 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-amber-950">⚔️ 신규 단계 도전</span>
                <span className="bg-amber-400 text-black text-[11px] font-black px-1.5 py-0.2 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  제 {nextChallengingFloor} 단계
                </span>
              </div>
              <span className="text-[10px] font-black text-amber-800">⏱️ 30초 타임어택</span>
            </div>

            <button
              onClick={() => handleStartBattle(nextChallengingFloor)}
              disabled={dungeonState.tickets <= 0}
              className={`w-full py-2.5 text-xs font-black border-3 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1 uppercase ${
                dungeonState.tickets > 0
                  ? 'bg-amber-400 hover:bg-amber-300 text-black'
                  : 'bg-stone-300 text-stone-500 opacity-50 cursor-not-allowed'
              }`}
            >
              <span>⚔️ {nextChallengingFloor}단계 입장하기</span>
              <span className="text-[9px] font-bold text-neutral-800">(티켓 1장)</span>
            </button>
          </div>

          {/* [핵심 UI 2] 이전 단계 소탕 / 재도전 카드 */}
          <div className="bg-stone-100 p-2.5 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-neutral-800">⚡ 이전 단계 소탕</span>
                {currentProgress.maxClearedFloor > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-1.5 py-0.2 border border-blue-400">
                    {currentProgress.maxClearedFloor}단계
                  </span>
                )}
              </div>
              <span className="text-[9px] text-stone-500 font-bold">1초 즉시 보상 획득</span>
            </div>

            {currentProgress.maxClearedFloor > 0 ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleSweep(currentProgress.maxClearedFloor)}
                  disabled={dungeonState.tickets <= 0}
                  className={`flex-1 py-2 text-xs font-black border-2 border-black active:translate-x-0.5 active:translate-y-0.5 cursor-pointer uppercase ${
                    dungeonState.tickets > 0
                      ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-stone-300 text-stone-500 opacity-50 cursor-not-allowed'
                  }`}
                >
                  ⚡ {currentProgress.maxClearedFloor}단계 즉시 소탕
                </button>

                <button
                  onClick={() => handleStartBattle(currentProgress.maxClearedFloor)}
                  disabled={dungeonState.tickets <= 0}
                  className={`px-3 py-2 text-xs font-black border-2 border-black active:translate-x-0.5 cursor-pointer uppercase ${
                    dungeonState.tickets > 0
                      ? 'bg-stone-200 hover:bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-stone-300 text-stone-500 opacity-50 cursor-not-allowed'
                  }`}
                >
                  재도전
                </button>
              </div>
            ) : (
              <div className="text-center py-1.5 text-[10px] text-stone-500 font-bold bg-stone-200/70 border border-dashed border-stone-400">
                💡 아직 클리어한 단계가 없습니다. 먼저 [신규 단계]에 도전하세요!
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 3. 5대 요일 던전 선택 목록 로비 */
        <div className="flex flex-col gap-2.5">
          {DUNGEON_LIST.map((dungeon) => {
            const isOpenToday = availableDungeonIds.includes(dungeon.id);
            const progress = dungeonState.progress[dungeon.id] || { maxClearedFloor: 0, floors: {} };
            const maxCleared = progress.maxClearedFloor;

            return (
              <div
                key={dungeon.id}
                onClick={() => {
                  if (!isOpenToday) {
                    alert(`이 던전은 ${dungeon.dayName} 및 주말(토/일)에만 개방됩니다.`);
                    return;
                  }
                  setSelectedDungeon(dungeon.id);
                }}
                className={`p-3 border-4 border-black flex justify-between items-center transition-all cursor-pointer ${
                  isOpenToday
                    ? 'bg-stone-100 hover:bg-amber-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5'
                    : 'bg-stone-300/70 opacity-60 text-stone-500'
                }`}
              >
                {/* 던전 테마 및 정보 */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 border-2 border-black flex items-center justify-center text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    style={{ backgroundColor: isOpenToday ? dungeon.accentColor : '#9CA3AF' }}
                  >
                    {dungeon.icon}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-black">
                        {dungeon.name}
                      </span>
                      <span className={`text-[9px] px-1 font-black border ${dungeon.badgeBg}`}>
                        {dungeon.dayName}
                      </span>
                    </div>

                    <div className="text-[10px] text-neutral-600 font-bold mt-0.5">
                      {dungeon.subTitle} • {dungeon.rewardIcon} {dungeon.rewardName}
                    </div>

                    <div className="text-[9px] text-amber-700 font-bold">
                      최고 돌파: {maxCleared > 0 ? `${maxCleared}단계` : '미도전'}
                    </div>
                  </div>
                </div>

                {/* 진입 화살표 또는 잠금 상태 */}
                <div>
                  {isOpenToday ? (
                    <div className="flex items-center gap-1 text-xs font-black text-neutral-700 bg-stone-200 px-2 py-1 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <span>입장</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-bold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>{dungeon.dayName} 오픈</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. 환생 영구 보존 안내 배너 */}
      <div className="bg-stone-300 p-2.5 border-2 border-black flex items-center justify-between text-[10px] font-bold text-stone-700">
        <span>🔒 환생(Rebirth) 시 요일 던전 최고 단계 및 소탕 권한 100% 영구 보존!</span>
      </div>

      {/* 5. 소탕 완료 결과 모달 */}
      {sweepRewardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-stone-200 border-4 border-black p-4 flex flex-col gap-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black"
          >
            <div className="bg-blue-500 text-white border-4 border-black py-2 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-base font-black tracking-widest">
                ⚡ {sweepRewardModal.floor}단계 소탕 완료!
              </h2>
              <div className="text-[11px] font-bold text-blue-100">
                1초 만에 즉시 보상을 획득했습니다.
              </div>
            </div>

            {/* 획득 보상 목록 */}
            <div className="bg-stone-100 p-3 border-4 border-black flex flex-col gap-1.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
              <div className="text-xs font-black text-neutral-600 mb-1">🎁 획득한 보상:</div>
              {sweepRewardModal.rewards.gold ? (
                <div className="flex justify-between text-xs font-bold text-yellow-700">
                  <span>🪙 골드</span>
                  <span>+{formatNumber(sweepRewardModal.rewards.gold)} G</span>
                </div>
              ) : null}
              {sweepRewardModal.rewards.exp ? (
                <div className="flex justify-between text-xs font-bold text-blue-700">
                  <span>🧪 경험치</span>
                  <span>+{formatNumber(sweepRewardModal.rewards.exp)} EXP</span>
                </div>
              ) : null}
              {sweepRewardModal.rewards.coreFragments ? (
                <div className="flex justify-between text-xs font-bold text-purple-700">
                  <span>💎 코어 조각</span>
                  <span>+{sweepRewardModal.rewards.coreFragments}개</span>
                </div>
              ) : null}
              {sweepRewardModal.rewards.boxFragments ? (
                <div className="flex justify-between text-xs font-bold text-emerald-700">
                  <span>📦 박스 조각</span>
                  <span>+{sweepRewardModal.rewards.boxFragments}개</span>
                </div>
              ) : null}
              {sweepRewardModal.rewards.rp ? (
                <div className="flex justify-between text-xs font-bold text-rose-700">
                  <span>🌟 환생 포인트</span>
                  <span>+{sweepRewardModal.rewards.rp} RP</span>
                </div>
              ) : null}
            </div>

            <button
              onClick={() => setSweepRewardModal(null)}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer uppercase"
            >
              확인
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
