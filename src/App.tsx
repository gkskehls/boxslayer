import { useEffect, useState } from 'react';
import { useGameStore, getComputedStats } from './store/gameStore';
// import type { Stats } from './types/game'; // Stats 타입 제거

// Import new screen components
import BattleScreen from './components/BattleScreen';
import StatsScreen from './components/StatsScreen';
import TownScreen from './components/TownScreen';
import NavigationBar from './components/NavigationBar'; // NavigationBar 임포트
import CoreScreen from './components/CoreScreen'; // CoreScreen 임포트
import Shop from './components/Shop'; // Shop 컴포넌트 임포트
import SkillTreeScreen from './components/SkillTreeScreen';
import AnimatedBattleScreen from './components/AnimatedBattleScreen'; // [신규] 애니메이션 전투 화면 임포트

// 화면 상태를 정의합니다. (ANIMATED_BATTLE_SCREEN 추가)
type GameScreen = 'TITLE_SCREEN' | 'LOGIN_CHOICE_SCREEN' | 'TOWN_SCREEN' | 'BATTLE_SCREEN' | 'ANIMATED_BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN' | 'SKILL_TREE_SCREEN';
type NavigableScreen = Exclude<GameScreen, 'TITLE_SCREEN' | 'LOGIN_CHOICE_SCREEN'>; // NavigationBar에서 이동 가능한 화면 타입

// package.json의 버전을 가져옵니다.
const APP_VERSION = import.meta.env.VITE_APP_VERSION;

function App() {
  const {
    player,
    currentEnemy,
    gameStatus,
    spawnEnemy,
    attackEnemy,
    attackPlayer,
    // resetGame, // App.tsx에서 직접 사용하지 않으므로 제거
  } = useGameStore();

  const [screen, setScreen] = useState<GameScreen>('TITLE_SCREEN');
  const [offlineRewards, setOfflineRewards] = useState<{ gold: number; exp: number } | null>(null); // 오프라인 보상 상태

  // Simple Auto-Battle Loop
  useEffect(() => {
    // [수정됨] 신규 애니메이션 화면에서도 전투 루프가 돌아가도록 조건 추가
    if (screen !== 'BATTLE_SCREEN' && screen !== 'ANIMATED_BATTLE_SCREEN') return;

    if (gameStatus === 'IDLE') {
      spawnEnemy();
    }

    // 1. 계산된 값을 useEffect 내부에서 안전하게 생성합니다.
    const playerComputed = getComputedStats(player.stats);
    const enemyComputed = currentEnemy ? getComputedStats(currentEnemy.stats) : null;

    let playerAttackTimer: number;
    let enemyAttackTimer: number;

    // 2. if 조건문 안에서 enemyComputed가 null이 아님을 명시적으로 체크합니다.
    if (gameStatus === 'BATTLE' && currentEnemy && enemyComputed) {
      // Player attacks enemy
      playerAttackTimer = window.setInterval(() => {
        attackEnemy();
      }, 1000 / playerComputed.attackSpeed);

      // Enemy attacks player (이제 enemyComputed가 null이 아님이 보장됨)
      enemyAttackTimer = window.setInterval(() => {
        attackPlayer();
      }, 1000 / enemyComputed.attackSpeed);
    }

    return () => {
      clearInterval(playerAttackTimer);
      clearInterval(enemyAttackTimer);
    };

// 3. 의존성 배열에서 계산값 속성을 빼고, 대상이 되는 원본 객체(player.stats, currentEnemy)를 넣습니다.
  }, [screen, gameStatus, currentEnemy, player.stats, spawnEnemy, attackEnemy, attackPlayer]);

  // Handle Victory - Spawn next enemy after a short delay
  useEffect(() => {
    // [수정됨] 신규 애니메이션 화면에서도 전투 루프가 돌아가도록 조건 추가
    if (screen !== 'BATTLE_SCREEN' && screen !== 'ANIMATED_BATTLE_SCREEN') return;

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
  // BattleScreen에서 직접 retryCurrentFloor를 호출하므로 App.tsx에서는 더 이상 필요 없음
  // const handleDefeat = () => {
  //   resetGame();
  //   setScreen('TOWN_SCREEN'); // 게임 리셋 후 마을 화면으로 이동
  // };

  const showNavigationBar = screen !== 'TITLE_SCREEN' && screen !== 'LOGIN_CHOICE_SCREEN';

  return (
      <div className="min-h-screen bg-neutral-900 text-white p-4 font-mono flex flex-col items-center justify-center pb-20"> {/* pb-20 for nav bar */}
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
            <>
              <TownScreen onNavigate={(s) => handleNavigate(s)} />
              {/* Offline Rewards Modal - Only render in TOWN_SCREEN */}
              {offlineRewards && (offlineRewards.gold > 0 || offlineRewards.exp > 0) && (
                  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-neutral-800 p-8 rounded-lg border border-neutral-700 text-center shadow-lg max-w-sm mx-auto">
                      <h3 className="text-3xl font-bold text-yellow-400 mb-4">오프라인 보상!</h3>
                      {offlineRewards.gold > 0 && (
                          <p className="text-xl text-neutral-300 mb-2">골드: <span className="text-yellow-500 font-bold">{Math.floor(offlineRewards.gold)}</span></p>
                      )}
                      {offlineRewards.exp > 0 && (
                          <p className="text-xl text-neutral-300 mb-4">경험치: <span className="text-blue-500 font-bold">{Math.floor(offlineRewards.exp)}</span></p>
                      )}
                      <button
                          onClick={() => setOfflineRewards(null)}
                          className="mt-6 px-6 py-2 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-500 transition-colors shadow-md"
                      >
                        확인
                      </button>
                    </div>
                  </div>
              )}
            </>
        )}

        {screen === 'BATTLE_SCREEN' && (
            <BattleScreen />
        )}

        {screen === 'ANIMATED_BATTLE_SCREEN' && (
            <AnimatedBattleScreen />
        )}

        {screen === 'STATS_SCREEN' && (
            <StatsScreen />
        )}

        {screen === 'CORE_SCREEN' && (
            <CoreScreen />
        )}

        {screen === 'SHOP_SCREEN' && (
            <Shop /> 
        )}

        {screen === 'SKILL_TREE_SCREEN' && (
            <SkillTreeScreen />
        )}

        {/* Version Display */}
        <div className="absolute bottom-2 right-2 text-xs text-neutral-500">
          v{APP_VERSION}
        </div>

        {showNavigationBar && (
            <NavigationBar onNavigate={(s) => handleNavigate(s)} currentScreen={screen as NavigableScreen} />
        )}
      </div>
  );
}

export default App;