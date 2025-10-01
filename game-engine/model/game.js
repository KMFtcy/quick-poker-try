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
        // Seats are numbered from 1..maxSeats. A seat holds a Player or is undefined.
        this.maxSeats = 9;
        this.seats = {};
        this.buttonSeat = null; // seat number of the dealer button
        this.smallBlind = 10;
        this.bigBlind = 20;
        this.pot = 0;
        this.communityCards = [];
        this.phase = GamePhase.WAITING;
        this.deck = [];
        this.actingSeat = null; // current acting seat number
        this.minRaise = 20;
        this.lastAggressorSeat = null;
    }
}

module.exports = {
    GamePhase,
    Game
};


