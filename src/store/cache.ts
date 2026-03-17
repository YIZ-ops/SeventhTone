interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

export function createExpiringMemoryCache<TKey, TValue>(ttlMs: number) {
  const cache = new Map<TKey, CacheEntry<TValue>>();

  return {
    get(key: TKey): TValue | null {
      const entry = cache.get(key);
      if (!entry) return null;
      if (isExpired(entry.expiresAt)) {
        cache.delete(key);
        return null;
      }
      return entry.value;
    },
    set(key: TKey, value: TValue): void {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    clear(): void {
      cache.clear();
    },
  };
}

export function createExpiringStorageCache<TValue>(
  storageKey: string,
  ttlMs: number,
  isValue: (value: unknown) => value is TValue,
) {
  let memoryEntry: CacheEntry<TValue> | null = null;

  function readStoredEntry(): CacheEntry<TValue> | null {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { value?: unknown; expiresAt?: unknown };
      if (!isValue(parsed?.value) || typeof parsed?.expiresAt !== "number") {
        localStorage.removeItem(storageKey);
        return null;
      }
      if (isExpired(parsed.expiresAt)) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return { value: parsed.value, expiresAt: parsed.expiresAt };
    } catch {
      return null;
    }
  }

  return {
    get(): TValue | null {
      if (memoryEntry && !isExpired(memoryEntry.expiresAt)) {
        return memoryEntry.value;
      }

      memoryEntry = readStoredEntry();
      return memoryEntry?.value ?? null;
    },
    set(value: TValue): void {
      const entry = { value, expiresAt: Date.now() + ttlMs };
      memoryEntry = entry;
      try {
        localStorage.setItem(storageKey, JSON.stringify(entry));
      } catch {
        // ignore write failures
      }
    },
    clear(): void {
      memoryEntry = null;
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore remove failures
      }
    },
  };
}
