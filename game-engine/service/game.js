// Minimal in-memory Texas Hold'em game model for a single table (<=9 players)
// MVP focus: create/join game, get state, bet/call/fold, advance streets, settle

const { v4: uuidv4 } = require('uuid');
const { GamePhase, Game } = require('../model/game');
const { Player, PlayerStatus } = require('../model/player');
const { SUITS, RANKS } = require('../model/deck');

// In-memory store of all games
const games = new Map();

// ---------- Seats helpers ----------
function getPlayerAtSeat(game, seat) {
    return game.seats[seat];
}

function setPlayerAtSeat(game, seat, player) {
    if (player) {
        game.seats[seat] = player;
    } else {
        delete game.seats[seat];
    }
}

function occupiedSeats(game) {
    const seats = [];
    for (let s = 1; s <= game.maxSeats; s++) {
        if (getPlayerAtSeat(game, s)) seats.push(s);
    }
    return seats;
}

function activeSeats(game) {
    return occupiedSeats(game).filter(s => {
        const p = getPlayerAtSeat(game, s);
        return p && p.status === PlayerStatus.ACTIVE;
    });
}

function totalPlayers(game) {
    return occupiedSeats(game).length;
}

function seatOfUser(game, userId) {
    for (let s = 1; s <= game.maxSeats; s++) {
        const p = getPlayerAtSeat(game, s);
        if (p && p.id === userId) return s;
    }
    return null;
}

function findNearestSeatTo1(game) {
    // Prefer seat 1, then 2, 3 ... clockwise
    for (let offset = 0; offset < game.maxSeats; offset++) {
        const seat = ((1 - 1 + offset) % game.maxSeats) + 1;
        if (!getPlayerAtSeat(game, seat)) return seat;
    }
    return null;
}

function nextOccupiedSeat(game, startSeat) {
    if (totalPlayers(game) === 0) return null;
    for (let step = 1; step <= game.maxSeats; step++) {
        const seat = ((startSeat - 1 + step) % game.maxSeats) + 1;
        if (getPlayerAtSeat(game, seat)) return seat;
    }
    return null;
}

function nextActiveSeat(game, startSeat) {
    for (let step = 1; step <= game.maxSeats; step++) {
        const seat = ((startSeat - 1 + step) % game.maxSeats) + 1;
        const p = getPlayerAtSeat(game, seat);
        if (p && p.status === PlayerStatus.ACTIVE && p.chips >= 0) return seat;
    }
    return null;
}

function generateShuffledDeck() {
    const deck = [];
    for (const s of SUITS) {
        for (const r of RANKS) deck.push(r + s);
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function createGame() {
    // const id = uuidv4();
    const id = "1234567890";
    const game = new Game(id);
    games.set(id, game);
    return game;
}

function getGame(gameId) {
    return games.get(gameId) || null;
}

function getUserPrivateInfo(gameId, userId) {
    const game = getGame(gameId);
    if (!game) throw new Error('GAME_NOT_FOUND');
    const seat = seatOfUser(game, userId);
    return seat ? getPlayerAtSeat(game, seat) : null;
}

function joinGame(gameId, userId, buyInChips = 1000) {
    const game = getGame(gameId);
    if (!game) throw new Error('GAME_NOT_FOUND');
    const existingSeat = seatOfUser(game, userId);
    if (existingSeat) return game; // already seated
    const seat = findNearestSeatTo1(game);
    if (!seat) throw new Error('TABLE_FULL');
    const player = new Player(userId, buyInChips);
    setPlayerAtSeat(game, seat, player);
    if (game.phase === GamePhase.WAITING && totalPlayers(game) >= 2) startHand(game);
    return game;
}

function startHand(game) {
    game.deck = generateShuffledDeck();
    game.communityCards = [];
    game.pot = 0;
    for (const seat of occupiedSeats(game)) {
        const p = getPlayerAtSeat(game, seat);
        if (p.status !== PlayerStatus.OUT) {
            p.status = PlayerStatus.ACTIVE;
            p.holeCards = [game.deck.pop(), game.deck.pop()];
            p.currentBet = 0;
        }
    }
    // blinds
    if (totalPlayers(game) < 2) {
        game.phase = GamePhase.WAITING;
        return;
    }
    game.phase = GamePhase.PREFLOP;
    // Initialize button if absent -> nearest occupied from seat 1
    if (game.buttonSeat == null) {
        const first = nextOccupiedSeat(game, 1) || 1;
        game.buttonSeat = first;
    }
    const sbSeat = nextActiveSeat(game, game.buttonSeat) ?? nextOccupiedSeat(game, game.buttonSeat);
    const bbSeat = nextActiveSeat(game, sbSeat ?? game.buttonSeat) ?? nextOccupiedSeat(game, sbSeat ?? game.buttonSeat);
    if (sbSeat) postBlind(game, sbSeat, game.smallBlind);
    if (bbSeat) postBlind(game, bbSeat, game.bigBlind);
    game.minRaise = game.bigBlind;
    game.actingSeat = nextActiveSeat(game, bbSeat ?? game.buttonSeat);
    game.lastAggressorSeat = bbSeat ?? null;
}

function postBlind(game, seat, amount) {
    const p = getPlayerAtSeat(game, seat);
    const blind = Math.min(amount, p.chips);
    p.chips -= blind;
    p.currentBet += blind;
    game.pot += blind;
}

function currentMaxBet(game) {
    const seats = occupiedSeats(game);
    return Math.max(0, ...seats.map(s => getPlayerAtSeat(game, s).currentBet));
}

// replaced by nextActiveSeat

function allBetsAlignedOrAllIn(game) {
    const active = activeSeats(game).map(s => getPlayerAtSeat(game, s));
    if (active.length <= 1) return true;
    const max = currentMaxBet(game);
    return active.every(p => p.currentBet === max || p.chips === 0);
}

function advancePhase(game) {
    for (const seat of occupiedSeats(game)) getPlayerAtSeat(game, seat).currentBet = 0;
    if (game.phase === GamePhase.PREFLOP) {
        game.communityCards.push(game.deck.pop(), game.deck.pop(), game.deck.pop());
        game.phase = GamePhase.FLOP;
    } else if (game.phase === GamePhase.FLOP) {
        game.communityCards.push(game.deck.pop());
        game.phase = GamePhase.TURN;
    } else if (game.phase === GamePhase.TURN) {
        game.communityCards.push(game.deck.pop());
        game.phase = GamePhase.RIVER;
    } else if (game.phase === GamePhase.RIVER) {
        game.phase = GamePhase.SHOWDOWN;
        settle(game);
        return;
    }
    // Set action to first active left of button
    game.actingSeat = nextActiveSeat(game, game.buttonSeat ?? 1);
    game.lastAggressorSeat = null;
}

function ensureTurn(game, userId) {
    const seat = seatOfUser(game, userId);
    if (!seat) throw new Error('PLAYER_NOT_IN_GAME');
    if (seat !== game.actingSeat) throw new Error('NOT_YOUR_TURN');
    const p = getPlayerAtSeat(game, seat);
    if (p.status !== PlayerStatus.ACTIVE) throw new Error('PLAYER_NOT_ACTIVE');
    return { seat, player: p };
}

function bet(gameId, userId, betAmount) {
    const game = getGame(gameId);
    if (!game) throw new Error('GAME_NOT_FOUND');
    if ([GamePhase.WAITING, GamePhase.SHOWDOWN].includes(game.phase)) throw new Error('BET_NOT_ALLOWED');
    const { seat, player } = ensureTurn(game, userId);
    const toCall = currentMaxBet(game) - player.currentBet;
    const raise = Math.max(0, betAmount - toCall);
    console.log('betAmount: ' + betAmount + ' toCall: ' + toCall + ' raise: ' + raise + ' minRaise: ' + game.minRaise);
    if (raise > 0 && raise < game.minRaise && betAmount < player.chips + toCall) throw new Error('MIN_RAISE_VIOLATION');
    const commit = Math.min(player.chips, betAmount);
    player.chips -= commit;
    player.currentBet += commit;
    game.pot += commit;
    if (player.currentBet > currentMaxBet(game)) {
        game.minRaise = Math.max(game.minRaise, player.currentBet - (currentMaxBet(game) - commit));
        game.lastAggressorSeat = seat;
    }
    passAction(game);
    return game;
}

function call(gameId, userId) {
    const game = getGame(gameId);
    if (!game) throw new Error('GAME_NOT_FOUND');
    const { player } = ensureTurn(game, userId);
    const toCall = Math.max(0, currentMaxBet(game) - player.currentBet);
    const commit = Math.min(player.chips, toCall);
    player.chips -= commit;
    player.currentBet += commit;
    game.pot += commit;
    passAction(game);
    return game;
}

function fold(gameId, userId) {
    const game = getGame(gameId);
    if (!game) throw new Error('GAME_NOT_FOUND');
    const { seat, player } = ensureTurn(game, userId);
    player.status = PlayerStatus.FOLDED;
    passAction(game, seat);
    return game;
}

function passAction(game, justFoldedSeat = null) {
    // If only one active player remains, award pot and start next hand
    const activePlayers = activeSeats(game).map(s => getPlayerAtSeat(game, s));
    if (activePlayers.length === 1) {
        activePlayers[0].chips += game.pot;
        game.pot = 0;
        game.phase = GamePhase.SHOWDOWN;
        rotateButton(game);
        startHand(game);
        return;
    }
    // Action rotation
    const nextSeat = nextActiveSeat(game, game.actingSeat ?? (game.buttonSeat ?? 1));
    game.actingSeat = nextSeat;
    // Check if betting round ends
    if (allBetsAlignedOrAllIn(game)) {
        if (game.phase === GamePhase.RIVER) {
            game.phase = GamePhase.SHOWDOWN;
            settle(game);
        } else {
            advancePhase(game);
        }
    }
}

function rotateButton(game) {
    const seats = occupiedSeats(game);
    if (seats.length === 0) return;
    if (game.buttonSeat == null) {
        game.buttonSeat = seats[0];
        return;
    }
    game.buttonSeat = nextOccupiedSeat(game, game.buttonSeat) ?? seats[0];
}

// Super-simplified showdown evaluator: random winner among active players
// MVP: correctness is less critical than end-to-end flow. Replace later with real hand evaluator.
function settle(game) {
    const contenders = occupiedSeats(game).map(s => getPlayerAtSeat(game, s)).filter(p => p.status === PlayerStatus.ACTIVE || p.status === PlayerStatus.FOLDED);
    const activeAtShowdown = contenders.filter(p => p.status === PlayerStatus.ACTIVE);
    const awardPool = game.pot;
    game.pot = 0;
    if (activeAtShowdown.length === 0) {
        // Edge: if everyone folded somehow, give to next button
        const seat = nextActiveSeat(game, game.buttonSeat ?? 1) ?? occupiedSeats(game)[0];
        const p = seat ? getPlayerAtSeat(game, seat) : null;
        if (p) p.chips += awardPool;
    } else if (activeAtShowdown.length === 1) {
        activeAtShowdown[0].chips += awardPool;
    } else {
        const winner = activeAtShowdown[Math.floor(Math.random() * activeAtShowdown.length)];
        winner.chips += awardPool;
    }
    rotateButton(game);
    startHand(game);
}

function publicState(game) {
    return {
        id: game.id,
        players: occupiedSeats(game).map(seat => {
            const p = getPlayerAtSeat(game, seat);
            return { id: p.id, chips: p.chips, status: p.status, seat };
        }),
        pot: game.pot,
        communityCards: game.communityCards,
        phase: game.phase,
        actingPlayerId: game.actingSeat != null ? getPlayerAtSeat(game, game.actingSeat)?.id ?? null : null,
        actingSeat: game.actingSeat,
        buttonSeat: game.buttonSeat
    };
}

module.exports = {
    GamePhase,
    PlayerStatus,
    createGame,
    getGame,
    getUserPrivateInfo,
    joinGame,
    bet,
    call,
    fold,
    publicState
};

