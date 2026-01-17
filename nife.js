import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let blobPlanet;
let starField;
let isLoading = true;
let currentPhase = 'loading';

init();
animate();

function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('three-canvas'),
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false;
    
    createStarField();
    
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        currentPhase = 'space-travel';
        startSpaceTravel();
    }, 3000);
    
    window.addEventListener('resize', onWindowResize);
}

function createStarField() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ 
        color: 0xffffff, 
        size: 1.5,
        transparent: true
    });
    
    const starVertices = [];
    for (let i = 0; i < 15000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
}

function startSpaceTravel() {
    createBlobPlanetAhead();
    showCountdown();
    
    const travelDuration = 5000;
    const startTime = Date.now();
    
    function travelAnimation() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / travelDuration, 1);
        
        const positions = starField.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] += 5;
            if (positions[i + 2] > 500) {
                positions[i + 2] = -500;
            }
        }
        starField.geometry.attributes.position.needsUpdate = true;
        
        camera.position.z = progress * 80;
        camera.lookAt(0, 0, 100);
        
        if (progress < 1) {
            requestAnimationFrame(travelAnimation);
        } else {
            currentPhase = 'blob-planet';
            arrivedAtPlanet();
        }
    }
    
    travelAnimation();
}

function showCountdown() {
    const overlayText = document.getElementById('overlay-text');
    overlayText.style.bottom = '10%';
    overlayText.style.top = 'auto';
    overlayText.style.right = '20px';
    overlayText.style.left = 'auto';
    overlayText.style.transform = 'none';
    overlayText.classList.add('visible');
    
    let count = 3;
    overlayText.textContent = `Arriving at Planet Nife in ${count}...`;
    
    const countInterval = setInterval(() => {
        count--;
        if (count > 0) {
            overlayText.textContent = `Arriving at Planet Nife in ${count}...`;
        } else {
            clearInterval(countInterval);
            overlayText.classList.remove('visible');
        }
    }, 1500);
}

function createBlobPlanetAhead() {
    const geometry = new THREE.IcosahedronGeometry(8, 4);
    
    const vertexShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;
        
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            
            vec3 pos = position;
            
            float wave1 = sin(pos.x * 1.5 + time * 2.0) * 0.6;
            float wave2 = cos(pos.y * 1.8 + time * 2.5) * 0.6;
            float wave3 = sin(pos.z * 1.3 + time * 2.2) * 0.6;
            float wave4 = sin(length(pos.xy) * 1.2 + time * 1.8) * 0.5;
            float wave5 = cos(length(pos.yz) * 1.4 + time * 2.3) * 0.5;
            
            float totalWave = (wave1 + wave2 + wave3 + wave4 + wave5) * 0.25;
            pos += normal * totalWave;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `;
    
    const fragmentShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;
        
        void main() {
            vec3 pinkTone = vec3(0.95, 0.6, 0.7);
            vec3 blueTone = vec3(0.5, 0.7, 0.95);
            vec3 purpleTone = vec3(0.75, 0.55, 0.85);
            vec3 peachTone = vec3(0.98, 0.75, 0.65);
            
            float noise1 = sin(vPosition.x * 1.5 + time * 0.5) * 0.5 + 0.5;
            float noise2 = sin(vPosition.y * 1.2 + time * 0.7) * 0.5 + 0.5;
            float noise3 = sin(vPosition.z * 1.3 + time * 0.6) * 0.5 + 0.5;
            
            vec3 color = mix(pinkTone, blueTone, noise1);
            color = mix(color, purpleTone, noise2 * 0.8);
            color = mix(color, peachTone, noise3 * 0.6);
            
            float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
            color += fresnel * vec3(0.5, 0.6, 0.7);
            
            gl_FragColor = vec4(color, 0.95);
        }
    `;
    
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            time: { value: 0 }
        },
        transparent: true
    });
    
    blobPlanet = new THREE.Mesh(geometry, material);
    blobPlanet.position.set(0, 0, 100);
    scene.add(blobPlanet);
}

function arrivedAtPlanet() {
    setTimeout(() => {
        showClickPrompt();
    }, 500);
}

function showClickPrompt() {
    const overlayText = document.getElementById('overlay-text');
    overlayText.style.bottom = '15%';
    overlayText.style.top = 'auto';
    overlayText.style.left = '50%';
    overlayText.style.right = 'auto';
    overlayText.style.transform = 'translateX(-50%)';
    
    const text = 'click anywhere to start';
    let index = 0;
    
    overlayText.classList.add('visible');
    
    const typeInterval = setInterval(() => {
        overlayText.textContent = text.substring(0, index + 1);
        index++;
        if (index >= text.length) {
            clearInterval(typeInterval);
            document.addEventListener('click', onClickToEnter);
        }
    }, 100);
}

function onClickToEnter() {
    document.removeEventListener('click', onClickToEnter);
    document.getElementById('overlay-text').classList.remove('visible');
    
    currentPhase = 'entering-room';
    enterThroughPlanet();
}

function enterThroughPlanet() {
    const duration = 4000;
    const startTime = Date.now();
    
    function moveCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        if (progress < 0.2) {
            const circleProgress = eased * Math.PI;
            camera.position.x = Math.sin(circleProgress) * 20;
            camera.position.y = Math.cos(circleProgress) * 10;
            camera.position.z = 80;
            camera.lookAt(blobPlanet.position);
        } else if (progress < 0.5) {
            const throughProgress = (progress - 0.2) / 0.3;
            camera.position.z = 80 + throughProgress * 30;
            camera.position.y = 10 - throughProgress * 10;
            blobPlanet.scale.setScalar(1 + throughProgress * 4);
            blobPlanet.material.uniforms.time.value += 0.15;
        } else if (progress < 0.7) {
            const insideProgress = (progress - 0.5) / 0.2;
            camera.position.z = 110 + insideProgress * 20;
            camera.position.y = insideProgress * 30;
            blobPlanet.material.opacity = 1 - insideProgress;
            
            if (insideProgress > 0.5 && starField) {
                scene.remove(starField);
                starField = null;
            }
        } else {
            if (blobPlanet) {
                scene.remove(blobPlanet);
                blobPlanet = null;
            }
            const descendProgress = (progress - 0.7) / 0.3;
            camera.position.y = 30 - descendProgress * 25;
            camera.position.z = 130 - descendProgress * 115;
            camera.lookAt(0, 3, 0);
        }
        
        if (progress < 1) {
            requestAnimationFrame(moveCamera);
        } else {
            currentPhase = 'room';
            createRoom();
        }
    }
    
    moveCamera();
}

function createRoom() {
    scene.background = new THREE.Color(0xe8dcc8);
    
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 3, 0);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xfff5e6, 0.6);
    directionalLight.position.set(8, 15, 10);
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xffd700, 0.4, 20);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);
    
    const floorGeometry = new THREE.PlaneGeometry(40, 40);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xc9b896 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);
    
    const wallGeometry = new THREE.PlaneGeometry(40, 15);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f0e8 });
    
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, 7.5, -10);
    scene.add(backWall);
    
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-20, 7.5, 10);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);
    
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(20, 7.5, 10);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);
    
    createCouch();
    createDesk();
    
    controls.enabled = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 30;
    controls.target.set(0, 3, 0);
    controls.enablePan = false;
    
    document.getElementById('portfolio-header').classList.add('visible');
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

function createCouch() {
    const couchGroup = new THREE.Group();
    
    const seatGeometry = new THREE.BoxGeometry(4, 0.8, 2);
    const backGeometry = new THREE.BoxGeometry(4, 2, 0.4);
    const armGeometry = new THREE.BoxGeometry(0.4, 1.5, 2);
    const couchMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7d6b });
    
    const seat = new THREE.Mesh(seatGeometry, couchMaterial);
    seat.position.y = 0.8;
    couchGroup.add(seat);
    
    const back = new THREE.Mesh(backGeometry, couchMaterial);
    back.position.set(0, 1.8, -0.8);
    couchGroup.add(back);
    
    const leftArm = new THREE.Mesh(armGeometry, couchMaterial);
    leftArm.position.set(-1.8, 1.2, 0);
    couchGroup.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, couchMaterial);
    rightArm.position.set(1.8, 1.2, 0);
    couchGroup.add(rightArm);
    
    couchGroup.position.set(-8, 0, 5);
    couchGroup.rotation.y = Math.PI / 6;
    scene.add(couchGroup);
}

function createDesk() {
    const deskGroup = new THREE.Group();
    
    const deskGeometry = new THREE.BoxGeometry(7, 0.15, 3.5);
    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });
    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
    desk.position.y = 2;
    deskGroup.add(desk);
    
    const legGeometry = new THREE.BoxGeometry(0.15, 2, 0.15);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0xe5e5cc });
    
    const positions = [
        [-3.2, 1, 1.5],
        [3.2, 1, 1.5],
        [-3.2, 1, -1.5],
        [3.2, 1, -1.5]
    ];
    
    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(...pos);
        deskGroup.add(leg);
    });
    
    const laptopBase = new THREE.BoxGeometry(1.8, 0.08, 1.3);
    const laptopScreen = new THREE.BoxGeometry(1.8, 1.1, 0.08);
    const laptopMaterial = new THREE.MeshStandardMaterial({ color: 0xd3d3d3 });
    
    const base = new THREE.Mesh(laptopBase, laptopMaterial);
    base.position.set(0, 2.12, 0);
    deskGroup.add(base);
    
    const screen = new THREE.Mesh(laptopScreen, laptopMaterial);
    screen.position.set(0, 2.7, -0.6);
    screen.rotation.x = -0.3;
    deskGroup.add(screen);
    
    const monsteraGeometry = new THREE.ConeGeometry(0.4, 1.2, 8);
    const monsteraMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5016 });
    const plant = new THREE.Mesh(monsteraGeometry, monsteraMaterial);
    plant.position.set(-2.8, 2.7, 0);
    deskGroup.add(plant);
    
    const mugGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.35, 16);
    const mugMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mug = new THREE.Mesh(mugGeometry, mugMaterial);
    mug.position.set(2.2, 2.3, 0.4);
    deskGroup.add(mug);
    
    const lampPoleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
    const lampShadeGeometry = new THREE.ConeGeometry(0.3, 0.4, 8);
    const lampMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    
    const lampPole = new THREE.Mesh(lampPoleGeometry, lampMaterial);
    lampPole.position.set(-2, 2.85, 0.8);
    deskGroup.add(lampPole);
    
    const lampShade = new THREE.Mesh(lampShadeGeometry, lampMaterial);
    lampShade.position.set(-2, 3.6, 0.8);
    deskGroup.add(lampShade);
    
    scene.add(deskGroup);
}

function updateDateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    document.getElementById('datetime').textContent = `${dateStr} | ${timeStr}`;
}

function animate() {
    requestAnimationFrame(animate);
    
    if (blobPlanet && currentPhase !== 'entering-room') {
        blobPlanet.material.uniforms.time.value += 0.015;
    }
    
    if (controls.enabled) {
        controls.update();
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}