# 📦 BoxSlayer - 방치형 1:1 박스 배틀 RPG

단순한 박스 형태의 캐릭터를 스탯과 속성 코어를 조합해 성장시켜 다양한 적들을 물리치는 웹 기반 1:1 방치형 배틀 게임입니다.

## 🛠️ 기술 스택
- **Frontend**: React (v19), TypeScript, Tailwind CSS
- **State Management**: Zustand
- **Animation**: Framer Motion
- **Build Tool**: Vite

---

## 📖 핵심 문서 및 명세서

프로젝트의 상세 설계 및 개발 로드맵을 확인하려면 아래 문서를 참고하십시오.

1. **[GAME_DESIGN.md](./GAME_DESIGN.md)** (게임 기획 문서)
   - 캐릭터 3대 스탯, 4가지 속성 코어(불, 물, 바람, 번개), 전투 메커니즘, 패배 체크포인트 및 화면 흐름 명세.
2. **[DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)** (개발 마일스톤)
   - 단계별 핵심 기능 개발 프로세스 및 완료 목록 현황판.
3. **[SOURCE_MAP.md](./SOURCE_MAP.md)** (소스 파일 맵)
   - 전역 스토어, UI 컴포넌트, 상수, 타입 등의 역할 정의 일람표.
4. **[SKILL_TREE_BALANCING_PLAN.md](./SKILL_TREE_BALANCING_PLAN.md) (🔥 구현 지향 대형 스킬 트리 및 장기 밸런싱 로드맵)**
   - **[구현 목표]** 장기 서비스(6개월 이상)를 지향하는 500개 대규모 스킬 트리 아키텍처 및 연격(Multi-Hit) 시스템 설계서.
   - 초반 고정 스탯(Flat)에서 후반 백분율(%)로 전환되는 밸런스 공식과 지수함수적 RP 비용 타임라인 수학적 검증 수록.

---

## 🚀 시작하기

### 개발 서버 실행
```bash
npm install
npm run dev
```

### 배포 빌드
```bash
npm run build
```
