// 1. Scene & Lighting (밝고 따뜻한 던전 조명)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e293b); // 훨씬 밝은 미드나이트 블루 배경
scene.fog = new THREE.FogExp2(0x1e293b, 0.012); // 안개 대폭 축소 (시야 투명)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// 플레이어 비추는 개인 등불
const playerLight = new THREE.PointLight(0xffedd5, 1.5, 20);
camera.add(playerLight);
scene.add(camera);

// 전체 환경 조명 (밝기 대폭 인상)
scene.add(new THREE.AmbientLight(0xcbd5e1, 1.8));

// 방마다 횃불 조명 추가 함수
function addTorch(x, y, z, color = 0xf59e0b) {
    const torchLight = new THREE.PointLight(color, 2.5, 18);
    torchLight.position.set(x, y, z);
    scene.add(torchLight);

    const torchGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6);
    const torchMat = new THREE.MeshBasicMaterial({ color: 0x78350f });
    const torchMesh = new THREE.Mesh(torchGeo, torchMat);
    torchMesh.position.set(x, y - 0.2, z);
    scene.add(torchMesh);

    const flameGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: color });
    const flameMesh = new THREE.Mesh(flameGeo, flameMat);
    flameMesh.position.set(x, y + 0.2, z);
    scene.add(flameMesh);
}

// 2. 퀴즈 데이터
const quizzes = [
    { q: "세포막의 주요 구성 성분으로, 친수성 머리와 소수성 다리를 가진 물질은?", options: ["1. 인지질", "2. 포도당", "3. 아미노산"], ans: 0, code: "7" },
    { q: "약물 전달 시스템(DDS)에서 표적 세포에 특이적으로 결합하는 수용체 부착물은?", options: ["1. 알콜", "2. 리간드", "3. 효소"], ans: 1, code: "3" },
    { q: "체내 산성 환경(pH 감소)을 만들어 약물 캡슐을 분해하는 세포 소기관은?", options: ["1. 리보솜", "2. 엽록체", "3. 리소좀"], ans: 2, code: "9" }
];

let collectedCodes = ["_", "_", "_"];
const wallBoxes = [];
const chestMeshes = [];

// 3. 디테일 던전 맵 빌더 (방 구획 구현)
const wallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });

function createWall(w, h, d, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    wallBoxes.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
}

// 외곽 벽 (40x40)
createWall(40, 6, 1, 0, 3, -20);
createWall(40, 6, 1, 0, 3, 20);
createWall(1, 6, 40, -20, 3, 0);
createWall(1, 6, 40, 20, 3, 0);

// 메인 바닥
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- 3개의 독립된 방(Room) 벽 구획 및 출입문 설계 ---
// 방 1 (좌측 방: X: -20~-6, Z: 2~18)
createWall(14, 6, 0.8, -13, 3, 2);  // 방1 남쪽 벽
createWall(0.8, 6, 10, -6, 3, 13);  // 방1 동쪽 벽 (입구 제외)
addTorch(-13, 4, 17, 0xf59e0b);

// 방 2 (우측 방: X: 6~20, Z: 2~18)
createWall(14, 6, 0.8, 13, 3, 2);   // 방2 남쪽 벽
createWall(0.8, 6, 10, 6, 3, 13);   // 방2 서쪽 벽
addTorch(13, 4, 17, 0xf59e0b);

// 방 3 (남쪽 중앙 방: X: -7~7, Z: -18~-6)
createWall(6, 6, 0.8, -10, 3, -6);
createWall(6, 6, 0.8, 10, 3, -6);
addTorch(0, 4, -17, 0x38bdf8);

// 2층 테라스 & 계단 구획 (북쪽 게이트 방)
createWall(38, 0.5, 8, 0, 3.5, -15);
for (let i = 0; i < 7; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 0.8), wallMat);
    step.position.set(0, (i * 0.5) + 0.25, -7 - (i * 0.8));
    scene.add(step);
    wallBoxes.push(new THREE.Box3().setFromObject(step));
}

// 각 방안의 디테일 장식 (테이블/받침대)
function createDesk(x, z) {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 2), woodMat);
    desk.position.set(x, 0.5, z);
    scene.add(desk);
    wallBoxes.push(new THREE.Box3().setFromObject(desk));
}
createDesk(-13, 13); // 방1 받침대
createDesk(13, 13);  // 방2 받침대
createDesk(0, -14);  // 방3 받침대

// 4. 상자 배치 (각 방안의 받침대 위)
const chestPositions = [[-13, 1.6, 13], [13, 1.6, 13], [0, 1.6, -14]];
chestPositions.forEach((pos, idx) => {
    const chestGeo = new THREE.BoxGeometry(1.2, 1, 1);
    const chestMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309 });
    const chest = new THREE.Mesh(chestGeo, chestMat);
    chest.position.set(pos[0], pos[1], pos[2]);
    chest.userData = { id: idx, opened: false };
    scene.add(chest);
    chestMeshes.push(chest);
});

// 게이트 (2층 중앙 방)
const gateGeo = new THREE.TorusGeometry(1.5, 0.3, 16, 100);
const gateMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
const gate = new THREE.Mesh(gateGeo, gateMat);
gate.position.set(0, 5.2, -17.5);
scene.add(gate);

// 5. 추격자 AI (리소좀)
const enemyGeo = new THREE.SphereGeometry(1.2, 32, 32);
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b });
const enemy = new THREE.Mesh(enemyGeo, enemyMat);
enemy.position.set(0, 1.2, 0);
scene.add(enemy);

// 6. 게임 상태 및 조작 제어
let hp = 100;
let gameStarted = false;
let isGameOver = false;
let inModal = false;
let nearbyTarget = null;
let currentChestTarget = null;

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let moveVector = { x: 0, y: 0 };

const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
if (isTouchDevice) document.getElementById('touch-controls').style.display = 'block';

const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');

function resetGamePosition() {
    hp = 100;
    collectedCodes = ["_", "_", "_"];
    updateCodeDisplay();
    document.getElementById('hp').innerText = '100%';
    gameStarted = false;
    isGameOver = false;
    inModal = false;
    nearbyTarget = null;
    document.getElementById('interact-prompt').style.display = 'none';

    camera.position.set(0, 1.6, 0);
    camera.rotation.set(0, 0, 0);
    enemy.position.set(0, 1.2, 8);

    chestMeshes.forEach(c => {
        c.userData.opened = false;
        c.material.color.setHex(0xf59e0b);
    });
}

function onStartMission(e) {
    if (e) e.preventDefault();
    resetGamePosition();
    startScreen.style.display = 'none';
    gameStarted = true;
    if (!isTouchDevice && document.body.requestPointerLock) {
        document.body.requestPointerLock();
    }
}

startBtn.addEventListener('click', onStartMission);
startBtn.addEventListener('touchstart', onStartMission);

function triggerNearbyInteraction() {
    if (!gameStarted || isGameOver || inModal || !nearbyTarget) return;

    if (nearbyTarget.type === 'chest') {
        openQuiz(nearbyTarget.object);
    } else if (nearbyTarget.type === 'gate') {
        openGateModal();
    }
}

function openQuiz(chest) {
    inModal = true;
    currentChestTarget = chest;
    resetMovementState();
    if (document.pointerLockElement) document.exitPointerLock();

    const qData = quizzes[chest.userData.id];
    document.getElementById('quiz-question').innerText = qData.q;
    const optsContainer = document.getElementById('quiz-options');
    optsContainer.innerHTML = '';

    qData.options.forEach((optText, optIdx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.innerText = optText;
        btn.onclick = () => checkAnswer(optIdx);
        optsContainer.appendChild(btn);
    });

    document.getElementById('quiz-modal').style.display = 'block';
}

function checkAnswer(selectedIdx) {
    const qData = quizzes[currentChestTarget.userData.id];
    if (selectedIdx === qData.ans) {
        alert(`정답입니다! 암호 코드 [ ${qData.code} ] 를 획득했습니다.`);
        collectedCodes[currentChestTarget.userData.id] = qData.code;
        updateCodeDisplay();
        currentChestTarget.userData.opened = true;
        currentChestTarget.material.color.setHex(0x475569);
    } else {
        alert("오답입니다! 지질막 내구도가 15% 감소합니다.");
        hp -= 15;
        document.getElementById('hp').innerText = Math.max(0, hp) + '%';
    }
    closeModal('quiz-modal');
}

function updateCodeDisplay() {
    document.getElementById('code-display').innerText = 
        `[ ${collectedCodes[0]} ] [ ${collectedCodes[1]} ] [ ${collectedCodes[2]} ]`;
}

function openGateModal() {
    inModal = true;
    resetMovementState();
    if (document.pointerLockElement) document.exitPointerLock();
    document.getElementById('gate-modal').style.display = 'block';
}

function submitGateCode() {
    const input = document.getElementById('gate-input').value;
    const correctCode = quizzes.map(q => q.code).join('');

    if (input === correctCode) {
        closeModal('gate-modal');
        gameSuccess();
    } else {
        alert("암호 코드가 일치하지 않습니다!");
    }
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    inModal = false;
    resetMovementState();

    if (!isTouchDevice && gameStarted && !isGameOver) {
        document.body.requestPointerLock();
    }
}

function resetMovementState() {
    moveForward = false; moveBackward = false; moveLeft = false; moveRight = false;
    moveVector = { x: 0, y: 0 };
    knob.style.transform = 'translate(0px, 0px)';
    joystickTouchId = null;
    cameraTouchId = null;
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') triggerNearbyInteraction();
    if (inModal) return;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') moveForward = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') moveBackward = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveLeft = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') moveRight = true;
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') moveForward = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') moveBackward = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveLeft = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') moveRight = false;
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body && !isGameOver && gameStarted && !inModal) {
        camera.rotation.y -= e.movementX * 0.0025;
    }
});

// --- 조이스틱 위치 및 멀티터치 트래킹 오류 수정 ---
const zone = document.getElementById('joystick-zone');
const knob = document.getElementById('joystick-knob');
let joystickTouchId = null;
let cameraTouchId = null;
let lastTouchX = 0;

window.addEventListener('touchstart', (e) => {
    if (!gameStarted || isGameOver || inModal) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const rect = zone.getBoundingClientRect();

        if (touch.clientX >= rect.left - 10 && touch.clientX <= rect.right + 10 &&
            touch.clientY >= rect.top - 10 && touch.clientY <= rect.bottom + 10) {
            if (joystickTouchId === null) {
                joystickTouchId = touch.identifier;
                updateJoystick(touch, rect);
            }
        } else if (cameraTouchId === null) {
            cameraTouchId = touch.identifier;
            lastTouchX = touch.clientX;
        }
    }
});

window.addEventListener('touchmove', (e) => {
    if (!gameStarted || isGameOver || inModal) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) {
            const rect = zone.getBoundingClientRect();
            updateJoystick(touch, rect);
        } else if (touch.identifier === cameraTouchId) {
            const deltaX = touch.clientX - lastTouchX;
            camera.rotation.y -= deltaX * 0.005;
            lastTouchX = touch.clientX;
        }
    }
});

window.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) resetJoystick();
        if (touch.identifier === cameraTouchId) cameraTouchId = null;
    }
});

function resetJoystick() {
    joystickTouchId = null;
    knob.style.transform = 'translate(0px, 0px)';
    moveVector = { x: 0, y: 0 };
}

function updateJoystick(touch, rect) {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const maxRadius = rect.width / 2 - 20;

    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
    }

    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    moveVector = { x: dx / maxRadius, y: dy / maxRadius };
}

function checkWallCollision(nextPos) {
    const playerRadius = 0.6;
    const playerBox = new THREE.Box3(
        new THREE.Vector3(nextPos.x - playerRadius, nextPos.y - 1, nextPos.z - playerRadius),
        new THREE.Vector3(nextPos.x + playerRadius, nextPos.y + 1.5, nextPos.z + playerRadius)
    );
    for (let i = 0; i < wallBoxes.length; i++) {
        if (playerBox.intersectsBox(wallBoxes[i])) return true;
    }
    return false;
}

// 메인 루프
const speed = 0.09;
const enemySpeed = 0.024;

function animate() {
    requestAnimationFrame(animate);

    if (!gameStarted || isGameOver) {
        renderer.render(scene, camera);
        return;
    }

    if (!inModal) {
        const dir = new THREE.Vector3();
        if (moveForward) dir.z -= 1;
        if (moveBackward) dir.z += 1;
        if (moveLeft) dir.x -= 1;
        if (moveRight) dir.x += 1;

        if (moveVector.x !== 0 || moveVector.y !== 0) {
            dir.x += moveVector.x;
            dir.z += moveVector.y;
        }

        if (dir.lengthSq() > 0) {
            dir.normalize();
            dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), camera.rotation.y);

            const targetPos = camera.position.clone().addScaledVector(dir, speed);
            const nextX = camera.position.clone(); nextX.x = targetPos.x;
            if (!checkWallCollision(nextX)) camera.position.x = targetPos.x;

            const nextZ = camera.position.clone(); nextZ.z = targetPos.z;
            if (!checkWallCollision(nextZ)) camera.position.z = targetPos.z;
        }

        // 계단 높이 보정
        if (camera.position.z < -7 && camera.position.z > -12.5 && Math.abs(camera.position.x) < 2.5) {
            const progress = (-7 - camera.position.z) / 5.5;
            camera.position.y = 1.6 + (progress * 3.5);
        } else if (camera.position.z <= -12.5) {
            camera.position.y = 5.1;
        } else {
            camera.position.y = 1.6;
        }

        // 추격자 이동
        const enemyDir = new THREE.Vector3().subVectors(camera.position, enemy.position);
        enemyDir.y = 0; enemyDir.normalize();
        enemy.position.addScaledVector(enemyDir, enemySpeed);
        enemy.position.y = camera.position.y - 0.4;

        // 접근 대상 감지
        let foundTarget = null;
        chestMeshes.forEach(chest => {
            chest.rotation.y += 0.01;
            if (!chest.userData.opened && camera.position.distanceTo(chest.position) < 2.8) {
                foundTarget = { type: 'chest', object: chest };
            }
        });

        if (!foundTarget && camera.position.distanceTo(gate.position) < 3.0) {
            foundTarget = { type: 'gate', object: gate };
        }

        nearbyTarget = foundTarget;
        const promptBtn = document.getElementById('interact-prompt');
        if (nearbyTarget) {
            promptBtn.style.display = 'block';
            promptBtn.innerText = nearbyTarget.type === 'chest' ? '[ 상자 열기 (E) ]' : '[ 게이트 암호 입력 (E) ]';
        } else {
            promptBtn.style.display = 'none';
        }

        if (camera.position.distanceTo(enemy.position) < 1.6) {
            hp -= 1;
            document.getElementById('hp').innerText = Math.max(0, hp) + '%';
            if (hp <= 0) gameFailed();
        }
    }

    gate.rotation.y += 0.02;
    renderer.render(scene, camera);
}

function gameFailed() {
    if (isGameOver) return;
    isGameOver = true;
    resetMovementState();
    if (document.pointerLockElement) document.exitPointerLock();

    const msg = document.getElementById('message-text');
    msg.innerHTML = "<span style='color:#ef4444;'>분해 효소에 잡혔습니다 (던전 탈출 실패)</span>";
    msg.style.display = 'block';

    setTimeout(() => {
        msg.style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
        resetGamePosition();
    }, 3000);
}

function gameSuccess() {
    if (isGameOver) return;
    isGameOver = true;
    resetMovementState();
    if (document.pointerLockElement) document.exitPointerLock();

    const msg = document.getElementById('message-text');
    msg.innerHTML = "<span style='color:#fbbf24;'>표적 수용체 결합 & 던전 탈출 성공!</span>";
    msg.style.display = 'block';

    setTimeout(() => {
        msg.style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
        resetGamePosition();
    }, 3000);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
