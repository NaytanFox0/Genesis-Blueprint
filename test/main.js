/// test/main.js
//
/// Renderization
// configuration
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.style.backgroundColor = '#5293e2e2';
//
// Resize canvas to full window size
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize); // on window resize
resize();
//
/// --- Game setup
//
/// Global Consts
//
const dt = 1 / 15; // 15fps
//
/// GUI Elements
//
// configuration card
document.addEventListener('DOMContentLoaded', () => {
    const ficha = document.getElementById('config');
    const cabecalho = document.getElementById('title');

    let isDragging = false;
    let offsetX, offsetY;

    // --- FUNÇÕES GERAIS DE INÍCIO, MOVIMENTO E FIM ---

    // Função para obter as coordenadas X e Y, seja do mouse ou do touch
    function getCoords(e) {
        // Se for um evento touch, usa o primeiro toque (e.touches[0]).
        // Se for um evento mouse, usa o próprio evento (e).
        return e.touches ? e.touches[0] : e;
    }

    // --- INÍCIO (Mouse + Touch) ---
    function startDrag(e) {
        const coords = getCoords(e);

        isDragging = true;

        // Calcula o deslocamento
        offsetX = coords.clientX - ficha.offsetLeft;
        offsetY = coords.clientY - ficha.offsetTop;

        // Evita o scroll padrão da página em dispositivos touch
        e.preventDefault();
        cabecalho.style.cursor = 'grabbing';
    }

    // --- MOVIMENTO (Mouse + Touch) ---
    function drag(e) {
        if (!isDragging) return;

        // Nota: O evento touchmove pode ser disparado mesmo sem e.preventDefault()
        // chamando a função getCoords() diretamente
        const coords = getCoords(e);

        let newX = coords.clientX - offsetX;
        let newY = coords.clientY - offsetY;

        ficha.style.left = newX + 'px';
        ficha.style.top = newY + 'px';
    }

    // --- FIM (Mouse + Touch) ---
    function endDrag() {
        isDragging = false;
        cabecalho.style.cursor = 'grab';
    }

    // --- ANEXANDO OS EVENTOS ---

    // MOUSE
    cabecalho.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    // TOUCH
    cabecalho.addEventListener('touchstart', startDrag, { passive: false }); // { passive: false } necessário para e.preventDefault()
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);
});
//
// Get sliders
const sliderAcceleration = { x: document.getElementById('slide-acceleration-x'), y: document.getElementById('slide-acceleration-y') };
const sliderMass = document.getElementById('slide-mass');
const sliderFriction = document.getElementById('slide-friction');
const sliderRestitutio = document.getElementById('slide-restitutio');
const sliderRadius = document.getElementById('slide-radius');
//
// Get selects
const selectObjectSummon = document.getElementById('select-type');
//
// Set up slider value displays
const displayAcceleration = { x: document.getElementById('value-acceleration-x'), y: document.getElementById('value-acceleration-y') };
const displayMass = document.getElementById('value-mass');
const displayFriction = document.getElementById('value-friction');
const displayRestitutio = document.getElementById('value-restitutio');
const displayRadius = document.getElementById('value-radius');
const displayCountBalls = document.getElementById('count-balls');
const displayCountSprings = document.getElementById('count-springs');
//
/// GameObjects
//
// Create circle
d = 30
let balls = [
    // box
    new Circle(canvas.width / 2 - d, canvas.height / 2 - d, 5, 'white'),
    new Circle(canvas.width / 2 + d, canvas.height / 2 - d, 5, 'white'),
    new Circle(canvas.width / 2 + d, canvas.height / 2 + d, 5, 'white'),
    new Circle(canvas.width / 2 - d, canvas.height / 2 + d, 5, 'white'),

    // rope
    new Circle(canvas.width / 1.5, canvas.height / 2, 5, 'white', stroke = null, mass = 1, friction = .001, restitution = .9, canCollide = false, canMove = false),
    new Circle(canvas.width / 1.5, canvas.height / 2 + d, 5, 'white'),
    new Circle(canvas.width / 1.5, canvas.height / 2 + d * 2, 5, 'white'),
    new Circle(canvas.width / 1.5, canvas.height / 2 + d * 3, 5, 'white'),
];
//
// Make nodes
const M = Math.min(canvas.width, canvas.height) / 5; //
let springs = [
    // box
    new Spring(balls[0], balls[1]),
    new Spring(balls[1], balls[2]),
    new Spring(balls[2], balls[3]),
    new Spring(balls[3], balls[0]),
    new Spring(balls[0], balls[2]),
    new Spring(balls[1], balls[3]),

    // rope
    new Spring(balls[4], balls[5]),
    new Spring(balls[5], balls[6]),
    new Spring(balls[6], balls[7]),

    // Walls (Barreiras)
    new Spring(new Circle(M, 0, stroke = { color: 'red', width: 4 }), new Circle(canvas.width - M, 0, stroke = { color: 'red', width: 4 })),
    new Spring(new Circle(canvas.width - M, 0, stroke = { color: 'red', width: 4 }), new Circle(canvas.width, M, stroke = { color: 'red', width: 4 })),
    new Spring(new Circle(canvas.width, M, stroke = { color: 'red', width: 4 }), new Circle(canvas.width, canvas.height - M, stroke = { color: 'red', width: 4 })),
    new Spring(new Circle(canvas.width, canvas.height - M, stroke = { color: 'red', width: 4 }), new Circle(canvas.width - M, canvas.height, stroke = { color: 'red', width: 4 })),
    new Spring(new Circle(canvas.width - M, canvas.height, stroke = { color: 'red', width: 4 }), new Circle(M, canvas.height, stroke = { color: 'red', width: 4 })),
    new Spring(new Circle(M, canvas.height, stroke = { color: 'red', width: 4 }), new Circle(0, canvas.height - M, stroke = { color: 'red', width: 4 })),
    new Spring(new Circle(0, canvas.height - M, stroke = { color: 'red', width: 4 }), new Circle(0, M, stroke = { color: 'red', width: 4 })),
    new Spring(new Circle(0, M, stroke = { color: 'red', width: 4 }), new Circle(M, 0, stroke = { color: 'red', width: 4 }))
];
//
/// Main loop
//
function loop() {
    /// Update loop
    //
    // Update circle
    for (let ball of balls) {
        // Set Data
        ball.ax = parseFloat(sliderAcceleration.x.value);
        ball.ay = parseFloat(sliderAcceleration.y.value);

        ball.mass = parseFloat(sliderMass.value);
        ball.friction = parseFloat(sliderFriction.value);
        ball.restitution = parseFloat(sliderRestitutio.value);

        ball.radius = parseFloat(sliderRadius.value);

        // Physical management of the object
        ball.simulation(springs, balls, dt);
    }
    for (let node of springs) node.simulate();
    /// Renderization loop
    //
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //
    // Update UI
    displayCountBalls.textContent = balls.length;
    displayCountSprings.textContent = springs.length;

    // Render Objects
    for (const b of balls) b.draw(ctx);
    for (const n of springs) n.draw(ctx);
    //
    requestAnimationFrame(loop);
}
//
/// Event listeners
//
// Mouse events
canvas.addEventListener('mousedown', (e) => {
    const type = selectObjectSummon.value;

    if (type === 'ball') {
        // Cria a bola na posição do clique usando o raio atual configurado no slider
        const radius = parseFloat(sliderRadius.value) || 5;
        balls.push(new Circle(e.clientX, e.clientY, radius, 'white'));
    }
});
//
// Update Properties with sliders
sliderAcceleration.x.addEventListener('input', () => { displayAcceleration.x.textContent = sliderAcceleration.x.value; });
sliderAcceleration.y.addEventListener('input', () => { displayAcceleration.y.textContent = sliderAcceleration.y.value; });
sliderMass.addEventListener('input', () => { displayMass.textContent = sliderMass.value; });
sliderFriction.addEventListener('input', () => { displayFriction.textContent = sliderFriction.value; });
sliderRestitutio.addEventListener('input', () => { displayRestitutio.textContent = sliderRestitutio.value; });
sliderRadius.addEventListener('input', () => { displayRadius.textContent = sliderRadius.value; });
//
// Reset Data Objects with Buttons
document.getElementById('reset-status').addEventListener('click', function () {
    // Create circle
    d = 30
    balls = [
        // box
        new Circle(canvas.width / 2 - d, canvas.height / 2 - d, 5, 'white'),
        new Circle(canvas.width / 2 + d, canvas.height / 2 - d, 5, 'white'),
        new Circle(canvas.width / 2 + d, canvas.height / 2 + d, 5, 'white'),
        new Circle(canvas.width / 2 - d, canvas.height / 2 + d, 5, 'white'),

        // rope
            new Circle(canvas.width / 1.5, canvas.height / 2, 5, 'white', stroke = null, mass = 1, friction = .001, restitution = .9, canCollide = false, canMove = false),
        new Circle(canvas.width / 1.5, canvas.height / 2 + d, 5, 'white'),
        new Circle(canvas.width / 1.5, canvas.height / 2 + d * 2, 5, 'white'),
        new Circle(canvas.width / 1.5, canvas.height / 2 + d * 3, 5, 'white')

    ];
    //
    // Make nodes
    springs = [
        // box
        new Spring(balls[0], balls[1]),
        new Spring(balls[1], balls[2]),
        new Spring(balls[2], balls[3]),
        new Spring(balls[3], balls[0]),
        new Spring(balls[0], balls[2]),
        new Spring(balls[1], balls[3]),

        // rope
        new Spring(balls[4], balls[5]),
        new Spring(balls[5], balls[6]),
        new Spring(balls[6], balls[7]),

        // Walls (Barreiras)
        new Spring(new Circle(M, 0, stroke = { color: 'red', width: 4 }), new Circle(canvas.width - M, 0, stroke = { color: 'red', width: 4 })),
        new Spring(new Circle(canvas.width - M, 0, stroke = { color: 'red', width: 4 }), new Circle(canvas.width, M, stroke = { color: 'red', width: 4 })),
        new Spring(new Circle(canvas.width, M, stroke = { color: 'red', width: 4 }), new Circle(canvas.width, canvas.height - M, stroke = { color: 'red', width: 4 })),
        new Spring(new Circle(canvas.width, canvas.height - M, stroke = { color: 'red', width: 4 }), new Circle(canvas.width - M, canvas.height, stroke = { color: 'red', width: 4 })),
        new Spring(new Circle(canvas.width - M, canvas.height, stroke = { color: 'red', width: 4 }), new Circle(M, canvas.height, stroke = { color: 'red', width: 4 })),
        new Spring(new Circle(M, canvas.height, stroke = { color: 'red', width: 4 }), new Circle(0, canvas.height - M, stroke = { color: 'red', width: 4 })),
        new Spring(new Circle(0, canvas.height - M, stroke = { color: 'red', width: 4 }), new Circle(0, M, stroke = { color: 'red', width: 4 })),
        new Spring(new Circle(0, M, stroke = { color: 'red', width: 4 }), new Circle(M, 0, stroke = { color: 'red', width: 4 }))
    ];
});
document.getElementById('reset-aceleration').addEventListener('click', function () { displayAcceleration.x.textContent = displayAcceleration.y.textContent = sliderAcceleration.x.value = sliderAcceleration.y.value = 0; });
document.getElementById('reset-material-properties').addEventListener('click', function () { displayFriction.textContent = sliderFriction.value = .001; displayRestitutio.textContent = sliderRestitutio.value = .9; displayRadius.textContent = sliderRadius.value = 5; });
//
/// Start loop
//
loop();
//F