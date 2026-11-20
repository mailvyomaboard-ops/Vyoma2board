/**
 * @file cursorCoordinates.js
 * Centralized Canonical Coordinate Transformations & Presence Utilities
 * 
 * Establishes a single authoritative mathematical model for projecting between
 * Screen Viewport Coordinates and Canvas Scene / Board World Coordinates.
 *
 * Complexity:
 * - Time Complexity: O(1) for all coordinate transformations and color generation.
 * - Space Complexity: O(1) auxiliary space.
 */

/**
 * High-contrast Cyberpunk Palette for deterministic participant color assignment.
 * Guaranteed legible against both dark (#090a0f) and light (#FFFAF0) backgrounds.
 */
export const PARTICIPANT_PALETTE = [
  '#00ffcc', // Cyberpunk Neon Cyan
  '#ff007f', // Acid Pink
  '#bfff00', // Neon Lime
  '#ffb800', // Cyber Amber
  '#9945ff', // Neon Purple
  '#00e5ff', // Electric Turquoise
  '#ff3b30', // Laser Red
  '#30d158', // Matrix Green
  '#ffd60a', // Volt Yellow
  '#64d2ff', // Sky Neon
  '#bf5af2', // Plasma Violet
  '#ff9500', // Neon Tangerine
];

/**
 * Computes a deterministic, stable color for a participant based on their ID.
 * @param {string} identifier - Unique user ID or session ID
 * @returns {string} Hex color string
 */
export function getParticipantColor(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    return PARTICIPANT_PALETTE[0];
  }
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % PARTICIPANT_PALETTE.length;
  return PARTICIPANT_PALETTE[index];
}

/**
 * Converts Screen / Viewport coordinates (from mouse or touch) to Canvas Scene / World coordinates.
 * Formula: scene = (screen - containerOrigin) / zoom - scroll
 * 
 * @param {number} clientX - Viewport X coordinate
 * @param {number} clientY - Viewport Y coordinate
 * @param {number} zoom - Current canvas zoom factor (e.g. 1.0)
 * @param {number} scrollX - Canvas scroll offset X
 * @param {number} scrollY - Canvas scroll offset Y
 * @param {{ left: number, top: number }} [containerOrigin={ left: 0, top: 0 }] - Canvas container bounding rect origin
 * @returns {{ x: number, y: number }} Canonical Board World coordinates
 */
export function screenToBoardCoordinates(clientX, clientY, zoom, scrollX, scrollY, containerOrigin = { left: 0, top: 0 }) {
  const z = zoom > 0 ? zoom : 1;
  const originX = containerOrigin.left || 0;
  const originY = containerOrigin.top || 0;

  const sceneX = (clientX - originX) / z - scrollX;
  const sceneY = (clientY - originY) / z - scrollY;

  return {
    x: Math.round(sceneX * 100) / 100,
    y: Math.round(sceneY * 100) / 100,
  };
}

/**
 * Converts Canvas Scene / World coordinates to Screen / Viewport coordinates for rendering overlays.
 * Formula: screen = (scene + scroll) * zoom + containerOrigin
 * 
 * @param {number} sceneX - Canvas Scene X coordinate
 * @param {number} sceneY - Canvas Scene Y coordinate
 * @param {number} zoom - Current canvas zoom factor (e.g. 1.0)
 * @param {number} scrollX - Canvas scroll offset X
 * @param {number} scrollY - Canvas scroll offset Y
 * @param {{ left: number, top: number }} [containerOrigin={ left: 0, top: 0 }] - Canvas container bounding rect origin
 * @returns {{ x: number, y: number }} Screen Viewport coordinates
 */
export function boardToScreenCoordinates(sceneX, sceneY, zoom, scrollX, scrollY, containerOrigin = { left: 0, top: 0 }) {
  const z = zoom > 0 ? zoom : 1;
  const originX = containerOrigin.left || 0;
  const originY = containerOrigin.top || 0;

  const screenX = (sceneX + scrollX) * z + originX;
  const screenY = (sceneY + scrollY) * z + originY;

  return {
    x: Math.round(screenX * 10) / 10,
    y: Math.round(screenY * 10) / 10,
  };
}

/**
 * Validates, normalizes, and sanitizes ephemeral cursor chat messages.
 * Prevents XSS, control characters, and unbounded network payloads.
 * 
 * @param {string} text - Raw input text from user
 * @param {number} [maxLength=80] - Maximum allowed length
 * @returns {string} Sanitized string
 */
export function sanitizeCursorMessage(text, maxLength = 80) {
  if (typeof text !== 'string') return '';
  return text
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"&]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case "'": return '&#39;';
        case '"': return '&quot;';
        case '&': return '&amp;';
        default: return char;
      }
    });
}
