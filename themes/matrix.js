/**
 * Matrix Theme - Green cyberpunk aesthetic
 */

import { matrixSceneFactory } from '../scenes/matrixScene.js?v=42';

export const matrix = {
  id: 'matrix',
  name: 'Matrix',
  
  cssVars: {
    '--bg': '#000A0A',
    '--text': '#00FF66',
    '--panel': '#001A1AE6',
    '--accent': '#00FF66',
    '--border': '#004444',
    '--muted': '#88FF99',
    '--glow': 'rgba(0, 255, 102, 0.5)'
  },
  
  config: {
    background: '#000A0A',
    colors: {
      nodePalette: [
        '#00FF66', '#00FF88', '#66FF99', '#88FFAA',
        '#00FF44', '#22FF77', '#44FF99', '#AAFFCC'
      ],
      impulseColor: '#00FF66'
    },
    speeds: {
      rain: 1.2,
      pulse: 0.8
    }
    // Nodes are now auto-generated in matrixScene.js (circular layout with 90° turns)
  },
  
  sceneFactory: (cfg) => matrixSceneFactory({
    ...cfg,
    camera: { eyeHeight: 1.7, lookAhead: 0.003, speed: 14 }
  })
};


