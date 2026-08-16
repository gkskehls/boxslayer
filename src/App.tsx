import { useState } from 'react';

// 메인 4대 스크린 임포트
import AnimatedBattleScreen from './components/AnimatedBattleScreen';
import RebirthScreen from './components/RebirthScreen';
import CoreScreen from './components/CoreScreen';
import Shop from './components/Shop';
import NavigationBar, { type ScreenTab } from './components/NavigationBar';

type GameScreen = 'TITLE_SCREEN' | 'LOGIN_CHOICE_SCREEN' | ScreenTab;

const APP_VERSION = import.meta.env.VITE_APP_VERSION;

function App() {
  const [screen, setScreen] = useState<GameScreen>('TITLE_SCREEN');

  const handleNavigate = (targetScreen: GameScreen) => {
    setScreen(targetScreen);
  };

  const showNavigationBar = screen !== 'TITLE_SCREEN' && screen !== 'LOGIN_CHOICE_SCREEN';

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4 font-mono flex flex-col items-center w-full pb-20 select-none">
      
      {/* ================= TITLE SCREEN ================= */}
      {screen === 'TITLE_SCREEN' && (
        <div
          onClick={() => {
            const hasLoggedIn = localStorage.getItem('hasLoggedIn');
            handleNavigate(hasLoggedIn === 'true' ? 'ANIMATED_BATTLE_SCREEN' : 'LOGIN_CHOICE_SCREEN');
          }}
          className="max-w-md mx-auto p-4 rounded-none border-4 border-neutral-900 bg-stone-200 w-full flex flex-col gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-stone-900 cursor-pointer min-h-[560px]"
        >
          <div className="bg-stone-100 p-3 rounded-none border-4 border-neutral-900 flex justify-between items-center w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-sm font-black text-neutral-500 font-mono leading-none tracking-widest">
              BOX_SLAYER OS
            </h2>
            <span className="text-[10px] text-neutral-400 font-bold font-mono leading-none">
              SYSTEM_READY
            </span>
          </div>

          <div 
            className="bg-stone-100 p-6 flex-grow flex flex-col justify-between border-4 border-neutral-900 relative overflow-hidden shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)] min-h-[350px]"
            style={{
              backgroundImage: 'linear-gradient(to right, #e7e5e4 2px, transparent 2px), linear-gradient(to bottom, #e7e5e4 2px, transparent 2px)',
              backgroundSize: '16px 16px',
            }}
          >
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

            <div className="mt-auto pt-4 text-center w-full relative z-10">
              <div className="text-base font-black text-blue-500 animate-pulse tracking-widest font-mono">
                PRESS START TO PLAY
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= LOGIN CHOICE SCREEN ================= */}
      {screen === 'LOGIN_CHOICE_SCREEN' && (
        <div className="max-w-md mx-auto p-4 rounded-none border-4 border-neutral-900 bg-stone-200 w-full flex flex-col gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-stone-900 min-h-[560px]">
          <div className="bg-stone-100 p-3 rounded-none border-4 border-neutral-900 flex justify-between items-center w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-sm font-black text-neutral-500 font-mono leading-none tracking-widest">
              ACCESS_PORT
            </h2>
            <span className="text-[10px] text-red-500 font-bold font-mono leading-none animate-pulse">
              ● LOCK
            </span>
          </div>

          <div 
            className="bg-stone-100 p-6 flex-grow flex flex-col justify-between border-4 border-neutral-900 relative overflow-hidden shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)] min-h-[350px]"
            style={{
              backgroundImage: 'linear-gradient(to right, #e7e5e4 2px, transparent 2px), linear-gradient(to bottom, #e7e5e4 2px, transparent 2px)',
              backgroundSize: '16px 16px',
            }}
          >
            <div className="my-auto flex flex-col items-center justify-center w-full gap-6 relative z-10">
              <div className="border-4 border-neutral-950 bg-neutral-950 py-2.5 text-center w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-xs font-black text-yellow-400 tracking-widest font-mono uppercase">
                  SELECT LOGIN METHOD
                </h2>
              </div>

              <div className="flex flex-col gap-4 w-full">
                <button
                  onClick={() => {
                    localStorage.setItem('hasLoggedIn', 'true');
                    handleNavigate('ANIMATED_BATTLE_SCREEN');
                  }}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-black rounded-none border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-mono tracking-widest cursor-pointer uppercase"
                >
                  GUEST LOGIN
                </button>
                <button
                  onClick={() => alert('Google 로그인 기능은 추후 지원 예정입니다.')}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-none border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-mono tracking-widest cursor-pointer uppercase"
                >
                  Google LOGIN
                </button>
              </div>
            </div>

            <div className="mt-auto text-center w-full text-[9px] text-neutral-400 font-bold font-mono tracking-widest relative z-10">
              POWERED BY BOX_ENGINE v1.0
            </div>
          </div>
        </div>
      )}

      {/* ================= 4대 메인 스크린 ================= */}
      {screen === 'ANIMATED_BATTLE_SCREEN' && (
        <div className="flex-grow w-full max-w-md"><AnimatedBattleScreen /></div>
      )}

      {screen === 'REBIRTH_SCREEN' && (
        <div className="flex-grow w-full max-w-md"><RebirthScreen /></div>
      )}

      {screen === 'CORE_SCREEN' && (
        <div className="flex-grow w-full max-w-md"><CoreScreen /></div>
      )}

      {screen === 'SHOP_SCREEN' && (
        <div className="flex-grow w-full max-w-md"><Shop /></div>
      )}

      {/* Version Display */}
      <div className="fixed top-2 right-2 text-xs text-neutral-500 z-[9999] pointer-events-none font-mono">
        v{APP_VERSION}
      </div>

      {showNavigationBar && (
        <NavigationBar onNavigate={(s) => handleNavigate(s)} currentScreen={screen as ScreenTab} />
      )}
    </div>
  );
}

export default App;
