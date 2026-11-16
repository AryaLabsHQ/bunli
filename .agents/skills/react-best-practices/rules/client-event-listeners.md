---
title: Deduplicate Global Event Listeners
impact: LOW
impactDescription: single listener for N components
tags: client, event-listeners, subscription
---

## Deduplicate Global Event Listeners

Share one global event listener across component instances with a module-level registry instead of
registering in every `useEffect`.

**Incorrect (N instances = N listeners):**

```tsx
function useKeyboardShortcut(key: string, callback: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === key) {
        callback();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback]);
}
```

When using the `useKeyboardShortcut` hook multiple times, each instance will register a new
listener.

**Correct (N instances = 1 listener):**

```tsx
const keyCallbacks = new Map<string, Set<() => void>>();
let listenerAttached = false;

function ensureKeydownListener() {
  if (listenerAttached) return;
  listenerAttached = true;
  window.addEventListener("keydown", (e) => {
    if (!e.metaKey || !keyCallbacks.has(e.key)) return;
    keyCallbacks.get(e.key)!.forEach((cb) => cb());
  });
}

function useKeyboardShortcut(key: string, callback: () => void) {
  useEffect(() => {
    ensureKeydownListener();
    if (!keyCallbacks.has(key)) {
      keyCallbacks.set(key, new Set());
    }
    keyCallbacks.get(key)!.add(callback);
    return () => {
      const set = keyCallbacks.get(key);
      if (!set) return;
      set.delete(callback);
      if (set.size === 0) {
        keyCallbacks.delete(key);
      }
    };
  }, [key, callback]);
}
```

Multiple shortcut hooks share one `keydown` listener on `window`.
