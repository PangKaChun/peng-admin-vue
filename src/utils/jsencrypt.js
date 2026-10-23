import request from '@/utils/request'

const sm2 = require('sm-crypto').sm2;

// 公钥由后端下发
let publicKeyPromise = null

function getPublicKey() {
  if (!publicKeyPromise) {
    publicKeyPromise = request({
      url: '/api-auth/login/public-key',
      method: 'get',
      headers: { isToken: false }
    })
      .then(res => res.publicKey)
      .catch(error => {
        publicKeyPromise = null
        throw error
      })
  }
  return publicKeyPromise
}

// 加密
export async function encrypt(txt) {
  const publicKey = await getPublicKey()
  return '04' + sm2.doEncrypt(txt, publicKey, 1)
}
