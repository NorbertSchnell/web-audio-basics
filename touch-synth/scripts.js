/********************************************
 * HTML elements
 */
const canvas = document.getElementById("canvas");
const overlay = document.getElementById("overlay");

/********************************************
 * multi-touch fingers
 */
const fingers = new Map();
const fingerRadius = 40;

class Finger {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  move(x, y) {
    this.x = x;
    this.y = y;
  }

  delete(x, y) {

  }
}

/********************************************
 * main
 */
overlay.addEventListener('click', main);

function main() {
  overlay.classList.add('hide');
  window.addEventListener('resize', onResize);
  console.log("Here we go!");

  canvas.addEventListener('touchstart', onTouchstart);
  canvas.addEventListener('touchmove', onTouchmove);
  canvas.addEventListener('touchend', onTouchend);
  canvas.addEventListener('touchcancel', onTouchend);

  onResize();
  onAnimationFrame();
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
