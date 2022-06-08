import { sounds } from './setup.js';

const buttonTable = document.getElementById('buttons');
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = null;

const numRows = sounds.length;
const numCols = sounds[0].length;
const tableSpacing = 20;
const lockSize = 50;
const colHeight = numRows * 100 + (numRows - 1) * tableSpacing;
const rowWidth = numCols * 100 + (numCols - 1) * tableSpacing;
const rows = [];
const cols = [];
const activeLoops = new Set();
let loopStartTime = 0;
const fadeTime = 0.050;

buttonTable.style.marginLeft = `${-0.5 * (rowWidth + 2 * tableSpacing + lockSize)}px`
buttonTable.style.marginTop = `${-0.5 * (colHeight + 2 * tableSpacing + lockSize)}px`

/*******************************************************
 * 
 *  classes
 * 
 */
class Loop {
  constructor(rowIndex, colIndex, buffer, button, pan = 0, level = 0) {
    this.rowIndex = rowIndex;
    this.colIndex = colIndex;
    this.buffer = buffer;
    this.button = button;
    this.amp = decibelToLinear(level);
    this.pan = pan;
    this.source = null;
    this.gain = null;
    this.panner = null;
    this.analyser = null;
  }

  start(time, sync = true) {
    let offset = 0;

    if (this.analyser === null) {
      this.analyser = audioContext.createAnalyser();
      this.analyserArray = new Float32Array(this.analyser.fftSize);
    }

    if (this.panner === null) {
      this.panner = audioContext.createStereoPanner();
      this.panner.connect(audioContext.destination);
      this.panner.pan.value = this.pan;
    }

    const gain = audioContext.createGain();
    gain.connect(this.panner);
    gain.connect(this.analyser);

    if (sync) {
      // fade in only when starting somewhere in the middle
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(this.amp, time + fadeTime);

      // set offset to loop time
      offset = (time - loopStartTime) % this.buffer.duration;
    }

    const source = audioContext.createBufferSource();
    source.connect(gain);
    source.buffer = this.buffer;
    source.loop = true;
    source.start(time, offset);

    this.source = source;
    this.gain = gain;

    activeLoops.add(this);
    rows[this.rowIndex].activeLoops.add(this);
    cols[this.colIndex].activeLoops.add(this);
    this.button.classList.add('active');
  }

  stop(time) {
    this.source.stop(time + fadeTime);
    this.gain.gain.setValueAtTime(this.amp, time);
    this.gain.gain.linearRampToValueAtTime(0, time + fadeTime);

    this.source = null;
    this.gain = null;

    activeLoops.delete(this);
    rows[this.rowIndex].activeLoops.delete(this);
    cols[this.colIndex].activeLoops.delete(this);

    this.button.style.opacity = '';
    this.button.classList.remove('active');
  }

  displayIntensity() {
    const analyser = this.analyser;

    if (analyser.getFloatTimeDomainData) {
      const array = this.analyserArray;
      const fftSize = analyser.fftSize;

      analyser.getFloatTimeDomainData(array);

      let sum = 0;
      for (let i = 0; i < fftSize; i++) {
        const value = array[i];
        sum += (value * value);
      }

      const opacity = Math.min(1, 0.25 + 10 * Math.sqrt(sum / fftSize));
      this.button.style.opacity = opacity;
    }
  }

  get isPlaying() {
    return (this.source !== null);
  }
}

class RowOrCol {
  constructor(index, lockButton, isCol = false, isLocked = false) {
    this.index = index;
    this.isCol = isCol;
    this.lockButton = lockButton;
    this.isLocked = isLocked;
    this.activeLoops = new Set();

    if (isCol) {
      this.lockButton.style.height = `${colHeight + lockSize}px`;
    } else {
      this.lockButton.style.width = `${rowWidth + lockSize}px`;
    }

    if (isLocked) {
      this.lockButton.classList.add('active');
    }
  }

  toggleLock(time) {
    this.isLocked = !this.isLocked;

    if (this.isLocked) {
      this.stopButOne(time);
      this.lockButton.classList.add('active');
    } else {
      this.lockButton.classList.remove('active');
    }
  }

  stop(time) {
    for (let loop of this.activeLoops) {
      loop.stop(time);
    }
  }

  stopButOne(time) {
    let isFirst = true;

    for (let loop of this.activeLoops) {
      if (isFirst) {
        isFirst = false;
      } else {
        loop.stop(time);
      }
    }
  }
}

/*******************************************************
 * 
 *  main
 * 
 */
window.addEventListener('mousedown', onButton);
window.addEventListener('touchstart', onButton);

// init loops
const decodeContext = new AudioContext();

const lockRow = document.createElement('tr');
buttonTable.appendChild(lockRow);

const lockCell = document.createElement('td');
lockRow.appendChild(lockCell);

for (let j = 0; j < numCols; j++) {
  const lockCell = document.createElement('td');
  lockRow.appendChild(lockCell);

  const lockButton = document.createElement('div');
  lockButton.classList.add('lock', 'lock-col');
  lockButton.dataset.col = j;
  lockCell.appendChild(lockButton);

  const col = new RowOrCol(j, lockButton, true, true);
  cols.push(col);
}

// load audio buffers
for (let i = 0; i < numRows; i++) {
  const soundRow = sounds[i];
  const tableRow = document.createElement('tr');
  tableRow.classList.add('row');
  buttonTable.appendChild(tableRow);

  const lockCell = document.createElement('td');
  tableRow.appendChild(lockCell);

  const lockButton = document.createElement('div');
  lockButton.classList.add('lock', 'lock-row');
  lockButton.dataset.row = i;
  lockCell.appendChild(lockButton);

  const row = new RowOrCol(i, lockButton, false);
  rows.push(row);

  for (let j = 0; j < numCols; j++) {
    const sound = soundRow[j];

    const cell = document.createElement('td');
    cell.classList.add('button');
    cell.dataset.row = i;
    cell.dataset.col = j;
    tableRow.appendChild(cell);

    const request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.open('GET', 'sounds/' + sound.filename);
    request.addEventListener('load', () => {
      decodeContext.decodeAudioData(request.response, (buffer) => {
        sound.loop = new Loop(i, j, buffer, cell, j * 0.4 - 0.6, sound.level);
      });
    });

    request.send();
  }
}

function onButton(evt) {
  if (audioContext === null)
    audioContext = new AudioContext();

  const target = evt.target;
  const rowIndex = target.dataset.row;
  const colIndex = target.dataset.col;
  const time = audioContext.currentTime;

  if (rowIndex !== undefined && colIndex !== undefined) {
    const loop = sounds[rowIndex][colIndex].loop;

    if (loop) {
      const row = rows[rowIndex];
      const col = cols[colIndex];
      let syncLoopPhase = true;

      if (activeLoops.size === 0) {
        loopStartTime = time;
        syncLoopPhase = false;
        window.requestAnimationFrame(displayIntensity);
      }

      if (!loop.isPlaying) {
        if (row.isLocked) {
          row.stop(time);
        }

        if (col.isLocked) {
          col.stop(time);
        }

        loop.start(time, syncLoopPhase);
      } else {
        loop.stop(time);
      }
    }
  } else if (rowIndex !== undefined) {
    const row = rows[rowIndex];
    row.toggleLock(time)
  } else if (colIndex !== undefined) {
    const col = cols[colIndex];
    col.toggleLock(time);
  }
}

function displayIntensity() {
  for (let loop of activeLoops)
    loop.displayIntensity();

  if (activeLoops.size > 0)
    window.requestAnimationFrame(displayIntensity);
}

function decibelToLinear(val) {
  return Math.exp(0.11512925464970229 * val); // pow(10, val / 20)
}
