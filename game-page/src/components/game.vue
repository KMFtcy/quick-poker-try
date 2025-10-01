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

        <div class="seat-ring" aria-label="Seats">
          <div class="seat" style="--angle: 0deg; --seat-distance: 200px">
            <span class="label">1</span>
          </div>
          <div class="seat" style="--angle: 55deg; --seat-distance: 300px">
            <span class="label">2</span>
          </div>
          <div class="seat" style="--angle: 80deg; --seat-distance: 400px">
            <span class="label">3</span>
          </div>
          <div class="seat" style="--angle: 110deg; --seat-distance: 370px">
            <span class="label">4</span>
          </div>
          <div class="seat" style="--angle: 140deg; --seat-distance: 230px">
            <span class="label">5</span>
          </div>
          <div class="seat" style="--angle: 220deg; --seat-distance: 230px">
            <span class="label">6</span>
          </div>
          <div class="seat" style="--angle: 250deg; --seat-distance: 370px">
            <span class="label">7</span>
          </div>
          <div class="seat" style="--angle: 280deg; --seat-distance: 400px">
            <span class="label">8</span>
          </div>
          <div class="seat" style="--angle: 305deg; --seat-distance: 300px">
            <span class="label">9</span>
          </div>
        </div>

        <!-- <div class="dealer-btn" title="Dealer">D</div> -->

        <!-- Player 1 hole cards in front of seat 1 -->
        <div
          class="hole-cards"
          style="--angle: 0deg; --hole-distance: 280px"
          aria-label="Seat 1 Hole Cards"
        >
          <div
            class="card-slot small"
            v-for="(card, idx) in player1Slots"
            :key="idx"
          >
            <img v-if="card" :src="cardImageUrl(card)" :alt="card" />
          </div>
        </div>
        <!-- Other seats: show card backs -->
        <div
          class="hole-cards"
          v-for="(angle, i) in otherSeatsAngles"
          :key="`back-` + i"
          :style="`--angle: ${angle}deg; --hole-distance: ${otherSeatsDistances[i]}px`"
          aria-label="Other Seat Hole Cards"
        >
          <div class="card-slot small">
            <img
              src="https://deckofcardsapi.com/static/img/back.png"
              alt="Card back"
            />
          </div>
          <div class="card-slot small">
            <img
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

const communityCards = ref([]);
const player1Cards = ref([]);
const otherSeatsAngles = ref([55, 80, 120, 150, 210, 240, 280, 305]);
const otherSeatsDistances = ref([420, 570, 550, 420, 420, 520, 560, 440]);

onMounted(() => {
  // 皇家同花顺（黑桃 10, J, Q, K, A）
  const royalSpades = ["0S", "JS", "QS", "KS", "AS"];
  communityCards.value = royalSpades;
  // 示例：玩家1两张黑桃手牌（可替换）
  player1Cards.value = ["AS", "KS"];
});

function cardImageUrl(code) {
  return `https://deckofcardsapi.com/static/img/${code}.png`;
}

const communitySlots = computed(() => {
  const slots = new Array(5).fill(null);
  for (let i = 0; i < Math.min(5, communityCards.value.length); i += 1) {
    slots[i] = communityCards.value[i];
  }
  return slots;
});

const player1Slots = computed(() => {
  const slots = new Array(2).fill(null);
  for (let i = 0; i < Math.min(2, player1Cards.value.length); i += 1) {
    slots[i] = player1Cards.value[i];
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
  --seat-size: 40px;
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

/* Small screens */
@media (max-width: 520px) {
  :root {
    --seat-size: 48px;
  }
  .pot {
    font-size: 12px;
  }
}
</style>
