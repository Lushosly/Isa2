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
let state = {
  mode: "learn",
  lessonIndex: 0,
  completed: [],
  stars: 0,
  answer: "",
  feedback: "idle",
  showSound: false,
  quizOptions: [0, 3, 6],
  childName: "Isabelle",
  achievementsOpen: false,
  writingStyle: "keyboard",
  familyMissions: [],
  missionOpen: false,
};

try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  if (stored) {
    state.completed = Array.isArray(stored.completed) ? stored.completed : [];
    state.stars = Number.isFinite(stored.stars) ? stored.stars : 0;
    state.childName = stored.childName && stored.childName !== "exploradora" ? stored.childName : "Isabelle";
    state.familyMissions = Array.isArray(stored.familyMissions) ? stored.familyMissions : [];
  }
} catch {
  // Start a fresh local adventure when saved progress cannot be read.
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed: state.completed, stars: state.stars, childName: state.childName, familyMissions: state.familyMissions }));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function normalize(value) {
  return value.toLowerCase().replace(/[’]/g, "'").replace(/[.!?]/g, "").replace(/\s+/g, " ").trim();
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
    const preferred = matchingLocale.find((voice) => preferredNames.some((name) => voice.name.toLowerCase().includes(name)));
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
  message.pitch = 1.06;
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

function awardSuccess(english = "Great job", spanish = "Buen trabajo") {
  if (state.feedback !== "correct") state.stars += 1;
  state.feedback = "correct";
  markPracticed(state.lessonIndex);
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
    { icon: "⭐", name: "Primera estrella", earned: state.stars >= 1 },
    { icon: "🎧", name: "Súper oído", earned: state.completed.length >= 3 },
    { icon: "✍️", name: "Gran escritora", earned: state.stars >= 5 },
    { icon: "🏆", name: "English Explorer", earned: state.completed.length === lessons.length },
  ];
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
        <div class="handwriting-practice">
          <p class="handwriting-instruction"><span aria-hidden="true">☝️</span> Repasa la frase con tu dedo o Apple Pencil.</p>
          <div class="writing-paper">
            <div class="trace-text" aria-hidden="true">${escapeHtml(lesson.english)}</div>
            <canvas id="handwriting-canvas" aria-label="Área para escribir a mano: ${escapeHtml(lesson.english)}"></canvas>
          </div>
          <div class="writing-help handwriting-actions">
            <button class="hint-button" data-action="clear-hand" disabled>🧽 Borrar</button>
            <button class="primary" data-action="finish-hand" disabled>✓ Terminé</button>
          </div>
        </div>`}
    </div>`;

  return `<div class="quiz-zone">
    <p class="write-prompt">Toca la frase que significa:</p>
    <h2>${escapeHtml(lesson.spanish)}</h2>
    <div class="quiz-options">${state.quizOptions.map((index) => `<button data-action="quiz" data-index="${index}">${escapeHtml(lessons[index].english)}</button>`).join("")}</div>
  </div>`;
}

function render() {
  if (canvasObserver) canvasObserver.disconnect();
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

      <section class="welcome" id="top"><div><p class="eyebrow">MISIÓN DEL DÍA · 10 MINUTOS</p><h1>¡Hola, <input id="child-name" aria-label="Nombre de la niña" value="${escapeHtml(state.childName)}" maxlength="18" />! <span aria-hidden="true">👋</span></h1><p>Hoy vamos a escuchar, hablar y escribir en inglés.</p></div><button class="achievements-button" data-action="achievements"><span aria-hidden="true">🏅</span><span><strong>Mis logros</strong><small>${earned} de 4</small></span></button></section>

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
      <footer><p>Hecho con 💜 para aprender en familia</p><small>La voz y el progreso se quedan en este dispositivo.</small></footer>

      ${state.achievementsOpen ? `<div class="modal-backdrop" data-action="close-modal"><section class="achievement-modal" role="dialog" aria-modal="true" aria-labelledby="achievement-title"><button class="close" data-action="close-modal" aria-label="Cerrar">×</button><span class="big-medal" aria-hidden="true">🏅</span><h2 id="achievement-title">Mis logros</h2><p>Cada intento cuenta. ¡Sigue explorando!</p><div class="achievement-grid">${achievements().map((item) => `<article class="${item.earned ? "earned" : "locked"}"><span>${item.earned ? item.icon : "🔒"}</span><strong>${item.name}</strong><small>${item.earned ? "¡Conseguido!" : "Sigue practicando"}</small></article>`).join("")}</div><button class="primary full" data-action="close-modal">¡Vamos a practicar!</button><button class="reset-button" data-action="reset">↻ Reiniciar todo el progreso</button></section></div>` : ""}
    </main>`;

  bindEvents();
  if (state.mode === "write" && state.writingStyle === "hand") setupCanvas();
}

function resetLessonState() {
  state.answer = "";
  state.feedback = "idle";
  state.showSound = false;
  state.missionOpen = false;
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
    childName: "Isabelle",
    achievementsOpen: false,
    writingStyle: "keyboard",
    familyMissions: [],
    missionOpen: false,
  };
  save();
  render();
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
    if (action === "mode") { state.mode = button.dataset.value; resetLessonState(); if (state.mode === "quiz") state.quizOptions = makeQuizOptions(state.lessonIndex); render(); }
    if (action === "hear-en") { speak(lesson.english, "en-US"); markPracticed(state.lessonIndex); render(); }
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
      speakBilingual("Mission complete", "Misión cumplida");
      save();
      render();
    }
    if (action === "reset") resetAllProgress();
    if (action === "writing-style") { state.writingStyle = button.dataset.value; state.feedback = "idle"; render(); }
    if (action === "hint") { state.answer = lesson.answer.slice(0, Math.max(2, Math.ceil(lesson.answer.length * 0.35))); render(); }
    if (action === "check") {
      const supplied = normalize(state.answer);
      const accepted = supplied === normalize(lesson.answer) || (state.lessonIndex === 4 && supplied === "i am six years old");
      if (accepted) awardSuccess(); else { state.feedback = "try"; speakBilingual("Try again", "Inténtalo otra vez"); render(); }
    }
    if (action === "quiz") {
      if (Number(button.dataset.index) === state.lessonIndex) awardSuccess("Awesome", "Excelente");
      else { state.feedback = "try"; speakBilingual("Try again", "Inténtalo otra vez"); render(); }
    }
    if (action === "finish-hand") awardSuccess("Beautiful handwriting", "Qué bonita letra");
  }));

  const nameInput = document.querySelector("#child-name");
  if (nameInput) nameInput.addEventListener("input", (event) => {
    state.childName = event.target.value.slice(0, 18);
    const avatar = document.querySelector("#avatar");
    if (avatar) avatar.textContent = (state.childName || "I").slice(0, 1).toUpperCase();
    save();
  });

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
  let drawing = false;
  let hasInk = false;

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
    hasInk = false;
  };
  resize();
  canvasObserver = new ResizeObserver(resize);
  canvasObserver.observe(canvas);

  const point = (event) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    document.getSelection()?.removeAllRanges();
    canvas.setPointerCapture(event.pointerId);
    drawing = true;
    const context = canvas.getContext("2d");
    const next = point(event);
    context.beginPath();
    context.moveTo(next.x, next.y);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = event.pointerType === "pen" ? Math.max(3, event.pressure * 7) : 5;
    context.strokeStyle = "#5a48cf";
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    event.preventDefault();
    const context = canvas.getContext("2d");
    const next = point(event);
    context.lineTo(next.x, next.y);
    context.stroke();
    hasInk = true;
    document.querySelector('[data-action="clear-hand"]').disabled = false;
    document.querySelector('[data-action="finish-hand"]').disabled = false;
  });
  const stop = (event) => {
    drawing = false;
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
    hasInk = false;
    clearButton.disabled = true;
    document.querySelector('[data-action="finish-hand"]').disabled = true;
  });
}

render();
