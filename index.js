const spriteUrl = './sprites.png';

class Vector {
    x=0;
    y=0;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(v) {
        this.x += v.x;
        this.y += v.y;
    }
    clamp(x, y) {
        this.x = Math.max(0, this.x)
        this.y = Math.max(0, this.y)
        this.x = Math.min(x, this.x)
        this.y = Math.min(y, this.y)
    }
}

const GRAVITY = new Vector(0, 0.3);

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
    canvas.style.imageRendering = 'pixelated';
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
const FALL_TIMEOUT = 3000;
class Santa {
    MODES = {
        STAND: 'STAND',
        WALK: 'WALK',
        JUMP: 'JUMP',
        FALL: 'FALL'
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
            [0, 181, 42, 56, 4],
            [43, 180, 46, 46, 4],
            [91, 180, 40, 43, 4],
            [132, 180, 38, 49, 4],
            [171, 183, 38, 53, 4],
        ]),
        [this.MODES.FALL]: expandFrames( [
            [0, 326, 59, 53]
        ])

    }
    width = 0;
    height = 0;
    mode = this.MODES.STAND;
    fallStart = null;
    jumpPressed = false;
    direction = RIGHT;
    frame = 0;
    animationFrame = 0;
    pressedKeys = {};
    speed = 0.25;
    pos = new Vector(0, 0);
    movement = new Vector(0, 0);

    constructor({spriteSheet, width, height}) {
        this.spriteSheet = spriteSheet;
        this.width = width;
        this.height = height;
        this.pos.y = height;
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
        if(code === 'up' && this.pressedKeys[code]) {
            this.jumpPressed = true;
        }
        if(code) {
            this.pressedKeys[code] = false;
        }
    }
    listeners = () => {
        window.addEventListener("keydown", this.keydown, false)
        window.addEventListener("keyup", this.keyup, false)
    }

    onGround = () => {
        return this.pos.y >= this.height;
    }
    step = (ms, timestamp) => {
        const inputMovement = new Vector(0, 0);
        this.frame++;
        if(this.frame % 10 === 0) {
            this.animationFrame++;
        }

        if(this.pressedKeys.up && this.onGround()) {
            inputMovement.y -= 10;
        }
        else if(this.pressedKeys.up && this.jumpPressed && !this.hasDoubleJumped) {
            this.hasDoubleJumped = true;
            this.movement.y = 0; // like hitting ground
            inputMovement.y -= 10;
        }
        if(this.pressedKeys.right) {
            inputMovement.x = ms * this.speed;
            this.direction = RIGHT;
        }
        if(this.pressedKeys.left) {
            inputMovement.x = -(ms * this.speed);
            this.direction = LEFT;
        }


        this.movement.x = 0;
        this.movement.add(inputMovement);

        const onGround = this.onGround()
        if(!onGround) {
            this.movement.add(GRAVITY);
        }
        if(onGround) {
            this.hasDoubleJumped = false;
            this.jumpPressed = false;
            this.fallStart = false;
        }
        if(onGround && this.movement.y > 0) {
            this.movement.y = 0;
        }
        this.mode = this.MODES.STAND;
        if(this.movement.x < 0 || this.movement.x > 0) {
            this.mode = this.MODES.WALK;
        }
        if(this.movement.y > 0) {
            this.mode = this.MODES.JUMP;
            if(!this.fallStart) {
                this.fallStart = timestamp;
            }
            else if((timestamp - this.fallStart) > FALL_TIMEOUT) {
                this.mode = this.MODES.FALL;
            }
        }
        if(this.movement.y < 0) {
            this.mode = this.MODES.JUMP;
        }
        this.pos.add(this.movement);

        this.pos.clamp(this.width, this.height);
        if(this.animationFrame >= this.SPRITE_COORDS[this.mode].length) {
            this.animationFrame = 0;
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
                -this.pos.x - frame[2],
                this.pos.y - frame[3],
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
                this.pos.x,
                this.pos.y - frame[3],
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
    update = (progress, timestamp) => {
        this.characters.map(c => c.step(progress, timestamp))
    }
    loop = (timestamp) => {
        const progress = timestamp - this.lastRender
        this.update(progress, timestamp);
        this.render()
        this.lastRender = timestamp
        window.requestAnimationFrame(this.loop)
    }
    resize = () => {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.characters.map(c => {
            c.width = this.width;
            c.height = this.height;
        })
    }
    play = () => {
        window.requestAnimationFrame(this.loop);
        window.addEventListener("resize", this.resize, false)
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