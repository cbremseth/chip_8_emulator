class Renderer {
  constructor(scale) {
    //set the default height and width according to specs
    this.cols = 64;
    this.rows = 32;
    //initialize scale
    this.scale = scale;
    //get canvas and set context
    this.canvas = document.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    //adjust the canvas height and width according to scale factor
    this.canvas.width = this.cols * this.scale;
    this.canvas.height = this.rows * this.scale;
    //create display
    this.display = new Array(this.cols * this.rows);
  }

  setPixel(x, y) {
    //locate pixel horizontally, handling wrap if necessary
    if (x > this.cols) {
      x -= this.cols;
    } else if (x < 0) {
      x += this.cols;
    }
    //locate pixel vertically, handling wrap if necessary
    if (y > this.rows) {
      y -= this.rows;
    } else if (y < 0) {
      y += this.rows;
    }
    //get true pixel location
    let pixelLocation = x + y * this.cols;
    //toggle pixel value on screen
    this.display[pixelLocation] ^= 1;

    return !this.display[pixelLocation];
  }
  clear() {
    //clear entire display
    this.display = new Array(this.cols * this.rows);
  }
  render() {
    //clear the display
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    //loop through display array
    for (let i = 0; i < this.cols * this.rows; i++) {
      //get the x position of the pixel
      let x = (i % this.cols) * this.scale;
      //get the y position of the pixel
      let y = Math.floor(i / this.cols) * this.scale;
      //if that pixel should be set
      if (this.display[i]) {
        //set the pixel color to black
        this.ctx.fillStyle = "#000";
        //place pixel based on scale
        this.ctx.fillRect(x, y, this.scale, this.scale);
      }
    }
  }
  testRender() {
    this.setPixel(0, 0);
    this.setPixel(5, 2);
  }
}

export default Renderer;
