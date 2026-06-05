import type { SkillNode } from '../types/game';

export const SKILL_TREE_DATA: Record<string, SkillNode> = {
    'core_origin': {
        id: 'core_origin',
        name: '기원의 상자',
        description: '모든 힘의 시작점입니다. (체력 +10)',
        type: 'KEYSTONE',
        cost: 0,
        requires: [],
        effects: { con: 5 }
    },

    // 1. 기본 전투 스탯 트리
    'stat_str_1': {
        id: 'stat_str_1',
        name: '근력 강화 I',
        description: '힘(STR) +5',
        type: 'NORMAL',
        cost: 1,
        requires: ['core_origin'],
        effects: { str: 5 }
    },

    // 2. 피버 모드 및 전투 유틸 트리
    'util_fever_1': {
        id: 'util_fever_1',
        name: '끓어오르는 투지',
        description: '피버 모드 진입 시 초기 배율 1.5배 증가',
        type: 'NOTABLE',
        cost: 3,
        requires: ['core_origin'],
        effects: { feverMultiplier: 1.5 }
    },

    // 3. 코어 강화 트리
    'util_core_1': {
        id: 'util_core_1',
        name: '코어 공명',
        description: '장착된 코어의 능력을 추가로 10% 증폭',
        type: 'NOTABLE',
        cost: 3,
        requires: ['core_origin'],
        effects: { coreBonus: 0.1 }
    },

    // 4. 방치 및 환생(RP) 유틸 트리
    'util_idle_1': {
        id: 'util_idle_1',
        name: '효율적인 휴식',
        description: '오프라인 보상 획득량 20% 증가',
        type: 'NORMAL',
        cost: 2,
        requires: ['core_origin'],
        effects: { offlineRewardMultiplier: 0.2 }
    },
    'util_reincarnate_1': {
        id: 'util_reincarnate_1',
        name: '차원 도약',
        description: '환생 시 1층이 아닌 5층에서 시작',
        type: 'KEYSTONE',
        cost: 10,
        requires: ['util_idle_1'],
        effects: { startStageBonus: 5 }
    }
};