export class SnowSystem {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.flakes = [];
    this.flakeCount = 200;
    this.animationFrameId = null;
    this.width = 0;
    this.height = 0;
    this.mouse = { x: -1000, y: -1000 };
  }

  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'snow-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    
    document.body.appendChild(this.canvas);
    this.boundResize = this.resize.bind(this);
    window.addEventListener('resize', this.boundResize);
    this.resize();
    this.boundMouseMove = (e) => {
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        this.mouse.x = clientX;
        this.mouse.y = clientY;
    };
    
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('touchmove', this.boundMouseMove, { passive: true });
    window.addEventListener('touchstart', this.boundMouseMove, { passive: true });
    this.createFlakes(); 
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
        speedX: Math.random() * 1 - 0.5,
        speedY: Math.random() * 3 + 1,
        radius: Math.random() * 3 + 1
      });
    }
  }

  update() {
    for (let i = 0; i < this.flakeCount; i++) {
      let flake = this.flakes[i];
      flake.y += flake.speedY;
      flake.x += Math.sin(flake.y * 0.01) * 0.5 + flake.speedX;
      const dx = flake.x - this.mouse.x;
      const dy = flake.y - this.mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const interactionRadius = 250;

      if (dist < interactionRadius) {
          const force = (interactionRadius - dist) / interactionRadius;
          const angle = Math.atan2(dy, dx);
          flake.x += Math.cos(angle) * force * 15;
          flake.y += Math.sin(angle) * force * 15;
      }

      if (flake.y > this.height) {
        flake.y = -5;
        flake.x = Math.random() * this.width;
      }
      if (flake.x > this.width) flake.x = 0;
      if (flake.x < 0) flake.x = this.width;
    }
  }

  draw() {
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
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('touchmove', this.boundMouseMove);
    window.removeEventListener('touchstart', this.boundMouseMove);
    if (this.canvas) this.canvas.remove();
  }
}