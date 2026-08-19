// src/components/AnimatedBattleScreen.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore, getComputedStats } from '../store/gameStore';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { CoreType } from '../types/game';
import { formatNumber } from '../utils/format';
import { getEnemyCoreTier } from '../data/rebirthConfig';

// [박스 외형 스타일] 크기는 80px 고정, 스탯 비율로 색조 결정, 상대와의 총 스탯 차이로 명암(밝기 25%~75%) 산출
const getDynamicBoxStyle = (
  stats: { str: number; dex: number; con: number },
  opponentTotalStats: number,
  baseSize: number = 80
) => {
  const { str, dex, con } = stats;
  const myTotalStats = (str || 0) + (dex || 0) + (con || 0) || 1;
  const oppTotalStats = Math.max(1, opponentTotalStats || 1);

  // 1) 고유 색조 RGB 비율 (STR: 빨강, DEX: 초록, CON: 파랑)
  const normR = (str || 0) / myTotalStats;
  const normG = (dex || 0) / myTotalStats;
  const normB = (con || 0) / myTotalStats;

  // 2) 상대와의 스탯 총합 비율에 따른 명암(밝기) 계수 산출 (25% ~ 75% 안전 가독 범위)
  const diffRatio = (myTotalStats - oppTotalStats) / Math.max(myTotalStats, oppTotalStats);
  const lightness = Math.min(0.75, Math.max(0.25, 0.50 + diffRatio * 0.25));

  // 기본 색상을 명도에 맞춰 스케일링
  const lightnessFactor = lightness * 2;
  const r = Math.min(255, Math.max(0, Math.floor(normR * 255 * lightnessFactor)));
  const g = Math.min(255, Math.max(0, Math.floor(normG * 255 * lightnessFactor)));
  const b = Math.min(255, Math.max(0, Math.floor(normB * 255 * lightnessFactor)));

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    width: `${baseSize}px`,
    height: `${baseSize}px`,
    borderRadius: '0px',
  };
};

// 코어 타입별 테두리 및 톤온톤 인셋 스타일 (캐릭터 색상과 자연스럽게 조화)
const getCoreBorderClass = (coreType?: CoreType | null) => {
  switch (coreType) {
    case 'FIRE':
      return 'border-neutral-950 ring-2 ring-inset ring-red-500/40 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]';
    case 'WATER':
      return 'border-neutral-950 ring-2 ring-inset ring-sky-400/40 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]';
    case 'WIND':
      return 'border-neutral-950 ring-2 ring-inset ring-emerald-400/40 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]';
    case 'ELECTRIC':
      return 'border-neutral-950 ring-2 ring-inset ring-amber-400/40 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]';
    default:
      return 'border-neutral-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]';
  }
};

const getCoreKoreanName = (coreType?: CoreType | null) => {
  switch (coreType) {
    case 'FIRE': return '불';
    case 'WATER': return '물';
    case 'WIND': return '바람';
    case 'ELECTRIC': return '전기';
    default: return '속성';
  }
};

// [신규] 레트로 아케이드 픽셀 HP 바 & 쉴드 덧띠 오버레이 컴포넌트
const RetroHpBar = ({
  current,
  max,
  shield = 0,
  isEnemy = false,
}: {
  current: number;
  max: number;
  shield?: number;
  isEnemy?: boolean;
}) => {
  const safeMax = Math.max(1, max);
  const safeCurrent = Math.max(0, Math.min(safeMax, current));
  const hpPercent = (safeCurrent / safeMax) * 100;
  const shieldPercent = ((shield || 0) / safeMax) * 100;

  return (
    <div className="relative w-full h-3 bg-neutral-950/80 border border-neutral-900 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
      {/* 기본 체력바 채우기 */}
      <div
        className={`h-full transition-all duration-200 ${
          isEnemy
            ? 'bg-gradient-to-r from-red-700 via-rose-600 to-red-500'
            : 'bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-400'
        }`}
        style={{ width: `${hpPercent}%` }}
      />
      {/* 쉴드 오버레이 (사이언 파란색 덧띠) */}
      {shield > 0 && (
        <div
          className="absolute top-0 bottom-0 bg-cyan-400/90 border-l-2 border-white animate-pulse transition-all duration-200 shadow-[0_0_6px_rgba(34,211,238,0.8)]"
          style={{
            left: `${Math.min(95, hpPercent)}%`,
            width: `${Math.min(100 - hpPercent, shieldPercent)}%`,
          }}
        />
      )}
      {/* 8비트 아케이드 격자 필터 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.3)_1px,transparent_1px)] bg-[size:4px_100%] pointer-events-none" />
    </div>
  );
};

// 층(Stage) 및 턴(Turn)별 일관된 고유 색상 팔레트 (같은 층끼리 같은 색, 같은 턴끼리 같은 색)
const STAGE_COLORS = [
  'text-amber-400',   // 1F
  'text-emerald-400', // 2F
  'text-cyan-400',    // 3F
  'text-pink-400',    // 4F
  'text-yellow-300',  // 5F
  'text-teal-300',    // 6F
  'text-violet-400',  // 7F
  'text-orange-400',  // 8F
];

const TURN_COLORS = [
  'text-sky-400',     // T1: 스카이블루
  'text-lime-400',    // T2: 라임그린
  'text-fuchsia-400', // T3: 퓨샤핑크
  'text-indigo-300',  // T4: 인디고
  'text-rose-400',    // T5: 로즈레드
  'text-amber-300',   // T6: 밝은앰버
  'text-cyan-300',    // T7: 연한사이언
  'text-emerald-300', // T8: 연한에메랄드
];

const getLogPrefixBadge = (curStage: number, curTurn: number) => {
  const stageColor = STAGE_COLORS[Math.max(0, (curStage - 1)) % STAGE_COLORS.length] || 'text-amber-400';
  const turnColor = TURN_COLORS[Math.max(0, (curTurn - 1)) % TURN_COLORS.length] || 'text-sky-400';

  return (
    <span className="inline-flex items-baseline mr-1.5 select-text font-mono text-[10px] font-bold">
      <span className={stageColor}>{curStage}F</span>
      <span className="text-stone-500 mx-0.5">·</span>
      <span className={turnColor}>T{curTurn}</span>
    </span>
  );
};

interface LogEntry {
  id: string;
  message: React.ReactNode;
}

interface DamagePopup {
  id: string;
  val: number;
  type: 'normal' | 'core' | 'reflect' | 'taken' | 'taken-core' | 'miss-enemy' | 'miss-player' | 'shield' | 'enemy-shield' | 'leech' | 'one-shot-leap';
  coreType?: string;
  isCombo?: boolean;
  comboHits?: number;
  leapedStages?: number;
}

let uniquePopupCounter = 0;
const getUniqueId = (): string => {
  uniquePopupCounter = (uniquePopupCounter + 1) % 10000000;
  return `${Date.now()}_${uniquePopupCounter}_${Math.random().toString(36).substring(2, 7)}`;
};

// 방치 시간 포맷 헬퍼 (시간 분 단위 표기)
const formatOfflineTime = (totalMinutes: number): string => {
  if (totalMinutes <= 0) return '0분';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}시간 ${mins}분`;
  }
  if (hours > 0) {
    return `${hours}시간`;
  }
  return `${mins}분`;
};

const formatOfflineTimeShort = (totalMinutes: number): string => {
  if (totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) {
    return `+${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `+${hours}h`;
  }
  return `+${mins}m`;
};

const getCoreBadgeDisplay = (type?: CoreType, tier?: number) => {
  if (!type) return null;
  const tierSuffix = tier !== undefined && tier > 0 ? ` T${tier}` : '';
  switch (type) {
    case 'FIRE': return { label: `🔥불${tierSuffix}`, color: 'bg-red-600 text-white border-red-950' };
    case 'WATER': return { label: `💧물${tierSuffix}`, color: 'bg-blue-600 text-white border-blue-950' };
    case 'WIND': return { label: `🍃바람${tierSuffix}`, color: 'bg-emerald-600 text-white border-emerald-950' };
    case 'ELECTRIC': return { label: `⚡전기${tierSuffix}`, color: 'bg-amber-400 text-black border-amber-800' };
    default: return null;
  }
};

interface AnimatedBattleScreenProps {
  onNavigateToStats?: () => void;
}

const AnimatedBattleScreen: React.FC<AnimatedBattleScreenProps> = ({ onNavigateToStats }) => {
  const state = useGameStore();
  const {
    player,
    playerShield,
    enemyShield,
    currentEnemy,
    stage,
    maxStage,
    gameStatus,
    defeatReason,
    lastDamageDealt,
    lastDamageTaken,
    lastReflectedDamage,
    lastLeechedHealth,
    lastEnemyShieldRecovered,
    lastEnemyEvadedTime,
    lastPlayerEvadedTime,
    playerStunEndTime,
    coreFragments,
    boxFragments,
    rebirthUpgrades,
    unlockedSkills,
    activeBuffs,
    claimOfflineRewards,
    spawnEnemy,
    attackEnemy,
    attackPlayer,
    retryCurrentFloor,
    setDefeat,
    incrementBattleTurn,
    battleTurn,
  } = state;

  const [offlineBanner, setOfflineBanner] = useState<{ gold: number; exp: number; minutes: number; levelsGained?: number } | null>(() => {
    const rewards = state.calculateOfflineRewards();
    if (rewards && rewards.minutes >= 1 && (rewards.gold > 0 || rewards.exp > 0)) {
      return rewards;
    }
    return null;
  });
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  useEffect(() => {
    const updateRewards = () => {
      const rewards = state.calculateOfflineRewards();
      if (rewards && rewards.minutes >= 1 && (rewards.gold > 0 || rewards.exp > 0)) {
        setOfflineBanner(rewards);
      }
    };
    const interval = setInterval(updateRewards, 10000);
    window.addEventListener('focus', updateRewards);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updateRewards);
    };
  }, [state]);

  const handleClaimBannerRewards = () => {
    claimOfflineRewards();
    setOfflineBanner(null);
    setShowOfflineModal(false);
  };

  const [isPlayerStunned, setIsPlayerStunned] = useState(false);

  useEffect(() => {
    const checkStun = () => {
      setIsPlayerStunned(Boolean(playerStunEndTime && playerStunEndTime > Date.now()));
    };
    checkStun();
    const interval = setInterval(checkStun, 200);
    return () => clearInterval(interval);
  }, [playerStunEndTime]);

  const computed = getComputedStats(player.stats, unlockedSkills, activeBuffs, rebirthUpgrades);
  const enemyComputed = currentEnemy ? getComputedStats(currentEnemy.stats) : null;
  const enemyAttackSpeed = enemyComputed?.attackSpeed ?? 1;

  const playerTotalStats = (computed.finalStr || player.stats.str) + (computed.finalDex || player.stats.dex) + (computed.finalCon || player.stats.con);
  const enemyTotalStats = enemyComputed
    ? (enemyComputed.finalStr + enemyComputed.finalDex + enemyComputed.finalCon)
    : (currentEnemy ? (currentEnemy.stats.str + currentEnemy.stats.dex + currentEnemy.stats.con) : 1);

  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit' | 'stunned'>('idle');
  const [enemyAnim, setEnemyAnim] = useState<'idle' | 'attack' | 'hit'>('idle');

  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [damageLog, setDamageLog] = useState<LogEntry[]>([]);
  const [battleTime, setBattleTime] = useState(0);
  const [turnCount, setTurnCount] = useState(1);
  const [timeMultiplier, setTimeMultiplier] = useState(1);
  const [feverToast, setFeverToast] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isLogExpanded, setIsLogExpanded] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const handleCopyLog = () => {
    if (!logContainerRef.current) return;
    const text = logContainerRef.current.innerText;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 1500);
    }).catch(() => {
      // fallback
    });
  };

  const showFeverToast = (msg: string) => {
    setFeverToast(msg);
    setTimeout(() => setFeverToast(null), 1200);
  };

  useEffect(() => {
    queueMicrotask(() => {
      setPlayerAnim(isPlayerStunned ? 'stunned' : 'idle');
    });
  }, [isPlayerStunned]);

  useEffect(() => {
    if (gameStatus !== 'BATTLE') {
      queueMicrotask(() => {
        setPlayerAnim('idle');
        setEnemyAnim('idle');
        setBattleTime(0);
        setTurnCount(1);
        setTimeMultiplier(1);
        setFeverToast(null);
      });
    }
  }, [gameStatus]);

  useEffect(() => {
    let timer: number;
    if (gameStatus === 'BATTLE' && !isPaused) {
      timer = window.setInterval(() => {
        setBattleTime(prev => {
          const newTime = prev + 1;
          if (newTime > 30) {
            setDefeat('TIMEOUT');
            clearInterval(timer);
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameStatus, setDefeat, isPaused]);

  // 피버 타임 배속 단계 및 토스트 알림 연출
  useEffect(() => {
    if (gameStatus !== 'BATTLE' || isPaused) return;

    const timeout1 = setTimeout(() => {
      setTimeMultiplier(1.5);
      showFeverToast('🔥 1.5x FEVER!');
    }, 5000);

    const timeout2 = setTimeout(() => {
      setTimeMultiplier(5.0);
      showFeverToast('⚡ 5.0x FEVER!!');
    }, 10000);

    const timeout3 = setTimeout(() => {
      setTimeMultiplier(10.0);
      showFeverToast('💥 10.0x FEVER!!!');
    }, 15000);

    const timeout4 = setTimeout(() => {
      setTimeMultiplier(50.0);
      showFeverToast('🚀 50.0x MAX SPEED!!!!');
    }, 20000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      clearTimeout(timeout4);
    };
  }, [gameStatus, isPaused]);

  const addDamagePopup = (popup: Omit<DamagePopup, 'id'>) => {
    const id = getUniqueId();
    setDamagePopups((prev) => [...prev.slice(-10), { ...popup, id }]);
    setTimeout(() => {
      setDamagePopups((prev) => prev.filter((p) => p.id !== id));
    }, 750);
  };

  const addLog = (message: React.ReactNode) => {
    const id = getUniqueId();
    setDamageLog((prev) => [{ id, message }, ...prev.slice(0, 19)]);
  };

  // 플레이어 피격/쉴드 이벤트 리액션
  const prevDamageTakenRef = useRef(lastDamageTaken);
  const prevPlayerEvadedTimeRef = useRef(lastPlayerEvadedTime);

  useEffect(() => {
    if (lastDamageTaken && (lastDamageTaken !== prevDamageTakenRef.current || lastPlayerEvadedTime !== prevPlayerEvadedTimeRef.current)) {
      prevDamageTakenRef.current = lastDamageTaken;
      prevPlayerEvadedTimeRef.current = lastPlayerEvadedTime;
      const isEvaded = lastPlayerEvadedTime > 0;

      queueMicrotask(() => {
        if (!isEvaded) {
          setPlayerAnim('hit');
          setTimeout(() => {
            setPlayerAnim(isPlayerStunned ? 'stunned' : 'idle');
          }, 180);
        }

        const attackStage = lastDamageTaken.attackStage || stage;
        const attackTurn = lastDamageTaken.turn || battleTurn || turnCount;
        const tag = getLogPrefixBadge(attackStage, attackTurn);

        if (isEvaded) {
          addDamagePopup({ val: 0, type: 'miss-player' });
          addLog(
            <span className="text-stone-400 font-mono">
              {tag}<span className="text-rose-400 font-bold mr-1">[적]</span>회피
            </span>
          );
        } else {
          const totalTaken = (lastDamageTaken.normal || 0) + (lastDamageTaken.core || 0);
          const absorbed = lastDamageTaken.absorbedByShield || 0;
          if (totalTaken > 0 || absorbed > 0) {
            if (totalTaken > 0) {
              addDamagePopup({ val: totalTaken, type: 'taken' });
            }
            const normalDmg = lastDamageTaken.normal || 0;
            const coreDmg = lastDamageTaken.core || 0;
            const enemyCore = currentEnemy?.core?.type;
            const coreText = coreDmg > 0 ? ` | ${getCoreKoreanName(enemyCore)} ${formatNumber(coreDmg)}` : '';
            const absorbText = absorbed > 0 ? ` (🛡️${formatNumber(absorbed)})` : '';
            const stunText = isPlayerStunned ? ' ⚡기절' : '';

            addLog(
              <span className="text-rose-300 font-mono">
                {tag}<span className="text-rose-400 font-bold mr-1">[적]</span>일반 {formatNumber(normalDmg)}{coreText}{absorbText}{stunText}
              </span>
            );
          }
        }
      });
    }
  }, [lastDamageTaken, lastPlayerEvadedTime, isPlayerStunned, currentEnemy?.core?.type, stage, turnCount, battleTurn]);

  // 적 피격/반사/흡혈 이벤트 리액션
  const prevDamageDealtRef = useRef(lastDamageDealt);
  const prevEnemyEvadedTimeRef = useRef(lastEnemyEvadedTime);

  useEffect(() => {
    if (lastDamageDealt && (lastDamageDealt !== prevDamageDealtRef.current || lastEnemyEvadedTime !== prevEnemyEvadedTimeRef.current)) {
      prevDamageDealtRef.current = lastDamageDealt;
      prevEnemyEvadedTimeRef.current = lastEnemyEvadedTime;
      const isEvaded = lastEnemyEvadedTime > 0;

      queueMicrotask(() => {
        if (!isEvaded) {
          setEnemyAnim('hit');
          setTimeout(() => setEnemyAnim('idle'), 180);
        }

        const attackStage = lastDamageDealt.attackStage || stage;
        const attackTurn = lastDamageDealt.turn || battleTurn || turnCount;
        const tag = getLogPrefixBadge(attackStage, attackTurn);

        if (isEvaded) {
          addDamagePopup({ val: 0, type: 'miss-enemy' });
          addLog(
            <span className="text-stone-500 font-mono">
              {tag}<span className="text-emerald-400 font-bold mr-1">[나]</span>빗맞음
            </span>
          );
        } else {
          if (lastDamageDealt.normal > 0) {
            addDamagePopup({
              val: lastDamageDealt.normal,
              type: 'normal',
              isCombo: lastDamageDealt.isCombo,
              comboHits: lastDamageDealt.comboHits,
            });
          }
          if (lastDamageDealt.core > 0) {
            addDamagePopup({
              val: lastDamageDealt.core,
              type: 'core',
              coreType: state.equippedCore?.type,
            });
          }
          if (lastDamageDealt.leapedStages && lastDamageDealt.leapedStages > 1) {
            addDamagePopup({
              val: 0,
              type: 'one-shot-leap',
              leapedStages: lastDamageDealt.leapedStages,
            });
          }

          const normalDmg = lastDamageDealt.normal || 0;
          const coreDmg = lastDamageDealt.core || 0;
          const absorbed = lastDamageDealt.absorbedByShield || 0;
          const playerCore = state.equippedCore?.type;
          const coreText = coreDmg > 0 ? ` | ${getCoreKoreanName(playerCore)} ${formatNumber(coreDmg)}` : '';
          const absorbText = absorbed > 0 ? ` (🛡️${formatNumber(absorbed)})` : '';
          const comboText = lastDamageDealt.isCombo ? ` ⚡${lastDamageDealt.comboHits || 2}x` : '';
          const leapText = (lastDamageDealt.leapedStages && lastDamageDealt.leapedStages > 1) ? ` (+${lastDamageDealt.leapedStages}층)` : '';

          addLog(
            <span className="text-amber-200 font-mono">
              {tag}<span className="text-emerald-400 font-bold mr-1">[나]</span>일반 {formatNumber(normalDmg)}{coreText}{absorbText}{comboText}{leapText}
            </span>
          );
        }
      });
    }
  }, [lastDamageDealt, lastEnemyEvadedTime, state.equippedCore?.type, stage, turnCount, battleTurn]);

  // 반사 데미지 로그
  const prevReflectedRef = useRef(lastReflectedDamage);
  useEffect(() => {
    if (lastReflectedDamage && lastReflectedDamage > 0 && lastReflectedDamage !== prevReflectedRef.current) {
      prevReflectedRef.current = lastReflectedDamage;
      queueMicrotask(() => {
        const attackStage = lastDamageTaken?.attackStage || stage;
        const attackTurn = lastDamageTaken?.turn || battleTurn || turnCount;
        const tag = getLogPrefixBadge(attackStage, attackTurn);
        addDamagePopup({ val: lastReflectedDamage, type: 'reflect' });
        addLog(
          <span className="text-cyan-300 font-mono">
            {tag}<span className="text-emerald-400 font-bold mr-1">[나]</span>반사 {formatNumber(lastReflectedDamage)}
          </span>
        );
      });
    }
  }, [lastReflectedDamage, stage, turnCount, battleTurn, lastDamageTaken]);

  // 흡혈 회복 로그
  const prevLeechedRef = useRef(lastLeechedHealth);
  useEffect(() => {
    if (lastLeechedHealth && lastLeechedHealth > 0 && lastLeechedHealth !== prevLeechedRef.current) {
      prevLeechedRef.current = lastLeechedHealth;
      queueMicrotask(() => {
        const attackStage = lastDamageDealt?.attackStage || stage;
        const attackTurn = lastDamageDealt?.turn || battleTurn || turnCount;
        const tag = getLogPrefixBadge(attackStage, attackTurn);
        addDamagePopup({ val: lastLeechedHealth, type: 'leech' });
        addLog(
          <span className="text-emerald-300 font-mono">
            {tag}<span className="text-emerald-400 font-bold mr-1">[나]</span>흡혈 +{formatNumber(lastLeechedHealth)}
          </span>
        );
      });
    }
  }, [lastLeechedHealth, stage, turnCount, battleTurn, lastDamageDealt]);

  // 적 쉴드 회복 로그
  const prevEnemyShieldRef = useRef(lastEnemyShieldRecovered);
  useEffect(() => {
    if (lastEnemyShieldRecovered && lastEnemyShieldRecovered > 0 && lastEnemyShieldRecovered !== prevEnemyShieldRef.current) {
      prevEnemyShieldRef.current = lastEnemyShieldRecovered;
      queueMicrotask(() => {
        const attackStage = lastDamageTaken?.attackStage || stage;
        const attackTurn = lastDamageTaken?.turn || battleTurn || turnCount;
        const tag = getLogPrefixBadge(attackStage, attackTurn);
        addDamagePopup({ val: lastEnemyShieldRecovered, type: 'enemy-shield' });
        addLog(
          <span className="text-cyan-300 font-mono">
            {tag}<span className="text-rose-400 font-bold mr-1">[적]</span>쉴드 +{formatNumber(lastEnemyShieldRecovered)}
          </span>
        );
      });
    }
  }, [lastEnemyShieldRecovered, stage, turnCount, battleTurn, lastDamageTaken]);

  // 전투 스케줄러 루프
  useEffect(() => {
    if (isPaused) return;

    if (gameStatus === 'IDLE') {
      const timer = setTimeout(() => {
        spawnEnemy();
      }, 500);
      return () => clearTimeout(timer);
    }

    if (gameStatus === 'VICTORY') {
      const timer = setTimeout(() => {
        spawnEnemy();
      }, 100);
      return () => clearTimeout(timer);
    }

    if (gameStatus === 'DEFEAT') {
      const timer = setTimeout(() => {
        retryCurrentFloor();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, spawnEnemy, retryCurrentFloor, isPaused]);

  // 전투 턴 타이머 (피버 배속 연동 및 통합 라운드 루프)
  useEffect(() => {
    if (gameStatus !== 'BATTLE' || isPaused) return;

    const baseSpeed = 1.0;
    const intervalMs = Math.max(80, Math.floor(1000 / (baseSpeed * timeMultiplier)));
    const halfInterval = Math.max(30, Math.floor(intervalMs / 2));

    let enemyTimeout: ReturnType<typeof setTimeout> | null = null;
    let animTimeout1: ReturnType<typeof setTimeout> | null = null;
    let animTimeout2: ReturnType<typeof setTimeout> | null = null;

    const roundInterval = setInterval(() => {
      // 1) [Phase 1: 나(플레이어) 턴]
      if (!isPlayerStunned) {
        setPlayerAnim('attack');
        attackEnemy();
        animTimeout1 = setTimeout(() => {
          setPlayerAnim(isPlayerStunned ? 'stunned' : 'idle');
        }, Math.min(150, halfInterval));
      }

      // 2) [Phase 2: 적 턴] (반 템포 뒤에 적 생존 여부 확인 후 실행)
      enemyTimeout = setTimeout(() => {
        const storeState = useGameStore.getState();
        if (
          storeState.gameStatus !== 'BATTLE' ||
          isPaused ||
          !storeState.currentEnemy ||
          storeState.currentEnemy.currentHealth <= 0
        ) {
          return;
        }

        setEnemyAnim('attack');
        attackPlayer();
        animTimeout2 = setTimeout(() => {
          setEnemyAnim('idle');
        }, Math.min(150, halfInterval));

        // 3) [Phase 3: 턴 종료 및 다음 턴 카운터 진행]
        incrementBattleTurn();
        setTurnCount((prev) => prev + 1);
      }, halfInterval);

    }, intervalMs);

    return () => {
      clearInterval(roundInterval);
      if (enemyTimeout) clearTimeout(enemyTimeout);
      if (animTimeout1) clearTimeout(animTimeout1);
      if (animTimeout2) clearTimeout(animTimeout2);
    };
  }, [gameStatus, attackEnemy, attackPlayer, isPlayerStunned, timeMultiplier, isPaused, incrementBattleTurn]);

  const playerVariants: Variants = {
    idle: { x: 0, scale: 1, rotate: 0 },
    attack: {
      x: [0, 45, 0],
      scale: [1, 1.15, 1],
      transition: { duration: 0.15, ease: 'easeOut' },
    },
    hit: {
      x: [0, -16, 8, -4, 0],
      rotate: [0, -8, 6, -3, 0],
      transition: { duration: 0.2 },
    },
    stunned: {
      rotate: [-5, 5, -5],
      transition: { repeat: Infinity, duration: 0.3 },
    },
  };

  const enemyVariants: Variants = {
    idle: { x: 0, scale: 1, rotate: 0 },
    attack: {
      x: [0, -45, 0],
      scale: [1, 1.15, 1],
      transition: { duration: 0.15, ease: 'easeOut' },
    },
    hit: {
      x: [0, 16, -8, 4, 0],
      rotate: [0, 8, -6, 3, 0],
      transition: { duration: 0.2 },
    },
  };

  const remainingTime = 30 - battleTime;
  const playerCoreBadge = getCoreBadgeDisplay(state.equippedCore?.type);
  const enemyTier = getEnemyCoreTier(stage);
  const enemyCoreBadge = getCoreBadgeDisplay(currentEnemy?.core?.type, enemyTier);

  // 피버 타임 레벨별 외곽 글로우 아우라 스타일
  let arenaFeverStyle = 'bg-stone-100 border-neutral-900 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)]';
  if (timeMultiplier === 1.5) {
    arenaFeverStyle = 'bg-amber-50/90 border-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.6),inset_0_0_12px_rgba(245,158,11,0.2)]';
  } else if (timeMultiplier === 5.0) {
    arenaFeverStyle = 'bg-orange-50/90 border-orange-500 shadow-[0_0_24px_rgba(249,115,22,0.8),inset_0_0_16px_rgba(249,115,22,0.3)]';
  } else if (timeMultiplier === 10.0) {
    arenaFeverStyle = 'bg-amber-100/90 border-amber-400 shadow-[0_0_32px_rgba(250,204,21,0.9),inset_0_0_20px_rgba(250,204,21,0.4)]';
  } else if (timeMultiplier >= 50.0) {
    arenaFeverStyle = 'bg-yellow-100/95 border-yellow-300 shadow-[0_0_40px_rgba(234,179,8,1),inset_0_0_24px_rgba(234,179,8,0.5)] animate-pulse';
  }

  const playerCoreBorderClass = getCoreBorderClass(state.equippedCore?.type);
  const enemyCoreBorderClass = getCoreBorderClass(currentEnemy?.core?.type);

  const expPercent = Math.min(100, Math.max(0, (player.experience / (player.nextLevelExperience || 1)) * 100));

  return (
    <div className="max-w-md mx-auto p-4 rounded-none border-4 border-neutral-900 bg-stone-200 w-full flex flex-col gap-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] select-none flex-grow">

      {/* ================= 통합 상단 HUD (간결한 2줄 구성) ================= */}
      <div className="bg-stone-100 px-2.5 py-2 rounded-none border-4 border-neutral-900 flex flex-col gap-1.5 w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono text-xs">
        
        {/* [1행] 스테이지 / 최고층 & 레벨/EXP & 얇은 밑줄 경험치바 */}
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between items-center whitespace-nowrap gap-1.5">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-black text-stone-900 tracking-wider">
                STAGE {stage}
              </span>
              {(stage < maxStage || gameStatus === 'DEFEAT') && (
                <span className="font-black text-red-600 text-[11px]">
                  ({maxStage})
                </span>
              )}
              <span className="text-stone-300 text-[10px]">|</span>
              <span className="text-neutral-900 font-bold text-[11px]">Lv.{player.level}</span>
              <span className="text-neutral-500 text-[10px]">
                ({formatNumber(player.experience)}/{formatNumber(player.nextLevelExperience)})
              </span>
            </div>

            {/* 우측 컴팩트 퀵 액션 버튼 (스탯 포인트 - 방치 버튼과 길이 및 스타일 일치) */}
            {onNavigateToStats && (
              player.statPoints > 0 ? (
                <button
                  type="button"
                  onClick={onNavigateToStats}
                  className="bg-stone-200 hover:bg-stone-300 border border-black px-1.5 py-0.5 flex items-center justify-between shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer w-[68px] shrink-0"
                >
                  <span className="text-[9px] font-black text-stone-800 shrink-0">스탯</span>
                  <span className="bg-red-600 text-white text-[8px] px-1 py-0.2 font-black leading-none rounded-none truncate ml-0.5">
                    +{player.statPoints}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onNavigateToStats}
                  className="bg-stone-200/60 hover:bg-stone-200 border border-stone-300 px-1.5 py-0.5 flex items-center justify-between shadow-[inset_1px_1px_0px_rgba(0,0,0,0.06)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer w-[68px] shrink-0"
                >
                  <span className="text-[9px] font-bold text-stone-500 shrink-0">스탯</span>
                  <span className="text-[8px] font-mono text-stone-400 leading-none truncate ml-0.5">0</span>
                </button>
              )
            )}
          </div>

          {/* 레벨 경험치 거의 밑줄처럼 얇은 경험치 바 */}
          <div className="w-full h-[2.5px] bg-stone-300 rounded-none overflow-hidden -mt-0.5 shadow-[inset_0_1px_1px_rgba(0,0,0,0.2)]">
            <div
              className="h-full bg-emerald-500 transition-all duration-200"
              style={{ width: `${expPercent}%` }}
            />
          </div>
        </div>

        {/* [2행] 골드 / 코어 / 상자 / 방치를 한 줄에 4분할 일렬 배치 */}
        <div className="grid grid-cols-4 gap-1 w-full text-[11px]">
          <div className="bg-stone-200/90 border border-stone-400 px-1.5 py-0.5 flex items-center justify-between shadow-[inset_1px_1px_0px_rgba(0,0,0,0.06)] min-w-0">
            <span className="text-[9px] font-bold text-stone-500 shrink-0">골드</span>
            <span className="text-stone-900 font-black truncate ml-1 font-mono text-[10px]">{formatNumber(player.gold)}</span>
          </div>
          <div className="bg-stone-200/90 border border-stone-400 px-1.5 py-0.5 flex items-center justify-between shadow-[inset_1px_1px_0px_rgba(0,0,0,0.06)] min-w-0">
            <span className="text-[9px] font-bold text-stone-500 shrink-0">코어</span>
            <span className="text-cyan-800 font-black truncate ml-1 font-mono text-[10px]">{formatNumber(coreFragments)}</span>
          </div>
          <div className="bg-stone-200/90 border border-stone-400 px-1.5 py-0.5 flex items-center justify-between shadow-[inset_1px_1px_0px_rgba(0,0,0,0.06)] min-w-0">
            <span className="text-[9px] font-bold text-stone-500 shrink-0">상자</span>
            <span className="text-purple-800 font-black truncate ml-1 font-mono text-[10px]">{formatNumber(boxFragments || 0)}</span>
          </div>
          {offlineBanner && offlineBanner.minutes >= 1 ? (
            <button
              type="button"
              onClick={() => setShowOfflineModal(true)}
              className="bg-stone-200 hover:bg-stone-300 border border-black px-1.5 py-0.5 flex items-center justify-between shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer min-w-0"
            >
              <span className="text-[9px] font-black text-stone-800 shrink-0">방치</span>
              <span className="bg-stone-800 text-yellow-300 text-[8px] px-1 py-0.2 font-black leading-none rounded-none truncate ml-0.5 font-mono">
                {formatOfflineTimeShort(offlineBanner.minutes)}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowOfflineModal(true)}
              className="bg-stone-200/60 hover:bg-stone-200 border border-stone-300 px-1.5 py-0.5 flex items-center justify-between shadow-[inset_1px_1px_0px_rgba(0,0,0,0.06)] text-stone-500 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer min-w-0"
            >
              <span className="text-[9px] font-bold shrink-0">방치</span>
              <span className="text-[8px] font-mono text-stone-400">대기</span>
            </button>
          )}
        </div>

      </div>

      {/* ================= 메인 전투 아레나 (일체형 화면) ================= */}
      <div
        className={`px-4 pt-3 pb-4 flex flex-col justify-between border-4 relative overflow-hidden transition-all duration-300 flex-grow min-h-[260px] ${arenaFeverStyle}`}
        style={{
          backgroundImage: 'linear-gradient(to right, #e7e5e4 2px, transparent 2px), linear-gradient(to bottom, #e7e5e4 2px, transparent 2px)',
          backgroundSize: '16px 16px',
        }}
      >

        {/* 피버 등급 상승 스플래시 토스트 연출 */}
        <AnimatePresence>
          {feverToast && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 10 }}
              animate={{ scale: 1.2, opacity: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-black text-amber-400 px-4 py-1 border-2 border-amber-400 font-mono font-black text-xs md:text-sm shadow-[0_0_20px_rgba(251,191,36,0.9)] pointer-events-none whitespace-nowrap"
            >
              {feverToast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 일시정지 상태 안내 뱃지 */}
        {isPaused && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-neutral-950/90 text-amber-300 px-3 py-1 border-2 border-amber-400 font-mono font-black text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 select-none">
            <span>⏸️ 전투 일시정지됨</span>
            <button
              type="button"
              onClick={() => setIsPaused(false)}
              className="px-1.5 py-0.5 bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-black border border-black cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              재개 ▶
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* [전투 화면 상단 일체형 HUD] 최상단 체력바 & 코어 뱃지 라인 높이에 정렬된 타이머 */}
        {/* ----------------------------------------------------------------- */}
        <div className="w-full relative z-30 font-mono pb-1.5 border-b border-neutral-900/20">
          
          {/* 중앙 흐린 워터마크 타이머 (플레이어/적 코어 뱃지 행과 높이 일치) */}
          {gameStatus === 'BATTLE' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex flex-col items-center justify-center select-none">
              <span
                className={`font-mono text-base md:text-lg font-black tracking-tighter leading-none transition-colors duration-300 ${
                  remainingTime <= 10 ? 'text-red-600/50 animate-pulse' : 'text-neutral-950/20'
                }`}
              >
                {remainingTime}
              </span>
              {timeMultiplier > 1.0 && (
                <div className="bg-amber-400/90 text-black text-[7px] font-black px-1 py-0.2 border border-black/80 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.8)] tracking-tight mt-0.5 whitespace-nowrap">
                  FEVER {timeMultiplier}x
                </div>
              )}
            </div>
          )}

          {/* 최상단 좌(플레이어) / 우(에너미) 체력바 & 쉴드 */}
          <div className="grid grid-cols-2 gap-3 w-full relative z-10">
            
            {/* 플레이어 체력 HUD */}
            <div className="flex flex-col items-start select-none w-full min-w-0">
              <div className="text-[11px] font-black flex items-center gap-1 leading-none mb-1 truncate w-full">
                <span className="text-emerald-700">PLAYER</span>
                {playerCoreBadge && (
                  <span className={`px-1 py-0.2 text-[8px] font-bold border leading-none shrink-0 ${playerCoreBadge.color}`}>
                    {playerCoreBadge.label}
                  </span>
                )}
                {isPlayerStunned && <span className="text-yellow-600 text-[10px] font-bold animate-pulse">⚡STUN</span>}
              </div>

              <RetroHpBar
                current={player.currentHealth}
                max={computed.maxHealth}
                shield={playerShield}
                isEnemy={false}
              />

              <div className="flex items-center justify-between w-full mt-1 leading-none gap-1 whitespace-nowrap overflow-hidden">
                <span className="text-[10px] font-black font-mono text-stone-700">
                  {formatNumber(Math.max(0, player.currentHealth))}<span className="text-stone-400 mx-0.5">/</span>{formatNumber(computed.maxHealth)}
                </span>
                {(playerShield || 0) > 0 && (
                  <span className="text-cyan-600 text-[10px] font-black font-mono shrink-0">
                    +{formatNumber(playerShield || 0)}
                  </span>
                )}
              </div>
            </div>

            {/* 에너미 체력 HUD */}
            <div className="flex flex-col items-end select-none w-full min-w-0">
              <div className="text-[11px] font-black leading-none mb-1 truncate w-full text-right flex justify-end items-center gap-1">
                {enemyCoreBadge && (
                  <span className={`px-1 py-0.2 text-[8px] font-bold border leading-none shrink-0 ${enemyCoreBadge.color}`}>
                    {enemyCoreBadge.label}
                  </span>
                )}
                <span className="text-rose-700">ENEMY</span>
              </div>

              <RetroHpBar
                current={currentEnemy?.currentHealth || 0}
                max={currentEnemy?.maxHealth || 1}
                shield={enemyShield}
                isEnemy={true}
              />

              <div className="flex items-center justify-between w-full mt-1 leading-none gap-1 whitespace-nowrap overflow-hidden">
                {(enemyShield || 0) > 0 ? (
                  <span className="text-cyan-600 text-[10px] font-black font-mono shrink-0">
                    +{formatNumber(enemyShield || 0)}
                  </span>
                ) : <span />}
                <span className="text-[10px] font-black font-mono text-stone-700 ml-auto">
                  {formatNumber(Math.max(0, currentEnemy?.currentHealth || 0))}<span className="text-stone-400 mx-0.5">/</span>{formatNumber(currentEnemy?.maxHealth || 1)}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* [전투 화면 하단] 캐릭터 캔버스 및 데미지 팝업 레인 */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex justify-center items-end gap-16 my-auto pt-6 pb-2 z-10 relative">

          {/* 플레이어 캐릭터 & 피격/쉴드 팝업 */}
          <div className="relative z-20">
            <motion.div
              variants={playerVariants}
              animate={playerAnim}
              className={`flex items-center justify-center border-4 ${playerCoreBorderClass} z-20 overflow-hidden bg-stone-300`}
              style={getDynamicBoxStyle(
                {
                  str: computed.finalStr || player.stats.str,
                  dex: computed.finalDex || player.stats.dex,
                  con: computed.finalCon || player.stats.con,
                },
                enemyTotalStats,
                80
              )}
            >
              <div className="flex flex-col items-center justify-center w-full h-full p-1 text-neutral-950 font-mono select-none">
                <div className="flex justify-between w-full px-2 mb-1.5">
                  {playerAnim === 'hit' || playerAnim === 'stunned' ? (
                    <>
                      <span className="text-xs font-black leading-none">&gt;</span>
                      <span className="text-xs font-black leading-none">&lt;</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-neutral-950 block"></span>
                      <span className="w-2 h-2 bg-neutral-950 block"></span>
                    </>
                  )}
                </div>
                <div className={`h-1 bg-neutral-950 transition-all duration-100 ${playerAnim === 'attack' ? 'w-4 bg-red-950' : 'w-2.5'}`}></div>
              </div>
            </motion.div>

            {/* 플레이어 쪽 피격/보호막/회피 팝업 */}
            <AnimatePresence>
              {damagePopups.filter(p => p.type.startsWith('taken') || p.type === 'miss-player' || p.type === 'shield').map((popup) => {
                const isMiss = popup.type === 'miss-player';
                const isShield = popup.type === 'shield';
                const isCore = popup.type === 'taken-core';

                let text = `-${formatNumber(popup.val)}`;
                let colorClass = 'text-rose-600 font-black text-base md:text-lg';
                let xArc = -30;

                if (isMiss) {
                  text = 'MISS';
                  colorClass = 'text-stone-500 italic font-black text-xs md:text-sm';
                  xArc = -15;
                } else if (isShield) {
                  text = `+${formatNumber(popup.val)}`;
                  colorClass = 'text-cyan-600 font-black text-sm md:text-base';
                  xArc = 25;
                } else if (isCore) {
                  colorClass = 'text-purple-600 font-black text-lg md:text-xl';
                  xArc = -35;
                }

                return (
                  <motion.div
                    key={popup.id}
                    initial={{ opacity: 0, y: 0, scale: 0.5, x: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      y: [-2, -18, -30],
                      x: [0, xArc * 0.7, xArc],
                      scale: [0.6, 1.25, 1.0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.75, ease: "easeOut" }}
                    className={`absolute left-1/2 -translate-x-1/2 -top-2 font-mono whitespace-nowrap drop-shadow-[0_1px_1px_rgba(255,255,255,1)] pointer-events-none z-50 ${colorClass}`}
                  >
                    {text}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* 적 캐릭터 & 공격/연격/속성 데미지 팝업 */}
          <div className="relative z-20">
            {currentEnemy ? (
              <motion.div
                variants={enemyVariants}
                animate={enemyAnim}
                className={`flex items-center justify-center border-4 ${enemyCoreBorderClass} bg-stone-400 overflow-hidden`}
                style={getDynamicBoxStyle(currentEnemy.stats, playerTotalStats, 80)}
              >
                <div className="flex flex-col items-center justify-center w-full h-full p-1 text-neutral-900 font-mono select-none">
                  <div className="flex justify-between w-full px-2 mb-1 text-xs font-black leading-none">
                    {enemyAnim === 'hit' ? (
                      <>
                        <span className="text-red-900">✖</span>
                        <span className="text-red-900">✖</span>
                      </>
                    ) : (
                      <>
                        <span>■</span>
                        <span>■</span>
                      </>
                    )}
                  </div>
                  <div className="w-5 h-1 bg-neutral-900 mt-1"></div>
                </div>
              </motion.div>
            ) : (
              <div className="w-[80px] h-[80px] flex items-center justify-center text-neutral-600 italic font-mono">...</div>
            )}

            {/* 적 쪽 타격/연격/속성/회피 팝업 */}
            <AnimatePresence>
              {damagePopups.filter(p => !p.type.startsWith('taken') && p.type !== 'miss-player' && p.type !== 'shield').map((popup) => {
                let colorClass = 'text-amber-600 font-black text-base md:text-lg';
                let text = `-${formatNumber(popup.val)}`;
                let xArc = 35;

                if (popup.isCombo) {
                  text = `⚡COMBO ${popup.comboHits || 2}x! -${formatNumber(popup.val)}`;
                  colorClass = 'text-amber-600 font-black text-base md:text-xl';
                  xArc = 40;
                }

                if (popup.type === 'core') {
                  xArc = 40;

                  if (popup.coreType === 'FIRE') {
                    colorClass = 'text-red-600 font-black text-lg md:text-2xl';
                    text = `🔥 -${formatNumber(popup.val)}`;
                  } else if (popup.coreType === 'WIND') {
                    colorClass = 'text-emerald-600 font-black text-lg md:text-2xl';
                    text = `🍃 -${formatNumber(popup.val)}`;
                  } else if (popup.coreType === 'ELECTRIC') {
                    colorClass = 'text-amber-500 font-black text-lg md:text-2xl';
                    text = `⚡ -${formatNumber(popup.val)}`;
                  } else {
                    colorClass = 'text-blue-600 font-black text-lg md:text-2xl';
                    text = `💧 -${formatNumber(popup.val)}`;
                  }
                } else if (popup.type === 'reflect') {
                  colorClass = 'text-cyan-600 font-black text-sm md:text-base';
                  text = `🌀 -${formatNumber(popup.val)}`;
                  xArc = -25;
                } else if (popup.type === 'miss-enemy') {
                  colorClass = 'text-stone-500 italic font-black text-xs md:text-sm';
                  text = 'MISS';
                  xArc = 15;
                } else if (popup.type === 'one-shot-leap') {
                  colorClass = 'text-cyan-600 font-black text-lg md:text-2xl animate-bounce';
                  text = `ONE-SHOT +${popup.leapedStages || 3}F!`;
                  xArc = 0;
                } else if (popup.type === 'leech' || popup.type === 'enemy-shield') {
                  colorClass = 'text-emerald-600 font-black text-sm md:text-base';
                  text = `+${formatNumber(popup.val)}`;
                  xArc = 25;
                }

                return (
                  <motion.div
                    key={popup.id}
                    initial={{ opacity: 0, y: 0, scale: 0.5, x: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      y: [-2, -18, -30],
                      x: [0, xArc * 0.7, xArc],
                      scale: [0.6, 1.3, 1.0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.75, ease: "easeOut" }}
                    className={`absolute left-1/2 -translate-x-1/2 -top-2 font-mono whitespace-nowrap drop-shadow-[0_1px_1px_rgba(255,255,255,1)] pointer-events-none z-50 ${colorClass}`}
                  >
                    {text}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* 게임 오버 모달 (10층 전 후퇴 안내) */}
        {gameStatus === 'DEFEAT' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50 pointer-events-none backdrop-blur-xs">
            <h2 className="text-4xl md:text-5xl font-black text-red-500 mb-2 animate-pulse font-mono tracking-widest drop-shadow-[0_4px_2px_rgba(0,0,0,1)]">
              GAME OVER
            </h2>
            <p className="text-white text-sm md:text-base font-bold mb-1 drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
              {defeatReason === 'TIMEOUT' ? '시간이 초과되었습니다!' : '전투에서 패배했습니다!'}
            </p>
            <p className="text-red-400 text-xs font-mono font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,1)] mb-1.5">
              도달 스테이지: STAGE {maxStage || stage}
            </p>
            <p className="text-yellow-300 text-xs font-mono font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
              잠시 후 10층 전 (STAGE {Math.max(1, stage - 10)})으로 이동하여 재정비합니다...
            </p>
          </div>
        )}
      </div>

      {/* 전투 로그 레인 */}
      <div className="bg-neutral-950 p-2 rounded-none border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] select-text">
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-800 text-[10px] font-mono select-none">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-neutral-400">전투 로그</span>
            {isPaused && (
              <span className="bg-amber-400 text-neutral-950 text-[9px] font-black px-1.5 py-0.2 animate-pulse">
                PAUSED (정지됨)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyLog}
              className={`px-1.5 py-0.5 border text-[9px] font-bold cursor-pointer transition-colors ${
                copiedToast
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
              }`}
            >
              {copiedToast ? '✅ 복사완료' : '전체복사 📋'}
            </button>
            <button
              type="button"
              onClick={() => setIsLogExpanded(!isLogExpanded)}
              className="px-1.5 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 text-[9px] font-bold cursor-pointer transition-colors"
            >
              {isLogExpanded ? '축소 ▲' : '확대 🔍'}
            </button>
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className={`px-2 py-0.5 border text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 ${
                isPaused
                  ? 'bg-amber-400 hover:bg-amber-300 text-neutral-950 border-amber-300 ring-2 ring-amber-400/50'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-stone-200 border-neutral-600'
              }`}
            >
              {isPaused ? '▶️ 전투 재개' : '⏸️ 일시정지'}
            </button>
          </div>
        </div>
        <div
          ref={logContainerRef}
          className={`overflow-y-auto custom-scrollbar text-[10px] font-mono text-neutral-200 text-left select-text cursor-text selection:bg-amber-400 selection:text-black transition-all duration-200 ${isLogExpanded ? 'h-48' : 'h-20'}`}
        >
          {damageLog.map((entry) => (
            <div key={entry.id} className="leading-tight py-0.5 select-text selection:bg-amber-400 selection:text-black">
              {entry.message}
            </div>
          ))}
        </div>
      </div>

      {/* 하단 상세 스탯 접기/펼치기 Accordion */}
      <div className="flex flex-col bg-neutral-950 rounded-none border-4 border-neutral-950 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <button
          type="button"
          onClick={() => setShowStats(!showStats)}
          className="w-full py-1.5 bg-neutral-900/90 hover:bg-neutral-800 text-[11px] font-mono font-bold text-neutral-400 hover:text-neutral-200 transition-colors duration-150 flex items-center justify-center gap-1 border-b-2 border-neutral-950 cursor-pointer"
        >
          {showStats ? '상세 스탯 접기 ▲' : '상세 스탯 보기 ▼'}
        </button>

        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-0.5 text-[11px] font-mono bg-neutral-900">
                {[
                  { label: '공격력', pValue: formatNumber(computed.attack), eValue: enemyComputed ? formatNumber(enemyComputed.attack) : '-' },
                  { label: '방어력', pValue: formatNumber(computed.defense), eValue: enemyComputed ? formatNumber(enemyComputed.defense) : '-' },
                  { label: '최대체력', pValue: formatNumber(computed.maxHealth), eValue: currentEnemy ? formatNumber(currentEnemy.maxHealth) : '-' },
                  { label: '공격속도', pValue: `${computed.attackSpeed.toFixed(1)}/s`, eValue: `${enemyAttackSpeed.toFixed(1)}/s` },
                  { label: '명중력', pValue: formatNumber(computed.accuracy), eValue: enemyComputed ? formatNumber(enemyComputed.accuracy) : '-' },
                  { label: '회피력', pValue: formatNumber(computed.evasion), eValue: enemyComputed ? formatNumber(enemyComputed.evasion) : '-' },
                  { label: '힘 (STR)', pValue: formatNumber(computed.finalStr), eValue: enemyComputed ? formatNumber(enemyComputed.finalStr) : (currentEnemy ? formatNumber(currentEnemy.stats.str) : '-') },
                  { label: '민첩 (DEX)', pValue: formatNumber(computed.finalDex), eValue: enemyComputed ? formatNumber(enemyComputed.finalDex) : (currentEnemy ? formatNumber(currentEnemy.stats.dex) : '-') },
                  { label: '체력 (CON)', pValue: formatNumber(computed.finalCon), eValue: enemyComputed ? formatNumber(enemyComputed.finalCon) : (currentEnemy ? formatNumber(currentEnemy.stats.con) : '-') },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between items-center py-0.5 border-b border-neutral-950/50"
                  >
                    <span className="font-bold text-green-400 w-14 text-left">{item.pValue}</span>
                    <span className="text-neutral-500 font-sans text-center flex-1 text-[10px] tracking-tight">{item.label}</span>
                    <span className="font-bold text-red-400 w-14 text-right">{item.eValue ?? '-'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================= 방치 보상 팝업 모달 ================= */}
      <AnimatePresence>
        {showOfflineModal && (() => {
          const currentRewards = offlineBanner || state.calculateOfflineRewards();
          const currentMinutes = currentRewards?.minutes || 0;
          const currentGold = currentRewards?.gold || 0;
          const currentExp = currentRewards?.exp || 0;
          const currentLevels = currentRewards?.levelsGained || 0;
          const progressPercent = Math.min(100, (currentMinutes / 720) * 100);

          return (
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
                      📦 오프라인 방치 보상
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-neutral-900 text-yellow-300 px-2 py-0.5 border border-neutral-800">
                    최대 12시간
                  </span>
                </div>

                {/* 누적 시간 & 최대 시간 진행도 카드 */}
                <div className="bg-stone-200 border-2 border-stone-400 p-2.5 flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-stone-600 font-bold">누적 방치 시간</span>
                    <span className="text-stone-950 font-black text-sm md:text-base font-mono">
                      {formatOfflineTime(currentMinutes)}
                    </span>
                  </div>

                  {/* 프로그레스 바 (최대 12시간 = 720분) */}
                  <div className="w-full bg-stone-300 h-2.5 border border-stone-500 overflow-hidden shadow-inner">
                    <div
                      className="bg-amber-400 h-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-stone-600 font-mono font-bold">
                    <span>누적 {progressPercent.toFixed(1)}%</span>
                    <span className="text-stone-800">최대 12시간 (720분)</span>
                  </div>
                </div>

                {/* 획득 가능한 보상 내역 */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-stone-200/90 border border-stone-400 p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-stone-500 font-bold mb-0.5">획득 골드</span>
                    <span className="text-amber-700 font-black text-sm font-mono">
                      +{formatNumber(currentGold)} G
                    </span>
                  </div>
                  <div className="bg-stone-200/90 border border-stone-400 p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-stone-500 font-bold mb-0.5">획득 경험치</span>
                    <span className="text-emerald-700 font-black text-sm font-mono">
                      +{formatNumber(currentExp)} EXP
                    </span>
                  </div>
                </div>

                {currentLevels > 0 && (
                  <div className="bg-emerald-100 border border-emerald-500 text-emerald-800 text-[11px] font-bold p-1.5 text-center font-mono">
                    🎉 레벨업: +{currentLevels} Lv (스탯 포인트 +{currentLevels * 3})
                  </div>
                )}

                <div className="bg-stone-200/70 border border-stone-300 p-2 text-[10px] text-stone-600 leading-relaxed text-center">
                  오프라인 방치 보상은 게임 종료 및 자리비움 시 <span className="font-bold text-stone-900">최대 12시간</span>까지 자동으로 누적됩니다.
                </div>

                {/* 하단 버튼 액션 */}
                <div className="flex gap-2 pt-1 border-t-2 border-neutral-900">
                  <button
                    type="button"
                    onClick={() => setShowOfflineModal(false)}
                    className="flex-1 py-1.5 bg-stone-300 hover:bg-stone-400 border-2 border-neutral-900 text-stone-800 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    disabled={currentMinutes < 1}
                    onClick={handleClaimBannerRewards}
                    className={`flex-1 py-1.5 font-black text-xs border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer ${
                      currentMinutes >= 1
                        ? 'bg-yellow-400 hover:bg-yellow-300 text-neutral-950'
                        : 'bg-stone-300 text-stone-400 border-stone-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {currentMinutes >= 1 ? '보상 수령하기' : '누적 시간 부족 (최소 1분)'}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
};

export default AnimatedBattleScreen;
