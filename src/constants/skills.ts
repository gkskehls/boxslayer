import type { SkillNode } from '../types/game';

// 1. 반복되는 키워드를 없애고 한 줄로 만들어주는 마법의 헬퍼 함수
const N = (
    id: string,
    name: string,
    description: string,
    type: 'NORMAL' | 'NOTABLE' | 'KEYSTONE',
    cost: number,
    requires: string[],
    effects: Record<string, number>
): SkillNode => ({
    id, name, description, type, cost, requires, effects
});

// 2. 데이터 정의: 엑셀 표처럼 한 줄로 깔끔하게 나열
export const SKILL_TREE_DATA: Record<string, SkillNode> = {
    // ==========================================
    // [중앙 시작점]
    // ==========================================
    'core_origin': N('core_origin', '기원의 상자', '모든 힘의 시작점입니다. (체력 +10)', 'KEYSTONE', 0, [], { con: 5 }),

    // ==========================================
    // [우측 상단] 방치 및 환생(RP) 유틸 트리
    // ==========================================
    'util_idle_1':        N('util_idle_1', '효율적인 휴식', '오프라인 보상 획득량 20% 증가', 'NORMAL', 2, ['core_origin'], { offlineRewardMultiplier: 0.2 }),
    'util_reincarnate_1': N('util_reincarnate_1', '차원 도약', '환생 시 1층이 아닌 5층에서 시작', 'KEYSTONE', 10, ['util_idle_1'], { startStageBonus: 5 }),
    'util_fever_1':       N('util_fever_1', '끓어오르는 투지', '피버 모드 진입 시 초기 배율 1.5배 증가', 'NOTABLE', 3, ['core_origin'], { feverMultiplier: 1.5 }),

    // ==========================================
    // [좌측 상단] 불(Fire) 속성 트리 (STR 특화)
    // ==========================================
    'fire_str_1':      N('fire_str_1', '불씨', '힘(STR) +2', 'NORMAL', 1, ['core_origin'], { str: 2 }),
    'fire_str_2':      N('fire_str_2', '타오르는 열기', '힘(STR) +3', 'NORMAL', 2, ['fire_str_1'], { str: 3 }),
    'fire_notable_1':  N('fire_notable_1', '점화 (1차 해금)', '공격력(STR)의 20%만큼 화염 추가 피해 발생', 'NOTABLE', 5, ['fire_str_2'], { str: 5 }),
    'fire_branch_dmg': N('fire_branch_dmg', '대폭발', '힘(STR) +5', 'NORMAL', 3, ['fire_notable_1'], { str: 5 }),
    'fire_branch_pen': N('fire_branch_pen', '용해', '힘(STR) +5', 'NORMAL', 3, ['fire_notable_1'], { str: 5 }),
    'fire_keystone_1': N('fire_keystone_1', '초신성 (2차 해금)', '공격력(STR)의 50% 화염 피해 및 방어 무시', 'KEYSTONE', 20, ['fire_branch_dmg', 'fire_branch_pen'], { str: 10 }),

    // ==========================================
    // [우측 하단] 물(Water) 속성 트리 (CON 특화)
    // ==========================================
    'water_con_1':      N('water_con_1', '물방울', '체력(CON) +2', 'NORMAL', 1, ['core_origin'], { con: 2 }),
    'water_con_2':      N('water_con_2', '단단한 얼음', '체력(CON) +3', 'NORMAL', 2, ['water_con_1'], { con: 3 }),
    'water_notable_1':  N('water_notable_1', '가시 방패 (1차 해금)', '받은 피해 10% 반사 및 타격 시 쉴드', 'NOTABLE', 5, ['water_con_2'], { con: 5 }),
    'water_branch_ref': N('water_branch_ref', '거울 호수', '체력(CON) +5', 'NORMAL', 3, ['water_notable_1'], { con: 5 }),
    'water_branch_hp':  N('water_branch_hp', '심해의 생명력', '체력(CON) +5', 'NORMAL', 3, ['water_notable_1'], { con: 5 }),
    'water_keystone_1': N('water_keystone_1', '절대 영도 (2차 해금)', '받은 피해 30% 반사 및 쉴드량 폭증', 'KEYSTONE', 20, ['water_branch_ref', 'water_branch_hp'], { con: 10 }),

    // ==========================================
    // [좌측 하단] 바람(Wind) 속성 트리 (DEX 특화)
    // ==========================================
    'wind_dex_1':        N('wind_dex_1', '가벼운 발걸음', '민첩(DEX) +2', 'NORMAL', 1, ['core_origin'], { dex: 2 }),
    'wind_atkspd_1':     N('wind_atkspd_1', '바람의 호흡', '민첩(DEX) +3', 'NORMAL', 2, ['wind_dex_1'], { dex: 3 }),
    'wind_notable_1':    N('wind_notable_1', '칼날바람 (1차 해금)', '15회 타격 시 연격 발생', 'NOTABLE', 5, ['wind_atkspd_1'], { multiHitRequired: 15 }),
    'wind_branch_dmg_1': N('wind_branch_dmg_1', '날카로운 연격', '연격 데미지 20% 증가', 'NORMAL', 3, ['wind_notable_1'], { multiHitDamageBonus: 0.2 }),
    'wind_branch_eva_1': N('wind_branch_eva_1', '잔상', '민첩(DEX) +5', 'NORMAL', 3, ['wind_notable_1'], { dex: 5 }),
    'wind_keystone_1':   N('wind_keystone_1', '태풍의 눈 (2차 해금)', '5회 타격 시 연격 발생', 'KEYSTONE', 20, ['wind_branch_dmg_1', 'wind_branch_eva_1'], { multiHitRequired: 5 }),

    // ==========================================
    // [우측 하단] 번개(Electric) 속성 트리 (유틸)
    // ==========================================
    'elec_util_1':     N('elec_util_1', '정전기', '모든 스탯 +1', 'NORMAL', 1, ['core_origin'], { str: 1, dex: 1, con: 1 }),
    'elec_util_2':     N('elec_util_2', '스파크', '모든 스탯 +2', 'NORMAL', 2, ['elec_util_1'], { str: 2, dex: 2, con: 2 }),
    'elec_notable_1':  N('elec_notable_1', '마비 (1차 해금)', '기절 시 방어력 30% 무시', 'NOTABLE', 5, ['elec_util_2'], { str: 3, dex: 3 }),
    'elec_branch_dur': N('elec_branch_dur', '연쇄 방전', '모든 스탯 +3', 'NORMAL', 3, ['elec_notable_1'], { str: 3, dex: 3, con: 3 }),
    'elec_branch_dmg': N('elec_branch_dmg', '치명적 전압', '모든 스탯 +3', 'NORMAL', 3, ['elec_notable_1'], { str: 3, dex: 3, con: 3 }),
    'elec_keystone_1': N('elec_keystone_1', '뇌신 (2차 해금)', '기절 시 방어력 100% 무시 및 처형', 'KEYSTONE', 20, ['elec_branch_dur', 'elec_branch_dmg'], { str: 5, dex: 5, con: 5 })
};