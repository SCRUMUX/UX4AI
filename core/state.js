/**
 * Глобальное состояние и простая шина событий
 */

const state = {
  // UI Theme: 'dark' or 'light' (NOT scene theme like 'calm'/'matrix')
  activeThemeId: 'dark',
  // Scene: always 'calm' (only one 3D scene plugin)
  activeSceneId: 'calm',
  activeSection: null,
  currentNodeIndex: -1,
  orbitModeEnabled: false,
  currentNodeName: ''
};

const listeners = {};

export function on(event, fn) {
  if (!listeners[event]) {
    listeners[event] = [];
  }
  listeners[event].push(fn);
  
  // Return unsubscribe function
  return () => {
    const index = listeners[event].indexOf(fn);
    if (index > -1) {
      listeners[event].splice(index, 1);
    }
  };
}

export function emit(event, payload) {
  if (listeners[event]) {
    listeners[event].forEach(fn => fn(payload));
  }
}

export function set(key, value) {
  state[key] = value;
  // Emit state change event
  emit('stateChanged', { key, value, state });
}

export function get(key) {
  return state[key];
}

export function getState() {
  return { ...state };
}

export default {
  on,
  emit,
  set,
  get,
  getState
};

