main();
async function main() {
  declare();
  findAndSetVoices();
  listeners();
  await loadDB();
  populateCategories();
}
function declare() {
  el = {
    selPhrase: document.getElementById("selected-phrase"),
    textRU: document.getElementById("rus-text"),
    extra: document.getElementById("extra-text"),
    comments: document.getElementById("comments"),
    category: document.getElementById("category"),
    topic: document.getElementById("topic"),
    phrases: document.getElementById("phrases"),
    playBtn: document.getElementById("play"),
    playAll: document.getElementById("playAll"),
    stopBtn: document.getElementById("stop"),
    commCtrl: document.getElementById("commCtrl"),
    showRuBtn: document.getElementById("showRuBtn"),
    readCommBtn: document.getElementById("readCommBtn"),
    readRuBtn: document.getElementById("readRuBtn"),
    empty: document.getElementById("empty"),
    translationModal: document.getElementById("translationModal"),
    modalOriginalText: document.getElementById("modalOriginalText"),
    modalTranslationText: document.getElementById("modalTranslationText"),
    // commCont: document.querySelector(".comments-container"),
    placeholderOption: document.createElement("option"),
  };
  el.placeholderOption.style.textAlign = "center";
  el.placeholderOption.disabled = true;
  el.placeholderOption.selected = true;
  el.topic.appendChild(el.placeholderOption);
  currentSpeakingState = speechSynthesis.speaking;
}
function findAndSetVoices() {
  if (!enVOICE) {
    enVOICE = findVoice("Google US English", "en-US");
    if (enVOICE) console.log("enVOICE: ", enVOICE.name);
  }
  if (!ruVOICE) {
    ruVOICE = findVoice("Google русский", "ru-RU");
    if (ruVOICE) console.log("ruVOICE: ", ruVOICE.name);
  }
  function findVoice(name, lang) {
    let foundVoiceForThisCall = null;
    const voices = speechSynthesis.getVoices();
    console;
    for (const voice of voices) {
      if (voice.name === name && voice.lang === lang) {
        foundVoiceForThisCall = voice;
        break;
      }
    }
    if (!foundVoiceForThisCall) {
      foundVoiceForThisCall = voices.find((voice) => voice.lang === lang);
    }
    if (foundVoiceForThisCall) {
      return foundVoiceForThisCall;
    }
  }
}
function listeners() {
  document.querySelector(".close-button").onclick = function () {
    el.translationModal.style.display = "none";
  };
  el.playBtn.addEventListener("click", () => {
    if (currentText) {
      stopAllPlayback(); // <--- Сначала останавливаем всё
      el.playBtn.textContent = "🔉"; // Кнопка Play становится "Стоп" (активна)
      updateButtonStates("playingSingle"); // <--- Управление состоянием кнопок
      speakEnAndRu(currentText, el.textRU.textContent, () => {
        stopAllPlayback();
        el.playBtn.textContent = "▶️"; // Например, символ Play
      });
    } else {
      console.warn("Нет выбранной фразы для воспроизведения.");
      el.playBtn.textContent = "▶️";
      el.playAll.disabled = false; // Разрешаем PlayAll, если нет фразы для Play
    }
  });
  el.playAll.addEventListener("click", () => {
    if (!isPlayingAll && data.length > 0) {
      stopAllPlayback(); // <--- Сначала останавливаем всё
      playAllCurrentIndex = 0; // Сбрасываем индекс на начало
      isPlayingAll = true;
      el.playAll.textContent = "🔉"; // Кнопка Play All неактивна
      updateButtonStates("playingAll"); // <--- Управление состоянием кнопок
      playNextPhraseInSequence();
    }
  });
  el.stopBtn.addEventListener("click", () => {
    stopAllPlayback();
  });
  el.showRuBtn.addEventListener("click", async () => {
    el.modalOriginalText.textContent = el.modalTranslationText.innerHTML = "";
    if (currentIndex < 0) {
      translation = classComm[currentCategory].split("###")[1];
    } else {
      translation = data[currentIndex]["commRu"];
    }
    el.modalTranslationText.innerHTML = translation;
    el.translationModal.style.display = "flex";
  });
  el.readCommBtn.addEventListener("click", () => {
    stopAllPlayback();
    updateButtonStates("playingAll");
    speakEnOrRu(el.comments.textContent, () => {
      updateButtonStates("stopped");
    });
  });
  el.readRuBtn.addEventListener("click", async () => {
    el.empty.innerHTML =
      currentIndex < 0
        ? classComm[currentCategory].split("###")[1]
        : data[currentIndex]["commRu"];
    translation = el.empty.textContent;
    stopAllPlayback();
    updateButtonStates("playingAll");
    speakEnOrRu(translation, () => {
      updateButtonStates("stopped");
    });
  });
  el.phrases.addEventListener("click", (event) => {
    hideTranslationModal();
    const clickedPhrase = event.target.closest(".phrase");
    if (clickedPhrase) {
      const index = parseInt(clickedPhrase.dataset.index);
      if (!isNaN(index) && data[index]) {
        // currentIndex = index;
        updateButtonStates("playingSingle"); // Управление состоянием кнопок
        selectPhrase(data[index], index, () => {
          if (!isPlayingAll) {
            stopAllPlayback(); // Останавливаем после завершения одиночной фразы
            updateButtonStates("stopped"); // Обновляем состояние кнопок после одиночной фразы
          }
        });
      }
    }
  });
  el.category.addEventListener("change", async () => {
    currentCategory = el.category.value;
    el.commCtrl.style.display = "none"; // Скрываем весь контейнер
    el.phrases.innerHTML =
      el.phrases.textContent =
      el.selPhrase.textContent =
      el.extra.textContent =
      el.textRU.textContent =
      el.comments.textContent =
      el.selPhrase.title =
        "";
    currentIndex = -1;
    el.selPhrase.innerHTML = `<center><font size="6" color="black" face="Arial">${currentCategory}</font></center>`;
    if (classComm[currentCategory]) {
      el.comments.innerHTML = classComm[currentCategory].split("###")[0];
      // el.commCont.style.display = "flex";
      el.commCtrl.style.display = "flex";
    } else {
      if (DBname === "CivicsTest.db" && !currentCategory)
        el.comments.innerHTML = cover();
      else el.comments.innerHTML = "";
      el.commCtrl.style.display = "none";
    }
    el.topic.innerHTML = '<option value="">Выберите тему</option>';
    if (currentCategory) {
      el.topic.style.display = "block";
      const res = await readDB(currentCategory);
      const topics = res[0].values.map((row) => row[0]);
      if (!nosort.includes(currentCategory)) {
        topics.sort();
      }
      topics.forEach((topic) => {
        const option = document.createElement("option");
        option.value = option.textContent = topic;
        el.topic.appendChild(option);
      });
      updateButtonStates("initial"); // <--- Управление состоянием кнопок
    } else {
      el.topic.innerHTML = "";
      el.topic.style.display = "none"; // Если вы его скрывали
    }
  });
  el.topic.addEventListener("change", async () => {
    el.commCtrl.style.display = "none"; // Скрываем весь контейнер
    hideTranslationModal();
    topic = el.topic.value;
    el.phrases.textContent =
      el.selPhrase.textContent =
      el.extra.textContent =
      el.textRU.textContent =
      el.comments.textContent =
      el.selPhrase.title =
        "";
    el.selPhrase.innerHTML = `<center><font size="6" color="black" face="Arial">${currentCategory}</font></center>`;
    if (classComm[currentCategory]) {
      el.comments.innerHTML = classComm[currentCategory].split("###")[0];
      el.commCtrl.style.display = "flex";
    }
    if (currentCategory && topic) {
      const res = await readDB(currentCategory, topic);
      const columns = res[0].columns;
      const rows = res[0].values;
      // console.log(columns)
      // console.log(rows)
      const processedData = rows.map((row) => {
        const rowObject = {};
        columns.forEach((colName, index) => {
          rowObject[colName] = row[index];
        });
        return rowObject;
      });
      data = processedData;
      data.forEach((item, i) => {
        const div = document.createElement("div");
        div.className = "phrase";
        // const lang = /[а-яёА-ЯЁ]/.test(topic) ? "ru" : "en";
        // const lang = /^[а-яёА-ЯЁ]+$/.test(topic) ? "ru" : "en";
        let txt = /[а-яёА-ЯЁ]/.test(topic) ? item.textRu : item.textEn;
        // div.textContent = txt;
        div.innerHTML = txt.split("★")[0].replace(/<br>&emsp;&emsp;/g, "");
        // console.log(div.textContent);
        div.dataset.index = i;
        item.element = div;
        el.phrases.appendChild(div);
      });
      updateButtonStates("topicSelected"); // <--- Управление состоянием кнопок
    } else {
      currentText = ""; // Сбрасываем, когда нет выбранной подкатегории
      el.phrases.innerHTML = ""; // Очищаем вывод
    }
  });
  if (el.comments) {
    el.comments.addEventListener("contextmenu", (event) => {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText.length > 0) {
        event.preventDefault();
        selText(selectedText);
      }
    });
    // Закрытие модального окна при клике на фон (вне содержимого)
    el.translationModal.addEventListener("click", (event) => {
      if (event.target === el.translationModal) {
        // Проверяем, что клик был именно по фону модального окна
        hideTranslationModal();
      }
    });
    // Закрытие модального окна по нажатию клавиши Escape
    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        el.translationModal.style.display === "flex"
      ) {
        hideTranslationModal();
      }
    });
  }
  if (speechSynthesis.onvoiceschanged === null) {
    speechSynthesis.addEventListener("voiceschanged", findAndSetVoices, {
      once: true, // обработчик будет вызван **только один раз
    });
  }
}
async function populateCategories() {
  if (DBname === "EnRu.db")
    document.getElementById("myHeading").innerHTML =
      "<i>Репетитор по английскому языку</i>";
  if (DBname === "CivicsTest.db")
    document.getElementById("myHeading").innerHTML =
      "<i>Quick Civics Lessons for the New Naturalization Test</i>";
  el.category.innerHTML = '<option value="">Выберите раздел</option>';
  el.commCtrl.style.display = "none"; // Скрываем весь контейнер
  currentText = el.topic.innerHTML = el.phrases.innerHTML = "";
  if (DBname === "CivicsTest.db") el.comments.innerHTML = cover();
  el.topic.style.display = "none";
  const res = await readDB();
  const sortedCategoryKeys = res[0].values.map((row) => row[0]);
  sortedCategoryKeys.forEach((categoryKey) => {
    if (categoryKey != "???") {
      const option = document.createElement("option");
      option.value = categoryKey;
      option.innerHTML = categoryKey;
      option.style.fontStyle = "italic";
      el.category.appendChild(option);
    }
  });
  updateButtonStates("initial"); // <--- Управление состоянием кнопок
  // el.comments.innerHTML = `Privet -<img src="CivicsTest.jpg">`;
}
function cover() {
  // return `<img src="CivicsTest.jpg">`;
  return `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      height: 90%;
      transform: scale(1.6);">
    <img src="CivicsTest.jpg" >
  </div>`;
}
