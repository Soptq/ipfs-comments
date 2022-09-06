class SimpleCache {
  constructor() {
    this.storage = {};
  }

  async cached_get(key, fn) {
    if (key in this.storage) {
      return this.storage[key];
    } else {
      const value = await fn();
      this.set(key, value);
      return value;
    }
  }

  get(key) {
    return this.storage[key];
  }

  set(key, value) {
    this.storage[key] = value;
  }
}

export { SimpleCache };
