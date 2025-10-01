const express = require('express');
const app = express();

// Global exception handling
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    console.error('Error Stack:', err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
    console.error('Promise:', promise);
    process.exit(1);
});

// Signal handling
process.on('SIGTERM', () => {
    console.log('Received SIGTERM signal, shutting down server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT signal, shutting down server...');
    process.exit(0);
});

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Middleware: Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Middleware: Error handling
app.use((err, req, res, next) => {
    console.error('Route Error:', err);
    console.error('Error Stack:', err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const gameRoutes = require('./routes/game');

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use('/game', gameRoutes);

// Start server
const server = app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

// Server error handling
server.on('error', (err) => {
    console.error('Server Error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error('Port 3000 is already in use');
        process.exit(1);
    }
});