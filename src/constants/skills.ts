import type { SkillNode } from '../types/game';

// 반복되는 키워드를 없애고 한 줄로 만들어주는 팩토리 헬퍼 함수
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

export const SKILL_TREE_DATA: Record<string, SkillNode> = {
    // ==========================================
    // 🌟 [중앙 시작점]
    // ==========================================
    'core_origin': N('core_origin', '기원의 상자', '모든 힘의 시작점입니다. (체력 +10)', 'KEYSTONE', 0, [], { con: 5 }),

    // ==========================================
    // ⚙️ [유틸리티/성장] 방치 및 피버 특화 트리
    // ==========================================
    // 오프라인/환생 분기
    'util_idle_1':        N('util_idle_1', '휴식의 이해 I', '오프라인 보상 10% 증가', 'NORMAL', 1, ['core_origin'], { offlineRewardMultiplier: 0.1 }),
    'util_idle_2':        N('util_idle_2', '휴식의 이해 II', '오프라인 보상 15% 증가', 'NORMAL', 2, ['util_idle_1'], { offlineRewardMultiplier: 0.15 }),
    'util_idle_3':        N('util_idle_3', '효율적인 수면', '오프라인 보상 20% 증가', 'NORMAL', 3, ['util_idle_2'], { offlineRewardMultiplier: 0.2 }),
    'util_reincarnate_1': N('util_reincarnate_1', '차원 도약 (특화)', '환생 시 5층에서 시작', 'NOTABLE', 10, ['util_idle_3'], { startStageBonus: 5 }),

    // 피버 모드 분기
    'util_fever_1':       N('util_fever_1', '투지 I', '피버 모드 배율 1.1배', 'NORMAL', 1, ['core_origin'], { feverMultiplier: 1.1 }),
    'util_fever_2':       N('util_fever_2', '투지 II', '피버 모드 배율 1.2배', 'NORMAL', 2, ['util_fever_1'], { feverMultiplier: 1.2 }),
    'util_fever_3':       N('util_fever_3', '끓어오르는 피', '피버 모드 배율 1.3배', 'NORMAL', 3, ['util_fever_2'], { feverMultiplier: 1.3 }),
    'util_fever_notable': N('util_fever_notable', '광전사 (특화)', '피버 모드 배율 2.0배 증폭', 'NOTABLE', 10, ['util_fever_3'], { feverMultiplier: 2.0 }),

    // 스탯/코어 기본기 분기
    'util_stat_1':        N('util_stat_1', '균형 I', '모든 스탯 +1', 'NORMAL', 1, ['core_origin'], { str: 1, dex: 1, con: 1 }),
    'util_stat_2':        N('util_stat_2', '균형 II', '모든 스탯 +2', 'NORMAL', 2, ['util_stat_1'], { str: 2, dex: 2, con: 2 }),
    'util_stat_3':        N('util_stat_3', '완벽한 몸', '모든 스탯 +3', 'NORMAL', 3, ['util_stat_2'], { str: 3, dex: 3, con: 3 }),
    'util_core_notable':  N('util_core_notable', '코어 공명 (특화)', '코어 기본 성능 10% 증폭', 'NOTABLE', 10, ['util_stat_3'], { coreBonus: 0.1 }),

    // ==========================================
    // 🔥 [불 속성] 힘(STR) & 극딜 특화 트리
    // ==========================================
    'fire_str_1':         N('fire_str_1', '불씨', '힘(STR) +2', 'NORMAL', 1, ['core_origin'], { str: 2 }),
    'fire_str_2':         N('fire_str_2', '장작', '힘(STR) +3', 'NORMAL', 1, ['fire_str_1'], { str: 3 }),
    'fire_str_3':         N('fire_str_3', '타오르는 열기', '힘(STR) +4', 'NORMAL', 2, ['fire_str_2'], { str: 4 }),
    'fire_notable_1':     N('fire_notable_1', '점화 (1차 해금)', '방어 무시 화염 피해 활성화', 'NOTABLE', 5, ['fire_str_3'], { str: 5 }),

    // 불 - [A 루트: 깡공격력 증가]
    'fire_dmg_1':         N('fire_dmg_1', '화력 증강 I', '힘(STR) +3', 'NORMAL', 2, ['fire_notable_1'], { str: 3 }),
    'fire_dmg_2':         N('fire_dmg_2', '화력 증강 II', '힘(STR) +4', 'NORMAL', 3, ['fire_dmg_1'], { str: 4 }),
    'fire_dmg_3':         N('fire_dmg_3', '대폭발', '힘(STR) +5', 'NORMAL', 4, ['fire_dmg_2'], { str: 5 }),
    'fire_notable_dmg':   N('fire_notable_dmg', '지옥불', '기본 공격력 대폭 상승', 'NOTABLE', 8, ['fire_dmg_3'], { str: 10 }),

    // 불 - [B 루트: 화염 계수(트루뎀) 증가]
    'fire_pen_1':         N('fire_pen_1', '열관통 I', '힘(STR) +3', 'NORMAL', 2, ['fire_notable_1'], { str: 3 }),
    'fire_pen_2':         N('fire_pen_2', '열관통 II', '힘(STR) +4', 'NORMAL', 3, ['fire_pen_1'], { str: 4 }),
    'fire_pen_3':         N('fire_pen_3', '용해', '힘(STR) +5', 'NORMAL', 4, ['fire_pen_2'], { str: 5 }),
    'fire_notable_pen':   N('fire_notable_pen', '푸른 불꽃', '화염 피해(트루뎀) 계수 증가', 'NOTABLE', 8, ['fire_pen_3'], { fireDamageRatio: 0.1 }),

    // 불 - [최종 합류]
    'fire_keystone_1':    N('fire_keystone_1', '초신성 (최종 해금)', '화염 피해가 적 방어력을 완전히 찢어버림', 'KEYSTONE', 20, ['fire_notable_dmg', 'fire_notable_pen'], { str: 15, fireDamageRatio: 0.2 }),

    // ==========================================
    // 💧 [물 속성] 체력(CON) & 반사/재생 특화 트리
    // ==========================================
    'water_con_1':        N('water_con_1', '물방울', '체력(CON) +2', 'NORMAL', 1, ['core_origin'], { con: 2 }),
    'water_con_2':        N('water_con_2', '흐르는 강', '체력(CON) +3', 'NORMAL', 1, ['water_con_1'], { con: 3 }),
    'water_con_3':        N('water_con_3', '단단한 얼음', '체력(CON) +4', 'NORMAL', 2, ['water_con_2'], { con: 4 }),
    'water_notable_1':    N('water_notable_1', '가시 방패 (1차 해금)', '시작 쉴드 및 피해 반사 활성화', 'NOTABLE', 5, ['water_con_3'], { con: 5 }),

    // 물 - [A 루트: 쉴드/반사 특화]
    'water_ref_1':        N('water_ref_1', '반사 신경 I', '체력(CON) +3', 'NORMAL', 2, ['water_notable_1'], { con: 3 }),
    'water_ref_2':        N('water_ref_2', '반사 신경 II', '체력(CON) +4', 'NORMAL', 3, ['water_ref_1'], { con: 4 }),
    'water_ref_3':        N('water_ref_3', '거울 호수', '체력(CON) +5', 'NORMAL', 4, ['water_ref_2'], { con: 5 }),
    'water_notable_ref':  N('water_notable_ref', '가시 갑옷', '피해 반사 비율 증가', 'NOTABLE', 8, ['water_ref_3'], { reflectRatio: 0.05 }),

    // 물 - [B 루트: 본체 체력 특화]
    'water_hp_1':         N('water_hp_1', '수압 I', '체력(CON) +3', 'NORMAL', 2, ['water_notable_1'], { con: 3 }),
    'water_hp_2':         N('water_hp_2', '수압 II', '체력(CON) +4', 'NORMAL', 3, ['water_hp_1'], { con: 4 }),
    'water_hp_3':         N('water_hp_3', '심해의 생명력', '체력(CON) +5', 'NORMAL', 4, ['water_hp_2'], { con: 5 }),
    'water_notable_hp':   N('water_notable_hp', '해신', '타격 시 쉴드 회복량 증폭', 'NOTABLE', 8, ['water_hp_3'], { regenRatio: 0.02 }),

    // 물 - [최종 합류]
    'water_keystone_1':   N('water_keystone_1', '절대 영도 (최종 해금)', '반사 데미지 극대화 및 무한 쉴드 재생', 'KEYSTONE', 20, ['water_notable_ref', 'water_notable_hp'], { con: 15, reflectRatio: 0.1 }),

    // ==========================================
    // 🌪️ [바람 속성] 민첩(DEX) & 연격/회피 특화 트리
    // ==========================================
    'wind_dex_1':         N('wind_dex_1', '산들바람', '민첩(DEX) +2', 'NORMAL', 1, ['core_origin'], { dex: 2 }),
    'wind_dex_2':         N('wind_dex_2', '가벼운 발걸음', '민첩(DEX) +3', 'NORMAL', 1, ['wind_dex_1'], { dex: 3 }),
    'wind_dex_3':         N('wind_dex_3', '바람의 호흡', '민첩(DEX) +4', 'NORMAL', 2, ['wind_dex_2'], { dex: 4 }),
    'wind_notable_1':     N('wind_notable_1', '칼날바람 (1차 해금)', '15회 적중 시 연격 발생 활성화', 'NOTABLE', 5, ['wind_dex_3'], { multiHitRequired: 15 }),

    // 바람 - [A 루트: 연격 특화]
    'wind_combo_1':       N('wind_combo_1', '가속 I', '민첩(DEX) +3', 'NORMAL', 2, ['wind_notable_1'], { dex: 3 }),
    'wind_combo_2':       N('wind_combo_2', '가속 II', '민첩(DEX) +4', 'NORMAL', 3, ['wind_combo_1'], { dex: 4 }),
    'wind_combo_3':       N('wind_combo_3', '날카로운 연격', '민첩(DEX) +5', 'NORMAL', 4, ['wind_combo_2'], { dex: 5 }),
    'wind_notable_combo': N('wind_notable_combo', '무호흡 타격', '연격 요구 타격수 감소 (-3)', 'NOTABLE', 8, ['wind_combo_3'], { multiHitRequired: -3 }),

    // 바람 - [B 루트: 확정 회피 특화]
    'wind_eva_1':         N('wind_eva_1', '흐름 타기 I', '민첩(DEX) +3', 'NORMAL', 2, ['wind_notable_1'], { dex: 3 }),
    'wind_eva_2':         N('wind_eva_2', '흐름 타기 II', '민첩(DEX) +4', 'NORMAL', 3, ['wind_eva_1'], { dex: 4 }),
    'wind_eva_3':         N('wind_eva_3', '잔상', '민첩(DEX) +5', 'NORMAL', 4, ['wind_eva_2'], { dex: 5 }),
    'wind_notable_eva':   N('wind_notable_eva', '환영', '회피 충전 속도 증가', 'NOTABLE', 8, ['wind_eva_3'], { evasionChanceBonus: 0.05 }),

    // 바람 - [최종 합류]
    'wind_keystone_1':    N('wind_keystone_1', '태풍의 눈 (최종 해금)', '연격 빈도 폭발 및 회피 극대화', 'KEYSTONE', 20, ['wind_notable_combo', 'wind_notable_eva'], { dex: 15, multiHitRequired: -5 }),

    // ==========================================
    // ⚡ [번개 속성] 하이브리드 & 기절/처형 특화 트리
    // ==========================================
    'elec_util_1':        N('elec_util_1', '정전기', '전체 스탯 +1', 'NORMAL', 1, ['core_origin'], { str: 1, dex: 1, con: 1 }),
    'elec_util_2':        N('elec_util_2', '마찰 전기', '전체 스탯 +1', 'NORMAL', 1, ['elec_util_1'], { str: 1, dex: 1, con: 1 }),
    'elec_util_3':        N('elec_util_3', '스파크', '전체 스탯 +2', 'NORMAL', 2, ['elec_util_2'], { str: 2, dex: 2, con: 2 }),
    'elec_notable_1':     N('elec_notable_1', '마비 (1차 해금)', '10회 적중 시 기절 및 처형 활성화', 'NOTABLE', 5, ['elec_util_3'], { stunChance: 0.1 }),

    // 번개 - [A 루트: 기절 제어 특화]
    'elec_stun_1':        N('elec_stun_1', '전압 상승 I', '전체 스탯 +2', 'NORMAL', 2, ['elec_notable_1'], { str: 2, dex: 2, con: 2 }),
    'elec_stun_2':        N('elec_stun_2', '전압 상승 II', '전체 스탯 +2', 'NORMAL', 3, ['elec_stun_1'], { str: 2, dex: 2, con: 2 }),
    'elec_stun_3':        N('elec_stun_3', '연쇄 방전', '전체 스탯 +3', 'NORMAL', 4, ['elec_stun_2'], { str: 3, dex: 3, con: 3 }),
    'elec_notable_stun':  N('elec_notable_stun', '과부하', '기절 발동 속도 대폭 증가', 'NOTABLE', 8, ['elec_stun_3'], { stunDuration: 1 }),

    // 번개 - [B 루트: 처형 극딜 특화]
    'elec_exec_1':        N('elec_exec_1', '집중 I', '전체 스탯 +2', 'NORMAL', 2, ['elec_notable_1'], { str: 2, dex: 2, con: 2 }),
    'elec_exec_2':        N('elec_exec_2', '집중 II', '전체 스탯 +2', 'NORMAL', 3, ['elec_exec_1'], { str: 2, dex: 2, con: 2 }),
    'elec_exec_3':        N('elec_exec_3', '치명적 전압', '전체 스탯 +3', 'NORMAL', 4, ['elec_exec_2'], { str: 3, dex: 3, con: 3 }),
    'elec_notable_exec':  N('elec_notable_exec', '단두대', '기절 상태 적에게 가하는 처형 데미지 증폭', 'NOTABLE', 8, ['elec_exec_3'], { executionBonus: 0.5 }),

    // 번개 - [최종 합류]
    'elec_keystone_1':    N('elec_keystone_1', '뇌신 (최종 해금)', '기절된 적을 즉사에 가깝게 분쇄', 'KEYSTONE', 20, ['elec_notable_stun', 'elec_notable_exec'], { str: 5, dex: 5, con: 5, executionBonus: 1.0 })
};