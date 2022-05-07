import { boot } from 'quasar/wrappers'
import { Manager } from 'socket.io-client'
import { SocketManager } from 'src/services/SocketManager'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $io: Manager
  }
}

const io = SocketManager.createManager(process.env.API_URL)

export default boot((params) => {
  params.app.config.globalProperties.$io = io
  SocketManager.boot(params)
})

export { io }
