const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();
const audioFiles = ['bd.wav', 'sd.wav', 'ch.wav', 'oh.wav'];
const audioBuffers = [];

window.addEventListener('mousedown', onButton);
window.addEventListener('touchstart', onButton);

loadAudioFiles();

// get promise for web audio check and start
function requestWebAudio() {
  return new Promise((resolve, reject) => {
    if (audioContext && audioContext.state !== "running") {
      audioContext.resume()
        .then(() => resolve())
        .catch(() => reject());
    }
  });
}

// load audio files into audio buffers
let numBuffersReady = 0;

function loadAudioFiles() {
  return new Promise((resolve, reject) => {
    for (let i = 0; i < audioFiles.length; i++) {
      fetch('sounds/' + audioFiles[i])
        .then(data => data.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(decodedAudio => {
          audioBuffers[i] = decodedAudio;
          numBuffersReady++;
          if (numBuffersReady === audioFiles.length) {
            resolve();
          }
        });
    }
  });
}

// play buffer by index
function playSound(index) {
  requestWebAudio(); // has to be called on user interaction (e.g. 'click' event)

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