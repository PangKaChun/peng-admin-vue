/** element Form 正则二次封装
 * @param {*} rule 正则校验
 * @param {*} message 默认信息
 * @param {*} text 正则校验不通过信息
 * @param {*} trigger 默认事件
 * @param {*} ruleTrigger  正则校验事件
 * @returns
 * 已挂载到全局 使用请 在data() return上面 插入一条    let valiDators = this.$valiDators();
 * 后续在return中 可以直接用、 例子
 * phone: valiDators.valiRulePhone(
 *          "手机号码不能为空",
 *          "手机号码格式有误",
 *          "blur",
 *          "blur"
 *       ),
 */
class valiDator {
  // 自定义校验正则表达式
  valiRule(rule, message, text, trigger, ruleTrigger) {
    return [
      { required: true, message: text, trigger: trigger },
      {
        pattern: rule,
        message: message,
        trigger: ruleTrigger,
      },
    ];
  }
  // 默认校验规则
  valiInfoRule(message) {
    return [{ required: true, message: message, trigger: "blur" }];
  }

  // 手机号正则
  valiRulePhone(message, text, trigger, ruleTrigger) {
    return [
      { required: true, message: message, trigger: trigger },
      {
        pattern:
          /^(?:(?:\+|00)86)?1(?:(?:3[\d])|(?:4[5-79])|(?:5[0-35-9])|(?:6[5-7])|(?:7[0-8])|(?:8[\d])|(?:9[189]))\d{8}$/,
        message: text,
        trigger: ruleTrigger,
      },
    ];
  }

  // 统一社会信用代码
  valiRuleUscCode(message, text, trigger, ruleTrigger) {
    return [
      { required: true, message: message, trigger: trigger },
      {
        pattern: /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/,
        message: text,
        trigger: ruleTrigger,
      },
    ];
  }

  // 车牌号(新能源+非新能源)
  valiRuleCarPlate(message, text, trigger, ruleTrigger) {
    return [
      { required: true, message: message, trigger: trigger },
      {
        pattern:
          /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/,
        message: text,
        trigger: ruleTrigger,
      },
    ];
  }

  // 车牌号(新能源+非新能源)
  valiRuleCarPlate2(text, ruleTrigger) {
    return [
      {
        pattern:
          /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/,
        message: text,
        trigger: ruleTrigger,
      },
    ];
  }

  // email(邮箱)
  valiRuleEmail(message, text, trigger, ruleTrigger) {
    return [
      { required: true, message: message, trigger: trigger },
      {
        pattern:
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        message: text,
        trigger: ruleTrigger,
      },
    ];
  }

  // 身份证号, 支持1/2代(15位/18位数字)
  valiRulePersonId(message, text, trigger, ruleTrigger) {
    return [
      { required: true, message: message, trigger: trigger },
      {
        pattern:
          /^\d{6}((((((19|20)\d{2})(0[13-9]|1[012])(0[1-9]|[12]\d|30))|(((19|20)\d{2})(0[13578]|1[02])31)|((19|20)\d{2})02(0[1-9]|1\d|2[0-8])|((((19|20)([13579][26]|[2468][048]|0[48]))|(2000))0229))\d{3})|((((\d{2})(0[13-9]|1[012])(0[1-9]|[12]\d|30))|((\d{2})(0[13578]|1[02])31)|((\d{2})02(0[1-9]|1\d|2[0-8]))|(([13579][26]|[2468][048]|0[048])0229))\d{2}))(\d|X|x)$/,
        message: text,
        trigger: ruleTrigger,
      },
    ];
  }

  // 香港身份证号
  valiRuleHKPersonId(message, text, trigger, ruleTrigger) {
    return [
      { required: true, message: message, trigger: trigger },
      {
        pattern: /^[a-zA-Z]\d{6}\([\dA]\)$/,
        message: text,
        trigger: ruleTrigger,
      },
    ];
  }

  // 澳门身份证号
  valiRuleMacaoPersonId(message, text, trigger, ruleTrigger) {
    return [
      { required: true, message: message, trigger: trigger },
      {
        pattern: /^[1|5|7]\d{6}\(\d\)$/,
        message: text,
        trigger: ruleTrigger,
      },
    ];
  }

  // 护照（包含香港、澳门）
  valiRulePassport(message, text, trigger, ruleTrigger) {
    return [
      { required: true, message: message, trigger: trigger },
      {
        pattern:
          /(^[EeKkGgDdSsPpHh]\d{8}$)|(^(([Ee][a-fA-F])|([DdSsPp][Ee])|([Kk][Jj])|([Mm][Aa])|(1[45]))\d{7}$)/,
        message: text,
        trigger: ruleTrigger,
      },
    ];
  }

  // 中文/汉字
  valiRuleChinese(message, text, trigger, ruleTrigger) {
    return [
      { required: true, message: message, trigger: trigger },
      {
        pattern:
          /^(?:[\u3400-\u4DB5\u4E00-\u9FEA\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uFA27-\uFA29]|[\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0])+$/,
        message: text,
        trigger: ruleTrigger,
      },
    ];
  }

  // 只包含数字
  valiRuleNumber(message, text, trigger, ruleTrigger) {
    return [
      { required: true, message: message, trigger: trigger },
      {
        pattern: /^\d+$/,
        message: text,
        trigger: ruleTrigger,
      },
    ];
  }

  // 小数
  valiRuleSmallNumber(message, text, trigger, ruleTrigger) {
    return [
      { required: true, message: message, trigger: trigger },
      {
        pattern: /^\d+\.\d+$/,
        message: text,
        trigger: ruleTrigger,
      },
    ];
  }

  // 邮政编码(中国)
  valiRulePostalCode(message, text, trigger, ruleTrigger) {
    return [
      { required: true, message: message, trigger: trigger },
      {
        pattern:
          /^(0[1-7]|1[0-356]|2[0-7]|3[0-6]|4[0-7]|5[1-7]|6[1-7]|7[0-5]|8[013-6])\d{4}$/,
        message: text,
        trigger: ruleTrigger,
      },
    ];
  }
}

export function valiDators() {
  return new valiDator();
}
