/* =========================================================================
   firebase-sync.js — 구글 로그인 + Firestore 실시간 동기화 (ES 모듈)
   - index.html 에서 <script type="module"> 로 로드됩니다.
   - 번들(app.bundle.js)과는 window.StudyCloud 전역으로 통신합니다.
   - PC · 휴대폰 · 태블릿에서 같은 구글 계정으로 로그인하면 기록이 실시간 공유됩니다.

   동작 요약
   - 로그인 전: 아무것도 안 함 (앱은 localStorage로 평소처럼 동작)
   - 로그인 후:
       1) 클라우드 문서 구독(onSnapshot) → 바뀌면 로컬에 반영
       2) 로컬이 바뀌면(StudyCloud.pushLocal) → 디바운스 후 클라우드 업로드
       3) 최초 로그인 시 클라우드가 비어 있으면 로컬 데이터를 올림
   - 충돌: updatedAt 타임스탬프 비교(최신 우선, Last-Write-Wins)
   - 모바일: 팝업 로그인이 막히면 자동으로 리디렉션 로그인으로 전환
   - 오프라인: 기기 내 캐시(IndexedDB)에 보관했다가 연결되면 자동 업로드
   ========================================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, getDoc, setDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ====== Firebase 설정값 (js/firebase-config.js 에서 주입) ======
const firebaseConfig = window.__FIREBASE_CONFIG__ || null;
// ===============================================================

// Firestore 문서 1개 최대 1MiB — 여유를 두고 경고
const DOC_SIZE_WARN = 900 * 1024;

// 카카오톡·네이버·인스타그램 등 앱 내부 브라우저는 구글이 로그인을 차단(disallowed_useragent)
function detectInAppBrowser() {
  const ua = (navigator.userAgent || "").toLowerCase();
  if (/kakaotalk/.test(ua)) return "카카오톡";
  if (/naver\(inapp|naver\/|whale\/.*inapp/.test(ua) && /mobile/.test(ua)) return "네이버 앱";
  if (/instagram/.test(ua)) return "인스타그램";
  if (/fban|fbav|fb_iab/.test(ua)) return "페이스북";
  if (/line\//.test(ua)) return "라인";
  if (/everytimeapp/.test(ua)) return "에브리타임";
  if (/; wv\)/.test(ua)) return "앱 내부 브라우저";
  return null;
}
function isMobileLike() {
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS
}

const StudyCloud = {
  enabled: false,
  user: null,
  status: "idle",       // idle | syncing | synced | offline | error
  lastSyncedAt: null,
  lastError: null,
  _db: null,
  _auth: null,
  _unsub: null,
  _pushTimer: null,
  _applyingRemote: false,
  _lastAppliedPayload: null,  // 방금 반영/업로드한 payload 문자열 (에코 무시용)
  _onState: null,      // 번들이 등록하는 상태 변경 콜백
  _getLocal: null,     // 번들이 등록: 현재 로컬 데이터 반환
  _setLocal: null,     // 번들이 등록: 클라우드 데이터를 로컬에 반영

  // 번들에서 호출해 콜백을 연결
  register(opts) {
    this._onState = opts.onState || null;
    this._getLocal = opts.getLocal || null;
    this._setLocal = opts.setLocal || null;
    if (this._auth || !firebaseConfig) this._emit();
  },

  _emit() {
    if (!this._onState) return;
    this._onState({
      enabled: this.enabled,
      user: this.user ? { name: this.user.displayName, email: this.user.email, photo: this.user.photoURL } : null,
      status: this.status,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    });
  },

  _setStatus(status, err) {
    this.status = status;
    if (status === "synced") { this.lastSyncedAt = Date.now(); this.lastError = null; }
    if (err) this.lastError = String(err && err.message ? err.message : err);
    this._emit();
  },

  init() {
    if (!firebaseConfig) {
      console.warn("[StudyCloud] Firebase 설정값이 없습니다. 로그인/동기화 비활성화.");
      this.enabled = false;
      this._emit();
      return;
    }
    try {
      const app = initializeApp(firebaseConfig);
      this._auth = getAuth(app);
      setPersistence(this._auth, browserLocalPersistence).catch(() => {});
      // 오프라인 캐시(여러 탭 공유). 지원하지 않는 브라우저면 기본 메모리 캐시로.
      try {
        this._db = initializeFirestore(app, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        });
      } catch (e) {
        console.warn("[StudyCloud] 오프라인 캐시 미지원 — 기본 모드", e);
        this._db = getFirestore(app);
      }
      this.enabled = true;

      // 모바일 리디렉션 로그인에서 돌아온 경우 결과 처리
      getRedirectResult(this._auth).catch((e) => this._handleLoginError(e));

      onAuthStateChanged(this._auth, (user) => {
        this.user = user;
        if (user) this._startSync(user.uid);
        else { this._stopSync(); this.status = "idle"; }
        this._emit();
      });

      window.addEventListener("online", () => { if (this.user) { this._setStatus("syncing"); this._flushNow(); } });
      window.addEventListener("offline", () => { if (this.user) this._setStatus("offline"); });
      // 휴대폰에서 앱을 닫거나 다른 앱으로 넘어갈 때 대기 중인 업로드를 즉시 전송
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") this._flushNow();
      });
    } catch (e) {
      console.error("[StudyCloud] 초기화 실패", e);
      this.enabled = false;
      this._setStatus("error", e);
    }
  },

  async login() {
    if (!this.enabled) { alert("클라우드 설정이 아직 없습니다. (js/firebase-config.js)"); return; }
    const inApp = detectInAppBrowser();
    if (inApp) {
      alert(inApp + " 안에서는 구글이 로그인을 막습니다.\n\n오른쪽 위(또는 아래) 메뉴 → '다른 브라우저로 열기'를 눌러\n크롬·삼성 인터넷·사파리에서 이 주소를 열고 로그인하세요.\n\n" + location.href);
      return;
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(this._auth, provider);
    } catch (e) {
      const code = e && e.code ? e.code : "";
      // 휴대폰·태블릿에서 팝업이 막히면 리디렉션 방식으로 자동 전환
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment" ||
          (isMobileLike() && code === "auth/cancelled-popup-request")) {
        try { await signInWithRedirect(this._auth, provider); return; }
        catch (e2) { this._handleLoginError(e2); return; }
      }
      this._handleLoginError(e);
    }
  },

  _handleLoginError(e) {
    if (!e) return;
    console.error("[StudyCloud] 로그인 실패", e);
    const code = e.code || "";
    let msg;
    if (code === "auth/unauthorized-domain") {
      msg = "이 사이트 주소가 Firebase에 등록돼 있지 않습니다.\nFirebase 콘솔 → Authentication → 설정 → 승인된 도메인에 '" + location.hostname + "' 을(를) 추가하세요.";
    } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      return; // 사용자가 직접 닫음
    } else if (code === "auth/operation-not-allowed") {
      msg = "구글 로그인이 꺼져 있습니다.\nFirebase 콘솔 → Authentication → 로그인 방법에서 Google 을 사용 설정하세요.";
    } else if (code === "auth/network-request-failed") {
      msg = "네트워크 연결을 확인한 뒤 다시 시도하세요.";
    } else if (code === "auth/web-storage-unsupported") {
      msg = "브라우저의 쿠키/저장소가 차단돼 있습니다. 사파리라면 '설정 → Safari → 크로스 사이트 추적 방지'를 잠시 끄거나 크롬에서 시도하세요.";
    } else {
      msg = "로그인에 실패했습니다: " + (e.message || e);
    }
    alert(msg);
  },

  async logout() {
    await this._flushNow();
    try { await signOut(this._auth); } catch (e) { console.error(e); }
  },

  // 수동 '지금 동기화' — 클라우드 최신본과 다시 비교
  async syncNow() {
    if (!this.user) return;
    await this._flushNow();
    await this._startSync(this.user.uid);
  },

  _docRef(uid) { return doc(this._db, "users", uid, "data", "main"); },

  async _upload(data) {
    if (!this.user || !data) return;
    const payload = JSON.stringify(data);
    if (payload.length > DOC_SIZE_WARN) {
      console.warn("[StudyCloud] 데이터가 커서 곧 동기화 한도(1MB)에 도달합니다:", Math.round(payload.length / 1024) + "KB");
      if (payload.length > 1000 * 1024) {
        this._setStatus("error", "데이터가 1MB를 넘어 클라우드에 저장할 수 없습니다. 설정에서 백업 후 오래된 기록을 정리하세요.");
        return;
      }
    }
    this._lastAppliedPayload = payload;   // 내가 올린 것 기록 → 에코 무시
    this._setStatus("syncing");
    await setDoc(this._docRef(this.user.uid), { payload: payload, updatedAt: Date.now() });
    this._setStatus(navigator.onLine === false ? "offline" : "synced");
  },

  async _startSync(uid) {
    const ref = this._docRef(uid);
    this._setStatus("syncing");
    // 최초: 클라우드가 비어 있으면 로컬 데이터를 올림 / 있으면 최신 쪽 채택
    try {
      const snap = await getDoc(ref);
      const local = this._getLocal ? this._getLocal() : null;
      if (!snap.exists()) {
        if (local) await this._upload(local);
      } else {
        const remote = this._parse(snap.data());
        const rt = remote && remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
        const lt = local && local.updatedAt ? Date.parse(local.updatedAt) : 0;
        if (remote && rt >= lt) {
          this._lastAppliedPayload = snap.data().payload;
          this._applyRemote(remote);
          this._setStatus("synced");
        } else if (local) {
          await this._upload(local);
        }
      }
    } catch (e) {
      console.error("[StudyCloud] 초기 동기화 오류", e);
      this._setStatus(navigator.onLine === false ? "offline" : "error", e);
    }

    // 실시간 구독
    if (this._unsub) this._unsub();
    this._unsub = onSnapshot(ref, { includeMetadataChanges: false }, (snap) => {
      if (!snap.exists()) return;
      const payloadStr = snap.data() && snap.data().payload;
      if (payloadStr && payloadStr === this._lastAppliedPayload) {
        if (!snap.metadata.hasPendingWrites) this._setStatus("synced");
        return; // 방금 내가 올린 변경의 에코
      }
      const remote = this._parse(snap.data());
      if (!remote) return;
      const local = this._getLocal ? this._getLocal() : null;
      const rt = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
      const lt = local && local.updatedAt ? Date.parse(local.updatedAt) : 0;
      if (rt >= lt) {
        this._lastAppliedPayload = payloadStr;
        this._applyRemote(remote);
        this._setStatus("synced");
      }
    }, (err) => {
      console.error("[StudyCloud] 구독 오류", err);
      const denied = err && err.code === "permission-denied";
      this._setStatus("error", denied ? "Firestore 보안 규칙이 접근을 막았습니다. 파이어베이스설정.md 5단계 규칙을 게시했는지 확인하세요." : err);
    });
  },

  _stopSync() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  },

  _parse(docData) {
    try { return docData && docData.payload ? JSON.parse(docData.payload) : null; }
    catch (e) { return null; }
  },

  _applyRemote(remote) {
    if (!this._setLocal) return;
    this._applyingRemote = true;
    try { this._setLocal(remote); } finally { this._applyingRemote = false; }
  },

  _pendingData: null,

  // 번들이 로컬 변경 시 호출 → 디바운스 후 클라우드 업로드
  pushLocal(data) {
    if (!this.enabled || !this.user) return;      // 로그인 상태만
    if (this._applyingRemote) return;              // 원격 반영 중엔 되올리지 않음
    this._pendingData = data;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => { this._flushNow(); }, 700);
  },

  async _flushNow() {
    clearTimeout(this._pushTimer);
    const data = this._pendingData;
    this._pendingData = null;
    if (!data || !this.user) return;
    try { await this._upload(data); }
    catch (e) {
      console.error("[StudyCloud] 업로드 오류", e);
      this._setStatus(navigator.onLine === false ? "offline" : "error", e);
    }
  },
};

window.StudyCloud = StudyCloud;
StudyCloud.init();
// 번들이 이미 로드돼 콜백을 등록해 둔 경우를 위해 신호
window.dispatchEvent(new CustomEvent("studycloud:ready"));
