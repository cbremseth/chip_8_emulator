import Renderer from "./renderer.js";
import Keyboard from "./keyboard.js";
import Speaker from "./speaker.js";
import CPU from "./cpu.js";

let renderer = new Renderer(10);
let keyboard = new Keyboard();
let speaker = new Speaker();
let cpu = new CPU(renderer, keyboard, speaker);

let loop;

let fps = 60,
  fpsInterval,
  startTime,
  now,
  then,
  elapsed;

function init(rom) {
  fpsInterval = 1000 / fps;
  then = Date.now();
  startTime = then;

  cpu.loadSpritesIntoMemory();
  cpu.loadRom(rom);
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
document.querySelector("#start").addEventListener("click", (event) => {
  // Cancel existing animation frame loop
  if (loop) {
    cancelAnimationFrame(loop);
  }

  // Reinitialize CPU and other components
  renderer = new Renderer(10);
  keyboard = new Keyboard();
  speaker = new Speaker();
  cpu = new CPU(renderer, keyboard, speaker);

  // Get the selected ROM and initialize the game
  const selectedRom =
    document.querySelector("#rom-select").selectedOptions[0].value;
  init(selectedRom);
});
