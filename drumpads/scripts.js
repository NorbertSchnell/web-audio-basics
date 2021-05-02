const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = null;

const soundsFileNames = ['bd.wav', 'sd.wav', 'ch.wav', 'oh.wav'];
const audioBuffers = [];

window.addEventListener('mousedown', onButton);
window.addEventListener('touchstart', onButton);

// load audio buffers (samples)
for (let i = 0; i < soundsFileNames.length; i++) {
  const request = new XMLHttpRequest();
  request.responseType = 'arraybuffer';
  request.open('GET', soundsFileNames[i]);
  request.addEventListener('load', () => {
    const ac = new AudioContext();
    ac.decodeAudioData(request.response, (buffer) => audioBuffers[i] = buffer);
  });

  request.send();
}

// play buffer by index
function playSound(index) {
  // create audio context on first button and keep it
  if (audioContext === null)
    audioContext = new AudioContext();

  const source = audioContext.createBufferSource();
  source.connect(audioContext.destination);
  source.buffer = audioBuffers[index];
  source.start(audioContext.currentTime);
}

// play audio buffer (sample)
function onButton(evt) {
  const target = evt.target;
  const index = target.dataset.index;

  playSound(index);

  target.classList.add('active');
  setTimeout(() => target.classList.remove('active'), 200);
}