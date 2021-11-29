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

    const buzz = audioContext.createOscillator();
    buzz.connect(env);
    buzz.type = 'sawtooth';
    buzz.frequency.value = 220;
    buzz.start(time);
    this.buzz = buzz;
  }

  stop() {
    const time = audioContext.currentTime;
    this.env.gain.cancelAndHoldAtTime(time);
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
    this.x = x;
    this.y = y;
    this.synth = new Synth();
  }

  move(x, y) {
    this.x = x;
    this.y = y;
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
