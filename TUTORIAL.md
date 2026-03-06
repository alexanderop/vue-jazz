# Building a Real-Time Chat App with Jazz and Vue 3

Jazz is a distributed database that syncs across frontends, containers, and the cloud. It feels like working with reactive local JSON state, but everything syncs instantly between users — no REST APIs, no WebSocket plumbing, no conflict resolution code.

In this tutorial, we'll build a real-time collaborative chat application using Jazz and Vue 3. By the end, you'll have a working chat app with authentication, live sync, and edit history — in under 200 lines of code.

## What You'll Learn

- How to define collaborative data models with Jazz schemas
- How to set up Jazz in a Vue 3 application
- How to use `useCoState` and `useAccount` composables for reactive data
- How to create, mutate, and read collaborative values
- How to handle authentication with passkeys
- How permissions and groups work

## Prerequisites

- Node.js 20.19+ or 22.12+
- Basic familiarity with Vue 3 Composition API and TypeScript

---

## Step 1: Scaffold the Project

Create a new Vue 3 project with TypeScript:

```bash
npm create vue@latest vue-jazz-chat
cd vue-jazz-chat
```

Select TypeScript, Vue Router, and skip the rest. Then install Jazz:

```bash
npm install jazz-tools community-jazz-vue
```

Your key dependencies in `package.json`:

```json
{
  "dependencies": {
    "community-jazz-vue": "^0.20.12",
    "jazz-tools": "^0.20.12",
    "vue": "^3.5.29",
    "vue-router": "^5.0.3"
  }
}
```

## Step 2: Get a Jazz Cloud API Key

Jazz Cloud provides zero-config sync infrastructure. Sign up at [jazz.tools](https://jazz.tools) and get an API key, then add it to your `.env`:

```
VITE_JAZZ_KEY=you@example.com
```

During development you can use your email address as the key.

---

## Step 3: Define Your Schema

This is where Jazz shines. Instead of designing API endpoints and database tables, you define your data model as collaborative values (CoValues). Jazz handles storage, sync, permissions, and history automatically.

Create `src/schema.ts`:

```typescript
import { co } from 'jazz-tools'

export const Message = co.map({
  text: co.plainText(),
  image: co.optional(co.image()),
})

export const Chat = co.list(Message)
```

That's it. Let's break it down:

- **`co.map({})`** defines a collaborative object (like a row in a database). Each instance gets a unique ID, tracks edit history, and syncs across all connected clients.
- **`co.plainText()`** is a collaborative text type. It supports concurrent editing — two users can type in the same field without conflicts.
- **`co.optional(co.image())`** is an optional image field that handles multi-resolution image uploads.
- **`co.list(Message)`** defines a collaborative ordered list of `Message` objects.

Every CoValue is:

- **Automatically synced** — changes propagate instantly to all subscribers
- **Conflict-free** — built on CRDTs, so concurrent edits merge cleanly
- **Permission-controlled** — owned by a Group or Account that controls who can read/write
- **History-tracked** — every edit records who made it and when

---

## Step 4: Set Up the Root Provider

Jazz needs two things at the root of your app:

1. A **sync connection** to Jazz Cloud (or your own server)
2. An **auth provider** for user identity

Create `src/RootApp.vue`:

```vue
<script setup lang="ts">
import { JazzVueProvider, PasskeyAuthBasicUI } from 'community-jazz-vue'
import App from './App.vue'
</script>

<template>
  <JazzVueProvider
    :sync="{
      peer: `wss://cloud.jazz.tools/?key=${import.meta.env.VITE_JAZZ_KEY ?? 'you@example.com'}`,
    }"
  >
    <PasskeyAuthBasicUI appName="Jazz Vue Chat">
      <App />
    </PasskeyAuthBasicUI>
  </JazzVueProvider>
</template>
```

**`JazzVueProvider`** initializes the Jazz context and makes it available to all child components via Vue's `provide/inject`. Key props:

| Prop            | Description                                |
| --------------- | ------------------------------------------ |
| `sync`          | WebSocket peer URL for Jazz Cloud sync     |
| `AccountSchema` | Custom account schema (optional)           |
| `storage`       | `"indexedDB"` for persistent local storage |
| `guestMode`     | Allow anonymous users (default: `false`)   |

**`PasskeyAuthBasicUI`** renders a simple sign-up/log-in UI using WebAuthn passkeys. It only shows when the user isn't authenticated — once logged in, your `<App />` renders.

Update `src/main.ts` to use the new root:

```typescript
import './assets/main.css'
import { createApp } from 'vue'
import RootApp from './RootApp.vue'
import router from './router'

const app = createApp(RootApp)
app.use(router)
app.mount('#app')
```

---

## Step 5: Build the App Shell

`src/App.vue` is the authenticated layout — it only renders after the user signs in.

```vue
<script setup lang="ts">
import { useAccount, useLogOut } from 'community-jazz-vue'
import { useRouter } from 'vue-router'
import { isLoaded } from './utils/jazz'

const me = useAccount(undefined, { resolve: { profile: true } })
const logOut = useLogOut()
const router = useRouter()

function logoutHandler() {
  logOut()
  router.push({ name: 'Home' })
}
</script>

<template>
  <div class="app-shell">
    <header v-if="isLoaded(me)" class="app-header">
      <p class="username">{{ me.profile?.name }}</p>
      <button class="logout-btn" @click="logoutHandler">Log out</button>
    </header>
    <router-view />
  </div>
</template>
```

### Key Composables

**`useAccount(Schema?, options?)`** returns a reactive ref to the current user's account. The `resolve` option tells Jazz which nested fields to load:

```typescript
// Load just the account
const me = useAccount()

// Load the account with its profile resolved
const me = useAccount(undefined, { resolve: { profile: true } })
```

**`useLogOut()`** returns a function that signs the user out and clears local credentials.

### The `isLoaded` Helper

CoValues can be in a loading state while data is being fetched. Create `src/utils/jazz.ts`:

```typescript
import type { MaybeLoaded } from 'jazz-tools'

export function isLoaded<T>(value: MaybeLoaded<T> | undefined | null): value is T {
  if (!value || typeof value !== 'object') return false
  return !('$isLoaded' in value && value.$isLoaded === false)
}
```

This type guard lets you safely check if a CoValue has finished loading before accessing its properties.

---

## Step 6: Set Up Routing

Create `src/router/index.ts`:

```typescript
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

The `/chat/:chatId` route takes a Jazz CoValue ID as a URL parameter. This is how users navigate to specific chats — and how you'd share a chat link.

---

## Step 7: Create a Chat (HomeView)

When a user visits the home page, we automatically create a new chat and redirect to it.

Create `src/views/HomeView.vue`:

```vue
<template>
  <div v-if="!me">Loading...</div>
  <div v-else class="creating">Creating a new chat...</div>
</template>

<script setup lang="ts">
import { useAccount } from 'community-jazz-vue'
import { Group } from 'jazz-tools'
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { Chat } from '../schema'
import { isLoaded } from '../utils/jazz'

const router = useRouter()
const me = useAccount()

let stopped = false
const stop = watch(
  me,
  (currentMe) => {
    if (stopped || !isLoaded(currentMe)) return
    stopped = true

    // 1. Create a permission group
    const group = Group.create({ owner: currentMe })
    group.addMember('everyone', 'writer')

    // 2. Create a chat owned by the group
    const chat = Chat.create([], { owner: group })

    // 3. Navigate to the new chat
    stop?.()
    router.push({ name: 'Chat', params: { chatId: chat.$jazz.id } })
  },
  { immediate: true },
)
</script>
```

### Understanding Groups and Permissions

This is a core Jazz concept. Every CoValue has an **owner** — either an Account or a Group. The owner controls who can read and write the data.

```typescript
// Create a group owned by the current user
const group = Group.create({ owner: currentMe })

// Make it writable by everyone (public chat)
group.addMember('everyone', 'writer')
```

Permission levels:

- **`reader`** — can read the data
- **`writer`** — can read and write
- **`admin`** — can read, write, and manage members

The `'everyone'` special member makes the group public. For a private chat, you'd add specific accounts:

```typescript
group.addMember(otherUser, 'writer')
```

When you create a CoValue, its owner's permissions apply:

```typescript
const chat = Chat.create([], { owner: group })
// Anyone in the group can now read/write this chat
```

---

## Step 8: Build the Chat View

This is the main event. Create `src/views/ChatView.vue`:

```vue
<template>
  <div v-if="loadedChat" class="chat-container">
    <div class="messages">
      <template v-if="loadedChat.length > 0">
        <button
          v-if="loadedChat.length > showNLastMessages"
          class="show-more"
          @click="showMoreMessages"
        >
          Show more
        </button>
        <div v-for="{ msg, by, time } in displayedMessages" :key="msg?.$jazz.id" class="message">
          <p class="message-text">{{ msg?.text }}</p>
          <small class="message-meta"> {{ by }} &mdash; {{ time }} </small>
        </div>
      </template>
      <p v-else class="empty">No messages yet. Say something!</p>
    </div>

    <div class="input-bar">
      <input
        v-model="inputValue"
        class="message-input"
        placeholder="Type a message and press Enter"
        @keydown.enter.prevent="sendMessage"
      />
      <button class="send-btn" @click="sendMessage">Send</button>
    </div>
  </div>
  <div v-else class="loading">Loading...</div>
</template>

<script setup lang="ts">
import { useCoState } from 'community-jazz-vue'
import { co, type ID } from 'jazz-tools'
import { computed, ref } from 'vue'
import { Chat, Message } from '../schema'
import { isLoaded } from '../utils/jazz'

const props = defineProps<{ chatId: ID<typeof Chat> }>()

const chat = useCoState(Chat, props.chatId, {
  resolve: { $each: true },
})

const inputValue = ref('')
const showNLastMessages = ref(30)

const loadedChat = computed(() => {
  const c = chat.value
  return isLoaded(c) ? c : undefined
})

const displayedMessages = computed(() => {
  return loadedChat.value
    ?.slice(-showNLastMessages.value)
    .reverse()
    .map((msg) => {
      const edit = msg?.$jazz?.getEdits?.()?.text
      return {
        msg,
        by: edit?.by?.profile?.name ?? 'Unknown',
        time: edit?.madeAt?.toLocaleTimeString() ?? '',
      }
    })
})

function showMoreMessages() {
  const max = loadedChat.value?.length ?? showNLastMessages.value
  showNLastMessages.value = Math.min(showNLastMessages.value + 10, max)
}

function sendMessage() {
  const c = loadedChat.value
  if (!inputValue.value.trim() || !c) return

  c.$jazz.push(
    Message.create({ text: co.plainText().create(inputValue.value, c.$jazz.owner) }, c.$jazz.owner),
  )

  inputValue.value = ''
}
</script>
```

Let's walk through the important parts.

### Subscribing to Data with `useCoState`

```typescript
const chat = useCoState(Chat, props.chatId, {
  resolve: { $each: true },
})
```

`useCoState` is the primary way to read collaborative data in Jazz + Vue. It:

1. **Subscribes** to the CoValue by its ID
2. **Returns a reactive `Ref`** that updates whenever the data changes (locally or from other users)
3. **Resolves nested references** based on the `resolve` option

The `resolve` option tells Jazz how deep to load. Since `Chat` is a list of `Message` references, `{ $each: true }` means "load each message in the list." Without it, you'd get unresolved reference stubs instead of actual message objects.

Common resolve patterns:

```typescript
// Load a single level
useCoState(Chat, id, { resolve: { $each: true } })

// Load nested fields
useCoState(Project, id, {
  resolve: {
    tasks: {
      $each: {
        text: true, // resolve the plainText field
        assignee: true, // resolve the account reference
      },
    },
  },
})
```

### Reading Edit History

Jazz automatically tracks who made each edit and when:

```typescript
const edit = msg?.$jazz?.getEdits?.()?.text
const authorName = edit?.by?.profile?.name
const editTime = edit?.madeAt?.toLocaleTimeString()
```

`getEdits()` returns metadata for each field — who last edited it (`by`) and when (`madeAt`). No need to store `createdAt` or `authorId` fields manually. Jazz gives you this for free.

### Creating and Pushing Messages

```typescript
function sendMessage() {
  const c = loadedChat.value
  if (!inputValue.value.trim() || !c) return

  c.$jazz.push(
    Message.create({ text: co.plainText().create(inputValue.value, c.$jazz.owner) }, c.$jazz.owner),
  )

  inputValue.value = ''
}
```

Breaking this down:

1. **`co.plainText().create(text, owner)`** — creates a new collaborative text value. The owner (the chat's group) determines who can edit it.
2. **`Message.create({ text, ... }, owner)`** — creates a new Message CoValue with the given fields.
3. **`c.$jazz.push(message)`** — appends the message to the chat list.

The mutation is **instant locally** and **synced in the background**. Other users subscribed to this chat will see the message appear in real-time.

### The `$jazz` API

Every CoValue instance has a `$jazz` property that provides:

| Method/Property         | Description                       |
| ----------------------- | --------------------------------- |
| `$jazz.id`              | Unique ID of this CoValue         |
| `$jazz.owner`           | The Group or Account that owns it |
| `$jazz.set(key, value)` | Set a field on a map              |
| `$jazz.push(item)`      | Append to a list                  |
| `$jazz.getEdits()`      | Get edit history per field        |

---

## Step 9: Run It

```bash
npm run dev
```

Open the app in two browser windows. Sign up with different accounts. When you create a chat in one window, copy the URL and open it in the other. Both users can send messages and see them appear in real-time.

---

## Key Concepts Recap

### How Jazz Sync Works

Jazz uses a lightweight 4-message sync protocol built on CRDTs:

1. Your app connects to Jazz Cloud via WebSocket
2. When you create or mutate a CoValue, the change is applied locally first (instant UI update)
3. The change is sent to Jazz Cloud, which broadcasts it to all other subscribers
4. Other clients apply the incoming change — CRDTs guarantee consistency without conflicts

This means your app works **offline-first** by default. Changes queue up locally and sync when the connection is restored.

### CoValues vs Traditional APIs

| Traditional                         | Jazz                                          |
| ----------------------------------- | --------------------------------------------- |
| Define API endpoints                | Define schemas with `co.map()`                |
| Write CRUD handlers                 | Use `create()`, `$jazz.set()`, `$jazz.push()` |
| Manage WebSocket rooms              | Jazz syncs automatically by CoValue ID        |
| Store `createdAt`, `updatedBy`      | Jazz tracks edit history automatically        |
| Implement access control middleware | Set permissions via Groups                    |
| Handle conflict resolution          | CRDTs handle it (no conflicts possible)       |

### The Resolve Pattern

Jazz loads data lazily. A `Chat` containing `Message` references won't load the messages until you ask for them:

```typescript
// Just the chat list (messages are unresolved refs)
useCoState(Chat, id)

// Chat with all messages loaded
useCoState(Chat, id, { resolve: { $each: true } })

// Chat with messages and their images loaded
useCoState(Chat, id, {
  resolve: {
    $each: {
      image: true,
    },
  },
})
```

This gives you fine-grained control over what data is fetched and subscribed to.

---

## Going Further

### Custom Account Schema

Define what data is stored on each user's account:

```typescript
import { co, z } from 'jazz-tools'

const MyAccount = co.account({
  profile: co.profile(),
  root: co.map({
    chats: co.list(Chat),
    settings: co.map({
      theme: z.enum(['light', 'dark']),
    }),
  }),
})
```

Then pass it to the provider:

```vue
<JazzVueProvider :AccountSchema="MyAccount" :sync="syncConfig">
```

### Invite Links

Share access to a CoValue via invite links:

```typescript
import { createInviteLink } from 'community-jazz-vue'

const link = createInviteLink(chat, 'writer')
// => "https://yourapp.com/#/invite/..."
```

Accept invites:

```typescript
import { useAcceptInvite } from 'community-jazz-vue'

useAcceptInvite({
  invitedObjectSchema: Chat,
  onAccept: (chatId) => {
    router.push({ name: 'Chat', params: { chatId } })
  },
})
```

### Other Auth Providers

Jazz supports multiple auth strategies:

```typescript
// Passphrase-based (BIP39 mnemonic)
import { usePassphraseAuth } from 'community-jazz-vue'
const auth = usePassphraseAuth({ wordlist: english })

// Clerk integration
import { JazzVueProviderWithClerk } from 'community-jazz-vue'
```

---

## Full File Structure

```
src/
├── main.ts              # App entry, mounts RootApp
├── RootApp.vue          # JazzVueProvider + PasskeyAuthBasicUI
├── App.vue              # Authenticated shell with header + router-view
├── schema.ts            # Jazz data model (Message, Chat)
├── router/
│   └── index.ts         # Routes: Home + Chat
├── views/
│   ├── HomeView.vue     # Creates new chat + redirects
│   └── ChatView.vue     # Main chat UI with useCoState
└── utils/
    └── jazz.ts          # isLoaded helper
```

That's it — a fully functional real-time collaborative chat app with authentication, permissions, edit history, and live sync. No backend code, no database setup, no WebSocket handlers. Just schemas and Vue components.
