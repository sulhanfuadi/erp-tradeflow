const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/p2p/master-data',
  method: 'GET',
  headers: {
    // We need a session cookie. Let's get the purchasingmgr session from db.
  }
};
