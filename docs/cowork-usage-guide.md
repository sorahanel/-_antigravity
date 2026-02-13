# Claude Cowork 사용 가이드

> Claude Desktop에서 코딩 없이 AI 에이전트를 활용하는 방법

---

## 1. Cowork란?

Cowork는 Anthropic이 2026년 1월 12일에 리서치 프리뷰로 출시한 기능으로, **Claude Code의 에이전틱 아키텍처를 Claude Desktop에 가져온 것**입니다.

기존 Claude 채팅이 "질문-답변" 방식이었다면, Cowork는 **복잡한 멀티스텝 작업을 자율적으로 수행**하는 AI 코워커 역할을 합니다.

### Chat vs Cowork vs Claude Code

| 구분 | Chat | Cowork | Claude Code |
|------|------|--------|-------------|
| 용도 | 질문/답변, 브레인스토밍 | 파일 작업, 문서 정리, 리서치 | 소프트웨어 개발 |
| 파일 접근 | X | O (지정 폴더) | O (프로젝트 전체) |
| 자율 실행 | X | O | O |
| 인터페이스 | Desktop/Web | Desktop 전용 | CLI (터미널) |

**핵심 원칙**: Chat은 생각용, Cowork는 실행용, Claude Code는 개발용

---

## 2. 시작하기

### 사전 요구사항

- **Claude 유료 구독**: Pro($20/월), Max, Team, 또는 Enterprise 플랜
- **Claude Desktop 앱**: [claude.com/download](https://claude.com/download)에서 다운로드
- macOS 또는 Windows 지원

### 최초 설정

1. Claude Desktop 앱을 열기
2. 상단 토글에서 **"Cowork"** 클릭
3. Claude에게 접근 권한을 줄 **폴더 선택**
4. 첫 번째 작업 설명 입력

```
예시: "Downloads 폴더를 파일 유형별로 정리해줘"
```

---

## 3. 핵심 기능

### 3.1 파일 접근 및 관리

Cowork는 지정한 폴더 내의 파일을 **읽기, 편집, 생성**할 수 있습니다.

```
가능한 작업 예시:
- "이 폴더의 CSV 파일들을 하나의 엑셀로 합쳐줘"
- "회의록 폴더에서 이번 달 내용만 요약해줘"
- "영수증 사진들로 경비 보고서 만들어줘"
```

### 3.2 커넥터 (Connectors)

커넥터는 Claude를 외부 서비스에 연결하는 기능입니다. **MCP(Model Context Protocol)** 기반으로 동작합니다.

| 카테고리 | 연결 가능 서비스 |
|----------|-----------------|
| 커뮤니케이션 | Slack |
| 생산성 | Notion, Asana, Linear, Jira, Monday, ClickUp |
| 오피스 | Microsoft 365 |
| 스토리지 | Box, Egnyte |
| 고객관리 | HubSpot, Intercom |
| 지식관리 | Guru |

### 3.3 브라우저 통합

Chrome 커넥터를 활성화하면, Claude가 **브라우저에서 직접 웹 기반 워크플로우**를 수행할 수 있습니다.

---

## 4. 플러그인 시스템

2026년 1월 30일에 추가된 플러그인 시스템은 Cowork의 핵심 확장 기능입니다.

### 4.1 플러그인 구성 요소

| 구성 요소 | 설명 | 예시 |
|-----------|------|------|
| **Skills** | 도메인 지식과 워크플로우 절차 | 리드 조사 프로세스 |
| **Commands** | 슬래시 명령어로 실행하는 특정 작업 | `/sales:prep-call` |
| **Connectors** | MCP 기반 외부 도구 연결 | CRM, 프로젝트 관리 도구 |

### 4.2 공식 플러그인 11종

Anthropic이 공식 제공하는 오픈소스 플러그인:

1. **Sales** - 영업 리드 관리, 콜 준비
2. **Legal** - 계약서 검토, 컴플라이언스
3. **Finance** - 재무 분석, 보고서 생성
4. **Marketing** - 캠페인 기획, 콘텐츠 전략
5. **Support** - 고객 지원 워크플로우
6. **Product** - 제품 관리, 로드맵
7. **Data Analysis** - 데이터 분석 및 시각화
8. **Enterprise Search** - 사내 정보 검색
9. **Research** - 리서치 및 분석
10. **Productivity** - 생산성 도구 통합
11. **Plugin Create** - 커스텀 플러그인 생성 도구

> 모든 공식 플러그인은 [GitHub](https://github.com/anthropics/knowledge-work-plugins)에서 오픈소스로 제공됩니다.

### 4.3 플러그인 설치 방법

**방법 1: 앱 내 설치**
1. Cowork 탭 진입
2. 좌측 사이드바에서 "Plugins" 클릭
3. 원하는 플러그인 선택 후 설치

**방법 2: 터미널 설치**
```bash
claude plugins add knowledge-work-plugins/sales
```

**방법 3: GitHub에서 직접**
```bash
git clone https://github.com/anthropics/knowledge-work-plugins
# 원하는 플러그인 폴더를 직접 설정
```

### 4.4 플러그인 커스터마이징

설치 후 3가지 방식으로 커스터마이징 가능:

1. **커넥터 교체**: 기본 CRM(예: HubSpot)을 자사 시스템으로 교체 (`.mcp.json` 편집)
2. **회사 컨텍스트 추가**: 내부 용어, 프로세스, 조직 구조를 스킬 파일에 추가
3. **워크플로우 수정**: 자사 실제 업무 흐름에 맞게 태스크 로직 변경

---

## 5. 효과적인 사용법

### 좋은 프롬프트 작성법

```
나쁜 예시:
"이거 정리해줘."

좋은 예시:
"Downloads 폴더의 파일을 유형별(이미지, 문서, 스프레드시트)로
분류해줘. 각 유형별 하위 폴더를 만들고, 파일명에 날짜와
간단한 설명을 포함해서 이름을 변경해줘. 아무것도 삭제하지 마."
```

### 작업 흐름 팁

1. **구체적인 결과물을 설명**: 원하는 최종 형태를 명확히
2. **작업 범위를 지정**: 어떤 폴더, 어떤 파일 유형
3. **제약 조건을 명시**: "삭제하지 마", "원본 보존" 등
4. **계획 확인하기**: Claude가 실행 전 보여주는 계획을 반드시 검토

### 실전 활용 사례

| 작업 | 프롬프트 예시 |
|------|-------------|
| 파일 정리 | "Downloads 폴더를 유형별, 날짜별로 정리해줘" |
| 경비 처리 | "receipts 폴더의 영수증으로 경비 보고서 만들어줘" |
| 리서치 | "notes 폴더의 메모를 읽고 보고서 초안을 작성해줘" |
| 데이터 분석 | "이 CSV 파일의 매출 데이터를 분석하고 트렌드를 요약해줘" |
| 문서 작성 | "프로젝트 폴더의 내용을 기반으로 제안서 초안을 작성해줘" |
| 이메일 초안 | "이 미팅 노트를 바탕으로 후속 이메일 초안을 작성해줘" |

---

## 6. 주의사항 및 제한 사항

### 현재 제한 사항

- 이전 세션의 **기억(Memory)을 유지하지 않음**
- 세션을 **다른 사용자와 공유할 수 없음**
- Desktop 앱에서만 사용 가능 (기기 간 동기화 불가)
- 앱을 **닫으면 세션이 종료**됨
- 복잡한 멀티스텝 작업은 일반 채팅보다 **사용량(quota)을 더 많이 소모**

### 안전한 사용을 위한 권장사항

1. **파일 작업 전 반드시 백업**을 해두기
2. Claude가 제시하는 **계획을 항상 확인** 후 진행
3. 규제 대상 업무(regulated workloads)에는 **사용을 권장하지 않음** (리서치 프리뷰 단계)
4. 민감한 정보가 포함된 폴더는 접근 권한에서 제외

---

## 7. kt cloud AI Foundry와 함께 사용하기

이 레포지토리의 에이전트 및 스킬과 유사하게, Cowork 플러그인도 **영업 파이프라인 관리**와 **경쟁 분석**에 활용할 수 있습니다.

### 연계 시나리오

```
1. Cowork의 Sales 플러그인으로 리드 관리
2. Data Analysis 플러그인으로 CSV 데이터 분석
3. Research 플러그인으로 CSP 경쟁사 동향 조사
4. 결과물을 kt cloud AI Foundry 프로젝트에 반영
```

### 커스텀 플러그인 구축

이 레포지토리의 `.claude/` 디렉토리에 있는 에이전트/스킬 구조를 참고하여, Cowork용 커스텀 플러그인을 만들 수 있습니다:

```
my-kt-plugin/
├── PLUGIN.md          # 플러그인 메타데이터
├── skills/
│   ├── lead-manager/
│   │   └── SKILL.md   # 영업 리드 관리 스킬
│   └── csp-analyzer/
│       └── SKILL.md   # CSP 경쟁 분석 스킬
├── commands/
│   └── COMMANDS.md     # 슬래시 명령어 정의
└── .mcp.json           # 커넥터 설정
```

---

## 참고 자료

- [Anthropic 공식 Cowork 소개](https://claude.com/blog/cowork-research-preview)
- [Cowork 시작 가이드 (Help Center)](https://support.claude.com/en/articles/13345190-getting-started-with-cowork)
- [Cowork 플러그인 공식 블로그](https://claude.com/blog/cowork-plugins)
- [공식 플러그인 GitHub](https://github.com/anthropics/knowledge-work-plugins)
- [Cowork 안전 사용 가이드](https://support.claude.com/en/articles/13364135-using-cowork-safely)
- [Cowork 제품 페이지](https://claude.com/product/cowork)
