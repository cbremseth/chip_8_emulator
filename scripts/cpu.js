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
      //this.speaker.play(440);
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
            //CL - Clear the display.
            this.renderer.clear();
            break;
          case 0x00ee:
            //RET - Return from a subroutine.
            this.pc = this.stack.pop();
            break;
        }

        break;
      case 0x1000:
        //JP addr - Jump to location nnn.
        this.pc = opcode & 0xfff;
        break;
      case 0x2000:
        //CALL addr - Call subroutine at nnn.
        this.stack.push(this.pc);
        this.pc = opcode & 0xfff;
        break;
      case 0x3000:
        // SE Vx, byte - Skip next instruction if Vx = kk.
        if (this.v[x] === (opcode & 0xff)) {
          this.pc += 2;
        }
        break;
      case 0x4000:
        // SNE Vx, byte - Skip next instruction if Vx != kk.
        if (this.v[x] !== (opcode & 0xff)) {
          this.pc += 2;
        }
        break;
      case 0x5000:
        // SE Vx, Vy - Skip next instruction if Vx = Vy.
        if (this.v[x] === this.v[y]) {
          this.pc += 2;
        }
        break;
      case 0x6000:
        // LD Vx, byte - Set Vx = kk.
        this.v[x] = opcode & 0xff;
        break;
      case 0x7000:
        // ADD Vx, byte - Set Vx = Vx + kk.
        this.v[x] += opcode & 0xff;
        break;
      case 0x8000:
        switch (opcode & 0xf) {
          case 0x0:
            // LD Vx, Vy - Set Vx = Vy.
            this.v[x] = this.v[y];
            break;
          case 0x1:
            // OR Vx, Vy - Set Vx = Vx OR Vy.
            this.v[x] |= this.v[y];
            break;
          case 0x2:
            // AND Vx, Vy - Set Vx = Vx AND Vy.
            this.v[x] &= this.v[y];
            break;
          case 0x3:
            // XOR Vx, Vy - Set Vx = Vx XOR Vy.
            this.v[x] ^= this.v[y];
            break;
          case 0x4:
            // ADD Vx, Vy - Set Vx = Vx + Vy, set VF = carry.

            let sum = (this.v[x] += this.v[y]);

            this.v[0xf] = 0;

            if (sum > 0xff) {
              this.v[0xf] = 1;
            }

            this.v[x] = sum;
            break;
          case 0x5:
            // SUB Vx, Vy - Set Vx = Vx - Vy, set VF = NOT borrow.
            this.v[0xf] = 0;

            if (this.v[x] > this.v[y]) {
              this.v[0xf] = 1;
            }

            this.v[x] -= this.v[y];
            break;
          case 0x6:
            // SHR Vx {, Vy} - Set Vx = Vx SHR 1.
            this.v[0xf] = this.v[x] & 0x1;

            this.v[x] >>= 1;
            break;
          case 0x7:
            // SUBN Vx, Vy - Set Vx = Vy - Vx, set VF = NOT borrow.
            this.v[0xf] = 0;

            if (this.v[y] > this.v[x]) {
              this.v[0xf] = 1;
            }

            this.v[x] = this.v[y] - this.v[x];
            break;
          case 0xe:
            // SHL Vx {, Vy} - Set Vx = Vx SHL 1.
            this.v[0xf] = this.v[x] & 0x80;
            this.v[x] <<= 1;
            break;
        }

        break;
      case 0x9000:
        // SNE Vx, Vy - Skip next instruction if Vx != Vy.
        if (this.v[x] !== this.v[y]) {
          this.pc += 2;
        }
        break;
      case 0xa000:
        // LD I, addr - Set I = nnn.
        this.i = opcode & 0xfff;
        break;
      case 0xb000:
        // JP V0, addr - Jump to location nnn + V0.
        this.pc = (opcode & 0xfff) + this.v[0];
        break;
      case 0xc000:
        // RND Vx, byte - Set Vx = random byte AND kk.
        let rand = Math.floor(Math.random() * 0xff);

        this.v[x] = rand & (opcode & 0xff);
        break;
      case 0xd000:
        // DRW Vx, Vy, nibble - Display n-byte sprite starting at memory location I at (Vx, Vy), set VF = collision.
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
        // SKP Vx - Skip next instruction if key with the value of Vx is pressed.
        switch (opcode & 0xff) {
          case 0x9e:
            if (this.keyboard.isKeyPressed(this.v[x])) {
              this.pc += 2;
            }
            break;
          case 0xa1:
            // SKNP Vx - Skip next instruction if key with the value of Vx is not pressed.
            if (!this.keyboard.isKeyPressed(this.v[x])) {
              this.pc += 2;
            }
            break;
        }

        break;
      case 0xf000:
        switch (opcode & 0xff) {
          case 0x07:
            // LD Vx, DT - Set Vx = delay timer value.
            this.v[x] = this.delayTimer;
            break;
          case 0x0a:
            // LD Vx, K - Wait for a key press, store the value of the key in Vx.
            this.paused = true;

            this.keyboard.onNextKeyPress = function (key) {
              this.v[x] = key;
              this.paused = false;
            }.bind(this);
            break;
          case 0x15:
            // LD DT, Vx - Set delay timer = Vx.
            this.delayTimer = this.v[x];
            break;
          case 0x18:
            // LD ST, Vx - Set sound timer = Vx.
            this.soundTimer = this.v[x];
            break;
          case 0x1e:
            // ADD I, Vx - Set I = I + Vx.
            this.i += this.v[x];
            break;
          case 0x29:
            // LD F, Vx - Set I = location of sprite for digit Vx.
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
            // LD [I], Vx - Store registers V0 through Vx in memory starting at location I.
            for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
              this.memory[this.i + registerIndex] = this.v[registerIndex];
            }
            break;
          case 0x65:
            // LD Vx, [I] - Read registers V0 through Vx from memory starting at location I.
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
