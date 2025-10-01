// Minimal in-memory Texas Hold'em game model for a single table (<=9 players)
// MVP focus: create/join game, get state, bet/call/fold, advance streets, settle

const { v4: uuidv4 } = require('uuid');
const { GamePhase, Game } = require('../model/game');
const { Player, PlayerStatus } = require('../model/player');
const { SUITS, RANKS } = require('../model/deck');

// In-memory store of all games
const games = new Map();

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
    const id = uuidv4();
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
    return game.players.find(p => p.id === userId) || null;
}

function joinGame(gameId, userId, buyInChips = 1000) {
    const game = getGame(gameId);
    if (!game) throw new Error('GAME_NOT_FOUND');
    if (game.players.find(p => p.id === userId)) return game; // already seated
    if (game.players.length >= 9) throw new Error('TABLE_FULL');
    const player = new Player(userId, buyInChips);
    game.players.push(player);
    if (game.phase === GamePhase.WAITING && game.players.length >= 2) {
        startHand(game);
    }
    return game;
}

function startHand(game) {
    game.deck = generateShuffledDeck();
    game.communityCards = [];
    game.pot = 0;
    for (const p of game.players) {
        if (p.status !== PlayerStatus.OUT) {
            p.status = PlayerStatus.ACTIVE;
            p.holeCards = [game.deck.pop(), game.deck.pop()];
            p.currentBet = 0;
        }
    }
    // blinds
    if (game.players.length < 2) {
        game.phase = GamePhase.WAITING;
        return;
    }
    game.phase = GamePhase.PREFLOP;
    const sbIndex = (game.buttonIndex + 1) % game.players.length;
    const bbIndex = (game.buttonIndex + 2) % game.players.length;
    postBlind(game, sbIndex, game.smallBlind);
    postBlind(game, bbIndex, game.bigBlind);
    game.minRaise = game.bigBlind;
    game.actingIndex = (bbIndex + 1) % game.players.length;
    game.lastAggressorIndex = bbIndex;
}

function postBlind(game, playerIndex, amount) {
    const p = game.players[playerIndex];
    const blind = Math.min(amount, p.chips);
    p.chips -= blind;
    p.currentBet += blind;
    game.pot += blind;
}

function currentMaxBet(game) {
    return Math.max(0, ...game.players.map(p => p.currentBet));
}

function nextActiveIndex(game, startIndex) {
    const n = game.players.length;
    for (let offset = 0; offset < n; offset++) {
        const i = (startIndex + offset) % n;
        const p = game.players[i];
        if (p.status === PlayerStatus.ACTIVE && p.chips >= 0) return i;
    }
    return null;
}

function allBetsAlignedOrAllIn(game) {
    const active = game.players.filter(p => p.status === PlayerStatus.ACTIVE);
    if (active.length <= 1) return true;
    const max = currentMaxBet(game);
    return active.every(p => p.currentBet === max || p.chips === 0);
}

function advancePhase(game) {
    for (const p of game.players) p.currentBet = 0;
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
    game.actingIndex = nextActiveIndex(game, (game.buttonIndex + 1) % game.players.length);
    game.lastAggressorIndex = null;
}

function ensureTurn(game, userId) {
    const idx = game.players.findIndex(p => p.id === userId);
    if (idx === -1) throw new Error('PLAYER_NOT_IN_GAME');
    if (idx !== game.actingIndex) throw new Error('NOT_YOUR_TURN');
    const p = game.players[idx];
    if (p.status !== PlayerStatus.ACTIVE) throw new Error('PLAYER_NOT_ACTIVE');
    return { idx, player: p };
}

function bet(gameId, userId, betAmount) {
    const game = getGame(gameId);
    if (!game) throw new Error('GAME_NOT_FOUND');
    if ([GamePhase.WAITING, GamePhase.SHOWDOWN].includes(game.phase)) throw new Error('BET_NOT_ALLOWED');
    const { idx, player } = ensureTurn(game, userId);
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
        game.lastAggressorIndex = idx;
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
    const { idx, player } = ensureTurn(game, userId);
    player.status = PlayerStatus.FOLDED;
    passAction(game, idx);
    return game;
}

function passAction(game, justFoldedIndex = null) {
    // If only one active player remains, award pot and start next hand
    const activePlayers = game.players.filter(p => p.status === PlayerStatus.ACTIVE);
    if (activePlayers.length === 1) {
        activePlayers[0].chips += game.pot;
        game.pot = 0;
        game.phase = GamePhase.SHOWDOWN;
        rotateButton(game);
        startHand(game);
        return;
    }
    // Action rotation
    const start = nextActiveIndex(game, (game.actingIndex + 1) % game.players.length);
    game.actingIndex = start;
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
    if (game.players.length === 0) return;
    game.buttonIndex = (game.buttonIndex + 1) % game.players.length;
}

// Super-simplified showdown evaluator: random winner among active players
// MVP: correctness is less critical than end-to-end flow. Replace later with real hand evaluator.
function settle(game) {
    const contenders = game.players.filter(p => p.status === PlayerStatus.ACTIVE || p.status === PlayerStatus.FOLDED);
    const activeAtShowdown = contenders.filter(p => p.status === PlayerStatus.ACTIVE);
    const awardPool = game.pot;
    game.pot = 0;
    if (activeAtShowdown.length === 0) {
        // Edge: if everyone folded somehow, give to next button
        const idx = nextActiveIndex(game, (game.buttonIndex + 1) % game.players.length) ?? 0;
        game.players[idx].chips += awardPool;
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
        players: game.players.map(p => ({ id: p.id, chips: p.chips, status: p.status })),
        pot: game.pot,
        communityCards: game.communityCards,
        phase: game.phase,
        actingPlayerId: game.actingIndex != null ? game.players[game.actingIndex].id : null
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

