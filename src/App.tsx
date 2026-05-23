import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
// import type { Stats } from './types/game'; // Stats 타입 제거

// Import new screen components
import BattleScreen from './components/BattleScreen';
import StatsScreen from './components/StatsScreen';
import TownScreen from './components/TownScreen';

// 화면 상태를 정의합니다.
type GameScreen = 'TITLE_SCREEN' | 'LOGIN_CHOICE_SCREEN' | 'TOWN_SCREEN' | 'BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN';

// package.json의 버전을 가져오는 대신, 일단 하드코딩된 문자열을 사용합니다.
// 실제 프로젝트에서는 빌드 스크립트나 Vite 설정을 통해 package.json의 버전을 주입하는 것이 좋습니다.
const APP_VERSION = "0.0.0"; // package.json의 version과 동일하게 설정

function App() {
  const {
    player,
    currentEnemy,
    gameStatus,
    spawnEnemy,
    attackEnemy,
    attackPlayer,
    resetGame,
  } = useGameStore();

  const [screen, setScreen] = useState<GameScreen>('TITLE_SCREEN');

  // Simple Auto-Battle Loop
  useEffect(() => {
    // 전투 화면일 때만 전투 루프 실행
    if (screen !== 'BATTLE_SCREEN') return;

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
  }, [screen, gameStatus, currentEnemy, player.stats.attackSpeed, spawnEnemy, attackEnemy, attackPlayer]);

  // Handle Victory - Spawn next enemy after a short delay
  useEffect(() => {
    // 전투 화면일 때만 승리 로직 실행
    if (screen !== 'BATTLE_SCREEN') return;

    if (gameStatus === 'VICTORY') {
      const timer = setTimeout(() => {
        spawnEnemy();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [screen, gameStatus, spawnEnemy]);

  // 화면 전환 핸들러
  const handleNavigate = (targetScreen: GameScreen) => {
    setScreen(targetScreen);
    // 전투 화면에서 다른 화면으로 이동할 때 전투 상태 초기화
    if (targetScreen !== 'BATTLE_SCREEN' && gameStatus === 'BATTLE') {
      // Optionally reset current enemy or pause battle
      // For now, we'll just let the useEffect clean up timers
    }
  };

  // 게임 오버 시 리셋 버튼 핸들러 (BattleScreen에서 호출)
  const handleDefeat = () => {
    resetGame();
    setScreen('TOWN_SCREEN'); // 게임 리셋 후 마을 화면으로 이동
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4 font-mono flex flex-col items-center justify-center">
      {screen === 'TITLE_SCREEN' && (
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-8 text-yellow-400">BoxSlayer</h1>
          <p className="text-xl text-neutral-300 mb-12">단순한 박스, 무한한 성장</p>
          <button
            onClick={() => handleNavigate('LOGIN_CHOICE_SCREEN')}
            className="px-8 py-4 bg-blue-600 text-white text-2xl font-bold rounded-lg hover:bg-blue-500 transition-colors"
          >
            화면을 눌러 시작하세요
          </button>
        </div>
      )}

      {screen === 'LOGIN_CHOICE_SCREEN' && (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-8 text-yellow-400">로그인 방식을 선택하세요</h2>
          <div className="space-y-4">
            <button
              onClick={() => handleNavigate('TOWN_SCREEN')} // 게스트 로그인 시 마을 화면으로
              className="px-6 py-3 bg-green-600 text-white text-xl font-bold rounded-lg hover:bg-green-500 transition-colors w-64"
            >
              게스트 로그인
            </button>
            <button
              onClick={() => alert('Google 로그인 기능은 아직 구현되지 않았습니다.')}
              className="px-6 py-3 bg-red-600 text-white text-xl font-bold rounded-lg hover:bg-red-500 transition-colors w-64"
            >
              Google 로그인
            </button>
          </div>
        </div>
      )}

      {screen === 'TOWN_SCREEN' && (
        <TownScreen onNavigate={handleNavigate} />
      )}

      {screen === 'BATTLE_SCREEN' && (
        <BattleScreen onDefeat={handleDefeat} />
      )}

      {screen === 'STATS_SCREEN' && (
        <StatsScreen />
      )}

      {/* CORE_SCREEN and SHOP_SCREEN will be implemented later */}
      {screen === 'CORE_SCREEN' && (
        <div className="text-center text-2xl">코어 관리 화면 (준비 중)</div>
      )}
      {screen === 'SHOP_SCREEN' && (
        <div className="text-center text-2xl">상점 화면 (준비 중)</div>
      )}

      {/* Version Display */}
      <div className="absolute bottom-2 right-2 text-xs text-neutral-500">
        v{APP_VERSION}
      </div>
    </div>
  );
}

export default App;