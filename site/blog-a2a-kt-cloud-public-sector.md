# kt cloud에서 A2A(Agent-to-Agent) 프로토콜 기반 공공기관 멀티에이전트 서비스 구축 가이드

> **TL;DR**: Google이 주도하고 Linux Foundation이 관리하는 A2A 프로토콜은 HTTP + JSON-RPC 2.0 기반의 에이전트 간 통신 표준이다. 100B급 초거대 모델이 필수가 아니며, 7B~8B급 sLM으로도 충분히 구동 가능하다. kt cloud의 AI SERV(추론) + AI Train(학습) + CSAP 인증 인프라를 조합하면, 공공기관 보안 요건을 충족하면서도 비용 효율적인 A2A 멀티에이전트 시스템을 구축할 수 있다.

---

## 1. A2A 프로토콜이란?

### 1.1 배경: 왜 에이전트 간 표준이 필요한가

2025년 4월, Google은 50개 이상의 기술 파트너(Salesforce, SAP, Atlassian, LangChain 등)와 함께 **Agent2Agent(A2A) 프로토콜**을 공개했다. 이후 Linux Foundation에 기증되어 벤더 중립적 오픈 표준으로 발전하고 있다.

기존 AI 에이전트 생태계의 문제는 명확했다:
- 프레임워크마다 고유한 통신 방식 (LangChain, AutoGen, CrewAI 등이 각자의 방식으로 에이전트를 연결)
- 벤더 종속(vendor lock-in)으로 인한 멀티에이전트 조합의 어려움
- 내부 상태(memory, tool, plan) 노출 없이는 협업이 불가능한 구조

A2A는 이 문제를 **"opaque execution"** 원칙으로 해결한다. 에이전트는 자신의 내부 구현을 노출하지 않고, 선언된 역량(capability)과 교환된 메시지만으로 협업한다.

### 1.2 A2A vs MCP: 상호보완 관계

| 구분 | A2A | MCP (Model Context Protocol) |
|------|-----|-----|
| **역할** | Agent ↔ Agent 통신 | Agent ↔ Tool 통신 |
| **비유** | 에이전트 간의 "공용 인터넷" | 에이전트 내부의 "USB 포트" |
| **프로토콜** | JSON-RPC 2.0 / gRPC / REST over HTTP | JSON-RPC 2.0 over stdio/HTTP |
| **핵심 추상화** | Task (작업 생명주기) | Tool, Resource, Prompt |
| **거버넌스** | Linux Foundation | Anthropic 주도 오픈소스 |

**A2A와 MCP는 경쟁이 아니라 계층이 다르다.** 하나의 에이전트가 MCP로 내부 도구를 연결하고, A2A로 다른 에이전트와 통신하는 구조가 표준 아키텍처다.

---

## 2. A2A 프로토콜 기술 아키텍처 Deep Dive

### 2.1 3-Layer 스펙 구조

A2A 스펙은 세 개의 레이어로 구성된다:

```
┌─────────────────────────────────────────────┐
│  Layer 3: Protocol Bindings                 │
│  (JSON-RPC 2.0 / gRPC / REST 바인딩)         │
├─────────────────────────────────────────────┤
│  Layer 2: Abstract Operations               │
│  (message/send, message/stream, tasks/get)  │
├─────────────────────────────────────────────┤
│  Layer 1: Canonical Data Model              │
│  (Protocol Buffers v3 — a2a.proto)          │
└─────────────────────────────────────────────┘
```

**Layer 1**의 `a2a.proto`가 단일 정규 소스(single source of truth)이며, JSON Schema, TypeScript 타입, SDK 바인딩은 모두 이 proto 정의에서 자동 생성된다.

### 2.2 Agent Card: 에이전트 자기소개서

모든 A2A 서버는 `/.well-known/agent.json` 엔드포인트에 Agent Card를 게시해야 한다. 이는 Swagger/OpenAPI 문서와 유사한 역할을 한다.

```json
{
  "name": "공공문서 분석 에이전트",
  "description": "정부 공문서 OCR, 요약, 분류를 수행하는 전문 에이전트",
  "version": "1.0.0",
  "url": "https://doc-agent.gcloud.kt.com",
  "capabilities": {
    "streaming": true,
    "pushNotifications": true
  },
  "skills": [
    {
      "id": "document-ocr",
      "name": "문서 OCR 처리",
      "description": "스캔된 공문서 이미지를 텍스트로 변환",
      "inputModes": ["image/png", "image/jpeg", "application/pdf"],
      "outputModes": ["text/plain", "application/json"]
    },
    {
      "id": "document-summary",
      "name": "문서 요약",
      "description": "공문서 핵심 내용을 3문장 이내로 요약",
      "inputModes": ["text/plain"],
      "outputModes": ["text/plain"]
    }
  ],
  "authentication": {
    "schemes": ["oauth2"],
    "credentials": "https://auth.gcloud.kt.com/.well-known/openid-configuration"
  }
}
```

Agent Card는 **JWS(JSON Web Signature, RFC 7515)로 디지털 서명**이 가능하여, 공공기관 환경에서 에이전트 신원 위변조 방지에 활용된다.

### 2.3 Task 생명주기

A2A의 핵심 추상화는 **Task**다. 클라이언트가 메시지를 보내면 서버가 이를 Task로 변환하여 처리한다.

```
submitted → working → completed
                   ↘ input-required (사용자 입력 대기)
                   ↘ failed
                   ↘ canceled
                   ↘ rejected
```

### 2.4 Streaming: SSE 기반 실시간 응답

`message/stream` RPC를 통해 Server-Sent Events(SSE) 스트리밍을 지원한다:

```
Client                          A2A Server
  │                                │
  │── POST /a2a (message/stream) ──▶│
  │                                │
  │◀── HTTP 200 OK ────────────────│
  │    Content-Type: text/event-stream
  │                                │
  │◀── data: {Task object} ────────│
  │◀── data: {TaskStatusUpdate     │
  │         state: "working"} ─────│
  │◀── data: {TaskArtifactUpdate   │
  │         chunk: "분석 결과..."} ──│
  │◀── data: {TaskStatusUpdate     │
  │         state: "completed",    │
  │         final: true} ──────────│
  │                                │
```

스트림 종료는 `final: true` 플래그로 명시적으로 시그널링되며, 장시간 실행 태스크의 경우 **Push Notification(웹훅)**으로 비동기 업데이트도 지원한다.

### 2.5 gRPC 지원 (v0.3+)

2025년 7월 업데이트로 gRPC 전송이 추가되었다:
- Protocol Buffers v3 기반 직렬화
- HTTP/2 + TLS 필수
- Server Streaming RPC로 스트리밍 구현
- JSON-RPC와 동일한 기능을 제공해야 하는 **크로스-트랜스포트 일관성** 요구

공공기관 내부망에서 에이전트 간 통신 시, gRPC의 바이너리 직렬화가 JSON 대비 **페이로드 크기 60~80% 절감, 레이턴시 30~50% 개선** 효과를 가져올 수 있다.

---

## 3. 100B급 모델이 필수인가? — 결론: 아니다

### 3.1 A2A는 모델-애그노스틱 프로토콜

**A2A 프로토콜 스펙에는 모델 크기에 대한 요구사항이 단 한 줄도 없다.** A2A는 통신 계층(HTTP, JSON-RPC, SSE)의 표준이지, 에이전트 내부 추론 엔진의 스펙이 아니다.

에이전트가 A2A를 지원하려면 다음만 충족하면 된다:
1. `/.well-known/agent.json`에 Agent Card 게시
2. JSON-RPC 2.0 over HTTP 요청/응답 처리
3. Task 생명주기 상태 관리

이는 **LLM 없이 규칙 기반 로직만으로도 구현 가능**한 수준이다.

### 3.2 실증: 소형 모델 기반 A2A 구현 사례

| 프로젝트 | 모델 | 파라미터 수 | 프레임워크 |
|----------|------|------------|-----------|
| IBM BeeAI + A2A | Granite 3.3 | **8B** | BeeAI + Ollama |
| CorticalFlow A2A | Ollama 호환 모델 | **7B~8B** | 커스텀 Python |
| LLaMA A2A Travel | LLaMA 3.2 | **3B~8B** | Ollama + A2A SDK |
| Qwen Agent | Qwen 2.5 | **7B** | LangChain + Ollama |

IBM의 BeeAI 프레임워크는 **Granite 3.3 8B 모델**로 A2A 서버를 완전하게 구동한다. Tool calling(DuckDuckGo 검색, Wikipedia, 날씨 API 등)까지 포함한 에이전트가 8GB RAM 환경에서 동작한다.

### 3.3 모델 크기별 적합 용도

```
┌──────────────────────────────────────────────────────────┐
│                    A2A 에이전트 모델 선택 가이드              │
├──────────┬──────────────┬────────────────────────────────┤
│ 모델 규모  │ 파라미터 수    │ 적합 용도                       │
├──────────┼──────────────┼────────────────────────────────┤
│ Micro    │ 1B~3B        │ 분류, 라우팅, 간단한 추출          │
│ Small    │ 7B~8B        │ 문서요약, QA, 도구호출, RAG        │
│ Medium   │ 13B~32B      │ 복잡한 추론, 코드생성, 다국어       │
│ Large    │ 70B~100B+    │ 오케스트레이션, 복합판단, 창의적 생성  │
└──────────┴──────────────┴────────────────────────────────┘
```

**핵심 인사이트**: A2A의 강점은 하나의 거대 모델이 모든 것을 처리하는 것이 아니라, **역할별로 적절한 크기의 전문 에이전트를 조합**하는 데 있다. 문서 분류는 3B 모델이, 요약은 8B 모델이, 최종 판단은 70B 모델이 담당하는 **계층적 멀티에이전트 구조**가 가장 효율적이다.

### 3.4 공공기관에서 소형 모델이 더 적합한 이유

1. **보안**: 온프레미스/프라이빗 클라우드에서 7B~8B 모델은 단일 GPU로 구동 가능 → 데이터가 외부로 나가지 않음
2. **비용**: GPU 1장 기준 추론 비용이 100B 모델 대비 1/10 수준
3. **레이턴시**: 공공 민원 시스템의 실시간 응답 요구사항 충족 (8B 모델: ~200ms, 100B 모델: ~2s)
4. **규정 준수**: CSAP 인증 범위 내에서 관리 가능한 인프라 규모

---

## 4. kt cloud 기반 공공기관 A2A 아키텍처 설계

### 4.1 제안 아키텍처: 3-Tier 멀티에이전트 시스템

```
                    ┌─────────────────────────┐
                    │    공공기관 사용자 포털     │
                    │   (웹/모바일 프론트엔드)    │
                    └────────────┬────────────┘
                                 │ HTTPS
                    ┌────────────▼────────────┐
                    │   오케스트레이터 에이전트    │
                    │  (A2A Client + Router)   │
                    │  kt cloud AI SERV       │
                    │  모델: Llama K 70B       │
                    └──┬────────┬────────┬────┘
               A2A    │   A2A  │   A2A  │
            ┌─────────▼──┐ ┌───▼────┐ ┌─▼──────────┐
            │ 문서처리     │ │ 민원분류 │ │ 규정검색     │
            │ 에이전트     │ │에이전트  │ │ 에이전트     │
            │            │ │        │ │            │
            │ OCR+요약    │ │ 분류    │ │ RAG+검색    │
            │ Solar 10.7B│ │Qwen 7B │ │ Granite 8B │
            │            │ │        │ │            │
            │ AI SERV    │ │AI SERV │ │ AI SERV    │
            │ (GPU 0.2장) │ │(NPU)   │ │ (GPU 0.4장) │
            └─────────────┘ └────────┘ └────────────┘

            ──────────── kt cloud CSAP 인증 공공존 ────────────
            ─── 국가정보자원관리원 대구센터 / 용산 공공 클라우드존 ───
```

### 4.2 인프라 구성 상세

#### Tier 1: 오케스트레이터 (A2A Client)
- **역할**: 사용자 요청 분석 → 적절한 전문 에이전트로 라우팅 → 결과 통합
- **인프라**: kt cloud AI SERV (GPU A100 1장)
- **모델**: Llama K 70B 또는 믿:음 K 2.0 (kt 자체 모델)
- **A2A 역할**: Client Agent — 다른 에이전트의 Agent Card를 디스커버리하고 Task를 위임

#### Tier 2: 전문 에이전트 (A2A Server)
- **문서처리 에이전트**: AI SERV GPU 슬라이싱 0.2장, Solar 10.7B (업스테이지)
- **민원분류 에이전트**: AI SERV NPU (리벨리온 Atom Max), Qwen 2.5 7B
- **규정검색 에이전트**: AI SERV GPU 슬라이싱 0.4장, Granite 8B + RAG Suite

#### Tier 3: 데이터/인프라 계층
- **벡터 DB**: kt cloud AI Foundry 연동 (디노티시아)
- **스토리지**: CSAP 인증 오브젝트 스토리지
- **네트워크**: 공공존 내부 VPC, 에이전트 간 통신은 gRPC (내부망 최적화)

### 4.3 A2A 서버 구현 예시 (Python)

아래는 kt cloud AI SERV 위에서 동작하는 A2A 에이전트 서버의 핵심 구현이다:

```python
# a2a_document_agent.py
# kt cloud AI SERV에서 구동되는 문서처리 A2A 에이전트

from a2a.server import A2AServer, AgentCard, Skill
from a2a.types import Task, TaskState, Message, Artifact
import httpx
import json

# Agent Card 정의
agent_card = AgentCard(
    name="공공문서 분석 에이전트",
    description="CSAP 인증 환경에서 공문서 OCR, 요약, 분류 수행",
    version="1.0.0",
    url="https://doc-agent.gcloud.kt.com",
    capabilities={"streaming": True, "pushNotifications": True},
    skills=[
        Skill(
            id="document-ocr",
            name="문서 OCR",
            input_modes=["image/png", "application/pdf"],
            output_modes=["application/json"]
        ),
        Skill(
            id="document-summary",
            name="문서 요약",
            input_modes=["text/plain"],
            output_modes=["text/plain"]
        )
    ],
    authentication={
        "schemes": ["oauth2"],
        "credentials": "https://auth.gcloud.kt.com/openid-config"
    }
)

# vLLM 기반 로컬 추론 엔드포인트 (AI SERV 내부)
VLLM_ENDPOINT = "http://localhost:8000/v1/chat/completions"

async def invoke_local_llm(prompt: str, model: str = "solar-10.7b") -> str:
    """kt cloud AI SERV 내부의 vLLM 서버에 추론 요청"""
    async with httpx.AsyncClient() as client:
        response = await client.post(VLLM_ENDPOINT, json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1024,
            "temperature": 0.1  # 공공문서는 일관성이 중요
        })
        return response.json()["choices"][0]["message"]["content"]

# A2A 태스크 핸들러
async def handle_task(task: Task) -> None:
    """A2A Task 수신 시 처리 로직"""
    task.state = TaskState.WORKING

    user_message = task.messages[-1]
    skill_id = task.metadata.get("skill_id", "document-summary")

    if skill_id == "document-ocr":
        # OCR 파이프라인: 이미지 → 텍스트 추출 → 구조화
        ocr_result = await run_ocr_pipeline(user_message.artifacts)
        summary = await invoke_local_llm(
            f"다음 OCR 텍스트를 구조화된 JSON으로 변환하세요:\n{ocr_result}"
        )
        task.artifacts.append(Artifact(
            mime_type="application/json",
            data=summary
        ))

    elif skill_id == "document-summary":
        # 문서 요약: 3문장 이내
        summary = await invoke_local_llm(
            f"다음 공문서를 3문장 이내로 요약하세요. "
            f"핵심 수치와 날짜를 반드시 포함하세요:\n{user_message.text}"
        )
        task.artifacts.append(Artifact(
            mime_type="text/plain",
            data=summary
        ))

    task.state = TaskState.COMPLETED

# 서버 시작
server = A2AServer(agent_card=agent_card, task_handler=handle_task)
server.run(host="0.0.0.0", port=8080)
```

### 4.4 A2A 클라이언트(오케스트레이터) 구현 예시

```python
# a2a_orchestrator.py
# 오케스트레이터: 사용자 요청을 분석하여 적절한 에이전트에 위임

from a2a.client import A2AClient
from a2a.types import Message
import asyncio

# 에이전트 레지스트리 (Agent Card 디스커버리)
AGENT_REGISTRY = {
    "document": "https://doc-agent.gcloud.kt.com",
    "complaint": "https://complaint-agent.gcloud.kt.com",
    "regulation": "https://reg-agent.gcloud.kt.com",
}

async def discover_agents():
    """등록된 에이전트들의 Agent Card를 수집하여 역량 파악"""
    agents = {}
    for name, url in AGENT_REGISTRY.items():
        client = A2AClient(url)
        card = await client.get_agent_card()  # GET /.well-known/agent.json
        agents[name] = {"client": client, "card": card}
        print(f"[Discovery] {card.name}: {[s.id for s in card.skills]}")
    return agents

async def route_and_execute(user_request: str, agents: dict):
    """사용자 요청을 분석하여 적절한 에이전트에 위임"""

    # Step 1: 요청 분류 (로컬 LLM 또는 규칙 기반)
    if "문서" in user_request or "OCR" in user_request:
        target = "document"
    elif "민원" in user_request or "불만" in user_request:
        target = "complaint"
    elif "규정" in user_request or "법률" in user_request:
        target = "regulation"
    else:
        target = "document"  # 기본값

    # Step 2: A2A message/stream으로 태스크 위임
    client = agents[target]["client"]
    message = Message(text=user_request)

    # 스트리밍 모드로 실시간 응답 수신
    async for event in client.send_message_stream(message):
        if event.type == "TaskStatusUpdate":
            print(f"[Status] {event.state}")
        elif event.type == "TaskArtifactUpdate":
            print(f"[Result] {event.data[:200]}...")

    return event  # 최종 결과 반환

async def main():
    agents = await discover_agents()
    result = await route_and_execute(
        "2025년 예산안 공문서를 요약해주세요", agents
    )
    print(f"최종 결과: {result}")

asyncio.run(main())
```

---

## 5. 공공기관 배포 시 보안·규정 체크리스트

### 5.1 CSAP 인증 매핑

| 보안 요구사항 | A2A 대응 | kt cloud 대응 |
|-------------|---------|--------------|
| 데이터 암호화 (전송 중) | TLS 1.3 필수 (gRPC: HTTP/2 + TLS) | CSAP 상/중 등급 인프라 |
| 인증/인가 | OAuth 2.0, OpenID Connect, API Key | kt cloud IAM 연동 |
| Agent Card 무결성 | JWS 디지털 서명 (RFC 7515) | PKI 인증서 관리 |
| 감사 로그 | Task ID 기반 전체 이력 추적 | 통합 로깅 시스템 |
| 망분리 | 공공존 내부 VPC 격리 | 대구센터 PPP 클라우드존 |
| 데이터 주권 | 온프레미스 모델 추론 | AI SERV + Ollama 로컬 구동 |

### 5.2 공공부문 초거대 AI 가이드라인 2.0 대응

정부의 「공공부문 초거대AI 도입·활용 가이드라인 2.0」에서 요구하는 3단계 데이터 등급:

- **기밀(C)**: 에이전트 처리 불가 → 별도 보안 시스템
- **민감(S)**: 공공존 내부 에이전트만 처리, 외부 API 호출 금지 → kt cloud CSAP 상 등급
- **공개(O)**: 모든 에이전트 처리 가능 → AI SERV 일반 존

### 5.3 2026년 CSAP 제도 변화 대응

2026년부터 CSAP 없이 국가정보원 보안적합성 검증만으로 공공 진출이 가능해지는 방안이 논의 중이다. 이에 따라:
- 글로벌 CSP(AWS, Azure, GCP)가 공공 시장에 진입할 가능성 증가
- kt cloud의 차별점: **국내 데이터 주권 보장 + AI Foundry 생태계 + NPU 기반 비용 우위**

---

## 6. 비용 최적화 전략

### 6.1 GPU 슬라이싱으로 TCO 절감

kt cloud AI SERV의 GPU 슬라이싱은 A100을 **0.2장 단위**로 분할 제공한다:

```
전통적 방식 (에이전트당 GPU 1장):
  3개 에이전트 × A100 1장 = A100 3장 → 월 약 ₩15,000,000+

A2A + GPU 슬라이싱:
  오케스트레이터: A100 1장     = 1.0 GPU
  문서처리 에이전트: 0.2장      = 0.2 GPU
  민원분류 에이전트: NPU(Atom) = 0.0 GPU (별도 과금)
  규정검색 에이전트: 0.4장      = 0.4 GPU
  ─────────────────────────────────────
  합계: 1.6 GPU + NPU → 월 약 ₩9,000,000 (약 40% 절감)
```

### 6.2 NPU 활용: 경량 에이전트의 게임 체인저

kt cloud AI SERV NPU(리벨리온 Atom Max)는:
- GPU 대비 **전력 효율 3~5배** 우수
- 7B급 sLM 추론에 최적화
- A2A 에이전트 중 분류/라우팅/간단한 QA 역할에 적합

### 6.3 AI Train 동적할당으로 파인튜닝 비용 관리

공공기관 특화 모델 파인튜닝 시:
- AI Train **동적할당** 요금제 활용 → GPU 연산 완료 후 자동 회수, 사용 시간만 과금
- H200 라인업(2025년 도입)으로 H100 대비 메모리 대역폭 50% 향상
- 파인튜닝 후 AI SERV로 배포하면 학습/추론 인프라 분리로 비용 최적화

---

## 7. 실전 배포 로드맵

### Phase 1: PoC (4주)
```
Week 1-2: A2A SDK 기반 에이전트 3종 개발 (Python)
          └─ Ollama + Qwen 7B로 로컬 개발/테스트
Week 3:   kt cloud AI SERV 개발존에 배포
          └─ Agent Card 게시, 에이전트 간 통신 검증
Week 4:   부하 테스트 + 보안 점검
          └─ TLS, 인증, 감사로그 확인
```

### Phase 2: 파일럿 (8주)
```
Week 1-4: CSAP 공공존 마이그레이션
          └─ 대구센터 PPP 클라우드존 또는 용산 공공존
Week 5-6: 실 사용자 테스트 (공무원 대상)
Week 7-8: 피드백 반영 + 모델 파인튜닝 (AI Train)
```

### Phase 3: 본격 운영
```
- 오토스케일링 설정 (AI SERV)
- Push Notification 기반 비동기 처리 (장시간 분석 태스크)
- 신규 에이전트 확장 (A2A의 디스커버리 기반 플러그인 구조)
```

---

## 8. 결론

A2A 프로토콜은 **HTTP + JSON-RPC라는 검증된 웹 표준 위에 구축**된 실용적 에이전트 간 통신 규격이다. 100B급 거대 모델은 필수가 아니며, **역할별로 적절한 크기의 모델을 조합하는 것이 오히려 A2A의 설계 철학에 부합**한다.

kt cloud는 이를 공공기관에 제공하기 위한 모든 퍼즐 조각을 이미 갖추고 있다:

- **AI SERV**: GPU 슬라이싱 + NPU로 에이전트별 최적 인프라 할당
- **AI Train**: H200 기반 파인튜닝 → 공공 특화 모델 양성
- **AI Foundry**: RAG Suite, OCR, 벡터DB 등 에이전트 도구 생태계
- **CSAP 공공존**: 대구센터, 용산 등 보안 인증 인프라
- **멀티모델 전략**: 믿:음 K, SOTA K, Llama K 등 용도별 모델 포트폴리오

**A2A + kt cloud = 공공기관 맞춤형 멀티에이전트 플랫폼의 최적 조합**이다.

---

### References

- [Google Developers Blog — A2A 발표](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [A2A Protocol 공식 문서](https://a2a-protocol.org/latest/)
- [A2A GitHub Repository](https://github.com/a2aproject/A2A)
- [Linux Foundation A2A 프로젝트](https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents)
- [IBM — A2A + Ollama 튜토리얼](https://www.ibm.com/think/tutorials/use-a2a-protocol-for-ai-agent-communication)
- [CorticalFlow — A2A + Ollama 통합](https://corticalflow.com/en/blog/google-a2a-ollama-integration)
- [kt cloud 기술 블로그 — AI SERV](https://tech.ktcloud.com/entry/kt-cloud-슬라이싱-GPU-기반-AI-추론용-인프라-서비스-'AI-SERV'-출시)
- [kt cloud 기술 블로그 — AI Foundry](https://tech.ktcloud.com/entry/2025-04-ktcloud-ai-foundry-partnership-사업협력-체결)
- [kt cloud 공공 클라우드](https://gcloud.kt.com/)
- [kt cloud — 대구센터 PPP 클라우드존](https://tech.ktcloud.com/entry/kt-cloud-국가정보자원관리원-대구센터-내-'민관협력형-클라우드존'-구축)
- [AWS — A2A 상호운용성](https://aws.amazon.com/blogs/opensource/open-protocols-for-agent-interoperability-part-4-inter-agent-communication-on-a2a/)
- [Google Cloud Blog — A2A 업그레이드](https://cloud.google.com/blog/products/ai-machine-learning/agent2agent-protocol-is-getting-an-upgrade)
