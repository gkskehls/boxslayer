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

// 기원의 상자 (중심 원점 스킬 노드)
const CORE_ORIGIN_NODE: Record<string, SkillNode> = {
    'core_origin': N('core_origin', '기원의 상자', '모든 힘의 시작점입니다. (체력 +5)', 'KEYSTONE', 0, [], { con: 5 })
};

// 500개 대규모 방사형 스킬 트리 자동 생성기 (6개월 라이프사이클 지수함수 RP 곡선)
const generateFull500SkillTree = (): Record<string, SkillNode> => {
    const skills: Record<string, SkillNode> = { ...CORE_ORIGIN_NODE };

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