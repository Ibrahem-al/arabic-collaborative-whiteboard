const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const boards = {};

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join-board', (boardId) => {
    socket.join(boardId);
    if (!boards[boardId]) {
      boards[boardId] = {
        objects: [],
      };
    }
    socket.emit('init-state', boards[boardId]);
    console.log(`User joined board: ${boardId}`);
  });

  socket.on('draw-object', ({ boardId, object }) => {
    if (boards[boardId]) {
      // Check if object already exists to avoid duplicates
      const exists = boards[boardId].objects.some(o => o.id === object.id);
      if (!exists) {
        boards[boardId].objects.push(object);
        socket.to(boardId).emit('object-added', object);
      }
    }
  });

  socket.on('move-object', ({ boardId, objectData }) => {
    if (boards[boardId]) {
      const obj = boards[boardId].objects.find(o => o.id === objectData.id);
      if (obj) {
        Object.assign(obj, objectData);
        socket.to(boardId).emit('object-moved', objectData);
      }
    }
  });

  socket.on('clear-board', (boardId) => {
    if (boards[boardId]) {
      boards[boardId].objects = [];
      io.to(boardId).emit('board-cleared');
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
