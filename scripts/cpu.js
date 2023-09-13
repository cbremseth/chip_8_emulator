class CPU {
  constructor(renderer, keyboard, speaker) {
    this.renderer = renderer;
    this.keyboard = keyboard;
    this.speaker = speaker;

    // initialize 4KB of memory
    this.memory = new Uint8Array(4096);

    // initialize 16 registers
    this.v = new Uint8Array(16);

    // store memory addresses
    this.i = 0;

    // timers
    this.delayTimer = 0;
    this.soundTimer = 0;

    // initialize program counter at 0x200 for start of ROM
    this.pc = 0x200;

    // initialize call stack
    this.stack = new Array();

    this.paused = false;

    //handle speed. default is 10 but may be too fast for some roms
    this.speed = 5;
  }

  loadSpritesIntoMemory() {
    // sprite listing from technical reference
    const sprites = [
      0xf0,
      0x90,
      0x90,
      0x90,
      0xf0, // 0
      0x20,
      0x60,
      0x20,
      0x20,
      0x70, // 1
      0xf0,
      0x10,
      0xf0,
      0x80,
      0xf0, // 2
      0xf0,
      0x10,
      0xf0,
      0x10,
      0xf0, // 3
      0x90,
      0x90,
      0xf0,
      0x10,
      0x10, // 4
      0xf0,
      0x80,
      0xf0,
      0x10,
      0xf0, // 5
      0xf0,
      0x80,
      0xf0,
      0x90,
      0xf0, // 6
      0xf0,
      0x10,
      0x20,
      0x40,
      0x40, // 7
      0xf0,
      0x90,
      0xf0,
      0x90,
      0xf0, // 8
      0xf0,
      0x90,
      0xf0,
      0x10,
      0xf0, // 9
      0xf0,
      0x90,
      0xf0,
      0x90,
      0x90, // A
      0xe0,
      0x90,
      0xe0,
      0x90,
      0xe0, // B
      0xf0,
      0x80,
      0x80,
      0x80,
      0xf0, // C
      0xe0,
      0x90,
      0x90,
      0x90,
      0xe0, // D
      0xf0,
      0x80,
      0xf0,
      0x80,
      0xf0, // E
      0xf0,
      0x80,
      0xf0,
      0x80,
      0x80, // F
    ];

    // sprites are loaded into memory starting at 0x000
    for (let i = 0; i < sprites.length; i++) {
      this.memory[i] = sprites[i];
    }
  }

  loadProgramIntoMemory(program) {
    //program gets loaded into memory starting at 0x200
    for (let loc = 0; loc < program.length; loc++) {
      this.memory[0x200 + loc] = program[loc];
    }
  }

  loadRom(romName) {
    var request = new XMLHttpRequest();
    var self = this;

    request.onload = function () {
      if (request.response) {
        // store the contents of the response
        let program = new Uint8Array(request.response);

        // load the ROM into memory
        self.loadProgramIntoMemory(program);
      }
    };

    request.open("GET", "roms/" + romName);
    request.responseType = "arraybuffer";

    // request rom from roms/
    request.send();
  }

  cycle() {
    //execution cycle according to speed
    for (let i = 0; i < this.speed; i++) {
      //only execute instructions if not paused
      if (!this.paused) {
        let opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
        this.executeInstruction(opcode);
      }
    }

    if (!this.paused) {
      this.updateTimers();
    }
    //play any sounds and render screen
    this.playSound();
    this.renderer.render();
  }

  updateTimers() {
    if (this.delayTimer > 0) {
      this.delayTimer -= 1;
    }

    if (this.soundTimer > 0) {
      this.soundTimer -= 1;
    }
  }

  playSound() {
    if (this.soundTimer > 0) {
      this.speaker.play(440);
    } else {
      this.speaker.stop();
    }
  }

  executeInstruction(opcode) {
    // increment program counter by 2 bytes (length of instruction)
    this.pc += 2;

    // get the value of the 2nd nibble and shift it right 8 bits
    let x = (opcode & 0x0f00) >> 8;

    // get the value of the 3rd nibble and shift it right 4 bits
    let y = (opcode & 0x00f0) >> 4;

    switch (opcode & 0xf000) {
      case 0x0000:
        switch (opcode) {
          case 0x00e0:
            this.renderer.clear();
            break;
          case 0x00ee:
            this.pc = this.stack.pop();
            break;
        }

        break;
      case 0x1000:
        this.pc = opcode & 0xfff;
        break;
      case 0x2000:
        this.stack.push(this.pc);
        this.pc = opcode & 0xfff;
        break;
      case 0x3000:
        if (this.v[x] === (opcode & 0xff)) {
          this.pc += 2;
        }
        break;
      case 0x4000:
        if (this.v[x] !== (opcode & 0xff)) {
          this.pc += 2;
        }
        break;
      case 0x5000:
        if (this.v[x] === this.v[y]) {
          this.pc += 2;
        }
        break;
      case 0x6000:
        this.v[x] = opcode & 0xff;
        break;
      case 0x7000:
        this.v[x] += opcode & 0xff;
        break;
      case 0x8000:
        switch (opcode & 0xf) {
          case 0x0:
            this.v[x] = this.v[y];
            break;
          case 0x1:
            this.v[x] |= this.v[y];
            break;
          case 0x2:
            this.v[x] &= this.v[y];
            break;
          case 0x3:
            this.v[x] ^= this.v[y];
            break;
          case 0x4:
            let sum = (this.v[x] += this.v[y]);

            this.v[0xf] = 0;

            if (sum > 0xff) {
              this.v[0xf] = 1;
            }

            this.v[x] = sum;
            break;
          case 0x5:
            this.v[0xf] = 0;

            if (this.v[x] > this.v[y]) {
              this.v[0xf] = 1;
            }

            this.v[x] -= this.v[y];
            break;
          case 0x6:
            this.v[0xf] = this.v[x] & 0x1;

            this.v[x] >>= 1;
            break;
          case 0x7:
            this.v[0xf] = 0;

            if (this.v[y] > this.v[x]) {
              this.v[0xf] = 1;
            }

            this.v[x] = this.v[y] - this.v[x];
            break;
          case 0xe:
            this.v[0xf] = this.v[x] & 0x80;
            this.v[x] <<= 1;
            break;
        }

        break;
      case 0x9000:
        if (this.v[x] !== this.v[y]) {
          this.pc += 2;
        }
        break;
      case 0xa000:
        this.i = opcode & 0xfff;
        break;
      case 0xb000:
        this.pc = (opcode & 0xfff) + this.v[0];
        break;
      case 0xc000:
        let rand = Math.floor(Math.random() * 0xff);

        this.v[x] = rand & (opcode & 0xff);
        break;
      case 0xd000:
        let width = 8;
        let height = opcode & 0xf;

        this.v[0xf] = 0;

        for (let row = 0; row < height; row++) {
          let sprite = this.memory[this.i + row];

          for (let col = 0; col < width; col++) {
            if ((sprite & 0x80) > 0) {
              if (this.renderer.setPixel(this.v[x] + col, this.v[y] + row)) {
                this.v[0xf] = 1;
              }
            }

            sprite <<= 1;
          }
        }
        break;
      case 0xe000:
        switch (opcode & 0xff) {
          case 0x9e:
            if (this.keyboard.isKeyPressed(this.v[x])) {
              this.pc += 2;
            }
            break;
          case 0xa1:
            if (!this.keyboard.isKeyPressed(this.v[x])) {
              this.pc += 2;
            }
            break;
        }

        break;
      case 0xf000:
        switch (opcode & 0xff) {
          case 0x07:
            this.v[x] = this.delayTimer;
            break;
          case 0x0a:
            this.paused = true;

            this.keyboard.onNextKeyPress = function (key) {
              this.v[x] = key;
              this.paused = false;
            }.bind(this);
            break;
          case 0x15:
            this.delayTimer = this.v[x];
            break;
          case 0x18:
            this.soundTimer = this.v[x];
            break;
          case 0x1e:
            this.i += this.v[x];
            break;
          case 0x29:
            this.i = this.v[x] * 5;
            break;
          case 0x33:
            // get the hundreds digit and store it in memory
            this.memory[this.i] = parseInt(this.v[x] / 100);

            // Get tens digit and place it in memory + 1
            this.memory[this.i + 1] = parseInt((this.v[x] % 100) / 10);

            // Get ones digit and place it in memory + 2
            this.memory[this.i + 2] = parseInt(this.v[x] % 10);
            break;
          case 0x55:
            for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
              this.memory[this.i + registerIndex] = this.v[registerIndex];
            }
            break;
          case 0x65:
            for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
              this.v[registerIndex] = this.memory[this.i + registerIndex];
            }
            break;
        }

        break;

      default:
        throw new Error("Unknown opcode " + opcode);
    }
  }
}

export default CPU;
