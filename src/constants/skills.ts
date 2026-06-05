import type { SkillNode } from '../types/game';

export const SKILL_TREE_DATA: Record<string, SkillNode> = {
    // ==========================================
    // [중앙 시작점]
    // ==========================================
    'core_origin': {
        id: 'core_origin',
        name: '기원의 상자',
        description: '모든 힘의 시작점입니다. (체력 +10)',
        type: 'KEYSTONE',
        cost: 0,
        requires: [],
        effects: { con: 5 }
    },

    // ==========================================
    // [우측] 방치 및 환생(RP) 유틸 트리 (기존)
    // ==========================================
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
    },

    // ==========================================
    // [상단] 피버 모드 및 코어 공명 (기존)
    // ==========================================
    'util_fever_1': {
        id: 'util_fever_1',
        name: '끓어오르는 투지',
        description: '피버 모드 진입 시 초기 배율 1.5배 증가',
        type: 'NOTABLE',
        cost: 3,
        requires: ['core_origin'],
        effects: { feverMultiplier: 1.5 }
    },
    'util_core_1': {
        id: 'util_core_1',
        name: '코어 공명',
        description: '장착된 코어의 능력을 추가로 10% 증폭',
        type: 'NOTABLE',
        cost: 3,
        requires: ['core_origin'],
        effects: { coreBonus: 0.1 }
    },
    'stat_str_1': {
        id: 'stat_str_1',
        name: '근력 강화 I',
        description: '힘(STR) +5',
        type: 'NORMAL',
        cost: 1,
        requires: ['core_origin'],
        effects: { str: 5 }
    },

    // ==========================================
    // [좌측 하단] 신규: 바람(Wind) 속성 거대 트리
    // ==========================================
    'wind_dex_1': {
        id: 'wind_dex_1',
        name: '가벼운 발걸음',
        description: '민첩(DEX) +2',
        type: 'NORMAL',
        cost: 1,
        requires: ['core_origin'],
        effects: { dex: 2 }
    },
    'wind_atkspd_1': {
        id: 'wind_atkspd_1',
        name: '바람의 호흡',
        description: '기본 공격 속도 약간 증가',
        type: 'NORMAL',
        cost: 2,
        requires: ['wind_dex_1'],
        effects: { evasionChanceBonus: 0.01 } // 임시 효과
    },
    'wind_notable_1': {
        id: 'wind_notable_1',
        name: '칼날바람 (1차 해금)',
        description: '15회 타격 적중 시 추가 연격 발생 (상점 하급 비약 품절)',
        type: 'NOTABLE',
        cost: 5,
        requires: ['wind_atkspd_1'],
        effects: { multiHitRequired: 15 }
    },

    // [분기점 A: 연격 데미지 특화]
    'wind_branch_dmg_1': {
        id: 'wind_branch_dmg_1',
        name: '날카로운 연격',
        description: '연격 데미지 20% 증가',
        type: 'NORMAL',
        cost: 3,
        requires: ['wind_notable_1'],
        effects: { multiHitDamageBonus: 0.2 }
    },
    'wind_dex_2': {
        id: 'wind_dex_2',
        name: '바람의 눈',
        description: '민첩(DEX) +5',
        type: 'NORMAL',
        cost: 3,
        requires: ['wind_branch_dmg_1'],
        effects: { dex: 5 }
    },

    // [분기점 B: 회피 특화]
    'wind_branch_eva_1': {
        id: 'wind_branch_eva_1',
        name: '잔상',
        description: '기본 회피 확률 2% 증가',
        type: 'NORMAL',
        cost: 3,
        requires: ['wind_notable_1'],
        effects: { evasionChanceBonus: 0.02 }
    },
    'wind_dex_3': {
        id: 'wind_dex_3',
        name: '바람의 춤',
        description: '민첩(DEX) +5',
        type: 'NORMAL',
        cost: 3,
        requires: ['wind_branch_eva_1'],
        effects: { dex: 5 }
    },

    // [합류점: 바람 속성 최종 키스톤]
    'wind_keystone_1': {
        id: 'wind_keystone_1',
        name: '태풍의 눈 (2차 해금)',
        description: '5회 타격 시 연격 발생 (상점 고급 비약 품절)',
        type: 'KEYSTONE',
        cost: 20,
        // 분기점 A와 B를 모두 찍어야만 최종 2차 해금 가능!
        requires: ['wind_dex_2', 'wind_dex_3'],
        effects: { multiHitRequired: 5 }
    }
};