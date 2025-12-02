/**
 * Raycasting and picking for 3D objects
 */

import * as THREE from 'three';
import { emit } from './state.js';

let raycaster = null;
let targets = [];
let mouse = null;
let currentCamera = null;

// Store references to handlers for cleanup
let clickHandler = null;
let mousemoveHandler = null;
let currentRendererElement = null;

export function initPicking(renderer, camera) {
  // Clean up previous handlers if reinitializing
  if (currentRendererElement && clickHandler) {
    currentRendererElement.removeEventListener('click', clickHandler);
    currentRendererElement.removeEventListener('mousemove', mousemoveHandler);
  }
  
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  currentCamera = camera;
  currentRendererElement = renderer.domElement;
  
  // Store handler reference for cleanup
  clickHandler = onClick;
  mousemoveHandler = (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  };
  
  renderer.domElement.addEventListener('click', clickHandler);
  renderer.domElement.addEventListener('mousemove', mousemoveHandler);
}

function onClick(event) {
  if (!raycaster || !targets.length || !currentCamera) return;
  
  raycaster.setFromCamera(mouse, currentCamera);
  const intersects = raycaster.intersectObjects(targets, true);
  
  if (intersects.length > 0) {
    const obj = intersects[0].object;
    const name = obj.userData?.sectionId || obj.userData?.name;
    console.log('[Picking] Click detected on object:', {
      sectionId: obj.userData?.sectionId,
      name: obj.userData?.name,
      resolvedName: name,
      userData: obj.userData
    });
    if (name) {
      emit('nodeSelected', { name, object: obj });
      console.log('[Picking] Emitted nodeSelected event:', name);
    } else {
      console.warn('[Picking] No name found for clicked object:', obj);
    }
  }
}

export function setTargets(newTargets) {
  targets = Array.isArray(newTargets) ? newTargets : [];
}

export function updateCamera(camera) {
  currentCamera = camera;
}

/**
 * Dispose picking system - remove event listeners and clear state
 * Call this when disposing the engine or switching scenes
 */
export function disposePicking() {
  if (currentRendererElement) {
    if (clickHandler) {
      currentRendererElement.removeEventListener('click', clickHandler);
    }
    if (mousemoveHandler) {
      currentRendererElement.removeEventListener('mousemove', mousemoveHandler);
    }
  }
  
  // Clear state
  targets = [];
  currentCamera = null;
  raycaster = null;
  mouse = null;
  clickHandler = null;
  mousemoveHandler = null;
  currentRendererElement = null;
  
  console.log('[Picking] Disposed picking system');
}

export { raycaster, mouse };

