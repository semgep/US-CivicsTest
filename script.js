// #region Variables declare
let data = [],
  el = {},
  db,
  enVOICE = null,
  ruVOICE = null,
  selectedText = "",
  currentText = "",
  currentIndex = 0,
  currentSelected = null,
  currentCategory = null,
  currentSubCategory = null,
  playAllCurrentIndex = 0,
  playAllTimeoutId = null, // ID для setTimeout, чтобы можно было отменить
  currentSpeakingState,
  isPlayingAll = false; // Флаг, указывающий, активен ли режим "Озвучить все"
const INTERVAL_BETWEEN_PHRASES_MS = 2000, // 2 секунд
  nosort = ["Уроки"],
  notrans = [],
  // classComm = {
  //   Common: " About everything in a little bit",
  //   Календарь: "All sorts of words about the seasons",
  //   Уроки: "English lessons for expats",
  // },
  // GetCommRu = true,
  // DBname = "EnRu.db",
  currentRate = 0.8;
// #endregion

function speakText(text, rate, callback = null, pauseDuration = 0) {
  // speakTextPuter(text, rate, callback, pauseDuration);
  // return;
  if (!text) {
    if (callback) {
      // Если текст пустой, но есть колбэк, вызовем его, чтобы не прервать цепочку
      setTimeout(() => callback(), pauseDuration);
    }
    return;
  }
  const lang = /[а-яёА-ЯЁ]/.test(text) ? "ru" : "en";
  const utterance = new SpeechSynthesisUtterance(text);
  // utterance.rate = rate;
  utterance.rate = lang === "ru" ? rate : rate - 0.2;
  utterance.onend = () => {
    // ВСЕГДА вызываем callback при естественном завершении речи
    if (callback) {
      setTimeout(() => {
        callback();
      }, pauseDuration);
    }
  };
  utterance.onerror = (event) => {
    // ОТКАТ: Логируем ошибку, но всегда вызываем callback.
    // Решение о продолжении цикла будет в playNextPhraseInSequence.
    if (event.error === "interrupted") {
      // console.log("onerror: Воспроизведение прервано пользователем.");
      return;
    } else {
      console.error("onerror: Ошибка SpeechSynthesisUtterance:", event);
      // }
      // Важно вызвать колбэк даже при ошибке, чтобы не блокировать очередь,
      // но, возможно, с меньшей паузой, или без неё, если ошибка критична.
      if (callback) {
        setTimeout(() => {
          callback();
        }, pauseDuration); // Можете изменить pauseDuration на 0 здесь при ошибке
      }
    }
  };
  if (lang === "en") {
    if (enVOICE) {
      utterance.voice = enVOICE;
      utterance.lang = enVOICE.lang;
    } else {
      utterance.lang = "en-US";
      console.warn("ruVOICE не установлен, используется голос по умолчанию.");
    }
  } else {
    if (ruVOICE) {
      utterance.voice = ruVOICE;
      utterance.lang = ruVOICE.lang;
    } else {
      utterance.lang = "ru-RU";
      console.warn("ruVOICE не установлен, используется голос по умолчанию.");
    }
  }
  speechSynthesis.cancel(); // Останавливаем текущее воспроизведение
  speechSynthesis.speak(utterance);
}
function selectPhrase(data, index, onPhraseCompleteCallback) {
  if (currentSelected) {
    currentSelected.classList.remove("selected");
  }
  currentSelected = data.element;
  currentSelected.classList.add("selected");
  currentIndex = index;
  currentText = data.textEn;
  el.selPhrase.innerHTML = currentText;
  el.selPhrase.title = data.rowid;
  el.textRU.title = data.rowid;
  el.textRU.innerHTML = data.textRu;
  if (!notrans.includes(currentCategory)) el.extra.textContent = data.trans;
  const commCtrlElement = document.getElementById("commCtrl");
  const commentsContainer = document.querySelector(".comments-container");
  if (data.comm) {
    el.comments.innerHTML = data.comm;
    el.comments.title = data.rowid;
    el.commCtrl.style.display = "flex"; // Показываем весь контейнер
  } else {
    el.comments.innerHTML = "";
    el.commCtrl.style.display = "none"; // Скрываем весь контейнер
  }
  // if (false)
  speakEnAndRu(el.selPhrase.textContent, el.textRU.textContent, () => {
    // Этот колбэк будет вызван после того, как speakEnRu завершит озвучивание обеих частей фразы
    if (onPhraseCompleteCallback) {
      onPhraseCompleteCallback(); // Вызываем колбэк, переданный в selectPhrase
    }
  });
}
function speakEnAndRu(enText, ruText, onSpeechComplete) {
  speakText(
    enText,
    1,
    () => {
      speakText(
        ruText,
        1, // Используем текст из DOM-элемента или data.textRu
        () => {
          // Этот колбэк срабатывает после окончания РУССКОЙ фразы
          // !!! Здесь обе части фразы озвучены !!!
          if (onSpeechComplete) {
            onSpeechComplete(); // Вызываем переданный колбэк
          }
        },
        50 // Пауза между английской и русской фразой
      );
    },
    50 // Пауза перед английской фразой
  );
}
function speakEnOrRu(text, onComplete) {
  speakText(
    text,
    1, // Скорость
    // Этот колбэк сработает после того, как speakText завершит озвучивание
    () => {
      if (onComplete) {
        // Если нам передали колбэк
        onComplete(); // Вызываем его
      }
    },
    0 // Пауза (если нужна, для одного текста обычно 0)
  );
}
function playNextPhraseInSequence() {
  if (playAllCurrentIndex < data.length) {
    selectPhrase(data[playAllCurrentIndex], playAllCurrentIndex, () => {
      playAllTimeoutId = setTimeout(
        playNextPhraseInSequence,
        INTERVAL_BETWEEN_PHRASES_MS
      );
      playAllCurrentIndex++;
      if (playAllCurrentIndex == data.length) playAllCurrentIndex = 0;
    });
  }
}
function stopAllPlayback() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel(); // Останавливаем любую текущую речь
  }
  if (playAllTimeoutId) {
    clearTimeout(playAllTimeoutId); // Отменяем любые запланированные таймеры PlayAll
    playAllTimeoutId = null; // Обнуляем ID
  }
  if (currentSelected) {
    currentSelected.classList.remove("selected"); // Очищаем предыдущее выделение
    currentSelected = null;
  }
  if (isPlayingAll) {
    isPlayingAll = false;
    playAllCurrentIndex = 0; // Сбрасываем индекс для следующего полного воспроизведения
    updateButtonStates("topicSelected"); // <--- Только playAll активна
  } else {
    updateButtonStates("stopped"); // <--- playAll и playBtn активны
  }
  el.playAll.textContent = "🎧"; // Значок кнопки PlayAll
}
function updateButtonStates(state) {
  switch (state) {
    case "initial": // Начальное состояние, или при выборе категории (до выбора топика)
      el.playBtn.disabled = true;
      el.playAll.disabled = true;
      el.stopBtn.disabled = true;
      break;
    case "topicSelected": // Топик выбран, можно запустить "Озвучить все"
      el.playBtn.disabled = true;
      el.playAll.disabled = false; //  🎧
      el.stopBtn.disabled = true;
      break;
    case "playingAll": // Воспроизводится вся последовательность
      el.playBtn.disabled = true;
      el.playAll.disabled = true;
      el.stopBtn.disabled = false; //  ⏹️
      break;
    case "playingSingle": // Воспроизводится одна фраза (через playBtn или прямой клик)
      el.playBtn.disabled = true;
      el.playAll.disabled = true;
      el.stopBtn.disabled = false; //  ⏹️
      break;
    case "stopped": // Воспроизведение остановлено (или завершено) для одиночной фразы
      el.playBtn.disabled = false; //  ▶️
      el.playAll.disabled = false; //  🎧
      el.stopBtn.disabled = true;
      break;
    default:
      console.warn("Неизвестное состояние кнопок:", state);
  }
}
async function selText(text) {
  const lang = /[а-яёА-ЯЁ]/.test(text) ? "ru" : "en";
  const translation = await fetchTranslation(
    text,
    lang,
    lang === "ru" ? "en" : "ru"
  );
  el.modalOriginalText.textContent = text;
  el.modalTranslationText.textContent = translation;
  el.translationModal.style.display = "flex"; // Показываем модальное окно
  speakEnAndRu(text, translation, () => {
    stopAllPlayback();
  });
}
function hideTranslationModal() {
  el.translationModal.style.display = "none"; // Скрываем модальное окно
  el.modalOriginalText.textContent = "";
  el.modalTranslationText.textContent = ""; // Очищаем содержимое
}
async function fetchTranslation(text, fromLang, toLang) {
  const encoded = encodeURIComponent(text);
  // console.log("text: ", text, text.length);
  // console.log("encoded: ", encoded);
  const url = `https://lingva.ml/api/v1/${fromLang}/${toLang}/${encoded}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.translation;
}
async function testTranslationReliably(text) {
  const originalHtml = text;
  const translatedHtml = await translateHtmlPreserveBrOnly(
    originalHtml,
    "en",
    "ru"
  );
  // console.log("Оригинальный HTML:", originalHtml);
  // console.log("Переведенный HTML (только p и br):", translatedHtml);
  return translatedHtml; // Возвращаем переведенный HTML
}
// async function translateHtmlPreserveBrOnly(htmlString, fromLang, toLang) {
//   // Регулярное выражение для поиска всех <br> тегов.
//   const brRegex = /<br\s*\/?>/gi;

//   // 1. Разбиваем строку на части по <br> тегам.
//   const parts = htmlString.split(brRegex);

//   // Массив для хранения переведённых частей и их форматирования.
//   const formattedParts = [];

//   // 2. Проходим по каждой части, сохраняем форматирование и переводим текст.
//   for (let i = 0; i < parts.length; i++) {
//     const part = parts[i];
//     const tempDiv = document.createElement("div");
//     tempDiv.innerHTML = part;

//     // Регулярное выражение для поиска HTML-сущностей и символов в начале строки
//     const formattingRegex = /^(&emsp;|★|\s)+/i;
//     const formattingMatch = tempDiv.textContent.match(formattingRegex);

//     // Сохраняем форматирование (если оно есть)
//     const formatting = formattingMatch ? formattingMatch[0] : "";

//     // Получаем чистый текст без форматирования и лишних пробелов
//     const plainText = tempDiv.textContent.replace(formattingRegex, "").trim();

//     // Если в части есть текст, переводим его.
//     if (plainText.length > 0) {
//       const translatedText = await fetchTranslation(
//         plainText,
//         fromLang,
//         toLang
//       );
//       // Добавляем переведенный текст и форматирование в массив
//       formattedParts.push({ text: translatedText, formatting: formatting });
//     } else {
//       // Если текста нет (пустая строка), добавляем пустую часть, чтобы сохранить разрыв строки.
//       formattedParts.push({ text: "", formatting: "" });
//     }
//   }

//   // 3. Собираем всё обратно в HTML-строку.
//   const pStyle = 'style="margin-top: 0; margin-bottom: 0;"';
//   const finalHtml = formattedParts
//     .map((part) => {
//       // Пропускаем пустые абзацы, если они не являются результатом двух <br>
//       if (part.text === "" && formattedParts.length > 1) {
//         return "";
//       }
//       return `<p ${pStyle}>${part.formatting}${part.text}</p>`;
//     })
//     .join("");

//   return finalHtml;
// }
async function translateHtmlPreserveBrOnly(htmlString, fromLang, toLang) {
  // 1. Находим все фрагменты текста, теги и &emsp;.
  // Регулярное выражение ищет либо &emsp;, либо тег, либо обычный текст.
  const regex = /((?:&emsp;)+|<[^>]+>|[^<>&]+)/g;
  const parts = htmlString.match(regex);
  if (!parts) return "";

  // 2. Проходим по каждой части и переводим только текст.
  const translatedParts = [];
  for (const part of parts) {
    // Если это HTML-тег или &emsp;, добавляем как есть.
    if (
      (part.startsWith("<") && part.endsWith(">")) ||
      part.startsWith("&emsp;")
    ) {
      translatedParts.push(part);
    } else {
      // Если это текст, переводим его.
      if (part.trim().length > 0) {
        const translated = await fetchTranslation(part, fromLang, toLang);
        translatedParts.push(translated);
      } else {
        // Если это только пробелы, просто добавляем их обратно без перевода.
        translatedParts.push(part);
      }
      // const translated = await fetchTranslation(part, fromLang, toLang);
      // translatedParts.push(translated);
    }
  }

  // 3. Собираем всё в одну строку.
  return translatedParts.join("");
}
// async function translateHtmlPreserveBrOnly(htmlString, fromLang, toLang) {
//   // async function translateTextWithTags(htmlString, fromLang, toLang) {
//   // 1. Находим все фрагменты текста и теги.
//   // Регулярное выражение ищет либо текст, либо HTML-тег.
//   // const regex = /     ([^<]+|<[^>]+>)/g;
//   // const regex = /(&emsp;|<[^>]+>|[^<>&]+)/g;
//   const regex = /(?:&emsp;)+|<[^>]+>|[^<>&]+/;
//   const parts = htmlString.match(regex);
//   if (!parts) return "";

//   // 2. Проходим по каждой части и переводим только текст.
//   const translatedParts = [];
//   for (const part of parts) {
//     if (part.startsWith("<") && part.endsWith(">")) {
//       // Если это тег, добавляем его как есть.
//       translatedParts.push(part);
//     } else {
//       // Если это текст, переводим его.
//       const translated = await fetchTranslation(part, fromLang, toLang);
//       translatedParts.push(translated);
//     }
//   }

//   // 3. Собираем всё в одну строку.
//   return translatedParts.join("");
// }
async function getIPA(text) {
  const ipaParts = [];
  const words = text.match(/[a-zA-Z0-9']+/g) || [];
  for (const word of words) {
    // console.log(`🟡 [getIPA] Начало запроса для слова: "${word}"`);
    if (!word) continue;

    let ipa = await fetchIPA_toDictAPI(word); // from dictionaryapi

    if (ipa && ipa !== "(нет IPA)") {
      ipaParts.push(ipa);
    } else {
      ipa = await fetchIPA_toWebster(word); // from Merriam-Webster
      ipaParts.push(ipa);
    }
  }
  // console.log(`🟢 [API 1] Получена транскрипция: ${ipaParts.join(" ")}`);
  return ipaParts.join(" ");
}

async function fetchIPA_toDictAPI(word) {
  try {
    const url = `http://localhost:3001/api-dict-v2/${word}`;
    const response = await fetch(url);

    if (!response.ok) {
      // console.log(
      //   `🟠 [API 1] API 1 не дал результата. Статус: ${response.status}`
      // );
      return "(нет IPA)";
    }

    const phoneticText = await response.text();
    if (phoneticText && phoneticText !== "Транскрипция не найдена") {
      // console.log(`🟢 [API 1] Получена транскрипция: ${phoneticText}`);
      return phoneticText;
    }

    return "(нет IPA)";
  } catch (e) {
    // console.error(
    //   `🔴 [API 1] Ошибка при получении IPA для слова "${word}":`,
    //   e
    // );
    return "(нет IPA)";
  }
}

async function fetchIPA_toWebster(word) {
  try {
    const url = `http://localhost:3001/api-webster/${word}`;
    const response = await fetch(url);

    if (!response.ok) {
      // console.log(
      //   `🟠 [API 2] API 2 не дал результата. Статус: ${response.status}`
      // );
      // return "(нет IPA)";
      return `{${word}}`;
    }

    const phoneticText = await response.text();
    if (phoneticText && phoneticText !== "Транскрипция не найдена") {
      // console.log(`🟢 [API 2] Получена транскрипция: ${phoneticText}`);
      return phoneticText;
    }
    return `{${word}}`;
    // return "(нет IPA)";
  } catch (e) {
    // console.error(
    //   `🔴 [API 2] Ошибка при получении IPA для слова "${word}":`,
    //   e
    // );
    // return "(нет IPA)";
    return `{${word}}`;
  }
}

// async function getIPA(text) {
//   const ipaParts = [];
//   const words = text.match(/[a-zA-Z0-9']+/g) || [];
//   for (const word of words) {
//     console.log(`🟡 [getIPA] Начало запроса для слова: "${word}"`);
//     if (!word) continue;
//     try {
//       ipa = await fetchIPA_toDictAPI(word); // from dictionaryapi
//       if (ipa) ipaParts.push(ipa);
//       else {
//         ipa = await fetchIPA_toWebster(word); // from Merriam-Webster
//         ipaParts.push(ipa);
//       }
//     } catch (error) {
//       console.error(
//         `🔴 [getIPA] Критическая ошибка при получении IPA для слова "${word}":`,
//         error
//       );
//       return "(нет IPA)";
//     }
//   }
//   return ipaParts.join(" ");
// }
// async function fetchIPA_toDictAPI(word) {
//   // получение IPA из https://api.dictionaryapi.dev
//   try {
//     const url1 = `http://localhost:3001/api-dict-v2/${word}`;
//     console.log(`🟡 [getIPA] Начало запроса для слова: "${word}"`);
//     const response = await fetch(url1);
//     // const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
//     //   word
//     // )}`;
//     // const response = await fetch(url);
//     //
//     if (response.ok) {
//       // const ipa = await response1.text();
//       console.log(`🟢 [getIPA] Получена транскрипция от API 1: ${ipa}`);
//     } else {
//       console.log(
//         `🟠 [getIPA] API 1 не дал результата. Статус: ${response1.status}`
//       );

//       // return ipa;
//     }
//     const phoneticText = await response.text();
//     if (
//       response.ok &&
//       phoneticText &&
//       phoneticText !== "Транскрипция не найдена"
//     ) {
//       return phoneticText;
//     }
//   } catch (e) {
//     // Этот блок catch будет ловить только сетевые ошибки или ошибки парсинга JSON,
//     // но не HTTP-ошибки типа 404, которые теперь обрабатываются выше.
//     console.error(`Ошибка при получении IPA для слова "${word}":`, e);
//     return ``; // Помечаем слово с ошибкой
//   }
// }
// async function fetchIPA_toWebster(word) {
//   try {
//     const url2 = `http://localhost:3001/api-webster/${word}`;
//     console.log(`🟢 [getIPA] Получена транскрипция от API 2: ${ipa}`);
//     const response = await fetch(url2);
//     // ✅ Меняем response.json() на response.text()
//     const phoneticText = await response.text();
//     if (response.ok) {
//       // const ipa = await response2.text();
//       console.log(`🟢 [getIPA] Получена транскрипция от API 2: ${ipa}`);
//       // return ipa;
//     } else {
//       console.log(
//         `🟠 [getIPA] API 2 не дал результата. Статус: ${response.status}`
//       );
//     }
//     if (
//       response.ok &&
//       phoneticText &&
//       phoneticText !== "Транскрипция не найдена"
//     ) {
//       // Здесь, возможно, тебе понадобится немного изменить форматирование,
//       // так как прокси уже возвращает готовую строку.
//       return phoneticText;
//     } else {
//       return `{${word}}`;
//     }
//   } catch (e) {
//     console.error(`Ошибка при получении IPA для слова "${word}":`, e);
//     return ``; // Помечаем слово с ошибкой
//   }
// }

// async function fetchIPA_toWebster(word) {
//   // получение IPA из MERRIAM-WEBSTER
//   const MERRIAM_WEBSTER_DICT_API_KEY = "589c5d87-e46a-47d4-a001-67f0c69887d0";
//   const MERRIAM_WEBSTER_LEARNER_API_KEY =
//     "2037d3ef-c1a9-4f73-9ab9-ada713d775b8";
//   try {
//     const response = await fetch(`http://localhost:3001/api-webster/${word}`);
//     // const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(
//     //   word
//     // )}?key=${MERRIAM_WEBSTER_DICT_API_KEY}`;
//     // const response = await fetch(url);
//     const data = await response.json();
//     let phoneticText = "";

//     if (Array.isArray(data) && data.length > 0) {
//       const firstEntry = data[0];
//       if (
//         firstEntry.hwi &&
//         Array.isArray(firstEntry.hwi.prs) &&
//         firstEntry.hwi.prs.length > 0
//       ) {
//         phoneticText = firstEntry.hwi.prs[0].ipa || firstEntry.hwi.prs[0].mw;
//       } else if (Array.isArray(firstEntry.prs) && firstEntry.prs.length > 0) {
//         phoneticText = firstEntry.prs[0].ipa || firstEntry.prs[0].mw;
//       }
//     }
//     if (phoneticText) {
//       return `(${phoneticText})`;
//     } else {
//       return `{${word}}`;
//     }
//   } catch (e) {
//     console.error(`Ошибка при получении IPA для слова "${word}":`, e);
//     return ``; // Помечаем слово с ошибкой
//     // return `(❌${word}❌)`; // Помечаем слово с ошибкой
//   }
// }
