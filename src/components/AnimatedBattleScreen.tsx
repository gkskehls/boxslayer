// src/components/AnimatedBattleScreen.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore, getComputedStats } from '../store/gameStore';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

const getDynamicStyle = (stats: { str: number; dex: number; con: number }, compareStats?: { str: number; dex: number; con: number }) => {
  const { str, dex, con } = stats;
  const S = (str || 0) + (dex || 0) + (con || 0) || 1;
  const compareS = compareStats ? ((compareStats.str || 0) + (compareStats.dex || 0) + (compareStats.con || 0) || 1) : S;

  const r = Math.floor((str / S) * 255);
  const g = Math.floor((dex / S) * 255);
  const b = Math.floor((con / S) * 255);

  const ratio = S / compareS;
  const size = Math.max(40, Math.min(160, 80 * Math.sqrt(ratio)));

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '8px',
  };
};

const AnimatedBattleScreen: React.FC = () => {
  const {
    player,
    playerShield,
    currentEnemy,
    stage,
    maxStage,
    gameStatus,
    lastDamageDealt,
    lastReflectedDamage,
    lastEnemyEvadedTime,
    lastPlayerEvadedTime,
    spawnEnemy,
    attackEnemy,
    attackPlayer,
    retryCurrentFloor,
    equippedCore,
  } = useGameStore();

  const computed = getComputedStats(player.stats, useGameStore.getState().unlockedSkills);
  const currentEnemyId = currentEnemy?.id;
  const enemyComputed = currentEnemy ? getComputedStats(currentEnemy.stats) : null;
  const enemyAttackSpeed = enemyComputed?.attackSpeed ?? 1;

  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit'>('idle');
  const [enemyAnim, setEnemyAnim] = useState<'idle' | 'attack' | 'hit'>('idle');

  const [damagePopups, setDamagePopups] = useState<{ id: number, val: number, type: 'normal' | 'core' | 'reflect' | 'taken' | 'miss-enemy' | 'miss-player', coreType?: string }[]>([]);
  const prevPlayerHealth = useRef(player.currentHealth);

  const [showStats, setShowStats] = useState<boolean>(false);

  useEffect(() => {
    if (gameStatus !== 'BATTLE') {
      setPlayerAnim('idle');
      setEnemyAnim('idle');
    }
  }, [gameStatus]);

  useEffect(() => {
    if (gameStatus === 'IDLE') spawnEnemy();

    let playerAttackTimer: number;
    let enemyAttackTimer: number;

    if (gameStatus === 'BATTLE' && currentEnemyId) {
      playerAttackTimer = window.setInterval(() => {
        setPlayerAnim('attack');
        setTimeout(() => setEnemyAnim('hit'), 100);
        setTimeout(() => setPlayerAnim('idle'), 250);
        setTimeout(() => setEnemyAnim('idle'), 400);

        attackEnemy();
      }, 1000 / computed.attackSpeed);

      enemyAttackTimer = window.setInterval(() => {
        setEnemyAnim('attack');
        setTimeout(() => setPlayerAnim('hit'), 100);
        setTimeout(() => setEnemyAnim('idle'), 250);
        setTimeout(() => setPlayerAnim('idle'), 400);

        attackPlayer();
      }, 1000 / enemyAttackSpeed);
    }

    return () => {
      clearInterval(playerAttackTimer);
      clearInterval(enemyAttackTimer);
    };
  }, [gameStatus, currentEnemyId, computed.attackSpeed, enemyAttackSpeed, spawnEnemy, attackEnemy, attackPlayer]);

  // 플레이어가 적을 때렸을 때 데미지 텍스트
  useEffect(() => {
    if (lastDamageDealt && (lastDamageDealt.normal > 0 || lastDamageDealt.core > 0)) {
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
    }
  }, [lastPlayerEvadedTime]);

  // 적이 나에게 입힌 피격 데미지
  useEffect(() => {
    if (gameStatus === 'BATTLE' && player.currentHealth < prevPlayerHealth.current) {
      const damageTaken = prevPlayerHealth.current - player.currentHealth;
      const newPopup = {
        id: Date.now() + Math.random(),
        val: Math.floor(damageTaken),
        type: 'taken' as const
      };

      // [수정됨] 내 공격(0ms)과 적의 공격이 동시에 발생했을 때 시각적으로 엇박자를 주어 구분되도록 150ms 지연
      setTimeout(() => setDamagePopups(prev => [...prev, newPopup]), 150);

      setTimeout(() => {
        setDamagePopups(prev => prev.filter(p => p.id !== newPopup.id));
      }, 1150);
    }
    prevPlayerHealth.current = player.currentHealth;
  }, [player.currentHealth, gameStatus]);

  useEffect(() => {
    if (gameStatus === 'VICTORY') {
      const timer = setTimeout(() => spawnEnemy(), 1000);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, spawnEnemy]);

  // [수정됨] 패배 연출 시간 및 자동 스탯 보기 개선
  useEffect(() => {
    if (gameStatus === 'DEFEAT') {
      setShowStats(true); // [신규] 패배 시 적과 나의 스탯을 비교할 수 있도록 상세 스탯 창을 자동으로 엽니다.
      const timer = setTimeout(() => retryCurrentFloor(), 4000); // [수정됨] 대기 시간을 1.5초 -> 4초로 변경하여 충분한 여유를 제공합니다.
      return () => clearTimeout(timer);
    }
  }, [gameStatus, retryCurrentFloor]);

  const playerVariants: Variants = {
    idle: { y: [0, -8, 0], transition: { repeat: Infinity, duration: 2, ease: "easeInOut" } },
    attack: { x: [0, 65, 0], transition: { duration: 0.22, times: [0, 0.4, 1] } },
    hit: { x: [-10, 10, -10, 5, 0], filter: ["brightness(1)", "brightness(2) drop-shadow(0 0 10px red)", "brightness(1)"], transition: { duration: 0.3 } }
  };

  const enemyVariants: Variants = {
    idle: { y: [0, -8, 0], transition: { repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 } },
    attack: { x: [0, -65, 0], transition: { duration: 0.22, times: [0, 0.4, 1] } },
    hit: { x: [10, -10, 10, -5, 0], filter: ["brightness(1)", "brightness(2) drop-shadow(0 0 10px white)", "brightness(1)"], transition: { duration: 0.3 } }
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

  return (
      <div className="max-w-4xl mx-auto p-6 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-6">

        {/* 헤더: 스테이지 및 경험치 바 */}
        <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 flex flex-col gap-2 w-full">
          <div className="flex justify-between items-end">
            <h2 className="text-xl font-bold text-yellow-500 leading-none flex items-center gap-2">
              STAGE {stage}
              {(maxStage || 1) > stage && (
                  <span className="text-red-500 text-sm md:text-base">({maxStage})</span>
              )}
            </h2>
            {player.statPoints > 0 && (
                <span className="bg-green-900/40 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold border border-green-700/50 animate-pulse">
                잔여 스탯: {player.statPoints}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center mt-1">
            <span className="text-sm font-bold text-white">Lv. {player.level}</span>
            <span className="text-[10px] text-neutral-400 font-mono">
              {Math.floor(player.experience)} / {player.nextLevelExperience} EXP
            </span>
          </div>

          <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden border border-neutral-700">
            <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (player.experience / player.nextLevelExperience) * 100)}%` }}
            />
          </div>
        </div>

        {/* 격투 영역 */}
        <div className="bg-neutral-800/50 rounded-xl p-6 min-h-[350px] flex flex-col justify-between border border-neutral-700 relative">

          <div className="flex justify-between items-start w-full gap-4 relative z-10">
            {/* 플레이어 체력바 */}
            <div className="flex-1 flex flex-col">
              <div className="text-right text-xs mb-1 font-bold">
                {(playerShield || 0) > 0 && (
                    <span className="text-blue-400 mr-2">🛡️ {Math.floor(playerShield || 0)}</span>
                )}
                <span className="text-green-400">{Math.max(0, player.currentHealth)} / {computed.maxHealth.toFixed(0)}</span>
              </div>
              <div className="w-full bg-neutral-700 h-3 rounded border border-neutral-600 flex justify-end relative">
                <div
                    className="bg-green-500 h-full transition-all duration-300"
                    style={{ width: `${(player.currentHealth / computed.maxHealth) * 100}%` }}
                />
                {(playerShield || 0) > 0 && (
                    <div
                        className="absolute right-0 top-0 bg-blue-500/60 h-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        style={{ width: `${Math.min(100, ((playerShield || 0) / computed.maxHealth) * 100)}%` }}
                    />
                )}
              </div>
            </div>

            <div className="text-2xl font-black text-yellow-500/50 italic pt-2 shrink-0">VS</div>

            {/* 적 체력바 */}
            <div className="flex-1 flex flex-col">
              <div className="text-left text-xs mb-1 font-bold text-red-400">
                {Math.max(0, currentEnemy?.currentHealth || 0)} / {enemyComputed?.maxHealth.toFixed(0) || 1}
              </div>
              <div className="w-full bg-neutral-700 h-3 rounded border border-neutral-600 flex justify-start relative">
                <div
                    className="bg-red-500 h-full transition-all duration-300"
                    style={{ width: `${((currentEnemy?.currentHealth || 0) / (enemyComputed?.maxHealth || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* 캐릭터 박스 렌더링 */}
          <div className="flex justify-center items-end gap-16 pb-12 z-10 mt-auto relative">

            {/* 플레이어 박스 */}
            <div className="relative z-20">
              <motion.div
                  variants={playerVariants}
                  animate={playerAnim}
                  className="flex items-center justify-center font-bold text-xs border-2 border-white/20 shadow-[0_0_15px_rgba(34,197,94,0.3)] z-20"
                  style={getDynamicStyle(player.stats, currentEnemy?.stats || player.stats)}
              >
                ME
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
                          className={`absolute left-1/2 -translate-x-1/2 -top-4 font-black whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-50 ${isMiss ? 'text-neutral-400 text-lg italic' : 'text-red-500 text-lg'}`}
                      >
                        {isMiss ? 'MISS' : `-${popup.val}`}
                      </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {/* 적 박스 */}
            <div className="relative z-20">
              {currentEnemy ? (
                  <motion.div
                      variants={enemyVariants}
                      animate={enemyAnim}
                      className="flex items-center justify-center font-bold text-xs border-2 border-white/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                      style={getDynamicStyle(currentEnemy.stats, player.stats)}
                  >
                    BOX
                  </motion.div>
              ) : (
                  <div className="w-[80px] h-[80px] flex items-center justify-center text-neutral-500 italic">...</div>
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
                          // xOffset과 yOffset을 animate에 적용하여 겹침을 완벽 방지
                          initial={{ opacity: 0, y: 0, scale: 0.5, x: 0 }}
                          animate={{ opacity: 1, y: yOffset, scale: scaleVal, x: xOffset }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`absolute left-1/2 -translate-x-1/2 -top-4 font-black whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-50 ${colorClass}`}
                      >
                        {text}
                      </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* [수정됨] 패배 오버레이 시인성 개선 */}
          {gameStatus === 'DEFEAT' && (
              <div className="absolute inset-0 bg-red-900/20 border-4 border-red-600/70 flex flex-col items-center justify-center z-50 pointer-events-none">
                <div className="bg-neutral-900/90 px-8 py-5 rounded-2xl border border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)] flex flex-col items-center pointer-events-auto">
                  <h2 className="text-4xl font-black text-red-500 mb-2 animate-bounce">DEFEAT</h2>
                  <p className="text-neutral-100 text-sm font-bold mb-1">전투에서 패배했습니다!</p>
                  <p className="text-neutral-400 text-xs">잠시 후 이전 층으로 돌아갑니다...</p>
                </div>
              </div>
          )}
        </div>

        {/* 하단: 컴팩트 일체형 상세 스탯 창 */}
        <div className="flex flex-col bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden">

          <button
              type="button"
              onClick={() => setShowStats(!showStats)}
              className="w-full py-2 bg-neutral-900/60 hover:bg-neutral-900 text-[11px] font-bold text-neutral-400 hover:text-neutral-200 transition-colors duration-150 flex items-center justify-center gap-1 border-b border-neutral-900"
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
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-0.5 text-[11px] font-mono">
                    {statComparisonList.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex justify-between items-center py-0.5 border-b border-neutral-900/40"
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