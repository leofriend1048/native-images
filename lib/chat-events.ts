// Simple event emitter for cross-component chat list refresh
type Listener = () => void;
const listeners = new Set<Listener>();

export function onChatListChanged(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emitChatListChanged() {
  listeners.forEach((fn) => fn());
}
