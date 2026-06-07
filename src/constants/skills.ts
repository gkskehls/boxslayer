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
    // [우측 상단] 방치 및 환생(RP) 유틸 트리
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
    'util_fever_1': {
        id: 'util_fever_1',
        name: '끓어오르는 투지',
        description: '피버 모드 진입 시 초기 배율 1.5배 증가',
        type: 'NOTABLE',
        cost: 3,
        requires: ['core_origin'],
        effects: { feverMultiplier: 1.5 }
    },

    // ==========================================
    // [좌측 상단] 불(Fire) 속성 트리 (STR 특화)
    // ==========================================
    'fire_str_1': {
        id: 'fire_str_1',
        name: '불씨',
        description: '힘(STR) +2',
        type: 'NORMAL',
        cost: 1,
        requires: ['core_origin'],
        effects: { str: 2 }
    },
    'fire_str_2': {
        id: 'fire_str_2',
        name: '타오르는 열기',
        description: '힘(STR) +3',
        type: 'NORMAL',
        cost: 2,
        requires: ['fire_str_1'],
        effects: { str: 3 }
    },
    'fire_notable_1': {
        id: 'fire_notable_1',
        name: '점화 (1차 해금)',
        description: '공격력(STR)의 20%만큼 화염 추가 피해 발생',
        type: 'NOTABLE',
        cost: 5,
        requires: ['fire_str_2'],
        effects: { str: 5 } // TODO: 전투 엔진의 fireDamageRatio와 연동 필요
    },
    'fire_branch_dmg': {
        id: 'fire_branch_dmg',
        name: '대폭발',
        description: '힘(STR) +5',
        type: 'NORMAL',
        cost: 3,
        requires: ['fire_notable_1'],
        effects: { str: 5 }
    },
    'fire_branch_pen': {
        id: 'fire_branch_pen',
        name: '용해',
        description: '힘(STR) +5',
        type: 'NORMAL',
        cost: 3,
        requires: ['fire_notable_1'],
        effects: { str: 5 }
    },
    'fire_keystone_1': {
        id: 'fire_keystone_1',
        name: '초신성 (2차 해금)',
        description: '공격력(STR)의 50% 화염 추가 피해 및 방어력 무시 극대화',
        type: 'KEYSTONE',
        cost: 20,
        requires: ['fire_branch_dmg', 'fire_branch_pen'],
        effects: { str: 10 }
    },

    // ==========================================
    // [우측 하단] 물(Water) 속성 트리 (CON 특화)
    // ==========================================
    'water_con_1': {
        id: 'water_con_1',
        name: '물방울',
        description: '체력(CON) +2',
        type: 'NORMAL',
        cost: 1,
        requires: ['core_origin'],
        effects: { con: 2 }
    },
    'water_con_2': {
        id: 'water_con_2',
        name: '단단한 얼음',
        description: '체력(CON) +3',
        type: 'NORMAL',
        cost: 2,
        requires: ['water_con_1'],
        effects: { con: 3 }
    },
    'water_notable_1': {
        id: 'water_notable_1',
        name: '가시 방패 (1차 해금)',
        description: '받은 피해의 10% 반사 및 타격 시 체력 1% 쉴드 회복',
        type: 'NOTABLE',
        cost: 5,
        requires: ['water_con_2'],
        effects: { con: 5 } // TODO: 전투 엔진의 reflect/regen Ratio와 연동 필요
    },
    'water_branch_ref': {
        id: 'water_branch_ref',
        name: '거울 호수',
        description: '체력(CON) +5',
        type: 'NORMAL',
        cost: 3,
        requires: ['water_notable_1'],
        effects: { con: 5 }
    },
    'water_branch_hp': {
        id: 'water_branch_hp',
        name: '심해의 생명력',
        description: '체력(CON) +5',
        type: 'NORMAL',
        cost: 3,
        requires: ['water_notable_1'],
        effects: { con: 5 }
    },
    'water_keystone_1': {
        id: 'water_keystone_1',
        name: '절대 영도 (2차 해금)',
        description: '받은 피해 30% 반사 및 최대 체력 비례 쉴드량 폭증',
        type: 'KEYSTONE',
        cost: 20,
        requires: ['water_branch_ref', 'water_branch_hp'],
        effects: { con: 10 }
    },

    // ==========================================
    // [좌측 하단] 바람(Wind) 속성 트리 (DEX 특화)
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
        description: '민첩(DEX) +3',
        type: 'NORMAL',
        cost: 2,
        requires: ['wind_dex_1'],
        effects: { dex: 3 }
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
    'wind_branch_dmg_1': {
        id: 'wind_branch_dmg_1',
        name: '날카로운 연격',
        description: '연격 데미지 20% 증가',
        type: 'NORMAL',
        cost: 3,
        requires: ['wind_notable_1'],
        effects: { multiHitDamageBonus: 0.2 }
    },
    'wind_branch_eva_1': {
        id: 'wind_branch_eva_1',
        name: '잔상',
        description: '민첩(DEX) +5',
        type: 'NORMAL',
        cost: 3,
        requires: ['wind_notable_1'],
        effects: { dex: 5 }
    },
    'wind_keystone_1': {
        id: 'wind_keystone_1',
        name: '태풍의 눈 (2차 해금)',
        description: '5회 타격 시 연격 발생 (상점 고급 비약 품절)',
        type: 'KEYSTONE',
        cost: 20,
        requires: ['wind_branch_dmg_1', 'wind_branch_eva_1'],
        effects: { multiHitRequired: 5 }
    },

    // ==========================================
    // [상단 중앙] 번개(Electric) 속성 트리 (유틸)
    // ==========================================
    'elec_util_1': {
        id: 'elec_util_1',
        name: '정전기',
        description: '모든 스탯 +1',
        type: 'NORMAL',
        cost: 1,
        requires: ['core_origin'],
        effects: { str: 1, dex: 1, con: 1 }
    },
    'elec_util_2': {
        id: 'elec_util_2',
        name: '스파크',
        description: '모든 스탯 +2',
        type: 'NORMAL',
        cost: 2,
        requires: ['elec_util_1'],
        effects: { str: 2, dex: 2, con: 2 }
    },
    'elec_notable_1': {
        id: 'elec_notable_1',
        name: '마비 (1차 해금)',
        description: '기절 시 방어력 30% 무시',
        type: 'NOTABLE',
        cost: 5,
        requires: ['elec_util_2'],
        effects: { str: 3, dex: 3 } // TODO: 전투 엔진 스턴 로직과 연동 필요
    },
    'elec_branch_dur': {
        id: 'elec_branch_dur',
        name: '연쇄 방전',
        description: '모든 스탯 +3',
        type: 'NORMAL',
        cost: 3,
        requires: ['elec_notable_1'],
        effects: { str: 3, dex: 3, con: 3 }
    },
    'elec_branch_dmg': {
        id: 'elec_branch_dmg',
        name: '치명적 전압',
        description: '모든 스탯 +3',
        type: 'NORMAL',
        cost: 3,
        requires: ['elec_notable_1'],
        effects: { str: 3, dex: 3, con: 3 }
    },
    'elec_keystone_1': {
        id: 'elec_keystone_1',
        name: '뇌신 (2차 해금)',
        description: '기절 시 방어력 100% 무시 및 처형 데미지 증폭',
        type: 'KEYSTONE',
        cost: 20,
        requires: ['elec_branch_dur', 'elec_branch_dmg'],
        effects: { str: 5, dex: 5, con: 5 }
    }
};