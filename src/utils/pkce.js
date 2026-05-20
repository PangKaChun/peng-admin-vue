// PKCE 工具：authorization_code + PKCE 流程中的 code_verifier / code_challenge / state 生成
// 仅依赖浏览器原生 Web Crypto API（crypto.getRandomValues、crypto.subtle.digest）

const VERIFIER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

function randomString(length, alphabet) {
  const buf = new Uint8Array(length)
  window.crypto.getRandomValues(buf)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += alphabet[buf[i] % alphabet.length]
  }
  return out
}

function base64UrlEncode(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  let str = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i])
  }
  return window.btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// 生成 code_verifier：64 字符随机串，字符集严格符合 RFC 7636
export function generateCodeVerifier() {
  return randomString(64, VERIFIER_ALPHABET)
}

// 生成 code_challenge：base64url(SHA-256(code_verifier))
export async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

// 生成 state：32 字符 CSRF token
export function generateState() {
  return randomString(32, VERIFIER_ALPHABET)
}
