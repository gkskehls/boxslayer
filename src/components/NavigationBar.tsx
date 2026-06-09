import React from 'react';

interface NavigationBarProps {
  onNavigate: (screen: 'TOWN_SCREEN' | 'BATTLE_SCREEN' | 'ANIMATED_BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN' | 'SKILL_TREE_SCREEN') => void;
  currentScreen: 'TOWN_SCREEN' | 'BATTLE_SCREEN' | 'ANIMATED_BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN' | 'SKILL_TREE_SCREEN';
}

const NavigationBar: React.FC<NavigationBarProps> = ({ onNavigate, currentScreen }) => {
  // 1안(고유 색상)과 2안(네온 글로우)의 장점을 합친 하이브리드 테마
  // 비활성(inactive): 아주 옅은 테두리와 어두운 색상 텍스트로 은은하게 구분
  // 활성(active): 네온사인처럼 밝게 빛나는 글로우 효과 적용
  const navItems = [
    {
      screen: 'TOWN_SCREEN', label: '마을',
      activeClass: 'border-neutral-300 text-neutral-100 shadow-[0_0_12px_rgba(212,212,216,0.5)] bg-neutral-800',
      inactiveClass: 'border-neutral-800/50 text-neutral-500 hover:border-neutral-600 hover:text-neutral-400 bg-neutral-900'
    },
    {
      screen: 'BATTLE_SCREEN', label: '구 전투',
      activeClass: 'border-red-500 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)] bg-neutral-800',
      inactiveClass: 'border-red-900/40 text-red-700 hover:border-red-800 hover:text-red-500 bg-neutral-900'
    },
    {
      screen: 'ANIMATED_BATTLE_SCREEN', label: '신 전투',
      activeClass: 'border-purple-500 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)] bg-neutral-800',
      inactiveClass: 'border-purple-900/40 text-purple-700 hover:border-purple-800 hover:text-purple-500 bg-neutral-900'
    },
    {
      screen: 'STATS_SCREEN', label: '스탯',
      activeClass: 'border-green-500 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.5)] bg-neutral-800',
      inactiveClass: 'border-green-900/40 text-green-700 hover:border-green-800 hover:text-green-500 bg-neutral-900'
    },
    {
      screen: 'CORE_SCREEN', label: '코어',
      activeClass: 'border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)] bg-neutral-800',
      inactiveClass: 'border-blue-900/40 text-blue-700 hover:border-blue-800 hover:text-blue-500 bg-neutral-900'
    },
    {
      screen: 'SHOP_SCREEN', label: '상점',
      activeClass: 'border-yellow-400 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.5)] bg-neutral-800',
      inactiveClass: 'border-yellow-900/40 text-yellow-700 hover:border-yellow-800 hover:text-yellow-500 bg-neutral-900'
    },
    {
      screen: 'SKILL_TREE_SCREEN', label: '스킬',
      activeClass: 'border-indigo-400 text-indigo-300 shadow-[0_0_12px_rgba(129,140,248,0.5)] bg-neutral-800',
      inactiveClass: 'border-indigo-900/40 text-indigo-700 hover:border-indigo-800 hover:text-indigo-500 bg-neutral-900'
    },
  ] as const;

  return (
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-950 border-t border-neutral-800 flex justify-evenly p-2 z-50 gap-2 overflow-x-auto shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => {
          const isActive = currentScreen === item.screen;
          return (
              <button
                  key={item.screen}
                  onClick={() => onNavigate(item.screen)}
                  className={`flex flex-col items-center justify-center text-xs py-2 px-1 rounded-sm font-bold transition-all whitespace-nowrap flex-1 min-w-[45px] border
                ${isActive ? item.activeClass : item.inactiveClass}`}
              >
                <span>{item.label}</span>
              </button>
          )
        })}
      </div>
  );
};

export default NavigationBar;