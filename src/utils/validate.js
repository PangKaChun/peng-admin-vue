/**
 * 校验是否为外部链接
 * @param {string} path
 * @returns {boolean}
 */
export function isExternal(path) {
  return /^(https?:|mailto:|tel:)/.test(path)
}

// 接口未返回前的口令策略，与后端默认值一致
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
 * @returns {boolean}
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
