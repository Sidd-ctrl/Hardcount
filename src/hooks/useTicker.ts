const listeners = new Set<(wallNow: number) => void>();
let frame: number | null = null;

function loop(wallNow: number) {
  listeners.forEach((listener) => listener(wallNow));
  frame = requestAnimationFrame(loop);
}

function ensureLoop() {
  if (frame === null) frame = requestAnimationFrame(loop);
}

export function subscribeTick(listener: (wallNow: number) => void): () => void {
  listeners.add(listener);
  ensureLoop();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };
}
