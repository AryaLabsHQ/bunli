---
title: Decouple State Management from UI
impact: MEDIUM
impactDescription: enables swapping state implementations without changing UI
tags: composition, state, architecture
---

## Decouple State Management from UI

When a compound family has shared state, keep its storage and synchronization details at the
provider boundary. UI components consume the stable contract rather than importing a specific store
or server-sync hook. For small controlled components, ordinary props can be the simpler boundary.

**Incorrect (UI coupled to state implementation):**

```tsx
function ChannelComposer({ channelId }: { channelId: string }) {
  // UI component knows about global state implementation
  const state = useGlobalChannelState(channelId);
  const { submit, updateInput } = useChannelSync(channelId);

  return (
    <Composer.Frame>
      <Composer.Input value={state.input} onChange={(text) => sync.updateInput(text)} />
      <Composer.Submit onPress={() => sync.submit()} />
    </Composer.Frame>
  );
}
```

**Correct (state management isolated in provider):**

```tsx
// Provider handles all state management details
function ChannelProvider({
  channelId,
  children,
}: {
  channelId: string;
  children: React.ReactNode;
}) {
  const { state, update, submit } = useGlobalChannel(channelId);
  const inputRef = useRef(null);

  return (
    <Composer.Provider state={state} actions={{ update, submit }} meta={{ inputRef }}>
      {children}
    </Composer.Provider>
  );
}

// UI component only knows about the context interface
function ChannelComposer() {
  return (
    <Composer.Frame>
      <Composer.Header />
      <Composer.Input />
      <Composer.Footer>
        <Composer.Submit />
      </Composer.Footer>
    </Composer.Frame>
  );
}

// Usage
function Channel({ channelId }: { channelId: string }) {
  return (
    <ChannelProvider channelId={channelId}>
      <ChannelComposer />
    </ChannelProvider>
  );
}
```

**Different providers, same UI:**

```tsx
// Local state for ephemeral forms
function ForwardMessageProvider({ children }) {
  const [state, setState] = useState(initialState);
  const forwardMessage = useForwardMessage();

  return (
    <Composer.Provider state={state} actions={{ update: setState, submit: forwardMessage }}>
      {children}
    </Composer.Provider>
  );
}

// Global synced state for channels
function ChannelProvider({ channelId, children }) {
  const { state, update, submit } = useGlobalChannel(channelId);

  return (
    <Composer.Provider state={state} actions={{ update, submit }}>
      {children}
    </Composer.Provider>
  );
}
```

The same `Composer.Input` component works with both providers because it only depends on the context
interface, not the implementation.
