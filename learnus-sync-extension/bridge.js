(function () {
  if (!document || !document.documentElement) return;
  document.documentElement.setAttribute('data-study-home-lu-ext', '1');
  window.postMessage({ type: 'STUDY_HOME_EXT_READY' }, window.location.origin);

  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data || e.data.type !== 'STUDY_HOME_EXT_REQUEST_SYNC') return;
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
