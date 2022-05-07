import { boot } from 'quasar/wrappers'
import { authManager } from 'src/services'
import { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean,
    guestOnly?: boolean
  }
}

const loginRoute = (from: RouteLocationNormalized): RouteLocationRaw => {
  return {
    name: 'login',
    query: { redirect: from.fullPath }
  }
}

export default boot(({ router, store }) => {
  authManager.onLogout(() => {
    void router.push(loginRoute(router.currentRoute.value))
  })

  router.beforeEach(async (to) => {
    const isAuthenticated = await store.dispatch('auth/check') as boolean

    if (to.meta.requiresAuth && !isAuthenticated) {
      return loginRoute(to)
    }

    if (to.meta.guestOnly && isAuthenticated) {
      return { name: 'home' }
    }
  })
})
