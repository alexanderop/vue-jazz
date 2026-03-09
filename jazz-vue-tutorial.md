# Jazz + Vue: Build Real-Time Collaborative Apps

This tutorial teaches you how to use **Jazz** with **Vue** to build real-time, collaborative, offline-capable apps. By the end, you'll understand how to define schemas, set up the provider, read and write collaborative state, handle auth, and work with images — all with automatic sync.

We'll use a real-time chat app as our running example.

---

## Table of Contents

1. [Installation](#1-installation)
2. [Define Your Schema](#2-define-your-schema)
3. [Set Up the Provider](#3-set-up-the-provider)
4. [Read Collaborative State with `useCoState`](#4-read-collaborative-state-with-usecostate)
5. [Create New Values](#5-create-new-values)
6. [Write and Mutate State](#6-write-and-mutate-state)
7. [Access the Current User with `useAccount`](#7-access-the-current-user-with-useaccount)
8. [Handle Images](#8-handle-images)
9. [Permissions](#9-permissions)
10. [Loading States](#10-loading-states)
11. [Jazz Metadata (`$jazz`)](#11-jazz-metadata-jazz)
12. [Logout](#12-logout)
13. [Full Example Walkthrough](#13-full-example-walkthrough)

---

## 1. Installation

```bash
npm install jazz-tools community-jazz-vue
# or
pnpm add jazz-tools community-jazz-vue
```

- **`jazz-tools`** — Core framework: schemas, accounts, sync, permissions.
- **`community-jazz-vue`** — Vue bindings: provider component, composables, image helpers.

You'll also need a Jazz Cloud API key. Get one from [jazz.tools](https://jazz.tools) or use `you@example.com` during development. Add it to your `.env`:

```
VITE_JAZZ_KEY=you@example.com
```

---

## 2. Define Your Schema

Jazz uses **collaborative values** (CoValues) as its data primitives. You define them with `co.map()` for objects and `co.list()` for arrays.

Create a `schema.ts` file:

```typescript
// src/schema.ts
import { co } from 'jazz-tools'

// A single message
export const Message = co.map({
  text: co.string,
  image: co.optional(co.image()),
})

export type Message = co.loaded<typeof Message>

// A chat is a list of messages
export const Chat = co.list(Message)

export type Chat = co.loaded<typeof Chat>
```

### Schema building blocks

| API                | What it creates                                       |
| ------------------ | ----------------------------------------------------- |
| `co.map({ ... })`  | An object with typed fields (like an interface)       |
| `co.list(Item)`    | An ordered list of items                              |
| `co.string`        | A plain string field                                  |
| `co.plainText()`   | A collaborative text field (for real-time co-editing) |
| `co.number`        | A number field                                        |
| `co.boolean`       | A boolean field                                       |
| `co.optional(...)` | Makes any field optional                              |
| `co.image()`       | An image field with progressive loading               |

### Type helpers

Always export both the schema definition and a loaded type:

```typescript
export const Message = co.map({ text: co.string })
export type Message = co.loaded<typeof Message>
//                    ^^^^^^^^^^^^^^^^^^^^^^^^ gives you the type with all fields accessible
```

This gives you proper TypeScript types when consuming the data in components.

---

## 3. Set Up the Provider

Wrap your app with `JazzVueProvider`. This creates the Jazz context — connecting to the sync server and provisioning an account.

```vue
<!-- src/RootApp.vue -->
<script setup lang="ts">
import { JazzVueProvider } from 'community-jazz-vue'
import { type SyncConfig } from 'jazz-tools'
import App from './App.vue'

const peer = `wss://cloud.jazz.tools/?key=${import.meta.env.VITE_JAZZ_KEY}`
const sync: SyncConfig = { peer }
</script>

<template>
  <JazzVueProvider :sync="sync" :defaultProfileName="'Anonymous User'">
    <App />
  </JazzVueProvider>
</template>
```

### Provider props

| Prop                 | Purpose                                                         |
| -------------------- | --------------------------------------------------------------- |
| `sync`               | Sync configuration — where to connect (`{ peer: 'wss://...' }`) |
| `defaultProfileName` | Name for auto-created anonymous accounts                        |

**Important:** `JazzVueProvider` must wrap any component that uses Jazz composables. Make it the outermost wrapper in your app.

### Use it as your entry point

```typescript
// src/main.ts
import { createApp } from 'vue'
import RootApp from './RootApp.vue'

createApp(RootApp).mount('#app')
```

---

## 4. Read Collaborative State with `useCoState`

`useCoState` is the primary way to subscribe to Jazz data in Vue. It takes a schema, an ID, and a resolve query — then returns a reactive `Ref` that auto-updates when data changes (locally or from other users).

```vue
<script setup lang="ts">
import { useCoState } from 'community-jazz-vue'
import { Chat } from '@/schema'
import type { ID } from 'jazz-tools'

const props = defineProps<{ chatId: ID<typeof Chat> }>()

const chat = useCoState(Chat, () => props.chatId, {
  resolve: {
    $each: {
      // For each item in the list...
      image: true, // ...load the image field (co.string fields don't need resolving)
    },
  },
})
</script>

<template>
  <div v-if="chat?.$isLoaded">
    <div v-for="msg in chat" :key="msg.$jazz.id">
      {{ msg.text }}
    </div>
  </div>
  <div v-else>Loading...</div>
</template>
```

### Signature

```typescript
useCoState(Schema, id, options?)
```

| Parameter         | Type                        | Description                                                                       |
| ----------------- | --------------------------- | --------------------------------------------------------------------------------- |
| `Schema`          | CoValue schema              | The schema to subscribe to (`Chat`, `Message`, `Account`, etc.)                   |
| `id`              | `() => string \| undefined` | A getter returning the CoValue ID. Returning `undefined` pauses the subscription. |
| `options.resolve` | object                      | Specifies which nested fields to load                                             |

### Resolve queries

The `resolve` option controls how deep to load:

```typescript
// Load a single map with its image field
useCoState(Message, () => id, {
  resolve: { image: true },
})

// Load a list, and for each item load its image
useCoState(Chat, () => id, {
  resolve: { $each: { image: true } },
})

// Load an account with its profile
useCoState(Account, () => id, {
  resolve: { profile: true },
})
```

If you defined `.resolved()` on your schema, those fields are loaded by default:

```typescript
export const Message = co
  .map({ text: co.string, image: co.optional(co.image()) })
  .resolved({ image: true }) // CoValue fields listed here load automatically
```

### Loading other users' data

You can use `useCoState` with the `Account` schema to load any user by ID:

```vue
<script setup lang="ts">
import { useCoState } from 'community-jazz-vue'
import { Account } from 'jazz-tools'

const props = defineProps<{ createdBy: string }>()

const user = useCoState(Account, () => props.createdBy, {
  resolve: { profile: true },
})
</script>

<template>
  <span v-if="user.$isLoaded">{{ user.profile?.name }}</span>
</template>
```

---

## 5. Create New Values

Call `.create()` on any schema to create a new collaborative value:

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Chat } from '@/schema'

const router = useRouter()

onMounted(() => {
  const chat = Chat.create([]) // Create an empty Chat list

  // Navigate to the new chat using its auto-generated ID
  router.push(`/chat/${chat.$jazz.id}`)
})
</script>
```

- `Chat.create([])` creates an empty list.
- `Chat.create([{ text: 'Hello' }])` creates a list with an initial item.
- The created value is **immediately available locally** and syncs in the background.

---

## 6. Write and Mutate State

Jazz values are mutated directly. Changes sync automatically — no save buttons, no API calls.

### Push to a list

```typescript
const chat = useCoState(Chat, () => chatId, { resolve: { $each: { image: true } } })

function sendMessage(text: string) {
  if (!chat.value?.$isLoaded) return
  chat.value.$jazz.push({ text }) // Appends a new Message
}
```

### Update a field on a map

```typescript
const me = useAccount(undefined, { resolve: { profile: true } })

function updateName(name: string) {
  if (!me.value?.$isLoaded) return
  me.value.profile?.$jazz.set('name', name)
}
```

### Key write operations

| Operation                       | What it does                     |
| ------------------------------- | -------------------------------- |
| `list.$jazz.push({ ... })`      | Append an item to a CoList       |
| `map.$jazz.set('field', value)` | Update a single field on a CoMap |

Every mutation is:

- **Instantly reflected** in the local UI (no waiting for server)
- **Automatically synced** to all connected peers
- **Persisted offline** and synced when reconnected

---

## 7. Access the Current User with `useAccount`

`useAccount` returns a reactive ref to the currently logged-in account:

```vue
<script setup lang="ts">
import { useAccount } from 'community-jazz-vue'

const me = useAccount(undefined, { resolve: { profile: true } })
</script>

<template>
  <div v-if="me.$isLoaded">
    <p>Logged in as: {{ me.profile?.name }}</p>
    <p>Account ID: {{ me.$jazz.id }}</p>
  </div>
</template>
```

### Signature

```typescript
useAccount(AccountSchema?, options?)
```

- Pass `undefined` as the first argument to use the default `Account` schema.
- Use `resolve: { profile: true }` to load the user's profile.

### Updating the profile

```typescript
me.value.profile?.$jazz.set('name', 'New Name')
```

The profile is just another CoMap — you update it the same way as any other value.

---

## 8. Handle Images

Jazz has built-in image support with progressive loading and blur placeholders.

### Upload an image

```typescript
import { createImage } from 'community-jazz-vue'

async function uploadImage(file: File, chat: Chat) {
  const image = await createImage(file, {
    owner: chat.$jazz.owner, // Who owns this image
    progressive: true, // Enable progressive loading
    placeholder: 'blur', // Show blur placeholder while loading
  })

  chat.$jazz.push({ text: file.name, image })
}
```

### Display an image

Use the `Image` component from `community-jazz-vue`:

```vue
<script setup lang="ts">
import { Image } from 'community-jazz-vue'

defineProps<{ imageId: string; alt: string }>()
</script>

<template>
  <Image
    :imageId="imageId"
    :alt="alt"
    class="max-h-80 max-w-full rounded-xl object-contain"
    height="original"
    width="original"
  />
</template>
```

The `Image` component handles progressive loading and blur placeholders automatically.

---

## 9. Permissions

Jazz has a built-in permission model. You configure it directly in the schema with `.withPermissions()`.

```typescript
export const Message = co.map({ text: co.string }).withPermissions({
  onInlineCreate: 'sameAsContainer', // Inherit parent's permissions
})

export const Chat = co.list(Message).withPermissions({
  onCreate: (owner) => owner.addMember('everyone', 'writer'), // Anyone can write
})
```

### Permission options

| Option                              | Description                                                                |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `onCreate(owner)`                   | Called when the value is created. Use `owner.addMember()` to grant access. |
| `onInlineCreate: 'sameAsContainer'` | Inherit permissions from the parent value.                                 |

### Access levels

| Level      | Can read | Can write            |
| ---------- | -------- | -------------------- |
| `'reader'` | Yes      | No                   |
| `'writer'` | Yes      | Yes                  |
| `'admin'`  | Yes      | Yes + manage members |

### Public access

```typescript
owner.addMember('everyone', 'writer') // Anyone can read and write
owner.addMember('everyone', 'reader') // Anyone can read, only owner can write
```

---

## 10. Loading States

Jazz values load asynchronously. Always check `$isLoaded` before accessing data:

```vue
<script setup lang="ts">
import { computed } from 'vue'

const chat = useCoState(Chat, () => chatId, { resolve: { $each: { image: true } } })
const me = useAccount(undefined, { resolve: { profile: true } })

// Combine loading states
const isReady = computed(() => chat.value?.$isLoaded && me.value?.$isLoaded)
</script>

<template>
  <div v-if="isReady">
    <!-- Safe to access chat and me here -->
  </div>
  <div v-else>Loading...</div>
</template>
```

### Key patterns

```typescript
// Guard before accessing
if (chat.value?.$isLoaded) {
  chat.value.forEach((msg) => console.log(msg.text))
}

// Optional chaining for safety
me.value?.profile?.name

// Template guards
// v-if="data.$isLoaded"  → renders only when loaded
// v-if="data?.$isLoaded" → also safe when data itself is undefined
```

---

## 11. Jazz Metadata (`$jazz`)

Every Jazz value has a `$jazz` property with metadata and mutation methods:

```typescript
const msg: Message =
  /* ... */

  msg.$jazz.id // Unique ID (string like "co_z...")
msg.$jazz.createdBy // Account ID of the creator
msg.$jazz.createdAt // Unix timestamp (number)
msg.$jazz.owner // Owner account/group

// Mutations
msg.$jazz.set('text', 'Updated') // Update a field
chatList.$jazz.push({ text: 'Hello' }) // Append to list
```

### Using metadata in components

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/schema'

const props = defineProps<{ msg: Message; meId: string }>()

const fromMe = computed(() => props.msg.$jazz.createdBy === props.meId)
const time = computed(() => new Date(props.msg.$jazz.createdAt).toLocaleTimeString())
</script>

<template>
  <div :class="fromMe ? 'text-right' : 'text-left'">
    <small>{{ time }}</small>
    <p>{{ msg.text }}</p>
  </div>
</template>
```

---

## 12. Logout

Use the `useLogOut` composable:

```vue
<script setup lang="ts">
import { useLogOut } from 'community-jazz-vue'

const logOut = useLogOut()
</script>

<template>
  <button @click="logOut">Log out</button>
</template>
```

This clears the current session and resets to a new anonymous account.

---

## 13. Full Example Walkthrough

Here's how all the pieces fit together for a collaborative chat app:

### Step 1: Schema (`src/schema.ts`)

```typescript
import { co } from 'jazz-tools'

export const Message = co
  .map({
    text: co.string,
    image: co.optional(co.image()),
  })
  .resolved({ image: true })
  .withPermissions({ onInlineCreate: 'sameAsContainer' })

export type Message = co.loaded<typeof Message>

export const Chat = co.list(Message).withPermissions({
  onCreate: (owner) => owner.addMember('everyone', 'writer'),
})

export type Chat = co.loaded<typeof Chat>
```

### Step 2: Provider (`src/RootApp.vue`)

```vue
<script setup lang="ts">
import { JazzVueProvider } from 'community-jazz-vue'
import type { SyncConfig } from 'jazz-tools'
import App from './App.vue'

const sync: SyncConfig = {
  peer: `wss://cloud.jazz.tools/?key=${import.meta.env.VITE_JAZZ_KEY}`,
}
</script>

<template>
  <JazzVueProvider :sync="sync" :defaultProfileName="'Anonymous'">
    <App />
  </JazzVueProvider>
</template>
```

### Step 3: Create a Chat (`src/pages/index.vue`)

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Chat } from '@/schema'

const router = useRouter()

onMounted(() => {
  const chat = Chat.create([])
  router.push(`/chat/${chat.$jazz.id}`)
})
</script>

<template>
  <div>Creating chat...</div>
</template>
```

### Step 4: Chat Page (`src/pages/chat/[chatId].vue`)

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAccount, useCoState } from 'community-jazz-vue'
import type { ID } from 'jazz-tools'
import { Chat } from '@/schema'

const props = defineProps<{ chatId: ID<typeof Chat> }>()

const chat = useCoState(Chat, () => props.chatId, {
  resolve: { $each: { image: true } },
})
const me = useAccount(undefined, { resolve: { profile: true } })

const inputValue = ref('')
const isLoaded = computed(() => chat.value?.$isLoaded && me.value?.$isLoaded)

const messages = computed(() => {
  if (!chat.value?.$isLoaded) return []
  return chat.value.slice(-30).toReversed()
})

function sendMessage() {
  if (!inputValue.value.trim() || !chat.value?.$isLoaded) return
  chat.value.$jazz.push({ text: inputValue.value })
  inputValue.value = ''
}
</script>

<template>
  <template v-if="isLoaded">
    <div v-for="msg in messages" :key="msg.$jazz.id">
      <strong>{{ msg.$jazz.createdBy === me!.$jazz.id ? 'You' : 'Other' }}:</strong>
      {{ msg.text }}
    </div>

    <form @submit.prevent="sendMessage">
      <input v-model="inputValue" placeholder="Message" />
      <button type="submit">Send</button>
    </form>
  </template>
  <div v-else>Loading...</div>
</template>
```

### Step 5: Share the chat

The chat ID in the URL (e.g., `/chat/co_z...`) is all you need. Share that URL with anyone — they'll join the same collaborative chat instantly. Jazz handles all the sync.

---

## Quick Reference

### Imports cheat sheet

```typescript
// Schema definition
import { co } from 'jazz-tools'

// Types
import type { ID } from 'jazz-tools'
import { Account } from 'jazz-tools'

// Vue composables & components
import {
  JazzVueProvider, // Root provider
  useCoState, // Subscribe to a CoValue by ID
  useAccount, // Get current user
  useLogOut, // Logout function
  createImage, // Upload an image
  Image, // Display an image
} from 'community-jazz-vue'
```

### Mental model

1. **Define** your data shapes with `co.map()` and `co.list()`
2. **Wrap** your app with `JazzVueProvider`
3. **Create** values with `Schema.create()`
4. **Read** values with `useCoState(Schema, () => id)`
5. **Write** values with `.$jazz.set()` and `.$jazz.push()`
6. **Sync happens automatically** — no extra code needed

That's it. No REST APIs, no WebSocket handlers, no state management library, no cache invalidation. Jazz handles it all.
