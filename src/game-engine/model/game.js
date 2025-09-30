const GamePhase = {
    WAITING: 'WAITING',
    PREFLOP: 'PREFLOP',
    FLOP: 'FLOP',
    TURN: 'TURN',
    RIVER: 'RIVER',
    SHOWDOWN: 'SHOWDOWN'
};

class Game {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.buttonIndex = 0;
        this.smallBlind = 10;
        this.bigBlind = 20;
        this.pot = 0;
        this.communityCards = [];
        this.phase = GamePhase.WAITING;
        this.deck = [];
        this.actingIndex = null;
        this.minRaise = 20;
        this.lastAggressorIndex = null;
    }
}

module.exports = {
    GamePhase,
    Game
};


