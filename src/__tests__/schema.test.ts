import { Chat, Message } from '../schema'

describe('schema exports', () => {
  it('message is defined', () => {
    expect(Message).toBeDefined()
  })

  it('chat is defined', () => {
    expect(Chat).toBeDefined()
  })
})
