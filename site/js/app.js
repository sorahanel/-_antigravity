/* ========================================
   kt cloud AI Foundry - Agent A Prototype
   ======================================== */

// ========================================
// Navigation scroll behavior
// ========================================

const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});

// Active nav link tracking
const sections = document.querySelectorAll('.section, .hero');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 100;
    if (window.scrollY >= top) {
      current = section.getAttribute('id') || '';
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.classList.add('active');
    }
  });
});

// ========================================
// Agent A Chat System
// ========================================

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearChat');
const suggestionsEl = document.getElementById('chatSuggestions');
const modelSelect = document.getElementById('modelSelect');

// Agent A knowledge base - simulated RAG results and responses
const agentKnowledge = {
  '회의록': {
    ragDocs: [
      { title: '제421회 본회의 회의록 (2026.01.15)', score: 0.94 },
      { title: '제420회 본회의 회의록 (2025.12.20)', score: 0.91 },
      { title: '제419회 임시회 회의록 (2025.11.28)', score: 0.87 }
    ],
    model: 'Solar Pro2',
    response: `제421회 본회의 회의록을 분석한 결과를 요약해 드리겠습니다.

<strong>회의 개요</strong>
- 일시: 2026년 1월 15일 (수) 10:00~17:30
- 참석: 재적의원 142명 중 131명 참석
- 안건: 총 12건 (조례안 7건, 예산안 3건, 동의안 2건)

<strong>주요 의결사항</strong>
1. 경기도 AI 산업 육성 지원 조례안 - <strong>원안 가결</strong>
   - AI 관련 스타트업 지원 예산 120억원 포함
   - 찬성 118, 반대 8, 기권 5

2. 2026년도 추가경정예산안 - <strong>수정 가결</strong>
   - 총 규모 32조 4,800억원 (원안 대비 1,200억 증액)
   - 디지털 전환 사업비 15% 증액 반영

3. 경기도 스마트도시 조성 조례 일부개정안 - <strong>원안 가결</strong>
   - 스마트 모빌리티 조항 신설

<strong>주요 발언 요약</strong>
- 김OO 의원: AI 산업 육성 예산의 구체적 집행 계획 요구
- 이OO 의원: 스마트도시 사업의 주민 참여 확대 필요성 강조
- 박OO 의원: 추경예산 편성 시 재정건전성 고려 촉구

추가로 특정 안건이나 의원 발언에 대한 상세 분석이 필요하시면 말씀해 주세요.`
  },

  '조례': {
    ragDocs: [
      { title: '경기도 주민자치 기본 조례 (현행)', score: 0.96 },
      { title: '주민자치 관련 개정안 비교표', score: 0.93 },
      { title: '타 시도 주민자치 조례 비교 분석', score: 0.88 }
    ],
    model: 'Solar Open 100B',
    response: `주민자치 관련 조례안 현황을 분석해 드리겠습니다.

<strong>현행 조례 현황</strong>
「경기도 주민자치회 설치 및 운영에 관한 조례」(2024.06 전부개정)

<strong>개정 추진 중인 사항 (3건)</strong>

<strong>1. 주민자치회 권한 강화안</strong> (발의: 2025.12)
- 현행: 주민자치회의 자문 기능 중심
- 개정안: 주민참여예산 직접 심의권 부여
- 쟁점: 기존 주민참여예산위원회와 권한 중복 우려
- 상태: <strong>상임위 계류 중</strong>

<strong>2. 디지털 주민자치 조항 신설안</strong> (발의: 2026.01)
- 온라인 주민투표 시스템 도입 근거
- AI 기반 주민의견 수렴 플랫폼 운영 조항
- 디지털 취약계층 접근성 보장 의무화
- 상태: <strong>소관위 회부 예정</strong>

<strong>3. 주민자치센터 운영 효율화안</strong> (발의: 2025.11)
- 주민자치센터 통합 관리 시스템 구축
- 프로그램 운영 성과평가 지표 도입
- 상태: <strong>2월 상임위 심의 예정</strong>

<strong>타 시도 비교</strong>
| 구분 | 서울 | 경기(현행) | 경기(개정안) |
|------|------|-----------|------------|
| 주민참여예산 심의 | 자문 | 자문 | 직접 심의 |
| 온라인 투표 | 시범운영 | 미도입 | 도입 |
| 성과평가 | 도입 | 미도입 | 도입 |

특정 조례안의 축조 분석이나 타 시도와의 상세 비교가 필요하시면 말씀해 주세요.`
  },

  '예산': {
    ragDocs: [
      { title: '2026년 경기도 교육 분야 예산안', score: 0.95 },
      { title: '2025년 교육 예산 집행 현황', score: 0.90 },
      { title: '교육 분야 중기재정계획 (2026-2030)', score: 0.85 }
    ],
    model: 'Solar Open 100B',
    response: `2026년 교육 분야 예산안 변경사항을 분석해 드리겠습니다.

<strong>2026년 교육 분야 예산 총괄</strong>
- 총 규모: 8조 2,400억원 (전년 대비 +6.2%)
- 본예산: 7조 8,000억원 / 추경: 4,400억원

<strong>주요 변경사항</strong>

<strong>1. AI 교육 인프라 확충 (+1,200억원, 신규)</strong>
- 초중고 AI 교육 실습실 구축: 800억원
- AI 교육 플랫폼 개발: 250억원
- 교원 AI 역량강화 연수: 150억원
- 비고: AI 산업 육성 조례 연계 사업

<strong>2. 스마트 학교 전환 사업 (+680억원, 증액)</strong>
- 2025년: 450억원 → 2026년: 1,130억원
- 학교 무선 인프라 고도화, 디지털 교과서 보급
- 대상: 도내 2,100개교 중 850개교 (1차)

<strong>3. 돌봄교육 확대 (+520억원, 증액)</strong>
- 초등돌봄교실 확대: 380억원
- 방과후 프로그램 다양화: 140억원

<strong>4. 감액 사항</strong>
- 학교 시설 보수 사업: -180억원 (사업 완료분)
- 해외 교류 프로그램: -60억원 (효율화)

<strong>전년 대비 증감 요약</strong>
| 분야 | 2025 | 2026 | 증감 | 증감률 |
|------|------|------|------|--------|
| AI 교육 | - | 1,200억 | +1,200억 | 신규 |
| 스마트 학교 | 450억 | 1,130억 | +680억 | +151% |
| 돌봄교육 | 2,800억 | 3,320억 | +520억 | +18.6% |
| 시설보수 | 980억 | 800억 | -180억 | -18.4% |

세부 항목별 분석이나 특정 사업의 집행 계획이 필요하시면 말씀해 주세요.`
  },

  '정책': {
    ragDocs: [
      { title: '서울시 스마트도시 종합계획 (2025-2029)', score: 0.92 },
      { title: '세종시 스마트시티 국가시범사업 성과보고서', score: 0.89 },
      { title: '부산 에코델타시티 스마트도시 사례', score: 0.86 },
      { title: '경기도 스마트도시 추진 현황', score: 0.83 }
    ],
    model: 'Solar Pro2',
    response: `스마트도시 관련 타 시도 정책 사례를 검색한 결과입니다.

<strong>주요 타 시도 스마트도시 정책 현황</strong>

<strong>1. 서울시 - 디지털트윈 기반 스마트시티</strong>
- 핵심: S-Map(서울 3D 디지털트윈) 플랫폼
- 예산: 2026년 2,800억원 규모
- 주요 사업:
  - AI 기반 교통 최적화 시스템 도입
  - 스마트 안전망 확대 (CCTV AI 분석)
  - 디지털트윈 도시계획 시뮬레이션
- 참고사항: 민간 데이터 연계 플랫폼 성과 우수

<strong>2. 세종시 - 국가시범 스마트시티</strong>
- 핵심: 자율주행 + 생활밀착형 서비스
- 예산: 국비 포함 1,500억원 규모
- 주요 성과:
  - 자율주행 셔틀 상용 서비스 운영 (2025~)
  - AI 에너지 관리 시스템으로 20% 절감
  - 통합 데이터 허브 구축 완료
- 참고사항: 신도시 기반이므로 기존 도시 적용 시 조정 필요

<strong>3. 부산 에코델타시티</strong>
- 핵심: 로봇 + IoT 융합 스마트 리빙
- 주요 서비스:
  - 로봇 택배 배송 서비스
  - 스마트 헬스케어 모니터링
  - 물 순환 에너지 자립 시스템

<strong>경기도 적용 시사점</strong>
1. 서울시 디지털트윈 모델의 경기도 31개 시군 확대 적용 검토
2. 세종시 자율주행 모델의 판교/광교 테크노밸리 적용 가능성
3. 기존 도시 재생형 스마트도시 모델 필요 (부산 사례 참고)
4. AI 기반 주민 서비스 통합 플랫폼 우선 추진 권장

각 사례의 상세 분석이나 경기도 적용 방안이 필요하시면 말씀해 주세요.`
  }
};

// Generic response templates for unmatched queries
const genericResponses = [
  {
    model: 'Solar Pro2',
    response: (query) => `말씀하신 "<strong>${query}</strong>"에 대해 관련 자료를 검색하겠습니다.

현재 기관 A의 문서 데이터베이스에서 관련 자료를 탐색한 결과, 해당 주제와 직접적으로 연관된 문서를 확인하고 있습니다.

<strong>검색 결과 요약</strong>
- RAG Suite를 통해 관련 문서 3건을 검색했습니다.
- 검색된 자료를 기반으로 답변을 구성합니다.

해당 주제에 대해 더 구체적인 키워드나 조건을 알려주시면, 보다 정확한 분석 결과를 제공할 수 있습니다.

예를 들어:
- 특정 기간의 자료가 필요하신가요?
- 특정 위원회나 분야에 한정할까요?
- 타 시도 비교 분석이 필요하신가요?`
  }
];

// ========================================
// Chat Functions
// ========================================

function getModelName() {
  const value = modelSelect.value;
  if (value === 'solar-pro2') return 'Solar Pro2';
  if (value === 'solar-100b') return 'Solar Open 100B';
  return 'Auto';
}

function getCurrentTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

function createMessageHTML(type, content, model, time) {
  const avatar = type === 'bot' ? 'A' : 'U';
  return `
    <div class="message ${type}">
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        <div class="message-text">${content}</div>
        ${model ? `
        <div class="message-meta">
          <span class="meta-model">${model}</span>
          <span class="meta-time">${time}</span>
        </div>` : ''}
      </div>
    </div>
  `;
}

function createTypingIndicator() {
  return `
    <div class="message bot" id="typingMessage">
      <div class="message-avatar">A</div>
      <div class="message-content">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
}

function createRAGResultsHTML(docs) {
  if (!docs || docs.length === 0) return '';
  const docItems = docs.map(d => `
    <div class="rag-doc">
      <span class="rag-doc-title">${d.title}</span>
      <span class="rag-doc-score">유사도: ${(d.score * 100).toFixed(0)}%</span>
    </div>
  `).join('');

  return `
    <div class="rag-results">
      <div class="rag-label">RAG Suite 검색 결과 (Vector DB)</div>
      ${docItems}
    </div>
  `;
}

function findMatchingKnowledge(query) {
  const keywords = Object.keys(agentKnowledge);
  for (const keyword of keywords) {
    if (query.includes(keyword)) {
      return agentKnowledge[keyword];
    }
  }
  return null;
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage(query) {
  if (!query.trim()) return;

  // Hide suggestions after first message
  suggestionsEl.style.display = 'none';

  // Add user message
  chatMessages.innerHTML += createMessageHTML('user', query, null, null);
  scrollToBottom();

  // Clear input
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendBtn.disabled = true;

  // Show typing indicator
  chatMessages.innerHTML += createTypingIndicator();
  scrollToBottom();

  // Simulate processing delay
  const knowledge = findMatchingKnowledge(query);
  const processingTime = knowledge ? 1500 + Math.random() * 1500 : 1000 + Math.random() * 1000;

  await new Promise(resolve => setTimeout(resolve, processingTime));

  // Remove typing indicator
  const typingEl = document.getElementById('typingMessage');
  if (typingEl) typingEl.remove();

  // Generate response
  let responseHTML = '';
  let modelUsed = '';
  const time = getCurrentTime();

  if (knowledge) {
    const selectedModel = modelSelect.value;
    modelUsed = selectedModel === 'auto' ? knowledge.model : getModelName();

    // RAG results + response
    const ragHTML = createRAGResultsHTML(knowledge.ragDocs);
    responseHTML = ragHTML + knowledge.response;
  } else {
    modelUsed = getModelName() === 'Auto' ? 'Solar Pro2' : getModelName();
    responseHTML = genericResponses[0].response(query);
  }

  chatMessages.innerHTML += createMessageHTML('bot', responseHTML, modelUsed, time);
  scrollToBottom();
  sendBtn.disabled = false;
}

// ========================================
// Event Listeners
// ========================================

sendBtn.addEventListener('click', () => {
  sendMessage(chatInput.value);
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(chatInput.value);
  }
});

// Auto-resize textarea
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

// Suggestion buttons
document.querySelectorAll('.suggestion').forEach(btn => {
  btn.addEventListener('click', () => {
    const query = btn.getAttribute('data-query');
    chatInput.value = query;
    sendMessage(query);
  });
});

// Clear chat
clearBtn.addEventListener('click', () => {
  chatMessages.innerHTML = `
    <div class="message bot">
      <div class="message-avatar">A</div>
      <div class="message-content">
        <div class="message-text">
          대화가 초기화되었습니다. 무엇을 도와드릴까요?
        </div>
        <div class="message-meta">
          <span class="meta-model">Solar Pro2</span>
          <span class="meta-time">${getCurrentTime()}</span>
        </div>
      </div>
    </div>
  `;
  suggestionsEl.style.display = 'flex';
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
