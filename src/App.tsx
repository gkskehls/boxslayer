import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import type { Stats } from './types/game';

function App() {
  const {
    player,
    currentEnemy,
    stage,
    gameStatus,
    spawnEnemy,
    attackEnemy,
    attackPlayer,
    distributeStat
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

  const getStatLabel = (key: keyof Stats) => {
    switch (key) {
      case 'attack': return '공격력';
      case 'defense': return '방어력';
      case 'maxHealth': return '최대체력';
      case 'attackSpeed': return '공격속도';
      default: return key;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4 font-mono">
      {/* Header Info */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-8 bg-neutral-800 p-4 rounded-lg border border-neutral-700">
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
      <div className="max-w-4xl mx-auto grid grid-cols-2 gap-8 items-center py-12 bg-neutral-800/50 rounded-xl mb-8 relative overflow-hidden min-h-[400px]">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ 
               backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
             }}
        />

        {/* Player Side */}
        <div className="flex flex-col items-center z-10">
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
        <div className="flex flex-col items-center z-10">
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
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white text-black font-bold rounded hover:bg-neutral-200 transition-colors"
            >
              RETRY
            </button>
          </div>
        )}
      </div>

      {/* Stats Upgrade Area */}
      <div className="max-w-4xl mx-auto bg-neutral-800 p-6 rounded-xl border border-neutral-700">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <span className="mr-2">⚔️</span> 스탯 강화
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['attack', 'defense', 'maxHealth', 'attackSpeed'] as const).map((stat) => (
            <div key={stat} className="bg-neutral-700 p-4 rounded-lg flex flex-col items-center">
              <span className="text-sm text-neutral-400 mb-1">{getStatLabel(stat)}</span>
              <span className="text-xl font-bold mb-3">
                {stat === 'attackSpeed' ? player.stats[stat].toFixed(2) : player.stats[stat]}
              </span>
              <button
                disabled={player.statPoints <= 0}
                onClick={() => distributeStat(stat)}
                className={`w-full py-1 rounded font-bold transition-colors ${
                  player.statPoints > 0 
                    ? 'bg-green-600 hover:bg-green-500 text-white' 
                    : 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                }`}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
