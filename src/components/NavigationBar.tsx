// src/components/NavigationBar.tsx

import React from 'react';
import { useGameStore } from '../store/gameStore';

export type ScreenTab = 'ANIMATED_BATTLE_SCREEN' | 'STATS_SCREEN' | 'REBIRTH_SCREEN' | 'CORE_SCREEN' | 'PVP_SCREEN' | 'SHOP_SCREEN';

interface NavigationBarProps {
  onNavigate: (screen: ScreenTab) => void;
  currentScreen: ScreenTab;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ onNavigate, currentScreen }) => {
  const { player } = useGameStore();

  const navItems: { screen: ScreenTab; label: string; icon: string; badge?: number }[] = [
    { screen: 'ANIMATED_BATTLE_SCREEN', label: '전투', icon: '⚔️' },
    { screen: 'STATS_SCREEN', label: '스탯', icon: '📊', badge: player.statPoints },
    { screen: 'REBIRTH_SCREEN', label: '환생', icon: '🌟' },
    { screen: 'CORE_SCREEN', label: '코어', icon: '🔮' },
    { screen: 'PVP_SCREEN', label: '대전', icon: '🥊' },
    { screen: 'SHOP_SCREEN', label: '상점', icon: '🛒' },
  ];

  return (
    <div className="w-full max-w-md mx-auto bg-stone-300 border-t-4 border-black flex justify-between p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] gap-1 select-none shadow-[0_-4px_10px_rgba(0,0,0,0.5),inset_0_2px_0px_rgba(255,255,255,0.4)]">
      {navItems.map((item) => {
        const isActive = currentScreen === item.screen;
        return (
          <button
            key={item.screen}
            onClick={() => onNavigate(item.screen)}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-none border-2 border-black font-black font-mono transition-all whitespace-nowrap flex-1 min-w-[58px] cursor-pointer text-xs tracking-tight select-none relative
              ${
                isActive
                  ? 'bg-amber-300 text-black translate-x-[1px] translate-y-[1px] shadow-none'
                  : 'bg-stone-100 text-stone-700 hover:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
              }`}
          >
            {item.badge && item.badge > 0 ? (
              <span className="absolute -top-1.5 -right-1 bg-red-600 text-white text-[9px] font-black px-1 py-0.2 border border-black rounded-full animate-bounce shadow-sm">
                +{item.badge}
              </span>
            ) : null}
            <span className="text-sm leading-none mb-0.5">{item.icon}</span>
            <span className="block font-black uppercase text-[10px] leading-tight">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default NavigationBar;
