/// Testing Class Otimization
const inicial = process.memoryUsage().heapUsed;

/// Gerenciador de Particulas
//
class ParticleSystem {
    constructor(length) {
        this.count = 0;
        this.length = length ?? 1;
        this.buffer = {
            x: new Float32Array(this.length),
            y: new Float32Array(this.length),
            vx: new Float32Array(this.length),
            vy: new Float32Array(this.length),
            mass: new Float32Array(this.length),
            friction: new Float32Array(this.length),
            restitution: new Float32Array(this.length),
            radius: new Float32Array(this.length),
            fill: new Uint32Array(this.length),
            stroke: new Uint32Array(this.length),
            sLength: new Float32Array(this.length),
            config: new Uint8Array(this.length),
        }
    }

    // Redimenciona Buffers
    resize() {
        this.length *= (this.length > 1024 ? 1.5 : 2); // atualizar o comprimento dos arrays
        this.buffer = {
            x: new Float32Array(this.length),
            y: new Float32Array(this.length),
            vx: new Float32Array(this.length),
            vy: new Float32Array(this.length),
            mass: new Float32Array(this.length),
            friction: new Float32Array(this.length),
            restitution: new Float32Array(this.length),
            radius: new Float32Array(this.length),
            fill: new Uint32Array(this.length),
            stroke: new Uint32Array(this.length),
            sLength: new Float32Array(this.length),
            config: new Uint8Array(this.length),
        }
    }

    // Adiciona um Novo Objeto
    push({ pos, speed, mass, friction, restitution, radius, fill, stroke, config }) {
        this.count++; // Nova quantidade de objetos
        if (this.count > this.length) this.resize(); // Redimenciona caso tenha mais objetos que o suportado

        // Cria novo objeto => (0 + 1) - 1 => 0 => primeiro objeto
        const offset = this.count - 1;
        this.buffer.x[offset] = pos?.x || 0;
        this.buffer.y[offset] = pos?.y || 0;
        this.buffer.vx[offset] = speed?.x || 0;
        this.buffer.vy[offset] = speed?.y || 0;
        this.buffer.mass[offset] = mass ?? 1;
        this.buffer.friction[offset] = friction ?? .001;
        this.buffer.restitution[offset] = restitution ?? .9;
        this.buffer.radius[offset] = radius ?? 5;
        this.buffer.fill[offset] = fill || 0xffffffff;
        this.buffer.stroke[offset] = stroke?.color || 0x000000ff;
        this.buffer.sLength[offset] = stroke?.length || 1;
        this.buffer.config[offset] = config || 0x00;
    }

    // STATIC (Bit 0 / Valor 1)
    getIsStatic(id) { return (this.buffer.config[id] & 1) !== 0; }
    setIsStatic(id, v) {
        if (v) this.buffer.config[id] |= 1;  // Liga o bit 0
        else this.buffer.config[id] &= ~1;  // Desliga o bit 0
    }

    // SENSOR (Bit 1 / Valor 2)
    getIsSensor(id) { return (this.buffer.config[id] & 2) !== 0; }
    setIsSensor(id, v) {
        if (v) this.buffer.config[id] |= 2;  // Liga o bit 1
        else this.buffer.config[id] &= ~2;  // Desliga o bit 1
    }

    // Aplica Força a um objeto com base força * tempo
    apllyForce(id, fx, fy, dt) {
        if (this.getIsStatic(id)) return;
        this.buffer.vx[id] += fx * dt;
        this.buffer.vy[id] += fy * dt; 
    }
    
    // Atualiza posição com base na velocidade * tempo
    update(id, dt) {
        if (this.getIsStatic(id)) return;
        this.buffer.x[id] += this.buffer.vx[id] * dt;
        this.buffer.y[id] += this.buffer.vy[id] * dt; 
    }

    // Executa Apenas as particulas existentes
    forEach(action = (id) => null) {
        for (let i = 0; i < this.count; i++) action(i);
    }
}

// Simulando 1 frame
const particles = new ParticleSystem(100000); // geran 0 particulas && Grenciador de Particulas
const dt = .0016;

console.time('[time]');

particles.push({});
particles.forEach((_) => {
    particles.apllyForce(_, 0, 0, dt)
    particles.update(_, dt);
}); // 1.ms/+

console.timeEnd('[time]');
console.log(`[memory]: ${((process.memoryUsage().heapUsed - inicial) / 10000).toFixed(1)} bytes`);
console.log(`[count]: ${particles.count}/${particles.length}`);


// -30/40 ms Caso nao 'existam ~10k/+' particulas 
// ~30/40 ms | ~1.5 bytes | -Complexo