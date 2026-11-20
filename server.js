const { setupWSConnection } = require('y-websocket/bin/utils');
const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 1234;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('y-websocket server running');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req, { gc: true });
});

server.listen(PORT, () => {
  console.log(`y-websocket server listening on ws://localhost:${PORT}`);
});