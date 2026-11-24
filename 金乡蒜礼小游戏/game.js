'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

/* ==================== 舒缓纯音乐 BGM + 交互音效（独立开关） ==================== */
let bgmEnabled = true;
let sfxEnabled = true;
let audioCtx = null;
let bgmTimer = null;
let bgmStep = 0;
let bgmMasterGain = null;

function ensureAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      bgmMasterGain = audioCtx.createGain();
      bgmMasterGain.gain.value = bgmEnabled ? 0.24 : 0;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1850;
      bgmMasterGain.connect(filter);
      filter.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch {}
}

const BGM_CHORDS = [
  [174.61, 220.0, 261.63, 329.63],
  [196.0, 246.94, 293.66, 392.0],
  [164.81, 196.0, 246.94, 329.63],
  [146.83, 220.0, 261.63, 349.23],
  [233.08, 293.66, 349.23, 440.0],
  [174.61, 220.0, 261.63, 349.23],
  [196.0, 233.08, 293.66, 349.23],
  [196.0, 261.63, 293.66, 329.63],
];

const BGM_MELODY = [
  523.25, 0, 587.33, 659.25, 523.25, 0, 440.0, 0,
  587.33, 0, 659.25, 783.99, 659.25, 0, 523.25, 0,
  440.0, 523.25, 587.33, 0, 523.25, 0, 392.0, 0,
  440.0, 0, 523.25, 587.33, 523.25, 0, 0, 0,
];

function playBgmNote(freq, startTime, duration, vol = 0.16, type = 'sine') {
  if (!audioCtx || !bgmMasterGain || !freq) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(bgmMasterGain);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function tickBgm() {
  if (!bgmEnabled || !audioCtx || audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;
  if (bgmStep % 4 === 0) {
    const chord = BGM_CHORDS[(bgmStep / 4) % BGM_CHORDS.length];
    chord.forEach((f, idx) => playBgmNote(f, now + idx * 0.05, 2.35, 0.085, 'sine'));
  }
  const mel = BGM_MELODY[bgmStep % BGM_MELODY.length];
  if (mel) {
    playBgmNote(mel, now, 1.05, 0.12, 'triangle');
    playBgmNote(mel * 2, now + 0.02, 0.55, 0.028, 'sine');
  }
  bgmStep = (bgmStep + 1) % BGM_MELODY.length;
}

function startBgm() {
  ensureAudio();
  if (bgmMasterGain && audioCtx) {
    bgmMasterGain.gain.setTargetAtTime(bgmEnabled ? 0.24 : 0, audioCtx.currentTime, 0.12);
  }
  if (!bgmTimer) {
    tickBgm();
    bgmTimer = setInterval(tickBgm, 540);
  }
}

function syncAudioButtons() {
  $('#bgmToggle').textContent = bgmEnabled ? '音乐 开' : '音乐 关';
  $('#sfxToggle').textContent = sfxEnabled ? '音效 开' : '音效 关';
  const coverBtn = $('#coverBgmBtn');
  if (coverBtn) coverBtn.textContent = bgmEnabled ? '🎵 舒缓音乐：开' : '🔇 舒缓音乐：关';
  if (bgmMasterGain && audioCtx) {
    bgmMasterGain.gain.setTargetAtTime(bgmEnabled ? 0.24 : 0, audioCtx.currentTime, 0.12);
  }
}

function playTone(freq, duration = 0.14, type = 'sine', volume = 0.08, delay = 0) {
  if (!sfxEnabled) return;
  try {
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const start = audioCtx.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch {}
}

const sfx = {
  click: () => playTone(520, 0.08, 'triangle', 0.06),
  pluck: (n = 0) => {
    playTone(440 + n * 70, 0.14, 'triangle', 0.09);
    playTone(660 + n * 80, 0.16, 'sine', 0.06, 0.05);
  },
  rub: () => playTone(320 + Math.random() * 140, 0.05, 'sine', 0.03),
  clear: () => {
    playTone(523.25, 0.16, 'triangle', 0.08, 0);
    playTone(659.25, 0.16, 'triangle', 0.08, 0.09);
    playTone(783.99, 0.28, 'triangle', 0.09, 0.18);
  },
  fanfare: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(f, 0.3, 'triangle', 0.08, i * 0.09));
  },
};

/* ==================== 轻提示与粒子 ==================== */
let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2100);
}

function sparkle(parent, x, y, count = 8) {
  for (let i = 0; i < count; i++) {
    const s = document.createElement('i');
    s.className = 'spark';
    s.textContent = ['✦', '·', '✧'][i % 3];
    const angle = (Math.PI * 2 * i) / count;
    const dist = 34 + Math.random() * 24;
    s.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist - 18}px;--delay:${i * 0.025}s`;
    parent.append(s);
    setTimeout(() => s.remove(), 950);
  }
}

/* ==================== 素材加载与全局状态 ==================== */
const FLOWER_NAMES = ['金乡好蒜', '紫瓣蒜苞', '绒线蒜花', '毛线蒜薹', '丰收蒜辫', '青绿蒜叶'];
const PALETTES = {
  paper: ['#d4c0df', '#e6d6ad', '#c0cba8', '#efd1cf'],
  ribbon: ['#6c477e', '#a1b76b', '#c47f88', '#eee3be'],
  bg: ['#eae2ee', '#e9eddd', '#f2e8d7', '#e5e9eb'],
};
const QUOTES = [
  '这一束，装着金乡的好蒜与好事。',
  '好蒜成双，愿好事也成双。',
  '把金乡的丰收，送给喜欢的你。',
];

function resolveAsset(src) {
  return (window.ASSET_DATA && window.ASSET_DATA[src]) || src;
}

const flowerImgs = FLOWER_NAMES.map((_, i) => {
  const im = new Image();
  im.src = resolveAsset(`assets/flower-${i}.png`);
  return im;
});
const festivalLogo = new Image();
festivalLogo.src = resolveAsset('assets/festival-logo.png');
const fieldArt = new Image();
fieldArt.src = resolveAsset('assets/garlic-fields.png');
const landmarkImages = ['assets/landmark-0.png', 'assets/landmark-3.png', 'assets/garlic-fields.png'].map((src) => {
  const im = new Image();
  im.src = resolveAsset(src);
  return im;
});

const paperTexture = document.createElement('canvas');
paperTexture.width = 140;
paperTexture.height = 140;
{
  const tx = paperTexture.getContext('2d');
  let seed = 93;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 2000; i++) {
    tx.fillStyle = i % 2 ? 'rgba(255,255,255,.3)' : 'rgba(67,40,77,.05)';
    tx.fillRect(rnd() * 140, rnd() * 140, rnd() * 1.5 + 0.3, rnd() * 2 + 0.2);
  }
}

let assetsReady = false;
let currentStep = 1;

function createInitialState() {
  return {
    flowers: [],
    customYarn: null,
    customYarnColor: '#a6bc68',
    paper: PALETTES.paper[0],
    ribbon: PALETTES.ribbon[0],
    bg: PALETTES.bg[0],
    pattern: true,
    landmark: 0,
    recipient: '正在发芽的自己',
    message: QUOTES[0],
    sender: '',
  };
}

let state = createInitialState();

const STEP_HINTS = {
  1: '第 1 步：按住蒜薹向上提（或轻点），连抽 3 把青绿',
  2: '第 2 步：先左右晃动松土，再向上拔出金乡好蒜',
  3: '第 3 步：按住蒜头来回轻轻搓揉，剥开外层蒜皮',
  4: '第 4 步：在画布上按住拖动，亲手绕一枝毛线蒜薹',
  5: '第 5 步：点下方加花材或套用包装示例，拖动摆好花束',
  6: '第 6 步：挑选喜欢的包装纸、丝带与金乡礼签贺卡',
  7: '第 7 步：写下送给谁、祝福语和你的落款',
  8: '第 8 步：左右折起包装纸，再拉起丝带系成蝴蝶结',
  9: '大功告成！你的专属金乡丰收蒜礼海报已生成',
};

function goToStep(step) {
  currentStep = step;
  $('#stepHintText').textContent = STEP_HINTS[step] || '';

  $$('#stepperList li').forEach((li) => {
    const s = Number(li.dataset.step);
    li.classList.toggle('active', s === step);
    li.classList.toggle('done', s < step);
    li.querySelector('span').textContent = s < step ? '✓' : String(s);
  });

  $$('.scene').forEach((sec) => sec.classList.remove('active'));

  if (step >= 1 && step <= 3) {
    $('#scene-harvest').classList.add('active');
    setupHarvest(step - 1);
  } else if (step === 4) {
    $('#scene-4').classList.add('active');
    setupCraftScene();
  } else if (step === 5) {
    $('#scene-5').classList.add('active');
    setupArrangeScene();
  } else if (step === 6) {
    $('#scene-6').classList.add('active');
    setupWrapScene();
  } else if (step === 7) {
    $('#scene-7').classList.add('active');
    setupNoteScene();
  } else if (step === 8) {
    $('#scene-8').classList.add('active');
    setupRitualScene();
  } else if (step === 9) {
    $('#scene-9').classList.add('active');
    setupResultScene();
  }
}

/* ==================== 关卡 1~3：蒜田采收 ==================== */
const HARVEST_CONFIG = [
  {
    title: '薅一把青绿蒜薹',
    farmerImg: 'assets/farmer-1.svg',
    farmerCaption: '薹长好了',
    materialIdx: 3,
    gesture: '按住向上提 ↑',
    initFeedback: '捏住蒜薹向上提（或轻点）收满 3 把',
    clearBanner: '✦ 收齐 3 把青绿蒜薹！已放进手作篮。',
    nextBtnText: '去拔好蒜 ▸',
    lockedBtnText: '🔒 需 3 把',
  },
  {
    title: '拔一头金乡好蒜',
    farmerImg: 'assets/farmer-2.svg',
    farmerCaption: '好蒜出土',
    materialIdx: 0,
    gesture: '先左右晃一晃 ↔',
    initFeedback: '左右晃动 2 次松开蒜根，再向上拔起',
    clearBanner: '✦ 好蒜出土！这一头丰收是你亲手拔起的。',
    nextBtnText: '去扒蒜皮 ▸',
    lockedBtnText: '🔒 待拔出',
  },
  {
    title: '亲手扒开蒜皮',
    farmerImg: 'assets/farmer-4.svg',
    farmerCaption: '来扒蒜皮',
    materialIdx: 0,
    gesture: '按住来回搓一搓 ✦',
    initFeedback: '手指按住蒜头来回轻搓，剥开蒜皮',
    clearBanner: '✦ 蒜皮剥好啦！田间采收全部完成！',
    nextBtnText: '去绕毛线 ▸',
    lockedBtnText: '🔒 待剥皮',
  },
];

let hStep = 0;
let hProgress = 0;
let hDone = false;
let scapeCount = 0;
let wiggles = 0;
let lastSide = 0;
let hStart = null;
let hLastRub = null;
let hRubSfxTick = 0;

const harvestAction = $('#harvestAction');
const harvestNextBtn = $('#harvestNextBtn');

function updateHarvestMeter(v, labelText) {
  hProgress = Math.max(0, Math.min(1, v));
  $('#harvestMeter').style.width = `${Math.round(hProgress * 100)}%`;
  if (labelText !== undefined) $('#harvestProgressVal').textContent = labelText;
}

function setupHarvest(stepIdx) {
  hStep = stepIdx;
  const cfg = HARVEST_CONFIG[hStep];
  hDone = false;
  scapeCount = 0;
  wiggles = 0;
  lastSide = 0;
  hStart = null;
  hLastRub = null;

  $('#harvestTitle').textContent = cfg.title;
  $('#farmerArt').src = cfg.farmerImg;
  $('#farmerCaption').textContent = cfg.farmerCaption;
  $('#harvestMaterial').src = resolveAsset(`assets/flower-${cfg.materialIdx}.png`);
  $('#gestureHint').textContent = cfg.gesture;
  $('#harvestFeedback').textContent = cfg.initFeedback;
  $('#harvestClearBanner').hidden = true;
  $('#harvestStage').dataset.step = String(hStep);

  harvestAction.className = `harvest-action stage-${hStep}`;
  harvestAction.style.transform = '';
  $('#peelPatches').hidden = hStep !== 2;
  $$('#peelPatches span').forEach((s) => (s.style.opacity = '1'));

  updateHarvestMeter(0, hStep === 0 ? '0 / 3 把' : '0%');
  harvestNextBtn.disabled = true;
  harvestNextBtn.classList.remove('pulse');
  harvestNextBtn.textContent = cfg.lockedBtnText;
}

function completeHarvestStep() {
  if (hDone) return;
  hDone = true;
  const cfg = HARVEST_CONFIG[hStep];
  updateHarvestMeter(1, hStep === 0 ? '3 / 3 把' : '100%');
  harvestAction.classList.add('harvested');
  harvestAction.style.transform = 'translate(-50%, -66%)';
  $('#harvestClearBanner').textContent = cfg.clearBanner;
  $('#harvestClearBanner').hidden = false;
  $('#harvestFeedback').textContent = '已完成！点右侧按钮进入下一关';
  harvestNextBtn.disabled = false;
  harvestNextBtn.classList.add('pulse');
  harvestNextBtn.textContent = cfg.nextBtnText;

  const r = $('#harvestStage').getBoundingClientRect();
  sparkle($('#harvestStage'), r.width / 2, r.height / 2 - 20, 12);
  sfx.clear();
}

function doRubPeel(dist) {
  const nextVal = hProgress + dist / 420;
  updateHarvestMeter(nextVal, `${Math.min(100, Math.round(nextVal * 100))}%`);
  $$('#peelPatches span').forEach((s, i) => {
    s.style.opacity = String(Math.max(0, 1 - hProgress * (1.55 - i * 0.2)));
  });
  hRubSfxTick += dist;
  if (hRubSfxTick > 45) {
    hRubSfxTick = 0;
    sfx.rub();
  }
  $('#harvestFeedback').textContent = hProgress < 0.5 ? '蒜皮正在松开，继续来回轻搓…' : '快剥开了，洁白蒜瓣露出来了！';
  if (hProgress >= 1) completeHarvestStep();
}

harvestAction.ondragstart = (e) => e.preventDefault();

harvestAction.onpointerdown = (e) => {
  if (hDone) return;
  hStart = { x: e.clientX, y: e.clientY };
  hLastRub = { x: e.clientX, y: e.clientY };
  harvestAction.setPointerCapture(e.pointerId);
};

harvestAction.onpointermove = (e) => {
  if (!hStart || hDone) return;
  const dx = e.clientX - hStart.x;
  const dy = e.clientY - hStart.y;

  if (hStep === 0) {
    const pullY = Math.max(-85, Math.min(0, dy));
    harvestAction.style.transform = `translate(-50%, calc(-52% + ${pullY}px))`;
  } else if (hStep === 1) {
    const side = dx > 14 ? 1 : dx < -14 ? -1 : 0;
    if (side && side !== lastSide) {
      wiggles++;
      lastSide = side;
      sfx.pluck(wiggles);
      const pct = Math.min(0.6, wiggles * 0.3);
      updateHarvestMeter(pct, `${Math.round(pct * 100)}%`);
      if (wiggles >= 2) {
        $('#gestureHint').textContent = '松开了！向上用力拔 ↑';
        $('#harvestFeedback').textContent = '蒜根松了！保持握住向上拔起！';
      } else {
        $('#harvestFeedback').textContent = '很好，再往另一边晃一下松松土';
      }
    }
    const moveX = Math.max(-28, Math.min(28, dx));
    const moveY = wiggles >= 2 ? Math.max(-85, Math.min(0, dy)) : 0;
    harvestAction.style.transform = `translate(calc(-50% + ${moveX}px), calc(-52% + ${moveY}px)) rotate(${dx / 7}deg)`;
    if (wiggles >= 2 && dy < -52) completeHarvestStep();
  } else if (hStep === 2) {
    const dist = Math.hypot(e.clientX - hLastRub.x, e.clientY - hLastRub.y);
    hLastRub = { x: e.clientX, y: e.clientY };
    if (dist > 2) doRubPeel(dist);
  }
};

harvestAction.onpointerup = (e) => {
  if (!hStart || hDone) return;
  const dx = e.clientX - hStart.x;
  const dy = e.clientY - hStart.y;
  const moved = Math.hypot(dx, dy);

  if (hStep === 0) {
    if (dy < -36 || moved < 10) {
      scapeCount++;
      sfx.pluck(scapeCount);
      updateHarvestMeter(scapeCount / 3, `${scapeCount} / 3 把`);
      const r = $('#harvestStage').getBoundingClientRect();
      sparkle($('#harvestStage'), r.width / 2, r.height / 2 - 30, 7);
      if (scapeCount >= 3) completeHarvestStep();
      else $('#harvestFeedback').textContent = `抽到第 ${scapeCount} 把蒜薹，再抽 ${3 - scapeCount} 把！`;
    } else {
      toast('顺着蒜薹向上提一点，或轻点即可');
    }
  } else if (hStep === 1 && moved < 10) {
    wiggles++;
    sfx.pluck(wiggles);
    if (wiggles < 3) {
      updateHarvestMeter(wiggles * 0.3, `${wiggles * 30}%`);
      $('#harvestFeedback').textContent = wiggles === 1 ? '土松了一点，再晃一晃！' : '蒜根松了！往上拔或再点一次拔出！';
    } else {
      completeHarvestStep();
    }
  } else if (hStep === 2 && moved < 10) {
    doRubPeel(115);
  }

  hStart = null;
  hLastRub = null;
  if (!hDone) harvestAction.style.transform = '';
};

harvestAction.onpointercancel = () => {
  hStart = null;
  hLastRub = null;
  if (!hDone) harvestAction.style.transform = '';
};

harvestNextBtn.onclick = () => {
  if (harvestNextBtn.disabled) return;
  sfx.click();
  goToStep(currentStep + 1);
};

/* ==================== 关卡 4：绕毛线蒜薹（竖屏方画布） ==================== */
const craftCanvas = $('#craftCanvas');
const cx = craftCanvas.getContext('2d');
const CRAFT_W = 340;
const CRAFT_H = 340;
const CRAFT_COLORS = ['#a6bc68', '#8ba96a', '#c6d689', '#7d9a45'];
const MIN_YARN_LEN = 120;

let craftYarn = [];
let craftHistory = [];
let craftDrawing = false;
let craftColor = CRAFT_COLORS[0];

function initCraftPalette() {
  const wrap = $('#craftColors');
  wrap.replaceChildren();
  CRAFT_COLORS.forEach((col, i) => {
    const b = document.createElement('button');
    b.style.background = col;
    b.className = i === 0 ? 'active' : '';
    b.setAttribute('aria-label', `毛线颜色${i + 1}`);
    b.onclick = () => {
      sfx.click();
      craftColor = col;
      $$('#craftColors button').forEach((v) => v.classList.toggle('active', v === b));
      renderCraft();
    };
    wrap.append(b);
  });
}

function yarnLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

function setupCraftScene() {
  craftYarn = state.customYarn ? structuredClone(state.customYarn) : [];
  craftColor = state.customYarnColor || CRAFT_COLORS[0];
  craftHistory = [];
  initCraftPalette();
  renderCraft();
}

function renderCraft() {
  cx.save();
  cx.setTransform(craftCanvas.width / CRAFT_W, 0, 0, craftCanvas.height / CRAFT_H, 0, 0);
  cx.clearRect(0, 0, CRAFT_W, CRAFT_H);

  cx.fillStyle = '#e7d9ec';
  cx.fillRect(0, 0, CRAFT_W, CRAFT_H);
  cx.save();
  cx.globalAlpha = 0.28;
  cx.fillStyle = cx.createPattern(paperTexture, 'repeat');
  cx.fillRect(0, 0, CRAFT_W, CRAFT_H);
  cx.restore();

  cx.fillStyle = '#8b6d9c';
  cx.font = '8px Georgia';
  cx.textAlign = 'center';
  cx.fillText('JINXIANG · HAND-WOUND GARLIC SCAPE', CRAFT_W / 2, 20);

  const len = yarnLength(craftYarn);
  const radius = Math.max(15, 29 - len / 32);

  cx.save();
  cx.translate(70, 272);
  const ball = cx.createRadialGradient(-8, -10, 2, 0, 0, radius);
  ball.addColorStop(0, '#e3ecae');
  ball.addColorStop(0.55, craftColor);
  ball.addColorStop(1, '#687d3c');
  cx.fillStyle = ball;
  cx.shadowColor = '#64754055';
  cx.shadowBlur = 7;
  cx.shadowOffsetY = 4;
  cx.beginPath();
  cx.arc(0, 0, radius, 0, Math.PI * 2);
  cx.fill();
  cx.shadowColor = 'transparent';
  cx.beginPath();
  cx.arc(0, 0, radius, 0, Math.PI * 2);
  cx.clip();
  for (let i = -28; i < 36; i += 3.5) {
    cx.strokeStyle = i % 2 ? '#e4ecb899' : '#65853c80';
    cx.lineWidth = 1.1;
    cx.beginPath();
    cx.ellipse(i * 0.4, 0, radius * 0.7, radius * 1.2, 0.6, 0, Math.PI * 2);
    cx.stroke();
  }
  cx.restore();

  cx.save();
  cx.strokeStyle = craftColor;
  cx.lineWidth = 2;
  cx.beginPath();
  cx.moveTo(95, 278);
  cx.quadraticCurveTo(116, 296, 146, 288);
  cx.stroke();

  cx.strokeStyle = '#7f915566';
  cx.lineWidth = 1.4;
  cx.setLineDash([4, 4]);
  cx.beginPath();
  cx.moveTo(146, 288);
  cx.bezierCurveTo(145, 205, 148, 120, 198, 92);
  cx.bezierCurveTo(260, 56, 288, 142, 228, 168);
  cx.stroke();
  cx.setLineDash([]);
  cx.fillStyle = '#8b9968';
  cx.font = '10px "PingFang SC", sans-serif';
  cx.fillText('按住画布，顺着虚线绕出你的蒜薹', 175, 322);
  cx.restore();

  if (craftYarn.length > 1) {
    cx.save();
    cx.lineCap = 'round';
    cx.lineJoin = 'round';
    cx.beginPath();
    craftYarn.forEach((p, i) => (i ? cx.lineTo(p.x, p.y) : cx.moveTo(p.x, p.y)));
    cx.shadowColor = '#53632a40';
    cx.shadowBlur = 5;
    cx.shadowOffsetY = 3;
    cx.strokeStyle = '#657a3c';
    cx.lineWidth = 10;
    cx.stroke();
    cx.shadowColor = 'transparent';
    cx.strokeStyle = craftColor;
    cx.lineWidth = 7.5;
    cx.stroke();
    cx.strokeStyle = '#e6edbfa0';
    cx.setLineDash([1.5, 3]);
    cx.lineWidth = 1;
    cx.stroke();
    cx.setLineDash([]);

    const tip = craftYarn[craftYarn.length - 1];
    const prev = craftYarn[Math.max(0, craftYarn.length - 4)];
    cx.translate(tip.x, tip.y);
    cx.rotate(Math.atan2(tip.y - prev.y, tip.x - prev.x) + Math.PI / 2);
    cx.fillStyle = '#d9e4b0';
    cx.beginPath();
    cx.moveTo(0, -18);
    cx.bezierCurveTo(14, 3, 7, 12, 0, 13);
    cx.bezierCurveTo(-7, 12, -14, 3, 0, -18);
    cx.fill();
    cx.restore();
  }

  cx.restore();

  const pct = Math.min(1, len / MIN_YARN_LEN);
  $('#craftMeter').style.width = `${Math.round(pct * 100)}%`;
  $('#undoCraft').disabled = !craftHistory.length;

  const done = len >= MIN_YARN_LEN;
  $('#craftProgressVal').textContent = done ? '完成 ✓' : `${Math.round(pct * 100)}%`;

  const nextBtn = $('#craftNextBtn');
  const wasDisabled = nextBtn.disabled;
  nextBtn.disabled = !done;
  nextBtn.classList.toggle('pulse', done);
  nextBtn.textContent = done ? '去扎花束 ▸' : '🔒 绕好解锁';
  if (done && wasDisabled) sfx.clear();
}

function getCraftPoint(e) {
  const r = craftCanvas.getBoundingClientRect();
  return {
    x: Math.max(16, Math.min(CRAFT_W - 16, ((e.clientX - r.left) * CRAFT_W) / r.width)),
    y: Math.max(22, Math.min(CRAFT_H - 18, ((e.clientY - r.top) * CRAFT_H) / r.height)),
  };
}

function moveNeedle(e) {
  const r = $('.craft-frame').getBoundingClientRect();
  $('#craftNeedle').style.left = `${e.clientX - r.left}px`;
  $('#craftNeedle').style.top = `${e.clientY - r.top}px`;
}

craftCanvas.onpointerdown = (e) => {
  craftHistory.push(structuredClone(craftYarn));
  if (craftHistory.length > 15) craftHistory.shift();
  craftDrawing = true;
  craftCanvas.setPointerCapture(e.pointerId);
  craftYarn = [getCraftPoint(e)];
  $('#craftNeedle').hidden = false;
  moveNeedle(e);
  renderCraft();
};

craftCanvas.onpointermove = (e) => {
  if (!craftDrawing) return;
  const p = getCraftPoint(e);
  const prev = craftYarn[craftYarn.length - 1];
  if (Math.hypot(p.x - prev.x, p.y - prev.y) > 2) craftYarn.push(p);
  moveNeedle(e);
  renderCraft();
};

function stopCraftDraw() {
  if (!craftDrawing) return;
  craftDrawing = false;
  $('#craftNeedle').hidden = true;
  renderCraft();
}
craftCanvas.onpointerup = stopCraftDraw;
craftCanvas.onpointercancel = stopCraftDraw;

$('#undoCraft').onclick = () => {
  if (!craftHistory.length) return;
  sfx.click();
  craftYarn = craftHistory.pop();
  renderCraft();
};

$('#clearCraft').onclick = () => {
  sfx.click();
  craftHistory.push(structuredClone(craftYarn));
  craftYarn = [];
  renderCraft();
};

$('#craftNextBtn').onclick = () => {
  if ($('#craftNextBtn').disabled) return;
  sfx.click();
  state.customYarn = structuredClone(craftYarn);
  state.customYarnColor = craftColor;
  goToStep(5);
};

/* ==================== 花束画布渲染引擎（关卡 5~9 共用） ==================== */
const BW = 600;
const BH = 800;

function drawPath(c, fn, fill, stroke) {
  c.beginPath();
  fn(c);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}

function wrapText(c, text, x, y, max, lineH, maxLines = 3) {
  const lines = [''];
  for (const ch of text) {
    const n = lines.length - 1;
    if (c.measureText(lines[n] + ch).width > max && lines[n]) {
      if (lines.length >= maxLines) {
        lines[n] = lines[n].slice(0, -1) + '…';
        break;
      }
      lines.push(ch);
    } else {
      lines[n] += ch;
    }
  }
  lines.forEach((l, i) => c.fillText(l, x, y + i * lineH));
}

function flowerBox(f) {
  const w = 290 * f.s;
  return { w, h: w, x: -w / 2, y: -w / 2 };
}

function drawCustomYarnStem(c, f) {
  const pts = f.yarn;
  if (!pts || pts.length < 2) return;
  const sz = 285 * f.s;
  c.save();
  c.translate(-sz / 2, -sz / 2);
  c.scale(sz / CRAFT_W, sz / CRAFT_H);
  const p = new Path2D();
  pts.forEach((v, i) => (i ? p.lineTo(v.x, v.y) : p.moveTo(v.x, v.y)));
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.shadowColor = '#3f4e2444';
  c.shadowBlur = 5;
  c.shadowOffsetY = 3;
  c.strokeStyle = '#627a38';
  c.lineWidth = 11;
  c.stroke(p);
  c.shadowColor = 'transparent';
  c.strokeStyle = f.yarnColor || '#a9bf66';
  c.lineWidth = 8;
  c.stroke(p);
  c.strokeStyle = '#dfebb28c';
  c.lineWidth = 1.1;
  c.setLineDash([1.5, 3.5]);
  c.stroke(p);
  c.setLineDash([]);

  const tip = pts[pts.length - 1];
  const prev = pts[Math.max(0, pts.length - 4)];
  c.translate(tip.x, tip.y);
  c.rotate(Math.atan2(tip.y - prev.y, tip.x - prev.x) + Math.PI / 2);
  drawPath(
    c,
    (ctx2) => {
      ctx2.moveTo(0, -20);
      ctx2.bezierCurveTo(16, 4, 8, 13, 0, 14);
      ctx2.bezierCurveTo(-8, 13, -16, 4, 0, -20);
    },
    '#d4dfad'
  );
  c.restore();
}

function drawFlowerStem(c, f) {
  c.save();
  c.translate(f.x, f.y);
  c.rotate((f.r * Math.PI) / 180);
  if (f.yarn?.length) {
    drawCustomYarnStem(c, f);
    c.restore();
    return;
  }
  const b = flowerBox(f);
  c.shadowColor = '#4b354528';
  c.shadowBlur = 9;
  c.shadowOffsetY = 5;
  const img = flowerImgs[f.t];
  if (img && img.complete) c.drawImage(img, b.x, b.y, b.w, b.h);
  c.restore();
}

function drawPaper(c, front = false) {
  c.save();
  c.shadowColor = '#50385e25';
  c.shadowBlur = 12;
  c.shadowOffsetY = 6;
  if (!front) {
    drawPath(
      c,
      (p) => {
        p.moveTo(134, 437);
        p.bezierCurveTo(180, 430, 222, 439, 290, 481);
        p.lineTo(405, 427);
        p.lineTo(459, 463);
        p.lineTo(354, 665);
        p.lineTo(274, 701);
        p.lineTo(224, 641);
        p.closePath();
      },
      state.paper
    );
    drawPath(
      c,
      (p) => {
        p.moveTo(138, 448);
        p.lineTo(202, 433);
        p.lineTo(329, 608);
        p.lineTo(261, 673);
        p.closePath();
      },
      '#fffdf7b8'
    );
  } else {
    drawPath(
      c,
      (p) => {
        p.moveTo(151, 485);
        p.bezierCurveTo(210, 496, 255, 538, 303, 570);
        p.bezierCurveTo(350, 524, 396, 496, 446, 484);
        p.lineTo(355, 678);
        p.bezierCurveTo(327, 688, 302, 704, 276, 710);
        p.lineTo(232, 644);
        p.closePath();
      },
      state.paper
    );
    c.shadowColor = 'transparent';
    drawPath(
      c,
      (p) => {
        p.moveTo(151, 485);
        p.bezierCurveTo(204, 512, 247, 560, 303, 595);
        p.lineTo(276, 710);
        p.lineTo(232, 644);
        p.closePath();
      },
      '#ffffff25'
    );
    drawPath(
      c,
      (p) => {
        p.moveTo(446, 484);
        p.bezierCurveTo(405, 535, 367, 602, 355, 678);
        p.lineTo(326, 688);
        p.lineTo(303, 595);
        p.closePath();
      },
      '#4a245016'
    );
    if (state.pattern) {
      c.save();
      drawPath(c, (p) => {
        p.moveTo(151, 485);
        p.lineTo(303, 570);
        p.lineTo(446, 484);
        p.lineTo(355, 678);
        p.lineTo(276, 710);
        p.lineTo(232, 644);
        p.closePath();
      });
      c.clip();
      c.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        drawPath(
          c,
          (p) => {
            p.moveTo(125, 547 + i * 17);
            p.bezierCurveTo(225, 499 + i * 17, 299, 615 + i * 17, 410, 548 + i * 17);
          },
          null,
          '#fffdf768'
        );
      }
      c.restore();
    }
    drawPath(
      c,
      (p) => {
        p.moveTo(303, 570);
        p.lineTo(276, 710);
      },
      null,
      '#fffdf76b'
    );
  }
  c.restore();
}

function drawRibbon(c) {
  c.save();
  c.translate(303, 616);
  c.rotate(-0.1);
  c.shadowColor = '#39224335';
  c.shadowBlur = 5;
  c.shadowOffsetY = 3;
  drawPath(
    c,
    (p) => {
      p.moveTo(-30, 0);
      p.lineTo(-55, 77);
      p.lineTo(-30, 65);
      p.lineTo(-17, 82);
      p.lineTo(8, 5);
      p.closePath();
    },
    state.ribbon
  );
  drawPath(
    c,
    (p) => {
      p.moveTo(5, 0);
      p.lineTo(29, 70);
      p.lineTo(40, 53);
      p.lineTo(61, 61);
      p.lineTo(28, -4);
      p.closePath();
    },
    state.ribbon
  );
  drawPath(
    c,
    (p) => {
      p.moveTo(0, 0);
      p.bezierCurveTo(-105, -79, -103, 24, -4, 12);
      p.bezierCurveTo(95, 38, 113, -63, 0, 0);
    },
    state.ribbon
  );
  c.shadowColor = 'transparent';
  drawPath(c, (p) => p.roundRect(-12, -7, 27, 24, 7), state.ribbon);
  c.restore();
}

function drawGiftTag(c) {
  const tag = state.landmark || 0;
  c.save();
  c.translate(368, 642);
  c.rotate(0.12);
  c.shadowColor = '#46206022';
  c.shadowBlur = 5;
  drawPath(c, (p) => p.roundRect(-29, -14, 63, 87, 4), '#fffaf0');
  c.shadowColor = 'transparent';
  c.strokeStyle = '#998462';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-20, -13);
  c.quadraticCurveTo(-25, -46, -62, -26);
  c.stroke();
  const im = landmarkImages[tag];
  if (im && im.complete && im.naturalHeight) {
    const h = tag === 1 ? 44 : 34;
    const w = (h * im.naturalWidth) / im.naturalHeight;
    c.drawImage(im, -w / 2 + 3, 1, w, h);
  }
  c.fillStyle = '#684483';
  c.textAlign = 'center';
  c.font = '7px "PingFang SC", sans-serif';
  c.fillText(['蒜都相聚', '古塔寄福', '蒜田丰收'][tag], 3, 56);
  c.font = '5px Georgia';
  c.fillText('JINXIANG', 3, 65);
  c.restore();
}

function renderBouquetToCanvas(targetCanvas, showSelection = false) {
  if (!assetsReady) return;
  const c = targetCanvas.getContext('2d');
  c.save();
  c.setTransform(targetCanvas.width / BW, 0, 0, targetCanvas.height / BH, 0, 0);
  c.clearRect(0, 0, BW, BH);

  c.fillStyle = state.bg;
  c.fillRect(0, 0, BW, BH);
  const grad = c.createRadialGradient(310, 325, 0, 310, 325, 400);
  grad.addColorStop(0, '#ffffff88');
  grad.addColorStop(1, '#ffffff00');
  c.fillStyle = grad;
  c.fillRect(0, 0, BW, BH);

  c.save();
  c.fillStyle = '#b58bce22';
  c.beginPath();
  c.ellipse(570, 355, 220, 340, 0.35, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#b8cc7c33';
  c.beginPath();
  c.ellipse(56, 695, 275, 150, -0.3, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 0.2;
  if (fieldArt.complete) c.drawImage(fieldArt, 375, 607, 210, 213);
  c.restore();

  if (festivalLogo.complete) c.drawImage(festivalLogo, 30, 24, 142, 36);
  c.textAlign = 'right';
  c.fillStyle = '#79618b';
  c.font = '9px Georgia';
  c.fillText('GARLIC BLOOM / HANDMADE WITH LOVE', 568, 45);
  c.textAlign = 'center';
  c.fillStyle = '#5c416b';
  c.font = '600 30px "Noto Serif SC", "Songti SC", serif';
  c.fillText('把金乡丰收，扎成一束。', 300, 102);
  c.fillStyle = '#89758f';
  c.font = '12px "PingFang SC", sans-serif';
  c.fillText('送给 ' + (state.recipient || '正在发芽的你'), 300, 134);
  c.font = '14px "PingFang SC", sans-serif';
  wrapText(c, state.message, 300, 166, 430, 22, 3);

  drawPaper(c, false);
  state.flowers.forEach((f) => drawFlowerStem(c, f));
  drawPaper(c, true);
  drawRibbon(c);
  drawGiftTag(c);

  c.save();
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = c.createPattern(paperTexture, 'repeat');
  c.fillRect(0, 0, BW, BH);
  c.restore();

  c.fillStyle = '#70567c';
  c.font = '10px "PingFang SC", sans-serif';
  c.textAlign = 'right';
  if (state.sender) c.fillText('来自 ' + state.sender + ' 的心意', 527, 736);
  c.textAlign = 'center';
  c.fillStyle = '#8d7b94';
  c.font = '9px "PingFang SC", sans-serif';
  c.fillText('金乡大蒜节  /  一瓣金乡蒜，一份丰收礼', 300, 769);
  c.font = '8px "PingFang SC", sans-serif';
  c.fillText('我的节庆手作旅程：薅蒜薹 · 拔好蒜 · 扒蒜皮 · 绕毛线 · 亲手包扎', 300, 786);

  if (showSelection && selectedStem >= 0 && state.flowers[selectedStem]) {
    const f = state.flowers[selectedStem];
    const b = flowerBox(f);
    c.save();
    c.translate(f.x, f.y);
    c.rotate((f.r * Math.PI) / 180);
    c.strokeStyle = '#786087b8';
    c.lineWidth = 1.5;
    c.setLineDash([5, 5]);
    c.strokeRect(b.x + 14, b.y + 8, b.w - 28, b.h - 16);
    c.restore();
  }

  c.restore();
}

/* ==================== 关卡 5~7：扎花束 / 选包装 / 写心意 ==================== */
const bouquetCanvas = $('#bouquetCanvas');
let selectedStem = -1;
let arrangeHistory = [];
let stemDrag = null;
let arrangeUIInited = false;

const BOUQUET_PRESETS = [
  {
    name: '蒜乡福',
    paper: PALETTES.paper[0],
    ribbon: PALETTES.ribbon[0],
    bg: PALETTES.bg[0],
    landmark: 0,
    flowers: [
      { t: 5, x: 224, y: 458, s: 1.16, r: -34 },
      { t: 5, x: 374, y: 462, s: 1.12, r: 35 },
      { t: 2, x: 320, y: 406, s: 1.08, r: 12 },
      { t: 1, x: 236, y: 448, s: 0.96, r: -22 },
      { t: 1, x: 364, y: 468, s: 0.9, r: 26 },
      { t: 0, x: 294, y: 492, s: 1.12, r: -5 },
    ],
  },
  {
    name: '好蒜成双',
    paper: PALETTES.paper[1],
    ribbon: PALETTES.ribbon[1],
    bg: PALETTES.bg[1],
    landmark: 1,
    flowers: [
      { t: 5, x: 218, y: 460, s: 1.16, r: -36 },
      { t: 5, x: 380, y: 465, s: 1.12, r: 36 },
      { t: 3, x: 256, y: 418, s: 1.08, r: -16 },
      { t: 2, x: 340, y: 424, s: 1.02, r: 18 },
      { t: 0, x: 266, y: 495, s: 1.08, r: -12 },
      { t: 0, x: 334, y: 504, s: 0.96, r: 13 },
    ],
  },
  {
    name: '满满丰收',
    paper: PALETTES.paper[2],
    ribbon: PALETTES.ribbon[2],
    bg: PALETTES.bg[2],
    landmark: 2,
    flowers: [
      { t: 5, x: 220, y: 458, s: 1.14, r: -35 },
      { t: 3, x: 362, y: 432, s: 1.08, r: 24 },
      { t: 1, x: 288, y: 412, s: 1.15, r: -6 },
      { t: 1, x: 234, y: 486, s: 0.92, r: -26 },
      { t: 0, x: 312, y: 498, s: 1.1, r: 8 },
      { t: 1, x: 368, y: 494, s: 0.88, r: 32 },
    ],
  },
  {
    name: '蒜香花漾',
    paper: PALETTES.paper[3],
    ribbon: PALETTES.ribbon[0],
    bg: PALETTES.bg[3],
    landmark: 0,
    flowers: [
      { t: 5, x: 224, y: 462, s: 1.14, r: -32 },
      { t: 4, x: 374, y: 456, s: 1.04, r: 22 },
      { t: 2, x: 294, y: 404, s: 1.15, r: 4 },
      { t: 2, x: 236, y: 444, s: 0.96, r: -22 },
      { t: 3, x: 348, y: 416, s: 1.02, r: 20 },
      { t: 0, x: 302, y: 496, s: 1.12, r: -4 },
    ],
  },
];

function switchArrangePane(name) {
  $$('#arrangeDockTabs button').forEach((b) => b.classList.toggle('active', b.dataset.pane === name));
  $$('#scene-5 .dock-pane').forEach((p) => (p.hidden = p.id !== `pane-${name}`));
}

function pushArrangeHistory() {
  arrangeHistory.push(JSON.stringify(state));
  if (arrangeHistory.length > 25) arrangeHistory.shift();
  $('#undoArrangeBtn').disabled = false;
}

function initArrangeControls() {
  if (arrangeUIInited) return;
  arrangeUIInited = true;

  $$('#arrangeDockTabs button').forEach((btn) => {
    btn.onclick = () => {
      sfx.click();
      switchArrangePane(btn.dataset.pane);
    };
  });

  // 蒜材横滑栏
  const grid = $('#assetGrid');
  FLOWER_NAMES.forEach((name, i) => {
    const btn = document.createElement('button');
    btn.className = 'asset-card';
    btn.innerHTML = `<img src="${resolveAsset(`assets/flower-${i}.png`)}" alt=""><span>${name}</span><i>+</i>`;
    btn.onclick = () => {
      if (state.flowers.length >= 18) return toast('花束已经很丰盛啦，拖动微调位置吧');
      pushArrangeHistory();
      state.flowers.push({
        t: i,
        x: 245 + Math.random() * 110,
        y: 410 + Math.random() * 80,
        s: 0.98,
        r: Math.round(Math.random() * 34 - 17),
      });
      selectedStem = state.flowers.length - 1;
      sfx.pluck(1);
      refreshArrange();
    };
    grid.append(btn);
  });

  // 关卡 6：包装颜色与金乡礼签
  Object.entries(PALETTES).forEach(([key, colors]) => {
    const targetId = key === 'paper' ? '#paperColors' : key === 'ribbon' ? '#ribbonColors' : '#bgColors';
    colors.forEach((color) => {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.style.setProperty('--color', color);
      b.dataset.color = color;
      b.onclick = () => {
        sfx.click();
        state[key] = color;
        syncArrangeSwatches();
        renderBouquetToCanvas($('#wrapPreviewCanvas'), false);
      };
      $(targetId).append(b);
    });
  });

  ['蒜都相聚', '古塔寄福', '蒜田丰收'].forEach((name, i) => {
    const b = document.createElement('button');
    b.className = 'landmark-btn';
    b.innerHTML = `<img src="${landmarkImages[i].src}" alt=""><span>${name}</span>`;
    b.onclick = () => {
      sfx.click();
      state.landmark = i;
      syncArrangeSwatches();
      renderBouquetToCanvas($('#wrapPreviewCanvas'), false);
      toast(`已挂上「${name}」金乡礼签`);
    };
    $('#landmarkChoices').append(b);
  });

  $('#patternToggle').onchange = (e) => {
    sfx.click();
    state.pattern = e.target.checked;
    renderBouquetToCanvas($('#wrapPreviewCanvas'), false);
  };

  $('#wrapNextBtn').onclick = () => {
    sfx.click();
    goToStep(7);
  };

  // 关卡 7：快捷寄语与实时编辑
  QUOTES.forEach((q) => {
    const b = document.createElement('button');
    b.textContent = q;
    b.onclick = () => {
      sfx.click();
      state.message = q;
      $('#messageInput').value = q;
      renderBouquetToCanvas($('#notePreviewCanvas'), false);
    };
    $('#quoteChips').append(b);
  });

  $('#recipientInput').oninput = (e) => {
    state.recipient = e.target.value;
    renderBouquetToCanvas($('#notePreviewCanvas'), false);
  };
  $('#messageInput').oninput = (e) => {
    state.message = e.target.value;
    renderBouquetToCanvas($('#notePreviewCanvas'), false);
  };
  $('#senderInput').oninput = (e) => {
    state.sender = e.target.value;
    renderBouquetToCanvas($('#notePreviewCanvas'), false);
  };

  $('#noteNextBtn').onclick = () => {
    sfx.click();
    goToStep(8);
  };

  // 关卡 5：大小/角度/4项图层/取下
  $('#sizeRange').oninput = (e) => {
    if (selectedStem < 0) return;
    state.flowers[selectedStem].s = Number(e.target.value);
    renderBouquetToCanvas(bouquetCanvas, true);
  };
  $('#angleRange').oninput = (e) => {
    if (selectedStem < 0) return;
    state.flowers[selectedStem].r = Number(e.target.value);
    renderBouquetToCanvas(bouquetCanvas, true);
  };

  $('#layerTopBtn').onclick = () => {
    if (selectedStem < 0 || selectedStem >= state.flowers.length - 1) return;
    sfx.click();
    pushArrangeHistory();
    state.flowers.push(state.flowers.splice(selectedStem, 1)[0]);
    selectedStem = state.flowers.length - 1;
    refreshArrange();
  };
  $('#layerUpBtn').onclick = () => {
    if (selectedStem < 0 || selectedStem >= state.flowers.length - 1) return;
    sfx.click();
    pushArrangeHistory();
    [state.flowers[selectedStem], state.flowers[selectedStem + 1]] = [
      state.flowers[selectedStem + 1],
      state.flowers[selectedStem],
    ];
    selectedStem += 1;
    refreshArrange();
  };
  $('#layerDownBtn').onclick = () => {
    if (selectedStem <= 0) return;
    sfx.click();
    pushArrangeHistory();
    [state.flowers[selectedStem], state.flowers[selectedStem - 1]] = [
      state.flowers[selectedStem - 1],
      state.flowers[selectedStem],
    ];
    selectedStem -= 1;
    refreshArrange();
  };
  $('#layerBottomBtn').onclick = () => {
    if (selectedStem <= 0) return;
    sfx.click();
    pushArrangeHistory();
    state.flowers.unshift(state.flowers.splice(selectedStem, 1)[0]);
    selectedStem = 0;
    refreshArrange();
  };

  $('#removeStemBtn').onclick = () => {
    if (selectedStem < 0) return;
    sfx.click();
    pushArrangeHistory();
    state.flowers.splice(selectedStem, 1);
    selectedStem = -1;
    refreshArrange();
  };

  $('#undoArrangeBtn').onclick = () => {
    if (!arrangeHistory.length) return;
    sfx.click();
    state = JSON.parse(arrangeHistory.pop());
    selectedStem = -1;
    syncArrangeSwatches();
    refreshArrange();
  };

  $('#arrangeNextBtn').onclick = () => {
    if ($('#arrangeNextBtn').disabled) return;
    sfx.click();
    selectedStem = -1;
    goToStep(6);
  };
}

let presetsBuilt = false;
function renderPresetGallery() {
  const grid = $('#presetGrid');
  if (!grid || !assetsReady) return;
  if (!presetsBuilt) {
    presetsBuilt = true;
    grid.replaceChildren();
    BOUQUET_PRESETS.forEach((preset) => {
      const btn = document.createElement('button');
      btn.className = 'preset-card';
      const cv = document.createElement('canvas');
      cv.width = 240;
      cv.height = 200;
      const label = document.createElement('span');
      label.textContent = preset.name;
      btn.append(cv, label);
      btn.onclick = () => {
        sfx.pluck(2);
        pushArrangeHistory();
        state.flowers = structuredClone(preset.flowers);
        state.paper = preset.paper;
        state.ribbon = preset.ribbon;
        state.bg = preset.bg;
        state.landmark = preset.landmark;
        selectedStem = -1;
        syncArrangeSwatches();
        refreshArrange();
        toast(`已套用「${preset.name}」，可继续微调！`);
      };
      grid.append(btn);
    });
  }

  const temp = document.createElement('canvas');
  temp.width = BW;
  temp.height = BH;
  const savedState = state;
  const cards = $$('#presetGrid .preset-card canvas');
  BOUQUET_PRESETS.forEach((preset, idx) => {
    const cv = cards[idx];
    if (!cv) return;
    state = {
      ...savedState,
      flowers: preset.flowers,
      paper: preset.paper,
      ribbon: preset.ribbon,
      bg: preset.bg,
      landmark: preset.landmark,
      pattern: true,
    };
    renderBouquetToCanvas(temp, false);
    const tctx = cv.getContext('2d');
    tctx.clearRect(0, 0, cv.width, cv.height);
    tctx.drawImage(temp, 60, 260, 480, 400, 0, 0, cv.width, cv.height);
  });
  state = savedState;
}

function syncArrangeSwatches() {
  $$('.swatch').forEach((b) => {
    const pid = b.parentElement.id;
    const key = pid === 'paperColors' ? 'paper' : pid === 'ribbonColors' ? 'ribbon' : 'bg';
    b.classList.toggle('active', state[key] === b.dataset.color);
  });
  $$('.landmark-btn').forEach((b, i) => b.classList.toggle('active', state.landmark === i));
  $('#patternToggle').checked = state.pattern;
  $('#recipientInput').value = state.recipient;
  $('#messageInput').value = state.message;
  $('#senderInput').value = state.sender;
}

function setupArrangeScene() {
  initArrangeControls();
  if (state.flowers.length === 0) {
    state.flowers = [
      { t: 0, x: 288, y: 486, s: 1.06, r: -6 },
      {
        t: 3,
        x: 342,
        y: 422,
        s: 1.0,
        r: 12,
        yarn: state.customYarn ? structuredClone(state.customYarn) : null,
        yarnColor: state.customYarnColor,
      },
    ];
  }
  selectedStem = -1;
  arrangeHistory = [];
  switchArrangePane('materials');
  syncArrangeSwatches();
  renderPresetGallery();
  refreshArrange();
}

function setupWrapScene() {
  initArrangeControls();
  syncArrangeSwatches();
  renderBouquetToCanvas($('#wrapPreviewCanvas'), false);
}

function setupNoteScene() {
  initArrangeControls();
  syncArrangeSwatches();
  renderBouquetToCanvas($('#notePreviewCanvas'), false);
}

function refreshArrange() {
  renderBouquetToCanvas(bouquetCanvas, true);
  const f = state.flowers[selectedStem];
  $('#stemControls').hidden = !f;
  $('#noStemTip').hidden = !!f;
  $('#selectedName').textContent = f
    ? `当前选中：${f.yarn ? '手绕毛线蒜薹' : FLOWER_NAMES[f.t]}（可拖动）`
    : '点选画布花材可拖动、调大小与图层';

  if (f) {
    $('#sizeRange').value = f.s;
    $('#angleRange').value = f.r;
    const isTop = selectedStem >= state.flowers.length - 1;
    const isBottom = selectedStem <= 0;
    $('#layerTopBtn').disabled = isTop;
    $('#layerUpBtn').disabled = isTop;
    $('#layerDownBtn').disabled = isBottom;
    $('#layerBottomBtn').disabled = isBottom;
  }

  const count = state.flowers.length;
  const unlocked = count >= 4;
  $('#stemStatusLabel').textContent = unlocked ? `已放 ${count} 枝花材 ✓` : `已放 ${count} / 4 枝花材`;
  $('#undoArrangeBtn').disabled = !arrangeHistory.length;

  const nextBtn = $('#arrangeNextBtn');
  const wasDisabled = nextBtn.disabled;
  nextBtn.disabled = !unlocked;
  nextBtn.classList.toggle('pulse', unlocked);
  nextBtn.textContent = unlocked ? '去选包装 ▸' : `🔒 再添 ${4 - count} 枝`;
  if (unlocked && wasDisabled) sfx.clear();
}

function bouquetPoint(e) {
  const r = bouquetCanvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * BW) / r.width,
    y: ((e.clientY - r.top) * BH) / r.height,
  };
}

function hitStem(p, f) {
  const a = (-f.r * Math.PI) / 180;
  const dx = p.x - f.x;
  const dy = p.y - f.y;
  const x = dx * Math.cos(a) - dy * Math.sin(a);
  const y = dx * Math.sin(a) + dy * Math.cos(a);
  const w = 290 * f.s;
  return Math.abs(x) < w * 0.38 && Math.abs(y) < w * 0.46;
}

bouquetCanvas.onpointerdown = (e) => {
  const p = bouquetPoint(e);
  selectedStem = -1;
  if (p.y < 590) {
    for (let i = state.flowers.length - 1; i >= 0; i--) {
      if (hitStem(p, state.flowers[i])) {
        selectedStem = i;
        break;
      }
    }
  }
  if (selectedStem >= 0) {
    pushArrangeHistory();
    const f = state.flowers[selectedStem];
    stemDrag = { dx: p.x - f.x, dy: p.y - f.y };
    bouquetCanvas.setPointerCapture(e.pointerId);
    switchArrangePane('inspect');
  }
  refreshArrange();
};

bouquetCanvas.onpointermove = (e) => {
  if (!stemDrag || selectedStem < 0) return;
  const p = bouquetPoint(e);
  const f = state.flowers[selectedStem];
  f.x = Math.max(90, Math.min(510, p.x - stemDrag.dx));
  f.y = Math.max(270, Math.min(550, p.y - stemDrag.dy));
  renderBouquetToCanvas(bouquetCanvas, true);
};

function stopStemDrag() {
  stemDrag = null;
}
bouquetCanvas.onpointerup = stopStemDrag;
bouquetCanvas.onpointercancel = stopStemDrag;

/* ==================== 关卡 8：包扎仪式 ==================== */
let foldedSides = new Set();
let tiedSides = new Set();

function setupRitualScene() {
  foldedSides.clear();
  tiedSides.clear();
  renderBouquetToCanvas($('#ritualCanvas'), false);

  $$('.fold-sheet').forEach((el) => {
    el.classList.remove('folded');
    el.style.transform = '';
    el.style.setProperty('--wrap-color', state.paper);
    el.querySelector('span').textContent = el.classList.contains('left') ? '拖向中间 →' : '← 拖向中间';
  });
  $$('.ribbon-handle').forEach((el) => {
    el.classList.remove('tied');
    el.style.transform = '';
  });
  $$('.loop-target').forEach((el) => el.classList.remove('done'));

  $('#foldTarget').hidden = false;
  $('#ribbonGame').hidden = true;
  $('#finishedBow').hidden = true;
  $('#ritualCard').hidden = true;

  $('#ritualTitle').textContent = '轻轻折起包装纸';
  $('#ritualBadge').textContent = '0 / 2';
  $('#ritualHint').textContent = '把左右两片包装纸拖向中间（或轻点）';

  const nextBtn = $('#ritualNextBtn');
  nextBtn.disabled = true;
  nextBtn.classList.remove('pulse');
  nextBtn.textContent = '🔒 待包扎';
}

function doFold(side) {
  if (foldedSides.has(side)) return;
  foldedSides.add(side);
  sfx.pluck(foldedSides.size);
  const el = $(side === 'left' ? '#foldLeft' : '#foldRight');
  el.style.transform = '';
  el.classList.add('folded');
  $('#ritualBadge').textContent = `${foldedSides.size} / 2`;

  if (foldedSides.size === 2) {
    $('#ritualTitle').textContent = '拉起丝带系蝴蝶结';
    $('#ritualBadge').textContent = '0 / 2';
    $('#ritualHint').textContent = '把两端丝带拉到虚线圈里（或轻点）';
    setTimeout(() => {
      $('#foldTarget').hidden = true;
      $('#ribbonGame').hidden = false;
    }, 450);
  }
}

function doTie(side) {
  if (tiedSides.has(side)) return;
  tiedSides.add(side);
  sfx.pluck(tiedSides.size + 1);
  $(side === 'left' ? '#tieLeft' : '#tieRight').classList.add('tied');
  $(`.loop-target.${side}`).classList.add('done');
  $('#ritualBadge').textContent = `${tiedSides.size} / 2`;

  if (tiedSides.size === 2) {
    $('#ritualTitle').textContent = '这一束，好事成双！';
    $('#ritualBadge').textContent = '完成 ✓';
    $('#ritualHint').textContent = '蝴蝶结系好了，点右侧查看专属海报！';
    $('#finishedBow').hidden = false;
    $('#revealMessage').textContent = state.message || QUOTES[0];
    setTimeout(() => {
      $('#ritualCard').hidden = false;
      const r = $('#ritualStage').getBoundingClientRect();
      sparkle($('#ritualStage'), r.width / 2, r.height / 2, 14);
      sfx.fanfare();
      const nextBtn = $('#ritualNextBtn');
      nextBtn.disabled = false;
      nextBtn.classList.add('pulse');
      nextBtn.textContent = '看海报 ✧';
    }, 500);
  }
}

function bindRitualDrag(el, kind, side) {
  let start = null;
  let moved = false;
  el.onpointerdown = (e) => {
    start = { x: e.clientX, y: e.clientY };
    moved = false;
    el.setPointerCapture(e.pointerId);
  };
  el.onpointermove = (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > 6) moved = true;
    if (kind === 'fold') {
      el.style.transform = `translateX(${Math.max(-90, Math.min(90, dx))}px) rotate(${side === 'left' ? -10 : 10}deg)`;
    } else {
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  };
  el.onpointerup = (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    if (kind === 'fold') {
      if (!moved || (side === 'left' ? dx > 30 : dx < -30)) doFold(side);
      else toast('再往中间拖一点，或轻点收拢');
    } else {
      const targetRect = $(`.loop-target.${side}`).getBoundingClientRect();
      const near =
        Math.abs(e.clientX - (targetRect.left + targetRect.width / 2)) < 90 &&
        Math.abs(e.clientY - (targetRect.top + targetRect.height / 2)) < 90;
      if (!moved || near) doTie(side);
      else toast('把丝带拉进虚线圈，或轻点系上');
    }
    el.style.transform = '';
    start = null;
  };
  el.onpointercancel = () => {
    el.style.transform = '';
    start = null;
  };
}

bindRitualDrag($('#foldLeft'), 'fold', 'left');
bindRitualDrag($('#foldRight'), 'fold', 'right');
bindRitualDrag($('#tieLeft'), 'tie', 'left');
bindRitualDrag($('#tieRight'), 'tie', 'right');

$('#ritualNextBtn').onclick = () => {
  if ($('#ritualNextBtn').disabled) return;
  sfx.click();
  goToStep(9);
};

/* ==================== 关卡 9：成礼海报 ==================== */
function setupResultScene() {
  renderBouquetToCanvas($('#posterCanvas'), false);
}

$('#downloadPosterBtn').onclick = () => {
  sfx.click();
  try {
    const out = document.createElement('canvas');
    out.width = 1500;
    out.height = 2000;
    renderBouquetToCanvas(out, false);
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = '金乡丰收蒜礼海报.png';
    a.click();
    toast('高清海报已开始下载！');
  } catch {
    toast('长按或右键海报图片即可保存');
  }
};

$('#copyCopyBtn').onclick = async () => {
  sfx.click();
  const text = `我一步步亲手做了一份金乡丰收蒜礼，送给${state.recipient || '你'}：\n「${state.message}」\n#把金乡丰收扎成一束 #金乡大蒜节`;
  try {
    await navigator.clipboard.writeText(text);
    toast('分享文案已复制！');
  } catch {
    toast('复制失败，可手动截屏分享');
  }
};

/* ==================== 封面进入、音效开关与重玩 ==================== */
function enterStudio() {
  syncAudioButtons();
  if (bgmEnabled) startBgm();
  sfx.click();
  const overlay = $('#welcomeOverlay');
  overlay.classList.add('closing');
  setTimeout(() => {
    overlay.hidden = true;
    overlay.classList.remove('closing');
  }, 340);
}

$('#enterWithMusicBtn').onclick = enterStudio;

function toggleBgm() {
  bgmEnabled = !bgmEnabled;
  if (bgmEnabled) startBgm();
  syncAudioButtons();
}

$('#bgmToggle').onclick = toggleBgm;
$('#coverBgmBtn').onclick = toggleBgm;

$('#sfxToggle').onclick = () => {
  sfxEnabled = !sfxEnabled;
  if (sfxEnabled) sfx.click();
  syncAudioButtons();
};

$('#guideBtn').onclick = () => {
  sfx.click();
  $('#guideModal').hidden = false;
};
$('#closeGuideBtn').onclick = () => {
  sfx.click();
  $('#guideModal').hidden = true;
};

function restartGame() {
  sfx.click();
  state = createInitialState();
  goToStep(1);
  $('#welcomeOverlay').hidden = false;
}

$('#playAgainBtn').onclick = restartGame;
$('#restartBtn').onclick = restartGame;

/* ==================== 初始化 ==================== */
goToStep(1);
syncAudioButtons();

Promise.all([...flowerImgs, festivalLogo, fieldArt, ...landmarkImages].map((im) => im.decode().catch(() => {}))).then(() => {
  assetsReady = true;
  if (currentStep === 5) {
    renderPresetGallery();
    refreshArrange();
  }
});
