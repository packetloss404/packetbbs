// WebSocket server for VibeBBS (browser terminal access)
const { WebSocketServer } = require('ws');
const BBSSession = require('../core/bbs');

function createWebSocketServer(httpServer, nodeManager, config) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    const nodeNum = nodeManager.allocateNode(null);
    if (nodeNum === null) {
      ws.send('Sorry, all nodes are busy. Please try again later!\r\n');
      ws.close();
      return;
    }

    const transport = {
      write(data) {
        if (ws.readyState === ws.OPEN) {
          ws.send(data);
        }
      },
      end() {
        ws.close();
      },
    };

    const session = new BBSSession(transport, nodeNum, nodeManager);
    nodeManager.nodes.get(nodeNum).session = session;

    ws.on('message', (data) => {
      const str = data.toString();
      session.handleData(str);
    });

    ws.on('close', () => {
      session.disconnect();
    });

    ws.on('error', () => {
      session.disconnect();
    });

    // Idle timeout via ping/pong
    let alive = true;
    ws.on('pong', () => { alive = true; });

    const interval = setInterval(() => {
      if (!alive) {
        session.disconnect();
        ws.terminate();
        clearInterval(interval);
        return;
      }
      alive = false;
      ws.ping();
    }, config.idleTimeout * 1000);

    ws.on('close', () => clearInterval(interval));
  });

  return wss;
}

module.exports = { createWebSocketServer };
