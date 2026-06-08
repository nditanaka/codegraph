'use strict';
const { SerialQueue } = require('../../src/services/queue');

describe('SerialQueue (R6CONC)', () => {
  test('runs tasks strictly one at a time in FIFO order', async () => {
    const q = new SerialQueue();
    const order = [];
    let active = 0; let maxActive = 0;
    const task = (id, ms) => async () => {
      active += 1; maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, ms));
      order.push(id); active -= 1;
    };
    await Promise.all([q.enqueue(task('a', 20)), q.enqueue(task('b', 5)), q.enqueue(task('c', 1))]);
    expect(order).toEqual(['a', 'b', 'c']);
    expect(maxActive).toBe(1); // never more than one running at once
  });

  test('a rejecting task does not break the queue', async () => {
    const q = new SerialQueue();
    await expect(q.enqueue(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(q.enqueue(() => Promise.resolve('ok'))).resolves.toBe('ok');
  });
});
