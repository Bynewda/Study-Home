/* =========================================================================
   K-EXAONE 2.5 미니 AI 어시스턴트 위젯 (논결 서재 내장형)
   - 원본: k_exaone_2_5.html (단독 페이지용, Tailwind CDN 기반)
   - 홈페이지에 맞춰 Tailwind 없이 순수 JS + 사이트 디자인 토큰(css/exaone-widget.css)으로 재구성.
     → Tailwind의 전역 리셋(preflight)이 기존 서재 화면 스타일을 깨뜨리지 않도록 분리했습니다.
   - API Key는 이 브라우저의 localStorage('exaone_api_key')에만 저장되며,
     Firebase 기기 간 동기화 데이터(patent-study-home:v1)에는 절대 포함되지 않습니다.
   - 사용법: window.ExaoneWidget.mount(containerElement)
   ========================================================================= */
(function () {
  'use strict';

  const STORAGE_KEY_API = 'exaone_api_key';
  const STORAGE_KEY_PREFS = 'exaone_widget_prefs';
  const STORAGE_KEY_CHAT = 'exaone_widget_chat';
  const DEFAULT_ENDPOINT = 'https://api.exaone.ai/v1/chat/completions';
  const MODEL_NAME = 'k-exaone_v2.5';
  const MAX_SAVED_MESSAGES = 40;
  const REQUEST_TIMEOUT_MS = 180000;

  // 작업 모드별 시스템 프롬프트 프리셋 (원본 위젯과 동일 + 변리사 수험 맥락 보강)
  const MODE_PRESETS = {
    summarize: {
      label: '핵심 요약',
      effort: 'high',
      description: '판례·논문·강의 노트 등 긴 텍스트를 넣으면 쟁점 · 핵심 내용 · 결론 순으로 정리합니다.',
      placeholder: '요약할 판례, 기사, 전공 텍스트를 붙여넣으세요...',
      systemPrompt:
        '당신은 전문 학술 및 법률·기술 요약 어시스턴트입니다. 사용자는 변리사 2차 시험(특허법·상표법·민사소송법)을 준비하는 수험생입니다. 사용자가 입력한 텍스트를 분석하여 반드시 다음 구조의 불릿 포인트로 명확하게 요약하세요:\n1. **[핵심 쟁점 / 주제]**: 글이 다루는 핵심 질문이나 문제를 한 줄로 정의\n2. **[주요 내용 및 논거]**: 핵심 논리나 사실을 3~5개의 개조식 불릿 포인트로 정리\n3. **[결론 및 시사점]**: 최종 결론이나 암기해야 할 핵심 키워드 요약\n불필요한 인사말 없이 곧바로 구조화된 본문을 출력하세요.',
      sample:
        '대법원 판결 요지: 특허발명의 보호범위는 청구범위에 적혀 있는 사항에 의하여 정하여지는 것이 원칙이고, 다만 청구범위에 적혀 있는 사항만으로 특허발명의 기술적 구성을 알 수 없거나 알 수 있더라도 그 기술적 범위를 확정할 수 없는 경우에는 발명의 설명이나 도면에 적힌 사항을 참작하여 청구범위를 해석할 수 있다. 그러나 발명의 설명이나 도면을 참작한다고 하더라도 청구범위를 확장하거나 제한하여 해석하는 것은 허용되지 않는다.',
    },
    qa: {
      label: '즉문즉답',
      effort: 'low',
      description: '공부 중 막히는 법률 조문, 공학 개념 등을 물어보면 핵심만 정확히 답변합니다.',
      placeholder: '궁금한 개념이나 질문을 간결하게 입력하세요...',
      systemPrompt:
        '당신은 명확하고 정확한 답변을 제공하는 학습 튜터이자 기술 어시스턴트입니다. 질문의 핵심 정의를 두괄식으로 먼저 제시하고, 이해를 돕는 비교나 예시를 간결한 마크다운 불릿 포인트나 코드 블록으로 설명하세요. 법령·판례를 인용할 때 확실하지 않은 내용은 확실하지 않다고 밝히세요.',
      sample: '특허법상 신규성 의제(공지예외주장) 제도의 요건과 주장 시기를 핵심 위주로 정리해 줘.',
    },
    refine: {
      label: '문장 교정/압축',
      effort: 'high',
      description: '초안 노트나 서술형 답안을 넣으면 매끄럽게 다듬고 두괄식 개조식 문장으로 압축합니다.',
      placeholder: '다듬거나 압축할 초안 문장을 입력하세요...',
      systemPrompt:
        '당신은 전문 에디터이자 수험 답안 첨삭가입니다. 사용자가 입력한 거친 메모나 초안을 의미 손실 없이 가장 명확하고 간결한 한국어 문장으로 교정하세요. 결과물은 1) **[다듬은 문장]**과 2) **[한 줄 핵심 압축]** 두 가지 버전으로 제시하세요.',
      sample:
        '청구범위 해석은 원래 청구범위에 적힌 걸로 하는 건데 그걸로 모르겠으면 발명의 설명이나 도면 보고 해석해도 되지만 그렇다고 그걸로 청구범위를 늘리거나 줄이면 안 된다는 게 판례 입장이다.',
    },
  };

  /* ---------------------------------------------------------------------
     모듈 단위 상태 — 홈페이지가 화면을 다시 그려도(페이지 이동·패널 접기)
     대화 기록과 입력 중인 초안, 진행 중인 요청이 유지됩니다.
     --------------------------------------------------------------------- */
  const state = {
    mode: 'summarize',
    effort: 'high',
    endpoint: DEFAULT_ENDPOINT,
    systemPrompts: {},      // 사용자가 고급 설정에서 수정한 모드별 시스템 프롬프트
    enterToSend: true,
    draft: '',
    contextLabel: '',       // 홈페이지 다른 화면에서 'AI에 묻기'로 넘어온 학습 맥락 이름
    messages: [],           // { role: 'user'|'assistant'|'error', content, meta }
    loading: false,
    startedAt: 0,
    settingsOpen: false,
    abort: null,
  };
  let view = null;          // 현재 마운트된 DOM 참조 모음
  let tickTimer = null;
  let toastTimer = null;

  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(STORAGE_KEY_PREFS) || '{}');
      if (p.mode && MODE_PRESETS[p.mode]) state.mode = p.mode;
      if (p.effort) state.effort = p.effort;
      if (p.endpoint) state.endpoint = p.endpoint;
      if (p.systemPrompts && typeof p.systemPrompts === 'object') state.systemPrompts = p.systemPrompts;
      if (typeof p.enterToSend === 'boolean') state.enterToSend = p.enterToSend;
    } catch (e) { /* 손상된 설정은 무시 */ }
    try {
      const c = JSON.parse(localStorage.getItem(STORAGE_KEY_CHAT) || '[]');
      if (Array.isArray(c)) state.messages = c.filter(function (m) { return m && m.role && typeof m.content === 'string'; });
    } catch (e) { state.messages = []; }
  }
  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify({
        mode: state.mode, effort: state.effort, endpoint: state.endpoint,
        systemPrompts: state.systemPrompts, enterToSend: state.enterToSend,
      }));
    } catch (e) {}
  }
  function saveChat() {
    try { localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(state.messages.slice(-MAX_SAVED_MESSAGES))); } catch (e) {}
  }
  function getKey() { try { return (localStorage.getItem(STORAGE_KEY_API) || '').trim(); } catch (e) { return ''; } }
  function hasExaoneExtBridge() {
    return !!(document && document.documentElement && document.documentElement.getAttribute('data-study-home-exaone-ext') === '1');
  }
  function hasLearnUsExtOnly() {
    return !!(document && document.documentElement && document.documentElement.getAttribute('data-study-home-lu-ext') === '1' && !hasExaoneExtBridge());
  }
  function isLocalServerOrigin() {
    return typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1') && /^https?:$/i.test(location.protocol);
  }
  // 확장 앱(bridge.js -> background.js)을 통한 CORS 우회 호출
  function fetchViaExtension(endpoint, apiKey, payload, signal) {
    return new Promise(function (resolve, reject) {
      if (signal && signal.aborted) {
        const abortErr = new Error('Aborted');
        abortErr.name = 'AbortError';
        reject(abortErr);
        return;
      }
      const reqId = 'exw-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      function cleanup() {
        window.removeEventListener('message', onMsg);
        if (signal) signal.removeEventListener('abort', onAbort);
      }
      function onAbort() {
        cleanup();
        const abortErr = new Error('Aborted');
        abortErr.name = 'AbortError';
        reject(abortErr);
      }
      function onMsg(e) {
        if (e.source !== window || !e.data || e.data.type !== 'STUDY_HOME_EXAONE_RESULT' || e.data.reqId !== reqId) return;
        cleanup();
        if (!e.data.transportOk) {
          reject(new Error(e.data.error || '확장 앱 통신 실패'));
          return;
        }
        const bodyText = typeof e.data.bodyText === 'string' ? e.data.bodyText : '';
        resolve({
          ok: !!e.data.httpOk,
          status: Number(e.data.status) || 0,
          text: function () { return Promise.resolve(bodyText); },
          json: function () {
            try { return Promise.resolve(JSON.parse(bodyText)); }
            catch (err) { return Promise.reject(err); }
          },
        });
      }
      window.addEventListener('message', onMsg);
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
      window.postMessage({
        type: 'STUDY_HOME_EXAONE_FETCH',
        reqId: reqId,
        endpoint: endpoint,
        apiKey: apiKey,
        payload: payload,
      }, window.location.origin);
    });
  }
  function systemPromptFor(mode) {
    const custom = state.systemPrompts[mode];
    return (custom && custom.trim()) ? custom : MODE_PRESETS[mode].systemPrompt;
  }

  /* ---------------------------------------------------------------------
     DOM 유틸
     --------------------------------------------------------------------- */
  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        const v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (k === 'value') node.value = v;
        else if (k === 'checked') node.checked = !!v;
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    (Array.isArray(children) ? children : (children == null ? [] : [children])).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  const ICONS = {
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>',
    send: '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L20 3"/><path d="M16 7l3 3"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    sample: '<path d="M4 6h16M4 12h10M4 18h7"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
  };
  function icon(name, size) {
    const s = size || 16;
    const span = h('span', { class: 'exw-ico', 'aria-hidden': 'true' });
    span.innerHTML = '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
    return span;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  // 경량 마크다운 파서 — 먼저 HTML 이스케이프 후 제한된 서식만 변환 (XSS 방지)
  function renderMarkdown(rawText) {
    let text = escapeHtml(rawText);
    const blocks = [];
    text = text.replace(/```[\w-]*\n?([\s\S]*?)```/g, function (_, code) {
      blocks.push('<pre><code>' + code.replace(/\n$/, '') + '</code></pre>');
      return '\u0000' + (blocks.length - 1) + '\u0000';
    });
    text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/^#{3,6} (.+)$/gm, '<h5>$1</h5>');
    text = text.replace(/^#{1,2} (.+)$/gm, '<h4>$1</h4>');
    text = text.replace(/^\s*(?:-|\*|•) (.+)$/gm, '<li>$1</li>');
    text = text.replace(/(?:<li>.*<\/li>\n?)+/g, function (m) { return '<ul>' + m.replace(/\n/g, '') + '</ul>'; });
    text = text.replace(/\n{2,}/g, '</p><p>');
    text = text.replace(/\n/g, '<br>');
    text = text.replace(/\u0000(\d+)\u0000/g, function (_, i) { return blocks[Number(i)]; });
    return '<p>' + text + '</p>';
  }

  function toast(msg) {
    if (!view || !view.toast) return;
    view.toast.textContent = msg;
    view.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (view && view.toast) view.toast.hidden = true; }, 2600);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const t = document.createElement('textarea');
      t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(t);
    }
    toast('응답 내용을 클립보드에 복사했습니다.');
  }

  /* ---------------------------------------------------------------------
     렌더링
     --------------------------------------------------------------------- */
  function renderKeyBadge() {
    if (!view) return;
    const ok = getKey().length > 5;
    const ext = hasExaoneExtBridge();
    view.keyBadge.className = 'exw-key-badge ' + (ok ? 'ok' : 'missing');
    view.keyBadge.textContent = ok ? (ext ? 'API 연결됨 · 확장앱 활성' : 'API 연결 준비됨') : '키 미설정';
    view.keyBadge.title = ok ? 'API Key 설정 열기' : 'API Key를 입력해 주세요';
  }

  function renderModeTabs() {
    if (!view) return;
    view.modeTabs.querySelectorAll('button').forEach(function (b) {
      const on = b.getAttribute('data-mode') === state.mode;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    view.effortSel.value = state.effort;
    view.input.placeholder = MODE_PRESETS[state.mode].placeholder + ' (Enter 전송 · Shift+Enter 줄바꿈)';
    if (view.sysPrompt) view.sysPrompt.value = systemPromptFor(state.mode);
  }

  function buildMessage(m) {
    if (m.role === 'user') {
      return h('div', { class: 'exw-msg user' }, [
        h('div', { class: 'exw-bubble', text: m.content }),
        m.meta ? h('div', { class: 'exw-meta', text: m.meta }) : null,
      ]);
    }
    if (m.role === 'error') {
      const errChildren = [
        h('div', { class: 'exw-err-title' }, [icon('alert', 15), m.meta || '요청 실패 진단']),
        h('div', { class: 'exw-err-body', text: m.content }),
      ];
      if (m.needExtGuide) {
        errChildren.push(h('div', { class: 'exw-err-actions', style: 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px' }, [
          h('button', {
            type: 'button', class: 'btn btn-sm',
            onclick: function () { copyText('whale://extensions'); toast('whale://extensions 주소를 복사했습니다. 주소창에 붙여넣어 이동하세요.'); },
          }, '웨일 확장앱 주소 복사'),
          h('button', {
            type: 'button', class: 'btn btn-sm',
            onclick: function () { copyText('chrome://extensions'); toast('chrome://extensions 주소를 복사했습니다. 주소창에 붙여넣어 이동하세요.'); },
          }, '크롬 확장앱 주소 복사'),
        ]));
      }
      return h('div', { class: 'exw-msg error', role: 'alert' }, [
        h('div', { class: 'exw-bubble' }, errChildren),
      ]);
    }
    const body = h('div', { class: 'exw-md' });
    body.innerHTML = renderMarkdown(m.content);
    return h('div', { class: 'exw-msg assistant' }, [
      h('div', { class: 'exw-bubble' }, [
        body,
        h('div', { class: 'exw-bubble-foot' }, [
          h('span', { class: 'exw-meta', text: m.meta || '' }),
          h('button', { type: 'button', class: 'exw-mini-btn', onclick: function () { copyText(m.content); } }, [icon('copy', 13), '복사']),
        ]),
      ]),
    ]);
  }

  function renderWelcome() {
    const p = MODE_PRESETS[state.mode];
    const quick = h('div', { class: 'exw-quick' });
    [['summarize', '판례·논문 두괄식 3단 요약'], ['qa', '헷갈리는 법률·전공 개념 즉문즉답'], ['refine', '답안지·노트 문장 압축 및 교정']].forEach(function (q) {
      quick.appendChild(h('button', {
        type: 'button', class: 'exw-quick-btn',
        onclick: function () { setMode(q[0]); insertSample(); },
      }, [h('span', { text: q[1] }), h('span', { class: 'exw-quick-arrow', 'aria-hidden': 'true', text: '→' })]));
    });
    return h('div', { class: 'exw-welcome' }, [
      h('div', { class: 'exw-welcome-mark', 'aria-hidden': 'true', text: 'EX' }),
      h('strong', { class: 'exw-welcome-title', text: 'K-EXAONE 2.5 스터디 어시스턴트' }),
      h('p', { class: 'exw-welcome-desc', text: p.description }),
      quick,
      getKey() ? null : h('button', { type: 'button', class: 'exw-setup-link', onclick: function () { openSettings(true); } }, [icon('key', 14), '먼저 API Key를 등록하세요']),
    ]);
  }

  function renderMessages() {
    if (!view) return;
    const list = view.list;
    list.innerHTML = '';
    if (state.messages.length === 0 && !state.loading) {
      list.appendChild(renderWelcome());
    } else {
      state.messages.forEach(function (m) { list.appendChild(buildMessage(m)); });
    }
    if (state.loading) {
      view.elapsed = h('span', { class: 'exw-elapsed', text: '0.0s' });
      list.appendChild(h('div', { class: 'exw-loading', 'aria-live': 'polite' }, [
        h('span', { class: 'exw-spinner', 'aria-hidden': 'true' }),
        h('span', { text: 'K-EXAONE 2.5 추론 중…' }),
        view.elapsed,
      ]));
    }
    renderSendBtn();
    list.scrollTop = list.scrollHeight;
  }

  function renderSendBtn() {
    if (!view) return;
    const btn = view.sendBtn;
    btn.innerHTML = '';
    if (state.loading) {
      btn.className = 'btn btn-sm exw-send stop';
      btn.append(icon('stop', 14), '중지');
      btn.setAttribute('aria-label', '응답 생성 중지');
    } else {
      btn.className = 'btn btn-primary btn-sm exw-send';
      btn.append('실행', icon('send', 14));
      btn.setAttribute('aria-label', '질문 보내기');
    }
  }

  function renderContextChip() {
    if (!view) return;
    view.ctxChip.innerHTML = '';
    if (!state.contextLabel) { view.ctxChip.hidden = true; return; }
    view.ctxChip.hidden = false;
    view.ctxChip.append(
      h('span', { text: '학습 맥락: ' + state.contextLabel }),
      h('button', { type: 'button', class: 'exw-mini-btn', 'aria-label': '학습 맥락 지우기', onclick: function () {
        state.contextLabel = ''; state.draft = ''; view.input.value = ''; updateCounter(); renderContextChip();
      } }, [icon('close', 12)])
    );
  }

  function updateCounter() {
    if (view) view.counter.textContent = (view.input.value.length).toLocaleString('ko-KR') + '자';
  }

  function openSettings(force) {
    state.settingsOpen = typeof force === 'boolean' ? force : !state.settingsOpen;
    if (!view) return;
    view.settings.hidden = !state.settingsOpen;
    if (state.settingsOpen) setTimeout(function () { if (view) view.keyInput.focus(); }, 0);
  }

  function buildSettings() {
    const keyInput = h('input', { type: 'password', class: 'exw-input', placeholder: '발급받은 EXAONE API Key 입력…', autocomplete: 'off', spellcheck: 'false', value: getKey(), 'aria-label': 'EXAONE API Key' });
    const endpointInput = h('input', { type: 'text', class: 'exw-input mono', value: state.endpoint, 'aria-label': 'API Endpoint URL' });
    const sysPrompt = h('textarea', { class: 'exw-input', rows: '4', 'aria-label': '현재 모드 시스템 프롬프트' });
    sysPrompt.value = systemPromptFor(state.mode);
    view.keyInput = keyInput;
    view.sysPrompt = sysPrompt;

    endpointInput.addEventListener('change', function () {
      state.endpoint = endpointInput.value.trim() || DEFAULT_ENDPOINT;
      endpointInput.value = state.endpoint;
      savePrefs();
    });
    sysPrompt.addEventListener('change', function () {
      const v = sysPrompt.value.trim();
      if (!v || v === MODE_PRESETS[state.mode].systemPrompt) delete state.systemPrompts[state.mode];
      else state.systemPrompts[state.mode] = v;
      savePrefs();
      toast(MODE_PRESETS[state.mode].label + ' 시스템 프롬프트를 저장했습니다.');
    });

    return h('section', { class: 'exw-settings', hidden: !state.settingsOpen, 'aria-label': 'EXAONE API Key 설정' }, [
      h('div', { class: 'exw-settings-head' }, [
        h('strong', {}, [icon('key', 14), 'EXAONE API Key 보안 설정']),
        h('a', { href: 'https://docs.exaone.ai', target: '_blank', rel: 'noopener noreferrer', text: '키 발급 안내 ↗' }),
      ]),
      h('p', { class: 'exw-help', text: '입력한 키는 이 기기의 브라우저(localStorage)에만 저장됩니다. 클라우드 동기화나 백업 파일에는 포함되지 않으므로 PC·휴대폰·태블릿에서 각각 한 번씩 등록해 주세요.' }),
      h('div', { class: 'exw-key-row' }, [
        keyInput,
        h('button', { type: 'button', class: 'exw-mini-btn', title: '키 보기/숨기기', 'aria-label': '키 보기/숨기기', onclick: function () { keyInput.type = keyInput.type === 'password' ? 'text' : 'password'; } }, [icon('eye', 14)]),
        h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: function () {
          const k = keyInput.value.trim();
          if (!k) { toast('API Key를 입력해 주세요.'); keyInput.focus(); return; }
          try { localStorage.setItem(STORAGE_KEY_API, k); } catch (e) {}
          renderKeyBadge(); openSettings(false); renderMessages();
          toast('API Key를 이 브라우저에 저장했습니다.');
        } }, '저장'),
        h('button', { type: 'button', class: 'btn btn-sm', onclick: function () {
          try { localStorage.removeItem(STORAGE_KEY_API); } catch (e) {}
          keyInput.value = ''; renderKeyBadge(); renderMessages();
          toast('저장된 API Key를 삭제했습니다.');
        } }, '삭제'),
      ]),
      h('details', { class: 'exw-adv' }, [
        h('summary', { text: '고급 설정 (API Endpoint · 시스템 프롬프트)' }),
        h('label', { class: 'exw-label', text: 'API Endpoint URL' }), endpointInput,
        h('label', { class: 'exw-label', text: '현재 모드 시스템 프롬프트 (비우면 기본값)' }), sysPrompt,
      ]),
    ]);
  }

  /* ---------------------------------------------------------------------
     동작
     --------------------------------------------------------------------- */
  function setMode(mode) {
    if (!MODE_PRESETS[mode]) return;
    state.mode = mode;
    state.effort = MODE_PRESETS[mode].effort; // 즉문즉답은 low, 요약/교정은 high 기본 추천
    savePrefs();
    renderModeTabs();
    if (state.messages.length === 0) renderMessages();
  }
  function insertSample() {
    if (!view) return;
    view.input.value = MODE_PRESETS[state.mode].sample;
    state.draft = view.input.value;
    updateCounter();
    view.input.focus();
  }
  function clearHistory() {
    if (state.loading && state.abort) state.abort.abort();
    state.messages = [];
    saveChat();
    renderMessages();
    toast('대화 기록을 비웠습니다.');
  }

  function startTick() {
    stopTick();
    tickTimer = setInterval(function () {
      if (view && view.elapsed) view.elapsed.textContent = ((performance.now() - state.startedAt) / 1000).toFixed(1) + 's';
    }, 100);
  }
  function stopTick() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }

  async function send() {
    if (state.loading) { if (state.abort) state.abort.abort(); return; }
    if (!view) return;
    const promptText = view.input.value.trim();
    if (!promptText) { view.input.focus(); return; }
    const apiKey = getKey();
    if (!apiKey) {
      openSettings(true);
      toast('먼저 EXAONE API Key를 입력해 주세요.');
      return;
    }

    const mode = state.mode;
    const effort = state.effort;
    // 직전 대화 최대 4개까지 문맥으로 포함 (오류 메시지는 제외)
    const recent = state.messages.filter(function (m) { return m.role === 'user' || m.role === 'assistant'; })
      .slice(-4).map(function (m) { return { role: m.role, content: m.content }; });

    state.messages.push({ role: 'user', content: promptText, meta: MODE_PRESETS[mode].label + ' · effort: ' + effort });
    state.draft = '';
    state.contextLabel = '';
    view.input.value = '';
    updateCounter();
    renderContextChip();
    saveChat();

    state.loading = true;
    state.startedAt = performance.now();
    const controller = new AbortController();
    state.abort = controller;
    const timeoutId = setTimeout(function () { controller.abort('timeout'); }, REQUEST_TIMEOUT_MS);
    renderMessages();
    startTick();

    const targetEndpoint = state.endpoint || DEFAULT_ENDPOINT;
    const reqPayload = {
      model: MODEL_NAME,
      reasoning_effort: effort,
      max_tokens: effort === 'low' ? 2048 : 4096, // max_tokens에는 내부 추론 토큰도 포함됨
      temperature: 0.3,
      messages: [{ role: 'system', content: systemPromptFor(mode) }].concat(recent, [{ role: 'user', content: promptText }]),
    };

    try {
      let res;
      if (hasExaoneExtBridge()) {
        // 1순위: 웨일/크롬 확장 앱(learnus-sync-extension v1.2.0+) 백그라운드 브리지 경유 (CORS 제한 없음)
        res = await fetchViaExtension(targetEndpoint, apiKey, reqPayload, controller.signal);
      } else if (isLocalServerOrigin() && targetEndpoint === DEFAULT_ENDPOINT) {
        // 2순위: 로컬 서버(server.ps1) 실행 중일 때 /api/exaone 프록시 경유
        res = await fetch('/api/exaone', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(reqPayload),
          signal: controller.signal,
        });
      } else {
        // 3순위: 직접 호출 (프록시 Endpoint 설정 시 또는 확장 앱 미감지 시)
        res = await fetch(targetEndpoint, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(reqPayload),
          signal: controller.signal,
        });
      }
      const elapsed = ((performance.now() - state.startedAt) / 1000).toFixed(1);
      if (!res.ok) {
        let detail = 'HTTP ' + res.status;
        const raw = await res.text().catch(function () { return ''; });
        try { const j = JSON.parse(raw); detail = (j.error && (j.error.message || j.error)) || j.message || raw; }
        catch (_) { if (raw) detail = raw.slice(0, 240); }
        let hint = '';
        if (res.status === 401 || res.status === 403) hint = '\n→ API Key가 올바른지, 만료되지 않았는지 확인해 주세요.';
        else if (res.status === 429) hint = '\n→ 무료 호출 한도(분당/일일)를 초과했습니다. 잠시 후 다시 시도해 주세요.';
        else if (res.status >= 500) hint = '\n→ EXAONE 서버 측 일시 오류입니다. 잠시 후 다시 시도해 주세요.';
        throw new Error('API 응답 오류 (' + res.status + '): ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) + hint);
      }
      const data = await res.json();
      const msg = data && data.choices && data.choices[0] && data.choices[0].message;
      const reply = (msg && msg.content) || '응답 텍스트가 비어 있습니다. 추론 깊이를 낮추거나 입력 내용을 확인해 주세요.';
      state.messages.push({ role: 'assistant', content: reply, meta: MODEL_NAME + ' · ' + elapsed + '초 · effort: ' + effort });
    } catch (err) {
      let text = (err && err.message) || '알 수 없는 오류가 발생했습니다.';
      let title = '요청 실패 진단';
      let needExtGuide = false;
      if (err && err.name === 'AbortError') {
        if (controller.signal.reason === 'timeout') text = '응답 시간이 ' + (REQUEST_TIMEOUT_MS / 1000) + '초를 넘어 요청을 중단했습니다. 추론 깊이를 low로 낮춰 다시 시도해 보세요.';
        else { text = '사용자가 응답 생성을 중지했습니다.'; title = '요청 중지'; }
      } else if (err && err.name === 'TypeError') {
        needExtGuide = true;
        if (hasLearnUsExtOnly()) {
          title = '확장 앱 새로고침(업데이트) 필요';
          text = '확장 앱에 K-EXAONE 2.5 연결 기능(v1.2.0)이 추가되었습니다! 아래 순서로 1회만 새로고침해 주세요.\n'
            + '1) 아래 버튼으로 확장 앱 관리 주소(whale://extensions 또는 chrome://extensions)를 복사해 주소창에 붙여넣고 이동합니다.\n'
            + '2) "논결(NONGYEOL) · LearnUs" 확장 앱 카드의 새로고침(↻) 아이콘을 클릭합니다.\n'
            + '3) 이 홈페이지 탭으로 돌아와 새로고침(F5) 후 다시 실행해 주세요!';
        } else {
          title = 'PC 확장 앱(CORS 우회 브리지) 연결 필요';
          text = '브라우저 CORS 보안 정책으로 인해 직접 호출이 차단되었습니다. 홈페이지 폴더의 확장 앱을 켜면 바로 해결됩니다.\n'
            + '1) 아래 버튼으로 확장 앱 관리 주소(whale://extensions 또는 chrome://extensions)를 복사해 주소창에 붙여넣고 이동합니다.\n'
            + '2) 이미 "논결(NONGYEOL)" 확장 앱이 있다면 새로고침(↻) 아이콘을 누르고, 없다면 우측 상단 "개발자 모드" 켜기 → "압축해제된 확장 앱 로드" → 홈페이지 폴더 안의 "learnus-sync-extension" 폴더를 선택합니다.\n'
            + '3) 이 홈페이지 탭을 새로고침(F5)하면 상단 배지가 "API 연결됨 · 확장앱 활성"으로 바뀌며 즉시 작동합니다!';
        }
      }
      state.messages.push({ role: 'error', content: text, meta: title, needExtGuide: needExtGuide });
    } finally {
      clearTimeout(timeoutId);
      state.loading = false;
      state.abort = null;
      stopTick();
      saveChat();
      renderMessages();
    }
  }

  /* ---------------------------------------------------------------------
     공개 API
     --------------------------------------------------------------------- */
  function mount(container) {
    if (!container) return;
    container.innerHTML = '';
    view = { root: container };

    view.keyBadge = h('button', { type: 'button', class: 'exw-key-badge', onclick: function () { openSettings(); } });
    const head = h('div', { class: 'exw-head' }, [
      h('div', { class: 'exw-brand' }, [
        h('span', { class: 'exw-logo', 'aria-hidden': 'true', text: 'EX' }),
        h('div', { class: 'exw-brand-text' }, [
          h('strong', { text: 'K-EXAONE 2.5' }),
          h('span', { text: 'LG AI Research · 학습 요약 어시스턴트' }),
        ]),
        view.keyBadge,
      ]),
      h('div', { class: 'exw-head-actions' }, [
        h('button', { type: 'button', class: 'ai-icon-btn', title: '예시 문장 채우기', 'aria-label': '예시 문장 채우기', onclick: insertSample }, [icon('sample')]),
        h('button', { type: 'button', class: 'ai-icon-btn', title: '대화 기록 비우기', 'aria-label': '대화 기록 비우기', onclick: clearHistory }, [icon('trash')]),
        h('button', { type: 'button', class: 'ai-icon-btn', title: 'API Key 설정', 'aria-label': 'API Key 설정', onclick: function () { openSettings(); } }, [icon('settings')]),
      ]),
    ]);

    view.settings = buildSettings();

    view.modeTabs = h('div', { class: 'exw-modes', role: 'tablist', 'aria-label': '작업 모드' });
    Object.keys(MODE_PRESETS).forEach(function (k) {
      view.modeTabs.appendChild(h('button', { type: 'button', role: 'tab', 'data-mode': k, onclick: function () { setMode(k); } }, MODE_PRESETS[k].label));
    });
    view.effortSel = h('select', { class: 'exw-effort', 'aria-label': '추론 깊이' }, [
      h('option', { value: 'low', text: 'low · 빠른 응답' }),
      h('option', { value: 'high', text: 'high · 깊은 추론' }),
      h('option', { value: 'max', text: 'max · 최대 추론' }),
    ]);
    view.effortSel.addEventListener('change', function () { state.effort = view.effortSel.value; savePrefs(); });
    const bar = h('div', { class: 'exw-bar' }, [view.modeTabs, view.effortSel]);

    view.list = h('div', { class: 'exw-list', 'aria-live': 'polite' });
    view.toast = h('div', { class: 'exw-toast', role: 'status', hidden: true });
    view.ctxChip = h('div', { class: 'exw-ctx', hidden: true });

    view.input = h('textarea', { class: 'exw-textarea', rows: '3', 'aria-label': 'EXAONE에게 보낼 내용' });
    view.input.value = state.draft;
    view.input.addEventListener('input', function () { state.draft = view.input.value; updateCounter(); });
    view.input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing) return; // 한글 조합 중 Enter는 무시
      if ((state.enterToSend && !e.shiftKey) || e.ctrlKey || e.metaKey) { e.preventDefault(); send(); }
    });
    view.counter = h('span', { text: '0자' });
    const enterChk = h('input', { type: 'checkbox', checked: state.enterToSend });
    enterChk.addEventListener('change', function () { state.enterToSend = enterChk.checked; savePrefs(); });
    view.sendBtn = h('button', { type: 'button', onclick: send });

    const foot = h('div', { class: 'exw-foot' }, [
      view.ctxChip,
      h('div', { class: 'exw-compose' }, [
        view.input,
        h('div', { class: 'exw-compose-bar' }, [
          h('div', { class: 'exw-compose-info' }, [
            view.counter, h('span', { 'aria-hidden': 'true', text: '·' }),
            h('label', { class: 'exw-enter' }, [enterChk, 'Enter로 전송']),
          ]),
          view.sendBtn,
        ]),
      ]),
    ]);

    container.classList.add('exw-root');
    container.append(head, view.settings, bar, view.list, view.toast, foot);

    renderKeyBadge();
    renderModeTabs();
    renderContextChip();
    updateCounter();
    renderMessages();
    if (state.loading) startTick();
  }

  // 홈페이지 다른 화면(답안 연습·강의 등)의 'AI에 묻기'에서 넘어온 학습 맥락을 입력창에 채워 줍니다.
  function setDraft(text, label) {
    state.draft = text || '';
    state.contextLabel = label || '';
    if (view && view.root && view.root.isConnected) {
      view.input.value = state.draft;
      updateCounter();
      renderContextChip();
    }
  }
  function focusInput() {
    if (view && view.input && view.root.isConnected) {
      view.input.focus();
      view.input.setSelectionRange(view.input.value.length, view.input.value.length);
    }
  }

  loadPrefs();
  window.addEventListener('message', function (e) {
    if (e.source === window && e.data && e.data.type === 'STUDY_HOME_EXT_READY') {
      renderKeyBadge();
    }
  });
  window.ExaoneWidget = {
    mount: mount,
    setDraft: setDraft,
    focus: focusInput,
    hasKey: function () { return getKey().length > 5; },
    isBusy: function () { return state.loading; },
  };
})();
