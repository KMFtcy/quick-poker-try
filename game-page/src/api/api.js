/**
 * 最简单的API客户端
 * 只有一个示例接口，其他你自己加
 */

const API_BASE = 'http://127.0.0.1:3000';

// 示例：获取游戏状态
export async function getGame(gameId) {
  const response = await fetch(`${API_BASE}/game/${gameId}`);
  return response.json();
}

// 示例：创建游戏
export async function createGame(userId) {
  const response = await fetch(`${API_BASE}/game/create/${userId}`, {
    method: 'POST'
  });
  return response.json();
}
