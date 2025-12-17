/// main.js
//
// Import PIXI library
import { Application, Graphics, Sprite } from 'https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.mjs';

function draw(gh) {
    gh.beginFill(0xff0000);
    gh.lineStyle(4, 0x00ff00);
    gh.drawCircle(50, 50, 10);
    gh.endFill();
}

(async () => {
    // 1. Create a PIXI Application    
    const app = await new Application({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x000000,
        resizeTo: window,
    });

    // 2. Create a Graphics object
    const graphics = new Graphics();

    // darw circle test
    draw(graphics);

    // 3. Add the graphics to the stage
    app.stage.addChild(graphics);
    document.body.appendChild(app.view);
})();