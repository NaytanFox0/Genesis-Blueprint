// Collison Dynamics for Circle-Segment
//
// Helper functions
const dot = (xa, ya, xb, yb) => xa * (xb || xa) + ya * (yb || ya);
const ndot = (xa, ya, xb, yb) => xa * (xb || xa) - ya * (yb || ya);

// 1. Moviment Dynamics
vel.x += acc.x * dt;
vel.y += acc.y * dt;
new_x += vel.x * dt;
new_y += vel.y * dt;

// 2. Ray-Segment Intersection (Continuous Collision Detection)
let proj_x = new_x - pos.x;
let proj_y = new_y - pos.y;
let length_x = seg.pb.x - seg.pa.x;
let length_y = seg.pb.y - seg.pa.y;

// Cálculo de interseção (determinante)
let denom = dot(-length_x, proj_y, proj_x, length_y);

// Se denom == 0, são paralelos. Se não, calculamos t e u
if (Math.abs(denom) > 0.0001) {
    let s =  dot(-proj_y, (pos.x - seg.pa.x), proj_x , (pos.y - seg.pa.y)) / denom;
    let t = ndot( length_x, (pos.y - seg.pa.y), length_y, (pos.x - seg.pa.x)) / denom;

    // Se t e s estão entre 0 e 1, a trajetória cruzou a parede neste frame
    if (t >= 0 && t <= 1 && s >= 0 && s <= 1) {
        
        // 2.1. Normal Vector
        let n_raw = { x: -length_y, y: length_x };
        let n_mag = Math.sqrt(dot(n_raw.x, n_raw.y));
        let n = { x: n_raw.x / n_mag, y: n_raw.y / n_mag };

        // Garante que a normal aponte contra a velocidade
        if (dot(vel.x, vel.y, n.x, n.y) > 0) {
            n.x = -n.x;
            n.y = -n.y;
        }

        // 2.2. Reflection Dynamics
        let dot_vn = dot(vel.x, vel.y, n.x, n.y);
        vel.x = vel.x - (1 + restitution) * dot_vn * n.x;
        vel.y = vel.y - (1 + restitution) * dot_vn * n.y;

        // 2.3. Position Correction (Recoloca no ponto de impacto + margem de raio)
        new_x = (pos.x + (t * proj_x)) + n.x * (radius + 0.1);
        new_y = (pos.y + (t * proj_y)) + n.y * (radius + 0.1);
    }
}

// 3. Closest Point on Segment (Projection)
let length_sq = dot(length_x, length_y);
let clamped_t = Math.max(0, Math.min(1, (dot((new_x - seg.pa.x), (new_y - seg.pa.y), length_x, length_y) / length_sq)));

prox_x = seg.pa.x + clamped_t * length_x;
prox_y = seg.pa.y + clamped_t * length_y;

// 4. Collision Detection
let dist = Math.sqrt(dot(new_x - prox_x, new_y - prox_y));

if (dist <= radius) {
    // 5. Normal Vector (Normalized)
    let n_raw = { x: -(seg.pb.y - seg.pa.y), y: (seg.pb.x - seg.pa.x) };
    let n_mag = Math.sqrt(dot(n_raw.x, n_raw.y));
    let n = { x: n_raw.x / n_mag, y: n_raw.y / n_mag };

    // 6. Reflection Dynamics
    let dot_vn = dot(vel.x, vel.y, n.x, n.y);

    // Nova velocidade normal (invertida e escalada por restitution)
    let vel_nx = n.x * dot_vn;
    let vel_ny = n.y * dot_vn;
    let vel_tx = vel.x - vel_nx;
    let vel_ty = vel.y - vel_ny;

    // Aplica restituição na normal e atrito na tangencial e combina para a nova velocidade
    vel.x = (vel_nx * -restitution) + (vel_tx * friction); // Reduz a velocidade tangencial pelo atrito
    vel.y = (vel_ny * -restitution) + vel_ty;

    // Correction (Position)
    new_x = prox_x + n.x * radius;
    new_y = prox_y + n.y * radius;
}

// Update Position
pos.x = new_x;
pos.y = new_y;
