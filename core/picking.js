/**
 * Raycasting and picking for 3D objects
 */

import * as THREE from 'three';
import { emit } from './state.js';

let raycaster = null;
let targets = [];
let mouse = null;
let currentCamera = null;

export function initPicking(renderer, camera) {
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  currentCamera = camera;
  
  renderer.domElement.addEventListener('click', onClick);
  
  // Update mouse position on move (for hover effects)
  renderer.domElement.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  });
}

function onClick(event) {
  if (!raycaster || !targets.length || !currentCamera) return;
  
  raycaster.setFromCamera(mouse, currentCamera);
  const intersects = raycaster.intersectObjects(targets, true);
  
  if (intersects.length > 0) {
    const obj = intersects[0].object;
    const name = obj.userData?.sectionId || obj.userData?.name;
    if (name) {
      emit('nodeSelected', { name, object: obj });
    }
  }
}

export function setTargets(newTargets) {
  targets = Array.isArray(newTargets) ? newTargets : [];
}

export function updateCamera(camera) {
  currentCamera = camera;
}

export { raycaster, mouse };

