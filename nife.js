import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let blobPlanet;
let stars = [];
let isLoading = true;
let currentPhase = 'loading';

init();
animate();

function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;
    
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
        size: 0.7,
        transparent: true
    });
    
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
    stars.push(starField);
}

function startSpaceTravel() {
    const travelDuration = 3000;
    const startTime = Date.now();
    
    function travelAnimation() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / travelDuration, 1);
        
        stars.forEach(star => {
            star.position.z = progress * 100;
        });
        
        if (progress < 1) {
            requestAnimationFrame(travelAnimation);
        } else {
            currentPhase = 'blob-planet';
            createBlobPlanet();
        }
    }
    
    travelAnimation();
}

function createBlobPlanet() {
    const geometry = new THREE.IcosahedronGeometry(10, 4);
    
    const vertexShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        uniform float time;
        
        void main() {
            vUv = uv;
            vNormal = normal;
            
            vec3 pos = position;
            float wave = sin(pos.x * 0.5 + time) * 0.3;
            wave += sin(pos.y * 0.7 + time * 1.2) * 0.3;
            wave += sin(pos.z * 0.6 + time * 0.8) * 0.3;
            
            pos += normal * wave;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `;
    
    const fragmentShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        uniform float time;
        
        void main() {
            vec3 color1 = vec3(0.8, 0.4, 0.6);
            vec3 color2 = vec3(0.4, 0.6, 0.9);
            vec3 color3 = vec3(0.6, 0.3, 0.8);
            
            float mixer = sin(vUv.x * 3.0 + time) * 0.5 + 0.5;
            vec3 color = mix(color1, color2, mixer);
            color = mix(color, color3, vUv.y);
            
            float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            color += fresnel * 0.3;
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;
    
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            time: { value: 0 }
        }
    });
    
    blobPlanet = new THREE.Mesh(geometry, material);
    scene.add(blobPlanet);
    
    camera.position.set(0, 0, 30);
    
    stars.forEach(star => star.visible = false);
    
    setTimeout(() => {
        showClickPrompt();
    }, 1000);
}

function showClickPrompt() {
    const overlayText = document.getElementById('overlay-text');
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
    enterRoom();
}

function enterRoom() {
    const duration = 2000;
    const startTime = Date.now();
    const startPos = camera.position.clone();
    const targetPos = new THREE.Vector3(0, 5, 20);
    
    function moveCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        camera.position.lerpVectors(startPos, targetPos, eased);
        
        if (progress < 1) {
            requestAnimationFrame(moveCamera);
        } else {
            if (blobPlanet) scene.remove(blobPlanet);
            currentPhase = 'room';
            createRoom();
        }
    }
    
    moveCamera();
}

function createRoom() {
    scene.background = new THREE.Color(0xf5f5f5);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
    
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xd4c5b9 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    scene.add(floor);
    
    const wallGeometry = new THREE.PlaneGeometry(50, 20);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf0ead6 });
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.z = -15;
    backWall.position.y = 8;
    scene.add(backWall);
    
    createDesk();
    
    controls.enabled = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 40;
    
    document.getElementById('portfolio-header').classList.add('visible');
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

function createDesk() {
    const deskGroup = new THREE.Group();
    
    const deskGeometry = new THREE.BoxGeometry(8, 0.2, 4);
    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });
    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
    desk.position.y = 0;
    deskGroup.add(desk);
    
    const legGeometry = new THREE.BoxGeometry(0.2, 3, 0.2);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0xe5e5cc });
    
    const positions = [
        [-3.5, -1.5, 1.5],
        [3.5, -1.5, 1.5],
        [-3.5, -1.5, -1.5],
        [3.5, -1.5, -1.5]
    ];
    
    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(...pos);
        deskGroup.add(leg);
    });
    
    const laptopBase = new THREE.BoxGeometry(2, 0.1, 1.5);
    const laptopScreen = new THREE.BoxGeometry(2, 1.2, 0.1);
    const laptopMaterial = new THREE.MeshStandardMaterial({ color: 0xc0c0c0 });
    
    const base = new THREE.Mesh(laptopBase, laptopMaterial);
    base.position.set(0, 0.2, 0);
    deskGroup.add(base);
    
    const screen = new THREE.Mesh(laptopScreen, laptopMaterial);
    screen.position.set(0, 0.8, -0.7);
    screen.rotation.x = -0.2;
    deskGroup.add(screen);
    
    const monsteraGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
    const monsteraMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5016 });
    const plant = new THREE.Mesh(monsteraGeometry, monsteraMaterial);
    plant.position.set(-3, 1, 0);
    deskGroup.add(plant);
    
    const mugGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 16);
    const mugMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mug = new THREE.Mesh(mugGeometry, mugMaterial);
    mug.position.set(2.5, 0.3, 0.5);
    deskGroup.add(mug);
    
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
    
    if (blobPlanet) {
        blobPlanet.material.uniforms.time.value += 0.01;
        blobPlanet.rotation.y += 0.002;
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