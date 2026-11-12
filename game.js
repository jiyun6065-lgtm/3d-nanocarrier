// 1. Scene & Lighting 설정
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e293b);
scene.fog = new THREE.FogExp2(0x1e293b, 0.014);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// 플레이어 개인 등불 및 환경 조명
const playerLight = new THREE.PointLight(0xffedd5, 1.3, 20);
camera.add(playerLight);
scene.add(camera);

scene.add(new THREE.AmbientLight(0x94a3b8, 1.3));
const dirLight = new THREE.DirectionalLight(0xfbbf24, 0.6);
dirLight.position.set(10, 25, 10);
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
    texture.repeat.set(2, 2);
    return texture;
}

const stoneTexture = createStoneTexture();

// 횃불 조명 추가 함수
function addTorch(x, y, z, color = 0xf59e0b) {
    const torchLight = new THREE.PointLight(color, 2.2, 16);
    torchLight.position.set(x, y, z);
    scene.add(torchLight);

    const torchGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6);
    const torchMat = new THREE.MeshBasicMaterial({ color: 0x78350f });
    const torchMesh = new THREE.Mesh(torchGeo, torchMat);
    torchMesh.position.set(x, y - 0.2, z);
    scene.add(torchMesh);

    const flameGeo = new THREE.SphereGeometry(0.22, 8, 8);
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

// 3. 도면(image_c112f8) 기반 맵 지형 및 방 구획 생성
const wallMat = new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 0.6 });
const floorMat = new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 0.5 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });

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

// [중앙 홀: X: -10 ~ 10, Z: -10 ~ 10]
createFloor(20, 20, 0, 0, 0);
addTorch(-8, 4, -8, 0xf59e0b);
addTorch(8, 4, -8, 0xf59e0b);
addTorch(-8, 4, 8, 0xf59e0b);
addTorch(8, 4, 8, 0xf59e0b);

// 홀 북쪽 벽 (2층 올라가는 계단 중앙 4칸 개방)
createWall(8, 7, 1, -6, 3.5, -10);
createWall(8, 7, 1, 6, 3.5, -10);

// 홀 서쪽 벽 (Room 1 연결 통로 Z: -2 ~ 2 개방)
createWall(1, 6, 8, -10, 3, -6);
createWall(1, 6, 8, -10, 3, 6);

// 홀 동쪽 벽 (Room 3 연결 통로 Z: -2 ~ 2 개방)
createWall(1, 6, 8, 10, 3, -6);
createWall(1, 6, 8, 10, 3, 6);

// 홀 남쪽 벽 (Room 2 연결 통로 X: -2 ~ 2 개방)
createWall(8, 6, 1, -6, 3, 10);
createWall(8, 6, 1, 6, 3, 10);

// [Room 1 - 서쪽 방: 복도 X: -14 ~ -10, 방 X: -22 ~ -14, Z: -6 ~ 6]
createFloor(4, 4, -12, 0, 0); // 복도 바닥
createWall(4, 6, 0.8, -12, 3, -2); // 복도 북벽
createWall(4, 6, 0.8, -12, 3, 2);  // 복도 남벽

createFloor(8, 12, -18, 0, 0); // 방 바닥
createWall(8, 6, 0.8, -18, 3, -6); // 방 북벽
createWall(8, 6, 0.8, -18, 3, 6);  // 방 남벽
createWall(0.8, 6, 12, -22, 3, 0); // 방 서벽
createWall(0.8, 6, 4, -14, 3, -4); // 방 동벽 상단
createWall(0.8, 6, 4, -14, 3, 4);  // 방 동벽 하단
addTorch(-20, 4, 0, 0xf59e0b);

// [Room 2 - 남쪽 방: 복도 Z: 10 ~ 14, 방 X: -6 ~ 6, Z: 14 ~ 22]
createFloor(4, 4, 0, 0, 12); // 복도 바닥
createWall(0.8, 6, 4, -2, 3, 12); // 복도 서벽
createWall(0.8, 6, 4, 2, 3, 12);  // 복도 동벽

createFloor(12, 8, 0, 0, 18); // 방 바닥
createWall(4, 6, 0.8, -4, 3, 14);  // 방 북벽 좌측
createWall(4, 6, 0.8, 4, 3, 14);   // 방 북벽 우측
createWall(12, 6, 0.8, 0, 3, 22);  // 방 남벽
createWall(0.8, 6, 8, -6, 3, 18);  // 방 서벽
createWall(0.8, 6, 8, 6, 3, 18);   // 방 동벽
addTorch(0, 4, 20, 0xf59e0b);

// [Room 3 - 동쪽 방: 복도 X: 10 ~ 14, 방 X: 14 ~ 22, Z: -6 ~ 6]
createFloor(4, 4, 12, 0, 0); // 복도 바닥
createWall(4, 6, 0.8, 12, 3, -2); // 복도 북벽
createWall(4, 6, 0.8, 12, 3, 2);  // 복도 남벽

createFloor(8, 12, 18, 0, 0); // 방 바닥
createWall(8, 6, 0.8, 18, 3, -6); // 방 북벽
createWall(8, 6, 0.8, 18, 3, 6);  // 방 남벽
createWall(0.8, 6, 12, 22, 3, 0); // 방 동벽
createWall(0.8, 6, 4, 14, 3, -4); // 방 서벽 상단
createWall(0.8, 6, 4, 14, 3, 4);  // 방 서벽 하단
addTorch(20, 4, 0, 0xf59e0b);

// [북쪽 2층 테라스 & 계단: Z: -10 ~ -15 계단, Z: -15 ~ -22 2층 바닥]
createWall(24, 0.5, 8, 0, 3.25, -18.5); // 2층 바닥 (윗면 높이 Y=3.5)
createWall(24, 4, 0.8, 0, 5.5, -22.5);  // 2층 북쪽 외벽
createWall(0.8, 4, 8, -12, 5.5, -18.5); // 2층 서쪽 외벽
createWall(0.8, 4, 8, 12, 5.5, -18.5);  // 2층 동쪽 외벽
addTorch(-8, 6.5, -21, 0x38bdf8);
addTorch(8, 6.5, -21, 0x38bdf8);

// 계단 디딤판 생성 (시각적 계단)
for (let i = 0; i < 8; i++) {
    const stepGeo = new THREE.BoxGeometry(4, 0.45, 0.65);
    const step = new THREE.Mesh(stepGeo, wallMat);
    step.position.set(0, (i * 0.43) + 0.2, -10.2 - (i * 0.62));
    scene.add(step);
}

// 각 방안의 받침대(책상) 및 암호 상자 배치
function createDesk(x, z) {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 2.2), woodMat);
    desk.position.set(x, 0.5, z);
    scene.add(desk);
    wallBoxes.push(new THREE.Box3().setFromObject(desk));
}
createDesk(-19, 0); // Room 1 받침대
createDesk(0, 19);  // Room 2 받침대
createDesk(19, 0);  // Room 3 받침대

const chestPositions = [
    [-19, 1.5, 0], // Room 1 상자
    [0, 1.5, 19],  // Room 2 상자
    [19, 1.5, 0]   // Room 3 상자
];

chestPositions.forEach((pos, idx) => {
    const chestGeo = new THREE.BoxGeometry(1.1, 0.9, 0.9);
    const chestMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309 });
    const chest = new THREE.Mesh(chestGeo, chestMat);
    chest.position.set(pos[0], pos[1], pos[2]);
    chest.userData = { id: idx, opened: false };
    scene.add(chest);
    chestMeshes.push(chest);
});

// 최종 탈출 게이트 (2층 북쪽 중앙)
const gateGeo = new THREE.TorusGeometry(1.5, 0.3, 16, 100);
const gateMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
const gate = new THREE.Mesh(gateGeo, gateMat);
gate.position.set(0, 5.2, -21);
scene.add(gate);

// 추격자 AI (리소좀)
const enemyGeo = new THREE.SphereGeometry(1.1, 32, 32);
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b });
const enemy = new THREE.Mesh(enemyGeo, enemyMat);
enemy.position.set(0, 1.1, -6);
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

const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
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

    // 플레이어 홀 중앙 남쪽 시작
    camera.position.set(0, 1.6, 5);
    camera.rotation.set(0, 0, 0);
    
    // 추격자 홀 북쪽 시작
    enemy.position.set(0, 1.1, -6);

    chestMeshes.forEach(c => {
        c.userData.opened = false;
        c.material.color.setHex(0xf59e0b);
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
        currentChestTarget.material.color.setHex(0x475569);
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

        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            if (joystickTouchId === null) {
                joystickTouchId = touch.identifier;
                updateJoystick(touch, rect);
            }
        } else if (cameraTouchId === null && touch.clientX > window.innerWidth / 3) {
            cameraTouchId = touch.identifier;
            lastTouchX = touch.clientX;
        }
    }
}, { passive: false });

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
}, { passive: false });

window.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) resetJoystick();
        if (touch.identifier === cameraTouchId) cameraTouchId = null;
    }
});

// 벽 충돌 판정
function checkWallCollision(nextPos) {
    const playerRadius = 0.6;
    const playerBox = new THREE.Box3(
        new THREE.Vector3(nextPos.x - playerRadius, nextPos.y - 1, nextPos.z - playerRadius),
        new THREE.Vector3(nextPos.x + playerRadius, nextPos.y + 1.2, nextPos.z + playerRadius)
    );
    for (let i = 0; i < wallBoxes.length; i++) {
        if (playerBox.intersectsBox(wallBoxes[i])) return true;
    }
    return false;
}

// 7. 메인 게임 루프
const speed = 0.095;
const enemySpeed = 0.032;

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

        // 계단 자동 오르기/내리기 (Z: -10 ~ -15 구간)
        if (camera.position.z <= -10.0 && camera.position.z >= -15.0 && Math.abs(camera.position.x) <= 2.2) {
            const progress = (-10.0 - camera.position.z) / 5.0;
            camera.position.y = 1.6 + (progress * 3.5);
        } else if (camera.position.z < -15.0) {
            camera.position.y = 5.1; // 2층 바닥 높이
        } else {
            camera.position.y = 1.6; // 1층 홀/방 바닥 높이
        }

        // --- 추격자 AI 이동 (홀 구역 X: -8.5 ~ 8.5, Z: -8.5 ~ 8.5 내부로 엄격 제한) ---
        const isPlayerInHall = (Math.abs(camera.position.x) <= 9.2 && Math.abs(camera.position.z) <= 9.2 && camera.position.y < 2.5);
        
        // 플레이어가 홀에 있으면 플레이어 추적, 방이나 2층으로 피신하면 홀 중앙(0, 0)으로 복귀 순찰
        const targetX = isPlayerInHall ? camera.position.x : 0;
        const targetZ = isPlayerInHall ? camera.position.z : 0;
        const targetVec = new THREE.Vector3(targetX, 1.1, targetZ);

        if (enemy.position.distanceTo(targetVec) > 0.3) {
            const enemyDir = new THREE.Vector3().subVectors(targetVec, enemy.position);
            enemyDir.y = 0;
            enemyDir.normalize();
            enemy.position.addScaledVector(enemyDir, enemySpeed);
        }

        // 추격자 좌표가 홀 경계를 절대 벗어나지 않도록 강제 클램핑
        enemy.position.x = Math.max(-8.5, Math.min(8.5, enemy.position.x));
        enemy.position.z = Math.max(-8.5, Math.min(8.5, enemy.position.z));
        enemy.position.y = 1.1;

        // 상호작용 대상 감지
        let foundTarget = null;
        chestMeshes.forEach(chest => {
            chest.rotation.y += 0.015;
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

        // 피격 판정 (추격자와 접촉 시)
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
