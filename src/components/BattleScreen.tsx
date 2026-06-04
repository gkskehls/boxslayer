// src/components/BattleScreen.tsx

import React, { useEffect } from 'react';
import { useGameStore, getComputedStats } from '../store/gameStore';

// 1. 함수 선언 (export 제거, 로직 통합)
const getDynamicStyle = (stats: { str: number; dex: number; con: number }, compareStats?: { str: number; dex: number; con: number }) => {
  const { str, dex, con } = stats;
  // 내 스탯 총합
  const S = (str || 0) + (dex || 0) + (con || 0) || 1;
  // 상대 스탯 총합 (없으면 내 스탯과 동일하게 계산)
  const compareS = compareStats ? ((compareStats.str || 0) + (compareStats.dex || 0) + (compareStats.con || 0) || 1) : S;

  // 색상 계산 (내 스탯 비중)
  const r = Math.floor((str / S) * 255);
  const g = Math.floor((dex / S) * 255);
  const b = Math.floor((con / S) * 255);

  // 크기 계산 (상대 스탯 대비 비율 반영, 40~160px 제한)
  // ratio가 1보다 크면 커지고, 작으면 작아짐
  const ratio = S / compareS;
  const size = Math.max(40, Math.min(160, 80 * Math.sqrt(ratio)));

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '8px',
    transition: 'all 0.5s ease'
  };
};

const BattleScreen: React.FC = () => {
  const {
    player,
    currentEnemy,
    stage,
    gameStatus,
    lastDamageDealt, // 추가된 상태
    spawnEnemy,
    attackEnemy,
    attackPlayer,
    retryCurrentFloor,
    equippedCore, // 장착된 코어 정보 가져오기
  } = useGameStore();

  const computed = getComputedStats(player.stats);
  const currentEnemyId = currentEnemy?.id;
  const enemyComputed = currentEnemy ? getComputedStats(currentEnemy.stats) : null;
  const enemyAttackSpeed = enemyComputed?.attackSpeed ?? 1;

  useEffect(() => {
    if (gameStatus === 'IDLE') spawnEnemy();

    let playerAttackTimer: number;
    let enemyAttackTimer: number;

    if (gameStatus === 'BATTLE' && currentEnemyId) {
      playerAttackTimer = window.setInterval(() => {
        attackEnemy();
      }, 1000 / computed.attackSpeed);

      enemyAttackTimer = window.setInterval(() => {
        attackPlayer();
      }, 1000 / enemyAttackSpeed);
    }

    return () => {
      clearInterval(playerAttackTimer);
      clearInterval(enemyAttackTimer);
    };
  }, [gameStatus, currentEnemyId, computed.attackSpeed, enemyAttackSpeed, spawnEnemy, attackEnemy, attackPlayer]);

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

  return (
      <div className="max-w-4xl mx-auto p-6 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-6">

        {/* 실시간 데미지 및 코어 상태 표시 */}
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
            <div>
              LAST DMG:
              <span className="text-white ml-1">
                {lastDamageDealt?.normal ?? 0}
              </span>
              { (lastDamageDealt?.core ?? 0) > 0 && (
                  <span className="text-red-500 ml-1">
                    + {lastDamageDealt.core} (🔥)
                  </span>
              )}
            </div>
            {/* 여기서 equippedCore를 사용합니다 (TS6133 해결) */}
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

        {/* Header Info (모바일 세로모드 최적화) */}
        <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 flex flex-col gap-2 w-full">

          {/* 1층: 스테이지 & 잔여 스탯 포인트 */}
          <div className="flex justify-between items-end">
            <h2 className="text-xl font-bold text-yellow-500 leading-none">STAGE {stage}</h2>
            {player.statPoints > 0 && (
                <span className="bg-green-900/40 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold border border-green-700/50 animate-pulse">
                잔여 스탯: {player.statPoints}
              </span>
            )}
          </div>

          {/* 2층: 레벨 & 경험치 텍스트 */}
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm font-bold text-white">Lv. {player.level}</span>
            <span className="text-[10px] text-neutral-400 font-mono">
              {Math.floor(player.experience)} / {player.nextLevelExperience} EXP
            </span>
          </div>

          {/* 3층: 경험치 바 */}
          <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden border border-neutral-700">
            <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (player.experience / player.nextLevelExperience) * 100)}%` }}
            />
          </div>

        </div>

        {/* Battle Area */}
        <div className="bg-neutral-800/50 rounded-xl p-8 min-h-[400px] flex flex-col sm:flex-row justify-center items-center gap-8 border border-neutral-700 relative">
          {/* Player Side */}
          <div className="flex flex-col items-center z-10 p-4 bg-neutral-700/50 rounded-lg border border-neutral-600">
            <div className="mb-4 w-48">
              <div className="flex justify-between text-xs mb-1">
                <span>HP</span>
                <span>{Math.max(0, player.currentHealth)} / {computed.maxHealth.toFixed(0)}</span>
              </div>
              <div className="w-full bg-neutral-700 h-3 rounded-full">
                <div className="bg-green-500 h-full" style={{ width: `${(player.currentHealth / computed.maxHealth) * 100}%` }} />
              </div>
              <div className="w-full bg-neutral-700 h-3 rounded-full"><div className="bg-green-500 h-full" style={{ width: `${(player.currentHealth / computed.maxHealth) * 100}%` }} /></div>
            </div>ㄿ
            <div
                className="flex items-center justify-center font-bold text-xs border-2 border-white/20 transition-all duration-500"
                style={getDynamicStyle(player.stats, currentEnemy?.stats || player.stats)}
            >
              ME
            </div>
          </div>

          {/* Enemy Side */}
          <div className="flex flex-col items-center z-10 p-4 bg-neutral-700/50 rounded-lg border border-neutral-600">
            {currentEnemy ? (
                <>
                  <div className="mb-4 w-48">
                    <div className="flex justify-between text-xs mb-1 text-red-400"><span>HP</span><span>{Math.max(0, currentEnemy.currentHealth)} / {enemyComputed?.maxHealth.toFixed(0)}</span></div>
                    <div className="w-full bg-neutral-700 h-3 rounded-full"><div className="bg-red-500 h-full" style={{ width: `${(currentEnemy.currentHealth / (enemyComputed?.maxHealth || 1)) * 100}%` }} /></div>
                  </div>
                  <div
                      className="flex items-center justify-center font-bold text-xs border-2 border-white/20 transition-all duration-500"
                      style={getDynamicStyle(currentEnemy?.stats || {str: 0, dex: 0, con: 0}, player.stats)}
                  >
                    {currentEnemy?.name || "..."}
                  </div>
                </>
            ) : (
                <div className="h-48 flex items-center text-neutral-500 italic">Waiting...</div>
            )}
          </div>

          {gameStatus === 'DEFEAT' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
                <h2 className="text-4xl font-bold text-red-500">GAME OVER</h2>
              </div>
          )}
        </div>
      </div>
  );
};

export default BattleScreen;