const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = null;

// parameters
const files = ['loop-1.mp4', 'loop-2.mp4', 'loop-3.mp4', 'loop-4.mp4']; // video loop files
const offsets = [0, 0, 0, 0.57]; // loop point offsets
const levels = [0, 0, 0, 9]; // loop sound levels

const fadeTime = 0.050; // loop play fade-in/out time in secs
const adjustTimePeriod = 0.125; // period of timing correction process in secs
const maxSpeed = 1.5; // maximum video playback rate for timing adjustment
const minSpeed = 1 / maxSpeed; // minimum video playback rate for timing adjustment

const tempo = 60;
const tempoRef = 1 / 4; // <tempoRef> = <tempo>, e.g. ♩ = 60
const timeSignature = 4 / 4;
const loopLength = 2; // loop length in bars (as defined by signature)

/***************************************************************************/

const loopDuration = loopLength * timeSignature * 60 / (tempo * tempoRef); // loop duration in secs

// state
const buffers = [];
const loops = [];
const activeLoops = new Set();
let loopStartTime = 0;

window.addEventListener('mousedown', onButton);
window.addEventListener('touchstart', onButton);

loadLoops();

/***************************************************************************/

class Loop {
  constructor(video, buffer, duration, offset = 0, level = 0) {
    this.video = video;
    this.buffer = buffer;
    this.duration = duration;
    this.offset = offset;
    this.amp = decibelToLinear(level);
    this.gain = null;
    this.source = null;
  }

  start(time, sync = true) {
    const buffer = this.buffer;
    let loopTime = this.offset;

    const gain = audioContext.createGain();
    gain.connect(audioContext.destination);

    if (sync) {
      // fade in only when starting somewhere in the middle
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(this.amp, time + fadeTime);

      // set loop time
      loopTime = (time - loopStartTime + this.offset) % this.duration;
    }

    const source = audioContext.createBufferSource();
    source.connect(gain);
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = this.duration;
    source.start(time, loopTime);

    this.source = source;
    this.gain = gain;

    this.video.currentTime = loopTime;
    this.video.play();

    activeLoops.add(this);
  }

  stop(time) {
    this.source.stop(time + fadeTime);
    this.gain.gain.setValueAtTime(this.amp, time);
    this.gain.gain.linearRampToValueAtTime(0, time + fadeTime);

    this.source = null;
    this.gain = null;

    this.video.pause();

    activeLoops.delete(this);
  }

  adustTimimg() {
    const time = audioContext.currentTime;
    const duration = this.duration;
    const loopTime = (time - loopStartTime + this.offset) % duration;
    const videoTime = this.video.currentTime;
    const maxDelta = 0.5 * duration;
    let delta = videoTime - loopTime;

    if (delta > maxDelta || delta < -maxDelta) {
      this.video.currentTime = loopTime;
    } else {
      const speed = Math.max(minSpeed, Math.min(maxSpeed, (adjustTimePeriod - delta) / adjustTimePeriod));
      this.video.playbackRate = speed;

      //console.log(loopTime, videoTime, delta, speed);
    }
  }

  get isPlaying() {
    return (this.source !== null);
  }
}

function loadLoops() {
  const decodeContext = new AudioContext();

  for (let i = 0; i < files.length; i++) {
    const request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.open('GET', 'movies/' + files[i]);
    request.addEventListener('load', () => {
      const videoBlob = new Blob([request.response], { type: "video/mp4" });

      decodeContext.decodeAudioData(request.response, (audioBuffer) => {
        const videoElement = document.getElementById(`video-${i + 1}`);
        videoElement.src = URL.createObjectURL(videoBlob);
        loops[i] = new Loop(videoElement, audioBuffer, loopDuration, offsets[i], levels[i]);
      });
    });

    request.send();
  }
}

function onButton(evt) {
  const target = evt.target;
  const index = target.dataset.index;
  const loop = loops[index];

  if (audioContext === null)
    audioContext = new AudioContext();

  if (loop) {
    const time = audioContext.currentTime;
    let syncLoopPhase = true;

    // firat video starts from the beginning
    if (activeLoops.size === 0) {
      loopStartTime = time;
      syncLoopPhase = false;
      setTimeout(adjustTimimg, 1000 * adjustTimePeriod);
    }

    if (!loop.isPlaying) {
      loop.start(time, syncLoopPhase);
      target.classList.add('active');
    } else {
      loop.stop(time);
      target.classList.remove('active');
    }
  }
}

let lastAdjustTime = -Infinity;

function adjustTimimg() {
  const time = audioContext.currentTime;

  if (time - lastAdjustTime > adjustTimePeriod) {
    for (let loop of activeLoops)
      loop.adustTimimg();

    lastAdjustTime = time;
  }

  if (activeLoops.size > 0)
    setTimeout(adjustTimimg, 1000 * adjustTimePeriod);
}

function decibelToLinear(val) {
  return Math.exp(0.11512925464970229 * val);
}