var lastVisitAutoSyncAt = 0;
var syncInProgress = false;

function waitForTabComplete(tabId, timeoutMs) {
  return new Promise(function (resolve) {
    var done = false;
    function finish(tab) {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timer);
      resolve(tab);
    }
    function listener(updatedId, info, tab) {
      if (updatedId === tabId && info.status === 'complete') {
        finish(tab);
      }
    }
    var timer = setTimeout(function () {
      chrome.tabs.get(tabId, function (t) { finish(t || null); });
    }, timeoutMs || 15000);
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId, function (t) {
      if (t && t.status === 'complete') finish(t);
    });
  });
}

async function saveAndBroadcastPayload(payload) {
  if (!payload) return;
  try {
    await chrome.storage.local.set({
      latestLearnUsPayload: payload,
      latestLearnUsAt: Date.now()
    });
  } catch (e) {}

  try {
    var homeTabs = await chrome.tabs.query({
      url: [
        'https://study-space-2027.netlify.app/*',
        'http://localhost/*',
        'http://127.0.0.1/*'
      ]
    });
    for (var i = 0; i < homeTabs.length; i++) {
      if (homeTabs[i] && homeTabs[i].id) {
        chrome.tabs.sendMessage(homeTabs[i].id, {
          type: 'PUSH_LEARNUS_PAYLOAD',
          payload: payload
        }, function () { void chrome.runtime.lastError; });
      }
    }
  } catch (e) {}
}

async function collectFromLearnUsTab() {
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
    var dashDoc = await fetchDoc('https://ys.learnus.org/');
    var courseMap = {};
    var courses = [];
    var links = dashDoc.querySelectorAll('a[href*="/course/view.php?id="]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var u;
      try { u = new URL(a.getAttribute('href'), 'https://ys.learnus.org'); } catch (e) { continue; }
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

    var hasLogout = !!dashDoc.querySelector('a[href*="logout"]') || /로그아웃/.test(dashDoc.body ? dashDoc.body.textContent : '');
    if (!hasLogout && courses.length === 0) {
      return { ok: false, notLoggedIn: true };
    }

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
        if (cLink) { try { nCid = new URL(cLink.getAttribute('href'), 'https://ys.learnus.org').searchParams.get('id') || ''; } catch (e) {} }
        var dueIso = '';
        if (timeLink) {
          try {
            var tsVal = new URL(timeLink.getAttribute('href'), 'https://ys.learnus.org').searchParams.get('time');
            if (tsVal) dueIso = tsToLocalIso(tsVal);
          } catch (e) {}
        }
        if (!dueIso) dueIso = parseDateStr(node.textContent, true);
        var modHref = mLink ? new URL(mLink.getAttribute('href'), 'https://ys.learnus.org').href : '';
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

    var ntcMap = {};
    var cutoffPastSub = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 19);
    var cutoffPastAll = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 19);

    for (var ci = 0; ci < courses.length; ci++) {
      var crs = courses[ci];
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

      try {
        var cDoc = await fetchDoc(crs.url);
        var boardLinks = cDoc.querySelectorAll('a[href*="/mod/ubboard/view.php?id="], a[href*="/mod/forum/view.php?id="]');
        var targetBoards = [];
        var fallbackBoard = null;
        for (var bi = 0; bi < boardLinks.length; bi++) {
          var bl = boardLinks[bi];
          var bHref = new URL(bl.getAttribute('href'), 'https://ys.learnus.org').href;
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
            var noticeTime = Date.parse(nDate + 'T00:00:00+09:00');
            if (!Number.isFinite(noticeTime) || noticeTime <= Date.now() - 7 * 24 * 60 * 60 * 1000) continue;
            var nKey = 'lu-ntc-' + crs.luId + '-' + artId;
            if (!ntcMap[nKey]) {
              ntcMap[nKey] = {
                externalId: nKey,
                luCourseId: crs.luId,
                courseName: crs.name,
                title: artTitle,
                date: nDate,
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
    return {
      ok: true,
      payload: {
        app: 'patent-study-home-learnus',
        syncedAt: new Date().toISOString(),
        courses: courses,
        assignments: asgList,
        notices: ntcList
      }
    };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

async function runOnTab(tabId) {
  var execRes;
  try {
    execRes = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: collectFromLearnUsTab
    });
  } catch (e) {
    execRes = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: collectFromLearnUsTab
    });
  }
  return execRes && execRes[0] && execRes[0].result;
}

async function handleSync(silent) {
  if (syncInProgress) {
    return { ok: false, error: '동기화가 이미 진행 중입니다.' };
  }
  syncInProgress = true;
  try {
    var tabs = await chrome.tabs.query({ url: 'https://ys.learnus.org/*' });
    var tab = tabs && tabs.length ? tabs[0] : null;
    var createdTempTab = false;

    if (!tab) {
      tab = await chrome.tabs.create({ url: 'https://ys.learnus.org/', active: false });
      createdTempTab = true;
      tab = await waitForTabComplete(tab.id, 15000);
    } else if (tab.status !== 'complete') {
      tab = await waitForTabComplete(tab.id, 10000);
    }

    if (!tab || !tab.id) {
      return { ok: false, error: 'LearnUs 탭을 열 수 없습니다.' };
    }

    var latestTab = await chrome.tabs.get(tab.id);
    var currentUrl = (latestTab && latestTab.url) || '';
    if (!currentUrl || currentUrl.indexOf('learnus.org') < 0 || /\/login\/|infra\.yonsei\.ac\.kr/i.test(currentUrl)) {
      if (silent) {
        if (createdTempTab) { try { await chrome.tabs.remove(tab.id); } catch (e) {} }
        return { ok: false, silent: true, error: '미로그인 상태' };
      }
      await chrome.tabs.update(tab.id, { active: true });
      return { ok: false, error: 'LearnUs 로그인이 필요합니다. 열린 LearnUs 탭에서 로그인하신 뒤 다시 동기화 버튼을 눌러 주세요.' };
    }

    var res = await runOnTab(tab.id);
    if (res && res.notLoggedIn) {
      if (silent) {
        if (createdTempTab) { try { await chrome.tabs.remove(tab.id); } catch (e) {} }
        return { ok: false, silent: true, error: '미로그인 상태' };
      }
      await chrome.tabs.update(tab.id, { active: true });
      return { ok: false, error: 'LearnUs에 로그인되어 있지 않습니다. 열린 LearnUs 탭에서 로그인하신 뒤 다시 눌러 주세요.' };
    }

    if (createdTempTab) {
      try { await chrome.tabs.remove(tab.id); } catch (e) {}
    }

    if (res && res.ok && res.payload) {
      await saveAndBroadcastPayload(res.payload);
      return { ok: true, payload: res.payload };
    }
    return { ok: false, error: (res && res.error) || 'LearnUs 데이터를 가져오지 못했습니다.' };
  } finally {
    syncInProgress = false;
  }
}

/* LearnUs에 접속할 때마다 자동으로 백그라운드 수집 (5분 쿨타임) */
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status !== 'complete' || !tab || !tab.url) return;
  if (tab.url.indexOf('https://ys.learnus.org/') !== 0) return;
  if (/\/login\/|logout\.php/i.test(tab.url)) return;
  if (syncInProgress || (Date.now() - lastVisitAutoSyncAt < 5 * 60 * 1000)) return;
  lastVisitAutoSyncAt = Date.now();
  setTimeout(function () {
    runOnTab(tabId)
      .then(function (res) {
        if (res && res.ok && res.payload) {
          saveAndBroadcastPayload(res.payload);
        }
      })
      .catch(function () {});
  }, 1200);
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg && msg.type === 'RUN_LEARNUS_SYNC') {
    handleSync(false)
      .then(function (r) { sendResponse(r); })
      .catch(function (err) { sendResponse({ ok: false, error: err && err.message ? err.message : String(err) }); });
    return true;
  }
  if (msg && msg.type === 'RUN_LEARNUS_SYNC_AUTO_IF_STALE') {
    chrome.storage.local.get(['latestLearnUsAt'], function (items) {
      var lastAt = (items && items.latestLearnUsAt) || 0;
      if (Date.now() - lastAt < 15 * 60 * 1000) {
        sendResponse({ ok: false, skipped: true });
        return;
      }
      handleSync(true)
        .then(function (r) { sendResponse(r); })
        .catch(function () { sendResponse({ ok: false, silent: true }); });
    });
    return true;
  }
});
