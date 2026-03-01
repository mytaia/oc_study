class Particle {
    constructor(x, y, vx, vy, color, size, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.decay = 1 / life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        const size = this.size * alpha;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fillStyle = this.getColorWithAlpha(this.color, alpha);
        ctx.fill();
    }
    
    getColorWithAlpha(color, alpha) {
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color.replace('1)', `${alpha})`);
    }
}

class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.emitters = [];
    }

    clear() {
        this.particles = [];
        this.emitters = [];
    }

    emit(x, y, config) {
        const count = config.count || 30;
        const colors = config.colors || ['rgba(0, 245, 255, 1)', 'rgba(123, 45, 255, 1)'];
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = (config.speed || 3) + Math.random() * (config.speedVariance || 2);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = (config.size || 4) + Math.random() * (config.sizeVariance || 2);
            const life = (config.life || 60) + Math.random() * 20;
            
            this.particles.push(new Particle(x, y, vx, vy, color, size, life));
        }
    }

    emitBurst(x, y, color1, color2) {
        this.emit(x, y, {
            count: 25,
            colors: [color1, color2],
            speed: 4,
            speedVariance: 2,
            size: 3,
            sizeVariance: 2,
            life: 30
        });
    }

    emitTrail(x, y, color) {
        this.particles.push(new Particle(
            x + (Math.random() - 0.5) * 10,
            y + (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            color,
            2 + Math.random() * 2,
            30
        ));
    }

    emitRing(x, y, color1, color2) {
        const count = 40;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 3 + Math.random() * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const color = i % 2 === 0 ? color1 : color2;
            this.particles.push(new Particle(x, y, vx, vy, color, 4, 40));
        }
    }

    emitExplosion(x, y, colors) {
        const count = 30;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 1 + Math.random() * 3;
            const life = 25 + Math.random() * 20;
            this.particles.push(new Particle(x, y, vx, vy, color, size, life));
        }
    }

    emitSparkle(x, y, color) {
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                1 + Math.random() * 2,
                20 + Math.random() * 20
            ));
        }
    }

    update() {
        this.particles = this.particles.filter(p => p.update());
    }

    draw() {
        for (const p of this.particles) {
            p.draw(this.ctx);
        }
    }

    hasParticles() {
        return this.particles.length > 0;
    }
}

class BackgroundParticles {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.connections = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.particleColor = '#00f5ff';
        this.connectionColor = 'rgba(0, 245, 255, 0.1)';
        this.resize();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.particles = [];
        const numParticles = Math.floor((this.canvas.width * this.canvas.height) / 15000);
        for (let i = 0; i < numParticles; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: 1 + Math.random() * 2,
                alpha: 0.3 + Math.random() * 0.5
            });
        }
        this.connections = [];
    }

    setMouse(x, y) {
        this.mouseX = x;
        this.mouseY = y;
    }

    updateThemeColors() {
        const styles = getComputedStyle(document.documentElement);
        this.particleColor = styles.getPropertyValue('--color-primary').trim() || '#00f5ff';
        this.connectionColor = (styles.getPropertyValue('--color-primary').trim() || '#00f5ff') + '1a';
    }

    update() {
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;
        }

        this.connections = [];
        const maxDist = 150;
        
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < maxDist) {
                    this.connections.push({
                        x1: this.particles[i].x,
                        y1: this.particles[i].y,
                        x2: this.particles[j].x,
                        y2: this.particles[j].y,
                        alpha: (1 - dist / maxDist) * 0.3
                    });
                }
            }
        }

        if (this.mouseX > 0 && this.mouseY > 0) {
            for (const p of this.particles) {
                const dx = p.x - this.mouseX;
                const dy = p.y - this.mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 200) {
                    const force = (200 - dist) / 200;
                    p.vx += (dx / dist) * force * 0.1;
                    p.vy += (dy / dist) * force * 0.1;
                }
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = this.connectionColor;
        this.ctx.lineWidth = 1;
        
        for (const c of this.connections) {
            this.ctx.beginPath();
            this.ctx.moveTo(c.x1, c.y1);
            this.ctx.lineTo(c.x2, c.y2);
            this.ctx.strokeStyle = this.particleColor + Math.floor(c.alpha * 255).toString(16).padStart(2, '0');
            this.ctx.stroke();
        }

        for (const p of this.particles) {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = this.particleColor + Math.floor(p.alpha * 255).toString(16).padStart(2, '0');
            this.ctx.fill();
        }

        if (this.mouseX > 0 && this.mouseY > 0) {
            const styles = getComputedStyle(document.documentElement);
            const accentColor = styles.getPropertyValue('--color-accent').trim() || '#7b2dff';
            const gradient = this.ctx.createRadialGradient(
                this.mouseX, this.mouseY, 0,
                this.mouseX, this.mouseY, 150
            );
            gradient.addColorStop(0, accentColor + '1a');
            gradient.addColorStop(1, accentColor + '00');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}
