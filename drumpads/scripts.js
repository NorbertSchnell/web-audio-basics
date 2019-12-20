const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = null;

const sounds = ['bd.wav', 'sd.wav', 'ch.wav', 'oh.wav'];
const buffers = [];

window.addEventListener('mousedown', onButton);
window.addEventListener('touchstart', onButton);

// load audio buffers
for (let i = 0; i < sounds.length; i++) {
  const request = new XMLHttpRequest();
  request.responseType = 'arraybuffer';
  request.open('GET', sounds[i]);
  request.addEventListener('load', () => {
    const ac = new AudioContext();
    ac.decodeAudioData(request.response, (buffer) => buffers[i] = buffer);
  });

  request.send();
}

// play buffer by index
function playSound(index) {
  if (audioContext === null)
    audioContext = new AudioContext();

  const source = audioContext.createBufferSource();
  source.connect(audioContext.destination);
  source.buffer = buffers[index];
  source.start(audioContext.currentTime);
}

// play sample
function onButton(evt) {
  const target = evt.target;
  const index = target.dataset.index;

  playSound(index);

  target.classList.add('active');
  setTimeout(() => target.classList.remove('active'), 200);
}