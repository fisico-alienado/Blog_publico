let io

module.exports = {
  init: httpServer => {
    io = require('socket.io')(httpServer, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "DELETE"]
      }
    })
    return io
  },
  // Para utilizar 'io' una vez inicializado con init() en app.js
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!')
    }
    return io
  }
}