global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  offscreen: {
    hasDocument: jest.fn(),
    closeDocument: jest.fn()
  }
};
