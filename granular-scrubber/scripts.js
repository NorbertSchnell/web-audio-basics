const headCanvas = document.getElementById('head-canvas');
const waveCanvas = document.getElementById('wave-canvas');

const height = 400; // canvas height
let width = null; // canvas width (changes with window width)

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = new AudioContext();;

const audioFileName = 'sound.wav'; // name of audio file to load
const audioBufferExtension = 1; // duration of audio added at the end of the buffer
let audioBuffer = null; // audio buffer loaded

const audioRenderPeriod = 0.100; // render period of grains

// granular synthesis parameters
const grainPeriod = 0.010;
const grainDuration = 0.160;
const grainOffsetVariation = 0.010;

/**************************************************************************
 *
 *  main
 * 
 */
// overlay window for starting audio
const overlay = document.getElementById("overlay");
overlay.addEventListener('click', main);

async function main() {
  if (audioContext) {
    await audioContext.resume();

    overlay.classList.add('hide');

    resize();
    loadAudioFile(audioFileName, (buffer) => {
      audioBuffer = buffer;
      renderWaveform(waveCanvas, buffer, buffer.duration - audioBufferExtension);
    });

    window.addEventListener('resize', resize);

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mouseleave', onMouseUp);

    headCanvas.addEventListener('touchstart', onTouchStart);
    headCanvas.addEventListener('touchmove', onTouchMove);
    headCanvas.addEventListener('touchend', onTouchEnd);
    headCanvas.addEventListener('touchcancel', onTouchEnd);
  } else {
    console.error("web audio not available");
  }
}

/**************************************************************************
 *
 *  function definitions
 * 
 */

// resize graphics according to window
function resize() {
  const bodyRect = document.body.getBoundingClientRect();

  width = bodyRect.width;

  waveCanvas.width = width
  waveCanvas.height = height
  headCanvas.width = width;
  headCanvas.height = height;

  if (audioBuffer) {
    renderWaveform(waveCanvas, audioBuffer, audioBuffer.duration - audioBufferExtension);
  }
}

// synthesize a single grain
function synthGrain(context, destination, buffer, time, offset, duration, gain, cutoffFreq = Infinity, resLevel = 0) {
  const fadeTime = 0.5 * duration;

  const env = context.createGain();
  env.connect(destination);
  env.gain.value = 0;
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(gain, time + fadeTime);
  env.gain.setValueAtTime(gain, time + duration - fadeTime);
  env.gain.linearRampToValueAtTime(0, time + duration);
  destination = env;

  if (cutoffFreq < Infinity) {
    const lowpass = context.createBiquadFilter();
    lowpass.connect(env);
    lowpass.type = 'lowpass';
    lowpass.frequency.value = cutoffFreq;
    lowpass.Q.value = resLevel;
    destination = lowpass;
  }

  const source = context.createBufferSource();
  source.connect(destination);
  source.buffer = buffer;
  source.start(time, offset);
  source.stop(time + duration);
}

// load audio file
function loadAudioFile(audioFileName, callback) {
  const request = new XMLHttpRequest();

  request.responseType = 'arraybuffer';
  request.open('GET', audioFileName);
  request.addEventListener('load', () => {
    const ac = new AudioContext();
    ac.decodeAudioData(request.response, callback);
  });

  request.send();
}

// render waveform
function renderWaveform(canvas, buffer, duration) {
  const context = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  context.save();
  context.clearRect(0, 0, width, height);

  if (buffer) {
    const waveform = buffer.getChannelData(0);
    const bufferLength = buffer.sampleRate * duration;
    const samplesPerPixel = bufferLength / width;
    const center = 0.5 * height;
    const fullamp = 0.25 * height;
    let fEnd = 0;
    let start = 0;

    context.strokeStyle = 'turquoise';
    context.globalAlpha = 0.666;

    context.beginPath();

    for (let i = 0; i < width; i++) {
      let min = Infinity;
      let max = -Infinity;

      fEnd += samplesPerPixel;
      let end = Math.floor(fEnd + 0.5);

      for (let j = start; j < end; j++) {
        const value = waveform[j];
        min = Math.min(min, value);
        max = Math.max(max, value);
      }

      context.moveTo(i, center - fullamp * max);
      context.lineTo(i, center - fullamp * min + 0.5);

      start = end;
    }

    context.stroke();
  }

  context.restore();
}

/**************************************************************************
 *
 *  granular synthesizer
 * 
 */

class GranularSynth {
  constructor(buffer, loopDuration, period, duration, offsetVariation) {
    this.buffer = buffer;
    this.loopDuration = loopDuration;

    this.period = period;
    this.duration = duration;
    this.offsetVariation = offsetVariation;

    this.offsetFactor = 0;
    this.cutoffFactor = 0;

    this.minCutoffFreq = 200;
    this.maxCutoffFreq = 12000;
    this.logCutoffRatio = Math.log(this.maxCutoffFreq / this.minCutoffFreq);

    this.startTime = 0;
  }

  // render grains in givcen context until given time
  renderAudio(context, renderTime) {
    const period = this.period;
    const duration = this.duration;
    const offset = this.loopDuration * this.offsetFactor;
    const numGrains = Math.ceil(duration / period);
    const gain = Math.sqrt(1 / numGrains);
    const cutoffFreq = this.minCutoffFreq * Math.exp(this.logCutoffRatio * this.cutoffFactor);
    let startTime = this.startTime || context.currentTime;

    while (startTime < renderTime) {
      const randomOffset = this.offsetVariation * Math.random();
      synthGrain(context, context.destination, this.buffer, startTime, offset + randomOffset, duration, gain, cutoffFreq);
      startTime += period;
    }

    this.startTime = startTime;
  }

  // set offset as relative factor between 0 and 1
  setOffset(factor) {
    this.offsetFactor = Math.max(0, Math.min(1, factor));
  }

  // set lowpass cutoff as relative factor between 0 and 1
  setCutoff(factor) {
    this.cutoffFactor = Math.max(0, Math.min(1, factor));
  }
}

/**************************************************************************
 *
 *  play heads 
 * 
 */
const heads = new Map(); // list of heads by touch id

// a single play head (contains a granular synthesizer each)
class Head {
  constructor(x, y) {
    this.synth = new GranularSynth(audioBuffer, audioBuffer.duration - audioBufferExtension, grainPeriod, grainDuration, grainOffsetVariation);
    this.move(x, y);
  }

  move(x, y) {
    this.x = x;
    this.y = y;

    const offsetFactor = x / width;
    this.synth.setOffset(offsetFactor);

    const cutoffFactor = 1 - (y / height);
    this.synth.setCutoff(cutoffFactor);
  }

  renderGraphics(context) {
    const x = this.x;
    const y = this.y;

    context.globalAlpha = 1;

    context.strokeStyle = 'turquoise';
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();

    context.beginPath();
    context.moveTo(x - 100, y);
    context.lineTo(x + 100, y);
    context.stroke();
  }

  renderAudio(context, time) {
    this.synth.renderAudio(context, time);
  }
}

// create a new play head
function startHead(id, clientX, clientY) {
  const canvasClientRect = headCanvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(width, clientX - canvasClientRect.x));
  const y = Math.max(0, Math.min(height, clientY - canvasClientRect.y));
  const head = new Head(x, y);
  const isFirstHead = (heads.size === 0);

  heads.set(id, head);

  if (isFirstHead) {
    renderAudio();
    renderGraphics();
  }
}

// move a given play head
function moveHead(id, clientX, clientY) {
  const canvasClientRect = headCanvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(width, clientX - canvasClientRect.x));
  const y = Math.max(0, Math.min(height, clientY - canvasClientRect.y));
  const head = heads.get(id);

  if (head) {
    head.move(x, y);
  }
}

// stop and delete a given play head
function stopHead(id) {
  const head = heads.get(id);

  if (head) {
    heads.delete(id);
  }
}

// audio rendering loop (running in audioRenderPeriod driven by setTimeout)
function renderAudio() {
  const time = audioContext.currentTime + audioRenderPeriod;

  // render audio of each play head
  for (let [id, head] of heads) {
    head.renderAudio(audioContext, time);
  }

  // continue rendering as long as there are active play heads
  if (heads.size > 0) {
    setTimeout(renderAudio, 1000 * audioRenderPeriod);
  }
}

// graphics rendering loop (driven by requestAnimationFrame)
function renderGraphics() {
  const context = headCanvas.getContext('2d');

  context.clearRect(0, 0, width, height);

  // reander graphics of each play head
  for (let [id, head] of heads) {
    head.renderGraphics(context);
  }

  // continue rendering as long as there are active play heads
  if (heads.size > 0) {
    requestAnimationFrame(renderGraphics);
  }
}

/**************************************************************************
 *
 *  touch and mouse events
 * 
 */
function onTouchStart(evt) {
  for (let touch of evt.changedTouches) {
    const id = touch.identifier;
    const x = touch.clientX;
    const y = touch.clientY;

    startHead(id, x, y);
  }

  evt.preventDefault();
}

function onTouchMove(evt) {
  for (let touch of evt.changedTouches) {
    const id = touch.identifier;
    const x = touch.clientX;
    const y = touch.clientY;

    moveHead(id, x, y);
  }

  evt.preventDefault();
}

function onTouchEnd(evt) {
  for (let touch of evt.changedTouches) {
    const id = touch.identifier;
    stopHead(id);
  }

  evt.preventDefault();
}

function onMouseDown(evt) {
  const x = evt.clientX;
  const y = evt.clientY;

  startHead(0, x, y);
  evt.preventDefault();
}

function onMouseMove(evt) {
  const x = evt.clientX;
  const y = evt.clientY;

  moveHead(0, x, y);
  evt.preventDefault();
}

function onMouseUp(evt) {
  stopHead(0);
  evt.preventDefault();
}
