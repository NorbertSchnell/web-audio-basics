/********************************************
 * Web Auddio context
 */
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = null;

/********************************************
 * main
 */
 const dotRadius = 20;
 let sound = null;
 
 window.addEventListener('mousedown', onMouseDown);
 window.addEventListener('mousemove', onMouseMove);
 window.addEventListener('mouseup', onMouseUp);
 window.addEventListener('mouseleave', onMouseUp);
 
 /********************************************
 * filtered oscillator reacting on x/y-position
 */
const fadeTime = 0.250;

class Sound {
  constructor(x, y) {
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

    this.minCutoffFreq = 40;
    this.maxCutoffFreq = 4000;
    this.logCutoffRatio = Math.log(this.maxCutoffFreq / this.minCutoffFreq);

    this.startTime = time;

    this.move(x, y);
  }

  // set osc freq from linear factor between 0 and 1
  setFreq(factor) {
    this.buzz.frequency.value = this.minOscFreq * Math.exp(this.logOscRatio * factor);
  }

  // set lowpass cutoff freq from linear factor between 0 and 1
  setCutoff(factor) {
    this.lowpass.frequency.value = this.minCutoffFreq * Math.exp(this.logCutoffRatio * factor);
  }

  move(x, y) {
    const freqFactor = x / window.innerWidth;
    this.setFreq(freqFactor);

    const cutoffFactor = 1 - (y / window.innerHeight);
    this.setCutoff(cutoffFactor);

    this.x = x;
    this.y = y;
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
 * mouse listeners
 */
function onMouseDown(evt) {
  // start audio context on first mouse click
  if (audioContext === null) {
    audioContext = new AudioContext();
  }

  if (sound === null) {
    sound = new Sound(evt.clientX, evt.clientY);
  }

  evt.preventDefault();
}

function onMouseMove(evt) {
  if (sound !== null) {
    sound.move(evt.clientX, evt.clientY);
  }

  evt.preventDefault();
}

function onMouseUp(evt) {
  if (sound !== null) {
    sound.stop();
    sound = null;
  }

  evt.preventDefault();
}
