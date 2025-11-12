//#region Helpers
const $ = s => document.querySelector(s);
const rnd = (a,b)=>Math.random()*(b-a)+a;
const rndi = (a,b)=>Math.floor(rnd(a,b+1));
const shuffle = arr => [...arr].sort(()=>Math.random()-.5);
//#endregion

//#region Audio base
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
function ensureAudio(){ try{ actx = actx || new AudioCtx(); actx.resume(); }catch{} }
function beep(freq=880, dur=0.1, type='sine', vol=0.25){
  try{
    ensureAudio();
    const o=actx.createOscillator(), g=actx.createGain();
    o.type=type; o.frequency.value=freq; o.connect(g); g.connect(actx.destination);
    g.gain.value=.0001; g.gain.exponentialRampToValueAtTime(vol, actx.currentTime+.01);
    o.start(); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime+dur); o.stop(actx.currentTime+dur);
  }catch{}
}
document.addEventListener('pointerdown', ()=>ensureAudio(), {once:true});
//#endregion

//#region Overlay turnos
const overlay = $('#overlay'), btnContinue = $('#btnContinue'), countEl = $('#count');
let timer = null, paused = false;
let overlayAudio = null, overlayOpen = false;

function playCambioTurnoAudio(){
  try{
    if(!overlayAudio){ overlayAudio = new Audio('audio/lo_lograste.mp3'); overlayAudio.volume = .9; }
    overlayAudio.pause(); overlayAudio.currentTime = 0; overlayAudio.play().catch(()=>{});
  }catch{}
}
function stopCambioTurnoAudio(){ try{ overlayAudio?.pause(); }catch{} }

function showOverlay(seconds=8, onContinue){
  if (overlayOpen) return;
  overlayOpen = true; paused = true;
  overlay.classList.add('show');
  if (btnContinue){ btnContinue.style.display='none'; btnContinue.disabled=true; }
  playCambioTurnoAudio();

  let t = seconds; countEl.textContent = t;
  let done = false;
  const proceedOnce = ()=>{
    if (done) return; done = true;
    clearInterval(timer); stopCambioTurnoAudio();
    overlay.classList.remove('show'); overlayOpen = false; paused = false;
    if (btnContinue){ btnContinue.onclick = null; }
    try{ onContinue && onContinue(); }catch{}
  };
  clearInterval(timer);
  timer = setInterval(()=>{
    t--; countEl.textContent = t;
    beep(720-(seconds-t)*15,.06,'triangle',.15);
    if (t<=0) proceedOnce();
  },1000);
  if (btnContinue){ btnContinue.onclick = proceedOnce; }
}
//#endregion

//#region Ruteo
const SCREENS = ['balloons','keys','drag','clicks','maze','cheese','sort','habitats'];
let currentGameId = null;

function openScreen(name){
  if (SCREENS.includes(name)) currentGameId=name;
  $('#home')?.classList.remove('active');
  SCREENS.forEach(id => $('#scr-'+id)?.classList.remove('active'));
  $('#scr-'+name)?.classList.add('active');
  const map={balloons:'Globos',keys:'Piano',drag:'Casitas',clicks:'Clic',maze:'Laberinto',cheese:'Ratón y Queso', sort:'Sorting de Colores', habitats:'Habitats'};
  $('#tagMode').textContent='Modo: '+(map[name]||'Inicio');

  // AUTO START de cada juego
  if (name === 'balloons') startBalloons();
  else if (name === 'keys') startPianoKeys();
  else if (name === 'drag') startDragHome();
  else if (name === 'clicks') startClicks?.();
  else if (name === 'maze') startMaze(true);
  else if (name === 'cheese') startCheese(true);
  else if (name === 'sort') startSort(true);
  else if (name === 'habitats') startHabitats();


}
function backHome(){
  SCREENS.forEach(id => $('#scr-'+id)?.classList.remove('active'));
  $('#home')?.classList.add('active');
  $('#tagMode').textContent='Modo: Inicio';
}
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.screen').forEach(s=>s.id!=='home'&&s.classList.remove('active'));
  $('#btnPlay')?.addEventListener('click', ()=> startPlay3());
});
//#endregion

//#region 3 Juegos random
// ==== Lista de juegos disponibles (agrega aquí los nuevos) ====
const PLAY_SET = ['balloons','drag','maze','cheese','sort','habitats'];

let playOrder = [];
let playIndex = 0;
let playActive = false;

// Inicia el modo de 3 retos: toma 3 únicos al azar
function startPlay3(){
  playOrder = shuffle(PLAY_SET).slice(0, 3);
  playIndex = 0;
  playActive = true;
  launchCurrentPlayGame();
}

// Abre la pantalla y arranca el juego correspondiente
function launchCurrentPlayGame(){
  const id = playOrder[playIndex];
  currentGameId = id;
  openScreen(id);

  if (id === 'balloons')      startBalloons();
  else if (id === 'drag')     startDragHome();
  else if (id === 'maze')     startMaze();
  else if (id === 'cheese')   startCheese();
  else if (id === 'sort')     startSort();
  else if (id === 'habitats') startHabitats();
}

// Llamar SIEMPRE al terminar cada juego
function onGameCompleted(){
  if (playActive){
    playIndex++;
    if (playIndex >= playOrder.length){
      showOverlay(8, () => {
        playOrder  = shuffle(PLAY_SET).slice(0, 3);
        playIndex  = 0;
        playActive = true;
        launchCurrentPlayGame();
      });
    } else {
      launchCurrentPlayGame();
    }
  } else {
    showOverlay(8, () => restartCurrentGame());
  }
}

//#endregion

//#region Reinicio juego actual
function isActive(id){ return $('#scr-'+id)?.classList.contains('active'); }
function restartCurrentGame(){
  if (!currentGameId){
    currentGameId =
      isActive('balloons')?'balloons':
      isActive('keys')    ?'keys':
      isActive('drag')    ?'drag':
      isActive('clicks')  ?'clicks':
      isActive('maze')    ?'maze':
      isActive('cheese')  ?'cheese': null;
  }
  if(currentGameId==='balloons'){ openScreen('balloons'); startBalloons(); }
  else if(currentGameId==='keys'){ openScreen('keys'); startPianoKeys(); }
  else if(currentGameId==='drag'){ openScreen('drag'); startDragHome(); }
  else if(currentGameId==='clicks'){ openScreen('clicks'); startClicks(); }
  else if(currentGameId==='maze'){ openScreen('maze'); startMaze(true); }
  else if(currentGameId==='cheese'){ openScreen('cheese'); startCheese(true); }
}
//#endregion

//#region Pop-Globos
const balloonArea = $('#balloonArea');
const tagBalloons = $('#tagBalloons');
const btnModo = $('#btnModo');
let MODO_FACIL = true;

btnModo?.addEventListener('click', ()=>{
  MODO_FACIL=!MODO_FACIL;
  btnModo.textContent=`Modo fácil: ${MODO_FACIL?'ON':'OFF'}`;
  btnModo.dataset.on = MODO_FACIL ? "1":"0";
  if($('#scr-balloons').classList.contains('active')) startBalloons();
});

const pwrap = $('#pwrap'); let SEGMENTS=[];
function setupSegments(n=10){
  if(!pwrap) return; pwrap.innerHTML=''; SEGMENTS=[];
  for(let i=0;i<n;i++){ const s=document.createElement('div'); s.className='seg'; pwrap.appendChild(s); SEGMENTS.push(s); }
}
function setSegmentsFraction(done,total){
  if(!SEGMENTS.length) return;
  const n=SEGMENTS.length; const on=Math.min(n,Math.round((done/Math.max(1,total))*n));
  SEGMENTS.forEach((s,i)=>s.classList.toggle('on',i<on));
}

const GOAL_BALLOONS=10;
let poppedRound=0, balloons=[], rafId=null;
const PHY={MAX_VX:.45, MAX_VY:.55, DAMPING:.995, BOUNCE:.85, DRIFT:.0018};
const clamp=(v,lim)=>Math.max(-lim,Math.min(lim,v));

function stopLoop(){ if(rafId){cancelAnimationFrame(rafId); rafId=null;} }
function clearBalloons(){
  stopLoop(); balloons.forEach(b=>b.el.remove()); balloons=[];
  poppedRound=0; tagBalloons.textContent='Globos: 0'; setupSegments(10); setSegmentsFraction(0,GOAL_BALLOONS);
}
function randColor(){ const H=[10,40,120,190,260,320]; const h=H[rndi(0,H.length-1)], s=rndi(70,95), l=rndi(48,64); return `hsl(${h} ${s}% ${l}%)`; }
function emitLocalConfetti(cx,cy,n=24){
  for(let i=0;i<n;i++){
    const sp=document.createElement('div'); sp.style.cssText='position:absolute;width:8px;height:8px;border-radius:50%;pointer-events:none;opacity:.95;';
    sp.style.left=(cx-4)+'px'; sp.style.top=(cy-4)+'px'; sp.style.background=randColor(); balloonArea.appendChild(sp);
    const ang=Math.random()*Math.PI*2, dist=rnd(30,90), dx=Math.cos(ang)*dist, dy=Math.sin(ang)*dist;
    sp.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(${rnd(.7,1.2)})`,opacity:0}],
      {duration:rndi(450,800),easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'}); setTimeout(()=>sp.remove(),820);
  }
}
function spawnBalloon(){
  const el=document.createElement('div'); el.className='balloon'; el.textContent='🎈'; el.style.fontSize=MODO_FACIL?'72px':'32px';
  el.style.bottom='auto'; el.style.transition='transform .12s ease'; balloonArea.appendChild(el);
  const area=balloonArea.getBoundingClientRect(); let x=rnd(80,area.width-80), y=rnd(area.height*.35,area.height*.65);
  let vx=rnd(-.25,.25), vy=rnd(-.2,.2); if(MODO_FACIL){vx*=.7;vy*=.7;}
  const b={el,x,y,vx,vy,hp:rndi(1,2),confetti:Math.random()<.75,dead:false,seed:Math.random()*Math.PI*2};
  el.addEventListener('click',()=>{
    if(paused||b.dead) return;
    el.animate([{transform:`translate(${b.x}px,${b.y}px) rotate(0)`},{transform:`translate(${b.x-1}px,${b.y}px) rotate(-1deg)`},{transform:`translate(${b.x+1}px,${b.y}px) rotate(1deg)`},{transform:`translate(${b.x}px,${b.y}px) rotate(0)`}],{duration:320,easing:'ease'});
    beep(640+(b.hp*30),.07,'square',.16); b.hp--;
    if(b.hp<=0){
      b.dead=true;
      const r=balloonArea.getBoundingClientRect(), br=el.getBoundingClientRect(), cx=br.left-r.left+br.width/2, cy=br.top-r.top+br.height/2;
      el.animate([{transform:`translate(${b.x}px,${b.y}px) scale(1)`,opacity:1},{transform:`translate(${b.x}px,${b.y}px) scale(1.25)`,opacity:0}],{duration:180,easing:'ease-out',fill:'forwards'});
      if(b.confetti) emitLocalConfetti(cx,cy,28); setTimeout(()=>el.remove(),190);
      poppedRound++; tagBalloons.textContent='Globos: '+poppedRound; setSegmentsFraction(poppedRound,GOAL_BALLOONS);
      if(poppedRound>=GOAL_BALLOONS){ onGameCompleted(); }
    }
  });
  el.style.position='absolute'; el.style.left='0'; el.style.top='0'; el.style.transform=`translate(${x}px,${y}px)`; balloons.push(b);
}
function step(){
  if(paused){ rafId=requestAnimationFrame(step); return; }
  const area=balloonArea.getBoundingClientRect(), t=performance.now();
  for(const b of balloons){
    if(b.dead) continue;
    b.vx+=Math.sin((t/1000)+b.seed+b.x*.005)*PHY.DRIFT; b.vx*=PHY.DAMPING; b.vy*=PHY.DAMPING;
    b.vx=clamp(b.vx,PHY.MAX_VX); b.vy=clamp(b.vy,PHY.MAX_VY); b.x+=b.vx; b.y+=b.vy;
    if(b.x<20){b.x=20;b.vx=Math.abs(b.vx)*PHY.BOUNCE;} if(b.x>area.width-20){b.x=area.width-20;b.vx=-Math.abs(b.vx)*PHY.BOUNCE;}
    if(b.y<20){b.y=20;b.vy=Math.abs(b.vy)*PHY.BOUNCE;} if(b.y>area.height-20){b.y=area.height-20;b.vy=-Math.abs(b.vy)*PHY.BOUNCE;}
    b.el.style.transform=`translate(${b.x}px,${b.y}px)`;
  }
  rafId=requestAnimationFrame(step);
}
function startBalloons(){
  btnModo && (btnModo.dataset.on = MODO_FACIL ? "1":"0");
  clearBalloons(); $('#tagMode').textContent='Modo: Globos';
  for(let i=0;i<GOAL_BALLOONS;i++) spawnBalloon();
  step();
}
//#endregion

//#region Piano keyboard
const bigKey=$('#bigKey'), subKey=$('#subKey'), tray=$('#rainbowTray'), tagKeys=$('#tagKeys');
let keyCount=0, pianoSeq=[];
function makeStripe(){
  const s=document.createElement('div'); s.className='rain';
  const h=Math.floor(Math.random()*360);
  s.style.background=`linear-gradient(90deg,hsl(${h} 90% 65%),hsl(${(h+60)%360} 90% 60%))`;
  s.style.top=(70+Math.random()*40)+'%'; tray.appendChild(s);
  setTimeout(()=>s.remove(),1400);
}
function startPianoKeys(){
  keyCount=0; tagKeys.textContent='Teclas: 0';
  const bank=[['C','A','S','A'],['D','E','D','O'],['G','A','T','O'],['M','I','M','O'],['O','S','O']];
  pianoSeq = bank[Math.floor(Math.random()*bank.length)];
  bigKey.textContent='Sigue: '+pianoSeq.join(' '); subKey.textContent='Presiona las letras en orden';
}
window.addEventListener('keydown', e=>{
  if(paused) return; if(['1','2','3'].includes(e.key)) return;
  keyCount++; tagKeys.textContent='Teclas: '+keyCount;
  if($('#scr-keys').classList.contains('active') && pianoSeq.length){
    const k=e.key.toUpperCase();
    if(k===pianoSeq[0]){
      pianoSeq.shift(); makeStripe(); beep(600,.08,'sine',.2);
      bigKey.textContent = pianoSeq.length ? ('Sigue: '+pianoSeq.join(' ')) : '¡Bravo!';
      if(!pianoSeq.length){ onGameCompleted(); }
    }else{ beep(260,.07,'square',.12); }
  }
});
//#endregion

//#region Casitas drag n drop
const palette=$('#palette'), dropzones=document.querySelectorAll('.dropzone');
const ANIMALS=['🐶','🐱','🦊','🐼','🐻','🐰','🐸','🐨','🐵','🐯','🐝','🐌','🦋','🐮','🫎','🐹'];
let dragItem=null, offsetX=0, offsetY=0, solvedRound=0, solvedTotal=0, currentSet=[];
function buildDropzonesWith(animals){
  dropzones.forEach((dz,i)=>{ dz.classList.remove('correct'); dz.dataset.key=animals[i];
    const ghost=dz.querySelector('.ghost'); if(ghost){ ghost.textContent=animals[i]; ghost.style.visibility='visible'; }
    [...dz.querySelectorAll('.piece')].forEach(p=>p.remove());
  });
}
function buildPaletteFrom(animals){
  palette.innerHTML=''; shuffle(animals).forEach(em=>{ const el=document.createElement('div'); el.className='piece'; el.textContent=em; palette.appendChild(el); });
}
function startDragHome(hardReset=true){
  if(hardReset) solvedTotal=0; solvedRound=0;
  currentSet = shuffle(ANIMALS).slice(0,3);
  buildDropzonesWith(currentSet); buildPaletteFrom(currentSet);
  tagKeys.textContent=`Casitas: ${solvedTotal}/9`;
}
function getDropAt(x,y){ for(const z of dropzones){const r=z.getBoundingClientRect(); if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom) return z;} return null; }

document.addEventListener('pointerdown', e=>{
  const t=e.target; if(!t.classList.contains('piece')) return;
  dragItem=t; dragItem.setPointerCapture?.(e.pointerId); dragItem.classList.add('dragging');
  const r=dragItem.getBoundingClientRect(); offsetX=e.clientX-r.left; offsetY=e.clientY-r.top;
  dragItem.style.position='fixed'; dragItem.style.left=r.left+'px'; dragItem.style.top=r.top+'px'; dragItem.style.zIndex=1000;
});
document.addEventListener('pointermove', e=>{
  if(!dragItem) return; dragItem.style.left=(e.clientX-offsetX)+'px'; dragItem.style.top=(e.clientY-offsetY)+'px';
});
document.addEventListener('pointerup', e=>{
  if(!dragItem) return;
  const drop=getDropAt(e.clientX,e.clientY), emoji=dragItem.textContent;
  if(drop && drop.dataset.key===emoji){
    drop.classList.add('correct'); const ghost=drop.querySelector('.ghost'); if(ghost) ghost.style.visibility='hidden';
    dragItem.classList.remove('dragging'); dragItem.style.pointerEvents='none'; dragItem.style.zIndex=''; drop.appendChild(dragItem);
    dragItem.classList.add('placed'); dragItem.style.position=''; dragItem.style.left=''; dragItem.style.top='';
    const rr=drop.getBoundingClientRect(); confettiIn(drop, rr.width/2, rr.height*0.35, 18);
    solvedRound++; solvedTotal++; tagKeys.textContent=`Casitas: ${solvedTotal}/9`; beep(700,.08,'sine',.22);
    if(solvedTotal>=9){ onGameCompleted(); }
    else if(solvedRound>=3){ setTimeout(()=>startDragHome(false), 500); }
  }else{
    dragItem.classList.remove('dragging'); dragItem.style.position='relative'; dragItem.style.left='0'; dragItem.style.top='0'; dragItem.style.zIndex=''; palette.appendChild(dragItem); beep(250,.07,'square',.12);
  }
  dragItem.releasePointerCapture?.(e.pointerId); dragItem=null;
});
//#endregion

//#region Click suave
const clickArea=$('#clickArea'), toast=$('#toast'), mouseGhost=$('#mouseGhost');
const chipLeft=$('#chipLeft'), chipRight=$('#chipRight');
const btnLeft=mouseGhost?.querySelector('.btn-left'), btnRight=mouseGhost?.querySelector('.btn-right');
let left=0,right=0;
document.addEventListener('contextmenu', e=>e.preventDefault());
function pulse(x,y){
  const p=document.createElement('div');p.className='pulse'; p.style.left=x+'px'; p.style.top=y+'px';clickArea.appendChild(p); setTimeout(()=>p.remove(),650);
}
function moveGhost(e){
  const r=clickArea.getBoundingClientRect();mouseGhost.style.left=(e.clientX-r.left)+'px';mouseGhost.style.top=(e.clientY-r.top)+'px';
}
function startClicks(){ left=0; right=0; chipLeft.textContent='Izq: 0'; chipRight.textContent='Der: 0'; }
function flash(el,cls,ms=160){ if(!el) return; el.classList.add(cls); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove(cls),ms); }
clickArea?.addEventListener('mousemove', e=>{ if(!paused) moveGhost(e); });
clickArea?.addEventListener('mousedown', e=>{
  if(paused) return;
  moveGhost(e);
  if(e.button===0){
    chipLeft.textContent='Izq: '+(++left); flash(btnLeft,'active-left'); toast.textContent='Clic izquierdo'; beep(760,.08,'sine',.18);
  } else if(e.button===2){
    chipRight.textContent='Der: '+(++right); flash(btnRight,'active-right'); toast.textContent='Clic derecho'; beep(420,.08,'square',.18);
  }
  toast.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>toast.classList.remove('show'),700);
  const r=clickArea.getBoundingClientRect(); pulse(e.clientX-r.left, e.clientY-r.top);
});
window.addEventListener('mouseup', ()=>{btnLeft?.classList.remove('active-left');btnRight?.classList.remove('active-right');});
//#endregion

//#region Confetti
function makeConfetti(n=80){
  const box=$('#confetti');
  for(let i=0;i<n;i++){
    const c=document.createElement('div'); c.className='conf';
    const size=rnd(6,12); c.style.width=size+'px'; c.style.height=(size*1.3)+'px';
    const h=Math.floor(Math.random()*360); c.style.background=`hsl(${h} 90% 60%)`;
    c.style.left=rnd(0,100)+'%'; c.style.top='-10px'; box.appendChild(c);
    const x=rnd(-40,40), rot=rnd(0,360);
    c.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${x}px,110vh) rotate(${rot}deg)`,opacity:1}],
      {duration:rnd(1200,2000),easing:'cubic-bezier(.15,.6,.2,1)',fill:'forwards'});
    setTimeout(()=>c.remove(),2100);
  }
}
function confettiIn(container,x,y,n=18){
  for(let i=0;i<n;i++){
    const sp=document.createElement('div'); sp.style.cssText='position:absolute;width:8px;height:8px;border-radius:50%;pointer-events:none;opacity:.95;';
    sp.style.left=(x-4)+'px'; sp.style.top=(y-4)+'px'; sp.style.background=`hsl(${Math.floor(Math.random()*360)} 90% 60%)`; container.appendChild(sp);
    const ang=Math.random()*Math.PI*2, dist=Math.random()*80+30, dx=Math.cos(ang)*dist, dy=Math.sin(ang)*dist;
    sp.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(${0.8+Math.random()*0.6})`,opacity:0}],
      {duration:450+Math.random()*400,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
    setTimeout(()=>sp.remove(),900);
  }
}
//#endregion

//#region Laberinto
const maze   = document.getElementById('maze');
const player = document.getElementById('player');
const startDot = document.getElementById('startDot');
const goalDot  = document.getElementById('goalDot');

let mazeDragging=false, mazeRounds=0, mazeEasy=true, mazeDir=1; 

function placeDots(){
  const t1 = document.querySelector('.track.t1');
  const t3 = document.querySelector('.track.t3');
  if(!maze || !t1 || !t3) return;
  const rm = maze.getBoundingClientRect(), r1 = t1.getBoundingClientRect(), r3 = t3.getBoundingClientRect();
  const sL = r1.left - rm.left - 30, sY = r1.top - rm.top + r1.height/2 - 30;
  const gR = r3.right - rm.left - 30, gY = r3.top - rm.top + r3.height/2 - 30;
  const startX = mazeDir===1 ? sL : gR, startY = mazeDir===1 ? sY : gY;
  const goalX  = mazeDir===1 ? gR : sL, goalY  = mazeDir===1 ? gY : sY;
  startDot.style.left=`${startX}px`; startDot.style.top=`${startY}px`;
  goalDot.style.left =`${goalX}px`;  goalDot.style.top =`${goalY}px`;
}
function resetPlayer(){
  const rm = maze.getBoundingClientRect(), rs = startDot.getBoundingClientRect();
  player.style.left = (rs.left - rm.left)+'px'; player.style.top = (rs.top - rm.top)+'px';
}
function isOnTrack(x,y){
  const stack = document.elementsFromPoint(x,y) || [];
  return stack.some(el => el?.classList?.contains('track'));
}
function onGoalOverlap(){
  const mr=maze.getBoundingClientRect(), pr=player.getBoundingClientRect(), gr=goalDot.getBoundingClientRect();
  const pcx=pr.left-mr.left+pr.width/2, pcy=pr.top-mr.top+pr.height/2, gcx=gr.left-mr.left+gr.width/2, gcy=gr.top-mr.top+gr.height/2;
  return Math.hypot(pcx-gcx, pcy-gcy) < 34;
}
function failMaze(){ maze.classList.add('fail'); setTimeout(()=>maze.classList.remove('fail'),220); beep(220,.07,'square',.18); resetPlayer(); }

function successMaze(){
  const rr=maze.getBoundingClientRect(), gr=goalDot.getBoundingClientRect();
  confettiIn(maze, gr.left-rr.left+30, gr.top-rr.top+30, 24); beep(760,.08,'sine',.22);
  mazeRounds += 1;

  if (mazeRounds >= 2){
    showBeePopUp(1200).then(()=>{
      if (playActive){
        mazeRounds=0; mazeDir=1; onGameCompleted();
      }else{
        showOverlay(8, ()=>{ mazeRounds=0; mazeDir=1; startMaze(true); });
      }
    });
  }else{
    mazeDir *= -1;
    setTimeout(()=> startMaze(false), 500);
  }
}

function startMaze(resetRounds=true){
  if(typeof MODO_FACIL!=='undefined') mazeEasy = MODO_FACIL;
  maze.classList.toggle('easy', !!mazeEasy);
  if(resetRounds){ mazeRounds=0; mazeDir=1; }
  placeDots(); resetPlayer();
}
window.addEventListener('resize', ()=>{ placeDots(); resetPlayer(); });

player.addEventListener('pointerdown', e=>{
  e.preventDefault(); mazeDragging=true; player.classList.add('dragging');
  player.style.pointerEvents='none'; player.setPointerCapture?.(e.pointerId); ensureAudio();
});
window.addEventListener('pointermove', e=>{
  if(!mazeDragging) return;
  const rm=maze.getBoundingClientRect();
  player.style.left=(e.clientX-rm.left-player.offsetWidth/2)+'px';
  player.style.top =(e.clientY-rm.top -player.offsetHeight/2)+'px';
  if(!isOnTrack(e.clientX,e.clientY) && !onGoalOverlap()){
    failMaze(); mazeDragging=false; player.classList.remove('dragging'); player.style.pointerEvents='';
  }
});
window.addEventListener('pointerup', ()=>{
  if(!mazeDragging) return; player.classList.remove('dragging');
  onGoalOverlap()? successMaze() : failMaze();
  mazeDragging=false; player.style.pointerEvents='';
});

/* Popup de la abeja */
let beeModal=null;
function ensureBeeModal(){
  if(beeModal) return beeModal;
  const wrap=document.createElement('div');
  wrap.className='bee-pop';
  wrap.innerHTML = `<div class="bee-card"><img src="img/abeja.png" alt="¡Queso conseguido!"></div>`;
  document.body.appendChild(wrap);
  beeModal=wrap; return beeModal;
}
function showBeePopUp(ms=1200){
  return new Promise(res=>{
    const m=ensureBeeModal(); m.classList.add('show'); makeConfetti(60);
    setTimeout(()=>{ m.classList.remove('show'); res(); }, ms);
  });
}
//#endregion

//#region Ratón y queso
const cheeseStage = $('#cheeseStage');
const cheeseMouse = $('#cheeseMouse');
const cheeseGoal  = $('#cheeseGoal');
const tagCheese   = $('#tagCheese');

const CHEESE_TARGET = 10;
let cheeseCount = 0;
let CHEESE_SEG = [];
let cheeseDragging = false;

function ensureCheeseLayout(){
  const stage = $('#scr-cheese .stage');
  if (!stage || !cheeseStage) return;
  const cs = cheeseStage.style;
  cs.position = 'absolute';
  cs.left = '0'; cs.top = '0'; cs.right = '0'; cs.bottom = '0';
}

function setupCheeseBar(){
  const wrap = $('#cwrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  CHEESE_SEG.length = 0;
  for(let i=0;i<10;i++){
    const s=document.createElement('div'); s.className='seg'; wrap.appendChild(s); CHEESE_SEG.push(s);
  }
  setCheeseSegments(0, CHEESE_TARGET);
}
function setCheeseSegments(done, total){
  const n = CHEESE_SEG.length || 10;
  const on = Math.min(n, Math.round((done/Math.max(1,total))*n));
  CHEESE_SEG.forEach((s,i)=> s.classList.toggle('on', i<on));
}
function centerCheeseMouse(){
  if (!cheeseStage || !cheeseMouse) return;
  const r = cheeseStage.getBoundingClientRect();
  const x = r.width/2 - cheeseMouse.offsetWidth/2;
  const y = r.height/2 - cheeseMouse.offsetHeight/2;
  cheeseMouse.style.left = x+'px'; cheeseMouse.style.top = y+'px';
}
function placeRandomCheese(){
  if (!cheeseStage || !cheeseGoal) return;
  const r = cheeseStage.getBoundingClientRect();
  const pad = 30;
  const maxX = r.width - cheeseGoal.offsetWidth - pad;
  const maxY = r.height - cheeseGoal.offsetHeight - pad;
  const gx = Math.max(pad, Math.min(maxX, Math.floor(Math.random()*maxX)+pad));
  const gy = Math.max(pad, Math.min(maxY, Math.floor(Math.random()*maxY)+pad));
  cheeseGoal.style.left = gx+'px'; cheeseGoal.style.top = gy+'px';
}
function mouseOverlapCheese(){
  if (!cheeseStage || !cheeseMouse || !cheeseGoal) return false;
  const r  = cheeseStage.getBoundingClientRect();
  const mr = cheeseMouse.getBoundingClientRect();
  const gr = cheeseGoal.getBoundingClientRect();
  const mcx = mr.left - r.left + mr.width/2;
  const mcy = mr.top  - r.top  + mr.height/2;
  const gcx = gr.left - r.left + gr.width/2;
  const gcy = gr.top  - r.top  + gr.height/2;
  return Math.hypot(mcx-gcx, mcy-gcy) < 34;
}
function eatCheese(){
  if (!cheeseStage || !cheeseGoal) return;
  const r  = cheeseStage.getBoundingClientRect();
  const gr = cheeseGoal.getBoundingClientRect();
  confettiIn(cheeseStage, gr.left-r.left+30, gr.top-r.top+30, 22);
  beep(760,.08,'sine',.22);
}
function startCheese(reset=true){
  if (!cheeseStage || !cheeseMouse || !cheeseGoal || !tagCheese) return;
  ensureCheeseLayout();
  if (reset){
    cheeseCount = 0; setupCheeseBar();
  }
  tagCheese.textContent = `Quesos: ${cheeseCount} / ${CHEESE_TARGET}`;
  requestAnimationFrame(()=>{ centerCheeseMouse(); placeRandomCheese(); });
}

// eventos del juego de queso
cheeseMouse?.addEventListener('pointerdown', (e)=>{
  e.preventDefault(); cheeseDragging = true;
  cheeseMouse.style.pointerEvents='none';
  cheeseMouse.setPointerCapture?.(e.pointerId);
  ensureAudio();
});
window.addEventListener('pointermove',(e)=>{
  if(!cheeseDragging || paused || !cheeseStage || !cheeseMouse) return;
  const r = cheeseStage.getBoundingClientRect();
  let nx = e.clientX - r.left - cheeseMouse.offsetWidth/2;
  let ny = e.clientY - r.top  - cheeseMouse.offsetHeight/2;
  nx = Math.max(0, Math.min(nx, r.width  - cheeseMouse.offsetWidth));
  ny = Math.max(0, Math.min(ny, r.height - cheeseMouse.offsetHeight));
  cheeseMouse.style.left = nx+'px'; cheeseMouse.style.top = ny+'px';
  if (mouseOverlapCheese()){
    eatCheese();
    cheeseCount += 1;
    tagCheese.textContent = `Quesos: ${cheeseCount} / ${CHEESE_TARGET}`;
    setCheeseSegments(cheeseCount, CHEESE_TARGET);
    if (cheeseCount >= CHEESE_TARGET){
      showOverlay(8, ()=> startCheese(true));
    } else {
      placeRandomCheese();
    }
  }
});
window.addEventListener('pointerup', ()=>{
  if(!cheeseDragging || !cheeseMouse) return;
  cheeseDragging = false; cheeseMouse.style.pointerEvents='';
});
//#endregion

//#region Sorting de colores
const field        = $('#colorField');
const bins         = document.querySelectorAll('#scr-sort .bin');
const tagSort      = $('#tagSort');
const sortWrap     = $('#sortWrap');
const btnSortSpeak = $('#btnSortSpeak');
const shelfEl      = document.querySelector('#scr-sort .shelf');

const COLORS = [
  {key:'rojo',     label:'Rojo',     cls:'clr-rojo'},
  {key:'amarillo', label:'Amarillo', cls:'clr-amarillo'},
  {key:'morado',   label:'Morado',   cls:'clr-morado'},
  {key:'azul',     label:'Azul',     cls:'clr-azul'}
];

const TOTAL_PER_COLOR = 5;
const TOTAL = TOTAL_PER_COLOR * COLORS.length;

let placedTotal = 0;
let placedPerColor = { rojo:0, amarillo:0, morado:0, azul:0 };
let dragBall = null, offX=0, offY=0;

let targetColorKey = null;
let SEG_SORT = [];

/* ---------- Bloqueo entre audios ---------- */
let sortLocked = false;
function lockSort(on) {
  sortLocked = !!on;
  field?.classList.toggle('locked', sortLocked);
  shelfEl?.classList.toggle('locked', sortLocked);
}

/* ---------- Audios ---------- */
const AUDIO_INSTRUCTION = {
  rojo:     new Audio('audio/color_rojo.mp3'),
  amarillo: new Audio('audio/color_amarillo.mp3'),
  morado:   new Audio('audio/color_morado.mp3'),
  azul:     new Audio('audio/color_azul.mp3')
};
const AUDIO_WRONG  = new Audio('audio/color_incorrecto.mp3');
const AUDIO_NEXT   = [
  new Audio('audio/congrats1.mp3'),
  new Audio('audio/congrats2.mp3'),
  new Audio('audio/congrats3.mp3')
];
const AUDIO_FINISH = new Audio('audio/final_congrats.mp3');

[...Object.values(AUDIO_INSTRUCTION), AUDIO_WRONG, ...AUDIO_NEXT, AUDIO_FINISH]
  .forEach(a => { if(a){ a.preload='auto'; a.volume=.95; } });

function stopAllColorAudios(){
  try{
    Object.values(AUDIO_INSTRUCTION).forEach(a=>{a.pause(); a.currentTime=0;});
    AUDIO_WRONG.pause();  AUDIO_WRONG.currentTime=0;
    AUDIO_NEXT.forEach(a=>{a.pause(); a.currentTime=0;});
    AUDIO_FINISH.pause(); AUDIO_FINISH.currentTime=0;
  }catch{}
}

function playAudio(audio, fallbackMs = 1500){
  return new Promise(res=>{
    if(!audio) return res();
    stopAllColorAudios();
    try{
      audio.currentTime = 0;
      const done = ()=>{ audio.onended=null; res(); };
      audio.onended = done;
      const p = audio.play();
      if (p?.catch) p.catch(()=> setTimeout(done, fallbackMs));
      setTimeout(()=>{ if(audio.onended) done(); }, fallbackMs + 3000);
    }catch{
      setTimeout(res, fallbackMs);
    }
  });
}
function playOneOf(arr){ return playAudio(arr[Math.floor(Math.random()*arr.length)]); }

/* ---------- UI progreso ---------- */
function setupSortSegments(n=10){
  sortWrap.innerHTML=''; SEG_SORT=[];
  for(let i=0;i<n;i++){ const s=document.createElement('div'); s.className='seg'; sortWrap.appendChild(s); SEG_SORT.push(s); }
  setSortSegments(0,TOTAL);
}
function setSortSegments(done,total){
  const n = SEG_SORT.length||10;
  const on = Math.min(n, Math.round((done/Math.max(1,total))*n));
  SEG_SORT.forEach((s,i)=> s.classList.toggle('on', i<on));
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
      rojo:     '#ef4444',
      amarillo: '#f5f50b',
      morado:   '#8b5cf6',
      azul:     '#3b82f6'
    };
    b.style.setProperty('--highlight', colorMap[targetColorKey] || '#22c55e');
    b.classList.add('target');
    b.animate(
      [{ transform:'scale(1)' }, { transform:'scale(1.06)' }, { transform:'scale(1)' }],
      { duration: 500, easing: 'ease' }
    );
  }
}
/* ---------- Secuencia de colores ---------- */
async function chooseNextTarget(playInstr=true){
  const remaining = COLORS.filter(c => placedPerColor[c.key] < TOTAL_PER_COLOR);
  if (!remaining.length){
    lockSort(true);
    await playAudio(AUDIO_FINISH, 1800);
    showOverlay(8, ()=>{ lockSort(false); startSort(); });
    return;
  }
  const nxt = remaining[Math.floor(Math.random()*remaining.length)];
  targetColorKey = nxt.key;
  markTargetBin();
  if (playInstr) await playAudio(AUDIO_INSTRUCTION[targetColorKey], 1200);
}

/* ---------- Pelotas ---------- */
function scatterBalls(){
  field.innerHTML='';
  const r = field.getBoundingClientRect();
  const pad = 16;

  COLORS.forEach(c=>{
    for(let i=0;i<TOTAL_PER_COLOR;i++){
      const el = document.createElement('div');
      el.className = `ball ${c.cls}`;
      el.dataset.color = c.key;

      const x = Math.floor(Math.random()*(r.width - 48 - pad*2)) + pad;
      const y = Math.floor(Math.random()*(r.height - 48 - pad*2)) + pad;
      el.style.left = x+'px'; el.style.top = y+'px';
      field.appendChild(el);

      el.addEventListener('pointerdown', e=>{
        if (sortLocked) return;
        dragBall = el;
        el.setPointerCapture?.(e.pointerId);
        el.classList.add('dragging');

        const br = el.getBoundingClientRect();
        offX = e.clientX - br.left; offY = e.clientY - br.top;

        if (!el.dataset.ox || !el.dataset.oy) {
          el.dataset.ox = parseFloat(el.style.left) || 0;
          el.dataset.oy = parseFloat(el.style.top)  || 0;
        }
        ensureAudio();
      });
    }
  });
}

function getBinAt(x,y){
  for(const z of bins){
    const r=z.getBoundingClientRect();
    if(x>=r.left && x<=r.right && y>=r.top && y<=r.bottom) return z;
  }
  return null;
}

/* ---------- Drag global ---------- */
window.addEventListener('pointermove', e=>{
  if(!dragBall) return;
  const fr = field.getBoundingClientRect();
  dragBall.style.left = (e.clientX - fr.left - offX) + 'px';
  dragBall.style.top  = (e.clientY - fr.top  - offY) + 'px';
});

window.addEventListener('pointerup', e=>{
  if(!dragBall) return;
  const ball = dragBall; dragBall = null;
  ball.classList.remove('dragging');

  if (sortLocked) { bounceBack(ball); return; }

  const drop = getBinAt(e.clientX, e.clientY);
  const colorBall = ball.dataset.color;

  const isRightBin   = !!drop && drop.dataset.color === colorBall;
  const isRightColor = colorBall === targetColorKey;

  if(isRightBin && isRightColor){
    const fr   = field.getBoundingClientRect();
    const hole = drop.querySelector('.bin-hole').getBoundingClientRect();
    ball.style.left = (hole.left - fr.left + hole.width/2 - 24) + 'px';
    ball.style.top  = (hole.top  - fr.top  + hole.height/2 - 24) + 'px';
    ball.style.pointerEvents='none';

    confettiIn(field, hole.left - fr.left + hole.width/2, hole.top - fr.top + hole.height/2, 14);
    beep(720,.08,'sine',.22);
    drop.classList.add('correct');
    clearTimeout(drop._t); drop._t=setTimeout(()=>drop.classList.remove('correct'), 450);

    placedTotal++;
    placedPerColor[colorBall] = (placedPerColor[colorBall]||0) + 1;
    tagSort.textContent = `Correctos: ${placedTotal} / ${TOTAL}`;
    setSortSegments(placedTotal, TOTAL);

    if (placedPerColor[targetColorKey] >= TOTAL_PER_COLOR){
      (async ()=>{
        lockSort(true);
        await playOneOf(AUDIO_NEXT);
        await chooseNextTarget(true);
        lockSort(false);
      })();
    } else if (placedTotal >= TOTAL) {
      if (playActive) {
    onGameCompleted();
      } else {
    showOverlay(8, ()=> startSort());
      }
    }
  } else {
    playAudio(AUDIO_WRONG, 900).then(()=> playAudio(AUDIO_INSTRUCTION[targetColorKey], 1200));
    beep(240,.07,'square',.14);
    bounceBack(ball);
  }
});

function bounceBack(ball){
  const fr   = field.getBoundingClientRect();
  const br   = ball.getBoundingClientRect();
  const ox   = parseFloat(ball.dataset.ox) || 0;
  const oy   = parseFloat(ball.dataset.oy) || 0;
  const curX = br.left - fr.left;
  const curY = br.top  - fr.top;
  const dx   = ox - curX;
  const dy   = oy - curY;

  const anim = ball.animate(
    [{ transform:'translate(0,0)' },{ transform:`translate(${dx}px,${dy}px)` }],
    { duration: 220, easing: 'cubic-bezier(.2,.9,.2,1)' }
  );
  anim.onfinish = ()=>{
    ball.style.left = ox + 'px';
    ball.style.top  = oy + 'px';
  };
}

/* ---------- Arranque / reinicio ---------- */
btnSortSpeak?.addEventListener('click', ()=> {
  if (targetColorKey && !sortLocked) playAudio(AUDIO_INSTRUCTION[targetColorKey], 1200);
});

function startSort(){
  placedTotal = 0;
  placedPerColor = { rojo:0, amarillo:0, morado:0, azul:0 };
  tagSort.textContent = `Correctos: 0 / ${TOTAL}`;
  setupSortSegments(10);
  scatterBalls();
  chooseNextTarget(true);
}

//#endregion

//#region Habitats
const habRails   = document.getElementById('hab-rails');
const farmZone   = document.getElementById('hab-farm');
const jungleZone = document.getElementById('hab-jungle');
const habAnimal  = document.getElementById('hab-animal');
const tagHab     = document.getElementById('tagHab');
const btnHabAudio= document.getElementById('btnHabAudio');
const btnBackHab = document.getElementById('btnBackHab');
let currentFlyAnim = null;

/* ========= SFX beep() ========= */
function sfxClick(){ beep(600, .08, 'sine', .05); }
function sfxFly(){   beep(400, .12, 'triangle', .12); setTimeout(()=>beep(800,.10,'sine',.15),60); }
function sfxDrop(){  beep(880, .10, 'sine', .18); setTimeout(()=>beep(660,.12,'sine',.22),70); }

document.addEventListener('contextmenu', e=>{
  if (document.getElementById('scr-habitats')?.classList.contains('active')) e.preventDefault();
});

/* Animales */
const HAB_ANIMALS = [
  {id:'gallina',   type:'farm'},
  {id:'vaca',      type:'farm'},
  {id:'cerdo',     type:'farm'},
  {id:'perro',     type:'farm'},
  {id:'pato',      type:'farm'},
  {id:'caballo',   type:'farm'},
  {id:'jaguar',    type:'jungle'},
  {id:'mono',      type:'jungle'},
  {id:'tucan',     type:'jungle'},
  {id:'serpiente', type:'jungle'},
  {id:'elefante',  type:'jungle'},
  {id:'perezoso',  type:'jungle'}
];
const srcAnimal = id => `img/${id}.png`;

/* ========= Audios ========= */
const habAudioInstr = new Audio('audio/instructions_hab.mp3');

const HAB_CORRECT = [
  new Audio('audio/correct_hab1.mp3'),
  new Audio('audio/correct_hab2.mp3'),
  new Audio('audio/correct_hab3.mp3'),
];
const HAB_INCOR = [
  new Audio('audio/incorrect_hab1.mp3'),
  new Audio('audio/incorrect_hab2.mp3'),
  new Audio('audio/incorrect_hab3.mp3'),
];
// preload + volumen
[habAudioInstr, ...HAB_CORRECT, ...HAB_INCOR].forEach(a => { a.preload='auto'; a.volume=.95; });

function stopAllHabAudios(){
  try{ [habAudioInstr, ...HAB_CORRECT, ...HAB_INCOR].forEach(a=>{a.pause(); a.currentTime=0;}); }catch{}
}
function playOnlyHab(audio, onended){
  stopAllHabAudios();
  try{
    audio.currentTime=0;
    if(onended){
      const h=()=>{ audio.removeEventListener('ended',h); onended(); };
      audio.addEventListener('ended', h);
    }
    audio.play().catch(()=>{});
  }catch{}
}

let habLocked = false;

function lockWhile(audio, after){
  habLocked = true;
  playOnlyHab(audio, ()=>{ habLocked = false; after?.(); });
}

let praiseIdx=0, wrongIdx=0;
let correctSinceVoice=0, wrongSinceVoice=0;

function onCorrectMaybeSpeak(){
  correctSinceVoice++;
  if (correctSinceVoice % 2 === 0){
    const a = HAB_CORRECT[praiseIdx++ % HAB_CORRECT.length];
    playOnlyHab(a);
  }
}

function onWrongMaybeSpeak(){
  wrongSinceVoice++;
  if (wrongSinceVoice % 1 === 0){
    const a = HAB_INCOR[wrongIdx++ % HAB_INCOR.length];
    playOnlyHab(a);
  } else if (wrongSinceVoice % 3 == 0) {
    beep(220,.07,'square',.18);
  }
}

/* ========= Estado ========= */
let habQueue=[], habIndex=0, habDone=0;
let habFinished=false;
let HAB_SEG=[];
let habClickLock=false;

/* ========= Barra de progreso ========= */
function setupHabBar(){
  const wrap = document.getElementById('habwrap');
  if (!wrap) return;
  wrap.innerHTML=''; HAB_SEG=[];
  for(let i=0;i<HAB_ANIMALS.length;i++){
    const s=document.createElement('div'); s.className='seg'; wrap.appendChild(s); HAB_SEG.push(s);
  }
  setHabSeg(0, HAB_ANIMALS.length);
}
function setHabSeg(done,total){
  const n=HAB_SEG.length||12;
  const on=Math.min(n, Math.round((done/Math.max(1,total))*n));
  HAB_SEG.forEach((s,i)=> s.classList.toggle('on', i<on));
}

/* ========= Arranque / reinicio ========= */
function startHabitats(){
  habQueue   = shuffle(HAB_ANIMALS.slice());
  habIndex   = 0;
  habDone    = 0;
  habFinished= false;
  habClickLock=false;

  praiseIdx=0; wrongIdx=0;
  correctSinceVoice=0; wrongSinceVoice=0;

  farmZone?.querySelector('.hab-pile')?.replaceChildren();
  jungleZone?.querySelector('.hab-pile')?.replaceChildren();

  setupHabBar();
  tagHab.textContent = `Correctos: ${habDone} / ${HAB_ANIMALS.length}`;
  loadCurrentAnimal();

  lockWhile(habAudioInstr);
}

/* ========= Utilidades de sprite ========= */
function resetSprite(){
  try{ habAnimal.getAnimations?.().forEach(a=>a.cancel()); }catch{}
  if (currentFlyAnim){ try{ currentFlyAnim.cancel(); }catch{} currentFlyAnim=null; }
  habAnimal.style.opacity='1';
  habAnimal.style.pointerEvents='';
  habAnimal.style.left='50%';
  habAnimal.style.top='50%';
  habAnimal.style.transform='translate(-50%,-50%)';
}

/* ========= Cargar animal actual ========= */
function loadCurrentAnimal(){
  if (habFinished) return;
  const a = habQueue[habIndex]; if(!a) return;

  habClickLock=false;
  resetSprite();

  habAnimal.style.opacity='0';
  habAnimal.onload=()=>{
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      resetSprite();
      habAnimal.style.opacity='1';
    }));
  };
  habAnimal.src = srcAnimal(a.id);
  habAnimal.dataset.type = a.type;
  tagHab.textContent = `Correctos: ${habDone} / ${HAB_ANIMALS.length}`;

  const recenter=()=>resetSprite();
  window.removeEventListener('resize', recenter);
  window.addEventListener('resize', recenter, {once:true});
}

/* ========= Controles UI ========= */
btnHabAudio?.addEventListener('click', ()=> lockWhile(habAudioInstr));
btnBackHab?.addEventListener('click', ()=> { backHome?.(); });

/* ========= Vuelo al hábitat ========= */
function flyAnimalTo(target){
  return new Promise(resolve=>{
    try{ habAnimal.getAnimations?.().forEach(a=>a.cancel()); }catch{}
    if(currentFlyAnim){ try{ currentFlyAnim.cancel(); }catch{} currentFlyAnim=null; }

    const aRect = habAnimal.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    const dx = (tRect.left + tRect.width/2) - (aRect.left + aRect.width/2);
    const dy = (tRect.top  + tRect.height/2) - (aRect.top  + aRect.height/2);

    sfxFly();

    currentFlyAnim = habAnimal.animate(
      [
        {transform:'translate(-50%,-50%) scale(1)', opacity:1},
        {transform:`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.86)`, opacity:.98}
      ],
      {duration:560, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards'}
    );

    currentFlyAnim.onfinish=()=>{
      currentFlyAnim=null;

      const img=document.createElement('img');
      img.src=habAnimal.src; img.className='hab-thumb';
      target.querySelector('.hab-pile')?.appendChild(img);

      sfxDrop();
      resetSprite();
      resolve();
    };
  });
}

/* ========= Lógica de click ========= */
habAnimal.addEventListener('mousedown', e=>{
  if (paused || habFinished || habClickLock || habLocked) return;
  ensureAudio?.();
  sfxClick();
  resetSprite();

  const kind = habAnimal.dataset.type;
  const expectedBtn = (kind==='farm') ? 0 : 2;
  const good = (e.button === expectedBtn);

  if (!good){
    habAnimal.animate(
      [
        {transform:'translate(-50%,-50%)'},
        {transform:'translate(calc(-50% - 6px),-50%)'},
        {transform:'translate(calc(-50% + 6px),-50%)'},
        {transform:'translate(-50%,-50%)'}
      ],
      {duration:260}
    );
    onWrongMaybeSpeak();
    return;
  }

  habClickLock=true;
  habAnimal.style.pointerEvents='none';
  const target = (e.button===0) ? farmZone : jungleZone;

  flyAnimalTo(target).then(()=>{
    confettiIn?.(habRails, target.offsetLeft + target.offsetWidth/2, 48, 18);

    habDone++;
    setHabSeg(habDone, HAB_ANIMALS.length);
    tagHab.textContent = `Correctos: ${habDone} / ${HAB_ANIMALS.length}`;

    onCorrectMaybeSpeak();

    if (habDone >= HAB_ANIMALS.length){
      habFinished = true;
  habAnimal.style.opacity = '0';
  habAnimal.style.pointerEvents = 'none';
  stopAllHabAudios();

  if (playActive) {
    onGameCompleted();
  } else {
    showOverlay(8, ()=> startHabitats());
  }
  return;
    }

    habIndex++;
    loadCurrentAnimal();
  });
});


//#endregion

//#region Mascota compu
function bindMascotClick(){
  const m = document.getElementById('mascota');
  if(!m) return;
  const fire = (e)=>{ e.stopPropagation(); makeConfetti(90); beep(880,.08,'sine',.25); beep(660,.08,'triangle',.2);};
  m.addEventListener('click', fire); m.querySelector('img')?.addEventListener('click', fire);
}
document.addEventListener('DOMContentLoaded', bindMascotClick);
//#endregion

// Recalcula al redimensionar
window.addEventListener('resize', ()=>{
  if ($('#scr-cheese')?.classList.contains('active')) {
    startCheese(false); // re-posiciona sin resetear el contador
  }
});
