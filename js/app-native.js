/* =========================================================================
   app-native.js — 논결(NONGYEOL) 멀티 디바이스 앱 엔진 & 네이티브 브리지
   대상 기기:
   - Windows PC (데스크톱 PWA 창 · 확장 앱 브리지)
   - 갤럭시 S25 엣지 (Android 스마트폰: 5탭 하단바 · 바텀시트 · 햅틱 · 제스처 보호)
   - 레노버 요가탭 플러스 13 Gen 2 (Android 태블릿: 접이식 슬림 레일 · 2단 화면 · 전체화면)
   공통 네이티브 기능:
   - 타이머 localStorage 영구 보존 & Screen Wake Lock (화면 꺼짐 방지)
   - PWA Service Worker 등록 및 1-click 설치 + Android Capacitor APK 다운로드 센터
   ========================================================================= */
(function () {
  'use strict';

  const TIMER_KEY = 'patent-study-home:active-session';
  const RAIL_PREF_KEY = 'nongyeol:tablet-rail';
  const APK_DOWNLOAD_URL = 'https://github.com/Bynewda/Study-Home/releases/latest/download/NONGYEOL-Android.apk';
  const APK_RELEASES_URL = 'https://github.com/Bynewda/Study-Home/releases';

  /* ---------------------------------------------------------------------
     0. 타이머 즉시 복원 (app.bundle.js 의 Timer.resumeIfActive() 실행 전 수행)
     --------------------------------------------------------------------- */
  function restoreTimerFromLocalStorage() {
    try {
      const sVal = sessionStorage.getItem(TIMER_KEY);
      const lVal = localStorage.getItem(TIMER_KEY);
      if (!sVal && lVal) {
        JSON.parse(lVal); // 유효한 JSON인지 확인
        sessionStorage.setItem(TIMER_KEY, lVal);
      }
    } catch (e) {}
  }
  restoreTimerFromLocalStorage();

  /* ---------------------------------------------------------------------
     1. 기기 프로필 및 앱 실행 환경 감지
     --------------------------------------------------------------------- */
  function isCapacitorApp() {
    try {
      return !!(window.Capacitor && (
        (typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
        (window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp)
      ));
    } catch (e) {
      return false;
    }
  }

  function isStandalonePwa() {
    try {
      return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
    } catch (e) {
      return false;
    }
  }

  function detectDeviceProfile() {
    const ua = navigator.userAgent || '';
    const w = window.innerWidth || screen.width || 1280;
    const isAndroid = /Android/i.test(ua);
    const isPhone = w < 768 || (isAndroid && /Mobile/i.test(ua) && w < 860);
    const isTablet = !isPhone && ((isAndroid && w >= 768) || (w >= 768 && w < 1280 && navigator.maxTouchPoints > 0));

    let kind = 'desktop';
    let label = 'PC 데스크톱 모드';
    let badge = 'PC';
    if (isPhone) {
      kind = 'phone';
      label = isAndroid ? '안드로이드 스마트폰 (갤럭시 S25 엣지 최적화)' : '모바일 스마트폰 모드';
      badge = 'PHONE';
    } else if (isTablet) {
      kind = 'tablet';
      label = isAndroid ? '안드로이드 태블릿 (요가탭 플러스 13 최적화)' : '태블릿 모드';
      badge = 'TABLET';
    }
    return {
      kind: kind,
      isAndroid: isAndroid,
      isCapacitor: isCapacitorApp(),
      isStandalone: isStandalonePwa(),
      label: label,
      badge: badge,
    };
  }

  function applyDeviceAttributes() {
    const profile = detectDeviceProfile();
    const html = document.documentElement;
    html.dataset.device = profile.kind;
    html.dataset.os = profile.isAndroid ? 'android' : (/Windows/i.test(navigator.userAgent || '') ? 'windows' : 'other');
    html.classList.toggle('is-capacitor-app', profile.isCapacitor);
    html.classList.toggle('is-standalone-pwa', profile.isStandalone);
    return profile;
  }

  function haptic(ms) {
    try {
      if (navigator.vibrate && detectDeviceProfile().kind !== 'desktop') {
        navigator.vibrate(ms || 8);
      }
    } catch (e) {}
  }

  /* ---------------------------------------------------------------------
     2. Screen Wake Lock + 타이머 백그라운드 보호 + 상단 미니 타이머 배지
     --------------------------------------------------------------------- */
  let wakeSentinel = null;

  async function syncWakeLock(activeSession) {
    const shouldLock = !!(activeSession && !activeSession.pausedAt && document.visibilityState === 'visible');
    if (shouldLock && !wakeSentinel && navigator.wakeLock && typeof navigator.wakeLock.request === 'function') {
      try {
        wakeSentinel = await navigator.wakeLock.request('screen');
        wakeSentinel.addEventListener('release', function () { wakeSentinel = null; });
      } catch (e) {}
    } else if (!shouldLock && wakeSentinel) {
      try { await wakeSentinel.release(); } catch (e) {}
      wakeSentinel = null;
    }
  }

  function syncTimerPersistence() {
    let active = null;
    try {
      const sVal = sessionStorage.getItem(TIMER_KEY);
      if (sVal) {
        active = JSON.parse(sVal);
        localStorage.setItem(TIMER_KEY, sVal);
      } else {
        localStorage.removeItem(TIMER_KEY);
      }
    } catch (e) {}
    syncWakeLock(active);
    updateMiniTimerPill(active);
  }

  function updateMiniTimerPill(active) {
    const pill = document.getElementById('app-timer-pill');
    if (!pill) return;
    if (!active || !active.start) {
      pill.hidden = true;
      return;
    }
    pill.hidden = false;
    const nowMs = active.pausedAt ? new Date(active.pausedAt).getTime() : Date.now();
    const ms = Math.max(0, nowMs - new Date(active.start).getTime() - (active.pausedTotalMs || 0));
    const sec = Math.floor(ms / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    const txt = pill.querySelector('.app-timer-text');
    if (txt) {
      txt.textContent = (active.pausedAt ? '일시정지 ' : '집중 ') + mm + ':' + ss;
    }
  }

  /* ---------------------------------------------------------------------
     3. PWA Service Worker 등록 & 설치 프롬프트 관리
     --------------------------------------------------------------------- */
  let deferredInstallPrompt = null;

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/i.test(location.protocol)) return;
    if (isCapacitorApp()) return; // 네이티브 APK는 로컬 패키지 에셋을 직접 사용

    navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function (reg) {
      // 새 버전 감지 시 즉시 업데이트 활성화
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      reg.addEventListener('updatefound', function () {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(function () {});
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredInstallPrompt = e;
    const installBtn = document.getElementById('app-install-btn');
    if (installBtn) installBtn.classList.add('primary-soft');
  });

  window.addEventListener('appinstalled', function () {
    deferredInstallPrompt = null;
    applyDeviceAttributes();
    updateTopbarInstallBtn();
  });

  async function triggerPwaInstall() {
    if (!deferredInstallPrompt) return false;
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      updateTopbarInstallBtn();
      return choice && choice.outcome === 'accepted';
    } catch (e) {
      return false;
    }
  }

  /* ---------------------------------------------------------------------
     4. 태블릿(요가탭 플러스 13) 레일 토글 & 상단 빠른 도구 주입
     --------------------------------------------------------------------- */
  function applyTabletRailPref() {
    let expanded = false;
    try { expanded = localStorage.getItem(RAIL_PREF_KEY) === '1'; } catch (e) {}
    document.body.classList.toggle('tablet-rail-expanded', expanded);
    const btn = document.getElementById('app-rail-toggle-btn');
    if (btn) {
      btn.setAttribute('aria-pressed', expanded ? 'true' : 'false');
      const lbl = btn.querySelector('.app-tool-label');
      if (lbl) lbl.textContent = expanded ? '레일 접기' : '레일 펴기';
    }
  }

  function toggleTabletRail() {
    const next = !document.body.classList.contains('tablet-rail-expanded');
    document.body.classList.toggle('tablet-rail-expanded', next);
    try { localStorage.setItem(RAIL_PREF_KEY, next ? '1' : '0'); } catch (e) {}
    applyTabletRailPref();
    haptic(6);
  }

  function toggleFullscreen() {
    const doc = document;
    const root = document.documentElement;
    if (!doc.fullscreenElement && root.requestFullscreen) {
      root.requestFullscreen().catch(function () {});
    } else if (doc.fullscreenElement && doc.exitFullscreen) {
      doc.exitFullscreen().catch(function () {});
    }
    haptic(6);
  }

  function updateTopbarInstallBtn() {
    const btn = document.getElementById('app-install-btn');
    if (!btn) return;
    const p = detectDeviceProfile();
    const lbl = btn.querySelector('.app-tool-label');
    if (p.isCapacitor) {
      if (lbl) lbl.textContent = '앱 정보';
      btn.title = '안드로이드 네이티브 앱 실행 중';
    } else if (p.isStandalone) {
      if (lbl) lbl.textContent = '앱 센터';
      btn.title = '기기별 앱 · APK 다운로드 센터';
    } else if (deferredInstallPrompt) {
      if (lbl) lbl.textContent = '앱 설치';
      btn.classList.add('primary-soft');
      btn.title = '이 기기에 앱 설치하기 (PWA / APK)';
    } else {
      if (lbl) lbl.textContent = '앱 센터';
      btn.title = '앱 설치 및 모바일·태블릿 최적화 안내';
    }
  }

  function injectTopbarTools() {
    const inner = document.querySelector('.topbar-inner');
    if (!inner || document.getElementById('app-topbar-tools')) return;

    const tools = document.createElement('div');
    tools.className = 'app-topbar-tools';
    tools.id = 'app-topbar-tools';

    // 1) 실행 중인 타이머 빠른 열기 배지
    const timerPill = document.createElement('button');
    timerPill.type = 'button';
    timerPill.id = 'app-timer-pill';
    timerPill.className = 'app-timer-pill';
    timerPill.hidden = true;
    timerPill.title = '진행 중인 조용한 집중 화면 열기';
    timerPill.innerHTML = '<span class="app-timer-dot" aria-hidden="true"></span><span class="app-timer-text">00:00</span>';
    timerPill.addEventListener('click', function () {
      haptic(8);
      // 홈 화면의 '집중 화면' 배너 버튼이 있으면 클릭, 없으면 #home 이동
      const focusBannerBtn = document.querySelector('#focus-banner button');
      if (focusBannerBtn) focusBannerBtn.click();
      else {
        const curOv = document.getElementById('focus-overlay');
        if (curOv) curOv.classList.remove('hidden');
        location.hash = '#home';
      }
    });

    // 2) 레노버 요가탭 플러스 13용 슬림 레일 토글 버튼
    const railBtn = document.createElement('button');
    railBtn.type = 'button';
    railBtn.id = 'app-rail-toggle-btn';
    railBtn.className = 'app-tool-btn app-rail-toggle-btn';
    railBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/></svg><span class="app-tool-label">레일 펴기</span>';
    railBtn.addEventListener('click', toggleTabletRail);

    // 3) 전체화면 버튼 (태블릿 / PC 학습 몰입용)
    const fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.className = 'app-tool-btn';
    fsBtn.title = '전체화면 전환';
    fsBtn.setAttribute('aria-label', '전체화면 전환');
    fsBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg><span class="app-tool-label">전체화면</span>';
    fsBtn.addEventListener('click', toggleFullscreen);

    // 4) 앱 설치 & 기기별 최적화 센터 버튼
    const installBtn = document.createElement('button');
    installBtn.type = 'button';
    installBtn.id = 'app-install-btn';
    installBtn.className = 'app-tool-btn';
    installBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg><span class="app-tool-label">앱 설치</span>';
    installBtn.addEventListener('click', function () {
      haptic(8);
      openAppInstallModal();
    });

    tools.append(timerPill, railBtn, fsBtn, installBtn);
    inner.appendChild(tools);
    applyTabletRailPref();
    updateTopbarInstallBtn();
  }

  /* ---------------------------------------------------------------------
     5. 갤럭시 S25 엣지 5탭 하단바 & 네이티브 바텀 시트
     --------------------------------------------------------------------- */
  function navigateToRoute(route) {
    haptic(6);
    if (route === 'inbox') {
      const btns = document.querySelectorAll('.sidebar-footer button');
      for (let i = 0; i < btns.length; i++) {
        if ((btns[i].textContent || '').indexOf('빠른 기록') >= 0) {
          btns[i].click();
          return;
        }
      }
      return;
    }
    const targetBtn = document.querySelector('.sidebar .nav-item[data-route="' + route + '"]');
    if (targetBtn) targetBtn.click();
    else window.location.hash = '#' + route;
  }

  function updateMobile5TabHighlight() {
    const bar = document.getElementById('mobile-tabbar');
    if (!bar || !bar.classList.contains('has-5-tabs')) return;
    const h = (window.location.hash || '#home').slice(1) || 'home';
    const sheetOpen = !!(document.getElementById('app-sheet-backdrop') && document.getElementById('app-sheet-backdrop').classList.contains('open'));
    const libraryRoutes = ['notes', 'answers'];
    const sheetRoutes = ['tasks', 'lectures', 'academic', 'log', 'ai', 'settings'];

    bar.querySelectorAll('.mob-tab').forEach(function (btn) {
      const r = btn.getAttribute('data-app-tab');
      let on = false;
      if (sheetOpen) on = (r === 'sheet');
      else if (r === 'home' || r === 'week' || r === 'review') on = (h === r);
      else if (r === 'notes') on = libraryRoutes.indexOf(h) >= 0;
      else if (r === 'sheet') on = sheetRoutes.indexOf(h) >= 0;
      btn.setAttribute('aria-current', on ? 'page' : 'false');
    });
  }

  function upgradeMobileTabbar() {
    const bar = document.getElementById('mobile-tabbar');
    if (!bar || bar.classList.contains('has-5-tabs')) return;

    bar.classList.add('has-5-tabs');
    bar.innerHTML = '';

    const tabs = [
      {
        key: 'home', label: '오늘',
        svg: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>',
        onClick: function () { closeBottomSheet(); navigateToRoute('home'); },
      },
      {
        key: 'week', label: '계획',
        svg: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
        onClick: function () { closeBottomSheet(); navigateToRoute('week'); },
      },
      {
        key: 'notes', label: '서재',
        svg: '<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11a2 2 0 0 1 2 2v15.5a2 2 0 0 0-2-1.5H3z"/><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H13a2 2 0 0 0-2 2v15.5a2 2 0 0 1 2-1.5h8z"/>',
        onClick: function () { closeBottomSheet(); navigateToRoute('notes'); },
      },
      {
        key: 'review', label: '복습',
        svg: '<rect x="5" y="3" width="14" height="16" rx="2"/><path d="M9 8h6M9 12h4"/><path d="M8 21h9a2 2 0 0 0 2-2V7"/>',
        onClick: function () { closeBottomSheet(); navigateToRoute('review'); },
      },
      {
        key: 'sheet', label: 'AI·전체',
        svg: '<path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/><path d="M12 7.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/>',
        onClick: function () { toggleBottomSheet(); },
      },
    ];

    tabs.forEach(function (t) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mob-tab';
      btn.setAttribute('data-app-tab', t.key);
      btn.innerHTML = '<span class="ico" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">' + t.svg + '</svg></span><span>' + t.label + '</span>';
      btn.addEventListener('click', t.onClick);
      bar.appendChild(btn);
    });

    updateMobile5TabHighlight();
  }

  function ensureBottomSheet() {
    let backdrop = document.getElementById('app-sheet-backdrop');
    if (backdrop) return backdrop;

    backdrop = document.createElement('div');
    backdrop.id = 'app-sheet-backdrop';
    backdrop.className = 'app-sheet-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', '논결 전체 서재 메뉴');
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeBottomSheet();
    });

    const sheet = document.createElement('div');
    sheet.className = 'app-bottom-sheet';

    const profile = detectDeviceProfile();
    const tiles = [
      { id: 'ai', title: 'K-EXAONE 2.5 AI 도구', sub: '판례 요약 · 개념 즉문즉답 · 문장 교정', accent: true, full: true },
      { id: 'answers', title: '답안 연습 (GS)', sub: '실전 작성 · 채점 비교' },
      { id: 'inbox', title: '+ 빠른 기록', sub: '떠오른 쟁점 즉시 메모' },
      { id: 'notes', title: '단권화 서재', sub: '과목별 조문·판례 노트' },
      { id: 'tasks', title: '과업 관리', sub: '수험 과업 체크' },
      { id: 'lectures', title: '강의 학습', sub: '진도 · 수강 로그' },
      { id: 'academic', title: '대학 학업', sub: '연세 LearnUs 마감' },
      { id: 'log', title: '학습 기록', sub: '주간·누적 통계' },
      { id: 'settings', title: '설정과 데이터', sub: '테마 · 백업 · 동기화' },
    ];

    const gridHtml = tiles.map(function (t) {
      const cls = 'app-sheet-tile' + (t.accent ? ' accent' : '') + (t.full ? ' full' : '');
      return '<button type="button" class="' + cls + '" data-sheet-route="' + t.id + '">'
        + '<div><div>' + t.title + '</div><span class="app-sheet-tile-sub">' + t.sub + '</span></div>'
        + '</button>';
    }).join('')
      + '<button type="button" class="app-sheet-tile full" data-sheet-action="install">'
      + '<div><div>📲 앱 설치 & 기기 연결 센터</div><span class="app-sheet-tile-sub">PWA 설치 · 안드로이드 APK · 3기기 동기화 안내</span></div>'
      + '</button>';

    sheet.innerHTML =
      '<div class="app-sheet-handle" aria-hidden="true"></div>'
      + '<div class="app-sheet-head">'
      + '  <h2 class="app-sheet-title">논결 전체 서재</h2>'
      + '  <span class="app-sheet-badge">' + profile.badge + (profile.isCapacitor ? ' · APK' : (profile.isStandalone ? ' · 앱' : '')) + '</span>'
      + '</div>'
      + '<div class="app-sheet-grid">' + gridHtml + '</div>';

    sheet.querySelectorAll('[data-sheet-route]').forEach(function (b) {
      b.addEventListener('click', function () {
        const r = b.getAttribute('data-sheet-route');
        closeBottomSheet();
        navigateToRoute(r);
      });
    });
    const instTile = sheet.querySelector('[data-sheet-action="install"]');
    if (instTile) {
      instTile.addEventListener('click', function () {
        closeBottomSheet();
        openAppInstallModal();
      });
    }

    backdrop.appendChild(sheet);
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function openBottomSheet() {
    const bd = ensureBottomSheet();
    bd.classList.add('open');
    haptic(8);
    updateMobile5TabHighlight();
    try { history.pushState({ nongyeolOverlay: 'sheet' }, ''); } catch (e) {}
  }

  function closeBottomSheet() {
    const bd = document.getElementById('app-sheet-backdrop');
    if (bd && bd.classList.contains('open')) {
      bd.classList.remove('open');
      updateMobile5TabHighlight();
    }
  }

  function toggleBottomSheet() {
    const bd = document.getElementById('app-sheet-backdrop');
    if (bd && bd.classList.contains('open')) closeBottomSheet();
    else openBottomSheet();
  }

  /* ---------------------------------------------------------------------
     6. 앱 설치 & 기기 최적화 모달 (PC · 갤럭시 S25 엣지 · 요가탭 플러스 13)
     --------------------------------------------------------------------- */
  function closeAppInstallModal() {
    const m = document.getElementById('app-install-modal');
    if (m) m.remove();
  }

  function openAppInstallModal() {
    closeAppInstallModal();
    const p = detectDeviceProfile();
    const statusText = p.isCapacitor
      ? '현재 Android 네이티브 APK 앱으로 실행 중입니다 (CORS 없는 EXAONE 직접 호출 지원).'
      : p.isStandalone
        ? '현재 독립 앱(PWA) 창으로 실행 중입니다.'
        : '현재 웹 브라우저에서 열려 있습니다. 아래 버튼으로 각 기기에서 앱처럼 설치할 수 있습니다.';

    const bd = document.createElement('div');
    bd.id = 'app-install-modal';
    bd.className = 'modal-backdrop';
    bd.setAttribute('role', 'dialog');
    bd.setAttribute('aria-modal', 'true');
    bd.setAttribute('aria-label', '논결 앱 설치 및 3대 기기 최적화');
    bd.addEventListener('click', function (e) { if (e.target === bd) closeAppInstallModal(); });

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '680px';

    const canPwaPrompt = !!deferredInstallPrompt;

    modal.innerHTML =
      '<div class="modal-head">'
      + '  <h2 style="font-family:var(--font-serif)">📲 논결(NONGYEOL) 3대 기기 앱 설치 센터</h2>'
      + '  <button type="button" class="btn btn-ghost btn-sm" id="app-inst-close" aria-label="닫기">✕</button>'
      + '</div>'
      + '<div class="modal-body">'
      + '  <div class="app-install-hero">'
      + '    <img src="assets/icon-192.png" alt="논결 앱 아이콘">'
      + '    <div>'
      + '      <div style="font-weight:700;font-size:.98rem">' + p.label + '</div>'
      + '      <div class="hint" style="margin-top:2px">' + statusText + '</div>'
      + '    </div>'
      + '  </div>'
      + '  <div class="app-install-grid">'
      + '    <div class="app-device-card' + (p.kind === 'phone' ? ' current' : '') + '">'
      + '      <div class="app-device-card-head"><span>📱 갤럭시 S25 엣지</span><span class="app-device-pill">Android 폰</span></div>'
      + '      <p>• 한 손 조작 5탭 하단바 + 전체 서재 바텀시트<br>• 공부 중 화면 꺼짐 방지(Wake Lock) & 햅틱 반응<br>• <b>APK 설치</b> 시 확장앱 없이 EXAONE AI 단독 동작</p>'
      + '    </div>'
      + '    <div class="app-device-card' + (p.kind === 'tablet' ? ' current' : '') + '">'
      + '      <div class="app-device-card-head"><span>📘 레노버 요가탭 플러스 13</span><span class="app-device-pill">Android 태블릿</span></div>'
      + '      <p>• 76px 접이식 슬림 레일 + 2단 서재 화면 유지<br>• 상단 전체화면 버튼으로 필기·단권화 몰입<br>• <b>APK 설치</b> 시 확장앱 없이 EXAONE AI 단독 동작</p>'
      + '    </div>'
      + '    <div class="app-device-card' + (p.kind === 'desktop' ? ' current' : '') + '">'
      + '      <div class="app-device-card-head"><span>💻 Windows PC</span><span class="app-device-pill">데스크톱</span></div>'
      + '      <p>• 바탕화면 <b>논결 앱 실행.bat</b> 또는 브라우저 [앱 설치]<br>• LearnUs 확장 앱(v1.2.0)으로 EXAONE + 강의 동기화<br>• Google 로그인 시 휴대폰·태블릿과 1초 실시간 연동</p>'
      + '    </div>'
      + '  </div>'
      + '  <div class="card" style="margin:0;background:var(--bg)">'
      + '    <strong style="font-size:.9rem">설치 방법 2가지 (원하는 방식 선택)</strong>'
      + '    <p class="hint" style="margin:6px 0 10px">'
      + '      <b>방법 A · 즉시 앱 설치(PWA):</b> 브라우저 주소창 오른쪽 [앱 설치] 아이콘 또는 Chrome 메뉴 → <b>홈 화면에 추가 / 앱 설치</b>를 누르면 스토어 다운로드 없이 즉시 설치됩니다.<br>'
      + '      <b>방법 B · 안드로이드 정식 APK 설치:</b> GitHub에서 자동 빌드된 APK 파일을 갤럭시 S25 엣지·요가탭에 설치하면 브라우저와 분리된 네이티브 앱으로 동작하며, EXAONE API가 외부 확장앱 없이 바로 연결됩니다.'
      + '    </p>'
      + '    <div class="app-install-actions">'
      + (canPwaPrompt ? '<button type="button" class="btn btn-primary" id="app-inst-pwa-btn">✨ 지금 이 기기에 앱 바로 설치 (PWA)</button>' : '')
      + '<a class="btn ' + (canPwaPrompt ? '' : 'btn-primary') + '" href="' + APK_DOWNLOAD_URL + '" target="_blank" rel="noopener noreferrer">📦 Android APK 다운로드 (.apk)</a>'
      + '<a class="btn" href="' + APK_RELEASES_URL + '" target="_blank" rel="noopener noreferrer">빌드 버전 목록 ↗</a>'
      + '    </div>'
      + '  </div>'
      + '</div>'
      + '<div class="modal-footer">'
      + '  <button type="button" class="btn" id="app-inst-ok">닫기</button>'
      + '</div>';

    bd.appendChild(modal);
    document.body.appendChild(bd);

    modal.querySelector('#app-inst-close').addEventListener('click', closeAppInstallModal);
    modal.querySelector('#app-inst-ok').addEventListener('click', closeAppInstallModal);
    const pwaBtn = modal.querySelector('#app-inst-pwa-btn');
    if (pwaBtn) {
      pwaBtn.addEventListener('click', async function () {
        const ok = await triggerPwaInstall();
        if (ok) closeAppInstallModal();
      });
    }
  }

  /* ---------------------------------------------------------------------
     7. 설정(#settings) 화면에 기기·앱 설치 카드 자동 삽입
     --------------------------------------------------------------------- */
  function maybeInjectSettingsAppCard() {
    if ((window.location.hash || '').slice(1) !== 'settings') return;
    const content = document.getElementById('content');
    if (!content || document.getElementById('settings-app-opt-card')) return;
    const p = detectDeviceProfile();
    const card = document.createElement('div');
    card.id = 'settings-app-opt-card';
    card.className = 'card';
    card.innerHTML =
      '<div class="row between" style="gap:10px;flex-wrap:wrap;align-items:center">'
      + '  <div>'
      + '    <h2 style="font-family:var(--font-serif);margin-bottom:4px">📲 멀티 디바이스 앱 & APK 설치</h2>'
      + '    <p class="hint" style="margin:0">현재 감지된 기기: <b>' + p.label + '</b> · 갤럭시 S25 엣지 · 레노버 요가탭 플러스 13 · PC 3대 기기 최적화</p>'
      + '  </div>'
      + '  <button type="button" class="btn btn-primary" id="settings-open-install-btn">앱 설치 센터 열기</button>'
      + '</div>';
    // 첫 번째 hero 다음, 기존 카드들 상단에 배치
    const firstCard = content.querySelector('.card');
    if (firstCard && firstCard.parentNode) firstCard.parentNode.insertBefore(card, firstCard);
    else content.appendChild(card);

    card.querySelector('#settings-open-install-btn').addEventListener('click', openAppInstallModal);
  }

  /* ---------------------------------------------------------------------
     8. 안드로이드 가상 키보드 감지 & 뒤로가기 제스처 보호
     --------------------------------------------------------------------- */
  function setupKeyboardDetection() {
    if (!window.visualViewport) return;
    let lastW = window.innerWidth;
    let maxH = window.visualViewport.height;
    window.visualViewport.addEventListener('resize', function () {
      const w = window.innerWidth;
      const h = window.visualViewport.height;
      // 가로/세로 회전 시 기준 높이를 재설정
      if (Math.abs(w - lastW) > 80) {
        lastW = w;
        maxH = h;
      }
      if (h > maxH) maxH = h;
      const isPhoneOrTablet = detectDeviceProfile().kind !== 'desktop';
      const kbOpen = isPhoneOrTablet && (maxH - h > 150) && (h < maxH * 0.78);
      document.body.classList.toggle('keyboard-open', kbOpen);
    });
  }

  function setupAndroidBackProtection() {
    function handleOverlayClose() {
      const installM = document.getElementById('app-install-modal');
      if (installM) { closeAppInstallModal(); return true; }
      const modalClose = document.querySelector('.modal-backdrop .modal-head button');
      if (modalClose) { modalClose.click(); return true; }
      const bd = document.getElementById('app-sheet-backdrop');
      if (bd && bd.classList.contains('open')) { closeBottomSheet(); return true; }
      const sb = document.getElementById('sidebar');
      const sc = document.getElementById('scrim');
      if (sb && sb.classList.contains('open')) {
        sb.classList.remove('open');
        if (sc) sc.classList.remove('show');
        return true;
      }
      return false;
    }

    window.addEventListener('popstate', function () {
      handleOverlayClose();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') handleOverlayClose();
    });

    try {
      const capApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if (capApp && typeof capApp.addListener === 'function') {
        capApp.addListener('backButton', function (info) {
          if (handleOverlayClose()) return;
          if (info && info.canGoBack) {
            window.history.back();
          } else if (typeof capApp.minimizeApp === 'function') {
            capApp.minimizeApp();
          }
        });
      }
    } catch (e) {}
  }

  function enhanceSidebarTooltips() {
    document.querySelectorAll('.sidebar .nav-item').forEach(function (btn) {
      const txt = (btn.textContent || '').trim();
      if (txt && !btn.title) btn.title = txt;
    });
  }

  /* ---------------------------------------------------------------------
     9. 초기화 및 관찰 루프
     --------------------------------------------------------------------- */
  function initNativeEnhancements() {
    applyDeviceAttributes();
    registerServiceWorker();
    injectTopbarTools();
    enhanceSidebarTooltips();
    upgradeMobileTabbar();
    syncTimerPersistence();
    maybeInjectSettingsAppCard();
    setupKeyboardDetection();
    setupAndroidBackProtection();

    window.addEventListener('resize', function () {
      applyDeviceAttributes();
      updateTopbarInstallBtn();
    });
    window.addEventListener('hashchange', function () {
      setTimeout(function () {
        updateMobile5TabHighlight();
        maybeInjectSettingsAppCard();
      }, 20);
    });
    window.addEventListener('timer:changed', syncTimerPersistence);
    document.addEventListener('visibilitychange', function () {
      syncTimerPersistence();
    });
    window.addEventListener('pagehide', syncTimerPersistence);
    // pause/resume 상태 및 경과 시간 동기화를 위해 가볍게 주기 확인
    setInterval(syncTimerPersistence, 1000);

    // #content 재렌더 시(설정 저장/테마 전환 등) 설정 카드 유지
    const content = document.getElementById('content');
    if (content && typeof MutationObserver !== 'undefined') {
      new MutationObserver(function () {
        maybeInjectSettingsAppCard();
        updateMobile5TabHighlight();
      }).observe(content, { childList: true });
    }
  }

  window.NongyeolApp = {
    detectDevice: detectDeviceProfile,
    openInstallModal: openAppInstallModal,
    openBottomSheet: openBottomSheet,
    closeBottomSheet: closeBottomSheet,
    installPWA: triggerPwaInstall,
    toggleTabletRail: toggleTabletRail,
    apkUrl: APK_DOWNLOAD_URL,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // app.bundle.js의 DOMContentLoaded boot() 이후 DOM에 주입되도록 마이크로태스크/0ms 지연
      setTimeout(initNativeEnhancements, 0);
    });
  } else {
    setTimeout(initNativeEnhancements, 0);
  }
})();
