import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";

// =====================================
// BASIC SETUP
// =====================================

const container =
document.getElementById("game-container");

const scene = new THREE.Scene();

scene.background =
new THREE.Color(0x87ceeb);

scene.fog =
new THREE.Fog(0x87ceeb, 30, 125);

const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    500
);

camera.position.set(0, 6, 12);
camera.lookAt(0, 1.5, -12);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.shadowMap.enabled = true;

container.appendChild(renderer.domElement);

// =====================================
// LIGHTING
// =====================================

const ambientLight =
new THREE.AmbientLight(0xffffff, 1.4);

scene.add(ambientLight);

const sunlight =
new THREE.DirectionalLight(0xffffff, 2);

sunlight.position.set(10, 20, 10);

sunlight.castShadow = true;

scene.add(sunlight);

// =====================================
// GAME VARIABLES
// =====================================

let playing = false;
let gameOver = false;

let score = 0;
let coins = 0;

let speed = 17;

let lane = 0;

const laneWidth = 3;

const lanes = [-3, 0, 3];

let jumping = false;
let sliding = false;

let jumpVelocity = 0;
let jumpHeight = 0;

const gravity = 25;
const jumpPower = 10;

let objects = [];

let spawnTimer = 0;

let worldDistance = 0;

const clock = new THREE.Clock();

// =====================================
// MATERIALS
// =====================================

const roadMaterial =
new THREE.MeshStandardMaterial({
    color: 0x333333
});

const lineMaterial =
new THREE.MeshStandardMaterial({
    color: 0xffffff
});

const skinMaterial =
new THREE.MeshStandardMaterial({
    color: 0xffcc99
});

const shirtMaterial =
new THREE.MeshStandardMaterial({
    color: 0x0088ff
});

const pantsMaterial =
new THREE.MeshStandardMaterial({
    color: 0x222244
});

const coinMaterial =
new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.8,
    roughness: 0.2
});

// =====================================
// CREATE ROAD
// =====================================

const road = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.2, 220),
    roadMaterial
);

road.position.set(0, -0.15, -45);

road.receiveShadow = true;

scene.add(road);

// =====================================
// ROAD LINES
// =====================================

const roadLines = [];

for (let z = -105; z < 15; z += 8) {

    for (let x of [-1.5, 1.5]) {

        const line = new THREE.Mesh(
            new THREE.BoxGeometry(
                0.12,
                0.03,
                4
            ),
            lineMaterial
        );

        line.position.set(
            x,
            0.02,
            z
        );

        scene.add(line);

        roadLines.push(line);
    }
}

// =====================================
// BUILDINGS
// =====================================

const buildings = [];

function createBuilding(x, z) {

    const height =
    5 + Math.random() * 15;

    const colors = [
        0x667788,
        0x8899aa,
        0x556677,
        0x777799,
        0x998877
    ];

    const material =
    new THREE.MeshStandardMaterial({
        color:
        colors[
            Math.floor(
                Math.random() * colors.length
            )
        ]
    });

    const building = new THREE.Mesh(
        new THREE.BoxGeometry(
            6,
            height,
            7
        ),
        material
    );

    building.position.set(
        x,
        height / 2,
        z
    );

    building.castShadow = true;

    scene.add(building);

    buildings.push(building);
}

for (let z = -105; z < 20; z += 12) {

    createBuilding(-11, z);
    createBuilding(11, z);
}

// =====================================
// PLAYER CHARACTER
// =====================================

const player = new THREE.Group();

scene.add(player);

player.position.set(0, 0, 5);

// Body

const body = new THREE.Mesh(
    new THREE.BoxGeometry(
        0.9,
        1.1,
        0.5
    ),
    shirtMaterial
);

body.position.y = 1.55;

player.add(body);

// Head

const head = new THREE.Mesh(
    new THREE.SphereGeometry(
        0.4,
        16,
        16
    ),
    skinMaterial
);

head.position.y = 2.45;

player.add(head);

// Hair

const hair = new THREE.Mesh(
    new THREE.SphereGeometry(
        0.41,
        16,
        16
    ),
    new THREE.MeshStandardMaterial({
        color: 0x222222
    })
);

hair.position.y = 2.68;
hair.scale.y = 0.45;

player.add(hair);

// Arms

const leftArm = new THREE.Mesh(
    new THREE.BoxGeometry(
        0.28,
        1,
        0.3
    ),
    shirtMaterial
);

leftArm.position.set(
    -0.65,
    1.5,
    0
);

player.add(leftArm);

const rightArm = leftArm.clone();

rightArm.position.x = 0.65;

player.add(rightArm);

// Legs

const leftLeg = new THREE.Mesh(
    new THREE.BoxGeometry(
        0.35,
        0.9,
        0.4
    ),
    pantsMaterial
);

leftLeg.position.set(
    -0.25,
    0.5,
    0
);

player.add(leftLeg);

const rightLeg = leftLeg.clone();

rightLeg.position.x = 0.25;

player.add(rightLeg);

// =====================================
// OBSTACLES
// =====================================

function createObstacle() {

    const selectedLane =
    Math.floor(Math.random() * 3);

    const obstacle = new THREE.Group();

    const material =
    new THREE.MeshStandardMaterial({
        color: 0xff3333
    });

    const box = new THREE.Mesh(
        new THREE.BoxGeometry(
            2,
            1.5,
            1.5
        ),
        material
    );

    box.position.y = 0.75;

    obstacle.add(box);

    obstacle.position.set(
        lanes[selectedLane],
        0,
        -100
    );

    obstacle.userData = {
        type: "obstacle",
        lane: selectedLane,
        checked: false
    };

    scene.add(obstacle);

    objects.push(obstacle);
}

// =====================================
// COINS
// =====================================

function createCoin() {

    const selectedLane =
    Math.floor(Math.random() * 3);

    const coin = new THREE.Mesh(
        new THREE.TorusGeometry(
            0.5,
            0.16,
            8,
            20
        ),
        coinMaterial
    );

    coin.position.set(
        lanes[selectedLane],
        1.3,
        -100
    );

    coin.userData = {
        type: "coin",
        lane: selectedLane,
        checked: false
    };

    scene.add(coin);

    objects.push(coin);
}

// =====================================
// PLAYER CONTROLS
// =====================================

function moveLeft() {

    if (!playing) return;

    lane = Math.max(-1, lane - 1);
}

function moveRight() {

    if (!playing) return;

    lane = Math.min(1, lane + 1);
}

function jump() {

    if (!playing) return;

    if (!jumping && !sliding) {

        jumping = true;

        jumpVelocity = jumpPower;
    }
}

function slide() {

    if (!playing) return;

    if (!jumping && !sliding) {

        sliding = true;

        player.scale.y = 0.5;

        setTimeout(() => {

            player.scale.y = 1;

            sliding = false;

        }, 750);
    }
}

// Keyboard

document.addEventListener(
    "keydown",
    (event) => {

        if ([
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Space"
        ].includes(event.code)) {
            event.preventDefault();
        }

        switch (event.code) {

            case "ArrowLeft":
            case "KeyA":
                moveLeft();
                break;

            case "ArrowRight":
            case "KeyD":
                moveRight();
                break;

            case "ArrowUp":
            case "KeyW":
            case "Space":
                jump();
                break;

            case "ArrowDown":
            case "KeyS":
                slide();
                break;
        }
    }
);

// =====================================
// MOBILE SWIPE CONTROLS
// =====================================

let touchStartX = 0;
let touchStartY = 0;

document.addEventListener(
    "touchstart",
    (event) => {

        touchStartX =
        event.changedTouches[0].screenX;

        touchStartY =
        event.changedTouches[0].screenY;

    },
    { passive: true }
);

document.addEventListener(
    "touchend",
    (event) => {

        const diffX =
        event.changedTouches[0].screenX
        - touchStartX;

        const diffY =
        event.changedTouches[0].screenY
        - touchStartY;

        if (
            Math.abs(diffX) < 30 &&
            Math.abs(diffY) < 30
        ) {
            return;
        }

        if (
            Math.abs(diffX) >
            Math.abs(diffY)
        ) {

            if (diffX > 0) {
                moveRight();
            } else {
                moveLeft();
            }

        } else {

            if (diffY < 0) {
                jump();
            } else {
                slide();
            }
        }
    },
    { passive: true }
);

// =====================================
// COLLISION DETECTION
// =====================================

function checkCollisions() {

    for (const object of objects) {

        if (object.userData.checked) {
            continue;
        }

        const distanceZ =
        Math.abs(
            object.position.z -
            player.position.z
        );

        const distanceX =
        Math.abs(
            object.position.x -
            player.position.x
        );

        if (
            distanceZ < 1.1 &&
            distanceX < 1
        ) {

            if (
                object.userData.type ===
                "coin"
            ) {

                coins++;

                document.getElementById(
                    "coins"
                ).textContent = coins;

                object.userData.checked = true;

                scene.remove(object);

            } else {

                if (
                    jumpHeight < 1.6
                ) {

                    endGame();
                    return;
                }

                object.userData.checked = true;
            }
        }
    }
}

// =====================================
// GAME START
// =====================================

function startGame() {

    for (const object of objects) {
        scene.remove(object);
    }

    objects = [];

    score = 0;
    coins = 0;

    speed = 17;

    lane = 0;

    jumping = false;
    sliding = false;

    jumpVelocity = 0;
    jumpHeight = 0;

    spawnTimer = 0;
    worldDistance = 0;

    player.position.set(0, 0, 5);
    player.scale.set(1, 1, 1);

    document.getElementById(
        "score"
    ).textContent = 0;

    document.getElementById(
        "coins"
    ).textContent = 0;

    document.getElementById(
        "start-screen"
    ).classList.add("hidden");

    document.getElementById(
        "game-over"
    ).classList.add("hidden");

    gameOver = false;
    playing = true;
}

// =====================================
// GAME OVER
// =====================================

function endGame() {

    playing = false;
    gameOver = true;

    document.getElementById(
        "final-score"
    ).textContent = Math.floor(score);

    document.getElementById(
        "final-coins"
    ).textContent = coins;

    document.getElementById(
        "game-over"
    ).classList.remove("hidden");
}

// =====================================
// BUTTON EVENTS
// =====================================

document.getElementById(
    "start-btn"
).addEventListener(
    "click",
    startGame
);

document.getElementById(
    "restart-btn"
).addEventListener(
    "click",
    startGame
);

// =====================================
// MAIN GAME LOOP
// =====================================

function animate() {

    requestAnimationFrame(animate);

    const delta = Math.min(
        clock.getDelta(),
        0.05
    );

    if (playing) {

        updateGame(delta);
    }

    renderer.render(scene, camera);
}

function updateGame(delta) {

    // Increase speed over time

    speed += delta * 0.15;

    // Update score

    score += delta * speed;

    document.getElementById(
        "score"
    ).textContent =
    Math.floor(score);

    // Smooth lane movement

    const targetX =
    lane * laneWidth;

    player.position.x +=
    (
        targetX -
        player.position.x
    ) * Math.min(1, delta * 12);

    // Jump physics

    if (jumping) {

        jumpVelocity -=
        gravity * delta;

        jumpHeight +=
        jumpVelocity * delta;

        if (jumpHeight <= 0) {

            jumpHeight = 0;

            jumpVelocity = 0;

            jumping = false;
        }
    }

    player.position.y = jumpHeight;

    // Running animation

    const runTime =
    performance.now() * 0.012;

    if (!jumping && !sliding) {

        leftLeg.rotation.x =
        Math.sin(runTime) * 0.6;

        rightLeg.rotation.x =
        -Math.sin(runTime) * 0.6;

        leftArm.rotation.x =
        -Math.sin(runTime) * 0.6;

        rightArm.rotation.x =
        Math.sin(runTime) * 0.6;

    } else {

        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;

        leftArm.rotation.x = 0;
        rightArm.rotation.x = 0;
    }

    // Move road lines

    for (const line of roadLines) {

        line.position.z +=
        speed * delta;

        if (line.position.z > 15) {

            line.position.z -= 120;
        }
    }

    // Move buildings

    for (const building of buildings) {

        building.position.z +=
        speed * delta;

        if (
            building.position.z > 25
        ) {

            building.position.z -= 132;
        }
    }

    // Spawn objects

    spawnTimer += delta;

    const spawnInterval =
    Math.max(
        0.6,
        1.4 - speed * 0.015
    );

    if (
        spawnTimer >= spawnInterval
    ) {

        spawnTimer = 0;

        if (Math.random() < 0.65) {

            createObstacle();

        } else {

            createCoin();
        }
    }

    // Move obstacles and coins

    for (
        let i = objects.length - 1;
        i >= 0;
        i--
    ) {

        const object = objects[i];

        object.position.z +=
        speed * delta;

        if (
            object.userData.type ===
            "coin"
        ) {

            object.rotation.y +=
            delta * 4;
        }

        if (
            object.position.z > 15 ||
            object.userData.checked
        ) {

            scene.remove(object);

            objects.splice(i, 1);
        }
    }

    checkCollisions();
}

// =====================================
// WINDOW RESIZE
// =====================================

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
        window.innerWidth /
        window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    }
);

// =====================================
// START RENDERING
// =====================================

animate();