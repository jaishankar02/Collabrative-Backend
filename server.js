require('dotenv').config();
const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const ACTIONS = require('./Action');
const Room = require('./model.js'); // Import the Room model
const app = express();
const cors = require('cors');
app.use(express.json()); // Middleware to parse JSON
const DB_connect = require('./DB_config.js');
const server = http.createServer(app);
const io = new Server(server);
const userSocketMap = {};

// MongoDB connection URL
const mongoURI = process.env.DB_URL;

// Connect to MongoDB
DB_connect(mongoURI);

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Helper function to get all connected clients in a room
function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => ({
        socketId,
        username: userSocketMap[socketId],
    }));
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on(ACTIONS.JOIN, async ({ roomId, username, password }) => {
        userSocketMap[socket.id] = username;

        // Check if the room exists in the database
        let room = await Room.findOne({ roomId });
        if (!room) {
            return socket.emit(ACTIONS.ERROR, { message: 'Room does not exist.' });
        }

        // Authenticate with the room password
        if (room.password !== password) {
            return socket.emit(ACTIONS.ERROR, { message: 'Incorrect room password.' });
        }

        // Join the room and notify other clients
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        const username = userSocketMap[socket.id];
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code, username });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        const username = userSocketMap[socket.id];
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code, username });
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

// Endpoint to create a new room
app.post('/create-room', async (req, res) => {
    const { roomId, password } = req.body;
    console.log(req.body)
    try {
        const roomExists = await Room.findOne({ roomId });
        if (roomExists) {
            return res.status(400).json({ message: 'Room ID already exists. Choose a different one.' });
        }
        const newRoom = new Room({
            roomId,
            password
        });
        newRoom.save();
        res.status(201).json({ message: 'Room created successfully', room: newRoom });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create room', error });
    }
});

// Endpoint to join an existing room
app.post('/join-room', async (req, res) => {
    const { roomId, password } = req.body;
    console.log(req.body);
    try {
        const room = await Room.findOne({ roomId });
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (room.password !== password) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        res.status(200).json({ message: 'Room joined successfully', roomId });
    } catch (error) {
        res.status(500).json({ message: 'Failed to join room', error });
    }
});

// Start the server
server.listen(process.env.PORT, () => {
    console.log('Server started on port 8000');
});
