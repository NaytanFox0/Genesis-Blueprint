/// CanvasJS.js
//
/// Shader Sources
const vShaderSrc = `
/// vShaderSrc.glsl
//
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_pos;        // Posição central do círculo (pixels)
attribute float a_radius;    // Raio do círculo (pixels)
attribute vec4 a_fillColor;
attribute vec4 a_strokeColor;
attribute float a_strokeWidth;

uniform vec2 u_resolution; // Tamanho do canvas (largura, altura)

varying vec2 v_uv;           // Passa a coordenada local para o Fragment Shader
varying float v_radius;      // DEVE ser declarado aqui
varying vec4 v_fillColor;    //
varying vec4 v_strokeColor;  //
varying float v_strokeWidth; // DEVE ser declarado aqui

void main() {
  // Calcula o tamanho total necessário (raio + borda)
  float totalSize = a_radius + a_strokeWidth;

  // Mapeia os pontos do buffer para o tamanho e posição corretos
  vec2 realPos = a_position * totalSize + a_pos;

  // Converte pixels para o espaço do WebGL (-1.0 a 1.0)
  vec2 zeroToTwo = (realPos / u_resolution) * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1); // Inverte Y para o topo ser 0
  v_uv = a_position;             // Coordenada de -1.0 a 1.0
  v_radius = a_radius;           // Passando para o fragment shader
  v_fillColor = a_fillColor;     // Passando para o fragment shader
  v_strokeColor = a_strokeColor;
  v_strokeWidth = a_strokeWidth; // Passando para o fragment shader
}
`;
//
const fShaderSrc = `
/// fShaderSrc.glsl
//
precision mediump float;

varying vec2 v_uv;
varying float v_radius;
varying vec4 v_fillColor;
varying vec4 v_strokeColor;
varying float v_strokeWidth;

void main() {
    float dist = length(v_uv);

    // Define os limites das áreas (tudo ou nada, sem suavização)
    float innerLimit = (v_radius - v_strokeWidth) / v_radius;
    float outerLimit = 1.0; // Fim do 'quadrado' de desenho

    // Usa 'step' para decidir a cor de forma binária
    // step(borda_dura, valor_atual): retorna 0.0 ou 1.0
    float isInsideFill = step(dist, innerLimit);
    float isInsideStroke = step(dist, outerLimit);

    // Define a cor final baseada na lógica
    vec4 color;
    if(isInsideFill == 1.0) {
        color = v_fillColor;
    } else if(isInsideStroke == 1.0) {
        color = v_strokeColor;
    } else {
        discard; // Fora do círculo, não pinta nada
    }

    gl_FragColor = color;
}
`;
//
/// Program Creation
function program(gl, vSrc, fSrc) {
    const p = gl.createProgram();
    [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach((tipo, i) => {
        const s = gl.createShader(tipo);
        gl.shaderSource(s, i === 0 ? vSrc : fSrc);
        gl.compileShader(s);

        // Check for compilation errors
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error("[webGL][Shaders] Erro:", gl.getShaderInfoLog(s));
            gl.deleteShader(s);
            return;
        }

        gl.attachShader(p, s);
    });
    gl.linkProgram(p);
    // Check for linking errors
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error("[webGL][Program] Erro:", gl.getProgramInfoLog(p));
    return p;
}
//
/// Hex to RGBA
function HexToRGBA(hex) {
    const r = ((hex >>> 24) & 0xFF) / 255;
    const g = ((hex >>> 16) & 0xFF) / 255;
    const b = ((hex >>> 8) & 0xFF) / 255;
    const a = (hex & 0xFF) / 255;
    return [r, g, b, a];
}
//
/// Class Definition
class CanvasJS extends HTMLCanvasElement {
    constructor() {
        super();

        /// Initialize properties extended
        //
        /// WebGL Context
        this.ctx = this.getContext('webgl');
        if (!this.ctx) {
            alert("WebGL not supported");
            throw new Error("WebGL not supported")
        }
        // Set default clear color and blend mode
        this.ctx.clearColor(0.0, 0.0, 0.0, 1.0);
        this.ctx.enable(this.ctx.BLEND);
        this.ctx.blendFunc(this.ctx.SRC_ALPHA, this.ctx.ONE_MINUS_SRC_ALPHA, this.ctx.ONE, this.ctx.ONE_MINUS_SRC_ALPHA);

        // Create and use program
        const prog = program(this.ctx, vShaderSrc, fShaderSrc);
        this.ctx.useProgram(prog);

        // 
        this.ext = this.ctx.getExtension('ANGLE_instanced_arrays');
        if (!this.ext) throw new Error("Instancing not supported");

        // Create buffer
        const buffer = this.ctx.createBuffer();
        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, buffer);
        const vertices = new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]);
        this.ctx.bufferData(this.ctx.ARRAY_BUFFER, vertices, this.ctx.STATIC_DRAW);

        // Link attributes
        const aPos = this.ctx.getAttribLocation(prog, "a_position");
        this.ctx.enableVertexAttribArray(aPos);
        this.ctx.vertexAttribPointer(aPos, 2, this.ctx.FLOAT, false, 0, 0);

        this.instanceBuffer = this.ctx.createBuffer();
        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.instanceBuffer);

        // Definimos o layout dos dados: [x, y, radius, strokeWidth, r, g, b, a...]
        const stride = 48; // 12 floats = 32 bytes por partícula

        // Atributo: a_pos (vec2)
        const a_posLoc = this.ctx.getAttribLocation(prog, "a_pos");
        this.ctx.enableVertexAttribArray(a_posLoc);
        this.ctx.vertexAttribPointer(a_posLoc, 2, this.ctx.FLOAT, false, stride, 0);
        this.ext.vertexAttribDivisorANGLE(a_posLoc, 1); // Muda 1 vez por instância

        // Atributo: a_radius (float)
        const a_radLoc = this.ctx.getAttribLocation(prog, "a_radius");
        this.ctx.enableVertexAttribArray(a_radLoc);
        this.ctx.vertexAttribPointer(a_radLoc, 1, this.ctx.FLOAT, false, stride, 8); // offset 8
        this.ext.vertexAttribDivisorANGLE(a_radLoc, 1);

        // Atributo: a_strokeWidth (float)
        const a_stkLoc = this.ctx.getAttribLocation(prog, "a_strokeWidth");
        this.ctx.enableVertexAttribArray(a_stkLoc);
        this.ctx.vertexAttribPointer(a_stkLoc, 1, this.ctx.FLOAT, false, stride, 12); // offset 12
        this.ext.vertexAttribDivisorANGLE(a_stkLoc, 1);

        // Atributo: a_fillColor (vec4)
        const a_fillLoc = this.ctx.getAttribLocation(prog, "a_fillColor");
        this.ctx.enableVertexAttribArray(a_fillLoc);
        this.ctx.vertexAttribPointer(a_fillLoc, 4, this.ctx.FLOAT, false, stride, 16); // offset 16
        this.ext.vertexAttribDivisorANGLE(a_fillLoc, 1);

        const a_strkCLoc = this.ctx.getAttribLocation(prog, "a_strokeColor");
        this.ctx.enableVertexAttribArray(a_strkCLoc);
        this.ctx.vertexAttribPointer(a_strkCLoc, 4, this.ctx.FLOAT, false, stride, 32); // Offset 32
        this.ext.vertexAttribDivisorANGLE(a_strkCLoc, 1);

        // Get uniform locations (apenas os que não mudam por partícula)
        this.locs = {
            res: this.ctx.getUniformLocation(prog, "u_resolution")
        };

        // Get uniform locations
        this.locs = {
            res: this.ctx.getUniformLocation(prog, "u_resolution"),
        };

        /// Time properties
        this.timers = new Map();
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;

        /// Bindings
        this.run = this.run.bind(this);
        this.resize = this.resize.bind(this);
        this.main = function () { };

        /// Initial resize
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // Set background color
    set background(color) {
        this.ctx.clearColor(...HexToRGBA(color));
    }

    // 
    countdown(id, delay, action) {
        if (!this.timers) this.timers = new Map();
        if (!this.timers.has(id)) this.timers.set(id, 0);

        let currentTime = this.timers.get(id) + this.deltaTime;
        if (currentTime >= delay) {
            action();
            currentTime = 0;
        }

        this.timers.set(id, currentTime);
    }

    // Darw particles
    renderBatch(particles) {
        if (particles.length === 0) return;

        // 12 floats por partícula: [x, y, radius, strokeW, r,g,b,a (fill), r,g,b,a (stroke)]
        const data = new Float32Array(particles.length * 12);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const offset = i * 12;

            // Conversão de cores (CPU side)
            const fCol = HexToRGBA(p.fill);
            const sCol = HexToRGBA(p.stroke.color);

            // Dados Espaciais
            data[offset] = p.pos.x;
            data[offset + 1] = p.pos.y;
            data[offset + 2] = p.radius;

            // Note: usei 'lenght' pois é como está no seu constructor de Particle
            data[offset + 3] = p.stroke.length;

            // Fill Color (Varying v_fillColor)
            data[offset + 4] = fCol[0];
            data[offset + 5] = fCol[1];
            data[offset + 6] = fCol[2];
            data[offset + 7] = fCol[3];

            // Stroke Color (Varying v_strokeColor)
            data[offset + 8] = sCol[0];
            data[offset + 9] = sCol[1];
            data[offset + 10] = sCol[2];
            data[offset + 11] = sCol[3];
        }

        // Bind e Upload para a GPU
        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.instanceBuffer);
        this.ctx.bufferData(this.ctx.ARRAY_BUFFER, data, this.ctx.DYNAMIC_DRAW);

        // Atualiza a resolução (uniform) apenas uma vez por frame
        this.ctx.uniform2f(this.locs.res, this.width, this.height);

        // Chamada de Instanciamento
        this.ext.drawArraysInstancedANGLE(this.ctx.TRIANGLES, 0, 6, particles.length);
    }


    // Resize Canvas
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.ctx.viewport(0, 0, this.width, this.height);
    }

    // Main Loop
    run(time) {
        // Clear Canvas
        this.ctx.clear(this.ctx.COLOR_BUFFER_BIT);

        // Update time
        this.deltaTime = this.lastTime ? (time - this.lastTime) / 1000 : 0.016;
        canvas.countdown('fps', .1, () => { this.fps = this.deltaTime > 0 ? 1 / this.deltaTime : 0});
        this.lastTime = time;

        // Logic and Render
        this.main();

        requestAnimationFrame(this.run); // next frame
    }

};
customElements.define('canvas-js', CanvasJS, { extends: 'canvas' }); // Extend HTMLCanvasElement
//
//