export class SnowSystem {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.flakes = [];
    this.flakeCount = 200; // Number of snowflakes
    this.animationFrameId = null;
    this.width = 0;
    this.height = 0;
  }

  init() {
    // 1. Create and append the canvas dynamically
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'snow-canvas';
    this.ctx = this.canvas.getContext('2d');
    
    // 2. Set canvas styles via JS (or move to CSS) to ensure it's an overlay
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none'; // Crucial: lets clicks pass through to your app
    this.canvas.style.zIndex = '9999'; // On top of everything
    
    document.body.appendChild(this.canvas);

    // 3. Handle resizing
    this.boundResize = this.resize.bind(this);
    window.addEventListener('resize', this.boundResize);
    this.resize();

    // 4. Create particles
    this.createFlakes();

    // 5. Start the loop
    this.loop();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  createFlakes() {
    this.flakes = [];
    for (let i = 0; i < this.flakeCount; i++) {
      this.flakes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        opacity: Math.random(),
        speedX: Math.random() * 1 - 0.5, // Slight horizontal drift
        speedY: Math.random() * 3 + 1,   // Falling speed (Gravity)
        radius: Math.random() * 3 + 1    // Size of flake
      });
    }
  }

  update() {
    for (let i = 0; i < this.flakeCount; i++) {
      let flake = this.flakes[i];

      // Physics: Apply Gravity
      flake.y += flake.speedY;
      
      // Physics: Apply Wind (Sine wave for swaying)
      // x(t) = x_0 + \sin(t)
      flake.x += Math.sin(flake.y * 0.01) * 0.5 + flake.speedX;

      // Reset if off screen
      if (flake.y > this.height) {
        flake.y = -5;
        flake.x = Math.random() * this.width;
      }
      if (flake.x > this.width) flake.x = 0;
      if (flake.x < 0) flake.x = this.width;
    }
  }

  draw() {
    // Clear the previous frame
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.beginPath();
    
    for (let i = 0; i < this.flakeCount; i++) {
      let flake = this.flakes[i];
      this.ctx.moveTo(flake.x + flake.radius, flake.y);
      this.ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2, true);
    }
    
    this.ctx.fill();
  }

  loop() {
    this.update();
    this.draw();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  destroy() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.boundResize);
    if (this.canvas) this.canvas.remove();
  }
}