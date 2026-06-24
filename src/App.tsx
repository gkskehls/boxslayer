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
      <div className="min-h-screen bg-neutral-900 text-white p-4 font-mono flex flex-col items-center justify-center pb-20 select-none"> {/* pb-20 for nav bar */}
        
        {/* ================= TITLE SCREEN (전투 화면 스펙 100% 동기화) ================= */}
        {screen === 'TITLE_SCREEN' && (
            <div
                onClick={() => {
                  const hasLoggedIn = localStorage.getItem('hasLoggedIn');
                  handleNavigate(hasLoggedIn === 'true' ? 'TOWN_SCREEN' : 'LOGIN_CHOICE_SCREEN');
                }}
                className="max-w-md mx-auto p-4 rounded-none border-4 border-neutral-900 bg-stone-200 w-full flex flex-col gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-stone-900 cursor-pointer min-h-[560px]"
            >
              {/* 상단 패널 헤더 매핑 */}
              <div className="bg-stone-100 p-3 rounded-none border-4 border-neutral-900 flex justify-between items-center w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-sm font-black text-neutral-500 font-mono leading-none tracking-widest">
                  BOX_SLAYER OS
                </h2>
                <span className="text-[10px] text-neutral-400 font-bold font-mono leading-none">
                  SYSTEM_READY
                </span>
              </div>

              {/* 연한 격자 그리드 라인이 주입된 중앙 모니터 프레임 복제 */}
              <div 
                  className="bg-stone-100 p-6 flex-grow flex flex-col justify-between border-4 border-neutral-900 relative overflow-hidden shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)] min-h-[350px]"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #e7e5e4 2px, transparent 2px), linear-gradient(to bottom, #e7e5e4 2px, transparent 2px)',
                    backgroundSize: '16px 16px',
                  }}
              >
                {/* 로고 영역: 투박한 직각 테두리와 오프셋 처리로 단단한 픽셀 무드 재현 */}
                <div className="my-auto flex flex-col items-center justify-center w-full gap-5 relative z-10 text-center">
                  <div className="border-4 border-neutral-950 bg-neutral-950 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full">
                    <h1 className="text-3xl md:text-4xl font-black text-yellow-400 tracking-widest uppercase font-mono drop-shadow-[2px_2px_0px_rgba(0,0,0,0.4)]">
                      BoxSlayer
                    </h1>
                  </div>
                  
                  <div className="bg-stone-200 border border-stone-300 px-4 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]">
                    <p className="text-[10px] font-black text-neutral-600 tracking-wider font-mono uppercase">
                      단순한 박스, 무한한 성장
                    </p>
                  </div>
                </div>

                {/* 하단 가이드: 안내 코인 삭제 후 8비트 가이드 단독 단정한 배치 */}
                <div className="mt-auto pt-4 text-center w-full relative z-10">
                  <div className="text-base font-black text-blue-500 animate-pulse tracking-widest font-mono">
                    PRESS START TO PLAY
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* ================= LOGIN CHOICE SCREEN (전투 화면 스펙 100% 동기화) ================= */}
        {screen === 'LOGIN_CHOICE_SCREEN' && (
            <div className="max-w-md mx-auto p-4 rounded-none border-4 border-neutral-900 bg-stone-200 w-full flex flex-col gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-stone-900 min-h-[560px]">
              {/* 상단 인증 게이트 헤더 매핑 */}
              <div className="bg-stone-100 p-3 rounded-none border-4 border-neutral-900 flex justify-between items-center w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-sm font-black text-neutral-500 font-mono leading-none tracking-widest">
                  ACCESS_PORT
                </h2>
                <span className="text-[10px] text-red-500 font-bold font-mono leading-none animate-pulse">
                  ● LOCK
                </span>
              </div>

              {/* 격자 모눈 격자판 스테이지 복제 */}
              <div 
                  className="bg-stone-100 p-6 flex-grow flex flex-col justify-between border-4 border-neutral-900 relative overflow-hidden shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)] min-h-[350px]"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #e7e5e4 2px, transparent 2px), linear-gradient(to bottom, #e7e5e4 2px, transparent 2px)',
                    backgroundSize: '16px 16px',
                  }}
              >
                {/* 중앙 컨텐츠 폼 */}
                <div className="my-auto flex flex-col items-center justify-center w-full gap-6 relative z-10">
                  <div className="border-4 border-neutral-950 bg-neutral-950 py-2.5 text-center w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="text-xs font-black text-yellow-400 tracking-widest font-mono uppercase">
                      SELECT LOGIN METHOD
                    </h2>
                  </div>

                  {/* 세로배열 고정 및 각진 레트로 피드백 액티브 버튼 */}
                  <div className="flex flex-col gap-4 w-full">
                    <button
                        onClick={() => {
                          localStorage.setItem('hasLoggedIn', 'true');
                          handleNavigate('TOWN_SCREEN');
                        }}
                        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-black rounded-none border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-mono tracking-widest cursor-pointer uppercase"
                    >
                      GUEST LOGIN
                    </button>
                    <button
                        onClick={() => alert('Google 로그인 기능은 아직 구현되지 않았습니다.')}
                        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-none border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-mono tracking-widest cursor-pointer uppercase"
                    >
                      Google LOGIN
                    </button>
                  </div>
                </div>

                {/* 하단 시스템 스펙 명세 라벨링 */}
                <div className="mt-auto text-center w-full text-[9px] text-neutral-400 font-bold font-mono tracking-widest relative z-10">
                  POWERED BY BOX_ENGINE v1.0
                </div>
              </div>
            </div>
        )}

        {screen === 'TOWN_SCREEN' && (
            <>
              {/* [수정됨] 더 이상 쓰지 않는 onNavigate 속성을 제거했습니다. */}
              <TownScreen />
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

        {screen === 'SHOP_SCREEN' && (
            <Shop /> 
        )}

        {screen === 'SKILL_TREE_SCREEN' && (
            <SkillTreeScreen />
        )}

        {/* Version Display */}
        <div className="fixed top-2 right-2 text-xs text-neutral-500 z-[9999] pointer-events-none font-mono">
          v{APP_VERSION}
        </div>

        {showNavigationBar && (
            <NavigationBar onNavigate={(s) => handleNavigate(s)} currentScreen={screen as NavigableScreen} />
        )}
      </div>
  );
}

export default App;