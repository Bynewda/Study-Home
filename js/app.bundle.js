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

  // 단색 선 아이콘 (제안서 3·4·9쪽: 통일된 1-color 라인 아이콘, stroke-width 1.75)
  const ICON_PATHS = {
    home:    '<path d="M3 10.5L12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>',
    week:    '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    tasks:   '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.2l2.4 2.4 4.8-5"/>',
    answers: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    notes:   '<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11a2 2 0 0 1 2 2v15.5a2 2 0 0 0-2-1.5H3z"/><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H13a2 2 0 0 0-2 2v15.5a2 2 0 0 1 2-1.5h8z"/>',
    review:  '<rect x="5" y="3" width="14" height="16" rx="2"/><path d="M9 8h6M9 12h4"/><path d="M8 21h9a2 2 0 0 0 2-2V7"/>',
    academic:'<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 3 2.5 6 2.5S18 18 18 17v-5"/>',
    log:     '<path d="M4 20V5"/><path d="M4 20h16"/><path d="M8 16v-5M12.5 16V8M17 16v-3"/>',
    inbox:   '<path d="M12 5v14M5 12h14"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5H9.4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4.2l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.07-.3.1-.7.1-1z"/>',
    logout:  '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    search:  '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    ai:      '<path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/><path d="M12 7.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/>',
    key:     '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L20 3"/><path d="M16 7l3 3"/><path d="M18.5 4.5l2.5 2.5"/>',
    trash:   '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>',
    dock:    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    minimize:'<path d="M5 12h14"/>',
    expand:  '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>',
    more:    '<path d="M4 7h16M4 12h16M4 17h16"/>',
    timer:   '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M9.5 2h5"/>',
    split:   '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
    sound:   '<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 6a8.5 8.5 0 0 1 0 12"/>',
    mute:    '<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/>',
  };
  function svgIcon(name) {
    const span = el('span', { class: 'ico', 'aria-hidden': 'true' });
    span.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + (ICON_PATHS[name] || '') + '</svg>';
    return span;
  }

  // 논결 브랜드 심벌 SVG (두 장의 펼친 페이지 + 하나의 연결점, 제안서 2·3쪽)
  function nongyeolMarkEl(nightSurface) {
    const span = el('span', { class: 'brand-mark', 'aria-hidden': 'true' });
    const rectFill = nightSurface ? '#234237' : '#244C3D';
    const strokeCol = '#F5F3EC';
    const dotCol = nightSurface ? '#C5D8B6' : '#E6ECDF';
    span.innerHTML = '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="64" height="64" rx="14" fill="' + rectFill + '"/>'
      + '<path d="M18 46V27.5C18 23.9 20.9 21 24.5 21C28.1 21 31 23.9 31 27.5V46" stroke="' + strokeCol + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<path d="M31 46V25C31 20.6 34.6 17 39 17C42.9 17 46 20.1 46 24V46" stroke="' + strokeCol + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="46" cy="15.5" r="3.2" fill="' + dotCol + '"/>'
      + '</svg>';
    return span;
  }

  // 홈 히어로 우측 에디토리얼 서재 노트 일러스트 (제안서 2·6쪽)
  function paperNotebookIllustEl() {
    const wrap = el('div', { class: 'now-illust', 'aria-hidden': 'true' });
    wrap.innerHTML = '<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M22 16H62L74 28V80H22V16Z" fill="#FCFBF7" stroke="#D5D2C6" stroke-width="1.5"/>'
      + '<path d="M22 16H36L22 30V16Z" fill="#E6ECDF"/>'
      + '<line x1="32" y1="34" x2="62" y2="34" stroke="#7E9E89" stroke-width="1.8" stroke-linecap="round"/>'
      + '<line x1="32" y1="45" x2="62" y2="45" stroke="#9AB3A1" stroke-width="1.6" stroke-linecap="round"/>'
      + '<line x1="32" y1="56" x2="58" y2="56" stroke="#9AB3A1" stroke-width="1.6" stroke-linecap="round"/>'
      + '<line x1="32" y1="67" x2="50" y2="67" stroke="#9AB3A1" stroke-width="1.6" stroke-linecap="round"/>'
      + '<circle cx="73" cy="21" r="4.5" fill="#98583F"/>'
      + '<path d="M58 73L77 52" stroke="#98583F" stroke-width="2.5" stroke-linecap="round"/>'
      + '</svg>';
    return wrap;
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
  function genId(p) { return (p || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
  function weekDatesFromMonday(monday) { const out = []; for (let i = 0; i < 7; i++) out.push(dayKey(addDays(monday, i))); return out; }

  let _toastWrap;
  function toast(msg, type, ms) {
    type = type || 'ok'; ms = ms || 3200;
    if (!_toastWrap) { _toastWrap = el('div', { class: 'toast-wrap', 'aria-live': 'polite', 'aria-atomic': 'true' }); document.body.append(_toastWrap); }
    const t = el('div', { class: 'toast ' + type, role: 'status' }, msg);
    _toastWrap.append(t);
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, ms);
  }

  function fmtEnglishEyebrowDate(d) {
    d = d || new Date();
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    return days[d.getDay()] + ', ' + String(d.getDate()).padStart(2, '0') + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function modal(opts) {
    const prevFocus = (typeof document !== 'undefined' && document.activeElement) ? document.activeElement : null;
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
    function close() {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
      if (opts.onClose) opts.onClose();
      if (prevFocus && typeof prevFocus.focus === 'function' && document.contains(prevFocus)) {
        try { prevFocus.focus(); } catch (e) {}
      }
    }
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

  // 2026학년도 2학기 기본 수강 과목 (최초 1회 자동 등록, 이후 편집·삭제 자유)
  const DEFAULT_COURSES_2026_2 = [
    {
      id: 'course-26-2-cv',
      code: 'EEE3545',
      name: '기초컴퓨터비전',
      semester: '2026-2',
      credits: 3,
      room: '제2공학관 공B004',
      link: '',
      schedule: [
        { day: 0, start: '16:00', end: '17:50' },
        { day: 2, start: '17:00', end: '17:50' },
      ],
    },
    {
      id: 'course-26-2-phys2',
      code: 'PHY1012',
      name: '공학물리학및실험(2)',
      semester: '2026-2',
      credits: 4,
      room: '(과118)/공A432',
      link: '',
      schedule: [
        { day: 1, start: '11:00', end: '12:50' },
        { day: 3, start: '11:00', end: '12:50' },
      ],
    },
    {
      id: 'course-26-2-semi',
      code: 'EEE3220',
      name: '반도체물성',
      semester: '2026-2',
      credits: 3,
      room: '공B004/동영상콘텐츠',
      link: '',
      schedule: [
        { day: 1, start: '13:00', end: '14:50' },
      ],
    },
    {
      id: 'course-26-2-econ',
      code: 'ENG3002',
      name: '경제성공학',
      semester: '2026-2',
      credits: 3,
      room: '제1공학관 공A685',
      link: '',
      schedule: [
        { day: 2, start: '12:00', end: '14:50' },
      ],
    },
    {
      id: 'course-26-2-neuro',
      code: 'ENG2009',
      name: '융합뇌공학입문',
      semester: '2026-2',
      credits: 3,
      room: '제1공학관 공A685',
      link: '',
      schedule: [
        { day: 3, start: '14:00', end: '16:50' },
      ],
    },
    {
      id: 'course-26-2-netlab',
      code: 'EEE4474',
      name: '네트워크실험',
      semester: '2026-2',
      credits: 2,
      room: '공A138',
      link: '',
      schedule: [
        { day: 4, start: '09:00', end: '13:50' },
      ],
    },
    {
      id: 'course-26-2-chapel',
      code: 'YCA1008',
      name: '채플(D) (비대면)',
      semester: '2026-2',
      credits: 0.5,
      room: '비대면 온라인',
      link: '',
      schedule: [],
    },
  ];

  // LearnUs 대시보드에서 확인된 기본 예정 마감 항목 (최초 1회 자동 등록)
  const DEFAULT_ASSIGNMENTS_2026_2 = [
    {
      id: 'lu-init-semi-ch5',
      externalId: 'lu-init-semi-ch5',
      title: '[동영상 마감] Lecture_Chapter 5',
      courseId: 'course-26-2-semi',
      courseName: '반도체물성',
      due: '2026-11-02T23:59:00',
      estMin: 45,
      link: 'https://ys.learnus.org/',
      written: false,
      submitted: false,
    },
    {
      id: 'lu-init-chapel-w9',
      externalId: 'lu-init-chapel-w9',
      title: '[동영상 마감] 9주차 채플',
      courseId: 'course-26-2-chapel',
      courseName: '채플(D) (비대면)',
      due: '2026-11-02T23:59:00',
      estMin: 30,
      link: 'https://ys.learnus.org/',
      written: false,
      submitted: false,
    },
  ];

  function defaultData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      settings: {
        examDate: null, examDateConfirmed: false,
        electiveSubject: '디자인보호법', weeklyExamGoalH: 30,
        dailyReviewLimit: 25, noteZoom: false, focusGoalMin: 50, starredNoteIds: [],
        theme: 'light', readingWide: false, createdAt: new Date().toISOString(), onboarded: false,
        seededCourses2026_2: true,
        seededLearnUsInit2026_2: true,
        seededCommuteBlocksV1: true,
        lastLearnUsSyncAt: null,
      },
      subjects: [
        { id: 'sub-patent', name: '특허법', kind: 'exam', color: '#244C3D' },
        { id: 'sub-tm', name: '상표법', kind: 'exam', color: '#2F6350' },
        { id: 'sub-civ', name: '민사소송법', kind: 'exam', color: '#4B634E' },
        { id: 'sub-elec', name: '선택과목', kind: 'exam', color: '#78572C' },
      ],
      tasks: [], blocks: [], sessions: [], notes: [], answers: [],
      cards: [],
      courses: JSON.parse(JSON.stringify(DEFAULT_COURSES_2026_2)),
      assignments: JSON.parse(JSON.stringify(DEFAULT_ASSIGNMENTS_2026_2)),
      notices: [],
      inbox: [], focusToday: [],
      reviews: [], retros: {}, lastOpenNote: null, lastStudyResume: null,
      dismissedAutoBlocks: {},
      syncedCourseWeeks: [],
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
      const rawSettings = d && d.settings ? d.settings : {};
      const alreadySeeded = !!rawSettings.seededCourses2026_2;
      const alreadySeededLu = !!rawSettings.seededLearnUsInit2026_2;
      const next = Object.assign({}, base, d, {
        settings: Object.assign({}, base.settings, rawSettings, {
          seededCourses2026_2: true,
          seededLearnUsInit2026_2: true,
          seededCommuteBlocksV1: true,
        }),
      });
      if (!Array.isArray(next.settings.starredNoteIds)) next.settings.starredNoteIds = [];
      if (!next.settings.dailyReviewLimit || next.settings.dailyReviewLimit < 5) next.settings.dailyReviewLimit = 25;
      if (!next.settings.focusGoalMin || next.settings.focusGoalMin < 10) next.settings.focusGoalMin = 50;
      if (!Array.isArray(next.blocks)) next.blocks = [];
      if (!Array.isArray(next.courses)) next.courses = [];
      if (!Array.isArray(next.assignments)) next.assignments = [];
      if (!Array.isArray(next.notices)) next.notices = [];
      if (!next.dismissedAutoBlocks || typeof next.dismissedAutoBlocks !== 'object') next.dismissedAutoBlocks = {};
      if (!Array.isArray(next.syncedCourseWeeks)) next.syncedCourseWeeks = [];

      // 기존 과목에 학정번호(code) 보강
      next.courses.forEach(function (c) {
        if (c && !c.code) {
          const def = DEFAULT_COURSES_2026_2.find(function (dc) { return dc.id === c.id || dc.name === c.name; });
          if (def && def.code) c.code = def.code;
        }
      });

      if (!alreadySeeded) {
        const existingIds = new Set(next.courses.map(function (c) { return c && c.id; }));
        const existingNames = new Set(next.courses.map(function (c) { return c && c.name; }));
        DEFAULT_COURSES_2026_2.forEach(function (c) {
          if (!existingIds.has(c.id) && !existingNames.has(c.name)) {
            next.courses.push(JSON.parse(JSON.stringify(c)));
          }
        });
      } else if (!alreadySeededLu) {
        // 시간표만 먼저 등록된 기존 브라우저에 비대면 채플(D) 1회 보강
        const chapel = DEFAULT_COURSES_2026_2.find(function (c) { return c.id === 'course-26-2-chapel'; });
        if (chapel && !next.courses.some(function (c) { return c && (c.id === chapel.id || c.name === chapel.name); })) {
          next.courses.push(JSON.parse(JSON.stringify(chapel)));
        }
      }

      if (!alreadySeededLu) {
        const asgIds = new Set(next.assignments.map(function (a) { return a && (a.externalId || a.id); }));
        DEFAULT_ASSIGNMENTS_2026_2.forEach(function (a) {
          if (!asgIds.has(a.id)) next.assignments.push(JSON.parse(JSON.stringify(a)));
        });
      }

      // 이번 주 반복 수업 및 대학 수업이 있는 모든 날짜의 전후 1시간 이동시간 자동 반영
      syncWeekClassesAndCommute(next, weekDatesFromMonday(getMonday(0)));
      const existingClassDates = new Set(
        next.blocks.filter(function (b) { return b && b.date && isUniversityClassBlock(next, b); }).map(function (b) { return b.date; })
      );
      existingClassDates.forEach(function (dt) { reconcileDayCommuteBlocks(next, dt); });

      return next;
    }
    function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          _data = defaultData();
          syncWeekClassesAndCommute(_data, weekDatesFromMonday(getMonday(0)));
          save();
          return;
        }
        const parsed = JSON.parse(raw);
        const neededSeed = !(parsed && parsed.settings && parsed.settings.seededCourses2026_2 && parsed.settings.seededLearnUsInit2026_2 && parsed.settings.seededCommuteBlocksV1);
        _data = migrate(parsed); _loadError = null;
        if (neededSeed) save();
      } catch (e) { _loadError = e; _data = defaultData(); syncWeekClassesAndCommute(_data, weekDatesFromMonday(getMonday(0))); console.error('불러오기 실패 — 마지막 저장본 보존', e); }
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
        const cols = ['tasks','blocks','sessions','notes','answers','cards','courses','assignments','notices','inbox','reviews','subjects'];
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
          ['tasks','blocks','sessions','notes','answers','cards','courses','assignments','notices','inbox','reviews','subjects'].forEach(function (c) {
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
          강좌: _data.courses.length, 과제: _data.assignments.length, 공지: (_data.notices || []).length,
        };
      },
    };
  })();

  /* =======================================================================
     3. AMBIENT AUDIO & FOCUS TIMER — 조용한 집중 화면 (제안서 8·9·12쪽)
     ⚠️ 환경음은 기본 음소거(off)이며 자동 재생을 절대 하지 않습니다.
     ======================================================================= */
  const AmbientAudio = (function () {
    let ctxAudio = null, srcNode = null, filterNode = null, gainNode = null;
    let mode = 'off'; // 'off' | 'rain' | 'library'
    let vol = 0.25;
    let muted = false;

    function stopNodes() {
      try { if (srcNode) { srcNode.stop(); srcNode.disconnect(); } } catch (e) {}
      try { if (filterNode) filterNode.disconnect(); } catch (e) {}
      try { if (gainNode) gainNode.disconnect(); } catch (e) {}
      srcNode = null; filterNode = null; gainNode = null;
    }

    function applyGain() {
      if (!gainNode || !ctxAudio) return;
      const target = (mode === 'off' || muted) ? 0 : (mode === 'library' ? vol * 0.55 : vol);
      try { gainNode.gain.setTargetAtTime(target, ctxAudio.currentTime, 0.08); }
      catch (e) { gainNode.gain.value = target; }
    }

    function buildNoise(kind) {
      stopNodes();
      if (kind === 'off') return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ctxAudio) ctxAudio = new AC();
      if (ctxAudio.state === 'suspended') { try { ctxAudio.resume(); } catch (e) {} }

      const sampleRate = ctxAudio.sampleRate || 44100;
      const len = sampleRate * 3;
      const buf = ctxAudio.createBuffer(1, len, sampleRate);
      const out = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        // 부드러운 브라운/핑크 노이즈 계열 합성
        last = (last + (kind === 'library' ? 0.018 : 0.055) * white) / (kind === 'library' ? 1.018 : 1.055);
        out[i] = last * (kind === 'library' ? 3.2 : 2.6);
      }
      srcNode = ctxAudio.createBufferSource();
      srcNode.buffer = buf;
      srcNode.loop = true;

      filterNode = ctxAudio.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.value = kind === 'library' ? 420 : 1150;

      gainNode = ctxAudio.createGain();
      gainNode.gain.value = 0;

      srcNode.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(ctxAudio.destination);
      srcNode.start(0);
      applyGain();
    }

    return {
      mode: function () { return mode; },
      volume: function () { return vol; },
      muted: function () { return muted; },
      setMode: function (nextMode) {
        mode = nextMode || 'off';
        if (mode !== 'off') muted = false;
        buildNoise(mode);
      },
      setVolume: function (v) {
        vol = Math.max(0.02, Math.min(0.9, Number(v) || 0.25));
        if (muted && vol > 0.03) muted = false;
        applyGain();
      },
      toggleMute: function () {
        muted = !muted;
        applyGain();
        return muted;
      },
      stopAll: function () {
        mode = 'off';
        muted = false;
        stopNodes();
      },
    };
  })();

  const Timer = (function () {
    const ACTIVE_KEY = 'patent-study-home:active-session';
    let tick = null;
    let overlayOpen = false;
    function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
    function sset(k, v) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }

    function activeElapsedMs(s) {
      if (!s) return 0;
      const nowMs = s.pausedAt ? new Date(s.pausedAt).getTime() : Date.now();
      const raw = nowMs - new Date(s.start).getTime() - (s.pausedTotalMs || 0);
      return Math.max(0, raw);
    }

    const T = {
      current: function () { try { return JSON.parse(sget(ACTIVE_KEY)); } catch (e) { return null; } },
      isOverlayOpen: function () { return overlayOpen; },
      start: function (taskId, subjectId, title, opts) {
        opts = opts || {};
        if (this.current()) this.stop(true);
        const d = Store.data();
        const goalMin = opts.goalMin || (d && d.settings && d.settings.focusGoalMin) || 50;
        const s = {
          id: Store.id('ses'),
          taskId: taskId || null,
          subjectId: subjectId || null,
          title: title || '수험 공부',
          subtitle: opts.subtitle || '',
          goalMin: goalMin,
          start: new Date().toISOString(),
          pausedAt: null,
          pausedTotalMs: 0,
        };
        sset(ACTIVE_KEY, JSON.stringify(s));
        overlayOpen = opts.openOverlay !== false;
        this._mount();
        window.dispatchEvent(new CustomEvent('timer:changed'));
        return s;
      },
      pause: function () {
        const s = this.current();
        if (!s || s.pausedAt) return;
        s.pausedAt = new Date().toISOString();
        sset(ACTIVE_KEY, JSON.stringify(s));
        this._renderOverlayStructure();
        this._tickRender();
      },
      resume: function () {
        const s = this.current();
        if (!s || !s.pausedAt) return;
        const delta = Math.max(0, Date.now() - new Date(s.pausedAt).getTime());
        s.pausedTotalMs = (s.pausedTotalMs || 0) + delta;
        s.pausedAt = null;
        sset(ACTIVE_KEY, JSON.stringify(s));
        this._renderOverlayStructure();
        this._tickRender();
      },
      openOverlay: function () {
        if (!this.current()) return;
        overlayOpen = true;
        this._renderOverlayStructure();
        this._tickRender();
      },
      closeOverlay: function () {
        overlayOpen = false;
        const ov = document.getElementById('focus-overlay');
        if (ov) ov.classList.add('hidden');
      },
      stop: function (silent) {
        const s = this.current(); if (!s) return;
        let totalPauseMs = s.pausedTotalMs || 0;
        if (s.pausedAt) totalPauseMs += Math.max(0, Date.now() - new Date(s.pausedAt).getTime());
        const end = new Date().toISOString();
        const breakMin = Math.round(totalPauseMs / 60000);
        Store.update(function (d) {
          d.sessions.push({
            id: s.id, taskId: s.taskId, subjectId: s.subjectId,
            start: s.start, end: end, breakMin: breakMin, source: 'timer',
          });
        });
        AmbientAudio.stopAll();
        overlayOpen = false;
        sset(ACTIVE_KEY, null);
        this._unmount();
        if (!silent) {
          const netMin = Math.max(0, Math.round((new Date(end) - new Date(s.start) - totalPauseMs) / 60000));
          toast('집중 세션 기록 완료 · 순공부 ' + netMin + '분' + (breakMin > 0 ? ' (쉬기 ' + breakMin + '분 제외)' : ''), 'ok');
        }
      },
      _renderOverlayStructure: function () {
        const ov = document.getElementById('focus-overlay');
        if (!ov) return;
        const s = this.current();
        if (!s || !overlayOpen) { ov.classList.add('hidden'); return; }
        ov.classList.remove('hidden');
        ov.innerHTML = '';
        const self = this;
        const d = Store.data();
        const sub = (d && s.subjectId) ? Store.subject(s.subjectId) : null;

        const top = el('div', { class: 'focus-ov-top' }, [
          el('div', { class: 'row', style: 'gap:10px;align-items:center' }, [
            nongyeolMarkEl(30),
            el('span', { style: 'font-family:var(--font-serif);font-weight:700;font-size:1.1rem;color:#F5F2E5' }, '논결'),
            el('span', { style: 'font-size:.72rem;letter-spacing:.16em;color:#9EB5A9' }, 'FOCUS'),
          ]),
          el('button', {
            class: 'focus-ov-close',
            type: 'button',
            'aria-label': '집중 화면 접고 서재로 이동 (세션 유지)',
            title: '화면만 닫기 (상단 배너에서 계속 진행)',
            onclick: function () { self.closeOverlay(); },
          }, '✕'),
        ]);

        const CIRC = 2 * Math.PI * 102;
        const svgNS = 'http://www.w3.org/2000/svg';
        const ringSvg = document.createElementNS(svgNS, 'svg');
        ringSvg.setAttribute('viewBox', '0 0 236 236');
        ringSvg.setAttribute('class', 'focus-ring-svg');
        ringSvg.setAttribute('aria-hidden', 'true');
        const bgCircle = document.createElementNS(svgNS, 'circle');
        bgCircle.setAttribute('cx', '118'); bgCircle.setAttribute('cy', '118'); bgCircle.setAttribute('r', '102');
        bgCircle.setAttribute('fill', 'none'); bgCircle.setAttribute('stroke', 'rgba(197,216,182,0.16)'); bgCircle.setAttribute('stroke-width', '5');
        const fgCircle = document.createElementNS(svgNS, 'circle');
        fgCircle.setAttribute('cx', '118'); fgCircle.setAttribute('cy', '118'); fgCircle.setAttribute('r', '102');
        fgCircle.setAttribute('fill', 'none'); fgCircle.setAttribute('stroke', '#C5D8B6'); fgCircle.setAttribute('stroke-width', '5.5');
        fgCircle.setAttribute('stroke-linecap', 'round');
        fgCircle.setAttribute('stroke-dasharray', String(CIRC));
        fgCircle.setAttribute('id', 'focus-ring-fg');
        ringSvg.appendChild(bgCircle);
        ringSvg.appendChild(fgCircle);

        const ringWrap = el('div', { class: 'focus-ring-wrap' }, [
          ringSvg,
          el('div', { class: 'focus-ring-time', id: 'focus-ov-time' }, '00:00'),
          el('div', { class: 'focus-ring-sub', id: 'focus-ov-sub' }, '목표 ' + (s.goalMin || 50) + '분'),
        ]);

        const pauseResumeBtn = el('button', {
          class: 'focus-btn-main',
          type: 'button',
          onclick: function () { if (s.pausedAt) self.resume(); else self.pause(); },
        }, s.pausedAt ? '다시 집중 시작' : '잠시 쉬기');

        const center = el('div', { class: 'focus-ov-center' }, [
          el('div', { class: 'focus-ov-eyebrow' }, s.pausedAt ? 'PAUSED · 잠시 멈춤' : 'FOCUS SESSION'),
          el('div', { class: 'focus-ov-headline' }, s.pausedAt ? '잠시 숨을 고르고 있습니다.' : '지금은, 한 가지에만.'),
          ringWrap,
          el('div', { class: 'focus-ov-task' }, s.title || '수험 공부'),
          el('div', { class: 'focus-ov-task-sub' }, [
            sub ? sub.name : '수험 집중',
            s.subtitle ? ' · ' + s.subtitle : (' · 목표 ' + (s.goalMin || 50) + '분'),
          ].join('')),
          pauseResumeBtn,
          el('div', { class: 'row', style: 'justify-content:center;gap:12px;margin-top:6px' }, [
            el('button', { class: 'focus-btn-sub', type: 'button', onclick: function () { self.closeOverlay(); } }, '노트·계획 보며 계속하기'),
            el('button', { class: 'focus-btn-sub', type: 'button', onclick: function () { self.stop(); window.dispatchEvent(new CustomEvent('timer:changed')); } }, '세션 종료 · 기록'),
          ]),
        ]);

        // 환경음 바 (기본 음소거 — 제안서 10·12쪽)
        const ambModes = [
          ['off', '환경음 꺼짐'],
          ['rain', '빗소리'],
          ['library', '서재 소리'],
        ];
        const ambPills = el('div', { class: 'row', style: 'gap:6px' });
        ambModes.forEach(function (pair) {
          const active = AmbientAudio.mode() === pair[0] && !AmbientAudio.muted();
          ambPills.append(el('button', {
            type: 'button',
            class: 'focus-ambient-pill',
            'aria-pressed': active ? 'true' : 'false',
            onclick: function () { AmbientAudio.setMode(pair[0]); self._renderOverlayStructure(); self._tickRender(); },
          }, pair[1]));
        });

        const volWrap = el('div', { class: 'row', style: 'gap:8px;align-items:center' });
        if (AmbientAudio.mode() !== 'off') {
          const muteBtn = el('button', {
            type: 'button',
            class: 'focus-ambient-pill',
            'aria-pressed': AmbientAudio.muted() ? 'true' : 'false',
            onclick: function () { AmbientAudio.toggleMute(); self._renderOverlayStructure(); self._tickRender(); },
          }, AmbientAudio.muted() ? '음소거 해제' : '즉시 음소거');
          const slider = el('input', {
            type: 'range', min: '0.05', max: '0.8', step: '0.05',
            value: String(AmbientAudio.volume()),
            'aria-label': '환경음 볼륨',
            style: 'width:84px;min-height:24px;accent-color:#C5D8B6;cursor:pointer',
          });
          slider.addEventListener('input', function () { AmbientAudio.setVolume(slider.value); });
          volWrap.append(muteBtn, slider);
        } else {
          volWrap.append(el('span', { style: 'font-size:.76rem;color:#9EB5A9' }, '기본 음소거'));
        }

        const ambBar = el('div', { class: 'focus-ambient-bar' }, [ambPills, volWrap]);
        ov.append(top, center, ambBar);
      },
      _tickRender: function () {
        const s = this.current();
        if (!s) { this._unmount(); return; }
        const elapsedSec = Math.floor(activeElapsedMs(s) / 1000);
        const goalSec = Math.max(60, (s.goalMin || 50) * 60);
        const remainSec = goalSec - elapsedSec;

        // 상단 미니 배너 갱신
        const banner = document.getElementById('focus-banner');
        if (banner) {
          const hh = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
          const mm = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
          const ss = String(elapsedSec % 60).padStart(2, '0');
          const self = this;
          banner.classList.add('active');
          banner.innerHTML = '';
          banner.append(el('div', { class: 'focus-banner-inner' }, [
            el('span', { style: 'opacity:.85' }, s.pausedAt ? '일시정지:' : '집중 중:'),
            el('strong', {}, s.title || '수험 공부'),
            el('span', { class: 'timer-val' }, hh + ':' + mm + ':' + ss),
            el('span', { class: 'spacer' }),
            el('button', { class: 'btn btn-sm', style: 'background:rgba(255,255,255,.16);color:#F5F2E5;border-color:rgba(255,255,255,.25);min-height:34px', onclick: function () { self.openOverlay(); } }, '집중 화면 열기'),
            el('button', { class: 'btn btn-sm', style: 'background:#C5D8B6;color:#142A23;border-color:transparent;min-height:34px', onclick: function () { self.stop(); } }, '세션 종료 · 기록'),
          ]));
        }

        // 전면 오버레이가 열려 있으면 숫자·원형 프로그레스만 부분 갱신
        const timeEl = document.getElementById('focus-ov-time');
        const subEl = document.getElementById('focus-ov-sub');
        const fgEl = document.getElementById('focus-ring-fg');
        if (timeEl) {
          if (remainSec >= 0) {
            const rm = String(Math.floor(remainSec / 60)).padStart(2, '0');
            const rs = String(remainSec % 60).padStart(2, '0');
            timeEl.textContent = rm + ':' + rs;
          } else {
            const over = Math.abs(remainSec);
            const om = String(Math.floor(over / 60)).padStart(2, '0');
            const os = String(over % 60).padStart(2, '0');
            timeEl.textContent = '+' + om + ':' + os;
          }
        }
        if (subEl) {
          subEl.textContent = '경과 ' + Math.floor(elapsedSec / 60) + '분 · 목표 ' + (s.goalMin || 50) + '분';
        }
        if (fgEl) {
          const CIRC = 2 * Math.PI * 102;
          const ratio = Math.min(1, elapsedSec / goalSec);
          fgEl.setAttribute('stroke-dashoffset', String(CIRC * (1 - ratio)));
        }
      },
      _mount: function () {
        const self = this;
        this._renderOverlayStructure();
        clearInterval(tick);
        tick = setInterval(function () { self._tickRender(); }, 1000);
        this._tickRender();
      },
      _unmount: function () {
        clearInterval(tick);
        const b = document.getElementById('focus-banner');
        if (b) { b.classList.remove('active'); b.innerHTML = ''; }
        const ov = document.getElementById('focus-overlay');
        if (ov) { ov.classList.add('hidden'); ov.innerHTML = ''; }
        window.dispatchEvent(new CustomEvent('timer:changed'));
      },
      resumeIfActive: function () { if (this.current()) this._mount(); },
    };
    return T;
  })();

  /* =======================================================================
     3-b. AiStore — AI 키·대화 기록 전용 저장소 (기기 로컬 전용)
     ⚠️ API 키와 대화는 메인 Store(클라우드 동기화 대상)와 분리해 별도 로컬 키에 저장합니다.
        → Firebase 동기화를 켜도 키/대화는 절대 클라우드로 올라가지 않습니다.
        → 제안서 4·11·13쪽: 첫 화면에서 API 키 설정이 학습 행동을 가리지 않도록 기본 접힘(false)
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
      return {
        keys: { gpt: '', gemini: '', claude: '' },
        provider: 'gemini',
        geminiModel: 'gemini-4-argon',
        geminiThinking: 'MEDIUM',
        widgetOpen: false,
        widgetDocked: false,
        nongyeolCollapsedV1: true,
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
      // 제안서 4쪽 반영: 기존에 자동 펼침 상태로 저장된 패널을 1회 기본 접힘으로 전환
      if (!_d.nongyeolCollapsedV1) {
        _d.widgetOpen = false;
        _d.nongyeolCollapsedV1 = true;
        persist();
      }
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
    root.append(el('header', { class: 'page-hero' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'STUDY TASKS'),
        el('h1', { class: 'page-title' }, '과업 (' + d.tasks.length + ')'),
        el('p', { class: 'page-subtitle' }, '모든 수험 과업을 관리합니다. 과업 하나를 여러 블록에 나누어 공부해도 중복이 생기지 않습니다.'),
      ]),
      el('button', { class: 'btn btn-primary', onclick: function () { openTaskEditor(null, ctx); } }, '+ 새 과업'),
    ]));
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
     6. 홈 — 오늘의 공부 (제안서 6·8·10쪽 에디토리얼 시안)
     ======================================================================= */
  function renderHome(root, ctx) {
    const d = Store.data();
    const tk = todayKey();
    const metrics = homeMetrics(d, tk);

    // 상단 에디토리얼 페이지 헤더
    const dd0 = dday(d.settings.examDate, d.settings.examDateConfirmed);
    const heroRight = el('div', { class: 'row', style: 'gap:8px;align-items:center' });
    if (dd0 == null) {
      heroRight.append(
        el('button', { class: 'btn btn-sm btn-ghost', onclick: function () { ctx.navigate('settings'); } }, '시험일 설정'),
      );
    } else {
      heroRight.append(
        el('span', { class: 'tag tag-exam' }, '변리사 2차 D-' + (dd0 >= 0 ? dd0 : '지남')),
      );
    }
    heroRight.append(
      el('button', {
        class: 'btn btn-sm',
        onclick: function () { openCoreBundleModal(ctx); },
      }, '★ 핵심 쟁점 묶음'),
    );

    root.append(el('header', { class: 'page-hero' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, fmtEnglishEyebrowDate(new Date())),
        el('h1', { class: 'page-title' }, '오늘의 공부'),
        el('p', { class: 'page-subtitle' }, '확보한 수험 블록과 이어 읽을 서재를 확인하고 바로 집중을 시작합니다.'),
      ]),
      heroRight,
    ]));

    // 상단 히어로 그리드: 좌측 '지금 할 공부' + 우측 '이번 주, 쌓인 시간' (제안서 6쪽)
    const heroGrid = el('div', { class: 'home-hero-grid' }, [
      buildNowCard(d, ctx),
      buildWeekAccumCard(d, ctx),
    ]);
    root.append(heroGrid);

    const grid = el('div', { class: 'grid grid-7to3' });
    const left = el('div', { class: 'stack', style: 'gap:18px' });

    // ① 오늘의 흐름 — 시간표 블록 + 고정 대학 수업 통합 타임라인
    left.append(buildTodayFlow(d, ctx));

    // ② 이어 읽는 서재 — 마지막으로 읽던 노트·과업 재개 카드 (제안서 6·10쪽)
    left.append(buildResumeSection(d, ctx));

    // ③ 오늘의 핵심 과업(최대 3)
    const focusTasks = d.focusToday.map(function (id) { return Store.task(id); }).filter(Boolean);
    const focusCard = el('div', { class: 'card' });
    focusCard.append(el('div', { class: 'section-head' }, [
      el('h3', {}, '오늘의 핵심 과업'),
      el('button', { class: 'section-link', onclick: function () { openFocusPicker(ctx); } }, '과업 선택 →'),
    ]));
    if (focusTasks.length === 0) {
      focusCard.append(el('p', { class: 'hint' }, '오늘 가장 먼저 끝낼 수험 과업을 최대 3개까지 골라 두면 "지금 할 공부"와 함께 이어집니다.'));
      focusCard.append(el('button', { class: 'btn btn-sm', style: 'margin-top:10px', onclick: function () { openTaskEditor(null, ctx, { pinToday: true }); } }, '+ 첫 과업 만들기'));
    } else {
      const list = el('div', { class: 'stack' });
      focusTasks.forEach(function (t, i) { list.append(focusItem(t, i, ctx)); });
      focusCard.append(list);
    }
    left.append(focusCard);
    grid.append(left);

    // 우측 보조 레일: 다시 볼 쟁점 (+ 재작성 예약) · 놓치면 안 되는 학업
    const right = el('div', { class: 'stack', style: 'gap:16px' });

    const revCard = el('div', { class: 'card' });
    revCard.append(el('div', { class: 'section-head' }, [
      el('h3', {}, '다시 볼 쟁점'),
      el('button', { class: 'section-link', onclick: function () { ctx.navigate('review'); } }, '복습 카드 →'),
    ]));

    const dailyLimit = d.settings.dailyReviewLimit || 25;
    if (metrics.dueReviews == null) {
      revCard.append(el('p', { class: 'hint' }, '아직 등록된 복습 카드가 없습니다. 단권화 서재에서 문장을 골라 바로 만들 수 있습니다.'));
      revCard.append(el('button', { class: 'btn btn-sm', style: 'margin-top:8px', onclick: function () { ctx.navigate('review'); } }, '첫 카드 만들기'));
    } else if (metrics.dueReviews === 0) {
      revCard.append(el('p', { class: 'hint' }, '오늘 예정된 복습 카드를 모두 마쳤습니다.'));
    } else {
      const todayBatch = Math.min(metrics.dueReviews, dailyLimit);
      revCard.append(el('div', { class: 'row between', style: 'padding:6px 0 10px' }, [
        el('div', {}, [
          el('div', { style: 'font-weight:700;font-size:.95rem' }, '오늘의 복습 ' + todayBatch + '개'),
          el('div', { class: 'hint' }, metrics.dueReviews > todayBatch ? ('밀린 전체 ' + metrics.dueReviews + '개 중 오늘 분량') : '취약·연기 카드 우선 배정'),
        ]),
        el('button', { class: 'btn btn-primary btn-sm', onclick: function () { ctx.navigate('review'); } }, '복습 시작'),
      ]));
    }

    // 재작성 예약 서브 섹션 (제안서 6쪽 우상단: 미채점/재작성 답안 연결)
    const pendingRewrites = d.answers.filter(function (a) { return (a.scored === false || a.needRewrite) && !a.rewriteDone; })
      .sort(function (a, b) { return (a.rewriteDue || a.date || '').localeCompare(b.rewriteDue || b.date || ''); });
    if (pendingRewrites.length > 0) {
      const rwBox = el('div', { style: 'margin-top:12px;padding:12px 14px;border-radius:10px;background:var(--surface-soft);border:1px solid var(--border)' });
      rwBox.append(el('div', { class: 'row between', style: 'margin-bottom:4px' }, [
        el('span', { style: 'font-size:.78rem;font-weight:700;color:var(--terracotta)' }, '재작성 예약 · ' + pendingRewrites.length + '건'),
        el('button', { class: 'section-link', style: 'font-size:.76rem', onclick: function () { ctx.navigate('answers'); } }, '열기 →'),
      ]));
      const topRw = pendingRewrites[0];
      const rwSub = Store.subject(topRw.subjectId);
      const rwTitle = topRw.title || ((topRw.source || '답안 연습') + (topRw.round ? ' ' + topRw.round + '회' : ''));
      const rwDed = (topRw.errors && topRw.errors.length ? topRw.errors.join(', ') : '') || topRw.deductions || topRw.note || '';
      rwBox.append(
        el('div', { style: 'font-weight:600;font-size:.88rem' }, (rwSub ? '[' + rwSub.name + '] ' : '') + rwTitle),
        rwDed ? el('div', { class: 'hint', style: 'margin-top:2px' }, '보완: ' + rwDed.slice(0, 46)) : '',
      );
      revCard.append(rwBox);
    }
    right.append(revCard);

    // 놓치면 안 되는 학업 (샌드 배경 + 테라코타 강조 — 제안서 6쪽 우하단)
    const acadCard = el('div', { class: 'card acad-alert-card' });
    acadCard.append(el('div', { class: 'section-head' }, [
      el('h3', {}, '놓치면 안 되는 학업'),
      el('button', { class: 'section-link', style: 'color:var(--acad-fg)', onclick: function () { ctx.navigate('academic'); } }, '전체 →'),
    ]));
    const upcoming = upcomingAssignments(d);
    const unreadImpNotices = (d.notices || []).filter(function (n) { return !n.read && n.important; });
    if (upcoming.length === 0 && unreadImpNotices.length === 0) {
      acadCard.append(el('p', { class: 'hint', style: 'color:var(--acad-fg)' }, '7일 내 임박한 과제 마감이나 미확인 중요 공지가 없습니다.'));
    } else {
      const ul = el('div', { class: 'stack', style: 'gap:10px' });
      upcoming.slice(0, 3).forEach(function (a) {
        const course = d.courses.find(function (c) { return c.id === a.courseId; });
        const cLabel = (course && course.name) || a.courseName || '대학 강좌';
        const dueDays = a.due ? Math.ceil((new Date(a.due) - new Date()) / 86400000) : null;
        const dueBadge = dueDays != null ? (dueDays <= 0 ? '오늘 마감' : 'D-' + dueDays) : fmtDate(a.due);
        ul.append(el('div', { style: 'padding-bottom:8px;border-bottom:1px solid rgba(152,88,63,.15)' }, [
          el('div', { class: 'row between', style: 'gap:6px' }, [
            el('span', { style: 'font-size:.76rem;color:var(--acad-fg);font-weight:600' }, cLabel),
            el('span', { class: 'acad-due-accent' }, dueBadge),
          ]),
          el('div', { style: 'font-weight:700;font-size:.9rem;margin-top:2px;color:var(--text)' }, a.title),
        ]));
      });
      if (unreadImpNotices.length > 0) {
        ul.append(el('button', {
          type: 'button',
          class: 'section-link',
          style: 'color:var(--terracotta);text-align:left;padding:2px 0;font-weight:700',
          onclick: function () { acadTab = 'notices'; ctx.navigate('academic'); },
        }, '중요 공지 미확인 ' + unreadImpNotices.length + '건 바로 보기 →'));
      }
      acadCard.append(ul);
    }
    acadCard.append(el('div', { class: 'row', style: 'gap:6px;margin-top:14px;flex-wrap:wrap' }, [
      el('button', { class: 'btn btn-sm', style: 'background:var(--surface);border-color:rgba(152,88,63,.25)', onclick: function () { ctx.navigate('academic'); } }, '대학 학업 열기'),
      el('button', { class: 'btn btn-sm btn-ghost', style: 'color:var(--acad-fg)', onclick: function () { triggerLearnUsSync(ctx); } }, 'LearnUs 동기화'),
    ]));
    right.append(acadCard);

    grid.append(right);
    root.append(grid);
  }

  // 좌상단 히어로: '지금 할 공부' (제안서 6·8쪽)
  function buildNowCard(d, ctx) {
    const card = el('div', { class: 'now-study-card' });
    const main = el('div', { class: 'now-study-main' });
    const running = Timer.current();
    const nowIso = new Date().toISOString();

    const current = d.blocks.filter(function (b) { return isExam(d, b) && b.start <= nowIso && b.end > nowIso; }).sort(function (a, b) { return a.start.localeCompare(b.start); })[0];
    const next = nextBlock(d);
    const firstFocus = d.focusToday.map(function (id) { return Store.task(id); }).filter(Boolean)[0];

    if (running) {
      const rSub = running.subjectId ? Store.subject(running.subjectId) : null;
      main.append(
        el('div', { class: 'row', style: 'gap:6px' }, [
          el('span', { class: 'tag tag-exam' }, '집중 진행 중'),
          rSub ? el('span', { class: 'tag tag-muted' }, rSub.name) : '',
        ]),
        el('h2', { class: 'now-study-title' }, running.title || '수험 공부'),
        el('div', { class: 'now-study-meta' }, (running.pausedAt ? '일시정지 상태 · ' : '목표 ' + (running.goalMin || 50) + '분 · ') + '집중 화면에서 몰입을 이어가세요.'),
        el('div', { class: 'now-study-actions' }, [
          el('button', { class: 'btn btn-primary btn-lg', onclick: function () { Timer.openOverlay(); } }, '▶ 집중 화면 열기'),
          el('button', { class: 'btn', onclick: function () { Timer.stop(); ctx.refresh(); } }, '세션 종료 · 기록'),
        ]),
      );
      card.append(main, paperNotebookIllustEl());
      return card;
    }

    const block = current || next;
    let task = null, subjectId = null, title = null, timeLabel = null, goalMin = d.settings.focusGoalMin || 50;
    if (block) {
      task = block.taskId ? Store.task(block.taskId) : null;
      subjectId = block.subjectId || (task && task.subjectId);
      title = (task && task.title) || block.title;
      const bMin = Math.max(15, minutesBetween(block.start, block.end));
      goalMin = bMin;
      timeLabel = fmtTime(block.start) + '–' + fmtTime(block.end) + ' · 목표 ' + fmtMin(bMin) + (current ? ' (지금 블록)' : '');
    } else if (firstFocus) {
      task = firstFocus;
      subjectId = firstFocus.subjectId;
      title = firstFocus.title;
      if (firstFocus.estMin) goalMin = firstFocus.estMin;
      timeLabel = firstFocus.estMin ? ('목표 ' + fmtMin(firstFocus.estMin)) : '오늘의 핵심 과업';
    }

    if (!title) {
      main.append(
        el('div', { class: 'row' }, [el('span', { class: 'tag tag-exam' }, '지금 할 공부')]),
        el('h2', { class: 'now-study-title' }, '오늘 집중할 첫 공부를 골라 보세요'),
        el('div', { class: 'now-study-meta' }, '주간 계획에서 수험 블록을 배치하거나 핵심 과업을 지정하면 이곳에서 바로 시작할 수 있습니다.'),
        el('div', { class: 'now-study-actions' }, [
          el('button', { class: 'btn btn-primary', onclick: function () { openTaskEditor(null, ctx, { pinToday: true }); } }, '+ 핵심 과업 만들기'),
          el('button', { class: 'btn', onclick: function () { ctx.navigate('week'); } }, '주간 계획 열기'),
        ]),
      );
      card.append(main, paperNotebookIllustEl());
      return card;
    }

    const sub = subjectId ? Store.subject(subjectId) : null;
    const issueKey = (task && task.issue) ? task.issue.trim() : '';
    const relNote = d.notes.find(function (n) {
      if (issueKey && n.subjectId === subjectId && n.issue && n.issue.trim() === issueKey) return true;
      return n.subjectId === subjectId && title && n.title && title.indexOf(n.title) >= 0;
    }) || (d.lastOpenNote ? Store.note(d.lastOpenNote) : null);

    // 같은 과목/쟁점의 최근 감점 메모 탐색 (제안서 6쪽 '지난 감점: ...')
    const relAns = d.answers.filter(function (a) {
      const hasDed = (a.errors && a.errors.length) || a.deductions || a.note;
      if (!hasDed) return false;
      if (issueKey && a.issue && a.issue.trim() === issueKey) return true;
      return subjectId && a.subjectId === subjectId;
    }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); })[0];

    main.append(
      el('div', { class: 'row', style: 'gap:6px' }, [
        el('span', { class: 'tag tag-exam' }, '지금 할 공부'),
        sub ? el('span', { class: 'tag tag-muted' }, sub.name) : '',
        (block && block.locked) ? el('span', { class: 'hint' }, '보호 블록') : '',
      ]),
      el('h2', { class: 'now-study-title' }, title),
      el('div', { class: 'now-study-meta' }, timeLabel || '수험 집중 세션'),
    );

    const actions = el('div', { class: 'now-study-actions' });
    actions.append(el('button', {
      class: 'btn btn-primary btn-lg',
      onclick: function () {
        Timer.start(task ? task.id : null, subjectId, title, { goalMin: goalMin, subtitle: timeLabel || '' });
        ctx.refresh();
      },
    }, '▶ 집중 시작'));

    actions.append(el('button', {
      class: 'btn',
      onclick: function () {
        if (relNote) openNoteById(relNote.id, ctx);
        else ctx.navigate('notes');
      },
    }, '원문·노트 열기'));

    if (relAns) {
      const rawDed = ((relAns.errors && relAns.errors.length) ? relAns.errors.join(', ') : '') || relAns.deductions || relAns.note || '';
      const shortDed = rawDed.replace(/\s+/g, ' ').trim().slice(0, 26);
      if (shortDed) {
        actions.append(el('button', {
          type: 'button',
          class: 'deduction-chip',
          title: '답안 연습에서 감점 내역 확인',
          onclick: function () { ctx.navigate('answers'); },
        }, '지난 감점: ' + shortDed + (rawDed.length > 26 ? '…' : '')));
      }
    }

    main.append(actions);
    card.append(main, paperNotebookIllustEl());
    return card;
  }

  // 우상단 히어로: '이번 주, 쌓인 시간' (제안서 6쪽)
  function buildWeekAccumCard(d, ctx) {
    const monday = getMonday(0);
    const weekDates = [];
    for (let i = 0; i < 7; i++) weekDates.push(dayKey(addDays(monday, i)));
    const actualMin = weekActualMin(d, weekDates);
    const planMin = weekPlanMin(d, weekDates);
    const goalH = d.settings.weeklyExamGoalH || 30;
    const actualH = Math.round((actualMin / 60) * 10) / 10;
    const pct = Math.min(100, Math.round((actualMin / (goalH * 60)) * 100));

    const barTrack = el('div', { class: 'progress', style: 'background:rgba(36,76,61,.14);height:7px' });
    barTrack.append(el('span', { style: 'width:' + pct + '%;background:var(--accent)' }));

    const footText = planMin > 0
      ? ('현재 계획 ' + fmtMin(planMin) + ' 확보됨')
      : '현재 계획 · 미확보';

    return el('div', { class: 'week-accum-card' }, [
      el('div', {}, [
        el('div', { style: 'font-size:.86rem;font-weight:700;color:var(--exam-fg)' }, '이번 주, 쌓인 시간'),
        el('div', { class: 'week-accum-num-row' }, [
          el('div', {}, [
            el('span', { class: 'week-accum-big' }, String(actualH)),
            el('span', { class: 'week-accum-unit' }, '시간'),
          ]),
          el('span', { style: 'font-size:.84rem;color:var(--text-sub);font-weight:600' }, '목표 ' + goalH + 'h'),
        ]),
        barTrack,
      ]),
      el('button', {
        type: 'button',
        class: 'week-accum-foot',
        onclick: function () { ctx.navigate('week'); },
      }, [
        el('span', {}, footText),
        el('span', { style: 'font-weight:700;color:var(--exam-fg)' }, '주간 계획 →'),
      ]),
    ]);
  }

  // 오늘의 흐름 — 수험 블록 + 오늘의 고정 대학 강의 통합 타임라인 (제안서 6·8쪽)
  function buildTodayFlow(d, ctx) {
    const tk = todayKey();
    const card = el('div', { class: 'card' });
    card.append(el('div', { class: 'section-head' }, [
      el('h3', {}, '오늘의 흐름'),
      el('button', { class: 'section-link', onclick: function () { ctx.navigate('week'); } }, '주간 계획 →'),
    ]));

    const monday = getMonday(0);
    const weekDates = [];
    for (let i = 0; i < 7; i++) weekDates.push(dayKey(addDays(monday, i)));
    ensureWeekScheduleSynced(weekDates);

    const items = d.blocks.filter(function (b) { return b.date === tk; }).map(function (b) {
      const kind = blockKind(d, b);
      const sub = Store.subject(b.subjectId);
      const isCommute = b.source === 'commute';
      const commuteDesc = b.commutePos === 'before'
        ? '등교·이동 (첫 수업 1시간 전)'
        : b.commutePos === 'after'
          ? '하교·이동 (마지막 수업 1시간 후)'
          : '이동시간';
      return {
        start: b.start,
        end: b.end,
        kind: kind,
        title: b.title || (sub ? sub.name : '학습 블록'),
        subText: isCommute
          ? commuteDesc
          : (b.locked ? '보호된 수험 블록' : (kind === 'exam' ? '수험 블록' : kind === 'acad' ? '대학 학업' : '일정')) + (sub ? ' · ' + sub.name : ''),
        onClick: function () { ctx.navigate(kind === 'acad' ? 'academic' : 'week'); },
      };
    });

    items.sort(function (a, b) { return a.start.localeCompare(b.start); });

    if (items.length === 0) {
      card.append(el('p', { class: 'hint' }, '오늘 예정된 블록이 없습니다. 주간 계획에서 수험 블록을 먼저 확보해 보세요.'));
      return card;
    }

    const nowIso = toLocalIso(new Date());
    const list = el('div', { class: 'flow-list' });
    items.forEach(function (it) {
      const isNow = it.start <= nowIso && it.end > nowIso;
      const past = it.end <= nowIso;
      const row = el('div', {
        class: 'flow-row' + (past ? ' past' : ''),
        role: 'button',
        tabindex: '0',
        onclick: it.onClick,
      }, [
        el('div', { class: 'flow-time' }, [
          fmtTime(it.start),
          el('small', {}, fmtTime(it.end)),
        ]),
        el('div', { class: 'flow-bar ' + (it.kind === 'exam' ? 'exam' : it.kind === 'acad' ? 'acad' : '') }),
        el('div', { style: 'min-width:0' }, [
          el('div', { class: 'flow-title', style: isNow ? 'color:var(--accent)' : '' }, it.title + (isNow ? ' · 지금' : '')),
          el('div', { class: 'flow-sub' }, it.subText),
        ]),
        el('span', { class: 'flow-arrow', 'aria-hidden': 'true' }, '→'),
      ]);
      row.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); it.onClick(); } });
      list.append(row);
    });
    card.append(list);
    return card;
  }

  // 이어 읽는 서재 — 마지막으로 읽던 노트·과업 빠른 재개 카드 (제안서 6·10쪽)
  function buildResumeSection(d, ctx) {
    const wrap = el('div', { class: 'card' });
    wrap.append(el('div', { class: 'section-head' }, [
      el('h3', {}, '이어 읽는 서재'),
      el('button', { class: 'section-link', onclick: function () { ctx.navigate('notes'); } }, '단권화 서재 →'),
    ]));

    const noteStatusMap = { todo: '수집', doing: '정리 중', done: '검토 완료', recheck: '재확인 필요' };
    const orderedNotes = [];
    if (d.lastOpenNote) {
      const ln = Store.note(d.lastOpenNote);
      if (ln) orderedNotes.push(ln);
    }
    d.notes.slice().sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); }).forEach(function (n) {
      if (orderedNotes.length < 4 && !orderedNotes.some(function (x) { return x.id === n.id; })) {
        orderedNotes.push(n);
      }
    });

    if (orderedNotes.length === 0) {
      wrap.append(el('p', { class: 'hint' }, '단권화 서재에 쟁점 노트를 작성하면 마지막으로 읽던 위치와 원문 쪽수(p.)가 이곳에 표시됩니다.'));
      wrap.append(el('button', { class: 'btn btn-sm', style: 'margin-top:10px', onclick: function () { ctx.navigate('notes'); } }, '+ 첫 서재 노트 열기'));
      return wrap;
    }

    const grid = el('div', { class: 'resume-grid' });
    orderedNotes.slice(0, 4).forEach(function (n, idx) {
      const sub = Store.subject(n.subjectId);
      const badgeChar = sub ? sub.name.charAt(0) : '노';
      const metaParts = [];
      const pageStr = (n.source && n.source.page) || n.sourcePage || '';
      if (sub) metaParts.push(sub.name);
      if (n.issue) metaParts.push(n.issue);
      if (pageStr) metaParts.push('p.' + String(pageStr).replace(/^p\.?/i, ''));
      metaParts.push(noteStatusMap[n.status] || '정리 중');

      grid.append(el('button', {
        type: 'button',
        class: 'resume-card',
        onclick: function () { openNoteById(n.id, ctx); },
      }, [
        el('span', { class: 'resume-badge' + (idx % 2 === 1 ? ' warm' : '') }, badgeChar),
        el('div', { class: 'resume-main' }, [
          el('div', { class: 'resume-title' }, n.title),
          el('div', { class: 'resume-meta' }, metaParts.join(' · ')),
        ]),
      ]));
    });
    wrap.append(grid);
    return wrap;
  }

  // 시험 직전 핵심 묶음 모달 (제안서 10쪽: 핵심 표시된 노트·반복 감점·취약 카드 한눈에 보기)
  function openCoreBundleModal(ctx) {
    const d = Store.data();
    const starredIds = new Set((d.settings && d.settings.starredNoteIds) || []);
    const starredNotes = d.notes.filter(function (n) { return starredIds.has(n.id) || n.status === 'recheck'; });
    const deductAnswers = d.answers.filter(function (a) { return (a.errors && a.errors.length) || a.deductions || a.scored === false; }).slice(0, 6);
    const weakCards = d.cards.filter(function (c) { return c.status === 'active' && ((c.lapses || 0) > 0 || (c.interval || 1) <= 1); }).slice(0, 6);

    const body = el('div', { class: 'stack', style: 'gap:16px' });
    body.append(el('p', { class: 'hint' }, '별표(★) 표시하거나 재확인이 필요한 서재 노트, 반복 감점 답안, 취약 복습 카드를 한곳에 모았습니다.'));

    const sec1 = el('div', { class: 'stack', style: 'gap:6px' }, [el('strong', {}, '1. 핵심·재확인 서재 노트 (' + starredNotes.length + ')')]);
    if (starredNotes.length === 0) sec1.append(el('p', { class: 'hint' }, '단권화 서재에서 ★ 핵심 표시를 누르면 여기에 모입니다.'));
    starredNotes.slice(0, 8).forEach(function (n) {
      const sub = Store.subject(n.subjectId);
      sec1.append(el('button', {
        type: 'button', class: 'item', style: 'text-align:left;cursor:pointer;width:100%',
        onclick: function () { m.close(); openNoteById(n.id, ctx); },
      }, [
        el('div', { class: 'main' }, [
          el('div', { class: 'title' }, '★ ' + n.title),
          el('div', { class: 'meta' }, (sub ? sub.name + ' · ' : '') + (n.issue || '쟁점 미지정')),
        ]),
        el('span', { class: 'hint' }, '열기 →'),
      ]));
    });

    const sec2 = el('div', { class: 'stack', style: 'gap:6px' }, [el('strong', {}, '2. 최근 감점 및 재작성 대상 (' + deductAnswers.length + ')')]);
    if (deductAnswers.length === 0) sec2.append(el('p', { class: 'hint' }, '기록된 감점 내역이 없습니다.'));
    deductAnswers.forEach(function (a) {
      const sub = Store.subject(a.subjectId);
      const aTitle = a.title || ((a.source || '답안 연습') + (a.round ? ' ' + a.round + '회' : ''));
      const aDed = (a.errors && a.errors.length ? a.errors.join(', ') : '') || a.deductions || a.note || '재작성 미채점';
      sec2.append(el('div', { class: 'item' }, [
        el('div', { class: 'main' }, [
          el('div', { class: 'title' }, (sub ? '[' + sub.name + '] ' : '') + aTitle),
          el('div', { class: 'meta', style: 'color:var(--terracotta)' }, aDed),
        ]),
      ]));
    });

    const sec3 = el('div', { class: 'stack', style: 'gap:6px' }, [el('strong', {}, '3. 취약·단기 간격 복습 카드 (' + weakCards.length + ')')]);
    if (weakCards.length === 0) sec3.append(el('p', { class: 'hint' }, '누적 오답/단기 간격 카드가 아직 없습니다.'));
    weakCards.forEach(function (c) {
      sec3.append(el('div', { class: 'item' }, [
        el('div', { class: 'main' }, [
          el('div', { class: 'title' }, c.q || c.question || '(질문 없음)'),
          el('div', { class: 'meta' }, (c.issue || '쟁점') + ' · 간격 ' + (c.interval || 1) + '일'),
        ]),
      ]));
    });

    body.append(sec1, sec2, sec3);
    const m = ctx.modal({
      title: '시험 직전 핵심 쟁점 묶음',
      body: body,
      footer: [
        el('button', { class: 'btn', onclick: function () { window.print(); } }, '인쇄 / PDF 저장'),
        el('button', { class: 'btn btn-primary', onclick: function () { m.close(); } }, '닫기'),
      ],
    });
  }

  function homeMetrics(d, tk) {
    const todayBlocks = d.blocks.filter(function (b) { return b.date === tk && isExam(d, b); });
    const secured = todayBlocks.length ? sumNonOverlap(todayBlocks) : null;
    const wa = weekAdherence(d);
    const dueReviews = d.cards.length === 0 ? null : d.cards.filter(function (c) { return c.status === 'active' && c.nextReview && c.nextReview <= tk; }).length;
    const acadAlerts = (d.assignments.length === 0 && d.courses.length === 0) ? null : upcomingAssignments(d).length;
    return { securedToday: secured, adherence: wa.adherence, adherenceSub: wa.sub, dueReviews: dueReviews, acadAlerts: acadAlerts };
  }
  function isExamSession(d, s) {
    if (!s.subjectId) return true;
    const sub = d.subjects.find(function (x) { return x.id === s.subjectId; });
    return sub ? sub.kind === 'exam' : true;
  }
  function weekPlanMin(d, weekDates) {
    return d.blocks.filter(function (b) { return weekDates.indexOf(b.date) >= 0 && isExam(d, b); })
      .reduce(function (s, b) { return s + minutesBetween(b.start, b.end); }, 0);
  }
  function weekActualMin(d, weekDates) {
    return d.sessions.filter(function (s) { return weekDates.indexOf(dayKey(new Date(s.start))) >= 0 && isExamSession(d, s); })
      .reduce(function (s, x) { return s + Math.max(0, minutesBetween(x.start, x.end) - (x.breakMin || 0)); }, 0);
  }
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
    const base = baselinePlanMin(d, mondayKey, curPlan);
    if (base.planMin === 0) return { adherence: null, sub: '확정 계획 없음' };
    const actualMin = weekActualMin(d, weekDates);
    const label = base.confirmed ? '기준' : '잠정';
    const changed = (base.confirmed && curPlan !== base.planMin) ? ' · 현재계획 ' + fmtMin(curPlan) : '';
    return { adherence: Math.round(Math.min(999, actualMin / base.planMin * 100)), sub: fmtMin(actualMin) + ' / ' + label + ' ' + fmtMin(base.planMin) + changed };
  }
  function nextBlock(d) {
    const nowIso = new Date().toISOString();
    return d.blocks.filter(function (b) { return isExam(d, b) && b.end > nowIso; }).sort(function (a, b) { return a.start.localeCompare(b.start); })[0] || null;
  }
  function upcomingAssignments(d) {
    const horizon = toLocalIso(addDays(new Date(), 7));
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
        ? el('button', { class: 'btn btn-primary btn-sm', onclick: function () { Timer.openOverlay(); } }, '집중 화면')
        : el('button', { class: 'btn btn-primary btn-sm', onclick: function () { Timer.start(t.id, t.subjectId, t.title, { goalMin: t.estMin || 50 }); ctx.refresh(); } }, '▶ 집중'),
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
  // --- 묶음 D: 반복 수업 + 첫 수업 전·마지막 수업 후 1시간 이동시간 자동 연결 · 빈 시간 제안 ---
  function isOnlineCourse(dd, courseId) {
    if (!courseId) return false;
    const c = (dd.courses || []).find(function (x) { return x && x.id === courseId; });
    if (!c) return false;
    return /비대면/.test(c.name || '') || /^(비대면|온라인)(\s|$)/.test((c.room || '').trim());
  }

  function isUniversityClassBlock(dd, b) {
    if (!b || !b.start || !b.end) return false;
    if (b.source === 'commute') return false;
    if (b.source === 'course' || b.courseId) {
      return !isOnlineCourse(dd, b.courseId);
    }
    if (blockKind(dd, b) === 'acad') {
      return !/비대면|온라인|동영상|과제|레포트|리포트/.test(b.title || '');
    }
    return false;
  }

  function minToDayIso(date, totalMin) {
    const clamped = Math.max(0, Math.min(24 * 60, Math.round(totalMin)));
    if (clamped >= 24 * 60) {
      return dayKey(addDays(parseKey(date), 1)) + 'T00:00:00';
    }
    const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
    const mm = String(clamped % 60).padStart(2, '0');
    return date + 'T' + hh + ':' + mm + ':00';
  }

  // 해당 날짜에 대학 수업이 있으면 첫 수업 앞 1시간·마지막 수업 뒤 1시간 이동시간 블록을 자동 맞춤
  function reconcileDayCommuteBlocks(dd, date) {
    if (!dd || !Array.isArray(dd.blocks) || !date) return false;
    if (!dd.dismissedAutoBlocks || typeof dd.dismissedAutoBlocks !== 'object') dd.dismissedAutoBlocks = {};
    let changed = false;

    const dayStart = parseLocalDateTime(date + 'T00:00:00');
    if (!dayStart || isNaN(dayStart.getTime())) return false;

    const classBlocks = dd.blocks.filter(function (b) { return b && b.date === date && isUniversityClassBlock(dd, b); });

    if (classBlocks.length === 0) {
      const beforeLen = dd.blocks.length;
      dd.blocks = dd.blocks.filter(function (b) {
        if (b && b.date === date && b.source === 'commute' && !b.userEdited && !b.locked) return false;
        return true;
      });
      return dd.blocks.length !== beforeLen;
    }

    let firstStartMin = Infinity;
    let lastEndMin = -Infinity;
    classBlocks.forEach(function (b) {
      const bs = parseLocalDateTime(b.start);
      const be = parseLocalDateTime(b.end);
      if (!bs || !be || isNaN(bs.getTime()) || isNaN(be.getTime())) return;
      const sMin = Math.round((bs - dayStart) / 60000);
      const eMin = Math.round((be - dayStart) / 60000);
      if (sMin < firstStartMin) firstStartMin = sMin;
      if (eMin > lastEndMin) lastEndMin = eMin;
    });

    if (!isFinite(firstStartMin) || !isFinite(lastEndMin)) return false;

    const specs = [
      {
        pos: 'before',
        autoKey: 'commute:before:' + date,
        startMin: Math.max(0, firstStartMin - 60),
        endMin: Math.max(0, firstStartMin),
      },
      {
        pos: 'after',
        autoKey: 'commute:after:' + date,
        startMin: Math.min(24 * 60, lastEndMin),
        endMin: Math.min(24 * 60, lastEndMin + 60),
      },
    ];

    specs.forEach(function (sp) {
      if (sp.endMin <= sp.startMin) return;
      if (dd.dismissedAutoBlocks[sp.autoKey]) return;

      const targetStart = minToDayIso(date, sp.startMin);
      const targetEnd = minToDayIso(date, sp.endMin);

      const existing = dd.blocks.find(function (b) {
        return b && b.date === date && (b.autoKey === sp.autoKey || (b.source === 'commute' && b.commutePos === sp.pos));
      });

      if (!existing) {
        const manualSame = dd.blocks.find(function (b) {
          return b && b.date === date && b.start === targetStart && b.end === targetEnd &&
            (blockKind(dd, b) === 'other' || /이동/.test(b.title || ''));
        });
        if (manualSame) {
          manualSame.source = 'commute';
          manualSame.commutePos = sp.pos;
          manualSame.autoKey = sp.autoKey;
          manualSame.userEdited = true;
          changed = true;
          return;
        }
      }

      if (existing) {
        if (!existing.userEdited && !existing.locked) {
          if (existing.start !== targetStart || existing.end !== targetEnd || !existing.title) {
            existing.start = targetStart;
            existing.end = targetEnd;
            if (!existing.title) existing.title = '이동시간';
            changed = true;
          }
        }
      } else {
        dd.blocks.push({
          id: genId('blk'),
          title: '이동시간',
          kind: 'other',
          subjectId: '',
          taskId: '',
          date: date,
          start: targetStart,
          end: targetEnd,
          locked: false,
          source: 'commute',
          commutePos: sp.pos,
          autoKey: sp.autoKey,
        });
        changed = true;
      }
    });

    return changed;
  }

  // 해당 주간의 반복 수업(acad)과 수업 있는 날의 전후 1시간 이동시간(other)을 자동 동기화
  function syncWeekClassesAndCommute(dd, weekDates) {
    if (!dd || !Array.isArray(dd.blocks) || !Array.isArray(weekDates)) return false;
    if (!dd.dismissedAutoBlocks || typeof dd.dismissedAutoBlocks !== 'object') dd.dismissedAutoBlocks = {};
    if (!Array.isArray(dd.syncedCourseWeeks)) dd.syncedCourseWeeks = [];
    let changed = false;

    const mondayKey = weekDates[0];
    if (mondayKey && dd.syncedCourseWeeks.indexOf(mondayKey) < 0) {
      dd.syncedCourseWeeks.push(mondayKey);
      changed = true;
    }

    (dd.courses || []).forEach(function (c) {
      (c.schedule || []).forEach(function (s) {
        if (s.day == null || !s.start || !s.end) return;
        const date = weekDates[s.day];
        if (!date) return;
        const autoKey = 'course:' + c.id + ':' + date + ':' + s.start + '-' + s.end;
        if (dd.dismissedAutoBlocks[autoKey]) return;

        const existing = dd.blocks.find(function (b) {
          if (!b || b.date !== date) return false;
          if (b.autoKey === autoKey) return true;
          return b.start && b.end &&
            b.start.slice(11, 16) === s.start &&
            b.end.slice(11, 16) === s.end &&
            (b.courseId === c.id || b.source === 'course' || blockKind(dd, b) === 'acad');
        });

        if (existing) {
          if (!existing.autoKey) {
            existing.autoKey = autoKey;
            existing.source = existing.source || 'course';
            existing.courseId = existing.courseId || c.id;
            changed = true;
          }
        } else {
          dd.blocks.push({
            id: genId('blk'),
            title: c.name || '수업',
            kind: 'acad',
            subjectId: '',
            taskId: '',
            courseId: c.id,
            date: date,
            start: date + 'T' + s.start + ':00',
            end: date + 'T' + s.end + ':00',
            locked: false,
            source: 'course',
            autoKey: autoKey,
          });
          changed = true;
        }
      });
    });

    weekDates.forEach(function (k) {
      if (reconcileDayCommuteBlocks(dd, k)) changed = true;
    });

    return changed;
  }

  function ensureWeekScheduleSynced(weekDates) {
    let didChange = false;
    Store.update(function (dd) {
      didChange = syncWeekClassesAndCommute(dd, weekDates);
    });
    return didChange;
  }

  function dismissedAutoKeysInWeek(d, weekDates) {
    const dis = (d && d.dismissedAutoBlocks) || {};
    const keys = [];
    Object.keys(dis).forEach(function (k) {
      if (!dis[k]) return;
      if (weekDates.some(function (dt) { return k.indexOf(dt) >= 0; })) keys.push(k);
    });
    return keys;
  }

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
    const dis = (d && d.dismissedAutoBlocks) || {};
    const existing = d.blocks.filter(function (b) { return weekDates.indexOf(b.date) >= 0; });
    return recurringClassBlocks(d, weekDates).filter(function (rc) {
      const autoKey = 'course:' + rc.courseId + ':' + rc.date + ':' + rc.start.slice(11, 16) + '-' + rc.end.slice(11, 16);
      if (dis[autoKey]) return false;
      return !existing.some(function (b) {
        return b.date === rc.date && b.start.slice(11, 16) === rc.start.slice(11, 16) && b.end.slice(11, 16) === rc.end.slice(11, 16)
          && (b.courseId === rc.courseId || blockKind(d, b) === 'acad');
      });
    });
  }
  // 하루 활동 가능 구간 안에서, 기존 블록(수업·이동시간·수험)을 피한 빈 구간을 찾아 수험용으로 제안.
  function findFreeSlots(d, weekDates, bounds) {
    ensureWeekScheduleSynced(weekDates);
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
      // 해당 날짜의 모든 블록(수업·전후 이동시간·수험·기타)을 장애물로 간주
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

  // 수동 삭제했던 수업·이동시간 블록을 해당 주간에 다시 채우기
  function restoreWeekScheduleBlocks(weekDates, ctx) {
    Store.update(function (dd) {
      if (dd.dismissedAutoBlocks) {
        Object.keys(dd.dismissedAutoBlocks).forEach(function (k) {
          if (weekDates.some(function (dt) { return k.indexOf(dt) >= 0; })) {
            delete dd.dismissedAutoBlocks[k];
          }
        });
      }
      syncWeekClassesAndCommute(dd, weekDates);
    });
    ctx.refresh();
    ctx.toast('반복 수업과 전후 1시간 이동시간을 다시 채웠어요.');
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
  let mobileDayIdx = -1; // -1이면 오늘 요일 자동 선택, 7이면 주간 전체
  function renderWeek(root, ctx) {
    const monday = getMonday(weekOffset);
    const weekDates = []; for (let i = 0; i < 7; i++) weekDates.push(dayKey(addDays(monday, i)));
    ensureWeekScheduleSynced(weekDates);
    const d = Store.data();

    const goalMin = (d.settings.weeklyExamGoalH || 30) * 60;
    const examBlocks = d.blocks.filter(function (b) { return weekDates.indexOf(b.date) >= 0 && blockKind(d, b) === 'exam'; });
    const securedMin = sumNonOverlap(examBlocks);
    const shortMin = Math.max(0, goalMin - securedMin);

    root.append(el('header', { class: 'page-hero' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'WEEKLY STUDY PLAN'),
        el('h1', { class: 'page-title' }, '주간 계획'),
        el('p', { class: 'page-subtitle' }, '수험 블록을 먼저 배치해 보호하고 고정 수업과의 충돌을 조정합니다.'),
      ]),
      el('div', { class: 'row no-print', style: 'gap:8px' }, [
        el('button', { class: 'btn btn-sm', onclick: function () { window.print(); } }, '🖨 주간 인쇄'),
        el('button', { class: 'btn btn-sm btn-primary', onclick: function () { openBlockEditor(null, ctx, weekDates); } }, '+ 계획 블록 추가'),
      ]),
    ]));

    const head = el('div', { class: 'card', style: 'margin-bottom:16px' });
    head.append(el('div', { class: 'row between' }, [
      el('div', { class: 'row' }, [
        el('button', { class: 'btn btn-sm', onclick: function () { weekOffset--; ctx.refresh(); } }, '‹ 지난 주'),
        el('strong', {}, fmtDateShort(monday) + ' ~ ' + fmtDateShort(addDays(monday, 6)) + (weekOffset === 0 ? ' (이번 주)' : '')),
        el('button', { class: 'btn btn-sm', onclick: function () { weekOffset++; ctx.refresh(); } }, '다음 주 ›'),
        weekOffset !== 0 ? el('button', { class: 'btn btn-sm btn-ghost', onclick: function () { weekOffset = 0; ctx.refresh(); } }, '이번 주로') : null,
      ]),
      el('span', { class: 'hint desktop-only' }, '빈 시간 칸 클릭으로 바로 추가'),
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

    // 묶음 D: 반복 수업 + 전후 1시간 이동시간 자동 반영
    const dismissedKeys = dismissedAutoKeysInWeek(d, weekDates);
    const classCard = el('div', { class: 'card' });
    const classHead = el('div', { class: 'row between' }, [el('h3', { style: 'margin:0' }, '반복 수업 · 이동시간')]);
    classCard.append(classHead);
    if ((d.courses || []).some(function (c) { return (c.schedule || []).length; })) {
      classCard.append(
        el('p', { class: 'hint', style: 'margin:6px 0 0' }, '대학 수업이 있는 날은 첫 수업 앞 1시간과 마지막 수업 뒤 1시간이 이동시간으로 자동 추가됩니다.')
      );
      if (dismissedKeys.length) {
        classCard.append(
          el('button', {
            class: 'btn btn-sm btn-block',
            style: 'margin-top:8px',
            onclick: function () { restoreWeekScheduleBlocks(weekDates, ctx); },
          }, '삭제한 수업·이동 ' + dismissedKeys.length + '개 다시 채우기')
        );
      }
    } else {
      classCard.append(el('p', { class: 'hint', style: 'margin:6px 0' }, '대학 학업에서 과목의 반복 수업 시간을 등록하면 수업과 전후 1시간 이동시간을 자동으로 넣어드려요.'),
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

    const cls = 'tt-block ' + kind + (b.source === 'commute' ? ' commute' : '') + (heightPx < 36 ? ' compact' : '') + (heightPx >= 60 ? ' tall' : '');
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
    const tk = todayKey();
    const todayInWeek = weekDates.indexOf(tk);
    const activeIdx = mobileDayIdx === -1 ? (todayInWeek >= 0 ? todayInWeek : 0) : mobileDayIdx;

    // 모바일 요일 선택 탭 (제안서 12쪽: 7열 시간표 대신 요일 선택 탭 + 일간 목록)
    const tabRow = el('div', { class: 'pill-row', role: 'tablist', 'aria-label': '요일 선택' });
    weekDates.forEach(function (k, i) {
      const hasBlocks = d.blocks.some(function (b) { return b.date === k; });
      const btn = el('button', {
        type: 'button',
        class: 'pill',
        role: 'tab',
        'aria-pressed': String(activeIdx === i),
        onclick: function () { mobileDayIdx = i; ctx.refresh(); },
      }, WEEKDAYS[i] + (k === tk ? '·오늘' : (hasBlocks ? '•' : '')));
      tabRow.append(btn);
    });
    tabRow.append(el('button', {
      type: 'button',
      class: 'pill',
      role: 'tab',
      'aria-pressed': String(activeIdx === 7),
      onclick: function () { mobileDayIdx = 7; ctx.refresh(); },
    }, '전체'));
    wrap.append(tabRow);

    const indices = activeIdx === 7 ? [0, 1, 2, 3, 4, 5, 6] : [activeIdx];
    indices.forEach(function (i) {
      const k = weekDates[i];
      if (!k) return;
      const blocks = d.blocks.filter(function (b) { return b.date === k; }).sort(function (a, b) { return a.start.localeCompare(b.start); });
      const card = el('div', { class: 'card' });
      card.append(el('div', { class: 'section-head' }, [
        el('h3', { style: k === tk ? 'color:var(--accent)' : '' }, WEEKDAYS[i] + '요일 · ' + k.slice(5)),
        el('button', { class: 'btn btn-sm', onclick: function () { openBlockEditor(null, ctx, weekDates, { date: k, hour: 9 }); } }, '+ 블록 추가'),
      ]));
      if (blocks.length === 0) {
        card.append(el('p', { class: 'hint' }, '배치된 계획 블록이 없습니다.'));
      } else {
        blocks.forEach(function (b) {
          const kind = blockKind(d, b);
          const tagLabel = kind === 'exam' ? '수험' : kind === 'acad' ? '학업' : (b.source === 'commute' ? '이동' : '기타');
          card.append(el('div', { class: 'item', style: 'cursor:pointer', onclick: function () { openBlockEditor(null, ctx, null, { editBlock: b }); } }, [
            el('span', { class: 'tag tag-' + (kind === 'exam' ? 'exam' : kind === 'acad' ? 'acad' : 'muted') }, tagLabel),
            el('div', { class: 'main' }, [
              el('div', { class: 'title' }, (b.locked ? '🔒 ' : '') + b.title),
              el('div', { class: 'meta' }, fmtTime(b.start) + '–' + fmtTime(b.end) + ' (' + fmtMin(minutesBetween(b.start, b.end)) + ')'),
            ]),
          ]));
        });
      }
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
      edit ? el('button', { class: 'btn btn-danger', onclick: function () {
        Store.update(function (dd) {
          if (!dd.dismissedAutoBlocks || typeof dd.dismissedAutoBlocks !== 'object') dd.dismissedAutoBlocks = {};
          if (edit.autoKey) dd.dismissedAutoBlocks[edit.autoKey] = true;
          dd.blocks = dd.blocks.filter(function (x) { return x.id !== edit.id; });
          if (edit.date) reconcileDayCommuteBlocks(dd, edit.date);
        });
        m.close(); ctx.refresh(); ctx.toast('블록을 삭제했습니다.');
      } }, '삭제') : null,
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
        const prevDate = edit ? edit.date : null;
        if (edit) {
          const target = dd.blocks.find(function (x) { return x.id === edit.id; });
          if (target) {
            if (target.source === 'commute' && kindSel.value !== 'other') {
              if (!dd.dismissedAutoBlocks) dd.dismissedAutoBlocks = {};
              if (target.autoKey) dd.dismissedAutoBlocks[target.autoKey] = true;
              delete target.source;
              delete target.commutePos;
              delete target.autoKey;
            }
            Object.assign(target, { title: title, kind: kindSel.value, subjectId: subjSel.value, taskId: taskSel.value, date: t.date, start: t.startIso, end: t.endIso, locked: lockInput.checked, userEdited: true });
          }
        } else {
          dd.blocks.push({ id: Store.id('blk'), title: title, kind: kindSel.value, subjectId: subjSel.value, taskId: taskSel.value, date: t.date, start: t.startIso, end: t.endIso, locked: lockInput.checked });
        }
        reconcileDayCommuteBlocks(dd, t.date);
        if (prevDate && prevDate !== t.date) reconcileDayCommuteBlocks(dd, prevDate);
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
  function blockKind(d, b) { if (b.kind) return b.kind; const s = (d.subjects || []).find(function (x) { return x.id === b.subjectId; }); return s && s.kind === 'exam' ? 'exam' : 'other'; }
  function summaryStat(label, val, color) { return el('div', {}, [el('div', { class: 'hint' }, label), el('div', { style: 'font-size:1.4rem;font-weight:800;' + (color ? 'color:' + color : '') }, val)]); }
  function legendRow(kind, label) {
    const sw = el('span', { style: 'display:inline-block;width:16px;height:16px;border-radius:4px;margin-right:8px;vertical-align:middle;' });
    if (kind === 'exam') sw.style.background = 'var(--exam-bg)';
    else if (kind === 'acad') sw.style.background = 'var(--acad-bg)';
    else { sw.style.background = 'var(--surface-soft)'; sw.style.border = '1px dashed var(--border-strong)'; }
    return el('div', { style: 'font-size:.9rem' }, [sw, label]);
  }

  /* =======================================================================
     8. 답안 연습 — 실전 모드 / 채점 모드 분리 & 재작성 비교 (제안서 10·11쪽)
     ======================================================================= */
  const ERROR_TYPES = ['쟁점 누락', '법리', '포섭', '목차', '시간 배분', '기타'];
  const RATERS = [['self', '본인 평가'], ['teacher', '강사 첨삭'], ['ai', 'AI 제안']];

  function renderAnswers(root, ctx) {
    const d = Store.data();
    root.append(el('header', { class: 'page-hero' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'ANSWER PRACTICE & GS'),
        el('h1', { class: 'page-title' }, '답안 연습'),
        el('p', { class: 'page-subtitle' }, '실전 작성(단서·AI 숨김)과 채점·피드백을 분리하고, 감점 원인을 재작성과 보완 과업으로 연결합니다.'),
      ]),
      el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' }, [
        el('button', { class: 'btn', onclick: function () { openExamSimMode(ctx); } }, '⏱ 실전 답안 작성'),
        el('button', { class: 'btn btn-primary', onclick: function () { openAnswerEditor(null, ctx); } }, '+ 채점·연습 등록'),
      ]),
    ]));

    if (d.answers.length === 0) {
      root.append(el('div', { class: 'empty' }, [
        el('span', { class: 'emoji' }, '✍️'),
        el('h3', {}, '아직 답안 연습 기록이 없습니다'),
        el('p', {}, '시간 제한을 두고 실전 모드로 목차·답안을 작성하거나, 이미 작성한 GS 회차 채점 결과를 등록해 보세요.'),
        el('div', { class: 'row', style: 'justify-content:center;gap:8px;margin-top:12px' }, [
          el('button', { class: 'btn', onclick: function () { openExamSimMode(ctx); } }, '⏱ 실전 답안 작성 시작'),
          el('button', { class: 'btn btn-primary', onclick: function () { openAnswerEditor(null, ctx); } }, '+ 첫 채점 기록 등록'),
        ]),
      ]));
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
      const titleRow = el('div', { class: 'title' }, [
        sub ? el('span', { class: 'tag tag-exam' }, sub.name) : '',
        ' ' + (a.source || '답안 연습') + (a.round ? ' ' + a.round + '회' : ''),
      ]);
      if (a.issue) titleRow.append(el('span', { class: 'tag tag-muted', style: 'margin-left:6px' }, '쟁점: ' + a.issue));
      if (a.rater === 'ai') titleRow.append(el('span', { class: 'tag tag-warn', style: 'margin-left:6px' }, 'AI 미확정'));
      if (unscored) titleRow.append(el('span', { class: 'tag tag-warn', style: 'margin-left:6px' }, '미채점 · 재작성 대기'));

      let compare = '';
      let origAns = null;
      if (a.rewriteOf) {
        origAns = d.answers.find(function (x) { return x.id === a.rewriteOf; });
        if (origAns && !unscored) {
          const diff = sum - scoreOf(origAns);
          compare = ' · 재작성 ' + (diff > 0 ? '▲+' + diff : diff < 0 ? '▼' + diff : '±0') + '점';
        } else { compare = ' · 재작성'; }
      }
      const metaParts = [
        a.date ? fmtDate(a.date) + ' · ' : '',
        (max > 0 && !unscored) ? sum + '/' + max + '점 · ' : (unscored ? '채점 전 · ' : ''),
        el('span', { class: 'tag tag-muted' }, raterLabel),
        (a.errors && a.errors.length) ? ' · 감점: ' + a.errors.join(', ') : '',
        a.rewriteDue ? ' · 재작성 예정 ' + a.rewriteDue.slice(5) : '',
        compare,
      ];
      const rowActions = el('div', { class: 'row', style: 'gap:6px' });
      if (origAns) {
        rowActions.append(el('button', {
          type: 'button',
          class: 'btn btn-sm',
          onclick: function (e) { e.stopPropagation(); openRewriteCompareModal(origAns, a, ctx); },
        }, '이전 답안 비교'));
      }
      list.append(el('div', { class: 'item', style: 'cursor:pointer', onclick: function () { openAnswerEditor(a, ctx); } }, [
        el('div', { class: 'main' }, [titleRow, el('div', { class: 'meta' }, metaParts)]),
        rowActions,
      ]));
    });
    root.append(list);
  }

  // 실전 답안 작성 모드: 타이머 + 문제·목차 작성 (우측 AI 및 노트 단서 숨김 — 제안서 10·11쪽)
  function openExamSimMode(ctx) {
    const d = Store.data();
    document.body.classList.add('exam-sim-active');
    let simTick = null;
    let remainSec = 60 * 60;
    let started = false;

    const subjSel = el('select', {});
    d.subjects.forEach(function (s) { subjSel.append(el('option', { value: s.id }, s.name)); });
    const sourceInput = el('input', { type: 'text', placeholder: '출처·회차 (예: GS 3순환 2회)' });
    const issueInput = el('input', { type: 'text', placeholder: '문항 주제 (선택)' });
    const minSel = el('select', {});
    [[30, '30분 (단문·약술)'], [60, '60분 (1문항 집중)'], [120, '120분 (실전 전범위)']].forEach(function (p) {
      minSel.append(el('option', { value: String(p[0]), selected: p[0] === 60 }, p[1]));
    });
    minSel.onchange = function () {
      if (!started) {
        remainSec = Number(minSel.value) * 60;
        updateClock();
      }
    };

    const clockEl = el('div', { style: 'font-family:var(--font-serif);font-size:2.3rem;font-weight:700;font-variant-numeric:tabular-nums;color:var(--accent)' }, '60:00');
    const toggleTimerBtn = el('button', { type: 'button', class: 'btn btn-primary btn-sm' }, '▶ 타이머 시작');
    function updateClock() {
      const m = String(Math.floor(Math.max(0, remainSec) / 60)).padStart(2, '0');
      const s = String(Math.max(0, remainSec) % 60).padStart(2, '0');
      clockEl.textContent = (remainSec < 0 ? '+' : '') + m + ':' + s;
    }
    toggleTimerBtn.onclick = function () {
      if (simTick) {
        clearInterval(simTick); simTick = null;
        toggleTimerBtn.textContent = '▶ 계속';
      } else {
        started = true;
        toggleTimerBtn.textContent = '일시정지';
        simTick = setInterval(function () { remainSec--; updateClock(); }, 1000);
      }
    };

    const outlineArea = el('textarea', {
      style: 'min-height:220px;font-size:1rem;line-height:1.8',
      placeholder: '실전 목차 및 핵심 논거를 작성하세요.\n(실전 모드 중에는 AI 도우미와 노트 힌트가 숨겨집니다.)',
    });

    const body = el('div', { class: 'stack' }, [
      el('div', { class: 'card', style: 'background:var(--exam-bg);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap' }, [
        el('div', {}, [
          el('div', { style: 'font-size:.76rem;font-weight:700;color:var(--exam-fg)' }, '실전 답안 작성 모드 · AI/노트 단서 차단됨'),
          clockEl,
        ]),
        el('div', { class: 'row', style: 'gap:8px' }, [minSel, toggleTimerBtn]),
      ]),
      el('div', { class: 'field-row' }, [
        el('div', { class: 'field', style: 'margin:0' }, [el('label', {}, '과목'), subjSel]),
        el('div', { class: 'field', style: 'margin:0' }, [el('label', {}, '출처·회차'), sourceInput]),
      ]),
      el('div', { class: 'field', style: 'margin:0' }, [el('label', {}, '대상 쟁점'), issueInput]),
      el('div', { class: 'field', style: 'margin:0' }, [el('label', {}, '실전 목차 · 답안 초안'), outlineArea]),
    ]);

    function cleanupSim() {
      if (simTick) { clearInterval(simTick); simTick = null; }
      document.body.classList.remove('exam-sim-active');
    }

    const m = ctx.modal({
      title: '실전 답안 작성 모드',
      body: body,
      onClose: cleanupSim,
      footer: [
        el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'),
        el('button', {
          class: 'btn btn-primary',
          onclick: function () {
            const draft = {
              id: null,
              subjectId: subjSel.value,
              source: sourceInput.value.trim() || '실전 타이머 연습',
              round: '',
              timeLimit: Number(minSel.value) || 60,
              date: new Date().toISOString().slice(0, 10),
              rater: 'self',
              items: [{ label: '1문', score: 0, max: 50 }],
              errors: [],
              issue: issueInput.value.trim(),
              draftOutline: outlineArea.value,
              note: '',
              rewriteOf: null,
            };
            m.close();
            openAnswerEditor(draft, ctx);
          },
        }, '작성 종료 → 채점 모드로 전환'),
      ],
    });
  }

  // 재작성 답안 비교 모달 (제안서 10쪽: 이전 답안 vs 재작성 답안 비교)
  function openRewriteCompareModal(orig, curr, ctx) {
    function scoreSum(x) { return (x.items || []).reduce(function (s, it) { return s + (Number(it.score) || 0); }, 0); }
    function maxSum(x) { return (x.items || []).reduce(function (s, it) { return s + (Number(it.max) || 0); }, 0); }
    const oScore = scoreSum(orig), oMax = maxSum(orig);
    const cScore = scoreSum(curr), cMax = maxSum(curr);
    const diff = cScore - oScore;

    const col = function (tag, item, scoreTxt) {
      return el('div', { class: 'card', style: 'margin:0' }, [
        el('div', { class: 'tag tag-muted', style: 'margin-bottom:8px' }, tag + ' · ' + (item.date || '')),
        el('div', { style: 'font-family:var(--font-serif);font-size:1.35rem;font-weight:700;margin-bottom:8px' }, scoreTxt),
        el('div', { class: 'hint', style: 'margin-bottom:8px' }, '감점 분류: ' + ((item.errors && item.errors.length) ? item.errors.join(', ') : '없음')),
        item.draftOutline ? el('div', { style: 'background:var(--surface-soft);padding:10px;border-radius:8px;font-size:.86rem;white-space:pre-wrap;margin-bottom:8px' }, item.draftOutline) : '',
        el('div', { style: 'font-size:.9rem;white-space:pre-wrap' }, item.note || '(평가 메모 없음)'),
      ]);
    };

    const body = el('div', { class: 'stack' }, [
      curr.scored !== false
        ? el('div', { class: 'tag tag-exam', style: 'align-self:flex-start' }, '점수 변화: ' + (diff > 0 ? '+' + diff : String(diff)) + '점')
        : el('div', { class: 'tag tag-warn', style: 'align-self:flex-start' }, '재작성 답안 채점 전'),
      el('div', { class: 'grid grid-2' }, [
        col('이전 답안', orig, oScore + ' / ' + oMax + '점'),
        col('재작성 답안', curr, curr.scored === false ? '미채점' : (cScore + ' / ' + cMax + '점')),
      ]),
    ]);
    const m = ctx.modal({
      title: '이전 답안 vs 재작성 비교',
      body: body,
      footer: [
        el('button', { class: 'btn', onclick: function () { m.close(); openAnswerEditor(curr, ctx); } }, '재작성 답안 채점·편집'),
        el('button', { class: 'btn btn-primary', onclick: function () { m.close(); } }, '닫기'),
      ],
    });
  }

  function openAnswerEditor(ans, ctx) {
    const d = Store.data();
    const isNew = !(ans && ans.id);
    const a = ans ? JSON.parse(JSON.stringify(ans)) : { id: null, subjectId: d.subjects[0] && d.subjects[0].id, source: '', round: '', timeLimit: 120, date: new Date().toISOString().slice(0, 10), rater: 'self', items: [{ label: '1문', score: 0, max: 50 }], errors: [], note: '', draftOutline: '', rewriteDue: '', rewriteOf: null };

    const subjSel = el('select', {}); d.subjects.forEach(function (s) { subjSel.append(el('option', { value: s.id, selected: s.id === a.subjectId }, s.name)); });
    const sourceInput = el('input', { type: 'text', value: a.source, placeholder: '예: ○○학원 GS 2순환' });
    const roundInput = el('input', { type: 'number', value: a.round || '', placeholder: '회차', min: '1' });
    const dateInput = el('input', { type: 'date', value: a.date });
    const rewriteDueInput = el('input', { type: 'date', value: a.rewriteDue || '' });
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
        score.oninput = function () { it.score = clampNum(score.value, 0, Number(max.value) || 100); a.scored = true; updateTotal(); };
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
    const outlineInput = el('textarea', { rows: '3', placeholder: '작성했던 목차·논거 초안 (선택)' }, a.draftOutline || '');
    const noteInput = el('textarea', { placeholder: '채점 코멘트 · 감점 위치 · 다음 보완 포인트' }, a.note || '');

    const issueInput = el('input', { type: 'text', value: a.issue || '', placeholder: '예: 진보성 판단 / 상표 유사판단' });
    const linkRow = el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;margin-top:8px' });
    function rebuildLinkRow() {
      linkRow.innerHTML = '';
      const issue = issueInput.value.trim();
      const subjectId = subjSel.value;
      const subObj = Store.subject(subjectId);
      if (issue) {
        const relNote = Store.data().notes.find(function (n) { return n.subjectId === subjectId && n.issue && n.issue.trim() === issue; });
        linkRow.append(el('button', { class: 'btn btn-sm', type: 'button', onclick: function () {
          persist();
          if (relNote) { m.close(); openNoteById(relNote.id, ctx); }
          else {
            const nn = { id: Store.id('note'), title: issue, subjectId: subjectId, unit: '', issue: issue, importance: 2, status: 'todo', appliedDate: '', body: '', checkQuestion: '', answerFlow: '', source: { ref: '', caseId: '', page: '', url: '', checkedDate: '', excerpt: '' }, linkedAnswers: [a.id], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), versions: [] };
            Store.update(function (dd) { dd.notes.push(nn); dd.lastOpenNote = nn.id; });
            m.close(); openNoteById(nn.id, ctx); ctx.toast('이 쟁점의 서재 노트를 만들었습니다.');
          }
        } }, relNote ? '관련 서재 노트 열기 ▸' : '이 쟁점 노트 만들기 ▸'));

        linkRow.append(el('button', { class: 'btn btn-sm', type: 'button', onclick: function () {
          persist();
          Store.update(function (dd) {
            dd.tasks.push({ id: Store.id('task'), title: '[감점 보완] ' + issue + (a.errors && a.errors.length ? ' (' + a.errors.join('/') + ')' : ''), subjectId: subjectId, area: '취약 쟁점', importance: 3, due: rewriteDueInput.value || '', estMin: 60, status: 'todo', issue: issue, fromAnswer: a.id, createdAt: new Date().toISOString() });
          });
          ctx.toast('감점 보완 과업을 생성했습니다.');
          rebuildLinkRow();
        } }, '+ 감점에서 보완 과업 생성'));

        linkRow.append(el('button', { class: 'btn btn-sm', type: 'button', onclick: function () {
          persist();
          Store.update(function (dd) {
            dd.cards.push({ id: Store.id('card'), q: issue + ' — 답안 현출 핵심 요건과 판시는?', a: '', subjectId: subjectId, noteId: (relNote ? relNote.id : null), issue: issue, status: 'draft', nextReview: todayKey(), interval: 1, reps: 0, verified: false, createdAt: new Date().toISOString() });
          });
          ctx.toast('복습 카드 초안을 만들었습니다.');
        } }, '+ 복습 카드 초안'));
      } else {
        linkRow.append(el('span', { class: 'hint' }, '쟁점을 입력하면 서재 노트·보완 과업·복습 카드 원클릭 연결이 활성화됩니다.'));
      }

      // 채점 모드 전용 문맥형 AI 점검 버튼 (제안서 11쪽)
      linkRow.append(el('button', {
        class: 'btn btn-sm btn-ghost',
        type: 'button',
        onclick: function () {
          persist();
          const ctxLabel = (subObj ? subObj.name + ' · ' : '') + (issueInput.value.trim() || sourceInput.value.trim() || '답안 채점');
          const ctxBody = [
            '과목: ' + (subObj ? subObj.name : ''),
            '쟁점: ' + (issueInput.value.trim() || '미지정'),
            '오류 분류: ' + ((a.errors && a.errors.length) ? a.errors.join(', ') : '없음'),
            outlineInput.value.trim() ? ('작성 목차:\n' + outlineInput.value.trim()) : '',
            noteInput.value.trim() ? ('채점 메모:\n' + noteInput.value.trim()) : '',
          ].filter(Boolean).join('\n');
          m.close();
          openContextualAi({
            label: ctxLabel,
            contextText: ctxBody,
            promptDraft: '위 답안 목차와 감점 메모를 바탕으로 누락된 세부 논점이나 판례 포섭 보완점을 짚어줘.',
          });
        },
      }, '✨ 누락된 논점 AI 점검'));
    }
    issueInput.oninput = rebuildLinkRow;
    subjSel.addEventListener('change', rebuildLinkRow);
    rebuildLinkRow();

    const origForCompare = a.rewriteOf ? d.answers.find(function (x) { return x.id === a.rewriteOf; }) : null;

    const body = el('div', {}, [
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '과목'), subjSel]), el('div', { class: 'field' }, [el('label', {}, '작성일'), dateInput])]),
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '출처'), sourceInput]), el('div', { class: 'field' }, [el('label', {}, '회차'), roundInput])]),
      el('div', { class: 'field-row' }, [
        el('div', { class: 'field' }, [el('label', {}, '평가자'), raterSel]),
        el('div', { class: 'field' }, [el('label', {}, '재작성 예정일 (선택)'), rewriteDueInput]),
      ]),
      el('div', { class: 'field' }, [el('label', {}, '문항별 배점 / 득점'), itemsWrap, totalEl, el('button', { class: 'btn btn-sm', style: 'margin-top:8px', type: 'button', onclick: function () { a.items.push({ label: (a.items.length + 1) + '문', score: 0, max: 0 }); renderItems(); } }, '+ 문항 추가')]),
      el('div', { class: 'field' }, [el('label', {}, '감점 원인 태그'), errWrap]),
      el('div', { class: 'field' }, [el('label', {}, '대상 쟁점 및 학습 연결'), issueInput, linkRow]),
      el('div', { class: 'field' }, [el('label', {}, '작성 목차 · 답안 요지'), outlineInput]),
      el('div', { class: 'field' }, [el('label', {}, '채점 코멘트 · 보완 메모'), noteInput]),
    ]);
    const footer = [
      !isNew ? el('button', { class: 'btn', onclick: function () { markRewrite(a, ctx, m); } }, '재작성 예약 생성') : null,
      origForCompare ? el('button', { class: 'btn', onclick: function () { m.close(); openRewriteCompareModal(origForCompare, a, ctx); } }, '이전 답안 비교') : null,
      !isNew ? el('button', { class: 'btn btn-danger', onclick: function () { Store.update(function (dd) { dd.answers = dd.answers.filter(function (x) { return x.id !== a.id; }); }); m.close(); ctx.refresh(); ctx.toast('삭제했습니다.'); } }, '삭제') : null,
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'),
      el('button', { class: 'btn btn-primary', onclick: save }, '저장'),
    ];
    const m = ctx.modal({ title: isNew ? '채점·연습 기록 등록' : '답안 채점 및 피드백', body: body, footer: footer });

    function persist() {
      a.subjectId = subjSel.value; a.source = sourceInput.value.trim(); a.round = roundInput.value;
      a.date = dateInput.value; a.rewriteDue = rewriteDueInput.value || ''; a.rater = raterSel.value;
      a.draftOutline = outlineInput.value; a.note = noteInput.value; a.issue = issueInput.value.trim();
      if (a.scored === undefined) a.scored = true;
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
     9. 단권화 서재 — 3영역 워크스페이스 & 원문 나란히 읽기 (제안서 7·10·12쪽)
     ======================================================================= */
  const NOTE_STATUSES = [['todo', '수집'], ['doing', '정리 중'], ['done', '검토 완료'], ['recheck', '재확인 필요']];
  let noteFilter = { subjectId: '', status: '', q: '' };
  let noteSelectedId = null;
  let pendingReviewReturn = null; // { queueIds:[...], idx:number }
  let noteEditMode = false;
  let noteSplitSource = false;    // 원문 나란히 읽기 2분할 토글
  let noteRailCollapsed = false;  // 우측 연결 레일 접기 토글
  let collapsedTreeSubj = {};

  function openNoteById(noteId, ctx) {
    if (noteId && Store.note(noteId)) {
      noteSelectedId = noteId;
      Store.update(function (dd) {
        dd.lastOpenNote = noteId;
        dd.lastStudyResume = { type: 'note', id: noteId, at: new Date().toISOString() };
      });
    }
    ctx.navigate('notes');
  }

  function renderNotes(root, ctx) {
    const d = Store.data();
    noteSelectedId = noteSelectedId || d.lastOpenNote || (d.notes[0] && d.notes[0].id) || null;

    if (pendingReviewReturn) {
      const ret = pendingReviewReturn;
      root.append(el('div', { class: 'card', style: 'background:var(--exam-bg);display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px' }, [
        el('span', { style: 'color:var(--exam-fg);font-weight:700' }, '복습 세션 중 원문 노트를 확인하고 있습니다'),
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn btn-sm', onclick: function () { pendingReviewReturn = null; ctx.refresh(); } }, '복습 종료'),
        el('button', { class: 'btn btn-primary btn-sm', onclick: function () {
          pendingReviewReturn = null;
          const d2 = Store.data();
          const queue = ret.queueIds.map(function (id) { return d2.cards.find(function (c) { return c.id === id; }); }).filter(Boolean);
          ctx.navigate('review');
          if (queue.length) startSession(queue, ctx, ret.idx);
        } }, '복습 카드 (' + (ret.idx + 1) + '/' + ret.queueIds.length + ')로 돌아가기 ▸'),
      ]));
    }

    root.append(el('header', { class: 'page-hero' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'STUDY LIBRARY'),
        el('h1', { class: 'page-title' }, '단권화 서재'),
        el('p', { class: 'page-subtitle' }, '과목과 쟁점을 기준으로 서재를 정리하고, 한 쟁점에 원문·답안·복습 카드를 함께 연결합니다.'),
      ]),
      el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' }, [
        el('button', {
          class: 'btn btn-sm',
          onclick: function () { noteRailCollapsed = !noteRailCollapsed; ctx.refresh(); },
        }, noteRailCollapsed ? '우측 연결 열기' : '넓게 읽기'),
        el('button', { class: 'btn btn-sm btn-primary', onclick: function () { createNote(ctx); } }, '+ 새 쟁점 노트'),
      ]),
    ]));

    const workspace = el('div', { class: 'notes-workspace' + (noteRailCollapsed ? ' context-collapsed' : '') });
    const treePane = el('div', { class: 'notes-tree-pane' });
    const centerPane = el('div', { style: 'min-width:0' });
    const railPane = el('div', { class: 'notes-context-rail' });

    // 좌측 1영역: 과목과 쟁점 트리 + 검색/상태 필터
    const searchInput = el('input', { type: 'search', value: noteFilter.q, placeholder: '제목·쟁점·본문 검색', 'aria-label': '서재 검색', style: 'min-height:38px;font-size:.88rem' });
    searchInput.oninput = function () { noteFilter.q = searchInput.value; renderTree(); };
    const statSel = el('select', { 'aria-label': '정리 상태 필터', style: 'min-height:36px;font-size:.84rem' });
    statSel.append(el('option', { value: '' }, '모든 상태'));
    NOTE_STATUSES.forEach(function (p) { statSel.append(el('option', { value: p[0], selected: p[0] === noteFilter.status }, p[1])); });
    statSel.onchange = function () { noteFilter.status = statSel.value; renderTree(); };

    const filterBox = el('div', { class: 'card', style: 'padding:12px;margin:0' }, [
      el('div', { style: 'font-size:.76rem;font-weight:700;color:var(--text-sub);margin-bottom:8px' }, '과목과 쟁점'),
      el('div', { style: 'margin-bottom:6px' }, [searchInput]),
      statSel,
    ]);
    const treeBody = el('div', { class: 'card', style: 'padding:10px;margin:0' });
    treePane.append(filterBox, treeBody);

    function renderTree() {
      const data = Store.data();
      treeBody.innerHTML = '';
      const starredSet = new Set((data.settings && data.settings.starredNoteIds) || []);
      const filtered = data.notes.filter(function (n) {
        if (noteFilter.status && n.status !== noteFilter.status) return false;
        if (noteFilter.q) {
          const hay = (n.title + ' ' + n.issue + ' ' + n.body + ' ' + n.unit).toLowerCase();
          if (hay.indexOf(noteFilter.q.toLowerCase()) < 0) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        treeBody.append(el('p', { class: 'hint', style: 'padding:10px' }, data.notes.length ? '조건에 맞는 노트가 없습니다.' : '아직 노트가 없습니다.'));
        return;
      }

      data.subjects.forEach(function (sub) {
        const subNotes = filtered.filter(function (n) { return n.subjectId === sub.id; })
          .sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
        if (subNotes.length === 0) return;
        const isCol = !!collapsedTreeSubj[sub.id];
        treeBody.append(el('button', {
          type: 'button',
          class: 'tree-subj-head',
          onclick: function () { collapsedTreeSubj[sub.id] = !isCol; renderTree(); },
        }, [
          el('span', {}, sub.name + ' (' + subNotes.length + ')'),
          el('span', { class: 'hint' }, isCol ? '▸' : '▾'),
        ]));
        if (!isCol) {
          subNotes.forEach(function (n) {
            const statLabel = (NOTE_STATUSES.find(function (s) { return s[0] === n.status; }) || [, '수집'])[1];
            const btn = el('button', {
              type: 'button',
              class: 'tree-note-btn',
              'aria-current': noteSelectedId === n.id ? 'page' : null,
              onclick: function () {
                noteSelectedId = n.id;
                Store.update(function (dd) { dd.lastOpenNote = n.id; dd.lastStudyResume = { type: 'note', id: n.id, at: new Date().toISOString() }; });
                renderCenterAndRail();
                renderTree();
              },
            }, [
              el('span', { style: 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%' }, (starredSet.has(n.id) ? '★ ' : '') + (n.title || '(제목 없음)')),
              el('span', { style: 'font-size:.73rem;opacity:.8' }, (n.issue ? n.issue + ' · ' : '') + statLabel),
            ]);
            treeBody.append(btn);
          });
        }
      });

      // 과목 미지정 노트
      const unsub = filtered.filter(function (n) { return !data.subjects.some(function (s) { return s.id === n.subjectId; }); });
      unsub.forEach(function (n) {
        treeBody.append(el('button', {
          type: 'button',
          class: 'tree-note-btn',
          'aria-current': noteSelectedId === n.id ? 'page' : null,
          onclick: function () { noteSelectedId = n.id; renderCenterAndRail(); renderTree(); },
        }, [el('span', {}, n.title || '(제목 없음)')]));
      });
    }

    function renderCenterAndRail() {
      const prev = centerPane.firstChild;
      if (prev && typeof prev._cleanup === 'function') prev._cleanup();
      centerPane.innerHTML = '';
      railPane.innerHTML = '';

      const n = Store.note(noteSelectedId);
      if (!n) {
        centerPane.append(el('div', { class: 'empty' }, [
          el('span', { class: 'emoji' }, '📖'),
          el('h3', {}, '서재에서 읽을 쟁점을 선택하거나 새 노트를 만드세요'),
          el('p', {}, '원문 근거, 다음 답안의 점검 질문, 나의 답안 순서를 한 시트에 정리할 수 있습니다.'),
          el('button', { class: 'btn btn-primary', style: 'margin-top:8px', onclick: function () { createNote(ctx); } }, '+ 새 쟁점 노트 만들기'),
        ]));
        return;
      }

      const built = buildNoteSheetAndRail(n, ctx, renderTree, renderCenterAndRail);
      centerPane.append(built.center);
      if (!noteRailCollapsed) railPane.append(built.rail);
    }

    workspace.append(treePane, centerPane);
    if (!noteRailCollapsed) workspace.append(railPane);
    root.append(workspace);
    renderTree();
    renderCenterAndRail();
  }

  function createNote(ctx) {
    const d = Store.data();
    const n = {
      id: Store.id('note'),
      title: '새 쟁점 노트',
      subjectId: d.subjects[0] && d.subjects[0].id,
      unit: '',
      issue: '',
      importance: 2,
      status: 'todo',
      appliedDate: '',
      body: '',
      checkQuestion: '',
      answerFlow: '문제의 소재 → 법리·판례 태도 → 사안 포섭 → 결론',
      source: { ref: '', caseId: '', page: '', url: '', checkedDate: '', excerpt: '' },
      linkedAnswers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [],
    };
    Store.update(function (dd) { dd.notes.push(n); dd.lastOpenNote = n.id; });
    noteSelectedId = n.id;
    noteEditMode = true;
    ctx.refresh();
  }

  function buildNoteSheetAndRail(n, ctx, refreshTree, refreshAll) {
    const d = Store.data();
    const saveStatus = el('span', { class: 'save-status' }, '저장됨');
    let saveTimer, pendingSave = false;
    function onSaved() {
      if (!pendingSave) return;
      pendingSave = false;
      saveStatus.textContent = '저장됨 · ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      saveStatus.style.color = '';
      refreshTree();
    }
    function onSaveFail() {
      if (!pendingSave) return;
      pendingSave = false;
      saveStatus.textContent = '⚠ 저장 실패';
      saveStatus.style.color = 'var(--warn-fg)';
    }
    window.addEventListener('store:saved', onSaved);
    window.addEventListener('store:save-failed', onSaveFail);

    function touch() {
      saveStatus.textContent = '저장 중…';
      saveStatus.style.color = 'var(--text-sub)';
      pendingSave = true;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        Store.update(function (dd) { const x = dd.notes.find(function (z) { return z.id === n.id; }); if (x) x.updatedAt = new Date().toISOString(); });
      }, 450);
    }

    const sub = Store.subject(n.subjectId);
    const src = n.source || {};
    const starredList = (d.settings && d.settings.starredNoteIds) || [];
    const isStarred = starredList.indexOf(n.id) >= 0;
    const isZoom = !!(d.settings && d.settings.noteZoom);
    const statObj = NOTE_STATUSES.find(function (p) { return p[0] === n.status; }) || ['todo', '수집'];

    // ── 우측 3영역: 원문과 연결 · 한 쟁점 여러 연결 · AI 질문 ──
    const railFrag = el('div', { class: 'stack', style: 'gap:12px' });
    const srcVerified = !!(src.checkedDate || src.ref || src.caseId);
    const srcCard = el('div', { class: 'rail-card' }, [
      el('div', { class: 'row between', style: 'margin-bottom:8px' }, [
        el('strong', { style: 'font-size:.9rem' }, '원문과 연결'),
        el('span', { class: 'tag ' + (srcVerified ? 'tag-exam' : 'tag-warn') }, srcVerified ? '출처 확인 완료' : '출처 확인 필요'),
      ]),
      el('div', { style: 'font-size:.86rem;line-height:1.6;color:var(--text)' }, [
        src.ref ? el('div', {}, '문헌: ' + src.ref + (src.page ? ' (p.' + String(src.page).replace(/^p\.?/i, '') + ')' : '')) : el('div', { class: 'hint' }, '문헌명·쪽수가 아직 비어 있습니다.'),
        src.caseId ? el('div', {}, '판례: ' + src.caseId) : '',
        src.checkedDate ? el('div', { class: 'hint' }, '최종 대조: ' + src.checkedDate) : '',
      ]),
      el('div', { class: 'row', style: 'gap:6px;margin-top:10px;flex-wrap:wrap' }, [
        el('button', {
          type: 'button',
          class: 'btn btn-sm' + (noteSplitSource ? ' btn-primary' : ''),
          style: 'flex:1',
          onclick: function () { noteSplitSource = !noteSplitSource; refreshAll(); },
        }, noteSplitSource ? '나란히 읽기 닫기' : '원문 나란히 읽기'),
        src.url ? el('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer', class: 'btn btn-sm' }, '링크 ↗') : null,
      ]),
    ]);
    railFrag.append(srcCard);

    // 같은 과목+쟁점(또는 노트ID) 연결 항목 집계
    const issueTrim = (n.issue || '').trim();
    const relAnswers = d.answers.filter(function (a) {
      return (n.linkedAnswers || []).indexOf(a.id) >= 0 || (issueTrim && a.subjectId === n.subjectId && (a.issue || '').trim() === issueTrim);
    });
    const relCards = d.cards.filter(function (c) {
      return c.noteId === n.id || (issueTrim && c.subjectId === n.subjectId && (c.issue || '').trim() === issueTrim);
    });
    const relTasks = d.tasks.filter(function (t) {
      return issueTrim && t.subjectId === n.subjectId && (t.issue || '').trim() === issueTrim && t.status !== 'done';
    });

    const multiCard = el('div', { class: 'rail-card sage' }, [
      el('strong', { style: 'font-size:.9rem;display:block;margin-bottom:8px;color:var(--exam-fg)' }, '한 쟁점, 여러 연결'),
      el('div', { class: 'rail-kv' }, [
        el('span', {}, '관련 답안 연습'),
        el('button', { type: 'button', class: 'section-link', onclick: function () { ctx.navigate('answers'); } }, relAnswers.length + '건 →'),
      ]),
      el('div', { class: 'rail-kv' }, [
        el('span', {}, '연결된 복습 카드'),
        el('button', { type: 'button', class: 'section-link', onclick: function () { ctx.navigate('review'); } }, relCards.length + '장 →'),
      ]),
      el('div', { class: 'rail-kv' }, [
        el('span', {}, '미완료 보완 과업'),
        el('button', { type: 'button', class: 'section-link', onclick: function () { ctx.navigate('tasks'); } }, relTasks.length + '건 →'),
      ]),
      el('button', {
        type: 'button',
        class: 'btn btn-sm btn-block',
        style: 'margin-top:10px;background:var(--surface)',
        onclick: function () { makeCardFromSelectionOrNote(n, ctx); },
      }, '+ 이 부분을 복습 카드로'),
      el('p', { class: 'hint', style: 'font-size:.74rem;margin-top:4px' }, '본문 문장을 드래그한 뒤 누르면 선택 문단이 답안에 바로 채워집니다.'),
    ]);
    railFrag.append(multiCard);

    const aiCard = el('div', { class: 'rail-card' }, [
      el('strong', { style: 'font-size:.9rem;display:block;margin-bottom:6px' }, '문맥 기반 AI 보조'),
      el('p', { class: 'hint', style: 'font-size:.78rem;margin:0 0 10px' }, '필요할 때만 선택한 문단·쟁점을 AI 도우미로 보내 질문합니다.'),
      el('button', {
        type: 'button',
        class: 'btn btn-sm btn-block',
        onclick: function () {
          const selText = (window.getSelection && window.getSelection().toString().trim()) || '';
          const snippet = selText || (n.body || '').slice(0, 900);
          openContextualAi({
            label: (sub ? sub.name + ' · ' : '') + (n.issue || n.title || '서재 노트'),
            contextText: '제목: ' + (n.title || '') + '\n쟁점: ' + (n.issue || '') + '\n본문 발췌:\n' + snippet,
            promptDraft: selText ? '선택한 문단의 법리 의미와 답안 포섭 시 주의할 점을 설명해줘.' : '이 쟁점에서 답안에 반드시 현출해야 할 핵심 키워드와 반대견해 포인트를 정리해줘.',
          });
        },
      }, '+ 이 쟁점 질문하기'),
    ]);
    railFrag.append(aiCard);

    // ── 중앙 2영역: 서재 시트 (읽기 모드 vs 편집 모드 + 원문 나란히 읽기) ──
    const sheet = el('div', { class: 'note-sheet' });
    sheet._cleanup = function () {
      window.removeEventListener('store:saved', onSaved);
      window.removeEventListener('store:save-failed', onSaveFail);
    };

    const crumbText = [sub ? sub.name : '수험 과목', n.unit, n.issue].filter(Boolean).join(' › ');
    const topToolbar = el('div', { class: 'row between', style: 'gap:8px;padding-bottom:12px;border-bottom:1px solid var(--border)' }, [
      el('div', { class: 'row', style: 'gap:8px' }, [
        el('span', { class: 'hint', style: 'font-weight:600' }, crumbText),
        saveStatus,
      ]),
      el('div', { class: 'row', style: 'gap:6px' }, [
        el('button', {
          type: 'button',
          class: 'btn btn-sm' + (isStarred ? ' btn-primary' : ' btn-ghost'),
          title: '시험 직전 핵심 묶음에 포함',
          onclick: function () {
            Store.update(function (dd) {
              const arr = dd.settings.starredNoteIds || (dd.settings.starredNoteIds = []);
              const idx = arr.indexOf(n.id);
              if (idx >= 0) arr.splice(idx, 1); else arr.push(n.id);
            });
            refreshTree();
            refreshAll();
          },
        }, isStarred ? '★ 핵심' : '☆ 핵심'),
        !noteEditMode ? el('button', {
          type: 'button',
          class: 'btn btn-sm btn-ghost',
          title: '본문 글자 크기 전환 (18px / 20px)',
          onclick: function () {
            Store.update(function (dd) { dd.settings.noteZoom = !dd.settings.noteZoom; });
            refreshAll();
          },
        }, isZoom ? '가-' : '가+') : null,
        el('button', {
          type: 'button',
          class: 'btn btn-sm' + (noteSplitSource ? ' btn-primary' : ''),
          onclick: function () { noteSplitSource = !noteSplitSource; refreshAll(); },
        }, '원문 나란히 읽기'),
        el('button', {
          type: 'button',
          class: 'btn btn-sm' + (noteEditMode ? ' btn-primary' : ''),
          onclick: function () { noteEditMode = !noteEditMode; refreshAll(); },
        }, noteEditMode ? '읽기 완료' : '편집하기'),
      ]),
    ]);

    if (!noteEditMode) {
      const bodyHtml = n.body
        ? escapeHtml(n.body).replace(/\n/g, '<br>')
        : '<span class="hint">아직 정리된 본문이 없습니다. 우측 상단 "편집하기"를 눌러 조문·판례·포섭 논리를 기록하세요.</span>';

      sheet.append(
        topToolbar,
        el('h2', { class: 'note-sheet-title' }, n.title || '(제목 없음)'),
        el('div', { class: 'row', style: 'gap:8px;margin-bottom:22px' }, [
          el('span', { class: 'tag ' + (n.status === 'done' ? 'tag-exam' : n.status === 'recheck' ? 'tag-warn' : 'tag-muted') }, statObj[1]),
          srcVerified ? el('span', { class: 'tag tag-muted' }, '출처 확인됨') : el('span', { class: 'tag tag-warn' }, '출처 미확인'),
          n.appliedDate ? el('span', { class: 'hint' }, '기준일 ' + n.appliedDate) : '',
        ]),
        el('div', { class: 'note-prose' + (isZoom ? ' zoom-lg' : ''), html: bodyHtml }),
      );

      if (n.checkQuestion && n.checkQuestion.trim()) {
        sheet.append(el('div', { class: 'note-check-callout' }, [
          el('div', { class: 'label' }, '다음 답안의 점검 질문'),
          el('div', { class: 'q-text' }, n.checkQuestion.trim()),
        ]));
      }

      if (n.answerFlow && n.answerFlow.trim()) {
        const steps = n.answerFlow.split(/→|->|>/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (steps.length > 0) {
          const flowRow = el('div', { class: 'note-flow-steps' });
          steps.forEach(function (st, idx) {
            if (idx > 0) flowRow.append(el('span', { class: 'note-flow-arrow' }, '→'));
            flowRow.append(el('span', { class: 'tag tag-muted', style: 'font-size:.84rem;padding:5px 11px' }, (idx + 1) + '. ' + st));
          });
          sheet.append(
            el('div', { style: 'margin-top:20px;padding-top:16px;border-top:1px solid var(--border)' }, [
              el('div', { style: 'font-size:.78rem;font-weight:700;color:var(--text-sub);margin-bottom:4px' }, '나의 답안 현출 순서'),
              flowRow,
            ]),
          );
        }
      }
    } else {
      // ── 편집 모드 ──
      const titleInp = el('input', { type: 'text', value: n.title || '', style: 'font-family:var(--font-serif);font-size:1.3rem;font-weight:700;margin-top:12px' });
      titleInp.oninput = function () { n.title = titleInp.value; touch(); };
      const subjSel = el('select', {}); d.subjects.forEach(function (s) { subjSel.append(el('option', { value: s.id, selected: s.id === n.subjectId }, s.name)); });
      subjSel.onchange = function () { n.subjectId = subjSel.value; touch(); };
      const unitInp = el('input', { type: 'text', value: n.unit || '', placeholder: '대단원 (예: 특허요건)' });
      unitInp.oninput = function () { n.unit = unitInp.value; touch(); };
      const issueInp = el('input', { type: 'text', value: n.issue || '', placeholder: '핵심 쟁점명 (답안·카드·과업 자동 연결 기준)' });
      issueInp.oninput = function () { n.issue = issueInp.value; touch(); };
      const statSel = el('select', {}); NOTE_STATUSES.forEach(function (p) { statSel.append(el('option', { value: p[0], selected: p[0] === n.status }, p[1])); });
      statSel.onchange = function () { n.status = statSel.value; touch(); };
      const appliedInp = el('input', { type: 'date', value: n.appliedDate || '' });
      appliedInp.onchange = function () { n.appliedDate = appliedInp.value; touch(); };

      const bodyArea = el('textarea', {
        style: 'min-height:260px;font-size:1.05rem;line-height:1.82',
        placeholder: '조문 요건 · 판례 핵심 문구 · 사안 포섭 기준 · 나의 언어로 정리한 결론을 적으세요.',
      }, n.body || '');
      bodyArea.oninput = function () { n.body = bodyArea.value; touch(); };

      const checkQInp = el('input', { type: 'text', value: n.checkQuestion || '', placeholder: '예: 사안에서 구성요소 곤란성과 효과 현저성을 모두 검토했는가?' });
      checkQInp.oninput = function () { n.checkQuestion = checkQInp.value; touch(); };
      const flowInp = el('input', { type: 'text', value: n.answerFlow || '', placeholder: '예: 문제 소재 → 조문·판례 태도 → 사안 포섭 → 결론' });
      flowInp.oninput = function () { n.answerFlow = flowInp.value; touch(); };

      const refInp = el('input', { type: 'text', value: src.ref || '', placeholder: '기본서·판례집 문헌명' });
      const caseInp = el('input', { type: 'text', value: src.caseId || '', placeholder: '판례번호 (예: 대법원 2021후10234)' });
      const pageInp = el('input', { type: 'text', value: src.page || '', placeholder: '쪽수 (예: 142)' });
      const checkedInp = el('input', { type: 'date', value: src.checkedDate || '' });
      const urlInp = el('input', { type: 'text', value: src.url || '', placeholder: '국가법령정보센터·판례 URL (선택)' });
      const excerptArea = el('textarea', { rows: '5', placeholder: '조문 원문이나 대법원 판시 원문을 그대로 붙여넣어 두면 "원문 나란히 읽기"로 대조할 수 있습니다.' }, src.excerpt || '');
      [refInp, caseInp, pageInp, checkedInp, urlInp, excerptArea].forEach(function (inp) {
        inp.oninput = inp.onchange = function () {
          n.source = { ref: refInp.value, caseId: caseInp.value, page: pageInp.value, url: urlInp.value, checkedDate: checkedInp.value, excerpt: excerptArea.value };
          touch();
        };
      });

      sheet.append(
        topToolbar,
        titleInp,
        el('div', { class: 'field-row', style: 'margin-top:12px' }, [
          el('div', { class: 'field' }, [el('label', {}, '과목'), subjSel]),
          el('div', { class: 'field' }, [el('label', {}, '대단원'), unitInp]),
        ]),
        el('div', { class: 'field-row' }, [
          el('div', { class: 'field' }, [el('label', {}, '쟁점명 (연결 키)'), issueInp]),
          el('div', { class: 'field' }, [el('label', {}, '정리 상태'), statSel]),
        ]),
        el('div', { class: 'field' }, [el('label', {}, '단권화 본문'), bodyArea]),
        el('div', { class: 'field' }, [el('label', {}, '다음 답안의 점검 질문 (강조 콜아웃)'), checkQInp]),
        el('div', { class: 'field' }, [el('label', {}, '나의 답안 현출 순서 (→ 기호로 구분)'), flowInp]),
        el('hr', { class: 'divider' }),
        el('h3', { style: 'font-family:var(--font-serif);margin-bottom:10px' }, '원문 근거 및 발췌'),
        el('div', { class: 'field-row' }, [
          el('div', { class: 'field' }, [el('label', {}, '문헌명'), refInp]),
          el('div', { class: 'field' }, [el('label', {}, '판례번호'), caseInp]),
        ]),
        el('div', { class: 'field-row' }, [
          el('div', { class: 'field' }, [el('label', {}, '쪽수 (p.)'), pageInp]),
          el('div', { class: 'field' }, [el('label', {}, '원문 확인일'), checkedInp]),
        ]),
        el('div', { class: 'field' }, [el('label', {}, '원문·판례 발췌문 (나란히 읽기용)'), excerptArea]),
        el('div', { class: 'field' }, [el('label', {}, '참조 URL'), urlInp]),
        el('div', { class: 'row between', style: 'margin-top:12px' }, [
          el('div', { class: 'field', style: 'margin:0;max-width:220px' }, [el('label', {}, '적용 기준일'), appliedInp]),
          el('button', {
            type: 'button',
            class: 'btn btn-sm btn-danger',
            onclick: async function () {
              if (await ctx.confirm('이 서재 노트를 삭제할까요?', { danger: true, okText: '삭제' })) {
                Store.update(function (dd) { dd.notes = dd.notes.filter(function (x) { return x.id !== n.id; }); dd.lastOpenNote = null; });
                noteSelectedId = null;
                refreshTree();
                refreshAll();
                ctx.toast('노트를 삭제했습니다.');
              }
            },
          }, '노트 삭제'),
        ]),
      );
    }

    // 원문 나란히 읽기 활성 시 좌우 2분할 래퍼 반환 (제안서 5·10·12쪽)
    let centerOut = sheet;
    if (noteSplitSource) {
      const sideExcerpt = el('div', { class: 'source-side-sheet' });
      const excerptInput = el('textarea', {
        style: 'min-height:280px;font-size:.94rem;line-height:1.78;background:var(--surface)',
        placeholder: '조문 원문이나 대법원 판례 판시사항을 여기에 붙여넣고 오른쪽 단권화 노트와 나란히 대조하며 읽으세요.',
      }, (n.source && n.source.excerpt) || '');
      excerptInput.oninput = function () {
        n.source = Object.assign({}, n.source || {}, { excerpt: excerptInput.value });
        touch();
      };

      sideExcerpt.append(
        el('div', { class: 'row between', style: 'margin-bottom:10px' }, [
          el('strong', { style: 'font-family:var(--font-serif);font-size:1.05rem' }, '원문 · 판례 발췌'),
          el('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: function () { noteSplitSource = false; refreshAll(); } }, '닫기 ✕'),
        ]),
        el('div', { class: 'hint', style: 'margin-bottom:10px' }, [
          src.ref ? ('문헌: ' + src.ref + (src.page ? ' p.' + src.page : '')) : '출처 미기재',
          src.caseId ? (' · ' + src.caseId) : '',
        ].join('')),
        excerptInput,
        src.url ? el('p', { style: 'margin:8px 0 0' }, el('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer' }, '외부 원문 새 창 열기 ↗')) : null,
      );

      const splitWrap = el('div', { class: 'note-split-reader' }, [sideExcerpt, sheet]);
      splitWrap._cleanup = sheet._cleanup;
      centerOut = splitWrap;
    }

    return { center: centerOut, rail: railFrag };
  }

  function makeCardFromSelectionOrNote(n, ctx) {
    const sel = (window.getSelection && window.getSelection().toString().trim()) || '';
    const draftCard = {
      id: null,
      q: (n.issue || n.title || '쟁점') + ' — 핵심 요건 및 판례 태도는?',
      a: sel || '',
      subjectId: n.subjectId,
      noteId: n.id,
      issue: n.issue || '',
      status: 'active',
      nextReview: todayKey(),
      interval: 1,
      reps: 0,
      verified: !!(n.source && (n.source.checkedDate || n.source.ref || n.source.caseId)),
    };
    openCardEditor(draftCard, ctx);
  }
  function makeCardFromNote(n, ctx) { makeCardFromSelectionOrNote(n, ctx); }

  /* =======================================================================
     10. 복습 카드 — 일일 분량 개인 조절 & 능동 회상 (제안서 8·10·12쪽)
     ======================================================================= */
  function renderReview(root, ctx) {
    const d = Store.data();
    const dailyLimit = d.settings.dailyReviewLimit || 25;

    const limitSel = el('select', { 'aria-label': '오늘 처리할 복습 상한', style: 'width:auto;min-height:36px;font-size:.86rem' });
    [10, 20, 25, 40, 60].forEach(function (num) {
      limitSel.append(el('option', { value: String(num), selected: num === dailyLimit }, '일일 목표 ' + num + '개'));
    });
    limitSel.onchange = function () {
      Store.update(function (dd) { dd.settings.dailyReviewLimit = Number(limitSel.value) || 25; });
      ctx.refresh();
    };

    root.append(el('header', { class: 'page-hero' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'ACTIVE RECALL & SPACED REVIEW'),
        el('h1', { class: 'page-title' }, '복습 카드'),
        el('p', { class: 'page-subtitle' }, '답을 보기 전 스스로 인출하고, 헷갈린 카드는 원문 서재 노트로 즉시 돌아가 근거를 확인합니다.'),
      ]),
      el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' }, [
        limitSel,
        el('button', { class: 'btn btn-sm', onclick: function () { openCardEditor(null, ctx); } }, '+ 새 카드'),
      ]),
    ]));

    if (d.cards.length === 0) {
      root.append(el('div', { class: 'empty' }, [
        el('span', { class: 'emoji' }, '🔁'),
        el('h3', {}, '아직 복습 카드가 없습니다'),
        el('p', {}, '단권화 서재에서 문단을 드래그해 "이 부분을 복습 카드로"를 누르거나 직접 새 카드를 만들어 보세요.'),
        el('button', { class: 'btn btn-primary', style: 'margin-top:8px', onclick: function () { openCardEditor(null, ctx); } }, '+ 첫 복습 카드 만들기'),
      ]));
      return;
    }

    const tk = todayKey();
    const active = d.cards.filter(function (c) { return c.status === 'active'; });
    const drafts = d.cards.filter(function (c) { return c.status === 'draft'; });
    const due = active.filter(function (c) { return c.nextReview && c.nextReview <= tk; });
    const todayDue = due.slice(0, dailyLimit);
    const backlog = Math.max(0, due.length - todayDue.length);

    // 오늘 처리할 양 vs 밀린 전체량을 명확히 분리 (제안서 10·12쪽)
    const summary = el('div', { class: 'card', style: 'margin-bottom:16px' });
    summary.append(el('div', { class: 'row between', style: 'gap:16px' }, [
      el('div', { class: 'row', style: 'gap:24px;flex-wrap:wrap' }, [
        stat('오늘 처리할 분량', todayDue.length + '개', 'var(--exam-fg)'),
        stat('만기 전체 대기량', due.length + '개'),
        backlog > 0 ? stat('내일 이후 이월', backlog + '개', 'var(--terracotta)') : null,
        drafts.length ? stat('초안 대기', drafts.length + '개', 'var(--text-sub)') : null,
      ]),
      due.length
        ? el('button', { class: 'btn btn-primary btn-lg', onclick: function () { startSession(todayDue, ctx); } }, '▶ 오늘의 복습 시작 (' + todayDue.length + ')')
        : el('span', { class: 'tag tag-exam' }, '오늘 복습 완료'),
    ]));
    root.append(summary);

    root.append(el('details', { class: 'card', style: 'margin-bottom:16px' }, [
      el('summary', { style: 'cursor:pointer;font-weight:700;font-size:.9rem' }, '간격 반복 규칙 안내'),
      el('p', { class: 'hint', style: 'margin-top:8px' }, '다시 학습 → 1일 뒤 / 어려움 → 간격 ×1.2 / 보통 → 간격 ×2.5 / 쉬움 → 간격 ×3.5. 밀린 카드가 많아도 설정한 일일 상한만큼만 배정해 과부하를 막습니다.'),
    ]));

    if (drafts.length) {
      root.append(el('h3', { style: 'font-family:var(--font-serif);margin:18px 0 8px' }, '확인 대기 초안 (' + drafts.length + ')'));
      const list = el('div', { class: 'list' }); drafts.forEach(function (c) { list.append(cardRow(c, ctx, true)); }); root.append(list);
    }
    root.append(el('h3', { style: 'font-family:var(--font-serif);margin:18px 0 8px' }, '활성 카드 (' + active.length + ')'));
    if (active.length === 0) root.append(el('p', { class: 'hint' }, '활성 카드가 없습니다.'));
    else { const list = el('div', { class: 'list' }); active.sort(function (a, b) { return (a.nextReview || '').localeCompare(b.nextReview || ''); }).forEach(function (c) { list.append(cardRow(c, ctx, false)); }); root.append(list); }
  }

  function cardRow(c, ctx, isDraft) {
    const sub = Store.subject(c.subjectId);
    const item = el('div', { class: 'item', style: 'cursor:pointer', onclick: function () { openCardEditor(c, ctx); } }, [
      el('div', { class: 'main' }, [
        el('div', { class: 'title' }, c.q || '(질문 없음)'),
        el('div', { class: 'meta' }, [
          sub ? el('span', { class: 'tag tag-exam' }, sub.name) : '',
          c.issue ? el('span', { class: 'tag tag-muted', style: 'margin-left:6px' }, c.issue) : '',
          isDraft ? el('span', { class: 'tag tag-muted', style: 'margin-left:6px' }, '초안') : ' · 다음 복습 ' + (c.nextReview || '-'),
          !c.verified ? el('span', { class: 'tag tag-warn', style: 'margin-left:6px' }, '출처 미검토') : '',
        ]),
      ]),
    ]);
    if (isDraft) item.append(el('button', { class: 'btn btn-sm btn-primary', onclick: function (e) { e.stopPropagation(); activateCard(c, ctx); } }, '활성화'));
    return item;
  }

  function activateCard(c, ctx) {
    if (!c.a || !c.a.trim()) { openCardEditor(c, ctx); ctx.toast('답을 채운 뒤 활성화하세요.', 'warn'); return; }
    Store.update(function (dd) { const x = dd.cards.find(function (z) { return z.id === c.id; }); x.status = 'active'; x.nextReview = todayKey(); });
    ctx.refresh(); ctx.toast('카드를 활성화했습니다.');
  }

  // 능동 회상 세션 (제안서 8쪽 가운데 시안: '다시 만나는 쟁점 · ACTIVE RECALL')
  function startSession(queue, ctx, startIdx) {
    let idx = (typeof startIdx === 'number' && startIdx >= 0 && startIdx < queue.length) ? startIdx : 0;
    const body = el('div', { class: 'recall-stage' });
    const m = ctx.modal({ title: '다시 만나는 쟁점', body: body, footer: null });
    render();

    function render() {
      body.innerHTML = '';
      if (idx >= queue.length) {
        body.append(el('div', { class: 'empty', style: 'border:none;padding:28px 12px' }, [
          el('span', { class: 'emoji' }, '🌿'),
          el('h3', {}, '오늘 목표한 복습 분량을 마쳤습니다'),
          el('p', {}, '기억이 흐릿했던 쟁점은 짧은 간격으로 다시 찾아옵니다.'),
          el('button', { class: 'btn btn-primary', style: 'margin-top:10px', onclick: function () { m.close(); ctx.refresh(); } }, '서재로 돌아가기'),
        ]));
        return;
      }

      const c = queue[idx];
      const sub = Store.subject(c.subjectId);
      const pct = Math.round(((idx + 1) / queue.length) * 100);
      const prog = el('div', { class: 'progress', style: 'height:5px;margin-bottom:18px' }, [el('span', { style: 'width:' + pct + '%' })]);

      const cardBox = el('div', { class: 'recall-card' });
      cardBox.append(
        el('div', { class: 'row between', style: 'margin-bottom:6px' }, [
          el('span', { class: 'page-eyebrow', style: 'margin:0' }, 'ACTIVE RECALL'),
          el('span', { class: 'hint', style: 'font-variant-numeric:tabular-nums;font-weight:600' }, '오늘의 복습 ' + (idx + 1) + ' / ' + queue.length),
        ]),
        prog,
        el('div', { class: 'row', style: 'gap:6px' }, [
          sub ? el('span', { class: 'tag tag-exam' }, sub.name) : '',
          c.issue ? el('span', { class: 'tag tag-muted' }, c.issue) : '',
        ]),
        el('div', { class: 'recall-question' }, c.q),
      );

      const promptHint = el('p', { class: 'hint', style: 'margin:0 0 18px' }, '답을 보기 전에, 나의 말로 핵심 요건과 판례 문구를 먼저 떠올려 보세요.');
      const answerBox = el('div', { style: 'margin-top:16px' });
      const showBtn = el('button', { class: 'btn btn-primary btn-lg btn-block', onclick: reveal }, '답 확인하기');
      cardBox.append(promptHint, showBtn, answerBox);
      body.append(cardBox);

      const startTs = Date.now();
      function reveal() {
        promptHint.remove();
        showBtn.remove();
        const note = c.noteId ? Store.note(c.noteId) : null;
        const pageStr = note && note.source && note.source.page ? (' · p.' + note.source.page) : '';
        answerBox.append(
          el('div', { style: 'padding:18px 20px;border-radius:12px;background:var(--surface-soft);border:1px solid var(--border);line-height:1.8;font-size:1rem', html: escapeHtml(c.a || '(답 미입력)').replace(/\n/g, '<br>') }),
          note
            ? el('div', { class: 'row between', style: 'margin-top:12px;padding:10px 14px;border-radius:10px;background:var(--exam-bg)' }, [
                el('span', { style: 'font-size:.84rem;color:var(--exam-fg);font-weight:600' }, '원문과 연결: ' + (note.title || note.issue || '서재 노트') + pageStr),
                el('button', {
                  type: 'button',
                  class: 'btn btn-sm',
                  style: 'background:var(--surface)',
                  onclick: function () {
                    pendingReviewReturn = { queueIds: queue.map(function (q) { return q.id; }), idx: idx };
                    m.close();
                    openNoteById(c.noteId, ctx);
                  },
                }, '원문 노트 열기 ▸'),
              ])
            : null,
          el('p', { class: 'hint', style: 'margin:16px 0 8px;font-weight:600' }, '인출 정확도 평가'),
          el('div', { class: 'row', style: 'gap:8px' }, [
            gradeBtn('다시 학습 (1일)', 0),
            gradeBtn('어려움', 1),
            gradeBtn('보통', 2),
            gradeBtn('쉬움', 3),
          ]),
        );
      }
      function gradeBtn(label, grade) {
        return el('button', {
          class: 'btn' + (grade === 0 ? ' btn-danger' : grade >= 2 ? ' btn-primary' : ''),
          style: 'flex:1',
          onclick: function () { grade_(c, grade, Math.round((Date.now() - startTs) / 1000)); },
        }, label);
      }
    }

    function grade_(c, grade, respSec) {
      Store.update(function (dd) {
        const x = dd.cards.find(function (z) { return z.id === c.id; });
        let interval = x.interval || 1;
        if (grade === 0) { interval = 1; x.lapses = (x.lapses || 0) + 1; }
        else if (grade === 1) interval = Math.max(1, Math.round(interval * 1.2));
        else if (grade === 2) interval = Math.max(1, Math.round(interval * 2.5));
        else interval = Math.max(1, Math.round(interval * 3.5));
        x.interval = interval;
        x.reps = (x.reps || 0) + 1;
        const next = new Date(); next.setDate(next.getDate() + interval);
        x.nextReview = next.toISOString().slice(0, 10);
        dd.reviews.push({ id: Store.id('rev'), cardId: c.id, grade: grade, respSec: respSec, at: new Date().toISOString() });
      });
      idx++;
      render();
    }
  }

  function openCardEditor(card, ctx) {
    const d = Store.data();
    const isNew = !(card && card.id);
    const c = card ? Object.assign({}, card) : { id: null, q: '', a: '', subjectId: d.subjects[0] && d.subjects[0].id, noteId: null, issue: '', status: 'active', nextReview: todayKey(), interval: 1, reps: 0, verified: false };
    const q = el('textarea', { rows: '2', placeholder: '회상 질문 (예: 균등침해의 적극적·소극적 성립요건 5가지는?)' }, c.q || '');
    const a = el('textarea', { rows: '4', placeholder: '답안 현출 핵심 문구' }, c.a || '');
    const issueInp = el('input', { type: 'text', value: c.issue || '', placeholder: '연결 쟁점명 (선택)' });
    const subjSel = el('select', {}); d.subjects.forEach(function (s) { subjSel.append(el('option', { value: s.id, selected: s.id === c.subjectId }, s.name)); });
    const verified = el('input', { type: 'checkbox', checked: !!c.verified, style: 'width:20px;min-height:20px' });
    const body = el('div', {}, [
      el('div', { class: 'field' }, [el('label', {}, '회상 질문'), q]),
      el('div', { class: 'field' }, [el('label', {}, '정답 · 현출 문구'), a]),
      el('div', { class: 'field-row' }, [
        el('div', { class: 'field' }, [el('label', {}, '과목'), subjSel]),
        el('div', { class: 'field' }, [el('label', {}, '연결 쟁점'), issueInp]),
      ]),
      el('label', { class: 'row', style: 'gap:8px' }, [verified, '원문·판례 출처를 대조함']),
    ]);
    const footer = [
      !isNew ? el('button', { class: 'btn btn-danger', onclick: function () { Store.update(function (dd) { dd.cards = dd.cards.filter(function (x) { return x.id !== c.id; }); }); m.close(); ctx.refresh(); ctx.toast('삭제했습니다.'); } }, '삭제') : null,
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'),
      el('button', { class: 'btn btn-primary', onclick: save }, '저장'),
    ];
    const m = ctx.modal({ title: isNew ? '복습 카드 만들기' : '복습 카드 편집', body: body, footer: footer });
    function save() {
      if (!q.value.trim()) { ctx.toast('질문을 입력하세요.', 'warn'); return; }
      Store.update(function (dd) {
        if (isNew) dd.cards.push(Object.assign({}, c, { id: Store.id('card'), q: q.value, a: a.value, issue: issueInp.value.trim(), subjectId: subjSel.value, verified: verified.checked, status: a.value.trim() ? 'active' : 'draft', createdAt: new Date().toISOString() }));
        else { const x = dd.cards.find(function (z) { return z.id === c.id; }); Object.assign(x, { q: q.value, a: a.value, issue: issueInp.value.trim(), subjectId: subjSel.value, verified: verified.checked }); if (x.status === 'draft' && x.a.trim()) x.status = 'active'; }
      });
      m.close(); ctx.refresh(); ctx.toast('복습 카드를 저장했습니다.');
    }
  }
  function stat(label, val, color) { return el('div', {}, [el('div', { class: 'hint' }, label), el('div', { style: 'font-size:1.3rem;font-weight:800;' + (color ? 'color:' + color : '') }, val)]); }

  /* =======================================================================
     11. 대학 학업 + LearnUs 자동 동기화 (보고서 13쪽)
     ======================================================================= */
  let acadTab = 'courses';
  let noticeOnlyImportant = false;
  let _activeLearnUsModal = null;

  function isImportantNoticeTitle(title, pinned) {
    if (pinned) return true;
    return /시험|중간|기말|퀴즈|고사|휴강|보강|과제|레포트|리포트|보고서|제출|마감|연기|변경|실험|발표|성적|채점|출석|출결|필독|중요|특강|실습|프로젝트|quiz|exam|midterm|final|hw|homework|assign|project|report|lab/i.test(title || '');
  }

  function renderAcademic(root, ctx) {
    const d = Store.data();
    const unreadImp = (d.notices || []).filter(function (n) { return !n.read && n.important; }).length;
    const unsubmittedCnt = (d.assignments || []).filter(function (a) { return !a.submitted; }).length;

    const extReady = hasLearnUsExt();
    const syncHint = d.settings.lastLearnUsSyncAt
      ? '마지막 LearnUs 동기화: ' + new Date(d.settings.lastLearnUsSyncAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + (extReady ? ' · 확장 앱 연결됨' : '')
      : (extReady ? '전용 확장 앱이 연결되어 버튼 1번으로 LearnUs 과제·공지를 바로 가져옵니다.' : '비밀번호 입력 없이 브라우저에서 LearnUs 과제·공지를 불러올 수 있습니다.');

    root.append(el('header', { class: 'page-hero' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'ACADEMIC & LEARNUS'),
        el('h1', { class: 'page-title' }, '대학 학업'),
        el('p', { class: 'page-subtitle' }, '고정 수업·과제 제출·중요 공지를 정돈해 변리사 수험 시간을 예측 가능하게 보호합니다.'),
        el('div', { class: 'hint', style: 'font-size:.8rem;margin-top:6px' }, syncHint),
      ]),
      el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, [
        el('button', { class: 'btn btn-primary', onclick: function () { triggerLearnUsSync(ctx); } }, '🔄 LearnUs 자동 동기화'),
        extReady ? el('button', { class: 'btn btn-sm btn-ghost', onclick: function () { openLearnUsSyncModal(ctx); } }, '수동·안내') : null,
      ]),
    ]));

    const panel = el('div', {});
    const tabs = el('div', { class: 'tabs', role: 'tablist' });
    const tabDefs = [
      ['courses', '수강 과목 (' + d.courses.length + ')'],
      ['assignments', '과제·할일' + (unsubmittedCnt ? ' (' + unsubmittedCnt + ')' : '')],
      ['notices', '중요 공지' + (unreadImp ? ' (' + unreadImp + ')' : '')],
      ['attendance', '출결'],
    ];
    tabDefs.forEach(function (p) {
      const btn = el('button', {
        class: 'tab', role: 'tab', 'aria-selected': String(acadTab === p[0]),
        onclick: function () {
          acadTab = p[0];
          tabs.querySelectorAll('.tab').forEach(function (t) { t.setAttribute('aria-selected', String(t === btn)); });
          renderPanel();
        },
      }, p[1]);
      tabs.append(btn);
    });
    root.append(tabs, panel);
    function renderPanel() {
      panel.innerHTML = '';
      if (acadTab === 'courses') renderCourses(panel, ctx);
      else if (acadTab === 'assignments') renderAssignments(panel, ctx);
      else if (acadTab === 'notices') renderNotices(panel, ctx);
      else renderAttendance(panel, ctx);
    }
    renderPanel();
  }

  function renderCourses(root, ctx) {
    const d = Store.data();
    root.append(el('div', { class: 'section-head' }, [el('h2', {}, '수강 과목 ' + d.courses.length + '개'), el('button', { class: 'btn btn-primary', onclick: function () { openCourseEditor(null, ctx); } }, '+ 과목 추가')]));
    if (d.courses.length === 0) { root.append(el('div', { class: 'empty' }, [el('span', { class: 'emoji' }, '🎓'), el('h3', {}, '수강 과목을 등록하세요'), el('p', {}, '고정 수업 시간을 등록하면 주간 계획에서 수험 시간과 충돌을 관리합니다.')])); return; }
    const list = el('div', { class: 'list' });
    d.courses.forEach(function (c) {
      const schedStr = (c.schedule || []).map(function (s) { return WEEKDAYS[s.day] + ' ' + s.start + '~' + s.end; }).join(', ');
      list.append(el('div', { class: 'item', style: 'cursor:pointer', onclick: function () { openCourseEditor(c, ctx); } }, [
        el('span', { class: 'tag tag-acad' }, '학업'),
        el('div', { class: 'main' }, [
          el('div', { class: 'row', style: 'gap:6px;align-items:center;flex-wrap:wrap' }, [
            el('span', { class: 'title' }, c.name),
            c.code ? el('span', { class: 'hint', style: 'font-size:.78rem' }, '(' + c.code + ')') : null,
            c.progressPct != null ? el('span', { class: 'tag tag-muted', style: 'font-size:.74rem' }, '학습률 ' + c.progressPct + '%') : null,
          ]),
          el('div', { class: 'meta' }, [
            c.semester ? c.semester + ' · ' : '',
            c.credits ? c.credits + '학점' : '',
            schedStr ? ' · ' + schedStr : '',
            c.room ? ' · ' + c.room : '',
          ]),
        ]),
        c.link ? el('a', { href: c.link, target: '_blank', rel: 'noopener noreferrer', class: 'btn btn-sm', onclick: function (e) { e.stopPropagation(); } }, '강의실 ↗') : null,
      ]));
    });
    root.append(list);
  }

  function openCourseEditor(course, ctx) {
    const isNew = !course;
    const c = course ? JSON.parse(JSON.stringify(course)) : { id: null, code: '', name: '', semester: '2026-2', credits: 3, room: '', link: '', schedule: [{ day: 0, start: '09:00', end: '10:30' }] };
    const name = el('input', { type: 'text', value: c.name, placeholder: '과목명' });
    const code = el('input', { type: 'text', value: c.code || '', placeholder: '예: EEE3220' });
    const semester = el('input', { type: 'text', value: c.semester, placeholder: '예: 2026-2' });
    const credits = el('input', { type: 'number', value: c.credits, min: '0', step: '0.5' });
    const room = el('input', { type: 'text', value: c.room, placeholder: '강의실' });
    const link = el('input', { type: 'text', value: c.link, placeholder: '강의실 링크 (URL)' });
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
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '과목명'), name]), el('div', { class: 'field' }, [el('label', {}, '학정번호 (선택)'), code])]),
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '학기'), semester]), el('div', { class: 'field' }, [el('label', {}, '학점'), credits])]),
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '강의실'), room]), el('div', { class: 'field' }, [el('label', {}, '강의실 링크'), link])]),
      el('div', { class: 'field' }, [el('label', {}, '반복 수업 시간'), schedWrap, el('button', { class: 'btn btn-sm', style: 'margin-top:8px', onclick: function () { c.schedule.push({ day: 0, start: '09:00', end: '10:30' }); renderSched(); } }, '+ 시간 추가')]),
    ]);
    const footer = [
      !isNew ? el('button', { class: 'btn btn-danger', onclick: function () {
        Store.update(function (dd) {
          dd.courses = dd.courses.filter(function (x) { return x.id !== c.id; });
          const curMondayKey = dayKey(getMonday(0));
          const affectedDates = new Set();
          dd.blocks = dd.blocks.filter(function (b) {
            if (b && b.courseId === c.id && b.source === 'course' && !b.userEdited && !b.locked && b.date >= curMondayKey) {
              affectedDates.add(b.date);
              return false;
            }
            return true;
          });
          affectedDates.forEach(function (dt) { reconcileDayCommuteBlocks(dd, dt); });
        });
        m.close(); ctx.refresh(); ctx.toast('삭제했습니다.');
      } }, '삭제') : null,
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'),
      el('button', { class: 'btn btn-primary', onclick: function () {
        if (!name.value.trim()) { ctx.toast('과목명을 입력하세요.', 'warn'); return; }
        c.name = name.value.trim(); c.code = code.value.trim(); c.semester = semester.value; c.credits = clampNum(credits.value, 0, 30); c.room = room.value; c.link = link.value;
        Store.update(function (dd) {
          if (isNew) { c.id = Store.id('course'); dd.courses.push(c); }
          else Object.assign(dd.courses.find(function (x) { return x.id === c.id; }), c);

          // 이번 주 이후 시간표에서 해당 과목의 미편집 수업 블록을 갱신하고 전후 이동시간도 재조정
          const curMondayKey = dayKey(getMonday(0));
          const affectedDates = new Set();
          dd.blocks = dd.blocks.filter(function (b) {
            if (b && b.courseId === c.id && b.source === 'course' && !b.userEdited && !b.locked && b.date >= curMondayKey) {
              affectedDates.add(b.date);
              return false;
            }
            return true;
          });
          const weeksToSync = new Set([curMondayKey].concat((dd.syncedCourseWeeks || []).filter(function (wk) { return wk >= curMondayKey; })));
          weeksToSync.forEach(function (wk) {
            syncWeekClassesAndCommute(dd, weekDatesFromMonday(parseKey(wk)));
          });
          affectedDates.forEach(function (dt) { reconcileDayCommuteBlocks(dd, dt); });
        });
        m.close(); ctx.refresh(); ctx.toast('저장했습니다.');
      } }, '저장'),
    ];
    const m = ctx.modal({ title: isNew ? '수강 과목 추가' : '과목 편집', body: body, footer: footer });
  }

  function renderAssignments(root, ctx) {
    const d = Store.data();
    root.append(el('div', { class: 'section-head' }, [
      el('h2', {}, '과제·할일 ' + d.assignments.length + '개'),
      el('div', { class: 'row', style: 'gap:8px' }, [
        el('button', { class: 'btn btn-sm', onclick: function () { triggerLearnUsSync(ctx); } }, '🔄 LearnUs 불러오기'),
        el('button', { class: 'btn btn-primary', onclick: function () { openAssignmentEditor(null, ctx); } }, '+ 과제 추가'),
      ]),
    ]));
    root.append(el('p', { class: 'hint', style: 'margin-top:-8px;margin-bottom:16px' }, '작성 완료를 제출 완료로 처리하지 않습니다. 홈페이지가 학교 시스템에 자동 제출하지 않습니다.'));
    if (d.assignments.length === 0) {
      root.append(el('div', { class: 'empty' }, [
        el('span', { class: 'emoji' }, '📨'),
        el('h3', {}, '등록된 과제가 없습니다'),
        el('p', {}, '상단의 "LearnUs 자동 동기화"로 과제와 동영상 출석 마감을 한 번에 불러오거나 직접 추가하세요.'),
      ]));
      return;
    }
    const nowLocal = toLocalIso(new Date());
    const sorted = d.assignments.slice().sort(function (a, b) {
      if (!!a.submitted !== !!b.submitted) return a.submitted ? 1 : -1;
      return (a.due || '9999').localeCompare(b.due || '9999');
    });
    const list = el('div', { class: 'list' });
    sorted.forEach(function (a) {
      const course = d.courses.find(function (c) { return c.id === a.courseId; });
      const courseLabel = (course && course.name) || a.courseName || '';
      const overdue = !a.submitted && a.due && a.due < nowLocal;
      const dueStr = a.due ? (fmtDate(a.due) + (a.due.length >= 16 ? ' ' + a.due.slice(11, 16) : '')) : '마감 없음';
      const item = el('div', { class: 'item' + (a.submitted ? ' done' : '') }, [
        el('div', { class: 'main', style: 'cursor:pointer', onclick: function () { openAssignmentEditor(a, ctx); } }, [
          el('div', { class: 'row', style: 'gap:6px;align-items:center;flex-wrap:wrap' }, [
            courseLabel ? el('span', { class: 'tag tag-acad' }, courseLabel) : null,
            overdue ? el('span', { class: 'tag tag-warn' }, '마감 지남') : null,
            el('span', { class: 'title' }, a.title),
          ]),
          el('div', { class: 'meta' }, [
            '마감 ' + dueStr,
            a.written ? ' · 작성완료' : '',
            a.submitted ? ' · 제출완료' : ' · 미제출',
          ]),
        ]),
        el('button', { class: 'btn btn-sm' + (a.written ? ' btn-primary' : ''), onclick: function () { Store.update(function (dd) { const x = dd.assignments.find(function (z) { return z.id === a.id; }); x.written = !x.written; }); ctx.refresh(); } }, a.written ? '작성✓' : '작성'),
        el('button', { class: 'btn btn-sm' + (a.submitted ? ' btn-primary' : ''), onclick: function () { Store.update(function (dd) { const x = dd.assignments.find(function (z) { return z.id === a.id; }); x.submitted = !x.submitted; x.submittedAt = x.submitted ? new Date().toISOString() : null; }); ctx.refresh(); } }, a.submitted ? '제출✓' : '제출 확인'),
        a.link ? el('a', { href: a.link, target: '_blank', rel: 'noopener noreferrer', class: 'btn btn-sm' }, '열기 ↗') : null,
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

  function renderNotices(root, ctx) {
    const d = Store.data();
    const all = (d.notices || []).slice().sort(function (a, b) {
      if (!!a.read !== !!b.read) return a.read ? 1 : -1;
      if (!!a.important !== !!b.important) return a.important ? -1 : 1;
      return (b.date || '').localeCompare(a.date || '');
    });
    const filtered = noticeOnlyImportant ? all.filter(function (n) { return n.important || !n.read; }) : all;

    root.append(el('div', { class: 'section-head' }, [
      el('h2', {}, '공지사항 ' + filtered.length + '건'),
      el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' }, [
        el('button', {
          class: 'btn btn-sm' + (noticeOnlyImportant ? ' btn-primary' : ''),
          onclick: function () { noticeOnlyImportant = !noticeOnlyImportant; ctx.refresh(); },
        }, noticeOnlyImportant ? '중요·미확인만 보는 중' : '중요·미확인만 필터'),
        all.some(function (n) { return !n.read; })
          ? el('button', { class: 'btn btn-sm', onclick: function () { Store.update(function (dd) { (dd.notices || []).forEach(function (n) { n.read = true; }); }); ctx.refresh(); ctx.toast('모든 공지를 확인 처리했습니다.'); } }, '모두 읽음')
          : null,
        el('button', { class: 'btn btn-primary btn-sm', onclick: function () { openNoticeEditor(null, ctx); } }, '+ 공지 메모 추가'),
      ]),
    ]));

    if (all.length === 0) {
      root.append(el('div', { class: 'empty' }, [
        el('span', { class: 'emoji' }, '📢'),
        el('h3', {}, '아직 불러온 공지사항이 없습니다'),
        el('p', {}, '상단의 "🔄 LearnUs 자동 동기화" 버튼을 눌러 모든 수강 강좌의 최신 공지사항과 시험·과제 안내를 한 번에 가져오세요.'),
        el('button', { class: 'btn btn-primary', onclick: function () { triggerLearnUsSync(ctx); } }, '🔄 LearnUs에서 공지·과제 가져오기'),
      ]));
      return;
    }

    const list = el('div', { class: 'list' });
    filtered.forEach(function (n) {
      const course = d.courses.find(function (c) { return c.id === n.courseId; });
      const cLabel = (course && course.name) || n.courseName || '일반';
      list.append(el('div', { class: 'item' + (n.read ? ' done' : '') }, [
        el('div', { class: 'main', style: 'cursor:pointer', onclick: function () { openNoticeEditor(n, ctx); } }, [
          el('div', { class: 'row', style: 'gap:6px;align-items:center;flex-wrap:wrap' }, [
            n.important ? el('span', { class: 'tag tag-warn' }, '중요') : null,
            el('span', { class: 'tag tag-acad' }, cLabel),
            el('span', { class: 'title' }, n.title),
          ]),
          el('div', { class: 'meta' }, [
            n.date ? n.date : '',
            n.body ? ' · ' + n.body.slice(0, 60) + (n.body.length > 60 ? '…' : '') : '',
          ]),
        ]),
        el('button', {
          class: 'btn btn-sm' + (n.read ? '' : ' btn-primary'),
          onclick: function () {
            Store.update(function (dd) {
              const x = (dd.notices || []).find(function (z) { return z.id === n.id; });
              if (x) x.read = !x.read;
            });
            ctx.refresh();
          },
        }, n.read ? '읽음✓' : '확인'),
        n.url ? el('a', {
          href: n.url, target: '_blank', rel: 'noopener noreferrer', class: 'btn btn-sm',
          onclick: function () {
            if (!n.read) {
              Store.update(function (dd) {
                const x = (dd.notices || []).find(function (z) { return z.id === n.id; });
                if (x) x.read = true;
              });
              setTimeout(function () { ctx.refresh(); }, 200);
            }
          },
        }, '원문 ↗') : null,
      ]));
    });
    root.append(list);
  }

  function openNoticeEditor(notice, ctx) {
    const d = Store.data();
    const isNew = !notice;
    const n = notice ? Object.assign({}, notice) : { id: null, title: '', courseId: (d.courses[0] && d.courses[0].id) || '', courseName: '', date: todayKey(), important: true, read: false, url: '', body: '' };
    const title = el('input', { type: 'text', value: n.title, placeholder: '공지 제목 (예: 중간고사 범위 및 강의실 안내)' });
    const courseSel = el('select', {});
    courseSel.append(el('option', { value: '' }, n.courseName ? n.courseName : '(과목 선택)'));
    d.courses.forEach(function (c) { courseSel.append(el('option', { value: c.id, selected: c.id === n.courseId }, c.name)); });
    const dateInp = el('input', { type: 'date', value: (n.date || '').slice(0, 10) || todayKey() });
    const impCb = el('input', { type: 'checkbox', checked: !!n.important, style: 'width:20px;min-height:20px' });
    const urlInp = el('input', { type: 'text', value: n.url || '', placeholder: 'LearnUs 공지 URL (선택)' });
    const bodyInp = el('textarea', { rows: '4', placeholder: '중요 내용 메모 (시험 일정, 제출 방식 등)' }, n.body || '');

    const body = el('div', {}, [
      el('div', { class: 'field' }, [el('label', {}, '공지 제목'), title]),
      el('div', { class: 'field-row' }, [el('div', { class: 'field' }, [el('label', {}, '과목'), courseSel]), el('div', { class: 'field' }, [el('label', {}, '공지일'), dateInp])]),
      el('label', { class: 'row', style: 'gap:8px;margin:8px 0 12px;cursor:pointer' }, [impCb, '중요 공지로 표시 (홈 화면 알림 연동)']),
      el('div', { class: 'field' }, [el('label', {}, '메모'), bodyInp]),
      el('div', { class: 'field' }, [el('label', {}, '원문 링크'), urlInp, n.url ? el('p', { class: 'hint' }, el('a', { href: n.url, target: '_blank', rel: 'noopener noreferrer' }, 'LearnUs 원문 열기 ↗')) : null]),
    ]);
    const footer = [
      !isNew ? el('button', { class: 'btn btn-danger', onclick: function () { Store.update(function (dd) { dd.notices = (dd.notices || []).filter(function (x) { return x.id !== n.id; }); }); m.close(); ctx.refresh(); ctx.toast('공지를 삭제했습니다.'); } }, '삭제') : null,
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn', onclick: function () { m.close(); } }, '취소'),
      el('button', { class: 'btn btn-primary', onclick: function () {
        if (!title.value.trim()) { ctx.toast('공지 제목을 입력하세요.', 'warn'); return; }
        const pickedCourse = d.courses.find(function (c) { return c.id === courseSel.value; });
        const updated = Object.assign({}, n, {
          title: title.value.trim(),
          courseId: courseSel.value,
          courseName: pickedCourse ? pickedCourse.name : (n.courseName || ''),
          date: dateInp.value || todayKey(),
          important: impCb.checked,
          url: urlInp.value.trim(),
          body: bodyInp.value.trim(),
        });
        Store.update(function (dd) {
          if (!Array.isArray(dd.notices)) dd.notices = [];
          if (isNew) { updated.id = Store.id('ntc'); dd.notices.push(updated); }
          else {
            const target = dd.notices.find(function (x) { return x.id === n.id; });
            if (target) Object.assign(target, updated);
          }
        });
        m.close(); ctx.refresh(); ctx.toast('저장했습니다.');
      } }, '저장'),
    ];
    const m = ctx.modal({ title: isNew ? '공지 메모 추가' : '공지 상세 / 편집', body: body, footer: footer });
  }

  /* LearnUs 브라우저 탭 내부에서 실행되는 수집기 함수 (비밀번호 불필요 · 동일 출처 세션 활용) */
  function __learnUsCollectorMain(TARGET_ORIGIN) {
    (async function () {
      if (location.hostname.indexOf('learnus.org') < 0) {
        if (!location.hostname || location.href.indexOf('about:blank') === 0) {
          var selfCode = 'void((' + __learnUsCollectorMain.toString() + ')(' + JSON.stringify(TARGET_ORIGIN || 'https://study-space-2027.netlify.app') + '));';
          document.body.style.cssText = 'margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f7f6;font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;color:#1b2420;padding:24px;box-sizing:border-box';
          document.body.innerHTML = '';
          var card = document.createElement('div');
          card.style.cssText = 'max-width:540px;width:100%;background:#fff;border:2px solid #234B3F;border-radius:16px;padding:26px;box-shadow:0 12px 36px rgba(0,0,0,.12);line-height:1.65';
          card.innerHTML = '<div style="font-size:18px;font-weight:800;color:#234B3F;margin-bottom:8px">💡 북마크가 빈 새 탭(about:blank)에서 열렸습니다</div>'
            + '<p style="margin:0 0 14px;font-size:14px;color:#44524c">네이버 웨일 등 브라우저에서 북마크 클릭 시 <strong>새 탭으로 열기</strong>가 작동하면 LearnUs 탭 대신 빈 탭에서 코드가 실행됩니다. 아래 버튼을 누르면 10초 만에 바로 해결됩니다!</p>'
            + '<ol style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#2a3631">'
            + '<li>아래 <strong>📋 동기화 코드 복사하기</strong> 버튼을 클릭합니다.</li>'
            + '<li>바로 옆에 열려 있는 <strong>LearnUs YONSEI</strong> 탭으로 이동해 키보드 <strong>F12</strong> (또는 <strong>Ctrl + Shift + J</strong>)를 누릅니다.</li>'
            + '<li><strong>Console(콘솔)</strong> 칸에 붙여넣기(<strong>Ctrl + V</strong>) 후 <strong>Enter</strong>를 누르면 즉시 동기화됩니다!<br><span style="font-size:12.5px;color:#62706a">(처음 붙여넣을 때 경고가 뜨면 <code>allow pasting</code> 또는 <code>붙여넣기 허용</code> 입력 후 Enter)</span></li>'
            + '</ol>';
          var cpBtn = document.createElement('button');
          cpBtn.textContent = '📋 동기화 코드 복사하기';
          cpBtn.style.cssText = 'width:100%;padding:12px 16px;border:none;border-radius:10px;background:#234B3F;color:#fff;font-size:15px;font-weight:700;cursor:pointer';
          cpBtn.onclick = async function () {
            try {
              await navigator.clipboard.writeText(selfCode);
              cpBtn.textContent = '✅ 복사 완료! 이제 LearnUs 탭에서 F12 → Console에 붙여넣으세요';
              cpBtn.style.background = '#1c6b4a';
            } catch (e) {
              window.prompt('아래 코드를 복사(Ctrl+C)하세요:', selfCode);
            }
          };
          card.appendChild(cpBtn);
          document.body.appendChild(card);
          return;
        }
        alert('먼저 로그인된 연세 LearnUs(https://ys.learnus.org/) 탭에서 실행해 주세요!');
        return;
      }

      var oldBox = document.getElementById('__sh_sync_box');
      if (oldBox) oldBox.remove();
      var box = document.createElement('div');
      box.id = '__sh_sync_box';
      box.style.cssText = 'position:fixed;right:20px;top:20px;z-index:2147483647;width:360px;max-width:92vw;background:#fff;color:#1b2420;border:2px solid #234B3F;border-radius:14px;padding:16px;box-shadow:0 12px 36px rgba(0,0,0,.25);font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;font-size:14px;line-height:1.5';
      var titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-weight:800;font-size:15px;color:#234B3F;margin-bottom:6px';
      titleEl.textContent = '🔄 나의 수험 공간 · LearnUs 동기화';
      var statusEl = document.createElement('div');
      statusEl.style.cssText = 'color:#44524c;font-size:13px;margin-bottom:10px';
      statusEl.textContent = '1/3 강좌 목록 확인 중…';
      var actionWrap = document.createElement('div');
      actionWrap.style.cssText = 'display:flex;flex-direction:column;gap:8px';
      box.appendChild(titleEl);
      box.appendChild(statusEl);
      box.appendChild(actionWrap);
      document.body.appendChild(box);

      function pad2(n) { return String(n).padStart(2, '0'); }
      function tsToLocalIso(sec) {
        var dt = new Date(Number(sec) * 1000);
        if (isNaN(dt.getTime())) return '';
        return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate()) + 'T' + pad2(dt.getHours()) + ':' + pad2(dt.getMinutes()) + ':00';
      }
      function parseDateStr(str, withTime) {
        if (!str) return '';
        var m = /(20\d{2})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/.exec(str);
        var y, mo, da;
        if (m) { y = m[1]; mo = pad2(m[2]); da = pad2(m[3]); }
        else {
          var m2 = /(?:^|\D)(\d{2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})(?:\D|$)/.exec(str);
          if (!m2) return '';
          y = '20' + m2[1]; mo = pad2(m2[2]); da = pad2(m2[3]);
        }
        if (!withTime) return y + '-' + mo + '-' + da;
        var tm = /(\d{1,2})\s*:\s*(\d{2})/.exec(str);
        var hh = tm ? pad2(tm[1]) : '23';
        var mm = tm ? pad2(tm[2]) : '59';
        return y + '-' + mo + '-' + da + 'T' + hh + ':' + mm + ':00';
      }
      async function fetchDoc(url) {
        var r = await fetch(url, { credentials: 'include' });
        var html = await r.text();
        return new DOMParser().parseFromString(html, 'text/html');
      }
      function cleanText(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

      try {
        /* 1) 대시보드에서 수강 강좌 추출 */
        var dashDoc = (location.pathname === '/' || location.pathname === '/index.php') ? document : await fetchDoc('https://ys.learnus.org/');
        var courseMap = {};
        var courses = [];
        var links = dashDoc.querySelectorAll('a[href*="/course/view.php?id="]');
        for (var i = 0; i < links.length; i++) {
          var a = links[i];
          var u;
          try { u = new URL(a.getAttribute('href'), location.origin); } catch (e) { continue; }
          var cid = u.searchParams.get('id');
          if (!cid || cid === '1' || courseMap[cid]) continue;
          var card = a.closest('li, .course_box, .course-box, .course-item, .box') || a.parentElement;
          var heading = a.querySelector('.course-title h3, .course-name, h3, h4, .fullname') || (card && card.querySelector('.course-title h3, .course-name, h3, h4, .fullname'));
          var rawName = cleanText(heading ? heading.textContent : a.textContent);
          if (!rawName || rawName.length < 2) continue;
          rawName = rawName.replace(/^NEW\s+/i, '').replace(/\s*[\[(][12]학기[\])]\s*$/g, '').trim();
          var cardText = cleanText(card ? card.textContent : '');
          var isNonCredit = /비교과/.test(cardText) || /폭력예방|법정의무|윤리교육/.test(rawName);
          var codeMatch = /\(([A-Z]{2,4}\d{4}[^)]*)\)/.exec(rawName) || /([A-Z]{2,4}\d{4}[.\w-]*)/.exec(cardText);
          var progMatch = /학습률\s*(\d+(?:\.\d+)?)\s*%/.exec(cardText);
          var cleanCourseTitle = rawName.replace(/\s*\([A-Z]{2,4}\d{4}.*$/, '').trim() || rawName;
          var cObj = {
            luId: cid,
            name: cleanCourseTitle,
            fullTitle: rawName,
            code: codeMatch ? codeMatch[1].split('.')[0] : '',
            url: 'https://ys.learnus.org/course/view.php?id=' + cid,
            progressPct: progMatch ? Number(progMatch[1]) : null,
            isNonCredit: isNonCredit
          };
          courseMap[cid] = cObj;
          courses.push(cObj);
        }

        /* 2) 예정된 일정·과제·동영상 출석 마감 추출 (Moodle AJAX + 캘린더 페이지) */
        statusEl.textContent = '2/3 예정된 과제·진도 마감 조회 중…';
        var asgMap = {};
        function addAsg(item) {
          if (!item || !item.title) return;
          if (/Progress\s*start|진도\s*시작|출석\s*시작/i.test(item.title)) return;
          var t = item.title;
          if (/Progress\s*stop/i.test(t)) {
            t = '[동영상 마감] ' + t.replace(/\s*:\s*Progress\s*stop/i, '').trim();
          }
          t = t.replace(/\s+(제출 마감|종료|마감일|is due)$/i, '').trim();
          item.title = t;
          var key = item.externalId || (item.luCourseId + '::' + t);
          if (!asgMap[key]) asgMap[key] = item;
          else {
            if (!asgMap[key].due && item.due) asgMap[key].due = item.due;
            if (item.submitted) asgMap[key].submitted = true;
            if (!asgMap[key].url && item.url) asgMap[key].url = item.url;
          }
        }

        var sesskey = (window.M && window.M.cfg && window.M.cfg.sesskey) ? window.M.cfg.sesskey : '';
        if (!sesskey) {
          var skMatch = /"sesskey"\s*:\s*"([^"]+)"/.exec(dashDoc.documentElement.innerHTML);
          if (skMatch) sesskey = skMatch[1];
        }
        if (sesskey) {
          var nowSec = Math.floor(Date.now() / 1000) - 2 * 86400;
          try {
            var ajaxRes = await fetch('https://ys.learnus.org/lib/ajax/service.php?sesskey=' + encodeURIComponent(sesskey) + '&info=core_calendar_get_action_events_by_timesort', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify([{ index: 0, methodname: 'core_calendar_get_action_events_by_timesort', args: { timesortfrom: nowSec, limitnum: 50 } }])
            });
            var ajaxJson = await ajaxRes.json();
            var evs = (ajaxJson && ajaxJson[0] && ajaxJson[0].data && ajaxJson[0].data.events) || [];
            for (var eIdx = 0; eIdx < evs.length; eIdx++) {
              var ev = evs[eIdx];
              var evCourseId = ev.course && ev.course.id ? String(ev.course.id) : '';
              var evCourseName = (ev.course && ev.course.fullname) ? cleanText(ev.course.fullname) : ((courseMap[evCourseId] && courseMap[evCourseId].name) || '');
              var modIdMatch = /\/mod\/(?:assign|quiz|vod|ubfile)\/view\.php\?id=(\d+)/.exec((ev.url || '') + ' ' + ((ev.action && ev.action.url) || ''));
              addAsg({
                externalId: modIdMatch ? ('lu-mod-' + modIdMatch[1]) : ('lu-ev-' + ev.id),
                luCourseId: evCourseId,
                courseName: evCourseName,
                title: cleanText(ev.name || ev.activityname || ''),
                due: ev.timestart ? tsToLocalIso(ev.timestart) : '',
                url: (ev.action && ev.action.url) || ev.url || (evCourseId ? 'https://ys.learnus.org/course/view.php?id=' + evCourseId : ''),
                submitted: false
              });
            }
          } catch (e) {}

          try {
            var upRes = await fetch('https://ys.learnus.org/lib/ajax/service.php?sesskey=' + encodeURIComponent(sesskey) + '&info=core_calendar_get_calendar_upcoming_view', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify([{ index: 0, methodname: 'core_calendar_get_calendar_upcoming_view', args: { courseid: 1, categoryid: 0 } }])
            });
            var upJson = await upRes.json();
            var uevs = (upJson && upJson[0] && upJson[0].data && upJson[0].data.events) || [];
            for (var uIdx = 0; uIdx < uevs.length; uIdx++) {
              var uev = uevs[uIdx];
              var uCid = uev.course && uev.course.id ? String(uev.course.id) : '';
              var uModMatch = /\/mod\/(?:assign|quiz|vod|ubfile)\/view\.php\?id=(\d+)/.exec((uev.viewurl || '') + ' ' + (uev.url || ''));
              addAsg({
                externalId: uModMatch ? ('lu-mod-' + uModMatch[1]) : ('lu-ev-' + uev.id),
                luCourseId: uCid,
                courseName: (uev.course && uev.course.fullname) ? cleanText(uev.course.fullname) : ((courseMap[uCid] && courseMap[uCid].name) || ''),
                title: cleanText(uev.name || ''),
                due: uev.timestart ? tsToLocalIso(uev.timestart) : '',
                url: uev.url || uev.viewurl || (uCid ? 'https://ys.learnus.org/course/view.php?id=' + uCid : ''),
                submitted: false
              });
            }
          } catch (e) {}
        }

        try {
          var calDoc = await fetchDoc('https://ys.learnus.org/calendar/view.php?view=upcoming');
          var evNodes = calDoc.querySelectorAll('[data-type="event"], .event[data-event-id], .upcoming-event-list li, .cal_courses_flt');
          for (var cIdx = 0; cIdx < evNodes.length; cIdx++) {
            var node = evNodes[cIdx];
            var eid = node.getAttribute('data-event-id') || '';
            var tNode = node.querySelector('h3, .name, .event-title, a[href*="/mod/"]');
            if (!tNode) continue;
            var cLink = node.querySelector('a[href*="/course/view.php?id="]');
            var mLink = node.querySelector('a[href*="/mod/"]');
            var timeLink = node.querySelector('a[href*="time="]');
            var nCid = '';
            if (cLink) { try { nCid = new URL(cLink.getAttribute('href'), location.origin).searchParams.get('id') || ''; } catch (e) {} }
            var dueIso = '';
            if (timeLink) {
              try {
                var tsVal = new URL(timeLink.getAttribute('href'), location.origin).searchParams.get('time');
                if (tsVal) dueIso = tsToLocalIso(tsVal);
              } catch (e) {}
            }
            if (!dueIso) dueIso = parseDateStr(node.textContent, true);
            var modHref = mLink ? new URL(mLink.getAttribute('href'), location.origin).href : '';
            var mMatch = /\/mod\/[^/]+\/view\.php\?id=(\d+)/.exec(modHref);
            addAsg({
              externalId: mMatch ? ('lu-mod-' + mMatch[1]) : ('lu-calhtml-' + (eid || cIdx)),
              luCourseId: nCid,
              courseName: cLink ? cleanText(cLink.textContent) : ((courseMap[nCid] && courseMap[nCid].name) || ''),
              title: cleanText(tNode.textContent),
              due: dueIso,
              url: modHref || (nCid ? 'https://ys.learnus.org/course/view.php?id=' + nCid : ''),
              submitted: false
            });
          }
        } catch (e) {}

        /* 3) 강좌별 과제 제출 현황 및 공지사항 게시판 스캔 */
        var ntcMap = {};
        var cutoffPastSub = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 19);
        var cutoffPastAll = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 19);

        for (var ci = 0; ci < courses.length; ci++) {
          var crs = courses[ci];
          statusEl.textContent = '3/3 강좌별 과제·공지 확인 중 (' + (ci + 1) + '/' + courses.length + ') · ' + crs.name;

          /* 3-A: 강좌 과제 목록 요약 페이지 (/mod/assign/index.php) */
          try {
            var asgDoc = await fetchDoc('https://ys.learnus.org/mod/assign/index.php?id=' + crs.luId);
            var rows = asgDoc.querySelectorAll('table tbody tr');
            for (var ri = 0; ri < rows.length; ri++) {
              var tr = rows[ri];
              var aLink = tr.querySelector('a[href*="/mod/assign/view.php?id="], a[href*="view.php?id="]');
              if (!aLink) continue;
              var aUrl = new URL(aLink.getAttribute('href'), 'https://ys.learnus.org/mod/assign/').href;
              var modId = new URL(aUrl).searchParams.get('id') || '';
              var rowTxt = cleanText(tr.textContent);
              var isSub = /제출\s*완료|제출됨|Submitted\s*for\s*grading|채점\s*완료|Graded/i.test(rowTxt);
              var tds = tr.querySelectorAll('td');
              var dueFound = '';
              for (var ti = 0; ti < tds.length; ti++) {
                var cand = parseDateStr(tds[ti].textContent, true);
                if (cand) dueFound = cand;
              }
              if (dueFound && isSub && dueFound < cutoffPastSub) continue;
              if (dueFound && dueFound < cutoffPastAll) continue;
              addAsg({
                externalId: modId ? ('lu-mod-' + modId) : ('lu-asgrow-' + crs.luId + '-' + ri),
                luCourseId: crs.luId,
                courseName: crs.name,
                title: cleanText(aLink.textContent),
                due: dueFound,
                url: aUrl,
                submitted: isSub
              });
            }
          } catch (e) {}

          /* 3-B: 강좌 메인 페이지에서 공지사항 게시판 탐색 및 최신 공지 추출 */
          try {
            var cDoc = await fetchDoc(crs.url);
            var boardLinks = cDoc.querySelectorAll('a[href*="/mod/ubboard/view.php?id="], a[href*="/mod/forum/view.php?id="]');
            var targetBoards = [];
            var fallbackBoard = null;
            for (var bi = 0; bi < boardLinks.length; bi++) {
              var bl = boardLinks[bi];
              var bHref = new URL(bl.getAttribute('href'), location.origin).href;
              if (targetBoards.indexOf(bHref) >= 0) continue;
              var instEl = bl.querySelector('.instancename') || bl;
              var bName = cleanText(instEl.textContent);
              if (/공지|알림|안내|notice|announce|news/i.test(bName)) {
                targetBoards.push(bHref);
              } else if (!fallbackBoard && !/질의|질문|Q&A|자유|토론|팀|조별/i.test(bName)) {
                fallbackBoard = bHref;
              }
            }
            if (targetBoards.length === 0 && fallbackBoard) targetBoards.push(fallbackBoard);

            for (var tbi = 0; tbi < Math.min(2, targetBoards.length); tbi++) {
              var bUrl = targetBoards[tbi];
              var bDoc = await fetchDoc(bUrl);
              var bRows = bDoc.querySelectorAll('table tbody tr');
              var countInBoard = 0;
              for (var bri = 0; bri < bRows.length && countInBoard < 8; bri++) {
                var btr = bRows[bri];
                var artA = btr.querySelector('a[href*="article.php"], a[href*="discuss.php"]');
                if (!artA) continue;
                var artTitle = cleanText(artA.textContent).replace(/^NEW\s+/i, '').trim();
                if (!artTitle || /등록된 게시물이 없습니다|게시글이 없습니다/i.test(artTitle)) continue;
                var artHref = new URL(artA.getAttribute('href'), bUrl).href;
                var artUrlObj = new URL(artHref);
                var artId = artUrlObj.searchParams.get('bwid') || artUrlObj.searchParams.get('d') || String(bri);
                var bCells = btr.querySelectorAll('td');
                var firstCellTxt = bCells.length ? cleanText(bCells[0].textContent) : '';
                var hasNoticeBadge = /공지|notice|중요|필독/i.test(firstCellTxt) || (bCells.length > 0 && !!bCells[0].querySelector('img, .badge, i') && !/^\d+$/.test(firstCellTxt));
                var nDate = '';
                for (var bci = bCells.length - 1; bci >= 0; bci--) {
                  var dCand = parseDateStr(bCells[bci].textContent, false);
                  if (dCand) { nDate = dCand; break; }
                }
                var nKey = 'lu-ntc-' + crs.luId + '-' + artId;
                if (!ntcMap[nKey]) {
                  ntcMap[nKey] = {
                    externalId: nKey,
                    luCourseId: crs.luId,
                    courseName: crs.name,
                    title: artTitle,
                    date: nDate || new Date().toISOString().slice(0, 10),
                    pinned: hasNoticeBadge,
                    url: artHref
                  };
                  countInBoard++;
                }
              }
            }
          } catch (e) {}
        }

        var asgList = Object.keys(asgMap).map(function (k) { return asgMap[k]; });
        var ntcList = Object.keys(ntcMap).map(function (k) { return ntcMap[k]; });
        var payload = {
          app: 'patent-study-home-learnus',
          syncedAt: new Date().toISOString(),
          courses: courses,
          assignments: asgList,
          notices: ntcList
        };
        var jsonStr = JSON.stringify(payload);
        try { await navigator.clipboard.writeText(jsonStr); } catch (e) {}

        var acked = false;
        window.addEventListener('message', function (ev) {
          if (ev.data && ev.data.type === 'STUDY_HOME_SYNC_ACK') {
            acked = true;
            statusEl.innerHTML = '<strong style="color:#1c6b4a">✅ 내 수험 공간에 자동 반영 완료!</strong><br>강좌 ' + courses.length + '개 · 과제/마감 ' + asgList.length + '건 · 공지 ' + ntcList.length + '건';
          }
        });

        /* opener가 살아 있으면 즉시 자동 전송 */
        if (window.opener && !window.opener.closed && TARGET_ORIGIN) {
          try {
            window.opener.postMessage({ type: 'STUDY_HOME_LEARNUS_SYNC', payload: payload }, TARGET_ORIGIN);
          } catch (e) {}
        }

        statusEl.innerHTML = '수집 완료: <strong>강좌 ' + courses.length + '개 · 과제/마감 ' + asgList.length + '건 · 공지 ' + ntcList.length + '건</strong><br><span style="font-size:12px;color:#5c6b64">아래 버튼을 누르면 내 수험 공간으로 바로 전송됩니다.</span>';

        var sendBtn = document.createElement('button');
        sendBtn.textContent = '🚀 내 수험 공간으로 보내기';
        sendBtn.style.cssText = 'padding:10px 14px;border:none;border-radius:9px;background:#234B3F;color:#fff;font-weight:700;cursor:pointer;font-size:14px';
        sendBtn.onclick = function () {
          var targetUrl = (TARGET_ORIGIN || 'https://study-space-2027.netlify.app') + '/#academic';
          var w = (window.opener && !window.opener.closed) ? window.opener : window.open(targetUrl, 'study_home_sync_target');
          if (!w) {
            alert('팝업이 차단되었습니다. 아래 "데이터 복사" 버튼을 눌러 홈페이지의 붙여넣기 칸에 넣어 주세요.');
            return;
          }
          try { w.focus(); } catch (e) {}
          var tries = 0;
          var iv = setInterval(function () {
            tries++;
            if (acked || tries > 18) { clearInterval(iv); return; }
            try { w.postMessage({ type: 'STUDY_HOME_LEARNUS_SYNC', payload: payload }, TARGET_ORIGIN || '*'); } catch (e) {}
          }, 350);
        };

        var copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 데이터 복사 (수동 붙여넣기용)';
        copyBtn.style.cssText = 'padding:8px 12px;border:1px solid #cdd6d1;border-radius:8px;background:#f5f7f6;color:#234B3F;font-weight:600;cursor:pointer;font-size:12.5px';
        copyBtn.onclick = async function () {
          try {
            await navigator.clipboard.writeText(jsonStr);
            copyBtn.textContent = '✅ 복사 완료! 홈페이지 동기화 창에 붙여넣으세요';
          } catch (e) {
            window.prompt('아래 텍스트를 복사(Ctrl+C)하세요:', jsonStr);
          }
        };

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '닫기';
        closeBtn.style.cssText = 'padding:6px;border:none;background:transparent;color:#6c7a73;cursor:pointer;font-size:12px';
        closeBtn.onclick = function () { box.remove(); };

        actionWrap.appendChild(sendBtn);
        actionWrap.appendChild(copyBtn);
        actionWrap.appendChild(closeBtn);
      } catch (err) {
        statusEl.textContent = '오류가 발생했습니다: ' + (err && err.message ? err.message : String(err));
      }
    })();
  }

  function buildLearnUsSyncScript() {
    const origin = (typeof window !== 'undefined' && window.location && /^https?:/.test(window.location.protocol))
      ? window.location.origin
      : 'https://study-space-2027.netlify.app';
    return 'void((' + __learnUsCollectorMain.toString() + ')(' + JSON.stringify(origin) + '));';
  }

  function matchCourseForLearnUs(courses, luCourseId, courseName, codeHint) {
    const norm = function (s) { return String(s || '').replace(/\s+/g, '').replace(/\(2학기\)|\[2학기\]/g, '').toLowerCase(); };
    if (luCourseId) {
      const byLu = courses.find(function (c) { return c.luId && String(c.luId) === String(luCourseId); });
      if (byLu) return byLu;
    }
    const extractedCode = codeHint || ((/\(([A-Z]{2,4}\d{4})/.exec(courseName || '') || [])[1]) || '';
    if (extractedCode) {
      const prefix = extractedCode.slice(0, 7).toUpperCase();
      const byCode = courses.find(function (c) { return c.code && c.code.toUpperCase().indexOf(prefix) === 0; });
      if (byCode) return byCode;
    }
    const targetNorm = norm((courseName || '').replace(/\([A-Z]{2,4}\d{4}.*$/, ''));
    if (targetNorm) {
      const byName = courses.find(function (c) {
        const cn = norm(c.name);
        return cn && (cn === targetNorm || targetNorm.indexOf(cn) >= 0 || cn.indexOf(targetNorm) >= 0);
      });
      if (byName) return byName;
      if (/공학물리/.test(targetNorm)) {
        const phys = courses.find(function (c) { return /공학물리/.test(c.name); });
        if (phys) return phys;
      }
    }
    return null;
  }

  function applyLearnUsSyncPayload(payload) {
    if (!payload || payload.app !== 'patent-study-home-learnus') {
      throw new Error('올바른 LearnUs 동기화 데이터가 아닙니다.');
    }
    let addedAsg = 0, updatedAsg = 0, addedNtc = 0, matchedCrs = 0;

    Store.update(function (dd) {
      if (!Array.isArray(dd.courses)) dd.courses = [];
      if (!Array.isArray(dd.assignments)) dd.assignments = [];
      if (!Array.isArray(dd.notices)) dd.notices = [];

      /* 1) 강좌 매칭 및 링크·학습률 업데이트 (신규 정규 교과목이면 추가) */
      (payload.courses || []).forEach(function (lc) {
        const found = matchCourseForLearnUs(dd.courses, lc.luId, lc.fullTitle || lc.name, lc.code);
        if (found) {
          if (!/실험실/.test(lc.name || '') || !found.luId) found.luId = lc.luId;
          if (lc.url && (!found.link || found.link.indexOf('learnus.org') >= 0)) found.link = lc.url;
          if (lc.progressPct != null && !/실험실/.test(lc.name || '')) found.progressPct = lc.progressPct;
          if (lc.code && !found.code) found.code = lc.code;
          matchedCrs++;
        } else if (!lc.isNonCredit && lc.name && !/실험실/.test(lc.name)) {
          dd.courses.push({
            id: 'course-lu-' + lc.luId,
            luId: lc.luId,
            code: lc.code || '',
            name: lc.name,
            semester: '2026-2',
            credits: 3,
            room: '',
            link: lc.url || '',
            progressPct: lc.progressPct,
            schedule: [],
          });
          matchedCrs++;
        }
      });

      /* 초기 임시 시드 마감 항목은 실제 LearnUs 일정이 들어오면 중복 방지를 위해 정리 */
      if ((payload.assignments || []).length > 0) {
        dd.assignments = dd.assignments.filter(function (a) {
          return a.id !== 'lu-init-semi-ch5' && a.id !== 'lu-init-chapel-w9';
        });
      }

      /* 2) 과제 및 동영상 마감 병합 */
      (payload.assignments || []).forEach(function (la) {
        if (!la || !la.title) return;
        const matched = matchCourseForLearnUs(dd.courses, la.luCourseId, la.courseName, '');
        const cleanCourseName = matched ? matched.name : String(la.courseName || '').replace(/\s*\([A-Z]{2,4}\d{4}.*$/, '').trim();
        const ex = dd.assignments.find(function (a) {
          return (la.externalId && a.externalId === la.externalId)
            || (a.title === la.title && ((matched && a.courseId === matched.id) || a.courseName === cleanCourseName));
        });
        if (ex) {
          if (la.due) ex.due = la.due;
          if (la.url) ex.link = la.url;
          if (matched && !ex.courseId) ex.courseId = matched.id;
          if (cleanCourseName) ex.courseName = cleanCourseName;
          if (la.submitted) { ex.submitted = true; ex.written = true; }
          updatedAsg++;
        } else {
          dd.assignments.push({
            id: Store.id('asg'),
            externalId: la.externalId || '',
            title: la.title,
            courseId: matched ? matched.id : '',
            courseName: cleanCourseName,
            due: la.due || '',
            estMin: /동영상/.test(la.title) ? 45 : 90,
            link: la.url || '',
            written: !!la.submitted,
            submitted: !!la.submitted,
          });
          addedAsg++;
        }
      });

      /* 3) 공지사항 병합 (읽음 상태 보존) */
      (payload.notices || []).forEach(function (ln) {
        if (!ln || !ln.title) return;
        const matched = matchCourseForLearnUs(dd.courses, ln.luCourseId, ln.courseName, '');
        const cleanCourseName = matched ? matched.name : String(ln.courseName || '').replace(/\s*\([A-Z]{2,4}\d{4}.*$/, '').trim();
        const imp = isImportantNoticeTitle(ln.title, ln.pinned);
        const ex = dd.notices.find(function (n) {
          return (ln.externalId && n.externalId === ln.externalId)
            || (n.title === ln.title && ((matched && n.courseId === matched.id) || n.courseName === cleanCourseName));
        });
        if (ex) {
          if (ln.date) ex.date = ln.date;
          if (ln.url) ex.url = ln.url;
          if (imp) ex.important = true;
        } else {
          dd.notices.push({
            id: Store.id('ntc'),
            externalId: ln.externalId || '',
            courseId: matched ? matched.id : '',
            courseName: cleanCourseName,
            title: ln.title,
            date: ln.date || todayKey(),
            important: imp,
            read: false,
            url: ln.url || '',
            body: '',
          });
          addedNtc++;
        }
      });

      dd.settings.lastLearnUsSyncAt = payload.syncedAt || new Date().toISOString();
    });

    return { courses: matchedCrs, addedAsg: addedAsg, updatedAsg: updatedAsg, addedNtc: addedNtc };
  }

  function hasLearnUsExt() {
    return !!(typeof document !== 'undefined' && document.documentElement && document.documentElement.getAttribute('data-study-home-lu-ext') === '1');
  }

  let _extSyncInFlight = false;
  function triggerLearnUsSync(ctx) {
    if (hasLearnUsExt()) {
      if (_extSyncInFlight) {
        ctx.toast('LearnUs 동기화가 이미 진행 중입니다. 잠시만 기다려 주세요…');
        return;
      }
      _extSyncInFlight = true;
      ctx.toast('🔄 LearnUs에서 수강 강좌·과제 마감·중요 공지를 불러오는 중입니다… (약 3~6초)', 'ok', 7000);
      window.postMessage({ type: 'STUDY_HOME_EXT_REQUEST_SYNC' }, window.location.origin);
      setTimeout(function () { _extSyncInFlight = false; }, 25000);
      return;
    }
    openLearnUsSyncModal(ctx);
  }

  function openLearnUsSyncModal(ctx) {
    const code = buildLearnUsSyncScript();
    const bookmarkletHref = 'javascript:' + encodeURIComponent(code);

    const copyScriptBtn = el('button', {
      class: 'btn btn-primary',
      onclick: async function () {
        try {
          await navigator.clipboard.writeText(code);
          ctx.toast('✅ 복사 완료! LearnUs 탭으로 가서 F12(또는 Ctrl+Shift+J) → Console에 붙여넣고 Enter를 누르세요.', 'ok', 5000);
        } catch (e) {
          window.prompt('아래 코드를 복사(Ctrl+C)하세요:', code);
        }
      },
    }, '📋 1. 동기화 코드 복사');

    const openLuBtn = el('button', {
      class: 'btn',
      onclick: function () {
        window.open('https://ys.learnus.org/', 'learnus_sync_win');
      },
    }, '2. LearnUs 열기 ↗');

    const copyWhaleExtUrlBtn = el('button', {
      class: 'btn btn-sm',
      onclick: async function () {
        try {
          await navigator.clipboard.writeText('whale://extensions');
          ctx.toast('주소 복사 완료! 웨일 브라우저 상단 주소창에 붙여넣고(Ctrl+V) Enter를 누르세요.');
        } catch (e) {}
      },
    }, '📋 whale://extensions 주소 복사');

    const dragLink = el('a', {
      href: bookmarkletHref,
      class: 'btn btn-sm',
      style: 'text-decoration:none;cursor:grab;font-weight:700',
      onclick: function (e) {
        e.preventDefault();
        ctx.toast('이 버튼은 마우스로 끌어서 북마크 바에 올려두는 용도입니다.', 'warn', 4000);
      },
    }, '📥 LearnUs 수험공간 동기화 (드래그)');

    const pasteArea = el('textarea', { rows: '3', placeholder: '팝업 차단 등으로 자동 전송이 안 된 경우에만 LearnUs에서 복사한 데이터를 여기에 붙여넣으세요.' });
    const pasteBtn = el('button', {
      class: 'btn btn-primary btn-sm',
      style: 'margin-top:6px',
      onclick: function () {
        const raw = pasteArea.value.trim();
        if (!raw) { ctx.toast('붙여넣을 데이터가 없습니다.', 'warn'); return; }
        try {
          const res = applyLearnUsSyncPayload(JSON.parse(raw));
          m.close();
          acadTab = res.addedNtc > 0 && res.addedAsg === 0 ? 'notices' : 'assignments';
          ctx.navigate('academic');
          ctx.toast('동기화 완료! 과제 신규 ' + res.addedAsg + '건(갱신 ' + res.updatedAsg + '건) · 새 공지 ' + res.addedNtc + '건 반영');
        } catch (e) {
          ctx.toast('데이터 형식이 올바르지 않습니다: ' + e.message, 'warn');
        }
      },
    }, '붙여넣은 데이터 반영');

    const body = el('div', { class: 'stack', style: 'gap:12px' }, [
      el('div', { class: 'card', style: 'background:var(--exam-bg);border-color:var(--border)' }, [
        el('div', { style: 'font-weight:700;color:var(--exam-fg);margin-bottom:4px' }, '🔒 아이디·비밀번호 입력이 필요 없습니다'),
        el('p', { class: 'hint', style: 'margin:0;color:var(--text)' }, '네이버 웨일 등에서 북마크 클릭 시 빈 새 탭(about:blank)이 열리는 문제 없이 100% 작동하는 아래 방법 1 또는 방법 2를 이용해 주세요.'),
      ]),
      el('div', { class: 'card' }, [
        el('div', { style: 'font-weight:700;margin-bottom:8px' }, '방법 1 · 지금 당장 10초 만에 불러오기 (F12 콘솔 · 웨일/크롬 공통 추천)'),
        el('ol', { style: 'margin:0 0 12px;padding-left:20px;font-size:.9rem;line-height:1.75;color:var(--text-sub)' }, [
          el('li', {}, '아래 "📋 1. 동기화 코드 복사" 버튼을 클릭합니다.'),
          el('li', {}, '로그인된 LearnUs 탭으로 이동해 키보드 F12 (또는 Ctrl + Shift + J)를 누릅니다.'),
          el('li', {}, 'Console(콘솔) 탭에 Ctrl + V로 붙여넣고 Enter를 누르면 모든 강좌의 과제·공지가 자동 반영됩니다! (최초 1회 붙여넣기 경고가 뜨면 allow pasting 또는 붙여넣기 허용 입력 후 Enter)'),
        ]),
        el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' }, [copyScriptBtn, openLuBtn]),
      ]),
      el('div', { class: 'card' }, [
        el('div', { style: 'font-weight:700;margin-bottom:8px' }, '방법 2 · 앞으로 홈페이지 안에서 버튼 1번으로 끝내기 (웨일/크롬 전용 확장 앱)'),
        el('ol', { style: 'margin:0 0 10px;padding-left:20px;font-size:.88rem;line-height:1.75;color:var(--text-sub)' }, [
          el('li', {}, '웨일 주소창에 whale://extensions (크롬은 chrome://extensions) 입력 후 이동합니다.'),
          el('li', {}, '우측 상단 "개발자 모드" 스위치를 켭니다.'),
          el('li', {}, '"압축해제된 확장 앱 로드" 클릭 → 바탕화면 "홈페이지" 폴더 안의 "learnus-sync-extension" 폴더를 선택한 뒤 이 홈페이지를 새로고침(F5)하면, 이후부터는 "🔄 LearnUs 자동 동기화" 버튼 클릭 한 번으로 즉시 연동됩니다!'),
        ]),
        el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' }, [copyWhaleExtUrlBtn]),
      ]),
      el('details', { class: 'card' }, [
        el('summary', { style: 'cursor:pointer;font-weight:700;font-size:.9rem' }, '보조 도구 · 수동 데이터 붙여넣기 / 북마크 바 드래그'),
        el('div', { style: 'margin-top:10px;display:flex;flex-direction:column;gap:8px' }, [
          el('p', { class: 'hint', style: 'margin:0' }, '※ 웨일에서 북마크 클릭 시 about:blank 빈 탭이 뜨는 경우: 웨일 설정(whale://settings/tabs)에서 북마크 새 탭 열기 설정을 끄거나 위 방법 1·2를 사용하세요.'),
          el('div', { class: 'row', style: 'gap:8px' }, [dragLink]),
          el('div', { style: 'margin-top:4px' }, [pasteArea, pasteBtn]),
        ]),
      ]),
    ]);

    const m = ctx.modal({
      title: 'LearnUs 과제 · 중요 공지 자동 동기화',
      body: body,
      footer: [el('button', { class: 'btn', onclick: function () { m.close(); } }, '닫기')],
      onClose: function () { if (_activeLearnUsModal === m) _activeLearnUsModal = null; },
    });
    _activeLearnUsModal = m;
  }

  function setupLearnUsBridge() {
    window.addEventListener('message', function (e) {
      if (!e || !e.data) return;
      const msg = e.data;

      /* 1) 전용 웨일/크롬 확장 앱 결과 수신 (수동 및 백그라운드 자동 반영 모두 지원) */
      if (e.source === window && e.origin === window.location.origin && msg.type === 'STUDY_HOME_EXT_SYNC_RESULT') {
        if (!msg.silent) _extSyncInFlight = false;
        if (!msg.ok || !msg.payload) {
          if (!msg.silent) toast(msg.error || 'LearnUs 동기화에 실패했습니다.', 'warn', 6000);
          return;
        }
        if (msg.silent && msg.payload.syncedAt && Store.data().settings.lastLearnUsSyncAt === msg.payload.syncedAt) {
          return;
        }
        try {
          const res = applyLearnUsSyncPayload(msg.payload);
          if (msg.silent) {
            refresh();
            if (res.addedAsg > 0 || res.addedNtc > 0) {
              toast('🔔 LearnUs 새 소식 자동 반영: 과제 ' + res.addedAsg + '건 · 공지 ' + res.addedNtc + '건', 'ok', 4500);
            }
          } else {
            if (_activeLearnUsModal) { _activeLearnUsModal.close(); _activeLearnUsModal = null; }
            acadTab = (res.addedAsg > 0) ? 'assignments' : (res.addedNtc > 0 ? 'notices' : acadTab);
            navigate('academic');
            toast('✅ LearnUs 동기화 완료! 과제 신규 ' + res.addedAsg + '건(갱신 ' + res.updatedAsg + '건) · 공지 ' + res.addedNtc + '건 반영', 'ok', 5000);
          }
        } catch (err) {
          if (!msg.silent) toast('동기화 반영 오류: ' + err.message, 'warn');
        }
        return;
      }

      /* 2) LearnUs 탭(F12 콘솔 / 북마크릿)에서 직접 postMessage 수신 */
      if (!e.origin || !/^https:\/\/([a-z0-9-]+\.)?learnus\.org$/i.test(e.origin)) return;
      if (msg.type !== 'STUDY_HOME_LEARNUS_SYNC' || !msg.payload) return;
      try {
        const res = applyLearnUsSyncPayload(msg.payload);
        if (e.source && typeof e.source.postMessage === 'function') {
          e.source.postMessage({ type: 'STUDY_HOME_SYNC_ACK' }, e.origin);
        }
        if (_activeLearnUsModal) { _activeLearnUsModal.close(); _activeLearnUsModal = null; }
        acadTab = (res.addedAsg > 0) ? 'assignments' : (res.addedNtc > 0 ? 'notices' : acadTab);
        navigate('academic');
        toast('LearnUs 동기화 완료! 과제 신규 ' + res.addedAsg + '건(갱신 ' + res.updatedAsg + '건) · 공지 ' + res.addedNtc + '건 반영', 'ok', 5000);
      } catch (err) {
        console.error('LearnUs 수신 오류', err);
        toast('LearnUs 동기화 처리 중 오류: ' + err.message, 'warn');
      }
    });

    try {
      window.postMessage({ type: 'STUDY_HOME_PAGE_READY' }, window.location.origin);
    } catch (e) {}
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
    root.append(el('header', { class: 'page-hero' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'STUDY LOG & RETROSPECTIVE'),
        el('h1', { class: 'page-title' }, '학습 기록'),
        el('p', { class: 'page-subtitle' }, '주간 실행과 약점의 변화를 함께 봅니다. 순공부시간이나 카드 수 하나만으로 실력을 판정하지 않습니다.'),
      ]),
    ]));
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
     13. 설정과 데이터 — 개인 테마 · AI 연결 · 백업 (제안서 4·9·11·12쪽)
     ======================================================================= */
  function renderSettings(root, ctx) {
    const d = Store.data();
    root.append(el('header', { class: 'page-hero' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'SETTINGS & DATA'),
        el('h1', { class: 'page-title' }, '설정과 데이터'),
        el('p', { class: 'page-subtitle' }, '시험일과 서재 테마, AI API 연결, 로컬 JSON 백업을 한곳에서 안전하게 관리합니다.'),
      ]),
    ]));

    const examCard = el('div', { class: 'card' });
    examCard.append(el('h2', { style: 'font-family:var(--font-serif)' }, '수험 기준 및 집중 목표'));
    const examDate = el('input', { type: 'date', value: d.settings.examDate || '' });
    const confirmed = el('input', { type: 'checkbox', checked: !!d.settings.examDateConfirmed, style: 'width:20px;min-height:20px' });
    const goal = el('input', { type: 'number', value: d.settings.weeklyExamGoalH, min: '1', max: '100' });
    const focusMin = el('input', { type: 'number', value: d.settings.focusGoalMin || 50, min: '15', max: '240' });
    const elective = el('input', { type: 'text', value: d.settings.electiveSubject || '' });
    examCard.append(
      el('div', { class: 'field' }, [el('label', {}, '변리사 2차 시험일'), examDate, el('p', { class: 'hint' }, '한국산업인력공단 Q-Net 공식 공고를 확인한 날짜만 입력하세요. 확인 전에는 임의 D-Day를 표시하지 않습니다.')]),
      el('label', { class: 'row', style: 'gap:8px;margin-bottom:16px' }, [confirmed, '공식 공고로 확인함 (체크 시 D-Day 배지 표시)']),
      el('div', { class: 'field-row' }, [
        el('div', { class: 'field' }, [el('label', {}, '주간 수험 목표 (시간)'), goal]),
        el('div', { class: 'field' }, [el('label', {}, '기본 집중 타이머 목표 (분)'), focusMin]),
      ]),
      el('div', { class: 'field' }, [el('label', {}, '선택과목'), elective, el('p', { class: 'hint' }, '필수 과목: 특허법 · 상표법 · 민사소송법 + 선택과목')]),
      el('button', { class: 'btn btn-primary', onclick: function () {
        Store.update(function (dd) {
          dd.settings.examDate = examDate.value || null;
          dd.settings.examDateConfirmed = confirmed.checked;
          dd.settings.weeklyExamGoalH = Number(goal.value) || 30;
          dd.settings.focusGoalMin = clampNum(focusMin.value, 15, 240);
          dd.settings.electiveSubject = elective.value;
          const es = dd.subjects.find(function (s) { return s.id === 'sub-elec'; });
          if (es && elective.value.trim()) es.name = elective.value.trim();
        });
        ctx.refresh(); ctx.toast('수험 기준 설정을 저장했습니다.');
      } }, '설정 저장')
    );
    if (d.settings.examDate && !d.settings.examDateConfirmed) {
      examCard.append(el('p', { class: 'hint', style: 'color:var(--warn-fg);margin-top:8px' }, '시험일이 입력되었지만 "공식 공고 확인"에 체크하지 않아 D-Day는 숨겨져 있습니다.'));
    }
    root.append(examCard);

    // 개인 테마 선택 (제안서 9·10쪽: 종이 아이보리 서재 / 야간 집중 / 따뜻한 한지)
    const uiCard = el('div', { class: 'card' });
    uiCard.append(el('h2', { style: 'font-family:var(--font-serif)' }, '개인 테마 및 읽기 환경'));
    const themeSel = el('select', {});
    [
      ['light', '서재 기본 — 종이 아이보리 (#F5F3EC) + 잉크 그린'],
      ['paper', '따뜻한 한지 — 눈부심을 더 낮춘 미색 서재'],
      ['dark', '야간 집중 — 딥 그린 (#142A23) 다크 모드'],
    ].forEach(function (p) { themeSel.append(el('option', { value: p[0], selected: p[0] === d.settings.theme }, p[1])); });
    themeSel.onchange = function () {
      Store.update(function (dd) { dd.settings.theme = themeSel.value; });
      document.documentElement.setAttribute('data-theme', themeSel.value);
      ctx.toast('서재 테마를 변경했습니다.');
    };
    uiCard.append(el('div', { class: 'field', style: 'margin:0' }, [el('label', {}, '색상 테마'), themeSel]));
    root.append(uiCard);

    // AI 연결 및 모델 관리 (제안서 4·11쪽: 첫 화면 대신 설정과 데이터에서 API 키 통합 관리)
    const aiCfgCard = el('div', { class: 'card' });
    aiCfgCard.append(
      el('div', { class: 'section-head' }, [
        el('h2', { style: 'font-family:var(--font-serif);margin:0' }, 'AI 연결 및 모델 설정'),
        el('button', { class: 'section-link', onclick: function () { ctx.navigate('ai'); } }, 'AI 도구 전체 화면 열기 →'),
      ]),
      el('p', { class: 'hint', style: 'margin-bottom:12px' }, 'API 키는 이 브라우저 로컬 저장소에만 보관되며 클라우드 동기화 대상에서 제외됩니다. 질문 전송 시 선택한 문단·문맥이 해당 AI 제공사 서버로 전송됩니다.'),
    );
    const provSel = el('select', { style: 'margin-bottom:10px' });
    Object.keys(AI_PROVIDERS).forEach(function (pid) {
      const p = AI_PROVIDERS[pid];
      provSel.append(el('option', { value: pid, selected: pid === AiStore.provider() }, p.name + (AiStore.hasKey(pid) ? ' (키 연결됨 ✓)' : ' (키 미입력)')));
    });
    provSel.onchange = function () { AiStore.setProvider(provSel.value); refreshAiSurfaces(); ctx.refresh(); };
    aiCfgCard.append(el('div', { class: 'field' }, [el('label', {}, '기본 AI 제공사'), provSel]));
    if (AiStore.provider() === 'gemini') {
      aiCfgCard.append(el('div', { class: 'field' }, [el('label', {}, 'Gemini 세부 모델 (Gemini 4 Argon 지원)'), buildGeminiModelControls(false)]));
    }
    aiCfgCard.append(buildKeyCard(AiStore.provider(), ctx, true));
    root.append(aiCfgCard);

    const backupCard = el('div', { class: 'card' });
    backupCard.append(el('h2', { style: 'font-family:var(--font-serif)' }, '백업과 복원'));
    backupCard.append(el('p', { class: 'hint' }, '단권화 서재 노트, 답안 연습, 복습 카드, 대학 학업 일정을 JSON 파일로 내보내 보관할 수 있습니다. 월 1회 이상 백업을 권장합니다.'));
    const counts = Store.counts();
    backupCard.append(el('div', { class: 'row', style: 'gap:10px;flex-wrap:wrap;margin:12px 0' }, Object.keys(counts).map(function (k) { return el('span', { class: 'tag tag-muted' }, k + ' ' + counts[k]); })));
    const fileInput = el('input', { type: 'file', accept: '.json', style: 'display:none' });
    fileInput.onchange = function () { handleImport(fileInput.files[0], ctx); };
    backupCard.append(el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' }, [
      el('button', { class: 'btn btn-primary', onclick: exportBackup }, '⬇ JSON 백업 내보내기'),
      el('button', { class: 'btn', onclick: function () { fileInput.click(); } }, '⬆ 백업 가져오기'),
      fileInput,
    ]));
    root.append(backupCard);

    const dangerCard = el('div', { class: 'card', style: 'border-color:var(--warn-fg)' });
    dangerCard.append(el('h2', { style: 'color:var(--warn-fg);font-family:var(--font-serif)' }, '위험 구역'));
    dangerCard.append(el('p', { class: 'hint' }, '모든 학습 기록을 초기화합니다. 되돌릴 수 없으니 반드시 먼저 백업을 내보내세요.'));
    dangerCard.append(el('button', { class: 'btn btn-danger', style: 'margin-top:8px', onclick: async function () { if (await ctx.confirm('정말로 모든 기록을 삭제할까요? 백업하지 않은 데이터는 복구할 수 없습니다.', { danger: true, okText: '전체 삭제' })) { localStorage.removeItem(STORAGE_KEY); location.reload(); } } }, '모든 데이터 삭제'));
    root.append(dangerCard);
  }
  function exportBackup() {
    const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = '논결_서재백업_' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
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
     13-b. AI 도구 & 문맥 기반 우측 보조 AI 위젯 (제안서 4·7·11쪽)
     ======================================================================= */
  const AI_LINK_TOOLS = [
    { id: 'manus', name: 'Manus', vendor: 'Butterfly Effect', url: 'https://manus.im/',     desc: '여러 단계를 스스로 처리하는 에이전트형 도구입니다.', badge: 'M' },
    { id: 'kiro',  name: 'Kiro',  vendor: 'AWS',              url: 'https://app.kiro.dev/', desc: '스펙 기반으로 코드를 만드는 개발용 에이전트입니다.', badge: 'K' },
  ];
  let _aiSending = false;
  let _widgetShowKey = false;
  let _aiContext = null;     // { label: string, text: string }
  let _aiDraftPrompt = '';

  function openContextualAi(opts) {
    opts = opts || {};
    if (opts.contextText) {
      _aiContext = { label: opts.label || '선택 문맥', text: opts.contextText };
    }
    _aiDraftPrompt = opts.promptDraft || '';
    if (current === 'ai') {
      refresh();
      return;
    }
    _widgetShowKey = false;
    AiStore.setWidgetOpen(true);
    renderAiWidget({ focusInput: true });
    updateTopbarAiBtn();
  }

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
    root.append(el('header', { class: 'page-hero' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'AI ASSISTANT'),
        el('h1', { class: 'page-title' }, 'AI 도구'),
        el('p', { class: 'page-subtitle' }, '넓은 화면에서 대화하거나, 단권화 서재·답안 연습 등에서 우측 보조 패널을 열어 문맥과 함께 질문할 수 있습니다.'),
      ]),
      el('button', { class: 'btn btn-sm', onclick: function () { ctx.navigate('settings'); } }, 'API·모델 설정'),
    ]));

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
        'aria-label': 'AI 도우미 열기',
        onclick: function () { _widgetShowKey = false; AiStore.setWidgetOpen(true); renderAiWidget({ focusInput: true }); updateTopbarAiBtn(); },
      }, [svgIcon('ai'), _aiSending ? 'AI 답변 중…' : 'AI 도우미']));
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

    // 3) 본문 (키 미연결 시 간결한 연결 카드 또는 메시지 목록)
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
        el('div', { style: 'font-weight:700;font-size:.92rem' }, p.name + ' 연결하기'),
        el('p', { class: 'hint', style: 'font-size:.78rem;line-height:1.55;margin:0' }, p.keyHint),
        keyInput,
        el('div', { class: 'row', style: 'gap:6px' }, [
          el('button', { class: 'btn btn-primary btn-sm', style: 'flex:1', onclick: saveKey }, '키 저장'),
          hasKey ? el('button', { class: 'btn btn-sm', onclick: function () { _widgetShowKey = false; renderAiWidget({ focusInput: true }); } }, '취소') : null,
          hasKey ? el('button', { class: 'btn btn-sm btn-danger', onclick: function () { AiStore.setKey(provider, ''); _widgetShowKey = false; renderAiWidget(); toast(p.name + ' 키를 삭제했습니다.'); } }, '삭제') : null,
        ]),
        el('div', { class: 'row between', style: 'margin-top:4px' }, [
          el('a', { href: p.keyUrl, target: '_blank', rel: 'noopener noreferrer', style: 'font-size:.76rem' }, 'API 키 발급 ↗'),
          el('button', { type: 'button', class: 'section-link', style: 'font-size:.76rem', onclick: function () { navigate('settings'); } }, '설정과 데이터에서 관리 →'),
        ]),
      );
      panel.append(body);
      root.append(panel);
      if (opts.focusInput) setTimeout(function () { keyInput.focus(); }, 0);
      return;
    }

    const history = AiStore.chat(provider);
    if (history.length === 0) {
      body.append(el('div', { style: 'margin:auto;text-align:center;padding:16px 8px;color:var(--text-sub)' }, [
        el('div', { style: 'font-family:var(--font-serif);font-weight:700;color:var(--text);margin-bottom:6px;font-size:.98rem' }, '서재를 닫지 않고 바로 질문하세요'),
        el('p', { class: 'hint', style: 'font-size:.8rem;margin:0;line-height:1.55' }, '단권화 서재의 "+ 이 쟁점 질문하기"나 답안 채점의 "누락된 논점 점검"과도 바로 연동됩니다.'),
      ]));
    } else {
      history.forEach(function (m) { body.append(renderAiMessage(m, true)); });
    }
    panel.append(body);

    // 선택된 학습 문맥 표시 바 (제안서 11쪽: 제공사 외부 전송 안내 포함)
    if (_aiContext) {
      panel.append(el('div', { class: 'ai-context-chip' }, [
        el('span', { style: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, '문맥: ' + _aiContext.label + ' · 질문 시 전송됨'),
        el('button', {
          type: 'button',
          style: 'background:none;border:none;color:inherit;cursor:pointer;font-weight:700;padding:0 4px',
          'aria-label': '문맥 첨부 해제',
          onclick: function () { _aiContext = null; renderAiWidget({ focusInput: true }); },
        }, '✕'),
      ]));
    }

    // 4) 하단 입력창
    const ta = el('textarea', { placeholder: p.name + '에게 질문 (Enter 전송)', rows: _aiDraftPrompt ? '2' : '1', 'aria-label': p.name + ' 질문 입력' }, _aiDraftPrompt || '');
    if (_aiDraftPrompt) _aiDraftPrompt = '';
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

    const outgoingText = _aiContext
      ? ('[참고 학습 문맥 — ' + _aiContext.label + ']\n' + _aiContext.text + '\n\n[질문]\n' + text)
      : text;
    _aiContext = null;

    AiStore.pushMessage(provider, { role: 'user', content: outgoingText });
    AiStore.pushMessage(provider, { role: 'assistant', content: '', pending: true });
    _aiSending = true;
    refreshAiSurfaces();

    try {
      let history = AiStore.chat(provider).filter(function (m) { return !m.pending && !m.error; });
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
     14. 앱 셸 — 논결(NONGYEOL) 브랜드 록업 · 브레드크럼 · 모바일 4탭 (제안서 3·6·8·12쪽)
     ======================================================================= */
  const ROUTES = {
    home:     { title: '오늘의 공부',   render: renderHome },
    week:     { title: '주간 계획',     render: renderWeek },
    tasks:    { title: '과업',          render: renderTasks },
    answers:  { title: '답안 연습',     render: renderAnswers },
    notes:    { title: '단권화 서재',   render: renderNotes },
    review:   { title: '복습 카드',     render: renderReview },
    academic: { title: '대학 학업',     render: renderAcademic },
    log:      { title: '학습 기록',     render: renderReviewLog },
    ai:       { title: 'AI 도구',       render: renderAiTools },
    settings: { title: '설정과 데이터', render: renderSettings },
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
    _navigating = true;
    if (('#' + route) !== window.location.hash) window.location.hash = route;
    _navigating = false;
    refresh(); updateNavHighlight(); renderAiWidget(); updateTopbarAiBtn();
    if (!opts.noFocus) { const c = document.getElementById('content'); if (c) c.focus(); }
  }
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
    if (titleEl) titleEl.textContent = route.title;
    try { route.render(content, ctx); }
    catch (e) {
      console.error('화면 렌더 오류', e);
      content.append(el('div', { class: 'empty' }, [el('span', { class: 'emoji' }, '⚠️'), el('h3', {}, '화면을 그리는 중 문제가 발생했습니다'), el('p', {}, '마지막 저장본은 보존되었습니다. 새로고침 후 다시 시도하세요.'), el('button', { class: 'btn', onclick: function () { location.reload(); } }, '새로고침')]));
    }
    updateSaveStatus();
  }
  function updateNavHighlight() {
    document.querySelectorAll('.nav-item[data-route]').forEach(function (b) {
      b.setAttribute('aria-current', b.dataset.route === current ? 'page' : 'false');
    });
    const moreRoutes = ['tasks', 'answers', 'notes', 'academic', 'log', 'ai', 'settings'];
    document.querySelectorAll('.mob-tab[data-mob-route]').forEach(function (b) {
      const r = b.dataset.mobRoute;
      const active = r === 'more' ? (moreRoutes.indexOf(current) >= 0) : (r === current);
      b.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }
  function updateSaveStatus() {
    const info = Store.saveInfo(); const node = document.getElementById('save-status'); if (!node) return;
    node.innerHTML = '';
    if (info.failed) {
      node.textContent = '⚠️ 저장 실패 — 백업을 내보내세요';
      node.style.color = 'var(--warn-fg)';
    } else if (info.at) {
      node.style.color = '';
      node.append(el('span', { class: 'save-dot', 'aria-hidden': 'true' }), '마지막 저장 ' + info.at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
    } else {
      node.style.color = '';
      node.append(el('span', { class: 'save-dot', 'aria-hidden': 'true' }), '자동 저장 켜짐');
    }
  }

  function openInbox() {
    const input = el('input', { type: 'text', placeholder: '떠오른 쟁점·판례·할 일을 먼저 기록 (Enter 저장)', 'aria-label': '빠른 기록' });
    const list = el('div', { class: 'list', style: 'margin-top:12px;max-height:40vh;overflow:auto' });
    function renderInboxList() {
      const data = Store.data(); list.innerHTML = '';
      const items = data.inbox.filter(function (i) { return !i.filed; });
      if (items.length === 0) { list.append(el('p', { class: 'hint' }, '기록함이 비어 있습니다. 떠오른 쟁점이나 할 일을 입력하고 Enter를 누르세요.')); return; }
      items.forEach(function (i) { list.append(el('div', { class: 'item' }, [el('div', { class: 'main' }, [el('div', {}, i.text), el('div', { class: 'meta' }, fmtDate(i.createdAt))]), el('button', { class: 'btn btn-sm', title: '정리 완료', onclick: function () { Store.update(function (dd) { dd.inbox.find(function (z) { return z.id === i.id; }).filed = true; }); renderInboxList(); } }, '완료')])); });
    }
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && input.value.trim()) { Store.update(function (dd) { dd.inbox.unshift({ id: Store.id('in'), text: input.value.trim(), createdAt: new Date().toISOString(), filed: false }); }); input.value = ''; renderInboxList(); } });
    renderInboxList();
    const m = modal({ title: '+ 빠른 기록', body: el('div', {}, [input, list]), footer: [el('button', { class: 'btn', onclick: function () { m.close(); } }, '닫기')] });
  }

  function openSearch(query) {
    query = query || '';
    const input = el('input', { type: 'search', value: query, placeholder: '서재 노트 · 과업 · 답안 · 복습 카드 · 학업 공지 검색', 'aria-label': '전체 검색', style: 'font-size:1.05rem' });
    const results = el('div', { class: 'list', style: 'margin-top:12px;max-height:50vh;overflow:auto' });
    function run(q) {
      results.innerHTML = ''; q = (q || '').trim().toLowerCase();
      if (!q) { results.append(el('p', { class: 'hint' }, '검색어를 입력하세요. (단축키 Ctrl + K)')); return; }
      const d = Store.data(); const hits = [];
      d.notes.forEach(function (n) { if ((n.title + ' ' + n.issue + ' ' + n.body).toLowerCase().indexOf(q) >= 0) hits.push({ type: '서재 노트', title: n.title, route: 'notes', id: n.id }); });
      d.tasks.forEach(function (t) { if (t.title.toLowerCase().indexOf(q) >= 0) hits.push({ type: '과업', title: t.title, route: 'tasks' }); });
      d.answers.forEach(function (a) { if ((a.source + ' ' + a.note + ' ' + (a.issue || '')).toLowerCase().indexOf(q) >= 0) hits.push({ type: '답안 연습', title: (a.source || '답안') + ' ' + (a.round || ''), route: 'answers' }); });
      d.cards.forEach(function (c) { if ((c.q + ' ' + c.a).toLowerCase().indexOf(q) >= 0) hits.push({ type: '복습 카드', title: c.q, route: 'review' }); });
      (d.assignments || []).forEach(function (a) { if ((a.title + ' ' + (a.courseName || '')).toLowerCase().indexOf(q) >= 0) hits.push({ type: '대학 과제', title: a.title, route: 'academic', tab: 'assignments' }); });
      (d.notices || []).forEach(function (n) { if ((n.title + ' ' + (n.courseName || '') + ' ' + (n.body || '')).toLowerCase().indexOf(q) >= 0) hits.push({ type: '중요 공지', title: n.title, route: 'academic', tab: 'notices' }); });
      if (hits.length === 0) { results.append(el('p', { class: 'hint' }, '일치하는 기록이 없습니다.')); return; }
      hits.slice(0, 30).forEach(function (h) { results.append(el('button', { class: 'item', style: 'width:100%;text-align:left;cursor:pointer', onclick: function () { m.close(); if (h.route === 'notes' && h.id) { noteSelectedId = h.id; Store.update(function (dd) { dd.lastOpenNote = h.id; }); } if (h.route === 'academic' && h.tab) { acadTab = h.tab; } navigate(h.route); } }, [el('span', { class: 'tag tag-muted' }, h.type), el('div', { class: 'main' }, el('div', { class: 'title' }, h.title || '(제목 없음)'))])); });
    }
    input.oninput = function () { run(input.value); };
    run(query);
    const m = modal({ title: '서재 전체 검색', body: el('div', {}, [input, results]) });
  }

  function buildShell() {
    const app = el('div', { class: 'app', id: 'app-shell' });
    const sidebar = el('aside', { class: 'sidebar', id: 'sidebar', 'aria-label': '주 메뉴' });

    // 논결 NONGYEOL 브랜드 록업 + 분리된 서브타이틀 (제안서 2·3·6쪽)
    const brandWrap = el('div', { class: 'brand-wrap' }, [
      el('button', {
        type: 'button',
        class: 'brand-lockup',
        onclick: function () { navigate('home'); },
      }, [
        el('span', { class: 'brand-mark' }, [nongyeolMarkEl(38)]),
        el('span', { class: 'brand-words' }, [
          el('span', { class: 'brand-ko' }, '논결'),
          el('span', { class: 'brand-en' }, 'NONGYEOL'),
        ]),
      ]),
      el('div', { class: 'brand-context' }, [
        el('div', { class: 'eyebrow' }, 'MY STUDY LIBRARY'),
        el('div', { class: 'brand-context-year' }, '2027 변리사 2차 준비'),
      ]),
    ]);
    sidebar.append(brandWrap);

    const nav = el('nav', { class: 'nav' });
    function navItem(parent, route, label, icon) {
      parent.append(el('button', { class: 'nav-item', 'data-route': route, onclick: function () { navigate(route); } }, [svgIcon(icon), label]));
    }
    navItem(nav, 'home', '오늘의 공부', 'home');
    navItem(nav, 'week', '주간 계획', 'week');
    navItem(nav, 'tasks', '과업', 'tasks');
    nav.append(el('hr', { class: 'nav-sep' }), el('div', { class: 'nav-group-label' }, '서재와 답안'));
    navItem(nav, 'answers', '답안 연습', 'answers');
    navItem(nav, 'notes', '단권화 서재', 'notes');
    navItem(nav, 'review', '복습 카드', 'review');
    nav.append(el('hr', { class: 'nav-sep' }), el('div', { class: 'nav-group-label' }, '학업과 기록'));
    navItem(nav, 'academic', '대학 학업', 'academic');
    navItem(nav, 'log', '학습 기록', 'log');
    navItem(nav, 'ai', 'AI 도구', 'ai');
    sidebar.append(nav);

    const footer = el('div', { class: 'sidebar-footer' });
    footer.append(
      el('button', { class: 'nav-item secondary', onclick: openInbox }, [svgIcon('inbox'), '+ 빠른 기록']),
      el('button', { class: 'nav-item secondary', 'data-route': 'settings', onclick: function () { navigate('settings'); } }, [svgIcon('settings'), '설정과 데이터']),
      el('div', { id: 'cloud-box', style: 'border-top:1px solid var(--border);margin-top:6px;padding-top:6px' }),
      el('div', { class: 'save-status', id: 'save-status', style: 'padding:8px 12px' }, [el('span', { class: 'save-dot', 'aria-hidden': 'true' }), '자동 저장 켜짐']),
    );
    sidebar.append(footer);
    const scrim = el('div', { class: 'scrim', id: 'scrim', onclick: function () { sidebar.classList.remove('open'); scrim.classList.remove('show'); } });

    const main = el('div', { class: 'main' });
    const searchInput = el('input', { type: 'search', placeholder: '노트, 쟁점, 답안 검색', 'aria-label': '전체 검색' });
    searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') openSearch(searchInput.value); });
    searchInput.addEventListener('focus', function () { openSearch(searchInput.value); });

    const topbarAiBtn = el('button', {
      class: 'btn btn-sm',
      id: 'topbar-ai-btn',
      title: '우측 AI 도우미 열기/닫기',
      'aria-label': '우측 AI 도우미 열기/닫기',
      onclick: function () {
        if (current === 'ai') { toast('현재 AI 도구 전체 화면입니다. 다른 메뉴에서 누르면 우측 보조 패널이 열립니다.'); return; }
        const next = !AiStore.widgetOpen();
        AiStore.setWidgetOpen(next);
        renderAiWidget({ focusInput: next });
        updateTopbarAiBtn();
      },
    }, [svgIcon('ai'), el('span', { class: 'desktop-only', style: 'font-size:.82rem' }, 'AI')]);

    const mobileBrand = el('button', {
      type: 'button',
      class: 'mobile-brand-bar',
      onclick: function () { navigate('home'); },
    }, [
      el('span', { class: 'brand-mark' }, [nongyeolMarkEl(30)]),
      el('span', { class: 'brand-ko' }, '논결'),
    ]);

    const topbar = el('header', { class: 'topbar' }, [
      el('div', { class: 'topbar-inner' }, [
        el('button', { class: 'btn btn-sm menu-toggle', 'aria-label': '메뉴 열기', onclick: function () { sidebar.classList.toggle('open'); scrim.classList.toggle('show'); } }, [svgIcon('more')]),
        mobileBrand,
        el('div', { class: 'topbar-crumb' }, [
          svgIcon('notes'),
          el('span', {}, '나의 서재'),
          el('span', { class: 'topbar-crumb-sep' }, '/'),
          el('span', { class: 'topbar-crumb-cur', id: 'page-title' }, '오늘의 공부'),
        ]),
        el('div', { class: 'search-box' }, [
          svgIcon('search'),
          searchInput,
          el('span', { class: 'kbd-chip' }, 'Ctrl K'),
        ]),
        el('button', { class: 'btn btn-sm', onclick: openInbox, title: '+ 빠른 기록', 'aria-label': '빠른 기록' }, [svgIcon('inbox')]),
        topbarAiBtn,
      ]),
    ]);

    const focusBanner = el('div', { class: 'focus-banner', id: 'focus-banner' });
    const content = el('main', { class: 'content', id: 'content', tabindex: '-1' });
    main.append(topbar, focusBanner, content);

    const aiWidgetRoot = el('aside', { class: 'ai-widget-root', id: 'ai-widget-root', 'aria-label': '우측 AI 도우미' });

    // 모바일 하단 4탭 내비게이션 (제안서 8·12쪽: 오늘 · 계획 · 복습 · 더보기)
    const mobileTabbar = el('nav', { class: 'mobile-tabbar', id: 'mobile-tabbar', 'aria-label': '모바일 하단 메뉴' }, [
      el('button', { type: 'button', class: 'mob-tab', 'data-mob-route': 'home', onclick: function () { navigate('home'); } }, [svgIcon('home'), el('span', {}, '오늘')]),
      el('button', { type: 'button', class: 'mob-tab', 'data-mob-route': 'week', onclick: function () { navigate('week'); } }, [svgIcon('week'), el('span', {}, '계획')]),
      el('button', { type: 'button', class: 'mob-tab', 'data-mob-route': 'review', onclick: function () { navigate('review'); } }, [svgIcon('review'), el('span', {}, '복습')]),
      el('button', {
        type: 'button',
        class: 'mob-tab',
        'data-mob-route': 'more',
        onclick: function () { sidebar.classList.toggle('open'); scrim.classList.toggle('show'); },
      }, [svgIcon('more'), el('span', {}, '더보기')]),
    ]);

    // 조용한 집중 전면 오버레이 컨테이너 (#142A23 야간 집중 시안)
    const focusOverlay = el('div', { class: 'focus-overlay hidden', id: 'focus-overlay', role: 'dialog', 'aria-label': '조용한 집중 화면' });

    app.append(sidebar, scrim, main, aiWidgetRoot);
    document.body.append(el('a', { class: 'skip-link', href: '#content' }, '본문으로 건너뛰기'), app, mobileTabbar, focusOverlay);
  }

  function maybeOnboard() {
    const d = Store.data();
    if (d.settings.onboarded) return;
    const body = el('div', { class: 'stack' }, [
      el('div', { style: 'font-family:var(--font-serif);font-size:1.15rem;font-weight:700;color:var(--text)' }, '생각이 답안이 되는 공간, 논결(NONGYEOL)'),
      el('p', { style: 'margin:0' }, '변리사 2차 수험을 1순위, 대학 학업을 2순위로 정돈하는 개인 학습 서재입니다.'),
      el('ul', { style: 'color:var(--text-sub);font-size:.9rem;line-height:1.85;margin:4px 0;padding-left:20px' }, [
        el('li', {}, '오늘의 공부: 확보한 블록에서 바로 ▶ 집중 시작 (조용한 집중 화면 지원)'),
        el('li', {}, '단권화 서재: 3영역 레이아웃 + 원문 나란히 읽기 + 선택 문단 복습 카드화'),
        el('li', {}, '답안 연습: 실전 작성 모드(AI·단서 숨김)와 채점·재작성 비교 분리'),
        el('li', {}, '대학 학업: 연세 LearnUs 과제 마감 및 중요 공지 자동 연동'),
      ]),
    ]);
    const m = modal({ title: '논결 서재에 오신 것을 환영합니다', body: body, footer: [el('button', { class: 'btn btn-primary', onclick: function () { Store.update(function (dd) { dd.settings.onboarded = true; }); m.close(); } }, '서재 시작하기')] });
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
    setupLearnUsBridge();
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
