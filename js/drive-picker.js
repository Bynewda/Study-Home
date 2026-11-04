/* =========================================================================
   drive-picker.js — 구글 드라이브 파일 선택(Picker) 연동 (일반 스크립트)
   - index.html 에서 http/https 환경일 때만 로드됩니다. (file:// 에서는 동작 불가)
   - 번들(app.bundle.js)과는 window.StudyDrive 전역으로 통신합니다.
   - drive.file 범위: 사용자가 Picker로 고른 파일만 접근 (심사 불필요, 안전)

   사용 흐름
   1) 번들이 StudyDrive.configured 로 사용 가능 여부 확인
   2) StudyDrive.pickFiles(onPicked) 호출 → 필요 시 구글 로그인/동의 → Picker 표시
   3) 사용자가 파일 선택 → onPicked([{id, name, mimeType, url, sizeBytes}]) 콜백
   ========================================================================= */
(function () {
  var cfg = window.__DRIVE_CONFIG__ || null;

  var StudyDrive = {
    configured: !!(cfg && cfg.apiKey && cfg.clientId),
    _tokenClient: null,
    _accessToken: null,
    _tokenExpireAt: 0,
    _pickerReady: false,
    _gisReady: false,
    _gapiLoading: false,
    _gisLoading: false,
    // Drive App ID = Cloud 프로젝트 번호 (OAuth 클라이언트 ID 앞부분)
    _appId: cfg && cfg.clientId ? String(cfg.clientId).split('-')[0] : '',

    // 외부 스크립트 1회 로드
    _loadScript: function (src, onload) {
      var s = document.createElement('script');
      s.async = true; s.defer = true; s.src = src;
      s.onload = onload;
      s.onerror = function () { console.error('[StudyDrive] 스크립트 로드 실패:', src); };
      document.head.appendChild(s);
    },

    _ensureGapi: function (cb) {
      var self = this;
      if (self._pickerReady) { cb(); return; }
      function afterApi() {
        if (!window.gapi) { console.error('[StudyDrive] gapi 없음'); return; }
        window.gapi.load('picker', function () { self._pickerReady = true; cb(); });
      }
      if (window.gapi && window.gapi.load) { afterApi(); return; }
      if (self._gapiLoading) { // 이미 로딩 중이면 잠시 후 재시도
        var t = setInterval(function () { if (window.gapi && window.gapi.load) { clearInterval(t); afterApi(); } }, 120);
        return;
      }
      self._gapiLoading = true;
      self._loadScript('https://apis.google.com/js/api.js', afterApi);
    },

    _ensureGis: function (cb) {
      var self = this;
      if (self._gisReady && self._tokenClient) { cb(); return; }
      function afterGis() {
        if (!(window.google && window.google.accounts && window.google.accounts.oauth2)) {
          console.error('[StudyDrive] GIS 없음'); return;
        }
        self._tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: cfg.clientId,
          scope: cfg.scope || 'https://www.googleapis.com/auth/drive.file',
          callback: function () {}, // pickFiles 에서 매번 교체
        });
        self._gisReady = true;
        cb();
      }
      if (window.google && window.google.accounts && window.google.accounts.oauth2) { afterGis(); return; }
      if (self._gisLoading) {
        var t = setInterval(function () {
          if (window.google && window.google.accounts && window.google.accounts.oauth2) { clearInterval(t); afterGis(); }
        }, 120);
        return;
      }
      self._gisLoading = true;
      self._loadScript('https://accounts.google.com/gsi/client', afterGis);
    },

    _hasValidToken: function () {
      return this._accessToken && Date.now() < (this._tokenExpireAt - 60000);
    },

    // 액세스 토큰 확보(필요 시 로그인/동의 창) → cb(token) 또는 cb(null, err)
    _getToken: function (cb, forcePrompt) {
      var self = this;
      if (self._hasValidToken() && !forcePrompt) { cb(self._accessToken); return; }
      self._ensureGis(function () {
        self._tokenClient.callback = function (resp) {
          if (resp && resp.error) { cb(null, resp.error); return; }
          self._accessToken = resp.access_token;
          // expires_in(초) 후 만료 — 여유 두고 저장
          self._tokenExpireAt = Date.now() + (Number(resp.expires_in || 3600) * 1000);
          cb(self._accessToken);
        };
        try {
          self._tokenClient.requestAccessToken({ prompt: self._accessToken ? '' : 'consent' });
        } catch (e) { cb(null, e); }
      });
    },

    /**
     * 구글 드라이브 Picker 표시 → 선택 결과 콜백
     * @param {function} onPicked  선택 완료 시 호출: onPicked(files[]) / files=[] 면 취소
     * @param {object}  opts       { multiple:boolean }
     * @param {function} onError   오류 시 호출(선택)
     */
    pickFiles: function (onPicked, opts, onError) {
      var self = this;
      opts = opts || {};
      if (!self.configured) { if (onError) onError('drive-not-configured'); return; }
      self._getToken(function (token, err) {
        if (!token) { if (onError) onError(err || 'no-token'); return; }
        self._ensureGapi(function () {
          try {
            var google = window.google;
            var view = new google.picker.DocsView(google.picker.ViewId.DOCS)
              .setIncludeFolders(true)
              .setSelectFolderEnabled(false)
              .setMimeTypes('application/pdf,image/png,image/jpeg,image/jpg,image/gif,image/webp');
            var builder = new google.picker.PickerBuilder()
              .setOrigin(window.location.protocol + '//' + window.location.host)
              .addView(view)
              .setOAuthToken(token)
              .setDeveloperKey(cfg.apiKey)
              .setCallback(function (data) {
                var A = google.picker.Action;
                if (!data || data[google.picker.Response.ACTION] !== A.PICKED) {
                  if (data && data[google.picker.Response.ACTION] === A.CANCEL) { onPicked([]); }
                  return;
                }
                var docs = data[google.picker.Response.DOCUMENTS] || [];
                var files = docs.map(function (d) {
                  return {
                    id: d[google.picker.Document.ID],
                    name: d[google.picker.Document.NAME],
                    mimeType: d[google.picker.Document.MIME_TYPE],
                    url: 'https://drive.google.com/file/d/' + d[google.picker.Document.ID] + '/preview',
                    sizeBytes: d[google.picker.Document.SIZE_BYTES] || 0,
                  };
                });
                onPicked(files);
              });
            if (self._appId) builder.setAppId(self._appId);
            if (opts.multiple) builder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
            builder.build().setVisible(true);
          } catch (e) {
            console.error('[StudyDrive] Picker 생성 오류', e);
            if (onError) onError(e);
          }
        });
      });
    },

    // 로그인 상태(토큰 보유) 여부 — 열람 전 안내용
    isAuthorized: function () { return this._hasValidToken(); },
  };

  window.StudyDrive = StudyDrive;
  window.dispatchEvent(new CustomEvent('studydrive:ready'));
})();
