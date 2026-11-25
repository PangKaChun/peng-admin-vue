import router from './router'
import store from './store'
import { Message } from 'element-ui'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { getToken } from '@/utils/auth'
import { isRelogin } from '@/utils/request'

NProgress.configure({ showSpinner: false })

const whiteList = ['/login', '/oauth/callback']

router.beforeEach((to, from, next) => {
  NProgress.start()
  store.dispatch('settings/setTitle', to.meta && to.meta.title ? to.meta.title : '')
  if (getToken()) {
    if (to.path === '/login' || to.path === '/oauth/callback') {
      next({ path: '/' })
      NProgress.done()
    } else if (store.getters.roles.length === 0) {
      isRelogin.show = true
      store.dispatch('user/GetInfo').then(() => {
        isRelogin.show = false
        return store.dispatch('GenerateRoutes').then(accessRoutes => {
          accessRoutes.forEach(route => {
            router.addRoute(route)
          })
          next({ ...to, replace: true })
        })
      }).catch(err => {
        isRelogin.show = false
        store.dispatch('user/LogOut').finally(() => {
          const msg = typeof err === 'string' ? err : (err && err.message)
          if (msg && !(err && err.response)) {
            Message.error(msg)
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
    next(`/login?redirect=${to.fullPath}`)
    NProgress.done()
  }
})

router.afterEach(() => {
  NProgress.done()
})
