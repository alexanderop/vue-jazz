# Jazz + Vue: Build a Real-Time Chat App with Images

This tutorial teaches you how to use **Jazz** with **Vue** to build a real-time, collaborative, offline-capable chat app. You'll learn how to define schemas, set up the provider, read and write collaborative state, handle auth, and work with images — all with automatic sync.

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
import { co, z, setDefaultValidationMode } from 'jazz-tools'

setDefaultValidationMode('strict')

// A single message
export const Message = co
  .map({
    text: z.string(),
    image: co.optional(co.image()),
  })
  .resolved({
    image: true,
  })
  .withPermissions({
    onInlineCreate: 'sameAsContainer',
  })
export type Message = co.loaded<typeof Message>

// A chat is a list of messages
export const Chat = co.list(Message).withPermissions({
  onCreate: (owner) => owner.addMember('everyone', 'writer'),
})
export type Chat = co.loaded<typeof Chat>
```

### Schema building blocks

| API                | What it creates                                       |
| ------------------ | ----------------------------------------------------- |
| `co.map({ ... })`  | An object with typed fields (like an interface)       |
| `co.list(Item)`    | An ordered list of items                              |
| `z.string()`       | A plain string field (Zod primitive)                  |
| `co.plainText()`   | A collaborative text field (for real-time co-editing) |
| `z.number()`       | A number field (Zod primitive)                        |
| `z.boolean()`      | A boolean field (Zod primitive)                       |
| `co.optional(...)` | Makes any field optional                              |
| `co.image()`       | An image field with progressive loading               |

### Chaining schema methods

Schema definitions support method chaining:

- **`.resolved({ ... })`** — Declares which CoValue fields to load automatically. Here `image: true` means the image is always eagerly loaded when the Message is fetched.
- **`.withPermissions({ ... })`** — Configures access control (see [Permissions](#9-permissions)).

### Strict validation mode

`setDefaultValidationMode('strict')` enforces that all required fields must be present when creating or mutating values. This catches bugs early during development.

### Type helpers

Always export both the schema definition and a loaded type:

```typescript
export const Message = co.map({ text: z.string() })
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

const peer = `wss://cloud.jazz.tools/?key=${import.meta.env.VITE_JAZZ_KEY ?? 'you@example.com'}`
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

`useCoState` is the primary way to subscribe to Jazz data in Vue. It takes a schema, an ID (or a getter returning one), and a resolve query — then returns a reactive `Ref` that auto-updates when data changes (locally or from other users).

```vue
<script setup lang="ts">
import { useCoState } from 'community-jazz-vue'
import { Chat } from '@/schema'
import type { ID } from 'jazz-tools'

const props = defineProps<{ chatId: ID<typeof Chat> }>()

const chat = useCoState(Chat, () => props.chatId, {
  resolve: {
    $each: {
      image: true,
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
useCoState(Schema, idOrGetter, options?)
```

| Parameter         | Type                                    | Description                                                                              |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Schema`          | CoValue schema                          | The schema to subscribe to (`Chat`, `Message`, `Account`, etc.)                          |
| `idOrGetter`      | `MaybeRefOrGetter<string \| undefined>` | An ID, a ref, or a getter returning the CoValue ID. `undefined` pauses the subscription. |
| `options.resolve` | object                                  | Specifies which nested fields to load                                                    |

The second argument accepts a `MaybeRefOrGetter` — you can pass a raw string, a Vue ref, or a getter function like `() => props.chatId`. This makes it flexible for different component patterns.

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

If you used `.resolved()` on your schema, those fields are loaded by default:

```typescript
export const Message = co
  .map({ text: z.string(), image: co.optional(co.image()) })
  .resolved({ image: true }) // image loads automatically whenever a Message is fetched
```

### Loading other users' data

You can use `useCoState` with the `Account` schema to load any user by ID:

```vue
<script setup lang="ts">
import { useCoState } from 'community-jazz-vue'
import { Account } from 'jazz-tools'
import type { Message } from '@/schema'

const { msg } = defineProps<{ msg: Message }>()

const by = useCoState(Account, () => msg.$jazz.createdBy, {
  resolve: { profile: true },
})
</script>

<template>
  <span v-if="by.$isLoaded">{{ by.profile?.name }}</span>
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
  router.push({ name: '/chat/[chatId]', params: { chatId: chat.$jazz.id } })
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
const chat = useCoState(Chat, chatId, { resolve: { $each: { image: true } } })

function sendMessage(text: string) {
  const c = chat.value
  if (!text.trim() || !c?.$isLoaded) return
  c.$jazz.push({ text })
}
```

### Update a field on a map

```typescript
const me = useAccount(undefined, { resolve: { profile: true } })

function updateName(value: string | undefined) {
  const m = me.value
  if (!m?.$isLoaded) return
  m.profile?.$jazz.set('name', value ?? '')
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

### Wrapping in a custom composable

For reuse, wrap it in a composable:

```typescript
// src/composables/useCurrentUser.ts
import { useAccount } from 'community-jazz-vue'

export function useCurrentUser() {
  return useAccount(undefined, { resolve: { profile: true } })
}
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

async function sendImage(event: Event, chat: Chat) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  target.value = '' // Reset so re-selecting the same file triggers change

  if (file.size > 5_000_000) {
    console.error('Please upload an image less than 5MB.')
    return
  }

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
export const Message = co.map({ text: z.string() }).withPermissions({
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
const isLoaded = computed(() => chat.value?.$isLoaded && me.value?.$isLoaded)
</script>

<template>
  <div v-if="isLoaded">
    <!-- Safe to access chat and me here -->
  </div>
  <div v-else>Loading...</div>
</template>
```

### Key patterns

```typescript
// Guard before mutating
const c = chat.value
if (!c?.$isLoaded) return
c.$jazz.push({ text: 'Hello' })

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
import { useCoState } from 'community-jazz-vue'
import { Account } from 'jazz-tools'
import type { Message } from '@/schema'

const { msg } = defineProps<{ msg: Message }>()

const fromMe = computed(() => msg.$jazz.createdBy === meId)
const date = computed(() => new Date(msg.$jazz.createdAt))
const formattedTime = computed(() => date.value.toLocaleTimeString('en-US', { hour12: false }))

// Load the message creator's profile
const by = useCoState(Account, () => msg.$jazz.createdBy, {
  resolve: { profile: true },
})
</script>

<template>
  <div :class="fromMe ? 'items-end' : 'items-start'">
    <div v-if="by.$isLoaded" class="text-xs text-neutral-600">
      {{ by.profile?.name }} &middot;
      <time :datetime="date.toISOString()">{{ formattedTime }}</time>
    </div>
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

Here's how all the pieces fit together for a collaborative chat app with image support.

### Step 1: Schema (`src/schema.ts`)

```typescript
import { co, z, setDefaultValidationMode } from 'jazz-tools'

setDefaultValidationMode('strict')

export const Message = co
  .map({
    text: z.string(),
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
  peer: `wss://cloud.jazz.tools/?key=${import.meta.env.VITE_JAZZ_KEY ?? 'you@example.com'}`,
}
</script>

<template>
  <JazzVueProvider :sync="sync" :defaultProfileName="'Anonymous'">
    <App />
  </JazzVueProvider>
</template>
```

### Step 3: Chat composable (`src/composables/useChat.ts`)

Extract all chat logic into a composable for clean separation:

```typescript
import { computed, ref, type MaybeRefOrGetter } from 'vue'
import { useCoState, createImage } from 'community-jazz-vue'
import type { ID } from 'jazz-tools'
import { Chat } from '@/schema'
import { useCurrentUser } from './useCurrentUser'

const INITIAL_MESSAGES_TO_SHOW = 30
const MAX_IMAGE_SIZE_BYTES = 5_000_000

export function useChat(chatId: MaybeRefOrGetter<ID<typeof Chat>>) {
  const chat = useCoState(Chat, chatId, {
    resolve: { $each: { image: true } },
  })
  const me = useCurrentUser()

  const showNLastMessages = ref(INITIAL_MESSAGES_TO_SHOW)
  const inputValue = ref('')
  const uploadError = ref('')
  const isUploading = ref(false)

  const isLoaded = computed(() => chat.value?.$isLoaded && me.value?.$isLoaded)

  const displayedMessages = computed(() => {
    const c = chat.value
    if (!c?.$isLoaded) return []
    return c.slice(-showNLastMessages.value).filter(Boolean).toReversed()
  })

  const hasMore = computed(() =>
    Boolean(chat.value?.$isLoaded && chat.value.length > showNLastMessages.value),
  )

  function sendMessage() {
    const c = chat.value
    if (!inputValue.value.trim() || !c?.$isLoaded) return
    c.$jazz.push({ text: inputValue.value })
    inputValue.value = ''
  }

  async function sendImage(event: Event) {
    const c = chat.value
    if (!c?.$isLoaded) return
    uploadError.value = ''
    const { target } = event
    if (!(target instanceof HTMLInputElement)) return
    const file = target.files?.[0]
    if (!file) return

    target.value = '' // Reset so re-selecting the same file triggers change
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      uploadError.value = 'Please upload an image less than 5MB.'
      return
    }
    isUploading.value = true
    try {
      const image = await createImage(file, {
        owner: c.$jazz.owner,
        progressive: true,
        placeholder: 'blur',
      })
      c.$jazz.push({ text: file.name, image })
    } catch {
      uploadError.value = 'Failed to upload image. Please try again.'
    } finally {
      isUploading.value = false
    }
  }

  function showMore() {
    showNLastMessages.value += 10
  }

  return {
    chat,
    me,
    isLoaded,
    displayedMessages,
    hasMore,
    inputValue,
    uploadError,
    isUploading,
    sendMessage,
    sendImage,
    showMore,
  }
}
```

### Step 4: Create a Chat (`src/pages/index.vue`)

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Chat } from '@/schema'

const router = useRouter()

onMounted(() => {
  const chat = Chat.create([])
  router.push({ name: '/chat/[chatId]', params: { chatId: chat.$jazz.id } })
})
</script>

<template>
  <div>Creating chat...</div>
</template>
```

### Step 5: Chat Page (`src/pages/chat/[chatId].vue`)

The page component stays thin — it delegates to the composable and child components:

```vue
<script setup lang="ts">
import type { ID } from 'jazz-tools'
import type { Chat } from '@/schema'
import { useChat } from '@/composables/useChat'
import ChatMessageList from '@/components/chat/ChatMessageList.vue'
import ChatInputForm from '@/components/chat/ChatInputForm.vue'

const { chatId } = defineProps<{ chatId: ID<typeof Chat> }>()

const {
  me,
  isLoaded,
  displayedMessages,
  hasMore,
  inputValue,
  uploadError,
  isUploading,
  sendMessage,
  sendImage,
  showMore,
} = useChat(() => chatId)
</script>

<template>
  <template v-if="isLoaded">
    <ChatMessageList
      :messages="displayedMessages"
      :me-id="me!.$jazz.id"
      :has-more="hasMore"
      @show-more="showMore"
    />
    <ChatInputForm
      v-model="inputValue"
      :upload-error="uploadError"
      :is-uploading="isUploading"
      @submit="sendMessage"
      @upload="sendImage"
    />
  </template>
  <div v-else>Loading...</div>
</template>
```

### Step 6: Message Components

**ChatMessageList.vue** — renders the message list with reverse scrolling:

```vue
<script setup lang="ts">
import type { Message } from '@/schema'
import ChatBubble from './ChatBubble.vue'

const { messages, meId, hasMore } = defineProps<{
  messages: Message[]
  meId: string
  hasMore: boolean
}>()

const emit = defineEmits<{ 'show-more': [] }>()
</script>

<template>
  <div class="flex flex-1 flex-col-reverse overflow-y-auto" role="log">
    <template v-if="messages.length > 0">
      <ChatBubble v-for="msg in messages" :key="msg.$jazz.id" :msg="msg" :me-id="meId" />
    </template>
    <div v-else>Start a conversation below.</div>
    <button v-if="hasMore" @click="emit('show-more')">Show more</button>
  </div>
</template>
```

**ChatBubble.vue** — a single message bubble with image support:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/schema'
import BubbleInfo from './BubbleInfo.vue'
import ChatImage from './ChatImage.vue'

const { msg, meId } = defineProps<{
  msg: Message
  meId: string
}>()

const fromMe = computed(() => msg.$jazz.createdBy === meId)
</script>

<template>
  <div :class="[fromMe ? 'items-end' : 'items-start', 'flex flex-col m-3']">
    <BubbleInfo :msg="msg" />
    <div :class="[fromMe ? 'bg-white' : 'bg-blue text-white', 'rounded-2xl overflow-hidden p-1']">
      <ChatImage
        v-if="msg.image"
        :imageId="msg.image.$jazz.id"
        :alt="String(msg.text || 'Shared image')"
      />
      <p class="px-2 leading-relaxed">{{ msg.text }}</p>
    </div>
  </div>
</template>
```

**BubbleInfo.vue** — shows sender name and timestamp using `useCoState(Account)`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useCoState } from 'community-jazz-vue'
import { Account } from 'jazz-tools'
import type { Message } from '@/schema'

const { msg } = defineProps<{ msg: Message }>()

const date = computed(() => new Date(msg.$jazz.createdAt))
const formattedTime = computed(() => date.value.toLocaleTimeString('en-US', { hour12: false }))

const by = useCoState(Account, () => msg.$jazz.createdBy, {
  resolve: { profile: true },
})
</script>

<template>
  <div class="text-xs text-neutral-600">
    <template v-if="by.$isLoaded">
      {{ by.profile?.name }} &middot;
      <time :datetime="date.toISOString()">{{ formattedTime }}</time>
    </template>
  </div>
</template>
```

**ChatImage.vue** — wraps the Jazz `Image` component:

```vue
<script setup lang="ts">
import { Image } from 'community-jazz-vue'

const { imageId, alt } = defineProps<{
  imageId: string
  alt: string
}>()
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

### Step 7: Share the chat

The chat ID in the URL (e.g., `/chat/co_z...`) is all you need. Share that URL with anyone — they'll join the same collaborative chat instantly. Jazz handles all the sync.

---

## Quick Reference

### Imports cheat sheet

```typescript
// Schema definition
import { co, z, setDefaultValidationMode } from 'jazz-tools'

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
4. **Read** values with `useCoState(Schema, idOrGetter)`
5. **Write** values with `.$jazz.set()` and `.$jazz.push()`
6. **Sync happens automatically** — no extra code needed

That's it. No REST APIs, no WebSocket handlers, no state management library, no cache invalidation. Jazz handles it all.
