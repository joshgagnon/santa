const spriteUrl = './sprites.png';

async function loadImage(url) {
    let response = await fetch(url);
    let blob = await response.blob();
    return URL.createObjectURL(blob);
}

async function prepSprites() {
    const url = await loadImage(spriteUrl);
    let img = new Image();
    await new Promise(r => img.onload=r, img.src=url);
    return img;
}

function createCanvas() {
    const canvas = document.createElement("canvas");
    canvas.style.imageRendering = 'crisp-edges';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    return ctx;
}

const expandFrames = frames => {
    return frames.reduce((acc, f) => {
        if(f[4]) {
            return [...acc, ...(new Array(f[4])).fill(1).map(_ => f)];
        }
        return [...acc, f];
    }, []);
}

const KEY_MAP = {
    39: 'right',
    68: 'right',
    37: 'left',
    65: 'left',
    38: 'up',
    87: 'up',
    40: 'down',
    83: 'down'
}

const LEFT = 'LEFT';
const RIGHT = 'RIGHT';

class Santa {
    MODES = {
        STAND: 'STAND',
        WALK: 'WALK',
        JUMP: 'JUMP',
    }

    SPRITE_COORDS = {
        [this.MODES.STAND]: expandFrames([
            [2, 0, 38, 52, 10],
            [41, 0, 38, 52, 3],
            [80, 0, 38, 52, 3],
            [119, 0, 38, 52, 3],
        ]),
        [this.MODES.WALK]: expandFrames([
            [2, 122, 32, 46],
            [35, 119, 33, 49],
            [70, 116, 35, 52],
            [107, 113, 39, 55],
            [148, 117, 39, 52],
            [188, 123, 39, 45],
            [228, 120, 37, 48],
            [265, 115, 34, 53],
            [301, 115, 36, 53],
            [337, 115, 34, 53],
        ]),
        [this.MODES.JUMP]: expandFrames( [
            [0, 181, 42, 56, 3],
            [43, 180, 46, 46, 3],
            [91, 180, 40, 43, 3],
            [132, 180, 38, 49, 3],
            [171, 183, 38, 53, 3],
        ])
    }

    posX=0;
    posY=100;
    mode=this.MODES.STAND;
    direction=RIGHT;
    frame=0;
    animationFrame=0;
    pressedKeys = {};


    constructor({spriteSheet, width, height}) {
        this.spriteSheet = spriteSheet;
        this.width = width;
        this.height = height;
        this.posY = height;
        this.listeners();
    }

    keydown = (event) => {
        const code = KEY_MAP[event.keyCode];
        if(code) {
            this.pressedKeys[code] = true;
        }
    }
    keyup = (event) => {
        const code = KEY_MAP[event.keyCode];
        if(code) {
            this.pressedKeys[code] = false;
        }
    }
    listeners = () => {
        window.addEventListener("keydown", this.keydown, false)
        window.addEventListener("keyup", this.keyup, false)
    }

    step = (progress) => {
        this.frame++;
        if(this.frame % 10 ===0) {
            this.animationFrame++;
        }
        if(this.mode !== this.MODES.STAND && !Object.values(this.pressedKeys).some(x=>x)) {
            this.animationFrame = 0;
            this.mode = this.MODES.STAND;
        }
        if(this.mode === this.MODES.STAND && (this.pressedKeys.right || this.pressedKeys.left)) {
            this.animationFrame = 0;
        }

        if(this.pressedKeys.right) {
            this.mode = this.MODES.WALK;
            this.direction = RIGHT
        }

        if(this.pressedKeys.left) {
            this.mode = this.MODES.WALK;
            this.direction = LEFT;
        }

        if(this.pressedKeys.up) {
            this.mode = this.MODES.JUMP;
        }

        if(this.animationFrame >= this.SPRITE_COORDS[this.mode].length) {
            this.animationFrame = 0;
        }

        if(this.mode === this.MODES.WALK || this.mode === this.MODES.JUMP) {
            if(this.direction === RIGHT) {
                this.posX += progress / 10;
            }
        }

        if(this.mode === this.MODES.WALK || this.moder === this.MODES.JUMP) {
            if(this.direction === LEFT) {
                this.posX -= progress / 10;
            }
        }
    }
    draw = (ctx) => {
        const frame = this.SPRITE_COORDS[this.mode][this.animationFrame];
        ctx.save();
        if(this.direction === LEFT) {
            ctx.scale(-1, 1);
            ctx.drawImage(this.spriteSheet,
                frame[0],
                frame[1],
                frame[2],
                frame[3],
                -this.posX - frame[2],
                this.posY - frame[3],
                frame[2],
                frame[3]
            );
        }
        else {
            ctx.drawImage(this.spriteSheet,
                frame[0],
                frame[1],
                frame[2],
                frame[3],
                this.posX,
                this.posY - frame[3],
                frame[2],
                frame[3]
            );
        }
        ctx.restore();
    }
}

class Game {
    lastRender;
    frame=0;
    characters = [];
    ctx; width; height;
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
    }
    render = () => {
        this.ctx.clearRect(0, 0, this.width, this.height)
        this.characters.map(c => c.draw(this.ctx));
    }
    update = (progress) => {
        this.characters.map(c => c.step(progress))
    }
    loop = (timestamp) => {
        const progress = timestamp - lastRender
        this.update(progress);
        this.render()
        lastRender = timestamp
        window.requestAnimationFrame(this.loop)
    }
    play = () => {
        window.requestAnimationFrame(this.loop);
    }
}


function loop(timestamp) {

}

var lastRender = 0
window.requestAnimationFrame(loop)


async function init() {
    const spriteSheet = await prepSprites();
    const ctx = createCanvas();
    const game = new Game(ctx, window.innerWidth, window.innerHeight);
    game.characters.push(new Santa({spriteSheet, width: window.innerWidth, height: window.innerHeight}));
    game.play();

}


init();