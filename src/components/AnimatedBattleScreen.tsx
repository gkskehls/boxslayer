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
  message: React.ReactNode;
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
  } = useGameStore();

  const computed = getComputedStats(player.stats, useGameStore.getState().unlockedSkills);
  const currentEnemyId = currentEnemy?.id;
  const enemyComputed = currentEnemy ? getComputedStats(currentEnemy.stats) : null;
  const enemyAttackSpeed = enemyComputed?.attackSpeed ?? 1;

  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit'>('idle');
  const [enemyAnim, setEnemyAnim] = useState<'idle' | 'attack' | 'hit'>('idle');
  
  const [damagePopups, setDamagePopups] = useState<{ id: number, val: number, type: 'normal' | 'core' | 'reflect' | 'taken' | 'miss-enemy' | 'miss-player' | 'shield', coreType?: string }[]>([]);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [damageLog, setDamageLog] = useState<LogEntry[]>([]);
  const [battleTime, setBattleTime] = useState(0);
  const [timeMultiplier, setTimeMultiplier] = useState(1);
  const [turn, setTurn] = useState(1);

  useEffect(() => {
    if (gameStatus !== 'BATTLE') {
      setPlayerAnim('idle');
      setEnemyAnim('idle');
      setBattleTime(0);
      setTimeMultiplier(1);
      setTurn(1);
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

  useEffect(() => {
    if (gameStatus !== 'BATTLE') return;
    const timeout1 = setTimeout(() => setTimeMultiplier(2), 5000);
    const timeout2 = setTimeout(() => setTimeMultiplier(5), 10000);
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [gameStatus]);

  useEffect(() => {
    if (gameStatus === 'IDLE') {
      spawnEnemy();
      setTurn(1);
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
    setDamageLog(prev => [{ id: Date.now() + Math.random(), message }, ...prev.slice(0, 49)]);
  };

  // [수정] 모든 전투 이벤트를 한 곳에서 처리하는 통합 useEffect
  useEffect(() => {
    // 플레이어 공격 데미지
    if (lastDamageDealt) {
      const { normal, core, shieldRecovered } = lastDamageDealt;
      if (normal > 0) {
        const popup = { id: Date.now(), val: normal, type: 'normal' as const };
        setDamagePopups(prev => [...prev, popup]);
        setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 1000);
      }
      if (core > 0) {
        const popup = { id: Date.now() + 1, val: core, type: 'core' as const, coreType: useGameStore.getState().equippedCore?.type };
        setTimeout(() => {
          setDamagePopups(prev => [...prev, popup]);
          setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 1000);
        }, 150);
      }
      if (shieldRecovered && shieldRecovered > 0) {
        const popup = { id: Date.now() + 2, val: shieldRecovered, type: 'shield' as const };
        setTimeout(() => {
          setDamagePopups(prev => [...prev, popup]);
          setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 1000);
        }, 150);
      }
      if (normal > 0 || core > 0 || (shieldRecovered && shieldRecovered > 0)) {
        const damageText = (normal > 0 || core > 0) ? `${normal + (core || 0)} 데미지` : '';
        const shieldText = (shieldRecovered && shieldRecovered > 0) ? `(쉴드 +${shieldRecovered} 회복)` : '';
        
        addLog(
          <span>
            <span className="text-blue-500">[S{stage}-{turn}] </span>
            <span className="text-blue-500">플레이어: {damageText}</span>
            {shieldText && <span className="text-green-500"> {shieldText}</span>}
          </span>
        );
      }
    }
    
    // 플레이어 공격 회피
    if (lastEnemyEvadedTime && lastEnemyEvadedTime > 0) {
      const popup = { id: Date.now() + Math.random(), val: 0, type: 'miss-enemy' as const };
      setDamagePopups(prev => [...prev, popup]);
      setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 1000);
      addLog(
        <span>
          <span className="text-blue-500">[S{stage}-{turn}] </span>
          <span className="text-yellow-400 italic">플레이어: 공격 실패! (회피)</span>
        </span>
      );
    }

    // 적 공격 데미지 (반사 포함)
    if (lastDamageTaken && lastDamageTaken > 0) {
      const damage = Math.floor(lastDamageTaken);
      const popup = { id: Date.now() + Math.random(), val: damage, type: 'taken' as const };
      setTimeout(() => {
        setDamagePopups(prev => [...prev, popup]);
        setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 1000);
      }, 150);

      const reflectionText = lastReflectedDamage && lastReflectedDamage > 0 
        ? <span className="text-cyan-400"> (반사: {lastReflectedDamage})</span>
        : '';
      
      if (lastReflectedDamage && lastReflectedDamage > 0) {
        const reflectPopup = { id: Date.now() + 1, val: lastReflectedDamage, type: 'reflect' as const };
        setTimeout(() => {
          setDamagePopups(prev => [...prev, reflectPopup]);
          setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== reflectPopup.id)), 1000);
        }, 300);
      }
      
      addLog(
        <span>
          <span className="text-red-500">[S{stage}-{turn}] </span>
          <span className="text-red-500">적: {damage} 데미지</span>
          {reflectionText}
        </span>
      );
    }

    // 적 공격 회피
    if (lastPlayerEvadedTime && lastPlayerEvadedTime > 0) {
      const popup = { id: Date.now() + Math.random(), val: 0, type: 'miss-player' as const };
      setTimeout(() => {
        setDamagePopups(prev => [...prev, popup]);
        setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 1000);
      }, 150);
      addLog(
        <span>
          <span className="text-red-500">[S{stage}-{turn}] </span>
          <span className="text-yellow-400 italic">적: 공격 실패! (회피)</span>
        </span>
      );
    }

  }, [lastDamageDealt, lastDamageTaken, lastReflectedDamage, lastEnemyEvadedTime, lastPlayerEvadedTime]);


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
      <div className="max-w-md mx-auto p-4 rounded-none border-4 border-neutral-900 bg-stone-200 w-full flex flex-col gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] select-none flex-grow">

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

          <div className="flex justify-between items-center font-mono text-xs font-bold">
            <span className="text-neutral-900">Lv. {player.level}</span>
            <span className="text-blue-400 tracking-wider flex items-center gap-0.5">
              EXP [{renderRetroGauge(player.experience, player.nextLevelExperience, 10, 'text-blue-500')}]
            </span>
            <span className="text-[10px] text-neutral-500">
              {Math.floor(player.experience)}/{player.nextLevelExperience}
            </span>
          </div>
        </div>

        <div 
          className="bg-stone-100 px-6 pt-2 pb-0 flex flex-col border-4 border-neutral-900 relative overflow-hidden shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)] flex-grow"
          style={{
            backgroundImage: 'linear-gradient(to right, #e7e5e4 2px, transparent 2px), linear-gradient(to bottom, #e7e5e4 2px, transparent 2px)',
            backgroundSize: '16px 16px',
          }}
        >

          {gameStatus === 'BATTLE' && (
            <div className={`absolute top-2 left-1/2 -translate-x-1/2 font-mono text-2xl font-black z-20 transition-colors duration-300 ${remainingTime <= 10 ? 'text-red-500 animate-pulse' : 'text-stone-400'}`}>
              {remainingTime}
            </div>
          )}

<div className="grid grid-cols-2 gap-2 w-full relative z-10 font-mono p-2 border-4 border-neutral-900 bg-stone-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]">
  
  <div className="flex flex-col items-start select-none w-full min-w-0">
    <div className="text-[10px] font-black text-neutral-700 flex items-center gap-1 leading-none mb-1 truncate w-full">
      <span>PLAYER</span>
      {(playerShield || 0) > 0 && <span className="text-blue-600 text-[9px] font-sans font-bold shrink-0">🛡️+{Math.floor(playerShield || 0)}</span>}
    </div>
    <div className="text-xs font-black flex items-center leading-none text-neutral-400">
      [{renderRetroGauge(player.currentHealth, computed.maxHealth, 10, 'text-green-600')}]
    </div>
    <div className="text-[9px] font-black text-neutral-800 mt-1.5 leading-none font-mono tracking-tighter">
      {Math.max(0, player.currentHealth)}<span className="text-stone-400 mx-0.5">/</span>{computed.maxHealth.toFixed(0)}
    </div>
  </div>

  <div className="flex flex-col items-end select-none w-full min-w-0">
    <div className="text-[10px] font-black text-neutral-700 leading-none mb-1 truncate w-full text-right">
      ENEMY
    </div>
    <div className="text-xs font-black flex items-center leading-none text-neutral-400">
      [{renderRetroGauge(currentEnemy?.currentHealth || 0, enemyComputed?.maxHealth || 1, 10, 'text-red-600')}]
    </div>
    <div className="text-[9px] font-black text-neutral-800 mt-1.5 leading-none font-mono tracking-tighter text-right">
      {Math.max(0, currentEnemy?.currentHealth || 0)}<span className="text-stone-400 mx-0.5">/</span>{enemyComputed?.maxHealth.toFixed(0) || 1}
    </div>
  </div>

</div>

          <div className="flex justify-center items-end gap-16 mt-6 pb-2 z-10 relative">

            <div className="relative z-20">
              <motion.div
                  variants={playerVariants}
                  animate={playerAnim}
                  className="flex items-center justify-center border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20 overflow-hidden"
                  style={getDynamicStyle(player.stats, true, 80)}
              >
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

              <AnimatePresence>
                {damagePopups.filter(p => p.type === 'taken' || p.type === 'miss-player' || p.type === 'shield').map((popup) => {
                  const isMiss = popup.type === 'miss-player';
                  const isShield = popup.type === 'shield';
                  let text = isMiss ? 'MISS' : (isShield ? `+${popup.val}` : `-${popup.val}`);
                  let colorClass = isMiss ? 'text-neutral-400 text-base italic' : (isShield ? 'text-green-500 text-lg' : 'text-red-500 text-lg');
                  let xOffset = isMiss ? -20 : (isShield ? 20 : 0);
                  
                  return (
                      <motion.div
                          key={popup.id}
                          initial={{ opacity: 0, y: 0, scale: 0.5, x: 0 }}
                          animate={{ opacity: 1, y: -60, scale: 1.3, x: xOffset }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`absolute left-1/2 -translate-x-1/2 -top-4 font-mono font-black whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-51 ${colorClass}`}
                      >
                        {text}
                      </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

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

              <AnimatePresence>
                {damagePopups.filter(p => p.type !== 'taken' && p.type !== 'miss-player' && p.type !== 'shield').map((popup) => {
                  let colorClass = 'text-white text-base';
                  let scaleVal = 1.2;
                  let text = `-${popup.val}`;
                  
                  let xOffset = 0;   
                  let yOffset = -60; 

                  if (popup.type === 'core') {
                    scaleVal = 1.5;
                    xOffset = 20;
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
                    xOffset = -20;
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

        <div className="bg-neutral-950 p-2 rounded-none border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="h-24 overflow-y-auto custom-scrollbar text-[10px] font-mono text-neutral-200 text-left">
            {damageLog.map((entry) => (
              <div key={entry.id} className="leading-tight">
                {entry.message}
              </div>
            ))}
          </div>
        </div>

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