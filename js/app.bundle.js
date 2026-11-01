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
  const SCHEMA_VERSION = 1;

  function defaultData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      settings: {
        examDate: null, examDateConfirmed: false,
        electiveSubject: '디자인보호법', weeklyExamGoalH: 30,
        theme: 'light', createdAt: new Date().toISOString(), onboarded: false,
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
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_data)); _lastSaveAt = new Date(); _saveFailed = false; }
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
      update: function (m) { m(_data); save(); emit(); },
      commitNow: commit,
      id: function (p) { return (p || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); },
      subject: function (id) { return _data.subjects.find(function (s) { return s.id === id; }) || null; },
      task: function (id) { return _data.tasks.find(function (t) { return t.id === id; }) || null; },
      note: function (id) { return _data.notes.find(function (n) { return n.id === id; }) || null; },
      exportJSON: function () {
        return JSON.stringify({ app: 'patent-study-home', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: _data }, null, 2);
      },
      importJSON: function (text, mode) {
        mode = mode || 'replace';
        const parsed = JSON.parse(text);
        const incoming = parsed.data || parsed;
        if (!incoming || typeof incoming !== 'object') throw new Error('형식이 올바르지 않습니다.');
        if (mode === 'replace') { _data = migrate(incoming); }
        else {
          const merged = migrate(_data);
          ['tasks', 'blocks', 'sessions', 'notes', 'answers', 'cards', 'courses', 'assignments', 'inbox', 'reviews', 'subjects'].forEach(function (c) {
            const seen = new Set((merged[c] || []).map(function (x) { return x.id; }));
            (incoming[c] || []).forEach(function (x) { if (!seen.has(x.id)) merged[c].push(x); });
          });
          _data = merged;
        }
        commit(); return true;
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
    root.append(el('p', { class: 'page-intro' }, '오늘 확보한 시간으로 가장 중요한 공부부터. 수험 핵심 과업을 먼저 보여 줍니다.'));

    const dd0 = dday(d.settings.examDate, d.settings.examDateConfirmed);
    const banner = el('div', { class: 'card', style: 'display:flex;align-items:center;gap:16px;flex-wrap:wrap;' });
    if (dd0 == null) {
      banner.append(
        el('div', {}, [el('strong', {}, '시험일 미확정'), el('p', { class: 'hint', style: 'margin:4px 0 0' }, '공식 공고를 확인한 뒤 설정에서 시험일을 입력하면 D-Day가 표시됩니다. 임의 날짜는 만들지 않습니다.')]),
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn btn-sm', onclick: function () { ctx.navigate('settings'); } }, '시험일 설정')
      );
    } else {
      banner.append(el('div', {}, [el('span', { class: 'tag tag-exam' }, '변리사 2차 D-' + (dd0 >= 0 ? dd0 : '지남')), el('p', { class: 'hint', style: 'margin:6px 0 0' }, '시험일 ' + fmtDate(parseKey(d.settings.examDate)))]));
    }
    root.append(banner);

    const metrics = homeMetrics(d, tk);
    root.append(el('div', { class: 'grid grid-4', style: 'margin:16px 0;' }, [
      metricCard('오늘 확보 시간', metrics.securedToday == null ? null : fmtMin(metrics.securedToday), '겹치지 않는 수험 블록 합계', function () { ctx.navigate('week'); }),
      metricCard('이번 주 수험 이행', metrics.adherence == null ? null : metrics.adherence + '%', metrics.adherenceSub, function () { ctx.navigate('week'); }),
      metricCard('복습 대기', metrics.dueReviews == null ? null : metrics.dueReviews + '개', '복습일이 오늘 이전', function () { ctx.navigate('review'); }),
      metricCard('학업 알림', metrics.acadAlerts == null ? null : metrics.acadAlerts + '건', '마감 진입/지연', function () { ctx.navigate('academic'); }),
    ]));

    const grid = el('div', { class: 'grid grid-7to3' });
    const left = el('div', { class: 'stack' });

    const focusCard = el('div', { class: 'card' });
    focusCard.append(el('div', { class: 'section-head' }, [el('h2', {}, '① 오늘의 핵심 수험 과업'), el('button', { class: 'btn btn-sm', onclick: function () { openFocusPicker(ctx); } }, '과업 선택')]));
    const focusTasks = d.focusToday.map(function (id) { return Store.task(id); }).filter(Boolean);
    if (focusTasks.length === 0) {
      focusCard.append(el('div', { class: 'empty' }, [
        el('span', { class: 'emoji' }, '📝'), el('h3', {}, '아직 오늘의 과업이 없습니다'),
        el('p', {}, '가장 중요한 수험 과업을 최대 3개까지 고르고 바로 공부를 시작하세요.'),
        el('button', { class: 'btn btn-primary', onclick: function () { openTaskEditor(null, ctx, { pinToday: true }); } }, '첫 과업 만들기'),
      ]));
    } else {
      const list = el('div', { class: 'stack' });
      focusTasks.forEach(function (t, i) { list.append(focusItem(t, i, ctx)); });
      focusCard.append(list);
    }
    left.append(focusCard);

    const next = nextBlock(d);
    const nextCard = el('div', { class: 'card' });
    nextCard.append(el('h3', {}, '② 확보한 수험 시간과 다음 블록'));
    if (next) {
      const sub = Store.subject(next.subjectId);
      nextCard.append(el('div', { class: 'row between' }, [
        el('div', {}, [el('div', { style: 'font-weight:700' }, fmtTime(next.start) + '~' + fmtTime(next.end) + ' · ' + next.title), el('div', { class: 'hint' }, [sub ? el('span', { class: 'tag tag-exam' }, sub.name) : '', next.locked ? ' 🔒 보호 블록' : ''])]),
        el('button', { class: 'btn btn-sm', onclick: function () { ctx.navigate('week'); } }, '주간 계획 열기'),
      ]));
    } else {
      nextCard.append(el('p', { class: 'hint' }, '오늘 예약된 수험 블록이 없습니다. 주간 계획에서 공부 시간을 먼저 확보하세요.'));
      nextCard.append(el('button', { class: 'btn btn-sm', onclick: function () { ctx.navigate('week'); } }, '주간 계획으로'));
    }
    left.append(nextCard);
    grid.append(left);

    const right = el('div', { class: 'stack' });
    const revCard = el('div', { class: 'card' });
    revCard.append(el('h3', {}, '③ 오늘의 복습'));
    if (metrics.dueReviews == null) { revCard.append(el('p', { class: 'hint' }, '아직 복습 카드가 없습니다.')); revCard.append(el('button', { class: 'btn btn-sm', onclick: function () { ctx.navigate('review'); } }, '첫 카드 만들기')); }
    else if (metrics.dueReviews === 0) { revCard.append(el('p', { class: 'hint' }, '오늘 복습할 카드가 없습니다. 👍')); }
    else { revCard.append(el('p', {}, [el('strong', {}, metrics.dueReviews + '개'), ' 의 카드가 복습을 기다립니다.'])); revCard.append(el('p', { class: 'hint' }, '최근 감점 쟁점부터 돌아봅니다.')); revCard.append(el('button', { class: 'btn btn-primary btn-sm', onclick: function () { ctx.navigate('review'); } }, '복습 시작')); }
    right.append(revCard);

    const acadCard = el('div', { class: 'card', style: 'background:var(--acad-bg)' });
    acadCard.append(el('h3', {}, '④ 학업 마감 확인'));
    const upcoming = upcomingAssignments(d);
    if (upcoming.length === 0) acadCard.append(el('p', { class: 'hint', style: 'color:var(--acad-fg)' }, '임박한 과제 마감이 없습니다. 작성과 제출은 구분해 관리합니다.'));
    else {
      const ul = el('div', { class: 'stack' });
      upcoming.slice(0, 3).forEach(function (a) { ul.append(el('div', { style: 'font-size:.9rem' }, [el('strong', {}, a.title), el('span', { class: 'hint', style: 'color:var(--acad-fg)' }, ' · ' + fmtDate(a.due) + (a.submitted ? ' · 제출완료' : ' · 미제출'))])); });
      acadCard.append(ul);
    }
    acadCard.append(el('button', { class: 'btn btn-sm', style: 'margin-top:12px', onclick: function () { ctx.navigate('academic'); } }, '대학 학업 열기'));
    right.append(acadCard);
    grid.append(right);
    root.append(grid);
  }

  function homeMetrics(d, tk) {
    const todayBlocks = d.blocks.filter(function (b) { return b.date === tk && isExam(d, b); });
    const secured = todayBlocks.length ? sumNonOverlap(todayBlocks) : null;
    const wa = weekAdherence(d);
    const dueReviews = d.cards.length === 0 ? null : d.cards.filter(function (c) { return c.status !== 'archived' && c.nextReview && c.nextReview <= tk; }).length;
    const acadAlerts = (d.assignments.length === 0 && d.courses.length === 0) ? null : upcomingAssignments(d).length;
    return { securedToday: secured, adherence: wa.adherence, adherenceSub: wa.sub, dueReviews: dueReviews, acadAlerts: acadAlerts };
  }
  function weekAdherence(d) {
    const monday = getMonday(0);
    const weekDates = []; for (let i = 0; i < 7; i++) weekDates.push(dayKey(addDays(monday, i)));
    const planMin = d.blocks.filter(function (b) { return weekDates.indexOf(b.date) >= 0 && isExam(d, b); }).reduce(function (s, b) { return s + minutesBetween(b.start, b.end); }, 0);
    if (planMin === 0) return { adherence: null, sub: '확정 계획 없음' };
    const actualMin = d.sessions.filter(function (s) { return weekDates.indexOf(dayKey(new Date(s.start))) >= 0; }).reduce(function (s, x) { return s + Math.max(0, minutesBetween(x.start, x.end) - (x.breakMin || 0)); }, 0);
    return { adherence: Math.round(Math.min(999, actualMin / planMin * 100)), sub: fmtMin(actualMin) + ' / ' + fmtMin(planMin) };
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
    if (shortMin > 0) head.append(el('p', { class: 'hint', style: 'margin-top:8px;color:var(--warn-fg)' }, '목표까지 ' + fmtMin(shortMin) + ' 부족합니다. 수면/마감을 줄여 성공처럼 보이게 하지 않습니다 — 범위 축소·과업 분할·목표 조정을 고려하세요.'));
    root.append(head);

    const grid = el('div', { class: 'grid grid-7to3' });
    const planCol = el('div', { class: 'stack' });
    planCol.append(buildTimetable(d, weekDates, ctx));
    planCol.append(buildMobileDay(d, weekDates, ctx));
    grid.append(planCol);

    const side = el('div', { class: 'stack' });
    const addCard = el('div', { class: 'card' });
    addCard.append(el('h3', {}, '시간표에 블록 추가'), el('p', { class: 'hint' }, '드래그 대신 날짜·시간 입력으로도 추가합니다.'), el('button', { class: 'btn btn-primary btn-block', onclick: function () { openBlockEditor(null, ctx, weekDates); } }, '+ 계획 블록 추가'));
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

  function buildTimetable(d, weekDates, ctx) {
    const card = el('div', { class: 'card desktop-only', style: 'overflow-x:auto;padding:16px' });
    const START_H = 7, END_H = 24;
    const table = el('div', { class: 'timetable', style: 'grid-template-rows: auto repeat(' + (END_H - START_H) + ', 44px)' });
    table.append(el('div', { class: 'tt-head', style: 'border-left:none' }, ''));
    weekDates.forEach(function (k, i) { table.append(el('div', { class: 'tt-head', style: k === todayKey() ? 'color:var(--accent)' : '' }, WEEKDAYS[i] + ' ' + k.slice(8))); });
    for (let h = START_H; h < END_H; h++) {
      table.append(el('div', { class: 'tt-timecol' }, String(h)));
      weekDates.forEach(function (k) {
        const cell = el('div', { class: 'tt-cell', role: 'button', tabindex: '0', 'aria-label': k + ' ' + h + '시 블록 추가' });
        d.blocks.filter(function (b) { return b.date === k && new Date(b.start).getHours() === h; }).forEach(function (b) { cell.append(blockChip(d, b, ctx)); });
        cell.addEventListener('click', function (e) { if (e.target === cell) openBlockEditor(null, ctx, weekDates, { date: k, hour: h }); });
        cell.addEventListener('keydown', function (e) { if (e.key === 'Enter') openBlockEditor(null, ctx, weekDates, { date: k, hour: h }); });
        table.append(cell);
      });
    }
    card.append(table, el('p', { class: 'hint', style: 'margin:8px 0 0' }, '빈 칸을 클릭하면 해당 시간에 블록을 추가합니다. 이동·휴식은 별도 블록으로 확보하세요.'));
    return card;
  }
  function blockChip(d, b, ctx) {
    const kind = blockKind(d, b);
    const sub = Store.subject(b.subjectId);
    return el('button', { class: 'tt-block ' + kind, title: b.title + ' ' + fmtTime(b.start) + '~' + fmtTime(b.end), onclick: function (e) { e.stopPropagation(); openBlockEditor(null, ctx, null, { editBlock: b }); } }, (b.locked ? '🔒 ' : '') + (b.title || (sub ? sub.name : '블록')));
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
    const defaultStart = b.start ? b.start.slice(11, 16) : (opts.hour != null ? String(opts.hour).padStart(2, '0') + ':00' : '09:00');
    const defaultEnd = b.end ? b.end.slice(11, 16) : (opts.hour != null ? String(Math.min(23, opts.hour + 2)).padStart(2, '0') + ':00' : '11:00');

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

    function save() {
      const date = dateInput.value;
      if (!date || !startInput.value || !endInput.value) { ctx.toast('날짜와 시간을 입력하세요.', 'warn'); return; }
      const startIso = date + 'T' + startInput.value + ':00';
      let endIso = date + 'T' + endInput.value + ':00';
      if (new Date(endIso) <= new Date(startIso)) { endIso = dayKey(addDays(parseKey(date), 1)) + 'T' + endInput.value + ':00'; }
      const title = titleInput.value.trim() || (taskSel.value && Store.task(taskSel.value) ? Store.task(taskSel.value).title : '') || (subjSel.value && Store.subject(subjSel.value) ? Store.subject(subjSel.value).name : '') || '블록';
      const conflict = d.blocks.find(function (x) { return x.id !== (edit && edit.id) && x.date === date && x.locked && new Date(startIso) < new Date(x.end) && new Date(x.start) < new Date(endIso); });
      Store.update(function (dd) {
        if (edit) { Object.assign(dd.blocks.find(function (x) { return x.id === edit.id; }), { title: title, kind: kindSel.value, subjectId: subjSel.value, taskId: taskSel.value, date: date, start: startIso, end: endIso, locked: lockInput.checked }); }
        else dd.blocks.push({ id: Store.id('blk'), title: title, kind: kindSel.value, subjectId: subjSel.value, taskId: taskSel.value, date: date, start: startIso, end: endIso, locked: lockInput.checked });
      });
      m.close(); ctx.refresh();
      if (conflict) ctx.toast('주의: 잠금 블록 "' + conflict.title + '"과 시간이 겹칩니다.', 'warn', 5000); else ctx.toast('계획을 저장했습니다.');
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
    const list = el('div', { class: 'list' });
    d.answers.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).forEach(function (a) {
      const sub = Store.subject(a.subjectId);
      const sum = (a.items || []).reduce(function (s, it) { return s + (Number(it.score) || 0); }, 0);
      const max = (a.items || []).reduce(function (s, it) { return s + (Number(it.max) || 0); }, 0);
      const raterLabel = (RATERS.find(function (r) { return r[0] === a.rater; }) || [,'본인 평가'])[1];
      const titleRow = el('div', { class: 'title' }, [sub ? el('span', { class: 'tag tag-exam' }, sub.name) : '', ' ' + (a.source || '출처 미상') + ' ' + (a.round ? a.round + '회' : '')]);
      if (a.rater === 'ai') titleRow.append(el('span', { class: 'tag tag-warn', style: 'margin-left:6px' }, 'AI 미확정'));
      list.append(el('div', { class: 'item', style: 'cursor:pointer', onclick: function () { openAnswerEditor(a, ctx); } }, [
        el('div', { class: 'main' }, [titleRow, el('div', { class: 'meta' }, [a.date ? fmtDate(a.date) + ' · ' : '', max > 0 ? sum + '/' + max + '점 · ' : '', el('span', { class: 'tag tag-muted' }, raterLabel), (a.errors && a.errors.length) ? ' · 감점: ' + a.errors.join(', ') : '', a.rewriteOf ? ' · 재작성' : ''])]),
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

    const body = el('div', {}, [
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '과목'), subjSel]), el('div', { class: 'field' }, [el('label', {}, '날짜'), dateInput])]),
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '출처'), sourceInput]), el('div', { class: 'field' }, [el('label', {}, '회차'), roundInput])]),
      el('div', { class: 'field' }, [el('label', {}, '평가자'), raterSel, el('p', { class: 'hint' }, 'AI 제안 점수는 확정 점수와 같은 선으로 합치지 않습니다.')]),
      el('div', { class: 'field' }, [el('label', {}, '문항별 배점 / 득점'), itemsWrap, totalEl, el('button', { class: 'btn btn-sm', style: 'margin-top:8px', type: 'button', onclick: function () { a.items.push({ label: (a.items.length + 1) + '문', score: 0, max: 0 }); renderItems(); } }, '+ 문항 추가')]),
      el('div', { class: 'field' }, [el('label', {}, '오류 분류'), errWrap]),
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

    function save() {
      a.subjectId = subjSel.value; a.source = sourceInput.value.trim(); a.round = roundInput.value; a.date = dateInput.value; a.rater = raterSel.value; a.note = noteInput.value;
      Store.update(function (dd) { if (isNew) { a.id = Store.id('ans'); dd.answers.push(a); } else Object.assign(dd.answers.find(function (x) { return x.id === a.id; }), a); });
      m.close(); ctx.refresh(); ctx.toast('답안 기록을 저장했습니다.');
    }
  }
  function markRewrite(orig, ctx, parentModal) {
    Store.update(function (dd) {
      const copy = JSON.parse(JSON.stringify(orig));
      copy.id = Store.id('ans'); copy.rewriteOf = orig.id; copy.date = new Date().toISOString().slice(0, 10); copy.rater = 'self'; copy.note = '[재작성] ' + (copy.note || '');
      dd.answers.push(copy);
    });
    parentModal.close(); ctx.refresh(); ctx.toast('재작성 답안을 생성했습니다. 개선 여부를 기록하세요.');
  }

  /* =======================================================================
     9. 단권화 노트 (보고서 11쪽)
     ======================================================================= */
  const NOTE_STATUSES = [['todo', '미정리'], ['doing', '정리 중'], ['done', '검토 완료'], ['recheck', '재확인 필요']];
  let noteFilter = { subjectId: '', status: '', q: '' };
  let noteSelectedId = null;

  function renderNotes(root, ctx) {
    const d = Store.data();
    noteSelectedId = noteSelectedId || d.lastOpenNote || (d.notes[0] && d.notes[0].id) || null;
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
    ctx.refresh();
  }

  function buildNoteEditor(n, ctx, refreshList, refreshDetail) {
    const d = Store.data();
    const wrap = el('div', { class: 'card' });
    const saveStatus = el('span', { class: 'save-status' }, '저장됨');
    let saveTimer;
    function touch() {
      saveStatus.textContent = '저장 중…';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        Store.update(function (dd) { const x = dd.notes.find(function (z) { return z.id === n.id; }); if (x) x.updatedAt = new Date().toISOString(); });
        saveStatus.textContent = '저장됨 · ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        refreshList();
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

    wrap.append(
      el('div', { class: 'row between', style: 'margin-bottom:12px' }, [saveStatus, el('div', { class: 'row', style: 'gap:8px' }, [
        el('button', { class: 'btn btn-sm', onclick: function () { makeCardFromNote(n, ctx); } }, '복습 카드 생성'),
        el('button', { class: 'btn btn-sm btn-danger', onclick: async function () { if (await ctx.confirm('이 노트를 삭제할까요?', { danger: true, okText: '삭제' })) { Store.update(function (dd) { dd.notes = dd.notes.filter(function (x) { return x.id !== n.id; }); dd.lastOpenNote = null; }); noteSelectedId = null; refreshDetail(); refreshList(); ctx.toast('노트를 삭제했습니다.'); } } }, '삭제'),
      ])]),
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
  function startSession(queue, ctx) {
    let idx = 0;
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
        answerBox.append(
          el('div', { class: 'card' }, [el('div', { html: escapeHtml(c.a || '(답 미입력)').replace(/\n/g, '<br>') }), c.noteId ? el('button', { class: 'btn btn-sm', style: 'margin-top:8px', onclick: function () { m.close(); ctx.navigate('notes'); } }, '원문 노트 열기') : null]),
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
    settings: { title: '설정과 백업', render: renderSettings },
  };
  let current = 'home';
  const ctx = { navigate: navigate, refresh: refresh, toast: toast, modal: modal, confirm: confirmDialog };

  function navigate(route) {
    if (!ROUTES[route]) route = 'home';
    current = route;
    const sb = document.getElementById('sidebar'); if (sb) sb.classList.remove('open');
    const sc = document.getElementById('scrim'); if (sc) sc.classList.remove('show');
    refresh(); updateNavHighlight();
    window.location.hash = route;
    const c = document.getElementById('content'); if (c) c.focus();
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
    const app = el('div', { class: 'app' });
    const sidebar = el('aside', { class: 'sidebar', id: 'sidebar', 'aria-label': '주 메뉴' });
    sidebar.append(el('div', { class: 'brand' }, ['나의 수험 공간', el('small', {}, '변리사 2차 · 2027')]));
    const nav = el('nav', { class: 'nav' });
    function navItem(parent, route, label, icon) { parent.append(el('button', { class: 'nav-item', 'data-route': route, onclick: function () { navigate(route); } }, [el('span', { class: 'ico' }, icon), label])); }
    navItem(nav, 'home', '오늘의 수험', '📌');
    navItem(nav, 'week', '주간 계획', '🗓');
    navItem(nav, 'tasks', '과업', '✅');
    nav.append(el('div', { class: 'nav-group-label' }, '학습'));
    navItem(nav, 'answers', '실전 답안과 GS', '✍️');
    navItem(nav, 'notes', '단권화 노트', '📒');
    navItem(nav, 'review', '복습', '🔁');
    nav.append(el('div', { class: 'nav-group-label' }, '보조'));
    navItem(nav, 'academic', '대학 학업', '🎓');
    navItem(nav, 'log', '기록과 회고', '📊');
    sidebar.append(nav);
    const footer = el('div', { class: 'sidebar-footer' });
    footer.append(
      el('button', { class: 'nav-item secondary', onclick: openInbox }, [el('span', { class: 'ico' }, '📥'), '빠른 수집함']),
      el('button', { class: 'nav-item secondary', 'data-route': 'settings', onclick: function () { navigate('settings'); } }, [el('span', { class: 'ico' }, '⚙️'), '설정과 백업']),
      el('div', { class: 'save-status', id: 'save-status', style: 'padding:8px 12px' }, '자동 저장 켜짐')
    );
    sidebar.append(footer);
    const scrim = el('div', { class: 'scrim', id: 'scrim', onclick: function () { sidebar.classList.remove('open'); scrim.classList.remove('show'); } });

    const main = el('div', { class: 'main' });
    const searchInput = el('input', { type: 'search', placeholder: '검색', 'aria-label': '전체 검색' });
    searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') openSearch(searchInput.value); });
    searchInput.addEventListener('focus', function () { openSearch(searchInput.value); });
    const topbar = el('header', { class: 'topbar' }, [
      el('div', { class: 'topbar-inner' }, [
        el('button', { class: 'btn btn-sm menu-toggle', 'aria-label': '메뉴 열기', onclick: function () { sidebar.classList.toggle('open'); scrim.classList.toggle('show'); } }, '☰'),
        el('h1', { id: 'page-title' }, '오늘의 수험'),
        el('div', { class: 'search-box' }, [el('span', {}, '🔍'), searchInput]),
        el('button', { class: 'btn btn-sm', onclick: openInbox, title: '빠른 수집' }, '📥'),
      ]),
    ]);
    const focusBanner = el('div', { class: 'focus-banner', id: 'focus-banner' });
    const content = el('main', { class: 'content', id: 'content', tabindex: '-1' });
    main.append(topbar, focusBanner, content);
    app.append(sidebar, scrim, main);
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
    maybeOnboard();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
