# Building a Real-Time Chat App with Vue 3 and Jazz

Jazz is a framework for building local-first apps — apps where data lives on the client, syncs instantly between users, and works offline by default. There are no REST APIs to write, no WebSocket plumbing to manage, and no conflict resolution to implement.

In this tutorial, you'll build a real-time collaborative chat app with Vue 3 and Jazz. The app supports text messages, image uploads with progressive loading, anonymous auth with random usernames, and live sync across multiple browser tabs — all in under 300 lines of code.

## What You'll Learn

- Define collaborative data models with Jazz schemas
- Set up Jazz in a Vue 3 application with anonymous auth
- Use `useCoState` and `useAccount` composables for reactive data
- Create, mutate, and read collaborative values
- Upload images with progressive loading and blur placeholders
- Use declarative permissions with `.withPermissions()`

## Prerequisites

- Node.js 20.19+ or 22.12+
- Basic familiarity with Vue 3 Composition API and TypeScript

---

# Installation & Setup

Scaffold a new Vue 3 project with TypeScript and Vue Router:

```bash
npm create vue@latest vue-jazz-chat
cd vue-jazz-chat
```

Install Jazz:

```bash
npm install jazz-tools community-jazz-vue
```

Create a `.env` file in your project root:

```
VITE_JAZZ_KEY=you@example.com
```

During development you can use your email address as the key. For production, get a key from [jazz.tools](https://jazz.tools).

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

---

# Define Your Schema

Instead of designing API endpoints and database tables, you define your data model as collaborative values (CoValues). Jazz handles storage, sync, permissions, and history automatically.

Create `src/schema.ts`:

```typescript
import { co, setDefaultValidationMode } from 'jazz-tools'

setDefaultValidationMode('strict')

export const Message = co
  .map({
    text: co.plainText(),
    image: co.optional(co.image()),
  })
  .resolved({
    text: true,
    image: true,
  })
  .withPermissions({
    onInlineCreate: 'sameAsContainer',
  })
export type Message = co.loaded<typeof Message>

export const Chat = co.list(Message).withPermissions({
  onCreate: (owner) => owner.addMember('everyone', 'writer'),
})
export type Chat = co.loaded<typeof Chat>
```

That's 22 lines. Let's break it down.

### Strict Validation

```typescript
setDefaultValidationMode('strict')
```

Enables runtime validation on all schema fields. Jazz will throw if you try to set a field to an invalid value.

### The Message Schema

```typescript
export const Message = co.map({
  text: co.plainText(),
  image: co.optional(co.image()),
})
```

`co.map({})` defines a collaborative object — like a row in a database. Each instance gets a unique ID, tracks edit history, and syncs across all connected clients.

- **`co.plainText()`** — a collaborative text type that supports concurrent editing. Two users can type in the same field without conflicts.
- **`co.optional(co.image())`** — an optional image field. Jazz handles multi-resolution image uploads, progressive loading, and blur placeholders.

### Eager Resolution

```typescript
  .resolved({
    text: true,
    image: true,
  })
```

`.resolved()` tells Jazz to eagerly load nested fields (`text` and `image`) whenever a `Message` is loaded. Without this, you'd get unresolved reference stubs that require a separate loading step.

### Inline Permissions

```typescript
  .withPermissions({
    onInlineCreate: 'sameAsContainer',
  })
```

When a `Message` is created inline (pushed into a `Chat` list), it automatically inherits the permissions of its parent container. No manual group creation needed.

### The Chat Schema

```typescript
export const Chat = co.list(Message).withPermissions({
  onCreate: (owner) => owner.addMember('everyone', 'writer'),
})
```

`co.list(Message)` defines a collaborative ordered list of `Message` objects. The `.withPermissions()` block runs automatically when a `Chat` is created — it adds `'everyone'` as a `'writer'`, making the chat publicly writable.

This is a key difference from the manual approach. Instead of creating a `Group`, setting members, and passing it as an owner, you declare the permission logic once on the schema and it runs automatically on every `Chat.create()`.

### Type Extraction

```typescript
export type Message = co.loaded<typeof Message>
export type Chat = co.loaded<typeof Chat>
```

`co.loaded<typeof X>` extracts the TypeScript type for a fully loaded CoValue. Use these types in component props and function signatures.

---

# Set Up the Jazz Provider

Jazz needs a provider at the root of your app to initialize the sync connection and user identity.

Create `src/RootApp.vue`:

```vue
<script setup lang="ts">
import { JazzVueProvider } from 'community-jazz-vue'
import type { SyncConfig } from 'jazz-tools'
import App from './App.vue'

const characters = [
  'Luffy',
  'Zoro',
  'Nami',
  'Usopp',
  'Sanji',
  'Chopper',
  'Robin',
  'Franky',
  'Brook',
  'Jinbe',
]

function getRandomUsername() {
  return `Anonymous ${characters[Math.floor(Math.random() * characters.length)]}`
}

const peer =
  `wss://cloud.jazz.tools/?key=${import.meta.env.VITE_JAZZ_KEY ?? 'you@example.com'}` as const
const sync: SyncConfig = { peer }
const defaultProfileName = getRandomUsername()
</script>

<template>
  <JazzVueProvider :sync="sync" :defaultProfileName="defaultProfileName">
    <App />
  </JazzVueProvider>
</template>
```

### What's Happening Here

**`JazzVueProvider`** initializes the Jazz context and makes it available to all child components via Vue's `provide/inject`.

| Prop                 | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `sync`               | WebSocket peer config for Jazz Cloud sync             |
| `defaultProfileName` | Username for anonymous auth (auto-creates an account) |
| `AccountSchema`      | Custom account schema (optional)                      |

**Anonymous auth** — by passing `defaultProfileName`, Jazz automatically creates an anonymous account with that username. No sign-up form needed. Each browser session gets a unique identity. The random One Piece character names make it easy to tell users apart during testing.

> **Bonus:** The actual codebase also registers the Jazz Inspector — a developer tool that lets you browse CoValues in real-time. See `src/RootApp.vue` for the full version with inspector setup.

---

# Entry Point & Routing

### Entry Point

`src/main.ts` mounts `RootApp` (which wraps your app with the Jazz provider):

```typescript
import './assets/main.css'
import { createApp } from 'vue'
import RootApp from './RootApp.vue'
import router from './router'

const app = createApp(RootApp)
app.use(router)
app.mount('#app')
```

### Router

`src/router/index.ts` defines two routes:

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

The `/chat/:chatId` route takes a Jazz CoValue ID as a URL parameter. Setting `props: true` passes `chatId` directly as a component prop — this is how `ChatView` receives the ID of the chat to display.

`ChatView` is lazy-loaded with `() => import(...)` since the user always lands on `HomeView` first.

---

# Creating a Chat (HomeView)

When a user visits the home page, we create a new chat and immediately redirect to it.

`src/views/HomeView.vue`:

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Chat } from '../schema'

const router = useRouter()

onMounted(() => {
  const chat = Chat.create([])
  router.push({ name: 'Chat', params: { chatId: chat.$jazz.id } })
})
</script>

<template>
  <div class="flex flex-1 items-center justify-center" role="status">
    <span class="sr-only">Loading...</span>
    <!-- skeleton placeholder -->
  </div>
</template>
```

### How This Works

```typescript
const chat = Chat.create([])
```

This single line creates a new `Chat` CoValue with an empty message list. Because we defined `.withPermissions({ onCreate: ... })` on the `Chat` schema, the permission setup runs automatically — `'everyone'` is added as a `'writer'`. No manual `Group.create()` needed.

```typescript
router.push({ name: 'Chat', params: { chatId: chat.$jazz.id } })
```

Every CoValue has a unique `$jazz.id`. We use it as a URL parameter so users can share chat links. Navigating to `/chat/co_z1234...` will load that specific chat.

### Contrast with the Manual Approach

Without `.withPermissions()`, you'd need to do this:

```typescript
// Manual approach (NOT used in this app)
const group = Group.create({ owner: currentMe })
group.addMember('everyone', 'writer')
const chat = Chat.create([], { owner: group })
```

The declarative approach is simpler, less error-prone, and keeps permission logic co-located with the schema.

---

# Building the Chat UI (ChatView)

This is the main event — the view where users send and receive messages.

`src/views/ChatView.vue`:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAccount, useCoState, createImage } from 'community-jazz-vue'
import type { ID } from 'jazz-tools'
import { Chat } from '../schema'
import ChatBubble from '../components/chat/ChatBubble.vue'

const INITIAL_MESSAGES_TO_SHOW = 30
const MAX_IMAGE_SIZE_BYTES = 5_000_000

const { chatId } = defineProps<{ chatId: ID<typeof Chat> }>()

const chat = useCoState(Chat, () => chatId, {
  resolve: { $each: { text: true, image: true } },
})
const me = useAccount(undefined, { resolve: { profile: true } })

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

  // Reset file input so re-selecting the same file triggers change
  target.value = ''

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
</script>

<template>
  <template v-if="isLoaded">
    <div class="flex flex-1 flex-col-reverse overflow-y-auto" role="log" aria-label="Chat messages">
      <template v-if="chat?.$isLoaded && chat.length > 0">
        <ChatBubble
          v-for="msg in displayedMessages"
          :key="msg.$jazz.id"
          :msg="msg"
          :me-id="me!.$jazz.id"
        />
      </template>
      <div v-else>Start a conversation below.</div>
      <button v-if="chat?.$isLoaded && chat.length > showNLastMessages" @click="showMore">
        Show more
      </button>
    </div>

    <p v-if="uploadError" role="alert">{{ uploadError }}</p>
    <form @submit.prevent="sendMessage">
      <label>
        <span class="sr-only">Send image</span>
        <input
          type="file"
          accept="image/png, image/jpeg, image/gif"
          class="hidden"
          :disabled="isUploading"
          @change="sendImage"
        />
      </label>
      <input v-model="inputValue" placeholder="Message" maxlength="2048" :disabled="isUploading" />
    </form>
  </template>

  <div v-else>Loading...</div>
</template>
```

There's a lot here. Let's break it into parts.

## Subscribing to Data with `useCoState`

```typescript
const chat = useCoState(Chat, () => chatId, {
  resolve: { $each: { text: true, image: true } },
})
```

`useCoState` is the primary way to read collaborative data in Jazz + Vue. It:

1. **Subscribes** to the CoValue by its ID
2. **Returns a reactive `Ref`** that updates whenever the data changes — locally or from other users
3. **Resolves nested references** based on the `resolve` option

The first argument is the schema, the second is a getter function returning the ID (reactive — Jazz re-subscribes if the ID changes), and the third is the resolve depth.

`{ $each: { text: true, image: true } }` means: "for each message in the list, load the `text` and `image` fields." Without resolving, you'd get unresolved reference stubs.

## Checking Load State with `$isLoaded`

```typescript
const isLoaded = computed(() => chat.value?.$isLoaded && me.value?.$isLoaded)
```

Every CoValue ref has a `$isLoaded` boolean property. Use it directly in templates and computed properties to gate rendering until data is ready.

## Display Logic

```typescript
const displayedMessages = computed(() => {
  const c = chat.value
  if (!c?.$isLoaded) return []
  return c.slice(-showNLastMessages.value).filter(Boolean).toReversed()
})
```

We show the last N messages, filter out any null entries, and reverse the array so the newest message appears at the bottom. The `flex-col-reverse` CSS handles the scroll direction.

## Sending a Text Message

```typescript
function sendMessage() {
  const c = chat.value
  if (!inputValue.value.trim() || !c?.$isLoaded) return
  c.$jazz.push({ text: inputValue.value })
  inputValue.value = ''
}
```

`c.$jazz.push({ text: inputValue.value })` appends a new message to the chat list. Because `Message` has `onInlineCreate: 'sameAsContainer'`, the new message automatically inherits the chat's permissions.

The mutation is **instant locally** and **synced in the background**. Other users subscribed to this chat see the message appear in real-time.

## Uploading Images

```typescript
async function sendImage(event: Event) {
  // ... file validation ...

  const image = await createImage(file, {
    owner: c.$jazz.owner,
    progressive: true,
    placeholder: 'blur',
  })
  c.$jazz.push({ text: file.name, image })
}
```

`createImage()` from `community-jazz-vue` handles image uploads with two key features:

- **`progressive: true`** — generates multiple resolutions. The smallest loads first, then progressively sharper versions replace it.
- **`placeholder: 'blur'`** — creates a tiny blur-hash placeholder that shows instantly while the full image loads.

The image is pushed as part of a message, using the file name as the text.

---

# Displaying Messages (ChatBubble)

`src/components/chat/ChatBubble.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '../../schema'
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
    <BubbleInfo :createdBy="msg.$jazz.createdBy" :createdAt="msg.$jazz.createdAt" />
    <div
      :class="[
        'rounded-2xl overflow-hidden max-w-[calc(100%-5rem)] shadow-sm p-1',
        fromMe ? 'bg-white dark:bg-stone-900 dark:text-white' : 'bg-blue text-white',
      ]"
    >
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

### Key Jazz APIs Used

- **`msg.$jazz.createdBy`** — the account ID of who created this message. Jazz tracks this automatically.
- **`msg.$jazz.createdAt`** — the timestamp when the message was created. No need for a `createdAt` field in your schema.

The `fromMe` computed compares `createdBy` against the current user's ID to align messages left or right — just like any chat app.

The component delegates sender info to `BubbleInfo` and image rendering to `ChatImage`.

---

# Working with User Accounts

## Resolving the Sender (BubbleInfo)

`src/components/chat/BubbleInfo.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useCoState } from 'community-jazz-vue'
import { Account } from 'jazz-tools'

const { createdBy, createdAt } = defineProps<{
  createdBy?: string
  createdAt: number
}>()

const formattedTime = computed(() =>
  new Date(createdAt).toLocaleTimeString('en-US', { hour12: false }),
)

const isoTime = computed(() => new Date(createdAt).toISOString())

const by = useCoState(Account, () => createdBy, {
  resolve: { profile: true },
})
</script>

<template>
  <div class="mb-1.5 h-4 text-xs text-neutral-600">
    <template v-if="by.$isLoaded">
      {{ by.profile?.name }} &middot;
      <time :datetime="isoTime">{{ formattedTime }}</time>
    </template>
  </div>
</template>
```

This demonstrates a powerful pattern: **resolving any account by ID**. `useCoState(Account, () => createdBy, ...)` subscribes to the sender's account and loads their profile. Jazz syncs account data the same way it syncs any other CoValue.

## Editing Your Username (App.vue)

`src/App.vue` shows how to read and update the current user's profile:

```vue
<script setup lang="ts">
import { useAccount, useLogOut } from 'community-jazz-vue'

const me = useAccount(undefined, { resolve: { profile: true } })
const logOut = useLogOut()

function updateName(value: string | undefined) {
  const m = me.value
  if (!m?.$isLoaded) return
  m.profile?.$jazz.set('name', value ?? '')
}
</script>

<template>
  <header v-if="me.$isLoaded">
    <input
      type="text"
      :model-value="me.profile?.name"
      placeholder="Set username"
      @update:model-value="updateName"
    />
    <button @click="logOut">Log out</button>
  </header>
  <main>
    <router-view />
  </main>
</template>
```

### Key Patterns

**`useAccount()`** returns a reactive ref to the current user. With `{ resolve: { profile: true } }`, the user's profile is loaded and reactive.

**`m.profile?.$jazz.set('name', value)`** mutates the profile name. The change is instant locally and syncs to all connected clients. Other users will see the updated name in their `BubbleInfo` components immediately.

**`useLogOut()`** returns a function that signs the user out and clears local credentials.

---

# Image Support (ChatImage)

`src/components/chat/ChatImage.vue`:

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
    class="mb-1 h-auto max-h-80 max-w-full rounded-t-xl object-contain"
    height="original"
    width="original"
  />
</template>
```

The `Image` component from `community-jazz-vue` handles the rendering side of Jazz images:

- It takes an `imageId` and loads the image data from Jazz
- If the image was created with `progressive: true`, it shows the smallest resolution first, then progressively replaces it with sharper versions
- If `placeholder: 'blur'` was used during upload, a blur placeholder appears instantly
- `height="original"` and `width="original"` preserve the image's native dimensions

The upload side (in `ChatView`) and the display side (here) are completely decoupled — any component that has the image ID can display it.

---

# How Real-Time Sync Works

When you mutate a CoValue in Jazz, here's what happens:

1. **Local mutation** — the change is applied instantly to your local state. Your UI updates immediately.
2. **Sync to Jazz Cloud** — the change is sent over WebSocket to Jazz Cloud (or your own sync server).
3. **Broadcast** — Jazz Cloud broadcasts the change to all other clients subscribed to that CoValue.
4. **CRDT merge** — each client applies the incoming change using CRDTs, which guarantee consistency without conflicts.

### CRDTs by Type

| CoValue Type     | Merge Strategy                                        |
| ---------------- | ----------------------------------------------------- |
| `co.map()`       | Last-writer-wins per field                            |
| `co.list()`      | Ordered insertion — concurrent appends don't conflict |
| `co.plainText()` | Character-by-character merge (like Google Docs)       |

### Offline-First by Default

Jazz works offline. When you lose connectivity:

- Mutations are applied locally and queued
- The UI continues to work normally
- When the connection is restored, queued changes sync automatically
- CRDTs ensure consistency even after extended offline periods

### Traditional vs Jazz

| Traditional                         | Jazz                                          |
| ----------------------------------- | --------------------------------------------- |
| Define API endpoints                | Define schemas with `co.map()`                |
| Write CRUD handlers                 | Use `create()`, `$jazz.set()`, `$jazz.push()` |
| Manage WebSocket rooms              | Jazz syncs automatically by CoValue ID        |
| Store `createdAt`, `updatedBy`      | Jazz tracks edit history automatically        |
| Implement access control middleware | Declare permissions with `.withPermissions()` |
| Handle conflict resolution          | CRDTs handle it (no conflicts possible)       |

---

# Next Steps

### Custom Account Schema

For apps that need user-specific data, define a custom account schema:

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

### Passkey Authentication

For persistent user accounts (instead of anonymous sessions), use passkey auth:

```vue
import { JazzVueProvider, PasskeyAuthBasicUI } from 'community-jazz-vue'

<JazzVueProvider :sync="sync">
  <PasskeyAuthBasicUI appName="My App">
    <App />
  </PasskeyAuthBasicUI>
</JazzVueProvider>
```

### Invite Links

Share access to a CoValue via invite links:

```typescript
import { createInviteLink } from 'community-jazz-vue'

const link = createInviteLink(chat, 'writer')
```

### PWA Support

This project includes PWA support via `vite-plugin-pwa`. See `vite.config.ts` for the service worker configuration and `src/components/ReloadPrompt.vue` for the update prompt.

### Jazz Inspector

The Jazz Inspector is a developer tool that lets you browse all CoValues in real-time. It's registered in `src/RootApp.vue` and appears as a floating button in the bottom-left corner.

### Learn More

- [Jazz Documentation](https://jazz.tools/docs)
- [Jazz Discord](https://discord.gg/utDMjHYg42)
- [community-jazz-vue on npm](https://www.npmjs.com/package/community-jazz-vue)

---

## File Structure

```
src/
├── main.ts                         # App entry, mounts RootApp
├── RootApp.vue                     # JazzVueProvider + anonymous auth
├── App.vue                         # App shell with username editing + logout
├── schema.ts                       # Jazz data model (Message, Chat)
├── router/
│   └── index.ts                    # Routes: Home + Chat
├── views/
│   ├── HomeView.vue                # Creates new chat + redirects
│   └── ChatView.vue                # Main chat UI with messages + image upload
└── components/
    └── chat/
        ├── ChatBubble.vue          # Message bubble with alignment
        ├── BubbleInfo.vue          # Sender name + timestamp
        └── ChatImage.vue           # Jazz Image component wrapper
```
