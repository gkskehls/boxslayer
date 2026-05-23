import React from 'react';

interface NavigationBarProps {
  onNavigate: (screen: 'TOWN_SCREEN' | 'BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN') => void;
  currentScreen: 'TOWN_SCREEN' | 'BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN';
}

const NavigationBar: React.FC<NavigationBarProps> = ({ onNavigate, currentScreen }) => {
  const navItems = [
    { screen: 'TOWN_SCREEN', label: '마을', icon: '🏠' },
    { screen: 'BATTLE_SCREEN', label: '전투', icon: '⚔️' },
    { screen: 'STATS_SCREEN', label: '스탯', icon: '📊' },
    { screen: 'CORE_SCREEN', label: '코어', icon: '💎' },
    { screen: 'SHOP_SCREEN', label: '상점', icon: '💰' },
  ] as const; // as const 추가

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-800 border-t border-neutral-700 flex justify-around p-2 z-50">
      {navItems.map((item) => (
        <button
          key={item.screen}
          onClick={() => onNavigate(item.screen)}
          className={`flex flex-col items-center text-xs py-1 px-2 rounded-md transition-colors
            ${currentScreen === item.screen ? 'text-yellow-400 bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'}`}
        >
          <span className="text-xl mb-1">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default NavigationBar;