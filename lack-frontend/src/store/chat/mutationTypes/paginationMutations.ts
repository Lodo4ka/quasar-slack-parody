import { MutationTree } from 'vuex'
import { ChatStateInterface } from 'src/store/chat/state'

export const paginationMutations: MutationTree<ChatStateInterface> = {
  SET_HAS_MORE_PAGES (state, hasMorePages: boolean) {
    state.hasMorePages = hasMorePages
  },
  INCREMENT_PAGE (state) {
    state.page++
  },
  RESET_PAGE (state) {
    state.page = 2
    state.paginationBeforeDate = new Date()
  }
}
