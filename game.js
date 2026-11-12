// 1. Scene & Lighting 설정
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e293b);
scene.fog = new THREE.FogExp2(0x1e293b, 0.005);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// 플레이어 개인 등불 및 환경 조명
const playerLight = new THREE.PointLight(0xffedd5, 1.6, 45);
camera.add(playerLight);
scene.add(camera);

scene.add(new THREE.AmbientLight(0x94a3b8, 1.45));
const dirLight = new THREE.DirectionalLight(0xfbbf24, 0.75);
dirLight.position.set(25, 50, 25);
scene.add(dirLight);

// 돌 텍스처 생성
function createStoneTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    for (let i = 0; i < 256; i += 64) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    }

    for (let i = 0; i < 1200; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#475569' : '#1e293b';
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);
    return texture;
}

const stoneTexture = createStoneTexture();
const torchFlames = [];

// 사실적인 벽걸이 횃불 생성 함수
function addTorch(x, y, z, color = 0xf59e0b) {
    const torchGroup = new THREE.Group();
    torchGroup.position.set(x, y, z);

    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 12), bracketMat);
    ring.position.y = -0.1;
    torchGroup.add(ring);

    const handleMat = new THREE.MeshStandardMaterial({ color: 0x5c2d16, roughness: 0.9 });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.06, 0.85, 10), handleMat);
    handle.position.y = -0.28;
    torchGroup.add(handle);

    const headMat = new THREE.MeshStandardMaterial({ color: 0x291509, emissive: 0x7c2d12, roughness: 1.0 });
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.2, 10), headMat);
    head.position.y = 0.18;
    torchGroup.add(head);

    const outerFlameMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.85 });
    const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 10), outerFlameMat);
    outerFlame.position.y = 0.52;
    torchGroup.add(outerFlame);

    const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 8), innerFlameMat);
    innerFlame.position.y = 0.42;
    torchGroup.add(innerFlame);

    const torchLight = new THREE.PointLight(color, 3.2, 42);
    torchLight.position.set(0, 0.65, 0);
    torchGroup.add(torchLight);

    scene.add(torchGroup);
    torchFlames.push({ outer: outerFlame, inner: innerFlame, light: torchLight, baseIntensity: 3.2, offset: Math.random() * 10 });
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

// 3. 초대형 확장 도면 기반 맵 지형 및 방 구획 생성
const wallMat = new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 0.6 });
const floorMat = new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 0.5 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });

function createWall(w, h, d, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    wallBoxes.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
}

function createFloor(w, d, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), floorMat);
    mesh.position.set(x, y - 0.1, z);
    scene.add(mesh);
}

// [중앙 홀: X: -25 ~ 25, Z: -25 ~ 25 (50x50 크기)]
createFloor(50, 50, 0, 0, 0);
addTorch(-23, 5.0, -23, 0xf59e0b);
addTorch(23, 5.0, -23, 0xf59e0b);
addTorch(-23, 5.0, 23, 0xf59e0b);
addTorch(23, 5.0, 23, 0xf59e0b);
addTorch(-7.5, 5.0, -24.2, 0xf59e0b);
addTorch(7.5, 5.0, -24.2, 0xf59e0b);

// 홀 북쪽 벽 (2층 계단 입구 X: -5 ~ 5 개방, 양옆 빈 벽을 2층 천장까지 완전히 채움)
createWall(25, 11, 1, -17.5, 5.5, -25);
createWall(25, 11, 1, 17.5, 5.5, -25);

// 계단 양옆 터널 측벽 (Z: -25 ~ -37.5 구간 좌우 완전히 마감)
createWall(1, 11, 12.5, -5.5, 5.5, -31.25);
createWall(1, 11, 12.5, 5.5, 5.5, -31.25);

// 홀 서쪽 벽 (Room 1 연결 통로 Z: -5 ~ 5 개방)
createWall(1, 9, 20, -25, 4.5, -15);
createWall(1, 9, 20, -25, 4.5, 15);

// 홀 동쪽 벽 (Room 3 연결 통로 Z: -5 ~ 5 개방)
createWall(1, 9, 20, 25, 4.5, -15);
createWall(1, 9, 20, 25, 4.5, 15);

// 홀 남쪽 벽 (Room 2 연결 통로 X: -5 ~ 5 개방)
createWall(20, 9, 1, -15, 4.5, 25);
createWall(20, 9, 1, 15, 4.5, 25);

// [Room 1 - 서쪽 방: 복도 X: -35 ~ -25, 방 X: -55 ~ -35, Z: -15 ~ 15]
createFloor(10, 10, -30, 0, 0);
createWall(10, 9, 0.8, -30, 4.5, -5);
createWall(10, 9, 0.8, -30, 4.5, 5);

createFloor(20, 30, -45, 0, 0);
createWall(20, 9, 0.8, -45, 4.5, -15);
createWall(20, 9, 0.8, -45, 4.5, 15);
createWall(0.8, 9, 30, -55, 4.5, 0);
createWall(0.8, 9, 10, -35, 4.5, -10);
createWall(0.8, 9, 10, -35, 4.5, 10);
addTorch(-54.2, 5.0, -9, 0xf59e0b);
addTorch(-54.2, 5.0, 9, 0xf59e0b);

// [Room 2 - 남쪽 방: 복도 Z: 25 ~ 35, 방 X: -15 ~ 15, Z: 35 ~ 55]
createFloor(10, 10, 0, 0, 30);
createWall(0.8, 9, 10, -5, 4.5, 30);
createWall(0.8, 9, 10, 5, 4.5, 30);

createFloor(30, 20, 0, 0, 45);
createWall(10, 9, 0.8, -10, 4.5, 35);
createWall(10, 9, 0.8, 10, 4.5, 35);
createWall(30, 9, 0.8, 0, 4.5, 55);
createWall(0.8, 9, 20, -15, 4.5, 45);
createWall(0.8, 9, 20, 15, 4.5, 45);
addTorch(-9, 5.0, 54.2, 0xf59e0b);
addTorch(9, 5.0, 54.2, 0xf59e0b);

// [Room 3 - 동쪽 방: 복도 X: 25 ~ 35, 방 X: 35 ~ 55, Z: -15 ~ 15]
createFloor(10, 10, 30, 0, 0);
createWall(10, 9, 0.8, 30, 4.5, -5);
createWall(10, 9, 0.8, 30, 4.5, 5);

createFloor(20, 30, 45, 0, 0);
createWall(20, 9, 0.8, 45, 4.5, -15);
createWall(20, 9, 0.8, 45, 4.5, 15);
createWall(0.8, 9, 30, 55, 4.5, 0);
createWall(0.8, 9, 10, 35, 4.5, -10);
createWall(0.8, 9, 10, 35, 4.5, 10);
addTorch(54.2, 5.0, -9, 0xf59e0b);
addTorch(54.2, 5.0, 9, 0xf59e0b);

// [북쪽 2층 테라스 & 계단: Z: -25 ~ -37.5 계단, Z: -37.5 ~ -55.5 2층 바닥]
createFloor(60, 18, 0, 5.8, -46.5); // 2층 바닥 (윗면 높이 Y=5.8)

// 2층 테라스 외벽 및 계단 출구 좌우 난간 벽 마감
createWall(60, 6.0, 0.8, 0, 8.8, -55.5);     // 2층 북쪽 외벽
createWall(0.8, 6.0, 18, -30, 8.8, -46.5);   // 2층 서쪽 외벽
createWall(0.8, 6.0, 18, 30, 8.8, -46.5);    // 2층 동쪽 외벽
createWall(25, 6.0, 0.8, -17.5, 8.8, -37.5); // 2층 계단 출구 좌측 난간 벽
createWall(25, 6.0, 0.8, 17.5, 8.8, -37.5);  // 2층 계단 출구 우측 난간 벽

addTorch(-18, 9.2, -54.7, 0x38bdf8);
addTorch(18, 9.2, -54.7, 0x38bdf8);

// 계단 디딤판 생성 (18단 확장 계단)
for (let i = 0; i < 18; i++) {
    const stepGeo = new THREE.BoxGeometry(10, 0.36, 0.72);
    const step = new THREE.Mesh(stepGeo, wallMat);
    step.position.set(0, (i * 0.322) + 0.18, -25.35 - (i * 0.68));
    scene.add(step);
}

// 각 방안의 받침대(책상) 및 사실적인 보물상자 배치
function createDesk(x, z) {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 3.4), woodMat);
    desk.position.set(x, 0.55, z);
    scene.add(desk);
    wallBoxes.push(new THREE.Box3().setFromObject(desk));
}
createDesk(-48, 0); // Room 1 받침대
createDesk(0, 48);  // Room 2 받침대
createDesk(48, 0);  // Room 3 받침대

function createRealisticChest(x, y, z, id) {
    const chestGroup = new THREE.Group();
    chestGroup.position.set(x, y, z);

    const chestWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });
    const metalBandMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2, emissive: 0x78350f });

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 1.1), chestWoodMat);
    base.position.y = -0.15;
    chestGroup.add(base);

    const lidGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.6, 16, 1, false, 0, Math.PI);
    lidGeo.rotateZ(Math.PI / 2);
    const lid = new THREE.Mesh(lidGeo, chestWoodMat);
    lid.position.y = 0.225;
    chestGroup.add(lid);

    [-0.65, 0.65].forEach(bx => {
        const bandBase = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.77, 1.14), metalBandMat);
        bandBase.position.set(bx, -0.15, 0);
        chestGroup.add(bandBase);

        const bandLidGeo = new THREE.CylinderGeometry(0.57, 0.57, 0.15, 16, 1, false, 0, Math.PI);
        bandLidGeo.rotateZ(Math.PI / 2);
        const bandLid = new THREE.Mesh(bandLidGeo, metalBandMat);
        bandLid.position.set(bx, 0.225, 0);
        chestGroup.add(bandLid);
    });

    const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.09), goldMat);
    lockPlate.position.set(0, 0.14, 0.56);
    chestGroup.add(lockPlate);

    chestGroup.userData = { id: id, opened: false, goldMat: goldMat };
    scene.add(chestGroup);
    chestMeshes.push(chestGroup);
}

createRealisticChest(-48, 1.62, 0, 0);
createRealisticChest(0, 1.62, 48, 1);
createRealisticChest(48, 1.62, 0, 2);

// 최종 탈출 게이트 (2층 북쪽 중앙)
const gateGeo = new THREE.TorusGeometry(2.4, 0.45, 16, 100);
const gateMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
const gate = new THREE.Mesh(gateGeo, gateMat);
gate.position.set(0, 8.5, -53);
scene.add(gate);

// 추격자 AI (리소좀)
const enemyGeo = new THREE.SphereGeometry(1.6, 32, 32);
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b });
const enemy = new THREE.Mesh(enemyGeo, enemyMat);
enemy.position.set(0, 1.6, -15);
scene.add(enemy);

// 4. 게임 상태 및 조작 변수
let hp = 100;
let gameStarted = false;
let isGameOver = false;
let inModal = false;
let nearbyTarget = null;
let currentChestTarget = null;

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let moveVector = { x: 0, y: 0 };

const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia("(pointer: coarse)").matches;
const joystickWrapper = document.getElementById('joystick-wrapper');
if (isTouchDevice && joystickWrapper) {
    joystickWrapper.style.display = 'block';
}

const zone = document.getElementById('joystick-zone');
const knob = document.getElementById('joystick-knob');
let joystickTouchId = null;
let cameraTouchId = null;
let lastTouchX = 0;

function resetJoystick() {
    joystickTouchId = null;
    if (knob) knob.style.transform = 'translate(0px, 0px)';
    moveVector = { x: 0, y: 0 };
}

function resetMovementState() {
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
    resetJoystick();
    cameraTouchId = null;
}

function updateCodeDisplay() {
    const display = document.getElementById('code-display');
    if (display) {
        display.innerText = `[ ${collectedCodes[0]} ] [ ${collectedCodes[1]} ] [ ${collectedCodes[2]} ]`;
    }
}

function resetGamePosition() {
    hp = 100;
    collectedCodes = ["_", "_", "_"];
    updateCodeDisplay();
    const hpEl = document.getElementById('hp');
    if (hpEl) hpEl.innerText = '100%';
    gameStarted = false;
    isGameOver = false;
    inModal = false;
    nearbyTarget = null;
    const promptEl = document.getElementById('interact-prompt');
    if (promptEl) promptEl.style.display = 'none';

    camera.position.set(0, 2.1, 14);
    camera.rotation.set(0, 0, 0);
    
    enemy.position.set(0, 1.6, -15);

    chestMeshes.forEach(c => {
        c.userData.opened = false;
        if (c.userData.goldMat) {
            c.userData.goldMat.color.setHex(0xfbbf24);
            c.userData.goldMat.emissive.setHex(0x78350f);
        }
    });
}

// 5. 시작 버튼 이벤트 바인딩
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');

function onStartMission(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    resetGamePosition();
    if (startScreen) startScreen.style.display = 'none';
    if (isTouchDevice && joystickWrapper) {
        joystickWrapper.style.display = 'block';
    }
    gameStarted = true;
    if (!isTouchDevice && document.body.requestPointerLock) {
        document.body.requestPointerLock();
    }
}

if (startBtn) {
    startBtn.onclick = onStartMission;
    startBtn.addEventListener('click', onStartMission);
    startBtn.addEventListener('touchstart', onStartMission, { passive: false });
}

// 6. 퀴즈 및 모달 상호작용
function triggerNearbyInteraction() {
    if (!gameStarted || isGameOver || inModal || !nearbyTarget) return;
    if (nearbyTarget.type === 'chest') openQuiz(nearbyTarget.object);
    else if (nearbyTarget.type === 'gate') openGateModal();
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
        if (currentChestTarget.userData.goldMat) {
            currentChestTarget.userData.goldMat.color.setHex(0x475569);
            currentChestTarget.userData.goldMat.emissive.setHex(0x000000);
        }
    } else {
        alert("오답입니다! 지질막 내구도가 15% 감소합니다.");
        hp -= 15;
        document.getElementById('hp').innerText = Math.max(0, hp) + '%';
    }
    closeModal('quiz-modal');
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
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
    inModal = false;
    resetMovementState();

    if (!isTouchDevice && gameStarted && !isGameOver) {
        document.body.requestPointerLock();
    }
}

// 키보드 및 마우스 조작
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

// 모바일 터치 및 조이스틱 조작
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

    if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
    moveVector = { x: dx / maxRadius, y: dy / maxRadius };
}

window.addEventListener('touchstart', (e) => {
    if (!gameStarted || isGameOver || inModal) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const rect = zone.getBoundingClientRect();

        if (touch.clientX >= rect.left - 15 && touch.clientX <= rect.right + 15 &&
            touch.clientY >= rect.top - 15 && touch.clientY <= rect.bottom + 15) {
            if (joystickTouchId === null) {
                joystickTouchId = touch.identifier;
                updateJoystick(touch, rect);
            }
        } else if (cameraTouchId === null && touch.clientX > window.innerWidth * 0.35) {
            cameraTouchId = touch.identifier;
            lastTouchX = touch.clientX;
        }
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (!gameStarted || isGameOver || inModal) return;
    e.preventDefault();

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
}, { passive: false });

window.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) resetJoystick();
        if (touch.identifier === cameraTouchId) cameraTouchId = null;
    }
});

window.addEventListener('touchcancel', (e) => {
    resetJoystick();
    cameraTouchId = null;
});

// 벽 충돌 판정
function checkWallCollision(nextPos) {
    const playerRadius = 0.75;
    const playerBox = new THREE.Box3(
        new THREE.Vector3(nextPos.x - playerRadius, nextPos.y - 1.5, nextPos.z - playerRadius),
        new THREE.Vector3(nextPos.x + playerRadius, nextPos.y + 0.8, nextPos.z + playerRadius)
    );
    for (let i = 0; i < wallBoxes.length; i++) {
        if (playerBox.intersectsBox(wallBoxes[i])) return true;
    }
    return false;
}

// 7. 메인 게임 루프
const speed = 0.30;
const enemySpeed = 0.13;
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // 횃불 불꽃 일렁임 애니메이션
    torchFlames.forEach(t => {
        const flicker = Math.sin(elapsedTime * 12 + t.offset) * 0.12 + Math.cos(elapsedTime * 23 + t.offset) * 0.08;
        t.outer.scale.set(1 + flicker * 0.5, 1 + flicker, 1 + flicker * 0.5);
        t.inner.scale.set(1 + flicker * 0.4, 1 + flicker * 0.8, 1 + flicker * 0.4);
        t.light.intensity = t.baseIntensity + flicker * 1.5;
    });

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

        // 확장된 계단 자동 오르기/내리기 (Z: -25.0 ~ -37.5 구간, 1층 Y=2.1 -> 2층 Y=7.9)
        if (camera.position.z <= -25.0 && camera.position.z >= -37.5 && Math.abs(camera.position.x) <= 5.0) {
            const progress = (-25.0 - camera.position.z) / 12.5;
            camera.position.y = 2.1 + (progress * 5.8);
        } else if (camera.position.z < -37.5) {
            camera.position.y = 7.9;
        } else {
            camera.position.y = 2.1;
        }

        // 추격자 AI 이동 (홀 구역 X: -22.5 ~ 22.5, Z: -22.5 ~ 22.5 내부로 제한)
        const isPlayerInHall = (Math.abs(camera.position.x) <= 23.5 && Math.abs(camera.position.z) <= 23.5 && camera.position.y < 3.0);
        
        const targetX = isPlayerInHall ? camera.position.x : 0;
        const targetZ = isPlayerInHall ? camera.position.z : 0;
        const targetVec = new THREE.Vector3(targetX, 1.6, targetZ);

        if (enemy.position.distanceTo(targetVec) > 0.4) {
            const enemyDir = new THREE.Vector3().subVectors(targetVec, enemy.position);
            enemyDir.y = 0;
            enemyDir.normalize();
            enemy.position.addScaledVector(enemyDir, enemySpeed);
        }

        enemy.position.x = Math.max(-22.5, Math.min(22.5, enemy.position.x));
        enemy.position.z = Math.max(-22.5, Math.min(22.5, enemy.position.z));
        enemy.position.y = 1.6;

        // 상호작용 대상 감지
        let foundTarget = null;
        chestMeshes.forEach(chest => {
            chest.rotation.y += 0.015;
            if (!chest.userData.opened && camera.position.distanceTo(chest.position) < 4.0) {
                foundTarget = { type: 'chest', object: chest };
            }
        });

        if (!foundTarget && camera.position.distanceTo(gate.position) < 4.8) {
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

        // 피격 판정
        const horizontalDist = Math.hypot(camera.position.x - enemy.position.x, camera.position.z - enemy.position.z);
        if (horizontalDist < 2.2 && camera.position.y < 3.2) {
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
