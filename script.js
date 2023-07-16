const PARTICLES_QTY = 2000;
const MAX_TAIL_LENGTH = 100;
const CELL_SIZE = 10; // canvas width must be divisible by CELL_SIZE without remainder for effect to work correctly
const ZOOM = 0.11;
const CURVE = 16;
const TEXT = "hazadus.ru";
const TEXT_SIZE = "250"; // px
const TEXT_FONT = "Impact";
const TEXT_COLOR = "yellow";

class Particle {
  constructor(effect) {
    this.effect = effect;
    this.vx;
    this.vy;
    this.speedModified = Math.random() * 3 + 1;
    this.angle = 0;
    this.colors = ["#4C026B", "#730D9E", "#9622C7", "#B44AE0", "#CD72F2"];
    this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.reset();
  }

  reset() {
    this.x = Math.floor(Math.random() * effect.width);
    this.y = Math.floor(Math.random() * effect.height);
    this.timer = MAX_TAIL_LENGTH * 2;
    this.history = [{ x: this.x, y: this.y }];
  }

  update() {
    this.timer--;

    if (this.timer >= 1) {
      let cellX = Math.floor(this.x / CELL_SIZE);
      let cellY = Math.floor(this.y / CELL_SIZE);
      let index = cellY * this.effect.columns + cellX;

      if (this.effect.flowField[index]) {
        this.angle = this.effect.flowField[index].colorAngle;
      }

      this.vx = Math.cos(this.angle);
      this.vy = Math.sin(this.angle);

      this.x += this.vx * this.speedModified;
      this.y += this.vy * this.speedModified;

      this.history.push({ x: this.x, y: this.y });
      if (this.history.length > MAX_TAIL_LENGTH) this.history.shift();
    } else if (this.history.length > 1) {
      this.history.shift();
    } else {
      this.reset();
    }
  }

  draw() {
    let context = this.effect.context;
    context.beginPath();
    context.moveTo(this.history[0].x, this.history[0].y);
    this.history.forEach((pos) => context.lineTo(pos.x, pos.y));
    context.strokeStyle = this.color;
    context.stroke();
  }
}

class Effect {
  constructor(canvas) {
    this.canvas = canvas;
    this.particles = [];
    this.rows;
    this.columns;
    this.flowField = [];
    this.debugMode = true;
    this._fps = 0;
    this._prevTimestamp = 0;
    this.configureCanvas();
    this.configureFlowField();

    window.addEventListener("keydown", (event) => {
      if (event.code == "Space") this.debugMode = !this.debugMode;
    });

    window.addEventListener("resize", (event) => {
      this.configureCanvas();
      this.configureFlowField();
    });
  }

  configureCanvas() {
    const ctx = this.canvas.getContext("2d");

    // canvas width must be divisible by CELL_SIZE without remainder for effect to work correctly
    this.canvas.width = window.innerWidth - (window.innerWidth % 10);
    this.canvas.height = window.innerHeight;

    ctx.fillStyle = "blue";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.font = "normal 12pt Courier";
  }

  get width() {
    return this.canvas.width;
  }

  get height() {
    return this.canvas.height;
  }

  get context() {
    return this.canvas.getContext("2d");
  }

  clearCanvas() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  configureFlowField() {
    this.rows = Math.floor(this.height / CELL_SIZE);
    this.columns = Math.floor(this.width / CELL_SIZE);
    this.flowField = [];

    // Draw text once, then scan pixel data to check whick cells of the flow field
    // are lying inside the text
    this.drawText();
    const pixels = this.context.getImageData(0, 0, this.width, this.height).data;
    // `pixels` is flat array, filled with four rgba() values for each pixel (red, green, blue, opacity).

    // Build the flow field based on the text pixels
    for (let y = 0; y < this.height; y += CELL_SIZE) {
      for (let x = 0; x < this.width; x += CELL_SIZE) {
        // Calculate index for this point inside `pixels` array. `* 4` because there's 4 values
        // for each pixel (r,g,b,opacity).
        const index = (y * this.width + x) * 4;
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const alpha = pixels[index + 3];

        // Convert color to grayscale
        const grayscale = (red + green + blue) / 3;

        // Convert color (0...255) to angle value (0...6.28) radians (360 degrees)
        const colorAngle = ((grayscale / 255) * 6.28).toFixed(2);

        this.flowField.push({
          x: x,
          y: y,
          colorAngle: colorAngle,
        });
      }
    }
  }

  createParticles() {
    for (let i = 0; i < PARTICLES_QTY; i++) {
      this.particles.push(new Particle(this));
    }
  }

  handleParticles() {
    this.particles.forEach((particle) => {
      particle.draw();
      particle.update();
    });
  }

  handleFPS(timestamp) {
    // Calculate and print FPS
    this._fps = Math.round(1000 / (timestamp - this._prevTimestamp));
    this._prevTimestamp = timestamp;
    this.context.fillText(this._fps + " fps", 8, 16);
  }

  drawText() {
    this.context.save();
    // Make text size responsive and dependent on canvas width.
    this.context.font = `${TEXT_SIZE}px ${TEXT_FONT}`;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillStyle = TEXT_COLOR;
    this.context.fillText(TEXT, this.width / 2, this.height / 2);
    this.context.restore();
  }

  drawGrid() {
    this.context.save();
    this.context.strokeStyle = "gray";
    this.context.lineWidth = 0.2;

    for (let col = 1; col < this.columns + 1; col++) {
      this.context.beginPath();
      this.context.moveTo(CELL_SIZE * col, 0);
      this.context.lineTo(CELL_SIZE * col, this.height);
      this.context.stroke();
    }
    for (let row = 1; row < this.rows + 1; row++) {
      this.context.beginPath();
      this.context.moveTo(0, CELL_SIZE * row);
      this.context.lineTo(this.width, CELL_SIZE * row);
      this.context.stroke();
    }

    this.context.restore();
  }

  renderFrame(timestamp) {
    this.clearCanvas();

    if (this.debugMode) {
      this.drawGrid();
      this.handleFPS(timestamp);
      this.drawText();
    }

    this.handleParticles();
  }
}

// Entry point
const effect = new Effect(document.getElementById("canvas1"));
effect.createParticles();

function animate(timestamp) {
  effect.renderFrame(timestamp);
  window.requestAnimationFrame(animate);
}

window.requestAnimationFrame(animate);
