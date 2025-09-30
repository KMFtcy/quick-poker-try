const express = require('express');
const app = express();
const gameRoutes = require('./routes/game');

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use('/game', gameRoutes);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});