import { sm3 } from 'sm-crypto'

// 后端当前难度为 15，保持前后端一致
const MAX_DIFFICULTY = 15

// 每个计算时间片最多占用主线程约 6ms
const SLICE_BUDGET_MS = 6

// 每计算 64 次检查一次时间，避免每次哈希都调用计时器
const CHECK_INTERVAL = 64

const now = () =>
  typeof performance !== 'undefined'
    ? performance.now()
    : Date.now()

/**
 * 判断 SM3 摘要是否满足前导零位数要求。
 *
 * 不再计算完整的前导零位数，只判断是否满足目标难度。
 *
 * @param {string} hex SM3 十六进制摘要
 * @param {number} difficulty 目标前导零位数
 * @returns {boolean}
 */
function meetsDifficulty(hex, difficulty) {
  // 完整的零十六进制位数量
  const fullNibbles = difficulty >>> 2

  // 直接检查完整的零位，避免 parseInt 和 Math.clz32
  for (let i = 0; i < fullNibbles; i++) {
    if (hex.charCodeAt(i) !== 48) {
      return false
    }
  }

  // 剩余不足一个十六进制位的零比特
  const remainingBits = difficulty & 3

  if (remainingBits === 0) {
    return true
  }

  const code = hex.charCodeAt(fullNibbles)

  // 支持数字、大小写十六进制字母
  const nibble = code <= 57
    ? code - 48
    : (code | 32) - 87

  return nibble < (1 << (4 - remainingBits))
}

/**
 * 求解工作量证明。
 *
 * 找到 nonce，使 SM3(token + ':' + nonce)
 * 的前导零位数不少于 difficulty。
 *
 * 分时计算，避免长时间占用主线程。
 *
 * @param {string} token 挑战令牌
 * @param {number} difficulty 前导零位数
 * @returns {Promise<number>} nonce
 */
export function solvePow(token, difficulty) {
  const parsed = Number(difficulty)

  // 保留原有的缺省难度处理，同时确保难度是整数
  const target = Math.max(0, Math.ceil(parsed || 0))

  // 超出后端约定范围时直接报错，避免生成无法通过验证的 nonce
  if (target > MAX_DIFFICULTY) {
    return Promise.reject(
      new RangeError(`Unsupported PoW difficulty: ${target}`)
    )
  }

  // 难度为 0，不需要进行哈希计算
  if (target === 0) {
    return Promise.resolve(0)
  }

  // 提前构造固定前缀，减少循环中的模板字符串处理
  const prefix = `${token}:`

  return new Promise(resolve => {
    let nonce = 0

    const step = () => {
      const startTime = now()
      let count = 0

      while (true) {
        const currentNonce = nonce++

        // 执行 SM3 计算
        const hash = sm3(prefix + currentNonce)

        // 直接判断是否满足目标难度
        if (meetsDifficulty(hash, target)) {
          resolve(currentNonce)
          return
        }

        count++

        // 每 64 次检查一次时间预算
        if (
          (count & (CHECK_INTERVAL - 1)) === 0 &&
          now() - startTime >= SLICE_BUDGET_MS
        ) {
          // 让出主线程，允许浏览器处理鼠标、渲染等任务
          setTimeout(step, 0)
          return
        }
      }
    }

    step()
  })
}