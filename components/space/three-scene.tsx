'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const placed = <T extends THREE.Object3D>(obj: T, x: number, y: number, z: number): T => {
      obj.position.set(x, y, z); return obj;
    };

    // ── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    mount.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 300);
    camera.position.set(3, 3, 13);
    camera.lookAt(1, 0, 0);

    // ── Lights ────────────────────────────────────────────────
    const sunLight = new THREE.DirectionalLight(0xfff8e8, 5);
    sunLight.position.set(10, 6, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x06122a, 4));
    const rimLight = new THREE.DirectionalLight(0x2244bb, 1.0);
    rimLight.position.set(-8, -3, -5);
    scene.add(rimLight);

    // ── Stars ─────────────────────────────────────────────────
    const starCount = 2000;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 40;
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starField = new THREE.Points(starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.9 })
    );
    scene.add(starField);

    // ── Earth ─────────────────────────────────────────────────
    const makeEarthTexture = () => {
      const size = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const ocean = ctx.createLinearGradient(0, 0, 0, size);
      ocean.addColorStop(0, '#0a2d6e');
      ocean.addColorStop(0.5, '#1a4db5');
      ocean.addColorStop(1, '#0a2d6e');
      ctx.fillStyle = ocean;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#2d6a1f';
      const lands = [
        { x: 160, y: 220, w: 160, h: 180 }, { x: 180, y: 290, w: 100, h: 140 },
        { x: 220, y: 420, w: 80,  h: 160 },
        { x: 480, y: 180, w: 80,  h: 120 }, { x: 470, y: 290, w: 100, h: 200 }, { x: 490, y: 480, w: 60, h: 100 },
        { x: 560, y: 140, w: 240, h: 160 }, { x: 600, y: 280, w: 180, h: 120 },
        { x: 700, y: 450, w: 100, h: 70  },
        { x: 0,   y: 880, w: 1024,h: 40  },
      ];
      lands.forEach(({ x, y, w, h }) => {
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, Math.random() * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#8a6a30';
      [{ x: 490, y: 340, w: 60, h: 60 }, { x: 600, y: 350, w: 80, h: 40 }].forEach(({ x, y, w, h }) => {
        ctx.beginPath();
        ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = 'rgba(240,248,255,0.9)';
      ctx.fillRect(0, 0, size, 60);
      ctx.fillRect(0, size - 60, size, 60);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ddeeff';
      [80, 200, 350, 500, 650, 750, 850].forEach((cy) => {
        for (let cx = 0; cx < size; cx += 60 + Math.random() * 80) {
          ctx.beginPath();
          ctx.ellipse(cx + Math.random() * 40, cy + (Math.random() - 0.5) * 30, 50 + Math.random() * 80, 18 + Math.random() * 20, Math.random() * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      return new THREE.CanvasTexture(canvas);
    };

    const makeSpecMap = () => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#8888cc';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#111100';
      [
        { x: 160, y: 220, w: 160, h: 180 }, { x: 220, y: 420, w: 80, h: 160 },
        { x: 480, y: 180, w: 80,  h: 120 }, { x: 470, y: 290, w: 100, h: 200 },
        { x: 560, y: 140, w: 240, h: 160 }, { x: 700, y: 450, w: 100, h: 70  },
      ].forEach(({ x, y, w, h }) => {
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      return new THREE.CanvasTexture(canvas);
    };

    const earthGroup = new THREE.Group();
    earthGroup.position.set(2.5, 0, 0);
    scene.add(earthGroup);

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(2.8, 64, 64),
      new THREE.MeshPhongMaterial({ map: makeEarthTexture(), specularMap: makeSpecMap(), specular: new THREE.Color(0x4488bb), shininess: 18 })
    );
    earth.castShadow = true; earth.receiveShadow = true;
    earthGroup.add(earth);

    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 1024; cloudCanvas.height = 512;
    const cctx = cloudCanvas.getContext('2d')!;
    cctx.clearRect(0, 0, 1024, 512);
    cctx.fillStyle = 'rgba(255,255,255,0.88)';
    for (let i = 0; i < 120; i++) {
      cctx.beginPath();
      cctx.ellipse(Math.random() * 1024, Math.random() * 512, 30 + Math.random() * 80, 12 + Math.random() * 18, Math.random() * Math.PI, 0, Math.PI * 2);
      cctx.fill();
    }
    const cloudMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.87, 48, 48),
      new THREE.MeshPhongMaterial({ map: new THREE.CanvasTexture(cloudCanvas), transparent: true, opacity: 0.55, depthWrite: false })
    );
    earthGroup.add(cloudMesh);
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(3.1, 32, 32), new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.08, side: THREE.BackSide })));
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(2.96, 32, 32), new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.05, side: THREE.BackSide })));
    const earthGlow = new THREE.PointLight(0x2244aa, 1.2, 20);
    earthGroup.add(earthGlow);

    // ── Orbit Ring ────────────────────────────────────────────
    const ORBIT_R = 5.4;
    const orbitRingMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.3 });
    const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(ORBIT_R, 0.011, 8, 180), orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2;
    orbitRing.position.copy(earthGroup.position);
    scene.add(orbitRing);

    // ── Rocket ────────────────────────────────────────────────
    const rocketGroup = new THREE.Group();
    scene.add(rocketGroup);
    rocketGroup.scale.setScalar(0.52);

    const rBodyMat  = new THREE.MeshPhysicalMaterial({ color: 0xe0e8f0, metalness: 0.9, roughness: 0.1, clearcoat: 0.9, clearcoatRoughness: 0.04 });
    const rAccentMat = new THREE.MeshPhysicalMaterial({ color: 0x0d2240, metalness: 0.8, roughness: 0.25 });
    const rCyanMat  = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: new THREE.Color(0x06b6d4), emissiveIntensity: 4, roughness: 0, metalness: 0 });
    const rWinMat   = new THREE.MeshPhysicalMaterial({ color: 0x99deff, emissive: new THREE.Color(0x44aaff), emissiveIntensity: 2, transparent: true, opacity: 0.8, roughness: 0, metalness: 0 });

    const rBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.0, 10, 28), rBodyMat);
    rBody.castShadow = true; rocketGroup.add(rBody);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.65, 22), rBodyMat);
    nose.position.y = 0.85; rocketGroup.add(nose);
    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 14), rCyanMat);
    noseTip.position.y = 1.17; rocketGroup.add(noseTip);
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.15, 22, 22), rWinMat);
    cockpit.position.set(0, 0.35, 0.22); rocketGroup.add(cockpit);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.09, 30), rAccentMat);
    band.position.y = 0.02; rocketGroup.add(band);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.286, 0.286, 0.05, 30), rCyanMat);
    stripe.position.y = -0.18; rocketGroup.add(stripe);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.38, 0.25), rAccentMat);
      fin.position.set(Math.cos(a) * 0.29, -0.68, Math.sin(a) * 0.29);
      fin.rotation.y = a; rocketGroup.add(fin);
      const finGlow = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.34, 0.04), rCyanMat);
      finGlow.position.set(Math.cos(a) * 0.33, -0.68, Math.sin(a) * 0.33);
      finGlow.rotation.y = a; rocketGroup.add(finGlow);
    }
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.13, 0.2, 18), rAccentMat);
    nozzle.rotation.x = Math.PI; nozzle.position.y = -0.98; rocketGroup.add(nozzle);

    const engCoreMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: new THREE.Color(0xff4400), emissiveIntensity: 5, transparent: true, opacity: 0.9 });
    const engCore = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), engCoreMat);
    engCore.position.y = -1.12; rocketGroup.add(engCore);
    const engLight = new THREE.PointLight(0xff5500, 5, 3.5);
    engLight.position.y = -1.25; rocketGroup.add(engLight);

    const EX = 60;
    const exGeo = new THREE.BufferGeometry();
    const exArr = new Float32Array(EX * 3);
    const exData = Array.from({ length: EX }, () => ({
      t: Math.random(), sx: (Math.random() - 0.5) * 0.16, sz: (Math.random() - 0.5) * 0.16,
      speed: 0.04 + Math.random() * 0.06,
    }));
    exGeo.setAttribute('position', new THREE.BufferAttribute(exArr, 3));
    const exMat = new THREE.PointsMaterial({ color: 0xff8833, size: 0.065, transparent: true, opacity: 0.7, depthWrite: false });
    rocketGroup.add(new THREE.Points(exGeo, exMat));

    // ── Robot ─────────────────────────────────────────────────
    const robotGroup = new THREE.Group();
    robotGroup.position.set(-4.5, -0.8, 2);
    robotGroup.scale.setScalar(0.7);
    scene.add(robotGroup);

    const rMat  = new THREE.MeshPhysicalMaterial({ color: 0x0d1e38, metalness: 1.0, roughness: 0.08, clearcoat: 0.7 });
    const pMat  = new THREE.MeshPhysicalMaterial({ color: 0x172d4a, metalness: 0.9, roughness: 0.2, clearcoat: 0.3 });
    const eMat  = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: new THREE.Color(0x06b6d4), emissiveIntensity: 4, roughness: 0, metalness: 0, transparent: true, opacity: 0.95 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x02080e, roughness: 0.5 });

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.22, 0);
    robotGroup.add(headGroup);
    const headMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.26, 10, 28), rMat);
    headMesh.scale.set(1.08, 1.0, 0.88); headGroup.add(headMesh);
    headGroup.add(placed(new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.18, 0.02),
      new THREE.MeshPhysicalMaterial({ color: 0x00ccff, emissive: new THREE.Color(0x0090b0), emissiveIntensity: 1.2, transparent: true, opacity: 0.38, roughness: 0, ior: 1.5 })),
    0, 0.01, 0.4));
    [-0.17, 0.17].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 18), eMat.clone());
      eye.position.set(x, 0.01, 0.41); headGroup.add(eye);
    });
    [-1, 1].forEach((s) => {
      const ef = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.26, 0.16), eMat.clone());
      ef.position.set(s * 0.48, 0, 0.08); headGroup.add(ef);
    });
    const antStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.38, 10), pMat);
    antStalk.position.set(0, 0.55, 0); headGroup.add(antStalk);
    const antTopMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: new THREE.Color(0x06b6d4), emissiveIntensity: 4 });
    const antTop = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 16), antTopMat);
    antTop.position.set(0, 0.76, 0); headGroup.add(antTop);

    robotGroup.add(placed(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.2, 14), darkMat), 0, 0.76, 0));

    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.08, 0);
    robotGroup.add(torsoGroup);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.52, 10, 28), rMat);
    torso.scale.set(1.08, 1.0, 0.66); torsoGroup.add(torso);
    const coreOrbMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: new THREE.Color(0x06b6d4), emissiveIntensity: 2.5, transparent: true, opacity: 0.9 });
    const coreOrb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 20), coreOrbMat);
    coreOrb.position.set(0, 0.14, 0.4); torsoGroup.add(coreOrb);

    const hipsGroup = new THREE.Group();
    hipsGroup.position.set(0, -0.58, 0);
    robotGroup.add(hipsGroup);
    hipsGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.2, 0.55), pMat));

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.78, 0.35, 0);
    robotGroup.add(leftArmGroup);
    leftArmGroup.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 7, 20), rMat));
    leftArmGroup.add(placed(new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 20), pMat), 0, -0.3, 0));
    leftArmGroup.add(placed(new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.26, 7, 20), rMat), 0, -0.58, 0));
    leftArmGroup.add(placed(new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 20), pMat), 0, -0.86, 0));

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.78, 0.35, 0);
    robotGroup.add(rightArmGroup);
    rightArmGroup.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 7, 20), rMat));
    rightArmGroup.add(placed(new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 20), pMat), 0, -0.3, 0));
    rightArmGroup.add(placed(new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.26, 7, 20), rMat), 0, -0.58, 0));
    rightArmGroup.add(placed(new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 20), pMat), 0, -0.86, 0));

    [-1, 1].forEach((s) => {
      const lg = new THREE.Group();
      lg.position.set(s * 0.26, -0.7, 0);
      robotGroup.add(lg);
      lg.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.3, 7, 20), rMat));
      lg.add(placed(new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 20), pMat), 0, -0.36, 0));
      lg.add(placed(new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.28, 7, 20), rMat), 0, -0.66, 0));
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.4), rMat);
      foot.position.set(0, -1.05, 0.08); lg.add(foot);
    });

    // ── Holographic dashboard ─────────────────────────────────
    const holoGroup = new THREE.Group();
    holoGroup.position.set(-0.5, 0.6, 0.5);
    holoGroup.scale.setScalar(0);
    robotGroup.add(holoGroup);

    const holoScreenMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: new THREE.Color(0x06b6d4), emissiveIntensity: 1.5, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
    holoGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), holoScreenMat));
    for (let row = 0; row < 4; row++) {
      const hLine = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.01), new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
      hLine.position.y = -0.22 + row * 0.15;
      holoGroup.add(hLine);
    }
    [0.25, 0.55, 0.8, 0.4, 0.95].forEach((h, i) => {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.08, h * 0.35), new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x06b6d4 : 0xa855f7, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
      bar.position.set(-0.28 + i * 0.14, -0.1 + h * 0.175, 0.001);
      holoGroup.add(bar);
    });
    holoGroup.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.92, 0.57, 0.01)),
      new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.7 })
    ));

    // ── Idle animations ───────────────────────────────────────
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const restPose = () => {
      gsap.to(leftArmGroup.rotation,  { x: 0.1,  z:  0.12, duration: 0.8, ease: 'power2.inOut' });
      gsap.to(rightArmGroup.rotation, { x: 0.1,  z: -0.12, duration: 0.8, ease: 'power2.inOut' });
      gsap.to(headGroup.rotation,     { x: 0, y: 0, z: 0,  duration: 0.8, ease: 'power2.inOut' });
      gsap.to(holoGroup.scale,        { x: 0, y: 0, z: 0,  duration: 0.4, ease: 'back.in(2)' });
    };

    const scheduleNextIdle = () => {
      idleTimer = setTimeout(() => {
        if (currentIdle === 1) { currentIdle = 2; adjustTie(); }
        else { currentIdle = 1; checkHolo(); }
      }, 4000 + Math.random() * 3000);
    };

    const checkHolo = () => {
      const tl = gsap.timeline({ onComplete: () => { idleTimer = setTimeout(() => { restPose(); scheduleNextIdle(); }, 2800); } });
      tl.to(leftArmGroup.rotation,  { x: -1.1, z:  0.3, duration: 0.7, ease: 'power2.out' })
        .to(rightArmGroup.rotation, { x: -0.5, z: -0.2, duration: 0.7, ease: 'power2.out' }, 0)
        .to(headGroup.rotation,     { y: -0.35, x: -0.2, duration: 0.6, ease: 'power2.out' }, 0.2)
        .to(holoGroup.scale,        { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(2.5)' }, 0.5)
        .to(headGroup.rotation,     { x: -0.32, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 2 }, 1.0);
    };

    const adjustTie = () => {
      const tl = gsap.timeline({ onComplete: () => { idleTimer = setTimeout(() => { restPose(); scheduleNextIdle(); }, 1200); } });
      tl.to(rightArmGroup.rotation, { x: -1.3, z: -0.25, duration: 0.5, ease: 'power2.out' })
        .to(leftArmGroup.rotation,  { x: -1.2, z:  0.25, duration: 0.5, ease: 'power2.out' }, 0)
        .to(headGroup.rotation,     { x: -0.2, duration: 0.4, ease: 'sine.inOut' }, 0.3)
        .to(rightArmGroup.position, { x: 0.68, duration: 0.18, yoyo: true, repeat: 4, ease: 'sine.inOut' }, 0.55)
        .to(headGroup.rotation,     { x: 0, z: 0.08, duration: 0.35, ease: 'back.out(3)' }, 1.4)
        .to(headGroup.rotation,     { z: 0, duration: 0.3, ease: 'sine.inOut' }, 1.85);
    };

    let currentIdle = 1;
    idleTimer = setTimeout(() => { checkHolo(); }, 2500);

    gsap.to(torsoGroup.scale,   { y: 1.025, duration: 2.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to(antTopMat,          { emissiveIntensity: 1.4, duration: 1.3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to(coreOrb.scale,      { x: 1.15, y: 1.15, z: 1.15, duration: 2.0, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    // ── Asteroids ─────────────────────────────────────────────
    const asteroidGroup = new THREE.Group();
    scene.add(asteroidGroup);
    type AstData = { rotX: number; rotY: number; floatAmp: number; floatSpeed: number; phase: number; originY: number };
    for (let i = 0; i < 18; i++) {
      const r = 0.04 + Math.random() * 0.09;
      const ast = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r, 0),
        new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 0.4, 0.28 + Math.random() * 0.14), roughness: 0.95, metalness: 0.1 })
      );
      const dist = 8 + Math.random() * 5;
      const a = Math.random() * Math.PI * 2;
      const b = (Math.random() - 0.5) * Math.PI * 0.5;
      ast.position.set(dist * Math.cos(b) * Math.cos(a), dist * Math.sin(b), dist * Math.cos(b) * Math.sin(a));
      ast.userData = { rotX: (Math.random()-0.5)*0.01, rotY: (Math.random()-0.5)*0.015, floatAmp: 0.04+Math.random()*0.06, floatSpeed: 0.3+Math.random()*0.4, phase: Math.random()*Math.PI*2, originY: ast.position.y } satisfies AstData;
      asteroidGroup.add(ast);
    }

    // ── Orbit state ───────────────────────────────────────────
    let orbitAngle = 0;
    const ORBIT_SPEED = 0.30;

    // ── Resize ────────────────────────────────────────────────
    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // ── Render loop ───────────────────────────────────────────
    let frameId = 0;
    let time = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      time += 0.016;

      earth.rotation.y += 0.0012;
      cloudMesh.rotation.y += 0.0008;

      orbitAngle -= ORBIT_SPEED * 0.016;
      const ox = earthGroup.position.x + Math.cos(orbitAngle) * ORBIT_R;
      const oz = earthGroup.position.z + Math.sin(orbitAngle) * ORBIT_R;
      rocketGroup.position.set(ox, earthGroup.position.y, oz);
      rocketGroup.lookAt(ox - Math.sin(orbitAngle), earthGroup.position.y, oz + Math.cos(orbitAngle));

      engCoreMat.emissiveIntensity = 4 + Math.sin(time * 9) * 1.5;
      engLight.intensity = 4.5 + Math.sin(time * 7) * 2;
      exMat.opacity = 0.55 + Math.sin(time * 5) * 0.15;
      rWinMat.emissiveIntensity = 1.5 + Math.sin(time * 1.8) * 0.5;
      (noseTip.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.5 + Math.sin(time * 2.5) * 1;

      for (let i = 0; i < EX; i++) {
        const d = exData[i];
        d.t = (d.t + d.speed) % 1;
        exArr[i * 3]     = d.sx * d.t * 2.5;
        exArr[i * 3 + 1] = -1.1 - d.t * 1.3;
        exArr[i * 3 + 2] = d.sz * d.t * 2.5;
      }
      exGeo.attributes.position.needsUpdate = true;

      orbitRingMat.opacity = 0.18 + Math.sin(time * 2.2) * 0.07;

      asteroidGroup.children.forEach((ast) => {
        const u = ast.userData as AstData;
        ast.rotation.x += u.rotX;
        ast.rotation.y += u.rotY;
        ast.position.y = u.originY + Math.sin(time * u.floatSpeed + u.phase) * u.floatAmp;
      });

      starField.rotation.y += 0.00006;
      earthGlow.intensity = 1.0 + Math.sin(time * 0.7) * 0.3;

      if (holoGroup.scale.x > 0.1) {
        holoScreenMat.opacity = 0.14 + Math.sin(time * 12) * 0.04;
        holoGroup.rotation.y = Math.sin(time * 0.8) * 0.06;
      }

      robotGroup.position.y = -0.8 + Math.sin(time * 0.9) * 0.03;
      robotGroup.rotation.y = Math.sin(time * 0.25) * 0.08;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      if (idleTimer) clearTimeout(idleTimer);
      window.removeEventListener('resize', handleResize);
      gsap.killTweensOf([leftArmGroup.rotation, rightArmGroup.rotation, headGroup.rotation,
        torsoGroup.scale, holoGroup.scale, antTopMat, coreOrb.scale]);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={mountRef} className="absolute inset-0 pointer-events-none" />
  );
}
