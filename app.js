const APP_VERSION = "1.10.2";
const CHILD_NAME = "Isabelle";

const lessons = [
  { emoji: "👋", label: "Mi nombre", english: "My name is Isabelle.", spanish: "Me llamo Isabelle.", answer: "my name is isabelle", sound: "mai NEIM iz I-sa-BEL", color: "violet" },
  { emoji: "🎨", label: "Color favorito", english: "My favorite color is purple.", spanish: "Mi color favorito es morado.", answer: "my favorite color is purple", sound: "mai FEI-vrit KÁ-ler iz PÉR-pol", color: "purple" },
  { emoji: "⚽", label: "Deporte favorito", english: "My favorite sport is soccer.", spanish: "Mi deporte favorito es el fútbol.", answer: "my favorite sport is soccer", sound: "mai FEI-vrit sport iz SÁ-ker", color: "green" },
  { emoji: "🍝", label: "Comida favorita", english: "My favorite food is pasta.", spanish: "Mi comida favorita es la pasta.", answer: "my favorite food is pasta", sound: "mai FEI-vrit fud iz PÁS-ta", color: "coral" },
  { emoji: "6️⃣", label: "Mi edad", english: "I’m six years old.", spanish: "Tengo seis años.", answer: "i'm six years old", sound: "aim SIKS yirs OULD", color: "yellow" },
  { emoji: "🐾", label: "Cuando sea grande", english: "When I grow up, I want to be an animal rescuer.", spanish: "Cuando sea grande, quiero ser rescatista de animales.", answer: "when i grow up i want to be an animal rescuer", sound: "UEN ai GROU áp, ai UÁNT tu bi an Á-ni-mal RÉS-kiu-er", color: "aqua" },
  { emoji: "➗", label: "Materia favorita", english: "My favorite subject is math.", spanish: "Mi materia favorita es matemáticas.", answer: "my favorite subject is math", sound: "mai FEI-vrit SÁB-yekt iz MÁTH", color: "blue" },
  { emoji: "📖", label: "Libro favorito", english: "My favorite book is Mother of Sharks.", spanish: "Mi libro favorito es Mother of Sharks.", answer: "my favorite book is mother of sharks", sound: "mai FEI-vrit buk iz MÁ-der ov SHARKS", color: "navy" },
  { emoji: "🐰", label: "Animal favorito", english: "My favorite animal is rabbits.", spanish: "Mi animal favorito son los conejos.", answer: "my favorite animal is rabbits", sound: "mai FEI-vrit Á-ni-mal iz RÁ-bits", color: "pink" },
];

const STORAGE_KEY = "aventura-ingles-progress-v1";
let canvasObserver;
let activeRecognition;
let recognitionTimer;
const RECOGNITION_TIMEOUT_MS = 15000;
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
  examOpen: false,
  examMode: "writing",
  examStage: "intro",
  examIndex: 0,
  examAnswers: [],
  examInput: "",
  examStatus: "idle",
  examMessage: "",
  examResult: null,
  examBest: { writing: 0, speech: 0 },
  speechStatus: "idle",
  speechTranscript: "",
  speechMessage: "",
  stats: { typingWins: 0, scribbleWins: 0, handwritingWins: 0, speechWins: 0, quizWins: 0, examsCompleted: 0, perfectExams: 0 },
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
      scribbleWins: Number.isFinite(stored.stats?.scribbleWins) ? stored.stats.scribbleWins : 0,
      handwritingWins: Number.isFinite(stored.stats?.handwritingWins) ? stored.stats.handwritingWins : 0,
      speechWins: Number.isFinite(stored.stats?.speechWins) ? stored.stats.speechWins : 0,
      quizWins: Number.isFinite(stored.stats?.quizWins) ? stored.stats.quizWins : 0,
      examsCompleted: Number.isFinite(stored.stats?.examsCompleted) ? stored.stats.examsCompleted : 0,
      perfectExams: Number.isFinite(stored.stats?.perfectExams) ? stored.stats.perfectExams : 0,
    };
    state.examBest = {
      writing: Number.isFinite(stored.examBest?.writing) ? stored.examBest.writing : 0,
      speech: Number.isFinite(stored.examBest?.speech) ? stored.examBest.speech : 0,
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
    examBest: state.examBest,
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
  const lessonIndex = lessons.indexOf(lesson);
  const expected = [lesson.answer];
  if (lessonIndex === 0) expected.push("my name is isabel");
  if (lessonIndex === 4) expected.push("i am six years old");
  const primaryTranscript = transcripts[0] || "";
  return expected.some((answer) => {
    const speechText = (value) => normalize(value)
      .replace(/\bfavourite\b/g, "favorite")
      .replace(/\bi'm\b/g, "i am");
    const normalizedSpoken = speechText(primaryTranscript);
    const normalizedAnswer = speechText(answer);
    const expectedWords = normalizedAnswer.split(" ").filter(Boolean);
    const spokenWords = normalizedSpoken.split(" ").filter(Boolean);

    // A complete phrase is required. Matching words out of order or omitting
    // the important final answer (purple, soccer, Isabelle, etc.) must not pass.
    if (!normalizedSpoken || spokenWords.length !== expectedWords.length) return false;
    const wordScores = expectedWords.map((word, index) => similarity(spokenWords[index], word));
    const averageWordScore = wordScores.reduce((sum, score) => sum + score, 0) / wordScores.length;
    const finalWordScore = wordScores[wordScores.length - 1];
    return similarity(normalizedSpoken, normalizedAnswer) >= 0.82
      && averageWordScore >= 0.87
      && Math.min(...wordScores) >= 0.7
      && finalWordScore >= 0.78;
  });
}

function writtenAnswerIsCorrect(value, index) {
  const supplied = normalize(value).replace(/\bfavourite\b/g, "favorite");
  const accepted = [lessons[index].answer];
  if (index === 0) accepted.push("my name is isabel");
  if (index === 4) accepted.push("i am six years old");
  return accepted.some((answer) => supplied === normalize(answer));
}

function clearRecognitionTimer() {
  if (!recognitionTimer) return;
  clearTimeout(recognitionTimer);
  recognitionTimer = undefined;
}

function releaseRecognition(recognition) {
  if (activeRecognition !== recognition) return false;
  activeRecognition = null;
  clearRecognitionTimer();
  return true;
}

function cancelActiveRecognition() {
  const recognition = activeRecognition;
  activeRecognition = null;
  clearRecognitionTimer();
  if (!recognition) return;
  try { recognition.abort(); } catch { /* Safari may already have closed the microphone. */ }
}

function armRecognitionTimeout(recognition, channel) {
  clearRecognitionTimer();
  recognitionTimer = setTimeout(() => {
    if (!releaseRecognition(recognition)) return;
    try { recognition.abort(); } catch { /* The timeout still restores the interface. */ }
    if (channel === "exam") {
      state.examStatus = "idle";
      state.examMessage = "Se terminó el tiempo de escucha. Toca el micrófono para intentarlo otra vez.";
    } else {
      state.speechStatus = "idle";
      state.speechMessage = "Se terminó el tiempo de escucha. Toca el micrófono para intentarlo otra vez.";
    }
    render();
  }, RECOGNITION_TIMEOUT_MS);
}

function stopListening(channel) {
  cancelActiveRecognition();
  if (channel === "exam") {
    state.examStatus = "idle";
    state.examMessage = "Escucha detenida. Toca el micrófono cuando estés lista.";
  } else {
    state.speechStatus = "idle";
    state.speechMessage = "Escucha detenida. Toca el micrófono cuando estés lista.";
  }
  render();
}

function voiceFor(language) {
  const voices = speechSynthesis.getVoices();
  const isEnglish = language.toLowerCase().startsWith("en");
  const preferredNames = isEnglish
    ? ["samantha", "ava", "allison", "susan", "victoria", "zoe", "karen", "tessa", "moira", "fiona", "serena"]
    : ["paulina", "ximena", "valentina", "camila", "marisol", "paloma", "monica", "mónica", "angelica", "angélica", "soledad", "luciana", "francisca"];
  const localeOrder = isEnglish
    ? ["en-us", "en-ca", "en-au", "en-gb", "en"]
    : ["es-mx", "es-us", "es-419", "es-pr", "es-co", "es-ar", "es-cl", "es-pe", "es-ve", "es"];

  for (const locale of localeOrder) {
    const matchingLocale = voices.filter((voice) => voice.lang.toLowerCase() === locale || (locale.length === 2 && voice.lang.toLowerCase().startsWith(`${locale}-`)));
    const preferred = matchingLocale
      .filter((voice) => preferredNames.some((name) => voice.name.toLowerCase().includes(name)))
      .sort((left, right) => {
        const quality = (voice) => {
          const name = voice.name.toLowerCase();
          const preferredIndex = preferredNames.findIndex((candidate) => name.includes(candidate));
          const qualityPoints = /premium/.test(name) ? 500 : /enhanced/.test(name) ? 420 : /natural|neural/.test(name) ? 360 : 0;
          const preferredPoints = preferredIndex >= 0 ? 200 - preferredIndex : 0;
          return qualityPoints + preferredPoints + (voice.localService ? 20 : 0) + (voice.default ? 5 : 0);
        };
        return quality(right) - quality(left);
      })[0];
    if (preferred) return preferred;
  }

  // Leaving the voice unset is safer than selecting an arbitrary male voice.
  // iPadOS will use its female default for en-US and es-MX when available.
  return undefined;
}

function makeUtterance(text, language, rate = 0.86) {
  const message = new SpeechSynthesisUtterance(text);
  message.lang = language;
  message.rate = rate;
  message.pitch = 1;
  const voice = voiceFor(language);
  if (voice) message.voice = voice;
  return message;
}

function queueWithSpanishName(text, language, name, rate = 0.86) {
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
  speechSynthesis.speak(makeUtterance(`${english}!`, "en-US", 0.88));
  speechSynthesis.speak(makeUtterance(`${spanish},`, "es-MX", 0.88));
  speechSynthesis.speak(makeUtterance(`${name}!`, "es-MX", 0.88));
}

function lessonWords(lesson) {
  return lesson.english.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || [];
}

function speakPracticeWord(word, button) {
  if (!("speechSynthesis" in window)) return;
  cancelActiveRecognition();
  speechSynthesis.cancel();
  document.querySelectorAll(".word-chip.is-speaking").forEach((chip) => chip.classList.remove("is-speaking"));
  const useSpanishName = normalize(word) === "isabelle";
  // Some iPad voices announce a standalone "I" as "capital I". "Eye" has
  // the same English pronunciation while the visible lesson still shows I.
  const spokenWord = word === "I" ? "eye" : word;
  const message = makeUtterance(spokenWord, useSpanishName ? "es-MX" : "en-US", 0.72);
  const finish = () => button?.classList.remove("is-speaking");
  message.onstart = () => button?.classList.add("is-speaking");
  message.onend = finish;
  message.onerror = finish;
  speechSynthesis.speak(message);
}

function markPracticed(index) {
  if (!state.completed.includes(index)) state.completed = [...state.completed, index];
  save();
}

function recordWin(source) {
  if (source === "typing") state.stats.typingWins += 1;
  if (source === "scribble") state.stats.scribbleWins += 1;
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
    { id: "smart-pencil", icon: "✍️", name: "Pencil inteligente", detail: "El iPad reconoció tu escritura", earned: state.stats.scribbleWins >= 1 },
    { id: "magic-pencil", icon: "✏️", name: "Lápiz mágico", detail: "Escribiste una frase a mano", earned: state.stats.handwritingWins >= 1 },
    { id: "quiz-champion", icon: "⚡", name: "Campeona de retos", detail: "Ganaste 3 retos", earned: state.stats.quizWins >= 3 },
    { id: "super-ear", icon: "🎧", name: "Súper oído", detail: "Practicaste 3 frases", earned: state.completed.length >= 3 },
    { id: "exam-brave", icon: "📝", name: "Valiente del examen", detail: "Terminaste tu primer examen", earned: state.stats.examsCompleted >= 1 },
    { id: "smart-girl", icon: "🧠", name: "Chica súper inteligente", detail: "Conseguiste 7 estrellas", earned: state.stars >= 7 },
    { id: "unstoppable", icon: "🌈", name: "Isabelle imparable", detail: "Conseguiste 12 estrellas", earned: state.stars >= 12 },
    { id: "explorer", icon: "🏆", name: "English Explorer", detail: "Practicaste todas las frases", earned: state.completed.length === lessons.length },
    { id: "perfect-exam", icon: "👑", name: "Maestra del inglés", detail: "¡Sacaste 9 de 9 en el examen!", earned: state.stats.perfectExams >= 1 },
  ];
}

function checkNewAchievements(showPopup = true) {
  const newlyEarned = achievements().filter((item) => item.earned && !state.unlockedAchievements.includes(item.id));
  if (!newlyEarned.length) return;
  state.unlockedAchievements = [...state.unlockedAchievements, ...newlyEarned.map((item) => item.id)];
  if (!showPopup) return;
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
      <button class="secondary" data-action="hear-es"><span aria-hidden="true">🇵🇷</span> En español</button>
      <button class="text-button" data-action="sound">¿Cómo se pronuncia?</button>
    </div>
    <section class="word-by-word" aria-label="Practicar palabra por palabra">
      <div class="word-by-word-heading"><span aria-hidden="true">🧩</span><div><strong>Palabra por palabra</strong><small>Toca una palabra para escucharla despacio.</small></div></div>
      <div class="word-chips">${lessonWords(lesson).map((word, index) => `${index ? `<span class="word-divider" aria-hidden="true">−</span>` : ""}<button class="word-chip" data-action="hear-word" data-index="${index}" aria-label="Escuchar ${escapeHtml(word)}"><span aria-hidden="true">🔊</span>${escapeHtml(word)}</button>`).join("")}</div>
    </section>`;

  if (state.mode === "write") return `
    <div class="writing-zone">
      <p class="write-prompt">Escribe en inglés:</p>
      <h2>${escapeHtml(lesson.spanish)}</h2>
      <div class="writing-style-tabs" role="group" aria-label="Forma de escribir">
        <button class="${state.writingStyle === "keyboard" ? "active" : ""}" data-action="writing-style" data-value="keyboard">⌨️ Teclado</button>
        <button class="${state.writingStyle === "scribble" ? "active" : ""}" data-action="writing-style" data-value="scribble">✍️ Pencil inteligente</button>
        <button class="${state.writingStyle === "hand" ? "active" : ""}" data-action="writing-style" data-value="hand">🖐️ Cuaderno libre</button>
      </div>
      ${state.writingStyle === "keyboard" ? `
        <label for="writing-answer">Tu respuesta</label>
        <textarea id="writing-answer" placeholder="Escribe aquí…" autocapitalize="sentences" spellcheck="false">${escapeHtml(state.answer)}</textarea>
        <div class="writing-help">
          <button class="hint-button" data-action="hint">💡 Dame una pista</button>
          <button class="primary" data-action="check" ${state.answer.trim() ? "" : "disabled"}>Comprobar</button>
        </div>` : state.writingStyle === "scribble" ? `
        <div class="scribble-practice ${state.writingFullscreen ? "is-fullscreen" : ""}">
          <div class="handwriting-focus-header">
            <p class="handwriting-instruction"><span aria-hidden="true">✍️</span> Toca el recuadro con el Apple Pencil y escribe en inglés.</p>
            <button class="expand-writing" data-action="toggle-writing-fullscreen" aria-label="${state.writingFullscreen ? "Salir de pantalla completa" : "Abrir Pencil inteligente en pantalla completa"}">${state.writingFullscreen ? "✕ Salir" : "⛶ Pantalla completa"}</button>
          </div>
          <div class="scribble-fullscreen-prompt"><small>Escribe en inglés:</small><strong>${escapeHtml(lesson.spanish)}</strong></div>
          <div class="scribble-card">
            <span aria-hidden="true">✍️</span><label for="writing-answer">Escribe aquí con Apple Pencil</label>
            <textarea id="writing-answer" class="scribble-answer" lang="en" placeholder="El iPad convertirá tu escritura en texto…" autocapitalize="sentences" spellcheck="false">${escapeHtml(state.answer)}</textarea>
            <small>Scribble convierte tu letra en palabras. Revisa el texto convertido antes de comprobar.</small>
          </div>
          <div class="writing-help scribble-actions"><button class="hint-button" data-action="clear-writing" ${state.answer.trim() ? "" : "disabled"}>🧽 Borrar</button><button class="primary" data-action="check" ${state.answer.trim() ? "" : "disabled"}>✓ Comprobar escritura</button></div>
        </div>` : `
        <div class="handwriting-practice ${state.writingFullscreen ? "is-fullscreen" : ""}">
          <div class="handwriting-focus-header">
            <p class="handwriting-instruction"><span aria-hidden="true">☝️</span> Escribe la frase con tu dedo o Apple Pencil.</p>
            <button class="expand-writing" data-action="toggle-writing-fullscreen" aria-label="${state.writingFullscreen ? "Salir de pantalla completa" : "Abrir cuaderno en pantalla completa"}">${state.writingFullscreen ? "✕ Salir" : "⛶ Pantalla completa"}</button>
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
        <div class="speech-actions"><button class="secondary" data-action="hear-en">🔊 Escuchar una pista</button><button class="mic-button ${state.speechStatus === "listening" ? "listening" : ""}" data-action="${state.speechStatus === "listening" ? "stop-speech" : "speak-challenge"}">${state.speechStatus === "listening" ? "⏹ Detener escucha" : "🎤 Hablar ahora"}</button></div>
        ${state.speechTranscript ? `<p class="heard-text"><strong>Escuché:</strong> “${escapeHtml(state.speechTranscript)}”</p>` : ""}
        ${state.speechMessage ? `<p class="speech-message">${escapeHtml(state.speechMessage)}</p>` : ""}
        <small>Debe decir la frase completa. Acepta pequeñas diferencias de pronunciación, pero no palabras faltantes. Comprueba las palabras entendidas; no califica el acento profesionalmente.</small>
      </section>` : `
      <p class="write-prompt">Toca la frase que significa:</p>
      <h2>${escapeHtml(lesson.spanish)}</h2>
      <div class="quiz-options">${state.quizOptions.map((index) => `<button data-action="quiz" data-index="${index}">${escapeHtml(lessons[index].english)}</button>`).join("")}</div>`}
  </div>`;
}

function examHtml() {
  if (!state.examOpen) return "";
  const total = lessons.length;

  if (state.examStage === "intro") return `<div class="exam-overlay"><section class="exam-shell exam-intro" role="dialog" aria-modal="true" aria-labelledby="exam-title">
    <button class="exam-close" data-action="close-exam" aria-label="Cerrar examen">×</button>
    <div class="exam-title-icon" aria-hidden="true">🎓</div><p class="exam-kicker">MISIÓN EXTRA</p><h2 id="exam-title">El gran examen de Isabelle</h2>
    <p class="exam-lead">Nueve preguntas. Las respuestas se revisan solamente al final.</p>
    <div class="exam-tabs" role="group" aria-label="Tipo de examen"><button class="${state.examMode === "writing" ? "active" : ""}" data-action="exam-mode" data-value="writing">✍️ Escritura</button><button class="${state.examMode === "speech" ? "active" : ""}" data-action="exam-mode" data-value="speech">🎤 Hablar</button></div>
    <div class="exam-best"><span>Mejor escritura <strong>${state.examBest.writing}/${total}</strong></span><span>Mejor voz <strong>${state.examBest.speech}/${total}</strong></span></div>
    <ol class="exam-rules"><li><span>1</span>Lee la frase en español.</li><li><span>2</span>${state.examMode === "writing" ? "Escríbela" : "Dila"} en inglés.</li><li><span>3</span>Descubre tu puntuación al final.</li></ol>
    <button class="exam-primary" data-action="begin-exam">Comenzar examen <span aria-hidden="true">→</span></button>
  </section></div>`;

  if (state.examStage === "questions") {
    const lesson = lessons[state.examIndex];
    const progress = Math.round((state.examIndex / total) * 100);
    return `<div class="exam-overlay"><section class="exam-shell exam-question" role="dialog" aria-modal="true" aria-labelledby="exam-question-title">
      <button class="exam-close" data-action="close-exam" aria-label="Salir del examen">×</button>
      <div class="exam-progress-copy"><span>${state.examMode === "writing" ? "✍️ EXAMEN DE ESCRITURA" : "🎤 EXAMEN DE VOZ"}</span><strong>Pregunta ${state.examIndex + 1} de ${total}</strong></div>
      <div class="exam-progress"><span style="width:${progress}%"></span></div>
      <div class="exam-prompt"><span aria-hidden="true">${lesson.emoji}</span><p>${escapeHtml(lesson.label)}</p><h2 id="exam-question-title">${escapeHtml(lesson.spanish)}</h2></div>
      ${state.examMode === "writing" ? `<label class="exam-answer-label" for="exam-answer">Escribe la frase completa en inglés:</label><textarea id="exam-answer" class="exam-answer" placeholder="Escribe tu respuesta…" autocapitalize="sentences" spellcheck="false">${escapeHtml(state.examInput)}</textarea><button class="exam-primary" data-action="exam-submit-writing" ${state.examInput.trim() ? "" : "disabled"}>Guardar y continuar <span aria-hidden="true">→</span></button>` : `<div class="exam-speech-box"><p>Di la frase completa en inglés.</p><button class="exam-mic ${state.examStatus === "listening" ? "listening" : ""}" data-action="${state.examStatus === "listening" ? "stop-exam-speech" : "exam-speak"}">${state.examStatus === "listening" ? "⏹ Detener escucha" : "🎤 Hablar ahora"}</button>${state.examMessage ? `<small>${escapeHtml(state.examMessage)}</small>` : ""}</div>`}
      <p class="exam-secret"><span aria-hidden="true">🤫</span> No mostraremos si está correcta hasta terminar.</p>
    </section></div>`;
  }

  const result = state.examResult;
  const percent = Math.round((result.score / total) * 100);
  if (result.perfect) return `<div class="exam-overlay perfect-overlay"><section class="exam-shell exam-perfect" role="dialog" aria-modal="true" aria-labelledby="perfect-title">
    <div class="balloons" aria-hidden="true"><span>🎈</span><span>🎈</span><span>🎈</span><span>🎈</span><span>🎈</span><span>🎈</span></div>
    <div class="perfect-confetti" aria-hidden="true">✨ ⭐ 🌈 ⭐ ✨</div><span class="perfect-crown" aria-hidden="true">👑</span><p>¡EXAMEN PERFECTO!</p><h2 id="perfect-title">¡${total} de ${total}, ${CHILD_NAME}!</h2><strong>Maestra del inglés</strong><div class="perfect-score">100%</div><small>¡Eres inteligente, valiente y absolutamente increíble!</small>
    <div class="exam-result-actions"><button data-action="retry-exam">Hacerlo otra vez</button><button class="exam-primary" data-action="finish-exam">🎉 ¡Celebrar!</button></div>
  </section></div>`;

  return `<div class="exam-overlay"><section class="exam-shell exam-results" role="dialog" aria-modal="true" aria-labelledby="results-title">
    <div class="result-medal" aria-hidden="true">🏅</div><p class="exam-kicker">EXAMEN TERMINADO</p><h2 id="results-title">Puntuación: ${result.score} de ${total}</h2><div class="result-percent">${percent}%</div><p>¡Buen esfuerzo, ${CHILD_NAME}! Ahora ya sabes exactamente qué practicar.</p>
    <div class="missed-list"><h3>Frases para volver a practicar</h3>${result.missed.map((item) => `<article><span>${lessons[item.index].emoji}</span><div><strong>${escapeHtml(lessons[item.index].spanish)}</strong><small>Respuesta correcta: ${escapeHtml(lessons[item.index].english)}</small><em>${state.examMode === "speech" ? "El iPad escuchó" : "Escribiste"}: ${escapeHtml(item.response || "Sin respuesta")}</em></div></article>`).join("")}</div>
    <div class="exam-result-actions"><button data-action="practice-missed">← Volver a practicar</button><button class="exam-primary" data-action="retry-exam">Intentar el examen otra vez</button></div>
  </section></div>`;
}

function prepareExam(stage = "intro") {
  cancelActiveRecognition();
  state.examStage = stage;
  state.examIndex = 0;
  state.examAnswers = [];
  state.examInput = "";
  state.examStatus = "idle";
  state.examMessage = "";
  state.examResult = null;
}

function recordExamAnswer(response, correct) {
  const answers = [...state.examAnswers, { index: state.examIndex, response, correct }];
  state.examAnswers = answers;
  state.examInput = "";
  state.examMessage = "";
  if (state.examIndex < lessons.length - 1) {
    state.examIndex += 1;
    render();
  } else {
    finishExam(answers);
  }
}

function finishExam(answers) {
  const score = answers.filter((answer) => answer.correct).length;
  const missed = answers.filter((answer) => !answer.correct);
  const perfect = score === lessons.length;
  state.examResult = { score, missed, perfect };
  state.examStage = "result";
  state.examBest[state.examMode] = Math.max(state.examBest[state.examMode], score);
  state.stats.examsCompleted += 1;
  answers.filter((answer) => answer.correct).forEach((answer) => {
    if (!state.completed.includes(answer.index)) state.completed.push(answer.index);
  });
  if (perfect) {
    state.stats.perfectExams += 1;
    state.stars += 5;
    speakBilingual("Perfect exam", "Examen perfecto");
  } else {
    speakBilingual("Exam complete", "Examen terminado");
  }
  checkNewAchievements(false);
  save();
  render();
}

function closeExam() {
  if (state.examStage === "questions" && !window.confirm("¿Quieres salir? Las respuestas de este intento no se guardarán.")) return;
  cancelActiveRecognition();
  state.examOpen = false;
  prepareExam("intro");
  render();
}

function practiceMissed() {
  const firstMissed = state.examResult?.missed?.[0]?.index ?? 0;
  const examMode = state.examMode;
  state.examOpen = false;
  prepareExam("intro");
  state.lessonIndex = firstMissed;
  state.mode = examMode === "writing" ? "write" : "quiz";
  state.writingStyle = "keyboard";
  state.quizStyle = "speech";
  resetLessonState();
  render();
}

function startExamSpeech() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { state.examMessage = "Abre la página en Safari para usar el examen de voz."; render(); return; }
  cancelActiveRecognition();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  const questionIndex = state.examIndex;
  const recognition = new Recognition();
  activeRecognition = recognition;
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  state.examStatus = "listening";
  state.examMessage = "Habla ahora, despacio y cerca del iPad. La escucha se detiene sola.";
  render();
  recognition.onresult = (event) => {
    if (!releaseRecognition(recognition)) return;
    const alternatives = Array.from(event.results[event.results.length - 1]).map((item) => item.transcript);
    state.examStatus = "idle";
    const correct = phraseWasUnderstood(alternatives, lessons[questionIndex]);
    recordExamAnswer(alternatives[0] || "", correct);
  };
  recognition.onnomatch = () => {
    if (!releaseRecognition(recognition)) return;
    state.examStatus = "idle";
    state.examMessage = "No pude reconocer la frase. Toca el micrófono para intentarlo otra vez.";
    render();
  };
  recognition.onerror = (event) => {
    if (activeRecognition !== recognition) return;
    releaseRecognition(recognition);
    state.examStatus = "idle";
    if (event.error === "aborted") { state.examMessage = "Escucha detenida. Toca el micrófono cuando estés lista."; render(); return; }
    const messages = { "not-allowed": "Permite el micrófono en Safari para continuar.", "service-not-allowed": "Activa Siri en los ajustes del iPad.", "no-speech": "No escuché una frase. Inténtalo otra vez.", network: "No pude usar el micrófono ahora. Revisa la conexión." };
    state.examMessage = messages[event.error] || "No pude escuchar. Inténtalo otra vez.";
    render();
  };
  recognition.onspeechend = () => {
    if (activeRecognition !== recognition) return;
    try { recognition.stop(); } catch { /* Wait for onresult, onerror, or the safety timeout. */ }
  };
  recognition.onend = () => {
    if (!releaseRecognition(recognition)) return;
    if (state.examStatus === "listening") { state.examStatus = "idle"; state.examMessage = "No escuché la frase completa. Inténtalo otra vez."; render(); }
  };
  try { recognition.start(); armRecognitionTimeout(recognition, "exam"); } catch { releaseRecognition(recognition); state.examStatus = "idle"; state.examMessage = "El micrófono está ocupado. Inténtalo otra vez."; render(); }
}

function render() {
  if (canvasObserver) canvasObserver.disconnect();
  document.body.classList.toggle("handwriting-active", state.mode === "write" && state.writingStyle === "hand");
  document.body.classList.toggle("handwriting-fullscreen", state.writingFullscreen);
  const lesson = lessons[state.lessonIndex];
  const progress = Math.round((state.completed.length / lessons.length) * 100);
  const earned = achievements().filter((item) => item.earned).length;
  const dots = lessons.map((_, index) => `<button data-action="lesson" data-index="${index}" class="${index === state.lessonIndex ? "current" : state.completed.includes(index) ? "done" : ""}" aria-label="Ir a frase ${index + 1}"></button>`).join("");

  document.querySelector("#app").innerHTML = `
    <main class="app-shell">
      <div class="storybook-decor" aria-hidden="true">
        <img class="decor-butterfly butterfly-one" src="assets/openmoji/butterfly.svg" alt="" draggable="false" />
        <img class="decor-butterfly butterfly-two" src="assets/openmoji/butterfly.svg" alt="" draggable="false" />
        <span class="decor-heart heart-one">♥</span><span class="decor-heart heart-two">♥</span>
        <span class="decor-twinkle twinkle-one">✦</span><span class="decor-twinkle twinkle-two">✦</span>
      </div>
      <header class="topbar">
        <a class="brand" href="#top" aria-label="Aventura de Inglés, inicio"><span class="brand-mark" aria-hidden="true">🪽</span><span><strong>Aventura</strong><small>de Inglés</small></span></a>
        <div class="top-actions"><button class="star-pill" data-action="achievements" aria-label="${state.stars} estrellas. Ver logros"><span aria-hidden="true">⭐</span> ${state.stars}</button><div class="avatar" id="avatar" aria-label="Perfil de ${escapeHtml(state.childName)}">${escapeHtml((state.childName || "I").slice(0, 1).toUpperCase())}</div></div>
      </header>

      <section class="welcome" id="top"><img class="welcome-rainbow" src="assets/openmoji/rainbow.svg" alt="" aria-hidden="true" draggable="false" /><div class="welcome-copy"><p class="eyebrow">MISIÓN DEL DÍA · 10 MINUTOS</p><h1>¡Hola, <span class="fixed-name">${CHILD_NAME}</span>! <span aria-hidden="true">👋</span></h1><p>Hoy vamos a escuchar, hablar y escribir en inglés.</p><div class="happy-trail" aria-hidden="true"><span>♥</span><span>✦</span><span>♥</span><span>✦</span><span>♥</span></div></div><button class="achievements-button" data-action="achievements"><span aria-hidden="true">🏅</span><span><strong>Mis logros</strong><small>${earned} de ${achievements().length}</small></span></button></section>

      <section class="progress-card" aria-label="Progreso: ${progress}%"><div class="progress-copy"><span>Tu aventura de hoy</span><strong>${state.completed.length} / ${lessons.length} frases</strong></div><div class="progress-track"><span style="width:${progress}%"></span></div><span class="progress-percent">${progress}%</span></section>

      <nav class="mode-tabs" aria-label="Modos de práctica">
        <button class="${state.mode === "learn" ? "active" : ""}" data-action="mode" data-value="learn"><span aria-hidden="true">🎧</span> Escucha</button>
        <button class="${state.mode === "write" ? "active" : ""}" data-action="mode" data-value="write"><span aria-hidden="true">✍️</span> Escribe</button>
        <button class="${state.mode === "quiz" ? "active" : ""}" data-action="mode" data-value="quiz"><span aria-hidden="true">⚡</span> Reto</button>
      </nav>

      <section class="lesson-card ${lesson.color}" aria-live="polite">
        <div class="lesson-visual" aria-hidden="true"><div class="spark one">✦</div><div class="spark two">♥</div><div class="spark three">✦</div><span>${lesson.emoji}</span><small>${state.lessonIndex + 1} de ${lessons.length}</small></div>
        <div class="lesson-content"><p class="lesson-label">${lesson.label}</p>${modeContent(lesson)}${feedbackHtml()}<div class="card-nav"><button data-action="prev" aria-label="Frase anterior">←</button><div>${dots}</div><button data-action="next" aria-label="Frase siguiente">→</button></div></div>
      </section>

      <section class="tiny-mission exam-launch-card">
        <div class="mascot-wrap"><img src="assets/og.png" alt="Colibrí explorador de Aventura de Inglés" /></div>
        <div><span>MISIÓN EXTRA · EXAMEN</span><h2>El gran examen de Isabelle</h2><p>9 preguntas · Escritura o voz · Puntuación al final</p><div class="exam-mini-scores"><small>✍️ ${state.examBest.writing}/9</small><small>🎤 ${state.examBest.speech}/9</small></div></div>
        <button data-action="open-exam">Entrar al examen <span aria-hidden="true">→</span></button>
      </section>
      <footer><p><span aria-hidden="true">🌈</span> Hecho con 💜 para aprender en familia <span aria-hidden="true">🦋</span></p><small>El progreso se guarda en este dispositivo. El micrófono lo gestiona Safari. · Versión ${APP_VERSION}</small><small class="asset-credit">Decoraciones de <a href="https://openmoji.org/" target="_blank" rel="noopener">OpenMoji</a> · CC BY-SA 4.0</small></footer>

      ${state.achievementsOpen ? `<div class="modal-backdrop" data-action="close-modal"><section class="achievement-modal" role="dialog" aria-modal="true" aria-labelledby="achievement-title"><button class="close" data-action="close-modal" aria-label="Cerrar">×</button><span class="big-medal" aria-hidden="true">🏅</span><h2 id="achievement-title">Mis logros</h2><p>Cada intento cuenta. ¡Sigue explorando!</p><div class="achievement-grid">${achievements().map((item) => `<article class="${item.earned ? "earned" : "locked"}"><span>${item.earned ? item.icon : "🔒"}</span><strong>${item.name}</strong><small>${item.earned ? item.detail : "Sigue practicando"}</small></article>`).join("")}</div><button class="primary full" data-action="close-modal">¡Vamos a practicar!</button><button class="reset-button" data-action="reset">↻ Reiniciar todo el progreso</button></section></div>` : ""}
      ${state.celebration ? `<div class="modal-backdrop celebration-backdrop"><section class="celebration-card" role="dialog" aria-modal="true" aria-labelledby="celebration-title"><div class="confetti" aria-hidden="true">⭐ ✨ 🌈 ✨ ⭐</div><span class="celebration-icon" aria-hidden="true">${state.celebration.icon}</span><p>NUEVO LOGRO</p><h2 id="celebration-title">${escapeHtml(state.celebration.name)}</h2><strong>${escapeHtml(state.celebration.detail)}</strong><small>¡Estamos muy orgullosos de ti, ${CHILD_NAME}!</small><button class="primary full" data-action="close-celebration">¡Seguir aprendiendo!</button></section></div>` : ""}
      ${examHtml()}
    </main>`;

  bindEvents();
  if (state.mode === "write" && state.writingStyle === "hand") setupCanvas();
}

function resetLessonState() {
  cancelActiveRecognition();
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
  const confirmed = window.confirm("¿Quieres borrar todas las estrellas, logros, exámenes y progreso de prueba?");
  if (!confirmed) return;
  cancelActiveRecognition();
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
    examOpen: false,
    examMode: "writing",
    examStage: "intro",
    examIndex: 0,
    examAnswers: [],
    examInput: "",
    examStatus: "idle",
    examMessage: "",
    examResult: null,
    examBest: { writing: 0, speech: 0 },
    speechStatus: "idle",
    speechTranscript: "",
    speechMessage: "",
    stats: { typingWins: 0, scribbleWins: 0, handwritingWins: 0, speechWins: 0, quizWins: 0, examsCompleted: 0, perfectExams: 0 },
  };
  save();
  render();
}

function toggleWritingFullscreen(button) {
  state.writingFullscreen = !state.writingFullscreen;
  const practice = document.querySelector(".handwriting-practice, .scribble-practice");
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

  cancelActiveRecognition();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  const recognition = new Recognition();
  activeRecognition = recognition;
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  state.speechStatus = "listening";
  state.speechTranscript = "";
  state.speechMessage = "Habla ahora, despacio y cerca del iPad. La escucha se detiene sola.";
  render();

  recognition.onresult = (event) => {
    if (!releaseRecognition(recognition)) return;
    const alternatives = Array.from(event.results[event.results.length - 1]).map((item) => item.transcript);
    state.speechTranscript = alternatives[0] || "";
    state.speechStatus = "idle";
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
  recognition.onnomatch = () => {
    if (!releaseRecognition(recognition)) return;
    state.speechStatus = "idle";
    state.speechMessage = "No pude reconocer la frase. Toca el micrófono para intentarlo otra vez.";
    render();
  };
  recognition.onerror = (event) => {
    if (activeRecognition !== recognition) return;
    releaseRecognition(recognition);
    state.speechStatus = "idle";
    if (event.error === "aborted") { state.speechMessage = "Escucha detenida. Toca el micrófono cuando estés lista."; render(); return; }
    const messages = {
      "not-allowed": "Necesito permiso para usar el micrófono. Permítelo en Safari y vuelve a intentarlo.",
      "service-not-allowed": "Activa Siri en los ajustes del iPad para poder practicar con el micrófono.",
      "no-speech": "No escuché una frase. Acércate al iPad e inténtalo otra vez.",
      network: "No pude comprobar la voz ahora. Revisa la conexión e inténtalo otra vez.",
    };
    state.speechMessage = messages[event.error] || "No pude escuchar esta vez. Inténtalo otra vez.";
    render();
  };
  recognition.onspeechend = () => {
    if (activeRecognition !== recognition) return;
    try { recognition.stop(); } catch { /* Wait for onresult, onerror, or the safety timeout. */ }
  };
  recognition.onend = () => {
    if (!releaseRecognition(recognition)) return;
    if (state.speechStatus === "listening") {
      state.speechStatus = "idle";
      state.speechMessage = "No escuché la frase completa. Toca el micrófono para intentarlo otra vez.";
      render();
    }
  };

  try {
    recognition.start();
    armRecognitionTimeout(recognition, "challenge");
  } catch {
    releaseRecognition(recognition);
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
    if (action === "hear-en") { if (state.speechStatus === "listening") { cancelActiveRecognition(); state.speechStatus = "idle"; } speak(lesson.english, "en-US"); markPracticed(state.lessonIndex); checkNewAchievements(); save(); render(); }
    if (action === "hear-es") speak(lesson.spanish, "es-MX");
    if (action === "hear-word") speakPracticeWord(lessonWords(lesson)[Number(button.dataset.index)], button);
    if (action === "sound") { state.showSound = !state.showSound; render(); }
    if (action === "prev") goToLesson(state.lessonIndex - 1);
    if (action === "next") goToLesson(state.lessonIndex + 1);
    if (action === "lesson") goToLesson(Number(button.dataset.index));
    if (action === "open-exam") { state.examOpen = true; prepareExam("intro"); render(); }
    if (action === "close-exam") closeExam();
    if (action === "exam-mode" && state.examStage === "intro") { state.examMode = button.dataset.value; render(); }
    if (action === "begin-exam") { prepareExam("questions"); render(); }
    if (action === "exam-submit-writing" && state.examInput.trim()) recordExamAnswer(state.examInput, writtenAnswerIsCorrect(state.examInput, state.examIndex));
    if (action === "exam-speak") startExamSpeech();
    if (action === "stop-exam-speech") stopListening("exam");
    if (action === "retry-exam") { prepareExam("questions"); render(); }
    if (action === "practice-missed") practiceMissed();
    if (action === "finish-exam") { state.examOpen = false; prepareExam("intro"); render(); }
    if (action === "reset") resetAllProgress();
    if (action === "writing-style") { state.writingStyle = button.dataset.value; state.answer = ""; state.feedback = "idle"; state.writingFullscreen = false; render(); }
    if (action === "quiz-style") { cancelActiveRecognition(); state.quizStyle = button.dataset.value; state.feedback = "idle"; state.speechStatus = "idle"; state.speechTranscript = ""; state.speechMessage = ""; render(); }
    if (action === "toggle-writing-fullscreen") toggleWritingFullscreen(button);
    if (action === "clear-writing") { state.answer = ""; state.feedback = "idle"; render(); }
    if (action === "speak-challenge") startSpeechChallenge();
    if (action === "stop-speech") stopListening("challenge");
    if (action === "hint") { state.answer = lesson.answer.slice(0, Math.max(2, Math.ceil(lesson.answer.length * 0.35))); render(); }
    if (action === "check") {
      const accepted = writtenAnswerIsCorrect(state.answer, state.lessonIndex);
      const source = state.writingStyle === "scribble" ? "scribble" : "typing";
      if (accepted) awardSuccess("Great job", "Buen trabajo", source); else { state.feedback = "try"; speakBilingual("Try again", "Inténtalo otra vez"); render(); }
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
    const clear = document.querySelector('[data-action="clear-writing"]');
    if (clear) clear.disabled = !state.answer.trim();
  });

  const examInput = document.querySelector("#exam-answer");
  if (examInput) examInput.addEventListener("input", (event) => {
    state.examInput = event.target.value;
    const submit = document.querySelector('[data-action="exam-submit-writing"]');
    if (submit) submit.disabled = !state.examInput.trim();
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
    result.innerHTML = `<div class="adult-review"><span aria-hidden="true">👨‍👩‍👧</span><div><p>SOLO PARA ADULTOS</p><strong>Isabelle, ahora dale el iPad a un adulto para que revise tu respuesta.</strong><small>El adulto debe compararla con: ${escapeHtml(lessons[state.lessonIndex].english)}</small></div><div class="review-actions"><button data-review="practice">✏️ Necesita practicar</button><button class="review-confirm" data-review="correct">✅ Está correcta</button></div></div>`;
    speak(`${CHILD_NAME}, ahora dale el iPad a un adulto para que revise tu respuesta.`, "es-MX");
    result.querySelector('[data-review="practice"]').addEventListener("click", () => {
      result.innerHTML = `<div class="adult-review compact"><span aria-hidden="true">🌱</span><div><strong>¡Está bien! Sigue practicando un poquito más.</strong></div></div>`;
      speak("Está bien. Vamos a practicar un poquito más.", "es-MX");
    });
    result.querySelector('[data-review="correct"]').addEventListener("click", () => awardSuccess("Beautiful writing", "Qué bonita escritura", "handwriting"));
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
