/* =========================================================================
   drive-config.js — Google Drive(Picker) 연동 설정값
   GS 자료함에서 구글 드라이브의 PDF를 가져와 여러 기기에서 열람하기 위한 값.
   이 값(apiKey, clientId)은 공개돼도 되는 값입니다.
   실제 보안은 승인된 도메인 제한 + 구글 로그인 + drive.file 범위가 담당합니다.
   값이 없으면( null ) 드라이브 연동 버튼이 자동으로 숨겨지고, 로컬 파일 첨부만 동작합니다.
   ========================================================================= */
window.__DRIVE_CONFIG__ = {
  // Google Cloud 콘솔 → API 키
  apiKey: "AIzaSyA7pny4epIBbUlk_7dmizhA6Xa0UcMRB38",
  // Google Cloud 콘솔 → OAuth 2.0 클라이언트 ID (웹 애플리케이션)
  clientId: "679199254232-m3ju05jggfkams1qmm33v7rrqj96rn5m.apps.googleusercontent.com",
  // 앱이 접근하는 범위 — drive.file: 이 앱으로 연/만든 파일만 (심사 불필요)
  scope: "https://www.googleapis.com/auth/drive.file",
};
