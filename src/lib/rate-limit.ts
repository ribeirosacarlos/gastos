// Rate limiter em memoria, por processo. Suficiente para o deploy atual
// (instancia unica, app pessoal de 2 usuarios) - nao sobrevive a restart nem
// escala entre multiplas instancias, mas cobre o caso real: travar brute
// force no login sem depender de infraestrutura externa (Redis etc).

interface Bucket {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number | null;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

export function isLocked(key: string): number | null {
  const bucket = buckets.get(key);
  if (!bucket?.lockedUntil) return null;

  if (bucket.lockedUntil <= Date.now()) {
    buckets.delete(key);
    return null;
  }

  return bucket.lockedUntil;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now - bucket.firstFailureAt > WINDOW_MS) {
    bucket = { failures: 0, firstFailureAt: now, lockedUntil: null };
  }

  bucket.failures += 1;
  if (bucket.failures >= MAX_ATTEMPTS) {
    bucket.lockedUntil = now + LOCK_MS;
  }

  buckets.set(key, bucket);
}

export function recordSuccess(key: string): void {
  buckets.delete(key);
}
