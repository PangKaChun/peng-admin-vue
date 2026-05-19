const sm2 = require('sm-crypto').sm2;

const publicKey = '04d0e9fd98c8ba87e2eafe0106f4683779e10cb0f89f603ee1eae3b730d798129bdce6a8cccc0b6506d014ea59cb662fec29bff1ac8ba7b4fc104665379538f22b'

// 加密
export function encrypt(txt) {
  let encryptStr = sm2.doEncrypt(txt, publicKey, 1) // 加密结果
  return '04' + encryptStr; // 对数据进行加密
}