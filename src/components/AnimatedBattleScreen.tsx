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
  // [수정됨] 스탯 차이가 심할 때 박스가 너무 작아져 표정이 깨지는 현상을 막기 위해 최소 크기를 40px -> 64px로 상향
  const size = Math.max(64, Math.min(160, 80 * Math.sqrt(ratio)));

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '0px', // [수정됨] 레트로 도트 박스 아이덴티티를 위해 둥근 모서리(8px)를 완전히 각진 픽셀 사각형(0px)으로 전환
  };
};

// [신규 추가] HP/EXP 수치를 고전 게임 감성의 █ ░ 도트 블록문자로 변환하는 함수
// [수정됨] █와 ░의 폰트 자체 높이 차이 버그를 깨부수기 위해, 동일한 █ 문자를 쓰고 안 차있는 곳은 text-neutral-700(어두운 회색)으로 디밍 처리
const renderRetroGauge = (current: number, max: number, totalBlocks: number, activeClass: string) => {
  const ratio = Math.max(0, Math.min(1, current / max));
  const filledCount = Math.round(ratio * totalBlocks);
  
  return (
    <span className="inline-flex leading-none select-none">
      {Array.from({ length: totalBlocks }).map((_, i) => (
        <span key={i} className={i < filledCount ? activeClass : 'text-neutral-700'}>
          █
        </span>
      ))}
    </span>
  );
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
//      setShowStats(true); // [신규] 패배 시 적과 나의 스탯을 비교할 수 있도록 상세 스탯 창을 자동으로 엽니다.
      const timer = setTimeout(() => retryCurrentFloor(), 8000); // [수정됨] 대기 시간을 1.5초 -> 8초로 변경하여 충분한 여유를 제공합니다.
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

  return (
      /* [수정됨] 크기를 max-w-md(모바일 세로콤팩트)로 줄이고, 색상을 옛날 게임기 플라스틱 질감인 stone-200 테마로 전면 복원 */
      <div className="max-w-md mx-auto p-4 rounded-none border-4 border-neutral-900 bg-stone-200 w-full flex flex-col gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] select-none">

        {/* 헤더: 스테이지 및 경험치 바 */}
        <div className="bg-stone-100 p-3 rounded-none border-4 border-neutral-900 flex flex-col gap-2 w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
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
          <div className="flex justify-between items-center mt-1 font-mono text-xs font-bold">
            <span className="text-white">Lv. {player.level}</span>
            <span className="text-blue-400 tracking-wider flex items-center gap-0.5">
              EXP [{renderRetroGauge(player.experience, player.nextLevelExperience, 20, 'text-blue-500')}]
            </span>
            <span className="text-[10px] text-neutral-500">
              {Math.floor(player.experience)}/{player.nextLevelExperience}
            </span>
          </div>
        </div>

        {/* [수정됨] 샘플 파일과 완벽히 일치하는 따뜻한 stone-100 배경색 및 연한 stone-200 격자 그리드 라인 주입 */}
        <div 
          className="bg-stone-100 p-6 min-h-[350px] flex flex-col justify-between border-4 border-neutral-900 relative overflow-hidden shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)]"
          style={{
            backgroundImage: 'linear-gradient(to right, #e7e5e4 2px, transparent 2px), linear-gradient(to bottom, #e7e5e4 2px, transparent 2px)',
            backgroundSize: '16px 16px',
          }}
        >

        {/* [수정됨] 바 내부의 실선 HP 바 레이아웃을 샘플과 동일한 순수 8비트 문자 블록 그리드로 전면 교체 */}
        <div className="flex justify-between items-center w-full gap-2 relative z-10 font-mono p-1 border-2 border-neutral-900 bg-neutral-900/40">
          
          {/* 플레이어 픽셀 HP 모니터 */}
          <div className="flex flex-col items-start flex-1 select-none">
            <div className="text-[10px] font-bold text-neutral-400 flex items-center gap-1">
              <span>PLAYER</span>
              {/* [수정됨] playerShield가 undefined일 때를 대비해 Math.floor 내부에 || 0 처리 주입 */}
              {(playerShield || 0) > 0 && <span className="text-blue-400 text-[9px]">🛡️+{Math.floor(playerShield || 0)}</span>}
            </div>
            <div className="text-xs font-black tracking-wider flex items-center">
              [{renderRetroGauge(player.currentHealth, computed.maxHealth, 8, 'text-green-500')}]
            </div>
            <div className="text-[9px] text-neutral-500">
              {Math.max(0, player.currentHealth)}/{computed.maxHealth.toFixed(0)}
            </div>
          </div>

          <div className="text-lg font-black text-yellow-500/20 italic shrink-0 select-none px-1">VS</div>

          {/* 적 보스 픽셀 HP 모니터 */}
          <div className="flex flex-col items-end flex-1 select-none">
            <div className="text-[10px] font-bold text-neutral-400">
              ENEMY
            </div>
            <div className="text-xs font-black tracking-wider flex items-center">
              [{renderRetroGauge(currentEnemy?.currentHealth || 0, enemyComputed?.maxHealth || 1, 8, 'text-red-500')}]
            </div>
            <div className="text-[9px] text-neutral-500">
              {Math.max(0, currentEnemy?.currentHealth || 0)}/{enemyComputed?.maxHealth.toFixed(0) || 1}
            </div>
          </div>

        </div>

          {/* 캐릭터 박스 렌더링 */}
          <div className="flex justify-center items-end gap-16 pb-12 z-10 mt-auto relative">

            {/* 플레이어 박스 영역 */}
            <div className="relative z-20">
              <motion.div
                  variants={playerVariants}
                  animate={playerAnim}
                  className="flex items-center justify-center border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20 overflow-hidden"
                  style={getDynamicStyle(player.stats, currentEnemy?.stats || player.stats)}
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
                          className={`absolute left-1/2 -translate-x-1/2 -top-4 font-mono font-black whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-50 ${isMiss ? 'text-neutral-400 text-base italic' : 'text-red-500 text-lg'}`}
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
                      style={getDynamicStyle(currentEnemy.stats, player.stats)}
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

          {/* [수정됨] 패배 오버레이 시인성 개선: 완벽한 도트풍 스퀘어 모듈 UI로 이식 */}
          {gameStatus === 'DEFEAT' && (
              <div className="absolute inset-0 bg-red-950/40 border-4 border-red-600 flex flex-col items-center justify-center z-50 pointer-events-none">
                <div className="bg-neutral-950 px-8 py-5 border-4 border-neutral-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center pointer-events-auto rounded-none">
                  <h2 className="text-3xl font-black text-red-500 mb-2 animate-pulse font-mono tracking-widest">GAME OVER</h2>
                  <p className="text-neutral-100 text-xs font-bold mb-1">전투에서 패배했습니다!</p>
                  <p className="text-neutral-400 text-[10px] font-mono">잠시 후 이전 층으로 돌아갑니다...</p>
                </div>
              </div>
          )}
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
                    {statComparisonList.map((item, idx) => (
                        <div
                            key={idx}
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