const APP_VERSION = "1.6.0";
const CHILD_NAME = "Isabelle";

const lessons = [
  { emoji: "👋", label: "Mi nombre", english: "My name is Isabelle.", spanish: "Me llamo Isabelle.", answer: "my name is isabelle", sound: "mai NEIM iz I-sa-BEL", color: "violet" },
  { emoji: "🎨", label: "Color favorito", english: "My favorite color is purple.", spanish: "Mi color favorito es morado.", answer: "my favorite color is purple", sound: "mai FEI-vrit KÁ-ler iz PÉR-pol", color: "purple" },
  { emoji: "⚽", label: "Deporte favorito", english: "My favorite sport is soccer.", spanish: "Mi deporte favorito es el fútbol.", answer: "my favorite sport is soccer", sound: "mai FEI-vrit sport iz SÁ-ker", color: "green" },
  { emoji: "🍝", label: "Comida favorita", english: "My favorite food is pasta.", spanish: "Mi comida favorita es la pasta.", answer: "my favorite food is pasta", sound: "mai FEI-vrit fud iz PÁS-ta", color: "coral" },
  { emoji: "6️⃣", label: "Mi edad", english: "I’m six years old.", spanish: "Tengo seis años.", answer: "i'm six years old", sound: "aim SIKS yirs OULD", color: "yellow" },
  { emoji: "🐾", label: "Cuando sea grande", english: "I want to be an animal rescuer.", spanish: "Quiero rescatar animales.", answer: "i want to be an animal rescuer", sound: "ai UÁNT tu bi an Á-ni-mal RÉS-kiu-er", color: "aqua" },
  { emoji: "➗", label: "Materia favorita", english: "My favorite subject is math.", spanish: "Mi materia favorita es matemáticas.", answer: "my favorite subject is math", sound: "mai FEI-vrit SÁB-yekt iz MÁTH", color: "blue" },
  { emoji: "📖", label: "Libro favorito", english: "My favorite book is Mother of Sharks.", spanish: "Mi libro favorito es Mother of Sharks.", answer: "my favorite book is mother of sharks", sound: "mai FEI-vrit buk iz MÁ-der ov SHARKS", color: "navy" },
  { emoji: "🐰", label: "Animal favorito", english: "My favorite animal is rabbits.", spanish: "Mi animal favorito son los conejos.", answer: "my favorite animal is rabbits", sound: "mai FEI-vrit Á-ni-mal iz RÁ-bits", color: "pink" },
];

const STORAGE_KEY = "aventura-ingles-progress-v1";
let canvasObserver;
let activeRecognition;
let state = {
  mode: "learn",
  lessonIndex: 0,
  completed: [],
  stars: 0,
  answer: "",
  feedback: "idle",
  showSound: false,
  quizOptions: [0, 3, 6],
  quizStyle: "speech",
  childName: CHILD_NAME,
  achievementsOpen: false,
  celebration: null,
  celebrationQueue: [],
  unlockedAchievements: [],
  writingStyle: "keyboard",
  writingFullscreen: false,
  familyMissions: [],
  missionOpen: false,
  speechStatus: "idle",
  speechTranscript: "",
  speechMessage: "",
  stats: { typingWins: 0, handwritingWins: 0, speechWins: 0, quizWins: 0 },
};

try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  if (stored) {
    state.completed = Array.isArray(stored.completed) ? stored.completed : [];
    state.stars = Number.isFinite(stored.stars) ? stored.stars : 0;
    state.childName = CHILD_NAME;
    state.familyMissions = Array.isArray(stored.familyMissions) ? stored.familyMissions : [];
    state.unlockedAchievements = Array.isArray(stored.unlockedAchievements) ? stored.unlockedAchievements : [];
    state.stats = {
      typingWins: Number.isFinite(stored.stats?.typingWins) ? stored.stats.typingWins : 0,
      handwritingWins: Number.isFinite(stored.stats?.handwritingWins) ? stored.stats.handwritingWins : 0,
      speechWins: Number.isFinite(stored.stats?.speechWins) ? stored.stats.speechWins : 0,
      quizWins: Number.isFinite(stored.stats?.quizWins) ? stored.stats.quizWins : 0,
    };
  }
} catch {
  // Start a fresh local adventure when saved progress cannot be read.
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    completed: state.completed,
    stars: state.stars,
    childName: CHILD_NAME,
    familyMissions: state.familyMissions,
    unlockedAchievements: state.unlockedAchievements,
    stats: state.stats,
  }));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function normalize(value) {
  return value.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'\s]/g, " ").replace(/\s+/g, " ").trim();
}

function similarity(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (a === b) return 1;
  const rows = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = rows[0];
    rows[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = rows[j];
      rows[j] = Math.min(rows[j] + 1, rows[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return 1 - rows[b.length] / Math.max(a.length, b.length, 1);
}

function phraseWasUnderstood(transcripts, lesson) {
  const expected = [lesson.answer];
  if (state.lessonIndex === 0) expected.push("my name is isabel");
  if (state.lessonIndex === 4) expected.push("i am six years old");
  return transcripts.some((spoken) => expected.some((answer) => {
    const normalizedSpoken = normalize(spoken).replace(/\bfavourite\b/g, "favorite");
    const normalizedAnswer = normalize(answer).replace(/\bfavourite\b/g, "favorite");
    const expectedWords = normalizedAnswer.split(" ").filter((word) => word.length > 1);
    const spokenWords = normalizedSpoken.split(" ");
    const understoodWords = expectedWords.filter((word) => spokenWords.some((heard) => similarity(word, heard) >= 0.72));
    const wordCoverage = understoodWords.length / Math.max(expectedWords.length, 1);
    return similarity(normalizedSpoken, normalizedAnswer) >= 0.68 || wordCoverage >= 0.75;
  }));
}

function voiceFor(language) {
  const voices = speechSynthesis.getVoices();
  const isEnglish = language.toLowerCase().startsWith("en");
  const preferredNames = isEnglish
    ? ["samantha", "ava", "allison", "susan", "victoria", "zoe", "karen", "tessa", "moira", "fiona"]
    : ["paulina", "ximena", "valentina", "camila", "marisol", "paloma", "monica", "mónica"];
  const localeOrder = isEnglish
    ? ["en-us", "en-ca", "en-au", "en-gb", "en"]
    : ["es-mx", "es-us", "es-419", "es-pr", "es-co", "es-ar", "es-cl", "es-pe", "es-ve", "es"];

  for (const locale of localeOrder) {
    const matchingLocale = voices.filter((voice) => voice.lang.toLowerCase() === locale || (locale.length === 2 && voice.lang.toLowerCase().startsWith(`${locale}-`)));
    const preferred = matchingLocale
      .filter((voice) => preferredNames.some((name) => voice.name.toLowerCase().includes(name)))
      .sort((left, right) => {
        const quality = (voice) => /premium|enhanced|natural|neural/.test(voice.name.toLowerCase()) ? 100 : 0;
        return quality(right) - quality(left);
      })[0];
    if (preferred) return preferred;
  }

  // Leaving the voice unset is safer than selecting an arbitrary male voice.
  // iPadOS will use its female default for en-US and es-MX when available.
  return undefined;
}

function makeUtterance(text, language, rate = 0.8) {
  const message = new SpeechSynthesisUtterance(text);
  message.lang = language;
  message.rate = rate;
  message.pitch = 1.02;
  const voice = voiceFor(language);
  if (voice) message.voice = voice;
  return message;
}

function queueWithSpanishName(text, language, name, rate = 0.8) {
  const spokenName = (name || "Isabelle").trim() || "Isabelle";
  const match = [spokenName, "Isabelle"]
    .map((candidate) => ({ candidate, index: text.toLowerCase().indexOf(candidate.toLowerCase()) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index)[0];

  if (language === "en-US" && match) {
    const before = text.slice(0, match.index).trim();
    const after = text.slice(match.index + match.candidate.length).replace(/^[,\s]+/, "").trim();
    if (before) speechSynthesis.speak(makeUtterance(before, "en-US", rate));
    speechSynthesis.speak(makeUtterance(match.candidate, "es-MX", rate));
    if (after && !/^[.!?]+$/.test(after)) speechSynthesis.speak(makeUtterance(after, "en-US", rate));
    return;
  }

  speechSynthesis.speak(makeUtterance(text, language, rate));
}

function speak(text, language, name = state.childName) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  queueWithSpanishName(text.replace("…", ""), language, name);
}

function speakBilingual(english, spanish) {
  if (!("speechSynthesis" in window)) return;
  const name = state.childName.trim() || "Isabelle";
  speechSynthesis.cancel();
  speechSynthesis.speak(makeUtterance(`${english}!`, "en-US", 0.82));
  speechSynthesis.speak(makeUtterance(`${spanish},`, "es-MX", 0.82));
  speechSynthesis.speak(makeUtterance(`${name}!`, "es-MX", 0.82));
}

function markPracticed(index) {
  if (!state.completed.includes(index)) state.completed = [...state.completed, index];
  save();
}

function recordWin(source) {
  if (source === "typing") state.stats.typingWins += 1;
  if (source === "handwriting") state.stats.handwritingWins += 1;
  if (source === "speech" || source === "speech-quiz") state.stats.speechWins += 1;
  if (source === "quiz" || source === "speech-quiz") state.stats.quizWins += 1;
}

function awardSuccess(english = "Great job", spanish = "Buen trabajo", source = "practice") {
  const isNewSuccess = state.feedback !== "correct";
  if (isNewSuccess) {
    state.stars += 1;
    recordWin(source);
  }
  state.feedback = "correct";
  markPracticed(state.lessonIndex);
  checkNewAchievements();
  speakBilingual(english, spanish);
  save();
  render();
}

function makeQuizOptions(index) {
  const choices = new Set([index]);
  let offset = 1;
  while (choices.size < 3) {
    choices.add((index + offset * 3) % lessons.length);
    offset += 1;
  }
  return [...choices].sort(() => Math.random() - 0.5);
}

function achievements() {
  return [
    { id: "first-star", icon: "⭐", name: "Primera estrella", detail: "¡Tu aventura comenzó!", earned: state.stars >= 1 },
    { id: "brave-voice", icon: "🎤", name: "Voz valiente", detail: "Hablaste en inglés", earned: state.stats.speechWins >= 1 },
    { id: "keyboard-star", icon: "⌨️", name: "Estrella del teclado", detail: "Escribiste una frase correcta", earned: state.stats.typingWins >= 1 },
    { id: "magic-pencil", icon: "✏️", name: "Lápiz mágico", detail: "Escribiste una frase a mano", earned: state.stats.handwritingWins >= 1 },
    { id: "quiz-champion", icon: "⚡", name: "Campeona de retos", detail: "Ganaste 3 retos", earned: state.stats.quizWins >= 3 },
    { id: "super-ear", icon: "🎧", name: "Súper oído", detail: "Practicaste 3 frases", earned: state.completed.length >= 3 },
    { id: "family-hero", icon: "💜", name: "Heroína de la familia", detail: "Compartiste una frase", earned: state.familyMissions.length >= 1 },
    { id: "smart-girl", icon: "🧠", name: "Chica súper inteligente", detail: "Conseguiste 7 estrellas", earned: state.stars >= 7 },
    { id: "unstoppable", icon: "🌈", name: "Isabelle imparable", detail: "Conseguiste 12 estrellas", earned: state.stars >= 12 },
    { id: "explorer", icon: "🏆", name: "English Explorer", detail: "Practicaste todas las frases", earned: state.completed.length === lessons.length },
  ];
}

function checkNewAchievements() {
  const newlyEarned = achievements().filter((item) => item.earned && !state.unlockedAchievements.includes(item.id));
  if (!newlyEarned.length) return;
  state.unlockedAchievements = [...state.unlockedAchievements, ...newlyEarned.map((item) => item.id)];
  state.celebrationQueue = [...state.celebrationQueue, ...newlyEarned];
  if (!state.celebration) state.celebration = state.celebrationQueue.shift();
}

function closeCelebration() {
  state.celebration = state.celebrationQueue.shift() || null;
  render();
}

function initializeAchievements() {
  if (state.unlockedAchievements.length || state.stars === 0) return;
  state.unlockedAchievements = achievements().filter((item) => item.earned).map((item) => item.id);
  save();
}

function feedbackHtml() {
  const name = escapeHtml(state.childName || "Isabelle");
  if (state.feedback === "correct") return `<div class="feedback success"><span>🎉</span><div><strong>Great job · ¡Buen trabajo, ${name}!</strong><small>You earned a star · Ganaste una estrella.</small></div></div>`;
  if (state.feedback === "try") return `<div class="feedback retry"><span>🌱</span><div><strong>Try again · Inténtalo otra vez, ${name}</strong><small>Listen one more time · Escucha una vez más.</small></div></div>`;
  return "";
}

function modeContent(lesson) {
  if (state.mode === "learn") return `
    <h2>${escapeHtml(lesson.english)}</h2>
    <p class="translation">${escapeHtml(lesson.spanish)}</p>
    ${state.showSound ? `<div class="sound-hint"><span>👄</span><div><small>Suena parecido a</small><strong>${escapeHtml(lesson.sound)}</strong></div></div>` : ""}
    <div class="listen-actions">
      <button class="primary" data-action="hear-en"><span aria-hidden="true">🔊</span> Escuchar inglés</button>
      <button class="secondary" data-action="hear-es"><span aria-hidden="true">🇪🇸</span> En español</button>
      <button class="text-button" data-action="sound">¿Cómo se pronuncia?</button>
    </div>`;

  if (state.mode === "write") return `
    <div class="writing-zone">
      <p class="write-prompt">Escribe en inglés:</p>
      <h2>${escapeHtml(lesson.spanish)}</h2>
      <div class="writing-style-tabs" role="group" aria-label="Forma de escribir">
        <button class="${state.writingStyle === "keyboard" ? "active" : ""}" data-action="writing-style" data-value="keyboard">⌨️ Teclado</button>
        <button class="${state.writingStyle === "hand" ? "active" : ""}" data-action="writing-style" data-value="hand">✏️ A mano</button>
      </div>
      ${state.writingStyle === "keyboard" ? `
        <label for="writing-answer">Tu respuesta</label>
        <textarea id="writing-answer" placeholder="Escribe aquí…" autocapitalize="sentences" spellcheck="false">${escapeHtml(state.answer)}</textarea>
        <div class="writing-help">
          <button class="hint-button" data-action="hint">💡 Dame una pista</button>
          <button class="primary" data-action="check" ${state.answer.trim() ? "" : "disabled"}>Comprobar</button>
        </div>` : `
        <div class="handwriting-practice ${state.writingFullscreen ? "is-fullscreen" : ""}">
          <div class="handwriting-focus-header">
            <p class="handwriting-instruction"><span aria-hidden="true">☝️</span> Escribe la frase con tu dedo o Apple Pencil.</p>
            <button class="expand-writing" data-action="toggle-handwriting-fullscreen" aria-label="${state.writingFullscreen ? "Salir de pantalla completa" : "Abrir cuaderno en pantalla completa"}">${state.writingFullscreen ? "✕ Salir" : "⛶ Pantalla completa"}</button>
          </div>
          <div class="fullscreen-sentence"><small>Frase para practicar</small><strong>${escapeHtml(lesson.english)}</strong></div>
          <div class="writing-paper">
            <div class="trace-text" aria-hidden="true">${escapeHtml(lesson.english)}</div>
            <canvas id="handwriting-canvas" aria-label="Área para escribir a mano: ${escapeHtml(lesson.english)}"></canvas>
          </div>
          <div id="handwriting-result" class="handwriting-result" aria-live="polite"></div>
          <div class="writing-help handwriting-actions">
            <button class="hint-button" data-action="clear-hand" disabled>🧽 Borrar</button>
            <button class="primary" data-action="finish-hand" disabled>✓ Terminé de escribir</button>
          </div>
        </div>`}
    </div>`;

  return `<div class="quiz-zone">
    <div class="quiz-style-tabs" role="group" aria-label="Tipo de reto">
      <button class="${state.quizStyle === "speech" ? "active" : ""}" data-action="quiz-style" data-value="speech">🎤 Decir</button>
      <button class="${state.quizStyle === "choose" ? "active" : ""}" data-action="quiz-style" data-value="choose">👆 Escoger</button>
    </div>
    ${state.quizStyle === "speech" ? `
      <section class="speaking-challenge primary-speech" aria-live="polite">
        <div><span aria-hidden="true">🎤</span><div><h3>Di esta frase en inglés</h3><p>${escapeHtml(lesson.spanish)}</p></div></div>
        <div class="speech-actions"><button class="secondary" data-action="hear-en">🔊 Escuchar una pista</button><button class="mic-button ${state.speechStatus === "listening" ? "listening" : ""}" data-action="speak-challenge" ${state.speechStatus === "listening" ? "disabled" : ""}>${state.speechStatus === "listening" ? "🎙️ Escuchando…" : "🎤 Hablar ahora"}</button></div>
        ${state.speechTranscript ? `<p class="heard-text"><strong>Escuché:</strong> “${escapeHtml(state.speechTranscript)}”</p>` : ""}
        ${state.speechMessage ? `<p class="speech-message">${escapeHtml(state.speechMessage)}</p>` : ""}
        <small>El reto acepta pequeñas diferencias de pronunciación. Comprueba las palabras entendidas, no califica el acento profesionalmente.</small>
      </section>` : `
      <p class="write-prompt">Toca la frase que significa:</p>
      <h2>${escapeHtml(lesson.spanish)}</h2>
      <div class="quiz-options">${state.quizOptions.map((index) => `<button data-action="quiz" data-index="${index}">${escapeHtml(lessons[index].english)}</button>`).join("")}</div>`}
  </div>`;
}

function render() {
  if (canvasObserver) canvasObserver.disconnect();
  document.body.classList.toggle("handwriting-active", state.mode === "write" && state.writingStyle === "hand");
  document.body.classList.toggle("handwriting-fullscreen", state.writingFullscreen);
  const lesson = lessons[state.lessonIndex];
  const progress = Math.round((state.completed.length / lessons.length) * 100);
  const earned = achievements().filter((item) => item.earned).length;
  const missionDone = state.familyMissions.includes(state.lessonIndex);
  const dots = lessons.map((_, index) => `<button data-action="lesson" data-index="${index}" class="${index === state.lessonIndex ? "current" : state.completed.includes(index) ? "done" : ""}" aria-label="Ir a frase ${index + 1}"></button>`).join("");

  document.querySelector("#app").innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <a class="brand" href="#top" aria-label="Aventura de Inglés, inicio"><span class="brand-mark" aria-hidden="true">🪽</span><span><strong>Aventura</strong><small>de Inglés</small></span></a>
        <div class="top-actions"><button class="star-pill" data-action="achievements" aria-label="${state.stars} estrellas. Ver logros"><span aria-hidden="true">⭐</span> ${state.stars}</button><div class="avatar" id="avatar" aria-label="Perfil de ${escapeHtml(state.childName)}">${escapeHtml((state.childName || "I").slice(0, 1).toUpperCase())}</div></div>
      </header>

      <section class="welcome" id="top"><div><p class="eyebrow">MISIÓN DEL DÍA · 10 MINUTOS</p><h1>¡Hola, <span class="fixed-name">${CHILD_NAME}</span>! <span aria-hidden="true">👋</span></h1><p>Hoy vamos a escuchar, hablar y escribir en inglés.</p></div><button class="achievements-button" data-action="achievements"><span aria-hidden="true">🏅</span><span><strong>Mis logros</strong><small>${earned} de ${achievements().length}</small></span></button></section>

      <section class="progress-card" aria-label="Progreso: ${progress}%"><div class="progress-copy"><span>Tu aventura de hoy</span><strong>${state.completed.length} / ${lessons.length} frases</strong></div><div class="progress-track"><span style="width:${progress}%"></span></div><span class="progress-percent">${progress}%</span></section>

      <nav class="mode-tabs" aria-label="Modos de práctica">
        <button class="${state.mode === "learn" ? "active" : ""}" data-action="mode" data-value="learn"><span aria-hidden="true">🎧</span> Escucha</button>
        <button class="${state.mode === "write" ? "active" : ""}" data-action="mode" data-value="write"><span aria-hidden="true">✍️</span> Escribe</button>
        <button class="${state.mode === "quiz" ? "active" : ""}" data-action="mode" data-value="quiz"><span aria-hidden="true">⚡</span> Reto</button>
      </nav>

      <section class="lesson-card ${lesson.color}" aria-live="polite">
        <div class="lesson-visual" aria-hidden="true"><div class="spark one">✦</div><div class="spark two">●</div><span>${lesson.emoji}</span><small>${state.lessonIndex + 1} de ${lessons.length}</small></div>
        <div class="lesson-content"><p class="lesson-label">${lesson.label}</p>${modeContent(lesson)}${feedbackHtml()}<div class="card-nav"><button data-action="prev" aria-label="Frase anterior">←</button><div>${dots}</div><button data-action="next" aria-label="Frase siguiente">→</button></div></div>
      </section>

      <section class="tiny-mission ${state.missionOpen ? "mission-open" : ""}">
        <div class="mascot-wrap"><img src="assets/og.png" alt="Colibrí explorador de Aventura de Inglés" /></div>
        <div><span>MISIÓN EXTRA</span><h2>Dile la frase a alguien de tu familia</h2><p>${missionDone ? "¡Misión completada! Puedes repetirla." : "Escucha, mira a alguien y di la frase tú."}</p></div>
        <button data-action="start-mission">${state.missionOpen ? "Cerrar" : missionDone ? "Repetir misión" : "Empezar misión"} <span aria-hidden="true">→</span></button>
        ${state.missionOpen ? `<div class="mission-panel">
          <ol class="mission-steps"><li><span>1</span><strong>Escucha</strong><small>Hear it</small></li><li><span>2</span><strong>Mira a alguien</strong><small>Look at someone</small></li><li><span>3</span><strong>Di la frase</strong><small>Say it yourself</small></li></ol>
          <blockquote>${escapeHtml(lesson.english)}</blockquote>
          <div class="mission-actions"><button data-action="mission-listen">🔊 Escuchar una vez</button><button class="mission-complete" data-action="mission-complete" ${missionDone ? "disabled" : ""}>${missionDone ? "✓ Completada" : "✅ ¡La dije!"}</button></div>
        </div>` : ""}
      </section>
      <footer><p>Hecho con 💜 para aprender en familia</p><small>El progreso se guarda en este dispositivo. El micrófono lo gestiona Safari. · Versión ${APP_VERSION}</small></footer>

      ${state.achievementsOpen ? `<div class="modal-backdrop" data-action="close-modal"><section class="achievement-modal" role="dialog" aria-modal="true" aria-labelledby="achievement-title"><button class="close" data-action="close-modal" aria-label="Cerrar">×</button><span class="big-medal" aria-hidden="true">🏅</span><h2 id="achievement-title">Mis logros</h2><p>Cada intento cuenta. ¡Sigue explorando!</p><div class="achievement-grid">${achievements().map((item) => `<article class="${item.earned ? "earned" : "locked"}"><span>${item.earned ? item.icon : "🔒"}</span><strong>${item.name}</strong><small>${item.earned ? item.detail : "Sigue practicando"}</small></article>`).join("")}</div><button class="primary full" data-action="close-modal">¡Vamos a practicar!</button><button class="reset-button" data-action="reset">↻ Reiniciar todo el progreso</button></section></div>` : ""}
      ${state.celebration ? `<div class="modal-backdrop celebration-backdrop"><section class="celebration-card" role="dialog" aria-modal="true" aria-labelledby="celebration-title"><div class="confetti" aria-hidden="true">⭐ ✨ 🌈 ✨ ⭐</div><span class="celebration-icon" aria-hidden="true">${state.celebration.icon}</span><p>NUEVO LOGRO</p><h2 id="celebration-title">${escapeHtml(state.celebration.name)}</h2><strong>${escapeHtml(state.celebration.detail)}</strong><small>¡Estamos muy orgullosos de ti, ${CHILD_NAME}!</small><button class="primary full" data-action="close-celebration">¡Seguir aprendiendo!</button></section></div>` : ""}
    </main>`;

  bindEvents();
  if (state.mode === "write" && state.writingStyle === "hand") setupCanvas();
}

function resetLessonState() {
  if (activeRecognition) {
    activeRecognition.abort();
    activeRecognition = null;
  }
  state.answer = "";
  state.feedback = "idle";
  state.showSound = false;
  state.missionOpen = false;
  state.speechStatus = "idle";
  state.speechTranscript = "";
  state.speechMessage = "";
  state.writingFullscreen = false;
  document.body.classList.remove("handwriting-fullscreen");
}

function resetAllProgress() {
  const confirmed = window.confirm("¿Quieres borrar todas las estrellas, logros, misiones y progreso de prueba?");
  if (!confirmed) return;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  localStorage.removeItem(STORAGE_KEY);
  state = {
    mode: "learn",
    lessonIndex: 0,
    completed: [],
    stars: 0,
    answer: "",
    feedback: "idle",
    showSound: false,
    quizOptions: [0, 3, 6],
    quizStyle: "speech",
    childName: CHILD_NAME,
    achievementsOpen: false,
    celebration: null,
    celebrationQueue: [],
    unlockedAchievements: [],
    writingStyle: "keyboard",
    writingFullscreen: false,
    familyMissions: [],
    missionOpen: false,
    speechStatus: "idle",
    speechTranscript: "",
    speechMessage: "",
    stats: { typingWins: 0, handwritingWins: 0, speechWins: 0, quizWins: 0 },
  };
  save();
  render();
}

function toggleHandwritingFullscreen(button) {
  state.writingFullscreen = !state.writingFullscreen;
  const practice = document.querySelector(".handwriting-practice");
  practice?.classList.toggle("is-fullscreen", state.writingFullscreen);
  document.body.classList.toggle("handwriting-fullscreen", state.writingFullscreen);
  button.innerHTML = state.writingFullscreen ? "✕ Salir" : "⛶ Pantalla completa";
  button.setAttribute("aria-label", state.writingFullscreen ? "Salir de pantalla completa" : "Abrir cuaderno en pantalla completa");
}

function startSpeechChallenge() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    state.speechMessage = "Este navegador no ofrece reconocimiento de voz. Abre la página directamente en Safari.";
    render();
    return;
  }

  if (activeRecognition) activeRecognition.abort();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  const recognition = new Recognition();
  activeRecognition = recognition;
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;
  state.speechStatus = "listening";
  state.speechTranscript = "";
  state.speechMessage = "Habla ahora, despacio y cerca del iPad.";
  render();

  recognition.onresult = (event) => {
    if (activeRecognition !== recognition) return;
    const alternatives = Array.from(event.results[event.results.length - 1]).map((item) => item.transcript);
    state.speechTranscript = alternatives[0] || "";
    state.speechStatus = "idle";
    activeRecognition = null;
    if (phraseWasUnderstood(alternatives, lessons[state.lessonIndex])) {
      state.speechMessage = "¡El iPad entendió la frase!";
      awardSuccess("I understood you", "Te entendí muy bien", "speech-quiz");
    } else {
      state.feedback = "try";
      state.speechMessage = "Casi. Escucha la frase y vuelve a intentarlo.";
      speakBilingual("Let's try again", "Vamos a intentarlo otra vez");
      render();
    }
  };
  recognition.onerror = (event) => {
    if (activeRecognition !== recognition || event.error === "aborted") return;
    activeRecognition = null;
    state.speechStatus = "idle";
    const messages = {
      "not-allowed": "Necesito permiso para usar el micrófono. Permítelo en Safari y vuelve a intentarlo.",
      "service-not-allowed": "Activa Siri en los ajustes del iPad para poder practicar con el micrófono.",
      "no-speech": "No escuché una frase. Acércate al iPad e inténtalo otra vez.",
      network: "No pude comprobar la voz ahora. Revisa la conexión e inténtalo otra vez.",
    };
    state.speechMessage = messages[event.error] || "No pude escuchar esta vez. Inténtalo otra vez.";
    render();
  };
  recognition.onend = () => {
    if (activeRecognition !== recognition) return;
    if (state.speechStatus === "listening") {
      activeRecognition = null;
      state.speechStatus = "idle";
      state.speechMessage = "No escuché la frase completa. Toca el micrófono para intentarlo otra vez.";
      render();
    }
  };

  try {
    recognition.start();
  } catch {
    activeRecognition = null;
    state.speechStatus = "idle";
    state.speechMessage = "El micrófono está ocupado. Espera un momento e inténtalo otra vez.";
    render();
  }
}

function goToLesson(index) {
  state.lessonIndex = (index + lessons.length) % lessons.length;
  resetLessonState();
  if (state.mode === "quiz") state.quizOptions = makeQuizOptions(state.lessonIndex);
  render();
}

function bindEvents() {
  document.querySelectorAll("[data-action]").forEach((element) => element.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const action = button.dataset.action;
    const lesson = lessons[state.lessonIndex];
    if (action === "achievements") { state.achievementsOpen = true; render(); }
    if (action === "close-modal") { if (event.target === button || button.tagName === "BUTTON") { state.achievementsOpen = false; render(); } }
    if (action === "close-celebration") closeCelebration();
    if (action === "mode") { state.mode = button.dataset.value; resetLessonState(); if (state.mode === "quiz") state.quizOptions = makeQuizOptions(state.lessonIndex); render(); }
    if (action === "hear-en") { speak(lesson.english, "en-US"); markPracticed(state.lessonIndex); checkNewAchievements(); save(); render(); }
    if (action === "hear-es") speak(lesson.spanish, "es-MX");
    if (action === "sound") { state.showSound = !state.showSound; render(); }
    if (action === "prev") goToLesson(state.lessonIndex - 1);
    if (action === "next") goToLesson(state.lessonIndex + 1);
    if (action === "lesson") goToLesson(Number(button.dataset.index));
    if (action === "start-mission") {
      state.missionOpen = !state.missionOpen;
      if (state.missionOpen) speak(lesson.english, "en-US");
      render();
    }
    if (action === "mission-listen") speak(lesson.english, "en-US");
    if (action === "mission-complete" && !state.familyMissions.includes(state.lessonIndex)) {
      state.familyMissions = [...state.familyMissions, state.lessonIndex];
      state.stars += 1;
      markPracticed(state.lessonIndex);
      checkNewAchievements();
      speakBilingual("Mission complete", "Misión cumplida");
      save();
      render();
    }
    if (action === "reset") resetAllProgress();
    if (action === "writing-style") { state.writingStyle = button.dataset.value; state.feedback = "idle"; state.writingFullscreen = false; render(); }
    if (action === "quiz-style") { state.quizStyle = button.dataset.value; state.feedback = "idle"; state.speechStatus = "idle"; state.speechTranscript = ""; state.speechMessage = ""; render(); }
    if (action === "toggle-handwriting-fullscreen") toggleHandwritingFullscreen(button);
    if (action === "speak-challenge") startSpeechChallenge();
    if (action === "hint") { state.answer = lesson.answer.slice(0, Math.max(2, Math.ceil(lesson.answer.length * 0.35))); render(); }
    if (action === "check") {
      const supplied = normalize(state.answer);
      const accepted = supplied === normalize(lesson.answer) || (state.lessonIndex === 4 && supplied === "i am six years old");
      if (accepted) awardSuccess("Great job", "Buen trabajo", "typing"); else { state.feedback = "try"; speakBilingual("Try again", "Inténtalo otra vez"); render(); }
    }
    if (action === "quiz") {
      if (Number(button.dataset.index) === state.lessonIndex) awardSuccess("Awesome", "Excelente", "quiz");
      else { state.feedback = "try"; speakBilingual("Try again", "Inténtalo otra vez"); render(); }
    }
  }));

  const answerInput = document.querySelector("#writing-answer");
  if (answerInput) answerInput.addEventListener("input", (event) => {
    state.answer = event.target.value;
    state.feedback = "idle";
    const check = document.querySelector('[data-action="check"]');
    if (check) check.disabled = !state.answer.trim();
  });
}

function setupCanvas() {
  const canvas = document.querySelector("#handwriting-canvas");
  if (!canvas) return;
  const practice = canvas.closest(".handwriting-practice");
  let drawing = false;
  let currentStroke = null;
  const strokes = [];

  const drawStrokes = () => {
    const bounds = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, bounds.width, bounds.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 5;
    context.strokeStyle = "#5a48cf";
    strokes.forEach((stroke) => {
      if (!stroke.length) return;
      context.beginPath();
      context.moveTo(stroke[0].x * bounds.width, stroke[0].y * bounds.height);
      stroke.slice(1).forEach((next) => context.lineTo(next.x * bounds.width, next.y * bounds.height));
      context.stroke();
    });
  };

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
    drawStrokes();
  };
  resize();
  canvasObserver = new ResizeObserver(resize);
  canvasObserver.observe(canvas);

  const point = (event) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height };
  };
  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    document.getSelection()?.removeAllRanges();
    canvas.setPointerCapture(event.pointerId);
    drawing = true;
    document.documentElement.classList.add("drawing-locked");
    currentStroke = [point(event)];
    strokes.push(currentStroke);
    const context = canvas.getContext("2d");
    const bounds = canvas.getBoundingClientRect();
    const next = currentStroke[0];
    context.beginPath();
    context.moveTo(next.x * bounds.width, next.y * bounds.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = event.pointerType === "pen" ? Math.max(3, event.pressure * 7) : 5;
    context.strokeStyle = "#5a48cf";
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    event.preventDefault();
    const context = canvas.getContext("2d");
    const bounds = canvas.getBoundingClientRect();
    const next = point(event);
    currentStroke.push(next);
    context.lineTo(next.x * bounds.width, next.y * bounds.height);
    context.stroke();
    document.querySelector('[data-action="clear-hand"]').disabled = false;
    document.querySelector('[data-action="finish-hand"]').disabled = false;
  });
  const stop = (event) => {
    drawing = false;
    currentStroke = null;
    document.documentElement.classList.remove("drawing-locked");
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);

  const clearButton = document.querySelector('[data-action="clear-hand"]');
  clearButton.addEventListener("click", () => {
    const context = canvas.getContext("2d");
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
    strokes.length = 0;
    const result = document.querySelector("#handwriting-result");
    if (result) result.innerHTML = "";
    clearButton.disabled = true;
    document.querySelector('[data-action="finish-hand"]').disabled = true;
  });

  document.querySelector('[data-action="finish-hand"]').addEventListener("click", () => {
    const result = document.querySelector("#handwriting-result");
    if (!result) return;
    result.innerHTML = `<div class="handwriting-review"><span aria-hidden="true">👀</span><div><strong>¡Muy bien! Compara tu frase con el modelo:</strong><small>${escapeHtml(lessons[state.lessonIndex].english)}</small></div><div class="review-actions"><button data-review="again">✏️ Seguir escribiendo</button><button class="review-confirm" data-review="done">✅ Sí, terminé</button></div></div>`;
    result.querySelector('[data-review="again"]').addEventListener("click", () => { result.innerHTML = ""; });
    result.querySelector('[data-review="done"]').addEventListener("click", () => awardSuccess("Beautiful writing", "Qué bonita escritura", "handwriting"));
  });

  const blockSelection = (event) => event.preventDefault();
  practice?.addEventListener("selectionstart", blockSelection);
  practice?.addEventListener("contextmenu", blockSelection);
}

document.addEventListener("selectionchange", () => {
  if (document.body.classList.contains("handwriting-active")) document.getSelection()?.removeAllRanges();
});

initializeAchievements();
render();
