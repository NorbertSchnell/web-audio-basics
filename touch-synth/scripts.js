/********************************************
 * HTML elements
 */
const canvas = document.getElementById("canvas");
const overlay = document.getElementById("overlay");

/********************************************
 * Web Auddio context
 */
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = new AudioContext();

/********************************************
 * monophonic synth
 */
const fadeTime = 0.250;

class Synth {
  constructor() {
    const time = audioContext.currentTime;

    const env = audioContext.createGain();
    env.connect(audioContext.destination);
    //env.gain.value = 0;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(1, time + fadeTime);
    this.env = env;

    const lowpass = audioContext.createBiquadFilter();
    lowpass.connect(env);
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1000; // Hz
    lowpass.Q.value = 6;
    this.lowpass = lowpass;

    const buzz = audioContext.createOscillator();
    buzz.connect(lowpass);
    buzz.type = 'sawtooth';
    buzz.frequency.value = 100; // Hz
    buzz.start(time);
    this.buzz = buzz;

    this.minOscFreq = 20;
    this.maxOscFreq = 1000;
    this.logOscRatio = Math.log(this.maxOscFreq / this.minOscFreq);

    this.minCutoffFreq = 20;
    this.maxCutoffFreq = 4000;
    this.logCutoffRatio = Math.log(this.maxCutoffFreq / this.minCutoffFreq);

    this.startTime = time;
  }

  // set osc freq from linear factor between 0 and 1
  setFreq(factor) {
    this.buzz.frequency.value = this.minOscFreq * Math.exp(this.logOscRatio * factor);
  }

  // set lowpass cutoff freq from linear factor between 0 and 1
  setCutoff(factor) {
    this.lowpass.frequency.value = this.minCutoffFreq * Math.exp(this.logCutoffRatio * factor);
  }

  stop() {
    const time = audioContext.currentTime;

    const fade = Math.min(1, (time - this.startTime) / fadeTime);
    this.env.gain.cancelScheduledValues(time);
    this.env.gain.setValueAtTime(fade, time);
    this.env.gain.linearRampToValueAtTime(0, time + fadeTime);

    this.buzz.stop(time + fadeTime);
  }
}

/********************************************
 * touch finger
 */
const fingers = new Map();
const fingerRadius = 40;

class Finger {
  constructor(x, y) {
    this.synth = new Synth();
    this.move(x, y);
  }

  move(x, y) {
    this.x = x;
    this.y = y;

    const freqFactor = x / canvas.width;
    this.synth.setFreq(freqFactor);

    const cutoffFactor = 1 - (y / canvas.height);
    this.synth.setCutoff(cutoffFactor);
  }

  delete(x, y) {
    this.synth.stop();
  }
}

/********************************************
 * main
 */
overlay.addEventListener('click', main);

async function main() {
  if (audioContext) {
    await audioContext.resume();

    overlay.classList.add('hide');
    console.log("Here we go!");
  
    window.addEventListener('resize', onResize);

    canvas.addEventListener('touchstart', onTouchstart);
    canvas.addEventListener('touchmove', onTouchmove);
    canvas.addEventListener('touchend', onTouchend);
    canvas.addEventListener('touchcancel', onTouchend);
  
    onResize();
    onAnimationFrame();  
  } else {
    console.error("web audio not available");
  }
}

/********************************************
 * listeners
 */
function onAnimationFrame() {
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 153, 0, 0.5)";
  ctx.strokeStyle = "#ff9900";

  for (let [id, finger] of fingers) {
    ctx.beginPath();
    ctx.arc(finger.x, finger.y, fingerRadius, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.stroke();
  }

  requestAnimationFrame(onAnimationFrame);
}

function onTouchstart(evt) {
  for (let touch of evt.changedTouches) {
    const id = touch.identifier;
    const x = touch.clientX;
    const y = touch.clientY;

    const finger = new Finger(x, y);
    fingers.set(id, finger);
  }

  evt.preventDefault();
}

function onTouchmove(evt) {
  for (let touch of evt.changedTouches) {
    const id = touch.identifier;
    const finger = fingers.get(id);

    if (finger) {
      finger.move(touch.clientX, touch.clientY);
    }
  }

  evt.preventDefault();
}

function onTouchend(evt) {
  for (let touch of evt.changedTouches) {
    const id = touch.identifier;
    const finger = fingers.get(id);

    if (finger) {
      finger.delete(touch.clientX, touch.clientY);
      fingers.delete(id);
    }
  }

  evt.preventDefault();
}

function onResize() {
  const bodyRect = document.body.getBoundingClientRect();
  canvas.width = bodyRect.width;
  canvas.height = bodyRect.height;
}
