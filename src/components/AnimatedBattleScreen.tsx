// src/components/AnimatedBattleScreen.tsx

import React, { useEffect, useState } from 'react';
import { useGameStore, getComputedStats } from '../store/gameStore';
import { motion, AnimatePresence, type Variants } from 'framer-motion'; // [수정됨] Variants 타입 추가

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
    lastReflectedDamage, // [신규] 반사 데미지 상태 가져오기
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

  // [신규] 박스 애니메이션 상태 관리 ('idle' | 'attack' | 'hit')
  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit'>('idle');
  const [enemyAnim, setEnemyAnim] = useState<'idle' | 'attack' | 'hit'>('idle');

  // [신규] 데미지 텍스트 팝업을 위한 배열 (type 속성으로 세분화)
  const [damagePopups, setDamagePopups] = useState<{ id: number, val: number, type: 'normal' | 'core' | 'reflect' }[]>([]);

  useEffect(() => {
    if (gameStatus === 'IDLE') spawnEnemy();

    let playerAttackTimer: number;
    let enemyAttackTimer: number;

    if (gameStatus === 'BATTLE' && currentEnemyId) {
      playerAttackTimer = window.setInterval(() => {
        // 1. 공격 애니메이션 트리거 (돌진)
        setPlayerAnim('attack');

        // 2. 적 피격 애니메이션 트리거 (떨림)
        setTimeout(() => setEnemyAnim('hit'), 100);

        // 3. 상태 복귀
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

// [신규] 플레이어가 적을 때렸을 때 데미지 텍스트 띄우기
  useEffect(() => {
    if (lastDamageDealt && (lastDamageDealt.normal > 0 || lastDamageDealt.core > 0)) {
      const newPopup = {
        id: Date.now(),
        val: lastDamageDealt.normal + lastDamageDealt.core,
        type: (lastDamageDealt.core > 0 ? 'core' : 'normal') as 'normal' | 'core' | 'reflect'
      };

      // [수정됨] setTimeout을 이용해 비동기로 처리하여 ESLint 연속 렌더링 경고 해결
      setTimeout(() => setDamagePopups(prev => [...prev, newPopup]), 0);

      // 1초 뒤에 텍스트 삭제
      setTimeout(() => {
        setDamagePopups(prev => prev.filter(p => p.id !== newPopup.id));
      }, 1000);
    }
  }, [lastDamageDealt]);

// [신규] 물 코어 반사 데미지가 발생했을 때 파란색 텍스트 띄우기
  useEffect(() => {
    if (lastReflectedDamage && lastReflectedDamage > 0) {
      const newPopup = {
        id: Date.now() + 1, // ID 충돌 방지
        val: lastReflectedDamage,
        type: 'reflect' as const
      };

      // [수정됨] setTimeout을 이용해 비동기로 처리하여 ESLint 연속 렌더링 경고 해결
      setTimeout(() => setDamagePopups(prev => [...prev, newPopup]), 0);

      setTimeout(() => {
        setDamagePopups(prev => prev.filter(p => p.id !== newPopup.id));
      }, 1000);
    }
  }, [lastReflectedDamage]);

  useEffect(() => {
    if (gameStatus === 'VICTORY') {
      const timer = setTimeout(() => spawnEnemy(), 1000);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, spawnEnemy]);

  useEffect(() => {
    if (gameStatus === 'DEFEAT') {
      const timer = setTimeout(() => retryCurrentFloor(), 1500);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, retryCurrentFloor]);

  // [신규] Framer Motion 애니메이션 시퀀스 (Variants 타입 명시)
  const playerVariants: Variants = {
    idle: { y: [0, -8, 0], transition: { repeat: Infinity, duration: 2, ease: "easeInOut" } },
    attack: { x: [0, 60, 0], scaleX: [1, 1.3, 1], scaleY: [1, 0.8, 1], transition: { duration: 0.25, times: [0, 0.4, 1] } },
    hit: { x: [-10, 10, -10, 5, 0], filter: ["brightness(1)", "brightness(2) drop-shadow(0 0 10px red)", "brightness(1)"], transition: { duration: 0.3 } }
  };

  const enemyVariants: Variants = {
    idle: { y: [0, -8, 0], transition: { repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 } },
    attack: { x: [0, -60, 0], scaleX: [1, 1.3, 1], scaleY: [1, 0.8, 1], transition: { duration: 0.25, times: [0, 0.4, 1] } },
    hit: { x: [10, -10, 10, -5, 0], filter: ["brightness(1)", "brightness(2) drop-shadow(0 0 10px white)", "brightness(1)"], transition: { duration: 0.3 } }
  };

  return (
      <div className="max-w-4xl mx-auto p-6 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-6">

        {/* 상단: 스탯 정보 (getComputedStats 적용으로 스킬 보너스 수치가 화면에 보임) */}
        <div className="flex justify-between items-start text-[11px] text-neutral-400 bg-neutral-950 p-3 rounded border border-neutral-800">
          <div className="flex flex-col gap-1">
            <div className="font-bold text-white">
              내: 공 {player.stats.str} / 민 {player.stats.dex} / 체 {player.stats.con}
            </div>
            <div className="text-[9px] text-neutral-500">
              ⚔️ {computed.attack.toFixed(1)} | 🛡️ {computed.defense.toFixed(1)} | ❤️ {computed.maxHealth.toFixed(0)}<br/>
              ⚡ {computed.attackSpeed.toFixed(2)} | 💨 {(computed.evasion * 100).toFixed(1)}%
            </div>
          </div>

          <div className="font-bold text-yellow-400 text-sm flex flex-col items-center">
            <div className="text-[10px] text-purple-400 mt-1 animate-pulse">
              [ 애니메이션 테스트룸 ]
            </div>
            {/* [수정됨] 장착된 코어 표시 부활 (미사용 변수 에러 해결) */}
            <div className="text-[10px] text-purple-400 mt-1">
              CORE: {equippedCore ? equippedCore.name : "None"}
            </div>
          </div>

          <div className="flex flex-col gap-1 text-right">
            <div className="font-bold text-white">
              적: 공 {currentEnemy?.stats.str || 0} / 민 {currentEnemy?.stats.dex || 0} / 체 {currentEnemy?.stats.con || 0}
            </div>
            {enemyComputed && (
                <div className="text-[9px] text-neutral-500">
                  ⚔️ {enemyComputed.attack.toFixed(1)} | 🛡️ {enemyComputed.defense.toFixed(1)} | ❤️ {enemyComputed.maxHealth.toFixed(0)}<br/>
                  ⚡ {enemyComputed.attackSpeed.toFixed(2)} | 💨 {(enemyComputed.evasion * 100).toFixed(1)}%
                </div>
            )}
          </div>
        </div>

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
        {/* [수정됨] 데미지 텍스트가 UI를 시원하게 뚫고 나가는 연출을 위해 min-h-[350px]로 원복하고 overflow-hidden을 제거했습니다. */}
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

          {/* 캐릭터 박스 렌더링 (motion.div 적용) */}
          <div className="flex justify-center items-end gap-16 pb-12 z-10 mt-auto relative">

            {/* 플레이어 박스 */}
            <motion.div
                variants={playerVariants}
                animate={playerAnim}
                className="flex items-center justify-center font-bold text-xs border-2 border-white/20 shadow-[0_0_15px_rgba(34,197,94,0.3)] z-20"
                style={getDynamicStyle(player.stats, currentEnemy?.stats || player.stats)}
            >
              ME
            </motion.div>

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

              {/* 데미지 텍스트 팝업 (적 박스 위에서 떠오름) */}
              <AnimatePresence>
                {damagePopups.map((popup) => {
                  // 타입에 따른 스타일 분기
                  let colorClass = 'text-white text-base';
                  let scaleVal = 1.2;

                  if (popup.type === 'core') {
                    colorClass = 'text-orange-500 text-xl'; // 불 코어 등 추가 피해 (주황색)
                    scaleVal = 1.5;
                  } else if (popup.type === 'reflect') {
                    colorClass = 'text-blue-400 text-lg'; // 물 코어 반사 피해 (파란색)
                    scaleVal = 1.3;
                  }

                  return (
                      <motion.div
                          key={popup.id}
                          initial={{ opacity: 0, y: 0, scale: 0.5 }}
                          animate={{ opacity: 1, y: -60, scale: scaleVal }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`absolute left-1/2 -translate-x-1/2 -top-4 font-black whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-50 ${colorClass}`}
                      >
                        -{popup.val}
                      </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {gameStatus === 'DEFEAT' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
                <h2 className="text-4xl font-bold text-red-500 mb-4 animate-bounce">GAME OVER</h2>
                <p className="text-neutral-300 text-sm">잠시 후 이전 층으로 돌아갑니다...</p>
              </div>
          )}
        </div>
      </div>
  );
};

export default AnimatedBattleScreen;