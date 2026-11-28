import router from './router'
import store from './store'
import { Message } from 'element-ui'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { getToken } from '@/utils/auth'
import { isRelogin } from '@/utils/request'

NProgress.configure({ showSpinner: false })

const whiteList = ['/login', '/oauth/callback']
let sessionRestored = false

router.beforeEach(async (to, from, next) => {
  NProgress.start()
  store.dispatch('settings/setTitle', to.meta && to.meta.title ? to.meta.title : '')
  // 内存令牌随页面刷新丢失，首次导航用 HttpOnly Cookie 静默续期一次
  if (!getToken() && !sessionRestored && to.path !== '/oauth/callback') {
    sessionRestored = true
    await store.dispatch('user/RefreshToken').catch(() => {})
  }
  if (getToken()) {
    if (to.path === '/login' || to.path === '/oauth/callback') {
      next({ path: '/' })
      NProgress.done()
    } else if (store.getters.roles.length === 0) {
      isRelogin.show = true
      store.dispatch('user/GetInfo').then(() => {
        return store.dispatch('GenerateRoutes').then(accessRoutes => {
          accessRoutes.forEach(route => {
            router.addRoute(route)
          })
          isRelogin.show = false
          next({ ...to, replace: true })
        })
      }).catch(err => {
        store.dispatch('user/LogOut').finally(() => {
          isRelogin.show = false
          if (typeof err === 'string' && err) {
            Message.error(err)
          }
          next({ path: '/login' })
          NProgress.done()
        })
      })
    } else {
      next()
    }
  } else if (whiteList.indexOf(to.path) !== -1) {
    next()
  } else {
    next({ path: '/login', query: { redirect: to.fullPath } })
    NProgress.done()
  }
})

router.afterEach(() => {
  NProgress.done()
})
