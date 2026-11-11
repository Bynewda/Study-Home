(function () {
  if (!document || !document.documentElement) return;
  document.documentElement.setAttribute('data-study-home-lu-ext', '1');
  document.documentElement.setAttribute('data-study-home-exaone-ext', '1');

  var autoTriggered = false;
  function runInitialAutoSync() {
    if (autoTriggered) return;
    autoTriggered = true;
    try {
      chrome.storage.local.get(['latestLearnUsPayload'], function (items) {
        if (chrome.runtime.lastError) return;
        if (items && items.latestLearnUsPayload) {
          window.postMessage({
            type: 'STUDY_HOME_EXT_SYNC_RESULT',
            ok: true,
            silent: true,
            payload: items.latestLearnUsPayload
          }, window.location.origin);
        }
      });
      chrome.runtime.sendMessage({ type: 'RUN_LEARNUS_SYNC_AUTO_IF_STALE' }, function (resp) {
        if (chrome.runtime.lastError) return;
        if (resp && resp.ok && resp.payload) {
          window.postMessage({
            type: 'STUDY_HOME_EXT_SYNC_RESULT',
            ok: true,
            silent: true,
            payload: resp.payload
          }, window.location.origin);
        }
      });
    } catch (e) {}
  }

  window.postMessage({ type: 'STUDY_HOME_EXT_READY' }, window.location.origin);
  setTimeout(runInitialAutoSync, 400);

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg && msg.type === 'PUSH_LEARNUS_PAYLOAD' && msg.payload) {
      window.postMessage({
        type: 'STUDY_HOME_EXT_SYNC_RESULT',
        ok: true,
        silent: true,
        payload: msg.payload
      }, window.location.origin);
    }
  });

  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data) return;
    if (e.data.type === 'STUDY_HOME_PAGE_READY') {
      runInitialAutoSync();
      return;
    }
    if (e.data.type === 'STUDY_HOME_EXAONE_FETCH') {
      var reqId = e.data.reqId;
      try {
        chrome.runtime.sendMessage({
          type: 'EXAONE_API_FETCH',
          endpoint: e.data.endpoint,
          apiKey: e.data.apiKey,
          payload: e.data.payload
        }, function (resp) {
          var lastErr = chrome.runtime.lastError;
          if (lastErr) {
            window.postMessage({
              type: 'STUDY_HOME_EXAONE_RESULT',
              reqId: reqId,
              transportOk: false,
              error: '확장 앱 통신 오류 (' + (lastErr.message || '연결 끊김') + '): 확장 앱을 새로고침한 뒤 이 페이지도 새로고침(F5)해 주세요.'
            }, window.location.origin);
            return;
          }
          window.postMessage(Object.assign({
            type: 'STUDY_HOME_EXAONE_RESULT',
            reqId: reqId
          }, resp || { transportOk: false, error: '확장 앱으로부터 응답을 받지 못했습니다.' }), window.location.origin);
        });
      } catch (err) {
        window.postMessage({
          type: 'STUDY_HOME_EXAONE_RESULT',
          reqId: reqId,
          transportOk: false,
          error: '확장 앱이 업데이트되었습니다. 페이지를 새로고침(F5)해 주세요.'
        }, window.location.origin);
      }
      return;
    }
    if (e.data.type !== 'STUDY_HOME_EXT_REQUEST_SYNC') return;
    try {
      chrome.runtime.sendMessage({ type: 'RUN_LEARNUS_SYNC' }, function (resp) {
        var lastErr = chrome.runtime.lastError;
        if (lastErr) {
          window.postMessage({
            type: 'STUDY_HOME_EXT_SYNC_RESULT',
            ok: false,
            error: '확장 앱 통신 오류: 페이지를 새로고침(F5)한 뒤 다시 눌러 주세요.'
          }, window.location.origin);
          return;
        }
        if (resp && resp.ok && resp.payload) {
          window.postMessage({
            type: 'STUDY_HOME_EXT_SYNC_RESULT',
            ok: true,
            silent: false,
            payload: resp.payload
          }, window.location.origin);
        } else {
          window.postMessage({
            type: 'STUDY_HOME_EXT_SYNC_RESULT',
            ok: false,
            error: (resp && resp.error) || 'LearnUs 동기화 중 알 수 없는 오류가 발생했습니다.'
          }, window.location.origin);
        }
      });
    } catch (err) {
      window.postMessage({
        type: 'STUDY_HOME_EXT_SYNC_RESULT',
        ok: false,
        error: '확장 앱이 업데이트되었습니다. 페이지를 새로고침(F5)해 주세요.'
      }, window.location.origin);
    }
  });
})();
