const API_BASE = 'http://127.0.0.1:3000';

// get game state
export async function getGame(gameId) {
  const response = await fetch(`${API_BASE}/game/${gameId}`);
  return response.json();
}

// get user state
export async function getUser(gameId, userId) {
  const response = await fetch(`${API_BASE}/game/${gameId}/${userId}`);
  return response.json();
}

// create game
export async function createGame(userId) {
  const response = await fetch(`${API_BASE}/game/create/${userId}`, {
    method: 'POST'
  });
  return response.json();
}

// bet
export async function bet(gameId, userId, betAmount) {
  const response = await fetch(`${API_BASE}/game/${gameId}/bet/${userId}/${betAmount}`, {
    method: 'POST'
  });
  return response.json();
}

//call
export async function call(gameId, userId) {
  const response = await fetch(`${API_BASE}/game/${gameId}/call/${userId}`, {
    method: 'POST'
  });
  return response.json();
}

//fold
export async function fold(gameId, userId) {
  const response = await fetch(`${API_BASE}/game/${gameId}/fold/${userId}`, {
    method: 'POST'
  });
  return response.json();
}
