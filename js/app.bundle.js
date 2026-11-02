/* =========================================================================
   변리사 2차 수험 홈페이지 — 단일 번들
   file:// 로 더블클릭해서 바로 열 수 있도록 ES 모듈 없이 하나의 IIFE로 구성.
   기획 보고서(2026-11-01) P0 범위 전체 + 접근성/백업 반영.
   ========================================================================= */
(function () {
  'use strict';

  /* =======================================================================
     1. UTIL — DOM / 날짜 / 토스트 / 모달
     ======================================================================= */
  function el(tag, attrs, children) {
    attrs = attrs || {}; children = children == null ? [] : children;
    const node = document.createElement(tag);
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null || c === false) return;
      node.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 단색 선 아이콘 (보고서 8·9쪽: 색 이모지 대신 통일된 1-color 라인 아이콘, currentColor 상속)
  const ICON_PATHS = {
    home:   '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    week:   '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    tasks:  '<path d="M4 12l5 5L20 6"/>',
    answers:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    notes:  '<path d="M4 4h12l4 4v12H4z"/><path d="M16 4v4h4M8 13h8M8 17h5"/>',
    review: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v5h-5"/>',
    academic:'<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 3 2.5 6 2.5S18 18 18 17v-5"/>',
    log:    '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>',
    inbox:  '<path d="M4 13l2-8h12l2 8v5H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5H9.4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4.2l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.07-.3.1-.7.1-1z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    ai:     '<path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/><path d="M12 7.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/>',
    key:    '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L20 3"/><path d="M16 7l3 3"/><path d="M18.5 4.5l2.5 2.5"/>',
    trash:  '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>',
    dock:   '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    minimize:'<path d="M5 12h14"/>',
    expand: '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>',
  };
  function svgIcon(name) {
    const span = el('span', { class: 'ico', 'aria-hidden': 'true' });
    span.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICON_PATHS[name] || '') + '</svg>';
    return span;
  }

  function todayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dayKey(d) { return todayKey(d); }
  function parseKey(k) { const p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function getMonday(offset) { offset = offset || 0; const x = new Date(); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day + offset * 7); x.setHours(0, 0, 0, 0); return x; }
  const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

  function fmtDate(d) { if (!d) return ''; const x = typeof d === 'string' ? new Date(d) : d; return x.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }); }
  function fmtDateShort(d) { if (!d) return ''; const x = typeof d === 'string' ? new Date(d) : d; return x.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }); }
  function fmtTime(d) { if (!d) return ''; const x = typeof d === 'string' ? new Date(d) : d; return x.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }); }
  function fmtMin(min) { min = Math.round(min); const h = Math.floor(min / 60), m = min % 60; if (h && m) return h + '시간 ' + m + '분'; if (h) return h + '시간'; return m + '분'; }
  function minutesBetween(a, b) { return Math.max(0, (new Date(b) - new Date(a)) / 60000); }
  function clampNum(v, min, max) { v = Number(v) || 0; return Math.min(max, Math.max(min, v)); }
  function dday(examDate, confirmed) { if (!examDate || !confirmed) return null; return Math.round((parseKey(examDate) - parseKey(todayKey())) / 86400000); }

  let _toastWrap;
  function toast(msg, type, ms) {
    type = type || 'ok'; ms = ms || 3200;
    if (!_toastWrap) { _toastWrap = el('div', { class: 'toast-wrap', 'aria-live': 'polite', 'aria-atomic': 'true' }); document.body.append(_toastWrap); }
    const t = el('div', { class: 'toast ' + type, role: 'status' }, msg);
    _toastWrap.append(t);
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, ms);
  }

  function modal(opts) {
    const backdrop = el('div', { class: 'modal-backdrop', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title });
    const closeBtn = el('button', { class: 'btn btn-ghost btn-sm', 'aria-label': '닫기', onclick: close }, '✕');
    const m = el('div', { class: 'modal' }, [
      el('div', { class: 'modal-head' }, [el('h2', {}, opts.title), closeBtn]),
      el('div', { class: 'modal-body' }, opts.body),
      opts.footer ? el('div', { class: 'modal-foot' }, opts.footer) : null,
    ]);
    backdrop.append(m);
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey);
    document.body.append(backdrop);
    const focusable = m.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    (focusable[1] || focusable[0]) && (focusable[1] || focusable[0]).focus();
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab' && focusable.length) {
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    function close() { document.removeEventListener('keydown', onKey); backdrop.remove(); opts.onClose && opts.onClose(); }
    return { close: close, node: m };
  }

  function confirmDialog(message, o) {
    o = o || {};
    return new Promise(function (resolve) {
      const m = modal({
        title: '확인',
        body: el('p', {}, message),
        footer: [
          el('button', { class: 'btn', onclick: function () { m.close(); resolve(false); } }, '취소'),
          el('button', { class: 'btn ' + (o.danger ? 'btn-danger' : 'btn-primary'), onclick: function () { m.close(); resolve(true); } }, o.okText || '확인'),
        ],
      });
    });
  }

  /* =======================================================================
     2. STORE — localStorage 기반 저장소 + 백업/복원 (보고서 18·19쪽)
     ======================================================================= */
  const STORAGE_KEY = 'patent-study-home:v1';
  const SCHEMA_VERSION = 2;

  function defaultData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      settings: {
        examDate: null, examDateConfirmed: false,
        electiveSubject: '디자인보호법', weeklyExamGoalH: 30,
        theme: 'light', readingWide: false, createdAt: new Date().toISOString(), onboarded: false,
      },
      subjects: [
        { id: 'sub-patent', name: '특허법', kind: 'exam', color: '#355B36' },
        { id: 'sub-tm', name: '상표법', kind: 'exam', color: '#2f6f5e' },
        { id: 'sub-civ', name: '민사소송법', kind: 'exam', color: '#5a6f3a' },
        { id: 'sub-elec', name: '선택과목', kind: 'exam', color: '#78572C' },
      ],
      tasks: [], blocks: [], sessions: [], notes: [], answers: [],
      cards: [], courses: [], assignments: [], inbox: [], focusToday: [],
      reviews: [], retros: {}, lastOpenNote: null,
      // 주간 기준 계획(확정 목표) 보관: { 'YYYY-MM-DD(월요일)': { planMin, confirmedAt } }
      // 계획을 줄여도 이행률이 부풀려지지 않도록 '최초 확정'을 분리 보관 (보고서 6쪽)
      baselinePlans: {},
    };
  }

  const Store = (function () {
    let _data = null, _loadError = null, _saveTimer = null, _lastSaveAt = null, _saveFailed = false;
    const _listeners = new Set();

    function migrate(d) {
      const base = defaultData();
      return Object.assign({}, base, d, { settings: Object.assign({}, base.settings, d.settings || {}) });
    }
    function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) { _data = defaultData(); return; }
        _data = migrate(JSON.parse(raw)); _loadError = null;
      } catch (e) { _loadError = e; _data = defaultData(); console.error('불러오기 실패 — 마지막 저장본 보존', e); }
    }
    function save() { clearTimeout(_saveTimer); _saveTimer = setTimeout(commit, 400); }
    function commit() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_data));
        _lastSaveAt = new Date(); _saveFailed = false;
        // 실제 저장 성공을 알림 → 화면의 "저장됨" 표시는 이 이벤트 이후에만 (보고서 4쪽 P0)
        window.dispatchEvent(new CustomEvent('store:saved', { detail: { at: _lastSaveAt } }));
      }
      catch (e) { _saveFailed = true; console.error('저장 실패', e); window.dispatchEvent(new CustomEvent('store:save-failed', { detail: e })); }
      emit();
    }
    function emit() { _listeners.forEach(function (fn) { try { fn(_data); } catch (e) { console.error(e); } }); }

    return {
      init: function () { load(); return this; },
      data: function () { return _data; },
      loadError: function () { return _loadError; },
      saveInfo: function () { return { at: _lastSaveAt, failed: _saveFailed }; },
      subscribe: function (fn) { _listeners.add(fn); return function () { _listeners.delete(fn); }; },
      update: function (m) { m(_data); _data.updatedAt = new Date().toISOString(); save(); emit(); },
      commitNow: commit,
      // 외부(클라우드)에서 받은 전체 데이터로 교체. silent=true면 다시 클라우드로 올리지 않도록 이벤트만 다르게.
      replaceAll: function (incoming, opts) {
        opts = opts || {};
        _data = migrate(incoming);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_data)); _lastSaveAt = new Date(); } catch (e) {}
        if (opts.fromCloud) { _data.__fromCloud = true; }
        emit();
        if (_data.__fromCloud) { delete _data.__fromCloud; }
      },
      id: function (p) { return (p || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); },
      subject: function (id) { return _data.subjects.find(function (s) { return s.id === id; }) || null; },
      task: function (id) { return _data.tasks.find(function (t) { return t.id === id; }) || null; },
      note: function (id) { return _data.notes.find(function (n) { return n.id === id; }) || null; },
      exportJSON: function () {
        return JSON.stringify({ app: 'patent-study-home', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: _data }, null, 2);
      },
      // 백업 파일 검증 (보고서 4쪽: 검증 단계). 문제가 있으면 상세 메시지와 함께 throw.
      validateImport: function (text) {
        let parsed;
        try { parsed = JSON.parse(text); }
        catch (e) { throw new Error('JSON 형식이 아닙니다. 올바른 백업 파일인지 확인하세요.'); }
        const incoming = parsed.data || parsed;
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw new Error('데이터 구조가 올바르지 않습니다.');
        // 앱 식별자(있으면) 확인
        if (parsed.app && parsed.app !== 'patent-study-home') throw new Error('다른 앱의 백업 파일로 보입니다 (app=' + parsed.app + ').');
        // 컬렉션은 배열이어야 함
        const cols = ['tasks','blocks','sessions','notes','answers','cards','courses','assignments','inbox','reviews','subjects'];
        const issues = [];
        cols.forEach(function (c) {
          if (incoming[c] != null && !Array.isArray(incoming[c])) issues.push(c + ' 필드가 목록이 아님');
          (incoming[c] || []).forEach(function (x, i) {
            if (x == null || typeof x !== 'object') issues.push(c + '[' + i + '] 항목 형식 오류');
            else if (!x.id) issues.push(c + '[' + i + '] id 누락');
          });
        });
        if (issues.length) throw new Error('검증 실패: ' + issues.slice(0, 5).join(', ') + (issues.length > 5 ? ' 외 ' + (issues.length - 5) + '건' : ''));
        // 미리보기용 건수 요약
        const summary = {};
        cols.forEach(function (c) { summary[c] = (incoming[c] || []).length; });
        return { incoming: incoming, schemaVersion: parsed.schemaVersion || incoming.schemaVersion || 1, summary: summary };
      },
      importJSON: function (text, mode) {
        mode = mode || 'replace';
        const v = this.validateImport(text);           // 검증 (실패 시 throw)
        const incoming = v.incoming;
        // 보호: 교체 전 현재 데이터 스냅샷을 임시 키에 보관 (보고서 4쪽: 보호 단계)
        try { localStorage.setItem(STORAGE_KEY + ':pre-import', JSON.stringify(_data)); } catch (e) {}
        // 적용: 임시로 만든 새 상태를 검증 후 전환 (원자적 교체)
        let next;
        if (mode === 'replace') { next = migrate(incoming); }
        else {
          // 병합: 동일 ID는 updatedAt 최신 우선, 없으면 기존 유지 + 신규 추가
          next = migrate(_data);
          ['tasks','blocks','sessions','notes','answers','cards','courses','assignments','inbox','reviews','subjects'].forEach(function (c) {
            const byId = {};
            (next[c] || []).forEach(function (x) { byId[x.id] = x; });
            (incoming[c] || []).forEach(function (x) {
              const cur = byId[x.id];
              if (!cur) { next[c].push(x); byId[x.id] = x; }
              else {
                const ct = cur.updatedAt ? Date.parse(cur.updatedAt) : 0;
                const xt = x.updatedAt ? Date.parse(x.updatedAt) : 0;
                if (xt > ct) Object.assign(cur, x);   // 더 최신 내용만 반영
              }
            });
          });
        }
        _data = next;
        commit();                                       // 확인: 실제 저장
        return true;
      },
      counts: function () {
        return {
          과업: _data.tasks.length, 계획블록: _data.blocks.length, 세션: _data.sessions.length,
          노트: _data.notes.length, 답안: _data.answers.length, 카드: _data.cards.length,
          강좌: _data.courses.length, 과제: _data.assignments.length,
        };
      },
    };
  })();

  /* =======================================================================
     3. TIMER — 집중 세션 기록 (보고서 6·18쪽)
     ======================================================================= */
  const Timer = (function () {
    const ACTIVE_KEY = 'patent-study-home:active-session';
    let tick = null;
    function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
    function sset(k, v) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }

    const T = {
      current: function () { try { return JSON.parse(sget(ACTIVE_KEY)); } catch (e) { return null; } },
      start: function (taskId, subjectId, title) {
        if (this.current()) this.stop(true);
        const s = { id: Store.id('ses'), taskId: taskId, subjectId: subjectId, title: title, start: new Date().toISOString() };
        sset(ACTIVE_KEY, JSON.stringify(s)); this._mount(); return s;
      },
      stop: function (silent) {
        const s = this.current(); if (!s) return;
        const end = new Date().toISOString();
        Store.update(function (d) { d.sessions.push({ id: s.id, taskId: s.taskId, subjectId: s.subjectId, start: s.start, end: end, breakMin: 0, source: 'timer' }); });
        sset(ACTIVE_KEY, null); this._unmount();
        if (!silent) { const min = Math.round((new Date(end) - new Date(s.start)) / 60000); toast('세션 기록 완료 · ' + min + '분. 계획과 실제는 따로 집계됩니다.', 'ok'); }
      },
      _mount: function () {
        const banner = document.getElementById('focus-banner'); if (!banner) return;
        const self = this;
        function render() {
          const s = self.current(); if (!s) { self._unmount(); return; }
          const sec = Math.floor((Date.now() - new Date(s.start)) / 1000);
          const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
          const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
          const ss = String(sec % 60).padStart(2, '0');
          banner.classList.add('active'); banner.innerHTML = '';
          banner.append(el('div', { class: 'focus-banner-inner' }, [
            el('span', {}, '집중 중:'), el('strong', {}, s.title || '수험 공부'),
            el('span', { class: 'timer-val' }, hh + ':' + mm + ':' + ss),
            el('span', { class: 'spacer' }),
            el('button', { class: 'btn btn-sm', style: 'background:#fff;border-color:transparent', onclick: function () { self.stop(); } }, '세션 종료 · 기록'),
          ]));
        }
        clearInterval(tick); tick = setInterval(render, 1000); render();
      },
      _unmount: function () { clearInterval(tick); const b = document.getElementById('focus-banner'); if (b) { b.classList.remove('active'); b.innerHTML = ''; } window.dispatchEvent(new CustomEvent('timer:changed')); },
      resumeIfActive: function () { if (this.current()) this._mount(); },
    };
    return T;
  })();

  /* =======================================================================
     3-b. AiStore — AI 키·대화 기록 전용 저장소 (기기 로컬 전용)
     ⚠️ API 키와 대화는 메인 Store(클라우드 동기화 대상)와 분리해 별도 로컬 키에 저장합니다.
        → Firebase 동기화를 켜도 키/대화는 절대 클라우드로 올라가지 않습니다.
     ======================================================================= */
  const AI_STORAGE_KEY = 'patent-study-home:ai:v1';
  const GEMINI_MODELS = [
    { id: 'gemini-4-argon', label: 'Gemini 4 Argon (추론 · 유료 키)' },
    { id: 'flash-auto',     label: 'Gemini Flash (빠름 · 무료 호환)' },
  ];
  const GEMINI_THINKING_LEVELS = [
    { id: 'LOW',    label: '추론: 낮음' },
    { id: 'MEDIUM', label: '추론: 보통' },
    { id: 'HIGH',   label: '추론: 높음' },
  ];
  const AiStore = (function () {
    let _d = null;
    function def() {
      const desktopDefault = typeof window !== 'undefined' ? window.innerWidth >= 900 : true;
      return {
        keys: { gpt: '', gemini: '', claude: '' },
        provider: 'gemini',
        geminiModel: 'gemini-4-argon',
        geminiThinking: 'MEDIUM',
        widgetOpen: desktopDefault,
        widgetDocked: false,
        chats: { gpt: [], gemini: [], claude: [] },
      };
    }
    function load() {
      try { const raw = localStorage.getItem(AI_STORAGE_KEY); _d = raw ? Object.assign(def(), JSON.parse(raw)) : def(); }
      catch (e) { _d = def(); }
      _d.keys = Object.assign({ gpt: '', gemini: '', claude: '' }, _d.keys || {});
      _d.chats = Object.assign({ gpt: [], gemini: [], claude: [] }, _d.chats || {});
      if (!GEMINI_MODELS.some(function (m) { return m.id === _d.geminiModel; })) _d.geminiModel = 'gemini-4-argon';
      if (!GEMINI_THINKING_LEVELS.some(function (t) { return t.id === _d.geminiThinking; })) _d.geminiThinking = 'MEDIUM';
    }
    function persist() { try { localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(_d)); } catch (e) { console.error('AI 저장 실패', e); } }
    return {
      init: function () { load(); return this; },
      data: function () { return _d; },
      getKey: function (p) { return (_d.keys[p] || '').trim(); },
      setKey: function (p, v) { _d.keys[p] = (v || '').trim(); persist(); },
      hasKey: function (p) { return !!this.getKey(p); },
      provider: function () { return _d.provider; },
      setProvider: function (p) { _d.provider = p; persist(); },
      geminiModel: function () { return _d.geminiModel || 'gemini-4-argon'; },
      setGeminiModel: function (m) { _d.geminiModel = m; persist(); },
      geminiThinking: function () { return _d.geminiThinking || 'MEDIUM'; },
      setGeminiThinking: function (lv) { _d.geminiThinking = lv; persist(); },
      widgetOpen: function () { return !!_d.widgetOpen; },
      setWidgetOpen: function (open) { _d.widgetOpen = !!open; persist(); },
      widgetDocked: function () { return !!_d.widgetDocked; },
      setWidgetDocked: function (docked) { _d.widgetDocked = !!docked; persist(); },
      chat: function (p) { return _d.chats[p] || (_d.chats[p] = []); },
      pushMessage: function (p, msg) {
        const c = this.chat(p);
        c.push(msg);
        // 오래된 메시지의 apiParts(서명 데이터)는 최근 6개만 남겨 localStorage 용량 보호
        let sigCount = 0;
        for (let i = c.length - 1; i >= 0; i--) {
          if (c[i] && c[i].apiParts) {
            sigCount++;
            if (sigCount > 6) delete c[i].apiParts;
          }
        }
        persist();
      },
      replaceLast: function (p, msg) { const c = this.chat(p); c[c.length - 1] = msg; persist(); },
      clearChat: function (p) { _d.chats[p] = []; persist(); },
    };
  })();

  // 응답이 안 오면 무한 대기하지 않도록 타임아웃을 건 fetch (기본 45초, 추론 모델은 별도 지정)
  function fetchWithTimeout(url, opts, ms) {
    opts = opts || {};
    const ctl = new AbortController();
    const limitSec = Math.round((ms || 45000) / 1000);
    const t = setTimeout(function () { ctl.abort(); }, ms || 45000);
    return fetch(url, Object.assign({}, opts, { signal: ctl.signal }))
      .catch(function (e) {
        if (e && e.name === 'AbortError') throw new Error('응답 시간이 초과되었습니다(' + limitSec + '초). 네트워크 상태를 확인하거나 추론 수준을 낮춰 다시 시도하세요.');
        throw e;
      })
      .finally(function () { clearTimeout(t); });
  }

  // 각 제공업체 호출 — 사용자의 키로 브라우저에서 직접 요청 (방법 A)
  const AI_PROVIDERS = {
    gpt: {
      name: 'ChatGPT', vendor: 'OpenAI', badge: 'GPT', model: 'gpt-4o-mini',
      modelLabel: function () { return this.model; },
      keyHint: 'OpenAI API 키 (sk-... 로 시작). platform.openai.com → API keys 에서 발급',
      keyUrl: 'https://platform.openai.com/api-keys',
      async send(key, history) {
        const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
          body: JSON.stringify({ model: this.model, messages: history.map(function (m) { return { role: m.role, content: m.content }; }) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
        return { text: data.choices[0].message.content };
      },
    },
    gemini: {
      name: 'Gemini', vendor: 'Google', badge: 'G', model: 'gemini-4-argon',
      modelLabel: function () {
        if (AiStore.geminiModel() === 'gemini-4-argon') return 'gemini-4-argon · ' + AiStore.geminiThinking();
        return this._resolvedFlash || 'gemini-flash';
      },
      keyHint: 'Google AI Studio API 키 (aistudio.google.com 발급). ※ Gemini 4 Argon은 결제(Billing)가 연결된 유료 키에서만 동작하며, 무료 키는 Gemini Flash를 선택하세요.',
      keyUrl: 'https://aistudio.google.com/app/apikey',
      _resolvedFlash: null,
      _resolvedArgon: null,
      _flashCandidates: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'],
      async _call(key, apiVer, modelName, contents, generationConfig, timeoutMs) {
        const payload = { contents: contents };
        if (generationConfig) payload.generationConfig = generationConfig;
        const res = await fetchWithTimeout('https://generativelanguage.googleapis.com/' + apiVer + '/models/' + modelName + ':generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify(payload),
        }, timeoutMs);
        const data = await res.json();
        return { ok: res.ok, status: res.status, data: data };
      },
      async _listUsable(key) {
        const res = await fetchWithTimeout('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': key } });
        const data = await res.json();
        if (!res.ok) throw new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
        return (data.models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; });
      },
      async _discoverFlash(key) {
        const usable = await this._listUsable(key);
        const pick = usable.find(function (m) { return /flash/i.test(m.name) && !/thinking|image|tts|live/i.test(m.name); }) || usable[0];
        if (!pick) throw new Error('이 키로 쓸 수 있는 generateContent 모델이 없습니다.');
        return pick.name.replace(/^models\//, '');
      },
      async _discoverArgon(key) {
        const usable = await this._listUsable(key);
        const pick = usable.find(function (m) { return /argon/i.test(m.name); });
        return pick ? pick.name.replace(/^models\//, '') : null;
      },
      _extract(data, modelTag) {
        const cand = data.candidates && data.candidates[0];
        if (!cand || !cand.content || !cand.content.parts) throw new Error('응답이 비었습니다 (안전 필터 등으로 차단되었을 수 있어요).');
        const parts = cand.content.parts;
        // 추론 모델의 내부 생각(thought: true) 파트는 화면 표시에서 제외하고 최종 답변만 추출
        const visible = parts.filter(function (p) { return !p.thought; });
        const text = (visible.length ? visible : parts).map(function (p) { return p.text || ''; }).join('');
        // 멀티턴 thoughtSignature가 포함된 경우 다음 턴 호환을 위해 보존
        const hasSig = parts.some(function (p) { return !!p.thoughtSignature; });
        return { text: text, apiParts: hasSig ? parts : null, geminiModel: modelTag };
      },
      _buildContents(history, targetTag, useApiParts) {
        return history.map(function (m) {
          if (m.role === 'assistant') {
            if (useApiParts && m.apiParts && m.geminiModel === targetTag) return { role: 'model', parts: m.apiParts };
            return { role: 'model', parts: [{ text: m.content }] };
          }
          return { role: 'user', parts: [{ text: m.content }] };
        });
      },
      async _callWithFallbackParts(key, apiVer, modelName, history, tag, genCfg, timeoutMs) {
        const richContents = this._buildContents(history, tag, true);
        const hasRich = history.some(function (m) { return m.role === 'assistant' && m.apiParts && m.geminiModel === tag; });
        let r = await this._call(key, apiVer, modelName, richContents, genCfg, timeoutMs);
        if (!r.ok && r.status === 400 && hasRich) {
          // 서명 포맷 불일치 시 순수 텍스트 히스토리로 자동 재시도
          const plainContents = this._buildContents(history, tag, false);
          r = await this._call(key, apiVer, modelName, plainContents, genCfg, timeoutMs);
        }
        return r;
      },
      async send(key, history) {
        const mode = AiStore.geminiModel();

        // 1) Gemini 4 Argon (추론 모델) 호출 경로
        if (mode === 'gemini-4-argon') {
          const level = AiStore.geminiThinking() || 'MEDIUM';
          const genCfg = { thinkingConfig: { thinkingLevel: level } };
          const timeoutMs = 120000;
          const target = this._resolvedArgon || 'gemini-4-argon';

          let r = await this._callWithFallbackParts(key, 'v1beta', target, history, 'argon', genCfg, timeoutMs);
          if (r.ok) { this._resolvedArgon = target; return this._extract(r.data, 'argon'); }

          let errMsg = (r.data && r.data.error && r.data.error.message) || ('HTTP ' + r.status);
          // v1beta에서 모델을 못 찾으면 v1beta1 및 ListModels 내 Argon 모델명 자동 탐색
          if (/not found|not supported|is not found|unsupported/i.test(errMsg)) {
            const rBeta1 = await this._callWithFallbackParts(key, 'v1beta1', 'gemini-4-argon', history, 'argon', genCfg, timeoutMs);
            if (rBeta1.ok) return this._extract(rBeta1.data, 'argon');

            const foundArgon = await this._discoverArgon(key).catch(function () { return null; });
            if (foundArgon) {
              const rDisc = await this._callWithFallbackParts(key, 'v1beta', foundArgon, history, 'argon', genCfg, timeoutMs);
              if (rDisc.ok) { this._resolvedArgon = foundArgon; return this._extract(rDisc.data, 'argon'); }
              errMsg = (rDisc.data && rDisc.data.error && rDisc.data.error.message) || errMsg;
            } else {
              throw new Error('현재 API 키에서 Gemini 4 Argon(gemini-4-argon) 모델을 사용할 수 없습니다. Argon 모델은 Google AI Studio에서 유료 결제(Billing)가 연결된 키에서만 제공됩니다. 무료 키를 사용 중이라면 모델 선택을 "Gemini Flash"로 변경해 주세요.');
            }
          }
          if (r.status === 429 || r.status === 403 || /quota|billing|free tier|limit:\s*0|permission|resource.*exhausted/i.test(errMsg)) {
            throw new Error('Gemini 4 Argon 호출이 제한되었습니다(무료 티어 미지원 또는 한도 초과). 무료 API 키를 사용 중이라면 모델 선택을 "Gemini Flash (무료 호환)"로 바꾸거나 Google AI Studio에서 결제(Billing)를 연결해 주세요. [' + errMsg + ']');
          }
          throw new Error(errMsg);
        }

        // 2) Gemini Flash 자동 선택 경로 (무료 티어 호환)
        if (this._resolvedFlash) {
          const r = await this._callWithFallbackParts(key, 'v1beta', this._resolvedFlash, history, 'flash', null, 45000);
          if (r.ok) return this._extract(r.data, 'flash');
          this._resolvedFlash = null;
        }
        let lastErr = null;
        for (const name of this._flashCandidates) {
          const r = await this._callWithFallbackParts(key, 'v1beta', name, history, 'flash', null, 45000);
          if (r.ok) { this._resolvedFlash = name; return this._extract(r.data, 'flash'); }
          lastErr = (r.data && r.data.error && r.data.error.message) || ('HTTP ' + r.status);
          if (!/not found|not supported|is not found|unsupported/i.test(lastErr)) throw new Error(lastErr);
        }
        const discovered = await this._discoverFlash(key);
        this._resolvedFlash = discovered;
        const r2 = await this._callWithFallbackParts(key, 'v1beta', discovered, history, 'flash', null, 45000);
        if (r2.ok) return this._extract(r2.data, 'flash');
        throw new Error((r2.data && r2.data.error && r2.data.error.message) || lastErr || ('HTTP ' + r2.status));
      },
    },
    claude: {
      name: 'Claude', vendor: 'Anthropic', badge: 'C', model: 'claude-3-5-sonnet-20241022',
      modelLabel: function () { return this.model; },
      keyHint: 'Anthropic API 키 (sk-ant-... 로 시작). console.anthropic.com → API Keys 에서 발급',
      keyUrl: 'https://console.anthropic.com/settings/keys',
      async send(key, history) {
        const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({ model: this.model, max_tokens: 1024, messages: history.map(function (m) { return { role: m.role, content: m.content }; }) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
        return { text: (data.content || []).map(function (b) { return b.text || ''; }).join('') };
      },
    },
  };

  /* =======================================================================
     4. 공용 유틸 (뷰 간 공유)
     ======================================================================= */
  function isExam(d, b) { if (b.kind) return b.kind === 'exam'; const s = d.subjects.find(function (x) { return x.id === b.subjectId; }); return s ? s.kind === 'exam' : true; }
  function sumNonOverlap(blocks) {
    if (!blocks.length) return 0;
    const sorted = blocks.slice().sort(function (a, b) { return a.start.localeCompare(b.start); });
    let total = 0, lastEnd = null;
    sorted.forEach(function (b) {
      const s = new Date(b.start), e = new Date(b.end);
      const start = lastEnd && s < lastEnd ? lastEnd : s;
      if (e > start) total += (e - start) / 60000;
      if (!lastEnd || e > lastEnd) lastEnd = e;
    });
    return total;
  }

  /* =======================================================================
     5. 과업 편집기 + 과업 목록 (보고서 18쪽)
     ======================================================================= */
  function openTaskEditor(task, ctx, opts) {
    opts = opts || {};
    const d = Store.data();
    const isNew = !task;
    const t = task || { id: null, title: '', subjectId: d.subjects[0] && d.subjects[0].id, area: '학습', importance: 2, due: '', estMin: 60, status: 'todo' };

    const title = el('input', { type: 'text', value: t.title, placeholder: '예: 특허법 기출 답안 작성' });
    const subject = el('select', {});
    d.subjects.forEach(function (s) { subject.append(el('option', { value: s.id, selected: s.id === t.subjectId }, s.name)); });
    const area = el('select', {});
    ['실전 답안', '취약 쟁점', '회독·복습', '단권화', '학습', '기타'].forEach(function (a) { area.append(el('option', { value: a, selected: a === t.area }, a)); });
    const importance = el('select', {});
    [[3, '높음'], [2, '보통'], [1, '낮음']].forEach(function (p) { importance.append(el('option', { value: p[0], selected: Number(p[0]) === Number(t.importance) }, p[1])); });
    const due = el('input', { type: 'date', value: t.due ? t.due.slice(0, 10) : '' });
    const est = el('input', { type: 'number', min: '5', step: '5', value: t.estMin || 60 });
    const pinCb = opts.pinToday ? el('input', { type: 'checkbox', checked: true, style: 'width:20px;min-height:20px' }) : null;

    const body = el('div', {}, [
      el('div', { class: 'field' }, [el('label', {}, '과업 제목'), title]),
      el('div', { class: 'field-row' }, [
        el('div', { class: 'field' }, [el('label', {}, '과목'), subject]),
        el('div', { class: 'field' }, [el('label', {}, '영역'), area]),
      ]),
      el('div', { class: 'field-row' }, [
        el('div', { class: 'field' }, [el('label', {}, '중요도'), importance]),
        el('div', { class: 'field' }, [el('label', {}, '예상 시간(분)'), est]),
      ]),
      el('div', { class: 'field' }, [el('label', {}, '마감일 (선택)'), due, el('p', { class: 'hint' }, '고정 마감은 주간 계획에서 수험 시간보다 우선 보호됩니다.')]),
      pinCb ? el('label', { class: 'row', style: 'gap:8px' }, [pinCb, '오늘의 핵심 과업에 추가']) : null,
    ]);

    const footer = [
      !isNew ? el('button', { class: 'btn btn-danger', onclick: async function () {
        if (await ctx.confirm('이 과업을 삭제할까요? 연결된 세션 기록은 보존됩니다.', { danger: true, okText: '삭제' })) {
          Store.update(function (dd) { dd.tasks = dd.tasks.filter(function (x) { return x.id !== t.id; }); dd.focusToday = dd.focusToday.filter(function (id) { return id !== t.id; }); });
          m.close(); ctx.refresh(); ctx.toast('삭제했습니다.');
        }
      } }, '삭제') : null,
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'),
      el('button', { class: 'btn btn-primary', onclick: save }, '저장'),
    ];
    const m = ctx.modal({ title: isNew ? '새 수험 과업' : '과업 편집', body: body, footer: footer });

    function save() {
      if (!title.value.trim()) { title.focus(); ctx.toast('제목을 입력하세요.', 'warn'); return; }
      Store.update(function (dd) {
        if (isNew) {
          const nt = { id: Store.id('task'), title: title.value.trim(), subjectId: subject.value, area: area.value, importance: Number(importance.value), due: due.value || '', estMin: clampNum(est.value, 5, 1440), status: 'todo', createdAt: new Date().toISOString() };
          dd.tasks.push(nt);
          if (pinCb && pinCb.checked && dd.focusToday.length < 3) dd.focusToday.push(nt.id);
        } else {
          const ex = dd.tasks.find(function (x) { return x.id === t.id; });
          Object.assign(ex, { title: title.value.trim(), subjectId: subject.value, area: area.value, importance: Number(importance.value), due: due.value || '', estMin: clampNum(est.value, 5, 1440) });
        }
      });
      m.close(); ctx.refresh(); ctx.toast(isNew ? '과업을 추가했습니다.' : '저장했습니다.');
    }
  }

  function renderTasks(root, ctx) {
    const d = Store.data();
    root.append(el('p', { class: 'page-intro' }, '모든 수험 과업을 관리합니다. 과업 하나를 여러 블록에 나누어 공부해도 중복이 생기지 않습니다.'));
    root.append(el('div', { class: 'section-head' }, [el('h2', {}, '과업 ' + d.tasks.length + '개'), el('button', { class: 'btn btn-primary', onclick: function () { openTaskEditor(null, ctx); } }, '+ 새 과업')]));
    if (d.tasks.length === 0) {
      root.append(el('div', { class: 'empty' }, [el('span', { class: 'emoji' }, '🗂️'), el('h3', {}, '첫 과업을 만들어 보세요'), el('button', { class: 'btn btn-primary', onclick: function () { openTaskEditor(null, ctx); } }, '첫 과업 만들기')]));
      return;
    }
    const open = d.tasks.filter(function (t) { return t.status !== 'done'; });
    const done = d.tasks.filter(function (t) { return t.status === 'done'; });
    const list = el('div', { class: 'list' });
    open.concat(done).forEach(function (t) {
      const sub = Store.subject(t.subjectId);
      const check = el('input', { type: 'checkbox', checked: t.status === 'done', style: 'width:22px;min-height:22px', 'aria-label': '완료 표시' });
      check.addEventListener('change', function () { Store.update(function (dd) { dd.tasks.find(function (x) { return x.id === t.id; }).status = check.checked ? 'done' : 'todo'; }); ctx.refresh(); });
      list.append(el('div', { class: 'item' + (t.status === 'done' ? ' done' : '') }, [
        check,
        el('div', { class: 'main' }, [
          el('div', { class: 'title' }, t.title),
          el('div', { class: 'meta' }, [sub ? el('span', { class: 'tag tag-exam' }, sub.name) : '', ' · ' + t.area, t.estMin ? ' · 예상 ' + Math.round(t.estMin / 60 * 10) / 10 + 'h' : '', t.due ? ' · 마감 ' + t.due.slice(5) : '']),
        ]),
        el('button', { class: 'btn btn-sm', onclick: function () { openTaskEditor(t, ctx); } }, '편집'),
      ]));
    });
    root.append(list);
  }

  /* =======================================================================
     6. 홈 — 오늘의 수험 (보고서 6·7쪽)
     ======================================================================= */
  function renderHome(root, ctx) {
    const d = Store.data();
    const tk = todayKey();
    const metrics = homeMetrics(d, tk);

    // (상단) 시험일은 작은 상태 배지로만 (보고서 10쪽: 빈 지표가 첫 화면을 차지하지 않게)
    const dd0 = dday(d.settings.examDate, d.settings.examDateConfirmed);
    const statusRow = el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center' });
    if (dd0 == null) {
      statusRow.append(
        el('span', { class: 'tag tag-muted' }, '시험일 설정 전'),
        el('button', { class: 'btn btn-sm btn-ghost', style: 'min-height:32px', onclick: function () { ctx.navigate('settings'); } }, '설정하기'),
      );
    } else {
      statusRow.append(
        el('span', { class: 'tag tag-exam' }, '변리사 2차 D-' + (dd0 >= 0 ? dd0 : '지남')),
        el('span', { class: 'hint' }, fmtDate(parseKey(d.settings.examDate)) + ' 시험'),
      );
    }
    root.append(statusRow);

    // (①) 지금 할 공부 — 가장 크게. 진행 중 세션 > 다음 블록 > 첫 핵심 과업 순
    root.append(buildNowCard(d, ctx));

    const grid = el('div', { class: 'grid grid-7to3' });
    const left = el('div', { class: 'stack' });

    // (②) 오늘의 흐름 — 오늘 블록을 시간순 타임라인으로
    left.append(buildTodayFlow(d, ctx));

    // 오늘의 핵심 과업(최대 3) — 지금 할 공부 외 나머지
    const focusTasks = d.focusToday.map(function (id) { return Store.task(id); }).filter(Boolean);
    const focusCard = el('div', { class: 'card' });
    focusCard.append(el('div', { class: 'section-head' }, [el('h3', {}, '오늘의 핵심 과업'), el('button', { class: 'btn btn-sm', onclick: function () { openFocusPicker(ctx); } }, '과업 선택')]));
    if (focusTasks.length === 0) {
      focusCard.append(el('p', { class: 'hint' }, '가장 중요한 수험 과업을 최대 3개까지 골라 두면 여기와 "지금 할 공부"에 나타납니다.'));
      focusCard.append(el('button', { class: 'btn btn-sm', style: 'margin-top:8px', onclick: function () { openTaskEditor(null, ctx, { pinToday: true }); } }, '첫 과업 만들기'));
    } else {
      const list = el('div', { class: 'stack' });
      focusTasks.forEach(function (t, i) { list.append(focusItem(t, i, ctx)); });
      focusCard.append(list);
    }
    left.append(focusCard);
    grid.append(left);

    // (오른쪽) ③ 복습 · ④ 학업 마감 + 작은 지표
    const right = el('div', { class: 'stack' });

    const revCard = el('div', { class: 'card' });
    revCard.append(el('h3', {}, '다시 볼 쟁점'));
    if (metrics.dueReviews == null) { revCard.append(el('p', { class: 'hint' }, '복습 카드가 아직 없습니다.')); revCard.append(el('button', { class: 'btn btn-sm', onclick: function () { ctx.navigate('review'); } }, '첫 카드 만들기')); }
    else if (metrics.dueReviews === 0) { revCard.append(el('p', { class: 'hint' }, '오늘 복습할 카드가 없습니다.')); }
    else { revCard.append(el('p', {}, [el('strong', {}, metrics.dueReviews + '개'), ' 의 카드 · 취약 쟁점부터'])); revCard.append(el('button', { class: 'btn btn-primary btn-sm', style: 'margin-top:4px', onclick: function () { ctx.navigate('review'); } }, '복습 시작')); }
    right.append(revCard);

    const acadCard = el('div', { class: 'card', style: 'background:var(--acad-bg)' });
    acadCard.append(el('h3', {}, '놓치면 안 되는 학업'));
    const upcoming = upcomingAssignments(d);
    if (upcoming.length === 0) acadCard.append(el('p', { class: 'hint', style: 'color:var(--acad-fg)' }, '임박한 과제 마감이 없습니다.'));
    else {
      const ul = el('div', { class: 'stack' });
      upcoming.slice(0, 3).forEach(function (a) { ul.append(el('div', { style: 'font-size:.9rem' }, [el('strong', {}, a.title), el('span', { class: 'hint', style: 'color:var(--acad-fg)' }, ' · ' + fmtDate(a.due) + (a.submitted ? ' · 제출완료' : ' · 미제출'))])); });
      acadCard.append(ul);
    }
    acadCard.append(el('button', { class: 'btn btn-sm', style: 'margin-top:12px', onclick: function () { ctx.navigate('academic'); } }, '대학 학업 열기'));
    right.append(acadCard);

    // 작은 지표 묶음 — 값이 있는 것만, 빈 '미기록' 반복 대신 한 카드에 (보고서 10쪽)
    const miniRows = [];
    if (metrics.securedToday != null) miniRows.push(['오늘 확보', fmtMin(metrics.securedToday), 'week']);
    if (metrics.adherence != null) miniRows.push(['이번 주 이행', metrics.adherence + '%', 'week']);
    const miniCard = el('div', { class: 'card' });
    miniCard.append(el('h3', { style: 'margin-bottom:8px' }, '현황'));
    if (miniRows.length === 0) {
      miniCard.append(el('p', { class: 'hint' }, '주간 계획에서 수험 시간을 확보하면 확보 시간·이행률이 표시됩니다.'));
      miniCard.append(el('button', { class: 'btn btn-sm', style: 'margin-top:8px', onclick: function () { ctx.navigate('week'); } }, '주간 계획 열기'));
    } else {
      miniRows.forEach(function (r) {
        miniCard.append(el('button', { class: 'row between', style: 'width:100%;background:none;border:none;padding:8px 0;cursor:pointer;font:inherit;color:inherit;text-align:left', onclick: function () { ctx.navigate(r[2]); } }, [
          el('span', { class: 'hint' }, r[0]), el('strong', {}, r[1]),
        ]));
      });
    }
    right.append(miniCard);

    grid.append(right);
    root.append(grid);
  }

  // ① "지금 할 공부" 큰 카드 (보고서 10쪽: 현재/다음 핵심 과업 + 공부 시작)
  function buildNowCard(d, ctx) {
    const card = el('div', { class: 'card', style: 'border-left:4px solid var(--accent)' });
    const running = Timer.current();
    const nowIso = new Date().toISOString();
    // 지금 진행 중 블록(시작<=now<종료)
    const current = d.blocks.filter(function (b) { return isExam(d, b) && b.start <= nowIso && b.end > nowIso; }).sort(function (a, b) { return a.start.localeCompare(b.start); })[0];
    const next = nextBlock(d);
    const firstFocus = d.focusToday.map(function (id) { return Store.task(id); }).filter(Boolean)[0];

    card.append(el('div', { class: 'hint', style: 'margin-bottom:4px' }, '지금 할 공부'));

    if (running) {
      const t = running.taskId ? Store.task(running.taskId) : null;
      card.append(
        el('h2', { style: 'font-size:1.4rem' }, (running.title || (t && t.title) || '수험 공부') + ' · 진행 중'),
        el('p', { class: 'hint' }, '집중 세션이 진행 중입니다. 상단 배너에서 남은 시간을 볼 수 있습니다.'),
        el('button', { class: 'btn btn-primary btn-lg', style: 'margin-top:8px', onclick: function () { Timer.stop(); ctx.refresh(); } }, '세션 종료 · 기록'),
      );
      return card;
    }

    // 블록(연결 과업이 있으면 그 과업), 없으면 첫 핵심 과업
    const block = current || next;
    let task = null, subjectId = null, title = null, timeLabel = null;
    if (block) {
      task = block.taskId ? Store.task(block.taskId) : null;
      subjectId = block.subjectId || (task && task.subjectId);
      title = (task && task.title) || block.title;
      timeLabel = fmtTime(block.start) + '~' + fmtTime(block.end) + (current ? ' · 지금 시간' : ' · 다음 블록');
    } else if (firstFocus) {
      task = firstFocus; subjectId = firstFocus.subjectId; title = firstFocus.title;
      timeLabel = firstFocus.estMin ? '예상 ' + fmtMin(firstFocus.estMin) : null;
    }

    if (!title) {
      card.append(
        el('h2', { style: 'font-size:1.3rem' }, '오늘 할 공부를 정해 보세요'),
        el('p', { class: 'hint' }, '핵심 과업을 고르거나 주간 계획에서 수험 시간을 확보하면 여기에 바로 시작할 공부가 나타납니다.'),
        el('div', { class: 'row', style: 'gap:8px;margin-top:8px' }, [
          el('button', { class: 'btn btn-primary', onclick: function () { openTaskEditor(null, ctx, { pinToday: true }); } }, '과업 만들기'),
          el('button', { class: 'btn', onclick: function () { ctx.navigate('week'); } }, '주간 계획 열기'),
        ]),
      );
      return card;
    }

    const sub = subjectId ? Store.subject(subjectId) : null;
    card.append(el('h2', { style: 'font-size:1.4rem;margin-bottom:6px' }, title));
    card.append(el('div', { class: 'row', style: 'gap:8px;margin-bottom:12px' }, [
      sub ? el('span', { class: 'tag tag-exam' }, sub.name) : '',
      timeLabel ? el('span', { class: 'hint' }, timeLabel) : '',
      (block && block.locked) ? el('span', { class: 'hint' }, '보호 블록') : '',
    ]));
    const actions = el('div', { class: 'row', style: 'gap:8px' });
    actions.append(el('button', { class: 'btn btn-primary btn-lg', onclick: function () {
      Timer.start(task ? task.id : null, subjectId, title); ctx.toast('집중 세션을 시작했습니다.'); ctx.refresh();
    } }, '공부 시작'));
    // 연결 노트가 있으면 바로 열기 (쟁점 동선)
    if (task && task.issue) {
      const relNote = d.notes.find(function (n) { return n.subjectId === subjectId && n.issue && n.issue.trim() === task.issue.trim(); });
      if (relNote) actions.append(el('button', { class: 'btn', onclick: function () { openNoteById(relNote.id, ctx); } }, '관련 노트'));
    }
    actions.append(el('button', { class: 'btn btn-ghost', onclick: function () { ctx.navigate('week'); } }, '계획 조정'));
    card.append(actions);
    return card;
  }

  // ② 오늘의 흐름 — 오늘 블록 시간순 타임라인
  function buildTodayFlow(d, ctx) {
    const tk = todayKey();
    const card = el('div', { class: 'card' });
    card.append(el('div', { class: 'section-head' }, [el('h3', {}, '오늘의 흐름'), el('button', { class: 'btn btn-sm', onclick: function () { ctx.navigate('week'); } }, '주간 계획')]));
    const today = d.blocks.filter(function (b) { return b.date === tk; }).sort(function (a, b) { return a.start.localeCompare(b.start); });
    if (today.length === 0) {
      card.append(el('p', { class: 'hint' }, '오늘 예약된 일정이 없습니다. 주간 계획에서 수험 시간을 먼저 확보하세요.'));
      return card;
    }
    const nowIso = new Date().toISOString();
    const list = el('div', { class: 'stack', style: 'gap:6px' });
    today.forEach(function (b) {
      const kind = blockKind(d, b);
      const sub = Store.subject(b.subjectId);
      const isNow = b.start <= nowIso && b.end > nowIso;
      const past = b.end <= nowIso;
      list.append(el('div', { class: 'row', style: 'gap:10px;align-items:center;padding:6px 0;' + (past ? 'opacity:.55;' : '') }, [
        el('span', { class: 'hint', style: 'width:92px;flex:none;font-variant-numeric:tabular-nums' }, fmtTime(b.start) + '~' + fmtTime(b.end)),
        el('span', { class: 'tag tag-' + (kind === 'exam' ? 'exam' : kind === 'acad' ? 'acad' : 'muted'), style: 'flex:none' }, kind === 'exam' ? '수험' : kind === 'acad' ? '학업' : '기타'),
        el('span', { style: 'font-weight:' + (isNow ? '800' : '500') + (isNow ? ';color:var(--accent)' : '') }, (b.locked ? '🔒 ' : '') + (b.title || (sub ? sub.name : '블록')) + (isNow ? ' · 지금' : '')),
      ]));
    });
    card.append(list);
    return card;
  }

  function homeMetrics(d, tk) {
    const todayBlocks = d.blocks.filter(function (b) { return b.date === tk && isExam(d, b); });
    const secured = todayBlocks.length ? sumNonOverlap(todayBlocks) : null;
    const wa = weekAdherence(d);
    // 복습 화면과 동일 기준: 활성(active) + 복습일이 오늘 이전 (초안/보관 제외) (보고서 6쪽)
    const dueReviews = d.cards.length === 0 ? null : d.cards.filter(function (c) { return c.status === 'active' && c.nextReview && c.nextReview <= tk; }).length;
    const acadAlerts = (d.assignments.length === 0 && d.courses.length === 0) ? null : upcomingAssignments(d).length;
    return { securedToday: secured, adherence: wa.adherence, adherenceSub: wa.sub, dueReviews: dueReviews, acadAlerts: acadAlerts };
  }
  // 세션이 '수험 과목'에 속하는지 (수험 외 시간 제외, 보고서 6쪽)
  function isExamSession(d, s) {
    if (!s.subjectId) return true; // 과목 미지정 타이머 세션은 수험으로 간주
    const sub = d.subjects.find(function (x) { return x.id === s.subjectId; });
    return sub ? sub.kind === 'exam' : true;
  }
  // 이번 주(또는 지정 월요일)의 수험 계획 블록 분 합계
  function weekPlanMin(d, weekDates) {
    return d.blocks.filter(function (b) { return weekDates.indexOf(b.date) >= 0 && isExam(d, b); })
      .reduce(function (s, b) { return s + minutesBetween(b.start, b.end); }, 0);
  }
  // 이번 주 수험 세션 실제 분 합계 (수험 과목만, 휴식 제외)
  function weekActualMin(d, weekDates) {
    return d.sessions.filter(function (s) { return weekDates.indexOf(dayKey(new Date(s.start))) >= 0 && isExamSession(d, s); })
      .reduce(function (s, x) { return s + Math.max(0, minutesBetween(x.start, x.end) - (x.breakMin || 0)); }, 0);
  }
  // 기준 계획(최초 확정) 읽기 전용 조회. 확정된 값이 있으면 그 값, 없으면 현재 계획(잠정).
  // 실제 확정 저장은 주간 계획 화면의 '계획 확정' 버튼에서만 수행한다 (렌더 중 변경 금지).
  function baselinePlanMin(d, mondayKey, currentPlanMin) {
    const bp = (d.baselinePlans || {})[mondayKey];
    if (bp && typeof bp.planMin === 'number') return { planMin: bp.planMin, confirmed: true };
    return { planMin: currentPlanMin, confirmed: false };
  }
  function weekAdherence(d) {
    const monday = getMonday(0);
    const mondayKey = dayKey(monday);
    const weekDates = []; for (let i = 0; i < 7; i++) weekDates.push(dayKey(addDays(monday, i)));
    const curPlan = weekPlanMin(d, weekDates);
    const base = baselinePlanMin(d, mondayKey, curPlan);     // 분모 = 확정 기준(없으면 현재·잠정)
    if (base.planMin === 0) return { adherence: null, sub: '확정 계획 없음' };
    const actualMin = weekActualMin(d, weekDates);           // 분자 = 수험 세션만
    const label = base.confirmed ? '기준' : '잠정';
    const changed = (base.confirmed && curPlan !== base.planMin) ? ' · 현재계획 ' + fmtMin(curPlan) : '';
    return { adherence: Math.round(Math.min(999, actualMin / base.planMin * 100)), sub: fmtMin(actualMin) + ' / ' + label + ' ' + fmtMin(base.planMin) + changed };
  }
  function nextBlock(d) {
    const nowIso = new Date().toISOString();
    return d.blocks.filter(function (b) { return isExam(d, b) && b.end > nowIso; }).sort(function (a, b) { return a.start.localeCompare(b.start); })[0] || null;
  }
  function upcomingAssignments(d) {
    const horizon = addDays(new Date(), 7).toISOString();
    return d.assignments.filter(function (a) { return !a.submitted && a.due && a.due <= horizon; }).sort(function (a, b) { return (a.due || '').localeCompare(b.due || ''); });
  }
  function metricCard(label, value, sub, onClick) {
    const card = el('div', { class: 'metric', role: onClick ? 'button' : null, tabindex: onClick ? '0' : null, style: onClick ? 'cursor:pointer' : '' });
    card.append(el('div', { class: 'label' }, label), el('div', { class: 'value' + (value == null ? ' muted' : '') }, value == null ? '미기록' : value), el('div', { class: 'hint' }, sub));
    if (onClick) { card.addEventListener('click', onClick); card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }); }
    return card;
  }
  function focusItem(t, i, ctx) {
    const sub = Store.subject(t.subjectId);
    const running = Timer.current();
    const isRunning = running && running.taskId === t.id;
    return el('div', { class: 'item' + (t.status === 'done' ? ' done' : '') }, [
      el('div', { class: 'main' }, [
        el('div', { class: 'title' }, (i + 1) + '. ' + t.title),
        el('div', { class: 'meta' }, [sub ? el('span', { class: 'tag tag-exam' }, sub.name) : '', t.estMin ? ' · 예상 ' + fmtMin(t.estMin) : '', t.due ? ' · 마감 ' + fmtDate(t.due) : '']),
      ]),
      isRunning
        ? el('button', { class: 'btn btn-primary btn-sm', onclick: function () { ctx.navigate('home'); } }, '진행 중 ▸ 돌아가기')
        : el('button', { class: 'btn btn-primary btn-sm', onclick: function () { Timer.start(t.id, t.subjectId, t.title); ctx.toast('집중 세션을 시작했습니다.'); ctx.refresh(); } }, '공부 시작'),
      el('button', { class: 'btn btn-sm', onclick: function () { openTaskEditor(t, ctx); } }, '편집'),
    ]);
  }
  function openFocusPicker(ctx) {
    const d = Store.data();
    const open = d.tasks.filter(function (t) { return t.status !== 'done'; });
    if (open.length === 0) { openTaskEditor(null, ctx, { pinToday: true }); return; }
    const picked = new Set(d.focusToday);
    const body = el('div', { class: 'stack' });
    body.append(el('p', { class: 'hint' }, '오늘 집중할 수험 과업을 최대 3개까지 선택합니다.'));
    open.forEach(function (t) {
      const sub = Store.subject(t.subjectId);
      const cb = el('input', { type: 'checkbox', style: 'width:20px;min-height:20px', checked: picked.has(t.id) });
      cb.addEventListener('change', function () {
        if (cb.checked) { if (picked.size >= 3) { cb.checked = false; ctx.toast('최대 3개까지 선택할 수 있습니다.', 'warn'); return; } picked.add(t.id); } else picked.delete(t.id);
      });
      body.append(el('label', { class: 'item', style: 'cursor:pointer;align-items:center' }, [cb, el('div', { class: 'main' }, [el('div', { class: 'title' }, t.title), sub ? el('div', { class: 'meta' }, sub.name) : ''])]));
    });
    const m = ctx.modal({ title: '오늘의 핵심 과업 선택', body: body, footer: [el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'), el('button', { class: 'btn btn-primary', onclick: function () { Store.update(function (dd) { dd.focusToday = Array.from(picked); }); m.close(); ctx.refresh(); } }, '적용')] });
  }

  /* =======================================================================
     7. 주간 계획 (보고서 8·9쪽)
     ======================================================================= */
  // --- 묶음 D: 반복 수업 시간표 연결 · 빈 시간 제안 ------------------------
  // 과목 schedule → 해당 주의 고정 수업(acad) 블록 목록. 저장은 하지 않고 "있어야 할" 블록만 계산.
  function recurringClassBlocks(d, weekDates) {
    const out = [];
    (d.courses || []).forEach(function (c) {
      (c.schedule || []).forEach(function (s) {
        if (s.day == null || !s.start || !s.end) return;
        const date = weekDates[s.day];
        if (!date) return;
        out.push({
          courseId: c.id, title: c.name || '수업', day: s.day, date: date,
          start: date + 'T' + s.start + ':00', end: date + 'T' + s.end + ':00',
          source: 'course',
        });
      });
    });
    return out;
  }
  // 아직 시간표에 반영되지 않은 반복 수업(동일 날짜·시작·종료의 블록이 없는 것)만 추림.
  function pendingClassBlocks(d, weekDates) {
    const existing = d.blocks.filter(function (b) { return weekDates.indexOf(b.date) >= 0; });
    return recurringClassBlocks(d, weekDates).filter(function (rc) {
      return !existing.some(function (b) {
        return b.date === rc.date && b.start.slice(11, 16) === rc.start.slice(11, 16) && b.end.slice(11, 16) === rc.end.slice(11, 16)
          && (b.courseId === rc.courseId || blockKind(d, b) === 'acad');
      });
    });
  }
  // 하루 활동 가능 구간 안에서, 기존 블록을 피한 빈 구간을 찾아 수험용으로 제안.
  // bounds: {startH, endH, minSlotMin}. 과거 시간은 제외(오늘이면 현재 이후만).
  function findFreeSlots(d, weekDates, bounds) {
    bounds = bounds || {};
    const startH = bounds.startH != null ? bounds.startH : 9;
    const endH = bounds.endH != null ? bounds.endH : 22;
    const minSlot = bounds.minSlotMin != null ? bounds.minSlotMin : 45;
    const now = new Date();
    const slots = [];
    weekDates.forEach(function (k) {
      const dayStart = new Date(k + 'T' + String(startH).padStart(2, '0') + ':00:00');
      const dayEnd = new Date(k + 'T' + String(endH).padStart(2, '0') + ':00:00');
      let cursor = dayStart;
      if (k < todayKey()) return;              // 지난 날은 제안하지 않음
      if (k === todayKey() && now > cursor) {  // 오늘은 현재 시각 이후만
        cursor = new Date(Math.ceil(now.getTime() / (15 * 60000)) * (15 * 60000)); // 15분 단위 올림
      }
      // 해당 날짜의 모든 블록(수업·수험·기타) + 아직 반영 안 된 반복 수업까지 장애물로 간주
      const obstacles = d.blocks.filter(function (b) { return b.date === k; })
        .concat(pendingClassBlocks(d, weekDates).filter(function (b) { return b.date === k; }))
        .map(function (b) { return { s: new Date(b.start), e: new Date(b.end) }; })
        .filter(function (o) { return o.e > cursor && o.s < dayEnd; })
        .sort(function (a, b) { return a.s - b.s; });
      obstacles.forEach(function (o) {
        if (o.s > cursor) {
          const gapMin = (Math.min(o.s, dayEnd) - cursor) / 60000;
          if (gapMin >= minSlot) slots.push({ date: k, start: new Date(cursor), end: new Date(Math.min(o.s, dayEnd)), min: gapMin });
        }
        if (o.e > cursor) cursor = o.e;
      });
      if (dayEnd > cursor) {
        const gapMin = (dayEnd - cursor) / 60000;
        if (gapMin >= minSlot) slots.push({ date: k, start: new Date(cursor), end: dayEnd, min: gapMin });
      }
    });
    return slots.sort(function (a, b) { return b.min - a.min; }); // 큰 빈 시간 우선
  }

  // 아직 반영 안 된 반복 수업을 이번 주 고정 수업(acad) 블록으로 한 번에 추가.
  function applyRecurringClasses(d, weekDates, ctx) {
    const pending = pendingClassBlocks(d, weekDates);
    if (pending.length === 0) { ctx.toast('이미 모든 수업이 시간표에 반영돼 있어요.'); return; }
    Store.update(function (dd) {
      pending.forEach(function (rc) {
        dd.blocks.push({
          id: Store.id('blk'), title: rc.title, kind: 'acad', subjectId: '', taskId: '',
          courseId: rc.courseId, date: rc.date, start: rc.start, end: rc.end, locked: false, source: 'course',
        });
      });
    });
    ctx.refresh();
    ctx.toast(pending.length + '개 수업을 시간표에 반영했어요.');
  }

  // 빈 시간 제안 모달: 부족분을 채울 수 있는 빈 구간을 큰 순서로 보여 주고, 한 번에 수험 블록으로 추가.
  function openFreeSlotSuggest(ctx, weekDates, shortMin) {
    const d = Store.data();
    const slots = findFreeSlots(d, weekDates, { startH: 9, endH: 22, minSlotMin: 45 });
    const body = el('div', { class: 'stack' });
    if (shortMin > 0) body.append(el('p', { class: 'hint' }, '이번 주 수험 시간이 ' + fmtMin(shortMin) + ' 부족해요. 아래 빈 시간 중에서 골라 수험 블록으로 넣을 수 있어요.'));
    else body.append(el('p', { class: 'hint' }, '남는 빈 시간을 수험 블록으로 채울 수 있어요.'));

    if (slots.length === 0) {
      body.append(el('div', { class: 'empty', style: 'padding:24px 0' }, [el('h3', {}, '남는 빈 시간이 없어요'), el('p', {}, '활동 시간(09–22시) 안에 45분 이상 비는 구간이 없습니다. 수업·이동 블록을 조정하거나 목표를 낮춰 보세요.')]));
      const m0 = ctx.modal({ title: '빈 시간 제안', body: body, footer: [el('button', { class: 'btn btn-primary', onclick: function () { m0.close(); } }, '닫기')] });
      return;
    }

    const picked = new Set();
    let pickedMin = 0;
    const totalLabel = el('div', { class: 'hint', style: 'margin:4px 0 8px;font-weight:600' });
    function refreshLabel() {
      totalLabel.textContent = '선택한 빈 시간: ' + fmtMin(pickedMin) + (shortMin > 0 ? ' / 부족 ' + fmtMin(shortMin) : '');
      totalLabel.style.color = (shortMin > 0 && pickedMin >= shortMin) ? 'var(--exam-fg)' : 'var(--text-sub)';
    }
    refreshLabel();
    body.append(totalLabel);

    const list = el('div', { class: 'list' });
    slots.forEach(function (sl, i) {
      const wd = WEEKDAYS[weekDates.indexOf(sl.date)] || '';
      const label = wd + '요일 ' + sl.date.slice(5) + ' · ' + fmtTime(sl.start) + '~' + fmtTime(sl.end) + ' (' + fmtMin(sl.min) + ')';
      const cb = el('input', { type: 'checkbox', style: 'width:20px;min-height:20px' });
      cb.addEventListener('change', function () {
        if (cb.checked) { picked.add(i); pickedMin += sl.min; } else { picked.delete(i); pickedMin -= sl.min; }
        refreshLabel();
      });
      list.append(el('label', { class: 'item', style: 'cursor:pointer;align-items:center' }, [cb, el('div', { class: 'main' }, [el('div', { class: 'title' }, label)])]));
    });
    body.append(list);

    const m = ctx.modal({
      title: '빈 시간 제안', body: body, footer: [
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'),
        el('button', { class: 'btn btn-primary', onclick: function () {
          if (picked.size === 0) { ctx.toast('채울 빈 시간을 선택하세요.', 'warn'); return; }
          Store.update(function (dd) {
            picked.forEach(function (i) {
              const sl = slots[i];
              dd.blocks.push({ id: Store.id('blk'), title: '수험 공부', kind: 'exam', subjectId: '', taskId: '', date: sl.date, start: toLocalIso(sl.start), end: toLocalIso(sl.end), locked: false });
            });
          });
          m.close(); ctx.refresh(); ctx.toast(picked.size + '개 수험 블록을 추가했어요.');
        } }, '선택한 시간에 수험 넣기'),
      ]
    });
  }
  function toLocalIso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
      + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':00';
  }

  let weekOffset = 0;
  function renderWeek(root, ctx) {
    const d = Store.data();
    const monday = getMonday(weekOffset);
    const weekDates = []; for (let i = 0; i < 7; i++) weekDates.push(dayKey(addDays(monday, i)));

    const goalMin = (d.settings.weeklyExamGoalH || 30) * 60;
    const examBlocks = d.blocks.filter(function (b) { return weekDates.indexOf(b.date) >= 0 && blockKind(d, b) === 'exam'; });
    const securedMin = sumNonOverlap(examBlocks);
    const shortMin = Math.max(0, goalMin - securedMin);

    root.append(el('p', { class: 'page-intro' }, '수험 시간을 먼저 확보하고 충돌을 조정합니다. 목표에 못 미치면 미확보 시간을 그대로 표시합니다.'));

    const head = el('div', { class: 'card', style: 'margin-bottom:16px' });
    head.append(el('div', { class: 'row between' }, [
      el('div', { class: 'row' }, [
        el('button', { class: 'btn btn-sm', onclick: function () { weekOffset--; ctx.refresh(); } }, '‹ 지난 주'),
        el('strong', {}, fmtDateShort(monday) + ' ~ ' + fmtDateShort(addDays(monday, 6)) + (weekOffset === 0 ? ' (이번 주)' : '')),
        el('button', { class: 'btn btn-sm', onclick: function () { weekOffset++; ctx.refresh(); } }, '다음 주 ›'),
        weekOffset !== 0 ? el('button', { class: 'btn btn-sm btn-ghost', onclick: function () { weekOffset = 0; ctx.refresh(); } }, '이번 주로') : null,
      ]),
      el('button', { class: 'btn btn-sm no-print', onclick: function () { window.print(); } }, '🖨 인쇄'),
    ]));
    head.append(el('div', { class: 'row', style: 'margin-top:12px;gap:24px;flex-wrap:wrap' }, [
      summaryStat('주간 수험 목표', fmtMin(goalMin), ''),
      summaryStat('확보', fmtMin(securedMin), 'var(--exam-fg)'),
      summaryStat('미확보', fmtMin(shortMin), shortMin > 0 ? 'var(--warn-fg)' : 'var(--text-sub)'),
    ]));
    if (shortMin > 0) {
      // 상황 + 행동만 간결하게 (보고서 8쪽: 압박성 문구 대신 현재 상태와 다음 행동)
      head.append(el('div', { class: 'row', style: 'margin-top:8px;gap:8px;flex-wrap:wrap;align-items:center' }, [
        el('span', { style: 'color:var(--warn-fg);font-weight:600' }, '이번 주 수험 시간이 ' + fmtMin(shortMin) + ' 부족해요'),
        el('button', { class: 'btn btn-sm btn-primary', onclick: function () { openFreeSlotSuggest(ctx, weekDates, shortMin); } }, '빈 시간 제안 받기'),
      ]));
      // 원칙 설명은 도움말로 (평소엔 접힘)
      head.append(el('details', { style: 'margin-top:6px' }, [
        el('summary', { class: 'hint', style: 'cursor:pointer' }, '부족할 때 어떻게 하나요?'),
        el('p', { class: 'hint', style: 'margin:6px 0 0' }, '수면·이동·마감을 줄여 억지로 채우지 않습니다. 범위 축소, 과업 분할, 목표 조정 중에서 고르세요. 미확보 시간은 숨기지 않고 그대로 보여 줍니다.'),
      ]));
    }
    root.append(head);

    const grid = el('div', { class: 'grid grid-7to3' });
    const planCol = el('div', { class: 'stack' });
    planCol.append(buildTimetable(d, weekDates, ctx));
    planCol.append(buildMobileDay(d, weekDates, ctx));
    grid.append(planCol);

    const side = el('div', { class: 'stack' });

    // 묶음 D: 반복 수업 자동 반영
    const pendingClasses = pendingClassBlocks(d, weekDates);
    const classCard = el('div', { class: 'card' });
    const classHead = el('div', { class: 'row between' }, [el('h3', { style: 'margin:0' }, '반복 수업')]);
    classCard.append(classHead);
    if ((d.courses || []).some(function (c) { return (c.schedule || []).length; })) {
      if (pendingClasses.length) {
        classCard.append(
          el('p', { class: 'hint', style: 'margin:6px 0' }, '이번 주에 아직 반영 안 된 수업이 ' + pendingClasses.length + '개 있어요.'),
          el('button', { class: 'btn btn-sm btn-primary btn-block', onclick: function () { applyRecurringClasses(d, weekDates, ctx); } }, '수업 ' + pendingClasses.length + '개 시간표에 반영')
        );
      } else {
        classCard.append(el('p', { class: 'hint', style: 'margin:6px 0 0' }, '등록된 수업이 이번 주 시간표에 모두 반영돼 있어요.'));
      }
    } else {
      classCard.append(el('p', { class: 'hint', style: 'margin:6px 0' }, '대학 학업에서 과목의 반복 수업 시간을 등록하면, 이번 주 시간표에 자동으로 넣어드려요.'),
        el('button', { class: 'btn btn-sm btn-block', onclick: function () { ctx.navigate('academic'); } }, '수강 과목 등록하러 가기'));
    }
    side.append(classCard);

    const addCard = el('div', { class: 'card' });
    addCard.append(el('h3', {}, '시간표에 블록 추가'), el('p', { class: 'hint' }, '드래그 대신 날짜·시간 입력으로도 추가합니다.'),
      el('button', { class: 'btn btn-primary btn-block', onclick: function () { openBlockEditor(null, ctx, weekDates); } }, '+ 계획 블록 추가'),
      el('button', { class: 'btn btn-block', style: 'margin-top:8px', onclick: function () { openFreeSlotSuggest(ctx, weekDates, shortMin); } }, '빈 시간 제안 받기'));
    side.append(addCard);

    const unCard = el('div', { class: 'card' });
    unCard.append(el('h3', {}, '미배치 수험 과업'));
    const scheduled = new Set(d.blocks.filter(function (b) { return weekDates.indexOf(b.date) >= 0; }).map(function (b) { return b.taskId; }).filter(Boolean));
    const unplaced = d.tasks.filter(function (t) { return t.status !== 'done' && !scheduled.has(t.id); });
    if (unplaced.length === 0) unCard.append(el('p', { class: 'hint' }, '이번 주에 미배치된 수험 과업이 없습니다.'));
    else {
      const list = el('div', { class: 'stack' });
      unplaced.forEach(function (t) {
        const sub = Store.subject(t.subjectId);
        list.append(el('div', { class: 'item' }, [el('div', { class: 'main' }, [el('div', { class: 'title' }, t.title), el('div', { class: 'meta' }, [sub ? sub.name : '', t.estMin ? ' · ' + fmtMin(t.estMin) : ''])]), el('button', { class: 'btn btn-sm', onclick: function () { openBlockEditor(t, ctx, weekDates); } }, '배치')]));
      });
      unCard.append(list);
    }
    side.append(unCard);

    const legend = el('div', { class: 'card' });
    legend.append(el('h3', {}, '범례'), el('div', { class: 'stack', style: 'gap:6px' }, [legendRow('exam', '수험 보호 블록'), legendRow('acad', '고정 수업 · 학업'), legendRow('other', '이동 · 휴식 · 기타')]));
    side.append(legend);
    grid.append(side);
    root.append(grid);
  }

  function parseLocalDateTime(s) {
    if (!s) return null;
    if (s instanceof Date) return s;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
    return new Date(s);
  }
  // 같은 날짜 안에서 시간이 겹치는 블록들을 열(column) 단위로 나란히 배치
  function layoutDayBlocks(items) {
    if (!items.length) return [];
    const sorted = items.slice().sort(function (a, b) {
      return (a.startMin - b.startMin) || (b.endMin - a.endMin);
    });
    const clusters = [];
    let cur = [], clusterEnd = -1;
    sorted.forEach(function (it) {
      if (cur.length && it.startMin < clusterEnd) {
        cur.push(it);
        if (it.endMin > clusterEnd) clusterEnd = it.endMin;
      } else {
        if (cur.length) clusters.push(cur);
        cur = [it];
        clusterEnd = it.endMin;
      }
    });
    if (cur.length) clusters.push(cur);

    const out = [];
    clusters.forEach(function (cluster) {
      const colEnds = [];
      cluster.forEach(function (it) {
        let col = -1;
        for (let i = 0; i < colEnds.length; i++) {
          if (colEnds[i] <= it.startMin) { col = i; break; }
        }
        if (col === -1) { col = colEnds.length; colEnds.push(it.endMin); }
        else { colEnds[col] = it.endMin; }
        it.col = col;
      });
      const totalCols = colEnds.length;
      cluster.forEach(function (it) { it.totalCols = totalCols; out.push(it); });
    });
    return out;
  }
  function buildTimetable(d, weekDates, ctx) {
    const card = el('div', { class: 'card desktop-only', style: 'overflow-x:auto;padding:16px' });
    const ROW_H = 44, END_H = 24;
    let startH = 7;

    // 각 요일의 시간 구간(분 단위) 계산 — 입력된 시간 길이만큼 블록 높이를 채움
    const daySegments = weekDates.map(function (k) {
      const dayStart = parseLocalDateTime(k + 'T00:00:00');
      const dayEnd = addDays(dayStart, 1);
      const segs = [];
      d.blocks.forEach(function (b) {
        const bs = parseLocalDateTime(b.start);
        let be = parseLocalDateTime(b.end);
        if (!bs || isNaN(bs.getTime())) return;
        if (!be || isNaN(be.getTime()) || be <= bs) be = new Date(bs.getTime() + 30 * 60000);
        if (bs < dayEnd && be > dayStart) {
          const startMin = Math.max(0, (bs - dayStart) / 60000);
          const endMin = Math.min(END_H * 60, (be - dayStart) / 60000);
          if (endMin > startMin) {
            startH = Math.min(startH, Math.floor(startMin / 60));
            segs.push({ block: b, startMin: startMin, endMin: endMin });
          }
        }
      });
      return layoutDayBlocks(segs);
    });

    const table = el('div', { class: 'timetable' });
    table.append(el('div', { class: 'tt-head', style: 'border-left:none' }, ''));
    weekDates.forEach(function (k, i) { table.append(el('div', { class: 'tt-head', style: k === todayKey() ? 'color:var(--accent)' : '' }, WEEKDAYS[i] + ' ' + k.slice(8))); });

    const timesCol = el('div', { class: 'tt-times' });
    for (let h = startH; h < END_H; h++) {
      timesCol.append(el('div', { class: 'tt-timecol', style: 'height:' + ROW_H + 'px' }, String(h)));
    }
    table.append(timesCol);

    weekDates.forEach(function (k, dayIdx) {
      const dayCol = el('div', { class: 'tt-daycol', style: 'height:' + ((END_H - startH) * ROW_H) + 'px' });
      for (let h = startH; h < END_H; h++) {
        const cell = el('div', {
          class: 'tt-cell' + (h === END_H - 1 ? ' tt-cell-last' : ''),
          style: 'height:' + ROW_H + 'px',
          role: 'button',
          tabindex: '0',
          'aria-label': k + ' ' + h + '시 블록 추가',
        });
        cell.addEventListener('click', function (e) { if (e.target === cell) openBlockEditor(null, ctx, weekDates, { date: k, hour: h }); });
        cell.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBlockEditor(null, ctx, weekDates, { date: k, hour: h }); } });
        dayCol.append(cell);
      }
      daySegments[dayIdx].forEach(function (seg) {
        dayCol.append(blockChip(d, seg, startH, ROW_H, ctx));
      });
      table.append(dayCol);
    });

    card.append(table, el('p', { class: 'hint', style: 'margin:8px 0 0' }, '빈 칸을 클릭하면 해당 시간에 블록을 추가합니다. 이동·휴식은 별도 블록으로 확보하세요.'));
    return card;
  }
  function blockChip(d, seg, startH, rowH, ctx) {
    const b = seg.block;
    const kind = blockKind(d, b);
    const sub = Store.subject(b.subjectId);
    const label = (b.locked ? '🔒 ' : '') + (b.title || (sub ? sub.name : '블록'));
    const timeText = fmtTime(b.start) + '~' + fmtTime(b.end);

    const topPx = ((seg.startMin - startH * 60) / 60) * rowH + 1;
    const rawHeightPx = ((seg.endMin - seg.startMin) / 60) * rowH;
    const heightPx = Math.max(16, rawHeightPx - 2);

    const n = seg.totalCols || 1;
    const col = seg.col || 0;
    const gapTotal = 4 + (n - 1) * 2;
    const widthExpr = n === 1 ? 'calc(100% - 4px)' : 'calc((100% - ' + gapTotal + 'px) / ' + n + ')';
    const leftExpr = n === 1 ? '2px' : 'calc(2px + ' + col + ' * ((100% - ' + gapTotal + 'px) / ' + n + ' + 2px))';

    const cls = 'tt-block ' + kind + (heightPx < 36 ? ' compact' : '') + (heightPx >= 60 ? ' tall' : '');
    const style = 'top:' + topPx + 'px;height:' + heightPx + 'px;left:' + leftExpr + ';width:' + widthExpr + ';';

    const children = [el('span', { class: 'tt-block-title' }, label)];
    if (heightPx >= 36) children.push(el('span', { class: 'tt-block-time' }, timeText));

    return el('button', {
      class: cls,
      style: style,
      title: (b.title || (sub ? sub.name : '블록')) + ' (' + timeText + ')',
      onclick: function (e) { e.stopPropagation(); openBlockEditor(null, ctx, null, { editBlock: b }); },
    }, children);
  }
  function buildMobileDay(d, weekDates, ctx) {
    const wrap = el('div', { class: 'mobile-day-view stack' });
    weekDates.forEach(function (k, i) {
      const blocks = d.blocks.filter(function (b) { return b.date === k; }).sort(function (a, b) { return a.start.localeCompare(b.start); });
      const card = el('div', { class: 'card' });
      card.append(el('h3', { style: k === todayKey() ? 'color:var(--accent)' : '' }, WEEKDAYS[i] + '요일 ' + k.slice(5)));
      if (blocks.length === 0) card.append(el('p', { class: 'hint' }, '계획 없음'));
      else blocks.forEach(function (b) {
        const kind = blockKind(d, b);
        card.append(el('div', { class: 'item', onclick: function () { openBlockEditor(null, ctx, null, { editBlock: b }); } }, [el('span', { class: 'tag tag-' + (kind === 'exam' ? 'exam' : kind === 'acad' ? 'acad' : 'muted') }, kind === 'exam' ? '수험' : kind === 'acad' ? '학업' : '기타'), el('div', { class: 'main' }, [el('div', { class: 'title' }, (b.locked ? '🔒 ' : '') + b.title), el('div', { class: 'meta' }, fmtTime(b.start) + '~' + fmtTime(b.end))])]));
      });
      card.append(el('button', { class: 'btn btn-sm', style: 'margin-top:8px', onclick: function () { openBlockEditor(null, ctx, weekDates, { date: k, hour: 9 }); } }, '+ 이 날에 추가'));
      wrap.append(card);
    });
    return wrap;
  }
  function openBlockEditor(task, ctx, weekDates, opts) {
    opts = opts || {};
    const d = Store.data();
    const edit = opts.editBlock || null;
    const b = edit || {};
    const defaultDate = b.date || opts.date || (weekDates ? weekDates[0] : todayKey());
    const startHour = opts.hour != null ? opts.hour : 9;
    const defaultDurMin = (task && task.estMin) ? clampNum(task.estMin, 15, 720) : 120;
    const endTotalMin = Math.min(24 * 60, startHour * 60 + defaultDurMin);
    const defaultStart = b.start ? b.start.slice(11, 16) : String(startHour).padStart(2, '0') + ':00';
    const defaultEnd = b.end ? b.end.slice(11, 16) : String(Math.floor(endTotalMin / 60) % 24).padStart(2, '0') + ':' + String(endTotalMin % 60).padStart(2, '0');

    const titleInput = el('input', { type: 'text', value: b.title || (task ? task.title : ''), placeholder: '블록 이름' });
    const kindSel = el('select', {});
    [['exam', '수험 보호'], ['acad', '고정 수업 · 학업'], ['other', '이동 · 휴식 · 기타']].forEach(function (p) { kindSel.append(el('option', { value: p[0], selected: p[0] === (b.kind || 'exam') }, p[1])); });
    const subjSel = el('select', {}); subjSel.append(el('option', { value: '' }, '(과목 없음)'));
    d.subjects.forEach(function (s) { subjSel.append(el('option', { value: s.id, selected: s.id === (b.subjectId || (task ? task.subjectId : '')) }, s.name)); });
    const taskSel = el('select', {}); taskSel.append(el('option', { value: '' }, '(과업 연결 없음)'));
    d.tasks.filter(function (t) { return t.status !== 'done'; }).forEach(function (t) { taskSel.append(el('option', { value: t.id, selected: t.id === (b.taskId || (task ? task.id : '')) }, t.title)); });
    const dateInput = el('input', { type: 'date', value: defaultDate });
    const startInput = el('input', { type: 'time', value: defaultStart });
    const endInput = el('input', { type: 'time', value: defaultEnd });
    const lockInput = el('input', { type: 'checkbox', checked: !!b.locked, style: 'width:20px;min-height:20px' });

    const body = el('div', {}, [
      el('div', { class: 'field' }, [el('label', {}, '블록 이름'), titleInput]),
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '종류'), kindSel]), el('div', { class: 'field' }, [el('label', {}, '과목'), subjSel])]),
      el('div', { class: 'field' }, [el('label', {}, '연결 과업 (선택)'), taskSel]),
      el('div', { class: 'field' }, [el('label', {}, '날짜'), dateInput]),
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '시작'), startInput]), el('div', { class: 'field' }, [el('label', {}, '종료'), endInput])]),
      el('label', { class: 'row', style: 'gap:8px' }, [lockInput, '수동 잠금 (재배치에서 보존)']),
    ]);

    const footer = [
      edit ? el('button', { class: 'btn btn-danger', onclick: function () { Store.update(function (dd) { dd.blocks = dd.blocks.filter(function (x) { return x.id !== edit.id; }); }); m.close(); ctx.refresh(); ctx.toast('블록을 삭제했습니다.'); } }, '삭제') : null,
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'),
      el('button', { class: 'btn btn-primary', onclick: save }, '저장'),
    ];
    const m = ctx.modal({ title: edit ? '블록 편집' : '계획 블록 추가', body: body, footer: footer });

    function computeTimes() {
      const date = dateInput.value;
      if (!date || !startInput.value || !endInput.value) return null;
      const startIso = date + 'T' + startInput.value + ':00';
      let endIso = date + 'T' + endInput.value + ':00';
      if (new Date(endIso) <= new Date(startIso)) { endIso = dayKey(addDays(parseKey(date), 1)) + 'T' + endInput.value + ':00'; }
      return { date: date, startIso: startIso, endIso: endIso };
    }
    function doSave(t, title) {
      Store.update(function (dd) {
        if (edit) { Object.assign(dd.blocks.find(function (x) { return x.id === edit.id; }), { title: title, kind: kindSel.value, subjectId: subjSel.value, taskId: taskSel.value, date: t.date, start: t.startIso, end: t.endIso, locked: lockInput.checked }); }
        else dd.blocks.push({ id: Store.id('blk'), title: title, kind: kindSel.value, subjectId: subjSel.value, taskId: taskSel.value, date: t.date, start: t.startIso, end: t.endIso, locked: lockInput.checked });
      });
      m.close(); ctx.refresh(); ctx.toast('계획을 저장했습니다.');
    }
    function save() {
      const t = computeTimes();
      if (!t) { ctx.toast('날짜와 시간을 입력하세요.', 'warn'); return; }
      const title = titleInput.value.trim() || (taskSel.value && Store.task(taskSel.value) ? Store.task(taskSel.value).title : '') || (subjSel.value && Store.subject(subjSel.value) ? Store.subject(subjSel.value).name : '') || '블록';
      // 저장 전에 겹치는 '모든' 블록을 확인 (잠금뿐 아니라 고정수업·이동·생활 포함) — 보고서 5쪽 P0
      const overlaps = d.blocks.filter(function (x) {
        return x.id !== (edit && edit.id) && x.date === t.date &&
          new Date(t.startIso) < new Date(x.end) && new Date(x.start) < new Date(t.endIso);
      });
      if (overlaps.length === 0) { doSave(t, title); return; }
      // 겹치는 블록을 함께 보여 주고, 취소 / 시간 변경 / 그래도 저장(명시적 중복)을 선택
      const list = el('div', { class: 'list', style: 'margin:8px 0' });
      overlaps.forEach(function (x) {
        const kind = blockKind(d, x);
        list.append(el('div', { class: 'item' }, [
          el('span', { class: 'tag tag-' + (kind === 'exam' ? 'exam' : kind === 'acad' ? 'acad' : 'muted') }, kind === 'exam' ? '수험' : kind === 'acad' ? '학업' : '기타'),
          el('div', { class: 'main' }, [el('div', { class: 'title' }, (x.locked ? '🔒 ' : '') + (x.title || '블록')), el('div', { class: 'meta' }, fmtTime(x.start) + '~' + fmtTime(x.end))]),
        ]));
      });
      const hasLocked = overlaps.some(function (x) { return x.locked; });
      const cm = ctx.modal({
        title: '시간이 겹칩니다',
        body: el('div', {}, [
          el('p', {}, '추가하려는 ' + fmtTime(t.startIso) + '~' + fmtTime(t.endIso) + ' 블록이 아래 ' + overlaps.length + '개와 겹칩니다.'),
          list,
          hasLocked ? el('p', { class: 'hint', style: 'color:var(--warn-fg)' }, '🔒 수동 잠금 블록과 겹칩니다. 보호된 공부 시간을 덮어쓰지 않도록 시간 변경을 권장합니다.') : null,
          el('p', { class: 'hint' }, '"수험 보호"는 자동 보호가 아니라, 사용자가 지키려는 시간을 표시하는 것입니다.'),
        ]),
        footer: [
          el('button', { class: 'btn', onclick: function () { cm.close(); } }, '시간 변경'),
          el('button', { class: 'btn btn-primary', onclick: function () { cm.close(); doSave(t, title); } }, '그래도 저장(중복 기록)'),
        ],
      });
    }
  }
  function blockKind(d, b) { if (b.kind) return b.kind; const s = d.subjects.find(function (x) { return x.id === b.subjectId; }); return s && s.kind === 'exam' ? 'exam' : 'other'; }
  function summaryStat(label, val, color) { return el('div', {}, [el('div', { class: 'hint' }, label), el('div', { style: 'font-size:1.4rem;font-weight:800;' + (color ? 'color:' + color : '') }, val)]); }
  function legendRow(kind, label) {
    const sw = el('span', { style: 'display:inline-block;width:16px;height:16px;border-radius:4px;margin-right:8px;vertical-align:middle;' });
    if (kind === 'exam') sw.style.background = 'var(--exam-bg)'; else if (kind === 'acad') sw.style.background = 'var(--acad-bg)'; else { sw.style.background = 'var(--bg)'; sw.style.border = '1px solid var(--border)'; }
    return el('div', { style: 'font-size:.9rem' }, [sw, label]);
  }

  /* =======================================================================
     8. 실전 답안과 GS (보고서 10쪽)
     ======================================================================= */
  const ERROR_TYPES = ['쟁점 누락', '법리', '포섭', '목차', '시간 배분', '기타'];
  const RATERS = [['self', '본인 평가'], ['teacher', '강사 첨삭'], ['ai', 'AI 제안']];

  function renderAnswers(root, ctx) {
    const d = Store.data();
    root.append(el('p', { class: 'page-intro' }, 'GS 회차와 문항별 평가를 기록하고 감점 원인을 다음 학습 과업으로 연결합니다. 점수는 평가자(강사·본인·AI)를 구분해 표시합니다.'));
    root.append(el('div', { class: 'section-head' }, [el('h2', {}, '답안 기록 ' + d.answers.length + '건'), el('button', { class: 'btn btn-primary', onclick: function () { openAnswerEditor(null, ctx); } }, '+ 연습 등록')]));
    if (d.answers.length === 0) {
      root.append(el('div', { class: 'empty' }, [el('span', { class: 'emoji' }, '✍️'), el('h3', {}, '아직 답안 기록이 없습니다'), el('p', {}, '과목·출처·회차·배점을 등록하고 채점 결과와 감점 원인을 남겨보세요.'), el('button', { class: 'btn btn-primary', onclick: function () { openAnswerEditor(null, ctx); } }, '첫 연습 등록')]));
      return;
    }
    function scoreOf(x) { return (x.items || []).reduce(function (s, it) { return s + (Number(it.score) || 0); }, 0); }
    const list = el('div', { class: 'list' });
    d.answers.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).forEach(function (a) {
      const sub = Store.subject(a.subjectId);
      const sum = scoreOf(a);
      const max = (a.items || []).reduce(function (s, it) { return s + (Number(it.max) || 0); }, 0);
      const raterLabel = (RATERS.find(function (r) { return r[0] === a.rater; }) || [,'본인 평가'])[1];
      const unscored = a.scored === false;
      const titleRow = el('div', { class: 'title' }, [sub ? el('span', { class: 'tag tag-exam' }, sub.name) : '', ' ' + (a.source || '출처 미상') + ' ' + (a.round ? a.round + '회' : '')]);
      if (a.issue) titleRow.append(el('span', { class: 'tag tag-muted', style: 'margin-left:6px' }, '쟁점:' + a.issue));
      if (a.rater === 'ai') titleRow.append(el('span', { class: 'tag tag-warn', style: 'margin-left:6px' }, 'AI 미확정'));
      if (unscored) titleRow.append(el('span', { class: 'tag tag-warn', style: 'margin-left:6px' }, '미채점'));
      // 재작성이면 원본 대비 점수 변화 비교 (보고서 7쪽)
      let compare = '';
      if (a.rewriteOf) {
        const orig = d.answers.find(function (x) { return x.id === a.rewriteOf; });
        if (orig && !unscored) {
          const diff = sum - scoreOf(orig);
          compare = ' · 재작성 ' + (diff > 0 ? '▲+' + diff : diff < 0 ? '▼' + diff : '±0') + '점';
        } else { compare = ' · 재작성'; }
      }
      const metaParts = [
        a.date ? fmtDate(a.date) + ' · ' : '',
        (max > 0 && !unscored) ? sum + '/' + max + '점 · ' : (unscored ? '채점 전 · ' : ''),
        el('span', { class: 'tag tag-muted' }, raterLabel),
        (a.errors && a.errors.length) ? ' · 감점: ' + a.errors.join(', ') : '',
        compare,
      ];
      list.append(el('div', { class: 'item', style: 'cursor:pointer', onclick: function () { openAnswerEditor(a, ctx); } }, [
        el('div', { class: 'main' }, [titleRow, el('div', { class: 'meta' }, metaParts)]),
      ]));
    });
    root.append(list);
  }

  function openAnswerEditor(ans, ctx) {
    const d = Store.data();
    const isNew = !ans;
    const a = ans ? JSON.parse(JSON.stringify(ans)) : { id: null, subjectId: d.subjects[0] && d.subjects[0].id, source: '', round: '', timeLimit: 120, date: new Date().toISOString().slice(0, 10), rater: 'self', items: [{ label: '1문', score: 0, max: 50 }], errors: [], note: '', rewriteOf: null };

    const subjSel = el('select', {}); d.subjects.forEach(function (s) { subjSel.append(el('option', { value: s.id, selected: s.id === a.subjectId }, s.name)); });
    const sourceInput = el('input', { type: 'text', value: a.source, placeholder: '예: ○○학원 GS 2순환' });
    const roundInput = el('input', { type: 'number', value: a.round || '', placeholder: '회차', min: '1' });
    const dateInput = el('input', { type: 'date', value: a.date });
    const raterSel = el('select', {}); RATERS.forEach(function (p) { raterSel.append(el('option', { value: p[0], selected: p[0] === a.rater }, p[1])); });

    const itemsWrap = el('div', { class: 'stack' });
    const totalEl = el('div', { class: 'hint', style: 'font-weight:700;margin-top:4px' });
    function updateTotal() { const sum = a.items.reduce(function (s, it) { return s + (Number(it.score) || 0); }, 0); const max = a.items.reduce(function (s, it) { return s + (Number(it.max) || 0); }, 0); totalEl.textContent = '문항 합계 ' + sum + ' / 배점 합계 ' + max + '점'; }
    function renderItems() {
      itemsWrap.innerHTML = '';
      a.items.forEach(function (it, i) {
        const label = el('input', { type: 'text', value: it.label, placeholder: '문항', style: 'flex:2' });
        const score = el('input', { type: 'number', value: it.score, min: '0', style: 'flex:1', 'aria-label': '득점' });
        const max = el('input', { type: 'number', value: it.max, min: '0', style: 'flex:1', 'aria-label': '배점' });
        label.oninput = function () { it.label = label.value; };
        score.oninput = function () { it.score = clampNum(score.value, 0, Number(max.value) || 100); updateTotal(); };
        max.oninput = function () { it.max = clampNum(max.value, 0, 1000); updateTotal(); };
        itemsWrap.append(el('div', { class: 'row', style: 'gap:8px' }, [label, score, el('span', { class: 'hint' }, '/'), max, el('button', { class: 'btn btn-sm btn-ghost', 'aria-label': '문항 삭제', onclick: function () { a.items.splice(i, 1); renderItems(); updateTotal(); } }, '✕')]));
      });
    }
    renderItems(); updateTotal();

    const errWrap = el('div', { class: 'pill-row' });
    ERROR_TYPES.forEach(function (e) {
      const pill = el('button', { class: 'pill', 'aria-pressed': String(a.errors.indexOf(e) >= 0), type: 'button' }, e);
      pill.onclick = function () { const on = pill.getAttribute('aria-pressed') === 'true'; pill.setAttribute('aria-pressed', String(!on)); if (on) a.errors = a.errors.filter(function (x) { return x !== e; }); else a.errors.push(e); };
      errWrap.append(pill);
    });
    const noteInput = el('textarea', { placeholder: '평가 메모 · 감점 위치 · 다음 보완 과업' }, a.note || '');

    // 쟁점(issue) 연결 — 같은 과목+쟁점의 노트/과업/카드를 하나로 묶는 축 (보고서 7쪽)
    const issueInput = el('input', { type: 'text', value: a.issue || '', placeholder: '예: 진보성 판단 / 상표 유사판단' });
    const linkRow = el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;margin-top:8px' });
    function rebuildLinkRow() {
      linkRow.innerHTML = '';
      const issue = issueInput.value.trim();
      if (!issue) { linkRow.append(el('span', { class: 'hint' }, '쟁점을 입력하면 관련 노트 열기·보완 과업 만들기가 활성화됩니다.')); return; }
      const subjectId = subjSel.value;
      const relNote = Store.data().notes.find(function (n) { return n.subjectId === subjectId && n.issue && n.issue.trim() === issue; });
      // 관련 노트: 있으면 열기, 없으면 생성
      linkRow.append(el('button', { class: 'btn btn-sm', type: 'button', onclick: function () {
        persist();                                   // 지금까지 입력 저장
        if (relNote) { m.close(); openNoteById(relNote.id, ctx); }
        else {
          // 이 쟁점으로 새 노트 생성 후 열기
          const nn = { id: Store.id('note'), title: issue, subjectId: subjectId, unit: '', issue: issue, importance: 2, status: 'todo', appliedDate: '', body: '', source: { ref: '', caseId: '', page: '', url: '', checkedDate: '' }, linkedAnswers: [a.id], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), versions: [] };
          Store.update(function (dd) { dd.notes.push(nn); dd.lastOpenNote = nn.id; });
          m.close(); openNoteById(nn.id, ctx); ctx.toast('이 쟁점의 노트를 만들었습니다.');
        }
      } }, relNote ? '관련 노트 열기 ▸' : '이 쟁점 노트 만들기 ▸'));
      // 보완 과업 만들기
      linkRow.append(el('button', { class: 'btn btn-sm', type: 'button', onclick: function () {
        persist();
        Store.update(function (dd) {
          dd.tasks.push({ id: Store.id('task'), title: '[보완] ' + issue + (a.errors && a.errors.length ? ' (' + a.errors.join('/') + ')' : ''), subjectId: subjectId, area: '취약 쟁점', importance: 3, due: '', estMin: 60, status: 'todo', issue: issue, fromAnswer: a.id, createdAt: new Date().toISOString() });
        });
        ctx.toast('보완 과업을 만들었습니다. 주간 계획에서 시간을 확보하세요.');
        rebuildLinkRow();
      } }, '보완 과업 만들기'));
      // 복습 카드 초안
      linkRow.append(el('button', { class: 'btn btn-sm', type: 'button', onclick: function () {
        persist();
        Store.update(function (dd) {
          dd.cards.push({ id: Store.id('card'), q: issue + ' — 핵심 요건/판시는?', a: '', subjectId: subjectId, noteId: (relNote ? relNote.id : null), issue: issue, status: 'draft', nextReview: todayKey(), interval: 1, reps: 0, verified: false, createdAt: new Date().toISOString() });
        });
        ctx.toast('복습 카드 초안을 만들었습니다. 복습 화면에서 답을 채우고 활성화하세요.');
      } }, '복습 카드 초안'));
    }
    issueInput.oninput = rebuildLinkRow;
    subjSel.addEventListener('change', rebuildLinkRow);
    rebuildLinkRow();

    const body = el('div', {}, [
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '과목'), subjSel]), el('div', { class: 'field' }, [el('label', {}, '날짜'), dateInput])]),
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '출처'), sourceInput]), el('div', { class: 'field' }, [el('label', {}, '회차'), roundInput])]),
      el('div', { class: 'field' }, [el('label', {}, '평가자'), raterSel, el('p', { class: 'hint' }, 'AI 제안 점수는 확정 점수와 같은 선으로 합치지 않습니다.')]),
      el('div', { class: 'field' }, [el('label', {}, '문항별 배점 / 득점'), itemsWrap, totalEl, el('button', { class: 'btn btn-sm', style: 'margin-top:8px', type: 'button', onclick: function () { a.items.push({ label: (a.items.length + 1) + '문', score: 0, max: 0 }); renderItems(); } }, '+ 문항 추가')]),
      el('div', { class: 'field' }, [el('label', {}, '오류 분류'), errWrap]),
      el('div', { class: 'field' }, [el('label', {}, '대상 쟁점 (학습 동선 연결)'), issueInput, linkRow]),
      el('div', { class: 'field' }, [el('label', {}, '평가 메모'), noteInput]),
    ]);
    const footer = [
      !isNew ? el('button', { class: 'btn', onclick: function () { markRewrite(a, ctx, m); } }, '재작성 등록') : null,
      !isNew ? el('button', { class: 'btn btn-danger', onclick: function () { Store.update(function (dd) { dd.answers = dd.answers.filter(function (x) { return x.id !== a.id; }); }); m.close(); ctx.refresh(); ctx.toast('삭제했습니다.'); } }, '삭제') : null,
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'),
      el('button', { class: 'btn btn-primary', onclick: save }, '저장'),
    ];
    const m = ctx.modal({ title: isNew ? '연습 등록' : '답안 평가 편집', body: body, footer: footer });

    // 현재 입력 내용을 데이터에 반영(저장). 연결 버튼이 모달을 닫기 전에 호출.
    function persist() {
      a.subjectId = subjSel.value; a.source = sourceInput.value.trim(); a.round = roundInput.value;
      a.date = dateInput.value; a.rater = raterSel.value; a.note = noteInput.value; a.issue = issueInput.value.trim();
      if (a.scored === undefined) a.scored = true; // 일반 입력은 채점됨으로 간주(재작성만 미채점)
      Store.update(function (dd) {
        if (!a.id) { a.id = Store.id('ans'); dd.answers.push(a); }
        else {
          const ex = dd.answers.find(function (x) { return x.id === a.id; });
          if (ex) Object.assign(ex, a); else dd.answers.push(a);
        }
      });
    }
    function save() { persist(); m.close(); ctx.refresh(); ctx.toast('답안 기록을 저장했습니다.'); }
  }
  function markRewrite(orig, ctx, parentModal) {
    Store.update(function (dd) {
      const copy = JSON.parse(JSON.stringify(orig));
      copy.id = Store.id('ans');
      copy.rewriteOf = orig.id;
      copy.date = new Date().toISOString().slice(0, 10);
      copy.rater = 'self';
      copy.scored = false;                 // 미채점 상태로 시작 (보고서 3·6쪽 P1)
      // 문항 배점은 유지하되 득점은 0으로 초기화 — 평가된 것처럼 보이지 않게
      (copy.items || []).forEach(function (it) { it.score = 0; });
      copy.errors = [];                    // 감점 기록도 초기화(새로 평가)
      copy.note = '[재작성 · 미채점] ' + (orig.note ? '(이전 메모 참고) ' : '');
      dd.answers.push(copy);
    });
    parentModal.close(); ctx.refresh(); ctx.toast('재작성 답안을 미채점 상태로 생성했습니다. 채점 후 이전과 비교됩니다.');
  }

  /* =======================================================================
     9. 단권화 노트 (보고서 11쪽)
     ======================================================================= */
  const NOTE_STATUSES = [['todo', '미정리'], ['doing', '정리 중'], ['done', '검토 완료'], ['recheck', '재확인 필요']];
  let noteFilter = { subjectId: '', status: '', q: '' };
  let noteSelectedId = null;
  // 복습 세션 중 원문을 열었을 때, 복습으로 복귀하기 위한 상태 (보고서 6·7쪽 P1)
  let pendingReviewReturn = null; // { queueIds:[...], idx:number }
  let noteEditMode = false;        // 노트: false=읽기 모드(기본), true=편집 모드 (보고서 9쪽)
  // 특정 노트를 지정해 노트 화면을 여는 헬퍼 (쟁점 ID 기반 직접 이동)
  function openNoteById(noteId, ctx) {
    if (noteId && Store.note(noteId)) {
      noteSelectedId = noteId;
      Store.update(function (dd) { dd.lastOpenNote = noteId; });
    }
    ctx.navigate('notes');
  }

  function renderNotes(root, ctx) {
    const d = Store.data();
    noteSelectedId = noteSelectedId || d.lastOpenNote || (d.notes[0] && d.notes[0].id) || null;
    // 복습 중 원문을 열어 온 경우: 복습 큐로 돌아가는 배너 (보고서 7쪽: 현재 위치 복원)
    if (pendingReviewReturn) {
      const ret = pendingReviewReturn;
      root.append(el('div', { class: 'card', style: 'background:var(--exam-bg);display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px' }, [
        el('span', { style: 'color:var(--exam-fg);font-weight:700' }, '복습을 보던 중입니다'),
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn btn-sm', onclick: function () { pendingReviewReturn = null; ctx.refresh(); } }, '복습 종료'),
        el('button', { class: 'btn btn-primary btn-sm', onclick: function () {
          pendingReviewReturn = null;
          const d2 = Store.data();
          const queue = ret.queueIds.map(function (id) { return d2.cards.find(function (c) { return c.id === id; }); }).filter(Boolean);
          ctx.navigate('review');
          if (queue.length) startSession(queue, ctx, ret.idx);
        } }, '복습으로 돌아가기 ▸' ),
      ]));
    }
    root.append(el('p', { class: 'page-intro' }, '작성일보다 과목·쟁점으로 찾기 쉽게. 원문·내 이해·확정하지 않은 생각을 구분하고 한 쟁점에 답안·복습·출처를 연결합니다.'));

    const layout = el('div', { class: 'grid', style: 'grid-template-columns: 340px 1fr; gap:16px' });
    const listCol = el('div', { class: 'stack' });
    const toolbar = el('div', { class: 'card', style: 'padding:16px' });
    const q = el('input', { type: 'search', value: noteFilter.q, placeholder: '제목·본문·쟁점 검색', 'aria-label': '노트 검색' });
    q.oninput = function () { noteFilter.q = q.value; renderList(); };
    const subjSel = el('select', { 'aria-label': '과목 필터' }); subjSel.append(el('option', { value: '' }, '모든 과목'));
    d.subjects.forEach(function (s) { subjSel.append(el('option', { value: s.id, selected: s.id === noteFilter.subjectId }, s.name)); });
    subjSel.onchange = function () { noteFilter.subjectId = subjSel.value; renderList(); };
    const statSel = el('select', { 'aria-label': '상태 필터' }); statSel.append(el('option', { value: '' }, '모든 상태'));
    NOTE_STATUSES.forEach(function (p) { statSel.append(el('option', { value: p[0], selected: p[0] === noteFilter.status }, p[1])); });
    statSel.onchange = function () { noteFilter.status = statSel.value; renderList(); };
    toolbar.append(el('div', { class: 'field', style: 'margin-bottom:8px' }, [q]), el('div', { class: 'row', style: 'gap:8px' }, [subjSel, statSel]), el('button', { class: 'btn btn-primary btn-block', style: 'margin-top:12px', onclick: function () { createNote(ctx); } }, '+ 새 노트'));
    listCol.append(toolbar);
    const listCard = el('div', { class: 'card', style: 'padding:8px' });
    const listInner = el('div', { class: 'list' });
    listCard.append(listInner); listCol.append(listCard);

    const detailCol = el('div', {});

    function renderList() {
      const data = Store.data();
      listInner.innerHTML = '';
      const items = data.notes.filter(function (n) {
        if (noteFilter.subjectId && n.subjectId !== noteFilter.subjectId) return false;
        if (noteFilter.status && n.status !== noteFilter.status) return false;
        if (noteFilter.q) { const hay = (n.title + ' ' + n.issue + ' ' + n.body + ' ' + n.unit).toLowerCase(); if (hay.indexOf(noteFilter.q.toLowerCase()) < 0) return false; }
        return true;
      }).sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
      if (items.length === 0) { listInner.append(el('p', { class: 'hint', style: 'padding:12px' }, data.notes.length ? '조건에 맞는 노트가 없습니다.' : '아직 노트가 없습니다. 첫 노트를 만들어 보세요.')); return; }
      items.forEach(function (n) {
        const sub = Store.subject(n.subjectId);
        const statLabel = (NOTE_STATUSES.find(function (s) { return s[0] === n.status; }) || [,'미정리'])[1];
        const row = el('button', { class: 'nav-item', style: 'flex-direction:column;align-items:flex-start;height:auto;padding:10px 12px;gap:2px', 'aria-current': noteSelectedId === n.id ? 'page' : null }, [
          el('div', { style: 'font-weight:700' }, n.title || '(제목 없음)'),
          el('div', { class: 'meta', style: 'font-size:.78rem;color:var(--text-sub)' }, [sub ? sub.name : '', n.issue ? ' · ' + n.issue : '', ' · ' + statLabel]),
        ]);
        row.onclick = function () { noteSelectedId = n.id; Store.update(function (dd) { dd.lastOpenNote = n.id; }); renderDetail(); renderList(); };
        listInner.append(row);
      });
    }
    function renderDetail() {
      // 이전 에디터의 저장 이벤트 리스너 정리
      const prev = detailCol.firstChild;
      if (prev && typeof prev._cleanup === 'function') prev._cleanup();
      detailCol.innerHTML = '';
      const n = Store.note(noteSelectedId);
      if (!n) { detailCol.append(el('div', { class: 'empty' }, [el('span', { class: 'emoji' }, '📒'), el('h3', {}, '노트를 선택하거나 새로 만드세요'), el('button', { class: 'btn btn-primary', onclick: function () { createNote(ctx); } }, '새 노트')])); return; }
      detailCol.append(buildNoteEditor(n, ctx, renderList, renderDetail));
    }

    layout.append(listCol, detailCol);
    root.append(layout);
    renderList(); renderDetail();
  }

  function createNote(ctx) {
    const d = Store.data();
    const n = { id: Store.id('note'), title: '새 쟁점 노트', subjectId: d.subjects[0] && d.subjects[0].id, unit: '', issue: '', importance: 2, status: 'todo', appliedDate: '', body: '', source: { ref: '', caseId: '', page: '', url: '', checkedDate: '' }, linkedAnswers: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), versions: [] };
    Store.update(function (dd) { dd.notes.push(n); dd.lastOpenNote = n.id; });
    noteSelectedId = n.id;
    noteEditMode = true; // 새 노트는 바로 편집 모드로
    ctx.refresh();
  }

  function buildNoteEditor(n, ctx, refreshList, refreshDetail) {
    const d = Store.data();
    const wrap = el('div', { class: 'card' });
    const saveStatus = el('span', { class: 'save-status' }, '저장됨');
    let saveTimer, pendingSave = false;
    // 실제 저장 성공(store:saved) 이후에만 "저장됨" 표시 (보고서 4쪽 P0)
    function onSaved() {
      if (!pendingSave) return;
      pendingSave = false;
      saveStatus.textContent = '저장됨 · ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      saveStatus.style.color = '';
      refreshList();
    }
    function onSaveFail() {
      if (!pendingSave) return;
      pendingSave = false;
      saveStatus.textContent = '⚠ 저장 실패 — 내용은 보존됨, 다시 시도하세요';
      saveStatus.style.color = 'var(--warn-fg)';
    }
    window.addEventListener('store:saved', onSaved);
    window.addEventListener('store:save-failed', onSaveFail);
    // 이 에디터 DOM이 제거되면 리스너도 정리 (다음 렌더 때 중복 방지)
    wrap._cleanup = function () {
      window.removeEventListener('store:saved', onSaved);
      window.removeEventListener('store:save-failed', onSaveFail);
    };
    function touch() {
      saveStatus.textContent = '저장 중…';
      saveStatus.style.color = 'var(--text-sub)';
      pendingSave = true;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        // Store.update → 내부 save()는 디바운스 후 commit, commit 성공 시 store:saved 발생
        Store.update(function (dd) { const x = dd.notes.find(function (z) { return z.id === n.id; }); if (x) x.updatedAt = new Date().toISOString(); });
      }, 500);
    }
    const title = el('input', { type: 'text', value: n.title, style: 'font-size:1.2rem;font-weight:700' });
    title.oninput = function () { n.title = title.value; touch(); };
    const subjSel = el('select', {}); d.subjects.forEach(function (s) { subjSel.append(el('option', { value: s.id, selected: s.id === n.subjectId }, s.name)); });
    const sub = Store.subject(n.subjectId);
    const breadcrumb = el('div', { class: 'hint', style: 'margin-bottom:8px' }, (sub ? sub.name : '') + ' ' + (n.unit ? '› ' + n.unit : '') + ' ' + (n.issue ? '› ' + n.issue : ''));
    function updateCrumb() { const s = Store.subject(subjSel.value); breadcrumb.textContent = (s ? s.name : '') + ' ' + (n.unit ? '› ' + n.unit : '') + ' ' + (n.issue ? '› ' + n.issue : ''); }
    subjSel.onchange = function () { n.subjectId = subjSel.value; updateCrumb(); touch(); };
    const unit = el('input', { type: 'text', value: n.unit, placeholder: '대단원' }); unit.oninput = function () { n.unit = unit.value; updateCrumb(); touch(); };
    const issue = el('input', { type: 'text', value: n.issue, placeholder: '쟁점' }); issue.oninput = function () { n.issue = issue.value; updateCrumb(); touch(); };
    const statSel = el('select', {}); NOTE_STATUSES.forEach(function (p) { statSel.append(el('option', { value: p[0], selected: p[0] === n.status }, p[1])); }); statSel.onchange = function () { n.status = statSel.value; touch(); };
    const applied = el('input', { type: 'date', value: n.appliedDate || '' }); applied.onchange = function () { n.appliedDate = applied.value; touch(); };
    const body = el('textarea', { style: 'min-height:260px;font-size:1.05rem;line-height:1.8', placeholder: '쟁점\n → 규범과 판례 태도\n → 사안 적용\n → 결론\n → 자주 하는 오류' }, n.body || '');
    body.oninput = function () { n.body = body.value; touch(); };

    const src = n.source || {};
    const ref = el('input', { type: 'text', value: src.ref || '', placeholder: '문헌명' });
    const caseId = el('input', { type: 'text', value: src.caseId || '', placeholder: '판례 식별 (예: 2020다12345)' });
    const page = el('input', { type: 'text', value: src.page || '', placeholder: 'PDF/종이 쪽수' });
    const url = el('input', { type: 'text', value: src.url || '', placeholder: 'URL' });
    const checked = el('input', { type: 'date', value: src.checkedDate || '' });
    [ref, caseId, page, url, checked].forEach(function (inp) { inp.oninput = inp.onchange = function () { n.source = { ref: ref.value, caseId: caseId.value, page: page.value, url: url.value, checkedDate: checked.value }; touch(); }; });

    // 공통 상단 바 (저장상태 + 모드 토글 + 액션)
    const modeBtn = el('button', { class: 'btn btn-sm' + (noteEditMode ? '' : ' btn-primary'), onclick: function () { noteEditMode = !noteEditMode; refreshDetail(); } }, noteEditMode ? '읽기로' : '편집');
    const topBar = el('div', { class: 'row between', style: 'margin-bottom:12px' }, [
      saveStatus,
      el('div', { class: 'row', style: 'gap:8px' }, [
        modeBtn,
        el('button', { class: 'btn btn-sm', onclick: function () { makeCardFromNote(n, ctx); } }, '복습 카드 생성'),
        el('button', { class: 'btn btn-sm btn-danger', onclick: async function () { if (await ctx.confirm('이 노트를 삭제할까요?', { danger: true, okText: '삭제' })) { Store.update(function (dd) { dd.notes = dd.notes.filter(function (x) { return x.id !== n.id; }); dd.lastOpenNote = null; }); noteSelectedId = null; refreshDetail(); refreshList(); ctx.toast('노트를 삭제했습니다.'); } } }, '삭제'),
      ]),
    ]);

    if (!noteEditMode) {
      // ── 읽기 모드: 제목·경로·본문 우선, 메타/원문은 접어 둠 (보고서 9쪽) ──
      const bodyHtml = n.body ? escapeHtml(n.body).replace(/\n/g, '<br>') : '<span class="hint">본문이 비어 있습니다. "편집"을 눌러 작성하세요.</span>';
      const srcLines = [];
      if (src.ref) srcLines.push('문헌: ' + src.ref);
      if (src.caseId) srcLines.push('판례: ' + src.caseId);
      if (src.page) srcLines.push('쪽수: ' + src.page);
      if (src.checkedDate) srcLines.push('확인일: ' + src.checkedDate);
      const statLabel = (NOTE_STATUSES.find(function (p) { return p[0] === n.status; }) || [, '미정리'])[1];
      wrap.append(
        topBar,
        el('h2', { style: 'font-size:1.4rem;margin-bottom:4px' }, n.title || '(제목 없음)'),
        breadcrumb,
        el('div', { class: 'row', style: 'gap:6px;margin-bottom:12px;flex-wrap:wrap' }, [
          el('span', { class: 'tag tag-muted' }, statLabel),
          n.appliedDate ? el('span', { class: 'hint' }, '적용 기준일 ' + n.appliedDate) : '',
        ]),
        el('div', { class: 'note-read', style: 'font-size:1.08rem;line-height:1.9;max-width:62ch', html: bodyHtml }),
        (srcLines.length || src.url) ? el('details', { style: 'margin-top:16px' }, [
          el('summary', { class: 'hint', style: 'cursor:pointer' }, '원문 근거'),
          el('p', { class: 'hint', style: 'margin:6px 0 0' }, srcLines.join(' · ')),
          src.url ? el('p', { style: 'margin:4px 0 0' }, el('a', { href: src.url, target: '_blank', rel: 'noopener' }, '원문 열기 ↗')) : null,
        ]) : null,
      );
      return wrap;
    }

    // ── 편집 모드: 전체 폼 ──
    wrap.append(
      topBar,
      title, breadcrumb,
      el('div', { class: 'field-row', style: 'margin-top:12px' }, [el('div', { class: 'field' }, [el('label', {}, '과목'), subjSel]), el('div', { class: 'field' }, [el('label', {}, '대단원'), unit])]),
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '쟁점'), issue]), el('div', { class: 'field' }, [el('label', {}, '상태'), statSel])]),
      el('div', { class: 'field' }, [el('label', {}, '적용 기준일 (법령·판례 변경 대응)'), applied]),
      el('hr', { class: 'divider' }),
      el('div', { class: 'field' }, [el('label', {}, '본문'), body]),
      el('hr', { class: 'divider' }),
      el('h3', {}, '원문 근거'),
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '문헌명'), ref]), el('div', { class: 'field' }, [el('label', {}, '판례 식별'), caseId])]),
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '쪽수'), page]), el('div', { class: 'field' }, [el('label', {}, '확인일'), checked])]),
      el('div', { class: 'field' }, [el('label', {}, 'URL'), url, url.value ? el('p', { class: 'hint' }, el('a', { href: url.value, target: '_blank', rel: 'noopener' }, '원문 열기 ↗')) : null])
    );
    return wrap;
  }
  function makeCardFromNote(n, ctx) {
    Store.update(function (dd) { dd.cards.push({ id: Store.id('card'), q: n.issue ? n.issue + ' — 핵심 요건/판시는?' : (n.title + ' 핵심?'), a: '', subjectId: n.subjectId, noteId: n.id, status: 'draft', nextReview: new Date().toISOString().slice(0, 10), interval: 1, ease: 2.5, reps: 0, createdAt: new Date().toISOString(), verified: false }); });
    ctx.toast('복습 카드 초안을 만들었습니다. 복습 화면에서 답을 채우고 활성화하세요.');
  }

  /* =======================================================================
     10. 복습과 취약 쟁점 (보고서 12쪽)
     ======================================================================= */
  const DAILY_LIMIT = 40;
  function renderReview(root, ctx) {
    const d = Store.data();
    root.append(el('p', { class: 'page-intro' }, '기억나는지 확인하는 과정과 근거를 다시 확인하는 과정을 분리합니다. 초기 간격 규칙은 아래에 공개합니다.'));
    if (d.cards.length === 0) {
      root.append(el('div', { class: 'empty' }, [el('span', { class: 'emoji' }, '🔁'), el('h3', {}, '아직 복습 카드가 없습니다'), el('p', {}, '직접 만들거나, 단권화 노트에서 "복습 카드 생성"으로 초안을 만들 수 있습니다.'), el('button', { class: 'btn btn-primary', onclick: function () { openCardEditor(null, ctx); } }, '첫 카드 만들기')]));
      return;
    }
    const tk = todayKey();
    const active = d.cards.filter(function (c) { return c.status === 'active'; });
    const drafts = d.cards.filter(function (c) { return c.status === 'draft'; });
    const due = active.filter(function (c) { return c.nextReview && c.nextReview <= tk; });
    const todayDue = due.slice(0, DAILY_LIMIT);
    const backlog = due.length - todayDue.length;

    const summary = el('div', { class: 'card', style: 'margin-bottom:16px' });
    summary.append(el('div', { class: 'row between' }, [
      el('div', { class: 'row', style: 'gap:16px' }, [stat('오늘 복습 대기', due.length + '개'), stat('일일 상한', DAILY_LIMIT + '개'), backlog > 0 ? stat('밀린 카드', backlog + '개', 'var(--warn-fg)') : null, drafts.length ? stat('초안', drafts.length + '개', 'var(--text-sub)') : null]),
      el('div', { class: 'row', style: 'gap:8px' }, [el('button', { class: 'btn btn-sm', onclick: function () { openCardEditor(null, ctx); } }, '+ 카드'), due.length ? el('button', { class: 'btn btn-primary', onclick: function () { startSession(todayDue, ctx); } }, '복습 시작') : null]),
    ]));
    root.append(summary);

    root.append(el('details', { class: 'card', style: 'margin-bottom:16px' }, [el('summary', { style: 'cursor:pointer;font-weight:700' }, '간격 규칙(계산 근거)'), el('p', { class: 'hint', style: 'margin-top:8px' }, '초기 규칙: 다시학습 → 1일 뒤 / 어려움 → 간격 ×1.2 / 보통 → 간격 ×2.5 / 쉬움 → 간격 ×3.5. 반복 오답은 간격만 줄이지 말고 원문 재확인·답안 적용 과업으로 전환하세요.')]));

    if (drafts.length) {
      root.append(el('h3', { style: 'margin:16px 0 8px' }, '확인 대기 초안'));
      const list = el('div', { class: 'list' }); drafts.forEach(function (c) { list.append(cardRow(c, ctx, true)); }); root.append(list);
    }
    root.append(el('h3', { style: 'margin:16px 0 8px' }, '활성 카드 ' + active.length + '개'));
    if (active.length === 0) root.append(el('p', { class: 'hint' }, '활성 카드가 없습니다.'));
    else { const list = el('div', { class: 'list' }); active.sort(function (a, b) { return (a.nextReview || '').localeCompare(b.nextReview || ''); }).forEach(function (c) { list.append(cardRow(c, ctx, false)); }); root.append(list); }
  }
  function cardRow(c, ctx, isDraft) {
    const sub = Store.subject(c.subjectId);
    const item = el('div', { class: 'item', style: 'cursor:pointer', onclick: function () { openCardEditor(c, ctx); } }, [
      el('div', { class: 'main' }, [el('div', { class: 'title' }, c.q || '(질문 없음)'), el('div', { class: 'meta' }, [sub ? el('span', { class: 'tag tag-exam' }, sub.name) : '', isDraft ? el('span', { class: 'tag tag-muted', style: 'margin-left:6px' }, '초안') : ' · 다음 복습 ' + (c.nextReview || '-'), !c.verified ? el('span', { class: 'tag tag-warn', style: 'margin-left:6px' }, '미검토') : ''])]),
    ]);
    if (isDraft) item.append(el('button', { class: 'btn btn-sm btn-primary', onclick: function (e) { e.stopPropagation(); activateCard(c, ctx); } }, '활성화'));
    return item;
  }
  function activateCard(c, ctx) {
    if (!c.a || !c.a.trim()) { openCardEditor(c, ctx); ctx.toast('답을 채운 뒤 활성화하세요.', 'warn'); return; }
    Store.update(function (dd) { const x = dd.cards.find(function (z) { return z.id === c.id; }); x.status = 'active'; x.nextReview = todayKey(); });
    ctx.refresh(); ctx.toast('카드를 활성화했습니다.');
  }
  function startSession(queue, ctx, startIdx) {
    let idx = (typeof startIdx === 'number' && startIdx >= 0 && startIdx < queue.length) ? startIdx : 0;
    const body = el('div', {});
    const m = ctx.modal({ title: '복습 세션', body: body, footer: null });
    render();
    function render() {
      body.innerHTML = '';
      if (idx >= queue.length) { body.append(el('div', { class: 'empty', style: 'border:none' }, [el('span', { class: 'emoji' }, '✅'), el('h3', {}, '오늘 복습 완료'), el('button', { class: 'btn btn-primary', onclick: function () { m.close(); ctx.refresh(); } }, '닫기')])); return; }
      const c = queue[idx];
      const sub = Store.subject(c.subjectId);
      body.append(el('div', { class: 'hint', style: 'margin-bottom:8px' }, (idx + 1) + ' / ' + queue.length + (sub ? ' · ' + sub.name : '')), el('div', { class: 'card', style: 'background:var(--bg)' }, [el('div', { style: 'font-weight:700;font-size:1.1rem' }, c.q)]));
      const answerBox = el('div', { style: 'margin-top:12px' });
      const showBtn = el('button', { class: 'btn btn-block', onclick: reveal }, '답 확인');
      body.append(showBtn, answerBox);
      const startTs = Date.now();
      function reveal() {
        showBtn.remove();
        const note = c.noteId ? Store.note(c.noteId) : null;
        answerBox.append(
          el('div', { class: 'card' }, [
            el('div', { html: escapeHtml(c.a || '(답 미입력)').replace(/\n/g, '<br>') }),
            note
              ? el('button', { class: 'btn btn-sm', style: 'margin-top:8px', onclick: function () {
                  // 복습 큐 상태를 저장해 두고, 카드가 가리키는 '정확한' 노트를 연다 (보고서 P1)
                  pendingReviewReturn = { queueIds: queue.map(function (q) { return q.id; }), idx: idx };
                  m.close();
                  openNoteById(c.noteId, ctx);
                } }, '원문 노트 열기 ▸ ' + (note.issue || note.title || '노트'))
              : (c.noteId ? el('span', { class: 'hint' }, '(연결된 원문 노트를 찾을 수 없습니다)') : null),
          ]),
          el('p', { class: 'hint', style: 'margin:12px 0 6px' }, '자기 평가'),
          el('div', { class: 'row', style: 'gap:8px' }, [gradeBtn('다시 학습', 0), gradeBtn('어려움', 1), gradeBtn('보통', 2), gradeBtn('쉬움', 3)])
        );
      }
      function gradeBtn(label, grade) { return el('button', { class: 'btn' + (grade === 0 ? ' btn-danger' : grade >= 2 ? ' btn-primary' : ''), style: 'flex:1', onclick: function () { grade_(c, grade, Math.round((Date.now() - startTs) / 1000)); } }, label); }
    }
    function grade_(c, grade, respSec) {
      Store.update(function (dd) {
        const x = dd.cards.find(function (z) { return z.id === c.id; });
        let interval = x.interval || 1;
        if (grade === 0) interval = 1; else if (grade === 1) interval = Math.max(1, Math.round(interval * 1.2)); else if (grade === 2) interval = Math.max(1, Math.round(interval * 2.5)); else interval = Math.max(1, Math.round(interval * 3.5));
        x.interval = interval; x.reps = (x.reps || 0) + 1;
        const next = new Date(); next.setDate(next.getDate() + interval); x.nextReview = next.toISOString().slice(0, 10);
        dd.reviews.push({ id: Store.id('rev'), cardId: c.id, grade: grade, respSec: respSec, at: new Date().toISOString() });
      });
      idx++; render();
    }
  }
  function openCardEditor(card, ctx) {
    const d = Store.data();
    const isNew = !card;
    const c = card || { id: null, q: '', a: '', subjectId: d.subjects[0] && d.subjects[0].id, noteId: null, status: 'active', nextReview: todayKey(), interval: 1, reps: 0, verified: false };
    const q = el('textarea', { placeholder: '질문 (하나의 회상 목표로 분리: 요건·판시 핵심·구별 포인트)' }, c.q || '');
    const a = el('textarea', { placeholder: '답' }, c.a || '');
    const subjSel = el('select', {}); d.subjects.forEach(function (s) { subjSel.append(el('option', { value: s.id, selected: s.id === c.subjectId }, s.name)); });
    const verified = el('input', { type: 'checkbox', checked: !!c.verified, style: 'width:20px;min-height:20px' });
    const body = el('div', {}, [el('div', { class: 'field' }, [el('label', {}, '질문'), q]), el('div', { class: 'field' }, [el('label', {}, '답'), a]), el('div', { class: 'field' }, [el('label', {}, '과목'), subjSel]), el('label', { class: 'row', style: 'gap:8px' }, [verified, '출처를 확인함 (미체크 시 "미검토" 표시 유지)'])]);
    const footer = [
      !isNew ? el('button', { class: 'btn btn-danger', onclick: function () { Store.update(function (dd) { dd.cards = dd.cards.filter(function (x) { return x.id !== c.id; }); }); m.close(); ctx.refresh(); ctx.toast('삭제했습니다.'); } }, '삭제') : null,
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'),
      el('button', { class: 'btn btn-primary', onclick: save }, '저장'),
    ];
    const m = ctx.modal({ title: isNew ? '새 복습 카드' : '카드 편집', body: body, footer: footer });
    function save() {
      if (!q.value.trim()) { ctx.toast('질문을 입력하세요.', 'warn'); return; }
      Store.update(function (dd) {
        if (isNew) dd.cards.push(Object.assign({}, c, { id: Store.id('card'), q: q.value, a: a.value, subjectId: subjSel.value, verified: verified.checked, status: 'active', createdAt: new Date().toISOString() }));
        else { const x = dd.cards.find(function (z) { return z.id === c.id; }); Object.assign(x, { q: q.value, a: a.value, subjectId: subjSel.value, verified: verified.checked }); if (x.status === 'draft' && x.a.trim()) x.status = 'active'; }
      });
      m.close(); ctx.refresh(); ctx.toast('저장했습니다.');
    }
  }
  function stat(label, val, color) { return el('div', {}, [el('div', { class: 'hint' }, label), el('div', { style: 'font-size:1.3rem;font-weight:800;' + (color ? 'color:' + color : '') }, val)]); }

  /* =======================================================================
     11. 대학 학업 (보고서 13쪽)
     ======================================================================= */
  let acadTab = 'courses';
  function renderAcademic(root, ctx) {
    root.append(el('p', { class: 'page-intro' }, '대학 기능의 목적은 수험 시간을 예측 가능하게 만드는 것입니다. 수업 참여·과제 제출·시험 준비를 우선 관리합니다.'));
    const panel = el('div', {});
    const tabs = el('div', { class: 'tabs', role: 'tablist' });
    [['courses', '수강 과목'], ['assignments', '과제 제출'], ['attendance', '출결']].forEach(function (p) {
      const btn = el('button', { class: 'tab', role: 'tab', 'aria-selected': String(acadTab === p[0]), onclick: function () { acadTab = p[0]; tabs.querySelectorAll('.tab').forEach(function (t) { t.setAttribute('aria-selected', String(t === btn)); }); renderPanel(); } }, p[1]);
      tabs.append(btn);
    });
    root.append(tabs, panel);
    function renderPanel() { panel.innerHTML = ''; if (acadTab === 'courses') renderCourses(panel, ctx); else if (acadTab === 'assignments') renderAssignments(panel, ctx); else renderAttendance(panel, ctx); }
    renderPanel();
  }
  function renderCourses(root, ctx) {
    const d = Store.data();
    root.append(el('div', { class: 'section-head' }, [el('h2', {}, '수강 과목 ' + d.courses.length + '개'), el('button', { class: 'btn btn-primary', onclick: function () { openCourseEditor(null, ctx); } }, '+ 과목 추가')]));
    if (d.courses.length === 0) { root.append(el('div', { class: 'empty' }, [el('span', { class: 'emoji' }, '🎓'), el('h3', {}, '수강 과목을 등록하세요'), el('p', {}, '고정 수업 시간을 등록하면 주간 계획에서 수험 시간과 충돌을 관리합니다.')])); return; }
    const list = el('div', { class: 'list' });
    d.courses.forEach(function (c) {
      list.append(el('div', { class: 'item', style: 'cursor:pointer', onclick: function () { openCourseEditor(c, ctx); } }, [
        el('span', { class: 'tag tag-acad' }, '학업'),
        el('div', { class: 'main' }, [el('div', { class: 'title' }, c.name), el('div', { class: 'meta' }, [c.semester ? c.semester + ' · ' : '', c.credits ? c.credits + '학점 · ' : '', (c.schedule || []).map(function (s) { return WEEKDAYS[s.day] + ' ' + s.start + '~' + s.end; }).join(', '), c.room ? ' · ' + c.room : ''])]),
        c.link ? el('a', { href: c.link, target: '_blank', rel: 'noopener', class: 'btn btn-sm', onclick: function (e) { e.stopPropagation(); } }, '자료 ↗') : null,
      ]));
    });
    root.append(list);
  }
  function openCourseEditor(course, ctx) {
    const isNew = !course;
    const c = course ? JSON.parse(JSON.stringify(course)) : { id: null, name: '', semester: '2026-2', credits: 3, room: '', link: '', schedule: [{ day: 0, start: '09:00', end: '10:30' }] };
    const name = el('input', { type: 'text', value: c.name, placeholder: '과목명' });
    const semester = el('input', { type: 'text', value: c.semester, placeholder: '예: 2026-2' });
    const credits = el('input', { type: 'number', value: c.credits, min: '0', step: '0.5' });
    const room = el('input', { type: 'text', value: c.room, placeholder: '강의실' });
    const link = el('input', { type: 'text', value: c.link, placeholder: '자료 링크 (URL)' });
    const schedWrap = el('div', { class: 'stack' });
    function renderSched() {
      schedWrap.innerHTML = '';
      c.schedule.forEach(function (s, i) {
        const daySel = el('select', { style: 'flex:1' }); WEEKDAYS.forEach(function (w, di) { daySel.append(el('option', { value: di, selected: di === s.day }, w)); }); daySel.onchange = function () { s.day = Number(daySel.value); };
        const st = el('input', { type: 'time', value: s.start, style: 'flex:1' }); st.onchange = function () { s.start = st.value; };
        const en = el('input', { type: 'time', value: s.end, style: 'flex:1' }); en.onchange = function () { s.end = en.value; };
        schedWrap.append(el('div', { class: 'row', style: 'gap:6px' }, [daySel, st, el('span', {}, '~'), en, el('button', { class: 'btn btn-sm btn-ghost', onclick: function () { c.schedule.splice(i, 1); renderSched(); } }, '✕')]));
      });
    }
    renderSched();
    const body = el('div', {}, [
      el('div', { class: 'field' }, [el('label', {}, '과목명'), name]),
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '학기'), semester]), el('div', { class: 'field' }, [el('label', {}, '학점'), credits])]),
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '강의실'), room]), el('div', { class: 'field' }, [el('label', {}, '자료 링크'), link])]),
      el('div', { class: 'field' }, [el('label', {}, '반복 수업 시간'), schedWrap, el('button', { class: 'btn btn-sm', style: 'margin-top:8px', onclick: function () { c.schedule.push({ day: 0, start: '09:00', end: '10:30' }); renderSched(); } }, '+ 시간 추가')]),
    ]);
    const footer = [
      !isNew ? el('button', { class: 'btn btn-danger', onclick: function () { Store.update(function (dd) { dd.courses = dd.courses.filter(function (x) { return x.id !== c.id; }); }); m.close(); ctx.refresh(); ctx.toast('삭제했습니다.'); } }, '삭제') : null,
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'),
      el('button', { class: 'btn btn-primary', onclick: function () {
        if (!name.value.trim()) { ctx.toast('과목명을 입력하세요.', 'warn'); return; }
        c.name = name.value.trim(); c.semester = semester.value; c.credits = clampNum(credits.value, 0, 30); c.room = room.value; c.link = link.value;
        Store.update(function (dd) { if (isNew) { c.id = Store.id('course'); dd.courses.push(c); } else Object.assign(dd.courses.find(function (x) { return x.id === c.id; }), c); });
        m.close(); ctx.refresh(); ctx.toast('저장했습니다.');
      } }, '저장'),
    ];
    const m = ctx.modal({ title: isNew ? '수강 과목 추가' : '과목 편집', body: body, footer: footer });
  }
  function renderAssignments(root, ctx) {
    const d = Store.data();
    root.append(el('div', { class: 'section-head' }, [el('h2', {}, '과제 ' + d.assignments.length + '개'), el('button', { class: 'btn btn-primary', onclick: function () { openAssignmentEditor(null, ctx); } }, '+ 과제 추가')]));
    root.append(el('p', { class: 'hint', style: 'margin-top:-8px;margin-bottom:16px' }, '작성 완료를 제출 완료로 처리하지 않습니다. 홈페이지가 학교 시스템에 자동 제출하지 않습니다.'));
    if (d.assignments.length === 0) { root.append(el('div', { class: 'empty' }, [el('span', { class: 'emoji' }, '📨'), el('h3', {}, '과제를 등록하세요')])); return; }
    const list = el('div', { class: 'list' });
    d.assignments.slice().sort(function (a, b) { return (a.due || '').localeCompare(b.due || ''); }).forEach(function (a) {
      const course = d.courses.find(function (c) { return c.id === a.courseId; });
      const item = el('div', { class: 'item' }, [
        el('div', { class: 'main', style: 'cursor:pointer', onclick: function () { openAssignmentEditor(a, ctx); } }, [el('div', { class: 'title' }, a.title), el('div', { class: 'meta' }, [course ? course.name + ' · ' : '', a.due ? '마감 ' + fmtDate(a.due) : '마감 없음', a.written ? ' · 작성완료' : '', a.submitted ? ' · 제출완료' : ''])]),
        el('button', { class: 'btn btn-sm' + (a.written ? ' btn-primary' : ''), onclick: function () { Store.update(function (dd) { const x = dd.assignments.find(function (z) { return z.id === a.id; }); x.written = !x.written; }); ctx.refresh(); } }, a.written ? '작성✓' : '작성'),
        el('button', { class: 'btn btn-sm' + (a.submitted ? ' btn-primary' : ''), onclick: function () { Store.update(function (dd) { const x = dd.assignments.find(function (z) { return z.id === a.id; }); x.submitted = !x.submitted; x.submittedAt = x.submitted ? new Date().toISOString() : null; }); ctx.refresh(); } }, a.submitted ? '제출✓' : '제출 확인'),
        a.link ? el('a', { href: a.link, target: '_blank', rel: 'noopener', class: 'btn btn-sm' }, '제출처 ↗') : null,
      ]);
      list.append(item);
    });
    root.append(list);
  }
  function openAssignmentEditor(asg, ctx) {
    const d = Store.data();
    const isNew = !asg;
    const a = asg ? Object.assign({}, asg) : { id: null, title: '', courseId: (d.courses[0] && d.courses[0].id) || '', due: '', estMin: 60, link: '', written: false, submitted: false };
    const title = el('input', { type: 'text', value: a.title, placeholder: '과제명' });
    const courseSel = el('select', {}); courseSel.append(el('option', { value: '' }, '(과목 없음)')); d.courses.forEach(function (c) { courseSel.append(el('option', { value: c.id, selected: c.id === a.courseId }, c.name)); });
    const due = el('input', { type: 'datetime-local', value: a.due ? a.due.slice(0, 16) : '' });
    const est = el('input', { type: 'number', value: a.estMin, min: '5', step: '5' });
    const link = el('input', { type: 'text', value: a.link, placeholder: '제출처 URL' });
    const body = el('div', {}, [el('div', { class: 'field' }, [el('label', {}, '과제명'), title]), el('div', { class: 'field' }, [el('label', {}, '과목'), courseSel]), el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '제출 마감'), due]), el('div', { class: 'field' }, [el('label', {}, '예상 시간(분)'), est])]), el('div', { class: 'field' }, [el('label', {}, '제출처 링크'), link])]);
    const footer = [
      !isNew ? el('button', { class: 'btn btn-danger', onclick: function () { Store.update(function (dd) { dd.assignments = dd.assignments.filter(function (x) { return x.id !== a.id; }); }); m.close(); ctx.refresh(); ctx.toast('삭제했습니다.'); } }, '삭제') : null,
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'),
      el('button', { class: 'btn btn-primary', onclick: function () {
        if (!title.value.trim()) { ctx.toast('과제명을 입력하세요.', 'warn'); return; }
        a.title = title.value.trim(); a.courseId = courseSel.value; a.due = due.value ? due.value + ':00' : ''; a.estMin = clampNum(est.value, 5, 1440); a.link = link.value;
        Store.update(function (dd) { if (isNew) { a.id = Store.id('asg'); dd.assignments.push(a); } else Object.assign(dd.assignments.find(function (x) { return x.id === a.id; }), a); });
        m.close(); ctx.refresh(); ctx.toast('저장했습니다.');
      } }, '저장'),
    ];
    const m = ctx.modal({ title: isNew ? '과제 추가' : '과제 편집', body: body, footer: footer });
  }
  function renderAttendance(root, ctx) {
    const d = Store.data();
    root.append(el('h2', {}, '출결 기록'));
    root.append(el('p', { class: 'hint', style: 'margin-bottom:16px' }, '출결 위험 기준은 강의계획서 규칙을 과목별로 설정합니다. 일괄 임계치를 하드코딩하지 않습니다.'));
    if (d.courses.length === 0) { root.append(el('div', { class: 'empty' }, [el('span', { class: 'emoji' }, '🪑'), el('h3', {}, '먼저 수강 과목을 등록하세요')])); return; }
    const list = el('div', { class: 'stack' });
    d.courses.forEach(function (c) {
      const att = c.attendance || { present: 0, late: 0, absent: 0, latePerAbsent: 3, totalSessions: 15, absentLimit: 3 };
      const effectiveAbsent = att.absent + (att.latePerAbsent ? att.late / att.latePerAbsent : 0);
      const risk = att.absentLimit && effectiveAbsent >= att.absentLimit * 0.7;
      const card = el('div', { class: 'card' });
      card.append(el('div', { class: 'row between' }, [el('h3', {}, c.name), risk ? el('span', { class: 'tag tag-warn' }, '주의 구간') : el('span', { class: 'tag tag-exam' }, '여유')]));
      card.append(el('div', { class: 'row', style: 'gap:16px;margin:8px 0;flex-wrap:wrap' }, [counter('출석', att, 'present', c, ctx), counter('지각', att, 'late', c, ctx), counter('결석', att, 'absent', c, ctx)]));
      card.append(el('p', { class: 'hint' }, '환산 결석 ' + Math.round(effectiveAbsent * 10) / 10 + '회 (지각 ' + att.latePerAbsent + '회 = 결석 1회 기준) · 결석 한도 ' + att.absentLimit + '회'));
      card.append(el('div', { class: 'row', style: 'gap:8px;margin-top:8px' }, [ruleInput('지각→결석 환산', att, 'latePerAbsent', c, ctx), ruleInput('결석 한도', att, 'absentLimit', c, ctx)]));
      list.append(card);
    });
    root.append(list);
  }
  function counter(label, att, key, course, ctx) {
    const val = el('span', { style: 'font-size:1.3rem;font-weight:800;margin:0 10px' }, String(att[key] || 0));
    function upd(delta) { Store.update(function (dd) { const c = dd.courses.find(function (x) { return x.id === course.id; }); c.attendance = c.attendance || { present: 0, late: 0, absent: 0, latePerAbsent: 3, totalSessions: 15, absentLimit: 3 }; c.attendance[key] = Math.max(0, (c.attendance[key] || 0) + delta); }); ctx.refresh(); }
    return el('div', {}, [el('div', { class: 'hint' }, label), el('div', { class: 'row' }, [el('button', { class: 'btn btn-sm', 'aria-label': label + ' 감소', onclick: function () { upd(-1); } }, '−'), val, el('button', { class: 'btn btn-sm', 'aria-label': label + ' 증가', onclick: function () { upd(1); } }, '+')])]);
  }
  function ruleInput(label, att, key, course, ctx) {
    const inp = el('input', { type: 'number', value: att[key], min: '1', style: 'width:90px' });
    inp.onchange = function () { Store.update(function (dd) { const c = dd.courses.find(function (x) { return x.id === course.id; }); c.attendance = c.attendance || {}; c.attendance[key] = Number(inp.value); }); ctx.refresh(); };
    return el('div', {}, [el('label', { style: 'font-size:.8rem' }, label), inp]);
  }

  /* =======================================================================
     12. 기록과 회고 (보고서 3·7쪽)
     ======================================================================= */
  function renderReviewLog(root, ctx) {
    const d = Store.data();
    root.append(el('p', { class: 'page-intro' }, '주간 실행과 약점의 변화를 함께 봅니다. 순공부시간이나 카드 수 하나만으로 실력을 판정하지 않습니다.'));
    const weeks = [];
    for (let w = 3; w >= 0; w--) {
      const monday = getMonday(-w);
      const dates = []; for (let i = 0; i < 7; i++) dates.push(dayKey(addDays(monday, i)));
      const actual = d.sessions.filter(function (s) { return dates.indexOf(dayKey(new Date(s.start))) >= 0; }).reduce(function (sum, s) { return sum + Math.max(0, minutesBetween(s.start, s.end) - (s.breakMin || 0)); }, 0);
      const plan = d.blocks.filter(function (b) { return dates.indexOf(b.date) >= 0 && isExam(d, b); }).reduce(function (sum, b) { return sum + minutesBetween(b.start, b.end); }, 0);
      weeks.push({ monday: monday, actual: actual, plan: plan });
    }
    const thisWeek = weeks[3];
    const adherence = thisWeek.plan > 0 ? Math.round(thisWeek.actual / thisWeek.plan * 100) : null;
    const rewrites = d.answers.filter(function (a) { return a.rewriteOf; }).length;
    const missedSubmit = d.assignments.filter(function (a) { return !a.submitted && a.due && new Date(a.due) < new Date(); }).length;
    root.append(el('div', { class: 'grid grid-4', style: 'margin-bottom:16px' }, [
      metricCard('이번 주 이행률', adherence == null ? '미기록' : adherence + '%', '실제 ÷ 기준 계획'),
      metricCard('이번 주 실제 공부', fmtMin(thisWeek.actual), '순 세션 시간'),
      metricCard('답안 재작성', rewrites + '건', '누적'),
      metricCard('제출 누락', missedSubmit + '건', missedSubmit > 0 ? '마감 지남·미제출' : '없음'),
    ]));

    const chart = el('div', { class: 'card' });
    chart.append(el('h3', {}, '최근 4주 수험 시간 (계획 vs 실제)'));
    const maxMin = Math.max.apply(null, [60].concat(weeks.map(function (w) { return Math.max(w.plan, w.actual); })));
    const bars = el('div', { class: 'row', style: 'gap:24px;align-items:flex-end;height:180px;margin-top:16px' });
    weeks.forEach(function (w, i) { bars.append(el('div', { style: 'flex:1;display:flex;flex-direction:column;align-items:center;gap:6px' }, [el('div', { class: 'row', style: 'gap:6px;align-items:flex-end;height:140px' }, [bar(w.plan / maxMin * 140, 'var(--border-strong)', '계획'), bar(w.actual / maxMin * 140, 'var(--accent)', '실제')]), el('div', { class: 'hint' }, i === 3 ? '이번 주' : fmtDateShort(w.monday) + '~')])); });
    chart.append(bars, el('div', { class: 'row', style: 'gap:16px;margin-top:12px;justify-content:center' }, [legendSwatch('var(--border-strong)', '계획'), legendSwatch('var(--accent)', '실제')]));
    root.append(chart);

    const errCard = el('div', { class: 'card' });
    errCard.append(el('h3', {}, '감점 원인 집계 (취약 쟁점)'));
    const errCount = {}; d.answers.forEach(function (a) { (a.errors || []).forEach(function (e) { errCount[e] = (errCount[e] || 0) + 1; }); });
    const entries = Object.keys(errCount).map(function (k) { return [k, errCount[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    if (entries.length === 0) errCard.append(el('p', { class: 'hint' }, '아직 집계할 감점 기록이 없습니다.'));
    else { const max = entries[0][1]; entries.forEach(function (e) { errCard.append(el('div', { style: 'margin:8px 0' }, [el('div', { class: 'row between', style: 'margin-bottom:4px' }, [el('span', {}, e[0]), el('strong', {}, e[1] + '회')]), el('div', { class: 'progress' }, el('span', { style: 'width:' + (e[1] / max * 100) + '%' }))])); }); }
    root.append(errCard);

    const noteCard = el('div', { class: 'card' });
    noteCard.append(el('h3', {}, '주간 회고'));
    const key = 'retro-' + dayKey(getMonday(0));
    const ta = el('textarea', { placeholder: '이번 주 잘한 점 / 미완료 이유 / 다음 주 조정', style: 'min-height:140px' }, (d.retros && d.retros[key]) || '');
    let t; ta.oninput = function () { clearTimeout(t); t = setTimeout(function () { Store.update(function (dd) { dd.retros = dd.retros || {}; dd.retros[key] = ta.value; }); }, 500); };
    noteCard.append(ta, el('p', { class: 'hint' }, '회고는 자동 저장됩니다. 확정 계획은 변경해도 기준으로 보관되어 이행률이 부풀려지지 않습니다.'));
    root.append(noteCard);
  }
  function bar(h, color, label) { return el('div', { style: 'width:28px;background:' + color + ';height:' + Math.max(2, h) + 'px;border-radius:4px 4px 0 0', title: label }); }
  function legendSwatch(color, label) { return el('div', { class: 'hint' }, [el('span', { style: 'display:inline-block;width:12px;height:12px;background:' + color + ';border-radius:3px;margin-right:6px' }), label]); }

  /* =======================================================================
     13. 설정과 백업 (보고서 17·19쪽)
     ======================================================================= */
  function renderSettings(root, ctx) {
    const d = Store.data();
    root.append(el('p', { class: 'page-intro' }, '장기간 쌓은 노트와 답안은 화면보다 중요한 자산입니다. 시험일은 공식 확인 후 입력하고, 기록은 정기적으로 백업하세요.'));

    const examCard = el('div', { class: 'card' });
    examCard.append(el('h2', {}, '수험 설정'));
    const examDate = el('input', { type: 'date', value: d.settings.examDate || '' });
    const confirmed = el('input', { type: 'checkbox', checked: !!d.settings.examDateConfirmed, style: 'width:20px;min-height:20px' });
    const goal = el('input', { type: 'number', value: d.settings.weeklyExamGoalH, min: '1', max: '100' });
    const elective = el('input', { type: 'text', value: d.settings.electiveSubject || '' });
    examCard.append(
      el('div', { class: 'field' }, [el('label', {}, '변리사 2차 시험일'), examDate, el('p', { class: 'hint' }, '한국산업인력공단 Q-Net 공식 공고를 확인한 날짜만 입력하세요. 2027년 시행 일정은 실제 공고에 맞춰 확정합니다.')]),
      el('label', { class: 'row', style: 'gap:8px;margin-bottom:16px' }, [confirmed, '공식 공고로 확인함 (체크해야 D-Day가 표시됩니다)']),
      el('div', { class: 'field' }, [el('label', {}, '주간 수험 최소 목표 (시간)'), goal]),
      el('div', { class: 'field' }, [el('label', {}, '선택과목'), elective, el('p', { class: 'hint' }, '기본 과목: 특허법·상표법·민사소송법 + 선택과목')]),
      el('button', { class: 'btn btn-primary', onclick: function () {
        Store.update(function (dd) { dd.settings.examDate = examDate.value || null; dd.settings.examDateConfirmed = confirmed.checked; dd.settings.weeklyExamGoalH = Number(goal.value) || 30; dd.settings.electiveSubject = elective.value; const es = dd.subjects.find(function (s) { return s.id === 'sub-elec'; }); if (es && elective.value.trim()) es.name = elective.value.trim(); });
        ctx.refresh(); ctx.toast('수험 설정을 저장했습니다.');
      } }, '설정 저장')
    );
    if (d.settings.examDate && !d.settings.examDateConfirmed) examCard.append(el('p', { class: 'hint', style: 'color:var(--warn-fg);margin-top:8px' }, '날짜가 입력되었지만 "공식 확인"에 체크하지 않아 D-Day는 표시되지 않습니다.'));
    root.append(examCard);

    const uiCard = el('div', { class: 'card' });
    uiCard.append(el('h2', {}, '화면'));
    const themeSel = el('select', {}); [['light', '밝은 테마'], ['dark', '야간 테마']].forEach(function (p) { themeSel.append(el('option', { value: p[0], selected: p[0] === d.settings.theme }, p[1])); });
    themeSel.onchange = function () { Store.update(function (dd) { dd.settings.theme = themeSel.value; }); document.documentElement.setAttribute('data-theme', themeSel.value); };
    uiCard.append(el('div', { class: 'field' }, [el('label', {}, '테마'), themeSel]));
    root.append(uiCard);

    const backupCard = el('div', { class: 'card' });
    backupCard.append(el('h2', {}, '백업과 복원'));
    backupCard.append(el('p', { class: 'hint' }, '이 홈페이지는 데이터를 이 브라우저에 저장합니다. 브라우저 저장소 하나에 1년치를 맡기지 말고 월 1회 이상 내보내기로 백업하세요.'));
    const counts = Store.counts();
    backupCard.append(el('div', { class: 'row', style: 'gap:16px;flex-wrap:wrap;margin:12px 0' }, Object.keys(counts).map(function (k) { return el('span', { class: 'tag tag-muted' }, k + ' ' + counts[k]); })));
    const fileInput = el('input', { type: 'file', accept: '.json', style: 'display:none' });
    fileInput.onchange = function () { handleImport(fileInput.files[0], ctx); };
    backupCard.append(el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' }, [el('button', { class: 'btn btn-primary', onclick: exportBackup }, '⬇ JSON 백업 내보내기'), el('button', { class: 'btn', onclick: function () { fileInput.click(); } }, '⬆ 백업 가져오기'), fileInput]));
    root.append(backupCard);

    const dangerCard = el('div', { class: 'card', style: 'border-color:var(--warn-fg)' });
    dangerCard.append(el('h2', { style: 'color:var(--warn-fg)' }, '위험 구역'));
    dangerCard.append(el('p', { class: 'hint' }, '모든 기록을 삭제합니다. 되돌릴 수 없으니 먼저 백업을 내보내세요.'));
    dangerCard.append(el('button', { class: 'btn btn-danger', onclick: async function () { if (await ctx.confirm('정말로 모든 기록을 삭제할까요? 백업하지 않은 데이터는 복구할 수 없습니다.', { danger: true, okText: '전체 삭제' })) { localStorage.removeItem(STORAGE_KEY); location.reload(); } } }, '모든 데이터 삭제'));
    root.append(dangerCard);
  }
  function exportBackup() {
    const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = '수험홈_백업_' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    URL.revokeObjectURL(url);
  }
  function handleImport(file, ctx) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      const text = reader.result;
      const m = ctx.modal({
        title: '백업 가져오기',
        body: el('div', {}, [el('p', {}, '가져오기 방식을 선택하세요. 교체는 현재 데이터를 모두 대체합니다.'), el('p', { class: 'hint' }, '안전을 위해 먼저 현재 데이터를 백업하는 것을 권장합니다.')]),
        footer: [el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'), el('button', { class: 'btn', onclick: function () { doImport('merge'); } }, '병합 (없는 항목만 추가)'), el('button', { class: 'btn btn-primary', onclick: function () { doImport('replace'); } }, '교체')],
      });
      function doImport(mode) {
        try { Store.importJSON(text, mode); m.close(); const c = Store.counts(); ctx.refresh(); ctx.toast('복원 완료 · 노트 ' + c.노트 + ' / 답안 ' + c.답안 + ' / 카드 ' + c.카드 + '건 확인', 'ok', 5000); }
        catch (e) { ctx.toast('가져오기 실패: ' + e.message + ' · 파일 형식을 확인하세요.', 'warn', 6000); }
      }
    };
    reader.onerror = function () { ctx.toast('파일을 읽지 못했습니다. 다시 시도하세요.', 'warn'); };
    reader.readAsText(file);
  }

  /* =======================================================================
     13-b. AI 도구 페이지 & 전역 우측 AI 미니 채팅창 (모든 페이지 공통)
     ======================================================================= */
  // 채팅 지원 모델(키 입력형) + 링크 전용(Manus/Kiro)
  const AI_LINK_TOOLS = [
    { id: 'manus', name: 'Manus', vendor: 'Butterfly Effect', url: 'https://manus.im/',     desc: '여러 단계를 스스로 처리하는 에이전트형 도구입니다.', badge: 'M' },
    { id: 'kiro',  name: 'Kiro',  vendor: 'AWS',              url: 'https://app.kiro.dev/', desc: '스펙 기반으로 코드를 만드는 개발용 에이전트입니다.', badge: 'K' },
  ];
  let _aiSending = false;
  let _widgetShowKey = false;

  // 본문 페이지(#content)를 초기화하지 않고 우측 채팅창(및 AI 페이지일 때만 본문)을 갱신
  function refreshAiSurfaces(opts) {
    opts = opts || {};
    renderAiWidget({ focusInput: !!opts.focusWidget });
    updateTopbarAiBtn();
    if (current === 'ai') refresh();
  }

  function buildGeminiModelControls(compact) {
    const isArgon = AiStore.geminiModel() === 'gemini-4-argon';
    const modelSel = el('select', { 'aria-label': 'Gemini 모델 선택', style: compact ? 'flex:1;min-width:0' : 'width:auto;min-width:240px;min-height:36px;padding:4px 10px;font-size:.88rem' });
    GEMINI_MODELS.forEach(function (m) {
      modelSel.append(el('option', { value: m.id, selected: m.id === AiStore.geminiModel() }, m.label));
    });
    modelSel.onchange = function () {
      AiStore.setGeminiModel(modelSel.value);
      refreshAiSurfaces();
    };

    const row = el('div', { class: compact ? 'ai-model-row' : 'row', style: compact ? '' : 'gap:8px;flex-wrap:wrap' }, [modelSel]);
    if (isArgon) {
      const thinkSel = el('select', { 'aria-label': '추론 깊이 선택', style: compact ? 'width:98px;flex:none' : 'width:auto;min-width:116px;min-height:36px;padding:4px 10px;font-size:.88rem' });
      GEMINI_THINKING_LEVELS.forEach(function (lv) {
        thinkSel.append(el('option', { value: lv.id, selected: lv.id === AiStore.geminiThinking() }, lv.label));
      });
      thinkSel.onchange = function () {
        AiStore.setGeminiThinking(thinkSel.value);
        refreshAiSurfaces();
      };
      row.append(thinkSel);
    }
    return row;
  }

  function renderAiTools(root, ctx) {
    const provider = AiStore.provider();
    root.append(el('p', { class: 'page-intro' }, '여기서 넓게 대화하거나, 다른 페이지(노트·답안·주간 계획 등) 오른쪽의 작은 AI 채팅창에서도 페이지를 닫지 않고 똑같이 이어서 질문할 수 있습니다.'));

    // 모델 선택 탭
    const tabs = el('div', { class: 'tabs', role: 'tablist', style: 'margin-bottom:12px' });
    Object.keys(AI_PROVIDERS).forEach(function (pid) {
      const p = AI_PROVIDERS[pid];
      const active = pid === provider;
      tabs.append(el('button', { class: 'tab' + (active ? ' active' : ''), role: 'tab', 'aria-selected': active ? 'true' : 'false', onclick: function () { AiStore.setProvider(pid); ctx.refresh(); } },
        [p.name, AiStore.hasKey(pid) ? '' : ' 🔑']));
    });
    root.append(tabs);

    const p = AI_PROVIDERS[provider];

    if (provider === 'gemini') {
      const modelBox = el('div', { class: 'row between', style: 'margin-bottom:12px;gap:8px;flex-wrap:wrap' }, [
        buildGeminiModelControls(false),
        el('span', { class: 'hint' }, AiStore.geminiModel() === 'gemini-4-argon'
          ? '※ Gemini 4 Argon은 유료 결제(Billing) 연결 API 키 전용입니다.'
          : '무료 등급 API 키에서도 바로 사용할 수 있는 빠른 모델입니다.'),
      ]);
      root.append(modelBox);
    }

    // 키가 없으면 키 입력 안내 카드
    if (!AiStore.hasKey(provider)) {
      root.append(buildKeyCard(provider, ctx));
    } else {
      root.append(buildChatPanel(provider, ctx));
      // 키 관리(변경/삭제)는 접은 상태로
      const det = el('details', { style: 'margin-top:10px' });
      det.append(el('summary', { class: 'hint', style: 'cursor:pointer' }, p.name + ' API 키 관리 (변경·삭제)'));
      det.append(buildKeyCard(provider, ctx, true));
      root.append(det);
    }

    // 링크 전용 도구 (Manus/Kiro)
    root.append(el('div', { class: 'section-head', style: 'margin-top:24px' }, [el('h3', {}, '바로가기 (채팅 미지원)')]));
    root.append(el('p', { class: 'hint', style: 'margin-top:-6px' }, 'Manus·Kiro는 공개 채팅 API가 없어 공식 사이트로 바로 연결합니다.'));
    const linkGrid = el('div', { class: 'grid grid-2' });
    AI_LINK_TOOLS.forEach(function (t) {
      const open = function () { window.open(t.url, '_blank', 'noopener,noreferrer'); };
      const card = el('div', { class: 'card', role: 'button', tabindex: '0', style: 'cursor:pointer;display:flex;flex-direction:column;gap:8px' });
      card.append(
        el('div', { class: 'row', style: 'gap:10px;align-items:center' }, [
          el('span', { 'aria-hidden': 'true', style: 'flex:0 0 auto;width:36px;height:36px;border-radius:9px;background:var(--accent);color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-weight:800' }, t.badge),
          el('div', { style: 'flex:1;min-width:0' }, [el('div', { style: 'font-weight:800' }, t.name), el('div', { class: 'hint', style: 'font-size:.78rem' }, t.vendor)]),
        ]),
        el('p', { class: 'hint', style: 'margin:0;flex:1' }, t.desc),
        el('button', { class: 'btn btn-block', onclick: function (e) { e.stopPropagation(); open(); } }, t.name + ' 열기 ↗')
      );
      card.addEventListener('click', open);
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      linkGrid.append(card);
    });
    root.append(linkGrid);

    root.append(el('p', { class: 'hint', style: 'margin-top:16px' }, '참고: API 키는 이 브라우저에만 저장되며(클라우드 동기화 대상 아님) AI 답변은 사실과 다를 수 있으니 조문·판례·공고는 원문으로 확인하세요.'));
  }

  function buildKeyCard(provider, ctx, compact) {
    const p = AI_PROVIDERS[provider];
    const card = el('div', { class: 'card' });
    if (!compact) card.append(el('h3', {}, p.name + ' 사용 설정'));
    card.append(el('p', { class: 'hint', style: 'margin-top:' + (compact ? '8px' : '4px') }, p.keyHint));
    const input = el('input', { type: 'password', placeholder: p.name + ' API 키 붙여넣기', value: AiStore.getKey(provider), autocomplete: 'off', spellcheck: 'false' });
    const row = el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;margin-top:8px' }, [
      el('div', { class: 'field', style: 'flex:1;min-width:220px;margin:0' }, [input]),
      el('button', { class: 'btn btn-primary', onclick: function () {
        const v = input.value.trim();
        if (!v) { ctx.toast('API 키를 입력하세요.', 'warn'); return; }
        AiStore.setKey(provider, v); _widgetShowKey = false; refreshAiSurfaces(); ctx.toast(p.name + ' 키를 저장했습니다.');
      } }, '저장'),
    ]);
    card.append(row);
    if (AiStore.hasKey(provider)) {
      card.append(el('button', { class: 'btn btn-sm btn-danger', style: 'margin-top:8px', onclick: function () { AiStore.setKey(provider, ''); refreshAiSurfaces(); ctx.toast(p.name + ' 키를 삭제했습니다.'); } }, '키 삭제'));
    }
    card.append(el('p', { class: 'hint', style: 'margin-top:8px' }, ['키 발급: ', el('a', { href: p.keyUrl, target: '_blank', rel: 'noopener noreferrer' }, p.keyUrl + ' ↗')]));
    return card;
  }

  function buildChatPanel(provider, ctx) {
    const p = AI_PROVIDERS[provider];
    const wrap = el('div', { class: 'card', style: 'display:flex;flex-direction:column;padding:0;overflow:hidden' });

    // 헤더
    wrap.append(el('div', { class: 'row between', style: 'padding:12px 16px;border-bottom:1px solid var(--border)' }, [
      el('div', { class: 'row', style: 'gap:8px;align-items:center' }, [
        el('span', { 'aria-hidden': 'true', style: 'width:30px;height:30px;border-radius:8px;background:var(--accent);color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem' }, p.badge),
        el('div', {}, [el('strong', {}, p.name), el('span', { class: 'hint', style: 'margin-left:8px;font-size:.75rem' }, p.modelLabel())]),
      ]),
      el('button', { class: 'btn btn-sm btn-ghost', onclick: function () { AiStore.clearChat(provider); refreshAiSurfaces(); } }, '대화 지우기'),
    ]));

    // 메시지 영역
    const msgs = el('div', { id: 'ai-msgs', style: 'padding:16px;display:flex;flex-direction:column;gap:12px;min-height:280px;max-height:52vh;overflow-y:auto' });
    const history = AiStore.chat(provider);
    if (history.length === 0) {
      msgs.append(el('div', { class: 'empty', style: 'padding:32px 0;margin:auto' }, [el('span', { class: 'emoji' }, '💬'), el('h3', {}, p.name + '에게 물어보세요'), el('p', {}, '예: "진보성 판단에서 사후적 고찰 금지가 뭔지 쉽게 설명해줘"')]));
    } else {
      history.forEach(function (m) { msgs.append(renderAiMessage(m, false)); });
    }
    wrap.append(msgs);

    // 입력 영역
    const ta = el('textarea', { placeholder: p.name + '에게 질문 (Enter 전송 · Shift+Enter 줄바꿈)', rows: '2', style: 'flex:1;min-height:44px;max-height:160px;resize:vertical' });
    const sendBtn = el('button', { class: 'btn btn-primary', style: 'align-self:stretch' }, _aiSending ? '전송 중…' : '전송');
    if (_aiSending) { ta.disabled = true; sendBtn.disabled = true; }

    function doSend() {
      const text = ta.value.trim();
      if (!text || _aiSending) return;
      ta.value = '';
      sendMessage(provider, text, ctx);
    }
    sendBtn.onclick = doSend;
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); doSend(); } });

    wrap.append(el('div', { class: 'row', style: 'gap:8px;padding:12px 16px;border-top:1px solid var(--border);align-items:flex-end' }, [ta, sendBtn]));

    // 렌더 직후 스크롤 하단 + 입력창 포커스
    setTimeout(function () { msgs.scrollTop = msgs.scrollHeight; if (!_aiSending) ta.focus(); }, 0);
    return wrap;
  }

  function renderAiMessage(m, mini) {
    const mine = m.role === 'user';
    const pad = mini ? '8px 11px' : '10px 14px';
    const fs = mini ? 'font-size:.87rem;line-height:1.55;' : 'line-height:1.6;';
    const text = m.content || (m.pending ? '답변 생성 중…' : '');
    const bubble = el('div', {
      class: 'ai-bubble ' + (mine ? 'me' : 'bot') + (m.error ? ' err' : ''),
      style: 'max-width:86%;padding:' + pad + ';border-radius:12px;white-space:pre-wrap;word-break:break-word;' + fs
        + (mine
          ? 'align-self:flex-end;background:var(--accent);color:var(--on-accent);border-bottom-right-radius:4px'
          : (m.error
            ? 'align-self:flex-start;background:var(--warn-bg);color:var(--warn-fg);border:1px solid var(--warn-fg);border-bottom-left-radius:4px'
            : 'align-self:flex-start;background:var(--bg);border:1px solid var(--border);border-bottom-left-radius:4px')),
    }, text);
    return bubble;
  }

  // 모든 페이지 오른쪽에서 열 수 있는 컴팩트 AI 채팅 위젯
  function renderAiWidget(opts) {
    opts = opts || {};
    const root = document.getElementById('ai-widget-root');
    const app = document.getElementById('app-shell');
    if (!root) return;

    // 'AI 도구' 전체 페이지에서는 본문 채팅창과 중복되지 않도록 미니 위젯 숨김
    if (current === 'ai') {
      root.classList.add('hidden');
      if (app) app.classList.remove('ai-docked');
      clear(root);
      return;
    }
    root.classList.remove('hidden');

    const isOpen = AiStore.widgetOpen();
    const isDocked = isOpen && AiStore.widgetDocked();
    if (app) app.classList.toggle('ai-docked', isDocked);
    clear(root);

    if (!isOpen) {
      root.append(el('button', {
        class: 'ai-fab',
        'aria-label': 'AI 채팅창 열기',
        onclick: function () { _widgetShowKey = false; AiStore.setWidgetOpen(true); renderAiWidget({ focusInput: true }); updateTopbarAiBtn(); },
      }, [svgIcon('ai'), _aiSending ? 'AI 답변 중…' : 'AI 채팅']));
      return;
    }

    const provider = AiStore.provider();
    const p = AI_PROVIDERS[provider];
    const hasKey = AiStore.hasKey(provider);
    const showKey = !hasKey || _widgetShowKey;

    const panel = el('section', { class: 'ai-mini', 'aria-label': 'AI 도우미 채팅창' });

    // 1) 상단 헤더
    const head = el('div', { class: 'ai-mini-head' }, [
      el('div', { class: 'ai-mini-title' }, [svgIcon('ai'), 'AI 도우미']),
      el('div', { class: 'ai-mini-actions' }, [
        el('button', {
          class: 'ai-icon-btn' + (showKey ? ' active' : ''),
          title: p.name + ' API 키 설정',
          'aria-label': 'API 키 설정',
          onclick: function () { if (hasKey) { _widgetShowKey = !_widgetShowKey; renderAiWidget({ focusInput: !_widgetShowKey }); } },
        }, [svgIcon('key')]),
        el('button', {
          class: 'ai-icon-btn',
          title: '현재 대화 비우기',
          'aria-label': '대화 비우기',
          onclick: function () {
            if (!AiStore.chat(provider).length) return;
            AiStore.clearChat(provider);
            renderAiWidget({ focusInput: true });
            toast(p.name + ' 대화를 비웠습니다.');
          },
        }, [svgIcon('trash')]),
        el('button', {
          class: 'ai-icon-btn ai-dock-only' + (isDocked ? ' active' : ''),
          title: isDocked ? '작은 플로팅 창으로 전환' : '오른쪽 패널로 고정',
          'aria-label': isDocked ? '작은 창으로 전환' : '오른쪽 패널로 고정',
          onclick: function () { AiStore.setWidgetDocked(!AiStore.widgetDocked()); renderAiWidget(); },
        }, [svgIcon('dock')]),
        el('button', {
          class: 'ai-icon-btn',
          title: 'AI 도구 전체 페이지로 보기',
          'aria-label': '전체 페이지로 열기',
          onclick: function () { navigate('ai'); },
        }, [svgIcon('expand')]),
        el('button', {
          class: 'ai-icon-btn',
          title: '채팅창 접기',
          'aria-label': '채팅창 접기',
          onclick: function () { AiStore.setWidgetOpen(false); renderAiWidget(); updateTopbarAiBtn(); },
        }, [svgIcon('minimize')]),
      ]),
    ]);
    panel.append(head);

    // 2) 제공자 & 세부 모델 바
    const provRow = el('div', { class: 'ai-prov-row', role: 'tablist' });
    Object.keys(AI_PROVIDERS).forEach(function (pid) {
      const item = AI_PROVIDERS[pid];
      const active = pid === provider;
      provRow.append(el('button', {
        class: 'ai-prov-pill',
        role: 'tab',
        'aria-selected': active ? 'true' : 'false',
        onclick: function () { _widgetShowKey = false; AiStore.setProvider(pid); renderAiWidget({ focusInput: AiStore.hasKey(pid) }); },
      }, item.name + (AiStore.hasKey(pid) ? '' : ' 🔑')));
    });
    const bar = el('div', { class: 'ai-mini-bar' }, [provRow]);
    if (provider === 'gemini') {
      bar.append(buildGeminiModelControls(true));
    } else {
      bar.append(el('div', { class: 'hint', style: 'font-size:.73rem;margin:0' }, '모델: ' + p.modelLabel()));
    }
    panel.append(bar);

    // 3) 본문 (키 입력 폼 또는 메시지 목록)
    const body = el('div', { class: 'ai-mini-body' });
    if (showKey) {
      const keyInput = el('input', { type: 'password', placeholder: p.name + ' API 키 붙여넣기', value: AiStore.getKey(provider), autocomplete: 'off', spellcheck: 'false', style: 'min-height:38px;font-size:.88rem' });
      const saveKey = function () {
        const v = keyInput.value.trim();
        if (!v) { toast('API 키를 입력하세요.', 'warn'); keyInput.focus(); return; }
        AiStore.setKey(provider, v);
        _widgetShowKey = false;
        renderAiWidget({ focusInput: true });
        toast(p.name + ' 키를 저장했습니다.');
      };
      keyInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); saveKey(); } });

      body.append(
        el('div', { style: 'font-weight:700;font-size:.9rem' }, p.name + ' API 키 설정'),
        el('p', { class: 'hint', style: 'font-size:.78rem;line-height:1.5;margin:0' }, p.keyHint),
        keyInput,
        el('div', { class: 'row', style: 'gap:6px' }, [
          el('button', { class: 'btn btn-primary btn-sm', style: 'flex:1', onclick: saveKey }, '키 저장'),
          hasKey ? el('button', { class: 'btn btn-sm', onclick: function () { _widgetShowKey = false; renderAiWidget({ focusInput: true }); } }, '취소') : null,
          hasKey ? el('button', { class: 'btn btn-sm btn-danger', onclick: function () { AiStore.setKey(provider, ''); _widgetShowKey = false; renderAiWidget(); toast(p.name + ' 키를 삭제했습니다.'); } }, '삭제') : null,
        ]),
        el('p', { class: 'hint', style: 'font-size:.76rem;margin:2px 0 0' }, ['발급 페이지: ', el('a', { href: p.keyUrl, target: '_blank', rel: 'noopener noreferrer' }, '열기 ↗')]),
      );
      panel.append(body);
      root.append(panel);
      if (opts.focusInput) setTimeout(function () { keyInput.focus(); }, 0);
      return;
    }

    const history = AiStore.chat(provider);
    if (history.length === 0) {
      body.append(el('div', { style: 'margin:auto;text-align:center;padding:16px 8px;color:var(--text-sub)' }, [
        el('div', { style: 'font-weight:700;color:var(--text);margin-bottom:4px;font-size:.92rem' }, p.name + '에게 바로 질문하세요'),
        el('p', { class: 'hint', style: 'font-size:.8rem;margin:0' }, '노트·답안·계획 화면을 닫지 않고 현재 공부 중인 쟁점을 바로 물어볼 수 있습니다.'),
      ]));
    } else {
      history.forEach(function (m) { body.append(renderAiMessage(m, true)); });
    }
    panel.append(body);

    // 4) 하단 입력창
    const ta = el('textarea', { placeholder: p.name + '에게 질문 (Enter 전송)', rows: '1', 'aria-label': p.name + ' 질문 입력' });
    const sendBtn = el('button', { class: 'btn btn-primary btn-sm' }, _aiSending ? '…' : '전송');
    if (_aiSending) { ta.disabled = true; sendBtn.disabled = true; }

    function doSend() {
      const text = ta.value.trim();
      if (!text || _aiSending) return;
      ta.value = '';
      sendMessage(provider, text, ctx);
    }
    sendBtn.onclick = doSend;
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); doSend(); } });

    panel.append(el('div', { class: 'ai-mini-foot' }, [ta, sendBtn]));
    root.append(panel);

    setTimeout(function () {
      body.scrollTop = body.scrollHeight;
      if (opts.focusInput && !_aiSending) ta.focus();
    }, 0);
  }

  function updateTopbarAiBtn() {
    const btn = document.getElementById('topbar-ai-btn');
    if (!btn) return;
    const active = current === 'ai' || AiStore.widgetOpen();
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.style.borderColor = active ? 'var(--accent)' : '';
    btn.style.color = active ? 'var(--accent)' : '';
  }

  async function sendMessage(provider, text, ctx) {
    const p = AI_PROVIDERS[provider];
    const key = AiStore.getKey(provider);
    if (!key) { ctx.toast('먼저 API 키를 입력하세요.', 'warn'); return; }

    AiStore.pushMessage(provider, { role: 'user', content: text });
    AiStore.pushMessage(provider, { role: 'assistant', content: '', pending: true });
    _aiSending = true;
    refreshAiSurfaces();

    try {
      // 요청 history에서 pending·과거 오류 메시지는 제외 (대화 흐름 오염 방지)
      let history = AiStore.chat(provider).filter(function (m) { return !m.pending && !m.error; });
      // 일부 API는 user로 시작하고 user/assistant가 번갈아야 하므로, 맨 앞의 비-user 메시지 제거
      while (history.length && history[0].role !== 'user') history = history.slice(1);
      const result = await p.send(key, history);
      const replyText = typeof result === 'string' ? result : result.text;
      const msgObj = { role: 'assistant', content: replyText };
      if (result && result.apiParts) {
        msgObj.apiParts = result.apiParts;
        msgObj.geminiModel = result.geminiModel;
      }
      AiStore.replaceLast(provider, msgObj);
    } catch (e) {
      let hint = (e && e.message) ? e.message : String(e);
      if (/Gemini 4 Argon/.test(hint)) {
        // Argon 전용 상세 안내 메시지는 그대로 유지
      } else if (/Failed to fetch|NetworkError|CORS/i.test(hint)) {
        hint = '네트워크/CORS 오류로 브라우저에서 직접 호출이 막혔습니다. 키가 맞는지, 네트워크 상태를 확인하세요. (OpenAI는 환경에 따라 브라우저 직접 호출이 제한될 수 있습니다.)';
      } else if (/not found|not supported|unsupported model|is not found/i.test(hint)) {
        hint = '이 키에서 지원하지 않는 모델입니다. 모델 이름이 바뀌었을 수 있어요. (' + hint + ')';
      } else if (/401|403|API key not valid|invalid.*key|unauthor|permission/i.test(hint)) {
        hint = 'API 키가 올바르지 않거나 권한이 없습니다. 키를 다시 확인하세요. (' + hint + ')';
      } else if (/429|quota|rate limit|resource.*exhausted/i.test(hint)) {
        hint = '요청 한도/크레딧을 초과했습니다. 잠시 후 다시 시도하거나 결제·사용량을 확인하세요. (' + hint + ')';
      }
      AiStore.replaceLast(provider, { role: 'assistant', content: '오류: ' + hint, error: true });
    } finally {
      _aiSending = false;
      refreshAiSurfaces({ focusWidget: current !== 'ai' && AiStore.widgetOpen() });
    }
  }

  /* =======================================================================
     14. 앱 셸 — 라우팅 / 사이드바 / 검색 / 수집함 / 부팅
     ======================================================================= */
  const ROUTES = {
    home: { title: '오늘의 수험', render: renderHome },
    week: { title: '주간 계획', render: renderWeek },
    tasks: { title: '과업', render: renderTasks },
    answers: { title: '실전 답안과 GS', render: renderAnswers },
    notes: { title: '단권화 노트', render: renderNotes },
    review: { title: '복습', render: renderReview },
    academic: { title: '대학 학업', render: renderAcademic },
    log: { title: '기록과 회고', render: renderReviewLog },
    ai: { title: 'AI 도구', render: renderAiTools },
    settings: { title: '설정과 백업', render: renderSettings },
  };
  let current = 'home';
  const ctx = { navigate: navigate, refresh: refresh, toast: toast, modal: modal, confirm: confirmDialog };

  let _navigating = false;
  function navigate(route, opts) {
    opts = opts || {};
    if (!ROUTES[route]) route = 'home';
    current = route;
    const sb = document.getElementById('sidebar'); if (sb) sb.classList.remove('open');
    const sc = document.getElementById('scrim'); if (sc) sc.classList.remove('show');
    // 해시를 먼저 맞추되, hashchange 재진입을 막기 위한 가드
    _navigating = true;
    if (('#' + route) !== window.location.hash) window.location.hash = route;
    _navigating = false;
    refresh(); updateNavHighlight(); renderAiWidget(); updateTopbarAiBtn();
    if (!opts.noFocus) { const c = document.getElementById('content'); if (c) c.focus(); }
  }
  // 뒤로/앞으로(해시 변경) 시 URL·제목·화면을 항상 일치시킴 (보고서 3쪽 P0)
  function onHashChange() {
    if (_navigating) return;
    const h = window.location.hash.slice(1);
    const route = ROUTES[h] ? h : 'home';
    if (route !== current) { current = route; refresh(); updateNavHighlight(); renderAiWidget(); updateTopbarAiBtn(); }
  }
  function refresh() {
    const content = document.getElementById('content');
    const titleEl = document.getElementById('page-title');
    if (!content) return;
    clear(content);
    const route = ROUTES[current];
    titleEl.textContent = route.title;
    try { route.render(content, ctx); }
    catch (e) {
      console.error('화면 렌더 오류', e);
      content.append(el('div', { class: 'empty' }, [el('span', { class: 'emoji' }, '⚠️'), el('h3', {}, '화면을 그리는 중 문제가 발생했습니다'), el('p', {}, '마지막 저장본은 보존되었습니다. 새로고침 후 다시 시도하세요.'), el('button', { class: 'btn', onclick: function () { location.reload(); } }, '새로고침')]));
    }
    updateSaveStatus();
  }
  function updateNavHighlight() { document.querySelectorAll('.nav-item[data-route]').forEach(function (b) { b.setAttribute('aria-current', b.dataset.route === current ? 'page' : 'false'); }); }
  function updateSaveStatus() {
    const info = Store.saveInfo(); const node = document.getElementById('save-status'); if (!node) return;
    if (info.failed) { node.innerHTML = '⚠️ 저장 실패 — 백업을 내보내세요'; node.style.color = 'var(--warn-fg)'; }
    else if (info.at) { node.textContent = '저장됨 ' + info.at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); node.style.color = ''; }
    else { node.textContent = '자동 저장 켜짐'; }
  }

  function openInbox() {
    const input = el('input', { type: 'text', placeholder: '과업·쟁점·링크를 먼저 저장 (분류는 나중에)', 'aria-label': '빠른 수집' });
    const list = el('div', { class: 'list', style: 'margin-top:12px;max-height:40vh;overflow:auto' });
    function renderInboxList() {
      const data = Store.data(); list.innerHTML = '';
      const items = data.inbox.filter(function (i) { return !i.filed; });
      if (items.length === 0) { list.append(el('p', { class: 'hint' }, '수집함이 비었습니다. 떠오른 쟁점을 입력하고 Enter.')); return; }
      items.forEach(function (i) { list.append(el('div', { class: 'item' }, [el('div', { class: 'main' }, [el('div', {}, i.text), el('div', { class: 'meta' }, fmtDate(i.createdAt))]), el('button', { class: 'btn btn-sm', title: '처리 완료', onclick: function () { Store.update(function (dd) { dd.inbox.find(function (z) { return z.id === i.id; }).filed = true; }); renderInboxList(); } }, '완료')])); });
    }
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && input.value.trim()) { Store.update(function (dd) { dd.inbox.unshift({ id: Store.id('in'), text: input.value.trim(), createdAt: new Date().toISOString(), filed: false }); }); input.value = ''; renderInboxList(); } });
    renderInboxList();
    const m = modal({ title: '빠른 수집함', body: el('div', {}, [input, list]), footer: [el('button', { class: 'btn', onclick: function () { m.close(); } }, '닫기')] });
  }

  function openSearch(query) {
    query = query || '';
    const input = el('input', { type: 'search', value: query, placeholder: '노트·과업·답안·카드 검색', 'aria-label': '전체 검색', style: 'font-size:1.1rem' });
    const results = el('div', { class: 'list', style: 'margin-top:12px;max-height:50vh;overflow:auto' });
    function run(q) {
      results.innerHTML = ''; q = (q || '').trim().toLowerCase();
      if (!q) { results.append(el('p', { class: 'hint' }, '검색어를 입력하세요.')); return; }
      const d = Store.data(); const hits = [];
      d.notes.forEach(function (n) { if ((n.title + ' ' + n.issue + ' ' + n.body).toLowerCase().indexOf(q) >= 0) hits.push({ type: '노트', title: n.title, route: 'notes', id: n.id }); });
      d.tasks.forEach(function (t) { if (t.title.toLowerCase().indexOf(q) >= 0) hits.push({ type: '과업', title: t.title, route: 'tasks' }); });
      d.answers.forEach(function (a) { if ((a.source + ' ' + a.note).toLowerCase().indexOf(q) >= 0) hits.push({ type: '답안', title: a.source + ' ' + (a.round || ''), route: 'answers' }); });
      d.cards.forEach(function (c) { if ((c.q + ' ' + c.a).toLowerCase().indexOf(q) >= 0) hits.push({ type: '카드', title: c.q, route: 'review' }); });
      if (hits.length === 0) { results.append(el('p', { class: 'hint' }, '결과가 없습니다.')); return; }
      hits.slice(0, 30).forEach(function (h) { results.append(el('button', { class: 'item', style: 'width:100%;text-align:left;cursor:pointer', onclick: function () { m.close(); if (h.route === 'notes' && h.id) { noteSelectedId = h.id; Store.update(function (dd) { dd.lastOpenNote = h.id; }); } navigate(h.route); } }, [el('span', { class: 'tag tag-muted' }, h.type), el('div', { class: 'main' }, el('div', { class: 'title' }, h.title || '(제목 없음)'))])); });
    }
    input.oninput = function () { run(input.value); };
    run(query);
    const m = modal({ title: '전체 검색', body: el('div', {}, [input, results]) });
  }

  function buildShell() {
    const app = el('div', { class: 'app', id: 'app-shell' });
    const sidebar = el('aside', { class: 'sidebar', id: 'sidebar', 'aria-label': '주 메뉴' });
    sidebar.append(el('div', { class: 'brand' }, ['나의 수험 공간', el('small', {}, '변리사 2차 · 2027')]));
    const nav = el('nav', { class: 'nav' });
    function navItem(parent, route, label, icon) { parent.append(el('button', { class: 'nav-item', 'data-route': route, onclick: function () { navigate(route); } }, [svgIcon(icon), label])); }
    navItem(nav, 'home', '오늘의 수험', 'home');
    navItem(nav, 'week', '주간 계획', 'week');
    navItem(nav, 'tasks', '과업', 'tasks');
    nav.append(el('div', { class: 'nav-group-label' }, '학습'));
    navItem(nav, 'answers', '실전 답안과 GS', 'answers');
    navItem(nav, 'notes', '단권화 노트', 'notes');
    navItem(nav, 'review', '복습', 'review');
    nav.append(el('div', { class: 'nav-group-label' }, '보조'));
    navItem(nav, 'academic', '대학 학업', 'academic');
    navItem(nav, 'log', '기록과 회고', 'log');
    navItem(nav, 'ai', 'AI 도구', 'ai');
    sidebar.append(nav);
    const footer = el('div', { class: 'sidebar-footer' });
    footer.append(
      el('button', { class: 'nav-item secondary', onclick: openInbox }, [svgIcon('inbox'), '빠른 수집함']),
      el('button', { class: 'nav-item secondary', 'data-route': 'settings', onclick: function () { navigate('settings'); } }, [svgIcon('settings'), '설정과 백업']),
      el('div', { id: 'cloud-box', style: 'border-top:1px solid var(--border);margin-top:6px;padding-top:6px' }),
      el('div', { class: 'save-status', id: 'save-status', style: 'padding:8px 12px' }, '자동 저장 켜짐')
    );
    sidebar.append(footer);
    const scrim = el('div', { class: 'scrim', id: 'scrim', onclick: function () { sidebar.classList.remove('open'); scrim.classList.remove('show'); } });

    const main = el('div', { class: 'main' });
    const searchInput = el('input', { type: 'search', placeholder: '검색', 'aria-label': '전체 검색' });
    searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') openSearch(searchInput.value); });
    searchInput.addEventListener('focus', function () { openSearch(searchInput.value); });
    const topbarAiBtn = el('button', {
      class: 'btn btn-sm',
      id: 'topbar-ai-btn',
      title: '우측 AI 채팅창 열기/닫기',
      'aria-label': '우측 AI 채팅창 열기/닫기',
      onclick: function () {
        if (current === 'ai') { toast('현재 AI 도구 전체 화면입니다. 다른 메뉴로 이동하면 우측 미니 채팅창이 열립니다.'); return; }
        const next = !AiStore.widgetOpen();
        AiStore.setWidgetOpen(next);
        renderAiWidget({ focusInput: next });
        updateTopbarAiBtn();
      },
    }, [svgIcon('ai')]);
    const topbar = el('header', { class: 'topbar' }, [
      el('div', { class: 'topbar-inner' }, [
        el('button', { class: 'btn btn-sm menu-toggle', 'aria-label': '메뉴 열기', onclick: function () { sidebar.classList.toggle('open'); scrim.classList.toggle('show'); } }, '☰'),
        el('h1', { id: 'page-title' }, '오늘의 수험'),
        el('div', { class: 'search-box' }, [svgIcon('search'), searchInput]),
        el('button', { class: 'btn btn-sm', onclick: openInbox, title: '빠른 수집', 'aria-label': '빠른 수집' }, [svgIcon('inbox')]),
        topbarAiBtn,
      ]),
    ]);
    const focusBanner = el('div', { class: 'focus-banner', id: 'focus-banner' });
    const content = el('main', { class: 'content', id: 'content', tabindex: '-1' });
    main.append(topbar, focusBanner, content);
    const aiWidgetRoot = el('aside', { class: 'ai-widget-root', id: 'ai-widget-root', 'aria-label': '우측 AI 채팅' });
    app.append(sidebar, scrim, main, aiWidgetRoot);
    document.body.append(el('a', { class: 'skip-link', href: '#content' }, '본문으로 건너뛰기'), app);
  }

  function maybeOnboard() {
    const d = Store.data();
    if (d.settings.onboarded) return;
    const body = el('div', {}, [
      el('p', {}, '변리사 2차 시험 준비를 1순위, 대학 학업을 2순위로 두는 개인 학습 공간입니다.'),
      el('p', { class: 'hint' }, '최소 설정만 하고 바로 시작할 수 있습니다. 시험일은 공식 공고 확인 후 설정에서 입력하세요 (임의 D-Day는 만들지 않습니다).'),
      el('ul', { style: 'color:var(--text-sub);font-size:.9rem;line-height:1.9' }, [
        el('li', {}, '① 오늘의 수험: 핵심 과업을 고르고 바로 공부 시작'),
        el('li', {}, '② 주간 계획: 수험 시간을 먼저 확보하고 수업과 충돌 조정'),
        el('li', {}, '③ 노트·답안·복습으로 약점을 고쳐 다시 쓰기'),
        el('li', {}, '④ 설정에서 정기 백업(JSON 내보내기)으로 기록 보호'),
      ]),
    ]);
    const m = modal({ title: '환영합니다 👋', body: body, footer: [el('button', { class: 'btn btn-primary', onclick: function () { Store.update(function (dd) { dd.settings.onboarded = true; }); m.close(); } }, '시작하기')] });
  }

  function boot() {
    Store.init();
    AiStore.init();
    const d = Store.data();
    document.documentElement.setAttribute('data-theme', d.settings.theme || 'light');
    buildShell();
    if (Store.loadError()) toast('저장된 데이터를 불러오지 못했습니다. 마지막 저장본은 덮어쓰지 않았습니다. 백업 복원을 고려하세요.', 'warn', 8000);
    window.addEventListener('store:save-failed', function () { toast('저장에 실패했습니다. 저장 공간이 가득 찼을 수 있습니다. 설정에서 백업을 내보내세요.', 'warn', 8000); updateSaveStatus(); });
    Store.subscribe(function () { updateSaveStatus(); });
    const hash = window.location.hash.slice(1);
    current = ROUTES[hash] ? hash : 'home';
    navigate(current);
    Timer.resumeIfActive();
    window.addEventListener('timer:changed', function () { refresh(); });
    window.addEventListener('hashchange', onHashChange);
    // Ctrl/Cmd+K: 전체 검색 열기 (보고서 10쪽: 검색·빠른 생성 단축 경로)
    window.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (!document.querySelector('.modal-backdrop')) openSearch('');
      }
    });
    maybeOnboard();
    setupCloud();
  }

  /* =======================================================================
     15. 클라우드 동기화 연동 (window.StudyCloud — firebase-sync.js)
     ======================================================================= */
  let cloudState = { enabled: false, user: null };

  function setupCloud() {
    function connect() {
      if (!window.StudyCloud) return false;
      window.StudyCloud.register({
        onState: function (st) { cloudState = st; updateCloudUI(); },
        getLocal: function () { return Store.data(); },
        setLocal: function (remote) { Store.replaceAll(remote, { fromCloud: true }); refresh(); },
      });
      // 로컬이 바뀔 때마다 클라우드로 업로드(로그인 상태에서만 동작)
      Store.subscribe(function (data) {
        if (window.StudyCloud) window.StudyCloud.pushLocal(data);
      });
      return true;
    }
    if (!connect()) {
      window.addEventListener('studycloud:ready', connect, { once: true });
      // 혹시 순서가 엇갈려도 몇 번 더 시도
      let tries = 0;
      const iv = setInterval(function () { if (connect() || ++tries > 20) clearInterval(iv); }, 300);
    }
  }

  function updateCloudUI() {
    const box = document.getElementById('cloud-box');
    if (!box) return;
    box.innerHTML = '';
    if (!cloudState.enabled) {
      box.append(el('div', { class: 'save-status', style: 'padding:4px 12px' }, '로컬 저장 (클라우드 미설정)'));
      return;
    }
    if (cloudState.user) {
      box.append(
        el('div', { class: 'row', style: 'gap:8px;padding:6px 12px;align-items:center' }, [
          cloudState.user.photo ? el('img', { src: cloudState.user.photo, width: '24', height: '24', style: 'border-radius:50%', alt: '' }) : el('span', {}, '👤'),
          el('div', { style: 'flex:1;min-width:0' }, [
            el('div', { style: 'font-size:.8rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }, cloudState.user.name || '로그인됨'),
            el('div', { class: 'hint', style: 'font-size:.72rem' }, '여러 기기 동기화 중'),
          ]),
        ]),
        el('button', { class: 'nav-item secondary', style: 'min-height:36px', onclick: function () { window.StudyCloud.logout(); } }, [svgIcon('logout'), '로그아웃']),
      );
    } else {
      box.append(
        el('button', { class: 'btn btn-primary btn-block', style: 'margin:4px 0', onclick: function () { window.StudyCloud.login(); } }, '🔵 구글로 로그인 (기기 동기화)'),
        el('div', { class: 'hint', style: 'padding:0 4px 4px;font-size:.72rem' }, '로그인하면 폰·PC에서 같은 기록을 씁니다.'),
      );
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
