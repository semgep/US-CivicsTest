let DBname = "CivicsTest.db";
let parmDb = {};
let isDirty = false; // Флаг, который показывает, есть ли несохраненные изменения

async function cleanDB() {
  db.run("DELETE   FROM words;");
  console.log("База успешно очищена.");
}
async function readDB(category, topic) {
  if (category == undefined)
    return db.exec("SELECT DISTINCT class FROM words ORDER BY class;");
  else if (topic == undefined)
    return db.exec(
      "SELECT DISTINCT topic FROM words WHERE class = ? ORDER BY ROWID ASC;",
      [category]
    );
  else if (DBname === "CivicsTest.db")
    return db.exec(
      "SELECT ROWID, * FROM words WHERE class = ? AND topic=? ORDER BY CAST(textEn AS INTEGER) ASC;",
      [category, topic]
    );
  else
    return db.exec(
      "SELECT ROWID, * FROM words WHERE class = ? AND topic=? ORDER BY ROWID ASC;",
      [category, topic]
    );
}
async function readDBbyID(rowId) {
  // const readAllById = "SELECT * FROM words WHERE ROWID = ?;";
  return db.exec("SELECT * FROM words WHERE ROWID = ?;", [rowId]);
}
async function loadDB() {
  // DBname = location.hash.replace(/^#db=/, "");
  if (!DBname) print("Какая БД ???");
  else {
    const SQL = await initSqlJs({
      locateFile: (DBname) =>
        `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${DBname}`,
    });
    // const URL = `http://localhost:3001/db/${DBname}`;
    // const URL = `./db/${DBname}`;  //  для GitHub
    const URL = `${DBname}`; //  для GitHub
    const response = await fetch(URL, { cache: "no-store" });
    if (!response.ok) {
      console.error(
        `🔴 Ошибка сервера: ${response.status} ${response.statusText}`
      );
      return;
    }
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));
    print(`База "${DBname}" успешно загружена.`, "All Right!!!");
  }
}
async function saveDB() {
  // ✅ Укажи свой путь к папке здесь
  if (DBname === "CivicsTest.db") folderPath = "D:/Sam/Site/MyUSAcitizen";
  else folderPath = "D:/Sam/Site/USAcitizen";

  try {
    const binary = db.export();

    const response = await fetch("http://localhost:3001/save-db", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Filename": DBname,
        "X-Folder-Path": folderPath, // ✅ Теперь мы отправляем и путь к папке
      },
      body: binary,
    });

    if (response.ok) {
      console.log(`База "${DBname}" успешно сохранена.`);
    } else {
      console.error(`Ошибка сохранения на сервере: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Ошибка при сохранении БД "${DBname}"`, error);
  }
}
async function writeDB(parmDb) {
  const queryInsert = "INSERT INTO words";
  const keys = Object.keys(parmDb);
  const placeHolders = "?,".repeat(keys.length).slice(0, -1);
  const queryDb = `${queryInsert} (${keys.toString()}) VALUES (${placeHolders})`;
  try {
    await db.run(queryDb, Object.values(parmDb)); // Insert DB
    const lastID = db.exec("SELECT last_insert_rowid();")[0].values[0][0]; // select DB
    console.log(
      `${lastID}: ${parmDb["class"]} → ${parmDb["topic"]} → ${parmDb[
        "textEn"
      ].substr(0, 32)}`
    );
    return true;
  } catch (e) {
    // ✅ Обработка ошибки
    if (e.message.includes("UNIQUE constraint failed")) {
      console.warn(
        "Запись уже существует, пропускаю:",
        `${parmDb["textEn"].substr(0, 32)}`
      );
      // Здесь вы можете добавить код для обработки уже существующей записи
    } else {
      // Если это другая ошибка, её нужно обработать
      console.error("Ошибка при вставке записи:", e);
      // Вы можете решить, стоит ли останавливать цикл при другой ошибке
    }
    return false;
  }
  // isDirty = true; // Устанавливаем флаг, что БД была изменена
}
async function updateDB(rowId, parmDb) {
  const queryUpdate = "UPDATE words SET ";
  const keys = [];
  const values = [];
  for (let key in parmDb) {
    keys.push(`${key} = ?`);
    values.push(parmDb[key]);
  }
  values.push(rowId);
  const queryDb = `${queryUpdate} ${keys.toString()} WHERE ROWID =?`;
  try {
    await db.run(queryDb, values); // Insert DB
    console.log(`Запись ${rowId} изменена`);
    return true;
  } catch (e) {
    console.error("Ошибка при изменении записи:", e);
    return false;
  }
  // isDirty = true; // Устанавливаем флаг, что БД была изменена
}
function createInd() {
  // db.run("DROP INDEX IF EXISTS idx_class_topic;");
  // db.run("CREATE INDEX idx_class ON words(class);");
  // db.run("CREATE  INDEX idx_topic ON words(topic);");
  // db.run(
  //   "CREATE UNIQUE INDEX IF NOT EXISTS idx_class_topic_en ON words(class, topic, textEn);"
  // );
  let res = db.exec("PRAGMA index_list(words);");
  if (res.length === 0) {
    console.log("⛔️ Нет индексов или таблица не найдена.");
  } else {
    console.log(res[0].values);
  }
}

function print(...text) {
  function getCaller() {
    const errLine = new Error().stack.split("\n")[3].trim();
    const regex = /([^\/]+:\d+)/;
    const match = errLine.match(regex);
    if (match) return `(${match[1].split(":", 2).join(":")})`;
    else return callerLine;
  }
  const timesmp = new Date().toLocaleTimeString("en-US", { hour12: false });
  console.log(`%c${timesmp} ${getCaller()}`, "color: blue;", ...text);
}
