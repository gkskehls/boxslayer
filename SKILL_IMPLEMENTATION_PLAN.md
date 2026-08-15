# 🗺️ 대규모 스킬 트리 및 연격 시스템 구현 가이드 (Implementation Plan)

본 문서는 `SKILL_TREE_BALANCING_PLAN.md`에서 정의한 6개월 라이프사이클의 대규모 패시브 트리(500개 노드)와 연격(Multi-Hit) 메커니즘을 코드에 녹여내기 위해 **"무엇부터 수정하고, 무엇을 사용하며, 어떻게 반영할지"**에 대한 기술적 실무 개발 로드맵입니다.

---

## 📅 [로드맵 개요] 전체 개발 순서 요약

```
[1단계: 타입 정의] ➡️ [2단계: 곱연산 스탯 식] ➡️ [3단계: 연격 전투 엔진] ➡️ [4단계: 드래그 캔버스] ➡️ [5단계: 대규모 노드 데이터]
```

---

## 🛠️ [세부 단계별 실행 계획]

### 1단계. 데이터 모델링 및 타입 정의
* **무엇부터 수정할까?**: `src/types/game.ts`
* **무엇을 사용하고 바꿀까?**:
  * `Stats` 및 `SkillEffects` 인터페이스 확장.
* **어떻게 반영할까?**:
  * **백분율 스탯**을 소화할 수 있도록 `SkillEffects`에 % 필드들을 신설합니다.
  * **연격 메커니즘**을 스토어와 전투 루프가 인지할 수 있도록 플레이어 능력치 상태에 관련 옵션을 추가합니다.
  ```typescript
  // src/types/game.ts 에 추가할 구현 스펙 예시
  export interface SkillEffects {
    // 1) 고정 스탯 (기존 유지)
    str?: number;
    dex?: number;
    con?: number;
    
    // 2) [신설] 백분율 스탯 (후반 지향)
    strPercent?: number;  // 예: 0.05 = +5%
    dexPercent?: number;
    conPercent?: number;
    
    // 3) [신설] 연격 옵션
    comboChance?: number;      // 연격 확률 (예: 0.15 = 15% 확률)
    comboMultiplier?: number;  // 연격 데미지 배율 (예: 1.5 = 150% 데미지)
    comboHitsAdded?: number;   // 연격 시 추가 타격 횟수 (예: +1회)
  }
  ```

---

### 2단계. Zustand 스토어 스탯 실시간 연산식(곱연산) 개선
* **무엇부터 수정할까?**: `src/store/gameStore.ts` 내 `getComputedStats` 함수
* **무엇을 사용하고 바꿀까?**:
  * 기존의 스탯 합산 로직을 **[고정치 합산 ➡️ 백분율 곱연산]** 순서의 2단계 연산 파이프라인으로 전환합니다.
* **어떻게 반영할까?**:
  * 스킬 노드가 활성화될 때마다 고정 스탯 보너스와 백분율 보너스를 각각 누적 수집한 뒤 아래 공식으로 연산합니다.
    $$\text{최종 스탯} = (\text{순수 기본 스탯} + \text{스킬 고정 합산}) \times (1 + \text{스킬 백분율 합산})$$
  ```typescript
  // gameStore.ts 의 getComputedStats 리팩토링 설계
  export const getComputedStats = (stats: Stats, unlockedSkills: string[], activeBuffs: Record<string, number> = {}) => {
    let baseStr = stats.str;
    let baseDex = stats.dex;
    let baseCon = stats.con;
    
    let percentStr = 0;
    let percentDex = 0;
    let percentCon = 0;
    
    let comboChance = 0;
    let comboMultiplier = 1.0;

    // 1) 잠금 해제된 노드를 돌며 고정 합산과 백분율 보너스 분리 수집
    unlockedSkills.forEach(skillId => {
      const skill = SKILL_TREE_DATA[skillId];
      if (skill?.effects) {
        if (skill.effects.str) baseStr += skill.effects.str;
        if (skill.effects.strPercent) percentStr += skill.effects.strPercent;
        
        // 연격 관련 유틸리티 수집
        if (skill.effects.comboChance) comboChance += skill.effects.comboChance;
        if (skill.effects.comboMultiplier) comboMultiplier += skill.effects.comboMultiplier;
      }
    });

    // 2) 최종 스탯 계산 (고정 합산 후 백분율 일괄 곱연산)
    const finalStr = Math.floor(baseStr * (1 + percentStr));
    const finalDex = Math.floor(baseDex * (1 + percentDex));
    const finalCon = Math.floor(baseCon * (1 + percentCon));

    // 3) 공격력, 방어력, 체력 변환 공식 적용
    let attack = 20 + (finalStr * 2);
    let defense = 5 + (finalCon * 0.2);
    let maxHealth = 100 + (finalCon * 5);

    return {
      attack,
      defense,
      maxHealth,
      attackSpeed: 2.0, // 공속은 완벽 고정
      accuracy: finalDex,
      evasion: finalDex,
      comboChance,     // 전투 엔진에 전달할 스펙
      comboMultiplier
    };
  };
  ```

---

### 3단계. 전투 엔진에 연격(Multi-Hit) 확률 루프 이식
* **무엇부터 수정할까?**: `src/store/gameStore.ts` 내 `attackEnemy` 및 `attackPlayer` 액션
* **무엇을 사용하고 바꿀까?**:
  * 공격 속도(ASPD)를 건드려 딜레이를 바꾸는 로직을 완전히 제거합니다.
  * 타격 처리부에서 `Math.random() < comboChance` 주사위를 굴려 **다단 히트**가 터지게 연출하고, 데미지 상태 객체를 업데이트합니다.
* **어떻게 반영할까?**:
  * 연격이 발동했을 경우, 단타 데미지가 아닌 콤보 데미지가 합산되어 적의 체력/실드를 깎습니다.
  * 데미지 수치 팝업 및 연출(`AnimatedBattleScreen.tsx`)에 "COMBO!" 혹은 다중 텍스트 팝업이 부드럽게 출력되도록 전투 결과 데이터 구조를 정밀 확장합니다.

---

### 4단계. 드래그/줌인 아웃이 가능한 500개 노드 전용 캔버스 구축
* **무엇부터 수정할까?**: `src/components/SkillTreeScreen.tsx`
* **무엇을 사용하고 바꿀까?**:
  * 기존의 단순 1:1 좌표 출력 SVG를 드래그 캔버스로 전면 리팩토링합니다.
  * `framer-motion`의 `<motion.div drag />` 속성을 활용해 캔버스 자유 이동을 제어합니다.
* **어떻게 반영할까?**:
  * **마우스 드래그 및 마우스 휠**로 좌표계를 탐험할 수 있는 오프셋 상태(`translateX`, `translateY`, `scale`)를 관리합니다.
  * **컬링 필터**를 컴포넌트 렌더링 루프 입구에 설치하여, 현재 화면 크기 대비 과하게 벗어난 좌표에 위치한 400여 개의 미세 노드들은 SVG 돔(`DOM`) 트리 생성에서 즉시 생략해 렉을 미연에 방지합니다.

---

### 5단계. 500개 대형 패시브 노드 데이터 마이그레이션 및 세부 튜닝
* **무엇부터 수정할까?**: `src/constants/skills.ts`
* **무엇을 사용하고 바꿀까?**:
  * 기존의 수십 개 정적 노드 데이터를 총 5개 루트(코어 4종 + 유틸 1종)별 100개씩 총 500개에 이르는 체계적인 데이터 리스트로 점진 마이그레이션합니다.
* **어떻게 반영할까?**:
  * `core_origin` (가운데 좌표 0,0)을 기점으로, 사방(동서남북 및 대각선)으로 $X, Y$ 좌표 가산치를 주어 거대한 별자리 은하수 같은 방사형 그래프 좌표를 수학적으로 자동 제너레이션하여 상수로 주입해 줍니다.
  * 1티어 노드의 비용은 1 RP에서 최종 10티어의 경우 15만 RP까지 설정하여 기획에 기술된 타임라인을 정교하게 코딩합니다.

---

## ⚠️ 대규모 시스템 안정성을 위한 예방 설계 명세 (Critical Guards)

실제 프로덕션 배포 시 발생할 수 있는 데이터 손상 및 클라이언트 지연 현상을 완벽히 방어하기 위해 반드시 지켜야 할 4대 핵심 예방 가이드라인입니다.

### ① 연격(Multi-Hit) 시 데미지 팝업 렉 방지
* **리스크**: 기존 1:1 단타 방식과 달리, 10~20연격이 한 번에 발동되면 순간적으로 수십 개의 DOM 노드가 동시 생성/소멸하여 모바일 브라우저에서 치명적인 가비지 컬렉션(GC) 렉을 유발합니다.
* **해결 지침**: 다단 연격 발생 시 개별 팝업을 수십 개 띄우지 않고, **"단일 팝업 하나에서 데미지 수치가 카운트업 되거나, 콤보 최종 합산 데미지 1개만 크게 터트리는 연출"** 방식으로 UI 렌더링 방식을 단순화합니다.

### ② 모바일 9:16 가독성 및 클릭 영역 확보
* **리스크**: 모바일 종횡비에서 500개 노드를 드래그/축소하면 텍스트 뭉개짐 현상으로 가독성이 훼손되며 정확한 터치가 불가능해집니다.
* **해결 지침**:
  * 노드의 터치 히트박스(Hitbox)는 투명한 큰 원(최소 24px)으로 감싸서 터치 미스를 완벽 방지합니다.
  * **텍스트 LOD(Level of Detail)**를 적용하여 캔버스 줌 비율이 일정 이하(예: `scale < 0.6`)로 낮아지면 텍스트를 자동으로 숨기고 직관적인 별자리 문양만 렌더링합니다.

### ③ 로컬 스토리지(Local Storage) 데이터 터짐 방지
* **리스크**: 이 게임은 Zustand 스토어 상태를 통째로 로컬 스토리지에 자동 보존합니다. 만약 500개 스킬 트리의 상세 속성 데이터(이름, 설명, 연결 경로 등)가 스토어 State에 통째로 들어가면 용량 한계(5MB)를 초과하여 세이브 데이터가 영구 손상됩니다.
* **해결 지침**: 500개 스킬 노드의 상세 스펙(스태틱 데이터)은 **오직 정적 상수 파일(`src/constants/skills.ts`)로만 관리**해야 하며, Zustand Store에는 오직 해금된 노드의 간단한 식별자 리스트인 **`unlockedSkills: string[]`**만 들고 있어야 합니다.

### ④ 스킬 트리 일괄 초기화 시 무결성 가드
* **리스크**: 수백 개 노드가 찍힌 후반 유저가 스킬 트리를 리셋할 때, 환불받는 RP가 수십만에 달하며 스토어의 환산 로직과 스탯 복원 과정에서 동시 클릭이나 프레임 끊김으로 수치 누수가 발생할 수 있습니다.
* **해결 지침**: 스킬 일괄 초기화(Reset) 액션 시 즉시 상호작용 잠금(Lock)을 걸고, `unlockedSkills` 배열을 한 프레임만에 `['core_origin']`으로 동기적 합산 및 초기화를 보증하여 수치 무결성을 수호합니다.
