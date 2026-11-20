/**
 * Loads the local room history.
 * Time Complexity: O(H) where H is the string length of the JSON.
 * Space Complexity: O(N) where N is the number of rooms stored.
 */
export function loadRoomHistory() {
  try { return JSON.parse(localStorage.getItem('roomHistory') || '[]'); } catch { return []; }
}

/**
 * Saves the local room history.
 * Time Complexity: O(N) where N is the number of rooms stored.
 * Space Complexity: O(H) where H is the string length of the JSON.
 */
export function saveRoomHistory(list) {
  localStorage.setItem('roomHistory', JSON.stringify(list));
}

/**
 * Add a room the user visited / created. kind: 'board' | 'exam'.
 * Time Complexity: O(N) to search existing rooms.
 * Space Complexity: O(N) to hold the updated list.
 */
export function addRoomToHistory(id, name, parentId = null, kind = 'board') {
  const list = loadRoomHistory();
  if (!list.find(r => r.id === id)) {
    list.unshift({ id, name, parentId, kind });
    saveRoomHistory(list);
  }
  return list;
}