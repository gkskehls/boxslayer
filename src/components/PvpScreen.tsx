// src/components/PvpScreen.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, getComputedStats, calculateCombatPower } from '../store/gameStore';
import { MOCK_PVP_OPPONENTS } from '../data/pvpOpponents';
import type { PvpOpponent } from '../types/pvp';
import type { CoreType, RebirthUpgrades } from '../types/game';
import { formatNumber } from '../utils/format';

interface DamagePopup {
  id: string;
  val: number;
  type: 'player-normal' | 'player-core' | 'player-combo' | 'enemy-normal' | 'enemy-core' | 'enemy-combo' | 'evade' | 'shield';
  text?: string;
}

interface BattleLogEntry {
  id: string;
  turn: number;
  text: string;
  type: 'player' | 'enemy' | 'system' | 'special';
}

const getCoreBadge = (type?: CoreType | null) => {
  switch (type) {
    case 'FIRE': return { label: '불', icon: '🔥', bg: 'bg-red-500', text: 'text-red-100', border: 'border-red-800' };
    case 'WATER': return { label: '물', icon: '💧', bg: 'bg-blue-500', text: 'text-blue-100', border: 'border-blue-800' };
    case 'WIND': return { label: '바람', icon: '🌪️', bg: 'bg-emerald-500', text: 'text-emerald-100', border: 'border-emerald-800' };
    case 'ELECTRIC': return { label: '번개', icon: '⚡', bg: 'bg-amber-400', text: 'text-stone-900', border: 'border-amber-700' };
    default: return { label: '무속성', icon: '⚪', bg: 'bg-stone-400', text: 'text-stone-900', border: 'border-stone-600' };
  }
};

export const PvpScreen: React.FC = () => {
  const {
    playerName,
    setPlayerName,
    pvpSnapshot,
    savePvpSnapshot,
    pvpRating,
    pvpWins,
    pvpLosses,
    pvpBattleLogs,
    recordPvpResult,
    player,
    equippedCore,
    rebirthUpgrades,
    unlockedSkills,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'LOBBY' | 'BATTLE' | 'LOGS' | 'RANK_INFO'>('LOBBY');
  const [selectedOpponent, setSelectedOpponent] = useState<PvpOpponent | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(playerName || '박스슬레이어');
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);

  // 실시간 현재 캐릭터 전투력
  const currentLiveCP = useMemo(() => {
    return calculateCombatPower(player.stats, equippedCore, rebirthUpgrades, unlockedSkills);
  }, [player.stats, equippedCore, rebirthUpgrades, unlockedSkills]);

  // 전투 시뮬레이션 상태
  const [battleSpeed, setBattleSpeed] = useState<1 | 2 | 4>(2);
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  const [playerShield, setPlayerShield] = useState(0);
  const [playerMaxShield, setPlayerMaxShield] = useState(0);

  const [oppHp, setOppHp] = useState(100);
  const [oppMaxHp, setOppMaxHp] = useState(100);
  const [oppShield, setOppShield] = useState(0);
  const [oppMaxShield, setOppMaxShield] = useState(0);

  const [turn, setTurn] = useState(1);
  const [battleLogs, setBattleLogs] = useState<BattleLogEntry[]>([]);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [battleResult, setBattleResult] = useState<{
    finished: boolean;
    isWin: boolean;
    ratingDelta: number;
    goldReward: number;
    rpReward: number;
  } | null>(null);

  const [playerAttackAnim, setPlayerAttackAnim] = useState(false);
  const [oppAttackAnim, setOppAttackAnim] = useState(false);
  const battleTimerRef = useRef<number | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // 이름 수정 처리
  const handleSaveName = () => {
    const trimmed = tempName.trim();
    if (trimmed.length > 0) {
      setPlayerName(trimmed);
      setIsEditingName(false);
      triggerToast('캐릭터명이 변경되었습니다.');
    }
  };

  // 스냅샷 수동 저장
  const handleManualSaveSnapshot = () => {
    const saved = savePvpSnapshot();
    triggerToast(`Lv.${saved.level} (전투력 ${formatNumber(saved.combatPower)}) 대전 정보가 저장되었습니다!`);
  };

  const triggerToast = (msg: string) => {
    setSnapshotToast(msg);
    setTimeout(() => {
      setSnapshotToast(null);
    }, 2800);
  };

  // 대전 시작
  const handleStartBattle = (opponent: PvpOpponent) => {
    let myDeck = pvpSnapshot;
    if (!myDeck) {
      myDeck = savePvpSnapshot();
      triggerToast('현재 상태를 대전 정보로 자동 등록했습니다!');
    }

    setSelectedOpponent(opponent);
    setActiveTab('BATTLE');
    setBattleResult(null);
    setDamagePopups([]);
    setTurn(1);

    // 스탯 계산
    const myComputed = getComputedStats(
      myDeck.stats,
      myDeck.unlockedSkills,
      {},
      myDeck.rebirthUpgrades as RebirthUpgrades
    );
    const oppComputed = getComputedStats(
      opponent.stats,
      opponent.unlockedSkills,
      {},
      opponent.rebirthUpgrades as RebirthUpgrades
    );

    // 쉴드 계산
    let myStartShield = 0;
    if (myDeck.equippedCore?.type === 'WATER') {
      myStartShield = Math.floor(myComputed.maxHealth * (0.15 + (myDeck.equippedCore.level * 0.02)));
    }
    let oppStartShield = 0;
    if (opponent.equippedCore?.type === 'WATER') {
      oppStartShield = Math.floor(oppComputed.maxHealth * (0.15 + (opponent.equippedCore.level * 0.02)));
    }

    setPlayerHp(myComputed.maxHealth);
    setPlayerMaxHp(myComputed.maxHealth);
    setPlayerShield(myStartShield);
    setPlayerMaxShield(Math.max(myStartShield, 100));

    setOppHp(oppComputed.maxHealth);
    setOppMaxHp(oppComputed.maxHealth);
    setOppShield(oppStartShield);
    setOppMaxShield(Math.max(oppStartShield, 100));

    setBattleLogs([
      {
        id: `init_1`,
        turn: 1,
        text: `⚔️ [PVP 아레나] ${myDeck.playerName}(Lv.${myDeck.level}) VS ${opponent.playerName}(Lv.${opponent.level}) 결투 개시!`,
        type: 'system',
      },
    ]);
  };

  // 실시간 턴제 1:1 대전 시뮬레이션 루프
  useEffect(() => {
    if (activeTab !== 'BATTLE' || !selectedOpponent || battleResult?.finished) {
      if (battleTimerRef.current) clearInterval(battleTimerRef.current);
      return;
    }

    const myDeck = pvpSnapshot || {
      playerName: playerName || '박스슬레이어',
      level: player.level,
      stats: player.stats,
      equippedCore,
      unlockedSkills,
      rebirthUpgrades,
      combatPower: currentLiveCP,
      pvpScore: pvpRating,
    };

    const myComputed = getComputedStats(
      myDeck.stats,
      myDeck.unlockedSkills,
      {},
      myDeck.rebirthUpgrades as RebirthUpgrades
    );
    const oppComputed = getComputedStats(
      selectedOpponent.stats,
      selectedOpponent.unlockedSkills,
      {},
      selectedOpponent.rebirthUpgrades as RebirthUpgrades
    );

    const intervalMs = Math.floor(800 / battleSpeed);

    battleTimerRef.current = window.setInterval(() => {
      setTurn((prevTurn) => {
        const nextTurn = prevTurn + 1;

        // 1. 플레이어 공격 페이즈
        setPlayerAttackAnim(true);
        setTimeout(() => setPlayerAttackAnim(false), 200);

        let pDamage = Math.max(1, Math.floor(myComputed.attack - (oppComputed.defense * 0.45)));
        const isPCombo = Math.random() < 0.25;
        if (isPCombo) pDamage = Math.floor(pDamage * 1.5);

        // 화염 코어 추가 관통 피해
        let pCoreBonus = 0;
        if (myDeck.equippedCore?.type === 'FIRE') {
          pCoreBonus = Math.floor(myDeck.equippedCore.level * 35 + myComputed.finalStr * 0.4);
        }

        const totalPDamage = pDamage + pCoreBonus;

        setOppHp((curOppHp) => {
          const updatedShield = oppShield;
          let remainingDmg = totalPDamage;

          if (updatedShield > 0) {
            if (updatedShield >= remainingDmg) {
              setOppShield(updatedShield - remainingDmg);
              remainingDmg = 0;
            } else {
              remainingDmg -= updatedShield;
              setOppShield(0);
            }
          }

          const nextOppHp = Math.max(0, curOppHp - remainingDmg);

          // 데미지 팝업
          const popupId = `pop_${Date.now()}_${Math.random()}`;
          setDamagePopups((prev) => [
            ...prev.slice(-6),
            { id: popupId, val: totalPDamage, type: isPCombo ? 'player-combo' : 'player-normal' },
          ]);

          // 로그 추가
          setBattleLogs((logs) => [
            ...logs.slice(-25),
            {
              id: `log_p_${nextTurn}_${Date.now()}`,
              turn: nextTurn,
              text: `${myDeck.playerName}의 ${isPCombo ? '⚡연속 공격!' : '몸통박치기!'} ${formatNumber(totalPDamage)} 피해${pCoreBonus > 0 ? ` (🔥화염 +${formatNumber(pCoreBonus)})` : ''}`,
              type: 'player',
            },
          ]);

          // 상대 사망 체크
          if (nextOppHp <= 0) {
            if (battleTimerRef.current) clearInterval(battleTimerRef.current);
            const myRating = pvpRating || 1000;
            const oppRating = selectedOpponent.pvpScore || 1000;
            const ratingDelta = Math.max(15, Math.min(45, Math.floor(25 + (oppRating - myRating) * 0.05)));
            
            recordPvpResult(true, ratingDelta, selectedOpponent.winGoldReward, selectedOpponent.winRpReward, selectedOpponent.playerName, selectedOpponent.level);

            setBattleResult({
              finished: true,
              isWin: true,
              ratingDelta,
              goldReward: selectedOpponent.winGoldReward,
              rpReward: selectedOpponent.winRpReward,
            });
            return 0;
          }

          // 2. 상대방 반격 페이즈 (플레이어가 아직 살아있을 때)
          setTimeout(() => {
            setOppAttackAnim(true);
            setTimeout(() => setOppAttackAnim(false), 200);

            let oppDmg = Math.max(1, Math.floor(oppComputed.attack - (myComputed.defense * 0.45)));
            const isOppCombo = Math.random() < 0.2;
            if (isOppCombo) oppDmg = Math.floor(oppDmg * 1.4);

            let oppCoreBonus = 0;
            if (selectedOpponent.equippedCore?.type === 'FIRE') {
              oppCoreBonus = Math.floor(selectedOpponent.equippedCore.level * 35 + oppComputed.finalStr * 0.35);
            }

            const totalOppDmg = oppDmg + oppCoreBonus;

            setPlayerHp((curHp) => {
              const curPShield = playerShield;
              let remDmg = totalOppDmg;

              if (curPShield > 0) {
                if (curPShield >= remDmg) {
                  setPlayerShield(curPShield - remDmg);
                  remDmg = 0;
                } else {
                  remDmg -= curPShield;
                  setPlayerShield(0);
                }
              }

              const nextPlayerHp = Math.max(0, curHp - remDmg);

              setDamagePopups((prev) => [
                ...prev.slice(-6),
                { id: `opp_pop_${Date.now()}`, val: totalOppDmg, type: isOppCombo ? 'enemy-combo' : 'enemy-normal' },
              ]);

              setBattleLogs((logs) => [
                ...logs.slice(-25),
                {
                  id: `log_o_${nextTurn}_${Date.now()}`,
                  turn: nextTurn,
                  text: `${selectedOpponent.playerName}의 ${isOppCombo ? '💥강타!' : '돌진!'} ${formatNumber(totalOppDmg)} 피해`,
                  type: 'enemy',
                },
              ]);

              // 플레이어 사망 체크
              if (nextPlayerHp <= 0) {
                if (battleTimerRef.current) clearInterval(battleTimerRef.current);
                const myRating = pvpRating || 1000;
                const oppRating = selectedOpponent.pvpScore || 1000;
                const ratingDelta = -Math.max(8, Math.min(25, Math.floor(15 + (myRating - oppRating) * 0.03)));

                recordPvpResult(false, ratingDelta, 0, 0, selectedOpponent.playerName, selectedOpponent.level);

                setBattleResult({
                  finished: true,
                  isWin: false,
                  ratingDelta,
                  goldReward: 0,
                  rpReward: 0,
                });
                return 0;
              }

              return nextPlayerHp;
            });
          }, Math.floor(intervalMs / 2));

          return nextOppHp;
        });

        return nextTurn;
      });
    }, intervalMs);

    return () => {
      if (battleTimerRef.current) clearInterval(battleTimerRef.current);
    };
  }, [
    activeTab,
    selectedOpponent,
    battleSpeed,
    battleResult,
    currentLiveCP,
    equippedCore,
    oppShield,
    player.level,
    player.stats,
    playerName,
    playerShield,
    pvpRating,
    pvpSnapshot,
    rebirthUpgrades,
    recordPvpResult,
    unlockedSkills,
  ]);

  // 로그 자동 스크롤
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [battleLogs]);

  const deck = pvpSnapshot;
  const myCoreBadge = getCoreBadge(deck?.equippedCore?.type || equippedCore?.type);
  const totalMatches = (pvpWins || 0) + (pvpLosses || 0);
  const winRate = totalMatches > 0 ? Math.round(((pvpWins || 0) / totalMatches) * 100) : 0;

  return (
    <div className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-200 w-full flex flex-col gap-3 font-mono text-xs text-stone-900 select-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-grow">
      
      {/* 토스트 알림 */}
      <AnimatePresence>
        {snapshotToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 bg-neutral-900 border-2 border-amber-400 text-amber-300 text-xs px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 text-center max-w-xs"
          >
            {snapshotToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 최상단 타이틀 & 닉네임 영역 */}
      <div className="flex justify-between items-center border-b-4 border-black pb-2 w-full">
        <div>
          <h2 className="text-sm font-black text-amber-700 tracking-widest uppercase leading-tight flex items-center gap-1.5">
            <span>⚔️</span> -[ PVP ARENA ]-
          </h2>
          <span className="text-[10px] font-bold text-stone-500">
            비동기 1:1 대전 & 아레나 랭크
          </span>
        </div>

        {/* 닉네임 변경 폼 */}
        {isEditingName ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              maxLength={12}
              className="bg-white border-2 border-black px-1.5 py-0.5 text-[11px] font-black w-24 text-stone-900 focus:outline-none"
              placeholder="닉네임"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveName}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-black px-2 py-0.5 text-[10px] font-black cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)]"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setIsEditingName(false)}
              className="bg-stone-300 hover:bg-stone-400 text-stone-800 border-2 border-black px-1.5 py-0.5 text-[10px] font-black cursor-pointer"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setTempName(playerName || '박스슬레이어');
              setIsEditingName(true);
            }}
            className="bg-stone-100 hover:bg-amber-100 border-2 border-black px-2 py-1 text-[11px] font-black flex items-center gap-1 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            title="캐릭터명 변경"
          >
            <span className="text-stone-900 font-black">{playerName || '박스슬레이어'}</span>
            <span className="text-[10px] text-amber-700">✏️</span>
          </button>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 border-b-2 border-black pb-1">
        {(
          [
            { id: 'LOBBY', label: '대전 로비', icon: '⚔️' },
            { id: 'LOGS', label: '대전 기록', icon: '📜' },
            { id: 'RANK_INFO', label: '랭킹 안내', icon: '🏆' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (activeTab === 'BATTLE' && battleResult && !battleResult.finished) {
                if (!window.confirm('전투가 진행 중입니다. 퇴장하시겠습니까?')) return;
              }
              setActiveTab(tab.id);
            }}
            className={`flex-1 py-1.5 text-[11px] font-black border-2 border-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === tab.id
                ? 'bg-amber-400 text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] translate-x-0.5 translate-y-0.5'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-50 shadow-[2px_2px_0px_rgba(0,0,0,1)]'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ================= 1. 대전 로비 (LOBBY) ================= */}
      {activeTab === 'LOBBY' && (
        <div className="flex flex-col gap-3">
          {/* 내 대전 등록 정보 카드 (PVP Snapshot Card) */}
          <div className="bg-stone-100 p-3 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col gap-2.5">
            <div className="flex justify-between items-center border-b-2 border-stone-300 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-stone-900">🛡️ 내 대전 덱 (방어/공격 스냅샷)</span>
                <span className={`text-[9px] font-black px-1.5 py-0.2 border ${myCoreBadge.border} ${myCoreBadge.bg} ${myCoreBadge.text}`}>
                  {myCoreBadge.icon} {myCoreBadge.label}
                </span>
              </div>
              <span className="text-[10px] font-bold text-stone-500">
                {deck ? `등록일: ${new Date(deck.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '미등록'}
              </span>
            </div>

            {/* 스냅샷 주요 지표 그리드 */}
            <div className="grid grid-cols-4 gap-2 bg-stone-200/80 p-2 border border-stone-400 text-center">
              <div>
                <span className="text-[10px] text-stone-500 block">레벨</span>
                <span className="font-black text-xs text-stone-900">Lv.{deck ? deck.level : player.level}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">전투력</span>
                <span className="font-black text-xs text-amber-700 font-mono">
                  {formatNumber(deck ? deck.combatPower : currentLiveCP)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">레이팅</span>
                <span className="font-black text-xs text-purple-700 font-mono">
                  {pvpRating || 1000}점
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">전적 (승률)</span>
                <span className="font-black text-xs text-stone-900 font-mono">
                  {pvpWins}W {pvpLosses}L ({winRate}%)
                </span>
              </div>
            </div>

            {/* 스냅샷 저장 및 갱신 액션 */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="text-[10px] text-stone-600 leading-tight">
                현재 실시간: <span className="font-bold text-stone-900">Lv.{player.level} (전투력 {formatNumber(currentLiveCP)})</span>
              </div>
              <button
                type="button"
                onClick={handleManualSaveSnapshot}
                className="bg-amber-400 hover:bg-amber-300 text-black border-2 border-black px-3 py-1.5 text-[10px] font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer tracking-tight shrink-0"
              >
                📸 현재 상태로 대전 정보 갱신
              </button>
            </div>
          </div>

          {/* 대전 상대 목록 (Mock DB 데이터 10명) */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <span className="font-black text-xs text-stone-800">🎯 대전 상대 매칭 목록 (10인)</span>
              <span className="text-[10px] font-bold text-stone-500">Lv.100 ~ Lv.10,000</span>
            </div>

            <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
              {MOCK_PVP_OPPONENTS.map((opp) => {
                const oppBadge = getCoreBadge(opp.equippedCore?.type);
                const isRecommended = Math.abs((pvpRating || 1000) - opp.pvpScore) <= 250;

                return (
                  <div
                    key={opp.id}
                    className="bg-stone-100 p-2.5 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs text-stone-900 truncate">
                          {opp.playerName}
                        </span>
                        <span className="text-[10px] font-bold text-stone-500">
                          ({opp.title})
                        </span>
                        <span className={`text-[9px] font-black px-1 border ${oppBadge.border} ${oppBadge.bg} ${oppBadge.text}`}>
                          {oppBadge.icon} {oppBadge.label}
                        </span>
                        {isRecommended && (
                          <span className="bg-emerald-500 text-white text-[8px] font-black px-1 border border-emerald-800">
                            추천
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-stone-600 font-mono">
                        <span>Lv.{opp.level}</span>
                        <span>•</span>
                        <span className="text-amber-700 font-bold">전투력 {formatNumber(opp.combatPower)}</span>
                        <span>•</span>
                        <span className="text-purple-700 font-bold">{opp.pvpScore}점</span>
                      </div>

                      <div className="text-[9px] text-stone-500 truncate">
                        보상: +{formatNumber(opp.winGoldReward)}G, +{opp.winRpReward}RP
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartBattle(opp)}
                      className="bg-red-600 hover:bg-red-500 text-white border-2 border-black px-3 py-2 text-[11px] font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer shrink-0"
                    >
                      결투 ⚔️
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. 실시간 1:1 아레나 전투 (BATTLE) ================= */}
      {activeTab === 'BATTLE' && selectedOpponent && (
        <div className="flex flex-col gap-2.5">
          {/* 아레나 상단 컨트롤 바 */}
          <div className="flex justify-between items-center bg-stone-100 p-2 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] text-[10px]">
            <div className="flex items-center gap-2 font-black">
              <span className="text-red-700 animate-pulse">● LIVE PVP ARENA</span>
              <span>TURN {turn}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-bold">배속:</span>
              {([1, 2, 4] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setBattleSpeed(spd)}
                  className={`px-1.5 py-0.5 border border-black font-black cursor-pointer ${
                    battleSpeed === spd ? 'bg-amber-400 text-black' : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* 1:1 박스 배틀 경기장 */}
          <div className="relative bg-neutral-900 border-4 border-black p-4 min-h-[220px] flex flex-col justify-between overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            
            {/* 데미지 팝업 레인 */}
            <div className="absolute inset-0 pointer-events-none z-30">
              <AnimatePresence>
                {damagePopups.map((popup) => (
                  <motion.div
                    key={popup.id}
                    initial={{ opacity: 0, y: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 1, 0], y: -25, scale: [0.9, 1.3, 1] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className={`absolute text-xs font-black font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,1)] ${
                      popup.type.includes('player')
                        ? 'right-12 top-16 text-yellow-400 text-sm'
                        : 'left-12 top-16 text-red-400 text-sm'
                    }`}
                  >
                    -{formatNumber(popup.val)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* 상단: 양측 HP 및 쉴드 바 */}
            <div className="grid grid-cols-2 gap-4 z-10 font-mono text-[10px]">
              {/* 내 캐릭터 상태 */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between font-black text-white">
                  <span className="truncate">{deck?.playerName || playerName || '박스슬레이어'}</span>
                  <span>Lv.{deck?.level || player.level}</span>
                </div>
                {/* 체력바 */}
                <div className="w-full bg-neutral-800 border border-neutral-600 h-3 relative">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-150"
                    style={{ width: `${Math.max(0, (playerHp / (playerMaxHp || 1)) * 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-black leading-none drop-shadow">
                    {formatNumber(playerHp)} / {formatNumber(playerMaxHp)}
                  </span>
                </div>
                {/* 쉴드바 */}
                {playerShield > 0 && (
                  <div className="w-full bg-neutral-800 border border-blue-600 h-1.5 relative">
                    <div
                      className="bg-blue-400 h-full transition-all duration-150"
                      style={{ width: `${Math.min(100, (playerShield / (playerMaxShield || 1)) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* 상대방 캐릭터 상태 */}
              <div className="flex flex-col gap-1 text-right">
                <div className="flex justify-between font-black text-white">
                  <span>Lv.{selectedOpponent.level}</span>
                  <span className="truncate">{selectedOpponent.playerName}</span>
                </div>
                {/* 체력바 */}
                <div className="w-full bg-neutral-800 border border-neutral-600 h-3 relative">
                  <div
                    className="bg-red-500 h-full transition-all duration-150 ml-auto"
                    style={{ width: `${Math.max(0, (oppHp / (oppMaxHp || 1)) * 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-black leading-none drop-shadow">
                    {formatNumber(oppHp)} / {formatNumber(oppMaxHp)}
                  </span>
                </div>
                {/* 쉴드바 */}
                {oppShield > 0 && (
                  <div className="w-full bg-neutral-800 border border-blue-600 h-1.5 relative">
                    <div
                      className="bg-blue-400 h-full transition-all duration-150 ml-auto"
                      style={{ width: `${Math.min(100, (oppShield / (oppMaxShield || 1)) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 중단: 1:1 박스 충돌 아레나 필드 */}
            <div className="flex justify-between items-center my-6 px-8 relative">
              {/* 내 박스 */}
              <motion.div
                animate={{
                  x: playerAttackAnim ? 45 : 0,
                  scale: playerAttackAnim ? 1.15 : 1,
                }}
                transition={{ duration: 0.12 }}
                className={`w-14 h-14 bg-stone-300 border-4 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)] flex flex-col items-center justify-center text-stone-900 font-black relative ${
                  myCoreBadge.bg
                }`}
              >
                <span className="text-lg">{myCoreBadge.icon}</span>
                <span className="text-[8px] text-white font-bold tracking-tighter">YOU</span>
              </motion.div>

              <div className="font-black text-stone-500 text-lg font-mono tracking-widest animate-pulse">
                VS
              </div>

              {/* 상대 박스 */}
              <motion.div
                animate={{
                  x: oppAttackAnim ? -45 : 0,
                  scale: oppAttackAnim ? 1.15 : 1,
                }}
                transition={{ duration: 0.12 }}
                className={`w-14 h-14 bg-stone-300 border-4 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] flex flex-col items-center justify-center text-stone-900 font-black relative ${
                  getCoreBadge(selectedOpponent.equippedCore?.type).bg
                }`}
              >
                <span className="text-lg">{getCoreBadge(selectedOpponent.equippedCore?.type).icon}</span>
                <span className="text-[8px] text-white font-bold tracking-tighter">FOE</span>
              </motion.div>
            </div>

            {/* 전투 결과 오버레이 모달 */}
            <AnimatePresence>
              {battleResult?.finished && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 z-40 text-center font-mono"
                >
                  <h3
                    className={`text-2xl font-black mb-2 tracking-widest uppercase ${
                      battleResult.isWin ? 'text-amber-400 animate-bounce' : 'text-red-500'
                    }`}
                  >
                    {battleResult.isWin ? '🏆 VICTORY 🏆' : '💀 DEFEAT 💀'}
                  </h3>

                  <p className="text-white text-xs mb-3 font-bold">
                    {battleResult.isWin
                      ? `${selectedOpponent.playerName}에게서 승리를 거두었습니다!`
                      : `${selectedOpponent.playerName}에게 패배했습니다.`}
                  </p>

                  <div className="bg-stone-900 border-2 border-stone-700 p-2.5 w-full max-w-xs mb-4 text-xs font-bold space-y-1.5">
                    <div className="flex justify-between items-center text-stone-300 border-b border-stone-800 pb-1">
                      <span>레이팅 변동</span>
                      <span className={battleResult.ratingDelta >= 0 ? 'text-emerald-400 font-black' : 'text-red-400 font-black'}>
                        {battleResult.ratingDelta >= 0 ? `+${battleResult.ratingDelta}` : battleResult.ratingDelta} 점 ({pvpRating}점)
                      </span>
                    </div>
                    {battleResult.isWin && (
                      <>
                        <div className="flex justify-between items-center text-stone-300">
                          <span>골드 보상</span>
                          <span className="text-amber-400 font-black">+{formatNumber(battleResult.goldReward)} G</span>
                        </div>
                        <div className="flex justify-between items-center text-stone-300">
                          <span>환생 포인트(RP)</span>
                          <span className="text-purple-400 font-black">+{battleResult.rpReward} RP</span>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('LOBBY')}
                    className="bg-amber-400 hover:bg-amber-300 text-black border-2 border-black px-5 py-2 font-black text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                  >
                    로비로 복귀
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 실시간 전투 로그 레인 */}
          <div className="bg-neutral-950 p-2 border-2 border-black h-28 overflow-y-auto text-[10px] font-mono select-text flex flex-col gap-1">
            {battleLogs.map((log) => (
              <div
                key={log.id}
                className={`leading-tight ${
                  log.type === 'player'
                    ? 'text-amber-300'
                    : log.type === 'enemy'
                    ? 'text-red-400'
                    : 'text-stone-400 font-bold'
                }`}
              >
                [{log.turn}T] {log.text}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* ================= 3. 대전 전적 기록 (LOGS) ================= */}
      {activeTab === 'LOGS' && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="font-black text-xs text-stone-800">📜 최근 대전 전적 (최대 30경기)</span>
            <span className="text-[10px] font-bold text-stone-500 font-mono">
              {pvpWins}승 {pvpLosses}패
            </span>
          </div>

          {pvpBattleLogs.length === 0 ? (
            <div className="bg-stone-100 border-2 border-black p-6 text-center text-stone-500 text-xs font-bold">
              아직 진행된 PVP 대전 기록이 없습니다.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1">
              {pvpBattleLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 border-2 border-black text-xs flex justify-between items-center shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
                    log.isWin ? 'bg-emerald-50 border-emerald-900' : 'bg-red-50 border-red-900'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-black px-1 border ${
                          log.isWin
                            ? 'bg-emerald-600 text-white border-emerald-900'
                            : 'bg-red-600 text-white border-red-900'
                        }`}
                      >
                        {log.isWin ? '승리' : '패배'}
                      </span>
                      <span className="font-black text-stone-900">
                        VS {log.opponentName} (Lv.{log.opponentLevel})
                      </span>
                    </div>
                    <span className="text-[9px] text-stone-500">
                      {new Date(log.timestamp).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    <span
                      className={`font-black text-xs block ${
                        log.scoreDelta >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {log.scoreDelta >= 0 ? `+${log.scoreDelta}` : log.scoreDelta} 점
                    </span>
                    {log.isWin && (
                      <span className="text-[9px] text-amber-700 block font-bold">
                        +{formatNumber(log.goldReward)}G / +{log.rpReward}RP
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= 4. 랭킹 시스템 기획 안내 (RANK_INFO) ================= */}
      {activeTab === 'RANK_INFO' && (
        <div className="bg-stone-100 p-3 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col gap-3 font-mono text-xs">
          <div className="border-b-2 border-stone-300 pb-2">
            <h3 className="font-black text-xs text-amber-700 uppercase flex items-center gap-1">
              <span>🏆</span> 랭킹 시스템 설계 및 도입 지침
            </h3>
            <p className="text-[10px] text-stone-600 mt-0.5">
              향후 Firebase/Cloud SQL 데이터베이스 연동 시 종합 랭킹 보드에 반영될 핵심 지표들입니다.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {[
              {
                title: '1. 최고 스테이지 돌파 랭킹 (All-Time Max Stage)',
                desc: '모든 회차(Run) 통틀어 가장 높은 층수에 도달한 순위 (PVE 핵심 메타)',
                icon: '🏔️',
              },
              {
                title: '2. PVP 아레나 레이팅 랭킹 (Arena MMR & Rating)',
                desc: '비동기 1:1 결투를 통해 획득한 레이팅 점수 및 승률 순위',
                icon: '⚔️',
              },
              {
                title: '3. 누적 환생(RP) 및 메타 성장 랭킹 (Total Meta Progress)',
                desc: '누적 환생 횟수 및 지금까지 획득한 총 환생 포인트(RP) 기준 순위',
                icon: '🌟',
              },
              {
                title: '4. 최고 도달 레벨 랭킹 (Peak Run Level)',
                desc: '단일 회차에서 달성한 최고 캐릭터 레벨 순위',
                icon: '📈',
              },
              {
                title: '5. 최고 전투력(Combat Power) 랭킹',
                desc: '스탯, 환생 강화, 코어 레벨을 종합 환산한 절대 전투력 순위',
                icon: '💪',
              },
              {
                title: '6. 단일 최고 타격 데미지 랭킹 (Max Single Hit)',
                desc: '초신성/태풍/낙뢰 등 단일 공격으로 기록한 최고 데미지 순위',
                icon: '💥',
              },
              {
                title: '7. 코어 연구 및 스킬 해금 마스터리 랭킹',
                desc: '스킬 트리 및 코어 조각 영구 특화 레벨 총합 순위',
                icon: '🔮',
              },
            ].map((rankItem) => (
              <div key={rankItem.title} className="bg-stone-200/90 p-2 border border-stone-400">
                <div className="font-black text-stone-900 text-[11px] flex items-center gap-1">
                  <span>{rankItem.icon}</span>
                  <span>{rankItem.title}</span>
                </div>
                <div className="text-[10px] text-stone-600 mt-0.5 leading-tight">
                  {rankItem.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
