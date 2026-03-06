var SPREADSHEET_ID = ""; // <--- ISI DENGAN ID SPREADSHEET ANDA
var SHEET_KARYAWAN = "DataKaryawan";
var SHEET_ABSENSI = "AbsensiKaryawan"; 
var SHEET_ISTIRAHAT = "IstirahatKaryawan";
var SHEET_SETTINGS = "SettingsKaryawan";
var SHEET_ADMIN = "AdminSettings";

// ============================================
// DOGET - MAIN WEB APP
// ============================================

function doGet(e) {
  var page = e.parameter.page || "employee";
  
  if(e.parameter.admin === "true") {
    var html = buildHtml("admin");
    return HtmlService.createHtmlOutput(html).setTitle("Admin Edusoft Center").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
  }
  
  if(page === "register") {
    var html = buildHtml("register");
    return HtmlService.createHtmlOutput(html).setTitle("Daftar Karyawan").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
  }
  
  var html = buildHtml(page);
  return HtmlService.createHtmlOutput(html).setTitle("Admin Edusoft Center").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

function buildHtml(page) {
  var css = getCSS();
  var body = "";
  var js = "";
  
  if (page === "admin") {
     body = getAdminHTML();
     js = getToastUtilityJS() + getAdminJS() + getAdminJS2() + getAdminJS3() + getAdminJS4() + getAdminJS5() + getSearchFunctionJS();
  } else if (page === "register") {
     body = getRegisterHTML();
     js = getToastUtilityJS() + getRegisterJS();
  } else {
     body = getEmployeeHTML();
     js = getToastUtilityJS() + getEmployeeJS(); // <-- hanya perubahan teks
  }
  return "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'><link href='https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap' rel='stylesheet'><script src='https://unpkg.com/lucide@latest'></script><script src='https://unpkg.com/html5-qrcode@2.3.4/html5-qrcode.min.js'></script><script src='https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'></script><script src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'></script><script src='https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'></script><script src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'></script><script src='https://cdn.jsdelivr.net/npm/chart.js'></script><script src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'></script><style>" + css + "</style></head><body>" + body + "<script>" + js + "</script></body></html>";
}

// ============================================
// FUNGSI SEARCH KARYAWAN (HANYA UNTUK LAPORAN DAN DATA KARYAWAN)
// ============================================

function getSearchFunctionJS() {
  return `
  // ============ FUNGSI SEARCH KARYAWAN ============
  var searchTimeout = null;
  var lastSearchKeyword = '';
  var isSearching = false;
  
  function initSearchFunction() {
    var searchInput = document.querySelector('.search-box input');
    if(searchInput) {
      searchInput.removeEventListener('input', handleSearchInput);
      searchInput.removeEventListener('keypress', handleSearchEnter);
      
      searchInput.addEventListener('input', handleSearchInput);
      searchInput.addEventListener('keypress', handleSearchEnter);
      
      searchInput.placeholder = 'Cari nama karyawan...';
      
      // Reset search saat halaman berganti
      lastSearchKeyword = '';
      isSearching = false;
    }
  }
  
  function clearSearchInput() {
    var searchInput = document.querySelector('.search-box input');
    if(searchInput) {
      searchInput.value = '';
      lastSearchKeyword = '';
      isSearching = false;
      // Reset tampilan tabel
      resetAllTables();
    }
  }
  
  function handleSearchInput(e) {
    if(searchTimeout) clearTimeout(searchTimeout);
    
    // Hanya lakukan filter tanpa menampilkan toast
    searchTimeout = setTimeout(function() {
      performSearch(e.target.value, false);
    }, 500);
  }
  
  function handleSearchEnter(e) {
    if(e.key === 'Enter') {
      e.preventDefault();
      if(searchTimeout) clearTimeout(searchTimeout);
      // Cegah multiple enter dalam waktu singkat
      if(!isSearching) {
        isSearching = true;
        // Tampilkan toast hanya saat Enter ditekan
        performSearch(e.target.value, true);
        setTimeout(function() {
          isSearching = false;
        }, 1000);
      }
    }
  }
  
  function performSearch(keyword, showMessage) {
    keyword = keyword.toLowerCase().trim();
    
    // Jika keyword kosong, tampilkan semua data
    if(keyword === '') {
      resetAllTables();
      if(showMessage && lastSearchKeyword !== '' && !isSearching) {
        showToastUnique('Menampilkan semua data', 'info', 'Reset Pencarian');
      }
      lastSearchKeyword = '';
      return;
    }
    
    // Cek apakah keyword berbeda dari pencarian terakhir
    var keywordChanged = (keyword !== lastSearchKeyword);
    
    // Search hanya di tabel yang aktif (laporan atau karyawan)
    if(currentPage === 'laporan') {
      searchInAbsensiTable(keyword);
    } else if(currentPage === 'istirahat') {
      searchInIstirahatTable(keyword);
    } else if(currentPage === 'karyawan') {
      searchInKaryawanTable(keyword);
    }
    
    // Tampilkan toast hanya jika showMessage true dan keyword berubah
    if(showMessage && keywordChanged && !isSearching) {
      showToastUnique('Menampilkan hasil pencarian: "' + keyword + '"', 'info', 'Pencarian');
    }
    
    lastSearchKeyword = keyword;
  }
  
  function searchInKaryawanTable(keyword) {
    var tableBody = document.querySelector('.table-karyawan tbody');
    if(!tableBody) return;
    
    var rows = tableBody.getElementsByTagName('tr');
    var hasResult = false;
    
    // Hapus pesan no result sebelumnya
    var existingMsg = tableBody.querySelector('.no-result-message');
    if(existingMsg) existingMsg.remove();
    
    for(var i = 0; i < rows.length; i++) {
      // Skip baris yang merupakan pesan no result
      if(rows[i].classList.contains('no-result-message')) continue;
      
      var namaCell = rows[i].querySelector('.nama-karyawan');
      if(namaCell) {
        var nama = namaCell.textContent.toLowerCase();
        if(nama.includes(keyword)) {
          rows[i].style.display = '';
          hasResult = true;
        } else {
          rows[i].style.display = 'none';
        }
      }
    }
    
    if(!hasResult && rows.length > 0) {
      showNoResultMessage(tableBody, 'karyawan');
    }
  }
  
  function searchInAbsensiTable(keyword) {
    var tableBody = document.querySelector('.table-absensi tbody');
    if(!tableBody) return;
    
    var rows = tableBody.getElementsByTagName('tr');
    var hasResult = false;
    
    // Hapus pesan no result sebelumnya
    var existingMsg = tableBody.querySelector('.no-result-message');
    if(existingMsg) existingMsg.remove();
    
    for(var i = 0; i < rows.length; i++) {
      // Skip baris yang merupakan pesan no result
      if(rows[i].classList.contains('no-result-message')) continue;
      
      var namaCell = rows[i].querySelector('.nama-karyawan');
      if(namaCell) {
        var nama = namaCell.textContent.toLowerCase();
        if(nama.includes(keyword)) {
          rows[i].style.display = '';
          hasResult = true;
        } else {
          rows[i].style.display = 'none';
        }
      }
    }
    
    if(!hasResult && rows.length > 0) {
      showNoResultMessage(tableBody, 'absensi');
    }
  }
  
  function searchInIstirahatTable(keyword) {
    var tableBody = document.querySelector('.table-istirahat tbody');
    if(!tableBody) return;
    
    var rows = tableBody.getElementsByTagName('tr');
    var hasResult = false;
    
    // Hapus pesan no result sebelumnya
    var existingMsg = tableBody.querySelector('.no-result-message');
    if(existingMsg) existingMsg.remove();
    
    for(var i = 0; i < rows.length; i++) {
      // Skip baris yang merupakan pesan no result
      if(rows[i].classList.contains('no-result-message')) continue;
      
      var namaCell = rows[i].querySelector('.nama-karyawan');
      if(namaCell) {
        var nama = namaCell.textContent.toLowerCase();
        if(nama.includes(keyword)) {
          rows[i].style.display = '';
          hasResult = true;
        } else {
          rows[i].style.display = 'none';
        }
      }
    }
    
    if(!hasResult && rows.length > 0) {
      showNoResultMessage(tableBody, 'istirahat');
    }
  }
  
  function showNoResultMessage(tableBody, tableType) {
    var existingMsg = tableBody.querySelector('.no-result-message');
    if(existingMsg) return;
    
    var row = document.createElement('tr');
    row.className = 'no-result-message';
    var cell = document.createElement('td');
    cell.colSpan = getColspanByTableType(tableType);
    cell.style.textAlign = 'center';
    cell.style.padding = '30px';
    cell.style.color = 'var(--gray)';
    cell.innerHTML = '<i data-lucide="search-x" style="width:24px;height:24px;margin-bottom:10px"></i><br>Tidak ada data karyawan yang ditemukan';
    
    row.appendChild(cell);
    tableBody.appendChild(row);
    setTimeout(function() { lucide.createIcons(); }, 100);
  }
  
  function getColspanByTableType(type) {
    switch(type) {
      case 'karyawan': return 5;
      case 'absensi': return 9;
      case 'istirahat': return 9;
      default: return 5;
    }
  }
  
  function resetAllTables() {
    var tables = ['.table-karyawan tbody', '.table-absensi tbody', '.table-istirahat tbody'];
    
    tables.forEach(function(selector) {
      var tableBody = document.querySelector(selector);
      if(tableBody) {
        var rows = tableBody.getElementsByTagName('tr');
        for(var i = 0; i < rows.length; i++) {
          rows[i].style.display = '';
        }
        var noResult = tableBody.querySelector('.no-result-message');
        if(noResult) noResult.remove();
      }
    });
  }
  
  var originalRenderPage = renderPage;
  renderPage = function() {
    originalRenderPage();
    setTimeout(function() {
      initSearchFunction();
    }, 500);
  };
  `;
}

// ============================================
// CSS STYLES
// ============================================

function getCSS() {
    return `:root {
  --primary: #3b82f6;
  --primary-dark: #2563eb;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #06b6d4;
  --bg: #0f172a;
  --card-bg: #1e293b;
  --text: #f8fafc;
  --text-muted: #94a3b8;
  --gray: #64748b;
  --border: #334155;
  --bg-admin: #f1f5f9;
  --text-admin: #0f172a;
  --table-border: #e2e8f0;
  --table-header-bg: #f8fafc;
  --table-row-hover: #fafcff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Poppins', sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

button, input, select, textarea, .btn {
  font-family: 'Poppins', sans-serif;
}

/* ============ ADMIN LAYOUT ============ */
.app {
  display: flex;
  min-height: 100vh;
  color: var(--text-admin);
}

.sidebar {
  display: none;
  width: 260px;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 50;
}

.sidebar-header {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.logo-icon {
  width: 500px;
  height: 50px;
  background-image: url('https://i.ibb.co.com/v6VS8bNt/logoedusoft.jpg');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: transparent;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.nav {
  padding: 24px 16px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #f8fafc;
  color: var(--primary);
}

.nav-item.active {
  background: #eff6ff;
  color: var(--primary);
  font-weight: 600;
}

.nav-item i {
  width: 20px;
  height: 20px;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid #f1f5f9;
}

.user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: var(--primary);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.user-info {
  font-size: 13px;
  color: #1e293b;
  font-weight: 500;
}

.user-info p {
  font-size: 11px;
  color: #64748b;
}

.main {
  flex: 1;
  background: var(--bg-admin);
  padding: 0;
  display: none;
  flex-direction: column;
  color: var(--text-admin);
}

.topbar {
  background: #fff;
  padding: 16px 32px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topbar h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8fafc;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.search-box input {
  border: none;
  background: none;
  outline: none;
  font-size: 14px;
  color: #1e293b;
  width: 250px;
}

.search-box input:focus {
  border-color: var(--primary);
}

.search-box i {
  color: #64748b;
}

.content {
  padding: 32px;
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  color: #1e293b;
  font-size: 24px;
  font-weight: 700;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* ============ STATS CARDS ============ */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.stat-card {
  background: #fff;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.stat-info h3 {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
  font-weight: 500;
}

.stat-info .value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.green { background: #ecfdf5; color: #10b981; }
.stat-icon.blue { background: #eff6ff; color: #3b82f6; }
.stat-icon.orange { background: #fff7ed; color: #f59e0b; }
.stat-icon.red { background: #fef2f2; color: #ef4444; }
.stat-icon.purple { background: #f3e8ff; color: #8b5cf6; }
.stat-icon.cyan { background: #cffafe; color: #06b6d4; }

/* ============ FEED CARDS ============ */
.feed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.feed-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.feed-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.feed-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.2s;
}

.feed-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}

.feed-img {
  width: 100%;
  height: 220px;
  background: #f1f5f9;
  position: relative;
  overflow: hidden;
}

.feed-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.feed-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  font-size: 9px;
  text-align: center;
  padding: 4px;
  background: rgba(0,0,0,0.7);
  color: #fff;
  font-weight: 600;
}

.feed-badge.late { background: rgba(239,68,68,0.9); }
.feed-badge.verified { background: rgba(16,185,129,0.9); }

.feed-info {
  padding: 12px;
}

.feed-name {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feed-class {
  font-size: 12px;
  color: #64748b;
}

/* ============ CARD & TABLE ============ */
.card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  overflow: hidden;
  margin-bottom: 24px;
  width: 100%;
}

.card-body {
  padding: 0;
  overflow-x: auto;
  overflow-y: auto;
  max-height: 70vh;
  width: 100%;
  -webkit-overflow-scrolling: touch;
}

.card-body::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.card-body::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}
.card-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.card-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table th {
  text-align: left;
  padding: 16px 12px;
  font-size: 12px;
  color: #1e293b;
  font-weight: 700;
  background: var(--table-header-bg);
  white-space: nowrap;
  vertical-align: middle;
  border-bottom: 2px solid var(--table-border);
  border-right: 1px solid var(--table-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.table th:last-child {
  border-right: none;
}

.table td {
  padding: 12px 12px !important;
  font-size: 13px;
  color: #334155;
  border-bottom: 1px solid var(--table-border);
  border-right: 1px solid var(--table-border);
  vertical-align: middle !important;
  line-height: 1.5;
  height: auto !important;
  min-height: 60px !important;
}

.table td:last-child {
  border-right: none;
}

.table tr:last-child td {
  border-bottom: none;
}

.table tr:hover td {
  background: var(--table-row-hover);
}

/* ============ TABEL SPESIFIK ============ */
.table-absensi th:nth-child(1) { width: 16%; }
.table-absensi th:nth-child(2) { width: 10%; }
.table-absensi th:nth-child(3) { width: 10%; }
.table-absensi th:nth-child(4) { width: 7%; }
.table-absensi th:nth-child(5) { width: 7%; }
.table-absensi th:nth-child(6) { width: 10%; }
.table-absensi th:nth-child(7) { width: 12%; }
.table-absensi th:nth-child(8) { width: 14%; }
.table-absensi th:nth-child(9) { width: 14%; }

.table-istirahat th:nth-child(1) { width: 16%; }
.table-istirahat th:nth-child(2) { width: 10%; }
.table-istirahat th:nth-child(3) { width: 10%; }
.table-istirahat th:nth-child(4) { width: 7%; }
.table-istirahat th:nth-child(5) { width: 7%; }
.table-istirahat th:nth-child(6) { width: 8%; }
.table-istirahat th:nth-child(7) { width: 10%; }
.table-istirahat th:nth-child(8) { width: 16%; }
.table-istirahat th:nth-child(9) { width: 16%; }

.table-karyawan th:nth-child(1) { width: 30%; }
.table-karyawan th:nth-child(2) { width: 15%; }
.table-karyawan th:nth-child(3) { width: 15%; }
.table-karyawan th:nth-child(4) { width: 20%; }
.table-karyawan th:nth-child(5) { width: 20%; }

/* ============ BADGE STATUS ============ */
.status-pulang-cell,
.istirahat-status-cell {
  width: 100%;
  max-width: 100%;
  padding: 0 !important;
  margin: 0 !important;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.badge-lembur,
.badge-cepat,
.badge-normal,
.badge-istirahat {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 8px 12px !important;
  border-radius: 30px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  white-space: normal !important;
  word-wrap: break-word !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  line-height: 1.5;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  border: 1px solid rgba(0,0,0,0.05);
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.badge-lembur {
  background: #eff6ff;
  color: #1e40af;
  border-left: 4px solid #2563eb;
}

.badge-cepat {
  background: #fff7ed;
  color: #9a3412;
  border-left: 4px solid #f59e0b;
}

.badge-normal {
  background: #ecfdf5;
  color: #065f46;
  border-left: 4px solid #10b981;
}

.badge-istirahat.sedang {
  background: #fff7ed;
  color: #f59e0b;
  border-left: 4px solid #f59e0b;
}

.badge-istirahat.selesai {
  background: #ecfdf5;
  color: #10b981;
  border-left: 4px solid #10b981;
}

.badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
  white-space: nowrap;
  vertical-align: middle;
  line-height: 1.4;
}

.badge-success { background: #ecfdf5; color: #10b981; }
.badge-warning { background: #fff7ed; color: #f59e0b; }
.badge-danger { background: #fef2f2; color: #ef4444; }
.badge-info { background: #eff6ff; color: #3b82f6; }
.badge-secondary { background: #f1f5f9; color: #64748b; }

/* ============ STUDENT CELL ============ */
.student-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.avatar.blue { background: #3b82f6; }
.avatar.green { background: #10b981; }
.avatar.orange { background: #f59e0b; }
.avatar.purple { background: #8b5cf6; }
.avatar.cyan { background: #06b6d4; }

.nama-karyawan {
  font-weight: 600;
  color: #0f172a;
  font-size: 14px;
  white-space: normal !important;
  word-wrap: break-word !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  line-height: 1.5;
  flex: 1;
  min-width: 0;
}

.nik-text, .divisi-text {
  font-size: 13px;
  color: #475569;
  font-weight: 500;
  white-space: normal !important;
  word-wrap: break-word !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  line-height: 1.5;
  display: inline-block;
  max-width: 100%;
}

.tanggal-cell {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  background: none;
  white-space: nowrap;
  display: inline-block;
}

.jam-badge {
  color: #0369a1;
  font-size: 13px;
  font-weight: 600;
  background: none;
  white-space: nowrap;
  display: inline-block;
}

.jam-pulang {
  color: #6b21a8;
  font-size: 13px;
  font-weight: 600;
  background: none;
  white-space: nowrap;
  display: inline-block;
}

.durasi-badge {
  color: #166534;
  font-size: 13px;
  font-weight: 600;
  background: none;
  white-space: nowrap;
  display: inline-block;
}

.location-cell {
  width: 100%;
  max-width: 100%;
  padding: 0 !important;
  margin: 0 !important;
}

.location-wrapper {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 12px !important;
  font-size: 12px;
  color: #1e293b;
  border-left: 4px solid var(--primary);
  word-break: break-word !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
  line-height: 1.5;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0 !important;
  height: auto !important;
  min-height: 50px;
}

.location-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  margin-bottom: 6px;
  font-size: 11px;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.location-alamat {
  display: block;
  word-break: break-word !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
  font-size: 12px;
  line-height: 1.6;
  color: #1e293b;
  max-width: 100%;
  font-weight: 400;
}

.btn-outline {
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #475569;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.btn-outline:hover {
  background: #f8fafc;
  border-color: #3b82f6;
  color: #3b82f6;
}

.upload-area {
  padding: 20px;
  text-align: center;
  border: 2px dashed var(--border);
  border-radius: 12px;
  cursor: pointer;
  background: rgba(59, 130, 246, 0.02);
  transition: all 0.2s;
}

.upload-area:hover {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.05);
}

.upload-text {
  color: var(--primary);
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.upload-text i {
  color: var(--primary);
}

.upload-subtext {
  color: var(--gray);
  font-size: 12px;
  margin-top: 4px;
}

.preview-container {
  margin-top: 15px;
  display: none;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #f8fafc;
  position: relative;
  width: 100%;
}

.preview-image {
  width: 100%;
  height: auto;
  max-height: 250px;
  object-fit: contain;
  display: block;
  background: #f8fafc;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #fee2e2;
  color: #ef4444;
  border-color: #fee2e2;
}

.action-btn i {
  width: 18px;
  height: 18px;
}

.action-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: 0.2s;
  white-space: nowrap;
}

.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-dark); }
.btn-success { background: var(--success); color: #fff; }
.btn-warning { background: var(--warning); color: #fff; }
.btn-info { background: var(--info); color: #fff; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 999;
  backdrop-filter: blur(2px);
}

.modal-overlay.active { display: flex; }

.modal {
  background: #fff;
  width: 100%;
  max-width: 400px;
  border-radius: 16px;
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);
  z-index: 1000;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-weight: 600;
  color: #1e293b;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #94a3b8;
  cursor: pointer;
}

.modal-body { padding: 20px; }

.form-group { margin-bottom: 16px; }
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 6px;
}
.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  color: #1e293b;
}
.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.toast-container {
  position: fixed;
  bottom: 30px;
  right: 30px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  z-index: 9999;
  max-width: 400px;
  min-width: 300px;
}

.toast {
  background: #1e293b;
  color: #fff;
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
  animation: slideInRight 0.3s cubic-bezier(0.16,1,0.3,1);
  border-left: 4px solid var(--primary);
}

.toast.success { background: #0f2e1e; border-left-color: #10b981; }
.toast.warning { background: #2e1e0f; border-left-color: #f59e0b; }
.toast.error { background: #2e0f1e; border-left-color: #ef4444; }
.toast.info { background: #0f1e2e; border-left-color: #3b82f6; }

.toast-icon { width: 24px; height: 24px; flex-shrink: 0; }
.toast-content { flex: 1; display: flex; flex-direction: column; }
.toast-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
.toast-message { font-size: 13px; color: #e2e8f0; word-break: break-word; }
.toast-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.toast-close:hover { background: rgba(255,255,255,0.1); color: #fff; }

.confirm-dialog {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.confirm-dialog.active { display: flex; }

.confirm-box {
  background: #fff;
  width: 100%;
  max-width: 380px;
  border-radius: 20px;
  overflow: hidden;
  animation: scaleIn 0.2s cubic-bezier(0.16,1,0.3,1);
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
}

.confirm-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  gap: 12px;
}

.confirm-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fee2e2;
  color: #ef4444;
}

.confirm-title {
  font-weight: 700;
  font-size: 18px;
  color: #0f172a;
}

.confirm-body {
  padding: 24px;
  color: #334155;
  font-size: 15px;
  line-height: 1.5;
}

.confirm-footer {
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.confirm-btn {
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.confirm-btn.cancel {
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #475569;
}
.confirm-btn.cancel:hover { background: #f8fafc; }
.confirm-btn.delete { background: #ef4444; color: #fff; }
.confirm-btn.delete:hover { background: #dc2626; }

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes fadeOut {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@media (max-width: 1500px) {
  .card-body {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .table-absensi,
  .table-istirahat,
  .table-karyawan {
    width: 100%;
    min-width: 1000px;
  }
}

/* Base Mobile-First Adjustments for Admin */
.sidebar { 
  display: flex; 
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar.open {
  transform: translateX(0);
}
.main { 
  display: flex; 
  width: 100%;
}
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 40;
  display: none;
  opacity: 0;
  transition: opacity 0.3s;
}
.sidebar-overlay.open {
  display: block;
  opacity: 1;
}

/* Hamburger button for mobile Admin */
.mobile-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  color: #1e293b;
  cursor: pointer;
}

@media (min-width: 769px) {
  .sidebar { 
    transform: translateX(0);
  }
  .main { 
    margin-left: 260px;
    width: calc(100% - 260px);
  }
  .mobile-menu-btn {
    display: none;
  }
  .sidebar-overlay {
    display: none !important;
  }
}

@media (max-width: 600px) {
  .topbar {
    padding: 16px;
    gap: 10px;
  }
  .topbar h2 {
    font-size: 16px;
  }
  .search-box input {
    width: 130px;
  }
  .content {
    padding: 16px;
  }
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.mobile-app {
  max-width: 480px;
  margin: 0 auto;
  background: var(--bg);
  min-height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
  color: #fff;
}

.app-header {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-box {
  width: 40px;
  height: 40px;
  background: rgba(59,130,246,0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.icon-btn {
  width: 40px;
  height: 40px;
  background: var(--card-bg);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  border: 1px solid var(--border);
}

.time-section {
  text-align: center;
  margin: 20px 0;
}

.digital-clock {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -1px;
}

.date-text {
  color: var(--text-muted);
  font-size: 14px;
  margin-top: 5px;
}

.scan-container {
  position: relative;
  margin: 20px auto;
  width: 280px;
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-circle {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid var(--border);
  position: relative;
  overflow: hidden;
  background: #000;
  box-shadow: 0 0 50px rgba(59,130,246,0.2);
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.scan-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  border: 2px solid var(--primary);
  box-shadow: inset 0 0 20px rgba(59,130,246,0.5);
  z-index: 10;
}

.scan-line {
  position: absolute;
  width: 100%;
  height: 2px;
  background: var(--primary);
  box-shadow: 0 0 10px var(--primary);
  top: 50%;
  animation: scan 2s infinite ease-in-out;
  z-index: 11;
}

@keyframes scan {
  0% { top: 10%; opacity: 0; }
  50% { opacity: 1; }
  100% { top: 90%; opacity: 0; }
}

.gps-badge {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--card-bg);
  padding: 6px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--border);
  z-index: 20;
  color: var(--text-muted);
  white-space: nowrap;
  width: auto;
}

.gps-badge.locked {
  background: rgba(16,185,129,0.2);
  color: var(--success);
  border-color: rgba(16,185,129,0.3);
}

.scan-status {
  text-align: center;
  margin-top: 50px;
  color: var(--text-muted);
  font-size: 13px;
}

.location-card {
  margin: 20px;
  background: var(--card-bg);
  border-radius: 20px;
  padding: 20px;
  border: 1px solid var(--border);
}

.loc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
}

.map-view {
  height: 100px;
  background: #334155;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.map-pin-anim {
  width: 20px;
  height: 20px;
  background: var(--primary);
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 0 20px var(--primary);
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--card-bg);
  padding: 15px 30px;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--border);
  max-width: 480px;
  margin: 0 auto;
}

.nav-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 10px;
}

.nav-icon.active { color: var(--primary); }

.input-screen {
  padding: 40px 30px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 80vh;
}

.attendance-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  padding: 0 20px 20px;
}

.att-btn {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.att-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(59,130,246,0.1);
}

.att-icon {
  width: 60px;
  height: 60px;
  border-radius: 15px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.att-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  margin-bottom: 5px;
}

.att-time {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 5px;
}

.att-status { font-size: 9px; }

.login-screen {
  max-width: 480px;
  margin: 0 auto;
  padding: 40px 24px;
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  display: flex;
  flex-direction: column;
  position: relative;
}

.login-header { text-align: center; margin-bottom: 40px; }

.logo-circle {
  width: 80px;
  height: 80px;
  background: rgba(59,130,246,0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  border: 2px solid rgba(59,130,246,0.3);
}

.login-card {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 30px;
  border: 1px solid var(--border);
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  margin-bottom: 30px;
}

.card-header { text-align: center; margin-bottom: 25px; }

.input-with-icon { position: relative; }

.login-input {
  width: 100%;
  padding: 14px 16px 14px 42px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-family: "Poppins", sans-serif;
  font-size: 15px;
  transition: all 0.3s;
}

.login-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.login-input::placeholder { color: #64748b; }

.login-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-family: "Poppins", sans-serif;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 25px;
}

.login-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(37,99,235,0.3);
}

.login-btn:disabled { opacity: 0.7; cursor: not-allowed; }

.login-info {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 30px;
  border-top: 1px solid var(--border);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
}

/* ============ EMPLOYEE DESKTOP UI RESPONSIVENESS ============ */
@media (min-width: 769px) {
  .mobile-app { 
    max-width: none; 
    width: 100vw; 
    margin: 0;
  }
  .app-header { max-width: 1200px; margin: 0 auto; width: 100%; padding: 30px 40px; }
  
  .login-screen {
    max-width: none;
    width: 100vw;
    margin: 0;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .login-header { margin-bottom: 30px; }
  .login-card { 
    width: 480px; 
    padding: 40px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.4); 
    border: 1px solid rgba(255,255,255,0.05);
  }
  .login-info { 
    width: 480px; 
    margin: 30px auto 0 auto; 
    border-top: none;
    justify-content: space-evenly;
  }
  
  .bottom-nav {
    max-width: 100%;
    justify-content: center;
    gap: 120px;
  }
  
  .attendance-grid {
    grid-template-columns: repeat(4, 1fr);
    max-width: 1000px;
    margin: 0 auto;
    gap: 30px;
    padding: 20px 40px;
  }
  .att-btn { padding: 30px; }
  .att-icon { width: 80px; height: 80px; }
  
  .scan-wrapper { 
    max-width: 600px; 
    margin: 0 auto; 
    padding: 0 20px; 
  }
  
  .scan-container { width: 450px; height: 450px; margin: 40px auto; }
  .time-section { margin: 50px 0; }
  .digital-clock { font-size: 80px; }
  .date-text { font-size: 18px; }
  
  .location-card {
    max-width: 600px;
    margin: 30px auto;
  }
  .input-screen {
    align-items: center;
  }
}

#admin-modal .modal { background: #fff; color: #1e293b; }
#admin-modal .form-input { background: #fff; border: 1px solid #e2e8f0; color: #1e293b; }

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.scan-fail-message {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid var(--danger);
  color: var(--danger);
  padding: 12px 16px;
  border-radius: 12px;
  margin: 20px 20px 0;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 0.8; }
  50% { opacity: 1; }
  100% { opacity: 0.8; }
}

.scan-fail-message i {
  flex-shrink: 0;
}

.tips-card {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin: 20px 20px 0;
  display: flex;
  gap: 12px;
}

.tips-icon {
  width: 24px;
  height: 24px;
  color: var(--primary);
  flex-shrink: 0;
}

.tips-content {
  flex: 1;
}

.tips-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--primary);
  margin-bottom: 6px;
}

.tips-text {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}
`;
}

// ============================================
// FUNGSI UTILITY TOAST DAN CONFIRM
// ============================================

function getToastUtilityJS() {
  return `
  // ============ TOAST UNIQUE SYSTEM ============
  var toastQueue = [];
  var toastTimeouts = {};
  var toastCounter = 0;
  
  function showToastUnique(message, type, title) {
    // Buat ID unik untuk pesan ini
    var messageId = message + '_' + type + '_' + title;
    
    // Cek apakah pesan ini sudah ada dalam queue atau sedang ditampilkan
    if(toastQueue.includes(messageId)) {
      console.log('Toast duplicate prevented:', message);
      return;
    }
    
    // Tambahkan ke queue
    toastQueue.push(messageId);
    toastCounter++;
    
    var container = document.getElementById('toasts');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toasts';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    
    var id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    var icon = '';
    var defaultTitle = '';
    
    switch(type) {
      case 'success':
        icon = '<i data-lucide="check-circle" style="width:24px;height:24px"></i>';
        defaultTitle = 'Berhasil';
        break;
      case 'error':
        icon = '<i data-lucide="alert-circle" style="width:24px;height:24px"></i>';
        defaultTitle = 'Gagal';
        break;
      case 'warning':
        icon = '<i data-lucide="alert-triangle" style="width:24px;height:24px"></i>';
        defaultTitle = 'Peringatan';
        break;
      default:
        icon = '<i data-lucide="info" style="width:24px;height:24px"></i>';
        defaultTitle = 'Informasi';
    }
    
    var toastTitle = title || defaultTitle;
    
    var toast = document.createElement('div');
    toast.id = id;
    toast.className = 'toast ' + type;
    toast.innerHTML = '<div class="toast-icon">' + icon + '</div>' +
                      '<div class="toast-content">' +
                      '<div class="toast-title">' + toastTitle + '</div>' +
                      '<div class="toast-message">' + message + '</div>' +
                      '</div>' +
                      '<button class="toast-close" onclick="this.parentElement.remove(); removeFromToastQueue(\\'' + messageId + '\\')">' +
                      '<i data-lucide="x" style="width:18px;height:18px"></i>' +
                      '</button>';
    
    container.appendChild(toast);
    
    // Hapus dari queue setelah 5 detik
    toastTimeouts[messageId] = setTimeout(function() {
      removeFromToastQueue(messageId);
    }, 5000);
    
    setTimeout(function() { lucide.createIcons(); }, 50);
    
    // Fungsi untuk menghapus toast secara otomatis
    setTimeout(function() {
      var el = document.getElementById(id);
      if (el) {
        el.style.animation = 'fadeOut 0.2s ease forwards';
        setTimeout(function() { 
          if (el.parentNode) {
            el.remove();
            removeFromToastQueue(messageId);
          }
        }, 200);
      }
    }, 5000);
  }
  
  function removeFromToastQueue(messageId) {
    var index = toastQueue.indexOf(messageId);
    if (index > -1) {
      toastQueue.splice(index, 1);
    }
    if (toastTimeouts[messageId]) {
      clearTimeout(toastTimeouts[messageId]);
      delete toastTimeouts[messageId];
    }
  }
  
  // Override fungsi showToast lama
  function showToast(message, type, title) {
    showToastUnique(message, type, title);
  }
  
  function showConfirm(message, onConfirm, onCancel, title) {
    var container = document.getElementById('confirm-dialog');
    if (!container) {
      container = document.createElement('div');
      container.id = 'confirm-dialog';
      container.className = 'confirm-dialog';
      document.body.appendChild(container);
    }
    
    var confirmTitle = title || 'Konfirmasi';
    
    container.innerHTML = '<div class="confirm-box">' +
                          '<div class="confirm-header">' +
                          '<div class="confirm-icon"><i data-lucide="alert-triangle" style="width:20px;height:20px"></i></div>' +
                          '<span class="confirm-title">' + confirmTitle + '</span>' +
                          '</div>' +
                          '<div class="confirm-body">' + message + '</div>' +
                          '<div class="confirm-footer">' +
                          '<button class="confirm-btn cancel" onclick="closeConfirm()">Batal</button>' +
                          '<button id="btn-confirm-delete" class="confirm-btn delete" onclick="executeConfirm()">Hapus</button>' +
                          '</div>' +
                          '</div>';
    
    container.classList.add('active');
    
    window.confirmCallback = {
      confirm: onConfirm || function() {},
      cancel: onCancel || function() {}
    };
    
    window.closeConfirm = function() {
      document.getElementById('confirm-dialog').classList.remove('active');
      if (window.confirmCallback.cancel) window.confirmCallback.cancel();
    };
    
    window.executeConfirm = function() {
      var btn = document.getElementById('btn-confirm-delete');
      var cancel = document.querySelector('.confirm-btn.cancel');
      if(btn) {
        btn.innerHTML = '<i data-lucide="loader" style="width:16px;animation:spin 1s linear infinite"></i> Memproses...';
        btn.disabled = true;
        lucide.createIcons();
      }
      if(cancel) cancel.disabled = true;
      if (window.confirmCallback.confirm) window.confirmCallback.confirm();
    };
    
    setTimeout(function() { lucide.createIcons(); }, 100);
  }
  
  window.alert = function(message) {
    showToast(message, 'info', 'Pesan');
  };
  `;
}

// ============================================
// ADMIN HTML
// ============================================

function getAdminHTML() {
  return `<div class='app'>
  <aside class='sidebar'>
    <div class='sidebar-header'>
      <div class='logo-icon'></div>
    </div>
    <nav class='nav'>
      <div class='nav-item active' data-page='dashboard' onclick='showPage("dashboard")'><i data-lucide='home'></i><span>Dashboard</span></div>
      <div class='nav-item' data-page='laporan' onclick='showPage("laporan")'><i data-lucide='clipboard-check'></i><span>Laporan Absensi</span></div>
      <div class='nav-item' data-page='istirahat' onclick='showPage("istirahat")'><i data-lucide='coffee'></i><span>Laporan Istirahat</span></div>
      <div class='nav-item' data-page='karyawan' onclick='showPage("karyawan")'><i data-lucide='users'></i><span>Data Karyawan</span></div>
      <div class='nav-item' data-page='pengaturan' onclick='showPage("pengaturan")'><i data-lucide='settings'></i><span>Pengaturan</span></div>
    </nav>
    <div class='sidebar-footer'>
      <div class='user'>
        <div class='user-avatar'>HR</div>
        <div class='user-info'>Admin HR<p>Edusoft Center</p></div>
      </div>
    </div>
  </aside>
  <main class='main'>
    <div class='topbar'>
      <div style="display:flex;align-items:center;gap:12px">
        <button class="mobile-menu-btn" onclick="toggleSidebar()">
          <i data-lucide="menu"></i>
        </button>
        <h2 id='page-title'>Dashboard Admin</h2>
      </div>
      <div class='topbar-right'>
        <div class='search-box' id='global-search-container' style='display: none;'>
          <i data-lucide='search' style='width:16px;color:var(--gray)'></i>
          <input type='text' placeholder='Cari nama karyawan...' id='global-search'>
        </div>
      </div>
    </div>
    <div class='content' id='main-content'></div>
  </main>
</div>
<div class='sidebar-overlay' id='sidebar-overlay' onclick='toggleSidebar()'></div>
<div class='modal-overlay' id='modal'></div>
<div class='toast-container' id='toasts'></div>
<div class='confirm-dialog' id='confirm-dialog'></div>`;
}

// ============================================
// FUNGSI-FUNGSI ADMIN JAVASCRIPT (SINGKAT)
// ============================================

function getAdminJS() {
  return `
  var currentPage='dashboard';
  var employees=[];
  var attendance=[];
  var istirahat=[];
  var stats={};
  var appSettings={jamMasuk:'08:00',jamPulang:'17:00'};
  var colors=['blue','green','orange','purple','cyan'];
  var dataLoaded={stats:false,attendance:false,istirahat:false,employees:false};
  var isRefreshing = false;
  
  function toggleSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if(sidebar && overlay) {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    }
  }
  
  document.addEventListener('DOMContentLoaded',function(){
    lucide.createIcons();
    loadAllData();
    
    // Global Enter Key Handler for Admin forms
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var saveBtn = document.getElementById('save-btn');
        if (saveBtn && !saveBtn.disabled) {
          e.preventDefault();
          saveBtn.click();
          return;
        }
        
        var act = document.activeElement;
        if (!act) return;
        if (act.id === 'add-nik' || act.id === 'add-nama' || act.id === 'add-divisi') {
          e.preventDefault();
          submitAdd();
        } else if (act.id === 'set-jam-masuk' || act.id === 'set-jam-pulang') {
          e.preventDefault();
          saveSettings();
        } else if (act.id === 'global-search') {
          e.preventDefault(); // Prevent accidental form submit equivalent
        }
      }
    });
  });
  
  function loadAllData(){
    // Cegah multiple refresh dalam waktu singkat
    if(isRefreshing) return;
    isRefreshing = true;
    
    dataLoaded={stats:false,attendance:false,istirahat:false,employees:false};
    
    // Tampilkan placeholder loading
    var c = document.getElementById('main-content');
    if(c){
      c.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:50vh;color:var(--gray)"><i data-lucide="loader" style="width:40px;height:40px;animation:spin 1s linear infinite;color:var(--primary);margin-bottom:15px"></i><p style="font-size:15px;font-weight:500">Memuat Data Dashboard...</p><p style="font-size:12px;margin-top:5px;opacity:0.7">Menyingkronisasi dengan Google Sheets</p></div>';
      lucide.createIcons();
    }
    
    google.script.run.withSuccessHandler(function(r){
      if(r.success) {
        if(r.stats) stats = r.stats;
        if(r.settings) appSettings = r.settings;
        if(r.attendance) attendance = r.attendance;
        if(r.istirahat) istirahat = r.istirahat;
        if(r.employees) employees = r.employees;
      }
      
      dataLoaded.stats = true;
      dataLoaded.attendance = true;
      dataLoaded.istirahat = true;
      dataLoaded.employees = true;
      
      tryRenderPage();
      
      setTimeout(function() {
        isRefreshing = false;
      }, 1000);
    }).withFailureHandler(function(e) {
      if(c) {
        c.innerHTML = '<div style="text-align:center;padding:40px;color:var(--danger)"><i data-lucide="alert-circle" style="width:40px;height:40px;margin-bottom:10px"></i><p>Gagal memuat data: ' + e + '</p><button class="btn btn-primary" style="margin-top:15px" onclick="loadAllData()">Coba Lagi</button></div>';
        lucide.createIcons();
      }
      showToast('Gagal memuat data: ' + e, 'error', 'Error');
      isRefreshing = false;
    }).getAllAdminData();
  }
  
  function tryRenderPage(){
    if(dataLoaded.stats && dataLoaded.attendance && dataLoaded.istirahat && dataLoaded.employees){
      renderPage();
    }
  }

  function tryEnableAbsenBtn() {
    var btn = document.getElementById('act-btn');
    if(!btn) return;
    var faceOk = verifiedPhotoData !== null;
    var locOk = loc.status === 'ditemukan';
    if(faceOk && locOk) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.textContent = '✅ Konfirmasi Absensi';
    } else if(faceOk && !locOk) {
      btn.textContent = '⏳ Menunggu lokasi GPS...';
    }
  }
  
  function getColor(i){
    return colors[i%colors.length];
  }
  
  function getInit(n){
    if(!n)return'';
    var p=n.split(' ');
    if(p.length===1) return p[0].substring(0,2).toUpperCase();
    return(p[0][0]+p[1][0]).toUpperCase();
  }
  
  function showPage(p){
    currentPage=p;
    document.querySelectorAll('.nav-item').forEach(function(n){
      n.classList.remove('active');
    });
    document.querySelector('[data-page="'+p+'"]').classList.add('active');
    var t={'dashboard':'Dashboard','laporan':'Laporan Absensi','istirahat':'Laporan Istirahat','karyawan':'Data Karyawan','pengaturan':'Pengaturan'};
    document.getElementById('page-title').textContent=t[p];
    
    // Auto-close sidebar on mobile after clicking a menu item
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if(sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    }
    
    var searchContainer = document.getElementById('global-search-container');
    if(p === 'laporan' || p === 'istirahat' || p === 'karyawan') {
      searchContainer.style.display = 'flex';
      if(typeof clearSearchInput === 'function') {
        clearSearchInput();
      }
    } else {
      searchContainer.style.display = 'none';
    }
    
    renderPage();
  }
  
  function renderPage(){
    if(currentPage==='dashboard') renderDashboard();
    else if(currentPage==='laporan') renderLaporan();
    else if(currentPage==='istirahat') renderIstirahat();
    else if(currentPage==='karyawan') renderKaryawan();
    else if(currentPage==='pengaturan') renderPengaturan();
    
    setTimeout(function(){
      if(typeof initSearchFunction === 'function') {
        initSearchFunction();
      }
    }, 500);
  }
  
  function formatWaktu(waktu){
    if(!waktu)return'-';
    try{
      if(typeof waktu==='string' && waktu.includes(':')){
        var parts=waktu.split(':');
        if(parts.length>=2){
          return parts[0]+':'+parts[1];
        }
      }
      if(waktu instanceof Date){
        var jam=waktu.getHours().toString().padStart(2,'0');
        var menit=waktu.getMinutes().toString().padStart(2,'0');
        return jam+':'+menit;
      }
      var strWaktu=String(waktu);
      var match=strWaktu.match(/(\\d{1,2}):(\\d{2})/);
      if(match){
        return match[1]+':'+match[2];
      }
    }catch(e){}
    return waktu.toString().substring(0,5)||'-';
  }
  
  function formatDurasi(menit){
    if(!menit && menit!==0)return'-';
    try{
      var menitNum=parseInt(menit);
      if(isNaN(menitNum))return'-';
      if(menitNum<1)return'0 menit';
      if(menitNum<60)return menitNum+' menit';
      var jam=Math.floor(menitNum/60);
      var sisa=menitNum%60;
      if(sisa===0)return jam+' jam';
      return jam+' jam '+sisa+' menit';
    }catch(e){
      return'-';
    }
  }
  
  function formatLokasi(lokasi){
    if(!lokasi)return'-';
    try{
      var str=String(lokasi);
      if(str.includes('(') && str.includes(')')){
        var parts=str.split('(');
        var alamat=parts[0].trim();
        if(alamat && alamat.length>0){
          if(alamat.length>30){
            alamat=alamat.substring(0,30)+'...';
          }
          return alamat;
        }
      }
      return str.substring(0,30);
    }catch(e){
      return'-';
    }
  }
  
  function getTodayDate() {
    var d = new Date();
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }
  
  function renderDashboard(){
    var c=document.getElementById('main-content');
    if(!c)return;
    
    var performanceHtml = '';
    if(stats.topRajin && stats.topRajin.length > 0) {
      performanceHtml += '<div class="card" style="grid-column:1/-1"><div style="padding:16px 20px;display:flex;align-items:center;gap:8px"><i data-lucide="trophy" style="width:20px;color:#f59e0b"></i><strong>Top 5 Karyawan Paling Rajin</strong></div><div class="card-body" style="padding:20px"><div class="feed-grid" style="grid-template-columns:repeat(5, 1fr)">';
      stats.topRajin.forEach(function(k, i){
        var ph='<div style="width:56px;height:56px;margin:0 auto 10px;background:#f1f5f9;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#64748b;overflow:hidden;border:2px solid #e2e8f0;box-shadow:0 2px 4px rgba(0,0,0,0.05)">';
        if(k.foto) ph+='<img src="'+k.foto+'" style="width:56px;height:56px;object-fit:cover;border-radius:50%;display:block;min-width:56px;min-height:56px;" onerror="this.style.display=\\'none\\'">';
        else ph+='<i data-lucide="user" style="width:24px"></i>';
        ph+='</div>';
        performanceHtml += '<div style="text-align:center">'+ph+'<div style="font-weight:600;font-size:13px">'+k.nama+'</div><div style="font-size:11px;color:var(--gray)">'+k.divisi+'</div><span class="badge badge-success" style="margin-top:5px">'+k.hadir+' Hadir</span></div>';
      });
      performanceHtml += '</div></div></div>';
    }
    
    var today = getTodayDate();
    var feed='';
    if(attendance && attendance.length>0){
      var todayAttendance = attendance.filter(function(a) { return a.tanggal === today; });
      var recent = todayAttendance.slice().reverse().slice(0,10);
      for(var j=0;j<recent.length;j++){
        var a=recent[j];
        var isLate=a.statusMasuk==='Terlambat';
        var jamMasukFormatted=formatWaktu(a.jamMasuk);
        var jamPulangFormatted=formatWaktu(a.jamPulang);
        var badgeM=a.jamMasuk? '<span class="feed-badge '+ (isLate?'late':'verified') +'">MASUK ' + jamMasukFormatted + '</span>' : '';
        var badgeP=a.jamPulang? '<span class="badge badge-info" style="position:absolute;top:12px;right:12px;background:#3b82f6;color:white">PULANG '+jamPulangFormatted+'</span>' : '';
        var photoSrc=a.fotoPulang?a.fotoPulang:(a.fotoMasuk?a.fotoMasuk:'');
        var placeholder='<div class="feed-photo" style="display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#94a3b8"><i data-lucide="user" style="width:24px"></i></div>';
        var photoHtml=photoSrc?'<img class="feed-photo" src="'+photoSrc+'" onerror="this.parentElement.innerHTML=\\''+placeholder.replace(/\"/g, '&quot;')+'\\'">':placeholder;
        feed+='<div class="feed-card"><div class="feed-img">'+photoHtml+badgeM+badgeP+'</div><div class="feed-info"><div class="feed-name">'+a.nama+'</div><div class="feed-class">'+a.divisi+'</div><div style="font-size:10px;margin-top:4px;color:var(--primary)"><i data-lucide="map-pin" style="width:12px;display:inline"></i> '+formatLokasi(a.lokasiMasuk)+'</div></div></div>';
      }
    }else{
      feed='<div style="text-align:center;padding:40px;color:var(--gray);grid-column:1/-1">Belum ada data absensi hari ini</div>';
    }
    
    var feedIstirahat='';
    if(istirahat && istirahat.length>0){
      var todayIstirahat = istirahat.filter(function(i) { return i.tanggal === today; });
      var recentIstirahat=todayIstirahat.slice().reverse().slice(0,10);
      for(var k=0;k<recentIstirahat.length;k++){
        var i=recentIstirahat[k];
        var isSelesai=i.status==='selesai';
        var mulaiFormatted=formatWaktu(i.mulai);
        var selesaiFormatted=formatWaktu(i.selesai);
        var durasiFormatted=formatDurasi(i.durasi);
        var fotoMulaiSrc=i.fotoMulai?i.fotoMulai:'';
        var fotoSelesaiSrc=i.fotoSelesai?i.fotoSelesai:'';
        var selectedFoto = (isSelesai && fotoSelesaiSrc) ? fotoSelesaiSrc : fotoMulaiSrc;
        var fotoHtml='';
        if(selectedFoto){fotoHtml='<img class="feed-photo" src="'+selectedFoto+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\\'none\\'">';}
        else{var placeholder='<div class="feed-photo" style="display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#94a3b8"><i data-lucide="coffee" style="width:24px"></i></div>';fotoHtml=placeholder;}
        var badgeI=i.mulai? '<span class="feed-badge '+ (isSelesai?'verified':'late') +'">ISTIRAHAT ' + mulaiFormatted + '</span>' : '';
        var badgeS=i.selesai? '<span class="badge badge-success" style="position:absolute;top:12px;right:12px">SELESAI '+selesaiFormatted+'</span>' : '';
        feedIstirahat+='<div class="feed-card"><div class="feed-img">'+fotoHtml+badgeI+badgeS+'</div><div class="feed-info"><div class="feed-name">'+i.nama+'</div><div class="feed-class">'+i.divisi+'</div><div style="font-size:10px;color:var(--success);margin-top:4px"><i data-lucide="clock" style="width:12px;display:inline"></i> '+durasiFormatted+'</div><div style="font-size:10px;margin-top:2px;color:var(--primary)"><i data-lucide="map-pin" style="width:12px;display:inline"></i> '+formatLokasi(i.lokasiMulai)+'</div></div></div>';
      }
    }else{
      feedIstirahat='<div style="text-align:center;padding:40px;color:var(--gray);grid-column:1/-1">Belum ada data istirahat hari ini</div>';
    }
    
    var statsHtml = '<div class="stats-grid">';
    statsHtml += '<div class="stat-card"><div class="stat-info"><h3>Hadir Hari Ini</h3><div class="value">'+(stats.totalHadir||0)+'</div></div><div class="stat-icon green"><i data-lucide="user-check"></i></div></div>';
    statsHtml += '<div class="stat-card"><div class="stat-info"><h3>Sudah Pulang</h3><div class="value">'+(stats.totalPulang||0)+'</div></div><div class="stat-icon blue"><i data-lucide="log-out"></i></div></div>';
    statsHtml += '<div class="stat-card"><div class="stat-info"><h3>Terlambat</h3><div class="value">'+(stats.totalTerlambat||0)+'</div></div><div class="stat-icon orange"><i data-lucide="clock"></i></div></div>';
    statsHtml += '<div class="stat-card"><div class="stat-info"><h3>Tidak Masuk</h3><div class="value">'+(stats.belumAbsen||0)+'</div></div><div class="stat-icon red"><i data-lucide="user-x"></i></div></div>';
    statsHtml += '<div class="stat-card"><div class="stat-info"><h3>Sedang Istirahat</h3><div class="value">'+(stats.sedangIstirahat||0)+'</div></div><div class="stat-icon purple" style="background:#f3e8ff;color:#8b5cf6"><i data-lucide="coffee"></i></div></div>';
    statsHtml += '<div class="stat-card"><div class="stat-info"><h3>Selesai Istirahat</h3><div class="value">'+(stats.selesaiIstirahat||0)+'</div></div><div class="stat-icon cyan" style="background:#cffafe;color:#06b6d4"><i data-lucide="check-circle"></i></div></div></div>';
    
    c.innerHTML=statsHtml + performanceHtml + '<div class="card" style="grid-column:1/-1"><div style="padding:16px 20px;display:flex;align-items:center;gap:8px"><i data-lucide="bar-chart-2" style="width:20px;color:var(--primary)"></i><strong>Statistik Kehadiran Bulanan</strong></div><div class="card-body" style="padding:20px"><canvas id="attChart" style="max-height:300px;width:100%"></canvas></div></div>' + '<div class="feed-header"><div class="feed-title">Live Feed Absensi Hari Ini</div><button class="btn btn-primary" onclick="loadAllData()"><i data-lucide="refresh-cw" style="width:14px"></i> Refresh</button></div><div class="feed-grid">'+feed+'</div>' + '<div class="feed-header" style="margin-top:40px"><div class="feed-title"><i data-lucide="coffee" style="width:18px;margin-right:8px"></i>Live Feed Istirahat Hari Ini</div></div><div class="feed-grid">'+feedIstirahat+'</div>';
    setTimeout(function(){lucide.createIcons();if(stats.monthly){renderChart(stats.monthly);}},100);
  }
  
  function renderChart(data){
    if(!data)return;
    var ctx=document.getElementById('attChart');
    if(ctx){
      if(window.attChartInstance){
        window.attChartInstance.destroy();
      }
      window.attChartInstance=new Chart(ctx,{
        type:'bar',
        data:{
          labels:data.labels,
          datasets:[
            {label:'Hadir',data:data.hadir,backgroundColor:'#10b981',borderRadius:4},
            {label:'Alfa (Tidak Hadir)',data:data.alfa,backgroundColor:'#ef4444',borderRadius:4}
          ]
        },
        options:{
          responsive:true,
          maintainAspectRatio:true,
          plugins:{
            legend:{position:'top'}
          },
          scales:{
            y:{beginAtZero:true}
          }
        }
      });
    }
  }
  `;
}

// ============================================
// FUNGSI-FUNGSI ADMIN JAVASCRIPT (LANJUTAN)
// ============================================

function getAdminJS2() {
  return `
  var filterDate='';
  var isExporting = false;
  
  function formatLokasiFull(lokasi){
    if(!lokasi) return '-';
    try{
      var str=String(lokasi);
      if(str.includes('(') && str.includes(')')){
        var parts=str.split('(');
        return parts[0].trim();
      }
      return str.trim();
    }catch(e){
      return '-';
    }
  }
  
  function getStatusPulangBadge(status) {
    if (!status || status === '-' || status === '') return '<span class="badge badge-secondary" style="display:inline-block; padding:6px 12px; background:#f1f5f9; color:#64748b; border-radius:20px; white-space:nowrap;">-</span>';
    var lowerStatus = status.toLowerCase();
    var bgColor = '';
    var textColor = '';
    var borderColor = '';
    
    if (lowerStatus.includes('lembur')) {
      bgColor = '#eff6ff';
      textColor = '#1e40af';
      borderColor = '#2563eb';
    } else if (lowerStatus.includes('cepat')) {
      bgColor = '#fff7ed';
      textColor = '#9a3412';
      borderColor = '#f59e0b';
    } else if (lowerStatus.includes('tepat') || lowerStatus.includes('normal') || lowerStatus.includes('bekerja') || lowerStatus.includes('durasi')) {
      bgColor = '#ecfdf5';
      textColor = '#065f46';
      borderColor = '#10b981';
    } else {
      return '<span class="badge badge-secondary" style="display:inline-block; padding:6px 12px; background:#f1f5f9; color:#64748b; border-radius:20px; white-space:nowrap;">'+status+'</span>';
    }
    
    return '<div style="display:flex; width:100%; height:100%; align-items:center; justify-content:center; padding:0; margin:0;">' +
           '<span style="'+
           'display:flex; ' +
           'align-items:center; ' +
           'justify-content:center; ' +
           'width:100% !important; ' +
           'max-width:100% !important; ' +
           'min-width:0 !important; ' +
           'box-sizing:border-box !important; ' +
           'padding:8px 12px !important; ' +
           'margin:0 !important; ' +
           'background:'+bgColor+'; ' +
           'color:'+textColor+'; ' +
           'border-left:4px solid '+borderColor+'; ' +
           'border-radius:30px; ' +
           'font-size:12px; ' +
           'font-weight:600; ' +
           'text-align:center; ' +
           'word-wrap:break-word; ' +
           'word-break:break-word; ' +
           'line-height:1.5; ' +
           'border:1px solid rgba(0,0,0,0.05); ' +
           'box-shadow:0 2px 4px rgba(0,0,0,0.02); ' +
           '">'+status+'</span>' +
           '</div>';
  }
  
  function renderLaporan(){
    var c=document.getElementById('main-content');
    c.innerHTML='<div class="page-header" style="justify-content: flex-end;"><div class="header-actions"><input type="date" class="form-input" style="width:150px" onchange="filterLaporan(this.value)" id="date-filter"><button class="btn btn-success" onclick="exportExcelAbsensi()"><i data-lucide="file-spreadsheet" style="width:16px"></i> Excel</button><button class="btn btn-danger" style="background:var(--danger);color:white" onclick="exportPDFAbsensi()"><i data-lucide="file-text" style="width:16px"></i> PDF</button></div></div><div class="card"><div class="card-body"><table class="table table-absensi"><thead><tr><th>Karyawan</th><th>Divisi</th><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Status Masuk</th><th>Status Pulang</th><th>Lokasi Masuk</th><th>Lokasi Pulang</th></tr></thead><tbody id="lap-table"><tr><td colspan="9" style="text-align:center;padding:30px;color:var(--gray)">Loading data...</td></tr></tbody></table></div></div>';
    setTimeout(function(){lucide.createIcons();renderLapTable();},100);
  }
  
  function filterLaporan(d){
    filterDate=d;
    renderLapTable();
  }
  
  function renderLapTable(){
    var tb=document.getElementById('lap-table');
    if(!tb)return;
    
    var list=attendance.slice().reverse();
    if(filterDate){
      list=list.filter(function(a){return a.tanggal===filterDate;});
    }
    if(!list || list.length === 0){
      tb.innerHTML='<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--gray)">Data Absensi Kosong / Tidak Ditemukan</td></tr>';
      return;
    }
    var h='';
    for(var i=0;i<list.length;i++){
      var a=list[i];
      
      var st=a.statusMasuk==='Terlambat'?'<span class="badge badge-warning" style="display:inline-block; padding:6px 12px; white-space:nowrap;">Terlambat</span>':'<span class="badge badge-success" style="display:inline-block; padding:6px 12px; white-space:nowrap;">Tepat Waktu</span>';
      var stP = getStatusPulangBadge(a.statusPulang);
      
      var jamMasukFormatted=formatWaktu(a.jamMasuk);
      var jamPulangFormatted=formatWaktu(a.jamPulang);
      var jamPulangDisplay=jamPulangFormatted!='-' ? '<span class="jam-pulang">'+jamPulangFormatted+'</span>' : '<span class="badge badge-secondary" style="background:none;padding:0; white-space:nowrap;">-</span>';
      
      var tanggalFormatted=a.tanggal ? a.tanggal.substring(0,10).split('-').reverse().join('/') : '-';
      
      var lokasiMasuk = formatLokasiFull(a.lokasiMasuk);
      var lokasiMasukHtml = lokasiMasuk != '-' ? '<div class="location-cell"><div class="location-wrapper"><span class="location-label"><i data-lucide="map-pin" style="width:12px;height:12px"></i> Alamat</span><span class="location-alamat">'+lokasiMasuk+'</span></div></div>' : '<span class="badge badge-secondary" style="background:none;padding:0; white-space:nowrap;">-</span>';
      
      var lokasiPulang = formatLokasiFull(a.lokasiPulang);
      var lokasiPulangHtml = lokasiPulang != '-' ? '<div class="location-cell"><div class="location-wrapper"><span class="location-label"><i data-lucide="map-pin" style="width:12px;height:12px"></i> Alamat</span><span class="location-alamat">'+lokasiPulang+'</span></div></div>' : '<span class="badge badge-secondary" style="background:none;padding:0; white-space:nowrap;">-</span>';
      
      h+='<tr>';
      h+='<td><div class="student-cell"><div class="avatar '+getColor(i)+'">'+getInit(a.nama)+'</div><span class="nama-karyawan">'+a.nama+'</span></div></td>';
      h+='<td><span class="divisi-text">'+ (a.divisi || '-') +'</span></td>';
      h+='<td><span class="tanggal-cell">'+tanggalFormatted+'</span></td>';
      h+='<td><span class="jam-badge">'+jamMasukFormatted+'</span></td>';
      h+='<td>'+jamPulangDisplay+'</td>';
      h+='<td>'+st+'</td>';
      h+='<td style="vertical-align:middle; height:100%; padding:8px 12px !important;">'+stP+'</td>';
      h+='<td>'+lokasiMasukHtml+'</td>';
      h+='<td>'+lokasiPulangHtml+'</td>';
      h+='</tr>';
    }
    
    tb.innerHTML=h;
    setTimeout(function(){lucide.createIcons();},100);
  }
  
  function exportExcelAbsensi(){
    if(isExporting) return;
    isExporting = true;
    
    var list=attendance.slice().reverse();
    if(filterDate)list=list.filter(function(a){return a.tanggal===filterDate;});
    if(list.length===0){
      showToast('Tidak ada data untuk diexport','warning','Export Gagal');
      isExporting = false;
      return;
    }
    var data=list.map(function(i){
      return{
        Nama:i.nama,
        Divisi:i.divisi||'-',
        Tanggal:i.tanggal,
        'Jam Masuk':formatWaktu(i.jamMasuk),
        'Jam Pulang':formatWaktu(i.jamPulang),
        'Status Masuk':i.statusMasuk||'-',
        'Status Pulang':i.statusPulang||'-',
        'Lokasi Masuk':formatLokasiFull(i.lokasiMasuk),
        'Lokasi Pulang':formatLokasiFull(i.lokasiPulang)
      };
    });
    var ws=XLSX.utils.json_to_sheet(data);
    var wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Absensi');
    XLSX.writeFile(wb,'Laporan_Absensi_'+(filterDate||'All')+'.xlsx');
    showToast('Export Excel berhasil','success','Berhasil');
    
    setTimeout(function() {
      isExporting = false;
    }, 2000);
  }
  
  function exportPDFAbsensi(){
    if(isExporting) return;
    isExporting = true;
    
    var list=attendance.slice().reverse();
    if(filterDate)list=list.filter(function(a){return a.tanggal===filterDate;});
    if(list.length===0){
      showToast('Tidak ada data untuk diexport','warning','Export Gagal');
      isExporting = false;
      return;
    }
    var {jsPDF}=window.jspdf;
    var doc=new jsPDF('landscape');
    doc.text('Laporan Absensi Karyawan',14,15);
    doc.setFontSize(10);
    doc.text('Tanggal: '+(filterDate||'Semua Data'),14,22);
    var headers=[['Nama','Divisi','Tanggal','Masuk','Pulang','Sts Masuk','Sts Pulang','Lokasi Masuk','Lokasi Pulang']];
    var data=list.map(function(a){
      return[
        a.nama,
        a.divisi||'-',
        a.tanggal,
        formatWaktu(a.jamMasuk),
        formatWaktu(a.jamPulang),
        a.statusMasuk||'-',
        a.statusPulang||'-',
        formatLokasiFull(a.lokasiMasuk).substring(0,60),
        formatLokasiFull(a.lokasiPulang).substring(0,60)
      ];
    });
    doc.autoTable({
      head:headers,
      body:data,
      startY:30,
      theme:'grid',
      styles:{fontSize:8,cellPadding:4,overflow:'linebreak'},
      columnStyles:{
        0:{cellWidth:35},
        1:{cellWidth:25},
        2:{cellWidth:25},
        3:{cellWidth:20},
        4:{cellWidth:20},
        5:{cellWidth:25},
        6:{cellWidth:35},
        7:{cellWidth:50},
        8:{cellWidth:50}
      }
    });
    doc.save('Laporan_Absensi_'+(filterDate||'All')+'.pdf');
    showToast('Export PDF berhasil','success','Berhasil');
    
    setTimeout(function() {
      isExporting = false;
    }, 2000);
  }
  `;
}

function getAdminJS3() {
  return `
  var filterDateIstirahat='';
  var isExportingIstirahat = false;
  
  function formatLokasiFull(lokasi){
    if(!lokasi) return '-';
    try{
      var str=String(lokasi);
      if(str.includes('(') && str.includes(')')){
        var parts=str.split('(');
        return parts[0].trim();
      }
      return str.trim();
    }catch(e){
      return '-';
    }
  }
  
  function getStatusIstirahatBadge(status) {
    if (!status) return '<span class="badge badge-secondary" style="display:inline-block; padding:6px 12px; background:#f1f5f9; color:#64748b; border-radius:20px; white-space:nowrap;">-</span>';
    if (status === 'sedang_istirahat') {
      return '<div style="display:flex; width:100%; height:100%; align-items:center; justify-content:center; padding:0; margin:0;">' +
             '<span style="'+
             'display:flex; ' +
             'align-items:center; ' +
             'justify-content:center; ' +
             'width:100% !important; ' +
             'max-width:100% !important; ' +
             'min-width:0 !important; ' +
             'box-sizing:border-box !important; ' +
             'padding:8px 12px !important; ' +
             'margin:0 !important; ' +
             'background:#fff7ed; ' +
             'color:#f59e0b; ' +
             'border-left:4px solid #f59e0b; ' +
             'border-radius:30px; ' +
             'font-size:12px; ' +
             'font-weight:600; ' +
             'text-align:center; ' +
             'word-wrap:break-word; ' +
             'word-break:break-word; ' +
             'line-height:1.5; ' +
             'border:1px solid rgba(0,0,0,0.05); ' +
             'box-shadow:0 2px 4px rgba(0,0,0,0.02); ' +
             '">Sedang Istirahat</span>' +
             '</div>';
    } else if (status === 'selesai') {
      return '<div style="display:flex; width:100%; height:100%; align-items:center; justify-content:center; padding:0; margin:0;">' +
             '<span style="'+
             'display:flex; ' +
             'align-items:center; ' +
             'justify-content:center; ' +
             'width:100% !important; ' +
             'max-width:100% !important; ' +
             'min-width:0 !important; ' +
             'box-sizing:border-box !important; ' +
             'padding:8px 12px !important; ' +
             'margin:0 !important; ' +
             'background:#ecfdf5; ' +
             'color:#10b981; ' +
             'border-left:4px solid #10b981; ' +
             'border-radius:30px; ' +
             'font-size:12px; ' +
             'font-weight:600; ' +
             'text-align:center; ' +
             'word-wrap:break-word; ' +
             'word-break:break-word; ' +
             'line-height:1.5; ' +
             'border:1px solid rgba(0,0,0,0.05); ' +
             'box-shadow:0 2px 4px rgba(0,0,0,0.02); ' +
             '">Selesai</span>' +
             '</div>';
    } else {
      return '<span class="badge badge-secondary" style="display:inline-block; padding:6px 12px; background:#f1f5f9; color:#64748b; border-radius:20px; white-space:nowrap;">'+status+'</span>';
    }
  }
  
  function renderIstirahat(){
    var c=document.getElementById('main-content');
    c.innerHTML='<div class="page-header" style="justify-content: flex-end;"><div class="header-actions"><input type="date" class="form-input" style="width:150px" onchange="filterIstirahat(this.value)" id="date-filter-istirahat"><button class="btn btn-success" onclick="exportExcelIstirahat()"><i data-lucide="file-spreadsheet" style="width:16px"></i> Excel</button><button class="btn btn-danger" style="background:var(--danger);color:white" onclick="exportPDFIstirahat()"><i data-lucide="file-text" style="width:16px"></i> PDF</button></div></div><div class="card"><div class="card-body"><table class="table table-istirahat"><thead><tr><th>Karyawan</th><th>Divisi</th><th>Tanggal</th><th>Mulai</th><th>Selesai</th><th>Durasi</th><th>Status</th><th>Lokasi Mulai</th><th>Lokasi Selesai</th></tr></thead><tbody id="istirahat-table"><tr><td colspan="9" style="text-align:center;padding:30px;color:var(--gray)">Loading data...</td></tr></tbody></table></div></div>';
    setTimeout(function(){lucide.createIcons();renderIstirahatTable();},100);
  }
  
  function filterIstirahat(d){
    filterDateIstirahat=d;
    renderIstirahatTable();
  }
  
  function renderIstirahatTable(){
    var tb=document.getElementById('istirahat-table');
    if(!tb)return;
    
    var list=istirahat&&istirahat.length>0?istirahat.slice().reverse():[];
    if(filterDateIstirahat){
      list=list.filter(function(a){return a.tanggal===filterDateIstirahat;});
    }
    if(!list||list.length===0){
      tb.innerHTML='<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--gray)">Data Istirahat Kosong / Tidak Ditemukan</td></tr>';
      return;
    }
    var h='';
    for(var i=0;i<list.length;i++){
      var a=list[i];
      
      var st = getStatusIstirahatBadge(a.status);
      
      var mulaiFormatted=formatWaktu(a.mulai);
      var selesaiFormatted=formatWaktu(a.selesai);
      var selesaiDisplay=selesaiFormatted!='-'?'<span class="jam-pulang">'+selesaiFormatted+'</span>':'<span class="badge badge-secondary" style="background:none;padding:0; white-space:nowrap;">-</span>';
      var durasiFormatted=formatDurasi(a.durasi);
      
      var tanggalFormatted=a.tanggal?a.tanggal.substring(0,10).split('-').reverse().join('/'):'-';
      
      var lokasiMulai = formatLokasiFull(a.lokasiMulai);
      var lokasiMulaiHtml = lokasiMulai != '-' ? '<div class="location-cell"><div class="location-wrapper"><span class="location-label"><i data-lucide="map-pin" style="width:12px;height:12px"></i> Alamat</span><span class="location-alamat">'+lokasiMulai+'</span></div></div>' : '<span class="badge badge-secondary" style="background:none;padding:0; white-space:nowrap;">-</span>';
      
      var lokasiSelesai = formatLokasiFull(a.lokasiSelesai);
      var lokasiSelesaiHtml = lokasiSelesai != '-' ? '<div class="location-cell"><div class="location-wrapper"><span class="location-label"><i data-lucide="map-pin" style="width:12px;height:12px"></i> Alamat</span><span class="location-alamat">'+lokasiSelesai+'</span></div></div>' : '<span class="badge badge-secondary" style="background:none;padding:0; white-space:nowrap;">-</span>';
      
      h+='<tr>';
      h+='<td><div class="student-cell"><div class="avatar '+getColor(i)+'">'+getInit(a.nama)+'</div><span class="nama-karyawan">'+a.nama+'</span></div></td>';
      h+='<td><span class="divisi-text">'+ (a.divisi || '-') +'</span></td>';
      h+='<td><span class="tanggal-cell">'+tanggalFormatted+'</span></td>';
      h+='<td><span class="jam-badge">'+mulaiFormatted+'</span></td>';
      h+='<td>'+selesaiDisplay+'</td>';
      h+='<td><span class="durasi-badge">'+durasiFormatted+'</span></td>';
      h+='<td style="vertical-align:middle; height:100%; padding:8px 12px !important;">'+st+'</td>';
      h+='<td>'+lokasiMulaiHtml+'</td>';
      h+='<td>'+lokasiSelesaiHtml+'</td>';
      h+='</tr>';
    }
    
    tb.innerHTML=h;
    setTimeout(function(){lucide.createIcons();},100);
  }
  
  function exportExcelIstirahat(){
    if(isExportingIstirahat) return;
    isExportingIstirahat = true;
    
    var list=istirahat&&istirahat.length>0?istirahat.slice().reverse():[];
    if(filterDateIstirahat)list=list.filter(function(a){return a.tanggal===filterDateIstirahat;});
    if(list.length===0){
      showToast('Tidak ada data untuk diexport','warning','Export Gagal');
      isExportingIstirahat = false;
      return;
    }
    var data=list.map(function(i){
      return{
        Nama:i.nama,
        Divisi:i.divisi||'-',
        Tanggal:i.tanggal,
        'Mulai Istirahat':formatWaktu(i.mulai),
        'Selesai Istirahat':formatWaktu(i.selesai),
        Durasi:formatDurasi(i.durasi),
        Status:i.status==='sedang_istirahat'?'Sedang Istirahat':'Selesai',
        'Lokasi Mulai':formatLokasiFull(i.lokasiMulai),
        'Lokasi Selesai':formatLokasiFull(i.lokasiSelesai)
      };
    });
    var ws=XLSX.utils.json_to_sheet(data);
    var wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Istirahat');
    XLSX.writeFile(wb,'Laporan_Istirahat_'+(filterDateIstirahat||'All')+'.xlsx');
    showToast('Export Excel berhasil','success','Berhasil');
    
    setTimeout(function() {
      isExportingIstirahat = false;
    }, 2000);
  }
  
  function exportPDFIstirahat(){
    if(isExportingIstirahat) return;
    isExportingIstirahat = true;
    
    var list=istirahat&&istirahat.length>0?istirahat.slice().reverse():[];
    if(filterDateIstirahat)list=list.filter(function(a){return a.tanggal===filterDateIstirahat;});
    if(list.length===0){
      showToast('Tidak ada data untuk diexport','warning','Export Gagal');
      isExportingIstirahat = false;
      return;
    }
    var {jsPDF}=window.jspdf;
    var doc=new jsPDF('landscape');
    doc.text('Laporan Istirahat Karyawan',14,15);
    doc.setFontSize(10);
    doc.text('Tanggal: '+(filterDateIstirahat||'Semua Data'),14,22);
    var headers=[['Nama','Divisi','Tanggal','Mulai','Selesai','Durasi','Status','Lokasi Mulai','Lokasi Selesai']];
    var data=list.map(function(a){
      return[
        a.nama,
        a.divisi||'-',
        a.tanggal,
        formatWaktu(a.mulai),
        formatWaktu(a.selesai),
        formatDurasi(a.durasi),
        a.status==='sedang_istirahat'?'Sedang Istirahat':'Selesai',
        formatLokasiFull(a.lokasiMulai).substring(0,60),
        formatLokasiFull(a.lokasiSelesai).substring(0,60)
      ];
    });
    doc.autoTable({
      head:headers,
      body:data,
      startY:30,
      theme:'grid',
      styles:{fontSize:8,cellPadding:4,overflow:'linebreak'},
      columnStyles:{
        0:{cellWidth:35},
        1:{cellWidth:25},
        2:{cellWidth:25},
        3:{cellWidth:20},
        4:{cellWidth:20},
        5:{cellWidth:25},
        6:{cellWidth:25},
        7:{cellWidth:50},
        8:{cellWidth:50}
      }
    });
    doc.save('Laporan_Istirahat_'+(filterDateIstirahat||'All')+'.pdf');
    showToast('Export PDF berhasil','success','Berhasil');
    
    setTimeout(function() {
      isExportingIstirahat = false;
    }, 2000);
  }
  `;
}

function getAdminJS4() {
  return `
  function renderKaryawan(){
    var c=document.getElementById('main-content');
    c.innerHTML='<div class="page-header" style="justify-content: flex-end;"><div class="header-actions"><button class="btn btn-primary" onclick="showAddModal()"><i data-lucide="plus" style="width:16px"></i> Tambah Karyawan</button><button class="btn btn-success" onclick="runSetup()"><i data-lucide="database" style="width:16px"></i> Setup Sheet</button></div></div><div class="card"><div class="card-body"><table class="table table-karyawan"><thead><tr><th>Karyawan</th><th>NIK</th><th>Divisi</th><th>Foto Wajah</th><th>Aksi</th></tr></thead><tbody id="emp-table"></tbody></table></div></div>';
    setTimeout(function(){lucide.createIcons();renderEmpTable();},100);
  }
  
  function renderEmpTable(){
    var tb=document.getElementById('emp-table');
    if(!tb)return;
    if(employees.length===0){
      tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--gray)">Belum ada data karyawan</td></tr>';
      return;
    }
    var h='';
    for(var i=0;i<employees.length;i++){
      var e=employees[i];
      
      var fb=e.hasFace?'<span class="badge badge-success">Terdaftar</span>':'<button class="btn-outline" onclick="regFace(\\''+e.id+'\\',\\''+e.nama+'\\')"><i data-lucide="camera" style="width:14px"></i><span class="upload-text" style="color:var(--primary);font-weight:600">Upload Foto</span></button>';
      
      var actions='<div class="action-group"><button class="action-btn" onclick="downloadIDCard(\\''+e.id+'\\')" title="Print ID Card"><i data-lucide="id-card"></i></button><button class="action-btn" onclick="deleteEmp(\\''+e.id+'\\')" title="Hapus"><i data-lucide="trash-2"></i></button></div>';
      
      h+='<tr>';
      h+='<td><div class="student-cell"><div class="avatar '+getColor(i)+'">'+getInit(e.nama)+'</div><span class="nama-karyawan">'+e.nama+'</span></div></td>';
      h+='<td><span class="nik-text">'+e.nik+'</span></td>';
      h+='<td><span class="divisi-text">'+e.divisi+'</span></td>';
      h+='<td>'+fb+'</td>';
      h+='<td>'+actions+'</td>';
      h+='</tr>';
    }
    
    tb.innerHTML=h;
    setTimeout(function(){lucide.createIcons();},100);
  }
  
  function renderPengaturan(){
    var c=document.getElementById('main-content');
    c.innerHTML='<div class="card"><div class="card-body" style="padding:20px"><div class="form-group"><label class="form-label">Jam Masuk (Batas Terlambat)</label><input type="time" class="form-input" id="set-jam-masuk" value="'+appSettings.jamMasuk+'"></div><div class="form-group"><label class="form-label">Jam Pulang (Batas Lembur)</label><input type="time" class="form-input" id="set-jam-pulang" value="'+appSettings.jamPulang+'"></div><button class="btn btn-primary" onclick="saveSettings()">Simpan Perubahan</button></div></div>';
    setTimeout(function(){lucide.createIcons();},100);
  }
  
  function showAddModal(){
    var m=document.getElementById('modal');
    m.innerHTML='<div class="modal"><div class="modal-header"><span class="modal-title">Tambah Karyawan</span><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body"><div class="form-group"><label class="form-label">NIK / ID</label><input type="text" class="form-input" id="add-nik"></div><div class="form-group"><label class="form-label">Nama Lengkap</label><input type="text" class="form-input" id="add-nama"></div><div class="form-group"><label class="form-label">Divisi</label><input type="text" class="form-input" id="add-divisi"></div><button class="btn btn-primary" style="width:100%" onclick="submitAdd()">Simpan</button></div></div>';
    m.classList.add('active');
    setTimeout(function(){lucide.createIcons();},100);
  }
  
  function regFace(id,nm){
    var m=document.getElementById('modal');
    m.innerHTML='<div class="modal"><div class="modal-header"><span class="modal-title">Foto Wajah - '+nm+'</span><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body"><div class="upload-area" onclick="document.getElementById(\\'f-in\\').click()"><input type="file" id="f-in" hidden accept="image/*" onchange="previewFoto(this)"><span class="upload-text"><i data-lucide="upload-cloud" style="width:18px;height:18px"></i> Klik Upload Foto</span><div class="upload-subtext">Format: JPG, PNG. Maks: 5MB</div></div><div id="preview-container" class="preview-container"><img id="preview-img" class="preview-image" src="#"></div><button id="save-btn" disabled class="btn btn-primary" style="width:100%;margin-top:20px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="saveFace(\\''+id+'\\')"><i data-lucide="save" style="width:16px"></i> Simpan Wajah</button><div id="face-status" style="display:none;margin-top:10px;text-align:center;color:var(--gray)"></div></div></div>';
    m.classList.add('active');
    setTimeout(function(){lucide.createIcons();},100);
    loadFaceApi();
  }
  `;
}

function getAdminJS5() {
  return `
  var uploadedImg=null;
  var isSaving = false;
  var isDeleting = false;
  
  function previewFoto(input){
    if(input.files&&input.files[0]){
      var reader=new FileReader();
      reader.onload=function(e){
        uploadedImg=new Image();
        uploadedImg.onload=function(){
          document.getElementById('preview-container').style.display='block';
          document.getElementById('preview-img').src=e.target.result;
          document.getElementById('save-btn').disabled=false;
          var ua = document.querySelector('.upload-area');
          if(ua) ua.style.display = 'none';
          setTimeout(function(){lucide.createIcons();},100);
        };
        uploadedImg.src=e.target.result;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }
  
  function loadFaceApi(){
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
      faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
      faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
    ]).then(function(){
      console.log('Face API Loaded');
    });
  }
  
  function saveFace(id){
    if(isSaving) return;
    isSaving = true;
    
    var btn = document.getElementById('save-btn');
    if(btn) {
      btn.innerHTML = '<i data-lucide="loader" style="width:16px;animation:spin 1s linear infinite"></i> Memproses...';
      btn.disabled = true;
      lucide.createIcons();
    }
    
    document.getElementById('face-status').style.display='block';
    document.getElementById('face-status').textContent='Mendeteksi wajah...';
    var cv=document.createElement('canvas');
    cv.width=uploadedImg.width;
    cv.height=uploadedImg.height;
    cv.getContext('2d').drawImage(uploadedImg,0,0);
    faceapi.detectSingleFace(cv,new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor().then(function(d){
      if(d){
        var desc=Array.from(d.descriptor);
        var sm=document.createElement('canvas');
        sm.width=200;
        sm.height=200;
        sm.getContext('2d').drawImage(uploadedImg,0,0,200,200);
        var url=sm.toDataURL('image/jpeg',0.5);
        google.script.run.withSuccessHandler(function(r){
          closeModal();
          if(r.success){
            showToast('Berhasil','success','Registrasi Wajah');
            loadAllData();
          } else showToast('Gagal','error','Registrasi Wajah');
          isSaving = false;
        }).registerFace({id:id,desc:desc,url:url});
      }else{
        document.getElementById('face-status').textContent='Wajah tidak terdeteksi';
        showToast('Wajah tidak terdeteksi pada foto','error','Deteksi Gagal');
        isSaving = false;
      }
    });
  }
  
  function submitAdd(){
    if(isSaving) return;
    
    var nik=document.getElementById('add-nik').value;
    var nm=document.getElementById('add-nama').value;
    var div=document.getElementById('add-divisi').value;
    if(!nik||!nm){
      showToast('NIK dan Nama harus diisi','warning','Validasi Gagal');
      return;
    }
    
    isSaving = true;
    var btn = document.querySelector('#modal .btn-primary');
    var originalText = 'Simpan';
    if(btn) {
      originalText = btn.innerHTML;
      btn.innerHTML = '<i class="lucide-loader" data-lucide="loader" style="width:16px;animation:spin 1s linear infinite"></i> Memproses...';
      btn.disabled = true;
      lucide.createIcons();
    }
    
    google.script.run.withSuccessHandler(function(r){
      closeModal();
      showToast('Karyawan berhasil ditambahkan','success','Berhasil');
      loadAllData();
      if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
      isSaving = false;
    }).addEmployee({nik:nik,nama:nm,divisi:div});
  }
  
  function deleteEmp(id){
    if(isDeleting) return;
    
    var e=employees.find(function(x){return x.id===id;});
    var nama=e?e.nama:'Karyawan';
    showConfirm('Apakah Anda yakin ingin menghapus '+nama+'? Semua data absensi dan istirahat karyawan ini akan otomatis dihapus.',function(){
      if(isDeleting) return;
      isDeleting = true;
      
      google.script.run.withSuccessHandler(function(){
        var cd = document.getElementById('confirm-dialog');
        if(cd) cd.classList.remove('active');
        showToast('Karyawan dan semua datanya berhasil dihapus','success','Berhasil');
        loadAllData();
        setTimeout(function() {
          isDeleting = false;
        }, 2000);
      }).withFailureHandler(function(err){
        var cd = document.getElementById('confirm-dialog');
        if(cd) cd.classList.remove('active');
        showToast('Gagal menghapus: ' + err, 'error', 'Error');
        isDeleting = false;
      }).deleteEmployee(id);
    },null,'Hapus Karyawan');
  }
  
  function runSetup(){
    if(isSaving) return;
    isSaving = true;
    
    google.script.run.withSuccessHandler(function(r){
      showToast(r,'success','Setup Berhasil');
      setTimeout(function() {
        isSaving = false;
      }, 2000);
    }).setupSpreadsheet();
  }
  
  function saveSettings(){
    if(isSaving) return;
    isSaving = true;
    
    var btn = document.querySelector('.page-header .btn-primary');
    var originalText = 'Simpan Pengaturan';
    if(btn) {
      originalText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader" style="width:16px;animation:spin 1s linear infinite"></i> Menyimpan...';
      btn.disabled = true;
      lucide.createIcons();
    }
    
    var jm=document.getElementById('set-jam-masuk').value;
    var jp=document.getElementById('set-jam-pulang').value;
    google.script.run.withSuccessHandler(function(){
      showToast('Pengaturan berhasil disimpan','success','Tersimpan');
      loadAllData();
      if(btn) { btn.innerHTML = originalText; btn.disabled = false; lucide.createIcons(); }
      setTimeout(function() {
        isSaving = false;
      }, 2000);
    }).updateSettings({jamMasuk:jm,jamPulang:jp});
  }
  
  function closeModal(){
    document.getElementById('modal').classList.remove('active');
  }
  
  function downloadIDCard(id){
    if(isSaving) return;
    isSaving = true;
    
    var e=employees.find(function(x){return x.id===id;});
    if(!e){
      showToast('Data karyawan tidak ditemukan','error','Error');
      isSaving = false;
      return;
    }
    var div=document.createElement('div');
    div.id='qr-temp';
    div.style.display='none';
    document.body.appendChild(div);
    new QRCode(div,{text:e.nik,width:128,height:128});
    setTimeout(function(){
      var qr=div.querySelector('img').src;
      document.body.removeChild(div);
      genPDF(e,qr);
      showToast('ID Card berhasil diunduh','success','Berhasil');
      setTimeout(function() {
        isSaving = false;
      }, 2000);
    },500);
  }
  
  function genPDF(e,qr){
    var {jsPDF}=window.jspdf;
    var doc=new jsPDF({orientation:'landscape',unit:'mm',format:[85,55]});
    doc.setFillColor(59,130,246);
    doc.rect(0,0,5,55,'F');
    doc.setFontSize(14);
    doc.setFont('helvetica','bold');
    doc.text(e.nama,10,15);
    doc.setFontSize(10);
    doc.setFont('helvetica','normal');
    doc.setTextColor(100);
    doc.text(e.divisi,10,21);
    doc.setDrawColor(200);
    doc.line(10,25,80,25);
    doc.addImage(qr,'PNG',60,28,20,20);
    doc.setFontSize(8);
    doc.setTextColor(50);
    doc.text('NIK: '+e.nik,10,35);
    doc.text('ID: '+e.id,10,40);
    doc.setFontSize(6);
    doc.setTextColor(150);
    doc.text('Edusoft Center',10,50);
    doc.save('IDCard_'+e.nama+'.pdf');
  }
  `;
}

// ============================================
// EMPLOYEE HTML & JS (MOBILE) - FIXED VERSION WITH AUTO RETRY
// ============================================

function getEmployeeHTML() {
  return "<div class='mobile-app' id='app-container'></div><div class='toast-container' id='toasts'></div><div class='confirm-dialog' id='confirm-dialog'></div><div id='admin-modal' class='modal-overlay' style='display:none'><div class='modal' style='max-width:350px'><div class='modal-header'><span class='modal-title'>Login Admin</span><button class='modal-close' onclick='closeAdminModal()'>&times;</button></div><div class='modal-body'><div class='form-group'><label class='form-label'>ID Admin</label><input type='text' class='form-input' id='admin-id' placeholder='Masukkan ID Admin'></div><div class='form-group'><label class='form-label'>Password</label><input type='password' class='form-input' id='admin-pass' placeholder='Masukkan password'></div><button class='btn btn-primary' style='width:100%' onclick='adminLogin()'>Masuk</button></div></div></div>";
}

// ============================================
// EMPLOYEE JAVASCRIPT (HANYA PERUBAHAN TEKS)
// ============================================

function getEmployeeJS() {
  return `
  // ============ VARIABEL GLOBAL ============
  var currEmp = null;
  var vid = null;
  var loc = {alamat: '', lat: null, lng: null, status: 'mencari', isCompleteAddress: false};
  var faceLoaded = false;
  var clockInt = null;
  var istirahatStatus = 'belum_istirahat';
  var currentScanType = '';
  var isScanning = false;
  var isLoggingIn = false;
  var isSubmitting = false;
  var camPopupOpened = false;
  var locationRetryCount = 0;
  var maxLocationRetry = 3;
  var locationRetryTimer = null;
  var verifiedPhotoData = null;

  document.addEventListener('DOMContentLoaded', function(){
    lucide.createIcons();
    showLogin();
    
    // Global Enter Key Handler for Admin Modal in Employee Screen
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var act = document.activeElement;
        if (!act) return;
        if (act.id === 'admin-id' || act.id === 'admin-pass') {
          e.preventDefault();
          adminLogin();
        }
      }
    });
  });

  // ============ LOGIN ============
  function showLogin(){
    stopClock();
    isScanning = false;
    verifiedPhotoData = null;
    clearLocationRetryTimer();
    window.removeEventListener('message', handleCamMessage);

    var html = '<div class="login-screen">';
    html += '<div class="login-header">';
    html += '<div class="logo-circle"><i data-lucide="fingerprint" style="width:28px;height:28px;color:#3b82f6"></i></div>';
    html += '<h1 style="font-size:24px;font-weight:700;margin-top:15px;text-align:center">Edusoft Center</h1>';
    html += '</div>';
    html += '<div class="login-card">';
    html += '<div class="card-header" style="text-align:center;margin-bottom:25px">';
    html += '<h2 style="font-size:18px;font-weight:600;color:var(--text)">Masuk ke Portal</h2>';
    html += '<p style="color:var(--text-muted);font-size:12px;margin-top:5px">Masukkan ID Karyawan</p>';
    html += '</div>';
    html += '<div class="form-group">';
    html += '<label class="form-label" style="color:#64748b;font-size:13px">ID Karyawan</label>';
    html += '<div class="input-with-icon">';
    html += '<i data-lucide="id-card" style="width:18px;color:#94a3b8;position:absolute;left:16px;top:50%;transform:translateY(-50%)"></i>';
    html += '<input type="text" class="login-input" id="nik-in" placeholder="Contoh: EMP00123" style="padding-left:42px" onkeydown="handleLoginKeyPress(event)">';
    html += '</div></div>';
    html += '<button class="login-btn" onclick="checkEmp()" id="emp-login-btn">';
    html += '<i data-lucide="log-in" style="width:18px"></i><span>Masuk</span></button>';
    html += '</div>';
    html += '<div class="login-info">';
    html += '<div class="info-item"><i data-lucide="shield-check" style="width:14px;color:#10b981"></i><span style="font-size:11px">Keamanan Terjamin</span></div>';
    html += '<div class="info-item"><i data-lucide="clock" style="width:14px;color:#3b82f6"></i><span style="font-size:11px">Realtime Tracking</span></div>';
    html += '<div class="info-item"><i data-lucide="smartphone" style="width:14px;color:#f59e0b"></i><span style="font-size:11px">Mobile Friendly</span></div>';
    html += '</div></div>';

    document.getElementById('app-container').innerHTML = html;
    setTimeout(function(){ lucide.createIcons(); }, 100);
    setTimeout(function(){
      var input = document.getElementById('nik-in');
      if(input) input.focus();
    }, 200);
  }

  function handleLoginKeyPress(e) {
    if(e.key === 'Enter') {
      e.preventDefault();
      var input = document.getElementById('nik-in').value.toUpperCase();
      if(input === 'ADMIN' || input === 'ADMINHR') {
        showAdminLogin();
        return false;
      }
      checkEmp();
      return false;
    }
  }

  function openCamPopup() {
    if (camPopupOpened) return;
    
    var btnCam = document.getElementById('btn-buka-cam');
    if(btnCam) {
      btnCam.disabled = true;
      btnCam.style.background = '#94a3b8';
      btnCam.style.cursor = 'not-allowed';
      btnCam.innerHTML = '⏳ Membuka Kamera...';
    }
    
    camPopupOpened = true;
    var CAM_PAGE_URL = 'https://admintoko.github.io/absensi-cam/';
    var popup = window.open(CAM_PAGE_URL, 'camPopup', 
      'width=400,height=600,top=100,left=' + Math.round((screen.width-400)/2));
    
    if(!popup) {
      camPopupOpened = false;
      if(btnCam) {
        btnCam.disabled = false;
        btnCam.style.background = '#3b82f6';
        btnCam.style.cursor = 'pointer';
        btnCam.innerHTML = '📷 Buka Kamera';
      }
      showToast('Popup diblokir browser. Izinkan popup untuk situs ini.', 'warning', 'Popup Blocked');
      return;
    }
    
    // Kirim data ke popup setelah terbuka
    var sendInit = setInterval(function() {
      try {
        popup.postMessage({
          type: 'init',
          descriptor: currEmp.desc ? Array.from(currEmp.desc) : null,
          nik: currEmp.nik,
          actionType: currentScanType
        }, '*');
      } catch(e) {}
    }, 500);
    
    // Terima hasil dari popup
    function handlePopupMsg(event) {
      if(!event.data || event.data.type !== 'face_verified') return;
      clearInterval(sendInit);
      window.removeEventListener('message', handlePopupMsg);
      if(popup && !popup.closed) popup.close();
      camPopupOpened = false;
      
      if(btnCam) {
        btnCam.innerHTML = '✅ Sukses Men-scan';
      }
      
      verifiedPhotoData = event.data.photo;
      autoSubmitAbsen(); // <-- ganti tryEnableAbsenBtn() dengan ini
    }
    
    window.addEventListener('message', handlePopupMsg);
    
    // Cek popup ditutup manual
    var checkClosed = setInterval(function() {
      if(popup.closed) {
        clearInterval(checkClosed);
        clearInterval(sendInit);
        window.removeEventListener('message', handlePopupMsg);
        camPopupOpened = false;
        
        // Cek jika batal scan (verifiedPhotoData masih null)
        if(!verifiedPhotoData && btnCam) {
          btnCam.disabled = false;
          btnCam.style.background = '#3b82f6';
          btnCam.style.cursor = 'pointer';
          btnCam.innerHTML = '📷 Buka Kamera';
        }
      }
    }, 1000);
  }

  function showAdminLogin(){
    document.getElementById('admin-modal').style.display = 'flex';
    document.getElementById('admin-id').focus();
  }

  function closeAdminModal(){
    document.getElementById('admin-modal').style.display = 'none';
  }

  function adminLogin(){
    var adminId = document.getElementById('admin-id').value.toUpperCase();
    var adminPass = document.getElementById('admin-pass').value;
    var btn = document.querySelector('#admin-modal .btn-primary');
    var originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader" style="width:16px;animation:spin 1s linear infinite"></i> Memverifikasi...';
    btn.disabled = true;
    lucide.createIcons();
    google.script.run.withSuccessHandler(function(r){
      if(r.success){
        btn.innerHTML = '<i data-lucide="loader" style="width:16px;animation:spin 1s linear infinite"></i> Mengalihkan...';
        showToast('Login admin berhasil', 'success', 'Selamat Datang');
        window.location.href = '?page=admin';
      } else {
        btn.innerHTML = originalText;
        btn.disabled = false;
        showToast(r.message || 'ID atau password salah!', 'error', 'Login Gagal');
        lucide.createIcons();
      }
    }).withFailureHandler(function(e){
      btn.innerHTML = originalText;
      btn.disabled = false;
      showToast('Koneksi Error: ' + e, 'error', 'Error');
      lucide.createIcons();
    }).validateAdmin(adminId, adminPass);
  }

  function checkEmp(){
    if(isLoggingIn) return;
    var btn = document.getElementById('emp-login-btn');
    var inp = document.getElementById('nik-in');
    var nik = inp ? inp.value : '';
    if(!nik){
      showToast('Masukkan ID Karyawan', 'warning', 'Input Required');
      return;
    }
    isLoggingIn = true;
    var t = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader" style="width:16px;animation:spin 1s linear infinite"></i><span>Memverifikasi...</span>';
    btn.disabled = true;
    lucide.createIcons();
    google.script.run.withSuccessHandler(function(r){
      try {
        r = JSON.parse(r);
        if(r.success){
          btn.innerHTML = '<i data-lucide="loader" style="width:16px;animation:spin 1s linear infinite"></i><span>Memuat Data Utama...</span>';
          lucide.createIcons();
          currEmp = r.data;
          
          // Anti-Lag: Data status langsung dari r
          istirahatStatus = r.istirahatStatus || 'belum_istirahat';
          showAction(r.status);
          isLoggingIn = false;
        } else {
          btn.innerHTML = t;
          btn.disabled = false;
          lucide.createIcons();
          showToast(r.message || 'Karyawan tidak ditemukan', 'error', 'Login Gagal');
          isLoggingIn = false;
        }
      } catch(err) {
        btn.innerHTML = t;
        btn.disabled = false;
        lucide.createIcons();
        showToast('Error: ' + err.message, 'error', 'Error');
        isLoggingIn = false;
      }
    }).withFailureHandler(function(e){
      btn.innerHTML = t;
      btn.disabled = false;
      lucide.createIcons();
      showToast('Koneksi Error: ' + e, 'error', 'Error');
      isLoggingIn = false;
    }).getEmployeeByNIK(nik);
  }

  // ============ MENU UTAMA ============
  function showAction(status){
    var menuHtml = '';
    menuHtml += '<div class="app-header">';
    menuHtml += '<div class="app-logo"><div class="logo-box"><i data-lucide="hexagon" style="width:20px"></i></div>';
    menuHtml += '<div><h3 style="font-size:14px;font-weight:700">Edusoft Center</h3>';
    menuHtml += '<p style="font-size:10px;color:var(--text-muted)">ID: #' + currEmp.nik + '</p></div></div>';
    menuHtml += '<div class="header-actions"><div class="icon-btn" onclick="showLogin()"><i data-lucide="log-out" style="width:18px"></i></div></div></div>';
    menuHtml += '<div class="time-section"><div class="digital-clock" id="clock">00:00</div><div class="date-text" id="date">Loading...</div></div>';

    var greeting = status === 'belum_masuk' ? 'Selamat datang! Silakan pilih jenis absensi:' : status === 'sudah_masuk' ? 'Anda sudah absen masuk. Pilih opsi lain:' : 'Absensi hari ini sudah selesai.';
    menuHtml += '<div style="text-align:center;margin:20px 0 30px;padding:0 20px"><p style="color:var(--text-muted);font-size:14px">' + greeting + '</p></div>';
    menuHtml += '<div class="attendance-grid">';

    var masukDisabled = (status !== 'belum_masuk');
    menuHtml += '<div class="att-btn" ' + (masukDisabled ? 'style="opacity:0.5"' : 'data-type="masuk" onclick="goToScan(this.dataset.type)"') + '>';
    menuHtml += '<div class="att-icon" style="background:rgba(59,130,246,0.1);color:var(--primary)"><i data-lucide="log-in" style="width:24px"></i></div>';
    menuHtml += '<div class="att-label">Absen Masuk</div>';
    menuHtml += '<div class="att-time">' + (currEmp.jamMasuk || '-') + '</div>';
    if(masukDisabled) menuHtml += '<div class="att-status"><span class="badge badge-success" style="font-size:10px;padding:2px 6px">Selesai</span></div>';
    menuHtml += '</div>';

    var pulangDisabled = (status !== 'sudah_masuk');
    menuHtml += '<div class="att-btn" ' + (pulangDisabled ? 'style="opacity:0.5"' : 'data-type="pulang" onclick="goToScan(this.dataset.type)"') + '>';
    menuHtml += '<div class="att-icon" style="background:rgba(245,158,11,0.1);color:var(--warning)"><i data-lucide="log-out" style="width:24px"></i></div>';
    menuHtml += '<div class="att-label">Absen Pulang</div><div class="att-time">-</div>';
    if(pulangDisabled) menuHtml += '<div class="att-status"><span class="badge badge-warning" style="font-size:10px;padding:2px 6px">' + (status === 'belum_masuk' ? 'Belum Masuk' : 'Selesai') + '</span></div>';
    menuHtml += '</div>';

    var istirahatDisabled = (status === 'belum_masuk' || status === 'selesai' || istirahatStatus !== 'belum_istirahat');
    menuHtml += '<div class="att-btn" ' + (istirahatDisabled ? 'style="opacity:0.5"' : 'data-type="istirahat_mulai" onclick="goToScan(this.dataset.type)"') + '>';
    menuHtml += '<div class="att-icon" style="background:rgba(16,185,129,0.1);color:var(--success)"><i data-lucide="coffee" style="width:24px"></i></div>';
    menuHtml += '<div class="att-label">Istirahat</div><div class="att-time">-</div>';
    if(istirahatDisabled){
      if(status === 'belum_masuk') menuHtml += '<div class="att-status"><span class="badge badge-warning" style="font-size:10px;padding:2px 6px">Belum Masuk</span></div>';
      else if(istirahatStatus === 'sedang_istirahat') menuHtml += '<div class="att-status"><span class="badge badge-success" style="font-size:10px;padding:2px 6px">Sedang Istirahat</span></div>';
      else if(istirahatStatus === 'selesai_istirahat') menuHtml += '<div class="att-status"><span class="badge badge-info" style="font-size:10px;padding:2px 6px">Selesai</span></div>';
    }
    menuHtml += '</div>';

    var selesaiDisabled = (status === 'belum_masuk' || status === 'selesai' || istirahatStatus !== 'sedang_istirahat');
    menuHtml += '<div class="att-btn" ' + (selesaiDisabled ? 'style="opacity:0.5"' : 'data-type="istirahat_selesai" onclick="goToScan(this.dataset.type)"') + '>';
    menuHtml += '<div class="att-icon" style="background:rgba(139,92,246,0.1);color:#8b5cf6"><i data-lucide="coffee" style="width:24px"></i></div>';
    menuHtml += '<div class="att-label">Selesai Istirahat</div><div class="att-time">-</div>';
    if(selesaiDisabled){
      if(status === 'belum_masuk') menuHtml += '<div class="att-status"><span class="badge badge-warning" style="font-size:10px;padding:2px 6px">Belum Masuk</span></div>';
      else if(istirahatStatus === 'belum_istirahat') menuHtml += '<div class="att-status"><span class="badge badge-warning" style="font-size:10px;padding:2px 6px">Belum Mulai</span></div>';
      else if(istirahatStatus === 'selesai_istirahat') menuHtml += '<div class="att-status"><span class="badge badge-success" style="font-size:10px;padding:2px 6px">Selesai</span></div>';
    }
    menuHtml += '</div></div>';

    menuHtml += '<div class="bottom-nav">';
    menuHtml += '<div class="nav-icon active"><i data-lucide="home" style="width:20px"></i><span>Beranda</span></div>';
    menuHtml += '<div class="nav-icon" onclick="showHistory()"><i data-lucide="calendar" style="width:20px"></i><span>Riwayat</span></div>';
    menuHtml += '<div class="nav-icon" onclick="showProfile()"><i data-lucide="user" style="width:20px"></i><span>Profil</span></div>';
    menuHtml += '</div>';

    document.getElementById('app-container').innerHTML = menuHtml;
    setTimeout(function(){ lucide.createIcons(); startClock(); }, 100);
  }

  function goBackToMenu(){
    window.removeEventListener('message', handleCamMessage);
    verifiedPhotoData = null;
    isScanning = false;
    isSubmitting = false;
    camPopupOpened = false;
    clearLocationRetryTimer();
    stopClock();
    
    document.getElementById('app-container').innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;color:var(--text)"><i data-lucide="loader" style="width:40px;height:40px;color:var(--primary);animation:spin 1s linear infinite;margin-bottom:15px"></i><p style="font-size:15px">Memuat Menu Utama...</p></div>';
    lucide.createIcons();

    google.script.run.withSuccessHandler(function(r){
      istirahatStatus = r.status;
      showAction(r.absensiStatus);
    }).withFailureHandler(function(e){
      showAction('belum_masuk');
    }).getIstirahatStatus(currEmp.id);
  }

  // ============ HALAMAN SCAN (GITHUB PAGES IFRAME) ============
  function goToScan(type){
    if(isScanning) return;
    isScanning = true;
    verifiedPhotoData = null;

    loc = {alamat: '', lat: null, lng: null, status: 'mencari', isCompleteAddress: false};
    locationRetryCount = 0;
    clearLocationRetryTimer();
    currentScanType = type;

    // ⚠️ GANTI DENGAN URL GITHUB PAGES ANDA
    var CAM_PAGE_URL = 'https://admintoko.github.io/absensi-cam/';

    var labelMap = {
      masuk: 'Absen Masuk',
      pulang: 'Absen Pulang',
      istirahat_mulai: 'Mulai Istirahat',
      istirahat_selesai: 'Selesai Istirahat'
    };
    var labelTitle = labelMap[type] || 'Scan Wajah';

    var h = '';
    h += '<div class="app-header">';
    h += '<div class="app-logo"><div class="logo-box"><i data-lucide="hexagon" style="width:20px"></i></div>';
    h += '<div><h3 style="font-size:14px;font-weight:700">Edusoft Center</h3>';
    h += '<p style="font-size:10px;color:var(--text-muted)">' + labelTitle + ' — #' + currEmp.nik + '</p></div></div>';
    h += '<div class="header-actions"><div class="icon-btn" onclick="goBackToMenu()"><i data-lucide="arrow-left" style="width:18px"></i></div></div>';
    h += '</div>';

    h += '<div class="time-section"><div class="digital-clock" id="clock">00:00</div>';
    h += '<div class="date-text" id="date">Loading...</div></div>';

    // Desktop Wrapper Start
    h += '<div class="scan-wrapper">';

    // GPS Section
    h += '<div style="padding:0 16px;margin-bottom:10px">';
    h += '<div id="gps-badge" style="display:flex;align-items:center;gap:8px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:30px;padding:8px 14px;font-size:12px;font-weight:600;color:var(--primary)">';
    h += '<i data-lucide="map-pin" style="width:14px"></i><span id="gps-text">Mendeteksi lokasi...</span></div>';
    h += '<div id="addr-detail" style="font-size:11px;color:var(--text-muted);margin-top:6px;padding:0 4px;min-height:14px"></div>';
    h += '<div id="location-error" style="display:none;margin-top:8px;padding:10px;background:rgba(239,68,68,0.1);border:1px solid var(--danger);border-radius:10px;font-size:12px;color:var(--danger)">';
    h += '<span id="error-message">Error lokasi</span>';
    h += '<button onclick="retryGetLocation()" style="display:block;margin-top:6px;padding:4px 12px;background:var(--danger);color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer">Coba Lagi</button></div>';
    h += '<div id="location-warning" style="display:none;margin-top:8px;padding:10px;background:rgba(245,158,11,0.1);border:1px solid var(--warning);border-radius:10px;font-size:12px;color:var(--warning)">';
    h += '<span id="warning-message"></span></div>';
    h += '</div>';

    // Face status bar
    h += '<div id="face-status-bar" style="display:none;margin:0 16px 10px;padding:10px 14px;border-radius:10px;font-size:13px;font-weight:600;text-align:center"></div>';

    // Camera popup button
    h += '<div style="padding:0 16px;text-align:center">';
    h += '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:20px;padding:40px 20px;margin-bottom:10px">';
    h += '<div style="width:80px;height:80px;background:rgba(59,130,246,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">';
    h += '<i data-lucide="camera" style="width:36px;height:36px;color:#3b82f6"></i></div>';
    h += '<p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Klik tombol di bawah untuk membuka kamera verifikasi wajah</p>';
    h += '<button id="btn-buka-cam" onclick="openCamPopup()" style="padding:12px 24px;background:#3b82f6;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.3s">📷 Buka Kamera</button>';
    h += '</div></div>';

    // Confirm button
    h += '<div style="padding:16px;margin-top:8px">';
    h += '<button id="act-btn" disabled data-type="' + type + '" onclick="submitAbsenFromScan(this.dataset.type)" ';
    h += 'style="width:100%;padding:14px;font-size:15px;font-weight:600;border:none;border-radius:12px;background:#3b82f6;color:white;cursor:not-allowed;opacity:0.5;display:flex;align-items:center;justify-content:center;gap:8px">';
    h += '⏳ Menunggu verifikasi wajah...</button>';
    h += '</div>';
    
    // Desktop Wrapper End
    h += '</div>';
    
    h += '<div style="height:30px"></div>';

    document.getElementById('app-container').innerHTML = h;
    setTimeout(function(){
      lucide.createIcons();
      startClock();
      getLoc();
      initCamIframe();
    }, 200);
  }

  function handleCamMessage(event){
    var data = event.data;
    if(!data || data.type !== 'face_verified') return;
    window.removeEventListener('message', handleCamMessage);

    verifiedPhotoData = data.photo;
    
    // Disable kamera button agar tidak kena klik ganda
    var btnCam = document.getElementById('btn-buka-cam');
    if(btnCam) {
      btnCam.disabled = true;
      btnCam.style.background = '#10b981';
      btnCam.innerHTML = '<i data-lucide="check-circle" style="width:18px;margin-right:6px"></i> Wajah Terverifikasi';
      lucide.createIcons();
    }
    
    // Langsung submit tanpa tunggu tombol
    autoSubmitAbsen();
  }

  function autoSubmitAbsen(){
    // Tunggu GPS kalau belum ready, max 10 detik
    var attempts = 0;
    var maxAttempts = 20; // 20 x 500ms = 10 detik
    
    var bar = document.getElementById('face-status-bar');
    if(bar){
      bar.style.display = 'block';
      bar.style.background = 'rgba(59,130,246,0.15)';
      bar.style.border = '1px solid #3b82f6';
      bar.style.color = '#3b82f6';
      bar.textContent = '✅ Wajah terverifikasi! Menunggu GPS...';
    }
    
    var waitGPS = setInterval(function(){
      attempts++;
      
      if(loc.status === 'ditemukan' && loc.alamat){
        clearInterval(waitGPS);
        doFinalSubmit();
      } else if(attempts >= maxAttempts){
        clearInterval(waitGPS);
        // GPS gagal tapi tetap submit dengan koordinat
        if(loc.lat && loc.lng){
          loc.alamat = 'Koordinat: ' + loc.lat.toFixed(6) + ',' + loc.lng.toFixed(6);
          loc.status = 'ditemukan';
          doFinalSubmit();
        } else {
          if(bar){
            bar.style.background = 'rgba(239,68,68,0.15)';
            bar.style.border = '1px solid #ef4444';
            bar.style.color = '#ef4444';
            bar.textContent = '❌ GPS gagal. Aktifkan lokasi dan coba lagi.';
          }
          isScanning = false;
        }
      } else {
        if(bar) bar.textContent = '✅ Wajah OK! Menunggu GPS... (' + attempts + '/20)';
      }
    }, 500);
  }
  
  function doFinalSubmit(){
    if(isSubmitting) return;
    isSubmitting = true;

    var bar = document.getElementById('face-status-bar');
    if(bar){
      bar.style.background = 'rgba(59,130,246,0.15)';
      bar.style.border = '1px solid #3b82f6';
      bar.style.color = '#3b82f6';
      bar.textContent = '⏳ Menyimpan absensi...';
    }
    
    var type = currentScanType;
    var fotoToSend = verifiedPhotoData;
    var alamatToSend = loc.alamat;
    
    if(type === 'masuk' || type === 'pulang'){
      google.script.run
        .withSuccessHandler(function(r){
          isSubmitting = false;
          verifiedPhotoData = null;
          isScanning = false;
          if(r && r.success === false) {
             showToast(r.message, 'error', 'Gagal');
             if(bar) bar.textContent = '❌ ' + r.message;
             if(r.message.includes('sudah absen')) setTimeout(goBackToMenu, 2000);
          } else {
             showSuccess(type);
          }
        })
        .withFailureHandler(function(e){
          isSubmitting = false;
          isScanning = false;
          showToast('Error: ' + e, 'error', 'Gagal');
          if(bar) bar.textContent = '❌ Gagal: ' + e;
        })
        .submitAttendance({id: currEmp.id, type: type, foto: fotoToSend, alamat: alamatToSend});
    } else {
      google.script.run
        .withSuccessHandler(function(r){
          isSubmitting = false;
          verifiedPhotoData = null;
          isScanning = false;
          if(r && r.success === false) {
             showToast(r.message, 'error', 'Gagal');
             if(bar) bar.textContent = '❌ ' + r.message;
             if(r.message.includes('sudah selesai')) setTimeout(goBackToMenu, 2000);
          } else {
             showSuccessIstirahat(type);
          }
        })
        .withFailureHandler(function(e){
          isSubmitting = false;
          isScanning = false;
          showToast('Error: ' + e, 'error', 'Gagal');
          if(bar) bar.textContent = '❌ Gagal: ' + e;
        })
        .submitIstirahat({id: currEmp.id, type: type, foto: fotoToSend, alamat: alamatToSend});
    }
  }

  function tryEnableAbsenBtn(){
    var btn = document.getElementById('act-btn');
    if(!btn) return;
    var faceOk = verifiedPhotoData !== null;
    var locOk = loc.status === 'ditemukan';
    if(faceOk && locOk){
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.textContent = '✅ Konfirmasi Absensi';
    } else if(faceOk && !locOk){
      btn.textContent = '⏳ Menunggu lokasi GPS...';
    }
  }

  function submitAbsenFromScan(type){
    if(isSubmitting) return;
    if(!verifiedPhotoData){
      showToast('Verifikasi wajah dulu sebelum absen.', 'warning', 'Perlu Verifikasi');
      return;
    }
    if(loc.status !== 'ditemukan' || !loc.alamat){
      showToast('Lokasi belum terdeteksi.', 'error', 'GPS Error');
      return;
    }

    isSubmitting = true;
    var btn = document.getElementById('act-btn');
    if(btn){ btn.disabled = true; btn.textContent = '⏳ Menyimpan...'; }

    var fotoToSend = verifiedPhotoData;
    var alamatToSend = loc.alamat;

    if(type === 'masuk' || type === 'pulang'){
      google.script.run
        .withSuccessHandler(function(r){
          isSubmitting = false;
          verifiedPhotoData = null;
          isScanning = false;
          if(r && r.success === false) {
             if(btn){ btn.disabled = false; btn.textContent = '✅ Konfirmasi Absensi'; }
             showToast(r.message, 'error', 'Gagal');
          } else {
             showSuccess(type);
          }
        })
        .withFailureHandler(function(e){
          isSubmitting = false;
          if(btn){ btn.disabled = false; btn.textContent = '✅ Konfirmasi Absensi'; }
          isScanning = false;
          showToast('Error: ' + e, 'error', 'Gagal');
        })
        .submitAttendance({id: currEmp.id, type: type, foto: fotoToSend, alamat: alamatToSend});
    } else {
      google.script.run
        .withSuccessHandler(function(r){
          isSubmitting = false;
          verifiedPhotoData = null;
          isScanning = false;
          if(r && r.success === false) {
             if(btn){ btn.disabled = false; btn.textContent = '✅ Konfirmasi Absensi'; }
             showToast(r.message, 'error', 'Gagal');
          } else {
             showSuccessIstirahat(type);
          }
        })
        .withFailureHandler(function(e){
          isSubmitting = false;
          if(btn){ btn.disabled = false; btn.textContent = '✅ Konfirmasi Absensi'; }
          isScanning = false;
          showToast('Error: ' + e, 'error', 'Gagal');
        })
        .submitIstirahat({id: currEmp.id, type: type, foto: fotoToSend, alamat: alamatToSend});
    }
  }

  // ============ GPS / LOKASI ============
  function getLoc(){
    if(!navigator.geolocation){
      showGPSError('Browser tidak mendukung GPS');
      return;
    }

    loc.status = 'mencari';
    loc.isCompleteAddress = false;

    var gpsBadge = document.getElementById('gps-badge');
    var gpsText = document.getElementById('gps-text');
    var errorDiv = document.getElementById('location-error');
    var warningDiv = document.getElementById('location-warning');

    if(gpsBadge){
      gpsBadge.style.background = 'rgba(59,130,246,0.1)';
      gpsBadge.style.borderColor = 'rgba(59,130,246,0.3)';
      gpsBadge.style.color = 'var(--primary)';
    }
    if(gpsText) gpsText.textContent = 'Mendeteksi lokasi...';
    if(errorDiv) errorDiv.style.display = 'none';
    if(warningDiv) warningDiv.style.display = 'none';

    navigator.geolocation.getCurrentPosition(
      function(position){
        loc.lat = position.coords.latitude;
        loc.lng = position.coords.longitude;
        loc.status = 'ditemukan';

        var gpsBadge = document.getElementById('gps-badge');
        var gpsText = document.getElementById('gps-text');
        if(gpsBadge){
          gpsBadge.style.background = 'rgba(16,185,129,0.1)';
          gpsBadge.style.borderColor = 'rgba(16,185,129,0.3)';
          gpsBadge.style.color = '#10b981';
        }
        if(gpsText) gpsText.textContent = 'Lokasi ditemukan, mengambil alamat...';

        getAddressFromCoords(loc.lat, loc.lng);
      },
      function(error){
        locationRetryCount++;
        var msg = 'Gagal mendapatkan lokasi.';
        if(error.code === 1) msg = 'Izin GPS ditolak. Izinkan akses lokasi di browser.';
        else if(error.code === 2) msg = 'Sinyal GPS tidak tersedia.';
        else if(error.code === 3) msg = 'Waktu GPS habis. Coba lagi.';
        showGPSError(msg);
      },
      {enableHighAccuracy: true, timeout: 10000, maximumAge: 0}
    );
  }

  function getAddressFromCoords(lat, lng){
    fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&zoom=18&addressdetails=1&accept-language=id')
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(data && data.display_name){
          var addr = data.address || {};
          var componentCount = 0;
          if(addr.road || addr.street) componentCount++;
          if(addr.city || addr.town || addr.village) componentCount++;
          if(addr.state) componentCount++;
          if(addr.country) componentCount++;

          if(componentCount >= 3){
            loc.alamat = data.display_name;
            loc.isCompleteAddress = true;

            var kota = addr.city || addr.town || addr.village || addr.county || 'Lokasi OK';
            var gpsText = document.getElementById('gps-text');
            var addrDetail = document.getElementById('addr-detail');
            var gpsBadge = document.getElementById('gps-badge');

            if(gpsBadge){
              gpsBadge.style.background = 'rgba(16,185,129,0.1)';
              gpsBadge.style.borderColor = 'rgba(16,185,129,0.3)';
              gpsBadge.style.color = '#10b981';
            }
            if(gpsText) gpsText.textContent = '✓ ' + kota;
            if(addrDetail) addrDetail.textContent = loc.alamat.substring(0, 120) + (loc.alamat.length > 120 ? '...' : '');

            tryEnableAbsenBtn();
          } else {
            handlePartialAddress(lat, lng, data);
          }
        } else {
          handlePartialAddress(lat, lng, null);
        }
      })
      .catch(function(){
        handlePartialAddress(lat, lng, null);
      });
  }

  function handlePartialAddress(lat, lng, data){
    var warningDiv = document.getElementById('location-warning');
    var warningMsg = document.getElementById('warning-message');

    if(locationRetryCount < maxLocationRetry){
      if(warningDiv) warningDiv.style.display = 'block';
      if(warningMsg) warningMsg.textContent = 'Alamat belum lengkap, mencoba ulang (' + (locationRetryCount + 1) + '/' + maxLocationRetry + ')...';

      clearLocationRetryTimer();
      locationRetryTimer = setTimeout(function(){
        locationRetryCount++;
        getAddressFromCoords(lat, lng);
      }, 2000);
    } else {
      loc.alamat = 'Koordinat: ' + lat.toFixed(6) + ', ' + lng.toFixed(6);
      loc.isCompleteAddress = false;
      loc.status = 'ditemukan';

      var addrDetail = document.getElementById('addr-detail');
      if(addrDetail) addrDetail.textContent = loc.alamat;

      if(warningDiv) warningDiv.style.display = 'block';
      if(warningMsg) warningMsg.textContent = 'Alamat detail tidak tersedia. Absen tetap bisa dilakukan.';

      tryEnableAbsenBtn();
    }
  }

  function showGPSError(message){
    loc.status = 'gagal';
    clearLocationRetryTimer();

    var gpsBadge = document.getElementById('gps-badge');
    var gpsText = document.getElementById('gps-text');
    var errorDiv = document.getElementById('location-error');
    var errorMsg = document.getElementById('error-message');

    if(gpsBadge){
      gpsBadge.style.background = 'rgba(239,68,68,0.1)';
      gpsBadge.style.borderColor = 'rgba(239,68,68,0.3)';
      gpsBadge.style.color = '#ef4444';
    }
    if(gpsText) gpsText.textContent = 'GPS Error';
    if(errorDiv) errorDiv.style.display = 'block';
    if(errorMsg) errorMsg.textContent = message;
  }

  function retryGetLocation(){
    var btn = event.target || event.srcElement;
    if(btn && btn.tagName === 'BUTTON') {
      btn.disabled = true;
      btn.innerHTML = 'Mencari...';
      btn.style.opacity = '0.7';
    }
    locationRetryCount = 0;
    clearLocationRetryTimer();
    getLoc();
  }

  function clearLocationRetryTimer(){
    if(locationRetryTimer){ clearTimeout(locationRetryTimer); locationRetryTimer = null; }
  }

  // ============ CLOCK ============
  function startClock(){
    stopClock();
    updateTime();
    clockInt = setInterval(updateTime, 1000);
  }

  function stopClock(){
    if(clockInt){ clearInterval(clockInt); clockInt = null; }
  }

  function updateTime(){
    var clockEl = document.getElementById('clock');
    var dateEl = document.getElementById('date');
    if(!clockEl) return;
    var d = new Date();
    var timeStr = d.toLocaleTimeString('id-ID', {timeZone:'Asia/Jakarta', hour:'numeric', minute:'2-digit', hour12:false});
    clockEl.textContent = timeStr;
    if(dateEl) dateEl.textContent = d.toLocaleDateString('id-ID', {timeZone:'Asia/Jakarta', weekday:'long', year:'numeric', month:'long', day:'numeric'});
  }

  // ============ CAM (tidak dipakai, ada di GitHub Pages) ============
  function startCam(){}
  function stopCam(){ vid = null; }
  function loadFace(){}

  // ============ SUCCESS SCREENS ============
  function showSuccess(type){
    var message = type === 'masuk' ? 'Absen masuk berhasil dicatat.' : 'Absen pulang berhasil dicatat.';
    stopClock();
    clearLocationRetryTimer();
    document.getElementById('app-container').innerHTML =
      '<div class="input-screen" style="text-align:center">' +
      '<div style="width:80px;height:80px;background:rgba(16,185,129,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;color:var(--success)">' +
      '<i data-lucide="check" style="width:40px;height:40px"></i></div>' +
      '<h2 style="font-size:24px;font-weight:700;margin-bottom:10px">Absensi Berhasil</h2>' +
      '<p style="color:var(--text-muted)">' + message + '</p>' +
      '<button onclick="showLogin()" style="margin-top:30px;padding:14px 28px;background:#3b82f6;color:white;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer">Kembali ke Login</button>' +
      '</div>';
    setTimeout(function(){ lucide.createIcons(); }, 100);
  }

  function showSuccessIstirahat(type){
    var message = type === 'istirahat_mulai' ? 'Istirahat berhasil dimulai.' : 'Istirahat berhasil diselesaikan.';
    stopClock();
    clearLocationRetryTimer();
    document.getElementById('app-container').innerHTML =
      '<div class="input-screen" style="text-align:center">' +
      '<div style="width:80px;height:80px;background:rgba(16,185,129,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;color:var(--success)">' +
      '<i data-lucide="check" style="width:40px;height:40px"></i></div>' +
      '<h2 style="font-size:24px;font-weight:700;margin-bottom:10px">Istirahat Berhasil</h2>' +
      '<p style="color:var(--text-muted)">' + message + '</p>' +
      '<button onclick="showLogin()" style="margin-top:30px;padding:14px 28px;background:#3b82f6;color:white;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer">Kembali ke Login</button>' +
      '</div>';
    setTimeout(function(){ lucide.createIcons(); }, 100);
  }

  // ============ MISC ============
  function showHistory(){ showToast('Fitur riwayat akan segera hadir', 'info', 'Informasi'); }
  function showProfile(){ showToast('Fitur profil akan segera hadir', 'info', 'Informasi'); }
  function doAbsen(){}
  `;
}
// ============================================
// REGISTER HTML & JS
// ============================================

function getRegisterHTML() {
    return '<div class="mobile-app"><div style="padding:20px;display:flex;align-items:center;gap:10px;margin-bottom:10px"><i data-lucide="chevron-left" onclick="window.history.back()" style="cursor:pointer"></i><h2 style="font-size:18px;font-weight:700;color:var(--text)">Data Karyawan</h2></div><div style="text-align:center;margin-bottom:30px;position:relative"><div style="width:120px;height:120px;background:#e2e8f0;border-radius:50%;margin:0 auto;overflow:hidden;border:4px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.1);position:relative"><img id="preview-img" style="width:100%;height:100%;object-fit:cover;display:none"><div id="placeholder-icon" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8"><i data-lucide="user" style="width:60px;height:60px"></i></div></div><div onclick="document.getElementById(\'file-in\').click()" style="position:absolute;bottom:0;left:50%;transform:translateX(30px);width:40px;height:40px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;border:3px solid #fff;cursor:pointer"><i data-lucide="camera" style="width:20px"></i></div><input type="file" id="file-in" hidden accept="image/*" onchange="previewFile(this)"></div><div style="text-align:center;margin-bottom:30px"><h3 style="font-size:18px;font-weight:700">Unggah Foto</h3><p style="color:#10b981;font-size:13px">Pilih foto profil terbaik Anda</p></div><div style="padding:0 20px"><div class="form-group"><label class="form-label">Nama Lengkap</label><div style="position:relative"><input type="text" class="form-input" id="reg-nama" placeholder="Contoh: Budi Santoso" style="padding-right:40px"><i data-lucide="user" style="position:absolute;right:12px;top:12px;width:18px;color:#94a3b8"></i></div></div><div class="form-group"><label class="form-label">Nomor Karyawan</label><div style="position:relative"><input type="text" class="form-input" id="reg-nik" placeholder="Contoh: EMP-12345" style="padding-right:40px"><div style="position:absolute;right:12px;top:12px;display:flex;align-items:center;justify-content:center;background:#94a3b8;color:white;font-size:10px;padding:2px 4px;border-radius:4px;height:18px">123</div></div></div><div style="background:#ecfdf5;border:1px solid #a7f3d0;padding:16px;border-radius:12px;display:flex;gap:12px;margin:30px 0 40px"><i data-lucide="info" style="min-width:20px;color:#10b981"></i><p style="font-size:12px;color:#065f46;line-height:1.5">Pastikan data yang Anda masukkan sudah sesuai dengan kartu identitas resmi perusahaan untuk keperluan administrasi.</p></div><button class="btn btn-primary" id="save-btn" onclick="submitReg()" style="width:100%;height:50px;font-size:16px;background:#10b981;border:none;display:flex;align-items:center;justify-content:center;gap:10px">Simpan Data <i data-lucide="check-circle" style="width:20px"></i></button></div><div class="toast-container" id="toasts"></div><div id="loading-overlay" style="position:fixed;inset:0;background:rgba(255,255,255,0.9);z-index:99;display:none;flex-direction:column;align-items:center;justify-content:center"><div class="loader"></div><p id="load-text" style="margin-top:20px;font-weight:600;color:#1e293b">Memproses...</p></div></div>';
}

function getRegisterJS() {
    return `
    var uploadedImg=null;
    var isRegistering = false;
    
    document.addEventListener('DOMContentLoaded', function(){lucide.createIcons(); loadFaceApi();});
    function loadFaceApi(){
      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
        faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
        faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
      ]).then(function(){console.log('Face API Ready');});
    }
    function previewFile(input){
      if(input.files && input.files[0]){
        var reader=new FileReader();
        reader.onload=function(e){
          var img=document.getElementById('preview-img');
          img.src=e.target.result;
          img.style.display='block';
          document.getElementById('placeholder-icon').style.display='none';
          uploadedImg=new Image();
          uploadedImg.src=e.target.result;
          setTimeout(function(){lucide.createIcons();},100);
        };
        reader.readAsDataURL(input.files[0]);
      }
    }
    function submitReg(){
      if(isRegistering) return;
      isRegistering = true;
      
      var nama=document.getElementById('reg-nama').value;
      var nik=document.getElementById('reg-nik').value;
      if(!nama||!nik){showToast('Mohon lengkapi Nama dan NIK','warning','Validasi Gagal'); isRegistering = false; return;}
      if(!uploadedImg){showToast('Mohon upload foto wajah','warning','Validasi Gagal'); isRegistering = false; return;}
      
      var load=document.getElementById('loading-overlay');
      var txt=document.getElementById('load-text');
      load.style.display='flex';
      txt.textContent='Mendeteksi Wajah...';
      
      var cv=document.createElement('canvas');
      cv.width=uploadedImg.width;
      cv.height=uploadedImg.height;
      cv.getContext('2d').drawImage(uploadedImg,0,0);
      
      faceapi.detectSingleFace(cv,new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor().then(function(d){
        if(!d){
          load.style.display='none';
          showToast('Wajah tidak terdeteksi pada foto. Gunakan foto yang jelas.','error','Deteksi Gagal');
          isRegistering = false;
          return;
        }
        
        txt.textContent='Menyimpan Data...';
        var desc=Array.from(d.descriptor);
        
        var sm=document.createElement('canvas');
        sm.width=200;
        sm.height=200;
        sm.getContext('2d').drawImage(uploadedImg,0,0,200,200);
        var url=sm.toDataURL('image/jpeg',0.6);
        
        google.script.run.withSuccessHandler(function(r){
          load.style.display='none';
          if(r.success){
            showToast('Berhasil Daftar!','success','Registrasi Berhasil');
            setTimeout(function(){
              window.location.reload();
              isRegistering = false;
            },1500);
          }else{
            showToast('Gagal: '+r.message,'error','Registrasi Gagal');
            isRegistering = false;
          }
        }).handleSelfRegister({nama:nama,nik:nik,foto:url,desc:desc});
      }).catch(function(e){
        load.style.display='none';
        showToast('Error: '+e,'error','Error');
        isRegistering = false;
      });
    }
    `;
}

// ============================================
// SPREADSHEET FUNCTIONS
// ============================================

function getSpreadsheet(){
  if(SPREADSHEET_ID)return SpreadsheetApp.openById(SPREADSHEET_ID);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(n){
  var ss=getSpreadsheet();
  var s=ss.getSheetByName(n);
  if(!s)s=ss.insertSheet(n);
  return s;
}

function setupSpreadsheet(){
  var ss=getSpreadsheet();
  
  var s1=ss.getSheetByName(SHEET_KARYAWAN);
  if(!s1)s1=ss.insertSheet(SHEET_KARYAWAN);
  if(s1.getLastRow()===0)s1.appendRow(["ID","NIK","Nama","Divisi","Foto","Status","FaceDescriptor"]);
  
  var s2=ss.getSheetByName(SHEET_ABSENSI);
  if(!s2)s2=ss.insertSheet(SHEET_ABSENSI);
  if(s2.getLastRow()===0)s2.appendRow(["ID","KaryawanID","Nama","Divisi","Tanggal","JamMasuk","JamPulang","StatusMasuk","FotoMasuk","FotoPulang","LokasiMasuk","LokasiPulang","StatusPulang"]);
  
  var s3=ss.getSheetByName(SHEET_ISTIRAHAT);
  if(!s3)s3=ss.insertSheet(SHEET_ISTIRAHAT);
  if(s3.getLastRow()===0)s3.appendRow(["ID","KaryawanID","Nama","Divisi","Tanggal","Mulai","Selesai","Durasi","FotoMulai","FotoSelesai","LokasiMulai","LokasiSelesai","Status"]);
  
  var s4=ss.getSheetByName(SHEET_SETTINGS);
  if(!s4)s4=ss.insertSheet(SHEET_SETTINGS);
  if(s4.getLastRow()===0){
    s4.appendRow(["Key","Value"]);
    s4.appendRow(["jamMasuk","08:00"]);
    s4.appendRow(["jamPulang","17:00"]);
  }
  
  var s5=ss.getSheetByName(SHEET_ADMIN);
  if(!s5)s5=ss.insertSheet(SHEET_ADMIN);
  if(s5.getLastRow()===0){
    s5.appendRow(["AdminID","Password","Role","Nama"]);
    s5.appendRow(["ADMIN","admin123","Super Admin","Admin HR"]);
    s5.appendRow(["ADMINHR","hr123","HR Admin","HR Manager"]);
  }
  
  return "Setup berhasil! Sheet Istirahat telah ditambahkan.";
}

function validateAdmin(adminId, password) {
  var s = getSheet(SHEET_ADMIN);
  var data = s.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    var storedId=String(data[i][0]||"").trim();
    var storedPass=String(data[i][1]||"").trim();
    if(storedId===adminId&&storedPass===password){
      return{success:true,data:{id:storedId,name:String(data[i][3]||""),role:String(data[i][2]||"")}};
    }
  }
  return{success:false,message:"ID Admin atau password salah"};
}

function getActiveEmployeeIds() {
  var s = getSheet(SHEET_KARYAWAN);
  var data = s.getDataRange().getValues();
  var activeIds = {};
  for(var i=1; i<data.length; i++) {
    if(data[i][0]) {
      activeIds[String(data[i][0]).trim()] = true;
    }
  }
  return activeIds;
}

function getEmployeeList(){
  var s=getSheet(SHEET_KARYAWAN);
  var d=s.getDataRange().getValues();
  var arr=[];
  for(var i=1;i<d.length;i++){
    arr.push({
      id:String(d[i][0]),
      nik:String(d[i][1]),
      nama:String(d[i][2]),
      divisi:String(d[i][3]),
      foto:String(d[i][4]||""),
      status:String(d[i][5]||"Aktif"),
      hasFace:d[i][6]?true:false
    });
  }
  return{success:true,employees:arr};
}

function addEmployee(d){
  var s=getSheet(SHEET_KARYAWAN);
  var id="EMP"+Date.now();
  s.appendRow([id,d.nik,d.nama,d.divisi,"","Aktif",""]);
  return{success:true};
}

function deleteEmployee(id){
  var s=getSheet(SHEET_KARYAWAN);
  var rows=s.getDataRange().getValues();
  for(var i=1;i<rows.length;i++){
    if(rows[i][0]==id){
      s.deleteRow(i+1);
      break;
    }
  }
  
  var sa=getSheet(SHEET_ABSENSI);
  var absensiRows=sa.getDataRange().getValues();
  for(var j=absensiRows.length-1;j>=1;j--){
    if(absensiRows[j][1]==id){
      sa.deleteRow(j+1);
    }
  }
  
  var si=getSheet(SHEET_ISTIRAHAT);
  var istirahatRows=si.getDataRange().getValues();
  for(var k=istirahatRows.length-1;k>=1;k--){
    if(istirahatRows[k][1]==id){
      si.deleteRow(k+1);
    }
  }
  
  return{success:true};
}

function registerFace(d){
  var s=getSheet(SHEET_KARYAWAN);
  var rows=s.getDataRange().getValues();
  for(var i=1;i<rows.length;i++){
    if(rows[i][0]===d.id){
      s.getRange(i+1,5).setValue(d.url);
      s.getRange(i+1,7).setValue(JSON.stringify(d.desc));
      break;
    }
  }
  return{success:true};
}

function handleSelfRegister(d){
  var s=getSheet(SHEET_KARYAWAN);
  var rows=s.getDataRange().getValues();
  var found=false;
  var rowIdx=-1;
  var targetNik=String(d.nik).trim();
  for(var i=1;i<rows.length;i++){
    if(String(rows[i][1]).trim()===targetNik){
      found=true;
      rowIdx=i+1;
      break;
    }
  }
  if(found){
    s.getRange(rowIdx,3).setValue(d.nama);
    s.getRange(rowIdx,5).setValue(d.foto);
    s.getRange(rowIdx,7).setValue(JSON.stringify(d.desc));
  }else{
    var id="EMP"+Date.now();
    s.appendRow([id,d.nik,d.nama,"Karyawan Baru",d.foto,"Aktif",JSON.stringify(d.desc)]);
  }
  return{success:true};
}

function formatWaktuGoogle(v){
  if(!v)return"";
  if(v instanceof Date){
    var jam=v.getHours().toString().padStart(2,'0');
    var menit=v.getMinutes().toString().padStart(2,'0');
    return jam+":"+menit;
  }
  var str=String(v);
  var match=str.match(/(\d{1,2}):(\d{2})/);
  if(match)return match[1]+":"+match[2];
  return str.substring(0,5);
}

function getEmployeeByNIK(nik){
  try{
    var s=getSheet(SHEET_KARYAWAN);
    var lastRow=s.getLastRow();
    if(lastRow<2)return JSON.stringify({success:false,message:"No employees found"});
    var nikVals=s.getRange(2,2,lastRow-1,1).getValues();
    var targetNik=String(nik).trim();
    var rowIndex=-1;
    for(var i=0;i<nikVals.length;i++){
      if(String(nikVals[i][0]).trim()===targetNik){
        rowIndex=i+2;
        break;
      }
    }
    if(rowIndex===-1)return JSON.stringify({success:false,message:"Employee NIK not found"});
    var meta=s.getRange(rowIndex,1,1,4).getValues()[0];
    var descVal=s.getRange(rowIndex,7).getValue();
    var desc=null;
    try{
      if(descVal&&String(descVal).length>2){
        desc=JSON.parse(descVal);
      }
    }catch(e){desc=[];}
    var emp={
      id:String(meta[0]),
      nik:String(meta[1]),
      nama:String(meta[2]),
      divisi:String(meta[3]),
      desc:desc
    };
    var sa=getSheet(SHEET_ABSENSI);
    var today=Utilities.formatDate(new Date(),"Asia/Jakarta","yyyy-MM-dd");
    var status="belum_masuk";
    var jamM="";
    
    // Cek Absensi
    if(sa.getLastRow()>1){
      var rows=sa.getDataRange().getValues();
      for(var j=rows.length-1;j>=1;j--){
        var rId=String(rows[j][1]).trim();
        var rDate=rows[j][4];
        var dateStr="";
        if(rDate instanceof Date){
          var noony=new Date(rDate);
          noony.setHours(12);
          dateStr=Utilities.formatDate(noony,"Asia/Jakarta","yyyy-MM-dd");
        }else{
          dateStr=rDate?String(rDate).substring(0,10):"";
        }
        if(rId===emp.id&&dateStr===today){
          jamM=formatWaktuGoogle(rows[j][5]);
          var jamP=rows[j][6];
          if(!jamP||String(jamP)===""){
            status="sudah_masuk";
          }else{
            status="selesai";
          }
          break;
        }
      }
    }
    
    // Auto-hit Cek Istirahat (Menyatukan Payload)
    var stIstirahat = "belum_istirahat";
    try {
      var si = getSheet(SHEET_ISTIRAHAT);
      if(si.getLastRow()>1){
        var riRows = si.getDataRange().getValues();
        for(var i=riRows.length-1;i>=1;i--){
          var riId=String(riRows[i][1]).trim();
          var riDate=riRows[i][4];
          var riDateStr="";
          if(riDate instanceof Date){
            var rinoony=new Date(riDate);
            rinoony.setHours(12);
            riDateStr=Utilities.formatDate(rinoony,"Asia/Jakarta","yyyy-MM-dd");
          }else{
            riDateStr=riDate?String(riDate).substring(0,10):"";
          }
          if(riId===emp.id&&riDateStr===today){
            var selesaiRi = riRows[i][6];
            var statusRowRi = riRows[i][12];
            if(!selesaiRi||String(selesaiRi)===""){
              stIstirahat="sedang_istirahat";
            }else if(statusRowRi==="selesai"){
              stIstirahat="selesai_istirahat";
            }
            break;
          }
        }
      }
    } catch(errIst) {
      // Abaikan jika sheet istirahat gagal dibaca
    }
    
    emp.jamMasuk=jamM;
    return JSON.stringify({success:true, data:emp, status:status, istirahatStatus:stIstirahat});
  }catch(e){
    return JSON.stringify({success:false,message:"SERVER ERROR: "+e.toString()});
  }
}

function getIstirahatStatus(karyawanId){
  try{
    var s=getSheet(SHEET_ISTIRAHAT);
    var today=Utilities.formatDate(new Date(),"Asia/Jakarta","yyyy-MM-dd");
    var status="belum_istirahat";
    var absensiStatus="belum_masuk";
    var sa=getSheet(SHEET_ABSENSI);
    if(sa.getLastRow()>1){
      var rows=sa.getDataRange().getValues();
      for(var j=rows.length-1;j>=1;j--){
        var rId=String(rows[j][1]).trim();
        var rDate=rows[j][4];
        var dateStr="";
        if(rDate instanceof Date){
          var noony=new Date(rDate);
          noony.setHours(12);
          dateStr=Utilities.formatDate(noony,"Asia/Jakarta","yyyy-MM-dd");
        }else{
          dateStr=rDate?String(rDate).substring(0,10):"";
        }
        if(rId===karyawanId&&dateStr===today){
          var jamP=rows[j][6];
          if(!jamP||String(jamP)===""){
            absensiStatus="sudah_masuk";
          }else{
            absensiStatus="selesai";
          }
          break;
        }
      }
    }
    if(s.getLastRow()>1){
      var rows=s.getDataRange().getValues();
      for(var i=rows.length-1;i>=1;i--){
        var rId=String(rows[i][1]).trim();
        var rDate=rows[i][4];
        var dateStr="";
        if(rDate instanceof Date){
          var noony=new Date(rDate);
          noony.setHours(12);
          dateStr=Utilities.formatDate(noony,"Asia/Jakarta","yyyy-MM-dd");
        }else{
          dateStr=rDate?String(rDate).substring(0,10):"";
        }
        if(rId===karyawanId&&dateStr===today){
          var selesai=rows[i][6];
          var statusRow=rows[i][12];
          if(!selesai||String(selesai)===""){
            status="sedang_istirahat";
          }else if(statusRow==="selesai"){
            status="selesai_istirahat";
          }
          break;
        }
      }
    }
    return{status:status,absensiStatus:absensiStatus};
  }catch(e){
    return{status:"belum_istirahat",absensiStatus:"belum_masuk"};
  }
}

function hitungDurasiIstirahat(jamMulai,jamSelesai){
  try{
    if(!jamMulai||!jamSelesai)return 0;
    var mulaiStr=String(jamMulai);
    var selesaiStr=String(jamSelesai);
    var mulaiMatch=mulaiStr.match(/(\d{1,2}):(\d{2})/);
    var selesaiMatch=selesaiStr.match(/(\d{1,2}):(\d{2})/);
    if(!mulaiMatch||!selesaiMatch)return 0;
    var mulaiJam=parseInt(mulaiMatch[1]);
    var mulaiMenit=parseInt(mulaiMatch[2]);
    var selesaiJam=parseInt(selesaiMatch[1]);
    var selesaiMenit=parseInt(selesaiMatch[2]);
    var totalMulai=mulaiJam*60+mulaiMenit;
    var totalSelesai=selesaiJam*60+selesaiMenit;
    if(totalSelesai<totalMulai){
      totalSelesai+=24*60;
    }
    return totalSelesai-totalMulai;
  }catch(e){
    return 0;
  }
}

function submitIstirahat(d){
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return {success:false, message:"Sistem sedang sibuk. Silakan coba lagi."};
  }
  try {
    var s=getSheet(SHEET_ISTIRAHAT);
    var now=new Date();
    var today=Utilities.formatDate(now,"Asia/Jakarta","yyyy-MM-dd");
    var timeFormatted=formatWaktuGoogle(now);
    var locStr=d.alamat?d.alamat:"Lokasi tidak diketahui";
    if(d.type==='istirahat_mulai'){
      var rows=s.getDataRange().getValues();
      var eId=String(d.id).trim();
      for(var j=rows.length-1;j>=1;j--){
        if(String(rows[j][1]).trim()===eId && rows[j][4]===today && rows[j][12]==="sedang_istirahat"){
          return {success:false, message:"Anda sedang istirahat. Harap selesaikan istirahat dulu."};
        }
      }
      var emp=getEmployeeById(d.id);
      s.appendRow(["IST"+Date.now(),d.id,emp.nama,emp.divisi,today,timeFormatted,"","",d.foto,"",locStr,"","sedang_istirahat"]);
      SpreadsheetApp.flush();
      return{success:true};
    }else if(d.type==='istirahat_selesai'){
      var rows=s.getDataRange().getValues();
      var eId=String(d.id).trim();
      for(var j=rows.length-1;j>=1;j--){
        var rId=String(rows[j][1]).trim();
        var jamSelesai=rows[j][6];
        var status=rows[j][12];
        if(rId===eId&&(!jamSelesai||String(jamSelesai)==="")&&status==="sedang_istirahat"){
          var jamMulai=rows[j][5];
          var durasiMenit=hitungDurasiIstirahat(jamMulai,timeFormatted);
          s.getRange(j+1,6).setValue(formatWaktuGoogle(rows[j][5]));
          s.getRange(j+1,7).setValue(timeFormatted);
          s.getRange(j+1,8).setValue(durasiMenit);
          s.getRange(j+1,10).setValue(d.foto);
          s.getRange(j+1,12).setValue(locStr);
          s.getRange(j+1,13).setValue("selesai");
          SpreadsheetApp.flush();
          return{success:true};
        }
      }
    }
    return{success:false,message:"Data istirahat tidak ditemukan atau sudah selesai"};
  } catch(err) {
    return {success:false, message:err.toString()};
  } finally {
    lock.releaseLock();
  }
}

function submitAttendance(d){
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return {success:false, message:"Sistem sedang sibuk. Silakan coba lagi."};
  }
  try {
    var s=getSheet(SHEET_ABSENSI);
    var now=new Date();
    var today=Utilities.formatDate(now,"Asia/Jakarta","yyyy-MM-dd");
    var timeFormatted=formatWaktuGoogle(now);
    var locStr=d.alamat?d.alamat:"Lokasi tidak diketahui";
    if(d.type==='masuk'){
      var rows=s.getDataRange().getValues();
      var eId=String(d.id).trim();
      for(var j=rows.length-1;j>=1;j--){
        if(String(rows[j][1]).trim()===eId && rows[j][4]===today){
          return {success:false, message:"Anda sudah absen masuk hari ini."};
        }
      }
      var set=getSheet(SHEET_SETTINGS).getDataRange().getValues();
      var jm="08:00";
      var foundJM=false;
      for(var i=1;i<set.length;i++){
        if(!foundJM&&String(set[i][0]).trim().toLowerCase()==='jammasuk'&&set[i][1]){
          jm=formatWaktuGoogle(set[i][1]);
          foundJM=true;
        }
      }
      var nowMin=now.getHours()*60+now.getMinutes();
      var limitParts=jm.split(":");
      var limitMin=parseInt(limitParts[0])*60+parseInt(limitParts[1]);
      var st=nowMin>limitMin?"Terlambat":"Tepat Waktu";
      var emp=getEmployeeById(d.id);
      s.appendRow(["ATT"+Date.now(),d.id,emp.nama,emp.divisi,today,timeFormatted,"",st,d.foto,"",locStr,"",""]);
      SpreadsheetApp.flush();
      return{success:true};
    }else if(d.type==='pulang'){
      var rows=s.getDataRange().getValues();
      var eId=String(d.id).trim();
      for(var j=rows.length-1;j>=1;j--){
        var rId=String(rows[j][1]).trim();
        var jamP=rows[j][6];
        if(rId===eId&&(!jamP||String(jamP)==="")){
          var jamM=rows[j][5];
          var stP="";
          if(jamM){
            var diff=hitungDurasiIstirahat(jamM,timeFormatted);
            var dh=Math.floor(diff/60);
            var dm=diff%60;
            stP="Bekerja "+(dh>0?dh+"j ":"")+dm+"m";
          }
          s.getRange(j+1,7).setValue(timeFormatted);
          s.getRange(j+1,10).setValue(d.foto);
          s.getRange(j+1,12).setValue(locStr);
          s.getRange(j+1,13).setValue(stP);
          SpreadsheetApp.flush();
          return{success:true};
        }
      }
      return{success:false,message:"Data absensi tidak ditemukan (mungkin sudah pulang atau belum masuk)"};
    }
    return{success:false,message:"Tipe absensi tidak valid"};
  } catch(err) {
    return {success:false, message:err.toString()};
  } finally {
    lock.releaseLock();
  }
}

function getEmployeeById(id){
  var s=getSheet(SHEET_KARYAWAN);
  var d=s.getDataRange().getValues();
  for(var i=1;i<d.length;i++){
    if(d[i][0]==id)return{nama:d[i][2],divisi:d[i][3]};
  }
  return{nama:"",divisi:""};
}

function getIstirahatLog(cachedActiveIds){
  try{
    var activeIds = cachedActiveIds || getActiveEmployeeIds();
    var s=getSheet(SHEET_ISTIRAHAT);
    var d=s.getDataRange().getValues();
    var arr=[];
    for(var i=1;i<d.length;i++){
      if(!d[i][0])continue;
      var karyawanId = String(d[i][1]||"").trim();
      if(!activeIds[karyawanId]) continue;
      
      var rDate=d[i][4];
      var dateStr="";
      try{
        if(rDate instanceof Date){
          var noony=new Date(rDate);
          noony.setHours(12);
          dateStr=Utilities.formatDate(noony,"Asia/Jakarta","yyyy-MM-dd");
        }else{
          dateStr=String(rDate).trim();
        }
      }catch(e){dateStr=String(rDate);}
      var mulaiStr=d[i][5]?formatWaktuGoogle(d[i][5]):"";
      var selesaiStr=d[i][6]?formatWaktuGoogle(d[i][6]):"";
      var durasiStr=d[i][7]?String(d[i][7]):"0";
      var statusStr=d[i][12]?String(d[i][12]):"sedang_istirahat";
      var fotoMulaiStr=d[i][8]?String(d[i][8]):"";
      var fotoSelesaiStr=d[i][9]?String(d[i][9]):"";
      var lokasiMulaiStr=d[i][10]?String(d[i][10]):"";
      var lokasiSelesaiStr=d[i][11]?String(d[i][11]):"";
      arr.push({
        id:String(d[i][0]||""),
        nama:String(d[i][2]||""),
        divisi:String(d[i][3]||""),
        tanggal:dateStr,
        mulai:mulaiStr,
        selesai:selesaiStr,
        durasi:durasiStr,
        status:statusStr,
        fotoMulai:fotoMulaiStr,
        fotoSelesai:fotoSelesaiStr,
        lokasiMulai:lokasiMulaiStr,
        lokasiSelesai:lokasiSelesaiStr
      });
    }
    return{success:true,istirahat:arr};
  }catch(e){
    return{success:false,message:e.toString()};
  }
}

function getAttendanceLog(cachedActiveIds){
  try{
    var activeIds = cachedActiveIds || getActiveEmployeeIds();
    var s=getSheet(SHEET_ABSENSI);
    var d=s.getDataRange().getValues();
    var arr=[];
    var set=getSheet(SHEET_SETTINGS).getDataRange().getValues();
    var jp="17:00";
    var foundJP=false;
    for(var x=1;x<set.length;x++){
      if(!foundJP&&String(set[x][0]).trim().toLowerCase()==='jampulang'){
        jp=formatWaktuGoogle(set[x][1]);
        foundJP=true;
      }
    }
    var parts=jp.split(":");
    var limit=parseInt(parts[0])*60+parseInt(parts[1]);
    for(var i=1;i<d.length;i++){
      if(!d[i][0])continue;
      var karyawanId = String(d[i][1]||"").trim();
      if(!activeIds[karyawanId]) continue;
      
      var rDate=d[i][4];
      var dateStr="";
      try{
        if(rDate instanceof Date){
          var noony=new Date(rDate);
          noony.setHours(12);
          dateStr=Utilities.formatDate(noony,"Asia/Jakarta","yyyy-MM-dd");
        }else{
          dateStr=String(rDate).trim();
        }
      }catch(e){dateStr=String(rDate);}
      var jMStr=d[i][5]?formatWaktuGoogle(d[i][5]):"";
      var jPStr=d[i][6]?formatWaktuGoogle(d[i][6]):"";
      var sPStr=d[i][12]?String(d[i][12]):"";
      var fotoMasukStr=d[i][8]?String(d[i][8]):"";
      var lokasiMasukStr=d[i][10]?String(d[i][10]):"";
      var lokasiPulangStr=d[i][11]?String(d[i][11]):"";
      if((!sPStr||sPStr==="")&&jPStr&&jPStr!==""&&jPStr.includes(":")){
        var pParts=jPStr.split(":");
        var pMin=parseInt(pParts[0])*60+parseInt(pParts[1]);
        if(pMin<limit)sPStr="Pulang Cepat";
        else{
          var diff=pMin-limit;
          var dh=Math.floor(diff/60);
          var dm=diff%60;
          sPStr="Lembur "+(dh>0?dh+"j ":"")+dm+"m";
        }
      }
      arr.push({
        id:String(d[i][0]||""),
        nama:String(d[i][2]||""),
        divisi:String(d[i][3]||""),
        tanggal:dateStr,
        jamMasuk:jMStr,
        jamPulang:jPStr,
        statusMasuk:d[i][7]?String(d[i][7]):"",
        fotoMasuk:fotoMasukStr,
        fotoPulang:d[i][9]?String(d[i][9]):"",
        lokasiMasuk:lokasiMasukStr,
        lokasiPulang:lokasiPulangStr,
        statusPulang:sPStr
      });
    }
    return{success:true,attendance:arr};
  }catch(e){
    return{success:false,message:e.toString()};
  }
}

function getAllAdminData() {
  try {
    var activeIds = getActiveEmployeeIds();
    
    var statsResult = getStats(activeIds);
    var settingsResult = getSettings();
    var attendanceResult = getAttendanceLog(activeIds);
    var istirahatResult = getIstirahatLog(activeIds);
    var employeesResult = getEmployeeList();

    return {
      success: true,
      stats: statsResult.success ? statsResult.stats : null,
      settings: settingsResult.success ? settingsResult.data : null,
      attendance: attendanceResult.success ? attendanceResult.attendance : [],
      istirahat: istirahatResult.success ? istirahatResult.istirahat : [],
      employees: employeesResult.success ? employeesResult.employees : []
    };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

function getStats(cachedActiveIds){
  var today=Utilities.formatDate(new Date(),"Asia/Jakarta","yyyy-MM-dd");
  var activeIds = cachedActiveIds || getActiveEmployeeIds();
  
  var s=getSheet(SHEET_ABSENSI).getDataRange().getValues();
  var h=0,p=0,t=0;
  var topMap={}, photoMap={};
  var monthly={labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],hadir:new Array(12).fill(0),alfa:new Array(12).fill(0)};
  var dailyCounts={};
  
  var sk=getSheet(SHEET_KARYAWAN).getDataRange().getValues();
  var allEmp=Math.max(0, sk.length-1);
  for(var m=1;m<sk.length;m++){
    var mName=String(sk[m][2]||"").trim();
    var mFoto=String(sk[m][4]||"");
    if(mName)photoMap[mName]=mFoto;
  }

  for(var i=1;i<s.length;i++){
    var karyawanId = String(s[i][1]||"").trim();
    if(!activeIds[karyawanId]) continue;
    
    var rDate=s[i][4];
    var dStr="";
    try {
      if(rDate instanceof Date){
        var noony=new Date(rDate);
        noony.setHours(12);
        dStr=Utilities.formatDate(noony,"Asia/Jakarta","yyyy-MM-dd");
      }else{
        dStr=String(rDate).trim();
      }
    } catch(e) {}
    
    // Aggregation for today
    if(dStr==today){
      h++;
      if(s[i][6])p++;
      if(s[i][7]==="Terlambat")t++;
    }
    
    // Top Rajin Aggregation
    var nm=String(s[i][2]||"").trim();
    var div=s[i][3];
    if(nm){
      if(!topMap[nm]) topMap[nm]={nama:nm,divisi:div,hadir:0,foto:photoMap[nm]||""};
      topMap[nm].hadir++;
    }
    
    // Monthly / Daily Counts
    if(dStr){
      if(!dailyCounts[dStr]) dailyCounts[dStr]=0;
      dailyCounts[dStr]++;
    }
  }
  
  var si=getSheet(SHEET_ISTIRAHAT).getDataRange().getValues();
  var sedangIstirahat=0,selesaiIstirahat=0;
  for(var i=1;i<si.length;i++){
    var karyawanId = String(si[i][1]||"").trim();
    if(!activeIds[karyawanId]) continue;
    
    var rDate=si[i][4];
    if(rDate instanceof Date){
      var noony=new Date(rDate);
      noony.setHours(12);
      rDate=Utilities.formatDate(noony,"Asia/Jakarta","yyyy-MM-dd");
    }else{
      rDate=String(rDate).trim();
    }
    if(rDate==today){
      var status=si[i][12]?String(si[i][12]):"";
      if(status==="sedang_istirahat")sedangIstirahat++;
      else if(status==="selesai")selesaiIstirahat++;
    }
  }
  
  var sorted=[];
  if(Object.keys(topMap).length>0){
    sorted=Object.values(topMap).sort(function(a,b){return b.hadir-a.hadir;}).slice(0,5);
  }
  
  for(var dateKey in dailyCounts){
    if(!dateKey||dateKey.length<10)continue;
    var dt=new Date(dateKey);
    var mIdx=dt.getMonth();
    var countHadir=dailyCounts[dateKey];
    var countAlfa=Math.max(0,allEmp-countHadir);
    if(dt.getFullYear()===new Date().getFullYear()){
      monthly.hadir[mIdx]+=countHadir;
      monthly.alfa[mIdx]+=countAlfa;
    }
  }
  
  return{
    success:true,
    stats:{
      totalHadir:h,
      totalPulang:p,
      totalTerlambat:t,
      belumAbsen:allEmp-h,
      sedangIstirahat:sedangIstirahat,
      selesaiIstirahat:selesaiIstirahat,
      topRajin:sorted,
      monthly:monthly
    }
  };
}

function getSettings(){
  var s=getSheet(SHEET_SETTINGS).getDataRange().getValues();
  var res={jamMasuk:"08:00",jamPulang:"17:00"};
  var foundM=false,foundP=false;
  for(var i=1;i<s.length;i++){
    var k=String(s[i][0]).trim().toLowerCase();
    if(!foundM&&k==='jammasuk'){res.jamMasuk=formatWaktuGoogle(s[i][1]);foundM=true;}
    if(!foundP&&k==='jampulang'){res.jamPulang=formatWaktuGoogle(s[i][1]);foundP=true;}
  }
  return{success:true,data:res};
}

function updateSettings(d){
  var s=getSheet(SHEET_SETTINGS);
  var data=s.getDataRange().getValues();
  var setVal=function(key,val){
    var foundIdx=-1;
    for(var i=1;i<data.length;i++){
      if(String(data[i][0]).trim().toLowerCase()===key.toLowerCase()){
        foundIdx=i;
        break;
      }
    }
    if(foundIdx!==-1){
      var cell=s.getRange(foundIdx+1,2);
      cell.setNumberFormat("@");
      cell.setValue(String(val));
    }else{
      s.appendRow([key,"'"+val]);
    }
  };
  if(d.jamMasuk)setVal('jamMasuk',d.jamMasuk);
  if(d.jamPulang)setVal('jamPulang',d.jamPulang);
  SpreadsheetApp.flush();
  return{success:true};
}

function runBackfillAndFix(){
  var s=getSheet(SHEET_ABSENSI);
  var data=s.getDataRange().getValues();
  var set=getSheet(SHEET_SETTINGS).getDataRange().getValues();
  var jp="17:00";var foundJP=false;
  for(var x=1;x<set.length;x++){
    if(!foundJP&&String(set[x][0]).trim().toLowerCase()==='jampulang'){
      jp=formatWaktuGoogle(set[x][1]);foundJP=true;
    }
  }
  var parts=jp.split(":");
  var limit=parseInt(parts[0])*60+parseInt(parts[1]);
  for(var i=1;i<data.length;i++){
    var jamP=data[i][6];
    var statP=data[i][12];
    if(jamP&&String(jamP).trim()!==""&&(!statP||statP==="")){
      var pTime=formatWaktuGoogle(jamP);
      if(!pTime.includes(":"))continue;
      var pParts=pTime.split(":");
      var pMin=parseInt(pParts[0])*60+parseInt(pParts[1]);
      var st="";
      if(pMin<limit)st="Pulang Cepat";
      else{
        var diff=pMin-limit;
        var dh=Math.floor(diff/60);
        var dm=diff%60;
        st="Lembur "+(dh>0?dh+"j ":"")+dm+"m";
      }
      s.getRange(i+1,13).setValue(st);
    }
  }
  return"Backfill Complete";
}