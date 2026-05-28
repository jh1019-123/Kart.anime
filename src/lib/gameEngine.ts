import * as THREE from 'three';
import { MapInfo } from '../types';

// Audio Synthesizer Engine
export const AudioEngine = {
  ctx: null as AudioContext | null,
  engineSnd: null as { osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null,

  init() {
    try {
      if (this.ctx) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.warn("AudioContext failed to initialize (restricted environment/iframe):", e);
    }
  },

  playEngine(rpmRatio: number) {
    if (!this.ctx) return null;
    try {
      if (this.engineSnd) {
        this.engineSnd.osc.frequency.setValueAtTime(50 + (rpmRatio * 180), this.ctx.currentTime);
        return this.engineSnd;
      }
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(50 + (rpmRatio * 180), this.ctx.currentTime);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200 + (rpmRatio * 400), this.ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0.04 + (rpmRatio * 0.04), this.ctx.currentTime);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      osc.start();
      this.engineSnd = { osc, gain: gainNode, filter };
      return this.engineSnd;
    } catch (e) {
      return null;
    }
  },

  stopEngine() {
    if (this.engineSnd) {
      try {
        this.engineSnd.osc.stop();
      } catch (e) {}
      this.engineSnd = null;
    }
  },

  playBoost() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 1.2);

      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2.5);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 2.5);
    } catch (e) {}
  },

  playDrift() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(240, now + 0.35);

      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.005, now + 0.35);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.35);
    } catch (e) {}
  },

  playItemPickup() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.1); // E5

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5
      osc2.frequency.setValueAtTime(1046.50, now + 0.25); // C6

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {}
  },

  playCrash() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 0.6);
    } catch (e) {}
  }
};

export class GameEngine {
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  container: HTMLDivElement;

  // Track & Nodes
  trackSpline!: THREE.CatmullRomCurve3;
  roadMesh!: THREE.Mesh;
  decorativeGroup = new THREE.Group();
  itemsGroup = new THREE.Group();

  // Racers
  playerKart!: { mesh: THREE.Group; wheels: THREE.Mesh[]; nozzle: THREE.Mesh };
  aiKart!: { mesh: THREE.Group; wheels: THREE.Mesh[]; nozzle: THREE.Mesh };

  // Game Attributes
  active = false;
  timer = 0;
  lap = 1;
  maxLaps = 3;
  lapCheckpoints = [false, false];

  speed = 0;
  maxSpeed = 1.15;
  accel = 0.02;
  decel = 0.006;
  friction = 0.985;
  angle = 0;
  turnSpeed = 0.03;

  isDrifting = false;
  driftDirection = 0;
  driftAngle = 0;
  boosterGauge = 0;
  boosterStock = 0;
  boosterActive = false;
  boosterTimer = 0;

  shieldActive = false;
  shieldTimer = 0;
  aiProgress = 0;
  lastCrashTime = 0;

  itemBoxes: Array<{ mesh: THREE.Mesh; basePos: THREE.Vector3; active: boolean; respawnTimer: number }> = [];
  obstacles: Array<{ mesh: THREE.Mesh; position: THREE.Vector3 }> = [];
  particleGroup: THREE.Mesh[] = [];

  cameraView: 'isometric' | 'chase' | 'first' = 'isometric';

  // React Callbacks
  onLapChange: (lap: number) => void;
  onSpeedChange: (speed: number) => void;
  onBoosterGaugeChange: (gauge: number) => void;
  onBoosterCountChange: (count: number) => void;
  onItemPickup: () => void;
  onGameFinished: (playerWon: boolean, finalTime: number) => void;
  onAiCrashNotification: () => void;
  onPlayerCrashNotification: () => void;

  constructor(
    container: HTMLDivElement,
    mapInfo: MapInfo,
    playerKartColor: number,
    playerFlameColor: number,
    aiKartColor: number,
    stats: { speed: number; accel: number; drift: number; handling: number },
    onLapChange: (lap: number) => void,
    onSpeedChange: (speed: number) => void,
    onBoosterGaugeChange: (gauge: number) => void,
    onBoosterCountChange: (count: number) => void,
    onItemPickup: () => void,
    onGameFinished: (playerWon: boolean, finalTime: number) => void,
    onAiCrashNotification: () => void,
    onPlayerCrashNotification: () => void
  ) {
    this.container = container;
    this.maxSpeed = stats.speed;
    this.accel = stats.accel;
    // stats.drift affects gauge multiplier
    this.turnSpeed = stats.handling;

    this.onLapChange = onLapChange;
    this.onSpeedChange = onSpeedChange;
    this.onBoosterGaugeChange = onBoosterGaugeChange;
    this.onBoosterCountChange = onBoosterCountChange;
    this.onItemPickup = onItemPickup;
    this.onGameFinished = onGameFinished;
    this.onAiCrashNotification = onAiCrashNotification;
    this.onPlayerCrashNotification = onPlayerCrashNotification;

    this.initTrack(mapInfo.points);
    this.init3D(mapInfo.skyColor);
    this.buildTrack();
    this.playerKart = this.createKart(playerKartColor, playerFlameColor);
    this.aiKart = this.createKart(aiKartColor, 0xfacc15);

    this.resetRace();
  }

  initTrack(pointsArray: [number, number, number][]) {
    const vectors = pointsArray.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    this.trackSpline = new THREE.CatmullRomCurve3(vectors, true);
  }

  init3D(skyColor: number) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(skyColor);
    this.scene.fog = new THREE.FogExp2(skyColor, 0.0035);

    this.camera = new THREE.PerspectiveCamera(65, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // Light Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xc084fc, 1.2);
    dirLight.position.set(50, 200, 50);
    this.scene.add(dirLight);

    const cyanLight = new THREE.PointLight(0x22d3ee, 2.0, 400);
    cyanLight.position.set(0, 40, -50);
    this.scene.add(cyanLight);

    const pinkLight = new THREE.PointLight(0xf43f5e, 2.0, 400);
    pinkLight.position.set(120, 30, -100);
    this.scene.add(pinkLight);

    this.scene.add(this.decorativeGroup);
    this.scene.add(this.itemsGroup);
  }

  buildTrack() {
    const trackGeometry = new THREE.TubeGeometry(this.trackSpline, 200, 14, 8, true);
    const trackMaterial = new THREE.MeshBasicMaterial({
      color: 0x111827,
      side: THREE.DoubleSide
    });
    this.roadMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    this.roadMesh.scale.set(1, 0.01, 1);
    this.scene.add(this.roadMesh);

    const pointsCount = 140;
    const splinePoints = this.trackSpline.getSpacedPoints(pointsCount);

    for (let i = 0; i < pointsCount; i++) {
      const pt = splinePoints[i];
      const tangent = this.trackSpline.getTangentAt(i / pointsCount).normalize();
      const normal = new THREE.Vector3(0, 1, 0);
      const binormal = tangent.clone().cross(normal).normalize();

      // Warning center dashes
      if (i % 2 === 0) {
        const centerDashGeo = new THREE.BoxGeometry(0.3, 0.05, 2.5);
        const centerDashMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        const dash = new THREE.Mesh(centerDashGeo, centerDashMat);
        dash.position.copy(pt).add(new THREE.Vector3(0, 0.05, 0));
        dash.lookAt(pt.clone().add(tangent));
        this.scene.add(dash);
      }

      // Border dots
      const leftPos = pt.clone().add(binormal.clone().multiplyScalar(-13.8));
      const leftRing = new THREE.Mesh(new THREE.SphereGeometry(0.4, 5, 5), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
      leftRing.position.copy(leftPos).add(new THREE.Vector3(0, 0.1, 0));
      this.scene.add(leftRing);

      const rightPos = pt.clone().add(binormal.clone().multiplyScalar(13.8));
      const rightRing = new THREE.Mesh(new THREE.SphereGeometry(0.4, 5, 5), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
      rightRing.position.copy(rightPos).add(new THREE.Vector3(0, 0.1, 0));
      this.scene.add(rightRing);

      // Trees
      if (i % 6 === 0) {
        const treePos = pt.clone().add(binormal.clone().multiplyScalar(21));
        const h = 7 + Math.random() * 8;
        const tree = new THREE.Mesh(
          new THREE.ConeGeometry(3.5, h, 4),
          new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? 0x22d3ee : 0xec4899,
            roughness: 0.1,
            metalness: 0.5,
            emissive: Math.random() > 0.5 ? 0x06b6d4 : 0xdb2777,
            emissiveIntensity: 0.45
          })
        );
        tree.position.copy(treePos);
        tree.position.y += h / 2;
        this.decorativeGroup.add(tree);
      }
    }

    // Finish Gate
    const gateGroup = new THREE.Group();
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 16, 6), new THREE.MeshBasicMaterial({ color: 0x334155 }));
    p1.position.set(-15, 8, 0);
    const p2 = p1.clone();
    p2.position.set(15, 8, 0);

    const cross = new THREE.Mesh(new THREE.BoxGeometry(32, 2, 3), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    cross.position.set(0, 16, 0);

    const banner = new THREE.Mesh(new THREE.BoxGeometry(14, 2.0, 3.2), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    banner.position.set(0, 16, 0);

    gateGroup.add(p1, p2, cross, banner);
    const tg = this.trackSpline.getTangentAt(0).normalize();
    gateGroup.lookAt(tg);
    gateGroup.position.copy(this.trackSpline.getPointAt(0));
    this.scene.add(gateGroup);
  }

  createKart(colorHex: number, nozzleColorHex: number) {
    const kartGroup = new THREE.Group();

    // Chassis body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.9,
      roughness: 0.15
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 4.2), bodyMat);
    body.position.y = 0.5;
    kartGroup.add(body);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 1.4), bodyMat);
    nose.position.set(0, 0.4, 2.3);
    kartGroup.add(nose);

    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 1.0), wingMat);
    wing.position.set(0, 1.7, -2.2);

    const supLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.3, 0.25), wingMat);
    supLeft.position.set(-1.1, 1.0, -2.1);
    const supRight = supLeft.clone();
    supRight.position.x = 1.1;
    kartGroup.add(wing, supLeft, supRight);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.6, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
    wheelGeo.rotateZ(Math.PI / 2);

    const wheels: THREE.Mesh[] = [];
    const wheelPositions = [
      [-1.4, 0.5, 1.4],
      [1.4, 0.5, 1.4],
      [-1.4, 0.5, -1.4],
      [1.4, 0.5, -1.4]
    ];
    wheelPositions.forEach(pos => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(pos[0], pos[1], pos[2]);
      kartGroup.add(w);
      wheels.push(w);
    });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 1.3), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    seat.position.set(0, 1.0, -0.4);
    kartGroup.add(seat);

    const nozzleGeo = new THREE.CylinderGeometry(0.2, 0.35, 0.8, 8);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeo, new THREE.MeshBasicMaterial({ color: nozzleColorHex }));
    nozzle.position.set(0, 0.55, -2.2);
    kartGroup.add(nozzle);

    this.scene.add(kartGroup);
    return { mesh: kartGroup, wheels, nozzle };
  }

  spawnItemBoxes() {
    this.itemBoxes.forEach(box => this.scene.remove(box.mesh));
    this.itemBoxes = [];

    const totalBoxes = 12;
    for (let i = 0; i < totalBoxes; i++) {
      const t = (i + 0.5) / totalBoxes;
      const point = this.trackSpline.getPointAt(t);

      const boxMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.9,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0xfacc15,
        emissiveIntensity: 0.6
      });

      const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), boxMat);
      boxMesh.position.copy(point);
      boxMesh.position.y += 2.0;

      this.scene.add(boxMesh);
      this.itemBoxes.push({
        mesh: boxMesh,
        basePos: boxMesh.position.clone(),
        active: true,
        respawnTimer: 0
      });
    }
  }

  createSmokeParticle(position: THREE.Vector3, colorHex = 0xffffff, size = 0.6) {
    const pGeo = new THREE.DodecahedronGeometry(size, 1);
    const pMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.95
    });
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.copy(position);

    p.userData = {
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        (Math.random() * 0.12) + 0.08,
        (Math.random() - 0.5) * 0.15
      ),
      life: 1.0,
      decay: 0.04
    };

    this.scene.add(p);
    this.particleGroup.push(p);
  }

  createBoosterFlame(position: THREE.Vector3, speedHeading: THREE.Vector3, isPlayer = true) {
    if (!position || !speedHeading || isNaN(position.x) || isNaN(speedHeading.x)) return;

    const pGeo = new THREE.ConeGeometry(0.35, 1.5, 4);
    pGeo.rotateX(-Math.PI / 2);

    const pMat = new THREE.MeshBasicMaterial({
      color: isPlayer ? (Math.random() > 0.4 ? 0xff007f : 0x22d3ee) : (Math.random() > 0.4 ? 0xf43f5e : 0xfacc15),
      transparent: true,
      opacity: 0.95
    });
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.copy(position);
    
    // Guard against looking at identical position to prevent lookAt NaN/Matrix issues
    const targetLookAt = p.position.clone().add(speedHeading);
    if (p.position.distanceToSquared(targetLookAt) > 0.0001) {
      p.lookAt(targetLookAt);
    }

    p.userData = {
      vel: speedHeading.clone().multiplyScalar(-1.5).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15
      )),
      life: 1.0,
      decay: 0.1
    };
    this.scene.add(p);
    this.particleGroup.push(p);
  }

  updateParticles() {
    for (let i = this.particleGroup.length - 1; i >= 0; i--) {
      const p = this.particleGroup[i];
      p.position.add(p.userData.vel);
      p.userData.life -= p.userData.decay;

      p.scale.setScalar(p.userData.life);
      (p.material as THREE.MeshBasicMaterial).opacity = p.userData.life;

      if (isNaN(p.userData.life) || p.userData.life <= 0) {
        this.scene.remove(p);
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
        this.particleGroup.splice(i, 1);
      }
    }
  }

  resetRace() {
    this.active = false;
    this.timer = 0;
    this.lap = 1;
    this.speed = 0;
    this.angle = 0;
    this.boosterGauge = 0;
    this.boosterStock = 0;
    this.boosterActive = false;
    this.lapCheckpoints = [false, false];
    this.aiProgress = 0;

    this.obstacles.forEach(obs => this.scene.remove(obs.mesh));
    this.obstacles = [];

    const startPoint = this.trackSpline.getPointAt(0);
    const startDir = this.trackSpline.getTangentAt(0).normalize();

    this.playerKart.mesh.position.copy(startPoint);
    const sideOffset = startDir.clone().cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(-3);
    this.playerKart.mesh.position.add(sideOffset);

    this.angle = Math.atan2(startDir.x, startDir.z);
    this.playerKart.mesh.rotation.y = this.angle;

    this.aiKart.mesh.position.copy(startPoint);
    const aiSideOffset = startDir.clone().cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(3);
    this.aiKart.mesh.position.add(aiSideOffset);
    this.aiKart.mesh.rotation.y = this.angle;

    this.spawnItemBoxes();
  }

  activateEngine() {
    this.active = true;
  }

  useBooster() {
    this.boosterActive = true;
    this.boosterTimer = 180;
    AudioEngine.playBoost();
  }

  activateBooster() {
    this.useBooster();
  }

  shootMissile() {
    const missile = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.8, 8),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    missile.geometry.rotateX(Math.PI / 2);
    missile.position.copy(this.playerKart.mesh.position);
    this.scene.add(missile);

    let progress = 0;
    const launchInterval = setInterval(() => {
      progress += 0.06;
      missile.position.lerp(this.aiKart.mesh.position, progress);
      this.createSmokeParticle(missile.position, 0xf43f5e, 0.4);

      if (progress >= 1.0) {
        clearInterval(launchInterval);
        this.scene.remove(missile);
        this.triggerAICrash();
      }
    }, 50);
  }

  triggerAICrash() {
    AudioEngine.playCrash();
    this.aiKart.mesh.userData.spinTimer = 60;
    this.onAiCrashNotification();
  }

  dropBanana() {
    const playerPos = this.playerKart.mesh.position;
    const heading = new THREE.Vector3(Math.sin(this.angle), 0, Math.cos(this.angle));
    const dropPos = playerPos.clone().sub(heading.multiplyScalar(4));

    const banGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 8);
    const banMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xfacc15,
      emissiveIntensity: 0.6
    });
    const banana = new THREE.Mesh(banGeo, banMat);
    banana.position.copy(dropPos);
    banana.position.y += 0.1;

    this.scene.add(banana);
    this.obstacles.push({
      mesh: banana,
      position: banana.position.clone()
    });
  }

  update(keys: Record<string, boolean>, driftStatsWeight = 1.8) {
    if (!this.active) return;

    this.timer += 16.67;

    // A. Player Limits
    let currentLimit = this.maxSpeed;
    if (this.boosterActive) {
      // Reduced boost multiplier from 1.5 to 1.28 for significantly better user control per request
      currentLimit = this.maxSpeed * 1.28;
      this.boosterTimer--;

      const rearOffset = new THREE.Vector3(0, 0.5, -2.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.angle);
      const sprayPos = this.playerKart.mesh.position.clone().add(rearOffset);
      const headingVec = new THREE.Vector3(Math.sin(this.angle), 0, Math.cos(this.angle));
      this.createBoosterFlame(sprayPos, headingVec, true);

      if (this.boosterTimer <= 0) {
        this.boosterActive = false;
      }
    }

    // B. Drive Inputs
    const forward = keys.ArrowUp || keys.w;
    const backward = keys.ArrowDown || keys.s;
    const left = keys.ArrowLeft || keys.a;
    const right = keys.ArrowRight || keys.d;
    const driftKey = keys.Shift;

    if (forward) {
      this.speed += this.accel;
      if (this.speed > currentLimit) this.speed = currentLimit;
    } else if (backward) {
      this.speed -= this.accel;
      if (this.speed < -0.3) this.speed = -0.3;
    } else {
      this.speed *= this.friction;
    }

    let angleDiff = 0;
    if (Math.abs(this.speed) > 0.05) {
      const turnDirection = this.speed > 0 ? 1 : -1;
      // Smoothened steering coefficient by 15% for much cleaner control per request
      if (left) angleDiff = this.turnSpeed * turnDirection * 0.85;
      if (right) angleDiff = -this.turnSpeed * turnDirection * 0.85;
    }

    // Drift Logic
    if (driftKey && Math.abs(angleDiff) > 0 && this.speed > 0.3) {
      if (!this.isDrifting) {
        this.isDrifting = true;
        this.driftDirection = angleDiff > 0 ? 1 : -1;
        AudioEngine.playDrift();
      }

      // Reduced drift curve scale from 1.45 to 1.22 for refined high-speed handling
      angleDiff *= 1.22;
      this.driftAngle = -this.driftDirection * 0.45;

      const tyreOffset = new THREE.Vector3(-1.3, 0.1, -1.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.angle);
      const driftTirePos = this.playerKart.mesh.position.clone().add(tyreOffset);
      this.createSmokeParticle(driftTirePos, 0xff007f, 0.45);

      // Charge Gauge
      this.boosterGauge += (1.0 * driftStatsWeight); // stats.drift influence
      if (this.boosterGauge >= 100) {
        this.boosterGauge = 0;
        this.boosterStock++;
        this.onBoosterCountChange(this.boosterStock);
      }
      this.onBoosterGaugeChange(this.boosterGauge);
    } else {
      this.isDrifting = false;
      this.driftAngle *= 0.8;
    }

    this.angle += angleDiff;
    this.playerKart.mesh.rotation.y = this.angle + this.driftAngle;

    this.playerKart.wheels.forEach(w => {
      w.rotation.x += this.speed * 1.8;
    });

    if (this.playerKart.mesh.userData.spinTimer > 0) {
      this.playerKart.mesh.userData.spinTimer--;
      this.playerKart.mesh.rotation.y += 0.4;
      this.speed = 0.05;
    } else {
      const vx = Math.sin(this.angle) * this.speed;
      const vz = Math.cos(this.angle) * this.speed;

      this.playerKart.mesh.position.x += vx;
      this.playerKart.mesh.position.z += vz;
    }

    // Outer wall check
    const nearestT = this.getNearestTrackSplinePoint(this.playerKart.mesh.position);
    const centerPt = this.trackSpline.getPointAt(nearestT);
    this.playerKart.mesh.position.y = 0;

    const dist = this.playerKart.mesh.position.distanceTo(centerPt);
    const maxRoadRadius = 13.5;

    if (dist > maxRoadRadius) {
      const pushDir = new THREE.Vector3().subVectors(this.playerKart.mesh.position, centerPt);
      pushDir.y = 0;
      pushDir.normalize();

      this.playerKart.mesh.position.copy(centerPt).add(pushDir.multiplyScalar(maxRoadRadius));

      if (this.speed > 0.15) {
        // Wall scrap slide physics with gradual velocity decay as requested instead of abrupt backward bounce
        this.speed *= 0.92;
        
        // Throttled notification and audio play to prevent UI stutter logs
        if (!this.lastCrashTime || Date.now() - this.lastCrashTime > 1200) {
          AudioEngine.playCrash();
          this.onPlayerCrashNotification();
          this.lastCrashTime = Date.now();
          for (let i = 0; i < 4; i++) {
            this.createSmokeParticle(this.playerKart.mesh.position, 0xfacc15, 0.5);
          }
        }
      } else {
        this.speed *= 0.95;
      }
    }

    // Speed callback
    this.onSpeedChange(Math.floor((Math.abs(this.speed) / this.maxSpeed) * 210));

    this.updateAIRacer();
    this.checkCollisions();
    this.checkLapMilestones(nearestT);

    if (this.shieldActive) {
      this.shieldTimer--;
      if (this.shieldTimer <= 0) {
        this.shieldActive = false;
      }
    }

    this.updateParticles();
    this.updateCamera();
  }

  updateAIRacer() {
    let aiSpeed = 0.0009 + (Math.sin(Date.now() * 0.001) * 0.00015);

    if (this.aiKart.mesh.userData.spinTimer > 0) {
      this.aiKart.mesh.userData.spinTimer--;
      this.aiKart.mesh.rotation.y += 0.3;
      return;
    }

    this.aiProgress += aiSpeed;
    if (this.aiProgress > 1.0) this.aiProgress -= 1.0;

    const currentPos = this.aiKart.mesh.position.clone();
    const targetPos = this.trackSpline.getPointAt(this.aiProgress);

    this.aiKart.mesh.position.lerp(targetPos, 0.18);
    this.aiKart.mesh.position.y = 0;

    const lookAngle = Math.atan2(targetPos.x - currentPos.x, targetPos.z - currentPos.z);
    this.aiKart.mesh.rotation.y = lookAngle;

    this.aiKart.wheels.forEach(w => {
      w.rotation.x += 0.7;
    });
  }

  checkCollisions() {
    const pPos = this.playerKart.mesh.position;

    // Item Box collisions
    this.itemBoxes.forEach(box => {
      if (box.active && pPos.distanceTo(box.mesh.position) < 3.2) {
        box.active = false;
        box.mesh.visible = false;
        box.respawnTimer = 300;
        this.onItemPickup();
      }

      if (box.active) {
        box.mesh.rotation.y += 0.03;
        box.mesh.rotation.x += 0.015;
        box.mesh.position.y = box.basePos.y + Math.sin(Date.now() * 0.0035) * 0.3;
      } else {
        box.respawnTimer--;
        if (box.respawnTimer <= 0) {
          box.active = true;
          box.mesh.visible = true;
        }
      }
    });

    // Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (pPos.distanceTo(obs.position) < 2.2) {
        if (this.shieldActive) {
          this.shieldActive = false;
        } else {
          this.playerKart.mesh.userData.spinTimer = 50;
          AudioEngine.playCrash();
          this.onPlayerCrashNotification();
        }
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }

    // AI collides with obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (this.aiKart.mesh.position.distanceTo(obs.position) < 2.2) {
        this.aiKart.mesh.userData.spinTimer = 50;
        AudioEngine.playCrash();
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }
  }

  checkLapMilestones(nearestT: number) {
    if (nearestT > 0.45 && nearestT < 0.55) {
      this.lapCheckpoints[0] = true;
    }
    if (nearestT > 0.8 && nearestT < 0.9) {
      this.lapCheckpoints[1] = true;
    }

    // Start-Fin line
    if (nearestT > 0.96 && this.lapCheckpoints[0] && this.lapCheckpoints[1]) {
      this.lapCheckpoints = [false, false];
      this.lap++;

      if (this.lap > this.maxLaps) {
        const playerWon = nearestT >= this.aiProgress;
        this.onGameFinished(playerWon, this.timer);
      } else {
        this.onLapChange(this.lap);
      }
    }
  }

  getNearestTrackSplinePoint(pos: THREE.Vector3) {
    let closestT = 0;
    let minDist = Infinity;
    const samples = 120;
    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const pathPt = this.trackSpline.getPointAt(t);
      const d = pos.distanceTo(pathPt);
      if (d < minDist) {
        minDist = d;
        closestT = t;
      }
    }
    return closestT;
  }

  drawMinimap(canvasElement: HTMLCanvasElement) {
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 4;
    ctx.beginPath();

    const samples = 60;
    const centerOffset = new THREE.Vector2(canvasElement.width / 2, canvasElement.height / 2);
    const scale = canvasElement.width * 0.0022; // proportional scale

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const pt = this.trackSpline.getPointAt(t);
      const x = centerOffset.x + pt.x * scale;
      const y = centerOffset.y + pt.z * scale;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Player Marker
    const pPos = this.playerKart.mesh.position;
    const px = centerOffset.x + pPos.x * scale;
    const py = centerOffset.y + pPos.z * scale;

    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();

    // AI Marker
    const aiPos = this.aiKart.mesh.position;
    const ax = centerOffset.x + aiPos.x * scale;
    const ay = centerOffset.y + aiPos.z * scale;

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(ax, ay, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  updateCamera() {
    const kartPos = this.playerKart.mesh.position;
    const angle = this.angle + this.driftAngle;

    const backX = Math.sin(angle);
    const backZ = Math.cos(angle);

    const speedRatio = this.maxSpeed > 0 ? (Math.abs(this.speed) / this.maxSpeed) : 0;
    const targetFov = 65 + (isNaN(speedRatio) ? 0 : speedRatio) * 20;
    const safeTargetFov = isNaN(targetFov) || !isFinite(targetFov) ? 65 : Math.max(30, Math.min(125, targetFov));
    const currentFov = isNaN(this.camera.fov) || !isFinite(this.camera.fov) ? 65 : this.camera.fov;
    
    this.camera.fov = THREE.MathUtils.lerp(currentFov, safeTargetFov, 0.1);
    this.camera.updateProjectionMatrix();

    let shake = 0;
    if (this.boosterActive) {
      shake = 0.16;
    } else if (this.speed > 0.8) {
      shake = 0.05;
    }

    const shakeOffset = new THREE.Vector3(
      (Math.random() - 0.5) * shake,
      (Math.random() - 0.5) * shake,
      (Math.random() - 0.5) * shake
    );

    if (this.cameraView === 'isometric') {
      const targetCamPos = new THREE.Vector3(
        kartPos.x - backX * 12 + 8,
        10.5,
        kartPos.z - backZ * 12 + 8
      );
      this.camera.position.lerp(targetCamPos, 0.08).add(shakeOffset);
      this.camera.lookAt(kartPos);
    } else if (this.cameraView === 'chase') {
      const targetCamPos = new THREE.Vector3(
        kartPos.x - backX * 8.5,
        4.2,
        kartPos.z - backZ * 8.5
      );
      this.camera.position.lerp(targetCamPos, 0.12).add(shakeOffset);
      this.camera.lookAt(kartPos.clone().add(new THREE.Vector3(0, 1.0, 0)));
    } else if (this.cameraView === 'first') {
      const frontX = Math.sin(angle);
      const frontZ = Math.cos(angle);

      const targetCamPos = new THREE.Vector3(
        kartPos.x + frontX * 0.3,
        1.1,
        kartPos.z + frontZ * 0.3
      );
      this.camera.position.copy(targetCamPos).add(shakeOffset);

      const lookTarget = kartPos.clone().add(new THREE.Vector3(frontX * 10, 0.7, frontZ * 10));
      this.camera.lookAt(lookTarget);
    }
  }

  resize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  cleanup() {
    AudioEngine.stopEngine();
    if (this.renderer) {
      try {
        this.container.removeChild(this.renderer.domElement);
      } catch (e) {}
      this.renderer.dispose();
    }
  }
}
