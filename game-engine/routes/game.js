var express = require('express');
var router = express.Router();
var gameModel = require('../game/game');

router.get('/', function(req, res, next) {
    res.json({ ok: true, message: 'game route alive' });
});

router.post('/create/:userId', function(req, res, next) {
    try {
        var game = gameModel.createGame();
        gameModel.joinGame(game.id, req.params.userId);
        res.json({ ok: true, gameId: game.id, state: gameModel.publicState(game) });
    } catch (e) {
        res.status(400).json({ ok: false, error: String(e.message || e) });
    }
});

router.post('/join/:gameId/:userId', function(req, res, next) {
    try {
        var game = gameModel.joinGame(req.params.gameId, req.params.userId);
        res.json({ ok: true, state: gameModel.publicState(game) });
    } catch (e) {
        res.status(400).json({ ok: false, error: String(e.message || e) });
    }
});

router.get('/:gameId', function(req, res, next) {
    var game = gameModel.getGame(req.params.gameId);
    if (!game) return res.status(404).json({ ok: false, error: 'GAME_NOT_FOUND' });
    res.json({ ok: true, state: gameModel.publicState(game) });
    console.log('get gameId: ' + req.params.gameId);
});

router.get('/:gameId/:userId', function(req, res, next) {
    var userInfo = gameModel.getUserPrivateInfo(req.params.gameId, req.params.userId);
    if (!userInfo) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
    res.json({ ok: true, state: userInfo });
    console.log('get gameId: ' + req.params.gameId + ' userId: ' + req.params.userId);
});

router.post('/:gameId/bet/:userId/:betAmount', function(req, res, next) {
    try {
        var game = gameModel.bet(req.params.gameId, req.params.userId, Number(req.params.betAmount));
        res.json({ ok: true, state: gameModel.publicState(game) });
    } catch (e) {
        res.status(400).json({ ok: false, error: String(e.message || e) });
    }
});

router.post('/:gameId/call/:userId', function(req, res, next) {
    try {
        var game = gameModel.call(req.params.gameId, req.params.userId);
        res.json({ ok: true, state: gameModel.publicState(game) });
    } catch (e) {
        res.status(400).json({ ok: false, error: String(e.message || e) });
    }
});

router.post('/:gameId/fold/:userId', function(req, res, next) {
    try {
        var game = gameModel.fold(req.params.gameId, req.params.userId);
        res.json({ ok: true, state: gameModel.publicState(game) });
    } catch (e) {
        res.status(400).json({ ok: false, error: String(e.message || e) });
    }
});

module.exports = router;