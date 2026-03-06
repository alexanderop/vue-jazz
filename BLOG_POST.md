# Building a Real-Time Chat App with Jazz and Vue 3

You know the drill: you want to build a collaborative app — real-time updates, user accounts, permissions, syncing across devices. Normally that means setting up a backend, designing an API, managing WebSockets, handling conflicts, and writing a lot of glue code.

What if you could skip all of that?

**Jazz** is a framework that makes collaborative, real-time apps feel like you're just working with local state. No backend. No API layer. No WebSocket plumbing. In this post, we'll build a real-time chat app with Jazz and Vue 3 from scratch.

---

## What is Jazz?

Jazz is a **local-first sync engine**. Here's what that means:

1. **Data lives on the client.** When you create or modify data, it's written to local storage instantly — sub-millisecond latency, works offline.
2. **Changes sync automatically.** Jazz connects to a cloud relay via WebSocket and syncs your local changes to every other connected client in real-time.
3. **Conflicts resolve themselves.** Jazz uses CRDTs under the hood, so when two users edit the same data simultaneously, changes merge automatically.

### What Are CRDTs?

CRDT stands for **Conflict-free Replicated Data Type**. To understand why they matter, let's look at the problem they solve.

**The classic conflict problem:** Alice and Bob are both editing a shared document. Alice changes the title to "Project Alpha." At the same time, Bob changes it to "Project Beta." When their changes sync — who wins?

Traditional databases handle this with **Last Write Wins (LWW)**: whoever's change arrives at the server last overwrites the other. Simple, but destructive — Alice's edit silently disappears. You can add timestamps, but clocks across devices are unreliable. You can add version numbers, but then you need to build conflict resolution UI ("Bob's change conflicts with yours — which do you want to keep?").

**How CRDTs solve this:** CRDTs are data structures mathematically designed so that any two copies can always be merged into the same result, regardless of the order updates arrive. They use **logical clocks** (not wall clocks) to track causality — not _what time_ something happened, but _what order_ things happened relative to each other. This means:

- If Alice changes the title and Bob changes the description, both changes merge cleanly — no conflict.
- If both change the same field, Jazz uses a deterministic tie-breaking rule (based on the logical clock and session ID), so every client converges to the same result without coordination.
- For lists (like our chat messages), both additions are preserved — Alice's message and Bob's message both appear, in a consistent order on every device.

**Different CoValue types use different CRDT strategies:**

| CoValue          | Conflict Strategy                                 |
| ---------------- | ------------------------------------------------- |
| `co.map()`       | Last-writer-wins per field (using logical clocks) |
| `co.list()`      | All insertions preserved, consistent ordering     |
| `co.plainText()` | Character-level merging (like Google Docs)        |

The key insight: **you never think about conflicts**. Jazz picks the right CRDT strategy for each data type. You just read and write data, and every client converges to the same state automatically.

### What Does "Local-First" Feel Like?

In a traditional app, clicking "send" triggers an API call, you show a spinner, handle network errors, and update the UI on success. With Jazz, clicking "send" updates the UI **instantly** because the data is written locally first. If the user is offline, the message still appears in their chat — it syncs to other clients when connectivity returns. There's no loading state, no error handling for network failures, and no server that can go down.

The result? You write code as if you're mutating local JavaScript objects, and Jazz handles persistence, sync, auth, permissions, and encryption for you.

### Core Concepts

| Concept        | What it is                                                                |
| -------------- | ------------------------------------------------------------------------- |
| **CoValues**   | Collaborative data structures (maps, lists, text) that sync automatically |
| **Groups**     | Permission containers — define who can read or write specific data        |
| **Accounts**   | User identities with a profile and personal data root                     |
| **SyncConfig** | Tells Jazz where and when to sync (cloud relay URL)                       |

Jazz ships with framework bindings for React, Vue, Svelte, and React Native. We'll use the Vue integration: `community-jazz-vue`.

### How Jazz Syncs Data

```
  CLIENT A                                          CLIENT B
  +-----------------------+          +-----------------------+
  |  Vue App              |          |  Vue App              |
  |  +------------------+ |          | +------------------+  |
  |  | useCoState()     | |          | | useCoState()     |  |
  |  | Reactive CoValue | |          | | Reactive CoValue |  |
  |  +--------+---------+ |          | +--------+---------+  |
  |           |            |          |          ^            |
  |     1. Mutate          |          |     5. Re-render      |
  |           |            |          |          |            |
  |           v            |          |          |            |
  |  +------------------+ |          | +------------------+  |
  |  |   Jazz Engine    | |          | |   Jazz Engine    |  |
  |  |  (CRDT merge)    | |          | |  (CRDT merge)    |  |
  |  +--------+---------+ |          | +--------+---------+  |
  |           |            |          |          ^            |
  |  2. Persist locally    |          |  4. Apply update      |
  |           |            |          |          |            |
  |           v            |          |          |            |
  |  +------------------+ |          | +------------------+  |
  |  |   IndexedDB      | |          | |   IndexedDB      |  |
  |  | (local-first!)   | |          | | (local-first!)   |  |
  |  +------------------+ |          | +------------------+  |
  +-----------+------------+          +----------+------------+
              |                                  ^
              | 3. Sync via WebSocket            | WebSocket
              |                                  |
              v                                  |
        +-----+----------------------------------+------+
        |            Jazz Cloud Relay                    |
        |         +------------------------+            |
        |         |  Message Router ONLY   |            |
        |         |  * No data storage *   |            |
        |         |  Routes sync messages  |            |
        |         |  between peers         |            |
        |         +------------------------+            |
        +-----------------------------------------------+
```

1. Client A mutates a CoValue (instant local update)
2. Change persists to IndexedDB (offline-capable)
3. Sync message sent via WebSocket to Cloud Relay
4. Relay routes message to Client B
5. Client B's Jazz Engine merges via CRDT, Vue re-renders

The cloud relay is **just a router** — it coordinates sync between peers but your data lives on clients. If Client B is offline when Client A sends a message, the relay buffers it until Client B reconnects. When both clients are online, sync is instant.

---

## What We're Building

A chat app where:

- Users sign in with passkeys (no passwords)
- Each user gets a chat room on first login
- Anyone with the chat URL can join and send messages
- Messages sync in real-time across all connected clients

Here's the full source: the app is ~150 lines of actual code across 5 files.

### The User Journey

```
                    +------------------+
                    |  User visits /   |
                    +--------+---------+
                             |
                             v
                  +---------------------+
                  | PasskeyAuthBasicUI  |
                  +----------+----------+
                             |
                             v
                    /------------------\
                   / Authenticated?     \
                   \                    /
                    \--------+---------/
                     |               |
                    No              Yes
                     |               |
                     v               |
            +----------------+       |
            | Show Login /   |       |
            | Signup Form    |       |
            +-------+--------+       |
                    |                |
                    v                |
            +----------------+       |
            | User signs up  |       |
            | with Passkey   |       |
            +-------+--------+       |
                    |                |
                    +-------+--------+
                            |
                            v
                   +----------------+
                   | HomeView Loads |
                   +-------+--------+
                           |
                           v
                  /------------------\
                 / User has existing  \
                 \ chat?              /
                  \--------+---------/
                   |               |
                  Yes              No
                   |               |
                   |               v
                   |    +--------------------+
                   |    | Create Group       |
                   |    | (everyone=writer)  |
                   |    +---------+----------+
                   |              |
                   |              v
                   |    +--------------------+
                   |    | Create Chat        |
                   |    | Save to account    |
                   |    +---------+----------+
                   |              |
                   +------+-------+
                          |
                          v
               +---------------------+
               | Redirect to         |
               | /chat/:chatId       |
               +----------+----------+
                          |
                          v
               +---------------------+
               | ChatView: subscribe |
               | to messages via     |
               | useCoState          |
               +----------+----------+
                          |
                          v
               +---------------------+
               | User sends message  |
               | $jazz.push() syncs  |
               | to all clients      |
               +---------------------+
```

---

## Project Setup

We used **pnpm** and the official **Vue CLI** (`create-vue`) to scaffold the project. `create-vue` sets up Vue 3 with Vite, TypeScript, and Vue Router out of the box — exactly what we need.

```bash
pnpm create vue@latest vue-jazz-chat
```

When prompted, select **TypeScript** and **Vue Router**. Then install the Jazz packages:

```bash
cd vue-jazz-chat
pnpm install jazz-tools community-jazz-vue
```

You'll need a Jazz Cloud API key. Create a `.env` file:

```
VITE_JAZZ_KEY=your-key-here
```

For local development, you can use any email as the key (e.g., `you@example.com`). For production, register at [jazz.tools](https://jazz.tools) to get a proper API key.

We also need **Tailwind CSS** for styling. Install it and add the Vite plugin:

```bash
pnpm install tailwindcss @tailwindcss/vite
```

Add it to your `vite.config.ts`:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
})
```

Create `src/assets/main.css`:

```css
@import 'tailwindcss';
```

And update `src/main.ts` to mount `RootApp` (instead of the default `App`) and import the CSS:

```typescript
// src/main.ts
import './assets/main.css'
import { createApp } from 'vue'
import RootApp from './RootApp.vue'
import router from './router'

const app = createApp(RootApp)
app.use(router)
app.mount('#app')
```

> **Why pnpm?** It's faster and more disk-efficient than npm, with strict dependency resolution that avoids phantom dependencies. Any package manager works, but pnpm is what we used for this project.

---

## Step 1: Define Your Schema

Jazz schemas define your data model using the `co` builder. Think of it as a type-safe, collaborative version of defining your database tables — except there's no database to manage.

```typescript
// src/schema.ts
import { co } from 'jazz-tools'

export const Message = co.map({
  text: co.plainText(),
  image: co.optional(co.image()),
})

export const Chat = co.list(Message)

export const ChatAccountRoot = co.map({
  chats: co.list(Chat),
})

export const ChatAccount = co
  .account({
    profile: co.profile(),
    root: ChatAccountRoot,
  })
  .withMigration((account) => {
    if (!account.root) {
      account.$jazz.set('root', { chats: [] })
    }
  })
```

Here's how the schemas relate:

```
┌─────────────────────────────────────────────────────────────┐
│                       ChatAccount                           │
│  ┌─────────────┐  ┌─────────────────────────────────────┐   │
│  │   profile    │  │             root                    │   │
│  │ (co.profile) │  │        (ChatAccountRoot)            │   │
│  └─────────────┘  └──────────────┬──────────────────────┘   │
└──────────────────────────────────┼──────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │     ChatAccountRoot      │
                    │   chats: CoList<Chat>    │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │  Chat[0] │ │  Chat[1] │ │  Chat[n] │
              │ CoList of│ │ CoList of│ │ CoList of│
              │ Message  │ │ Message  │ │ Message  │
              └────┬─────┘ └──────────┘ └──────────┘
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
     ┌─────────┐┌─────────┐┌─────────┐
     │Message 0││Message 1││Message n│
     │─────────││─────────││─────────│
     │text:    ││text:    ││text:    │
     │ plainTxt││ plainTxt││ plainTxt│
     │image?:  ││image?:  ││image?:  │
     │ co.image││ co.image││ co.image│
     └─────────┘└─────────┘└─────────┘

  OWNERSHIP & PERMISSIONS

   ChatAccount ──owns──▶ Group
                           │  members:
                           │    "everyone" = writer
                           └──owns──▶ Chat (read/write via Group)
```

A few things to notice:

- **`co.plainText()`** isn't just a string — it's a CRDT-aware text type that tracks edit history. You can ask _who_ wrote each piece of text and _when_. We use it here instead of a plain string so we get author attribution on each message for free.
- **`co.list(Message)`** creates a collaborative list. When one client pushes a message, every other client sees it instantly.
- **`co.optional(co.image())`** — We've included an optional image field for future extensibility (e.g., sending photos), but we won't use it in this tutorial.
- **`ChatAccount`** defines our user schema with a `profile` and a `root` (personal data store). The `.withMigration()` hook runs every time the account loads — Jazz checks whether `root` exists; if not (first login), it initializes the data structure. You can add more migration logic here as your schema evolves.
- **`$jazz.set()`** is how you mutate Jazz data inside migrations. We'll see the `$jazz` API throughout the app.

---

## Step 2: Wire Up the Provider

Jazz needs a provider at the root of your app to establish the sync connection and authentication context.

```vue
<!-- src/RootApp.vue -->
<script setup lang="ts">
import { JazzVueProvider, PasskeyAuthBasicUI } from 'community-jazz-vue'
import type { SyncConfig } from 'jazz-tools'
import { h } from 'vue'
import 'jazz-tools/inspector/register-custom-element'
import App from './App.vue'
import { ChatAccount } from './schema'

const peer = `wss://cloud.jazz.tools/?key=${import.meta.env.VITE_JAZZ_KEY}`
const sync: SyncConfig = { peer }
</script>

<template>
  <JazzVueProvider :sync="sync" :AccountSchema="ChatAccount">
    <PasskeyAuthBasicUI appName="Jazz Vue Chat">
      <App />
    </PasskeyAuthBasicUI>
    <component
      :is="
        h('jazz-inspector', {
          style: { position: 'fixed', left: '20px', bottom: '20px', zIndex: 9999 },
        })
      "
    />
  </JazzVueProvider>
</template>
```

Three layers here:

1. **`JazzVueProvider`** — Connects to the Jazz Cloud relay and provides the Jazz context (current user, sync state) to the entire component tree via Vue's provide/inject.
2. **`PasskeyAuthBasicUI`** — A built-in component that handles sign-up and login with [passkeys](https://passkeys.dev). Passkeys are a modern authentication standard built into browsers and operating systems — they use your device's biometric sensor (fingerprint, Face ID) or PIN to create a cryptographic key pair. No passwords to remember or leak, no OAuth providers to configure. When the user is signed in, it renders the slot content (your app). When signed out, it shows a login form.
3. **`jazz-inspector`** — A dev tool that shows you the current data state, sync status, and peer connections. Remove it in production.

The `:AccountSchema="ChatAccount"` prop tells Jazz to use our custom account schema with the `chats` list.

### The Component Tree

```
┌─────────────────────────────────────────────────────────────────────┐
│  RootApp.vue                                                        │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  <JazzVueProvider>                                            │  │
│  │  provides: sync connection, AccountSchema, peer identity      │  │
│  │  ┌───────────────────────────────────────────────────────┐    │  │
│  │  │  <PasskeyAuthBasicUI>                                  │    │  │
│  │  │  provides: auth gate, login/signup UI                  │    │  │
│  │  │  ┌───────────────────────────────────────────────┐     │    │  │
│  │  │  │  App.vue                                      │     │    │  │
│  │  │  │  composables: useAccount, useLogOut           │     │    │  │
│  │  │  │                                               │     │    │  │
│  │  │  │  <router-view>                                │     │    │  │
│  │  │  │  ┌───────────────────────────────────────┐    │     │    │  │
│  │  │  │  │  "/" HomeView                         │    │     │    │  │
│  │  │  │  │  composables: useAccount,             │    │     │    │  │
│  │  │  │  │    useIsAuthenticated                 │    │     │    │  │
│  │  │  │  │  actions: Group.create                │    │     │    │  │
│  │  │  │  ├───────────────────────────────────────┤    │     │    │  │
│  │  │  │  │  "/chat/:id" ChatView                 │    │     │    │  │
│  │  │  │  │  composables: useCoState              │    │     │    │  │
│  │  │  │  │  actions: Message.create, $jazz.push  │    │     │    │  │
│  │  │  │  └───────────────────────────────────────┘    │     │    │  │
│  │  │  └───────────────────────────────────────────────┘     │    │  │
│  │  └───────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

Each layer provides context downward via Vue's provide/inject. Jazz composables (`useAccount`, `useCoState`, etc.) are available anywhere inside the `JazzVueProvider`.

---

## Step 3: Add the App Shell with Logout

The main `App.vue` wraps the router and shows the current user:

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { useAccount, useLogOut } from 'community-jazz-vue'
import { useRouter } from 'vue-router'

const me = useAccount(undefined, { resolve: { profile: true } })
const logOut = useLogOut()
const router = useRouter()

async function logoutHandler() {
  await logOut()
  router.push('/')
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header v-if="me.$isLoaded" class="flex items-center justify-between border-b px-4 py-3">
      <p class="font-semibold">{{ me.profile?.name ?? 'Guest' }}</p>
      <button @click="logoutHandler">Log out</button>
    </header>
    <router-view />
  </div>
</template>
```

Key patterns:

- **`useAccount(undefined, { resolve: { profile: true } })`** returns a reactive reference to the current user. Passing `undefined` means "use the default account type." The `resolve` option tells Jazz which nested data to eagerly fetch — without `resolve: { profile: true }`, the `profile` property would be `undefined` until manually loaded. Jazz data is **lazy by default**; `resolve` is how you opt into eager loading.
- **`me.$isLoaded`** is a Jazz property that indicates whether the data has been fetched. Use it to gate rendering and avoid accessing undefined properties.
- **`useLogOut()`** returns a function that clears credentials and disconnects from sync.

> **`useAccount` with a schema:** In `HomeView.vue` later, you'll see `useAccount(ChatAccount, { resolve: { root: { chats: true } } })`. Passing `ChatAccount` instead of `undefined` gives you access to your custom account fields like `root.chats`, fully typed.

---

## Step 4: Create or Load a Chat

When a user visits the home page, we either redirect them to their existing chat or create a new one:

```vue
<!-- src/views/HomeView.vue -->
<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAccount, useIsAuthenticated } from 'community-jazz-vue'
import { Group } from 'jazz-tools'
import { Chat, ChatAccount } from '../schema'

const router = useRouter()
const me = useAccount(ChatAccount, { resolve: { root: { chats: true } } })
const isAuthenticated = useIsAuthenticated()

let handled = false

const stop = watch(
  [me, isAuthenticated],
  ([currentMe, authenticated]) => {
    if (handled || !currentMe?.$isLoaded || !authenticated) return
    handled = true

    // If user already has a chat, go to it
    const existingChat = currentMe.root?.chats?.[0]
    if (existingChat) {
      queueMicrotask(() => stop?.())
      router.push({ name: 'Chat', params: { chatId: existingChat.$jazz.id } })
      return
    }

    // Otherwise, create a new chat
    const group = Group.create({ owner: currentMe })
    group.addMember('everyone', 'writer')
    const chat = Chat.create([], { owner: group })
    currentMe.root?.chats?.$jazz.push(chat)
    queueMicrotask(() => stop?.())
    router.push({ name: 'Chat', params: { chatId: chat.$jazz.id } })
  },
  { immediate: true },
)
</script>
```

This is where Jazz's permission model shines:

- **`Group.create({ owner: currentMe })`** — Every piece of shared data in Jazz belongs to a Group. Groups define who can access the data.
- **`group.addMember('everyone', 'writer')`** — The magic line. `"everyone"` is a Jazz keyword that represents all authenticated Jazz users (anyone who has signed in via passkeys). This makes the chat writable by any logged-in user — no invite links needed, just share the URL. It does **not** include anonymous or unauthenticated visitors.
- **`Chat.create([], { owner: group })`** — Creates an empty chat list owned by the group.
- **`$jazz.push(chat)`** — Adds the chat to the user's personal chats list. You **must** use `$jazz.push()` instead of the native `Array.push()`. Why? CoLists look like arrays but they aren't plain JavaScript arrays. Every mutation needs to be recorded as an operation that can be replicated to other clients. `$jazz.push()` creates a tracked operation that Jazz can sync; a plain `push()` would bypass the CRDT engine, meaning the change would never reach other clients.
- **`$jazz.id`** — Every Jazz object has a unique ID. We put it in the URL so others can join by visiting the same link.

---

## Step 5: Build the Chat View

This is where real-time collaboration happens:

```vue
<!-- src/views/ChatView.vue -->
<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import { useCoState } from 'community-jazz-vue'
import { co, type ID, type Loaded, type MaybeLoaded } from 'jazz-tools'
import { Chat, Message } from '../schema'

const props = defineProps<{ chatId: ID<typeof Chat> }>()

const chat = useCoState(Chat, () => props.chatId, {
  resolve: { $each: true },
})

const showNLastMessages = ref(30)

const displayedMessages = computed(() => {
  const c = chat.value
  if (!c?.$isLoaded) return []
  return c
    .slice(-showNLastMessages.value)
    .toReversed()
    .map((msg: Loaded<typeof Message> | undefined) => {
      const edit = msg?.$jazz?.getEdits?.()?.text
      return {
        msg,
        by: (edit?.by?.profile as { name?: string } | undefined)?.name ?? 'Unknown',
        time: edit?.madeAt?.toLocaleTimeString() ?? '',
      }
    })
})

const inputValue = ref('')

function sendMessage() {
  const c = chat.value
  if (!inputValue.value.trim() || !c?.$isLoaded) return

  c.$jazz.push(
    Message.create({ text: co.plainText().create(inputValue.value, c.$jazz.owner) }, c.$jazz.owner),
  )
  inputValue.value = ''
}
</script>

<template>
  <div v-if="chat.$isLoaded" class="flex flex-1 flex-col">
    <div class="flex flex-1 flex-col-reverse gap-2 overflow-y-auto p-4">
      <div
        v-for="{ msg, by, time } in displayedMessages"
        :key="msg?.$jazz.id"
        class="rounded-lg bg-neutral-100 px-4 py-3"
      >
        <p>{{ msg?.text }}</p>
        <small>{{ by }} &mdash; {{ time }}</small>
      </div>
      <p v-if="chat.length === 0" class="text-center text-neutral-400">
        No messages yet. Say something!
      </p>
    </div>

    <div class="flex gap-2 border-t px-4 py-3">
      <input
        v-model="inputValue"
        placeholder="Type a message and press Enter"
        maxlength="2048"
        @keydown.enter.prevent="sendMessage"
      />
      <button @click="sendMessage">Send</button>
    </div>
  </div>
</template>
```

Let's break down the Jazz-specific parts:

### Loading the chat

```typescript
const chat = useCoState(Chat, () => props.chatId, {
  resolve: { $each: true },
})
```

`useCoState` is the core composable for loading Jazz data in Vue. It:

1. Takes a schema (`Chat`), an ID (from the URL), and resolve options
2. Subscribes to the chat and all its messages (`$each: true`)
3. Returns a reactive ref that updates whenever _any_ client pushes a new message
4. Automatically unsubscribes when the component unmounts

The `() => props.chatId` getter ensures the subscription updates if the route changes.

The `resolve: { $each: true }` option is key here. Jazz data is **lazy by default** — if you load a `Chat` without `resolve`, you'd get the list but each `Message` inside would be unloaded. The `$each` keyword means "eagerly resolve every item in the list." You can nest resolve options as deep as you need: `{ $each: { author: true } }` would also load each message's author.

### Reading edit history

```typescript
const edit = msg?.$jazz?.getEdits?.()?.text
```

Because we used `co.plainText()` in our schema, Jazz tracks the full edit history. `getEdits()` returns metadata about each field — who made the edit (`edit.by`), when (`edit.madeAt`), and from which device. This is how we show "Alice — 3:42 PM" under each message without storing that metadata ourselves.

### Sending a message

```typescript
c.$jazz.push(
  Message.create({ text: co.plainText().create(inputValue.value, c.$jazz.owner) }, c.$jazz.owner),
)
```

Breaking this inside-out:

1. **`co.plainText().create(text, owner)`** — Creates a collaborative text value owned by the chat's group
2. **`Message.create({ text }, owner)`** — Creates a Message CoMap with that text
3. **`c.$jazz.push(message)`** — Appends to the chat list

The moment you call `$jazz.push()`:

- The message appears locally (instant)
- Jazz syncs it to the cloud relay
- Every other connected client receives it and re-renders

No WebSocket code. No event handlers. No state management library. Just push and it syncs.

---

## Step 6: Set Up Routes

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'Home', component: HomeView },
    {
      path: '/chat/:chatId',
      name: 'Chat',
      component: () => import('../views/ChatView.vue'),
      props: true,
    },
  ],
})

export default router
```

The `props: true` on the Chat route passes `chatId` as a component prop, which becomes the Jazz CoValue ID.

---

## Understanding Jazz Permissions

Permissions are one of Jazz's strongest features — and they work very differently from traditional backends. There are no middleware checks, no API guards, no database-level row policies. Instead, **permissions are built into the data itself**.

### Groups: The Foundation

Every CoValue in Jazz is owned by a **Group**. A Group is a container that defines who can access its data. Think of it like a shared folder — anything inside the folder inherits its access rules.

```typescript
const group = Group.create({ owner: currentMe })
```

The user who creates the Group is automatically an `admin`.

### Roles

Groups support four roles, each building on the previous:

| Role      | Can Read | Can Write | Can Manage Members | Can Admin |
| --------- | -------- | --------- | ------------------ | --------- |
| `reader`  | Yes      | —         | —                  | —         |
| `writer`  | Yes      | Yes       | —                  | —         |
| `admin`   | Yes      | Yes       | Yes                | Yes       |
| `manager` | Yes      | Yes       | Yes                | Yes       |

### Adding Members

You can add members in three ways:

```typescript
// 1. Add a specific user
group.addMember(bobsAccount, 'writer')

// 2. Add ALL authenticated Jazz users
group.addMember('everyone', 'writer')

// 3. Create an invite link (generates a secret URL)
const inviteLink = group.$jazz.createInvite('writer')
```

The `"everyone"` keyword is special — it means any user who has signed in via any Jazz-enabled app. It does **not** include anonymous visitors.

### How Our Chat Uses Permissions

In our chat app, the flow is:

```typescript
const group = Group.create({ owner: currentMe }) // You're the admin
group.addMember('everyone', 'writer') // Anyone can write
const chat = Chat.create([], { owner: group }) // Chat inherits group permissions
```

Because the Chat is owned by the Group, its permissions are automatically enforced:

- Any authenticated user can read and write messages
- The creator is the admin and could revoke access if needed
- No server-side check is needed — Jazz enforces this cryptographically

### Sharing via URL

The chat URL contains the Jazz CoValue ID: `/chat/co_z21k9Fpn7P6hbWDppAnvFWd2m2N`. Because the Group has `everyone` as a writer, anyone who opens that URL and is logged in can immediately read and send messages. No invite flow, no backend endpoint — just share the link.

### Other Permission Patterns

For apps that need tighter control:

```typescript
// Public read, private write (like a blog)
group.addMember('everyone', 'reader')

// Team-only access (only invited members)
group.addMember(aliceAccount, 'writer')
group.addMember(bobAccount, 'reader')

// Shorthand for making a group publicly readable
group.makePublic() // same as addMember('everyone', 'reader')

// Remove access
group.removeMember(bobAccount)
```

The key insight: **permissions travel with the data**. When a CoValue syncs to another client, the Group membership is checked client-side using cryptographic keys. There's no central authority — it's enforced by the protocol itself.

---

## The $jazz API Cheat Sheet

Every Jazz CoValue has a `$jazz` property for mutations and introspection:

| Method                  | Description                          |
| ----------------------- | ------------------------------------ |
| `$jazz.set(key, value)` | Set a field on a CoMap               |
| `$jazz.push(item)`      | Append to a CoList                   |
| `$jazz.remove(index)`   | Remove from a CoList                 |
| `$jazz.id`              | Unique ID of the CoValue             |
| `$jazz.owner`           | Group or Account that owns this data |
| `getEdits()`            | Edit history (who, when, what)       |
| `$isLoaded`             | Whether the data has been fetched    |

The rule is simple: **never mutate Jazz objects directly** (no `array.push()`, no `obj.field = value`). Always go through `$jazz`.

---

## Jazz vs. Traditional Architecture

|                 | Traditional                     | Jazz                  |
| --------------- | ------------------------------- | --------------------- |
| **Backend**     | Express/Django/Rails + database | None                  |
| **API**         | REST/GraphQL endpoints          | Direct CoValue access |
| **Real-time**   | WebSocket server + client code  | Built-in              |
| **Auth**        | Passport/NextAuth/custom        | Passkeys, built-in    |
| **Permissions** | Middleware + DB queries         | Groups with roles     |
| **Offline**     | Service workers + sync logic    | Native                |
| **Conflicts**   | Manual merge or last-write-wins | CRDT auto-merge       |

---

## Wrapping Up

We built a real-time collaborative chat app with:

- **5 source files** (~150 lines of actual code)
- **Zero backend** — no server, no database, no API
- **Real-time sync** — messages appear instantly across clients
- **Passkey auth** — secure, passwordless login
- **URL-based sharing** — share a link, anyone can join

Jazz shifts the paradigm from building client-server architecture to building with **local-first collaborative data**. Your app code stays simple — define a schema, read and write data, and Jazz handles the rest.

The Vue integration (`community-jazz-vue`) makes it feel natural: `useCoState` works like any Vue composable, reactivity is seamless, and the `$jazz` API is consistent and predictable.

If you're building anything collaborative — chat, project management, multiplayer games, shared documents — Jazz is worth a serious look.

### Resources

- [Jazz Documentation](https://jazz.tools/docs)
- [Jazz GitHub](https://github.com/garden-io/jazz)
- [community-jazz-vue package](https://www.npmjs.com/package/community-jazz-vue)
- [Jazz Examples (community-chat-vue)](https://github.com/garden-io/jazz/tree/main/examples/community-chat-vue)
