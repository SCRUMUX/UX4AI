/**
 * Label projection and positioning
 */

let labelsLayer = null;
let getAnchorsFn = null;

export function initLabels(layerElement) {
  labelsLayer = layerElement;
}

export function setAnchorsGetter(fn) {
  getAnchorsFn = fn;
}

export function updatePositions(camera, renderer) {
  if (!getAnchorsFn || !labelsLayer) return;
  
  const anchors = getAnchorsFn();
  const w = window.innerWidth;
  const h = window.innerHeight;
  
  anchors.forEach((anchor, i) => {
    let label = labelsLayer.querySelector(`[data-section="${anchor.name}"]`);
    
    // Create if not exists
    if (!label) {
      label = document.createElement('div');
      label.className = 'label';
      label.dataset.section = anchor.name;
      // Get section name from SECTION_NAMES
      if (anchor.sectionName) {
        label.textContent = anchor.sectionName;
      } else {
        label.textContent = anchor.name;
      }
      labelsLayer.appendChild(label);
    }
    
    // Project 3D position to screen
    const screenPos = anchor.pos.clone().project(camera);
    const x = (screenPos.x * 0.5 + 0.5) * w;
    const y = (-screenPos.y * 0.5 + 0.5) * h;
    
    // Hide if behind camera
    if (screenPos.z < -1 || screenPos.z > 1) {
      label.style.display = 'none';
    } else {
      label.style.display = 'block';
      label.style.left = x + 'px';
      label.style.top = y + 'px';
    }
  });
}

export function clearLabels() {
  if (labelsLayer) {
    labelsLayer.innerHTML = '';
  }
}

