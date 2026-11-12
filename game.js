import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

// ==========================================
// 1. 기본 씬, 카메라, 렌더러 설정
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060b14);
scene.fog = new THREE.FogExp2(0x060b14, 0.032);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 13); // 남쪽 입구 부근 시작

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// 컨트롤 설정
const controls = new PointerLockControls(camera, document.body);
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

if (instructions && blocker) {
    instructions.addEventListener('click', () => controls.lock());
    controls.addEventListener('lock', () => {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });
    controls.addEventListener('unlock', () => {
        blocker.style.display = 'flex';
        instructions.style.display = '';
    });
}

// ==========================================
// 2. 조명 및 푸른 계열 횃불 시스템
// ==========================================
const ambientLight = new THREE.AmbientLight(0x1e3a5f, 0.7);
scene.add(ambientLight);

const torches = []; // 불꽃 애니메이션용 배열

function createBlueTorch(x, y, z, intensity = 2.2, distance = 14) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // 횃불 거치대 (어두운 금속)
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.5, 8), bracketMat);
    bracket.rotation.z = Math.PI / 6;
    group.add(bracket);

    // 푸른 불꽃 코어
    const flameGeo = new THREE.ConeGeometry(0.14, 0.4, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(-0.1, 0.25, 0);
    group.add(flame);

    // 푸른 외곽 글로우
    const glowGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.45 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(-0.1, 0.22, 0);
    group.add(glow);

    // 푸른 계열 포인트 라이트
    const light = new THREE.PointLight(0x38bdf8, intensity, distance);
    light.position.set(-0.15, 0.35, 0);
    light.castShadow = false;
    group.add(light);

    scene.add(group);
    torches.push({ flame, glow, light, baseIntensity: intensity, phase: Math.random() * Math.PI * 2 });
}

// ==========================================
// 3. 맵 구조물 및 충돌 벽 생성 (중앙 홀 + 2층 테라스 + 3개 방)
// ==========================================
const colliders = []; // 벽 충돌 박스 배열

const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x263244,
    roughness: 0.85,
    metalness: 0.1
});
const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1b2432,
    roughness: 0.9
});
const accentStoneMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.7
});

function createBox(x, y, z, w, h, d, material = stoneMat, isCollider = true) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    if (isCollider) {
        const box = new THREE.Box3().setFromObject(mesh);
        colliders.push(box);
    }
    return mesh;
}

// 전체 바닥 (40 x 40)
createBox(0, -0.5, 0, 42, 1, 42, floorMat, false);

// 외벽 (북, 남, 서, 동)
createBox(0, 3, -20, 42, 7, 1);
createBox(0, 3, 20, 42, 7, 1);
createBox(-20, 3, 0, 1, 7, 42);
createBox(20, 3, 0, 1, 7, 42);

// --- 중앙 홀(Hall) 경계 및 구역 (X: -9 ~ 9, Z: -9 ~ 9) ---
// 중앙 홀 바닥 타일 장식
const hallCenterRing = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 2.2, 24),
    new THREE.MeshBasicMaterial({ color: 0x0ea5e9, side: THREE.DoubleSide })
);
hallCenterRing.rotation.x = -Math.PI / 2;
hallCenterRing.position.set(0, 0.02, 0);
scene.add(hallCenterRing);

// 중앙 푸른 화로 (레퍼런스 중앙 화로 반영)
const brazierBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.3, 0.4, 16),
    accentStoneMat
);
brazierBase.position.set(0, 0.2, 0);
scene.add(brazierBase);
createBlueTorch(0, 0.5, 0, 3.5, 18);

// --- 북쪽 2층 테라스 (Z: -19 ~ -11) & 계단 ---
createBox(0, 1.0, -15, 38, 2.0, 8, accentStoneMat, true); // 2층 플랫폼

// 2층으로 올라가는 계단 (서쪽, 중앙 2개소 - 레퍼런스 반영)
function createStairs(startX, startZ, steps = 5) {
    const stepH = 2.0 / steps;
    const stepD = 3.0 / steps;
    for (let i = 0; i < steps; i++) {
        createBox(
            startX,
            (stepH * (i + 1)) / 2,
            startZ - i * stepD,
            3.2,
            stepH * (i + 1),
            stepD,
            accentStoneMat,
            false // 계단은 부드러운 높이 보간으로 처리
        );
    }
}
createStairs(-6.5, -8.5);
createStairs(0, -8.5);

// 2층 테라스 벽면 아치형 문 장식
[-11, -4, 4, 11].forEach(doorX => {
    createBox(doorX, 3.2, -19.3, 2.6, 2.4, 0.4, new THREE.MeshStandardMaterial({ color: 0x3b281e }), false);
    createBlueTorch(doorX + 1.6, 3.5, -18.8, 1.8, 10);
});

// --- 서쪽 Room 1 (X: -19 ~ -10, Z: -8 ~ 8) ---
createBox(-10, 2.5, -5.5, 1, 5, 5); // 입구 북측 벽
createBox(-10, 2.5, 5.5, 1, 5, 5);  // 입구 남측 벽
createBlueTorch(-18.8, 2.5, -4, 2.0, 12);
createBlueTorch(-18.8, 2.5, 4, 2.0, 12);

// --- 동쪽 Room 3 (X: 10 ~ 19, Z: -8 ~ 8) ---
createBox(10, 2.5, -5.5, 1, 5, 5);
createBox(10, 2.5, 5.5, 1, 5, 5);
createBlueTorch(18.8, 2.5, -4, 2.0, 12);
createBlueTorch(18.8, 2.5, 4, 2.0, 12);

// --- 남쪽 Room 2 (X: -9 ~ 9, Z: 10 ~ 19) ---
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
// 4. 맵 곳곳의 정교한 소품(Props) & 수집 아이템 배치
// ==========================================
const items = []; // 수집 가능한 지질 보충 캡슐 배열

// (A) 정교한 고대 항아리 생성 함수 (LatheGeometry)
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
    const geo = new THREE.LatheGeometry(points, 16);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2 });
    const urn = new THREE.Mesh(geo, mat);
    urn.scale.set(scale, scale, scale);
    urn.position.set(x, y, z);
    urn.castShadow = true;
    scene.add(urn);
}

// (B) 정교한 나무 상자 + 띠 장식
function createDetailedCrate(x, y, z, size = 1.0) {
    const group = new THREE.Group();
    group.position.set(x, y + size / 2, z);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });

    const box = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), woodMat);
    box.castShadow = true;
    group.add(box);

    // 철제 테두리 띠
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(size + 0.04, 0.12, size + 0.04), ironMat);
    band1.position.y = size * 0.3;
    group.add(band1);

    const band2 = band1.clone();
    band2.position.y = -size * 0.3;
    group.add(band2);

    scene.add(group);
}

// (C) 빛나는 연금술/지질 플라스크 장식
function createGlowingFlask(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.6,
        roughness: 0.1
    });
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

// 맵 구석구석에 정교한 소품 배치 (레퍼런스 디오라마 스타일)
// 서쪽 방(Room 1) 소품 군집
createDetailedUrn(-18, 0, -7, 1.2, 0x334155);
createDetailedUrn(-17.2, 0, -6.5, 0.85, 0x475569);
createDetailedCrate(-18, 0, 7, 1.1);
createDetailedCrate(-16.8, 0, 7.2, 0.8);
createGlowingFlask(-18, 1.1, 7);

// 동쪽 방(Room 3) 소품 군집
createDetailedCrate(18, 0, -7, 1.2);
createDetailedCrate(18, 1.2, -7, 0.75);
createDetailedUrn(18, 0, 7, 1.3, 0x334155);
createGlowingFlask(17.8, 0, 5.8);

// 남쪽 방(Room 2) 소품 군집
createDetailedUrn(-8, 0, 18, 1.1);
createDetailedCrate(8, 0, 18, 1.0);
createGlowingFlask(8, 1.0, 18);

// 중앙 홀 계단 옆 장식
createDetailedUrn(-8.5, 0, -6.5, 1.0);
createDetailedUrn(8.5, 0, -6.5, 1.0);
createDetailedCrate(7.5, 0, 7.5, 0.9);

// 2층 테라스 소품
createDetailedUrn(-16, 2.0, -17.5, 1.2);
createDetailedCrate(16, 2.0, -17.5, 1.1);
createGlowingFlask(16, 3.1, -17.5);

// (D) 수집 가능한 정교한 아이템: 지질 보충 캡슐
function createCollectibleCapsule(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // 중앙 발광 캡슐 코어
    const core = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.18, 0.35, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    core.rotation.z = Math.PI / 4;
    group.add(core);

    // 외곽 회전 고리 1
    const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.03, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc })
    );
    group.add(ring1);

    // 외곽 회전 고리 2
    const ring2 = ring1.clone();
    ring2.rotation.x = Math.PI / 2;
    group.add(ring2);

    scene.add(group);
    items.push({ mesh: group, ring1, ring2, baseY: y, collected: false });
}

// 아이템 배치 (Room 1, Room 2, Room 3, 2층 테라스)
createCollectibleCapsule(-15.5, 1.1, 0);   // 서쪽 방
createCollectibleCapsule(15.5, 1.1, 0);    // 동쪽 방
createCollectibleCapsule(0, 1.1, 16.5);    // 남쪽 방
createCollectibleCapsule(-13, 3.1, -14.5); // 2층 테라스 서쪽

// ==========================================
// 5. 목표물: 표적 수용체 (2층 테라스 동쪽 구석)
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

// Y자형 표적 수용체 구조
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

const recLight = new THREE.PointLight(0xfacc15, 2.5, 10);
receptorGroup.add(recLight);
scene.add(receptorGroup);

// ==========================================
// 6. 추격자 (분해 효소) - 중앙 홀 한정 & 속도 상향
// ==========================================
const chaserGroup = new THREE.Group();
chaserGroup.position.set(0, 1.3, -4);

// 분해 효소 본체 (붉은/보라빛 에너지 구체 + 돌기)
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

const chaserLight = new THREE.PointLight(0xf43f5e, 2.5, 12);
chaserGroup.add(chaserLight);
scene.add(chaserGroup);

// 추격자 설정 (속도 상향 적용)
const CHASER_SPEED = 7.2;        // 기존 대비 대폭 상향된 추격 속도
const CHASER_PATROL_SPEED = 3.2; // 순찰 속도
const HALL_BOUNDS = { minX: -8.5, maxX: 8.5, minZ: -8.5, maxZ: 8.5 };
let patrolTarget = new THREE.Vector3(5, 1.3, 5);

// ==========================================
// 7. 플레이어 이동, 상태(HP), 충돌 처리
// ==========================================
let hp = 100;
let isGameOver = false;
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
    const hpEl = document.getElementById('hp-display');
    if (hpEl) hpEl.innerText = `내구도(HP): ${Math.max(0, Math.round(hp))}%`;
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
// 8. 메인 애니메이션 루프
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    // 1. 푸른 횃불 일렁임 효과
    torches.forEach(t => {
        const flicker = Math.sin(elapsed * 10 + t.phase) * 0.25 + Math.cos(elapsed * 17 + t.phase) * 0.15;
        t.light.intensity = t.baseIntensity + flicker;
        t.flame.scale.set(1 + flicker * 0.1, 1 + flicker * 0.2, 1 + flicker * 0.1);
    });

    // 2. 아이템 & 표적 수용체 회전 애니메이션
    items.forEach(item => {
        if (!item.collected) {
            item.mesh.position.y = item.baseY + Math.sin(elapsed * 3) * 0.15;
            item.ring1.rotation.y += delta * 2.5;
            item.ring2.rotation.x += delta * 2.0;
        }
    });
    receptorGroup.rotation.y += delta * 1.5;

    if (controls.isLocked && !isGameOver) {
        // 3. 플레이어 이동 처리
        const moveSpeed = 6.5 * delta;
        const prevPos = camera.position.clone();

        if (keys.w) controls.moveForward(moveSpeed);
        if (keys.s) controls.moveForward(-moveSpeed);
        if (keys.a) controls.moveRight(-moveSpeed);
        if (keys.d) controls.moveRight(moveSpeed);

        // 계단 및 2층 높이 자연스러운 보간 처리
        let targetY = 1.7;
        if (camera.position.z < -8.5 && camera.position.z >= -11.5) {
            // 계단 구간 높이 계산
            const progress = Math.min(1, Math.max(0, (-8.5 - camera.position.z) / 3.0));
            targetY = 1.7 + progress * 2.0;
        } else if (camera.position.z < -11.5) {
            targetY = 3.7; // 2층 테라스 높이
        }
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.2);

        // 벽 충돌 시 이전 위치로 복구
        if (checkWallCollision(camera.position)) {
            camera.position.x = prevPos.x;
            camera.position.z = prevPos.z;
        }

        // 4. 아이템 획득 판정
        items.forEach(item => {
            if (!item.collected && camera.position.distanceTo(item.mesh.position) < 1.3) {
                item.collected = true;
                item.mesh.visible = false;
                hp = Math.min(100, hp + 25);
                updateHUD();
            }
        });

        // 5. 추격자(분해 효소) AI - 중앙 홀 내부에서만 고속 추적
        chaserCore.rotation.y += delta * 3.5;
        chaserAura.rotation.z -= delta * 2.0;

        const playerInHall =
            camera.position.x >= HALL_BOUNDS.minX &&
            camera.position.x <= HALL_BOUNDS.maxX &&
            camera.position.z >= HALL_BOUNDS.minZ &&
            camera.position.z <= HALL_BOUNDS.maxZ &&
            camera.position.y < 2.5; // 2층 테라스 제외

        if (playerInHall) {
            // 플레이어가 중앙 홀에 들어오면 상향된 속도로 맹추격
            const dir = new THREE.Vector3().subVectors(camera.position, chaserGroup.position);
            dir.y = 0;
            if (dir.length() > 0.1) {
                dir.normalize();
                chaserGroup.position.addScaledVector(dir, CHASER_SPEED * delta);
            }
        } else {
            // 플레이어가 방이나 2층으로 피신하면 홀 내부 순찰
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

        // 추격자가 절대 중앙 홀 경계를 넘지 않도록 클램핑
        chaserGroup.position.x = THREE.MathUtils.clamp(chaserGroup.position.x, HALL_BOUNDS.minX, HALL_BOUNDS.maxX);
        chaserGroup.position.z = THREE.MathUtils.clamp(chaserGroup.position.z, HALL_BOUNDS.minZ, HALL_BOUNDS.maxZ);

        // 추격자 충돌 데미지 판정
        const distToChaser = new THREE.Vector2(camera.position.x, camera.position.z)
            .distanceTo(new THREE.Vector2(chaserGroup.position.x, chaserGroup.position.z));

        if (distToChaser < 1.25 && camera.position.y < 2.5) {
            hp -= 35 * delta; // 초당 35 데미지
            updateHUD();
            if (hp <= 0) {
                isGameOver = true;
                controls.unlock();
                alert('분해 효소에 의해 나노캐리어가 분해되었습니다! 다시 도전하세요.');
                location.reload();
            }
        }

        // 6. 표적 수용체 도달(클리어) 판정
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
