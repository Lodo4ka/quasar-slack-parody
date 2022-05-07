import { boot } from 'quasar/wrappers'
import axios, { AxiosInstance } from 'axios'
import { authManager } from 'src/services'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance
    $api: AxiosInstance
  }
}

const api = axios.create({
  baseURL: process.env.API_URL,
  withCredentials: true,
  headers: {}
})

const DEBUG = process.env.NODE_ENV === 'development'

api.interceptors.request.use(
  (config) => {
    const token = authManager.getToken()

    if (token !== null) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (DEBUG) {
      console.info('-> ', config)
    }

    return config
  },
  (error) => {
    if (DEBUG) {
      console.error('-> ', error)
    }

    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    if (DEBUG) {
      console.info('<- ', response)
    }

    return response
  },
  (error) => {
    if (DEBUG) {
      console.error('<- ', error.response)
    }

    if (error.response.status === 401 && !error.response.config.dontTriggerLogout) {
      authManager.logout()
    }

    return Promise.reject(error)
  }
)

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
