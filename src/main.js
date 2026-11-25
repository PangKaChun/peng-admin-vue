import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementUI from 'element-ui'
import './assets/styles/element-variables.scss'
import './assets/styles/index.scss'

import directive from './directive'
import plugins from './plugins'
import './assets/icons'
import './permission'

import DictTag from '@/components/DictTag'
import DictData from '@/components/DictData'
import FluentIcon from '@/components/FluentIcon'
import Pagination from '@/components/Pagination'

import {
  parseTime,
  resetForm,
  addDateRange,
  handleTree
} from '@/utils/common'

Vue.prototype.addDateRange = addDateRange
Vue.prototype.resetForm = resetForm
Vue.prototype.handleTree = handleTree
Vue.prototype.parseTime = parseTime

Vue.component('DictTag', DictTag)
Vue.component('Pagination', Pagination)
Vue.component('FluentIcon', FluentIcon)

Vue.use(directive)
Vue.use(plugins)

ElementUI.Dialog.props.closeOnClickModal.default = false
Vue.use(ElementUI, { size: 'small' })
DictData.install()

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
