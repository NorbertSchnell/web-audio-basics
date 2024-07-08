
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = null;

const radioSlider = document.getElementById('radio-slider');
const noiseFileName = 'sound.wav'; // name of audio file to load
let noiseBuffer = null; // audio buffer loaded

radioSlider.addEventListener('input', onInput);

loadAudioFile(noiseFileName, (buffer) => {
  noiseBuffer = buffer;
});


/**************************************************************************
 *
 *  function definitions
 * 
 */

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
function loadAudioFile(fileName, callback) {
  const request = new XMLHttpRequest();

  request.responseType = 'arraybuffer';
  request.open('GET', fileName);
  request.addEventListener('load', () => {
    const ac = new AudioContext();
    ac.decodeAudioData(request.response, callback);
  });

  request.send();
}

/**************************************************************************
 *
 *  slider input
 * 
 */
function onInput(evt) {
  if (audioContext === null) {
    audioContext = new AudioContext();
  }

  const time = audioContext.currentTime;
  const duration = 0.500;
  const offset = Math.random() * (noiseBuffer.duration - duration);
  const gain = 1;

  synthGrain(audioContext, audioContext.destination, noiseBuffer, time, offset, duration, gain);
}
