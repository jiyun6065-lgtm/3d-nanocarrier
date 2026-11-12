import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

// ==========================================
// 1. 기본 씬, 카메라, 렌더러 설정
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060b14);
scene.fog = new THREE.FogExp2(0x060b14, 0.03);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 13.5); // 남쪽 입구 부근 시작

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ==========================================
// 2. 시작 화면 버튼 및 PointerLock 컨트롤 연결
// ==========================================
const controls = new PointerLockControls(camera, document.body);
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
let isGameOver = false;

function handleStartGame(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (startScreen) startScreen.style.display = 'none';
    controls.lock();
}

if (startBtn) {
    startBtn.addEventListener('click', handleStartGame);
}

controls.addEventListener('lock', () => {
    if (startScreen) startScreen.style.display = 'none';
});

controls.addEventListener('unlock', () => {
    if (!isGameOver && startScreen) {
        startScreen.style.display = 'flex';
        if (startBtn) startBtn.innerText = 'RESUME DUNGEON';
    }
});

// ==========================================
// 3. 조명 및 푸른 계열 횃불 시스템
// ==========================================
const ambientLight = new THREE.AmbientLight(0x1e3a5f, 0.75);
scene.add(ambientLight);

const torches = [];

function createBlueTorch(x, y, z, intensity = 2.2, distance = 14) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // 횃불 거치대
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.5, 8), bracketMat);
    bracket.rotation.z = Math.PI / 6;
    group.add(bracket);

    // 푸른 불꽃 코어
    const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.4, 8),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc })
    );
    flame.position.set(-0.1, 0.25, 0);
    group.add(flame);

    // 푸른 외곽 글로우
    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.45 })
    );
    glow.position.set(-0.1, 0.22, 0);
    group.add(glow);

    // 푸른 계열 포인트 라이트
    const light = new THREE.PointLight(0x38bdf8, intensity, distance);
    light.position.set(-0.15, 0.35, 0);
    group.add(light);

    scene.add(group);
    torches.push({ flame, glow, light, baseIntensity: intensity, phase: Math.random() * Math.PI * 2 });
}

// ==========================================
// 4. 맵 구조물 및 충돌 벽 생성 (중앙 홀 + 2층 테라스 + 3개 방)
// ==========================================
const colliders = [];

const stoneMat = new THREE.MeshStandardMaterial({ color: 0x263244, roughness: 0.85, metalness: 0.1 });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1b2432, roughness: 0.9 });
const accentStoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });

function createBox(x, y, z, w, h, d, material = stoneMat, isCollider = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    if (isCollider) {
        colliders.push(new THREE.Box3().setFromObject(mesh));
    }
    return mesh;
}

// 전체 바닥 및 외벽
createBox(0, -0.5, 0, 42, 1, 42, floorMat, false);
createBox(0, 3, -20, 42, 7, 1);
createBox(0, 3, 20, 42, 7, 1);
createBox(-20, 3, 0, 1, 7, 42);
createBox(20, 3, 0, 1, 7, 42);

// 중앙 홀 바닥 원형 장식 및 푸른 화로
const hallCenterRing = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 2.2, 24),
    new THREE.MeshBasicMaterial({ color: 0x0ea5e9, side: THREE.DoubleSide })
);
hallCenterRing.rotation.x = -Math.PI / 2;
hallCenterRing.position.set(0, 0.02, 0);
scene.add(hallCenterRing);

const brazierBase = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.4, 16), accentStoneMat);
brazierBase.position.set(0, 0.2, 0);
scene.add(brazierBase);
createBlueTorch(0, 0.5, 0, 3.5, 18);

// 북쪽 2층 테라스 & 계단
createBox(0, 1.0, -15, 38, 2.0, 8, accentStoneMat, true);

function createStairs(startX, startZ, steps = 5) {
    const stepH = 2.0 / steps;
    const stepD = 3.0 / steps;
    for (let i = 0; i < steps; i++) {
        createBox(startX, (stepH * (i + 1)) / 2, startZ - i * stepD, 3.2, stepH * (i + 1), stepD, accentStoneMat, false);
    }
}
createStairs(-6.5, -8.5);
createStairs(0, -8.5);

[-11, -4, 4, 11].forEach(doorX => {
    createBox(doorX, 3.2, -19.3, 2.6, 2.4, 0.4, new THREE.MeshStandardMaterial({ color: 0x3b281e }), false);
    createBlueTorch(doorX + 1.6, 3.5, -18.8, 1.8, 10);
});

// 서쪽 Room 1
createBox(-10, 2.5, -5.5, 1, 5, 5);
createBox(-10, 2.5, 5.5, 1, 5, 5);
createBlueTorch(-18.8, 2.5, -4, 2.0, 12);
createBlueTorch(-18.8, 2.5, 4, 2.0, 12);

// 동쪽 Room 3
createBox(10, 2.5, -5.5, 1, 5, 5);
createBox(10, 2.5, 5.5, 1, 5, 5);
createBlueTorch(18.8, 2.5, -4, 2.0, 12);
createBlueTorch(18.8, 2.5, 4, 2.0, 12);

// 남쪽 Room 2
createBox(-5.5, 2.5, 10, 5, 5, 1);
createBox(5.5, 2.5, 10, 5, 5, 1);
createBlueTorch(-7, 2.5, 18.8, 2.0, 12);
createBlueTorch(7, 2.5, 18.8, 2.0, 12);

// 중앙 홀 4방향 기둥
[[-8.5, -8.5], [8.5, -8.5], [-8.5, 8.5], [8.5, 8.5]].forEach(([px, pz]) => {
    createBox(px, 2.5, pz, 1.2, 5, 1.2, accentStoneMat, true);
    createBlueTorch(px * 0.88, 2.6, pz * 0.88, 2.2, 13);
});

// ==========================================
// 5. 맵 곳곳의 정교한 소품(Props) & 수집 아이템 배치
// ==========================================
const items = [];

// 정교한 고대 항아리
function createDetailedUrn(x, y, z, scale = 1, color = 0x475569) {
    const points = [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.35, 0.0),
        new THREE.Vector2(0.55, 0.45),
        new THREE.Vector2(0.45, 0.85),
        new THREE.Vector2(0.25, 1.05),
        new THREE.Vector2(0.32, 1.2),
        new THREE.Vector2(0.22, 1.2)
    ];
    const urn = new THREE.Mesh(
        new THREE.LatheGeometry(points, 16),
        new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2 })
    );
    urn.scale.set(scale, scale, scale);
    urn.position.set(x, y, z);
    urn.castShadow = true;
    scene.add(urn);
}

// 철제 띠가 감긴 나무 상자
function createDetailedCrate(x, y, z, size = 1.0) {
    const group = new THREE.Group();
    group.position.set(x, y + size / 2, z);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });

    const box = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), woodMat);
    box.castShadow = true;
    group.add(box);

    const band1 = new THREE.Mesh(new THREE.BoxGeometry(size + 0.04, 0.12, size + 0.04), ironMat);
    band1.position.y = size * 0.3;
    group.add(band1);

    const band2 = band1.clone();
    band2.position.y = -size * 0.3;
    group.add(band2);

    scene.add(group);
}

// 빛나는 푸른 연금술 플라스크 병
function createGlowingFlask(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.6, roughness: 0.1 });
    const liquidMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), glassMat);
    body.position.y = 0.25;
    group.add(body);

    const liquid = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), liquidMat);
    liquid.position.y = 0.23;
    group.add(liquid);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.2, 10), glassMat);
    neck.position.y = 0.52;
    group.add(neck);

    scene.add(group);
}

// 각 방과 계단 주변 소품 군집 배치
createDetailedUrn(-18, 0, -7, 1.2, 0x334155);
createDetailedUrn(-17.2, 0, -6.5, 0.85, 0x475569);
createDetailedCrate(-18, 0, 7, 1.1);
createDetailedCrate(-16.8, 0, 7.2, 0.8);
createGlowingFlask(-18, 1.1, 7);

createDetailedCrate(18, 0, -7, 1.2);
createDetailedCrate(18, 1.2, -7, 0.75);
createDetailedUrn(18, 0, 7, 1.3, 0x334155);
createGlowingFlask(17.8, 0, 5.8);

createDetailedUrn(-8, 0, 18, 1.1);
createDetailedCrate(8, 0, 18, 1.0);
createGlowingFlask(8, 1.0, 18);

createDetailedUrn(-8.5, 0, -6.5, 1.0);
createDetailedUrn(8.5, 0, -6.5, 1.0);
createDetailedCrate(7.5, 0, 7.5, 0.9);

createDetailedUrn(-16, 2.0, -17.5, 1.2);
createDetailedCrate(16, 2.0, -17.5, 1.1);
createGlowingFlask(16, 3.1, -17.5);

// 수집 가능한 정교한 지질 보충 캡슐 아이템
function createCollectibleCapsule(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const core = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.18, 0.35, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    core.rotation.z = Math.PI / 4;
    group.add(core);

    const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.03, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc })
    );
    group.add(ring1);

    const ring2 = ring1.clone();
    ring2.rotation.x = Math.PI / 2;
    group.add(ring2);

    scene.add(group);
    items.push({ mesh: group, ring1, ring2, baseY: y, collected: false });
}

createCollectibleCapsule(-15.5, 1.1, 0);   // 서쪽 방
createCollectibleCapsule(15.5, 1.1, 0);    // 동쪽 방
createCollectibleCapsule(0, 1.1, 16.5);    // 남쪽 방
createCollectibleCapsule(-13, 3.1, -14.5); // 2층 테라스 서쪽

// ==========================================
// 6. 목표물: 표적 수용체 (2층 테라스 동쪽 구석)
// ==========================================
const receptorGroup = new THREE.Group();
receptorGroup.position.set(13, 2.8, -15);

const recMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.8,
    metalness: 0.6,
    roughness: 0.2
});

const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.0, 12), recMat);
receptorGroup.add(stem);

const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 12), recMat);
armL.position.set(-0.3, 0.65, 0);
armL.rotation.z = Math.PI / 5;
receptorGroup.add(armL);

const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 12), recMat);
armR.position.set(0.3, 0.65, 0);
armR.rotation.z = -Math.PI / 5;
receptorGroup.add(armR);

receptorGroup.add(new THREE.PointLight(0xfacc15, 2.5, 10));
scene.add(receptorGroup);

// ==========================================
// 7. 추격자 (분해 효소) - 중앙 홀 한정 & 고속 추격
// ==========================================
const chaserGroup = new THREE.Group();
chaserGroup.position.set(0, 1.3, -4);

const chaserCore = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 2),
    new THREE.MeshStandardMaterial({
        color: 0xe11d48,
        emissive: 0x9f1239,
        emissiveIntensity: 0.9,
        roughness: 0.3
    })
);
chaserGroup.add(chaserCore);

const chaserAura = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.25, wireframe: true })
);
chaserGroup.add(chaserAura);

chaserGroup.add(new THREE.PointLight(0xf43f5e, 2.5, 12));
scene.add(chaserGroup);

const CHASER_SPEED = 7.4;        // 상향된 추격 속도
const CHASER_PATROL_SPEED = 3.4; // 순찰 속도
const HALL_BOUNDS = { minX: -8.5, maxX: 8.5, minZ: -8.5, maxZ: 8.5 };
let patrolTarget = new THREE.Vector3(5, 1.3, 5);

// ==========================================
// 8. 플레이어 이동, 상태(HP), 충돌 처리
// ==========================================
let hp = 100;
const keys = { w: false, a: false, s: false, d: false };

document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = true;
});
document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = false;
});

function updateHUD() {
    const hpEl = document.getElementById('hp');
    if (hpEl) {
        hpEl.innerText = `${Math.max(0, Math.round(hp))}%`;
        hpEl.style.color = hp <= 30 ? '#f43f5e' : '#38bdf8';
    }
}

function checkWallCollision(pos) {
    const playerBox = new THREE.Box3(
        new THREE.Vector3(pos.x - 0.45, pos.y - 1.5, pos.z - 0.45),
        new THREE.Vector3(pos.x + 0.45, pos.y + 0.3, pos.z + 0.45)
    );
    for (const box of colliders) {
        if (playerBox.intersectsBox(box)) return true;
    }
    return false;
}

// ==========================================
// 9. 메인 애니메이션 루프
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    // 푸른 횃불 일렁임 애니메이션
    torches.forEach(t => {
        const flicker = Math.sin(elapsed * 10 + t.phase) * 0.25 + Math.cos(elapsed * 17 + t.phase) * 0.15;
        t.light.intensity = t.baseIntensity + flicker;
        t.flame.scale.set(1 + flicker * 0.1, 1 + flicker * 0.2, 1 + flicker * 0.1);
    });

    // 아이템 & 표적 수용체 회전 애니메이션
    items.forEach(item => {
        if (!item.collected) {
            item.mesh.position.y = item.baseY + Math.sin(elapsed * 3) * 0.15;
            item.ring1.rotation.y += delta * 2.5;
            item.ring2.rotation.x += delta * 2.0;
        }
    });
    receptorGroup.rotation.y += delta * 1.5;

    if (controls.isLocked && !isGameOver) {
        const moveSpeed = 6.5 * delta;
        const prevPos = camera.position.clone();

        if (keys.w) controls.moveForward(moveSpeed);
        if (keys.s) controls.moveForward(-moveSpeed);
        if (keys.a) controls.moveRight(-moveSpeed);
        if (keys.d) controls.moveRight(moveSpeed);

        // 계단 및 2층 높이 자연스러운 보간
        let targetY = 1.7;
        if (camera.position.z < -8.5 && camera.position.z >= -11.5) {
            const progress = Math.min(1, Math.max(0, (-8.5 - camera.position.z) / 3.0));
            targetY = 1.7 + progress * 2.0;
        } else if (camera.position.z < -11.5) {
            targetY = 3.7;
        }
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.2);

        if (checkWallCollision(camera.position)) {
            camera.position.x = prevPos.x;
            camera.position.z = prevPos.z;
        }

        // 아이템 획득 판정
        items.forEach(item => {
            if (!item.collected && camera.position.distanceTo(item.mesh.position) < 1.3) {
                item.collected = true;
                item.mesh.visible = false;
                hp = Math.min(100, hp + 25);
                updateHUD();
            }
        });

        // 추격자 AI (중앙 홀 내부 한정 고속 추격)
        chaserCore.rotation.y += delta * 3.5;
        chaserAura.rotation.z -= delta * 2.0;

        const playerInHall =
            camera.position.x >= HALL_BOUNDS.minX &&
            camera.position.x <= HALL_BOUNDS.maxX &&
            camera.position.z >= HALL_BOUNDS.minZ &&
            camera.position.z <= HALL_BOUNDS.maxZ &&
            camera.position.y < 2.5;

        if (playerInHall) {
            const dir = new THREE.Vector3().subVectors(camera.position, chaserGroup.position);
            dir.y = 0;
            if (dir.length() > 0.1) {
                dir.normalize();
                chaserGroup.position.addScaledVector(dir, CHASER_SPEED * delta);
            }
        } else {
            const dir = new THREE.Vector3().subVectors(patrolTarget, chaserGroup.position);
            dir.y = 0;
            if (dir.length() < 0.8) {
                patrolTarget.set(
                    THREE.MathUtils.randFloat(HALL_BOUNDS.minX + 1, HALL_BOUNDS.maxX - 1),
                    1.3,
                    THREE.MathUtils.randFloat(HALL_BOUNDS.minZ + 1, HALL_BOUNDS.maxZ - 1)
                );
            } else {
                dir.normalize();
                chaserGroup.position.addScaledVector(dir, CHASER_PATROL_SPEED * delta);
            }
        }

        chaserGroup.position.x = THREE.MathUtils.clamp(chaserGroup.position.x, HALL_BOUNDS.minX, HALL_BOUNDS.maxX);
        chaserGroup.position.z = THREE.MathUtils.clamp(chaserGroup.position.z, HALL_BOUNDS.minZ, HALL_BOUNDS.maxZ);

        // 추격자 피격 판정
        const distToChaser = new THREE.Vector2(camera.position.x, camera.position.z)
            .distanceTo(new THREE.Vector2(chaserGroup.position.x, chaserGroup.position.z));

        if (distToChaser < 1.25 && camera.position.y < 2.5) {
            hp -= 35 * delta;
            updateHUD();
            if (hp <= 0) {
                isGameOver = true;
                controls.unlock();
                alert('분해 효소에 의해 나노캐리어가 분해되었습니다! 다시 도전하세요.');
                location.reload();
            }
        }

        // 표적 수용체 도달 판정
        if (camera.position.distanceTo(receptorGroup.position) < 1.8) {
            isGameOver = true;
            controls.unlock();
            alert('성공! 표적 수용체에 무사히 결합하여 약물 전달을 완료했습니다!');
            location.reload();
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

updateHUD();
animate();
