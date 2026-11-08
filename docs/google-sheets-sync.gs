/**
 * GEMATI Pagerwojo → Google Spreadsheet (SINKRON SATU ARAH, spreadsheet hanya menerima).
 *
 * Pasang: buka spreadsheet → Ekstensi → Apps Script → tempel seluruh file ini → Simpan.
 * Lalu ikuti docs/google-sheets-sync.md (isi Script Properties, jalankan pasangOtomatis).
 *
 * - Data diambil dari GET {GEMATI_URL}/api/sync/sheets (token di Script Properties).
 * - Hanya menulis tab berawalan "GEMATI - ". Tab lain di spreadsheet TIDAK disentuh.
 * - Tiap sync menimpa isi tab GEMATI (edit manual di tab itu akan hilang) → tab dikunci "peringatan".
 */
var PREFIX = "GEMATI - ";

function syncGemati() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return; // sync sebelumnya masih jalan
  try {
    var props = PropertiesService.getScriptProperties();
    var base = (props.getProperty("GEMATI_URL") || "").replace(/\/+$/, "");
    var token = props.getProperty("GEMATI_TOKEN") || "";
    if (!base || !token) throw new Error("Isi Script Properties GEMATI_URL dan GEMATI_TOKEN dulu.");

    var res = UrlFetchApp.fetch(base + "/api/sync/sheets", {
      method: "get",
      headers: { Authorization: "Bearer " + token },
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();
    if (code !== 200) throw new Error("Sync gagal HTTP " + code + ": " + res.getContentText().slice(0, 300));
    var data = JSON.parse(res.getContentText()).data;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    data.tabs.forEach(function (tab) {
      writeTab(ss, PREFIX + tab.name, tab);
    });

    var info = ss.getSheetByName(PREFIX + "Info") || ss.insertSheet(PREFIX + "Info");
    info.clearContents();
    info.getRange(1, 1, 4, 2).setValues([
      ["Sinkron terakhir", Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss") + " WIB"],
      ["Sumber", base],
      ["NIK & No. HP", data.pii === "full" ? "Ditampilkan penuh" : "Disamarkan"],
      ["Catatan", "Satu arah dari website. Jangan edit tab GEMATI — akan tertimpa saat sync berikutnya."],
    ]);
  } finally {
    lock.releaseLock();
  }
}

function writeTab(ss, name, tab) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var nCols = tab.headers.length;
  var values = [tab.headers].concat(tab.rows);

  sh.clearContents();
  // kolom teks (NIK, No. HP, RT/RW, tanggal) → format teks agar nol depan / digit tidak berubah
  tab.text.forEach(function (c) {
    sh.getRange(1, c + 1, Math.max(values.length, 1), 1).setNumberFormat("@");
  });
  sh.getRange(1, 1, values.length, nCols).setValues(
    values.map(function (r) {
      return r.map(function (v) { return v === null || v === undefined ? "" : v; });
    })
  );

  // buang baris/kolom sisa dari sync sebelumnya yang lebih banyak
  var extraRows = sh.getMaxRows() - values.length;
  if (extraRows > 1) sh.deleteRows(values.length + 2, extraRows - 1);

  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, nCols).setFontWeight("bold").setBackground("#e8f5e9");

  // kunci tab: siapa pun yang mengedit akan mendapat peringatan
  var prot = sh.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  if (!prot.length) sh.protect().setDescription("Data dari website GEMATI (sinkron satu arah)").setWarningOnly(true);
}

/** Jalankan SEKALI: pasang sync otomatis tiap 5 menit. */
function pasangOtomatis() {
  hapusOtomatis();
  ScriptApp.newTrigger("syncGemati").timeBased().everyMinutes(5).create();
  syncGemati();
}

/** Matikan sync otomatis. */
function hapusOtomatis() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "syncGemati") ScriptApp.deleteTrigger(t);
  });
}

/** Menu "GEMATI" di spreadsheet untuk sync manual. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("GEMATI")
    .addItem("Sync sekarang", "syncGemati")
    .addToUi();
}
