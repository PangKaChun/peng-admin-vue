import { logout, getInfo, exchangeCodeForToken, buildAuthorizeUrl, buildRedirectUri, precheck, verifyMfa } from '@/api/login'
import { getToken, setToken, removeToken, getRefreshToken, setRefreshToken, removeRefreshToken } from '@/utils/auth'
import { generateCodeVerifier, generateCodeChallenge, generateState } from '@/utils/pkce'
import router from '@/router'

const PKCE_VERIFIER_KEY = 'pkce_verifier'
const PKCE_STATE_KEY = 'pkce_state'
const OAUTH_REDIRECT_KEY = 'oauth_redirect_uri'

function appendHiddenInput(form, name, value) {
  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = name
  input.value = value == null ? '' : String(value)
  form.appendChild(input)
}

const user = {
  namespaced: true,

  state: {
    token: getToken(),
    refreshToken: getRefreshToken(),
    name: '',
    avatar: '',
    roles: [],
    permissions: [],
    userInfo: {}
  },

  mutations: {
    SET_TOKEN: (state, token) => {
      state.token = token
    },
    SET_REFRESH_TOKEN: (state, refreshToken) => {
      state.refreshToken = refreshToken
    },
    SET_NAME: (state, name) => {
      state.name = name
    },
    SET_AVATAR: (state, avatar) => {
      state.avatar = avatar
    },
    SET_ROLES: (state, roles) => {
      state.roles = roles
    },
    SET_PERMISSIONS: (state, permissions) => {
      state.permissions = permissions
    },
    SET_USER_INFO: (state, userInfo) => {
      state.userInfo = userInfo
    }
  },

  actions: {
    // 两步登录第一步：预校验账号密码 + 人机验证
    Precheck(_ctx, userInfo) {
      return new Promise((resolve, reject) => {
        precheck((userInfo.username || '').trim(), userInfo.password, userInfo.randomCode, userInfo.captcha, userInfo.sliderToken)
          .then(data => {
            resolve(data || {})
          })
          .catch(error => {
            reject(error)
          })
      })
    },

    // 两步登录第二步：校验 Google Authenticator 动态口令
    VerifyMfa(_ctx, { ticket, code }) {
      return new Promise((resolve, reject) => {
        verifyMfa(ticket, code)
          .then(() => {
            resolve()
          })
          .catch(error => {
            reject(error)
          })
      })
    },

    // authorization_code + PKCE：凭挑战票据完成发码
    async AuthorizeWithPKCE(_ctx, { ticket }) {
      try {
        const verifier = generateCodeVerifier()
        const challenge = await generateCodeChallenge(verifier)
        const state = generateState()
        const redirectAfterLogin =
          (router.currentRoute && router.currentRoute.query && router.currentRoute.query.redirect) || '/'

        sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
        sessionStorage.setItem(PKCE_STATE_KEY, state)
        sessionStorage.setItem(OAUTH_REDIRECT_KEY, redirectAfterLogin)

        const form = document.createElement('form')
        form.method = 'POST'
        form.action = buildAuthorizeUrl()
        form.style.display = 'none'

        appendHiddenInput(form, 'response_type', 'code')
        appendHiddenInput(form, 'client_id', process.env.VUE_APP_OAUTH_CLIENT_ID)
        appendHiddenInput(form, 'redirect_uri', buildRedirectUri())
        appendHiddenInput(form, 'scope', process.env.VUE_APP_OAUTH_SCOPE)
        appendHiddenInput(form, 'state', state)
        appendHiddenInput(form, 'code_challenge', challenge)
        appendHiddenInput(form, 'code_challenge_method', 'S256')
        appendHiddenInput(form, 'loginTicket', ticket)

        document.body.appendChild(form)
        form.submit()
      } catch (e) {
        console.error('AuthorizeWithPKCE error:', e)
        sessionStorage.removeItem(PKCE_VERIFIER_KEY)
        sessionStorage.removeItem(PKCE_STATE_KEY)
        sessionStorage.removeItem(OAUTH_REDIRECT_KEY)
        throw e
      }
    },

    // PKCE 回调换 token
    ExchangeCodeForToken({ commit }, { code, codeVerifier }) {
      return new Promise((resolve, reject) => {
        exchangeCodeForToken({ code, codeVerifier })
          .then(res => {
            const token = res.data && res.data.access_token
            if (!token) {
              reject(new Error('换取访问令牌缺少 access_token'))
              return
            }
            commit('SET_TOKEN', token)
            setToken(token)
            const refresh = res.data && res.data.refresh_token
            if (refresh) {
              commit('SET_REFRESH_TOKEN', refresh)
              setRefreshToken(refresh)
            }
            sessionStorage.removeItem(PKCE_VERIFIER_KEY)
            sessionStorage.removeItem(PKCE_STATE_KEY)
            resolve(res)
          })
          .catch(error => {
            reject(error)
          })
      })
    },

    // 获取用户信息
    GetInfo({ commit }) {
      return new Promise((resolve, reject) => {
        getInfo()
          .then(res => {
            const { user, casUser, roles, permissions } = res
            const avatar =
              user.avatar === '' || user.avatar == null
                ? require('@/assets/images/preview.png')
                : process.env.VUE_APP_BASE_API + user.avatar
            if (roles && roles.length > 0) {
              commit('SET_ROLES', roles)
              commit('SET_PERMISSIONS', permissions)
            } else {
              commit('SET_ROLES', ['ROLE_DEFAULT'])
            }
            commit('SET_USER_INFO', Object.assign(user, casUser))
            commit('SET_NAME', user.username)
            commit('SET_AVATAR', avatar)
            resolve(res)
          })
          .catch(error => {
            reject(error)
          })
      })
    },

    // 退出系统
    LogOut({ commit }) {
      return logout()
        .catch(() => {})
        .finally(() => {
          commit('SET_TOKEN', '')
          commit('SET_REFRESH_TOKEN', '')
          commit('SET_ROLES', [])
          commit('SET_PERMISSIONS', [])
          commit('SET_USER_INFO', {})
          commit('SET_NAME', '')
          commit('SET_AVATAR', '')
          removeToken()
          removeRefreshToken()
        })
    },

    setToken({ commit }, token) {
      commit('SET_TOKEN', token)
    },

    setRefreshToken({ commit }, refreshToken) {
      commit('SET_REFRESH_TOKEN', refreshToken)
    }
  }
}

export default user
