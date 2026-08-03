// src/components/AnimatedBattleScreen.tsx

import React, { useEffect, useState } from 'react';
import { useGameStore, getComputedStats } from '../store/gameStore';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { CoreType } from '../types/game';

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

const renderRetroGauge = (current: number, max: number, totalBlocks: number, activeClass: string) => {
  const ratio = Math.max(0, Math.min(1, current / max));
  const filledCount = Math.round(ratio * totalBlocks);
  
  return (
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

const getEnemyCoreDisplay = (type: CoreType) => {
  switch (type) {
    case 'FIRE': return { abbr: 'F', color: 'text-red-500' };
    case 'WATER': return { abbr: 'W', color: 'text-blue-500' };
    case 'WIND': return { abbr: 'A', color: 'text-green-500' };
    case 'ELECTRIC': return { abbr: 'E', color: 'text-yellow-500' };
    default: return { abbr: '', color: '' };
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

  // [수정] isPlayerStunned 상태를 playerStunEndTime으로 계산
  const isPlayerStunned = playerStunEndTime ? playerStunEndTime > Date.now() : false;

  const computed = getComputedStats(player.stats, useGameStore.getState().unlockedSkills);
  const currentEnemyId = currentEnemy?.id;
  const enemyComputed = currentEnemy ? getComputedStats(currentEnemy.stats) : null;
  const enemyAttackSpeed = enemyComputed?.attackSpeed ?? 1;

  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit' | 'stunned'>('idle');
  const [enemyAnim, setEnemyAnim] = useState<'idle' | 'attack' | 'hit'>('idle');
  
  const [damagePopups, setDamagePopups] = useState<{ id: number, val: number, type: 'normal' | 'core' | 'reflect' | 'taken' | 'taken-core' | 'miss-enemy' | 'miss-player' | 'shield' | 'enemy-shield' | 'leech', coreType?: string }[]>([]);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [damageLog, setDamageLog] = useState<LogEntry[]>([]);
  const [battleTime, setBattleTime] = useState(0);
  const [timeMultiplier, setTimeMultiplier] = useState(1);
  const [turn, setTurn] = useState(1);

  useEffect(() => {
    setPlayerAnim(isPlayerStunned ? 'stunned' : 'idle');
  }, [isPlayerStunned]);

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

  useEffect(() => {
    if (lastDamageDealt || (lastEnemyEvadedTime ?? 0) > 0) {
      const { normal = 0, core = 0, shieldRecovered = 0 } = lastDamageDealt || { normal: 0, core: 0, shieldRecovered: 0 };
      const isMiss = (lastEnemyEvadedTime ?? 0) > 0;

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
      if (shieldRecovered > 0) {
        const popup = { id: Date.now() + 2, val: shieldRecovered, type: 'shield' as const };
        setTimeout(() => {
          setDamagePopups(prev => [...prev, popup]);
          setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 1000);
        }, 150);
      }
      if (isMiss) {
        const popup = { id: Date.now() + 3, val: 0, type: 'miss-enemy' as const };
        setDamagePopups(prev => [...prev, popup]);
        setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 1000);
      }

      if (isMiss) {
        addLog(
          <span>
            <span className="text-blue-500">[S{stage}-{turn}] P: </span>
            <span className="text-yellow-400 italic">회피</span>
            {shieldRecovered > 0 && <span className="text-green-500 ml-1">(쉴드 +{shieldRecovered})</span>}
          </span>
        );
      } else if (normal > 0 || core > 0 || shieldRecovered > 0) {
        const damageParts = [];
        if (normal > 0) damageParts.push(<span key="n" className="text-blue-400">일반 {normal}</span>);
        if (core > 0) damageParts.push(<span key="c" className="text-orange-500">코어 {core}</span>);
        
        addLog(
          <span>
            <span className="text-blue-500">[S{stage}-{turn}] P: </span>
            {damageParts.map((part, i) => <React.Fragment key={i}>{i > 0 && ' / '}{part}</React.Fragment>)}
            {shieldRecovered > 0 && <span className="text-green-500 ml-1">(쉴드 +{shieldRecovered})</span>}
          </span>
        );
      }
    }

    if (lastDamageTaken && (lastDamageTaken.normal > 0 || lastDamageTaken.core > 0)) {
      const { normal, core } = lastDamageTaken;
      if (normal > 0) {
        const popup = { id: Date.now() + Math.random(), val: normal, type: 'taken' as const };
        setDamagePopups(prev => [...prev, popup]);
        setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 1000);
      }
      if (core > 0) {
        const popup = { id: Date.now() + Math.random(), val: core, type: 'taken-core' as const };
        setTimeout(() => {
          setDamagePopups(prev => [...prev, popup]);
          setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 1000);
        }, 150);
      }

      const damageParts = [];
      if (normal > 0) damageParts.push(<span key="n" className="text-red-400">일반 {normal}</span>);
      if (core > 0) damageParts.push(<span key="c" className="text-purple-500">코어 {core}</span>);

      const reflectionText = (lastReflectedDamage ?? 0) > 0 ? <span className="text-cyan-400 ml-1">(반사 {lastReflectedDamage})</span> : '';
      const leechText = (lastLeechedHealth ?? 0) > 0 ? <span className="text-green-400 ml-1">(흡수 {lastLeechedHealth})</span> : '';
      const enemyShieldText = (lastEnemyShieldRecovered ?? 0) > 0 ? <span className="text-blue-400 ml-1">(적 쉴드 +{lastEnemyShieldRecovered})</span> : '';

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
      const popup = { id: Date.now() + Math.random(), val: lastEnemyShieldRecovered, type: 'enemy-shield' as const };
      setTimeout(() => {
        setDamagePopups(prev => [...prev, popup]);
        setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 1000);
      }, 200);
    }

    if ((lastPlayerEvadedTime ?? 0) > 0) {
      const popup = { id: Date.now() + Math.random(), val: 0, type: 'miss-player' as const };
      setTimeout(() => {
        setDamagePopups(prev => [...prev, popup]);
        setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id)), 1000);
      }, 150);
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
  const enemyCoreDisplay = currentEnemy?.core ? getEnemyCoreDisplay(currentEnemy.core.type) : null;

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
      {isPlayerStunned && <span className="text-yellow-500 text-xs font-bold animate-pulse">STUN</span>}
    </div>
    <div className="text-xs font-black flex items-center leading-none text-neutral-400">
      [{renderRetroGauge(player.currentHealth, computed.maxHealth, 10, 'text-green-600')}]
    </div>
    <div className="text-[9px] font-black text-neutral-800 mt-1.5 leading-none font-mono tracking-tighter">
      {Math.max(0, player.currentHealth)}<span className="text-stone-400 mx-0.5">/</span>{computed.maxHealth.toFixed(0)}
    </div>
  </div>

  <div className="flex flex-col items-end select-none w-full min-w-0">
    <div className="text-[10px] font-black text-neutral-700 leading-none mb-1 truncate w-full text-right flex justify-end items-center gap-1">
      {enemyCoreDisplay && (
        <span className={`font-bold ${enemyCoreDisplay.color}`}>[{enemyCoreDisplay.abbr}]</span>
      )}
      <span>ENEMY</span>
      {(enemyShield || 0) > 0 && <span className="text-blue-600 text-[9px] font-sans font-bold shrink-0">🛡️+{Math.floor(enemyShield || 0)}</span>}
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

              <AnimatePresence>
                {damagePopups.filter(p => p.type.startsWith('taken') || p.type === 'miss-player' || p.type === 'shield').map((popup) => {
                  const isMiss = popup.type === 'miss-player';
                  const isShield = popup.type === 'shield';
                  const isCore = popup.type === 'taken-core';

                  let text = `-${popup.val}`;
                  let colorClass = 'text-red-500 text-lg';
                  let xOffset = 0;
                  let yOffset = -60;
                  let scaleVal = 1.3;

                  if (isMiss) {
                    text = 'MISS';
                    colorClass = 'text-neutral-400 text-base italic';
                    xOffset = 0;
                    yOffset = -50;
                  } else if (isShield) {
                    text = `+${popup.val}`;
                    colorClass = 'text-green-500 text-lg';
                    xOffset = 30;
                    yOffset = -40;
                  } else if (isCore) {
                    colorClass = 'text-purple-500 text-xl';
                    xOffset = 20;
                    yOffset = -75;
                    scaleVal = 1.5;
                  } else { // 'taken'
                    xOffset = -20;
                    yOffset = -50;
                  }
                  
                  return (
                      <motion.div
                          key={popup.id}
                          initial={{ opacity: 0, y: 0, scale: 0.5, x: 0 }}
                          animate={{ opacity: 1, y: yOffset, scale: scaleVal, x: xOffset }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`absolute left-1/2 -translate-x-1/2 -top-4 font-mono font-black whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-51 ${colorClass}`}
                      >
                        {text}
                      </motion.div>
                  );
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
                {damagePopups.filter(p => !p.type.startsWith('taken') && p.type !== 'miss-player' && p.type !== 'shield').map((popup) => {
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
                  } else if (popup.type === 'leech' || popup.type === 'enemy-shield') {
                    colorClass = 'text-green-400 text-lg';
                    scaleVal = 1.3;
                    text = `+${popup.val}`;
                    xOffset = 30;
                    yOffset = -40;
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