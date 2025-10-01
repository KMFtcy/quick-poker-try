const API_BASE = 'http://127.0.0.1:3000';

// get game state
export async function getGame(gameId) {
  const response = await fetch(`${API_BASE}/game/${gameId}`);
  return response.json();
}

// create game
export async function createGame(userId) {
  const response = await fetch(`${API_BASE}/game/create/${userId}`, {
    method: 'POST'
  });
  return response.json();
}
