// ============================================================
// シフト管理システム 共通設定
// ============================================================

// ============================================================
// 簡易ログインチェック（社員コードでログイン）
// ============================================================
(function () {
  const isLoginPage = /\/login\.html$/.test(location.pathname) || location.pathname.endsWith('login.html');
  const authRaw = localStorage.getItem('shiftAppAuth');

  if (!isLoginPage && !authRaw) {
    location.href = 'login.html';
    return;
  }

  // ログイン済みなら、画面右上に名前とログアウトボタンを出す
  if (!isLoginPage && authRaw) {
    window.addEventListener('DOMContentLoaded', () => {
      let auth;
      try { auth = JSON.parse(authRaw); } catch (e) { auth = null; }
      const bar = document.createElement('div');
      bar.style.cssText = 'position:fixed;top:0;right:0;background:#333;color:white;font-size:0.72rem;padding:4px 10px;border-radius:0 0 0 6px;z-index:9999;';
      const nameLabel = auth && auth.name ? `👤 ${auth.name}さん　` : '';
      bar.innerHTML = `${nameLabel}<a href="#" style="color:#9cf;" id="shiftAppLogoutLink">ログアウト</a>`;
      document.body.appendChild(bar);
      document.getElementById('shiftAppLogoutLink').onclick = (e) => {
        e.preventDefault();
        localStorage.removeItem('shiftAppAuth');
        location.href = 'login.html';
      };
    });
  }
})();

// ============================================================
// 本番／テスト 切り替えの仕組み
// ============================================================

// 本番用の保管庫
const PROD_URL = 'https://ztswbtiualzlmqffjgus.supabase.co';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0c3didGl1YWx6bG1xZmZqZ3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzEwNTAsImV4cCI6MjA5NzY0NzA1MH0.fOZFEe1RCMMjSpiWF7xqg3wCPhn6atiqfavkrO-3UIg';

// テスト用の保管庫
const TEST_URL = 'https://yialexyyfemouoyltoum.supabase.co';
const TEST_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpYWxleHl5ZmVtb3VveWx0b3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MTgwODcsImV4cCI6MjA5ODk5NDA4N30.FgMVYEBnnpGUrwxHvWOn6fWhDjmA8ixxd63Jl2z-s-g';

// 今どちらのモードか（ブラウザに記憶させる。何も設定していなければ本番）
function isTestMode() {
  return localStorage.getItem('shiftAppMode') === 'test';
}

// モードを切り替えて、ページを読み込み直す
function setTestMode(on) {
  if (on) localStorage.setItem('shiftAppMode', 'test');
  else localStorage.removeItem('shiftAppMode');
  location.reload();
}

const SUPABASE_URL = isTestMode() ? TEST_URL : PROD_URL;
const SUPABASE_KEY = isTestMode() ? TEST_KEY : PROD_KEY;

// Supabaseクライアント
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// テストモード中は、画面の一番上に目立つ帯を出す
if (isTestMode()) {
  window.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.textContent = '⚠️ テストモードで表示しています（本番のデータではありません）';
    bar.style.cssText = 'position:sticky;top:0;left:0;right:0;z-index:9999;background:#e67e22;color:white;text-align:center;font-size:0.85rem;font-weight:bold;padding:6px;';
    document.body.prepend(bar);
  });
}

// ============================================================
// 共通ユーティリティ関数
// ============================================================

// 明るさから文字色を決定する（背景色が明るければ黒、暗ければ白）
function getTextColor(hex) {
  if (!hex || hex.length < 7) return '#000';
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000 > 128 ? '#000' : '#fff';
}

// 曜日番号から曜日名を取得
function getWeekdayName(wd) {
  return ['日','月','火','水','木','金','土'][wd];
}

// 年月から日数を取得
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// 年月文字列（例：202606）から年と月を取得
function parseYearMonth(ym) {
  return {
    year: parseInt(ym.slice(0,4)),
    month: parseInt(ym.slice(4,6))
  };
}

// 現在の年月を取得（例：202606）
function getCurrentYearMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  return `${y}${m}`;
}

// マスタデータをまとめて取得する
async function loadMasters() {
  const [bushoRes, gyomuRes, staffRes, carRes] = await Promise.all([
    sb.from('shift_busho').select('*').order('busho_code'),
    sb.from('shift_gyomu').select('*').order('gyomu_code'),
    sb.from('shift_staff').select('*').order('staff_code'),
    sb.from('shift_car').select('*').order('car_code'),
  ]);
  return {
    bushos: bushoRes.data || [],
    gyomus: gyomuRes.data || [],
    staffs: staffRes.data || [],
    cars: carRes.data || [],
    bushoMap: Object.fromEntries((bushoRes.data||[]).map(b => [b.busho_code, b])),
    gyomuMap: Object.fromEntries((gyomuRes.data||[]).map(g => [g.gyomu_code, g])),
    staffMap: Object.fromEntries((staffRes.data||[]).map(s => [s.staff_code, s])),
    carMap: Object.fromEntries((carRes.data||[]).map(c => [c.car_code, c])),
  };
}
