import { co, z, setDefaultValidationMode } from 'jazz-tools'

setDefaultValidationMode('strict')

export const Message = co
  .map({
    text: z.string(),
    image: co.optional(co.image()),
  })
  .resolved({
    image: true,
  })
  // Reuse the Chat's owner group instead of creating a new group per message.
  // This avoids a chain of group extensions that would slow down loading.
  .withPermissions({
    onInlineCreate: 'sameAsContainer',
  })
export type Message = co.loaded<typeof Message>

export const Chat = co.list(Message).withPermissions({
  onCreate: (owner) => owner.addMember('everyone', 'writer'),
})
export type Chat = co.loaded<typeof Chat>
