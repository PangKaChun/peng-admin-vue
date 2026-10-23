/**
 * @param {string} path
 * @returns {Boolean}
 */
export function isExternal(path) {
  return /^(https?:|mailto:|tel:)/.test(path)
}

/**
 * @param {string} str
 * @returns {Boolean}
 */
export function validUsername(str) {
  const valid_map = ['admin', 'editor']
  return valid_map.indexOf(str.trim()) >= 0
}

/**
 * @param {string} url
 * @returns {Boolean}
 */
export function validURL(url) {
  const reg = /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/
  return reg.test(url)
}

/**
 * @param {string} str
 * @returns {Boolean}
 */
export function validLowerCase(str) {
  const reg = /^[a-z]+$/
  return reg.test(str)
}

/**
 * @param {string} str
 * @returns {Boolean}
 */
export function validUpperCase(str) {
  const reg = /^[A-Z]+$/
  return reg.test(str)
}

/**
 * @param {string} str
 * @returns {Boolean}
 */
export function validAlphabets(str) {
  const reg = /^[A-Za-z]+$/
  return reg.test(str)
}

// 接口未返回前的口令策略,与后端默认值一致
export const DEFAULT_PASSWORD_POLICY = { minLength: 8, maxLength: 20, minCharTypes: 3, expireDays: 90 }

/**
 * 口令规则提示
 * @param {Object} policy
 * @returns {string}
 */
export function formatPasswordRule(policy) {
  return `${policy.minLength}-${policy.maxLength} 位，至少包含大写字母、小写字母、数字、特殊字符中的 ${policy.minCharTypes} 种`
}

/**
 * 口令复杂度，与后端保持一致
 * @param {string} str
 * @param {Object} policy
 * @returns {Boolean}
 */
export function validPassword(str, policy) {
  if (!str || str.length < policy.minLength || str.length > policy.maxLength || !/^[\x21-\x7e]+$/.test(str)) {
    return false
  }
  const types = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(reg => reg.test(str)).length
  return types >= policy.minCharTypes
}

/**
 * el-form 新密码校验规则
 * @param {Function} getPolicy 返回当前口令策略
 * @returns {Object}
 */
export function newPasswordRule(getPolicy) {
  return {
    validator: (rule, value, callback) => {
      const policy = getPolicy()
      if (!value) {
        callback(new Error('请输入新密码'))
      } else if (!validPassword(value, policy)) {
        callback(new Error(formatPasswordRule(policy)))
      } else {
        callback()
      }
    },
    trigger: 'blur'
  }
}

/**
 * @param {string} email
 * @returns {Boolean}
 */
export function validEmail(email) {
  const reg = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return reg.test(email)
}

/**
 * @param {string} str
 * @returns {Boolean}
 */
export function isString(str) {
  if (typeof str === 'string' || str instanceof String) {
    return true
  }
  return false
}

/**
 * @param {Array} arg
 * @returns {Boolean}
 */
export function isArray(arg) {
  if (typeof Array.isArray === 'undefined') {
    return Object.prototype.toString.call(arg) === '[object Array]'
  }
  return Array.isArray(arg)
}
