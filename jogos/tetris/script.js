//=============================
// CONFIGURAÇÕES
//=============================
const COLUNAS = 10, LINHAS = 20, T = 30;
const tab = document.getElementById('tabuleiro');
const ctx = tab.getContext('2d');
const ctxProx = document.getElementById('proxima').getContext('2d');
const ctxGuard = document.getElementById('guardada').getContext('2d');

const FORMAS = {
  I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O:[[1,1],[1,1]],
  T:[[0,1,0],[1,1,1],[0,0,0]],
  S:[[0,1,1],[1,1,0],[0,0,0]],
  Z:[[1,1,0],[0,1,1],[0,0,0]],
  J:[[1,0,0],[1,1,1],[0,0,0]],
  L:[[0,0,1],[1,1,1],[0,0,0]]
};
const CORES = { I:'#00f0ff', O:'#ffd400', T:'#b44cff', S:'#3dff7a', Z:'#ff3d6e', J:'#3d7bff', L:'#ff9a1f' };
const PONTOS_LINHAS = [0, 100, 300, 500, 800];

//=============================
// ESTADO
//=============================
let estado = 'parado';     // parado | jogando | pausado | limpando | fim
let grade, peca, proxima, guardada, podeGuardar, sacola;
let pontos, linhas, nivel, combo, recorde, novoRecorde;
let acumulador = 0, ultimoTempo = 0, linhasCheias = [], tempoLimpeza = 0, tremer = 0;
let somLigado = true, audioCtx = null;

try { recorde = Number(localStorage.getItem('recordeTetris')) || 0; } catch(e){ recorde = 0; }
const $ = id => document.getElementById(id);

//=============================
// SOM
//=============================
function tom(freq, dur, tipo='square', vol=0.05, atraso=0){
  if(!somLigado) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime + atraso;
    o.type = tipo; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + dur);
  }catch(e){}
}

//=============================
// PEÇAS
//=============================
function embaralhar(a){
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
// "sacola de 7": todas as peças saem uma vez antes de repetir
function sortearTipo(){
  if(!sacola || !sacola.length) sacola = embaralhar(Object.keys(FORMAS));
  return sacola.pop();
}
function novaPeca(tipo){
  const m = FORMAS[tipo].map(l => [...l]);
  return { tipo, m, x: Math.floor((COLUNAS - m[0].length)/2), y: 0 };
}
function girarMatriz(m, horario){
  const g = m[0].map((_, i) => m.map(l => l[i]));
  return horario ? g.map(l => l.reverse()) : g.reverse();
}
function colide(m, x, y){
  for(let r=0;r<m.length;r++) for(let c=0;c<m[r].length;c++){
    if(!m[r][c]) continue;
    const nx = x+c, ny = y+r;
    if(nx<0 || nx>=COLUNAS || ny>=LINHAS) return true;
    if(ny>=0 && grade[ny][nx]) return true;
  }
  return false;
}

//=============================
// FLUXO DO JOGO
//=============================
function iniciarJogo(){
  grade = Array.from({length:LINHAS}, () => Array(COLUNAS).fill(null));
  sacola = []; pontos = 0; linhas = 0; nivel = 1; combo = 0;
  guardada = null; podeGuardar = true; novoRecorde = false;
  proxima = sortearTipo();
  gerarPeca();
  acumulador = 0; linhasCheias = [];
  if(estado !== 'fim') estado = 'jogando';
  estado = 'jogando';
  atualizarHUD(); atualizarBotoes();
}

function gerarPeca(){
  peca = novaPeca(proxima);
  proxima = sortearTipo();
  podeGuardar = true;
  if(colide(peca.m, peca.x, peca.y)) fimDeJogo();
}

function intervaloQueda(){ return Math.max(60, 800 * Math.pow(0.85, nivel - 1)); }

function mover(dx){
  if(estado !== 'jogando') return;
  if(!colide(peca.m, peca.x + dx, peca.y)){ peca.x += dx; }
}

function descer(manual){
  if(estado !== 'jogando') return;
  if(!colide(peca.m, peca.x, peca.y + 1)){
    peca.y++;
    if(manual) pontos++;
    atualizarHUD();
  }else{
    travar();
  }
}

function girar(horario){
  if(estado !== 'jogando') return;
  const nova = girarMatriz(peca.m, horario);
  // "wall kick": tenta deslocar para os lados se girar encostado na parede/blocos
  for(const dx of [0,-1,1,-2,2]){
    if(!colide(nova, peca.x + dx, peca.y)){ peca.m = nova; peca.x += dx; tom(440,.04,'triangle',.04); return; }
  }
}

function quedaRapida(){
  if(estado !== 'jogando') return;
  let n = 0;
  while(!colide(peca.m, peca.x, peca.y + 1)){ peca.y++; n++; }
  pontos += n * 2;
  tremer = 80;
  travar();
}

function guardar(){
  if(estado !== 'jogando' || !podeGuardar) return;
  const tipoAtual = peca.tipo;
  if(guardada){
    peca = novaPeca(guardada);
  }else{
    peca = novaPeca(proxima);
    proxima = sortearTipo();
  }
  guardada = tipoAtual;
  podeGuardar = false;
  tom(330,.06,'triangle',.05);
}

function travar(){
  peca.m.forEach((l, r) => l.forEach((v, c) => {
    if(v && peca.y + r >= 0) grade[peca.y + r][peca.x + c] = peca.tipo;
  }));
  tom(160,.06,'square',.05);

  linhasCheias = [];
  for(let r=0;r<LINHAS;r++) if(grade[r].every(Boolean)) linhasCheias.push(r);

  if(linhasCheias.length){
    estado = 'limpando';
    tempoLimpeza = 280;
    peca = null;
  }else{
    combo = 0;
    gerarPeca();
  }
  atualizarHUD();
}

function concluirLimpeza(){
  const n = linhasCheias.length;
  grade = grade.filter((_, r) => !linhasCheias.includes(r));
  while(grade.length < LINHAS) grade.unshift(Array(COLUNAS).fill(null));

  let ganho = PONTOS_LINHAS[n] * nivel;
  if(n === 4 && combo > 0) ganho = Math.round(ganho * 1.5);      // Tetris seguido de Tetris
  combo = n === 4 ? combo + 1 : 0;
  pontos += ganho;
  linhas += n;

  const novoNivel = 1 + Math.floor(linhas / 10);
  if(novoNivel > nivel){ nivel = novoNivel; [523,659,784].forEach((f,i)=>tom(f,.12,'triangle',.07,i*.09)); }
  [400,500,600,800].slice(0, n).forEach((f,i)=>tom(f,.1,'square',.05,i*.06));

  linhasCheias = [];
  estado = 'jogando';
  gerarPeca();
  atualizarHUD();
}

function fimDeJogo(){
  estado = 'fim';
  tremer = 400;
  tom(200,.25,'sawtooth',.07); tom(110,.5,'sawtooth',.07,.18);
  if(pontos > recorde){
    recorde = pontos; novoRecorde = true;
    try{ localStorage.setItem('recordeTetris', recorde); }catch(e){}
  }
  atualizarHUD(); atualizarBotoes();
}

function pausarJogo(){
  if(estado === 'jogando') estado = 'pausado';
  else if(estado === 'pausado') estado = 'jogando';
  else return;
  acumulador = 0;
  atualizarBotoes();
}

//=============================
// HUD
//=============================
function atualizarHUD(){
  $('pontos').textContent = pontos || 0;
  $('nivel').textContent = nivel || 1;
  $('linhas').textContent = linhas || 0;
  $('recorde').textContent = Math.max(recorde, pontos || 0);
}
function atualizarBotoes(){
  const emJogo = estado==='jogando' || estado==='pausado' || estado==='limpando';
  $('btnIniciar').textContent = estado==='parado' ? 'Iniciar Jogo' : 'Reiniciar';
  $('btnPausar').textContent = estado==='pausado' ? 'Continuar' : 'Pausar';
  $('btnPausar').disabled = !emJogo;
}

//=============================
// DESENHO
//=============================
function bloco(c, x, y, tipo, tam, alfa=1){
  const px = x*tam, py = y*tam;
  c.globalAlpha = alfa;
  c.fillStyle = CORES[tipo];
  c.shadowColor = CORES[tipo]; c.shadowBlur = 8;
  c.fillRect(px+1, py+1, tam-2, tam-2);
  c.shadowBlur = 0;
  c.fillStyle = 'rgba(255,255,255,.28)';
  c.fillRect(px+3, py+3, tam-6, (tam-6)/3);
  c.fillStyle = 'rgba(0,0,0,.22)';
  c.fillRect(px+3, py+tam-6, tam-6, 3);
  c.globalAlpha = 1;
}

function posicaoSombra(){
  let y = peca.y;
  while(!colide(peca.m, peca.x, y + 1)) y++;
  return y;
}

function desenharMini(c, tipo){
  c.clearRect(0, 0, 100, 100);
  if(!tipo) return;
  const m = FORMAS[tipo], tam = 20;
  const ox = (100 - m[0].length*tam)/2/tam, oy = (100 - m.length*tam)/2/tam;
  m.forEach((l, r) => l.forEach((v, cc) => { if(v) bloco(c, cc+ox, r+oy, tipo, tam); }));
}

function desenhar(agora){
  ctx.save();
  if(tremer > 0){
    const f = Math.min(tremer/400, 1) * 6;
    ctx.translate((Math.random()-.5)*f, (Math.random()-.5)*f);
  }
  ctx.fillStyle = '#01030a';
  ctx.fillRect(-10, -10, tab.width+20, tab.height+20);

  // grade
  ctx.strokeStyle = 'rgba(0,240,255,.07)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for(let i=0;i<=COLUNAS;i++){ ctx.moveTo(i*T,0); ctx.lineTo(i*T,tab.height); }
  for(let i=0;i<=LINHAS;i++){ ctx.moveTo(0,i*T); ctx.lineTo(tab.width,i*T); }
  ctx.stroke();

  if(grade){
    for(let r=0;r<LINHAS;r++) for(let c=0;c<COLUNAS;c++){
      if(grade[r][c]) bloco(ctx, c, r, grade[r][c], T);
    }
    // sombra (onde a peça vai cair)
    if(peca && estado !== 'fim'){
      const ys = posicaoSombra();
      peca.m.forEach((l, r) => l.forEach((v, c) => {
        if(v) bloco(ctx, peca.x+c, ys+r, peca.tipo, T, .22);
      }));
      peca.m.forEach((l, r) => l.forEach((v, c) => {
        if(v && peca.y+r >= 0) bloco(ctx, peca.x+c, peca.y+r, peca.tipo, T);
      }));
    }
    // animação das linhas completas
    if(estado === 'limpando'){
      const pisca = Math.floor(agora/60) % 2 === 0;
      ctx.fillStyle = pisca ? 'rgba(255,255,255,.9)' : 'rgba(0,240,255,.6)';
      linhasCheias.forEach(r => ctx.fillRect(0, r*T, tab.width, T));
    }
  }
  ctx.restore();

  desenharMini(ctxProx, proxima);
  desenharMini(ctxGuard, guardada);

  ctx.textAlign = 'center';
  if(estado === 'parado') painel('🧱 TETRIS', '', 'Enter ou toque para começar');
  else if(estado === 'pausado') painel('PAUSADO', '', 'P ou toque para continuar');
  else if(estado === 'fim') painel('FIM DE JOGO', 'Pontos: ' + pontos + (novoRecorde ? '  🏆 Recorde!' : ''), 'Enter ou toque para jogar de novo');
}

function painel(titulo, sub, dica){
  ctx.fillStyle = 'rgba(0,0,0,.72)';
  ctx.fillRect(0, 0, tab.width, tab.height);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 32px Arial';
  ctx.fillText(titulo, tab.width/2, tab.height/2 - 20);
  if(sub){ ctx.fillStyle = '#00f0ff'; ctx.font = '18px Arial'; ctx.fillText(sub, tab.width/2, tab.height/2 + 18); }
  ctx.fillStyle = '#cbd5e1'; ctx.font = '14px Arial';
  ctx.fillText(dica, tab.width/2, tab.height/2 + 56);
}

//=============================
// CONTROLES
//=============================
const ACOES = {
  esquerda: () => mover(-1),
  direita:  () => mover(1),
  baixo:    () => descer(true),
  girar:    () => girar(true),
  girarAnti:() => girar(false),
  queda:    quedaRapida,
  guardar:  guardar
};
const REPETE = { esquerda:1, direita:1, baixo:1 };
const TECLAS = {
  ArrowLeft:'esquerda', a:'esquerda', A:'esquerda',
  ArrowRight:'direita', d:'direita', D:'direita',
  ArrowDown:'baixo', s:'baixo', S:'baixo',
  ArrowUp:'girar', x:'girar', X:'girar',
  z:'girarAnti', Z:'girarAnti',
  ' ':'queda',
  c:'guardar', C:'guardar', Shift:'guardar'
};

document.addEventListener('keydown', e=>{
  if(e.key === 'Enter'){
    e.preventDefault();
    if(estado==='parado' || estado==='fim') iniciarJogo();
    return;
  }
  if(e.key === 'p' || e.key === 'P' || e.key === 'Escape'){ pausarJogo(); return; }
  const acao = TECLAS[e.key];
  if(!acao) return;
  e.preventDefault();
  if(e.repeat && !REPETE[acao]) return;
  ACOES[acao]();
});

$('btnIniciar').addEventListener('click', e=>{ iniciarJogo(); e.target.blur(); });
$('btnPausar').addEventListener('click', e=>{ pausarJogo(); e.target.blur(); });
$('btnSom').addEventListener('click', e=>{
  somLigado = !somLigado;
  e.target.textContent = 'Som: ' + (somLigado ? 'ligado' : 'desligado');
  e.target.blur();
});
tab.addEventListener('click', ()=>{
  if(estado==='parado' || estado==='fim') iniciarJogo();
  else if(estado==='pausado') pausarJogo();
});

// botões de toque (esquerda, direita e baixo repetem enquanto pressionados)
document.querySelectorAll('.ctl').forEach(b=>{
  let timer = null;
  const parar = () => { clearInterval(timer); timer = null; };
  b.addEventListener('pointerdown', e=>{
    e.preventDefault();
    const acao = b.dataset.acao;
    ACOES[acao]();
    if(REPETE[acao]){ parar(); timer = setInterval(ACOES[acao], 95); }
  });
  ['pointerup','pointerleave','pointercancel'].forEach(ev => b.addEventListener(ev, parar));
});

document.addEventListener('visibilitychange', ()=>{ if(document.hidden && estado==='jogando') pausarJogo(); });

//=============================
// LOOP
//=============================
function loop(agora){
  const dt = Math.min(agora - ultimoTempo, 100);
  ultimoTempo = agora;
  if(tremer > 0) tremer -= dt;

  if(estado === 'jogando'){
    acumulador += dt;
    const intervalo = intervaloQueda();
    while(acumulador >= intervalo && estado === 'jogando'){
      acumulador -= intervalo;
      descer(false);
    }
  }else if(estado === 'limpando'){
    tempoLimpeza -= dt;
    if(tempoLimpeza <= 0) concluirLimpeza();
  }
  desenhar(agora);
  requestAnimationFrame(loop);
}

// inicialização
grade = Array.from({length:LINHAS}, () => Array(COLUNAS).fill(null));
atualizarHUD(); atualizarBotoes();
requestAnimationFrame(t => { ultimoTempo = t; loop(t); });