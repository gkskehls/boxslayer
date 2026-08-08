import type { SkillNode, SkillEffects } from '../types/game';

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

// 기존 유통 레가시 노드 기본 세팅
const LEGACY_SKILLS: Record<string, SkillNode> = {
    'core_origin': N('core_origin', '기원의 상자', '모든 힘의 시작점입니다. (체력 +5)', 'KEYSTONE', 0, [], { con: 5 }),

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

    'fire_str_1':         N('fire_str_1', '불씨', '힘(STR) +2', 'NORMAL', 1, ['core_origin'], { str: 2 }),
    'fire_str_2':         N('fire_str_2', '장작', '힘(STR) +3', 'NORMAL', 1, ['fire_str_1'], { str: 3 }),
    'fire_str_3':         N('fire_str_3', '타오르는 열기', '힘(STR) +4', 'NORMAL', 2, ['fire_str_2'], { str: 4 }),
    'fire_notable_1':     N('fire_notable_1', '1차 해금: STR 계수', '화염 피해에 힘(STR) 계수가 적용됩니다.', 'NOTABLE', 5, ['fire_str_3'], { coreEffects: { FIRE: { strRatio: 0.1 } } }),

    'fire_dmg_1':         N('fire_dmg_1', '화력 증강 I', '힘(STR) +3', 'NORMAL', 2, ['fire_notable_1'], { str: 3 }),
    'fire_dmg_2':         N('fire_dmg_2', '화력 증강 II', '힘(STR) +4', 'NORMAL', 3, ['fire_dmg_1'], { str: 4 }),
    'fire_dmg_3':         N('fire_dmg_3', '대폭발', '힘(STR) +5', 'NORMAL', 4, ['fire_dmg_2'], { str: 5 }),
    'fire_notable_dmg':   N('fire_notable_dmg', '2차 해금: 피해 증폭', '화염 피해의 기본 피해량과 STR 계수가 증폭됩니다.', 'NOTABLE', 8, ['fire_dmg_3'], { coreEffects: { FIRE: { baseDamageMultiplier: 2, strRatio: 0.05 } } }),

    'fire_pen_1':         N('fire_pen_1', '열관통 I', '힘(STR) +3', 'NORMAL', 2, ['fire_notable_1'], { str: 3 }),
    'fire_pen_2':         N('fire_pen_2', '열관통 II', '힘(STR) +4', 'NORMAL', 3, ['fire_pen_1'], { str: 4 }),
    'fire_pen_3':         N('fire_pen_3', '용해', '힘(STR) +5', 'NORMAL', 4, ['fire_pen_2'], { str: 5 }),
    'fire_notable_pen':   N('fire_notable_pen', '3차 해금: 화상', '화염 피해가 적에게 지속 피해를 입히는 화상 효과를 부여합니다.', 'NOTABLE', 8, ['fire_pen_3'], { coreEffects: { FIRE: {  } } }),

    'fire_keystone_1':    N('fire_keystone_1', '최종 해금: 초신성', '화상 피해가 극대화되고, 화상 상태의 적에게 모든 공격이 치명타로 적용됩니다.', 'KEYSTONE', 20, ['fire_notable_dmg', 'fire_notable_pen'], {}),

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

    'water_keystone_1':   N('water_keystone_1', '최종 해금: 해일', '쉴드 회복량과 피해 반사 비율이 대폭 증가합니다.', 'KEYSTONE', 20, ['water_notable_ref', 'water_notable_hp'], {}),

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

    'wind_keystone_1':    N('wind_keystone_1', '최종 해금: 태풍의 눈', '연격이 발동할 때마다 확정 회피 \'잔상\' 효과가 즉시 충전됩니다.', 'KEYSTONE', 20, ['wind_notable_combo', 'wind_notable_eva'], {}),

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

    'elec_keystone_1':    N('elec_keystone_1', '최종 해금: 뇌신', '처형 데미지가 극대화되고, 처형으로 적 처치 시 모든 공격 속도가 폭발적으로 증가합니다.', 'KEYSTONE', 20, ['elec_notable_stun', 'elec_notable_exec'], {})
};

// 500개 대규모 방사형 스킬 트리 자동 생성기 (6개월 라이프사이클 지수함수 RP 곡선)
const generateFull500SkillTree = (): Record<string, SkillNode> => {
    const skills: Record<string, SkillNode> = { ...LEGACY_SKILLS };

    const branches = [
        { key: 'fire', name: '불의 코어', stat: 'str', coreType: 'FIRE' as const },
        { key: 'water', name: '물의 코어', stat: 'con', coreType: 'WATER' as const },
        { key: 'wind', name: '바람의 코어 (연격)', stat: 'dex', coreType: 'WIND' as const },
        { key: 'electric', name: '번개의 코어', stat: 'all', coreType: 'ELECTRIC' as const },
        { key: 'util', name: '차원 유틸', stat: 'util', coreType: null }
    ];

    // 각 브랜치당 100개 노드 생성 (1 ~ 100)
    branches.forEach(b => {
        for (let i = 1; i <= 100; i++) {
            const nodeId = `${b.key}_tree_node_${i}`;

            // 선행 노드 연결
            let requires: string[];
            if (i === 1) {
                requires = ['core_origin'];
            } else if (i % 5 === 1 && i > 5) {
                // 분기 노드는 이전 메인 마일스톤 노드 연결
                requires = [`${b.key}_tree_node_${i - 5}`];
            } else {
                requires = [`${b.key}_tree_node_${i - 1}`];
            }

            // 티어 구획 (1 ~ 10 티어)
            const tier = Math.ceil(i / 10);

            // RP 비용 지수함수 곡선 (10티어 최종 Keystone은 150,000 ~ 200,000 RP)
            let cost = 1;
            if (tier === 1) cost = Math.floor(1 + (i * 0.5));
            else if (tier === 2) cost = Math.floor(10 + ((i - 10) * 2));
            else if (tier === 3) cost = Math.floor(50 + ((i - 20) * 10));
            else if (tier === 4) cost = Math.floor(300 + ((i - 30) * 30));
            else if (tier === 5) cost = Math.floor(1200 + ((i - 40) * 150));
            else if (tier === 6) cost = Math.floor(5000 + ((i - 50) * 500));
            else if (tier === 7) cost = Math.floor(15000 + ((i - 60) * 1500));
            else if (tier === 8) cost = Math.floor(40000 + ((i - 70) * 4000));
            else if (tier === 9) cost = Math.floor(80000 + ((i - 80) * 6000));
            else if (tier === 10) {
                if (i === 100) cost = b.key === 'electric' ? 200000 : 150000;
                else cost = Math.floor(140000 + ((i - 90) * 1000));
            }

            // 노드 타입
            let type: 'NORMAL' | 'NOTABLE' | 'KEYSTONE' = 'NORMAL';
            if (i === 100) type = 'KEYSTONE';
            else if (i % 10 === 0) type = 'NOTABLE';

            // 노드 이름 및 효과 세팅 (1~3티어: Flat, 4~10티어: %)
            let name = `${b.name} Tier ${tier}-${i % 10 || 10}`;
            let description = '';
            const effects: SkillEffects = {};

            if (b.key === 'fire') {
                if (tier <= 3) {
                    const flatVal = tier * 2 + (i % 10);
                    effects.str = flatVal;
                    name = `화염 불꽃 [Str +${flatVal}]`;
                    description = `공격력의 근본이 되는 힘(STR)이 고정 +${flatVal} 증가합니다.`;
                } else {
                    const percentVal = Math.round((tier * 0.01 + (i % 10) * 0.005) * 100) / 100;
                    effects.strPercent = percentVal;
                    name = `화염의 연소 [Str +${Math.round(percentVal * 100)}%]`;
                    description = `힘(STR) 수치가 곱연산으로 +${Math.round(percentVal * 100)}% 폭증합니다.`;
                }
                if (type === 'NOTABLE') {
                    effects.coreEffects = { FIRE: { strRatio: 0.05 * tier, baseDamageMultiplier: 1 + (tier * 0.2) } };
                    name = `[특화] 화염 마일스톤 T${tier}`;
                    description = `화염 코어의 기본 피해량과 힘(STR) 계수가 대폭 강화됩니다.`;
                }
                if (type === 'KEYSTONE') {
                    effects.strPercent = 0.5;
                    effects.coreEffects = { FIRE: { strRatio: 0.5, baseDamageMultiplier: 5 } };
                    name = `[Keystone] 초신성 도달 (3차 종결)`;
                    description = `화염 권능 완성: 힘(STR) +50% 및 화염 데미지 5배 증폭! (6개월 파밍 최종장)`;
                }
            } else if (b.key === 'water') {
                if (tier <= 3) {
                    const flatVal = tier * 3 + (i % 10);
                    effects.con = flatVal;
                    name = `수호의 샘 [Con +${flatVal}]`;
                    description = `생명력과 방어력의 근본이 되는 체력(CON)이 고정 +${flatVal} 증가합니다.`;
                } else {
                    const percentVal = Math.round((tier * 0.01 + (i % 10) * 0.005) * 100) / 100;
                    effects.conPercent = percentVal;
                    name = `대해의 파도 [Con +${Math.round(percentVal * 100)}%]`;
                    description = `체력(CON) 수치가 곱연산으로 +${Math.round(percentVal * 100)}% 증가합니다.`;
                }
                if (type === 'NOTABLE') {
                    effects.coreEffects = { WATER: { shieldPerHitRatio: 0.002 * tier, reflectRatio: 0.02 * tier } };
                    name = `[특화] 수호 마일스톤 T${tier}`;
                    description = `타격 시 쉴드 회복량과 피격 시 피해 반사율이 상승합니다.`;
                }
                if (type === 'KEYSTONE') {
                    effects.conPercent = 0.5;
                    effects.coreEffects = { WATER: { reflectRatio: 0.3, initialShieldMultiplier: 5 } };
                    name = `[Keystone] 대해일 방벽 (3차 종결)`;
                    description = `수호 권능 완성: 체력(CON) +50%, 반사율 +30% 및 시작 쉴드 5배!`;
                }
            } else if (b.key === 'wind') {
                // 연격 (Multi-Hit) 중심
                if (tier <= 3) {
                    const flatVal = tier * 2 + (i % 10);
                    effects.dex = flatVal;
                    effects.comboChance = 0.01 * tier;
                    name = `신속의 바람 [Dex +${flatVal}, 연격 +${tier}%]`;
                    description = `민첩(DEX) +${flatVal} 및 공격 시 연격 발동 확률이 +${tier}% 증가합니다.`;
                } else {
                    const percentVal = Math.round((tier * 0.01 + (i % 10) * 0.005) * 100) / 100;
                    effects.dexPercent = percentVal;
                    effects.comboChance = 0.015;
                    effects.comboMultiplier = 0.05;
                    name = `연격의 질주 [Dex +${Math.round(percentVal * 100)}%, 연격확률 +1.5%]`;
                    description = `민첩(DEX) +${Math.round(percentVal * 100)}% 및 연격 확률/배율이 가산됩니다.`;
                }
                if (type === 'NOTABLE') {
                    effects.comboHitsAdded = 1;
                    effects.comboMultiplier = 0.3;
                    name = `[특화] 폭풍 연격 마일스톤 T${tier}`;
                    description = `연격 발동 시 추가 타격수 +1회 및 연격 피해 배율이 +30% 증가합니다.`;
                }
                if (type === 'KEYSTONE') {
                    effects.dexPercent = 0.5;
                    effects.comboChance = 0.25;
                    effects.comboMultiplier = 2.0;
                    effects.comboHitsAdded = 2;
                    name = `[Keystone] 태풍의 눈 (연격 종결)`;
                    description = `바람 권능 완성: 민첩 +50%, 연격 확률 +25%, 연격 데미지 200% 증폭 및 추가 타격 +2회!`;
                }
            } else if (b.key === 'electric') {
                if (tier <= 3) {
                    effects.str = tier;
                    effects.dex = tier;
                    effects.con = tier;
                    name = `뇌전의 스파크 [올스탯 +${tier}]`;
                    description = `모든 스탯(STR/DEX/CON)이 고정 +${tier} 증가합니다.`;
                } else {
                    const percentVal = Math.round((tier * 0.008 + (i % 10) * 0.003) * 100) / 100;
                    effects.strPercent = percentVal;
                    effects.dexPercent = percentVal;
                    effects.conPercent = percentVal;
                    name = `뇌신의 전류 [올스탯 +${Math.round(percentVal * 100)}%]`;
                    description = `모든 스탯이 곱연산으로 +${Math.round(percentVal * 100)}% 균형 상승합니다.`;
                }
                if (type === 'NOTABLE') {
                    effects.coreEffects = { ELECTRIC: { executeDamageMultiplier: 0.1 * tier, stunDuration: 0.2 * tier } };
                    name = `[특화] 뇌전 마일스톤 T${tier}`;
                    description = `기절 지속 시간과 기절 적 대상 처형 치명타 피해가 상승합니다.`;
                }
                if (type === 'KEYSTONE') {
                    effects.strPercent = 0.3;
                    effects.dexPercent = 0.3;
                    effects.conPercent = 0.3;
                    effects.coreEffects = { ELECTRIC: { executeDamageMultiplier: 2.0, stunDuration: 3 } };
                    name = `[Keystone] 뇌신 강림 (3차 종결)`;
                    description = `뇌전 권능 완성: 모든 스탯 +30%, 기절 3초 지속 및 처형 피해 +200%!`;
                }
            } else if (b.key === 'util') {
                if (tier <= 3) {
                    effects.offlineRewardMultiplier = 0.05 * i;
                    name = `차원 탐색 I [휴식보상 +${Math.round(effects.offlineRewardMultiplier * 100)}%]`;
                    description = `오프라인 오토 보상 정산량이 +${Math.round(effects.offlineRewardMultiplier * 100)}% 증가합니다.`;
                } else if (tier <= 6) {
                    effects.startStageBonus = tier * 5;
                    effects.feverMultiplier = 1.0 + (tier * 0.1);
                    name = `차원 도약 [시작층 +${effects.startStageBonus}, 피버배율 +${effects.feverMultiplier.toFixed(1)}]`;
                    description = `환생 후 시작 스테이지와 피버 모드 데미지 배율이 상승합니다.`;
                } else {
                    effects.offlineRewardMultiplier = 0.2;
                    effects.startStageBonus = 10;
                    name = `차원 왜곡 [오프라인/시작층 강화]`;
                    description = `파밍 효율성 및 고층 바로가기 수치가 연속 가산됩니다.`;
                }
                if (type === 'NOTABLE') {
                    effects.rpBonusMultiplier = 0.1 * tier;
                    name = `[특화] RP 수급 증폭 T${tier}`;
                    description = `환생 시 획득하는 환생 포인트(RP)량이 +${tier * 10}% 증폭됩니다.`;
                }
                if (type === 'KEYSTONE') {
                    effects.offlineRewardMultiplier = 2.0;
                    effects.startStageBonus = 100;
                    effects.feverMultiplier = 3.0;
                    effects.rpBonusMultiplier = 1.0;
                    name = `[Keystone] 차원 주권 (유틸 종결)`;
                    description = `유틸 권능 완성: 환생시 100층 시작, RP 수급 2배, 피버 3배 및 오프라인 보상 200% 증폭!`;
                }
            }

            skills[nodeId] = N(nodeId, name, description, type, cost, requires, effects);
        }
    });

    return skills;
};

export const SKILL_TREE_DATA: Record<string, SkillNode> = generateFull500SkillTree();