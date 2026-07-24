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

  // ログイン済みなら、画面の一番上に細い帯で名前とログアウトを出す（他の表示と重ならないよう、浮かせずに差し込む）
  if (!isLoginPage && authRaw) {
    window.addEventListener('DOMContentLoaded', () => {
      let auth;
      try { auth = JSON.parse(authRaw); } catch (e) { auth = null; }
      const bar = document.createElement('div');
      bar.style.cssText = 'background:#333;color:white;font-size:0.7rem;padding:2px 8px;text-align:right;';
      const nameLabel = auth && auth.name ? `👤 ${auth.name}さん　` : '';
      bar.innerHTML = `${nameLabel}<a href="#" style="color:#9cf;" id="shiftAppLogoutLink">ログアウト</a>`;
      document.body.prepend(bar);
      document.getElementById('shiftAppLogoutLink').onclick = (e) => {
        e.preventDefault();
        localStorage.removeItem('shiftAppAuth');
        location.href = 'login.html';
      };
      // この帯の高さを覚えておき、画面全体の高さ計算（100vh基準のもの）が
      // ずれないよう、CSS側から参照できる変数として渡しておく
      document.documentElement.style.setProperty('--shift-auth-bar-h', bar.offsetHeight + 'px');
    });
  }
})();

// ============================================================
// PC権限（作成・修正ができるかどうか）関連
// ============================================================

// 今ログインしている人の情報を取得する
function getAuth() {
  try { return JSON.parse(localStorage.getItem('shiftAppAuth')); } catch (e) { return null; }
}

// PC権限（作成・修正ができるか）があるかどうか
function isAdmin() {
  const auth = getAuth();
  return !!(auth && auth.isAdmin);
}

// 実際に「作成・修正できるか」の最終判定。
// PC権限があること、かつ、パソコンサイズの画面で見ていることの両方が必要。
// スマホ（画面幅768px以下）では、PC権限がある人でも操作できないようにする。
function canEdit() {
  return isAdmin() && window.innerWidth > 768;
}

// 操作できない人には、画面の一番上に「閲覧のみ」の帯を出す
function showReadOnlyBannerIfNeeded() {
  if (canEdit()) return;
  window.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.textContent = isAdmin()
      ? '👀 閲覧のみモード（スマホでは操作できません。作成・修正はパソコンでお願いします）'
      : '👀 閲覧のみモード（作成・修正にはPC権限が必要です）';
    bar.style.cssText = 'background:#f39c12;color:white;text-align:center;font-size:0.8rem;font-weight:bold;padding:5px;';
    document.body.prepend(bar);
  });
}

// マスタ画面など、共通の部品（フォームや追加・更新・削除ボタン）を使っている画面向け：
// 操作できない人（PC権限がない、またはスマホで見ている）は、書き込み系のボタンや入力欄をまとめて無効にする
// extraSelector：そのページ特有のボタン・入力欄のクラス名などを追加で指定できる（例：'.qty-input, .btn-import'）
function lockMasterFormIfNeeded(extraSelector) {
  if (canEdit()) return;
  showReadOnlyBannerIfNeeded();
  window.addEventListener('DOMContentLoaded', () => {
    let selector =
      '.btn-add, .btn-update, .btn-delete, .btn-del-row, .btn-save, .btn-del, .btn-move, .btn-clear, .btn-add-slot, .btn-del-slot, .btn-copy, ' +
      '.form-box input, .form-box select, .form-box textarea';
    if (extraSelector) selector += ', ' + extraSelector;
    document.querySelectorAll(selector).forEach(el => { el.disabled = true; });
  });
}

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
  // 車番は文字としての並びだと3桁・4桁が混ざるため、数字として並べ直す
  const carsSorted = (carRes.data || []).slice().sort((a, b) => (parseInt(a.car_code) || 0) - (parseInt(b.car_code) || 0));

  return {
    bushos: bushoRes.data || [],
    gyomus: gyomuRes.data || [],
    staffs: staffRes.data || [],
    cars: carsSorted,
    bushoMap: Object.fromEntries((bushoRes.data||[]).map(b => [b.busho_code, b])),
    gyomuMap: Object.fromEntries((gyomuRes.data||[]).map(g => [g.gyomu_code, g])),
    staffMap: Object.fromEntries((staffRes.data||[]).map(s => [s.staff_code, s])),
    carMap: Object.fromEntries((carRes.data||[]).map(c => [c.car_code, c])),
  };
}

// ============================================================
// 900番台（休日・有休・健診・講習など「休み系」）の所属を扱う共通関数
// 所属マスタ（shift_busho）で「9」から始まるコードを登録すれば、
// ここを通じて業務シフトなどの画面に自動で反映される。
// ============================================================

// 900番台の所属だけを、コード順で取り出す
function getKyujitsuBushos(bushos) {
  return (bushos || [])
    .filter(b => /^9\d*$/.test(b.busho_code) && b.is_active !== false)
    .sort((a, b) => a.busho_code.localeCompare(b.busho_code, undefined, { numeric: true }));
}

// コード→名前のマップ（例：{901:'休日', 902:'有休', 903:'健診', 904:'講習'}）
function buildKyujitsuMap(bushos) {
  const map = {};
  getKyujitsuBushos(bushos).forEach(b => { map[b.busho_code] = b.busho_name; });
  return map;
}

// 名前→コードの逆引きマップ（例：{'休日':901, '有休':902, ...}）
function buildKyujitsuCodeMap(bushos) {
  const map = {};
  getKyujitsuBushos(bushos).forEach(b => { map[b.busho_name] = b.busho_code; });
  return map;
}
