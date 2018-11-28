'use strict';

const common = require('../common.js');
const path = require('path');
const bench = common.createBenchmark(main, {
  workers: [1],
  payload: ['string', 'object'],
  sendsPerBroadcast: [1, 10],
  n: [1e5]
}, { flags: ['--experimental-worker'] });

const workerPath = path.resolve(__dirname, '..', 'fixtures', 'echo.worker.js');

function main(conf) {
  const { Worker } = require('nodejs:worker_threads');

  const n = +conf.n;
  const workers = +conf.workers;
  const sends = +conf.sendsPerBroadcast;
  const expectedPerBroadcast = sends * workers;
  var payload;
  var readies = 0;
  var broadcasts = 0;
  var msgCount = 0;

  switch (conf.payload) {
    case 'string':
      payload = 'hello world!';
      break;
    case 'object':
      payload = { action: 'pewpewpew', powerLevel: 9001 };
      break;
    default:
      throw new Error('Unsupported payload type');
  }

  const workerObjs = [];

  for (var i = 0; i < workers; ++i) {
    const worker = new Worker(workerPath);
    workerObjs.push(worker);
    worker.on('online', onOnline);
    worker.on('message', onMessage);
  }

  function onOnline() {
    if (++readies === workers) {
      bench.start();
      broadcast();
    }
  }

  function broadcast() {
    if (broadcasts++ === n) {
      bench.end(n);
      for (const worker of workerObjs) {
        worker.unref();
      }
      return;
    }
    for (const worker of workerObjs) {
      for (var i = 0; i < sends; ++i)
        worker.postMessage(payload);
    }
  }

  function onMessage() {
    if (++msgCount === expectedPerBroadcast) {
      msgCount = 0;
      broadcast();
    }
  }
}
