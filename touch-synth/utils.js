/********************************************
 * web audio context
 */
 const AudioContext = window.AudioContext || window.webkitAudioContext;
 let audioContext = new AudioContext();

if (audioContext) {
  await audioContext.resume();
} else {
  console.error("web audio not available");
}

/********************************************x
 * oscillator
 */
 const buzz = audioContext.createOscillator();
 buzz.connect(next);
 buzz.type = 'sawtooth';
 buzz.frequency.value = freq;
 buzz.start(audioContext.currentTime);

/********************************************x
 * ramp env
 */
const env = audioContext.createGain();
env.connect(next);
env.gain.setValueAtTime(0, time);
env.gain.linearRampToValueAtTime(1, time + fadeTime);

/********************************************
 * lowpass filter
 */
lowpass = audioContext.createBiquadFilter();
lowpass.connect(next);
lowpass.type = 'lowpass';
lowpass.frequency.value = freq;
lowpass.Q.value = 0;

/********************************************
 * exponential frequency control
 */
minFreq = 20;
maxFreq = 0.5 * audioContext.sampleRate;
logRatio = Math.log(maxFreq / minFreq);

op.frequency.value = minFreq * Math.exp(logRatio * factor);
