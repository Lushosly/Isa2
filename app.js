const APP_VERSION = "1.0.0";
const CHILD_NAME = "Isabelle";
const STORAGE_KEY = "aventura-numeros-isabelle-v1";
const LISTEN_TIMEOUT_MS = 15000;

const BASIC_NUMBERS = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
  "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés",
  "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
];
const TENS = { 30: "treinta", 40: "cuarenta", 50: "cincuenta", 60: "sesenta", 70: "setenta", 80: "ochenta", 90: "noventa" };

function numberName(number) {
  if (number >= 0 && number <= 29) return BASIC_NUMBERS[number];
  if (number === 100) return "cien";
  const tens = Math.floor(number / 10) * 10;
  const units = number % 10;
  return units ? `${TENS[tens]} y ${BASIC_NUMBERS[units]}` : TENS[tens];
}

function numberParts(number) {
  return numberName(number).split(" ");
}

function normalizeSpanish(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function spokenNumberMatches(transcript, number) {
  let heard = normalizeSpanish(transcript)
    .replace(/^(este es )?(el )?numero\s+/, "")
    .replace(/^es\s+/, "");
  if (/^\d{1,3}$/.test(heard)) return Number(heard) === number;
  const expected = normalizeSpanish(numberName(number));
  const accepted = [expected];
  if (number >= 21 && number <= 29) accepted.push(`veinte y ${normalizeSpanish(BASIC_NUMBERS[number % 10])}`);
  return accepted.includes(heard);
}

function writtenNumberMatches(value, number) {
  return normalizeSpanish(value) === normalizeSpanish(numberName(number));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

let activeRecognition;
let recognitionTimer;
let state = {
  selected: 1,
  rangeStart: 1,
  mode: "learn",
  stars: 0,
  mastered: [],
  writing: "",
  feedback: "idle",
  transcript: "",
  speechStatus: "idle",
  speechMessage: "",
  challenge: null,
  achievementsOpen: false,
  celebration: null,
  celebrationQueue: [],
  unlockedAchievements: [],
  stats: { speechWins: 0, writingWins: 0, challengeWins: 0 },
};

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  if (saved) {
    state.stars = Number.isFinite(saved.stars) ? saved.stars : 0;
    state.mastered = Array.isArray(saved.mastered) ? saved.mastered.filter((number) => number >= 1 && number <= 100) : [];
    state.unlockedAchievements = Array.isArray(saved.unlockedAchievements) ? saved.unlockedAchievements : [];
    state.stats = {
      speechWins: Number.isFinite(saved.stats?.speechWins) ? saved.stats.speechWins : 0,
      writingWins: Number.isFinite(saved.stats?.writingWins) ? saved.stats.writingWins : 0,
      challengeWins: Number.isFinite(saved.stats?.challengeWins) ? saved.stats.challengeWins : 0,
    };
  }
} catch {
  // Si el progreso guardado no se puede leer, empieza una aventura nueva.
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    stars: state.stars,
    mastered: state.mastered,
    unlockedAchievements: state.unlockedAchievements,
    stats: state.stats,
  }));
}

function achievements() {
  return [
    { id: "first", icon: "⭐", name: "Mi primera estrella", detail: "¡Comenzaste tu aventura!", earned: state.stars >= 1 },
    { id: "voice", icon: "🎤", name: "Voz valiente", detail: "Dijiste 5 números", earned: state.stats.speechWins >= 5 },
    { id: "writer", icon: "✍️", name: "Gran escritora", detail: "Escribiste 5 números", earned: state.stats.writingWins >= 5 },
    { id: "challenge", icon: "⚡", name: "Reina de los retos", detail: "Ganaste 5 retos", earned: state.stats.challengeWins >= 5 },
    { id: "ten", icon: "🌟", name: "Los primeros diez", detail: "Dominaste 10 números", earned: state.mastered.length >= 10 },
    { id: "twentyfive", icon: "🦋", name: "Mariposa matemática", detail: "Dominaste 25 números", earned: state.mastered.length >= 25 },
    { id: "fifty", icon: "🌈", name: "Mitad del arcoíris", detail: "Dominaste 50 números", earned: state.mastered.length >= 50 },
    { id: "hundred", icon: "👑", name: "Maestra de los 100", detail: "¡Dominaste los 100 números!", earned: state.mastered.length === 100 },
  ];
}

function checkAchievements() {
  const newItems = achievements().filter((item) => item.earned && !state.unlockedAchievements.includes(item.id));
  if (!newItems.length) return;
  state.unlockedAchievements = [...state.unlockedAchievements, ...newItems.map((item) => item.id)];
  state.celebrationQueue = [...state.celebrationQueue, ...newItems];
  if (!state.celebration) state.celebration = state.celebrationQueue.shift();
}

function voiceForSpanish() {
  const voices = speechSynthesis.getVoices();
  const preferredNames = ["paulina", "ximena", "valentina", "camila", "marisol", "paloma", "monica", "mónica", "angelica", "angélica", "soledad", "luciana", "francisca"];
  const locales = ["es-pr", "es-us", "es-mx", "es-419", "es-co", "es-ar", "es-cl", "es"];
  for (const locale of locales) {
    const candidates = voices
      .filter((voice) => voice.lang.toLowerCase() === locale || (locale === "es" && voice.lang.toLowerCase().startsWith("es-")))
      .filter((voice) => preferredNames.some((name) => voice.name.toLowerCase().includes(name)))
      .sort((left, right) => {
        const score = (voice) => /premium/.test(voice.name.toLowerCase()) ? 500 : /enhanced/.test(voice.name.toLowerCase()) ? 420 : /natural|neural/.test(voice.name.toLowerCase()) ? 360 : 0;
        return score(right) - score(left);
      });
    if (candidates[0]) return candidates[0];
  }
  return undefined;
}

function makeUtterance(text, rate = 0.86) {
  const message = new SpeechSynthesisUtterance(text);
  message.lang = "es-PR";
  message.rate = rate;
  message.pitch = 1;
  const voice = voiceForSpanish();
  if (voice) message.voice = voice;
  return message;
}

function speak(text, rate = 0.86) {
  if (!("speechSynthesis" in window)) return;
  cancelRecognition();
  speechSynthesis.cancel();
  speechSynthesis.speak(makeUtterance(text, rate));
}

function speakNumberIntroduction(number) {
  const name = numberName(number);
  speak(`Este es el número ${name}. Se escribe ${name}.`, 0.82);
}

function speakNumberPart(part, button) {
  if (!("speechSynthesis" in window)) return;
  cancelRecognition();
  speechSynthesis.cancel();
  document.querySelectorAll(".part-chip.is-speaking").forEach((chip) => chip.classList.remove("is-speaking"));
  const spokenPart = normalizeSpanish(part) === "y" ? "i" : part;
  const message = makeUtterance(spokenPart, 0.72);
  const finish = () => button?.classList.remove("is-speaking");
  message.onstart = () => button?.classList.add("is-speaking");
  message.onend = finish;
  message.onerror = finish;
  speechSynthesis.speak(message);
}

function clearRecognitionTimer() {
  if (recognitionTimer === undefined) return;
  clearTimeout(recognitionTimer);
  recognitionTimer = undefined;
}

function releaseRecognition(recognition) {
  if (activeRecognition !== recognition) return false;
  activeRecognition = null;
  clearRecognitionTimer();
  return true;
}

function cancelRecognition() {
  const recognition = activeRecognition;
  activeRecognition = null;
  clearRecognitionTimer();
  if (!recognition) return;
  try { recognition.abort(); } catch { /* Safari puede haber cerrado el micrófono. */ }
}

function stopListening() {
  cancelRecognition();
  state.speechStatus = "idle";
  state.speechMessage = "Escucha detenida. Toca el micrófono cuando estés lista.";
  render();
}

function startSpeakingPractice() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    state.speechMessage = "Abre esta página directamente en Safari para usar el micrófono.";
    render();
    return;
  }
  cancelRecognition();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  const target = state.selected;
  const recognition = new Recognition();
  activeRecognition = recognition;
  recognition.lang = "es-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  state.speechStatus = "listening";
  state.transcript = "";
  state.speechMessage = "Di solamente el número. La escucha se detiene sola.";
  render();

  recognition.onresult = (event) => {
    if (!releaseRecognition(recognition)) return;
    const transcript = event.results[event.results.length - 1][0]?.transcript || "";
    state.transcript = transcript;
    state.speechStatus = "idle";
    if (spokenNumberMatches(transcript, target)) awardSuccess("speech", target, "¡Muy bien! Lo dijiste correctamente.");
    else {
      state.feedback = "try";
      state.speechMessage = `Casi. El iPad escuchó “${transcript || "nada"}”. Inténtalo otra vez.`;
      speak("Casi. Vamos a intentarlo otra vez.");
      render();
    }
  };
  recognition.onnomatch = () => {
    if (!releaseRecognition(recognition)) return;
    state.speechStatus = "idle";
    state.speechMessage = "No pude reconocer el número. Inténtalo otra vez.";
    render();
  };
  recognition.onerror = (event) => {
    if (activeRecognition !== recognition) return;
    releaseRecognition(recognition);
    state.speechStatus = "idle";
    const messages = {
      "not-allowed": "Permite el micrófono en Safari y vuelve a intentarlo.",
      "service-not-allowed": "Activa Siri en los ajustes del iPad.",
      "no-speech": "No escuché un número. Habla cerca del iPad.",
      network: "No pude comprobar la voz. Revisa la conexión.",
      "language-not-supported": "Safari no pudo activar el reconocimiento en español.",
    };
    state.speechMessage = event.error === "aborted" ? "Escucha detenida. Toca el micrófono cuando estés lista." : messages[event.error] || "No pude escuchar esta vez. Inténtalo otra vez.";
    render();
  };
  recognition.onspeechend = () => {
    if (activeRecognition !== recognition) return;
    try { recognition.stop(); } catch { /* El temporizador restaurará la pantalla. */ }
  };
  recognition.onend = () => {
    if (!releaseRecognition(recognition)) return;
    state.speechStatus = "idle";
    state.speechMessage = "No escuché el número completo. Toca el micrófono para repetir.";
    render();
  };

  try {
    recognition.start();
    recognitionTimer = setTimeout(() => {
      if (!releaseRecognition(recognition)) return;
      try { recognition.abort(); } catch { /* La interfaz se recupera igualmente. */ }
      state.speechStatus = "idle";
      state.speechMessage = "Se terminó el tiempo. Toca el micrófono para intentarlo otra vez.";
      render();
    }, LISTEN_TIMEOUT_MS);
  } catch {
    releaseRecognition(recognition);
    state.speechStatus = "idle";
    state.speechMessage = "El micrófono está ocupado. Espera un momento.";
    render();
  }
}

function makeChallenge() {
  const target = Math.floor(Math.random() * 100) + 1;
  const choices = new Set([target]);
  while (choices.size < 4) choices.add(Math.floor(Math.random() * 100) + 1);
  state.challenge = { target, options: [...choices].sort(() => Math.random() - 0.5) };
  state.feedback = "idle";
}

function markMastered(number) {
  if (!state.mastered.includes(number)) state.mastered = [...state.mastered, number].sort((a, b) => a - b);
}

function awardSuccess(source, number, message) {
  state.stars += 1;
  state.feedback = "correct";
  state.speechMessage = source === "speech" ? message : "";
  markMastered(number);
  if (source === "speech") state.stats.speechWins += 1;
  if (source === "writing") state.stats.writingWins += 1;
  if (source === "challenge") state.stats.challengeWins += 1;
  checkAchievements();
  save();
  speak(`¡Muy bien, ${CHILD_NAME}! Lo hiciste excelente.`);
  render();
}

function resetActivity() {
  cancelRecognition();
  state.writing = "";
  state.feedback = "idle";
  state.transcript = "";
  state.speechStatus = "idle";
  state.speechMessage = "";
}

function selectNumber(number) {
  state.selected = Math.max(1, Math.min(100, number));
  state.rangeStart = Math.floor((state.selected - 1) / 20) * 20 + 1;
  if (state.mode === "challenge") { state.mode = "learn"; state.challenge = null; }
  resetActivity();
  render();
}

function feedbackHtml() {
  if (state.feedback === "correct") return `<div class="feedback success"><span>🎉</span><div><strong>¡Excelente, ${CHILD_NAME}!</strong><small>Ganaste una estrella.</small></div></div>`;
  if (state.feedback === "try") return `<div class="feedback retry"><span>🌱</span><div><strong>¡Buen intento!</strong><small>Escucha una vez más y vuelve a probar.</small></div></div>`;
  return "";
}

function learnHtml(number) {
  const name = numberName(number);
  return `<section class="activity learn-activity">
    <p class="activity-kicker">APRENDE EL NÚMERO</p>
    <h2>${escapeHtml(name)}</h2>
    <p class="explanation">Este es el número <strong>${number}</strong>. Se escribe <strong>${escapeHtml(name)}</strong>.</p>
    <div class="action-row"><button class="primary" data-action="listen-intro">🔊 Escuchar explicación</button><button class="secondary" data-action="listen-name">🇵🇷 Escuchar “${escapeHtml(name)}”</button></div>
    <div class="parts-box"><div><span>🧩</span><p><strong>Parte por parte</strong><small>Toca cada parte para escucharla despacio.</small></p></div><div class="part-chips">${numberParts(number).map((part, index) => `${index ? `<span class="part-divider" aria-hidden="true">−</span>` : ""}<button class="part-chip" data-action="listen-part" data-index="${index}">🔊 ${escapeHtml(part)}</button>`).join("")}</div></div>
  </section>`;
}

function speechHtml(number) {
  return `<section class="activity speech-activity">
    <p class="activity-kicker">DI EL NÚMERO EN ESPAÑOL</p><h2 class="speech-number">${number}</h2>
    <p>Mira el número y dilo en voz alta.</p>
    <div class="action-row"><button class="secondary" data-action="listen-name">🔊 Escuchar pista</button><button class="mic-button ${state.speechStatus === "listening" ? "listening" : ""}" data-action="${state.speechStatus === "listening" ? "stop-listening" : "start-listening"}">${state.speechStatus === "listening" ? "⏹ Detener escucha" : "🎤 Hablar ahora"}</button></div>
    ${state.transcript ? `<p class="heard"><strong>El iPad escuchó:</strong> “${escapeHtml(state.transcript)}”</p>` : ""}
    ${state.speechMessage ? `<p class="speech-message">${escapeHtml(state.speechMessage)}</p>` : ""}
    <small class="accuracy-note">La aplicación comprueba el número que Safari entendió; no califica profesionalmente el acento.</small>
  </section>`;
}

function writingHtml(number) {
  return `<section class="activity writing-activity">
    <p class="activity-kicker">ESCRIBE EL NÚMERO</p><h2>¿Cómo se escribe ${number}?</h2>
    <label for="writing-answer">Escríbelo con letras</label><textarea id="writing-answer" placeholder="Escribe aquí…" autocapitalize="none" spellcheck="false">${escapeHtml(state.writing)}</textarea>
    <div class="action-row"><button class="secondary" data-action="writing-hint">💡 Dame una pista</button><button class="primary" data-action="check-writing" ${state.writing.trim() ? "" : "disabled"}>✓ Comprobar</button></div>
  </section>`;
}

function challengeHtml() {
  if (!state.challenge) makeChallenge();
  const challenge = state.challenge;
  return `<section class="activity challenge-activity">
    <p class="activity-kicker">RETO RELÁMPAGO</p><h2>¿Cómo se escribe ${challenge.target}?</h2><p>Toca la respuesta correcta.</p>
    <div class="challenge-options">${challenge.options.map((number) => `<button data-action="challenge-answer" data-number="${number}">${escapeHtml(numberName(number))}</button>`).join("")}</div>
    <button class="new-challenge" data-action="new-challenge">↻ Otro reto</button>
  </section>`;
}

function activityHtml(number) {
  if (state.mode === "learn") return learnHtml(number);
  if (state.mode === "speech") return speechHtml(number);
  if (state.mode === "writing") return writingHtml(number);
  return challengeHtml();
}

function render() {
  if (state.mode === "challenge" && !state.challenge) makeChallenge();
  const number = state.selected;
  const displayNumber = state.mode === "challenge" ? state.challenge.target : number;
  const earned = achievements().filter((item) => item.earned).length;
  const progress = state.mastered.length;
  const ranges = [1, 21, 41, 61, 81];
  const visibleNumbers = Array.from({ length: 20 }, (_, index) => state.rangeStart + index);
  document.querySelector("#app").innerHTML = `<main class="app-shell">
    <div class="decorations" aria-hidden="true"><img class="rainbow" src="assets/openmoji/rainbow.svg" alt=""><img class="butterfly b1" src="assets/openmoji/butterfly.svg" alt=""><img class="butterfly b2" src="assets/openmoji/butterfly.svg" alt=""><span class="heart h1">♥</span><span class="heart h2">♥</span><span class="twinkle t1">✦</span><span class="twinkle t2">✦</span></div>
    <header class="topbar"><a class="brand" href="#inicio"><span class="brand-mark">🔢</span><span><strong>Aventura</strong><small>de Números</small></span></a><button class="star-pill" data-action="achievements">⭐ ${state.stars}</button></header>
    <section class="welcome" id="inicio"><div><p class="eyebrow">NÚMEROS DEL 1 AL 100</p><h1>¡Hola, <span>${CHILD_NAME}</span>! 👋</h1><p>Vamos a escuchar, decir y escribir números en español.</p></div><button class="achievements-button" data-action="achievements"><span>🏅</span><span><strong>Mis logros</strong><small>${earned} de ${achievements().length}</small></span></button></section>
    <section class="progress-card"><div><span>Tu mapa de números</span><strong>${progress} de 100 dominados</strong></div><div class="progress-track"><span style="width:${progress}%"></span></div><b>${progress}%</b></section>
    <section class="number-picker"><div class="picker-heading"><div><p>ESCOGE UN NÚMERO</p><h2>¿Cuál quieres practicar?</h2></div><div class="range-tabs">${ranges.map((start) => `<button data-action="range" data-start="${start}" class="${state.rangeStart === start ? "active" : ""}">${start}–${start + 19}</button>`).join("")}</div></div><div class="number-grid">${visibleNumbers.map((item) => `<button data-action="select-number" data-number="${item}" class="${item === number ? "selected" : ""} ${state.mastered.includes(item) ? "mastered" : ""}" aria-label="Número ${item}${state.mastered.includes(item) ? ", dominado" : ""}">${item}${state.mastered.includes(item) ? "<span>✓</span>" : ""}</button>`).join("")}</div></section>
    <nav class="mode-tabs" aria-label="Formas de practicar"><button data-action="mode" data-mode="learn" class="${state.mode === "learn" ? "active" : ""}">🔊<span>Aprende</span></button><button data-action="mode" data-mode="speech" class="${state.mode === "speech" ? "active" : ""}">🎤<span>Habla</span></button><button data-action="mode" data-mode="writing" class="${state.mode === "writing" ? "active" : ""}">✍️<span>Escribe</span></button><button data-action="mode" data-mode="challenge" class="${state.mode === "challenge" ? "active" : ""}">⚡<span>Reto</span></button></nav>
    <section class="practice-card"><div class="number-visual"><span>${displayNumber}</span><small>${state.mode === "challenge" ? "Reto sorpresa" : escapeHtml(numberName(number))}</small><i aria-hidden="true">✦</i><b aria-hidden="true">♥</b></div><div class="practice-content">${activityHtml(number)}${feedbackHtml()}${state.mode === "challenge" ? "" : `<div class="number-nav"><button data-action="previous" aria-label="Número anterior">←</button><span>${number} de 100</span><button data-action="next" aria-label="Número siguiente">→</button></div>`}</div></section>
    <section class="family-card"><div class="mascot"><img src="assets/og.png" alt="Colibrí explorador"></div><div><span>MISIÓN EN FAMILIA</span><h2>Busca el número ${number} a tu alrededor</h2><p>Puede estar en un reloj, un libro, una puerta o un calendario.</p></div><button data-action="family-mission">🔊 Escuchar misión</button></section>
    <footer><p>🌈 Hecho con 💜 para aprender en familia 🦋</p><small>El progreso se guarda solamente en este dispositivo. · Versión ${APP_VERSION}</small><small class="asset-credit">Decoraciones de <a href="https://openmoji.org/" target="_blank" rel="noopener">OpenMoji</a> · CC BY-SA 4.0</small></footer>
    ${state.achievementsOpen ? `<div class="modal-backdrop" data-action="close-achievements"><section class="achievement-modal" role="dialog" aria-modal="true"><button class="close" data-action="close-achievements">×</button><span class="big-icon">🏅</span><h2>Mis logros</h2><p>¡Cada intento te hace más fuerte!</p><div class="achievement-grid">${achievements().map((item) => `<article class="${item.earned ? "earned" : "locked"}"><span>${item.earned ? item.icon : "🔒"}</span><div><strong>${item.name}</strong><small>${item.earned ? item.detail : "Sigue practicando"}</small></div></article>`).join("")}</div><button class="primary full" data-action="close-achievements">¡Seguir practicando!</button><button class="reset-button" data-action="reset">↻ Reiniciar todo el progreso</button></section></div>` : ""}
    ${state.celebration ? `<div class="modal-backdrop celebration-backdrop"><section class="celebration-card" role="dialog" aria-modal="true"><div class="confetti">⭐ ✨ 🌈 ✨ ⭐</div><span class="celebration-icon">${state.celebration.icon}</span><p>NUEVO LOGRO</p><h2>${escapeHtml(state.celebration.name)}</h2><strong>${escapeHtml(state.celebration.detail)}</strong><small>¡Estamos muy orgullosos de ti, ${CHILD_NAME}!</small><button class="primary full" data-action="close-celebration">¡Continuar!</button></section></div>` : ""}
  </main>`;
  bindEvents();
}

function bindEvents() {
  const number = state.selected;
  document.querySelectorAll("[data-action]").forEach((element) => element.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const action = button.dataset.action;
    if (action === "achievements") { state.achievementsOpen = true; render(); }
    if (action === "close-achievements") { if (button.tagName === "BUTTON" || event.target === button) { state.achievementsOpen = false; render(); } }
    if (action === "close-celebration") { state.celebration = state.celebrationQueue.shift() || null; render(); }
    if (action === "range") selectNumber(Number(button.dataset.start));
    if (action === "select-number") selectNumber(Number(button.dataset.number));
    if (action === "previous") selectNumber(number === 1 ? 100 : number - 1);
    if (action === "next") selectNumber(number === 100 ? 1 : number + 1);
    if (action === "mode") { resetActivity(); state.mode = button.dataset.mode; if (state.mode === "challenge") makeChallenge(); render(); }
    if (action === "listen-intro") speakNumberIntroduction(number);
    if (action === "listen-name") speak(numberName(number), 0.76);
    if (action === "listen-part") speakNumberPart(numberParts(number)[Number(button.dataset.index)], button);
    if (action === "start-listening") startSpeakingPractice();
    if (action === "stop-listening") stopListening();
    if (action === "writing-hint") { state.writing = numberName(number).slice(0, Math.max(1, Math.ceil(numberName(number).length * 0.3))); render(); }
    if (action === "check-writing") {
      if (state.feedback === "correct") return;
      if (writtenNumberMatches(state.writing, number)) awardSuccess("writing", number, "");
      else { state.feedback = "try"; speak("Buen intento. Escucha y vuelve a probar."); render(); }
    }
    if (action === "challenge-answer") {
      if (state.feedback === "correct") return;
      const choice = Number(button.dataset.number);
      if (choice === state.challenge.target) awardSuccess("challenge", state.challenge.target, "");
      else { state.feedback = "try"; speak("Casi. Mira bien el número e inténtalo otra vez."); render(); }
    }
    if (action === "new-challenge") { makeChallenge(); render(); }
    if (action === "family-mission") speak(`Busca el número ${numberName(number)} a tu alrededor. Puede estar en un reloj, un libro, una puerta o un calendario.`);
    if (action === "reset") {
      if (!window.confirm("¿Quieres borrar todas las estrellas, logros y números dominados?")) return;
      cancelRecognition();
      localStorage.removeItem(STORAGE_KEY);
      state = { selected: 1, rangeStart: 1, mode: "learn", stars: 0, mastered: [], writing: "", feedback: "idle", transcript: "", speechStatus: "idle", speechMessage: "", challenge: null, achievementsOpen: false, celebration: null, celebrationQueue: [], unlockedAchievements: [], stats: { speechWins: 0, writingWins: 0, challengeWins: 0 } };
      save();
      render();
    }
  }));

  const writingInput = document.querySelector("#writing-answer");
  if (writingInput) writingInput.addEventListener("input", (event) => {
    state.writing = event.target.value;
    state.feedback = "idle";
    const check = document.querySelector('[data-action="check-writing"]');
    if (check) check.disabled = !state.writing.trim();
  });
}

render();
