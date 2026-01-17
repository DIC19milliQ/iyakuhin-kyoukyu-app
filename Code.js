function doGet(e) {
  const mode = e?.parameter?.mode;
  const yjCode = e?.parameter?.yj;

  // ① 管理ログ取得API：?mode=latestLog
  if (mode === "latestLog") {
    return ContentService
      .createTextOutput(JSON.stringify(getLatestManageLog()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ② プログラム向けAPI：?mode=api&yj=YJコード
  if (mode === "api" && yjCode) {
    return ContentService
      .createTextOutput(JSON.stringify(getSupplyDataByYJCode(yjCode)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ③ 通常のWebアプリ表示（検索UI＋管理タブ）：?yj=コード 付き or パラメータなし
  const template = HtmlService.createTemplateFromFile('Index');
  template.initialYJCode = yjCode || '';  // ここでHTMLに渡す
  return template.evaluate()
    .setTitle('医薬品供給状況検索')
}

function getLatestManageLog() {
  const ss = SpreadsheetApp.openById("1Px9QpsfO_PNDH4NSD8DKu9LXfi1GVD68O4Zg0EuF_oI");
  const sheet = ss.getSheetByName("管理");
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return { error: "ログが存在しません" };

  // 最新の「処理開始」行を探す
  const startIndex = values.findIndex((row, idx) =>
    idx > 0 && row[1] === "Master" && String(row[2]).includes("処理開始")
  );

  if (startIndex === -1) return { error: "最新のログセットが見つかりません" };

  const logs = [];
  for (let i = startIndex; i < values.length; i++) {
    const row = values[i];
    if (i !== startIndex && row[1] === "Master" && String(row[2]).includes("処理開始")) break;
    const date = new Date(row[0]);
    logs.push({
      timestamp: Utilities.formatDate(date, "Asia/Tokyo", "yyyy/MM/dd HH:mm"),
      step: row[1],
      message: row[2]
    });
  }

  return { logs };
}

function getSupplyDataByYJCode(yjCode) {
  const ss = SpreadsheetApp.openById("1Px9QpsfO_PNDH4NSD8DKu9LXfi1GVD68O4Zg0EuF_oI");
  const sheet = ss.getSheetByName("公表");
  const values = sheet.getDataRange().getValues();

  const headers = values[0];
  const data = values.slice(1);

  const match = data.find(row => String(row[4]) === yjCode);  // ⑤YJコード列を参照

  if (!match) {
    return { error: "該当するYJコードが見つかりません。" };
  }

  return {
    data: {
      i: match[2],  // 成分名
      y: match[4],  // YJコード
      p: match[5],  // 品名
      s: match[11], // 出荷状況
      u1: match[12], // 変更日
      r: match[13], // 理由
      f: match[14], // 解除見込み
      z: match[15], // 時期
      q: match[16], // 出荷量
      u2: match[19] // 更新日
    }
  };
}