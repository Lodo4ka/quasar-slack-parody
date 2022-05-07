import { ActionTree } from 'vuex'
import { StateInterface } from 'src/store'
import { ChatStateInterface } from 'src/store/chat/state'
import { AxiosResponse } from 'axios'
import { Channel, ChannelResponse } from 'src/contracts'
import { api } from 'boot/axios'
import { dummyChannel, getNegativeNotification, getPositiveNotification } from 'src/utils'
import { channelService } from 'src/services'

export const channelsActions: ActionTree<ChatStateInterface, StateInterface> = {
  async getUserChannels ({ commit, dispatch }, channelFromRoute: string): Promise<boolean> {
    try {
      const response: AxiosResponse<Channel[]> = await api.get('/channels')
      const channels = response.data

      if (channelFromRoute) {
        const channelFromRouteFound = channels.find(channel => channel.name === channelFromRoute)
        if (!channelFromRouteFound) {
          console.log('Channel from route not found')
          return false
        }
      }
      commit('SET_CHANNELS', channels)

      for (const channel of channels) {
        commit('SET_CHANNEL_DATA', { channel: channel.name, messages: [], users: [] })
        await channelService.join(channel.name)
      }

      await dispatch('selectChannel',
        channelFromRoute ??
        (channels.length > 0 ? channels[0].name : dummyChannel.name)
      )
    } catch (error) {
      console.error(error)
      return false
    }
    return true
  },
  async createChannelAction ({ commit, dispatch }, channel: { name: string, publicity: boolean }) {
    console.log('createChannelAction', channel)
    commit('LOADING_START')
    try {
      const response = await api.post('/channels', channel)
      const newChannel = response.data
      commit('NEW_CHANNEL', newChannel)
      await channelService.join(newChannel.name)
      await dispatch('selectChannel', newChannel.name)
    } catch (err) {
      commit('LOADING_ERROR', err)
      console.log(err)
      console.log('There was an error creating the channel')
      getNegativeNotification('There was an error creating the channel')
    }
  },
  async joinChannelAction ({ dispatch, commit }, channel: Channel) {
    console.log('joinChannelAction', channel)
    try {
      commit('LOADING_START')
      await channelService.join(channel.name)
      const joinedChannel = await channelService.in(channel.name)?.joinChannel(channel.name)
      commit('NEW_CHANNEL', joinedChannel)
      await dispatch('selectChannel', joinedChannel?.name)
    } catch (err) {
      commit('LOADING_ERROR', err)
      console.log('There was an error joining the channel', err)
      getNegativeNotification('There was an error joining the channel')
    }
  },
  async leaveChannelAction ({ state, dispatch, commit }, { channel, emit = true }:{ channel: string, emit: boolean }) {
    console.log('leaveChannelAction', channel)
    if (emit) {
      await channelService.in(channel)?.leaveChannel(channel)
    }
    await channelService.in(channel)?.typing('')
    if (channelService.leave(channel)) {
      commit('CLEAR_CHANNEL', channel)
      if (state.selectedChannel === channel) {
        await dispatch('selectChannel', state.channels.length > 0 ? state.channels[0].name : dummyChannel.name)
      }
    } else {
      console.log('There was an error leaving the channel')
      getNegativeNotification('There was an error leaving the channel')
    }
  },
  async selectChannel ({ state, commit, getters, dispatch }, channel: string) {
    if (state.channels.length === 0) {
      console.log('SELECT: No channels found, selecting a dummy channel')
      commit('SET_SELECTED_CHANNEL', '')
      commit('SET_CHANNEL_DATA', {
        name: dummyChannel.name,
        channel: [],
        users: []
      })
      return
    }
    if (!channel) {
      return
    }
    await channelService.in(state.selectedChannel!)?.typing('')
    try {
      commit('LOADING_START')
      const channelResponse: ChannelResponse = (await api.get(`/channels/${channel}`)).data
      const wasInvitedToThisChannel = getters.drawerChannels.invitedChannels.find(
        (c: Channel) => c.name === channel
      ) !== undefined
      if (wasInvitedToThisChannel) {
        console.log('SELECT: Accepting invite to channel')
        dispatch('confirmChannelInviteAction', channelResponse)
      }
      const users = channelResponse.users
      const msgPagination = await api.get(`/channels/${channel}/messages`)
        .then((response) => response.data)
      const messages = msgPagination.data.reverse()
      const msgMeta = msgPagination.meta
      commit('SET_CHANNEL_DATA', { channel, messages, users })
      commit('RESET_PAGE')
      commit('SET_HAS_MORE_PAGES', msgMeta.next_page_url != null)
      commit('SET_SELECTED_CHANNEL', channel)
    } catch (err) {
      commit('LOADING_ERROR', err)
      console.log(err)
      console.log('There was an error fetching the channel')
      getNegativeNotification('There was an error fetching the channel')
    }
  },

  async confirmChannelInviteAction ({ commit }, channel: Channel) {
    // send axios api post request to confirm invite.
    console.log('confirmChannelInviteAction', channel)
    try {
      await api.post(`/channels/${channel.name}/acceptInvite`)
      commit('SET_CHANNEL_JOINED_AT', channel.name)
      getPositiveNotification(`You have joined ${channel.name}`)
    } catch (e) {
      console.log(e)
      getNegativeNotification('Something went wrong. :(')
    }
  },

  async showNewInviteAction ({ commit }, channel: ChannelResponse) {
    console.log('showNewInviteAction', channel)
    if (!channelService.in(channel.name)) {
      getPositiveNotification('You have been invited to ' + channel.name)
      await channelService.join(channel.name)
      // first data is axios, second data is something that server returned
      const messages = api.get(`/channels/${channel.name}/messages`)
        .then((response) => response.data.data.reverse())
      commit('NEW_INVITE', channel)
      commit('SET_CHANNEL_DATA', { channel: channel.name, messages, users: channel.users })
    }
  },

  async leaveSockets ({ getters, commit }, { channel, clearChannelData = true }: {channel: string | null, clearChannelData?: boolean}) {
    const leaving: string[] = channel !== null ? [channel] : getters.joinedChannels
    for (const c of leaving) {
      console.log('leaving', c)
      channelService.leave(c)
      if (clearChannelData) {
        commit('CLEAR_CHANNEL', c)
      }
    }
  }
}
