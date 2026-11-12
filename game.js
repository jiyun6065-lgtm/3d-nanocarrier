// 1. Scene & Lighting (적절한 명도의 분위기 있는 라이팅)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e293b);
scene.fog = new THREE.FogExp2(0x1e293b, 0.015); // 적절한 안개감 복원

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// 플레이어 등불
const playerLight = new THREE.PointLight(0xffedd5, 1.2, 18);
camera.add(playerLight);
scene.add(camera);

// 전체 환경 조명 (너무 밝지 않게 조절)
scene.add(new THREE.AmbientLight(0x94a3b8, 1.2));
const dirLight = new THREE.DirectionalLight(0xfbbf24, 0.6);
dirLight.position.set(10, 20, 10);
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

// 횃불 조명
function addTorch(x, y, z, color = 0xf59e0b) {
    const torchLight = new THREE.PointLight(color, 2.0, 15);
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
const stairsBoxes = []; // 계단 구역 감지용 박스
const chestMeshes = [];

// 3. 지형 및 방 구획
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

// 외곽 벽
createWall(40, 6, 1, 0, 3, -20);
createWall(40, 6, 1, 0, 3, 20);
createWall(1, 6, 40, -20, 3, 0);
createWall(1, 6, 40, 20, 3, 0);

// 바닥
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// 3개 독립 방 구획
createWall(14, 6, 0.8, -13, 3, 2);
createWall(0.8, 6, 10, -6, 3, 13);
addTorch(-13, 4, 17, 0xf59e0b);

createWall(14, 6, 0.8, 13, 3, 2);
createWall(0.8, 6, 10, 6, 3, 13);
addTorch(13, 4, 17, 0xf59e0b);

createWall(6, 6, 0.8, -10, 3, -6);
createWall(6, 6, 0.8, 10, 3, -6);
addTorch(0, 4, -17, 0x38bdf8);

// 2층 테라스 & 자동 오르기 계단 설계
createWall(38, 0.5, 8, 0, 3.5, -15);

// 계단 디딤판 생성 (자동 오르기 충돌 적용)
for (let i = 0; i < 8; i++) {
    const stepGeo = new THREE.BoxGeometry(5, 0.45, 0.8);
    const step = new THREE.Mesh(stepGeo, wallMat);
    step.position.set(0, (i * 0.45) + 0.2, -6.5 - (i * 0.75));
    scene.add(step);
}

// 각 방 받침대 및 상자 배치
function createDesk(x, z) {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 2), woodMat);
    desk.position.set(x, 0.5, z);
    scene.add(desk);
    wallBoxes.push(new THREE.Box3().setFromObject(desk));
}
createDesk(-13, 13);
createDesk(13, 13);
createDesk(0, -14);

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

// 게이트
const gateGeo = new THREE.TorusGeometry(1.5, 0.3, 16, 100);
const gateMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
const gate = new THREE.Mesh(gateGeo, gateMat);
gate.position.set(0, 5.2, -17.5);
scene.add(gate);

// 추격자 AI
const enemyGeo = new THREE.SphereGeometry(1.2, 32, 32);
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b });
const enemy = new THREE.Mesh(enemyGeo, enemyMat);
enemy.position.set(0, 1.2, 0);
scene.add(enemy);

// 4. 상태 관리 변수
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
if (isTouchDevice) joystickWrapper.style.display = 'block';

// 시작 버튼 및 모달 요소 가져오기
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');

function onStartMission(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 1. 게임 위치 및 데이터 초기화
    resetGamePosition();
    
    // 2. 시작 화면 숨기기
    if (startScreen) {
        startScreen.style.display = 'none';
    }
    
    // 3. 게임 시작 상태로 변경
    gameStarted = true;

    // 4. PC(마우스) 환경인 경우 PointerLock 실행
    if (!isTouchDevice && document.body.requestPointerLock) {
        document.body.requestPointerLock();
    }
}

// 클릭 및 터치 이벤트 모두 등록
if (startBtn) {
    startBtn.onclick = onStartMission;
    startBtn.addEventListener('touchstart', onStartMission, { passive: false });
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

// 5. 모바일 터치 & 조이스틱 오프셋 완벽 고정
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
        new THREE.Vector3(nextPos.x + playerRadius, nextPos.y + 1.2, nextPos.z + playerRadius)
    );
    for (let i = 0; i < wallBoxes.length; i++) {
        if (playerBox.intersectsBox(wallBoxes[i])) return true;
    }
    return false;
}

// 6. 메인 프레임 루프 (자동 계단 오르기 보정 포함)
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

        // --- 자동 계단 오르기/내리기 높이 보정 로직 ---
        if (camera.position.z <= -6.0 && camera.position.z >= -12.5 && Math.abs(camera.position.x) <= 2.8) {
            const progress = (-6.0 - camera.position.z) / 6.5; // 계단 경사 진행률
            camera.position.y = 1.6 + (progress * 3.5); // 자동으로 높이 증가
        } else if (camera.position.z < -12.5) {
            camera.position.y = 5.1; // 2층 테라스 보정
        } else {
            camera.position.y = 1.6; // 1층 바닥 보정
        }

        // 추격자 AI 이동 (높이 동기화)
        const enemyDir = new THREE.Vector3().subVectors(camera.position, enemy.position);
        enemyDir.y = 0; enemyDir.normalize();
        enemy.position.addScaledVector(enemyDir, enemySpeed);
        enemy.position.y = camera.position.y - 0.4;

        // 접근 대상 확인
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
