// src/components/BattleScreen.tsx

import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

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

  const getDynamicStyle = (stats: { str: number; dex: number; con: number }) => {
    const S = stats.str + stats.dex + stats.con || 1;
    const baseTotal = 30; // 초기 스탯 총합 기준값

    // 1. 색상 계산 (기존 로직)
    const rRatio = stats.str / S;
    const gRatio = stats.dex / S;
    const bRatio = stats.con / S;
    const brightness = Math.max(50, Math.min(220, 255 - (S * 0.5)));
    const backgroundColor = `rgb(${Math.floor(rRatio * brightness)}, ${Math.floor(gRatio * brightness)}, ${Math.floor(bRatio * brightness)})`;

    // 2. [기획 16.3] 크기 계산: 기본 크기(80px) * (스탯 총합^0.5 / 비교 대상 총합^0.5)
    // Clamp 적용: 너무 커지거나 작아지지 않게 40px ~ 160px 사이로 제한
    const sizeMultiplier = Math.sqrt(S) / Math.sqrt(baseTotal);
    const size = Math.max(40, Math.min(160, 80 * sizeMultiplier));

    return { backgroundColor, width: `${size}px`, height: `${size}px` };
  };

  const currentEnemyId = currentEnemy?.id;
  const enemyAttackSpeed = currentEnemy?.stats.attackSpeed || 1;

  useEffect(() => {
    if (gameStatus === 'IDLE') spawnEnemy();

    let playerAttackTimer: number;
    let enemyAttackTimer: number;

    if (gameStatus === 'BATTLE' && currentEnemyId) {
      playerAttackTimer = window.setInterval(() => {
        attackEnemy();
      }, 1000 / player.stats.attackSpeed);

      enemyAttackTimer = window.setInterval(() => {
        attackPlayer();
      }, 1000 / enemyAttackSpeed);
    }

    return () => {
      clearInterval(playerAttackTimer);
      clearInterval(enemyAttackTimer);
    };
  }, [gameStatus, currentEnemyId, player.stats.attackSpeed, enemyAttackSpeed, spawnEnemy, attackEnemy, attackPlayer]);

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
        <div className="flex justify-between items-center text-[11px] text-neutral-400 bg-neutral-950 p-3 rounded border border-neutral-800">
          <div>
            내: 공 {player.stats.str} / 민 {player.stats.dex} / 체 {player.stats.con}
          </div>

          <div className="font-bold text-yellow-400 text-sm flex flex-col items-center">
            <div>
              LAST DMG:
              <span className="text-white ml-1">{lastDamageDealt.normal}</span>
              {lastDamageDealt.core > 0 && (
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

          <div>
            적: 공 {currentEnemy?.stats.str || 0} / 민 {currentEnemy?.stats.dex || 0} / 체 {currentEnemy?.stats.con || 0}
          </div>
        </div>

        {/* Header Info */}
        <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:w-auto text-center sm:text-left">
            <h2 className="text-lg sm:text-xl font-bold text-yellow-500">STAGE {stage}</h2>
            <p className="text-xs text-neutral-400">Level {player.level}</p>
          </div>

          <div className="flex-1 w-full sm:mx-8">
            <div className="w-full bg-neutral-700 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${(player.experience / player.nextLevelExperience) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Battle Area */}
        <div className="bg-neutral-800/50 rounded-xl p-8 min-h-[400px] flex flex-col sm:flex-row justify-center items-center gap-8 border border-neutral-700 relative">
          {/* Player Side */}
          <div className="flex flex-col items-center z-10 p-4 bg-neutral-700/50 rounded-lg border border-neutral-600">
            <div className="mb-4 w-48">
              <div className="flex justify-between text-xs mb-1"><span>HP</span><span>{Math.max(0, player.currentHealth)} / {player.stats.maxHealth}</span></div>
              <div className="w-full bg-neutral-700 h-3 rounded-full"><div className="bg-green-500 h-full" style={{ width: `${(player.currentHealth / player.stats.maxHealth) * 100}%` }} /></div>
            </div>ㄿ
            <div
                className="flex items-center justify-center font-bold text-xs border-2 border-white/20 transition-all duration-500"
                style={getDynamicStyle(player.stats)}
            >
              ME
            </div>
          </div>

          {/* Enemy Side */}
          <div className="flex flex-col items-center z-10 p-4 bg-neutral-700/50 rounded-lg border border-neutral-600">
            {currentEnemy ? (
                <>
                  <div className="mb-4 w-48">
                    <div className="flex justify-between text-xs mb-1 text-red-400"><span>HP</span><span>{Math.max(0, currentEnemy.currentHealth)} / {currentEnemy.stats.maxHealth}</span></div>
                    <div className="w-full bg-neutral-700 h-3 rounded-full"><div className="bg-red-500 h-full" style={{ width: `${(currentEnemy.currentHealth / currentEnemy.stats.maxHealth) * 100}%` }} /></div>
                  </div>
                  <div
                      className="flex items-center justify-center font-bold text-xs border-2 border-white/20 transition-all duration-500"
                      style={getDynamicStyle(currentEnemy.stats)}
                  >
                    {currentEnemy.name}
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