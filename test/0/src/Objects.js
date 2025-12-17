/// Objects.js
//
/// Utils
//
const dot = (ax, ay, bx, by) => ax * (bx || ax) + ay * (by || ay);
const ndot = (ax, ay, bx, by) => ax * (bx || ax) - ay * (by || ay);
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
        const passos = 10; // Exemplo: 10 sub-passos para cada frame.
        const dt_sub = dt / passos;

        // Calcula a aceleração para o sub-passo garantindo que a esfera nao atravesse segmentos mesmo em alta velociade
        for (let i = 0; i < passos; i++) {
            // --- 1. Armazena a posição antes do movimento do sub-passo ---
            const x_antigo = this.x; // <--- NOVO
            const y_antigo = this.y; // <--- NOVO

            // --- 1. Sub-Update (Aplicação da velocidade e aceleração para o sub-passo) ---
            // Neste modelo, assumimos que esta função avança o objeto
            if (this.canMove) {
                this.vx += this.ax * dt_sub;
                this.vy += this.ay * dt_sub;
                this.x += this.vx * dt_sub;
                this.y += this.vy * dt_sub;
            }

            // 2. Verifica a colisão
            if (this.canCollide) for (let spring of nearbySprings) if (this != spring.node1 && this != spring.node2) this.collisionSpring(spring, x_antigo, y_antigo);
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

        // 4. Velocidade e Aceleração Limite (velocidade da luz)
        this.ax = Math.max(-299792458, Math.min(299792458, this.ax));
        this.ay = Math.max(-299792458, Math.min(299792458, this.ay));
        this.vx = Math.max(-299792458, Math.min(299792458, this.vx));
        this.vy = Math.max(-299792458, Math.min(299792458, this.vy));
    }

    // Trata a colição com segmento (Spring)
    collisionSpring(spring, x_antigo, y_antigo) {
        // --- Dados do Segmento (Spring) ---
        const length_x = spring.node2.x - spring.node1.x;
        const length_y = spring.node2.y - spring.node1.y;
        const length_sq = length_x * length_x + length_y * length_y;
        if (length_sq === 0) return;

        // --- 1. DETECÇÃO DE COLISÃO CONTÍNUA (CCD) ---

        let is_ccd_hit = false;
        let t_impacto = 1.0; // Ponto de impacto na trajetória (0 a 1)
        let n_ccd_x = 0, n_ccd_y = 0; // Normal do CCD

        // Vetor de Trajetória do sub-passo
        const proj_x = this.x - x_antigo;
        const proj_y = this.y - y_antigo;

        // A. Testa a Interseção do Raio (pos_antigo -> pos_novo) com o Segmento
        // (Apenas se o objeto tiver se movido o suficiente para justificar o CCD)
        if (dot(proj_x, proj_y) > 0.0001) {
            // Cálculo da Interseção (determinante)
            // den = A x B, onde A é o segmento (-length_x, -length_y) e B é a trajetória (proj_x, proj_y)
            const denom = (-length_x * proj_y) - (proj_x * -length_y);

            if (Math.abs(denom) > 0.000001) {
                // Vetor da Origem (Segmento.pa até Posição_Antiga)
                const origin_x = x_antigo - spring.node1.x;
                const origin_y = y_antigo - spring.node1.y;

                // t (distância na trajetória) e s (distância no segmento)
                // t = [(Origem.x * Seg.y) - (Origem.y * Seg.x)] / denom
                const t = (origin_x * -length_y - origin_y * -length_x) / denom;
                const s = (origin_x * -proj_y - origin_y * -proj_x) / denom;

                // Colisão entre ponto-raio e segmento
                if (t >= 0 && t <= 1 && s >= 0 && s <= 1) {

                    // Se o centro do círculo colidir, recuamos pelo raio (Geração da Cápsula)
                    const radius_sq = this.radius * this.radius;
                    const radius_check_sq = dot(origin_x, origin_y);

                    // Se o círculo não estava já colidido na origem E a trajetória cruzou
                    if (radius_check_sq > radius_sq) {
                        is_ccd_hit = true;
                        t_impacto = t;

                        // Normal do Segmento (perpendicular à linha)
                        n_ccd_x = -length_y;
                        n_ccd_y = length_x;
                        const n_mag = Math.sqrt(dot(n_ccd_x, n_ccd_y));
                        n_ccd_x /= n_mag;
                        n_ccd_y /= n_mag;

                        // Garante que a normal aponte contra a velocidade (essencial para ricochete)
                        if (dot(this.vx, this.vy, n_ccd_x, n_ccd_y) > 0) {
                            n_ccd_x = -n_ccd_x;
                            n_ccd_y = -n_ccd_y;
                        }
                    }
                }
            }
        }

        // --- 2. DETECÇÃO DISCRETA (DCD) E PREPARAÇÃO DA RESOLUÇÃO ---

        let resolve_normal_x, resolve_normal_y;
        let penetration;
        let clamped_t; // Ponto no segmento (0 a 1)

        if (is_ccd_hit) {
            // Se houve CCD, usamos os dados do impacto
            resolve_normal_x = n_ccd_x;
            resolve_normal_y = n_ccd_y;

            // Recua o objeto até o ponto de impacto do CCD
            this.x = x_antigo + proj_x * t_impacto;
            this.y = y_antigo + proj_y * t_impacto;

            // Recalculamos o ponto mais próximo para obter 'clamped_t' e 'penetration' (que agora será o 'radius')
            const t_num = dot((this.x - spring.node1.x), (this.y - spring.node1.y), length_x, length_y);
            clamped_t = Math.max(0, Math.min(1, t_num / length_sq));

            // Simplesmente assumimos penetração = raio (o objeto está tocando)
            penetration = this.radius;

        } else {
            // Se não houve CCD, executamos a DCD tradicional (Closest Point)
            const t_num = dot((this.x - spring.node1.x), (this.y - spring.node1.y), length_x, length_y);
            clamped_t = Math.max(0, Math.min(1, t_num / length_sq));

            const closest_x = spring.node1.x + clamped_t * length_x;
            const closest_y = spring.node1.y + clamped_t * length_y;

            const diff_x = closest_x - this.x;
            const diff_y = closest_y - this.y;

            const dist = Math.sqrt(dot(diff_x, diff_y));

            if (!(dist < this.radius)) return; // Não houve colisão DCD, encerra.

            // Vetor Normal
            penetration = this.radius - dist;
            resolve_normal_x = -diff_x / dist; // Normal que empurra para fora
            resolve_normal_y = -diff_y / dist;
        }

        // --- 3. RESOLUÇÃO DE COLISÃO (ÚNICA) ---

        // 3.1. Reposicionamento do círculo (Apenas se a DCD detectar penetração ou o CCD recuar para o ponto de contato)
        if (this.canMove) {
            this.x += resolve_normal_x * penetration;
            this.y += resolve_normal_y * penetration;
        }

        // 3.2. Decomposição da velocidade e Resposta do Círculo
        
        const speedAlongNormal = dot(this.vx, this.vy, resolve_normal_x, resolve_normal_y);
        const speedAlongTangent = dot(this.vx, this.vy, -resolve_normal_y, resolve_normal_x);
        if (this.canMove && speedAlongNormal < 0) {
            const new_vx_normal = -(speedAlongNormal * resolve_normal_x) * this.restitution;
            const new_vy_normal = -(speedAlongNormal * resolve_normal_y) * this.restitution;

            const new_vx_tangent = (speedAlongTangent * -resolve_normal_y) * (1 - this.friction);
            const new_vy_tangent = (speedAlongTangent * resolve_normal_x) * (1 - this.friction);

            this.vx = new_vx_normal + new_vx_tangent;
            this.vy = new_vy_normal + new_vy_tangent;
        }

        // 3.3. Aplicar Impulso aos nós do Spring (Segmento)
        const invMassCircle = this.canMove ? (1 / this.mass) : 0;
        const invMassSegment = (1 - clamped_t) * (1 - clamped_t) * (1 / spring.node1.mass) + clamped_t * clamped_t * (1 / spring.node2.mass);
        const invMassTotal = invMassCircle + invMassSegment;
        if (invMassTotal <= 0) return;

        // Velocidade relativa (V_c - V_spring)
        const vSpringX = spring.node1.vx * (1 - clamped_t) + spring.node2.vx * clamped_t;
        const vSpringY = spring.node1.vy * (1 - clamped_t) + spring.node2.vy * clamped_t;
        let effectiveSpeed = speedAlongNormal - dot(vSpringX, vSpringY, resolve_normal_x, resolve_normal_y);

        if (effectiveSpeed >= 0) {
            // Apenas reposiciona os nós se o círculo for estático e houver penetração
            if (!this.canMove) {
                // ... [Lógica de reposicionamento dos nós do spring] ...
                const factor1 = penetration * (1 - clamped_t);
                const factor2 = penetration * clamped_t;
                if (spring.node1.canMove) { spring.node1.x -= resolve_normal_x * factor1; spring.node1.y -= resolve_normal_y * factor1; }
                if (spring.node2.canMove) { spring.node2.x -= resolve_normal_x * factor2; spring.node2.y -= resolve_normal_y * factor2; }
            }
            return;
        }

        // Aplica Impulso
        const impulseMag = -(1 + this.restitution) * effectiveSpeed / invMassTotal;

        // Impulso Círculo
        if (this.canMove) {
            const impulseCircle = impulseMag * invMassCircle;
            this.vx -= impulseCircle * resolve_normal_x;
            this.vy -= impulseCircle * resolve_normal_y;
        }

        // Impulso Spring
        const impulseFactor = impulseMag / invMassSegment;
        if (spring.node1.canMove) {
            const impulseN1 = impulseFactor * (1 - clamped_t) * (1 / spring.node1.mass);
            spring.node1.vx -= impulseN1 * resolve_normal_x;
            spring.node1.vy -= impulseN1 * resolve_normal_y;
            if (!this.canMove) { spring.node1.x -= resolve_normal_x * penetration * (1 - clamped_t); spring.node1.y -= resolve_normal_y * penetration * (1 - clamped_t); }
        }
        if (spring.node2.canMove) {
            const impulseN2 = impulseFactor * clamped_t * (1 / spring.node2.mass);
            spring.node2.vx -= impulseN2 * resolve_normal_x;
            spring.node2.vy -= impulseN2 * resolve_normal_y;
            if (!this.canMove) { spring.node2.x -= resolve_normal_x * penetration * clamped_t; spring.node2.y -= resolve_normal_y * penetration * clamped_t; }
        }
    }

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

    getJSON() {
        return {
            type: "Circle",
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy,
            ax: this.ax,
            ay: this.ay,
            radius: this.radius,
            fill: this.fill,
            stroke: this.stroke,
            mass: this.mass,
            friction: this.friction,
            restitution: this.restitution,
            canCollide: this.canCollide,
            canMove: this.canMove
        }
    }

    setFromJSON(data) {
        this.x = data.x;
        this.y = data.y;
        this.vx = data.vx;
        this.vy = data.vy;
        this.ax = data.ax;
        this.ay = data.ay;
        this.radius = data.radius;
        this.fill = data.fill;
        this.stroke = data.stroke;
        this.mass = data.mass;
        this.friction = data.friction;
        this.restitution = data.restitution;
        this.canCollide = data.canCollide;
        this.canMove = data.canMove;
    }

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