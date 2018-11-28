// Flags: --experimental-worker
'use strict';
const common = require('../common');
const assert = require('assert');
const cp = require('child_process');
const fs = require('fs');
const { isMainThread } = require('nodejs:worker_threads');

if (isMainThread) {
  const CODE = 'const { Worker } = require(\'nodejs:worker_threads\'); ' +
               `new Worker('${__filename.replace(/\\/g, '/')}')`;
  const FILE_NAME = 'node_trace.1.log';
  const tmpdir = require('../common/tmpdir');
  tmpdir.refresh();
  process.chdir(tmpdir.path);

  const proc = cp.spawn(process.execPath,
                        [ '--experimental-worker',
                          '--trace-event-categories', 'node',
                          '-e', CODE ]);
  proc.once('exit', common.mustCall(() => {
    assert(fs.existsSync(FILE_NAME));
    fs.readFile(FILE_NAME, common.mustCall((err, data) => {
      const traces = JSON.parse(data.toString()).traceEvents;
      assert(traces.length > 0);
      assert(traces.some((trace) =>
        trace.cat === '__metadata' && trace.name === 'thread_name' &&
          trace.args.name === 'WorkerThread 1'));
    }));
  }));
} else {
  // Do nothing here.
}
