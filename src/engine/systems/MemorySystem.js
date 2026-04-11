export class MemorySystem {
  constructor(maxSize = 200) {
    this.entries = [];
    this.maxSize = maxSize;
  }

  store(entry) {
    this.entries.push({
      ...entry,
      weight: entry.weight ?? 1,
      time: entry.time ?? Date.now()
    });

    if (this.entries.length > this.maxSize) {
      this.entries.shift();
    }
  }

  recall(count = 5) {
    const now = Date.now();

    const weighted = this.entries.map((entry) => {
      const ageMs = Math.max(0, now - entry.time);
      const decay = Math.exp(-ageMs / 120000);

      return {
        ...entry,
        score: (entry.weight ?? 1) * decay
      };
    });

    weighted.sort((a, b) => b.score - a.score);
    return weighted.slice(0, count);
  }

  getRecent(count = 10) {
    return this.entries.slice(-count);
  }

  search(keyword) {
    const lower = String(keyword || '').toLowerCase();

    return this.entries.filter((entry) => {
      return (
        String(entry.text || '').toLowerCase().includes(lower) ||
        String(entry.thought || '').toLowerCase().includes(lower)
      );
    });
  }

  boost(index, amount = 0.5) {
    if (this.entries[index]) {
      this.entries[index].weight = (this.entries[index].weight ?? 1) + amount;
    }
  }

  clear() {
    this.entries = [];
  }
}