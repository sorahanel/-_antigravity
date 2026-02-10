/* ========================================
   kt cloud AI Foundry - Agent A Prototype
   Multi-LLM: AI Foundry (Solar Pro2/100B) + OpenRouter (Solar Pro 3)
   OpenRouter SDK-compatible pattern
   ======================================== */

// ========================================
// API Configuration - Multi Provider
// ========================================

const PROVIDERS = {
  'kt-foundry': {
    name: 'kt cloud AI Foundry',
    endpoint: 'https://4fen9wjhzvtx.proxy.aifoundry.ktcloud.com/v1/chat/completions',
    token: 'kt_31yma5uqbv1d7ahgnni5dbeumzspgkt5rljha895wx9yug77rop8igbb3xqcl08tb',
    headers: (token) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    })
  },
  'openrouter': {
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    token: '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',
    headers: (token) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Agent A - AI Foundry Prototype'
    })
  }
};

const MODEL_CONFIG = {
  'solar-pro2': {
    provider: 'kt-foundry',
    modelId: 'solar-pro2',
    displayName: 'Solar Pro2',
    desc: 'kt cloud AI Foundry'
  },
  'solar-100b': {
    provider: 'kt-foundry',
    modelId: 'solar-pro2',
    displayName: 'Solar Open 100B',
    desc: 'kt cloud AI Foundry'
  },
  'solar-pro3': {
    provider: 'openrouter',
    modelId: 'upstage/solar-pro-3:free',
    displayName: 'Solar Pro 3',
    desc: 'OpenRouter (102B MoE)'
  },
  'auto': {
    provider: 'openrouter',
    modelId: 'upstage/solar-pro-3:free',
    displayName: 'Solar Pro 3',
    desc: 'Auto - Best Available'
  }
};

// System prompt for Agent A
const SYSTEM_PROMPT = `당신은 "Agent A"입니다. 기관 A(공공기관)의 AI 업무 비서로서, 의정활동을 전문적으로 지원합니다.

## 역할 및 정체성
- 이름: Agent A
- 소속: 기관 A (공공기관)
- 역할: AI 업무 비서 (의정활동 지원 전문)
- 기반 기술: kt cloud AI Foundry + OpenRouter, Solar Pro 3 / Solar Pro2 / Solar Open 100B 모델, RAG Suite

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

// Conversation history - preserves reasoning_details for multi-turn reasoning
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
// LLM API Call - OpenRouter SDK-compatible
// ========================================

function getProviderConfig(modelKey) {
  const config = MODEL_CONFIG[modelKey] || MODEL_CONFIG['auto'];
  const provider = PROVIDERS[config.provider];
  return { ...config, ...provider, providerKey: config.provider };
}

// Build request body matching OpenAI SDK extra_body pattern:
// extra_body={"reasoning": {"enabled": True}}
function buildRequestBody(cfg, messages, stream) {
  const body = {
    model: cfg.modelId,
    messages: messages,
    max_tokens: 2048,
    temperature: 0.7,
    top_p: 0.9
  };

  if (stream) {
    body.stream = true;
  }

  // OpenRouter: enable reasoning (matches SDK extra_body)
  if (cfg.providerKey === 'openrouter') {
    body.reasoning = { enabled: true };
  }

  return body;
}

// Non-streaming call - captures reasoning_details from response
async function callLLM(messages, modelKey) {
  const cfg = getProviderConfig(modelKey);

  const response = await fetch(cfg.endpoint, {
    method: 'POST',
    headers: cfg.headers(cfg.token),
    body: JSON.stringify(buildRequestBody(cfg, messages, false))
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`[${cfg.name}] ${response.status} ${response.statusText} ${body}`);
  }

  const data = await response.json();
  const msg = data.choices[0].message;

  // Return both content and reasoning_details for history preservation
  return {
    content: msg.content,
    reasoning_details: msg.reasoning_details || null
  };
}

// Streaming call - matches OpenRouter SDK streaming pattern:
// chunk.choices[0]?.delta?.content for content
// chunk.usage for final usage info
async function callLLMStreaming(messages, modelKey, onChunk, onUsage) {
  const cfg = getProviderConfig(modelKey);

  const response = await fetch(cfg.endpoint, {
    method: 'POST',
    headers: cfg.headers(cfg.token),
    body: JSON.stringify(buildRequestBody(cfg, messages, true))
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`[${cfg.name}] ${response.status} ${response.statusText} ${errBody}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let fullReasoning = '';
  let buffer = '';
  let usageInfo = null;

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

        // Content delta (SDK: chunk.choices[0]?.delta?.content)
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          onChunk(fullContent);
        }

        // Reasoning delta (SDK: chunk.choices[0]?.delta?.reasoning)
        const reasoning = parsed.choices?.[0]?.delta?.reasoning;
        if (reasoning) {
          fullReasoning += reasoning;
        }

        // Usage from final chunk (SDK: chunk.usage / chunk.usage.reasoningTokens)
        if (parsed.usage) {
          usageInfo = {
            promptTokens: parsed.usage.prompt_tokens || 0,
            completionTokens: parsed.usage.completion_tokens || 0,
            totalTokens: parsed.usage.total_tokens || 0,
            reasoningTokens: parsed.usage.reasoning_tokens || parsed.usage.reasoningTokens || 0
          };
          if (usageInfo.reasoningTokens > 0) {
            console.log('Reasoning tokens:', usageInfo.reasoningTokens);
          }
          console.log('Usage:', usageInfo);
        }
      } catch (e) {
        // skip malformed chunks
      }
    }
  }

  if (usageInfo && onUsage) {
    onUsage(usageInfo);
  }

  // Return content + reasoning_details for conversation history
  return {
    content: fullContent,
    reasoning_details: fullReasoning || null
  };
}

// ========================================
// UI Helper Functions
// ========================================

function getModelName() {
  const cfg = MODEL_CONFIG[modelSelect.value];
  return cfg ? cfg.displayName : 'Auto';
}

function getModelKey() {
  return modelSelect.value;
}

function getProviderLabel() {
  const cfg = getProviderConfig(modelSelect.value);
  return cfg.providerKey === 'openrouter' ? 'OpenRouter' : 'AI Foundry';
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
  let html = escapeHTML(text);

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/^### (.+)$/gm, '<strong style="font-size:15px;display:block;margin:12px 0 6px;">$1</strong>');
  html = html.replace(/^## (.+)$/gm, '<strong style="font-size:16px;display:block;margin:14px 0 8px;">$1</strong>');
  html = html.replace(/^- (.+)$/gm, '&nbsp;&nbsp;&#8226; $1');
  html = html.replace(/^(\d+)\. (.+)$/gm, '&nbsp;&nbsp;$1. $2');
  html = html.replace(/\|(.+)\|/g, (match) => {
    return '<code style="font-size:12px;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:3px;">' + match + '</code>';
  });
  html = html.replace(/\n/g, '<br>');

  return html;
}

function createMessageHTML(type, content, model, time, usage) {
  const avatar = type === 'bot' ? 'A' : 'U';
  let usageHTML = '';
  if (usage) {
    const parts = [`${usage.totalTokens} tokens`];
    if (usage.reasoningTokens > 0) {
      parts.push(`reasoning: ${usage.reasoningTokens}`);
    }
    usageHTML = `<span class="meta-usage">${parts.join(' | ')}</span>`;
  }
  return `
    <div class="message ${type}">
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        <div class="message-text">${content}</div>
        ${model ? `
        <div class="message-meta">
          <span class="meta-model">${model}</span>
          ${usageHTML}
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

  suggestionsEl.style.display = 'none';

  chatMessages.innerHTML += createMessageHTML('user', escapeHTML(query), null, null);
  scrollToBottom();

  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendBtn.disabled = true;

  conversationHistory.push({ role: 'user', content: query });

  const selectedModel = getModelKey();
  const cfg = getProviderConfig(selectedModel);
  const modelDisplayName = `${cfg.displayName} (${cfg.providerKey === 'openrouter' ? 'OpenRouter' : 'AI Foundry'})`;
  const time = getCurrentTime();

  const { id: streamId, html: streamHTML } = createStreamingMessage();
  chatMessages.innerHTML += streamHTML;
  scrollToBottom();

  let actualModel = selectedModel;
  let actualDisplayName = modelDisplayName;
  let usedFallback = false;

  try {
    let result = null;
    let lastUsage = null;
    const textEl = document.getElementById(`${streamId}-text`);

    // Try a model: streaming first, then non-streaming fallback
    async function tryModel(modelKey) {
      const tryCfg = getProviderConfig(modelKey);
      try {
        return await callLLMStreaming(
          conversationHistory,
          modelKey,
          (partialContent) => {
            if (textEl) {
              textEl.innerHTML = formatResponse(partialContent);
              scrollToBottom();
            }
          },
          (usage) => { lastUsage = usage; }
        );
      } catch (streamErr) {
        console.log(`Streaming failed for ${tryCfg.displayName}, trying non-streaming:`, streamErr.message);
        if (textEl) {
          textEl.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
        }
        return await callLLM(conversationHistory, modelKey);
      }
    }

    // Fallback chain: selected → solar-pro3
    try {
      result = await tryModel(actualModel);
    } catch (primaryErr) {
      if (actualModel !== 'solar-pro3' && actualModel !== 'auto') {
        console.log(`${cfg.displayName} failed, falling back to Solar Pro 3:`, primaryErr.message);
        if (textEl) {
          textEl.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
        }
        actualModel = 'solar-pro3';
        actualDisplayName = 'Solar Pro 3 (OpenRouter)';
        usedFallback = true;
        result = await tryModel('solar-pro3');
      } else {
        throw primaryErr;
      }
    }

    let metaLabel = actualDisplayName;
    if (usedFallback) {
      metaLabel += ' [fallback]';
    }

    const streamMsg = document.getElementById(streamId);
    if (streamMsg) {
      streamMsg.outerHTML = createMessageHTML('bot', formatResponse(result.content), metaLabel, time, lastUsage);
    }

    // Preserve assistant message with reasoning_details for multi-turn reasoning
    // Matches SDK pattern: {"role": "assistant", "content": ..., "reasoning_details": ...}
    const assistantMsg = { role: 'assistant', content: result.content };
    if (result.reasoning_details) {
      assistantMsg.reasoning_details = result.reasoning_details;
    }
    conversationHistory.push(assistantMsg);

  } catch (err) {
    console.error('LLM API Error:', err);

    const streamMsg = document.getElementById(streamId);
    if (streamMsg) streamMsg.remove();

    const errorHTML = `
      <div class="rag-results" style="border-color: rgba(233,69,96,0.3); background: rgba(233,69,96,0.08);">
        <div class="rag-label" style="color: var(--kt-accent);">API 연결 오류</div>
        <div class="rag-doc">
          <span class="rag-doc-title">${escapeHTML(err.message)}</span>
        </div>
      </div>
      LLM 엔드포인트 연결에 실패했습니다.<br><br>
      <strong>연결 정보</strong><br>
      &nbsp;&nbsp;&#8226; 모델: ${cfg.displayName} (${cfg.modelId})<br>
      &nbsp;&nbsp;&#8226; Provider: ${cfg.name}
    `;
    chatMessages.innerHTML += createMessageHTML('bot', errorHTML, 'System', time);

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

chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

document.querySelectorAll('.suggestion').forEach(btn => {
  btn.addEventListener('click', () => {
    const query = btn.getAttribute('data-query');
    chatInput.value = query;
    sendMessage(query);
  });
});

clearBtn.addEventListener('click', () => {
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
          <span class="meta-model">Solar Pro 3 (OpenRouter)</span>
          <span class="meta-time">${getCurrentTime()}</span>
        </div>
      </div>
    </div>
  `;
  suggestionsEl.style.display = 'flex';
  isProcessing = false;
  sendBtn.disabled = false;
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
