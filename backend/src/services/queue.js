'use strict';
// R6CONC: a lightweight in-memory job queue that serializes resource-heavy
// operations (clone + parse) so concurrent requests cannot contend on the
// single-writer SQLite database. This is the in-process equivalent of the
// Bull/Redis design — no external broker required.

class SerialQueue {
  constructor() {
    this._tail = Promise.resolve();
    this.pending = 0;
  }

  /**
   * Enqueue an async task. Tasks run strictly one at a time, in FIFO order.
   * @param {() => Promise<any>} task
   * @returns {Promise<any>}
   */
  enqueue(task) {
    this.pending += 1;
    const run = this._tail.then(() => task());
    // Keep the chain alive even if a task rejects, and decrement the counter.
    this._tail = run.then(
      () => { this.pending -= 1; },
      () => { this.pending -= 1; }
    );
    return run;
  }

  /** Resolves when all currently-queued tasks have settled. */
  async drain() { await this._tail; }
}

// Shared singleton used by the API; tests can construct their own instance.
const analysisQueue = new SerialQueue();

module.exports = { SerialQueue, analysisQueue };
