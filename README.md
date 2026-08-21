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
   - 캐릭터 3대 스탯(STR, DEX, CON), 4가지 속성 코어(불, 물, 바람, 번개), 환생 영구 업그레이드(14종), 전투 메커니즘, PvP 아레나 및 화면 흐름 명세.
2. **[DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)** (개발 마일스톤)
   - 단계별 핵심 기능 개발 프로세스 및 완료 목록 현황판.
3. **[SOURCE_MAP.md](./SOURCE_MAP.md)** (소스 파일 맵)
   - 전역 스토어, UI 컴포넌트, 상수, 타입 등의 역할 정의 일람표.

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

