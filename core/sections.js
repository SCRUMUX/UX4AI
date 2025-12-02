/**
 * Единый перечень секций - источник истины для всех тем
 * Каждая сцена обязана иметь якорь для каждой секции из этого списка
 */

export const SECTIONS = [
  'about',      // 🎸 Владимир Костял
  'basics',     // ▶️ Основы UX для AI
  'patterns',   // 🧩 Паттерны взаимодействия
  'assistant',  // ⚙️ Настройки ассистента
  'prompts',    // 📋 Промпты и Сценарии
  'operations', // 📊 Операционная эффективность
  'security',   // 🛡️ Безопасность и соответствие
  'marketplace' // 🧭 Плейбуки и маркетплейс
];

export const SECTION_NAMES = {
  about: '🎸 Владимир Костял',
  basics: '▶️ Основы UX для AI',
  patterns: '🧩 Паттерны взаимодействия',
  assistant: '⚙️ Настройки ассистента',
  prompts: '📋 Промпты и Сценарии',
  operations: '📊 Операционная эффективность',
  security: '🛡️ Безопасность и соответствие',
  marketplace: '🧭 Плейбуки и маркетплейс'
};

export function getSectionId(name) {
  const entry = Object.entries(SECTION_NAMES).find(([id, displayName]) => displayName === name);
  return entry ? entry[0] : null;
}

export function getSectionName(id) {
  return SECTION_NAMES[id] || id;
}

export function validateAnchors(anchors) {
  const anchorIds = anchors.map(a => a.name);
  const missing = SECTIONS.filter(id => !anchorIds.includes(id));
  
  if (missing.length > 0) {
    throw new Error(`Scene missing anchors for sections: ${missing.join(', ')}`);
  }
  
  return true;
}

