const state = {
  title: ''
}

const mutations = {
  SET_TITLE: (state, title) => {
    state.title = title
  }
}

const actions = {
  setTitle({ commit }, title) {
    commit('SET_TITLE', title)
    const base = process.env.VUE_APP_TITLE || 'PENG ADMIN'
    document.title = title ? `${title} - ${base}` : base
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
