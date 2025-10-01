<template>
  <div id="app">
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

        <div class="pot" aria-label="Pot">POT: 0</div>

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
          </div>
        </div>

        <div class="seat-ring" aria-label="Seats">
          <div
            class="seat"
            v-for="(seat, index) in seatConfigs"
            :key="index"
            :style="`--angle: ${seat.angle}deg; --seat-distance: ${seat.distance}px`"
          >
            <span class="label">
              <template v-if="index === 0">
                {{ you.chips }}
              </template>
              <template v-else-if="hasPlayerInSeat(index)">
                {{ getPlayerInSeat(index)?.chips }}
              </template>
              <template v-else> </template>
            </span>
          </div>
        </div>

        <!-- <div class="dealer-btn" title="Dealer">D</div> -->

        <!-- Player hole cards in front of seat 1 -->
        <div
          class="hole-cards"
          style="--angle: 0deg; --hole-distance: 280px"
          aria-label="Seat 1 Hole Cards"
        >
          <div
            class="card-slot small"
            v-for="(card, idx) in you.holeCards"
            :key="idx"
          >
            <img v-if="card" :src="cardImageUrl(card)" :alt="card" />
          </div>
        </div>
        <!-- Other seats: show card backs only if player exists -->
        <div
          class="hole-cards"
          v-for="(seat, index) in cardSlotsConfigs"
          :key="`back-${index}`"
          :style="`--angle: ${seat.angle}deg; --hole-distance: ${seat.distance}px`"
          aria-label="Other Seat Hole Cards"
        >
          <div class="card-slot small">
            <img
              v-if="hasPlayerInSeat(index + 1)"
              src="https://deckofcardsapi.com/static/img/back.png"
              alt="Card back"
            />
          </div>
          <div class="card-slot small">
            <img
              v-if="hasPlayerInSeat(index + 1)"
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
import { onMounted, ref, computed } from "vue";

class Player {
  constructor(id, chips, holeCards) {
    this.id = id;
    this.chips = typeof chips === "number" ? chips : 1000;
    this.holeCards = holeCards;
    this.currentBet = 0;
  }
}
const communityCards = ref([]);

// Seat configuration array - all seats with their angles and distances
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

// Other seats configuration for hole cards (excluding seat 1)
const cardSlotsConfigs = ref([
  { angle: 55, distance: 420 },
  { angle: 80, distance: 570 },
  { angle: 120, distance: 550 },
  { angle: 150, distance: 420 },
  { angle: 210, distance: 420 },
  { angle: 240, distance: 520 },
  { angle: 280, distance: 560 },
  { angle: 305, distance: 440 },
]);

var you = new Player(1, 1000, ["5S", "6S"]);

var opponentsPlayers = ref({
  2: {
    player: new Player(2, 1000),
  },
  5: {
    player: new Player(2, 1000),
  },
});

onMounted(() => {
  // 皇家同花顺（黑桃 10, J, Q, K, A）
  const royalSpades = ["0S", "JS", "QS", "KS", "AS"];
  communityCards.value = royalSpades;
});

function cardImageUrl(code) {
  return `https://deckofcardsapi.com/static/img/${code}.png`;
}

function hasPlayerInSeat(seatIndex) {
  // seatIndex + 1 because seat numbers start from 1, but array index starts from 0
  const seatNumber = seatIndex + 1;
  return opponentsPlayers.value.hasOwnProperty(seatNumber);
}

function getPlayerInSeat(seatIndex) {
  // Get player in seat (seat numbers start from 1)
  const seatNumber = seatIndex + 1;
  return opponentsPlayers.value[seatNumber]?.player;
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
}
</style>
