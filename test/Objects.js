/// Objects.js
//
/// Utils
//
const dot = (ax, ay, bx, by) => ax * bx + ay * by;
//
/// Objects Type
//
// Circle object
class Circle {
    constructor(x, y, radius, fill = null, stroke = null, mass = 1, friction = .001, restitution = .9, canCollide = true, canMove = true, vx = 0, vy = 0, ax = 0, ay = 0) {
        // Propriedades de Movimento
        this.x = x;   // position x
        this.y = y;   // position y
        this.vx = vx; // velocity x
        this.vy = vy; // velocity y
        this.ax = ax; // acceleration x
        this.ay = ay; // acceleration y

        // Propriedades Physicas
        this.mass = mass;               // mass
        this.friction = friction;       // friction
        this.restitution = restitution; // restitution

        // Propriedades de Renderização
        this.radius = radius; // radius
        this.fill = fill;     // fill color
        this.stroke = stroke; // stroke object {color, width}

        // Propriedade de Permição
        this.canCollide = canCollide;
        this.canMove = canMove;
    }

    /**
    * Opera a simulação fisica do objeto
    * @param {Object[]} hashSprings - Lista de Objetos Spring.
    * @param {Object[]} hashBalls   - Lista de Objetos Circle.
    * @param {number} dt  - O passo de tempo total (tempo do quadro).
    * @param {number} passos    - Número de sub-passos para dividir o quadro.
    */
    simulation(hashSprings, hashBalls, dt) {
        // Salva a aceleração original para restaurar depois
        const original_ax = this.ax;
        const original_ay = this.ay;

        const nearbySprings = hashSprings.getNearby(this);

        // Calcula o número de passos baseado na velocidade e tamanho da esfera
        let passos = Math.ceil(25 / Math.max(0.1, this.radius));
        passos = Math.max(5, Math.min(passos, 50));// Limites de segurança: mínimo de 5 para estabilidade, máximo de 60 para performance

        const dt_sub = dt / passos; // sub delta para sub passos

        // Calcula a aceleração para o sub-passo garantindo que a esfera nao atravesse segmentos mesmo em alta velociade
        for (let i = 0; i < passos; i++) {
            // --- 1. Sub-Update (Aplicação da velocidade e aceleração para o sub-passo) ---
            // Neste modelo, assumimos que esta função avança o objeto
            if (this.canMove) {
                this.vx += this.ax * dt_sub;
                this.vy += this.ay * dt_sub;
                this.x += this.vx * dt_sub;
                this.y += this.vy * dt_sub;
            }

            // 2. Verifica a colisão
            if (this.canCollide) for (let spring of nearbySprings) if (this != spring.node1 && this != spring.node2) this.resolveCollisionSpring(this.collideWithSpring(spring));
        }

        // Devolvae a aceleração orginal
        this.ax = original_ax;
        this.ay = original_ay;

        // 3. Colisão com Esferas repitida 10x para alta precição
        if (this.canCollide) {
            const nearbyBalls = hashBalls.getNearby(this);
            for (let ball of nearbyBalls) {
                if (ball === this) continue; // Garante que a esfera não colida consigo mesma
                this.resolveCollisionCircle(ball, this.collideWithCircle(ball));
            }
        }
    }

    // Trata a colição com segmento (Spring)
    resolveCollisionSpring(collisionData) {
        if (!collisionData.isColliding) return;
        let spring = collisionData.spring;

        // 1. Reposicionamento do círculo
        if (this.canMove) {
            this.x += collisionData.normal.x * collisionData.penetration;
            this.y += collisionData.normal.y * collisionData.penetration;
        }

        // 2. Decomposição da velocidade
        const speedAlongNormal = dot(this.vx, this.vy, collisionData.normal.x, collisionData.normal.y);
        const speedAlongTangent = dot(this.vx, this.vy, -collisionData.normal.y, collisionData.normal.x);

        // --- MUDANÇA AQUI: Não dê "return" global se speedAlongNormal >= 0 ---
        // A resposta do círculo (3.2) só acontece se ele estiver se movendo contra a colisão
        if (this.canMove && speedAlongNormal < 0) {
            this.vx = -(speedAlongNormal * collisionData.normal.x) * (this.restitution) + (speedAlongTangent * -collisionData.normal.y) * (1 - this.friction);
            this.vy = -(speedAlongNormal * collisionData.normal.y) * (this.restitution) + (speedAlongTangent * collisionData.normal.x) * (1 - this.friction);
        }

        // 3.3 Aplicar impulso aos nós
        let t = collisionData.clamped_t;
        const invMassTotal = (this.canMove ? (1 / this.mass) : 0) + ((1 - t) * (1 - t) * (1 / spring.node1.mass) + t * t * (1 / spring.node2.mass));
        if (invMassTotal <= 0) return;

        // Determina a velocidade efetiva de impacto
        let effectiveSpeed = speedAlongNormal;

        // Se o círculo está parado, precisamos checar a velocidade do Spring contra ele
        const vSpringNormal = dot((spring.node1.vx + spring.node2.vx) * 0.5, (spring.node1.vy + spring.node2.vy) * 0.5, collisionData.normal.x, collisionData.normal.y);

        if (!this.canMove) {
            effectiveSpeed = -vSpringNormal; // Impacto é a velocidade do Spring vindo
        } else {
            // Se ambos se movem, a velocidade relativa real é a diferença
            effectiveSpeed = speedAlongNormal - vSpringNormal;
        }

        // Só aplica impulso se houver aproximação entre os corpos
        if (effectiveSpeed >= 0) {
            // Se não há aproximação, mas há penetração e o círculo é estático, 
            // ainda precisamos reposicionar os nós para não atravessar
            if (!this.canMove) {
                if (spring.node1.canMove) {
                    spring.node1.x -= collisionData.normal.x * collisionData.penetration * (1 - t);
                    spring.node1.y -= collisionData.normal.y * collisionData.penetration * (1 - t);
                }
                if (spring.node2.canMove) {
                    spring.node2.x -= collisionData.normal.x * collisionData.penetration * t;
                    spring.node2.y -= collisionData.normal.y * collisionData.penetration * t;
                }
            }
            return;
        }

        const impulseMag = -(1 + this.restitution) * effectiveSpeed / invMassTotal;

        if (spring.node1.canMove) {
            spring.node1.vx -= impulseMag * collisionData.normal.x * (1 - t) * (1 / spring.node1.mass);
            spring.node1.vy -= impulseMag * collisionData.normal.y * (1 - t) * (1 / spring.node1.mass);

            if (!this.canMove) {
                spring.node1.x -= collisionData.normal.x * collisionData.penetration * (1 - t);
                spring.node1.y -= collisionData.normal.y * collisionData.penetration * (1 - t);
            }
        }
        if (spring.node2.canMove) {
            spring.node2.vx -= impulseMag * collisionData.normal.x * t * (1 / spring.node2.mass);
            spring.node2.vy -= impulseMag * collisionData.normal.y * t * (1 / spring.node2.mass);

            if (!this.canMove) {
                spring.node2.x -= collisionData.normal.x * collisionData.penetration * t;
                spring.node2.y -= collisionData.normal.y * collisionData.penetration * t;
            }
        }
    }


    // Detecta colisões com um segmento (Spring)
    collideWithSpring(spring) {
        // 1. Determina length entre dos segmentos (Spring)
        const length_x = spring.node2.x - spring.node1.x;
        const length_y = spring.node2.y - spring.node1.y;
        const length_sq = dot(length_x, length_y, length_x, length_y);

        // 2. Calcula a projeção da distancia do node1 ate o circle. 0 >= (this - spring.node1, length)/length_sq <= 1.
        let clamped_t = 0;
        if (length_sq !== 0) clamped_t = Math.max(0, Math.min(1, dot((this.x - spring.node1.x), (this.y - spring.node1.y), length_x, length_y) / length_sq));

        // 3. Coordenadas do ponto mais próximo             (closest = Node1 + clamped_t * length)
        // 4. Coordenadas do círculo ao ponto mais próximo  ( circle_closest = closest - this)
        const circle_closest_x = (spring.node1.x + clamped_t * length_x) - this.x;
        const circle_closest_y = (spring.node1.y + clamped_t * length_y) - this.y;

        // 5. Distância (real) entre o centro do círculo e o ponto mais próximo.
        const dist = Math.sqrt(dot(circle_closest_x, circle_closest_y, circle_closest_x, circle_closest_y));

        // 6. Determinar a Colisão
        // Colisão ocorre se a distância for menor que o raio
        const isColliding = dist < this.radius;
        if (!isColliding) return {
            isColliding: false,
            penetration: 0,
            normal: { x: 0, y: 0 }
        };

        // 7. Detemina a normal
        let normal_x, normal_y;
        if (dist === 0) {
            // Caso especial: o centro do círculo coincide com o ponto mais próximo.
            // A normal é arbitrária. Usamos a normal do spring (linha infinita) como fallback.
            const length = Math.sqrt(length_sq);
            if (length !== 0) {
                normal_x = -length_y / length;
                normal_y = length_x / length;
            } else {
                // Se o spring não tem comprimento (node1 e node2 são o mesmo ponto),
                // a normal é arbitrária.
                normal_x = 0;
                normal_y = -1; // Exemplo: apontando para cima
            }
        } else {
            // A normal é o vetor normalizado do ponto mais próximo ao centro do círculo
            // (que é a direção *oposta* de v_circle_to_closest).
            normal_x = -circle_closest_x / dist;
            normal_y = -circle_closest_y / dist;
        }

        return {
            isColliding,
            penetration: this.radius - dist,
            normal: { x: normal_x, y: normal_y },
            spring,
            clamped_t
        };
    };

    // Trata a colição com circulo (Circle)
    resolveCollisionCircle(other, collisionData) {
        if (!collisionData.isColliding) return; // 1. Verifica se houve collição

        // 2. Decompõe a Velocidade Relativa (direção da colisão) (direção paralela, para aplicar atrito)
        var relativeSpeedAlongNormal = dot(this.vx - other.vx, this.vy - other.vy, collisionData.normal.x, collisionData.normal.y);
        var relativeSpeedAlongTangent = dot(this.vx - other.vx, this.vy - other.vy, collisionData.normal.x, -collisionData.normal.y); // O vetor Tangente é o normal rotacionado em 90 graus (normal.y, -normal.x).

        // 3. Calcula as forças/impulsos que serão aplicados (separados em Tangente e Normal)
        // Componente Tangencial (Atrito): Impulso Tangencial = Velocidade Tangencial * Coeficiente de Atrito (friction)
        var forceX = relativeSpeedAlongTangent / 2 * collisionData.normal.y * this.friction;
        var forceY = relativeSpeedAlongTangent / 2 * -collisionData.normal.x * this.friction;

        // Componente Normal (Repulsão): Impulso Normal = Velocidade Normal * (1 + Coeficiente de Restituição/Elasticidade)
        forceX += relativeSpeedAlongNormal / 2 * collisionData.normal.x * (this.restitution + 1);
        forceY += relativeSpeedAlongNormal / 2 * collisionData.normal.y * (this.restitution + 1);

        // 4. Aplica os Impulsos (Mudança na Velocidade)
        if (this.canMove) {
            this.vx -= forceX;
            this.vy -= forceY;
        }
        if (other.canMove) {
            other.vx += forceX;
            other.vy += forceY;
        }
        // 5. CORREÇÃO DE POSIÇÃO (Para resolver o "grude")
        const percent = 0.2; // % de penetração a corrigir (20% a 80% é comum)
        const slop = 0.01;   // Permite uma pequena sobreposição para evitar tremulação. (Ex: 0.01)

        // A penetração já está calculada em collideWithCircle
        const correction = Math.max(collisionData.penetration - slop, 0.0) / (this.mass + other.mass) * percent;

        // Movimentar THIS na direção oposta ao normal de colisão
        if (this.canMove) {
            this.x -= correction * collisionData.normal.x * other.mass;
            this.y -= correction * collisionData.normal.y * other.mass;
        }

        // Movimentar OTHER na direção do normal de colisão
        if (other.canMove) {
            other.x += correction * collisionData.normal.x * this.mass;
            other.y += correction * collisionData.normal.y * this.mass;
        }
    };

    // Detecta colisões com um circulo (Circle)
    collideWithCircle(other) {
        // 1. distâncias entre os centros
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const dist_sq = dot(dx, dy, dx, dy);

        // 2. Soma dos raios
        const radii_sum = this.radius + other.radius;
        const radii_sum_sq = radii_sum * radii_sum;

        // 3. Colisão se a distância for menor que a soma dos raios
        const isColliding = dist_sq < radii_sum_sq;
        if (!isColliding) {
            return {
                isColliding: false,
                penetration: 0,
                normal: { x: 0, y: 0 },
                distance: 0
            };
        }

        // 4. Distancia (Real)
        let dist = Math.sqrt(dist_sq)

        return {
            isColliding,
            penetration: (radii_sum - dist),
            normal: { x: dx / dist, y: dy / dist },
            distance: dist
        };
    };

    // Renderiza o Objeto
    draw(ctx) {
        if (this.fill) ctx.fillStyle = this.fill;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        if (this.stroke) {
            ctx.strokeStyle = this.stroke.color;
            ctx.lineWidth = this.stroke.width;
            ctx.stroke();
        }
        ctx.closePath();
    }
}

//
class Spring {
    /** @type {Circle} */
    node1;
    /** @type {Circle} */
    node2;
    /** @type {number} */
    length;
    /** @type {number} */
    stiffness; // Antigo "force" (K)
    /** @type {number} */
    damping;   // Novo amortecimento (b)
    /** @type {number} */
    thickness;

    constructor(node1, node2, length = null, stiffness = 0.5, damping = 0.5) {
        this.node1 = node1; // Objeto A
        this.node2 = node2; // Objeto B
        if (length === null) length = Math.hypot(node1.x - node2.x, node1.y - node2.y);
        this.length = length; // Distancia entre os nodes
        this.stiffness = stiffness; // 0.1 (mole) a 1.0 (duro)
        this.damping = damping;     // 0.0 (vibra muito) a 1.0 (não vibra nada)
        this.thickness = 5; // *
    }

    simulate() {
        this.springMotion();
    }

    springMotion() {
        // 1. Vetor de direção e distância atual
        var dx = this.node2.x - this.node1.x;
        var dy = this.node2.y - this.node1.y;
        var dist = Math.hypot(dx, dy);

        // 2. Normalização do vetor (direção unitária)
        if (dist === 0) return;// Evita divisão por zero
        var nx = dx / dist;
        var ny = dy / dist;

        // 3. Lei de Hooke (Força da mola baseada na deformação)
        // Quanto a mola esticou ou encolheu além do tamanho original
        var springForce = (dist - this.length) * this.stiffness;

        // 4. Amortecimento (Damping): (dampingForce = dot(node2 - node1, normal) * damping)
        // Calcula a velocidade relativa entre os dois pontos
        // Projeta a velocidade na direção da mola (Dot Product)
        // Força de resistência (segura a mola para não explodir)
        var dampingForce = dot(this.node2.vx - this.node1.vx, this.node2.vy - this.node1.vy, nx, ny) * this.damping;

        // 5. Força Total final
        var totalForce = springForce + dampingForce;

        // Aplica a força na direção da mola
        var fx = nx * totalForce;
        var fy = ny * totalForce;

        // Aplica aos nós (Ação e Reação)
        // Nota: Se seus círculos têm massa, divida a força pela massa aqui (F = m*a)
        if (this.node1.canMove) {
            this.node1.vx += fx / this.node1.mass;
            this.node1.vy += fy / this.node1.mass;
        }
        if (this.node2.canMove) {
            this.node2.vx -= fx / this.node2.mass;
            this.node2.vy -= fy / this.node2.mass;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.lineWidth = this.thickness;
        // Muda a cor baseado na tensão da mola (opcional, ajuda no debug)
        var dist = Math.hypot(this.node1.x - this.node2.x, this.node1.y - this.node2.y);
        var stress = Math.abs(dist - this.length);
        var r = Math.min(255, stress * 10);
        ctx.strokeStyle = `rgb(255, ${255 - r}, ${255 - r})`;

        ctx.moveTo(this.node1.x, this.node1.y);
        ctx.lineTo(this.node2.x, this.node2.y);
        ctx.stroke();
        ctx.closePath();
    }
}

class SpatialHash {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    // Limpa o grid para o próximo frame
    clear() {
        this.grid.clear();
    }

    // Insere um círculo ou spring no hash
    insert(obj) {
        const key = `${Math.floor(obj.x / this.cellSize)},${Math.floor(obj.y / this.cellSize)}`;
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key).push(obj);
    }

    // Retorna objetos na célula do alvo e nas 8 células vizinhas
    getNearby(obj) {
        const objects = [];
        const cx = Math.floor(obj.x / this.cellSize);
        const cy = Math.floor(obj.y / this.cellSize);

        for (let x = cx - 1; x <= cx + 1; x++) {
            for (let y = cy - 1; y <= cy + 1; y++) {
                const cell = this.grid.get(`${x},${y}`);
                if (cell) objects.push(...cell);
            }
        }
        return objects;
    }
}