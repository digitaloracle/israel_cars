const { scheduleOffscreenCleanup, cancelOffscreenCleanup } = require('../utils/offscreen-manager');

beforeEach(() => {
  jest.useFakeTimers();
  cancelOffscreenCleanup(); // reset any leftover timer from previous test
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('cleanup function is called after timeout elapses', async () => {
  const closeFn = jest.fn().mockResolvedValue(undefined);
  scheduleOffscreenCleanup(5000, closeFn);
  jest.advanceTimersByTime(5001);
  await Promise.resolve(); // flush microtasks
  expect(closeFn).toHaveBeenCalledTimes(1);
});

test('cleanup function is not called when cancelled before timeout', () => {
  const closeFn = jest.fn();
  scheduleOffscreenCleanup(5000, closeFn);
  cancelOffscreenCleanup();
  jest.advanceTimersByTime(5001);
  expect(closeFn).not.toHaveBeenCalled();
});

test('rescheduling resets the timer from zero', () => {
  const closeFn = jest.fn();
  scheduleOffscreenCleanup(5000, closeFn);
  jest.advanceTimersByTime(4000); // 4s into first schedule
  scheduleOffscreenCleanup(5000, closeFn); // reschedule
  jest.advanceTimersByTime(2000); // 2s after reschedule — should not fire
  expect(closeFn).not.toHaveBeenCalled();
  jest.advanceTimersByTime(3001); // 5001ms after reschedule — should fire
  expect(closeFn).toHaveBeenCalledTimes(1);
});

test('scheduling twice in a row only fires cleanup once', () => {
  const closeFn = jest.fn();
  scheduleOffscreenCleanup(5000, closeFn);
  scheduleOffscreenCleanup(5000, closeFn); // second call cancels first
  jest.advanceTimersByTime(10001);
  expect(closeFn).toHaveBeenCalledTimes(1);
});
