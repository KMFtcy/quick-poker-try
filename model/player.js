const PlayerStatus = {
    ACTIVE: 'ACTIVE',
    FOLDED: 'FOLDED',
    OUT: 'OUT',
    PENDING: 'PENDING'
};

class Player {
    constructor(id, chips) {
        this.id = id;
        this.chips = typeof chips === 'number' ? chips : 1000;
        this.status = PlayerStatus.ACTIVE;
        this.holeCards = [];
        this.currentBet = 0;
    }
}

module.exports = {
    Player,
    PlayerStatus
};


