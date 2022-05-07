import { GetterTree } from 'vuex'
import { StateInterface } from '../index'
import { ChatStateInterface } from './state'
import { Channel } from 'src/contracts'

const getters: GetterTree<ChatStateInterface, StateInterface> = {
  joinedChannels (context) {
    return context.channels.map(channel => channel.name)
  },
  currentUsers (context) {
    return context.selectedChannel !== null ? context.users[context.selectedChannel] : []
  },
  currentMessages (context) {
    return context.selectedChannel !== null ? context.messages[context.selectedChannel] : []
  },
  lastMessageOf (context) {
    return (channel: string) => {
      const messages = context.messages[channel]
      return messages.length > 0 ? messages[messages.length - 1] : null
    }
  },

  drawerChannels (context) {
    const invitedChannels: Channel[] = []
    const nonInvitedChannels: Channel[] = []
    context.channels.forEach(channel => {
      if (channel.joinedAt) {
        nonInvitedChannels.push(channel)
      } else {
        invitedChannels.push(channel)
      }
    })
    return {
      invitedChannels,
      nonInvitedChannels
    }
  },

  currentlyTypedMessages (context) {
    if (context.selectedChannel && context.selectedChannel in context.currentlyTypedMessages) {
      const typedMessagesInSelectedChannel = context.currentlyTypedMessages[context.selectedChannel]
      const transformedMessages = Object.entries(typedMessagesInSelectedChannel)
      return transformedMessages.filter(([, message]) => message.length > 0)
    }
    return []
  }

}

export default getters
