/* ========================================
   kt cloud AI Foundry - Agent A Prototype
   Real LLM Integration (Solar Pro2 / Solar Open 100B)
   ======================================== */

// ========================================
// API Configuration
// ========================================

const API_CONFIG = {
  endpoint: 'https://4fen9wjhzvtx.proxy.aifoundry.ktcloud.com/v1/chat/completions',
  token: 'kt_31yma5uqbv1d7ahgnni5dbeumzspgkt5rljha895wx9yug77rop8igbb3xqcl08tb',
  models: {
    'solar-pro2': 'solar-pro2',
    'solar-100b': 'solar-pro2',
    'auto': 'solar-pro2'
  }
};

// System prompt for Agent A
const SYSTEM_PROMPT = `당신은 "Agent A"입니다. 기관 A(공공기관)의 AI 업무 비서로서, 의정활동을 전문적으로 지원합니다.

## 역할 및 정체성
- 이름: Agent A
- 소속: 기관 A (공공기관)
- 역할: AI 업무 비서 (의정활동 지원 전문)
- 기반 기술: kt cloud AI Foundry, Solar Pro2 / Solar Open 100B 모델, RAG Suite

## 주요 업무 역할
1. 회의록 분석 및 요약: 본회의/상임위 회의록 분석, 핵심 안건 요약, 의원 발언 정리
2. 조례안/법규 검토: 조례안 비교분석, 법적 쟁점 검토, 타 시도 사례 비교
3. 정책 자료 검색: 정책 동향 조사, 타 시도 우수사례 검색, 관련 연구자료 제공
4. 예산안 분석: 세입/세출 분석, 전년대비 증감 분석, 사업별 예산 비교
5. 보고서 초안 작성: 정책보고서, 검토의견서, 브리핑 자료 초안 작성

## 응답 스타일
- 공공기관 업무에 적합한 격식체 사용
- 구조화된 정보 제공 (제목, 항목, 표 활용)
- 근거 기반 답변 (관련 조례, 법규, 데이터 인용)
- 추가 분석 가능성 안내

## 주의사항
- 기관 A의 AI 비서로서 중립적이고 객관적인 정보 제공
- 정치적 판단이나 편향된 의견 제시 금지
- 불확실한 정보는 명확히 표시
- 개인정보나 민감한 정보 보호`;

// Conversation history
let conversationHistory = [
  { role: 'system', content: SYSTEM_PROMPT }
];

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
// DOM Elements
// ========================================

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearChat');
const suggestionsEl = document.getElementById('chatSuggestions');
const modelSelect = document.getElementById('modelSelect');

// ========================================
// LLM API Call
// ========================================

async function callLLM(messages, model) {
  const modelId = API_CONFIG.models[model] || 'solar-pro2';

  const response = await fetch(API_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_CONFIG.token}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: messages,
      max_tokens: 2048,
      temperature: 0.7,
      top_p: 0.9
    })
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callLLMStreaming(messages, model, onChunk) {
  const modelId = API_CONFIG.models[model] || 'solar-pro2';

  const response = await fetch(API_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_CONFIG.token}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: messages,
      max_tokens: 2048,
      temperature: 0.7,
      top_p: 0.9,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          onChunk(fullContent);
        }
      } catch (e) {
        // skip malformed chunks
      }
    }
  }

  return fullContent;
}

// ========================================
// UI Helper Functions
// ========================================

function getModelName() {
  const value = modelSelect.value;
  if (value === 'solar-pro2') return 'Solar Pro2';
  if (value === 'solar-100b') return 'Solar Open 100B';
  return 'Auto';
}

function getModelKey() {
  return modelSelect.value;
}

function getCurrentTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatResponse(text) {
  // Convert markdown-like formatting to HTML
  let html = escapeHTML(text);

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Headers: ### text
  html = html.replace(/^### (.+)$/gm, '<strong style="font-size:15px;display:block;margin:12px 0 6px;">$1</strong>');
  html = html.replace(/^## (.+)$/gm, '<strong style="font-size:16px;display:block;margin:14px 0 8px;">$1</strong>');

  // Lists: - text
  html = html.replace(/^- (.+)$/gm, '&nbsp;&nbsp;&#8226; $1');

  // Numbered lists: 1. text
  html = html.replace(/^(\d+)\. (.+)$/gm, '&nbsp;&nbsp;$1. $2');

  // Simple table detection (| col | col |)
  html = html.replace(/\|(.+)\|/g, (match) => {
    return '<code style="font-size:12px;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:3px;">' + match + '</code>';
  });

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
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

function createStreamingMessage() {
  const id = 'streaming-' + Date.now();
  const html = `
    <div class="message bot" id="${id}">
      <div class="message-avatar">A</div>
      <div class="message-content">
        <div class="message-text" id="${id}-text">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>
  `;
  return { id, html };
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

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ========================================
// Main Send Message Function
// ========================================

let isProcessing = false;

async function sendMessage(query) {
  if (!query.trim() || isProcessing) return;
  isProcessing = true;

  // Hide suggestions after first message
  suggestionsEl.style.display = 'none';

  // Add user message
  chatMessages.innerHTML += createMessageHTML('user', escapeHTML(query), null, null);
  scrollToBottom();

  // Clear input
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendBtn.disabled = true;

  // Add to conversation history
  conversationHistory.push({ role: 'user', content: query });

  const selectedModel = getModelKey();
  const modelDisplayName = getModelName() === 'Auto' ? 'Solar Pro2' : getModelName();
  const time = getCurrentTime();

  // Create streaming message placeholder
  const { id: streamId, html: streamHTML } = createStreamingMessage();
  chatMessages.innerHTML += streamHTML;
  scrollToBottom();

  try {
    // Try streaming first
    let finalContent = '';
    const textEl = document.getElementById(`${streamId}-text`);

    try {
      finalContent = await callLLMStreaming(
        conversationHistory,
        selectedModel,
        (partialContent) => {
          if (textEl) {
            textEl.innerHTML = formatResponse(partialContent);
            scrollToBottom();
          }
        }
      );
    } catch (streamErr) {
      // If streaming fails, try non-streaming
      console.log('Streaming failed, trying non-streaming:', streamErr.message);

      if (textEl) {
        textEl.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
      }

      finalContent = await callLLM(conversationHistory, selectedModel);
    }

    // Update the message with final content and meta
    const streamMsg = document.getElementById(streamId);
    if (streamMsg) {
      streamMsg.outerHTML = createMessageHTML('bot', formatResponse(finalContent), modelDisplayName, time);
    }

    // Add assistant response to conversation history
    conversationHistory.push({ role: 'assistant', content: finalContent });

  } catch (err) {
    console.error('LLM API Error:', err);

    // Remove streaming message
    const streamMsg = document.getElementById(streamId);
    if (streamMsg) streamMsg.remove();

    // Show error with retry option
    const errorHTML = `
      <div class="rag-results" style="border-color: rgba(233,69,96,0.3); background: rgba(233,69,96,0.08);">
        <div class="rag-label" style="color: var(--kt-accent);">API 연결 오류</div>
        <div class="rag-doc">
          <span class="rag-doc-title">${escapeHTML(err.message)}</span>
        </div>
      </div>
      AI Foundry 엔드포인트 연결에 실패했습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.<br><br>
      <strong>연결 정보</strong><br>
      &nbsp;&nbsp;&#8226; 엔드포인트: ${API_CONFIG.endpoint}<br>
      &nbsp;&nbsp;&#8226; 모델: ${modelDisplayName}
    `;
    chatMessages.innerHTML += createMessageHTML('bot', errorHTML, 'System', time);

    // Remove the failed user message from history
    conversationHistory.pop();
  }

  scrollToBottom();
  sendBtn.disabled = false;
  isProcessing = false;
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
  // Reset conversation history
  conversationHistory = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

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
  isProcessing = false;
  sendBtn.disabled = false;
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
