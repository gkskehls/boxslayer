import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
// import type { Stats } from '../types/game'; // Stats 타입 제거

interface BattleScreenProps {
  onDefeat: () => void;
}

const BattleScreen: React.FC<BattleScreenProps> = ({ onDefeat }) => {
  const {
    player,
    currentEnemy,
    stage,
    gameStatus,
    spawnEnemy,
    attackEnemy,
    attackPlayer,
    resetGame,
  } = useGameStore();

  // Simple Auto-Battle Loop
  useEffect(() => {
    if (gameStatus === 'IDLE') {
      spawnEnemy();
    }

    let playerAttackTimer: number;
    let enemyAttackTimer: number;

    if (gameStatus === 'BATTLE' && currentEnemy) {
      // Player attacks enemy
      playerAttackTimer = window.setInterval(() => {
        attackEnemy();
      }, 1000 / player.stats.attackSpeed);

      // Enemy attacks player
      enemyAttackTimer = window.setInterval(() => {
        attackPlayer(currentEnemy.stats.attack);
      }, 1000 / currentEnemy.stats.attackSpeed);
    }

    return () => {
      clearInterval(playerAttackTimer);
      clearInterval(enemyAttackTimer);
    };
  }, [gameStatus, currentEnemy, player.stats.attackSpeed, spawnEnemy, attackEnemy, attackPlayer]);

  // Handle Victory - Spawn next enemy after a short delay
  useEffect(() => {
    if (gameStatus === 'VICTORY') {
      const timer = setTimeout(() => {
        spawnEnemy();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, spawnEnemy]);

  // 게임 오버 시 리셋 버튼 핸들러
  const handleRetry = () => {
    resetGame();
    onDefeat(); // App.tsx로 게임 오버 처리 위임
  };

  return (
    <div className="max-w-4xl mx-auto p-6 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-6">
      {/* Header Info */}
      <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-yellow-500">STAGE {stage}</h2>
          <p className="text-sm text-neutral-400">Level {player.level}</p>
        </div>
        <div className="flex-1 mx-8">
          <div className="text-xs mb-1 flex justify-between">
            <span>XP</span>
            <span>{player.experience} / {player.nextLevelExperience}</span>
          </div>
          <div className="w-full bg-neutral-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${(player.experience / player.nextLevelExperience) * 100}%` }}
            />
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-400">Stat Points</p>
          <p className="text-xl font-bold text-green-500">{player.statPoints}</p>
        </div>
      </div>

      {/* Battle Area */}
      <div className="bg-neutral-800/50 rounded-xl p-8 relative overflow-hidden min-h-[400px] flex justify-around items-center border border-neutral-700">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        {/* Player Side */}
        <div className="flex flex-col items-center z-10 p-4 bg-neutral-700/50 rounded-lg border border-neutral-600">
          <div className="mb-4 w-48">
            <div className="flex justify-between text-xs mb-1">
              <span>HP</span>
              <span>{Math.max(0, player.currentHealth)} / {player.stats.maxHealth}</span>
            </div>
            <div className="w-full bg-neutral-700 h-3 rounded-full overflow-hidden border border-neutral-600">
              <div
                className="bg-green-500 h-full health-bar"
                style={{ width: `${(player.currentHealth / player.stats.maxHealth) * 100}%` }}
              />
            </div>
          </div>

          {/* Player Box - Appearance changes based on stats */}
          <div
            className="transition-all duration-300 flex items-center justify-center border-4 relative"
            style={{
              width: `${60 + player.stats.maxHealth / 10}px`,
              height: `${60 + player.stats.maxHealth / 10}px`,
              borderColor: player.stats.attack > 20 ? '#ef4444' : '#3b82f6',
              borderWidth: `${2 + player.stats.defense / 5}px`,
              backgroundColor: '#1e293b',
              boxShadow: player.stats.attackSpeed > 1.5 ? '0 0 20px #60a5fa' : 'none'
            }}
          >
            <span className="font-bold">ME</span>
            {gameStatus === 'BATTLE' && (
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 animate-ping rounded-full" />
            )}
          </div>
          <p className="mt-4 font-bold">{player.name}</p>
        </div>

        {/* Enemy Side */}
        <div className="flex flex-col items-center z-10 p-4 bg-neutral-700/50 rounded-lg border border-neutral-600">
          {currentEnemy ? (
            <>
              <div className="mb-4 w-48">
                <div className="flex justify-between text-xs mb-1 text-red-400">
                  <span>HP</span>
                  <span>{Math.max(0, currentEnemy.currentHealth)} / {currentEnemy.stats.maxHealth}</span>
                </div>
                <div className="w-full bg-neutral-700 h-3 rounded-full overflow-hidden border border-neutral-600">
                  <div
                    className="bg-red-500 h-full health-bar"
                    style={{ width: `${(currentEnemy.currentHealth / currentEnemy.stats.maxHealth) * 100}%` }}
                  />
                </div>
              </div>

              <div
                className={`transition-all duration-300 flex items-center justify-center border-4 ${currentEnemy.type === 'BOSS' ? 'border-purple-500 bg-purple-900/20' : 'border-neutral-400 bg-neutral-700'}`}
                style={{
                  width: `${60 + currentEnemy.stats.maxHealth / 15}px`,
                  height: `${60 + currentEnemy.stats.maxHealth / 15}px`,
                  borderWidth: `${2 + currentEnemy.stats.defense / 3}px`
                }}
              >
                <span className="font-bold text-xs">{currentEnemy.name}</span>
              </div>
              <p className="mt-4 font-bold text-red-400">{currentEnemy.type === 'BOSS' ? 'BOSS' : 'ENEMY'}</p>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-neutral-500 italic">
              {gameStatus === 'VICTORY' ? 'Victory! Next enemy coming...' : 'Waiting for enemy...'}
            </div>
          )}
        </div>

        {/* Status Overlay */}
        {gameStatus === 'DEFEAT' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
            <h2 className="text-4xl font-bold text-red-500 mb-4">GAME OVER</h2>
            <button
              onClick={handleRetry} // 리셋 핸들러 사용
              className="px-6 py-2 bg-white text-black font-bold rounded hover:bg-neutral-200 transition-colors"
            >
              RETRY
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BattleScreen;