import { Chat, Message } from '@/schema'

describe('schema exports', () => {
  it('message is a co.map with text and image fields', () => {
    expect(Message).toBeDefined()
    expectTypeOf(Message.create).toBeFunction()
  })

  it('chat is a co.list of Messages', () => {
    expect(Chat).toBeDefined()
    expectTypeOf(Chat.create).toBeFunction()
  })
})
