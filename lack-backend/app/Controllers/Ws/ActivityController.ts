import type { WsContextContract } from '@ioc:Ruby184/Socket.IO/WsContext'
import User from 'App/Models/User'

export default class ActivityController {
  private getUserRoom(user: User): string {
    return `user:${user.id}`
  }

  public async onConnected({ socket, auth }: WsContextContract) {
    const room = this.getUserRoom(auth.user!)
    const userSockets = await socket.in(room).allSockets()

    if (userSockets.size === 0) {
      socket.broadcast.emit('user:ONLINE', auth.user)
    }

    socket.join(room)
    socket.data.userId = auth.user!.id

    const allSockets = await socket.nsp.except(room).fetchSockets()
    const onlineIds = new Set<number>()

    for (const remoteSocket of allSockets) {
      onlineIds.add(remoteSocket.data.userId)
    }

    const onlineUsers = await User.findMany([...onlineIds])
    socket.emit('user:list', onlineUsers)
  }

  public async onDisconnected({ socket, auth }: WsContextContract) {
    const room = this.getUserRoom(auth.user!)
    const userSockets = await socket.in(room).allSockets()

    if (userSockets.size === 0) {
      socket.broadcast.emit('user:OFFLINE', auth.user)
    }
  }

  public async changeStatus(
    { socket, auth }: WsContextContract,
    status: string
  ) {
    socket.broadcast.emit(`user:${status}`, auth.user)
  }
}
