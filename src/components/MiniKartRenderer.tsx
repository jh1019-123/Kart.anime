import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { KARTS } from '../data';

interface MiniKartRendererProps {
  kartId: string;
  width?: number;
  height?: number;
}

export const MiniKartRenderer: React.FC<MiniKartRendererProps> = ({
  kartId,
  width = 180,
  height = 130
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing children (prevents double canvas rendering in React 18 StrictMode)
    containerRef.current.innerHTML = '';

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = null; // transparent background

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 20);
    camera.position.set(3.4, 2.2, 4.0);
    camera.lookAt(0, 0.3, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    const spotlight = new THREE.SpotLight(0x00ffff, 2, 10, Math.PI / 6, 0.5, 1);
    spotlight.position.set(0, 4, 0);
    scene.add(spotlight);

    // 3. Find kart info
    const kartInfo = KARTS.find(k => k.id === kartId) || KARTS[0];
    const kartColor = kartInfo.color;

    // 4. Construct simplified elegant 3D Kart
    const kartGroup = new THREE.Group();

    // Primary metallic body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: kartColor,
      metalness: 0.9,
      roughness: 0.1
    });
    const darkPlateMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.2
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.95,
      roughness: 0.05
    });

    const bodyGeo = new THREE.BoxGeometry(1.2, 0.4, 2.0);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.45;
    kartGroup.add(bodyMesh);

    // Nose cone / spoiler
    const noseGeo = new THREE.BoxGeometry(1.1, 0.2, 0.8);
    const noseMesh = new THREE.Mesh(noseGeo, bodyMat);
    noseMesh.position.set(0, 0.35, 1.2);
    kartGroup.add(noseMesh);

    // Side splitters
    const splitterL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 1.4), darkPlateMat);
    splitterL.position.set(-0.68, 0.35, 0.3);
    const splitterR = splitterL.clone();
    splitterR.position.x = 0.68;
    kartGroup.add(splitterL, splitterR);

    // Back Engine / Thruster block
    const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), darkPlateMat);
    engineBlock.position.set(0, 0.6, -1.0);
    kartGroup.add(engineBlock);

    // Spoiler wings
    const wingUpper = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.6), bodyMat);
    wingUpper.position.set(0, 1.2, -1.1);
    
    const wingSupportL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), darkPlateMat);
    wingSupportL.position.set(-0.5, 0.9, -1.1);
    const wingSupportR = wingSupportL.clone();
    wingSupportR.position.x = 0.5;

    kartGroup.add(wingUpper, wingSupportL, wingSupportR);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
    const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8);
    rimGeo.rotateZ(Math.PI / 2);

    const wheelPositions = [
      [-0.7, 0.35, 0.7],
      [0.7, 0.35, 0.7],
      [-0.7, 0.35, -0.7],
      [0.7, 0.35, -0.7]
    ];

    wheelPositions.forEach((pos) => {
      const wMesh = new THREE.Mesh(wheelGeo, wheelMat);
      wMesh.position.set(pos[0], pos[1], pos[2]);
      
      const rMesh = new THREE.Mesh(rimGeo, rimMat);
      wMesh.add(rMesh);
      kartGroup.add(wMesh);
    });

    scene.add(kartGroup);

    // Base podium cylinder stand
    const standGeo = new THREE.CylinderGeometry(1.5, 1.6, 0.2, 16);
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2
    });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 0.1;
    scene.add(stand);

    // 5. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      kartGroup.rotation.y += 0.015;
      renderer.render(scene, camera);
    };
    animate();

    // 6. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      try {
        if (containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
        scene.clear();
      } catch (err) {}
    };
  }, [kartId, width, height]);

  return (
    <div 
      ref={containerRef} 
      className="relative flex items-center justify-center pointer-events-none" 
      style={{ width, height }} 
    />
  );
};
