/// Particle.js
//
class Particle {
    constructor(data = {}, config = {}) {
        // Default physical properties  
        this.pos = data.pos || { x: 0, y: 0 };      // position
        this.speed = data.speed || { x: 0, y: 0 };  // speed 

        // Physical properties
        this.mass = data.mass || 1;                // mass
        this.friction = data.friction || .001;     // friction
        this.restitution = data.restitution || .9; // restitution

        // Visual properties
        this.radius = data.radius || 10;
        this.fill = data.style?.fill || 0xffffffff;
        this.stroke = data.style?.stroke || { color: 0x000000ff, lenght: 1 };

        // Configuration
        this.config = config || { isStatic: false, isSensor: false };
    }

    isDead({ w, h }) {
        return (this.pos.x < -this.radius || this.pos.x > w + this.radius || this.pos.y < -this.radius || this.pos.y > h + this.radius);
    }

    apllyForce(force, dt) {
        // Update speed based on applied force
        if (!this.config.isStatic) {
            this.speed.x += force.x * dt;
            this.speed.y += force.y * dt;
        }
    }

    update(dt) {
        // Update position based on speed
        if (!this.config.isStatic) {
            this.pos.x += this.speed.x * dt;
            this.pos.y += this.speed.y * dt;
        }
    }
}

/// Utils.js
//
const random = ({ min, max, type = 'i' }) => {
    if (type === 'i') {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    } else if (type === 'f') {
        return Math.random() * (max - min) + min;
    } else if (type === 'h') {
        return (Math.random() * 0xFFFFFFFF) >>> 0;
    } else {
        // Lança um erro que para a execução e avisa o desenvolvedor
        throw new Error("Tipo de randomização inválido. Use um tipo existente. ['i', 'f', 'h']");
    }
};

/// main.js
//
// Incializations
const canvas = document.getElementById('canvas');
canvas.background = 0x5293e2e2;

// UI Param
const st = document.getElementById('status');

// Particle System
let particles = [];
let particlesView = [];

// Update Function
canvas.main = function () {
    // Updates
    if (particles.length < 50000) Array.from({ length: 100 }).forEach(() => {
        particles.push(new Particle({
            pos: { x: canvas.width / 2, y: canvas.height / 2 },
            speed: { x: random({ min: -20, max: 20, type: 'f' }), y: random({ min: -20, max: 20, type: 'f' }) },
            radius: random({ min: 3, max: 6 }),
            style: {
                fill: random({ type: 'h' }),
                stroke: {
                    length: 1,
                    color: random({ type: 'h' }),
                }
            }
        }))
    });
    particlesView = particles.filter((particle) => { 
        particle.update(this.deltaTime);
        return !particle.isDead({w:canvas.width, h:canvas.height});
    });

    st.textContent = `FPS: ${canvas.fps.toFixed(2)} Particles: ${particlesView.length}/${particles.length}`;

    // Renderings
    canvas.renderBatch(particlesView);
};

// Start the loop
canvas.run();