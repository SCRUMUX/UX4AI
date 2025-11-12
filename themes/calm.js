/**
 * Calm Theme - Original calm blue aesthetic
 */

import { calmSceneCompleteFactory } from '../scenes/calmScene-complete.js?v=101';
import { SECTION_NAMES } from '../core/sections.js';

export const calm = {
  id: 'calm',
  name: 'Calm',
  
  cssVars: {
    '--bg': '#0B0F14',
    '--text': '#E6EEF8',
    '--panel': '#0F1420E6',
    '--accent': '#5B9CFF',
    '--border': '#243041',
    '--muted': '#9AA6B2',
    '--glow': 'rgba(91, 156, 255, 0.5)'
  },
  
  config: {
    background: '#0B0F14',
    colors: {
      nodePalette: [
        '#5B9CFF', '#22C55E', '#F59E0B', '#EF4444',
        '#8B5CF6', '#14B8A6', '#E11D48', '#A3E635'
      ],
      impulseColor: '#5B9CFF'
    },
    speeds: {
      swirl: 0.6
    }
  },
  
  sceneFactory: calmSceneCompleteFactory
};

