/* =========================================================================
   firebase-sync.js — 구글 로그인 + Firestore 실시간 동기화 (ES 모듈)
   - index.html 에서 <script type="module"> 로 로드됩니다.
   - 번들(app.bundle.js)과는 window.StudyCloud 전역으로 통신합니다.
   - 로그인하면 여러 기기에서 같은 구글 계정의 기록이 실시간 공유됩니다.

   동작 요약
   - 로그인 전: 아무것도 안 함 (앱은 localStorage로 평소처럼 동작)
   - 로그인 후:
       1) 클라우드 문서 구독(onSnapshot) → 바뀌면 로컬에 반영
       2) 로컬이 바뀌면(StudyCloud.pushLocal) → 디바운스 후 클라우드 업로드
       3) 최초 로그인 시 클라우드가 비어 있으면 로컬 데이터를 올림
   - 충돌: updatedAt 타임스탬프 비교(최신 우선, Last-Write-Wins)
   ========================================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ====== 여기에 Firebase 설정값이 들어갑니다 (2단계에서 복사한 값) ======
const firebaseConfig = window.__FIREBASE_CONFIG__ || null;
// ====================================================================

const StudyCloud = {
  enabled: false,
  user: null,
  _db: null,
  _auth: null,
  _unsub: null,
  _pushTimer: null,
  _applyingRemote: false,
  _onState: null,      // 번들이 등록하는 상태 변경 콜백
  _getLocal: null,     // 번들이 등록: 현재 로컬 데이터 반환
  _setLocal: null,     // 번들이 등록: 클라우드 데이터를 로컬에 반영

  // 번들에서 호출해 콜백을 연결
  register(opts) {
    this._onState = opts.onState || null;
    this._getLocal = opts.getLocal || null;
    this._setLocal = opts.setLocal || null;
    // 이미 초기화돼 로그인 상태면 즉시 알림
    if (this._auth) this._emit();
  },

  _emit() {
    if (this._onState) {
      this._onState({ enabled: this.enabled, user: this.user ? { name: this.user.displayName, email: this.user.email, photo: this.user.photoURL } : null });
    }
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
      this._db = getFirestore(app);
      this.enabled = true;
      onAuthStateChanged(this._auth, (user) => {
        this.user = user;
        if (user) this._startSync(user.uid);
        else this._stopSync();
        this._emit();
      });
    } catch (e) {
      console.error("[StudyCloud] 초기화 실패", e);
      this.enabled = false;
      this._emit();
    }
  },

  async login() {
    if (!this.enabled) { alert("클라우드 설정이 아직 없습니다."); return; }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this._auth, provider);
    } catch (e) {
      console.error("[StudyCloud] 로그인 실패", e);
      const code = e && e.code ? e.code : "";
      let msg;
      if (code === "auth/unauthorized-domain") {
        msg = "이 사이트 주소가 Firebase에 등록돼 있지 않습니다.\nFirebase 콘솔 → Authentication → Settings → 승인된 도메인에 현재 도메인(예: bynewda.github.io)을 추가하세요.";
      } else if (code === "auth/popup-blocked") {
        msg = "브라우저가 로그인 팝업을 막았습니다. 팝업 차단을 해제하고 다시 시도하세요.";
      } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return; // 사용자가 직접 닫음 — 조용히 무시
      } else if (code === "auth/operation-not-allowed") {
        msg = "구글 로그인 제공업체가 꺼져 있습니다.\nFirebase 콘솔 → Authentication → Sign-in method 에서 Google 을 사용 설정하세요.";
      } else {
        msg = "로그인에 실패했습니다: " + (e && e.message ? e.message : e);
      }
      alert(msg);
    }
  },

  async logout() {
    try { await signOut(this._auth); } catch (e) { console.error(e); }
  },

  _docRef(uid) { return doc(this._db, "users", uid, "data", "main"); },

  async _startSync(uid) {
    const ref = this._docRef(uid);
    // 최초: 클라우드가 비어 있으면 로컬 데이터를 올림
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const local = this._getLocal ? this._getLocal() : null;
        if (local) await setDoc(ref, { payload: JSON.stringify(local), updatedAt: Date.now() });
      } else {
        // 클라우드가 있으면: 로컬과 비교해 최신 것을 채택
        const remote = this._parse(snap.data());
        const local = this._getLocal ? this._getLocal() : null;
        const rt = remote && remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
        const lt = local && local.updatedAt ? Date.parse(local.updatedAt) : 0;
        if (remote && rt >= lt) {
          this._applyRemote(remote);
        } else if (local) {
          await setDoc(ref, { payload: JSON.stringify(local), updatedAt: Date.now() });
        }
      }
    } catch (e) { console.error("[StudyCloud] 초기 동기화 오류", e); }

    // 실시간 구독
    if (this._unsub) this._unsub();
    this._unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const payloadStr = snap.data() && snap.data().payload;
      // 방금 내가 올린 변경이 그대로 되돌아온 에코면 무시 (불필요한 재렌더 방지)
      if (payloadStr && payloadStr === this._lastAppliedPayload) return;
      const remote = this._parse(snap.data());
      if (!remote) return;
      const local = this._getLocal ? this._getLocal() : null;
      const rt = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
      const lt = local && local.updatedAt ? Date.parse(local.updatedAt) : 0;
      if (rt >= lt) { this._lastAppliedPayload = payloadStr; this._applyRemote(remote); }
    }, (err) => console.error("[StudyCloud] 구독 오류", err));
  },

  _stopSync() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  },

  _lastAppliedPayload: null,  // 방금 반영/업로드한 payload 문자열 (에코 무시용)

  _parse(docData) {
    try { return docData && docData.payload ? JSON.parse(docData.payload) : null; }
    catch (e) { return null; }
  },

  _applyRemote(remote) {
    if (!this._setLocal) return;
    this._applyingRemote = true;
    try { this._setLocal(remote); } finally { this._applyingRemote = false; }
  },

  // 번들이 로컬 변경 시 호출 → 디바운스 후 클라우드 업로드
  pushLocal(data) {
    if (!this.enabled || !this.user) return;      // 로그인 상태만
    if (this._applyingRemote) return;              // 원격 반영 중엔 되올리지 않음
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(async () => {
      try {
        const payload = JSON.stringify(data);
        this._lastAppliedPayload = payload;   // 내가 올린 것 기록 → 에코 무시
        await setDoc(this._docRef(this.user.uid), { payload: payload, updatedAt: Date.now() });
      } catch (e) { console.error("[StudyCloud] 업로드 오류", e); }
    }, 700);
  },
};

window.StudyCloud = StudyCloud;
StudyCloud.init();
// 번들이 이미 로드돼 콜백을 등록해 둔 경우를 위해 신호
window.dispatchEvent(new CustomEvent("studycloud:ready"));
