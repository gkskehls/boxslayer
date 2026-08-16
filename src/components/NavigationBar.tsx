// src/components/NavigationBar.tsx

import React from 'react';

export type ScreenTab = 'ANIMATED_BATTLE_SCREEN' | 'REBIRTH_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN';

interface NavigationBarProps {
  onNavigate: (screen: ScreenTab) => void;
  currentScreen: ScreenTab;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ onNavigate, currentScreen }) => {
  const navItems: { screen: ScreenTab; label: string; icon: string }[] = [
    { screen: 'ANIMATED_BATTLE_SCREEN', label: '전투', icon: '⚔️' },
    { screen: 'REBIRTH_SCREEN', label: '환생', icon: '🌟' },
    { screen: 'CORE_SCREEN', label: '코어', icon: '🔮' },
    { screen: 'SHOP_SCREEN', label: '상점', icon: '🛒' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-stone-300 border-t-4 border-black flex justify-between p-2 z-50 gap-1.5 overflow-x-auto select-none shadow-[inset_0_2px_0px_rgba(255,255,255,0.4)]">
      {navItems.map((item) => {
        const isActive = currentScreen === item.screen;
        return (
          <button
            key={item.screen}
            onClick={() => onNavigate(item.screen)}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-none border-2 border-black font-black font-mono transition-all whitespace-nowrap flex-1 min-w-[65px] cursor-pointer text-xs tracking-tight select-none
              ${
                isActive
                  ? 'bg-amber-300 text-black translate-x-[1px] translate-y-[1px] shadow-none'
                  : 'bg-stone-100 text-stone-700 hover:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
              }`}
          >
            <span className="text-base leading-none mb-0.5">{item.icon}</span>
            <span className="block font-black uppercase text-[11px] leading-tight">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default NavigationBar;
