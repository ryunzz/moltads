const express = require('express');
const router = express.Router();
const { getActivityLog } = require('../lib/state');
const sse = require('../lib/sse');

router.get('/', (req, res) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  };

  res.writeHead(200, headers);
  res.write('\n');

  getActivityLog().forEach((activity) => {
    res.write(`data: ${JSON.stringify(activity)}\n\n`);
  });

  const remove = sse.addClient(res);

  req.on('close', () => {
    remove();
  });
});

module.exports = router;
