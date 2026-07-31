// src/components/AnimatedBattleScreen.tsx

import React, { useEffect, useState } from 'react';
import { useGameStore, getComputedStats } from '../store/gameStore';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

// [수정됨] getDynamicStyle 함수: 플레이어는 고정 크기, 적은 스탯 기반 동적 크기
const getDynamicStyle = (stats: { str: number; dex: number; con: number }, isPlayer: boolean, baseSize: number = 80) => {
  const { str, dex, con } = stats;
  const S = (str || 0) + (dex || 0) + (con || 0) || 1;

  const r = Math.floor((str / S) * 255);
  const g = Math.floor((dex / S) * 255);
  const b = Math.floor((con / S) * 255);

  let size = baseSize; // 기본 크기는 baseSize로 설정

  if (!isPlayer) {
    // 적 캐릭터는 스탯에 따라 크기를 동적으로 조절합니다.
    // 평균적인 적의 스탯 합계를 100으로 가정하고, 그에 대한 비율로 크기를 조절합니다.
    const averageEnemyS = 100; // 이 값은 게임 디자인에 따라 조정될 수 있습니다.
    const ratio = S / averageEnemyS;
    // [수정됨] 스탯 차이가 심할 때 박스가 너무 작아져 표정이 깨지는 현상을 막기 위해 최소 크기를 64px로 유지
    // [수정됨] 적 크기 변화 폭을 줄이기 위해 최대 크기를 96px로 제한 (이전 160px)
    size = Math.max(64, Math.min(96, baseSize * Math.sqrt(ratio)));
  }

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '0px', // [수정됨] 레트로 도트 박스 아이덴티티를 위해 둥근 모서리(8px)를 완전히 각진 픽셀 사각형(0px)으로 전환
  };
};

// [신규 추가] HP/EXP 수치를 고전 게임 감성의 █ ░ 도트 블록문자로 변환하는 함수
// [수정됨] █와 ░의 폰트 자체 높이 차이 버그를 깨부수기 위해, 동일한 █ 문자를 쓰고 안 차있는 곳은 text-neutral-700(어두운 회색)으로 디밍 처리
// [수정됨] 배경 패널이 stone 테마로 일체화됨에 따라, 빈 칸의 도트 색상을 text-stone-300으로 매핑하여 블록의 경계선이 픽셀 단위로 선명하게 보이도록 개편
// [수정됨] 모바일 가로폭 폭주 방지 및 도트 간격 벌림 필터 도입
const renderRetroGauge = (current: number, max: number, totalBlocks: number, activeClass: string) => {
  const ratio = Math.max(0, Math.min(1, current / max));
  const filledCount = Math.round(ratio * totalBlocks);
  
  return (
    /* flex gap-[2px]를 주어 문자가 서로 달라붙지 않고 정밀한 픽셀 격자 칸으로 떨어지도록 수정 */
    <span className="inline-flex items-center gap-[2px] leading-none select-none">
      {Array.from({ length: totalBlocks }).map((_, i) => (
        <span key={i} className={`${i < filledCount ? activeClass : 'text-stone-300'} text-[11px] leading-none`}>
          █
        </span>
      ))}
    </span>
  );
};

interface LogEntry {
  id: number;
  timestamp: number;
  message: string;
  colorClass: string;
}

const AnimatedBattleScreen: React.FC = () => {
  const {
    player,
    playerShield,
    currentEnemy,
    stage,
    maxStage,
    gameStatus,
    defeatReason,
    lastDamageDealt,
    lastDamageTaken,
    lastReflectedDamage,
    lastEnemyEvadedTime,
    lastPlayerEvadedTime,
    spawnEnemy,
    attackEnemy,
    attackPlayer,
    retryCurrentFloor,
    setDefeat,
    equippedCore,
  } = useGameStore();

  const computed = getComputedStats(player.stats, useGameStore.getState().unlockedSkills);
  const currentEnemyId = currentEnemy?.id;
  const enemyComputed = currentEnemy ? getComputedStats(currentEnemy.stats) : null;
  const enemyAttackSpeed = enemyComputed?.attackSpeed ?? 1;

  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit'>('idle');
  const [enemyAnim, setEnemyAnim] = useState<'idle' | 'attack' | 'hit'>('idle');

  const [damagePopups, setDamagePopups] = useState<{ id: number, val: number, type: 'normal' | 'core' | 'reflect' | 'taken' | 'miss-enemy' | 'miss-player', coreType?: string }[]>([]);
  
  const [showStats, setShowStats] = useState<boolean>(false);
  const [damageLog, setDamageLog] = useState<LogEntry[]>([]); // [신규] 데미지 로그 상태
  const [battleTime, setBattleTime] = useState(0); // 전투 시간 추적

  useEffect(() => {
    if (gameStatus !== 'BATTLE') {
      setPlayerAnim('idle');
      setEnemyAnim('idle');
      setBattleTime(0); // 전투 상태가 아니면 시간 초기화
    }
  }, [gameStatus]);

  // 전투 시간 타이머 및 시간 초과 패배
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

  useEffect(() => {
    if (gameStatus === 'IDLE') spawnEnemy();

    let playerAttackTimer: number;
    let enemyAttackTimer: number;

    if (gameStatus === 'BATTLE' && currentEnemyId) {
      let timeMultiplier = 1;
      if (battleTime >= 10) {
        timeMultiplier = 5;
      } else if (battleTime >= 5) {
        timeMultiplier = 2;
      }

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
      }, 1000 / (enemyAttackSpeed * timeMultiplier));
    }

    return () => {
      clearInterval(playerAttackTimer);
      clearInterval(enemyAttackTimer);
    };
  }, [gameStatus, currentEnemyId, computed.attackSpeed, enemyAttackSpeed, spawnEnemy, attackEnemy, attackPlayer, battleTime]);

  // 플레이어가 적을 때렸을 때 데미지 텍스트 및 로그
  useEffect(() => {
    if (lastDamageDealt && (lastDamageDealt.normal > 0 || lastDamageDealt.core > 0)) {
      let logMessage = '';
      let logColorClass = '';

      if (lastDamageDealt.normal > 0 && lastDamageDealt.core > 0) {
        logMessage = `플레이어: ${lastDamageDealt.normal} + ${lastDamageDealt.core} ${equippedCore?.type || '코어'} 데미지`;
        logColorClass = 'text-cyan-400'; // 복합 데미지는 코어 데미지 색상으로
      } else if (lastDamageDealt.normal > 0) {
        logMessage = `플레이어: ${lastDamageDealt.normal} 데미지`;
        logColorClass = 'text-blue-500'; // 플레이어 일반 공격은 파란색
      } else if (lastDamageDealt.core > 0) {
        logMessage = `플레이어: ${lastDamageDealt.core} ${equippedCore?.type || '코어'} 데미지`;
        logColorClass = 'text-cyan-400'; // 플레이어 코어 공격은 청록색
      }

      if (logMessage) {
        setTimeout(() => {
          setDamageLog(prev => [{ id: Date.now(), timestamp: Date.now(), message: logMessage, colorClass: logColorClass }, ...prev.slice(0, 49)]);
        }, 0);
      }

      // 팝업 로직 (기존 유지)
      // 1. 일반 데미지 팝업 (즉시 표시, 0ms)
      if (lastDamageDealt.normal > 0) {
        const normalPopup = {
          id: Date.now(),
          val: lastDamageDealt.normal,
          type: 'normal' as const
        };
        setTimeout(() => setDamagePopups(prev => [...prev, normalPopup]), 0);
        setTimeout(() => {
          setDamagePopups(prev => prev.filter(p => p.id !== normalPopup.id));
        }, 1000);
      }

      // 2. 코어 데미지 팝업 (일반 데미지보다 150ms 지연)
      if (lastDamageDealt.core > 0) {
        const corePopup = {
          id: Date.now() + 1,
          val: lastDamageDealt.core,
          type: 'core' as const,
          coreType: equippedCore?.type
        };
        setTimeout(() => setDamagePopups(prev => [...prev, corePopup]), 150);
        setTimeout(() => {
          setDamagePopups(prev => prev.filter(p => p.id !== corePopup.id));
        }, 1150);
      }
    }
  }, [lastDamageDealt, equippedCore]);

  // 물 코어 반사 데미지
  useEffect(() => {
    if (lastReflectedDamage && lastReflectedDamage > 0) {
      const newPopup = {
        id: Date.now() + 1,
        val: lastReflectedDamage,
        type: 'reflect' as const
      };

      // [수정됨] 일반(0ms), 코어(150ms)와 겹치지 않도록 반사 데미지는 300ms 지연
      setTimeout(() => setDamagePopups(prev => [...prev, newPopup]), 300);

      setTimeout(() => {
        setDamagePopups(prev => prev.filter(p => p.id !== newPopup.id));
      }, 1300);
      // [수정됨] 데미지 로그 추가 (최신 50개만 유지)
      setTimeout(() => {
        setDamageLog(prev => [{ id: Date.now() + 1, timestamp: Date.now() + 1, message: `플레이어: ${lastReflectedDamage} 반사 데미지`, colorClass: 'text-cyan-400' }, ...prev.slice(0, 49)]);
      }, 0);
    }
  }, [lastReflectedDamage]);

  // 적이 내 공격을 회피했을 때 팝업
  useEffect(() => {
    if (lastEnemyEvadedTime && lastEnemyEvadedTime > 0) {
      const newPopup = {
        id: Date.now() + Math.random(),
        val: 0,
        type: 'miss-enemy' as const
      };
      setTimeout(() => setDamagePopups(prev => [...prev, newPopup]), 0);
      setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== newPopup.id)), 1000);
      // [수정됨] 데미지 로그 추가 (최신 50개만 유지)
      setTimeout(() => {
        setDamageLog(prev => [{ id: Date.now() + Math.random(), timestamp: Date.now() + Math.random(), message: `플레이어의 공격을 적이 회피했습니다!`, colorClass: 'text-yellow-400 italic' }, ...prev.slice(0, 49)]);
      }, 0);
    }
  }, [lastEnemyEvadedTime]);

  // 내가 적의 공격을 회피했을 때 팝업
  useEffect(() => {
    if (lastPlayerEvadedTime && lastPlayerEvadedTime > 0) {
      const newPopup = {
        id: Date.now() + Math.random(),
        val: 0,
        type: 'miss-player' as const
      };
      // [수정됨] 피격 데미지 타이밍과 맞추기 위해 150ms 지연
      setTimeout(() => setDamagePopups(prev => [...prev, newPopup]), 150);
      setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== newPopup.id)), 1150);
      // [수정됨] 데미지 로그 추가 (최신 50개만 유지)
      setTimeout(() => {
        setDamageLog(prev => [{ id: Date.now() + Math.random(), timestamp: Date.now() + Math.random(), message: `플레이어가 적의 공격을 회피했습니다!`, colorClass: 'text-yellow-400 italic' }, ...prev.slice(0, 49)]);
      }, 0);
    }
  }, [lastPlayerEvadedTime]);

  // 적이 나에게 입힌 피격 데미지 (플레이어가 받은 데미지)
  useEffect(() => {
    if (lastDamageTaken && lastDamageTaken > 0) {
      const newPopup = {
        id: Date.now() + Math.random(),
        val: Math.floor(lastDamageTaken),
        type: 'taken' as const
      };

      setTimeout(() => setDamagePopups(prev => [...prev, newPopup]), 150);
      setTimeout(() => {
        setDamagePopups(prev => prev.filter(p => p.id !== newPopup.id));
      }, 1150);

      setTimeout(() => {
        setDamageLog(prev => [{ id: Date.now() + Math.random(), timestamp: Date.now() + Math.random(), message: `적: ${Math.floor(lastDamageTaken)} 데미지`, colorClass: 'text-red-500' }, ...prev.slice(0, 49)]);
      }, 0);
    }
  }, [lastDamageTaken]);

  useEffect(() => {
    if (gameStatus === 'VICTORY') {
      const timer = setTimeout(() => spawnEnemy(), 1000);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, spawnEnemy]);

  // [수정됨] 패배 연출 시간 및 자동 스탯 보기 개선
  useEffect(() => {
    if (gameStatus === 'DEFEAT') {
//      setShowStats(true); // [신규] 패배 시 적과 나의 스탯을 비교할 수 있도록 상세 스탯 창을 자동으로 엽니다.
      const timer = setTimeout(() => retryCurrentFloor(), 3000); // [수정됨] 대기 시간을 1.5초 -> 3초로 변경하여 충분한 여유를 제공합니다.
      return () => clearTimeout(timer);
    }
  }, [gameStatus, retryCurrentFloor]);

  // [수정됨] 아케이드 8비트 하드 타격 필터를 위한 Variants 픽셀 폴리싱
  const playerVariants: Variants = {
    idle: { y: [0, -6, 0], transition: { repeat: Infinity, duration: 2, ease: "easeInOut" } },
    attack: { x: [0, 50, 0], transition: { duration: 0.22, times: [0, 0.4, 1] } },
    hit: { x: [-12, 12, -8, 6, 0], filter: ["brightness(1)", "brightness(2) contrast(1.5)", "brightness(1)"], transition: { duration: 0.25 } }
  };

  const enemyVariants: Variants = {
    idle: { y: [0, -6, 0], transition: { repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 } },
    attack: { x: [0, -50, 0], transition: { duration: 0.22, times: [0, 0.4, 1] } },
    hit: { x: [12, -12, 8, -6, 0], filter: ["brightness(1)", "brightness(2) contrast(1.5)", "brightness(1)"], transition: { duration: 0.25 } }
  };

  const statComparisonList = [
    { label: '힘 (STR)', pValue: player.stats.str, eValue: currentEnemy?.stats.str },
    { label: '민첩 (DEX)', pValue: player.stats.dex, eValue: currentEnemy?.stats.dex },
    { label: '체력 (CON)', pValue: player.stats.con, eValue: currentEnemy?.stats.con },
    { label: '공격력', pValue: computed.attack.toFixed(1), eValue: enemyComputed?.attack.toFixed(1) },
    { label: '방어력', pValue: computed.defense.toFixed(1), eValue: enemyComputed?.defense.toFixed(1) },
    { label: '공격속도', pValue: `${computed.attackSpeed.toFixed(1)}/s`, eValue: enemyComputed ? `${enemyComputed.attackSpeed.toFixed(1)}/s` : undefined },
    { label: '최대체력', pValue: computed.maxHealth.toFixed(0), eValue: enemyComputed?.maxHealth.toFixed(0) },
    { label: '명중', pValue: computed.accuracy.toFixed(0), eValue: enemyComputed?.accuracy.toFixed(0) },
    { label: '회피', pValue: computed.evasion.toFixed(0), eValue: enemyComputed?.evasion.toFixed(0) },
  ];

  const remainingTime = 30 - battleTime;

  return (
      /* [수정됨] 크기를 max-w-md(모바일 세로콤팩트)로 줄이고, 색상을 옛날 게임기 플라스틱 질감인 stone-200 테마로 전면 복원 */
      <div className="max-w-md mx-auto p-4 rounded-none border-4 border-neutral-900 bg-stone-200 w-full flex flex-col gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] select-none flex-grow">

        {/* 헤더: 스테이지 및 경험치 바 */}
        <div className="bg-stone-100 p-2 rounded-none border-4 border-neutral-900 flex flex-col gap-1 w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-end">
            <h2 className="text-xl font-bold text-yellow-500 leading-none flex items-center gap-2 font-mono">
              STAGE {stage}
              {(maxStage || 1) > stage && (
                  <span className="text-red-500 text-sm md:text-base">({maxStage})</span>
              )}
            </h2>
            {player.statPoints > 0 && (
                <span className="bg-green-950 text-green-400 px-2 py-0.5 rounded-none text-[10px] font-bold border-2 border-green-600 animate-pulse">
                잔여 스탯: {player.statPoints}
              </span>
            )}
          </div>

          {/* [수정됨] 현대적인 슬라이딩 EXP 게이지를 20칸짜리 픽셀 블록 미터기로 전면 개편 */}
          <div className="flex justify-between items-center font-mono text-xs font-bold">
            <span className="text-neutral-900">Lv. {player.level}</span>
            <span className="text-blue-400 tracking-wider flex items-center gap-0.5">
              EXP [{renderRetroGauge(player.experience, player.nextLevelExperience, 10, 'text-blue-500')}] {/* 20 -> 10으로 변경 */}
            </span>
            <span className="text-[10px] text-neutral-500">
              {Math.floor(player.experience)}/{player.nextLevelExperience}
            </span>
          </div>
        </div>

        {/* [수정됨] 샘플 파일과 완벽히 일치하는 따뜻한 stone-100 배경색 및 연한 stone-200 격자 그리드 라인 주입 */}
        <div 
          className="bg-stone-100 px-6 pt-2 pb-0 flex flex-col border-4 border-neutral-900 relative overflow-hidden shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)] flex-grow" // min-h-[350px] 제거, pb-0으로 변경
          style={{
            backgroundImage: 'linear-gradient(to right, #e7e5e4 2px, transparent 2px), linear-gradient(to bottom, #e7e5e4 2px, transparent 2px)',
            backgroundSize: '16px 16px',
          }}
        >

          {/* [신규] 전투 시간 카운트다운 */}
          {gameStatus === 'BATTLE' && (
            <div className={`absolute top-2 left-1/2 -translate-x-1/2 font-mono text-2xl font-black z-20 transition-colors duration-300 ${remainingTime <= 10 ? 'text-red-500 animate-pulse' : 'text-stone-400'}`}>
              {remainingTime}
            </div>
          )}

{/* [수정됨] 모바일 세로모드(Portrait) 폭폭 방지: VS를 지우고 grid-cols-2 분할 스펙 연동으로 탈출 에러 원천 차단 */}
<div className="grid grid-cols-2 gap-2 w-full relative z-10 font-mono p-2 border-4 border-neutral-900 bg-stone-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]">
  
  {/* 플레이어 픽셀 HP 모니터 (왼쪽 col) */}
  <div className="flex flex-col items-start select-none w-full min-w-0">
    <div className="text-[10px] font-black text-neutral-700 flex items-center gap-1 leading-none mb-1 truncate w-full">
      <span>PLAYER</span>
      {(playerShield || 0) > 0 && <span className="text-blue-600 text-[9px] font-sans font-bold shrink-0">🛡️+{Math.floor(playerShield || 0)}</span>}
    </div>
    {/* 가로폭 사수를 위해 게이지 블록을 모바일 표준 10칸으로 최적화 조율 */}
    <div className="text-xs font-black flex items-center leading-none text-neutral-400">
      [{renderRetroGauge(player.currentHealth, computed.maxHealth, 10, 'text-green-600')}]
    </div>
    <div className="text-[9px] font-black text-neutral-800 mt-1.5 leading-none font-mono tracking-tighter">
      {Math.max(0, player.currentHealth)}<span className="text-stone-400 mx-0.5">/</span>{computed.maxHealth.toFixed(0)}
    </div>
  </div>

  {/* 적 보스 픽셀 HP 모니터 (오른쪽 col) */}
  <div className="flex flex-col items-end select-none w-full min-w-0">
    <div className="text-[10px] font-black text-neutral-700 leading-none mb-1 truncate w-full text-right">
      ENEMY
    </div>
    {/* 동일하게 10칸 세팅 및 닫는 괄호 마감 */}
    <div className="text-xs font-black flex items-center leading-none text-neutral-400">
      [{renderRetroGauge(currentEnemy?.currentHealth || 0, enemyComputed?.maxHealth || 1, 10, 'text-red-600')}]
    </div>
    <div className="text-[9px] font-black text-neutral-800 mt-1.5 leading-none font-mono tracking-tighter text-right">
      {Math.max(0, currentEnemy?.currentHealth || 0)}<span className="text-stone-400 mx-0.5">/</span>{enemyComputed?.maxHealth.toFixed(0) || 1}
    </div>
  </div>

</div>

          {/* 캐릭터 박스 렌더링 */}
          <div className="flex justify-center items-end gap-16 mt-6 pb-2 z-10 relative">

            {/* 플레이어 박스 영역 */}
            <div className="relative z-20">
              <motion.div
                  variants={playerVariants}
                  animate={playerAnim}
                  className="flex items-center justify-center border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20 overflow-hidden"
                  // [수정됨] 플레이어는 고정된 크기를 사용합니다.
                  style={getDynamicStyle(player.stats, true, 80)} // isPlayer: true, baseSize: 80
              >
                {/* [신규] 유저 박스 내부 실시간 픽셀 도트 눈/입 표정 스위칭 시스템 배치 */}
                <div className="flex flex-col items-center justify-center w-full h-full p-1 text-neutral-950 font-mono select-none">
                  <div className="flex justify-between w-full px-2 mb-1.5">
                    {playerAnim === 'hit' ? (
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

              {/* 플레이어 피격 데미지 & MISS 팝업 */}
              <AnimatePresence>
                {damagePopups.filter(p => p.type === 'taken' || p.type === 'miss-player').map((popup) => {
                  const isMiss = popup.type === 'miss-player';
                  return (
                      <motion.div
                          key={popup.id}
                          initial={{ opacity: 0, y: 0, scale: 0.5, x: 0 }}
                          animate={{ opacity: 1, y: -60, scale: 1.3, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`absolute left-1/2 -translate-x-1/2 -top-4 font-mono font-black whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-51 ${isMiss ? 'text-neutral-400 text-base italic' : 'text-red-500 text-lg'}`}
                      >
                        {isMiss ? 'MISS' : `-${popup.val}`}
                      </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {/* 적 박스 영역 */}
            <div className="relative z-20">
              {currentEnemy ? (
                  <motion.div
                      variants={enemyVariants}
                      animate={enemyAnim}
                      className="flex items-center justify-center border-4 border-neutral-950 bg-stone-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
                      // [수정됨] 적은 스탯에 따라 동적으로 크기를 조절합니다.
                      style={getDynamicStyle(currentEnemy.stats, false, 80)} // isPlayer: false, baseSize: 80 (기준 크기)
                  >
                    {/* [신규] 돌 질감 보스 전용 투박한 ✖ ✖ 도트 표정 결합 */}
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

              {/* 적에게 들어간 데미지 & MISS 텍스트 팝업 (코어 타입별 색상 커스텀 및 X/Y 분산 적용) */}
              <AnimatePresence>
                {damagePopups.filter(p => p.type !== 'taken' && p.type !== 'miss-player').map((popup) => {
                  let colorClass = 'text-white text-base';
                  let scaleVal = 1.2;
                  let text = `-${popup.val}`;
                  
                  // [신규] 데미지 겹침 방지용 X/Y 오프셋 설정
                  let xOffset = 0;   
                  let yOffset = -60; 

                  if (popup.type === 'core') {
                    scaleVal = 1.5;
                    xOffset = 20;  // 코어 데미지는 살짝 우측 상단으로 피해서 팝업
                    yOffset = -75;
                    
                    if (popup.coreType === 'FIRE') {
                      colorClass = 'text-red-500 text-xl font-extrabold';
                    } else if (popup.coreType === 'WIND') {
                      colorClass = 'text-green-400 text-xl font-extrabold';
                    } else if (popup.coreType === 'ELECTRIC') {
                      colorClass = 'text-yellow-400 text-xl font-extrabold';
                    } else {
                      colorClass = 'text-orange-500 text-xl';
                    }
                  } else if (popup.type === 'reflect') {
                    colorClass = 'text-blue-400 text-lg font-bold';
                    scaleVal = 1.3;
                    xOffset = -20; // 반사 데미지는 살짝 좌측 하단으로 피해서 팝업
                    yOffset = -50;
                  } else if (popup.type === 'miss-enemy') {
                    colorClass = 'text-neutral-400 text-lg italic';
                    scaleVal = 1.3;
                    text = 'MISS';
                  }

                  return (
                      <motion.div
                          key={popup.id}
                          initial={{ opacity: 0, y: 0, scale: 0.5, x: 0 }}
                          animate={{ opacity: 1, y: yOffset, scale: scaleVal, x: xOffset }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`absolute left-1/2 -translate-x-1/2 -top-4 font-mono font-black whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-50 ${colorClass}`}
                      >
                        {text}
                      </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* [수정됨] 게임 오버 연출: 배경이 비치는 어두운 오버레이와 그림자 텍스트로 변경 */}
          {gameStatus === 'DEFEAT' && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-50 pointer-events-none">
                  <h2 className="text-6xl font-black text-red-500 mb-4 animate-pulse font-mono tracking-widest drop-shadow-[0_4px_2px_rgba(0,0,0,1)]">GAME OVER</h2>
                  <p className="text-white text-lg font-bold mb-2 drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
                    {defeatReason === 'TIMEOUT' ? '시간이 초과되었습니다!' : '전투에서 패배했습니다!'}
                  </p>
                  <p className="text-neutral-300 text-sm font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">잠시 후 이전 층으로 돌아갑니다...</p>
              </div>
          )}
        </div>

        {/* [수정됨] 데미지 로그 창 (6줄 높이, 스크롤 가능) */}
        <div className="bg-neutral-950 p-2 rounded-none border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="h-24 overflow-y-auto custom-scrollbar text-[10px] font-mono text-neutral-200">
            {damageLog.map((entry) => (
              <div key={entry.id} className={`${entry.colorClass} leading-tight`}>
                {entry.message}
              </div>
            ))}
          </div>
        </div>

        {/* 하단: 컴팩트 일체형 상세 스탯 창 */}
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