import type { WsContextContract } from '@ioc:Ruby184/Socket.IO/WsContext'
import type { MessageRepositoryContract } from '@ioc:Repositories/MessageRepository'
import { inject } from '@adonisjs/core/build/standalone'

@inject(['Repositories/MessageRepository'])
export default class MessageController {
  constructor(private messageRepository: MessageRepositoryContract) {}

  public async addMessage(
    { params, socket, auth }: WsContextContract,
    content: string
  ) {
    const message = await this.messageRepository.create(
      params.name,
      auth.user!.id,
      content
    )
    socket.broadcast.emit('message', message)
    return message
  }
}
