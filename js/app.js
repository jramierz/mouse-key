//#region Helpers
const $ = s => document.querySelector(s);
const rnd = (a, b) => Math.random() * (b - a) + a;
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const shuffle = arr => [...arr].sort(() => Math.random() - .5);
//#endregion

//#region Audio base
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
function ensureAudio() { try { actx = actx || new AudioCtx(); actx.resume(); } catch { } }
function beep(freq = 880, dur = 0.1, type = 'sine', vol = 0.25) {
  try {
    ensureAudio();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(actx.destination);
    g.gain.value = .0001; g.gain.exponentialRampToValueAtTime(vol, actx.currentTime + .01);
    o.start(); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + dur); o.stop(actx.currentTime + dur);
  } catch { }
}
document.addEventListener('pointerdown', () => ensureAudio(), { once: true });
//#endregion

//#region Overlay turnos
const overlay = $('#overlay'), btnContinue = $('#btnContinue'), countEl = $('#count');
let timer = null, paused = false;
let overlayAudio = null, overlayOpen = false;

function playCambioTurnoAudio() {
  try {
    if (!overlayAudio) { overlayAudio = new Audio('audio/lo_lograste.mp3'); overlayAudio.volume = .9; }
    overlayAudio.pause(); overlayAudio.currentTime = 0; overlayAudio.play().catch(() => { });
  } catch { }
}
function stopCambioTurnoAudio() { try { overlayAudio?.pause(); } catch { } }

function showOverlay(seconds = 8, onContinue) {
  if (overlayOpen) return;
  overlayOpen = true; paused = true;
  overlay.classList.add('show');
  if (btnContinue) { btnContinue.style.display = 'none'; btnContinue.disabled = true; }
  playCambioTurnoAudio();

  let t = seconds; countEl.textContent = t;
  let done = false;
  const proceedOnce = () => {
    if (done) return; done = true;
    clearInterval(timer); stopCambioTurnoAudio();
    overlay.classList.remove('show'); overlayOpen = false; paused = false;
    if (btnContinue) { btnContinue.onclick = null; }
    try { onContinue && onContinue(); } catch { }
  };
  clearInterval(timer);
  timer = setInterval(() => {
    t--; countEl.textContent = t;
    beep(720 - (seconds - t) * 15, .06, 'triangle', .15);
    if (t <= 0) proceedOnce();
  }, 1000);
  if (btnContinue) { btnContinue.onclick = proceedOnce; }
}
//#endregion

//#region Ruteo
const SCREENS = ['balloons', 'keys', 'letters', 'drag', 'clicks', 'maze', 'cheese', 'sort', 'habitats', 
  'dinos', 'panel', 'puzzle', 'match', 'safari'];
let currentGameId = null;

/* Detener juegos / audios activos al cambiar de pantalla o volver al Home */
function stopAllGames() {
  // Juegos que tienen función de stop propia
  try { stopPanelGame?.(); } catch { }
  try { stopMatch?.(); } catch { }
  try { stopSafariGame?.(); } catch { }

  // Cortar audios generales
  try { stopCambioTurnoAudio(); } catch { }

  // Audios específicos de minijuegos
  try { dinoStopAllAudio?.(); } catch { }
  try { stopAllHabAudios?.(); } catch { }
  try { stopAllColorAudios?.(); } catch { }

  // Por si el audio de instrucciones de Safari quedó sonando
  try {
    safariIntro?.pause?.();
    if (safariIntro) safariIntro.currentTime = 0;
  } catch { }
}

function openScreen(name) {
  // Si viene algo raro o desconocido, mandamos a home
  if (!SCREENS.includes(name) && name !== 'home') {
    name = 'home';
  }

  if (SCREENS.includes(name)) currentGameId = name;
  else currentGameId = null;

  // Al cambiar de pantalla, detiene juegos/sonidos de la anterior
  stopAllGames();

  // GUARDAR PANTALLA
  try { localStorage.setItem('lastScreen', name); } catch { }

  // Cambiar visibilidad de pantallas
  $('#home')?.classList.remove('active');
  SCREENS.forEach(id => $('#scr-' + id)?.classList.remove('active'));
  $('#scr-' + name)?.classList.add('active');

  const map = {
    balloons: 'Globos',
    keys: 'Teclas',
    letters: 'Busca las letras',
    drag: 'Casitas',
    clicks: 'Clic',
    maze: 'Laberinto',
    cheese: 'Ratón y Queso',
    sort: 'Sorting de Colores',
    habitats: 'Habitats de animales',
    dinos: 'Dino dig desentierra el dinosaurio',
    panel: 'Panel Luminoso de colores',
    puzzle: 'Rompecabezas',
    match: 'Match de figuras',
    safari: 'Safari de dinosaurios'
  };

  const tag = $('#tagMode');
  if (tag) tag.textContent = 'Modo: ' + (map[name] || 'Inicio');

  // AUTO START de cada juego (protegido con try/catch para NO romper todo)
  try {
    if (name === 'balloons') startBalloons();
    else if (name === 'keys') startPianoKeys();
    else if (name === 'letters') startLettersGame();
    else if (name === 'drag') startDragHome();
    else if (name === 'clicks') startClicks?.();
    else if (name === 'maze') startMaze(true);
    else if (name === 'cheese') startCheese(true);
    else if (name === 'sort') startSort(true);
    else if (name === 'habitats') startHabitats();
    else if (name === 'dinos') startDinos(true);
    else if (name === 'panel') startPanelMode('easy');
    else if (name === 'puzzle') startPuzzle();
    else if (name === 'match') startMatch(true);
    else if (name === 'safari') startSafariGame(true);
  } catch (e) {
    console.error('Error al iniciar juego', name, e);
  }
}

function backHome(){
  // Detener todo lo que esté sonando o animándose
  stopAllGames();

  // Limpiar pantalla recordada
  try { localStorage.removeItem('lastScreen'); } catch {}

  SCREENS.forEach(id => $('#scr-'+id)?.classList.remove('active'));
  $('#home')?.classList.add('active');

  // tagMode es opcional
  const tag = $('#tagMode');
  if (tag) tag.textContent = 'Modo: Inicio';

  currentGameId = null;
}

document.addEventListener('DOMContentLoaded', () => {

  // Cerrar todas menos home
  document.querySelectorAll('.screen')
    .forEach(s => s.id !== 'home' && s.classList.remove('active'));

  // Intentar cargar la última pantalla guardada
  let last = null;
  try { last = localStorage.getItem('lastScreen'); } catch { }

  if (last && SCREENS.includes(last)) {
    // Abrir sin cambiar hash
    openScreen(last);
  }

  // Botón de modo 3 retos
  $('#btnPlay')?.addEventListener('click', () => startPlay3());
});
//#endregion

//#region 3 Juegos random
const PLAY_SET = ['balloons', 'drag', 'maze', 'cheese', 'sort', 'habitats', 'dinos', 'panel', 'puzzle', 'match', 'safari'];

let playOrder = [];
let playIndex = 0;
let playActive = false;

// Inicia el modo de 3 retos: toma 3 únicos al azar
function startPlay3() {
  playOrder = shuffle(PLAY_SET).slice(0, 3);
  playIndex = 0;
  playActive = true;
  launchCurrentPlayGame();
}

// Abre la pantalla y arranca el juego correspondiente
function launchCurrentPlayGame() {
  const id = playOrder[playIndex];
  if (!id) return;

  currentGameId = id;
  // openScreen se encarga de mostrar pantalla y de iniciar el juego
  openScreen(id);
}

// Llamar SIEMPRE al terminar cada juego
function onGameCompleted() {
  if (playActive) {
    playIndex++;
    if (playIndex >= playOrder.length) {
      // Terminó los 3 retos, mostramos overlay y volvemos a armar otros 3
      showOverlay(8, () => {
        playOrder = shuffle(PLAY_SET).slice(0, 3);
        playIndex = 0;
        playActive = true;
        launchCurrentPlayGame();
      });
    } else {
      // Siguiente juego de la serie
      launchCurrentPlayGame();
    }
  } else {
    // Modo normal: solo reiniciar el juego actual con overlay
    showOverlay(8, () => restartCurrentGame());
  }
}
//#endregion

// #region Reinicio juego actual
function isActive(id) {
  return $('#scr-' + id)?.classList.contains('active');
}

function restartCurrentGame() {
  // Si no sabemos cuál es, lo detectamos por la pantalla activa
  if (!currentGameId) {
    for (const id of SCREENS) {
      if (isActive(id)) {
        currentGameId = id;
        break;
      }
    }
  }

  if (!currentGameId) return;

  openScreen(currentGameId);
}

//#endregion

//#region Pop-Globos
const balloonArea = $('#balloonArea');
const tagBalloons = $('#tagBalloons');
const btnModo = $('#btnModo');
let MODO_FACIL = true;

btnModo?.addEventListener('click', () => {
  MODO_FACIL = !MODO_FACIL;
  btnModo.textContent = `Modo fácil: ${MODO_FACIL ? 'ON' : 'OFF'}`;
  btnModo.dataset.on = MODO_FACIL ? "1" : "0";
  if ($('#scr-balloons').classList.contains('active')) startBalloons();
});

const pwrap = $('#pwrap'); let SEGMENTS = [];
function setupSegments(n = 10) {
  if (!pwrap) return; pwrap.innerHTML = ''; SEGMENTS = [];
  for (let i = 0; i < n; i++) { const s = document.createElement('div'); s.className = 'seg'; pwrap.appendChild(s); SEGMENTS.push(s); }
}
function setSegmentsFraction(done, total) {
  if (!SEGMENTS.length) return;
  const n = SEGMENTS.length; const on = Math.min(n, Math.round((done / Math.max(1, total)) * n));
  SEGMENTS.forEach((s, i) => s.classList.toggle('on', i < on));
}

const GOAL_BALLOONS = 10;
let poppedRound = 0, balloons = [], rafId = null;
const PHY = { MAX_VX: .45, MAX_VY: .55, DAMPING: .995, BOUNCE: .85, DRIFT: .0018 };
const clamp = (v, lim) => Math.max(-lim, Math.min(lim, v));

function stopLoop() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }
function clearBalloons(){
  stopLoop();
  balloons.forEach(b => b.el.remove());
  balloons = [];
  poppedRound = 0;

  if (tagBalloons) {
    tagBalloons.textContent = 'Globos: 0';
  }

  setupSegments(10);
  setSegmentsFraction(0, GOAL_BALLOONS);
}

function randColor() { const H = [10, 40, 120, 190, 260, 320]; const h = H[rndi(0, H.length - 1)], s = rndi(70, 95), l = rndi(48, 64); return `hsl(${h} ${s}% ${l}%)`; }
function emitLocalConfetti(cx, cy, n = 24) {
  for (let i = 0; i < n; i++) {
    const sp = document.createElement('div'); sp.style.cssText = 'position:absolute;width:8px;height:8px;border-radius:50%;pointer-events:none;opacity:.95;';
    sp.style.left = (cx - 4) + 'px'; sp.style.top = (cy - 4) + 'px'; sp.style.background = randColor(); balloonArea.appendChild(sp);
    const ang = Math.random() * Math.PI * 2, dist = rnd(30, 90), dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    sp.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(${rnd(.7, 1.2)})`, opacity: 0 }],
      { duration: rndi(450, 800), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }); setTimeout(() => sp.remove(), 820);
  }
}
function spawnBalloon() {
if (!balloonArea) return;

  const el = document.createElement('div'); el.className = 'balloon'; el.textContent = '🎈'; el.style.fontSize = MODO_FACIL ? '72px' : '32px';
  el.style.bottom = 'auto'; el.style.transition = 'transform .12s ease'; balloonArea.appendChild(el);
  const area = balloonArea.getBoundingClientRect(); let x = rnd(80, area.width - 80), y = rnd(area.height * .35, area.height * .65);
  let vx = rnd(-.25, .25), vy = rnd(-.2, .2); if (MODO_FACIL) { vx *= .7; vy *= .7; }
  const b = { el, x, y, vx, vy, hp: rndi(1, 2), confetti: Math.random() < .75, dead: false, seed: Math.random() * Math.PI * 2 };
  el.addEventListener('click', () => {
    if (paused || b.dead) return;
    el.animate([{ transform: `translate(${b.x}px,${b.y}px) rotate(0)` }, { transform: `translate(${b.x - 1}px,${b.y}px) rotate(-1deg)` }, { transform: `translate(${b.x + 1}px,${b.y}px) rotate(1deg)` }, { transform: `translate(${b.x}px,${b.y}px) rotate(0)` }], { duration: 320, easing: 'ease' });
    beep(640 + (b.hp * 30), .07, 'square', .16); b.hp--;
    if (b.hp <= 0) {
      b.dead = true;
      const r = balloonArea.getBoundingClientRect(), br = el.getBoundingClientRect(), cx = br.left - r.left + br.width / 2, cy = br.top - r.top + br.height / 2;
      el.animate([{ transform: `translate(${b.x}px,${b.y}px) scale(1)`, opacity: 1 }, { transform: `translate(${b.x}px,${b.y}px) scale(1.25)`, opacity: 0 }], { duration: 180, easing: 'ease-out', fill: 'forwards' });
      if (b.confetti) emitLocalConfetti(cx, cy, 28); setTimeout(() => el.remove(), 190);
      poppedRound++; tagBalloons.textContent = 'Globos: ' + poppedRound; setSegmentsFraction(poppedRound, GOAL_BALLOONS);
      if (poppedRound >= GOAL_BALLOONS) { onGameCompleted(); }
    }
  });
  el.style.position = 'absolute'; el.style.left = '0'; el.style.top = '0'; el.style.transform = `translate(${x}px,${y}px)`; balloons.push(b);
}
function step() {
  if (paused) { rafId = requestAnimationFrame(step); return; }
  const area = balloonArea.getBoundingClientRect(), t = performance.now();
  for (const b of balloons) {
    if (b.dead) continue;
    b.vx += Math.sin((t / 1000) + b.seed + b.x * .005) * PHY.DRIFT; b.vx *= PHY.DAMPING; b.vy *= PHY.DAMPING;
    b.vx = clamp(b.vx, PHY.MAX_VX); b.vy = clamp(b.vy, PHY.MAX_VY); b.x += b.vx; b.y += b.vy;
    if (b.x < 20) { b.x = 20; b.vx = Math.abs(b.vx) * PHY.BOUNCE; } if (b.x > area.width - 20) { b.x = area.width - 20; b.vx = -Math.abs(b.vx) * PHY.BOUNCE; }
    if (b.y < 20) { b.y = 20; b.vy = Math.abs(b.vy) * PHY.BOUNCE; } if (b.y > area.height - 20) { b.y = area.height - 20; b.vy = -Math.abs(b.vy) * PHY.BOUNCE; }
    b.el.style.transform = `translate(${b.x}px,${b.y}px)`;
  }
  rafId = requestAnimationFrame(step);
}

function startBalloons(){
  if (btnModo){
    btnModo.dataset.on = MODO_FACIL ? "1" : "0";
    btnModo.textContent = `Modo fácil: ${MODO_FACIL ? 'ON' : 'OFF'}`;
  }

  clearBalloons();

  // tagMode es opcional (en esta vista puede no existir)
  const tag = $('#tagMode');
  if (tag) tag.textContent = 'Modo: Globos';

  for(let i = 0; i < GOAL_BALLOONS; i++) spawnBalloon();
  step();
}

//#endregion

//#region Piano keyboard
const bigKey   = $('#bigKey');
const subKey   = $('#subKey');           // puede ser null
const tray     = $('#rainbowTray');
const tagKeys  = $('#tagKeys');
const pianoPic = $('#pianoPic');

let keyCount   = 0;
let pianoSeq   = [];     // letras que faltan por escribir
let pianoWord  = null;   // palabra actual (objeto { id, letters })
let pianoDone  = false;  // true solo mientras se muestra la imagen final

// cuántas palabras ha completado el niño en este juego
let pianoWins = 0;
// cambia a 4 si quieres 4 palabras antes del overlay
const PIANO_WINS_TO_OVERLAY = 3;

// bloqueo mientras suena el audio de una letra
let pianoLocked = false;
let pianoAudio = null;

// Banco de palabras + imagen asociada
const PIANO_WORDS = [
  { id: 'casa',     letters: ['C','A','S','A'] },
  { id: 'dedo',     letters: ['D','E','D','O'] },
  { id: 'gato',     letters: ['G','A','T','O'] },
  { id: 'mimo',     letters: ['M','I','M','O'] },
  { id: 'oso',      letters: ['O','S','O'] },
  { id: 'perro',    letters: ['P','E','R','R','O'] },
  { id: 'mariposa', letters: ['M','A','R','I','P','O','S','A'] },
  { id: 'abeja',    letters: ['A','B','E','J','A'] }
];

// Pool de palabras para no repetir hasta agotar todas
let pianoPool = [];
let pianoPoolIndex = 0;

// Mezcla un array (Fisher–Yates)
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Rellena y mezcla el pool de palabras
function refillPianoPool() {
  pianoPool = [...PIANO_WORDS];
  shuffleArray(pianoPool);
  pianoPoolIndex = 0;
}

// Devuelve la siguiente palabra del pool sin repetir hasta agotar todas
function getNextPianoWord() {
  if (!pianoPool.length || pianoPoolIndex >= pianoPool.length) {
    refillPianoPool();
  }
  const word = pianoPool[pianoPoolIndex];
  pianoPoolIndex++;
  return word;
}

// Efecto de rayita de colores
function makeStripe() {
  if (!tray) return;
  const s = document.createElement('div');
  s.className = 'rain';
  const h = Math.floor(Math.random() * 360);
  s.style.background =
    `linear-gradient(90deg,hsl(${h} 90% 65%),hsl(${(h + 60) % 360} 90% 60%))`;
  s.style.top = (70 + Math.random() * 40) + '%';
  tray.appendChild(s);
  setTimeout(() => s.remove(), 1400);
}

// --- audio por letra ---
const PIANO_AUDIO_BASE = 'audio/piano/';

function playLetterSound(letter, onDone) {
  if (pianoAudio) {
    pianoAudio.pause();
    pianoAudio.currentTime = 0;
  }

  const src = `${PIANO_AUDIO_BASE}${letter}.mp3`;
  const audio = new Audio(src);
  pianoAudio = audio;

  audio.onended = () => {
    pianoAudio = null;
    pianoLocked = false;
    if (typeof onDone === 'function') onDone();
  };

  audio.onerror = () => {
    pianoAudio = null;
    pianoLocked = false;
    if (typeof onDone === 'function') onDone();
  };

  pianoLocked = true;
  audio.play().catch(() => {
    pianoAudio = null;
    pianoLocked = false;
    if (typeof onDone === 'function') onDone();
  });
}

// Mostrar imagen + cartel ¡Bravo!
function showPianoImage() {
  if (!pianoWord || !pianoPic) return;

  pianoPic.src = `img/piano/${pianoWord.id}.png`;
  pianoPic.style.opacity = 0;
  pianoPic.style.transform = 'translate(-50%, -50%) scale(0.7)';

  pianoPic.animate(
    [
      { opacity: 0, transform: 'translate(-50%, -50%) scale(0.7)' },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1.0)' }
    ],
    { duration: 350, easing: 'ease-out', fill: 'forwards' }
  );

  let bravo = document.getElementById('pianoBravo');
  if (!bravo) {
    bravo = document.createElement('div');
    bravo.id = 'pianoBravo';
    bravo.className = 'piano-bravo';
    bravo.textContent = '¡Bravo!';
    pianoPic.parentNode.appendChild(bravo);
  }

  bravo.style.opacity = 0;
  bravo.style.transform = 'translateX(-50%) scale(0.7)';

  bravo.animate(
    [
      { opacity: 0, transform: 'translateX(-50%) scale(0.7)' },
      { opacity: 1, transform: 'translateX(-50%) scale(1.0)' }
    ],
    { duration: 300, easing: 'ease-out', fill: 'forwards', delay: 200 }
  );
}

// Inicia o reinicia completamente el juego de teclas
function startPianoKeys() {
  keyCount  = 0;
  pianoDone = false;
  pianoLocked = false;
  tagKeys.textContent = 'Teclas: 0';

  // Cancelar animaciones anteriores
  if (bigKey && bigKey.getAnimations) {
    bigKey.getAnimations().forEach(a => a.cancel());
  }
  if (subKey && subKey.getAnimations) {
    subKey.getAnimations().forEach(a => a.cancel());
  }

  // Elegir la siguiente palabra del pool
  pianoWord = getNextPianoWord();
  pianoSeq  = [...pianoWord.letters];

  // Mostrar bigKey y subKey
  if (bigKey) {
    bigKey.style.visibility = 'visible';
    bigKey.style.opacity = 1;
    bigKey.style.transform = 'translateY(0)';
    bigKey.textContent = pianoSeq.join(' ');
  }

  if (subKey) {
    subKey.style.visibility = 'visible';
    subKey.style.opacity = 1;
    subKey.style.transform = 'translateY(0)';
    subKey.textContent = 'Presiona las letras en orden';
  }

  // Ocultar imagen anterior
  if (pianoPic) {
    pianoPic.style.opacity = 0;
    pianoPic.src = '';
  }

  const oldBravo = document.getElementById('pianoBravo');
  if (oldBravo) oldBravo.remove();
}

// Manejo de teclas
window.addEventListener('keydown', e => {
  if (typeof paused !== 'undefined' && paused) return;
  if (['1','2','3'].includes(e.key)) return;
  const scrKeys = $('#scr-keys');
  if (!scrKeys || !scrKeys.classList.contains('active')) return;

  // bloqueado por audio o ya terminó palabra
  if (pianoLocked || !pianoSeq.length || pianoDone) return;

  const k = e.key.toUpperCase();
  keyCount++;
  tagKeys.textContent = 'Teclas: ' + keyCount;

  if (k === pianoSeq[0]) {
    playLetterSound(k);
    pianoSeq.shift();
    makeStripe();

    if (pianoSeq.length) {
      bigKey.textContent = pianoSeq.join(' ');
    } else {
      // palabra completa
      pianoDone = true;
      bigKey.textContent = pianoWord.letters.join(' ');

      // esconder bigKey y subKey
      if (bigKey && bigKey.animate) {
        const fade = bigKey.animate(
          [
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(10px)' }
          ],
          { duration: 250, easing: 'ease-out', fill: 'forwards' }
        );
        fade.onfinish = () => {
          bigKey.style.opacity = 0;
          bigKey.style.visibility = 'hidden';
        };
      } else {
        bigKey.style.opacity = 0;
        bigKey.style.visibility = 'hidden';
      }

      if (subKey) {
        if (subKey.animate) {
          const fade2 = subKey.animate(
            [
              { opacity: 1, transform: 'translateY(0)' },
              { opacity: 0, transform: 'translateY(6px)' }
            ],
            { duration: 200, easing: 'ease-out', fill: 'forwards' }
          );
          fade2.onfinish = () => {
            subKey.style.opacity = 0;
            subKey.style.visibility = 'hidden';
          };
        } else {
          subKey.style.opacity = 0;
          subKey.style.visibility = 'hidden';
        }
      }

      // Mostrar imagen
      showPianoImage();

      // Decidir siguiente paso
      setTimeout(() => {
        pianoWins++;

        if (pianoWins >= PIANO_WINS_TO_OVERLAY) {
          // mostramos overlay LOCAL del piano
          pianoWins = 0;
          if (typeof showOverlay === 'function') {
            showOverlay(8, () => {
              // al salir del overlay, reabrimos la pantalla de teclas
              openScreen('keys');
              startPianoKeys();
            });
          } else {
            startPianoKeys();
          }
        } else {
          // siguiente palabra sin overlay
          startPianoKeys();
        }
      }, 1200);
    }
  } else {
    // letra incorrecta
    beep(260, 0.07, 'square', 0.12);
  }
});

//#endregion


//#region Busca la letra
const lettersBig  = $('#lettersBig');
const lettersSub  = $('#lettersSub');
const lettersTray = $('#lettersTray');
const tagLetters  = $('#tagLetters');

// Letras fáciles
const LETTERS_EASY = ['A','E','I','O','U','C','S','M','P','G'];

// Configuración
const HITS_PER_LETTER = 3;   // cuántas veces deben presionar cada letra
const GOAL_LETTERS = 8;      // cuántas letras diferentes deben completar

// Estado
let currentLetter = '';
let currentHits   = 0;
let totalLetters  = 0;
let lettersActive = false;
let letterLock    = false;   // evita spam de teclas rápidas
let lastKeyTime   = 0;


function lettersStripe() {
  const s = document.createElement('div');
  s.className = 'rain';
  const h = Math.floor(Math.random()*360);
  s.style.background =
    `linear-gradient(90deg,hsl(${h} 90% 65%), hsl(${(h+60)%360} 90% 60%))`;
  s.style.top = (60 + Math.random()*30) + '%';
  lettersTray.appendChild(s);
  setTimeout(()=> s.remove(), 1200);
}

function newLetter() {
  currentHits = 0;
  currentLetter = LETTERS_EASY[Math.floor(Math.random() * LETTERS_EASY.length)];

  lettersBig.textContent = currentLetter;
  lettersSub.textContent = `Presiona la letra "${currentLetter}" (${currentHits}/${HITS_PER_LETTER})`;

  tagLetters.textContent = `Aciertos: ${totalLetters}/${GOAL_LETTERS}`;
}

function startLettersGame() {
  lettersActive = true;
  letterLock = false;
  totalLetters = 0;

  newLetter();

  tagLetters.textContent = `Aciertos: 0/${GOAL_LETTERS}`;
}

window.addEventListener('keydown', (e) => {
  if (!lettersActive) return;

  const now = Date.now();
  if (now - lastKeyTime < 140) return; // anti-spam
  lastKeyTime = now;

  // solo letras
  const key = e.key.toUpperCase();
  if (!/^[A-ZÑ]$/.test(key)) return;

  if (letterLock) return;

  // ¿CORRECTA?
  if (key === currentLetter) {
    currentHits++;
    beep(600, .08, 'sine', .2);
    lettersStripe();

    lettersSub.textContent =
      `Presiona la letra "${currentLetter}" (${currentHits}/${HITS_PER_LETTER})`;

    // ¿Completó las 3 veces?
    if (currentHits >= HITS_PER_LETTER) {
      totalLetters++;
      tagLetters.textContent = `Aciertos: ${totalLetters}/${GOAL_LETTERS}`;

      // ¿FIN DEL JUEGO?
      if (totalLetters >= GOAL_LETTERS) {
        lettersBig.textContent = "¡Muy bien!";
        lettersSub.textContent = "Terminaste todas las letras";
        lettersActive = false;
        onGameCompleted?.();
      } else {
        // nueva letra
        newLetter();
      }
    }

  } else {
    beep(240, .08, 'square', .14);

    lettersBig.animate(
      [
        { transform:'scale(1)' },
        { transform:'scale(1.08)' },
        { transform:'scale(1)' }
      ],
      { duration: 150 }
    );
  }
});

//#endregion

//#region Casitas drag n drop
const palette = $('#palette'), dropzones = document.querySelectorAll('.dropzone');
const ANIMALS = ['🐶', '🐱', '🦊', '🐼', '🐻', '🐰', '🐸', '🐨', '🐵', '🐯', '🐝', '🐌', '🦋', '🐮', '🫎', '🐹'];
let dragItem = null, offsetX = 0, offsetY = 0, solvedRound = 0, solvedTotal = 0, currentSet = [];
function buildDropzonesWith(animals) {
  dropzones.forEach((dz, i) => {
    dz.classList.remove('correct'); dz.dataset.key = animals[i];
    const ghost = dz.querySelector('.ghost'); if (ghost) { ghost.textContent = animals[i]; ghost.style.visibility = 'visible'; }
    [...dz.querySelectorAll('.piece')].forEach(p => p.remove());
  });
}
function buildPaletteFrom(animals) {
  palette.innerHTML = ''; shuffle(animals).forEach(em => { const el = document.createElement('div'); el.className = 'piece'; el.textContent = em; palette.appendChild(el); });
}
function startDragHome(hardReset = true) {
  if (hardReset) solvedTotal = 0; solvedRound = 0;
  currentSet = shuffle(ANIMALS).slice(0, 3);
  buildDropzonesWith(currentSet); buildPaletteFrom(currentSet);
  tagKeys.textContent = `Casitas: ${solvedTotal}/9`;
}
function getDropAt(x, y) { for (const z of dropzones) { const r = z.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return z; } return null; }

document.addEventListener('pointerdown', e => {
  const t = e.target; if (!t.classList.contains('piece')) return;
  dragItem = t; dragItem.setPointerCapture?.(e.pointerId); dragItem.classList.add('dragging');
  const r = dragItem.getBoundingClientRect(); offsetX = e.clientX - r.left; offsetY = e.clientY - r.top;
  dragItem.style.position = 'fixed'; dragItem.style.left = r.left + 'px'; dragItem.style.top = r.top + 'px'; dragItem.style.zIndex = 1000;
});
document.addEventListener('pointermove', e => {
  if (!dragItem) return; dragItem.style.left = (e.clientX - offsetX) + 'px'; dragItem.style.top = (e.clientY - offsetY) + 'px';
});
document.addEventListener('pointerup', e => {
  if (!dragItem) return;
  const drop = getDropAt(e.clientX, e.clientY), emoji = dragItem.textContent;
  if (drop && drop.dataset.key === emoji) {
    drop.classList.add('correct'); const ghost = drop.querySelector('.ghost'); if (ghost) ghost.style.visibility = 'hidden';
    dragItem.classList.remove('dragging'); dragItem.style.pointerEvents = 'none'; dragItem.style.zIndex = ''; drop.appendChild(dragItem);
    dragItem.classList.add('placed'); dragItem.style.position = ''; dragItem.style.left = ''; dragItem.style.top = '';
    const rr = drop.getBoundingClientRect(); confettiIn(drop, rr.width / 2, rr.height * 0.35, 18);
    solvedRound++; solvedTotal++; tagKeys.textContent = `Casitas: ${solvedTotal}/9`; beep(700, .08, 'sine', .22);
    if (solvedTotal >= 9) { onGameCompleted(); }
    else if (solvedRound >= 3) { setTimeout(() => startDragHome(false), 500); }
  } else {
    dragItem.classList.remove('dragging'); dragItem.style.position = 'relative'; dragItem.style.left = '0'; dragItem.style.top = '0'; dragItem.style.zIndex = ''; palette.appendChild(dragItem); beep(250, .07, 'square', .12);
  }
  dragItem.releasePointerCapture?.(e.pointerId); dragItem = null;
});
//#endregion

//#region Click suave
const clickArea = $('#clickArea'), toast = $('#toast'), mouseGhost = $('#mouseGhost');
const chipLeft = $('#chipLeft'), chipRight = $('#chipRight');
const btnLeft = mouseGhost?.querySelector('.btn-left'), btnRight = mouseGhost?.querySelector('.btn-right');
let left = 0, right = 0;
document.addEventListener('contextmenu', e => e.preventDefault());
function pulse(x, y) {
  const p = document.createElement('div'); p.className = 'pulse'; p.style.left = x + 'px'; p.style.top = y + 'px'; clickArea.appendChild(p); setTimeout(() => p.remove(), 650);
}
function moveGhost(e) {
  const r = clickArea.getBoundingClientRect(); mouseGhost.style.left = (e.clientX - r.left) + 'px'; mouseGhost.style.top = (e.clientY - r.top) + 'px';
}
function startClicks() { left = 0; right = 0; chipLeft.textContent = 'Izq: 0'; chipRight.textContent = 'Der: 0'; }
function flash(el, cls, ms = 160) { if (!el) return; el.classList.add(cls); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove(cls), ms); }
clickArea?.addEventListener('mousemove', e => { if (!paused) moveGhost(e); });
clickArea?.addEventListener('mousedown', e => {
  if (paused) return;
  moveGhost(e);
  if (e.button === 0) {
    chipLeft.textContent = 'Izq: ' + (++left); flash(btnLeft, 'active-left'); toast.textContent = 'Clic izquierdo'; beep(760, .08, 'sine', .18);
  } else if (e.button === 2) {
    chipRight.textContent = 'Der: ' + (++right); flash(btnRight, 'active-right'); toast.textContent = 'Clic derecho'; beep(420, .08, 'square', .18);
  }
  toast.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => toast.classList.remove('show'), 700);
  const r = clickArea.getBoundingClientRect(); pulse(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mouseup', () => { btnLeft?.classList.remove('active-left'); btnRight?.classList.remove('active-right'); });
//#endregion

//#region Confetti
function makeConfetti(n = 80) {
  const box = $('#confetti');
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div'); c.className = 'conf';
    const size = rnd(6, 12); c.style.width = size + 'px'; c.style.height = (size * 1.3) + 'px';
    const h = Math.floor(Math.random() * 360); c.style.background = `hsl(${h} 90% 60%)`;
    c.style.left = rnd(0, 100) + '%'; c.style.top = '-10px'; box.appendChild(c);
    const x = rnd(-40, 40), rot = rnd(0, 360);
    c.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${x}px,110vh) rotate(${rot}deg)`, opacity: 1 }],
      { duration: rnd(1200, 2000), easing: 'cubic-bezier(.15,.6,.2,1)', fill: 'forwards' });
    setTimeout(() => c.remove(), 2100);
  }
}
function confettiIn(container, x, y, n = 18) {
  for (let i = 0; i < n; i++) {
    const sp = document.createElement('div'); sp.style.cssText = 'position:absolute;width:8px;height:8px;border-radius:50%;pointer-events:none;opacity:.95;';
    sp.style.left = (x - 4) + 'px'; sp.style.top = (y - 4) + 'px'; sp.style.background = `hsl(${Math.floor(Math.random() * 360)} 90% 60%)`; container.appendChild(sp);
    const ang = Math.random() * Math.PI * 2, dist = Math.random() * 80 + 30, dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    sp.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(${0.8 + Math.random() * 0.6})`, opacity: 0 }],
      { duration: 450 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    setTimeout(() => sp.remove(), 900);
  }
}
//#endregion

//#region Laberinto
const maze = document.getElementById('maze');
const player = document.getElementById('player');
const startDot = document.getElementById('startDot');
const goalDot = document.getElementById('goalDot');

let mazeDragging = false, mazeRounds = 0, mazeEasy = true, mazeDir = 1;

function placeDots() {
  const t1 = document.querySelector('.track.t1');
  const t3 = document.querySelector('.track.t3');
  if (!maze || !t1 || !t3) return;
  const rm = maze.getBoundingClientRect(), r1 = t1.getBoundingClientRect(), r3 = t3.getBoundingClientRect();
  const sL = r1.left - rm.left - 30, sY = r1.top - rm.top + r1.height / 2 - 30;
  const gR = r3.right - rm.left - 30, gY = r3.top - rm.top + r3.height / 2 - 30;
  const startX = mazeDir === 1 ? sL : gR, startY = mazeDir === 1 ? sY : gY;
  const goalX = mazeDir === 1 ? gR : sL, goalY = mazeDir === 1 ? gY : sY;
  startDot.style.left = `${startX}px`; startDot.style.top = `${startY}px`;
  goalDot.style.left = `${goalX}px`; goalDot.style.top = `${goalY}px`;
}
function resetPlayer() {
  const rm = maze.getBoundingClientRect(), rs = startDot.getBoundingClientRect();
  player.style.left = (rs.left - rm.left) + 'px'; player.style.top = (rs.top - rm.top) + 'px';
}
function isOnTrack(x, y) {
  const stack = document.elementsFromPoint(x, y) || [];
  return stack.some(el => el?.classList?.contains('track'));
}
function onGoalOverlap() {
  const mr = maze.getBoundingClientRect(), pr = player.getBoundingClientRect(), gr = goalDot.getBoundingClientRect();
  const pcx = pr.left - mr.left + pr.width / 2, pcy = pr.top - mr.top + pr.height / 2, gcx = gr.left - mr.left + gr.width / 2, gcy = gr.top - mr.top + gr.height / 2;
  return Math.hypot(pcx - gcx, pcy - gcy) < 34;
}
function failMaze() { maze.classList.add('fail'); setTimeout(() => maze.classList.remove('fail'), 220); beep(220, .07, 'square', .18); resetPlayer(); }

function successMaze() {
  const rr = maze.getBoundingClientRect(), gr = goalDot.getBoundingClientRect();
  confettiIn(maze, gr.left - rr.left + 30, gr.top - rr.top + 30, 24); beep(760, .08, 'sine', .22);
  mazeRounds += 1;

  if (mazeRounds >= 2) {
    showBeePopUp(1200).then(() => {
      if (playActive) {
        mazeRounds = 0; mazeDir = 1; onGameCompleted();
      } else {
        showOverlay(8, () => { mazeRounds = 0; mazeDir = 1; startMaze(true); });
      }
    });
  } else {
    mazeDir *= -1;
    setTimeout(() => startMaze(false), 500);
  }
}

function startMaze(resetRounds = true) {
  if (typeof MODO_FACIL !== 'undefined') mazeEasy = MODO_FACIL;
  maze.classList.toggle('easy', !!mazeEasy);
  if (resetRounds) { mazeRounds = 0; mazeDir = 1; }
  placeDots(); resetPlayer();
}
window.addEventListener('resize', () => { placeDots(); resetPlayer(); });

player.addEventListener('pointerdown', e => {
  e.preventDefault(); mazeDragging = true; player.classList.add('dragging');
  player.style.pointerEvents = 'none'; player.setPointerCapture?.(e.pointerId); ensureAudio();
});
window.addEventListener('pointermove', e => {
  if (!mazeDragging) return;
  const rm = maze.getBoundingClientRect();
  player.style.left = (e.clientX - rm.left - player.offsetWidth / 2) + 'px';
  player.style.top = (e.clientY - rm.top - player.offsetHeight / 2) + 'px';
  if (!isOnTrack(e.clientX, e.clientY) && !onGoalOverlap()) {
    failMaze(); mazeDragging = false; player.classList.remove('dragging'); player.style.pointerEvents = '';
  }
});
window.addEventListener('pointerup', () => {
  if (!mazeDragging) return; player.classList.remove('dragging');
  onGoalOverlap() ? successMaze() : failMaze();
  mazeDragging = false; player.style.pointerEvents = '';
});

/* Popup de la abeja */
let beeModal = null;
function ensureBeeModal() {
  if (beeModal) return beeModal;
  const wrap = document.createElement('div');
  wrap.className = 'bee-pop';
  wrap.innerHTML = `<div class="bee-card"><img src="img/maze/abeja.png" alt="Flores conseguidas!"></div>`;
  document.body.appendChild(wrap);
  beeModal = wrap; return beeModal;
}
function showBeePopUp(ms = 1200) {
  return new Promise(res => {
    const m = ensureBeeModal(); m.classList.add('show'); makeConfetti(60);
    setTimeout(() => { m.classList.remove('show'); res(); }, ms);
  });
}
//#endregion

//#region Ratón y queso
const cheeseStage = $('#cheeseStage');
const cheeseMouse = $('#cheeseMouse');
const cheeseGoal = $('#cheeseGoal');
const tagCheese = $('#tagCheese');

const CHEESE_TARGET = 10;
let cheeseCount = 0;
let CHEESE_SEG = [];
let cheeseDragging = false;

function ensureCheeseLayout() {
  const stage = $('#scr-cheese .stage');
  if (!stage || !cheeseStage) return;
  const cs = cheeseStage.style;
  cs.position = 'absolute';
  cs.left = '0'; cs.top = '0'; cs.right = '0'; cs.bottom = '0';
}

function setupCheeseBar() {
  const wrap = $('#cwrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  CHEESE_SEG.length = 0;
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('div'); s.className = 'seg'; wrap.appendChild(s); CHEESE_SEG.push(s);
  }
  setCheeseSegments(0, CHEESE_TARGET);
}
function setCheeseSegments(done, total) {
  const n = CHEESE_SEG.length || 10;
  const on = Math.min(n, Math.round((done / Math.max(1, total)) * n));
  CHEESE_SEG.forEach((s, i) => s.classList.toggle('on', i < on));
}
function centerCheeseMouse() {
  if (!cheeseStage || !cheeseMouse) return;
  const r = cheeseStage.getBoundingClientRect();
  const x = r.width / 2 - cheeseMouse.offsetWidth / 2;
  const y = r.height / 2 - cheeseMouse.offsetHeight / 2;
  cheeseMouse.style.left = x + 'px'; cheeseMouse.style.top = y + 'px';
}
function placeRandomCheese() {
  if (!cheeseStage || !cheeseGoal) return;
  const r = cheeseStage.getBoundingClientRect();
  const pad = 30;
  const maxX = r.width - cheeseGoal.offsetWidth - pad;
  const maxY = r.height - cheeseGoal.offsetHeight - pad;
  const gx = Math.max(pad, Math.min(maxX, Math.floor(Math.random() * maxX) + pad));
  const gy = Math.max(pad, Math.min(maxY, Math.floor(Math.random() * maxY) + pad));
  cheeseGoal.style.left = gx + 'px'; cheeseGoal.style.top = gy + 'px';
}
function mouseOverlapCheese() {
  if (!cheeseStage || !cheeseMouse || !cheeseGoal) return false;
  const r = cheeseStage.getBoundingClientRect();
  const mr = cheeseMouse.getBoundingClientRect();
  const gr = cheeseGoal.getBoundingClientRect();
  const mcx = mr.left - r.left + mr.width / 2;
  const mcy = mr.top - r.top + mr.height / 2;
  const gcx = gr.left - r.left + gr.width / 2;
  const gcy = gr.top - r.top + gr.height / 2;
  return Math.hypot(mcx - gcx, mcy - gcy) < 34;
}
function eatCheese() {
  if (!cheeseStage || !cheeseGoal) return;
  const r = cheeseStage.getBoundingClientRect();
  const gr = cheeseGoal.getBoundingClientRect();
  confettiIn(cheeseStage, gr.left - r.left + 30, gr.top - r.top + 30, 22);
  beep(760, .08, 'sine', .22);
}
function startCheese(reset = true) {
  if (!cheeseStage || !cheeseMouse || !cheeseGoal || !tagCheese) return;
  ensureCheeseLayout();
  if (reset) {
    cheeseCount = 0; setupCheeseBar();
  }
  tagCheese.textContent = `Quesos: ${cheeseCount} / ${CHEESE_TARGET}`;
  requestAnimationFrame(() => { centerCheeseMouse(); placeRandomCheese(); });
}

// eventos del juego de queso
cheeseMouse?.addEventListener('pointerdown', (e) => {
  e.preventDefault(); cheeseDragging = true;
  cheeseMouse.style.pointerEvents = 'none';
  cheeseMouse.setPointerCapture?.(e.pointerId);
  ensureAudio();
});
window.addEventListener('pointermove', (e) => {
  if (!cheeseDragging || paused || !cheeseStage || !cheeseMouse) return;
  const r = cheeseStage.getBoundingClientRect();
  let nx = e.clientX - r.left - cheeseMouse.offsetWidth / 2;
  let ny = e.clientY - r.top - cheeseMouse.offsetHeight / 2;
  nx = Math.max(0, Math.min(nx, r.width - cheeseMouse.offsetWidth));
  ny = Math.max(0, Math.min(ny, r.height - cheeseMouse.offsetHeight));
  cheeseMouse.style.left = nx + 'px'; cheeseMouse.style.top = ny + 'px';
  if (mouseOverlapCheese()) {
    eatCheese();
    cheeseCount += 1;
    tagCheese.textContent = `Quesos: ${cheeseCount} / ${CHEESE_TARGET}`;
    setCheeseSegments(cheeseCount, CHEESE_TARGET);
    if (cheeseCount >= CHEESE_TARGET) {
      showOverlay(8, () => startCheese(true));
    } else {
      placeRandomCheese();
    }
  }
});
window.addEventListener('pointerup', () => {
  if (!cheeseDragging || !cheeseMouse) return;
  cheeseDragging = false; cheeseMouse.style.pointerEvents = '';
});
//#endregion

//#region Sorting de colores
const field = $('#colorField');
const bins = document.querySelectorAll('#scr-sort .bin');
const tagSort = $('#tagSort');
const sortWrap = $('#sortWrap');
const btnSortSpeak = $('#btnSortSpeak');
const shelfEl = document.querySelector('#scr-sort .shelf');
let audioLocked = false;


const COLORS = [
  { key: 'rojo', label: 'Rojo', cls: 'clr-rojo' },
  { key: 'amarillo', label: 'Amarillo', cls: 'clr-amarillo' },
  { key: 'morado', label: 'Morado', cls: 'clr-morado' },
  { key: 'azul', label: 'Azul', cls: 'clr-azul' }
];

const TOTAL_PER_COLOR = 5;
const TOTAL = TOTAL_PER_COLOR * COLORS.length;

let placedTotal = 0;
let placedPerColor = { rojo: 0, amarillo: 0, morado: 0, azul: 0 };
let dragBall = null, offX = 0, offY = 0;

let targetColorKey = null;
let SEG_SORT = [];

/* ---------- Bloqueo entre audios ---------- */
let sortLocked = false;
function lockSort(on) {
  sortLocked = !!on;
  field?.classList.toggle('locked', sortLocked);
  shelfEl?.classList.toggle('locked', sortLocked);
}

function lockAudio(on) {
  audioLocked = !!on;
}
/* ---------- Audios ---------- */
const AUDIO_INSTRUCTION = {
  rojo: new Audio('audio/color-sort/color_rojo.mp3'),
  amarillo: new Audio('audio/color-sort/color_amarillo.mp3'),
  morado: new Audio('audio/color-sort/color_morado.mp3'),
  azul: new Audio('audio/color-sort/color_azul.mp3')
};
const AUDIO_WRONG = new Audio('audio/color-sort/color_incorrecto.mp3');
const AUDIO_NEXT = [
  new Audio('audio/color-sort/congrats1.mp3'),
  new Audio('audio/color-sort/congrats2.mp3'),
];
const AUDIO_FINISH = new Audio('audio/color-sort/final_congrats.mp3');

[...Object.values(AUDIO_INSTRUCTION), AUDIO_WRONG, ...AUDIO_NEXT, AUDIO_FINISH]
  .forEach(a => { if (a) { a.preload = 'auto'; a.volume = .95; } });

function stopAllColorAudios() {
  try {
    Object.values(AUDIO_INSTRUCTION).forEach(a => { a.pause(); a.currentTime = 0; });
    AUDIO_WRONG.pause(); AUDIO_WRONG.currentTime = 0;
    AUDIO_NEXT.forEach(a => { a.pause(); a.currentTime = 0; });
    AUDIO_FINISH.pause(); AUDIO_FINISH.currentTime = 0;
  } catch { }
}

async function playAudio(audio, fallbackMs = 1500) {
  if (!audio || audioLocked) return;

  stopAllColorAudios();   // Corta cualquier audio activo

  try {
    lockAudio(true);      // Bloquea audio mientras se reproduce

    audio.currentTime = 0;

    await new Promise(res => {
      const done = () => {
        audio.onended = null;
        res();
      };

      audio.onended = done;

      const p = audio.play();
      if (p?.catch) p.catch(() => setTimeout(done, fallbackMs));

      setTimeout(() => {
        if (audio.onended) done();
      }, fallbackMs + 1000);
    });

  } finally {
    lockAudio(false);
  }
}

function playOneOf(arr) { return playAudio(arr[Math.floor(Math.random() * arr.length)]); }

/* ---------- UI progreso ---------- */
function setupSortSegments(n = 10) {
  sortWrap.innerHTML = ''; SEG_SORT = [];
  for (let i = 0; i < n; i++) { const s = document.createElement('div'); s.className = 'seg'; sortWrap.appendChild(s); SEG_SORT.push(s); }
  setSortSegments(0, TOTAL);
}
function setSortSegments(done, total) {
  const n = SEG_SORT.length || 10;
  const on = Math.min(n, Math.round((done / Math.max(1, total)) * n));
  SEG_SORT.forEach((s, i) => s.classList.toggle('on', i < on));
}

/* ---------- Bins objetivo ---------- */
function markTargetBin() {
  bins.forEach(b => {
    b.classList.remove('target');
    b.style.removeProperty('--highlight');
  });

  const b = [...bins].find(x => x.dataset.color === targetColorKey);
  if (b) {
    const colorMap = {
      rojo: '#ef4444',
      amarillo: '#f5f50b',
      morado: '#8b5cf6',
      azul: '#3b82f6'
    };
    b.style.setProperty('--highlight', colorMap[targetColorKey] || '#22c55e');
    b.classList.add('target');
    b.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
      { duration: 500, easing: 'ease' }
    );
  }
}
/* ---------- Secuencia de colores ---------- */
async function chooseNextTarget(playInstr = true) {
  const remaining = COLORS.filter(c => placedPerColor[c.key] < TOTAL_PER_COLOR);
  if (!remaining.length) {
    lockSort(true);
    await playAudio(AUDIO_FINISH, 1800);
    showOverlay(8, () => { lockSort(false); startSort(); });
    return;
  }
  const nxt = remaining[Math.floor(Math.random() * remaining.length)];
  targetColorKey = nxt.key;
  markTargetBin();
  if (playInstr) await playAudio(AUDIO_INSTRUCTION[targetColorKey], 1200);
}

/* ---------- Pelotas ---------- */
function scatterBalls() {
  field.innerHTML = '';
  const r = field.getBoundingClientRect();
  const pad = 16;

  COLORS.forEach(c => {
    for (let i = 0; i < TOTAL_PER_COLOR; i++) {
      const el = document.createElement('div');
      el.className = `ball ${c.cls}`;
      el.dataset.color = c.key;

      const x = Math.floor(Math.random() * (r.width - 48 - pad * 2)) + pad;
      const y = Math.floor(Math.random() * (r.height - 48 - pad * 2)) + pad;
      el.style.left = x + 'px'; el.style.top = y + 'px';
      field.appendChild(el);

      el.addEventListener('pointerdown', e => {
        if (sortLocked) return;

        dragBall = el;
        el.setPointerCapture?.(e.pointerId);
        el.classList.add('dragging');

        const br = el.getBoundingClientRect();
        offX = e.clientX - br.left;
        offY = e.clientY - br.top;

        el.dataset.ox = parseFloat(el.style.left) || 0;
        el.dataset.oy = parseFloat(el.style.top) || 0;

        ensureAudio();
      });
    }
  });
}

function getBinAt(x, y) {
  for (const z of bins) {
    const r = z.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return z;
  }
  return null;
}

/* ---------- Drag global ---------- */
window.addEventListener('pointermove', e => {
  if (!dragBall) return;
  const fr = field.getBoundingClientRect();
  dragBall.style.left = (e.clientX - fr.left - offX) + 'px';
  dragBall.style.top = (e.clientY - fr.top - offY) + 'px';
});

window.addEventListener('pointerup', e => {
  if (!dragBall) return;

  const ball = dragBall;
  dragBall = null;
  ball.classList.remove('dragging');

  if (sortLocked) {
    bounceBack(ball);
    return;
  }

  const drop = getBinAt(e.clientX, e.clientY);
  const colorBall = ball.dataset.color;

  if (!drop) {
    return;
  }

  const binColor = drop.dataset.color;
  const isRightBin = binColor === colorBall;
  const isRightTarget = binColor === targetColorKey;
  const isFullCorrect = isRightBin && isRightTarget;

  if (isFullCorrect) {
    const fr = field.getBoundingClientRect();
    const hole = drop.querySelector('.bin-hole').getBoundingClientRect();

    ball.style.left = (hole.left - fr.left + hole.width / 2 - 24) + 'px';
    ball.style.top = (hole.top - fr.top + hole.height / 2 - 24) + 'px';
    ball.style.pointerEvents = 'none';

    confettiIn(
      field,
      hole.left - fr.left + hole.width / 2,
      hole.top - fr.top + hole.height / 2,
      14
    );
    beep(720, .08, 'sine', .22);

    drop.classList.add('correct');
    clearTimeout(drop._t);
    drop._t = setTimeout(() => drop.classList.remove('correct'), 450);

    placedTotal++;
    placedPerColor[colorBall] = (placedPerColor[colorBall] || 0) + 1;
    tagSort.textContent = `Correctos: ${placedTotal} / ${TOTAL}`;
    setSortSegments(placedTotal, TOTAL);

    if (placedPerColor[targetColorKey] >= TOTAL_PER_COLOR) {
      (async () => {
        lockSort(true);
        await playOneOf(AUDIO_NEXT);
        await chooseNextTarget(true);
        lockSort(false);
      })();
    } else if (placedTotal >= TOTAL) {
      if (playActive) {
        onGameCompleted();
      } else {
        showOverlay(8, () => startSort());
      }
    }
  } else {

    playAudio(AUDIO_WRONG, 900)
      .then(() => playAudio(AUDIO_INSTRUCTION[targetColorKey], 1200));
    beep(240, .07, 'square', .14);
    bounceBack(ball);
  }
});

function bounceBack(ball) {
  const fr = field.getBoundingClientRect();
  const br = ball.getBoundingClientRect();
  const ox = parseFloat(ball.dataset.ox) || 0;
  const oy = parseFloat(ball.dataset.oy) || 0;
  const curX = br.left - fr.left;
  const curY = br.top - fr.top;
  const dx = ox - curX;
  const dy = oy - curY;

  const anim = ball.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: `translate(${dx}px,${dy}px)` }
    ],
    {
      duration: 220,
      easing: 'cubic-bezier(.2,.9,.2,1)'
    }
  );

  anim.onfinish = () => {
    ball.style.left = ox + 'px';
    ball.style.top = oy + 'px';
  };
}


/* ---------- Arranque / reinicio ---------- */
btnSortSpeak?.addEventListener('click', () => {
  if (targetColorKey && !sortLocked) playAudio(AUDIO_INSTRUCTION[targetColorKey], 1200);
});

function startSort() {
  placedTotal = 0;
  placedPerColor = { rojo: 0, amarillo: 0, morado: 0, azul: 0 };
  tagSort.textContent = `Correctos: 0 / ${TOTAL}`;
  setupSortSegments(10);
  scatterBalls();
  chooseNextTarget(true);
}

//#endregion

//#region Habitats
const habRails = document.getElementById('hab-rails');
const farmZone = document.getElementById('hab-farm');
const jungleZone = document.getElementById('hab-jungle');
const habAnimal = document.getElementById('hab-animal');
const tagHab = document.getElementById('tagHab');
const btnHabAudio = document.getElementById('btnHabAudio');
const btnBackHab = document.getElementById('btnBackHab');
let currentFlyAnim = null;

/* ========= SFX beep() ========= */
function sfxClick() { beep(600, .08, 'sine', .05); }
function sfxFly() { beep(400, .12, 'triangle', .12); setTimeout(() => beep(800, .10, 'sine', .15), 60); }
function sfxDrop() { beep(880, .10, 'sine', .18); setTimeout(() => beep(660, .12, 'sine', .22), 70); }

document.addEventListener('contextmenu', e => {
  if (document.getElementById('scr-habitats')?.classList.contains('active')) e.preventDefault();
});

/* Animales */
const HAB_ANIMALS = [
  { id: 'gallina', type: 'farm' },
  { id: 'vaca', type: 'farm' },
  { id: 'cerdo', type: 'farm' },
  { id: 'perro', type: 'farm' },
  { id: 'pato', type: 'farm' },
  { id: 'caballo', type: 'farm' },
  { id: 'jaguar', type: 'jungle' },
  { id: 'mono', type: 'jungle' },
  { id: 'tucan', type: 'jungle' },
  { id: 'serpiente', type: 'jungle' },
  { id: 'elefante', type: 'jungle' },
  { id: 'perezoso', type: 'jungle' }
];
const srcAnimal = id => `img/habitats/${id}.png`;

/* ========= Audios ========= */
const habAudioInstr = new Audio('audio/habitats/instructions_hab.mp3');

const HAB_CORRECT = [
  new Audio('audio/habitats/correct_hab1.mp3'),
  new Audio('audio/habitats/correct_hab2.mp3'),
  new Audio('audio/habitats/correct_hab3.mp3'),
];
const HAB_INCOR = [
  new Audio('audio/habitats/incorrect_hab1.mp3'),
  new Audio('audio/habitats/incorrect_hab2.mp3'),
];
// preload + volumen
[habAudioInstr, ...HAB_CORRECT, ...HAB_INCOR].forEach(a => { a.preload = 'auto'; a.volume = .95; });

function stopAllHabAudios() {
  try { [habAudioInstr, ...HAB_CORRECT, ...HAB_INCOR].forEach(a => { a.pause(); a.currentTime = 0; }); } catch { }
}
function playOnlyHab(audio, onended) {
  stopAllHabAudios();
  try {
    audio.currentTime = 0;
    if (onended) {
      const h = () => { audio.removeEventListener('ended', h); onended(); };
      audio.addEventListener('ended', h);
    }
    audio.play().catch(() => { });
  } catch { }
}

let habLocked = false;

function lockWhile(audio, after) {
  habLocked = true;
  playOnlyHab(audio, () => { habLocked = false; after?.(); });
}

let praiseIdx = 0, wrongIdx = 0;
let correctSinceVoice = 0, wrongSinceVoice = 0;

function onCorrectMaybeSpeak() {
  correctSinceVoice++;
  if (correctSinceVoice % 2 === 0) {
    const a = HAB_CORRECT[praiseIdx++ % HAB_CORRECT.length];
    playOnlyHab(a);
  }
}

function onWrongMaybeSpeak() {
  wrongSinceVoice++;
  if (wrongSinceVoice % 1 === 0) {
    const a = HAB_INCOR[wrongIdx++ % HAB_INCOR.length];
    playOnlyHab(a);
  } else if (wrongSinceVoice % 3 == 0) {
    beep(220, .07, 'square', .18);
  }
}

/* ========= Estado ========= */
let habQueue = [], habIndex = 0, habDone = 0;
let habFinished = false;
let HAB_SEG = [];
let habClickLock = false;

/* ========= Barra de progreso ========= */
function setupHabBar() {
  const wrap = document.getElementById('habwrap');
  if (!wrap) return;
  wrap.innerHTML = ''; HAB_SEG = [];
  for (let i = 0; i < HAB_ANIMALS.length; i++) {
    const s = document.createElement('div'); s.className = 'seg'; wrap.appendChild(s); HAB_SEG.push(s);
  }
  setHabSeg(0, HAB_ANIMALS.length);
}
function setHabSeg(done, total) {
  const n = HAB_SEG.length || 12;
  const on = Math.min(n, Math.round((done / Math.max(1, total)) * n));
  HAB_SEG.forEach((s, i) => s.classList.toggle('on', i < on));
}

/* ========= Arranque / reinicio ========= */
function startHabitats() {
  habQueue = shuffle(HAB_ANIMALS.slice());
  habIndex = 0;
  habDone = 0;
  habFinished = false;
  habClickLock = false;

  praiseIdx = 0; wrongIdx = 0;
  correctSinceVoice = 0; wrongSinceVoice = 0;

  farmZone?.querySelector('.hab-pile')?.replaceChildren();
  jungleZone?.querySelector('.hab-pile')?.replaceChildren();

  setupHabBar();
  tagHab.textContent = `Correctos: ${habDone} / ${HAB_ANIMALS.length}`;
  loadCurrentAnimal();

  lockWhile(habAudioInstr);
}

/* ========= Utilidades de sprite ========= */
function resetSprite() {
  try { habAnimal.getAnimations?.().forEach(a => a.cancel()); } catch { }
  if (currentFlyAnim) { try { currentFlyAnim.cancel(); } catch { } currentFlyAnim = null; }
  habAnimal.style.opacity = '1';
  habAnimal.style.pointerEvents = '';
  habAnimal.style.left = '50%';
  habAnimal.style.top = '50%';
  habAnimal.style.transform = 'translate(-50%,-50%)';
}

/* ========= Cargar animal actual ========= */
function loadCurrentAnimal() {
  if (habFinished) return;
  const a = habQueue[habIndex]; if (!a) return;

  habClickLock = false;
  resetSprite();

  habAnimal.style.opacity = '0';
  habAnimal.onload = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resetSprite();
      habAnimal.style.opacity = '1';
    }));
  };
  habAnimal.src = srcAnimal(a.id);
  habAnimal.dataset.type = a.type;
  tagHab.textContent = `Correctos: ${habDone} / ${HAB_ANIMALS.length}`;

  const recenter = () => resetSprite();
  window.removeEventListener('resize', recenter);
  window.addEventListener('resize', recenter, { once: true });
}

/* ========= Controles UI ========= */
btnHabAudio?.addEventListener('click', () => lockWhile(habAudioInstr));
btnBackHab?.addEventListener('click', () => { backHome?.(); });

/* ========= Vuelo al hábitat ========= */
function flyAnimalTo(target) {
  return new Promise(resolve => {
    try { habAnimal.getAnimations?.().forEach(a => a.cancel()); } catch { }
    if (currentFlyAnim) { try { currentFlyAnim.cancel(); } catch { } currentFlyAnim = null; }

    const aRect = habAnimal.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    const dx = (tRect.left + tRect.width / 2) - (aRect.left + aRect.width / 2);
    const dy = (tRect.top + tRect.height / 2) - (aRect.top + aRect.height / 2);

    sfxFly();

    currentFlyAnim = habAnimal.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.86)`, opacity: .98 }
      ],
      { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
    );

    currentFlyAnim.onfinish = () => {
      currentFlyAnim = null;

      const img = document.createElement('img');
      img.src = habAnimal.src; img.className = 'hab-thumb';
      target.querySelector('.hab-pile')?.appendChild(img);

      sfxDrop();
      resetSprite();
      resolve();
    };
  });
}

/* ========= Lógica de click ========= */
habAnimal.addEventListener('mousedown', e => {
  if (paused || habFinished || habClickLock || habLocked) return;
  ensureAudio?.();
  sfxClick();
  resetSprite();

  const kind = habAnimal.dataset.type;
  const expectedBtn = (kind === 'farm') ? 0 : 2;
  const good = (e.button === expectedBtn);

  if (!good) {
    habAnimal.animate(
      [
        { transform: 'translate(-50%,-50%)' },
        { transform: 'translate(calc(-50% - 6px),-50%)' },
        { transform: 'translate(calc(-50% + 6px),-50%)' },
        { transform: 'translate(-50%,-50%)' }
      ],
      { duration: 260 }
    );
    onWrongMaybeSpeak();
    return;
  }

  habClickLock = true;
  habAnimal.style.pointerEvents = 'none';
  const target = (e.button === 0) ? farmZone : jungleZone;

  flyAnimalTo(target).then(() => {
    confettiIn?.(habRails, target.offsetLeft + target.offsetWidth / 2, 48, 18);

    habDone++;
    setHabSeg(habDone, HAB_ANIMALS.length);
    tagHab.textContent = `Correctos: ${habDone} / ${HAB_ANIMALS.length}`;

    onCorrectMaybeSpeak();

    if (habDone >= HAB_ANIMALS.length) {
      habFinished = true;
      habAnimal.style.opacity = '0';
      habAnimal.style.pointerEvents = 'none';
      stopAllHabAudios();

      if (playActive) {
        onGameCompleted();
      } else {
        showOverlay(8, () => startHabitats());
      }
      return;
    }

    habIndex++;
    loadCurrentAnimal();
  });
});


//#endregion

//#region Dinos-dig
const dinoStage = document.getElementById('dino-stage');
const dinoBones = document.getElementById('dino-bones');
const dinoGrid = document.getElementById('dino-grid');
const dinoChoices = document.getElementById('dino-choices');
const dinoCards = [];

/* Preguntas cuando se revelan los huesos */
const DINO_QUESTIONS = [
  new Audio('audio/dino-dig/dino-question1.mp3'),
  new Audio('audio/dino-dig/dino-question2.mp3')
];

/* Felicitaciones al acertar */
const DINO_CONGRATS = [
  new Audio('audio/color-sort/congrats1.mp3'),
  new Audio('audio/color-sort/congrats2.mp3'),
  new Audio('audio/habitats/correct_hab2.mp3')
];

/* Incorrectos */
const DINO_WRONG = [
  new Audio('audio/dino-dig/incorrect-dino1.mp3'),
  new Audio('audio/dino-dig/incorrect-dino2.mp3')
];

const DINO_PAIRS = [
  { id: 'stego', bones: 'stego-bones' },
  { id: 'trex', bones: 'trex-bones' },
  { id: 'bronto', bones: 'bronto-bones' },
  { id: 'tricera', bones: 'tricera-bones' },
  { id: 'galli', bones: 'galli-bones' },
  { id: 'para', bones: 'para-bones' },
  { id: 'iguano', bones: 'iguano-bones' },
];

const DINO_OPTIONS = [
  { id: 'ankylo' },
  { id: 'para' },
  { id: 'spino' },
  { id: 'styraco' },
  { id: 'theri' },
  { id: 'raptor' },
  { id: 'pachi' }

];

const DINO_TOTAL_CHOICES = 2;

const ALL_DINOS = [
  ...DINO_PAIRS.map(p => p.id),
  ...DINO_OPTIONS.map(o => o.id)
];

const DINO_TILE_ROWS = 5;
const DINO_TILE_COLS = 10;
const DINO_REVEAL_RATIO = 0.60;

const dinoSweepAudio = new Audio('audio/dino-dig/sweep-broom.mp3');
dinoSweepAudio.loop = true;
dinoSweepAudio.volume = 0.8;

let dinoQueue = [];
let dinoIndex = 0;
let dinoTotalTiles = 0;
let dinoRevealedTiles = 0;
let dinoChoicesShown = false;
let dinoRoundLocked = false;
let dinoBrushing = false;
let dinoQuestionPlayed = false;

[...DINO_QUESTIONS, ...DINO_CONGRATS, ...DINO_WRONG].forEach(a => {
  a.preload = 'auto';
  a.volume = 0.95;
});

function dinoStopAllAudio() {
  [...DINO_QUESTIONS, ...DINO_CONGRATS, ...DINO_WRONG].forEach(a => {
    try { a.pause(); a.currentTime = 0; } catch { }
  });
}

function dinoPlayOnly(audio, onended) {
  dinoStopAllAudio();
  try {
    audio.currentTime = 0;
    if (onended) {
      const h = () => {
        audio.removeEventListener('ended', h);
        onended();
      };
      audio.addEventListener('ended', h);
    }
    audio.play().catch(() => { });
  } catch { }
}


function dinoRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dinoSetBonesImage(pair) {
  if (!dinoBones) return;
  dinoBones.src = `img/dino-dig/${pair.bones}.png`;
}

function dinoBuildGrid() {
  if (!dinoGrid) return;
  dinoGrid.innerHTML = '';
  dinoTotalTiles = 0;
  dinoRevealedTiles = 0;

  for (let r = 0; r < DINO_TILE_ROWS; r++) {
    for (let c = 0; c < DINO_TILE_COLS; c++) {
      const tile = document.createElement('div');
      tile.className = 'dino-tile';
      tile.dataset.hit = '0';
      dinoGrid.appendChild(tile);
      dinoTotalTiles++;
    }
  }
}

function dinoCheckRevealProgress() {
  if (dinoChoicesShown) return;
  if (!dinoTotalTiles) return;

  const ratio = dinoRevealedTiles / dinoTotalTiles;
  if (ratio >= DINO_REVEAL_RATIO) {
    dinoAskThenShowChoices();
  }

}

function dinoAskThenShowChoices() {
  if (dinoChoicesShown || dinoQuestionPlayed) return;

  dinoQuestionPlayed = true;

  const question = dinoRandom(DINO_QUESTIONS);

  if (!question) {
    dinoShowChoices();
    return;
  }

  dinoPlayOnly(question, () => {
    const scrDinos = document.getElementById('scr-dinos');
    const stillActive = scrDinos && scrDinos.classList.contains('active');

    if (!stillActive || dinoChoicesShown) return;

    dinoShowChoices();
  });
}

function dinoShowChoices() {
  if (!dinoChoices) return;

  const current = dinoQueue[dinoIndex];
  if (!current) return;

  dinoChoicesShown = true;
  dinoRoundLocked = false;

  dinoChoices.innerHTML = "";
  dinoCards.length = 0;

  const correctId = current.id;
  const distractors = ALL_DINOS.filter(id => id !== correctId);
  const chosenDistractors = shuffle(distractors).slice(0, 1);
  const finalOptions = shuffle([correctId, ...chosenDistractors]);

  finalOptions.forEach(id => {
    const btn = document.createElement("button");
    btn.className = "dino-card";
    btn.dataset.dinoId = id;

    const img = document.createElement("img");
    img.className = "dino-card-img";
    img.src = `img/dino-dig/${id}.png`;
    img.alt = id;

    btn.appendChild(img);
    dinoChoices.appendChild(btn);

    btn.addEventListener("click", () => handleDinoChoice(btn));

    dinoCards.push(btn);
  });

  dinoChoices.classList.add('show');
}


function dinoHideChoices() {
  if (!dinoChoices) return;
  dinoChoices.classList.remove('show');
  dinoChoicesShown = false;
  dinoRoundLocked = false;
}

function loadCurrentDino() {
  const current = dinoQueue[dinoIndex];
  if (!current) return;

  dinoRoundLocked = false;
  dinoChoicesShown = false;
  dinoQuestionPlayed = false;

  dinoHideChoices();
  dinoSetBonesImage(current);
  dinoBuildGrid();
}

function startDinos() {
  if (!dinoStage) return;

  dinoQueue = shuffle(DINO_PAIRS.slice());
  dinoIndex = 0;
  dinoRoundLocked = false;
  dinoChoicesShown = false;

  dinoHideChoices();
  loadCurrentDino();
}

function handleDinoChoice(btn) {
  if (!dinoChoicesShown || dinoRoundLocked) return;

  const current = dinoQueue[dinoIndex];
  if (!current) return;

  const correctId = current.id;
  const chosenId = btn.dataset.dinoId;
  const isCorrect = (chosenId === correctId);

  if (isCorrect) {
    dinoRoundLocked = true;

    btn.classList.add('correct');
    btn.classList.remove('wrong');

    dinoPlayOnly(dinoRandom(DINO_CONGRATS));

    confettiIn?.(dinoStage, dinoStage.clientWidth / 2, dinoStage.clientHeight / 2, 22);
    beep(900, .10, 'sine', .2);

    setTimeout(() => {
      dinoIndex++;
      if (dinoIndex >= dinoQueue.length) {
        dinoHideChoices();
        onGameCompleted?.();
      } else {
        dinoHideChoices();
        loadCurrentDino();
      }
    }, 1100);

  } else {
    dinoPlayOnly(dinoRandom(DINO_WRONG));
    beep(220, .09, 'square', .18);

    btn.classList.add('wrong');
    btn.classList.remove('correct');

    btn.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' }
      ],
      { duration: 260 }
    );
  }
}

function dinoHitTileAt(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el || !el.classList || !el.classList.contains('dino-tile')) return;

  if (el.dataset.hit === '1') return;

  el.dataset.hit = '1';
  el.classList.add('gone');
  dinoRevealedTiles++;
  dinoCheckRevealProgress();
}

dinoStage?.addEventListener('pointerdown', e => {
  if (paused) return;
  if (!dinoGrid) return;

  ensureAudio?.();
  dinoBrushing = true;

  try {
    dinoSweepAudio.currentTime = 0;
    dinoSweepAudio.play().catch(() => { });
  } catch { }

  dinoHitTileAt(e.clientX, e.clientY);
});

window.addEventListener('pointermove', e => {
  if (!dinoBrushing) return;
  dinoHitTileAt(e.clientX, e.clientY);
});

window.addEventListener('pointerup', () => {
  if (!dinoBrushing) return;
  dinoBrushing = false;

  try {
    dinoSweepAudio.pause();
    dinoSweepAudio.currentTime = 0;
  } catch { }
});

//#endregion

//#region Panel colores
const scrPanel = document.getElementById('scr-panel');
const panelBoard = document.getElementById('panel-board');
const panelInfo = document.getElementById('panel-info');
const panelModeLabel = document.getElementById('panelModeLabel');
const panelRoundLabel = document.getElementById('panelRoundLabel');

function isPanelActive() {
  return !!scrPanel && scrPanel.classList.contains('active');
}

const PANEL_COLORS = [
  '#f97373',
  '#facc15',
  '#4ade80',
  '#60a5fa',
  '#a855f7',
  '#fb923c',
  '#22d3ee',
  '#fb7185',
  '#a3e635'
];

// Configuración de modos
const PANEL_CONFIG = {
  easy: { rows: 2, cols: 2, patterns: 6, label: 'Fácil' },
  medium: { rows: 3, cols: 2, patterns: 8, label: 'Medio' },
  hard: { rows: 3, cols: 3, patterns: 10, label: 'Difícil' },
  mix: { rows: 0, cols: 0, patterns: 6, label: 'Mixto' },
  infinite: { rows: 3, cols: 3, patterns: Infinity, label: 'Infinito' }
};

// Estado general
let panelMode = 'easy';
let panelRound = 0;       // número de patrón actual
let panelSequence = [];      // secuencia de índices del patrón
let panelInputIndex = 0;       // posición que el niño está copiando
let panelButtons = [];      // botones del tablero
let panelAcceptInput = false;   // ¿puede hacer clic?
let panelPlayingBack = false;   // ¿se está reproduciendo el patrón?
let panelCancelPlay = false;   // para cortar animaciones
let panelMixStep = 0;       // usado internamente si quieres, pero aquí usamos panelRound
let panelStartTimeout = null;


function buildPanelBoard(rows, cols) {
  if (!panelBoard) return;

  panelBoard.innerHTML = '';
  panelButtons = [];

  panelBoard.style.setProperty('--panel-rows', rows);
  panelBoard.style.setProperty('--panel-cols', cols);

  const total = rows * cols;

  for (let i = 0; i < total; i++) {
    const btn = document.createElement('button');
    btn.className = 'panel-btn';
    btn.type = 'button';
    btn.dataset.index = i;

    const color = PANEL_COLORS[i % PANEL_COLORS.length];
    btn.style.setProperty('--panel-color', color);

    btn.addEventListener('click', () => handlePanelClick(i));
    panelBoard.appendChild(btn);
    panelButtons.push(btn);
  }
}

function panelBeepFor(index) {
  const base = 520;
  const freq = base + index * 60;
  beep(freq, .12, 'sine', .18);
}

function flashButton(index, duration = 450) {
  const btn = panelButtons[index];
  if (!btn) return;
  btn.classList.add('lit');
  panelBeepFor(index);
  setTimeout(() => {
    btn.classList.remove('lit');
  }, duration - 80);
}

function setPanelInteractivity(enabled) {
  panelAcceptInput = enabled;
  panelButtons.forEach(b => {
    b.disabled = !enabled;
    b.classList.toggle('disabled', !enabled);
  });
}

function panelSleep(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
}

async function playPanelPattern() {
  if (!panelButtons.length) return;
  if (!isPanelActive()) return;

  panelPlayingBack = true;
  panelCancelPlay = false;
  setPanelInteractivity(false);

  await panelSleep(600);
  if (panelCancelPlay || !isPanelActive()) return;

  for (let i = 0; i < panelSequence.length; i++) {
    if (panelCancelPlay || !isPanelActive()) return;
    flashButton(panelSequence[i]);
    await panelSleep(550);
  }

  if (!isPanelActive() || panelCancelPlay) return;

  panelInputIndex = 0;
  panelPlayingBack = false;
  setPanelInteractivity(true);
}


function setupModeLayoutForMixed(round) {
  if (round <= 2) {
    buildPanelBoard(2, 2);
    if (panelModeLabel) panelModeLabel.textContent = 'Modo mixto – tablero 2x2';
  } else if (round <= 4) {
    buildPanelBoard(3, 2);
    if (panelModeLabel) panelModeLabel.textContent = 'Modo mixto – tablero 3x2';
  } else {
    buildPanelBoard(3, 3);
    if (panelModeLabel) panelModeLabel.textContent = 'Modo mixto – tablero 3x3';
  }
}

function updatePanelRoundText() {
  const cfg = PANEL_CONFIG[panelMode];
  if (!cfg) return;

  if (cfg.patterns === Infinity) {
    if (panelInfo) panelInfo.textContent = `Patrón ${panelRound}`;
    if (panelRoundLabel) panelRoundLabel.textContent = `Patrón ${panelRound}`;
  } else {
    if (panelInfo) panelInfo.textContent = `Patrón ${panelRound} / ${cfg.patterns}`;
    if (panelRoundLabel) panelRoundLabel.textContent = `Patrón ${panelRound} / ${cfg.patterns}`;
  }
}

function startPanelMode(mode) {
  if (typeof mode !== 'string' || !PANEL_CONFIG[mode]) {
    mode = 'easy';
  }

  panelMode = mode;
  panelSequence = [];
  panelRound = 0;
  panelInputIndex = 0;
  panelCancelPlay = false;

  const cfg = PANEL_CONFIG[mode];
  if (panelModeLabel && cfg) {
    panelModeLabel.textContent = `Modo: ${cfg.label}`;
  }

  if (mode === 'mix') {
    panelBoard.innerHTML = '';
    panelButtons = [];
  } else {
    buildPanelBoard(cfg.rows, cfg.cols);
  }

  updatePanelRoundText();

  if (panelStartTimeout) {
    clearTimeout(panelStartTimeout);
  }

  if (isPanelActive()) {
    panelStartTimeout = setTimeout(() => {
      nextPanelRound();
      panelStartTimeout = null;
    }, 800);
  }

}

function nextPanelRound() {
  if (!isPanelActive()) return;

  panelRound++;

  const cfg = PANEL_CONFIG[panelMode];
  if (!cfg) return;

  if (panelMode === 'mix') {
    if (panelRound > cfg.patterns) {
      setPanelInteractivity(false);
      if (panelInfo) panelInfo.textContent = '¡Superaste el modo mixto!';
      onGameCompleted?.();
      return;
    }
    setupModeLayoutForMixed(panelRound);
  }

  const totalButtons = panelButtons.length || 1;
  const nextIndex = Math.floor(Math.random() * totalButtons);
  panelSequence.push(nextIndex);

  updatePanelRoundText();
  playPanelPattern();
}

function handlePanelClick(index) {
  if (!panelAcceptInput || panelPlayingBack) return;
  if (!isPanelActive()) return;

  flashButton(index);

  const expected = panelSequence[panelInputIndex];
  if (index !== expected) {
    beep(220, .09, 'square', .18);
    if (panelInfo) panelInfo.textContent = 'Intenta de nuevo';
    setPanelInteractivity(false);
    setTimeout(() => { if (isPanelActive()) playPanelPattern(); }, 800);
    return;
  }

  panelInputIndex++;

  if (panelInputIndex < panelSequence.length) return;

  beep(760, .10, 'triangle', .22);

  if (typeof confettiIn === 'function' && panelBoard) {
    const rect = panelBoard.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    confettiIn(panelBoard, cx, cy, 40);
    setTimeout(() => confettiIn(panelBoard, cx, cy - 40, 40), 150);
  }

  const cfg = PANEL_CONFIG[panelMode];

  if (panelMode === 'infinite') {
    if (panelInfo) panelInfo.textContent = 'Excelente!';
    setTimeout(() => { if (isPanelActive()) nextPanelRound(); }, 900);
    return;
  }

  if (panelRound >= cfg.patterns) {
    setPanelInteractivity(false);
    if (panelInfo) panelInfo.textContent = '¡Muy bien!';
    onGameCompleted?.();
  } else {
    if (panelInfo) panelInfo.textContent = '¡Genial!';
    setTimeout(() => { if (isPanelActive()) nextPanelRound(); }, 900);
  }
}

function stopPanelGame() {
  panelCancelPlay = true;
  panelPlayingBack = false;
  panelAcceptInput = false;
  if (panelButtons.length) {
    panelButtons.forEach(b => {
      b.disabled = true;
      b.classList.add('disabled');
    });
  }
}

window.startPanelMode = startPanelMode;
window.stopPanelGame = stopPanelGame;

//#endregion

//#region Rompecabezas
const pzGrid = document.getElementById('pz-grid');
const pzPieces = document.getElementById('pz-pieces');
const pzTag = document.getElementById('pz-tag');
const pzBase = document.querySelector('.pz-base');

const PZ_ROWS = 3;
const PZ_COLS = 3;
const PZ_TOTAL = PZ_ROWS * PZ_COLS;

// imágenes disponibles
const PZ_IMAGES = [
  { id: 'playa', file: 'playa-rc.png' },
  { id: 'granja', file: 'granja-rc.png' },
  { id: 'frutas', file: 'frutas-rc.png' },
  { id: 'perezoso', file: 'perezoso-rc.png' },
  { id: 'gallinas', file: 'gallinas-rc.png' },
  { id: 'perrogato', file: 'perro-gato-rc.png' },

];

// cuántos rompecabezas se juegan antes de mostrar overlay
const PZ_PER_TURN = 3;

let pzCells = [];
let pzPiecesEls = [];
let pzPlaced = 0;
let pzDragging = null;
let pzOffX = 0, pzOffY = 0;
let pzPointerId = null;

// orden aleatorio de imágenes y estado del turno
let pzImageOrder = [];
let pzImagePos = 0;
let pzCompletedTurn = 0;

const pzCongratsAudio = new Audio('audio/color-sort/congrats1.mp3');
pzCongratsAudio.preload = 'auto';
pzCongratsAudio.volume = 0.95;

function pzCurrentImage() {
  const idx = pzImageOrder[pzImagePos];
  return PZ_IMAGES[idx];
}


function buildPuzzleBoard(imageObj) {
  if (!pzGrid) return;

  if (pzBase) {
    pzBase.style.backgroundImage = `url("img/puzzle/${imageObj.file}")`;
    pzBase.style.backgroundSize = 'cover';
    pzBase.style.backgroundPos = 'center';
    pzBase.style.opacity = '0.45';
  }

  pzGrid.innerHTML = '';
  pzCells = [];

  for (let i = 0; i < PZ_TOTAL; i++) {
    const cell = document.createElement('div');
    cell.className = 'pz-cell';
    cell.dataset.index = i;

    const col = i % PZ_COLS;
    const row = Math.floor(i / PZ_ROWS);
    const posX = (col / (PZ_COLS - 1)) * 100;
    const posY = (row / (PZ_ROWS - 1)) * 100;

    cell.style.setProperty('--pz-x', `${posX}%`);
    cell.style.setProperty('--pz-y', `${posY}%`);

    pzGrid.appendChild(cell);
    pzCells.push(cell);
  }
}

function buildPuzzlePieces(imageObj) {
  if (!pzPieces) return;

  pzPieces.innerHTML = '';
  pzPiecesEls = [];

  const indexes = shuffle([...Array(PZ_TOTAL).keys()]);
  const wrapRect = pzPieces.getBoundingClientRect();
  const imgPath = `img/puzzle/${imageObj.file}`;

  indexes.forEach(idx => {
    const piece = document.createElement('div');
    piece.className = 'pz-piece';
    piece.dataset.index = idx;

    const col = idx % PZ_COLS;
    const row = Math.floor(idx / PZ_ROWS);
    const posX = (col / (PZ_COLS - 1)) * 100;
    const posY = (row / (PZ_ROWS - 1)) * 100;

    piece.style.setProperty('--pz-x', `${posX}%`);
    piece.style.setProperty('--pz-y', `${posY}%`);
    piece.style.backgroundImage = `url(${imgPath})`;

    const pad = 16;
    const areaW = wrapRect.width - 100 - pad * 2;
    const areaH = wrapRect.height - 100 - pad * 2;
    const left = pad + Math.random() * Math.max(areaW, 40);
    const top = pad + Math.random() * Math.max(areaH, 40);

    piece.style.left = left + 'px';
    piece.style.top = top + 'px';
    piece.dataset.ox = left;
    piece.dataset.oy = top;

    piece.addEventListener('pointerdown', e => pzOnPointerDown(e, piece));

    pzPieces.appendChild(piece);
    pzPiecesEls.push(piece);
  });
}

function pzOnPointerDown(e, piece) {
  if (window.paused) return;
  window.ensureAudio?.();

  if (piece.dataset.placed === '1') return;

  pzDragging = piece;
  pzPointerId = e.pointerId;
  piece.setPointerCapture?.(e.pointerId);
  piece.classList.add('dragging');

  const rect = piece.getBoundingClientRect();
  pzOffX = e.clientX - rect.left;
  pzOffY = e.clientY - rect.top;
}

window.addEventListener('pointermove', e => {
  if (!pzDragging) return;
  if (pzPointerId !== null && e.pointerId !== pzPointerId) return;

  const wrapRect = pzPieces.getBoundingClientRect();
  const x = e.clientX - wrapRect.left - pzOffX;
  const y = e.clientY - wrapRect.top - pzOffY;

  pzDragging.style.left = x + 'px';
  pzDragging.style.top = y + 'px';
});

window.addEventListener('pointerup', e => {
  if (!pzDragging) return;
  if (pzPointerId !== null && e.pointerId !== pzPointerId) return;

  const piece = pzDragging;
  pzDragging = null;
  pzPointerId = null;
  piece.classList.remove('dragging');
  piece.releasePointerCapture?.(e.pointerId);

  pzHandleDrop(piece, e.clientX, e.clientY);
});

function pzCellAtPoint(x, y) {
  for (const cell of pzCells) {
    const r = cell.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      return cell;
    }
  }
  return null;
}

function pzHandleDrop(piece, clientX, clientY) {
  const cell = pzCellAtPoint(clientX, clientY);
  const pieceIndex = Number(piece.dataset.index);

  if (!cell || cell.dataset.filled === '1') {
    pzBounceBack(piece, false);
    return;
  }

  const cellIndex = Number(cell.dataset.index);
  const correct = (cellIndex === pieceIndex);

  if (!correct) {
    beep(220, .09, 'square', .18);
    pzBounceBack(piece, true);
    return;
  }

  piece.dataset.placed = '1';
  cell.dataset.filled = '1';
  beep(760, .10, 'triangle', .22);

  const currentImg = pzCurrentImage();
  cell.classList.add('filled');
  cell.style.backgroundImage = `url("img/puzzle/${currentImg.file}")`;

  piece.style.opacity = '0';
  piece.style.pointerEvents = 'none';
  setTimeout(() => piece.remove(), 250);

  // confetti en la celda
  if (typeof confettiIn === 'function') {
    const gr = pzGrid.getBoundingClientRect();
    const cr = cell.getBoundingClientRect();
    const cx = (cr.left - gr.left) + cr.width / 2;
    const cy = (cr.top - gr.top) + cr.height / 2;
    confettiIn(pzGrid, cx, cy, 18);
  }

  pzPlaced++;
  pzUpdateTag();

  if (pzPlaced >= PZ_TOTAL) {
    pzOnPuzzleCompleted();
  }
}

function pzBounceBack(piece, doShake) {
  const ox = parseFloat(piece.dataset.ox) || 0;
  const oy = parseFloat(piece.dataset.oy) || 0;

  if (doShake) {
    piece.classList.add('shake');
    setTimeout(() => piece.classList.remove('shake'), 220);
  }

  const rect = piece.getBoundingClientRect();
  const wrapRect = pzPieces.getBoundingClientRect();
  const curX = rect.left - wrapRect.left;
  const curY = rect.top - wrapRect.top;
  const dx = ox - curX;
  const dy = oy - curY;

  const anim = piece.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: `translate(${dx}px,${dy}px)` }
    ],
    { duration: 220, easing: 'cubic-bezier(.2,.9,.2,1)' }
  );
  anim.onfinish = () => {
    piece.style.left = ox + 'px';
    piece.style.top = oy + 'px';
  };
}

function pzUpdateTag() {
  if (!pzTag) return;
  const totalTurn = Math.min(PZ_PER_TURN, PZ_IMAGES.length);
  const currentNum = pzCompletedTurn + 1;
  pzTag.textContent =
    `Rompecabezas ${currentNum} / ${totalTurn} – Piezas correctas: ${pzPlaced} / ${PZ_TOTAL}`;
}

function pzBuildCurrent() {
  const img = pzCurrentImage();
  pzPlaced = 0;
  buildPuzzleBoard(img);
  setTimeout(() => buildPuzzlePieces(img), 50);
  pzUpdateTag();
}

function pzOnPuzzleCompleted() {
  pzCompletedTurn++;

  const totalTurn = Math.min(PZ_PER_TURN, PZ_IMAGES.length);

  const noMoreImages = (pzImagePos >= pzImageOrder.length - 1);
  const endOfTurn = (pzCompletedTurn >= totalTurn) || noMoreImages;

  if (!endOfTurn) {
    // siguiente rompecabezas dentro del mismo turno
    if (pzTag) pzTag.textContent = '¡Muy bien! Vamos con otro rompecabezas.';
    setTimeout(() => {
      pzImagePos++;
      pzBuildCurrent();
    }, 900);
    return;
  }

  if (pzTag) pzTag.textContent = '¡Excelente, completaste todos los rompecabezas de este turno!';

  const launchOverlayAndRestart = () => {
    if (typeof showOverlay === 'function') {
      showOverlay(8, () => {
        startPuzzle();
      });
    } else {
      startPuzzle();
    }
  };

  try {
    pzCongratsAudio.currentTime = 0;
    pzCongratsAudio.onended = () => {
      pzCongratsAudio.onended = null;
      launchOverlayAndRestart();
    };
    pzCongratsAudio.play().catch(() => {
      launchOverlayAndRestart();
    });
  } catch {
    launchOverlayAndRestart();
  }
}


function startPuzzle() {
  pzPlaced = 0;
  pzCompletedTurn = 0;

  // crear orden aleatorio de imágenes
  const idxs = [];
  for (let i = 0; i < PZ_IMAGES.length; i++) idxs.push(i);
  pzImageOrder = (typeof shuffle === 'function') ? shuffle(idxs) : idxs.sort(() => Math.random() - 0.5);
  pzImagePos = 0;

  pzBuildCurrent();
}

window.startPuzzle = startPuzzle;

//#endregion

//#region Match express

const scrMatch = document.getElementById('scr-match');
const matchBoard = document.getElementById('match-board');
const matchTargetImg = document.getElementById('match-target-img');

function isMatchActive() {
  return scrMatch && scrMatch.classList.contains('active');
}

/* Lista de figuras disponibles */
const MATCH_ITEMS = [
  { id: 'apple', src: 'img/match-ex/fig-apple.png' },
  { id: 'banana', src: 'img/match-ex/fig-banana.png' },
  { id: 'heart', src: 'img/match-ex/fig-heart.png' },
  { id: 'star', src: 'img/match-ex/fig-star.png' },
  { id: 'duck', src: 'img/match-ex/fig-duck.png' },
  { id: 'cube', src: 'img/match-ex/fig-square.png' },
  { id: 'frog', src: 'img/match-ex/fig-frog.png' },
  { id: 'triangle', src: 'img/match-ex/fig-triangle.png' },
  { id: 'circle', src: 'img/match-ex/fig-circle.png' },
  { id: 'orange', src: 'img/match-ex/fig-orange.png' },
  { id: 'bberry', src: 'img/match-ex/fig-bberry.png' }

];

// total = cantidad de figuras en el tablero
// minSize / maxSize = tamaño aleatorio de cada figura (px)
const MATCH_LEVELS = [
  // Nivel 1 – ahora con 8 figuras y un poquito más pequeñas
  { total: 10, minSize: 70, maxSize: 105 },
  // Nivel 2 – 10 figuras
  { total: 12, minSize: 68, maxSize: 100 },
  // Nivel 3 – 12 figuras
  { total: 14, minSize: 64, maxSize: 96 },
  // Nivel 4 – 14 figuras (tablero más lleno)
  { total: 16, minSize: 60, maxSize: 92 },
  // Nivel 5 – 16 figuras, las más pequeñitas
  { total: 18, minSize: 40, maxSize: 88 },
  // Nivel 6 – 16 figuras, las más pequeñitas
  { total: 20, minSize: 35, maxSize: 70 },
  // Nivel 6 – 16 figuras, las más pequeñitas
  { total: 24, minSize: 30, maxSize: 60 }
];

let matchLevelIndex = 0;
let matchTargetId = null;
let matchObjects = [];
let matchFirstSel = null;
let matchLocked = false;

/* Helpers */

function matchShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getItemById(id) {
  return MATCH_ITEMS.find(x => x.id === id);
}

/* ---------- Crear nivel ---------- */

function startMatch() {
  matchLevelIndex = 0;
  buildMatchLevel();
}

function buildMatchLevel() {
  if (!matchBoard) return;

  const level = MATCH_LEVELS[matchLevelIndex] || MATCH_LEVELS[MATCH_LEVELS.length - 1];
  const total = level.total;

  matchBoard.innerHTML = '';
  matchObjects = [];
  matchFirstSel = null;
  matchLocked = false;

  // Elegir objetivo
  const target = MATCH_ITEMS[Math.floor(Math.random() * MATCH_ITEMS.length)];
  matchTargetId = target.id;

  if (matchTargetImg) {
    matchTargetImg.src = target.src;
    matchTargetImg.alt = target.id;
  }

  // --------- Construir lista: 2 correctos + señuelos (pueden repetirse) ---------
  const items = [];

  // 2 objetivos correctos
  items.push({ id: target.id, correct: true });
  items.push({ id: target.id, correct: true });

  // señuelos
  const others = MATCH_ITEMS.filter(x => x.id !== target.id);
  for (let i = 0; i < total - 2; i++) {
    const d = others[Math.floor(Math.random() * others.length)];
    items.push({ id: d.id, correct: false });
  }

  const shuffled = matchShuffle(items);

  // --------- Layout en rejilla para evitar que se tapen ---------
  const boardRect = matchBoard.getBoundingClientRect();
  const pad = 40;

  // número de columnas / filas según la cantidad total
  const cols = Math.ceil(Math.sqrt(total));         // por ejemplo 3 ó 4
  const rows = Math.ceil(total / cols);

  const usableW = Math.max(200, boardRect.width - pad * 2);
  const usableH = Math.max(160, boardRect.height - pad * 2);

  const cellW = usableW / cols;
  const cellH = usableH / rows;

  shuffled.forEach((item, idx) => {
    const data = getItemById(item.id);
    if (!data) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'match-obj';
    btn.dataset.id = item.id;
    btn.dataset.correct = item.correct ? '1' : '0';

    const img = document.createElement('img');
    img.className = 'match-obj-img';
    img.src = data.src;
    img.alt = data.id;

    btn.appendChild(img);

    // tamaño aleatorio dentro del rango del nivel
    const size = randInt(level.minSize, level.maxSize);
    btn.style.width = size + 'px';
    btn.style.height = size + 'px';

    // celda de rejilla
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    const centerX = pad + cellW * col + cellW / 2;
    const centerY = pad + cellH * row + cellH / 2;

    // pequeño “jitter” para que no queden demasiado rígidos
    const jitterX = randInt(-Math.min(14, cellW / 4), Math.min(14, cellW / 4));
    const jitterY = randInt(-Math.min(14, cellH / 4), Math.min(14, cellH / 4));

    btn.style.left = (centerX - size / 2 + jitterX) + 'px';
    btn.style.top = (centerY - size / 2 + jitterY) + 'px';

    // desfase en la animación de flotado
    btn.style.animationDelay = (Math.random() * 2).toFixed(2) + 's';

    btn.addEventListener('click', () => handleMatchClick(btn));

    matchBoard.appendChild(btn);
    matchObjects.push(btn);
  });
}

/* ---------- Click en una figura ---------- */

function handleMatchClick(btn) {
  if (!isMatchActive()) return;
  if (matchLocked) return;
  if (!btn || btn.classList.contains('matched')) return;

  const id = btn.dataset.id;

  // Primer click
  if (!matchFirstSel) {
    matchFirstSel = btn;
    btn.classList.add('selected');
    return;
  }

  // Evitar que cuente hacer click 2 veces en el mismo
  if (btn === matchFirstSel) {
    // opcional: pequeño rebote
    btn.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.05)' },
        { transform: 'scale(1)' }
      ],
      { duration: 180 }
    );
    return;
  }

  const firstId = matchFirstSel.dataset.id;
  const bothAreTarget = (firstId === matchTargetId && id === matchTargetId);

  if (bothAreTarget) {
    // ✅ par correcto
    beep(760, 0.10, 'triangle', 0.22);

    matchLocked = true;

    matchFirstSel.classList.remove('selected');
    btn.classList.remove('selected');
    matchFirstSel.classList.add('correct', 'matched');
    btn.classList.add('correct', 'matched');

    // Confetti suave
    if (typeof confettiIn === 'function' && matchBoard) {
      const r = matchBoard.getBoundingClientRect();
      confettiIn(matchBoard, r.width / 2, r.height / 2, 30);
    }

    setTimeout(() => {
      if (!isMatchActive()) return;
      matchLevelIndex++;

      // ¿terminó los 5 niveles?
      if (matchLevelIndex >= MATCH_LEVELS.length) {
        // nivel final completado
        if (typeof onGameCompleted === 'function') {
          onGameCompleted();
        } else {
          // si no usas onGameCompleted, puedes mostrar overlay aquí
          // showOverlay?.(8, () => startMatch());
        }
      } else {
        buildMatchLevel();
      }
    }, 900);

    matchFirstSel = null;

  } else {
    // ❌ error (no son las dos del objetivo)
    beep(220, 0.09, 'square', 0.18);

    btn.classList.add('wrong');
    matchFirstSel.classList.add('wrong');

    const frames = [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(0)' }
    ];

    btn.animate(frames, { duration: 220 });
    matchFirstSel.animate(frames, { duration: 220 });

    setTimeout(() => {
      btn.classList.remove('wrong', 'selected');
      matchFirstSel && matchFirstSel.classList.remove('wrong', 'selected');
      matchFirstSel = null;
    }, 230);
  }
}

/* ---------- Parar juego al salir de la pantalla ---------- */

function stopMatch() {
  matchLocked = true;
  matchFirstSel = null;
  if (matchBoard) matchBoard.innerHTML = '';
}

// Exponer para HTML
window.startMatch = startMatch;
window.stopMatch = stopMatch;
//#endregion

//#region Dino Safari

const safariIntro = new Audio('audio/dino-dig/ds-instructions.mp3');
safariIntro.preload = 'auto';
safariIntro.volume = 0.55;

const safariStage = document.getElementById('safari-stage');
const safariTargetImg = document.getElementById('safari-target');
const safariLevelLabel = document.getElementById('safariLevelLabel');
const safariScoreLabel = document.getElementById('safariScoreLabel');

const SAFARI_DINOS = [
  'stego', 'trex', 'bronto', 'tricera',
  'para', 'spino', 'ankylo', 'styraco',
  'raptor', 'dilopho', 'theri', 'galli', 'iguano', 'pachi'
];

const SAFARI_TARGET_SCORE = 8;
const SAFARI_BUSH_COUNT = 4;
const SAFARI_FOCUS_DELAY = 2200; // tiempo del dinosaurio enfocado al centro

const safariImgFor = id => `img/dino-dig/${id}.png`;
const safariSleep = ms => new Promise(r => setTimeout(r, ms));

let safariBushRow = null;
let safariBigDinoEl = null;
let safariRound = 0;
let safariScore = 0;
let safariActive = false;
let safariLocked = true;
let safariBushData = [];
let safariTargetQueue = [];
let safariCurrentTarget = null;

const safariBushSfx = new Audio('audio/dino-dig/shake-bush.mp3');
const safariCongrats = new Audio('audio/color-sort/congrats1.mp3');

safariBushSfx.volume = 0.9;
safariCongrats.volume = 0.9;

const SAFARI_SOUNDS = [
  'dino-sound1', 'dino-sound2',
  'dino-sound3', 'dino-sound4'
];

const safariDinoAudios = SAFARI_SOUNDS.map(name => {
  const a = new Audio(`audio/dino-dig/${name}.mp3`);
  a.preload = 'auto';
  a.volume = 0.20;
  return a;
});

function playRandomSafariDinoSfx() {
  const a = safariDinoAudios[Math.floor(Math.random() * safariDinoAudios.length)];
  try {
    a.currentTime = 0;
    a.play().catch(() => { });
  } catch { }
}

function buildSafariBase() {
  safariStage.innerHTML = '';

  const layer = document.createElement('div');
  layer.className = 'safari-layer';
  safariStage.appendChild(layer);

  const grass = document.createElement('img');
  grass.src = 'img/dino-dig/cesped.png';
  grass.className = 'safari-ground';
  layer.appendChild(grass);

  safariBushRow = document.createElement('div');
  safariBushRow.className = 'safari-bush-row';
  layer.appendChild(safariBushRow);

  safariBigDinoEl = document.createElement('div');
  safariBigDinoEl.className = 'safari-dino-big';
  layer.appendChild(safariBigDinoEl);
}

function isSafariScreenActive() {
  const scr = document.getElementById('scr-safari');
  return scr && scr.classList.contains('active');
}

function startSafariGame() {
  ensureAudio?.();

  safariActive = true;
  safariLocked = true;   // 🔒 bloqueado mientras suenan las instrucciones
  safariRound = 0;
  safariScore = 0;

  safariTargetQueue = shuffle(SAFARI_DINOS.slice());

  safariScoreLabel.textContent = `Aciertos: 0 / ${SAFARI_TARGET_SCORE}`;
  safariLevelLabel.textContent = `Dino Safari – Ronda 1`;

  buildSafariBase();

  let introFinished = false;

  // Cuando termine el audio, recién empezamos la primera ronda
  safariIntro.onended = () => {
    introFinished = true;
    if (!safariActive || !isSafariScreenActive()) return;
    safariLocked = false;     // 🔓 ahora sí pueden tocar arbustos
    nextSafariRound();
  };

  try {
    safariIntro.currentTime = 0;
    const p = safariIntro.play();

    // Si el navegador bloquea el audio (autoplay), el .catch se dispara
    if (p && typeof p.then === 'function') {
      p.catch(() => {
        // Fallback: si en ~800ms no se pudo reproducir, arrancamos igual
        setTimeout(() => {
          if (!introFinished && safariActive && isSafariScreenActive()) {
            safariLocked = false;
            nextSafariRound();
          }
        }, 800);
      });
    }
  } catch {
    // Si algo raro pasa, no dejamos el juego congelado
    safariLocked = false;
    nextSafariRound();
  }
}
window.startSafariGame = startSafariGame;

function stopSafariGame() {
  safariActive = false;
  safariLocked = true;

  try {
    safariIntro.pause();
    safariIntro.currentTime = 0;
    safariIntro.onended = null;
  } catch { }

  if (safariStage) {
    safariStage.classList.remove('focus');
  }
}
window.stopSafariGame = stopSafariGame;

function nextSafariRound() {
  if (!safariActive || !isSafariScreenActive()) return;

  safariRound++;

  if (!safariTargetQueue.length) {
    safariTargetQueue = shuffle(SAFARI_DINOS.slice());
  }

  safariCurrentTarget = safariTargetQueue.shift();

  safariTargetImg.src = safariImgFor(safariCurrentTarget);
  safariTargetImg.classList.add('silhouette');

  safariLevelLabel.textContent = `Dino Safari – Ronda ${safariRound}`;

  buildSafariRound();
}

function buildSafariRound() {
  safariBushRow.innerHTML = '';
  safariBushData = [];
  safariLocked = true;
  safariBigDinoEl.classList.remove('show');
  safariBigDinoEl.innerHTML = '';
  safariStage.classList.remove('focus');
  safariBushRow.classList.remove('hidden');

  // pool de dinos para arbustos
  let pool = shuffle(SAFARI_DINOS.slice());
  if (!pool.includes(safariCurrentTarget)) pool[0] = safariCurrentTarget;

  let chosen = shuffle(pool.slice(0, SAFARI_BUSH_COUNT));
  if (!chosen.includes(safariCurrentTarget)) chosen[0] = safariCurrentTarget;
  chosen = shuffle(chosen);

  chosen.forEach((id, idx) => {
    const bush = document.createElement('button');
    bush.type = 'button';
    bush.className = 'safari-bush peek';
    bush.dataset.index = idx;

    const imgBush = document.createElement('img');
    imgBush.src = 'img/dino-dig/arbusto.png';
    imgBush.className = 'safari-bush-img';
    bush.appendChild(imgBush);

    const peek = document.createElement('img');
    peek.src = safariImgFor(id);
    peek.className = 'safari-dino-peek';
    bush.appendChild(peek);

    safariBushRow.appendChild(bush);

    safariBushData.push({
      bush,
      dinoId: id,
      isCorrect: id === safariCurrentTarget,
      peekImg: peek
    });

    bush.addEventListener('click', () => handleSafariBushClick(safariBushData[idx]));
  });

  previewSafariBushes();
}

async function previewSafariBushes() {
  safariLocked = true;

  for (let i = 0; i < 3; i++) {
    const d = safariBushData[Math.floor(Math.random() * safariBushData.length)];
    if (!d) break;

    d.bush.classList.add('shake');
    safariBushSfx.currentTime = 0;
    safariBushSfx.play().catch(() => { });

    await safariSleep(420);
    d.bush.classList.remove('shake');
    await safariSleep(220);
  }

  safariLocked = false;
}

async function handleSafariBushClick(d) {
  if (!safariActive || safariLocked) return;
  safariLocked = true;

  if (d.isCorrect) {
    beep(760, .10, 'triangle', .22);
    safariCongrats.currentTime = 0;
    safariCongrats.play().catch(() => { });
    playRandomSafariDinoSfx();

    d.bush.classList.add('hit');

    // Desenfocar el resto del escenario y mostrar el dinosaurio grande
    safariStage.classList.add('focus');
    safariBushRow.classList.add('hidden');

    safariBigDinoEl.innerHTML = `<img src="${safariImgFor(d.dinoId)}">`;
    safariBigDinoEl.classList.add('show');

    safariScore++;
    safariScoreLabel.textContent = `Aciertos: ${safariScore} / ${SAFARI_TARGET_SCORE}`;

    if (safariScore >= SAFARI_TARGET_SCORE) {
      setTimeout(() => {
        safariActive = false;
        safariBigDinoEl.classList.remove('show');
        safariStage.classList.remove('focus');
        onGameCompleted?.();
      }, SAFARI_FOCUS_DELAY);
    } else {
      setTimeout(() => {
        safariBigDinoEl.classList.remove('show');
        safariStage.classList.remove('focus');
        nextSafariRound();
      }, SAFARI_FOCUS_DELAY);
    }

  } else {
    beep(220, .09, 'square', .18);

    d.bush.classList.add('wrong');
    setTimeout(() => d.bush.classList.remove('wrong'), 260);

    await safariSleep(450);
    previewSafariBushes();
  }
}
//#endregion

//#region Mascota compu
function bindMascotClick() {
  const m = document.getElementById('mascota');
  if (!m) return;
  const fire = (e) => { e.stopPropagation(); makeConfetti(90); beep(880, .08, 'sine', .25); beep(660, .08, 'triangle', .2); };
  m.addEventListener('click', fire); m.querySelector('img')?.addEventListener('click', fire);
}
document.addEventListener('DOMContentLoaded', bindMascotClick);
//#endregion

window.addEventListener('resize', () => {
  if ($('#scr-cheese')?.classList.contains('active')) {
    startCheese(false);
  }
});
