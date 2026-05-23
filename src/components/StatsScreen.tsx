import React from 'react';
import { useGameStore } from '../store/gameStore';
import type { Stats } from '../types/game';

const StatsScreen: React.FC = () => {
  const { player, distributeStat } = useGameStore();

  const getStatLabel = (key: keyof Stats) => {
    switch (key) {
      case 'attack': return '공격력';
      case 'defense': return '방어력';
      case 'maxHealth': return '최대체력';
      case 'attackSpeed': return '공격속도';
      default: return key;
    }
  };

  const getStatIncreaseValue = (stat: keyof Stats) => {
    switch (stat) {
      case 'attack': return '+1';
      case 'defense': return '+1';
      case 'maxHealth': return '+10';
      case 'attackSpeed': return '+0.05';
      default: return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-neutral-800 p-6 rounded-xl border border-neutral-700 w-full">
      <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
        <span>⚔️ 스탯 강화</span>
        <span className="text-green-400">남은 스탯 포인트: {player.statPoints}</span>
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
              className={`w-full py-2 px-4 rounded-lg font-bold transition-colors shadow-md
                ${player.statPoints > 0
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                }`}
            >
              + {getStatIncreaseValue(stat)}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsScreen;