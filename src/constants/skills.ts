import type { SkillNode, SkillEffects } from '../types/game';

// 헬퍼 함수의 effects 타입을 SkillEffects로 변경하여 타입 안정성 확보
const N = (
    id: string,
    name: string,
    description: string,
    type: 'NORMAL' | 'NOTABLE' | 'KEYSTONE',
    cost: number,
    requires: string[],
    effects: SkillEffects
): SkillNode => ({
    id, name, description, type, cost, requires, effects
});

export const SKILL_TREE_DATA: Record<string, SkillNode> = {
    // ==========================================
    // 🌟 [중앙 시작점]
    // ==========================================
    'core_origin': N('core_origin', '기원의 상자', '모든 힘의 시작점입니다. (체력 +5)', 'KEYSTONE', 0, [], { con: 5 }),

    // ==========================================
    // ⚙️ [유틸리티/성장] 방치 및 피버 특화 트리
    // ==========================================
    'util_idle_1':        N('util_idle_1', '휴식의 이해 I', '오프라인 보상 10% 증가', 'NORMAL', 1, ['core_origin'], { offlineRewardMultiplier: 0.1 }),
    'util_idle_2':        N('util_idle_2', '휴식의 이해 II', '오프라인 보상 15% 증가', 'NORMAL', 2, ['util_idle_1'], { offlineRewardMultiplier: 0.15 }),
    'util_idle_3':        N('util_idle_3', '효율적인 수면', '오프라인 보상 20% 증가', 'NORMAL', 3, ['util_idle_2'], { offlineRewardMultiplier: 0.2 }),
    'util_reincarnate_1': N('util_reincarnate_1', '차원 도약 (특화)', '환생 시 5층에서 시작', 'NOTABLE', 10, ['util_idle_3'], { startStageBonus: 5 }),

    'util_fever_1':       N('util_fever_1', '투지 I', '피버 모드 배율 1.1배', 'NORMAL', 1, ['core_origin'], { feverMultiplier: 1.1 }),
    'util_fever_2':       N('util_fever_2', '투지 II', '피버 모드 배율 1.2배', 'NORMAL', 2, ['util_fever_1'], { feverMultiplier: 1.2 }),
    'util_fever_3':       N('util_fever_3', '끓어오르는 피', '피버 모드 배율 1.3배', 'NORMAL', 3, ['util_fever_2'], { feverMultiplier: 1.3 }),
    'util_fever_notable': N('util_fever_notable', '광전사 (특화)', '피버 모드 배율 2.0배 증폭', 'NOTABLE', 10, ['util_fever_3'], { feverMultiplier: 2.0 }),

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
    'fire_notable_1':     N('fire_notable_1', '1차 해금: STR 계수', '화염 피해에 힘(STR) 계수가 적용됩니다.', 'NOTABLE', 5, ['fire_str_3'], { coreEffects: { FIRE: { strRatio: 0.1 } } }),

    'fire_dmg_1':         N('fire_dmg_1', '화력 증강 I', '힘(STR) +3', 'NORMAL', 2, ['fire_notable_1'], { str: 3 }),
    'fire_dmg_2':         N('fire_dmg_2', '화력 증강 II', '힘(STR) +4', 'NORMAL', 3, ['fire_dmg_1'], { str: 4 }),
    'fire_dmg_3':         N('fire_dmg_3', '대폭발', '힘(STR) +5', 'NORMAL', 4, ['fire_dmg_2'], { str: 5 }),
    'fire_notable_dmg':   N('fire_notable_dmg', '2차 해금: 피해 증폭', '화염 피해의 기본 피해량과 STR 계수가 증폭됩니다.', 'NOTABLE', 8, ['fire_dmg_3'], { coreEffects: { FIRE: { baseDamageMultiplier: 2, strRatio: 0.05 } } }), // 기존 1.5배를 합연산으로近似

    'fire_pen_1':         N('fire_pen_1', '열관통 I', '힘(STR) +3', 'NORMAL', 2, ['fire_notable_1'], { str: 3 }),
    'fire_pen_2':         N('fire_pen_2', '열관통 II', '힘(STR) +4', 'NORMAL', 3, ['fire_pen_1'], { str: 4 }),
    'fire_pen_3':         N('fire_pen_3', '용해', '힘(STR) +5', 'NORMAL', 4, ['fire_pen_2'], { str: 5 }),
    'fire_notable_pen':   N('fire_notable_pen', '3차 해금: 화상', '화염 피해가 적에게 지속 피해를 입히는 화상 효과를 부여합니다.', 'NOTABLE', 8, ['fire_pen_3'], { coreEffects: { FIRE: {  } } }), // 화상 로직은 전투에서 별도 처리 필요

    'fire_keystone_1':    N('fire_keystone_1', '최종 해금: 초신성', '화상 피해가 극대화되고, 화상 상태의 적에게 모든 공격이 치명타로 적용됩니다. (상점 구매 필요)', 'KEYSTONE', 20, ['fire_notable_dmg', 'fire_notable_pen'], {}),

    // ==========================================
    // 💧 [물 속성] 체력(CON) & 반사/재생 특화 트리
    // ==========================================
    'water_con_1':        N('water_con_1', '물방울', '체력(CON) +2', 'NORMAL', 1, ['core_origin'], { con: 2 }),
    'water_con_2':        N('water_con_2', '흐르는 강', '체력(CON) +3', 'NORMAL', 1, ['water_con_1'], { con: 3 }),
    'water_con_3':        N('water_con_3', '단단한 얼음', '체력(CON) +4', 'NORMAL', 2, ['water_con_2'], { con: 4 }),
    'water_notable_1':    N('water_notable_1', '1차 해금: 쉴드 회복', '공격 시마다 최대 체력에 비례한 쉴드를 회복합니다.', 'NOTABLE', 5, ['water_con_3'], { coreEffects: { WATER: { shieldPerHitRatio: 0.005 } } }),

    'water_ref_1':        N('water_ref_1', '반사 신경 I', '체력(CON) +3', 'NORMAL', 2, ['water_notable_1'], { con: 3 }),
    'water_ref_2':        N('water_ref_2', '반사 신경 II', '체력(CON) +4', 'NORMAL', 3, ['water_ref_1'], { con: 4 }),
    'water_ref_3':        N('water_ref_3', '거울 호수', '체력(CON) +5', 'NORMAL', 4, ['water_ref_2'], { con: 5 }),
    'water_notable_ref':  N('water_notable_ref', '3차 해금: 피해 반사', '피격 시 받은 피해의 일부를 적에게 되돌려줍니다.', 'NOTABLE', 8, ['water_ref_3'], { coreEffects: { WATER: { reflectRatio: 0.05 } } }),

    'water_hp_1':         N('water_hp_1', '수압 I', '체력(CON) +3', 'NORMAL', 2, ['water_notable_1'], { con: 3 }),
    'water_hp_2':         N('water_hp_2', '수압 II', '체력(CON) +4', 'NORMAL', 3, ['water_hp_1'], { con: 4 }),
    'water_hp_3':         N('water_hp_3', '심해의 생명력', '체력(CON) +5', 'NORMAL', 4, ['water_hp_2'], { con: 5 }),
    'water_notable_hp':   N('water_notable_hp', '2차 해금: 쉴드 증폭', '전투 시작 시 얻는 쉴드의 양이 대폭 증가합니다.', 'NOTABLE', 8, ['water_hp_3'], { coreEffects: { WATER: { initialShieldMultiplier: 2 } } }),

    'water_keystone_1':   N('water_keystone_1', '최종 해금: 해일', '쉴드 회복량과 피해 반사 비율이 대폭 증가합니다. (상점 구매 필요)', 'KEYSTONE', 20, ['water_notable_ref', 'water_notable_hp'], {}),

    // ==========================================
    // 🌪️ [바람 속성] 민첩(DEX) & 연격/회피 특화 트리
    // ==========================================
    'wind_dex_1':         N('wind_dex_1', '산들바람', '민첩(DEX) +2', 'NORMAL', 1, ['core_origin'], { dex: 2 }),
    'wind_dex_2':         N('wind_dex_2', '가벼운 발걸음', '민첩(DEX) +3', 'NORMAL', 1, ['wind_dex_1'], { dex: 3 }),
    'wind_dex_3':         N('wind_dex_3', '바람의 호흡', '민첩(DEX) +4', 'NORMAL', 2, ['wind_dex_2'], { dex: 4 }),
    'wind_notable_1':     N('wind_notable_1', '1차 해금: 연격', '15회 공격마다 추가 공격(연격)이 발동합니다.', 'NOTABLE', 5, ['wind_dex_3'], { coreEffects: { WIND: { comboThreshold: 15, comboDamageMultiplier: 1 } } }),

    'wind_combo_1':       N('wind_combo_1', '가속 I', '민첩(DEX) +3', 'NORMAL', 2, ['wind_notable_1'], { dex: 3 }),
    'wind_combo_2':       N('wind_combo_2', '가속 II', '민첩(DEX) +4', 'NORMAL', 3, ['wind_combo_1'], { dex: 4 }),
    'wind_combo_3':       N('wind_combo_3', '날카로운 연격', '민첩(DEX) +5', 'NORMAL', 4, ['wind_combo_2'], { dex: 5 }),
    'wind_notable_combo': N('wind_notable_combo', '2차 해금: 연격 강화', '연격 필요 공격 횟수가 5 감소하고, 연격 데미지가 50% 증가합니다.', 'NOTABLE', 8, ['wind_combo_3'], { coreEffects: { WIND: { comboThreshold: -5, comboDamageMultiplier: 0.5 } } }),

    'wind_eva_1':         N('wind_eva_1', '흐름 타기 I', '민첩(DEX) +3', 'NORMAL', 2, ['wind_notable_1'], { dex: 3 }),
    'wind_eva_2':         N('wind_eva_2', '흐름 타기 II', '민첩(DEX) +4', 'NORMAL', 3, ['wind_eva_1'], { dex: 4 }),
    'wind_eva_3':         N('wind_eva_3', '잔상', '민첩(DEX) +5', 'NORMAL', 4, ['wind_eva_2'], { dex: 5 }),
    'wind_notable_eva':   N('wind_notable_eva', '3차 해금: 확정 회피', '20회 공격마다 다음 피격을 100% 회피하는 \'잔상\' 효과를 얻습니다.', 'NOTABLE', 8, ['wind_eva_3'], { coreEffects: { WIND: { evasionThreshold: 20 } } }),

    'wind_keystone_1':    N('wind_keystone_1', '최종 해금: 태풍의 눈', '연격이 발동할 때마다 확정 회피 \'잔상\' 효과가 즉시 충전됩니다. (상점 구매 필요)', 'KEYSTONE', 20, ['wind_notable_combo', 'wind_notable_eva'], {}),

    // ==========================================
    // ⚡ [번개 속성] 하이브리드 & 기절/처형 특화 트리
    // ==========================================
    'elec_util_1':        N('elec_util_1', '정전기', '전체 스탯 +1', 'NORMAL', 1, ['core_origin'], { str: 1, dex: 1, con: 1 }),
    'elec_util_2':        N('elec_util_2', '마찰 전기', '전체 스탯 +1', 'NORMAL', 1, ['elec_util_1'], { str: 1, dex: 1, con: 1 }),
    'elec_util_3':        N('elec_util_3', '스파크', '전체 스탯 +2', 'NORMAL', 2, ['elec_util_2'], { str: 2, dex: 2, con: 2 }),
    'elec_notable_1':     N('elec_notable_1', '1차 해금: 기절', '10회 공격마다 적을 1초 동안 기절시킵니다.', 'NOTABLE', 5, ['elec_util_3'], { coreEffects: { ELECTRIC: { stunThreshold: 10, stunDuration: 1 } } }),

    'elec_stun_1':        N('elec_stun_1', '전압 상승 I', '전체 스탯 +2', 'NORMAL', 2, ['elec_notable_1'], { str: 2, dex: 2, con: 2 }),
    'elec_stun_2':        N('elec_stun_2', '전압 상승 II', '전체 스탯 +2', 'NORMAL', 3, ['elec_stun_1'], { str: 2, dex: 2, con: 2 }),
    'elec_stun_3':        N('elec_stun_3', '연쇄 방전', '전체 스탯 +3', 'NORMAL', 4, ['elec_stun_2'], { str: 3, dex: 3, con: 3 }),
    'elec_notable_stun':  N('elec_notable_stun', '2차 해금: 기절 강화', '기절 필요 공격 횟수가 3 감소하고, 지속 시간이 0.5초 증가합니다.', 'NOTABLE', 8, ['elec_stun_3'], { coreEffects: { ELECTRIC: { stunThreshold: -3, stunDuration: 0.5 } } }),

    'elec_exec_1':        N('elec_exec_1', '집중 I', '전체 스탯 +2', 'NORMAL', 2, ['elec_notable_1'], { str: 2, dex: 2, con: 2 }),
    'elec_exec_2':        N('elec_exec_2', '집중 II', '전체 스탯 +2', 'NORMAL', 3, ['elec_exec_1'], { str: 2, dex: 2, con: 2 }),
    'elec_exec_3':        N('elec_exec_3', '치명적 전압', '전체 스탯 +3', 'NORMAL', 4, ['elec_exec_2'], { str: 3, dex: 3, con: 3 }),
    'elec_notable_exec':  N('elec_notable_exec', '3차 해금: 처형', '기절 상태인 적에게 공격 시 50%의 추가 피해를 입힙니다.', 'NOTABLE', 8, ['elec_exec_3'], { coreEffects: { ELECTRIC: { executeDamageMultiplier: 0.5 } } }),

    'elec_keystone_1':    N('elec_keystone_1', '최종 해금: 뇌신', '처형 데미지가 극대화되고, 처형으로 적 처치 시 모든 공격 속도가 폭발적으로 증가합니다. (상점 구매 필요)', 'KEYSTONE', 20, ['elec_notable_stun', 'elec_notable_exec'], {})
};