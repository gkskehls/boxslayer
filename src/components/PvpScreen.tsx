// src/components/PvpScreen.tsx

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, getComputedStats, calculateCombatPower } from '../store/gameStore';
import { MOCK_PVP_OPPONENTS } from '../data/pvpOpponents';
import { PvpBattleScreen } from './PvpBattleScreen';
import type { PvpOpponent } from '../types/pvp';
import type { CoreType, RebirthUpgrades } from '../types/game';
import { formatNumber } from '../utils/format';

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
    player,
    equippedCore,
    coreAbilities,
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

  // 선공(Initiative) 판정: PvP에서는 "공격 속도(Attack Speed)"가 빠른 캐릭터가 선공!
  const getInitiative = (
    myEffectiveSpeed: number,
    oppEffectiveSpeed: number
  ) => {
    if (myEffectiveSpeed > oppEffectiveSpeed) {
      return {
        isPlayerFirst: true,
        reason: `공속 우세 (${myEffectiveSpeed.toFixed(2)}/s > ${oppEffectiveSpeed.toFixed(2)}/s)`,
      };
    } else if (oppEffectiveSpeed > myEffectiveSpeed) {
      return {
        isPlayerFirst: false,
        reason: `상대 공속 우세 (${oppEffectiveSpeed.toFixed(2)}/s > ${myEffectiveSpeed.toFixed(2)}/s)`,
      };
    }
    return {
      isPlayerFirst: true,
      reason: `공속 동률 (${myEffectiveSpeed.toFixed(2)}/s) - 도전자 우선`,
    };
  };

  // 대전 시작
  const handleStartBattle = (opponent: PvpOpponent) => {
    if (!pvpSnapshot) {
      savePvpSnapshot();
      triggerToast('현재 상태를 대전 정보로 자동 등록했습니다!');
    }

    setSelectedOpponent(opponent);
    setActiveTab('BATTLE');
  };

  const deck = pvpSnapshot;
  const myCoreBadge = getCoreBadge(deck?.equippedCore?.type || equippedCore?.type);
  const totalMatches = (pvpWins || 0) + (pvpLosses || 0);
  const winRate = totalMatches > 0 ? Math.round(((pvpWins || 0) / totalMatches) * 100) : 0;

  // BATTLE 탭일 때는 100% 동일한 레트로 아케이드 뷰 렌더링
  if (activeTab === 'BATTLE' && selectedOpponent) {
    return (
      <PvpBattleScreen
        opponent={selectedOpponent}
        onExit={() => {
          setSelectedOpponent(null);
          setActiveTab('LOBBY');
        }}
      />
    );
  }

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
            비동기 1:1 대전 & 공속 선공 결투
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
            onClick={() => setActiveTab(tab.id)}
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

                const myDeckData = pvpSnapshot || {
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
                  myDeckData.stats,
                  myDeckData.unlockedSkills,
                  {},
                  myDeckData.rebirthUpgrades as RebirthUpgrades
                );
                const oppComputed = getComputedStats(
                  opp.stats,
                  opp.unlockedSkills,
                  {},
                  opp.rebirthUpgrades as RebirthUpgrades
                );

                // 공속 기반 선공 판정
                let myWindBonus = 1.0;
                if (myDeckData.equippedCore?.type === 'WIND') {
                  const windMultiChanceLvl = coreAbilities?.wind_multi_hit_chance || 0;
                  const windMultiDmgLvl = coreAbilities?.wind_multi_hit_damage || 0;
                  myWindBonus = 1.0 + (myDeckData.equippedCore.level * 0.02) + (windMultiChanceLvl * 0.03) + (windMultiDmgLvl * 0.02);
                }
                const mySpeed = Number((myComputed.attackSpeed * myWindBonus).toFixed(2));

                let oppWindBonus = 1.0;
                if (opp.equippedCore?.type === 'WIND') {
                  oppWindBonus = 1.0 + (opp.equippedCore.level * 0.02);
                }
                const oppSpeed = Number((oppComputed.attackSpeed * oppWindBonus).toFixed(2));

                const oppInit = getInitiative(mySpeed, oppSpeed);

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
                        {oppInit.isPlayerFirst ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-500 text-[8px] font-black px-1" title={oppInit.reason}>
                            ⚡선공 ({mySpeed}/s &gt; {oppSpeed}/s)
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-800 border border-rose-500 text-[8px] font-black px-1" title={oppInit.reason}>
                            🛡️후공 ({oppSpeed}/s &gt; {mySpeed}/s)
                          </span>
                        )}
                        {isRecommended && (
                          <span className="bg-amber-400 text-black text-[8px] font-black px-1 border border-black">
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
                        {opp.description}
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

      {/* ================= 2. 대전 전적 기록 (LOGS) ================= */}
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= 3. 랭킹 시스템 기획 안내 (RANK_INFO) ================= */}
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
