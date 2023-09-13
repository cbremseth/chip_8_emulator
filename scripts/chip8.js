import Renderer from "./renderer.js";
import Keyboard from "./keyboard.js";
import Speaker from "./speaker.js";
import CPU from "./cpu.js";

const renderer = new Renderer(10);
const keyboard = new Keyboard();
const speaker = new Speaker();
const cpu = new CPU(renderer, keyboard, speaker);

let loop;

let fps = 60,
  fpsInterval,
  startTime,
  now,
  then,
  elapsed;

function init() {
  fpsInterval = 1000 / fps;
  then = Date.now();
  startTime = then;

  cpu.loadSpritesIntoMemory();
  cpu.loadRom("Breakout [Carmelo Cortez, 1979].ch8");
  loop = requestAnimationFrame(step);
}

function step() {
  now = Date.now();
  elapsed = now - then;

  if (elapsed > fpsInterval) {
    cpu.cycle();
    displayRegisterHex();
    displayMemoryHex();
  }

  loop = requestAnimationFrame(step);
}

function displayRegisterHex() {
  let field = document.querySelector("#register");

  cpu.v.forEach((element, index) => {
    const hexValue = element.toString(16).toUpperCase();
    const registerName = "V" + index.toString(16).toUpperCase();
    const elemId = registerName;

    let existingElement = document.getElementById(elemId);

    if (existingElement) {
      // Update only if value has changed
      const existingText = existingElement.textContent;
      const newText = registerName + " 0x" + hexValue;
      if (existingText !== newText) {
        existingElement.textContent = newText;
      }
    } else {
      // Element does not exist, so create it
      const newElement = document.createElement("div");
      newElement.className = "hex";
      newElement.id = elemId;
      newElement.textContent = registerName + " 0x" + hexValue;

      field.appendChild(newElement);
    }
  });
}

function displayMemoryHex() {
  let field = document.querySelector("#memory");
  cpu.memory.forEach((element, index) => {
    const hexValue = element.toString(16).toUpperCase();
    const location = "0x" + index.toString(16).toUpperCase();
    const elemId = location;

    let existingElement = document.getElementById(location);
    if (existingElement) {
      // Update only if value has changed
      const existingText = existingElement.textContent;
      const newText = " 0x" + hexValue;
      if (existingText !== newText) {
        existingElement.textContent = newText;
      }
    } else {
      // Element does not exist, so create it
      const newElement = document.createElement("div");
      newElement.className = "hex";
      newElement.id = elemId;
      newElement.textContent = " 0x" + hexValue;

      field.appendChild(newElement);
    }
  });
}

init();
