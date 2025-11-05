/* ========== Helpers ========== */
const $ = s => document.querySelector(s);
const rnd = (a,b)=>Math.random()*(b-a)+a;
const rndi = (a,b)=>Math.floor(rnd(a,b+1));
const shuffle = arr => [...arr].sort(()=>Math.random()-.5);

/* ========== Audio base ========== */
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

/* ========== Overlay turnos ========== */
const overlay = $('#overlay'), btnContinue = $('#btnContinue'), countEl = $('#count');
let timer=null, paused=false;
function playCambioTurnoAudio(){
  try{ const a=new Audio('audio/lo_lograste.mp3'); a.volume=.9; a.play().catch(()=>{}); }catch{}
}
function showOverlay(seconds=8, onContinue){
  paused=true; overlay.classList.add('show'); playCambioTurnoAudio(); btnContinue.disabled=true;
  let t=seconds; countEl.textContent=t; clearInterval(timer);
  timer=setInterval(()=>{ t--; countEl.textContent=t; beep(720-(seconds-t)*15,.06,'triangle',.15);
    if(t<=0){ clearInterval(timer); btnContinue.disabled=false; }},1000);
  btnContinue.onclick=()=>{ overlay.classList.remove('show'); paused=false; onContinue?.(); };
}

/* ========== Ruteo ========== */
const SCREENS = ['balloons','keys','drag','clicks','maze'];
let currentGameId = null;

function openScreen(name){
  if (SCREENS.includes(name)) currentGameId=name;
  $('#home')?.classList.remove('active');
  SCREENS.forEach(id => $('#scr-'+id)?.classList.remove('active'));
  $('#scr-'+name)?.classList.add('active');
  const map={balloons:'Globos',keys:'Piano',drag:'Casitas',clicks:'Clic',maze:'Laberinto'};
  $('#tagMode').textContent='Modo: '+(map[name]||'Inicio');
}
function backHome(){
  SCREENS.forEach(id => $('#scr-'+id)?.classList.remove('active'));
  $('#home')?.classList.add('active');
  $('#tagMode').textContent='Modo: Inicio';
}
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.screen').forEach(s=>s.id!=='home'&&s.classList.remove('active'));
});

/* ========== “Jugar (3 retos)” ========== */
const PLAY_SET = ['balloons','drag','maze'];
let playOrder = [], playIndex = 0, playActive = false;

function startPlay3(){
  playOrder = shuffle(PLAY_SET);
  playIndex = 0;
  playActive = true;
  launchCurrentPlayGame();
}

function launchCurrentPlayGame(){
  const id = playOrder[playIndex];
  currentGameId = id;
  openScreen(id);
  if (id === 'balloons') startBalloons();
  else if (id === 'drag') startDragHome();
  else if (id === 'maze') startMaze(true);
}

function onGameCompleted(){
  if (playActive){
    playIndex++;

    if (playIndex >= playOrder.length){
      showOverlay(8, ()=>{
        playOrder = shuffle(PLAY_SET);
        playIndex = 0;
        playActive = true;
        launchCurrentPlayGame();
      });
    } else {
      launchCurrentPlayGame();
    }
  } else {
    showOverlay(8, ()=> restartCurrentGame());
  }
}

/* Botón Play */
document.addEventListener('DOMContentLoaded', ()=>{
  $('#btnPlay')?.addEventListener('click', ()=> startPlay3());
});

/* ========== Reiniciar juego actual (fuera de Play) ========== */
function isActive(id){ return $('#scr-'+id)?.classList.contains('active'); }
function restartCurrentGame(){
  if (!currentGameId){
    currentGameId =
      isActive('balloons')?'balloons':
      isActive('keys')    ?'keys':
      isActive('drag')    ?'drag':
      isActive('clicks')  ?'clicks':
      isActive('maze')    ?'maze': null;
  }
  if(currentGameId==='balloons'){ openScreen('balloons'); startBalloons(); }
  else if(currentGameId==='keys'){ openScreen('keys'); startPianoKeys(); }
  else if(currentGameId==='drag'){ openScreen('drag'); startDragHome(); }
  else if(currentGameId==='clicks'){ openScreen('clicks'); startClicks?.(); }
  else if(currentGameId==='maze'){ openScreen('maze'); startMaze(true); }
}

/* ========== Globos ========== */
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
function setupSegments(n=10){ if(!pwrap) return; pwrap.innerHTML=''; SEGMENTS=[]; for(let i=0;i<n;i++){const s=document.createElement('div'); s.className='seg'; pwrap.appendChild(s); SEGMENTS.push(s);} }
function setSegmentsFraction(done,total){ if(!SEGMENTS.length) return; const n=SEGMENTS.length; const on=Math.min(n,Math.round((done/Math.max(1,total))*n)); SEGMENTS.forEach((s,i)=>s.classList.toggle('on',i<on)); }

const GOAL_BALLOONS=10;
let poppedRound=0, balloons=[], rafId=null;
const PHY={MAX_VX:.45, MAX_VY:.55, DAMPING:.995, BOUNCE:.85, DRIFT:.0018};
const clamp = (v,lim)=>Math.max(-lim,Math.min(lim,v));

function stopLoop(){ if(rafId){cancelAnimationFrame(rafId); rafId=null;} }
function clearBalloons(){ stopLoop(); balloons.forEach(b=>b.el.remove()); balloons=[]; poppedRound=0; tagBalloons.textContent='Globos: 0'; setupSegments(10); setSegmentsFraction(0,GOAL_BALLOONS); }
function randColor(){ const H=[10,40,120,190,260,320]; const h=H[rndi(0,H.length-1)], s=rndi(70,95), l=rndi(48,64); return `hsl(${h} ${s}% ${l}%)`; }
function emitLocalConfetti(cx,cy,n=24){
  for(let i=0;i<n;i++){const sp=document.createElement('div'); sp.style.cssText='position:absolute;width:8px;height:8px;border-radius:50%;pointer-events:none;opacity:.95;';
    sp.style.left=(cx-4)+'px'; sp.style.top=(cy-4)+'px'; sp.style.background=randColor(); balloonArea.appendChild(sp);
    const ang=Math.random()*Math.PI*2, dist=rnd(30,90), dx=Math.cos(ang)*dist, dy=Math.sin(ang)*dist;
    sp.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(${rnd(.7,1.2)})`,opacity:0}],
      {duration:rndi(450,800),easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'}); setTimeout(()=>sp.remove(),820);}
}
function spawnBalloon(){
  const el=document.createElement('div'); el.className='balloon'; el.textContent='🎈'; el.style.fontSize=MODO_FACIL?'72px':'32px'; el.style.bottom='auto'; el.style.transition='transform .12s ease'; balloonArea.appendChild(el);
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

/* ========== Teclas ========== */
const bigKey=$('#bigKey'), subKey=$('#subKey'), tray=$('#rainbowTray'), tagKeys=$('#tagKeys');
let keyCount=0, pianoSeq=[];
function makeStripe(){ const s=document.createElement('div'); s.className='rain'; const h=Math.floor(Math.random()*360);
  s.style.background=`linear-gradient(90deg,hsl(${h} 90% 65%),hsl(${(h+60)%360} 90% 60%))`; s.style.top=(70+Math.random()*40)+'%';
  tray.appendChild(s); setTimeout(()=>s.remove(),1400);
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

/* ========== Casitas (drag & drop) ========== */
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

/* ========== Click suave ========== */
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
function startClicks(){
  left=0; right=0;chipLeft.textContent='Izq: 0';chipRight.textContent='Der: 0';
}
// flash que se auto-apaga
function flash(el,cls,ms=160){
  if(!el) return;el.classList.add(cls);clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove(cls), ms);
}
clickArea?.addEventListener('mousemove', e=>{ if(!paused) moveGhost(e); });
clickArea?.addEventListener('mousedown', e=>{
  if(paused) return;
  moveGhost(e);
  if(e.button===0){
    chipLeft.textContent='Izq: '+(++left);flash(btnLeft,'active-left');toast.textContent='Clic izquierdo';beep(760,.08,'sine',.18);
  } else if(e.button===2){
    chipRight.textContent='Der: '+(++right);flash(btnRight,'active-right');toast.textContent='Clic derecho';beep(420,.08,'square',.18);
  }
toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toast.classList.remove('show'),700);
const r=clickArea.getBoundingClientRect();pulse(e.clientX-r.left, e.clientY-r.top);});
// limpieza extra por si queda presionado al salir de la ventana
window.addEventListener('mouseup', ()=>{btnLeft?.classList.remove('active-left');btnRight?.classList.remove('active-right');});


/* ========== Confetti global ========== */
function makeConfetti(n=80){
  const box=$('#confetti');
  for(let i=0;i<n;i++){ const c=document.createElement('div'); c.className='conf';
    const size=rnd(6,12); c.style.width=size+'px'; c.style.height=(size*1.3)+'px';
    const h=Math.floor(Math.random()*360); c.style.background=`hsl(${h} 90% 60%)`;
    c.style.left=rnd(0,100)+'%'; c.style.top='-10px'; box.appendChild(c);
    const x=rnd(-40,40), rot=rnd(0,360);
    c.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${x}px,110vh) rotate(${rot}deg)`,opacity:1}],
      {duration:rnd(1200,2000),easing:'cubic-bezier(.15,.6,.2,1)',fill:'forwards'}); setTimeout(()=>c.remove(),2100);
  }
}
function confettiIn(container,x,y,n=18){
  for(let i=0;i<n;i++){ const sp=document.createElement('div'); sp.style.cssText='position:absolute;width:8px;height:8px;border-radius:50%;pointer-events:none;opacity:.95;';
    sp.style.left=(x-4)+'px'; sp.style.top=(y-4)+'px'; sp.style.background=`hsl(${Math.floor(Math.random()*360)} 90% 60%)`; container.appendChild(sp);
    const ang=Math.random()*Math.PI*2, dist=Math.random()*80+30, dx=Math.cos(ang)*dist, dy=Math.sin(ang)*dist;
    sp.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(${0.8+Math.random()*0.6})`,opacity:0}],
      {duration:450+Math.random()*400,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'}); setTimeout(()=>sp.remove(),900);
  }
}

/* ========== Laberinto ========== */
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
    showCheesePopup(1200).then(()=>{
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

/* Popup del ratón con queso */
let cheeseModal=null;
function ensureCheeseModal(){
  if(cheeseModal) return cheeseModal;
  const wrap=document.createElement('div');
  wrap.className='cheese-pop';
  wrap.innerHTML = `<div class="cheese-card"><img src="img/raton.png" alt="¡Queso conseguido!"></div>`;
  document.body.appendChild(wrap);
  cheeseModal=wrap; return cheeseModal;
}
function showCheesePopup(ms=1200){
  return new Promise(res=>{
    const m=ensureCheeseModal(); m.classList.add('show'); makeConfetti(60);
    setTimeout(()=>{ m.classList.remove('show'); res(); }, ms);
  });
}

function bindMascotClick(){
  const m = document.getElementById('mascota');
  if(!m) return; const fire = (e)=>{ e.stopPropagation(); makeConfetti(90); beep(880,.08,'sine',.25); beep(660,.08,'triangle',.2);};
  m.addEventListener('click', fire); m.querySelector('img')?.addEventListener('click', fire);
} document.addEventListener('DOMContentLoaded', bindMascotClick);

