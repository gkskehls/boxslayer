// src/components/AnimatedBattleScreen.tsx

import React, { useEffect, useState } from 'react';
import { useGameStore, getComputedStats } from '../store/gameStore';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { CoreType } from '../types/game';
import { formatNumber } from '../utils/format';

const getDynamicStyle = (stats: { str: number; dex: number; con: number }, isPlayer: boolean, baseSize: number = 80) => {
  const { str, dex, con } = stats;
  const S = (str || 0) + (dex || 0) + (con || 0) || 1;

  const r = Math.floor((str / S) * 255);
  const g = Math.floor((dex / S) * 255);
  const b = Math.floor((con / S) * 255);

  let size = baseSize;

  if (!isPlayer) {
    const averageEnemyS = 100;
    const ratio = S / averageEnemyS;
    size = Math.max(64, Math.min(96, baseSize * Math.sqrt(ratio)));
  }

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '0px',
  };
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
      <div className="relative w-full h-3.5 bg-neutral-950 border-2 border-black overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)]">
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

interface LogEntry {
  id: string;
  message: React.ReactNode;
}

interface DamagePopup {
  id: string;
  val: number;
  type: 'normal' | 'core' | 'reflect' | 'taken' | 'taken-core' | 'miss-enemy' | 'miss-player' | 'shield' | 'enemy-shield' | 'leech';
  coreType?: string;
  isCombo?: boolean;
  comboHits?: number;
}

let uniquePopupCounter = 0;
const getUniqueId = (): string => {
  uniquePopupCounter = (uniquePopupCounter + 1) % 10000000;
  return `${Date.now()}_${uniquePopupCounter}_${Math.random().toString(36).substring(2, 7)}`;
};

const getCoreBadgeDisplay = (type?: CoreType) => {
  if (!type) return null;
  switch (type) {
    case 'FIRE': return { label: '🔥화염', color: 'bg-red-600 text-white border-red-950' };
    case 'WATER': return { label: '💧빙결', color: 'bg-blue-600 text-white border-blue-950' };
    case 'WIND': return { label: '🍃질풍', color: 'bg-green-600 text-white border-green-950' };
    case 'ELECTRIC': return { label: '⚡뇌전', color: 'bg-yellow-400 text-black border-yellow-800' };
    default: return null;
  }
};

const AnimatedBattleScreen: React.FC = () => {
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
    spawnEnemy,
    attackEnemy,
    attackPlayer,
    retryCurrentFloor,
    setDefeat,
  } = state;

  const [isPlayerStunned, setIsPlayerStunned] = useState(false);

  useEffect(() => {
    const checkStun = () => {
      setIsPlayerStunned(Boolean(playerStunEndTime && playerStunEndTime > Date.now()));
    };
    checkStun();
    const interval = setInterval(checkStun, 200);
    return () => clearInterval(interval);
  }, [playerStunEndTime]);

  const computed = getComputedStats(player.stats, useGameStore.getState().unlockedSkills);
  const currentEnemyId = currentEnemy?.id;
  const enemyComputed = currentEnemy ? getComputedStats(currentEnemy.stats) : null;
  const enemyAttackSpeed = enemyComputed?.attackSpeed ?? 1;

  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit' | 'stunned'>('idle');
  const [enemyAnim, setEnemyAnim] = useState<'idle' | 'attack' | 'hit'>('idle');

  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [damageLog, setDamageLog] = useState<LogEntry[]>([]);
  const [battleTime, setBattleTime] = useState(0);
  const [timeMultiplier, setTimeMultiplier] = useState(1);
  const [feverToast, setFeverToast] = useState<string | null>(null);
  const [turn, setTurn] = useState(1);

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
        setTimeMultiplier(1);
        setTurn(1);
        setFeverToast(null);
      });
    }
  }, [gameStatus]);

  useEffect(() => {
    let timer: number;
    if (gameStatus === 'BATTLE') {
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
  }, [gameStatus, setDefeat]);

  // 피버 타임 배속 단계 및 토스트 알림 연출
  useEffect(() => {
    if (gameStatus !== 'BATTLE') return;

    const timeout1 = setTimeout(() => {
      setTimeMultiplier(1.5);
      showFeverToast('🔥 1.5x FEVER!');
    }, 5000);

    const timeout2 = setTimeout(() => {
      setTimeMultiplier(5.0);
      showFeverToast('🔥 5.0x FEVER!');
    }, 10000);

    const timeout3 = setTimeout(() => {
      setTimeMultiplier(10.0);
      showFeverToast('⚡ 10.0x SUPER FEVER!');
    }, 15000);

    const timeout4 = setTimeout(() => {
      setTimeMultiplier(50.0);
      showFeverToast('💥 50.0x HYPER FEVER!');
    }, 20000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      clearTimeout(timeout4);
    };
  }, [gameStatus]);


  useEffect(() => {
    if (gameStatus === 'IDLE') {
      queueMicrotask(() => {
        spawnEnemy();
        setTurn(1);
      });
    }

    let playerAttackTimer: number;
    let enemyAttackTimer: number;

    if (gameStatus === 'BATTLE' && currentEnemyId) {
      playerAttackTimer = window.setInterval(() => {
        setPlayerAnim('attack');
        setTimeout(() => setEnemyAnim('hit'), 100);
        setTimeout(() => setPlayerAnim('idle'), 250);
        setTimeout(() => setEnemyAnim('idle'), 400);
        attackEnemy();
      }, 1000 / (computed.attackSpeed * timeMultiplier));

      enemyAttackTimer = window.setInterval(() => {
        setEnemyAnim('attack');
        setTimeout(() => setPlayerAnim('hit'), 100);
        setTimeout(() => setEnemyAnim('idle'), 250);
        setTimeout(() => setPlayerAnim('idle'), 400);
        attackPlayer();
        setTurn(t => t + 1);
      }, 1000 / (enemyAttackSpeed * timeMultiplier));
    }

    return () => {
      clearInterval(playerAttackTimer);
      clearInterval(enemyAttackTimer);
    };
  }, [gameStatus, currentEnemyId, computed.attackSpeed, enemyAttackSpeed, spawnEnemy, attackEnemy, attackPlayer, timeMultiplier]);

  const addLog = (message: React.ReactNode) => {
    queueMicrotask(() => {
      setDamageLog(prev => [{ id: getUniqueId(), message }, ...prev.slice(0, 49)]);
    });
  };

  useEffect(() => {
    if (lastDamageDealt || (lastEnemyEvadedTime ?? 0) > 0) {
      const { normal = 0, core = 0, shieldRecovered = 0 } = lastDamageDealt || { normal: 0, core: 0, shieldRecovered: 0 };
      const isMiss = (lastEnemyEvadedTime ?? 0) > 0;

      if (normal > 0) {
        const popup: DamagePopup = {
          id: getUniqueId(),
          val: normal,
          type: 'normal',
          isCombo: lastDamageDealt?.isCombo,
          comboHits: lastDamageDealt?.comboHits,
        };
        queueMicrotask(() => {
          setDamagePopups(prev => [...prev, popup]);
        });
        setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 900);
      }
      if (core > 0) {
        const popup: DamagePopup = {
          id: getUniqueId(),
          val: core,
          type: 'core',
          coreType: useGameStore.getState().equippedCore?.type,
        };
        setTimeout(() => {
          setDamagePopups(prev => [...prev, popup]);
          setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 900);
        }, 120);
      }
      if (shieldRecovered > 0) {
        const popup: DamagePopup = { id: getUniqueId(), val: shieldRecovered, type: 'shield' };
        setTimeout(() => {
          setDamagePopups(prev => [...prev, popup]);
          setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 900);
        }, 120);
      }
      if (isMiss) {
        const popup: DamagePopup = { id: getUniqueId(), val: 0, type: 'miss-enemy' };
        queueMicrotask(() => {
          setDamagePopups(prev => [...prev, popup]);
        });
        setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 900);
      }

      if (isMiss) {
        addLog(
            <span>
            <span className="text-blue-500">[S{stage}-{turn}] P: </span>
            <span className="text-yellow-400 italic">회피</span>
              {shieldRecovered > 0 && <span className="text-green-500 ml-1">(쉴드 +{formatNumber(shieldRecovered)})</span>}
          </span>
        );
      } else if (normal > 0 || core > 0 || shieldRecovered > 0) {
        const damageParts = [];
        if (normal > 0) {
          if (lastDamageDealt?.isCombo) {
            damageParts.push(
                <span key="n" className="text-amber-400 font-bold animate-pulse">
                ⚡연격({lastDamageDealt.comboHits || 2}히트) {formatNumber(normal)}
              </span>
            );
          } else {
            damageParts.push(<span key="n" className="text-blue-400">일반 {formatNumber(normal)}</span>);
          }
        }
        if (core > 0) damageParts.push(<span key="c" className="text-orange-500">코어 {formatNumber(core)}</span>);

        addLog(
            <span>
            <span className="text-blue-500">[S{stage}-{turn}] P: </span>
              {damageParts.map((part, i) => <React.Fragment key={i}>{i > 0 && ' / '}{part}</React.Fragment>)}
              {shieldRecovered > 0 && <span className="text-green-500 ml-1">(쉴드 +{formatNumber(shieldRecovered)})</span>}
          </span>
        );
      }
    }

    if (lastDamageTaken && (lastDamageTaken.normal > 0 || lastDamageTaken.core > 0)) {
      const { normal, core } = lastDamageTaken;
      if (normal > 0) {
        const popup: DamagePopup = { id: getUniqueId(), val: normal, type: 'taken' };
        queueMicrotask(() => {
          setDamagePopups(prev => [...prev, popup]);
        });
        setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 900);
      }
      if (core > 0) {
        const popup: DamagePopup = { id: getUniqueId(), val: core, type: 'taken-core' };
        setTimeout(() => {
          setDamagePopups(prev => [...prev, popup]);
          setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 900);
        }, 120);
      }

      const damageParts = [];
      if (normal > 0) damageParts.push(<span key="n" className="text-red-400">일반 {formatNumber(normal)}</span>);
      if (core > 0) damageParts.push(<span key="c" className="text-purple-500">코어 {formatNumber(core)}</span>);

      const reflectionText = (lastReflectedDamage ?? 0) > 0 ? <span className="text-cyan-400 ml-1">(반사 {formatNumber(lastReflectedDamage || 0)})</span> : '';
      const leechText = (lastLeechedHealth ?? 0) > 0 ? <span className="text-green-400 ml-1">(흡수 {formatNumber(lastLeechedHealth || 0)})</span> : '';
      const enemyShieldText = (lastEnemyShieldRecovered ?? 0) > 0 ? <span className="text-blue-400 ml-1">(적 쉴드 +{formatNumber(lastEnemyShieldRecovered || 0)})</span> : '';

      addLog(
          <span>
          <span className="text-red-500">[S{stage}-{turn}] E: </span>
            {damageParts.map((part, i) => <React.Fragment key={i}>{i > 0 && ' / '}{part}</React.Fragment>)}
            {reflectionText}
            {leechText}
            {enemyShieldText}
        </span>
      );
    }

    if (lastEnemyShieldRecovered && lastEnemyShieldRecovered > 0) {
      const popup: DamagePopup = { id: getUniqueId(), val: lastEnemyShieldRecovered, type: 'enemy-shield' };
      setTimeout(() => {
        setDamagePopups(prev => [...prev, popup]);
        setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 900);
      }, 150);
    }

    if ((lastPlayerEvadedTime ?? 0) > 0) {
      const popup: DamagePopup = { id: getUniqueId(), val: 0, type: 'miss-player' };
      setTimeout(() => {
        setDamagePopups(prev => [...prev, popup]);
        setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 900);
      }, 120);
      addLog(
          <span>
          <span className="text-red-500">[S{stage}-{turn}] E: </span>
          <span className="text-yellow-400 italic">회피</span>
        </span>
      );
    }

  }, [lastDamageDealt, lastDamageTaken, lastReflectedDamage, lastLeechedHealth, lastEnemyShieldRecovered, lastEnemyEvadedTime, lastPlayerEvadedTime, stage, turn]);

  useEffect(() => {
    if (gameStatus === 'VICTORY') {
      const timer = setTimeout(() => spawnEnemy(), 1000);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, spawnEnemy]);

  useEffect(() => {
    if (gameStatus === 'DEFEAT') {
      const timer = setTimeout(() => retryCurrentFloor(), 3000);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, retryCurrentFloor]);

  const playerVariants: Variants = {
    idle: { y: [0, -6, 0], transition: { repeat: Infinity, duration: 2, ease: "easeInOut" } },
    attack: { x: [0, 50, 0], transition: { duration: 0.22, times: [0, 0.4, 1] } },
    hit: { x: [-12, 12, -8, 6, 0], filter: ["brightness(1)", "brightness(2) contrast(1.5)", "brightness(1)"], transition: { duration: 0.25 } },
    stunned: { rotate: [0, -2, 2, -2, 2, 0], transition: { duration: 0.5, repeat: Infinity } },
  };

  const enemyVariants: Variants = {
    idle: { y: [0, -6, 0], transition: { repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 } },
    attack: { x: [0, -50, 0], transition: { duration: 0.22, times: [0, 0.4, 1] } },
    hit: { x: [12, -12, 8, -6, 0], filter: ["brightness(1)", "brightness(2) contrast(1.5)", "brightness(1)"], transition: { duration: 0.25 } }
  };

  const statComparisonList = [
    {
      label: '힘 (STR)',
      pValue: computed.skillBonusStats.str > 0 ? `${player.stats.str} (+${computed.skillBonusStats.str})` : player.stats.str,
      eValue: currentEnemy?.stats.str
    },
    {
      label: '민첩 (DEX)',
      pValue: computed.skillBonusStats.dex > 0 ? `${player.stats.dex} (+${computed.skillBonusStats.dex})` : player.stats.dex,
      eValue: currentEnemy?.stats.dex
    },
    {
      label: '체력 (CON)',
      pValue: computed.skillBonusStats.con > 0 ? `${player.stats.con} (+${computed.skillBonusStats.con})` : player.stats.con,
      eValue: currentEnemy?.stats.con
    },
    { label: '공격력', pValue: formatNumber(computed.attack), eValue: enemyComputed ? formatNumber(enemyComputed.attack) : undefined },
    { label: '방어력', pValue: formatNumber(computed.defense), eValue: enemyComputed ? formatNumber(enemyComputed.defense) : undefined },
    { label: '공격속도', pValue: `${computed.attackSpeed.toFixed(1)}/s`, eValue: enemyComputed ? `${enemyComputed.attackSpeed.toFixed(1)}/s` : undefined },
    { label: '최대체력', pValue: formatNumber(computed.maxHealth), eValue: currentEnemy?.maxHealth ? formatNumber(currentEnemy.maxHealth) : '-' },
    { label: '명중', pValue: formatNumber(computed.accuracy), eValue: enemyComputed ? formatNumber(enemyComputed.accuracy) : undefined },
    { label: '회피', pValue: formatNumber(computed.evasion), eValue: enemyComputed ? formatNumber(enemyComputed.evasion) : undefined },
  ];

  const remainingTime = 30 - battleTime;
  const playerCoreBadge = getCoreBadgeDisplay(state.equippedCore?.type);
  const enemyCoreBadge = getCoreBadgeDisplay(currentEnemy?.core?.type);

  // 피버 타임 레벨별 외곽 글로우 아우라 스타일에 적용할 Tailwind 클래스
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

  return (
      <div className="max-w-md mx-auto p-4 rounded-none border-4 border-neutral-900 bg-stone-200 w-full flex flex-col gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] select-none flex-grow">

        {/* 헤더: 스테이지 정보 및 레벨/EXP 정보 */}
        <div className="bg-stone-100 p-2.5 rounded-none border-4 border-neutral-900 flex flex-col gap-1.5 w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-yellow-600 leading-none flex items-center gap-2 font-mono">
              STAGE {stage}
              {(maxStage || 1) > stage && (
                  <span className="text-red-500 text-sm">({maxStage})</span>
              )}
            </h2>
            {player.statPoints > 0 && (
                <span className="bg-green-950 text-green-400 px-2 py-0.5 rounded-none text-[10px] font-bold border-2 border-green-600 animate-pulse">
              잔여 스탯: {formatNumber(player.statPoints)}
            </span>
            )}
          </div>

          <div className="flex justify-between items-center font-mono text-xs font-bold pt-1 border-t border-stone-300/80">
            <span className="text-neutral-900">Lv. {player.level}</span>
            <div className="flex items-center gap-2">
            <span className="text-blue-600 tracking-wider text-[11px]">
              EXP
            </span>
              <span className="text-[10px] text-neutral-800 font-black font-mono">
              {formatNumber(player.experience)} / {formatNumber(player.nextLevelExperience)}
            </span>
            </div>
          </div>
        </div>

        {/* 메인 전투 무대 (전투 구역 + 피버 아우라) */}
        <div
            className={`px-5 pt-3 pb-2 flex flex-col border-4 relative overflow-hidden transition-all duration-300 flex-grow ${arenaFeverStyle}`}
            style={{
              backgroundImage: 'linear-gradient(to right, #e7e5e4 2px, transparent 2px), linear-gradient(to bottom, #e7e5e4 2px, transparent 2px)',
              backgroundSize: '16px 16px',
            }}
        >

          {/* 상단 타이머 & 피버 상태 뱃지 */}
          {gameStatus === 'BATTLE' && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30 pointer-events-none">
                <div className={`font-mono text-2xl font-black transition-colors duration-300 ${remainingTime <= 10 ? 'text-red-600 animate-pulse' : 'text-stone-600'}`}>
                  ⏱️{remainingTime}s
                </div>
                {timeMultiplier > 1.0 && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-amber-400 text-black text-xs font-black px-2.5 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-mono tracking-tight flex items-center gap-1"
                    >
                      <span className="animate-pulse">🔥</span>
                      <span>FEVER {timeMultiplier}x SPEED</span>
                    </motion.div>
                )}
              </div>
          )}

          {/* 피버 등급 상승 스플래시 토스트 연출 */}
          <AnimatePresence>
            {feverToast && (
                <motion.div
                    initial={{ scale: 0.5, opacity: 0, y: 10 }}
                    animate={{ scale: 1.2, opacity: 1, y: 0 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-black text-amber-400 px-4 py-1.5 border-4 border-amber-400 font-mono font-black text-sm md:text-base shadow-[0_0_20px_rgba(251,191,36,0.9)] pointer-events-none whitespace-nowrap"
                >
                  {feverToast}
                </motion.div>
            )}
          </AnimatePresence>

          {/* ----------------------------------------------------------------- */}
          {/* [리뉴얼 1] 통합 체력바 & 스탯 HUD (Player / Enemy Status Window) */}
          {/* ----------------------------------------------------------------- */}
          <div className="grid grid-cols-2 gap-3 w-full relative z-30 font-mono p-2.5 border-4 border-black bg-stone-900 text-stone-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">

            {/* 플레이어 HUD */}
            <div className="flex flex-col items-start select-none w-full min-w-0">
              <div className="text-[11px] font-black flex items-center gap-1.5 leading-none mb-1.5 truncate w-full">
                <span className="text-emerald-400">PLAYER</span>
                {playerCoreBadge && (
                    <span className={`px-1 py-0.5 text-[9px] font-bold border leading-none shrink-0 ${playerCoreBadge.color} shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`}>
                  {playerCoreBadge.label}
                </span>
                )}
                {isPlayerStunned && <span className="text-yellow-400 text-xs font-bold animate-pulse">⚡STUN</span>}
              </div>

              {/* 픽셀 HP 게이지 바 & 쉴드 덧띠 */}
              <RetroHpBar
                  current={player.currentHealth}
                  max={computed.maxHealth}
                  shield={playerShield}
                  isEnemy={false}
              />

              {/* 체력 / 보호막 수치 */}
              <div className="flex items-center justify-between w-full mt-1.5 leading-none">
              <span className="text-[10px] font-black font-mono text-stone-200">
                {formatNumber(Math.max(0, player.currentHealth))} <span className="text-stone-500">/</span> {formatNumber(computed.maxHealth)}
              </span>
                {(playerShield || 0) > 0 && (
                    <span className="text-cyan-400 text-[10px] font-black font-mono">
                  🛡️+{formatNumber(playerShield || 0)}
                </span>
                )}
              </div>
            </div>

            {/* 적 HUD */}
            <div className="flex flex-col items-end select-none w-full min-w-0">
              <div className="text-[11px] font-black leading-none mb-1.5 truncate w-full text-right flex justify-end items-center gap-1.5">
                {enemyCoreBadge && (
                    <span className={`px-1 py-0.5 text-[9px] font-bold border leading-none shrink-0 ${enemyCoreBadge.color} shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`}>
                  {enemyCoreBadge.label}
                </span>
                )}
                <span className="text-rose-400">ENEMY</span>
              </div>

              {/* 픽셀 HP 게이지 바 & 쉴드 덧띠 */}
              <RetroHpBar
                  current={currentEnemy?.currentHealth || 0}
                  max={currentEnemy?.maxHealth || 1}
                  shield={enemyShield}
                  isEnemy={true}
              />

              {/* 체력 / 보호막 수치 */}
              <div className="flex items-center justify-between w-full mt-1.5 leading-none">
                {(enemyShield || 0) > 0 && (
                    <span className="text-cyan-400 text-[10px] font-black font-mono">
                  🛡️+{formatNumber(enemyShield || 0)}
                </span>
                )}
                <span className="text-[10px] font-black font-mono text-stone-200 ml-auto">
                {formatNumber(Math.max(0, currentEnemy?.currentHealth || 0))} <span className="text-stone-500">/</span> {formatNumber(currentEnemy?.maxHealth || 1)}
              </span>
              </div>
            </div>

          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 캐릭터 캔버스 및 데미지 팝업 레인 */}
          {/* ----------------------------------------------------------------- */}
          <div className="flex justify-center items-end gap-16 mt-8 pb-3 z-10 relative">

            {/* 플레이어 캐릭터 & 피격/쉴드 팝업 */}
            <div className="relative z-20">
              <motion.div
                  variants={playerVariants}
                  animate={playerAnim}
                  className="flex items-center justify-center border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20 overflow-hidden"
                  style={getDynamicStyle(player.stats, true, 80)}
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
                  let colorClass = 'text-rose-500 font-black text-base md:text-lg';
                  let xArc = -25;

                  if (isMiss) {
                    text = 'MISS';
                    colorClass = 'text-stone-300 italic font-black text-xs md:text-sm';
                    xArc = -10;
                  } else if (isShield) {
                    text = `🛡️ +${formatNumber(popup.val)}`;
                    colorClass = 'text-cyan-300 font-black text-sm md:text-base';
                    xArc = 20;
                  } else if (isCore) {
                    colorClass = 'text-purple-400 font-black text-lg md:text-xl';
                    xArc = 25;
                  }

                  return (
                      <motion.div
                          key={popup.id}
                          initial={{ opacity: 0, y: 0, scale: 0.5, x: 0 }}
                          animate={{
                            opacity: [0, 1, 1, 0],
                            y: [-5, -45, -60],
                            x: [0, xArc * 0.7, xArc],
                            scale: [0.6, 1.25, 1.0],
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.75, ease: "easeOut" }}
                          className={`absolute left-1/2 -translate-x-1/2 -top-4 font-mono whitespace-nowrap drop-shadow-[0_2px_0px_rgba(0,0,0,1)] pointer-events-none z-40 ${colorClass}`}
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
                      className="flex items-center justify-center border-4 border-neutral-950 bg-stone-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
                      style={getDynamicStyle(currentEnemy.stats, false, 80)}
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
                  let colorClass = 'text-amber-300 font-black text-base md:text-lg';
                  let text = `-${formatNumber(popup.val)}`;
                  let xArc = 25;

                  if (popup.isCombo) {
                    text = `⚡COMBO ${popup.comboHits || 2}x! -${formatNumber(popup.val)}`;
                    colorClass = 'text-amber-300 font-black text-base md:text-xl';
                    xArc = 30;
                  }

                  if (popup.type === 'core') {
                    xArc = 30;

                    if (popup.coreType === 'FIRE') {
                      colorClass = 'text-red-500 font-black text-lg md:text-2xl';
                      text = `🔥 -${formatNumber(popup.val)}`;
                    } else if (popup.coreType === 'WIND') {
                      colorClass = 'text-green-400 font-black text-lg md:text-2xl';
                      text = `🍃 -${formatNumber(popup.val)}`;
                    } else if (popup.coreType === 'ELECTRIC') {
                      colorClass = 'text-yellow-300 font-black text-lg md:text-2xl';
                      text = `⚡ -${formatNumber(popup.val)}`;
                    } else {
                      colorClass = 'text-orange-400 font-black text-lg md:text-2xl';
                      text = `💧 -${formatNumber(popup.val)}`;
                    }
                  } else if (popup.type === 'reflect') {
                    colorClass = 'text-cyan-300 font-black text-sm md:text-base';
                    text = `🌀 -${formatNumber(popup.val)}`;
                    xArc = -20;
                  } else if (popup.type === 'miss-enemy') {
                    colorClass = 'text-stone-300 italic font-black text-xs md:text-sm';
                    text = 'MISS';
                    xArc = 10;
                  } else if (popup.type === 'leech' || popup.type === 'enemy-shield') {
                    colorClass = 'text-emerald-400 font-black text-sm md:text-base';
                    text = `+${formatNumber(popup.val)}`;
                    xArc = 20;
                  }

                  return (
                      <motion.div
                          key={popup.id}
                          initial={{ opacity: 0, y: 0, scale: 0.5, x: 0 }}
                          animate={{
                            opacity: [0, 1, 1, 0],
                            y: [-5, -45, -60],
                            x: [0, xArc * 0.7, xArc],
                            scale: [0.6, 1.3, 1.0],
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.75, ease: "easeOut" }}
                          className={`absolute left-1/2 -translate-x-1/2 -top-4 font-mono whitespace-nowrap drop-shadow-[0_2px_0px_rgba(0,0,0,1)] pointer-events-none z-40 ${colorClass}`}
                      >
                        {text}
                      </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* 게임 오버 모달 */}
          {gameStatus === 'DEFEAT' && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50 pointer-events-none backdrop-blur-xs">
                <h2 className="text-5xl md:text-6xl font-black text-red-500 mb-4 animate-pulse font-mono tracking-widest drop-shadow-[0_4px_2px_rgba(0,0,0,1)]">GAME OVER</h2>
                <p className="text-white text-base md:text-lg font-bold mb-2 drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
                  {defeatReason === 'TIMEOUT' ? '시간이 초과되었습니다!' : '전투에서 패배했습니다!'}
                </p>
                <p className="text-neutral-300 text-xs font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">잠시 후 이전 층으로 돌아갑니다...</p>
              </div>
          )}
        </div>

        {/* 전투 로그 레인 */}
        <div className="bg-neutral-950 p-2 rounded-none border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="h-24 overflow-y-auto custom-scrollbar text-[10px] font-mono text-neutral-200 text-left">
            {damageLog.map((entry) => (
                <div key={entry.id} className="leading-tight">
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
              className="w-full py-2 bg-neutral-900/90 hover:bg-neutral-800 text-[11px] font-mono font-bold text-neutral-400 hover:text-neutral-200 transition-colors duration-150 flex items-center justify-center gap-1 border-b-2 border-neutral-950 cursor-pointer"
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
                    {statComparisonList.map((item) => (
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

      </div>
  );
};

export default AnimatedBattleScreen;
