<template>
  <div id="app">
    <div
      v-if="gameId"
      class="game-id"
      aria-label="Game ID"
      @click="copyGameId"
      title="Click to copy Game ID"
    >
      Game ID: {{ gameId }}
    </div>

    <!-- Copy success toast -->
    <transition name="toast">
      <div v-if="showCopySuccess" class="copy-success-toast">
        ✓ Game ID copied to clipboard!
      </div>
    </transition>
    <div class="table" aria-label="Texas Hold'em Table">
      <div class="felt">
        <div class="community" aria-label="Community Cards">
          <div
            class="card-slot"
            v-for="(card, idx) in communitySlots"
            :key="idx"
          >
            <img v-if="card" :src="cardImageUrl(card)" :alt="card" />
          </div>
        </div>

        <div class="pot" aria-label="Pot">POT: {{ pot }}</div>

        <!-- User ID setup modal -->
        <div v-if="showUserModal" class="modal-overlay">
          <div class="modal" @click.stop>
            <h2>Welcome to Texas Hold'em!</h2>
            <p class="welcome-text">Please enter your user ID to continue</p>
            <div class="user-input-group">
              <input
                v-model="tempUserId"
                type="text"
                placeholder="Enter your user ID"
                class="user-input"
                @keyup.enter="setUserId"
              />
              <button @click="setUserId" class="modal-btn create-btn">
                Continue
              </button>
            </div>
          </div>
        </div>

        <!-- Game mode selection modal -->
        <div v-if="showModeModal" class="modal-overlay">
          <div class="modal" @click.stop>
            <h2>Choose Game Mode</h2>
            <p class="welcome-text">How would you like to start playing?</p>
            <div class="modal-buttons">
              <button @click="createGame" class="modal-btn create-btn">
                Create New Game
              </button>
              <button @click="joinGame" class="modal-btn join-btn">
                Join Existing Game
              </button>
            </div>
          </div>
        </div>

        <!-- Betting area -->
        <div class="betting-area" aria-label="Betting Controls">
          <div class="bet-input-group">
            <input
              v-model.number="betAmount"
              type="number"
              :min="0"
              :max="you.chips"
              placeholder="Bet Amount"
              class="bet-input"
              @keyup.enter="placeBet"
            />
            <button @click="placeBet" class="bet-button">BET</button>
            <button @click="call" class="action-button call-button">
              CALL
            </button>
            <button @click="check" class="action-button check-button">
              CHECK
            </button>
            <button @click="fold" class="action-button fold-button">
              FOLD
            </button>
          </div>
        </div>

        <div class="seat-ring" aria-label="Seats">
          <div
            class="seat"
            v-for="(seat, index) in seatConfigs"
            :key="index"
            :style="`--angle: ${seat.angle}deg; --seat-distance: ${seat.distance}px`"
            :class="{ acting: actingSeat === index + 1 }"
          >
            <span class="label">
              <template v-if="playersBySeat[index + 1]">
                {{ playersBySeat[index + 1]?.chips }}
              </template>
              <template v-else> </template>
            </span>
          </div>
        </div>

        <!-- <div class="dealer-btn" title="Dealer">D</div> -->

        <!-- Hole cards for all seats -->
        <div
          class="hole-cards"
          v-for="(seat, index) in holeSlotsConfigs"
          :key="`hole-${index}`"
          :style="`--angle: ${seat.angle}deg; --hole-distance: ${seat.distance}px`"
          aria-label="Seat Hole Cards"
        >
          <div class="card-slot small">
            <!-- First card: show user's real card if this is 'you' and has cards; else back for others; else empty -->
            <img
              v-if="
                playersBySeat[index + 1] &&
                playersBySeat[index + 1].id === you.id &&
                you.holeCards &&
                you.holeCards.length >= 1
              "
              :src="cardImageUrl(you.holeCards[0])"
              alt="Your first card"
            />
            <img
              v-else-if="
                playersBySeat[index + 1] &&
                playersBySeat[index + 1].id !== you.id
              "
              src="https://deckofcardsapi.com/static/img/back.png"
              alt="Card back"
            />
          </div>
          <div class="card-slot small">
            <!-- Second card: show user's real card if this is 'you' and has cards; else back for others; else empty -->
            <img
              v-if="
                playersBySeat[index + 1] &&
                playersBySeat[index + 1].id === you.id &&
                you.holeCards &&
                you.holeCards.length >= 2
              "
              :src="cardImageUrl(you.holeCards[1])"
              alt="Your second card"
            />
            <img
              v-else-if="
                playersBySeat[index + 1] &&
                playersBySeat[index + 1].id !== you.id
              "
              src="https://deckofcardsapi.com/static/img/back.png"
              alt="Card back"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from "vue";
import {
  getGame as getGameApi,
  createGame as createGameApi,
  getUser as getUserApi,
  bet as betApi,
  call as callApi,
  fold as foldApi,
  check as checkApi,
  joinGame as joinGameApi,
} from "../api/api.js";

const communityCards = ref([]);
const pot = ref(0);
const playersBySeat = ref({});
const actingSeat = ref(null);

// Simple ID storage
const userId = ref(null);
const gameId = ref(null);
const showUserModal = ref(false);
const showModeModal = ref(false);
const tempUserId = ref("");
const showCopySuccess = ref(false);

// Polling state management
const pollingInterval = ref(null);
const isPolling = ref(false);

// ID storage functions
function saveUserId(id) {
  localStorage.setItem("pokerUserId", id);
  userId.value = id;
}

function saveGameId(id) {
  localStorage.setItem("pokerGameId", id);
  gameId.value = id;
}

function loadUserId() {
  return localStorage.getItem("pokerUserId");
}

function loadGameId() {
  return localStorage.getItem("pokerGameId");
}

function createUserId() {
  var id = "chaoyang";
  saveUserId(id);
  return id;
}

function createGameId() {
  var id = "1234567890";
  saveGameId(id);
  return id;
}

// Polling functions
function startPollingGameState() {
  if (isPolling.value || !gameId.value) return;

  isPolling.value = true;
  pollingInterval.value = setInterval(async () => {
    await loadGameState();
    await loadUserState();
  }, 1000);

  console.log("Started polling game state");
}

function stopPollingGameState() {
  if (!isPolling.value) return;

  if (pollingInterval.value) {
    clearInterval(pollingInterval.value);
    pollingInterval.value = null;
  }
  isPolling.value = false;

  console.log("Stopped polling game state");
}

// Modal functions
function closeModal() {
  showUserModal.value = false;
  showModeModal.value = false;
}

function setUserId() {
  if (tempUserId.value.trim()) {
    saveUserId(tempUserId.value.trim());
    showUserModal.value = false;

    // show game mode selection modal
    showModeModal.value = true;
  }
}

async function createGame() {
  try {
    const response = await createGameApi(userId.value);
    if (response.ok) {
      gameId.value = response.gameId;
      saveGameId(response.gameId);
      console.log("Create game success:", response.gameId);

      // Get initial game state
      const gameStateLoaded = await loadGameState();
      if (gameStateLoaded) {
        await loadUserState();
        closeModal();
        startPollingGameState();
      } else {
        console.error("Failed to load game state, keeping modal open");
      }
    }
  } catch (err) {
    console.error("Create game error:", err);
  }
}

async function joinGame() {
  const gameIdInput = prompt("Enter Game ID:");
  if (gameIdInput) {
    try {
      const response = await joinGameApi(gameIdInput, userId.value);
      if (response.ok) {
        gameId.value = response.gameId;
        saveGameId(response.gameId);
        console.log("Join game success:", response.gameId);

        // Get initial game state
        const gameStateLoaded = await loadGameState();
        if (gameStateLoaded) {
          await loadUserState();
          closeModal();
          startPollingGameState();
        } else {
          console.error("Failed to load game state, keeping modal open");
        }
      } else {
        console.error("Failed to join game, keeping modal open");
      }
    } catch (err) {
      console.error("Join game error:", err);
    }
  }
}

// all seats with their angles and distances
const seatConfigs = ref([
  { angle: 0, distance: 200 },
  { angle: 55, distance: 300 },
  { angle: 80, distance: 400 },
  { angle: 110, distance: 370 },
  { angle: 140, distance: 230 },
  { angle: 220, distance: 230 },
  { angle: 250, distance: 370 },
  { angle: 280, distance: 400 },
  { angle: 305, distance: 300 },
]);

// Hole cards positions for all 9 seats
const holeSlotsConfigs = ref([
  { angle: 0, distance: 280 },
  { angle: 55, distance: 420 },
  { angle: 80, distance: 570 },
  { angle: 120, distance: 550 },
  { angle: 150, distance: 420 },
  { angle: 210, distance: 420 },
  { angle: 240, distance: 520 },
  { angle: 280, distance: 560 },
  { angle: 305, distance: 440 },
]);

// you is the player you are playing as
var you = ref({});
const betAmount = ref(0);

onMounted(() => {
  // 皇家同花顺（黑桃 10, J, Q, K, A）
  const royalSpades = ["0S", "JS", "QS", "KS", "AS"];
  communityCards.value = royalSpades;

  // Always show user ID setup first
  const savedUserId = loadUserId();
  if (savedUserId) {
    tempUserId.value = savedUserId;
  }
  showUserModal.value = true;
});

onUnmounted(() => {
  stopPollingGameState();
});

function cardImageUrl(code) {
  return `https://deckofcardsapi.com/static/img/${code}.png`;
}

async function copyGameId() {
  try {
    await navigator.clipboard.writeText(gameId.value);
    showCopySuccess.value = true;
    setTimeout(() => {
      showCopySuccess.value = false;
    }, 1000);
  } catch (err) {
    console.error("Failed to copy Game ID:", err);
    // fallback to traditional copy method
    const textArea = document.createElement("textarea");
    textArea.value = gameId.value;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    showCopySuccess.value = true;
    setTimeout(() => {
      showCopySuccess.value = false;
    }, 2000);
  }
}

async function loadGameState() {
  try {
    const response = await getGameApi(gameId.value);
    if (response.ok) {
      const gameState = response.state;
      console.log("Game state loaded:", gameState);

      // Update community cards
      communityCards.value = gameState.communityCards || [];

      // Update pot
      pot.value = gameState.pot ?? 0;

      // Update players
      playersBySeat.value = {};
      for (const player of gameState.players || []) {
        playersBySeat.value[player.seat] = player;
        if (player.id === userId.value) {
          // Merge to avoid dropping user-only fields like holeCards
          you.value = { ...you.value, ...player };
        }
      }

      // Update acting seat
      actingSeat.value = gameState.actingSeat ?? null;

      return true; // Success
    } else {
      console.error("Game state response not ok:", response);
      return false; // Failure
    }
  } catch (err) {
    console.error("Failed to load game state:", err);
    return false; // Failure
  }
}

async function loadUserState() {
  try {
    if (!gameId.value || !userId.value) return false;
    const response = await getUserApi(gameId.value, userId.value);
    if (response.ok) {
      you.value = response.state;
      return true;
    } else {
      console.error("User state response not ok:", response);
      return false;
    }
  } catch (err) {
    console.error("Failed to load user state:", err);
    return false;
  }
}

async function placeBet() {
  try {
    const currentGameId = gameId.value;
    const currentUserId = userId.value;
    const amount = Number(betAmount.value);

    if (!currentGameId || !currentUserId) {
      console.error("Missing gameId or userId");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      console.error("Invalid bet amount");
      return;
    }

    const maxChips = Number(you.value?.chips ?? 0);
    if (amount > maxChips) {
      console.error("Bet exceeds available chips");
      return;
    }

    const response = await betApi(currentGameId, currentUserId, amount);
    if (response?.ok) {
      await loadGameState();
      await loadUserState();
      // keep the amount for convenience; comment out next line to persist
      betAmount.value = 0;
    } else {
      console.error("Bet failed:", response);
    }
  } catch (err) {
    console.error("Bet error:", err);
  }
}

async function call() {
  try {
    const currentGameId = gameId.value;
    const currentUserId = userId.value;

    if (!currentGameId || !currentUserId) {
      console.error("Missing gameId or userId");
      return;
    }

    const response = await callApi(currentGameId, currentUserId);
    if (response?.ok) {
      await loadGameState();
      await loadUserState();
    } else {
      console.error("Call failed:", response);
    }
  } catch (err) {
    console.error("Call error:", err);
  }
}

async function check() {
  try {
    const currentGameId = gameId.value;
    const currentUserId = userId.value;

    if (!currentGameId || !currentUserId) {
      console.error("Missing gameId or userId");
      return;
    }

    const response = await checkApi(currentGameId, currentUserId);
    if (response?.ok) {
      await loadGameState();
      await loadUserState();
    } else {
      console.error("Check failed:", response);
    }
  } catch (err) {
    console.error("Check error:", err);
  }
}

async function fold() {
  try {
    const currentGameId = gameId.value;
    const currentUserId = userId.value;

    if (!currentGameId || !currentUserId) {
      console.error("Missing gameId or userId");
      return;
    }

    const response = await foldApi(currentGameId, currentUserId);
    if (response?.ok) {
      await loadGameState();
      await loadUserState();
    } else {
      console.error("Fold failed:", response);
    }
  } catch (err) {
    console.error("Fold error:", err);
  }
}

const communitySlots = computed(() => {
  const slots = new Array(5).fill(null);
  for (let i = 0; i < Math.min(5, communityCards.value.length); i += 1) {
    slots[i] = communityCards.value[i];
  }
  return slots;
});
</script>

<style>
:root {
  --table-max-width: 900px;
  --felt-green: #0f7a3b;
  --felt-gradient: radial-gradient(
    ellipse at 50% 45%,
    #1aa154 0%,
    #0f7a3b 55%,
    #0d6a34 100%
  );
  --table-rail: #6b3e2e;
  --table-rail-shadow: rgba(0, 0, 0, 0.35);
  --seat-distance: 200px;
  --seat-size: 55px;
  --seat-bg: #1e1e1e;
  --seat-ring: #a0a0a0;
  --text: #e9f7ec;
  --muted: #cfe8d6;
  --pot-bg: rgba(0, 0, 0, 0.35);
  --dealer: #ffd84d;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #0a0f0c;
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif;
  display: grid;
  place-items: center;
  min-height: 100vh;
}

#app {
  width: min(92vw, var(--table-max-width));
}

.table {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 1;
  border-radius: 50% / 35%;
  background: var(--felt-gradient);
  box-shadow: inset 0 0 0 14px var(--table-rail),
    0 12px 40px var(--table-rail-shadow);
  overflow: visible;
}

.felt {
  position: absolute;
  inset: 16px;
  border-radius: 50% / 35%;
}

/* Community cards area */
.community {
  position: absolute;
  left: 50%;
  top: 53%;
  transform: translate(-50%, -50%);
  display: grid;
  grid-auto-flow: column;
  gap: clamp(6px, 1.2vw, 12px);
}

.card-slot {
  width: clamp(48px, 7.8vw, 75px);
  height: clamp(68px, 11.4vw, 108px);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 2px dashed rgba(255, 255, 255, 0.18);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.card-slot img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

/* Game ID */
.game-id {
  position: absolute;
  left: 52%;
  top: 2%;
  transform: translate(-50%, -50%);
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.3px;
  color: #e4e4e4;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  z-index: 10;
}

.game-id:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translate(-50%, -50%) scale(1.05);
}

/* Copy success toast */
.copy-success-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #4caf50;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

/* Toast transition animations */
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* Pot */
.pot {
  position: absolute;
  left: 50%;
  top: 30%;
  transform: translate(-50%, -50%);
  padding: 6px 12px;
  background: var(--pot-bg);
  border-radius: 999px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--felt-gradient);
  border: 3px solid var(--table-rail);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  min-width: 300px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.modal h2 {
  margin: 0 0 12px 0;
  color: var(--text);
  font-size: 24px;
  font-weight: 700;
}

.welcome-text {
  margin: 0 0 24px 0;
  color: var(--muted);
  font-size: 16px;
}

.user-input-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.user-input {
  width: 100%;
  max-width: 280px;
  padding: 12px 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.4);
  color: var(--text);
  font-size: 16px;
  text-align: center;
}

.user-input:focus {
  outline: none;
  border-color: var(--dealer);
  box-shadow: 0 0 0 2px rgba(255, 216, 77, 0.3);
}

.user-input::placeholder {
  color: var(--muted);
}

.modal-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.modal-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.create-btn {
  background: var(--dealer);
  color: #222;
}

.create-btn:hover {
  background: #ffed4e;
  transform: translateY(-2px);
}

.join-btn {
  background: #4caf50;
  color: white;
}

.join-btn:hover {
  background: #45a049;
  transform: translateY(-2px);
}

/* Dealer button */
.dealer-btn {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) rotate(0deg) translateY(calc(-50% + 12px))
    rotate(0deg);
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--dealer);
  color: #222;
  display: grid;
  place-items: center;
  font-weight: 800;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}

/* Seat ring and seats */
.seat-ring {
  position: absolute;
  inset: 0;
}

.seat {
  --angle: 0deg;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) rotate(var(--angle))
    translateY(calc(-50% + var(--seat-distance)))
    rotate(calc(-1 * var(--angle)));
  width: var(--seat-size);
  height: var(--seat-size);
  border-radius: 50%;
  background: var(--seat-bg);
  border: 3px solid var(--seat-ring);
  display: grid;
  place-items: center;
  color: var(--muted);
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.3px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
}

.seat.acting {
  border-color: #ffd84d;
  box-shadow: 0 0 0 3px rgba(255, 216, 77, 0.35),
    0 0 14px 6px rgba(255, 216, 77, 0.25), 0 4px 10px rgba(0, 0, 0, 0.35);
  animation: actingPulse 1.4s ease-in-out infinite;
}

@keyframes actingPulse {
  0% {
    box-shadow: 0 0 0 2px rgba(255, 216, 77, 0.2),
      0 0 10px 4px rgba(255, 216, 77, 0.2), 0 4px 10px rgba(0, 0, 0, 0.35);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(255, 216, 77, 0.45),
      0 0 18px 8px rgba(255, 216, 77, 0.35), 0 6px 12px rgba(0, 0, 0, 0.45);
  }
  100% {
    box-shadow: 0 0 0 2px rgba(255, 216, 77, 0.2),
      0 0 10px 4px rgba(255, 216, 77, 0.2), 0 4px 10px rgba(0, 0, 0, 0.35);
  }
}

.seat .label {
  font-weight: 700;
  color: #e4e4e4;
}

/* Player hole cards */
.hole-cards {
  position: absolute;
  left: 50%;
  top: 60%;
  transform: translate(-50%, -50%) rotate(var(--angle))
    translateY(calc(-50% + var(--hole-distance, 260px)))
    rotate(calc(-1 * var(--angle)));
  display: grid;
  grid-auto-flow: column;
  gap: clamp(6px, 1.2vw, 10px);
  z-index: 3;
}

.card-slot.small {
  width: clamp(64px, 5.2vw, 100px);
  height: clamp(90px, 7.8vw, 144px);
}

/* Betting area */
.betting-area {
  position: absolute;
  left: 50%;
  top: 77%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 4;
}

.bet-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.bet-input {
  width: 120px;
  padding: 8px 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.4);
  color: var(--text);
  font-size: 14px;
  text-align: center;
}

.bet-input:focus {
  outline: none;
  border-color: var(--dealer);
  box-shadow: 0 0 0 2px rgba(255, 216, 77, 0.3);
}

.bet-button {
  padding: 8px 16px;
  background: var(--dealer);
  color: #222;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bet-button:hover:not(:disabled) {
  background: #ffed4e;
  transform: translateY(-1px);
}

.bet-button:disabled {
  background: #666;
  color: #999;
  cursor: not-allowed;
  transform: none;
}

.bet-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--muted);
}

.bet-info span {
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.action-button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.call-button {
  background: #2196f3;
  color: white;
}

.call-button:hover:not(:disabled) {
  background: #1976d2;
  transform: translateY(-1px);
}

.call-button:disabled {
  background: #666;
  color: #999;
  cursor: not-allowed;
  transform: none;
}

/* Check button */
.check-button {
  background: #9e9e9e;
  color: #222;
}

.check-button:hover:not(:disabled) {
  background: #8a8a8a;
  transform: translateY(-1px);
}

.check-button:disabled {
  background: #666;
  color: #999;
  cursor: not-allowed;
  transform: none;
}

/* Fold button */
.fold-button {
  background: #e53935;
  color: white;
}

.fold-button:hover:not(:disabled) {
  background: #c62828;
  transform: translateY(-1px);
}

.fold-button:disabled {
  background: #666;
  color: #999;
  cursor: not-allowed;
  transform: none;
}

/* Small screens */
@media (max-width: 520px) {
  :root {
    --seat-size: 48px;
  }
  .pot {
    font-size: 12px;
  }

  .bet-input {
    width: 100px;
    font-size: 12px;
  }

  .bet-button {
    padding: 6px 12px;
    font-size: 12px;
  }

  .bet-info {
    font-size: 11px;
    gap: 8px;
  }

  .action-button {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>
