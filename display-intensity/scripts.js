const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = null;

window.addEventListener('mousedown', onClick);
window.addEventListener('touchstart', onClick);

const circle = document.getElementById('circle');
let analyser = null;
let analyserArray = null;
let enabled = false;

function onClick(evt) {
  const target = evt.target;

  if (audioContext === null) {
    // create audio context and analyser node
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyserArray = new Float32Array(analyser.fftSize);

    // get microphone stream
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        let mediaStreamSource = audioContext.createMediaStreamSource(stream);
        mediaStreamSource.connect(analyser);
      })
      .catch(function(err) {
        console.log(err.name + ": " + err.message);
      });
  }

  if (!enabled) {
    // start
    enabled = true;
    circle.classList.add('active');
    window.requestAnimationFrame(displayIntensity);
  } else {
    // stop
    enabled = false;
    circle.classList.remove('active');
    circle.style.opacity = 0.25;
  }
}

function displayIntensity() {
  if (enabled && analyser.getFloatTimeDomainData) {
    analyser.getFloatTimeDomainData(analyserArray);

    // calculate intensity
    const size = analyser.fftSize;
    let sum = 0;

    for (let i = 0; i < size; i++) {
      const value = analyserArray[i];
      sum += (value * value);
    }

    const intensity = Math.sqrt(sum / size); 

    // map intensity to opacity
    const opacity = Math.min(1, 0.5 + 10 * intensity);
    circle.style.opacity = opacity;

    const width = 100 + 500 * intensity;
    circle.style.width = circle.style.height = `${width}px`;
    circle.style.marginTop = circle.style.marginLeft = `${-0.5 * width}px`;
  }

  window.requestAnimationFrame(displayIntensity);
}