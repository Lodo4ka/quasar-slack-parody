import { inject } from '@adonisjs/core/build/standalone'
import { ChannelRepositoryContract } from '@ioc:Repositories/ChannelRepository'
import { WsContextContract } from '@ioc:Ruby184/Socket.IO/WsContext'
import { UserRepositoryContract } from '@ioc:Repositories/UserRepository'
import { KickRepositoryContract } from '@ioc:Repositories/KickRepository'
import { checkForErrors } from 'App/Helpers'

@inject([
  'Repositories/ChannelRepository',
  'Repositories/UserRepository',
  'Repositories/KickRepository',
])
export default class ChannelController {
  constructor(
    private channelRepository: ChannelRepositoryContract,
    private userRepository: UserRepositoryContract,
    private kickRepository: KickRepositoryContract
  ) {}

  public async addUser({ params, auth, socket }: WsContextContract) {
    const user = auth.user!
    const channel = await this.channelRepository.findByName(params.name)
    const error = checkForErrors(
      {
        channelShouldBePublic: true,
        userShouldNotBeInChannel: true,
      },
      { channel, user }
    )
    if (error) {
      return { error: error }
    }
    await this.channelRepository.attachUser(user, channel)
    await this.channelRepository.updateJoinedAt(user, channel)
    socket.broadcast.emit('userJoined', user)
    return channel
  }

  public async removeUser({ params, auth, socket }: WsContextContract) {
    const channelName = params.name
    const user = auth.user!
    const channel = await this.channelRepository.findByName(channelName)
    if (channel.adminId === user.id) {
      await this.channelRepository.delete(channel)
      socket.nsp.emit('channelDeleted', channel.name)
    } else {
      await this.channelRepository.detachUser(user, channel)
      socket.broadcast.emit('userLeft', user)
    }
  }

  public async deleteChannel({ auth, params, socket }: WsContextContract) {
    const channelName = params.name
    const user = auth.user!
    const channel = await this.channelRepository.findByName(channelName)
    const errParams = {
      userShouldBeAdmin: true,
    }
    const error = checkForErrors(errParams, {
      channel,
      user,
    })
    if (error) {
      return { error: error }
    }
    await this.channelRepository.delete(channel)
    socket.nsp.emit('channelDeleted', channel.name)
  }

  public async inviteUser(
    { auth, socket }: WsContextContract,
    channelParam: string,
    userParam: string
  ) {
    const channel = await this.channelRepository.findByName(channelParam)
    const userToGetInvited = await this.userRepository.findByNickname(userParam)
    const error = checkForErrors(
      {
        userShouldExist: true,
        userShouldNotBeInChannel: true,
      },
      {
        channel: channel,
        user: userToGetInvited,
      }
    )
    if (error) {
      return { error: error }
    }
    const isUserAdmin = channel.adminId === auth.user!.id

    if (!isUserAdmin && !channel.isPublic) {
      return { error: 'You are not admin of this channel.' }
    }

    const kickCount = await this.kickRepository.countUserKicks(
      userToGetInvited!.id,
      channel.id
    )
    if (!isUserAdmin) {
      if (kickCount > 2) {
        return {
          error: 'This user is banned from this channel',
        }
      }
    } else {
      await this.kickRepository.deleteAllByUserIdAndChannelId(
        userToGetInvited!.id,
        channel.id
      )
    }

    await this.channelRepository.attachUser(userToGetInvited!, channel)
    socket.broadcast.emit('newInvite', userToGetInvited, channel)
    socket.nsp.emit('invitedUserJoined', userToGetInvited, channel)
    return {
      success: true,
    }
  }

  public async kickUser(
    { auth, socket, params }: WsContextContract,
    userParam: string,
    isRevoke: boolean
  ) {
    const kicker = auth.user!
    const channel = await this.channelRepository.findByName(params.name)
    const userToKick = await this.userRepository.findByNickname(userParam)

    const error = checkForErrors(
      {
        userShouldExist: true,
        userShouldBeInChannel: true,
      },
      {
        channel: channel,
        user: userToKick,
      }
    )
    if (error) {
      return { error: error }
    }
    if (channel.adminId === userToKick!.id) {
      return {
        error: 'You cannot kick admin.',
      }
    }
    if (userToKick!.id === kicker.id) {
      return {
        error: 'You can not kick yourself.',
      }
    }
    if ((isRevoke || !channel.isPublic) && channel.adminId !== kicker.id) {
      return {
        error: 'You are not admin of this channel.',
      }
    }

    if (channel.adminId === kicker.id) {
      const kickCount = await this.kickRepository.countUserKicks(
        userToKick!.id,
        channel.id
      )
      if (!isRevoke) {
        for (let i = kickCount; i < 3; i++) {
          await this.kickRepository.create(
            kicker.id,
            userToKick!.id,
            channel.id
          )
        }
      }
    } else {
      const wasAlreadyKicked = await this.kickRepository.findByTriple(
        kicker.id,
        userToKick!.id,
        channel.id
      )
      if (wasAlreadyKicked) {
        return {
          error: 'You have already kicked this user once.',
        }
      }
      await this.kickRepository.create(kicker.id, userToKick!.id, channel.id)
    }
    await this.channelRepository.detachUser(userToKick!, channel)
    socket.nsp.emit('userKick', userToKick)
    return {
      success: true,
    }
  }

  public async typing(
    { params, auth, socket }: WsContextContract,
    message: string
  ) {
    socket.broadcast.emit('typing', {
      user: auth.user!.nickname,
      channel: params.name,
      content: message,
    })
  }
}
