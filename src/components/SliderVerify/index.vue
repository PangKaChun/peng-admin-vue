<template>
  <div class="slider-verify" :class="classes" :style="{ '--p': p }">
    <div class="slider-verify__track">
      <!-- 提示垫在进度条下方,拖过的部分被进度条盖住 -->
      <transition name="slider-verify-swap" mode="out-in">
        <span v-if="status === 'fail'" key="fail" class="slider-verify__hint is-fail">{{ failMessage }}</span>
        <span v-else key="hint" class="slider-verify__hint">{{ text }}</span>
      </transition>
      <div class="slider-verify__fill"></div>
      <transition name="slider-verify-fade">
        <span v-if="status === 'success'" class="slider-verify__done">{{ successText }}</span>
      </transition>
    </div>
    <!-- 滑轨宽度 = 可拖动距离,translateX 用百分比,窗口缩放后滑块不会错位 -->
    <div ref="rail" class="slider-verify__rail">
      <div
        class="slider-verify__thumb"
        role="slider"
        :tabindex="interactive ? 0 : -1"
        :aria-label="text"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(p * 100)"
        :aria-valuetext="valueText"
        :aria-busy="status === 'verifying' || null"
        @mousedown="onDragStart"
        @touchstart="onDragStart"
        @keydown="onKeydown"
        @blur="onBlur"
      >
        <svg class="slider-verify__arrow" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7l5 5-5 5M12.5 7l5 5-5 5" />
        </svg>
        <svg class="slider-verify__spinner" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
        </svg>
        <svg class="slider-verify__check" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5.5 12.5l4.5 4.5 8.5-9" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
import { createSliderChallenge, verifySlider } from '@/api/login'
import { solvePow } from './pow'

const clamp = n => Math.min(1, Math.max(0, n))

// 键盘步进:方向键每次 10%
const KEY_STEPS = {
  ArrowRight: 0.1,
  ArrowUp: 0.1,
  ArrowLeft: -0.1,
  ArrowDown: -0.1
}

// 预取令牌按 9 分钟有效算,比服务端的 10 分钟留 1 分钟余量
const CHALLENGE_TTL = 9 * 60 * 1000

/**
 * 滑块验证:按住滑块拖到轨道最右侧,通过后 v-model 拿到一次性登录凭证。没拖到底就松手在前端直接复位,不发请求。
 *
 * 流程:挂载时预取挑战令牌并在后台解工作量证明 → 拖到终点提交令牌与工作量证明 → 通过后令牌转为登录凭证,
 * 随登录请求提交,由后端核销(一次有效)。拖动只是交互,后端不看轨迹,判定靠令牌一次性、IP 绑定、
 * 工作量证明与按 IP 限流。
 *
 * 用法:
 *   <slider-verify ref="slider" v-model="sliderToken" @success="..." />
 *   this.$refs.slider.reset()   // 重置
 */
export default {
  name: 'SliderVerify',
  props: {
    // 登录凭证(v-model),未通过时为空串
    value: {
      type: String,
      default: ''
    },
    text: {
      type: String,
      default: '请按住滑块，拖到最右边'
    },
    successText: {
      type: String,
      default: '验证通过'
    },
    // 没拖到底就松手
    failText: {
      type: String,
      default: '未拖到最右边，请重试'
    },
    // 拖到底但后端校验未通过(含网络异常)
    rejectText: {
      type: String,
      default: '验证未通过，请重试'
    }
  },
  data() {
    return {
      // idle 待拖动 / dragging 拖动中 / verifying 校验中 / fail 未通过已复位 / success 已通过
      status: 'idle',
      // 进度 0~1:滑块与进度条的唯一位置来源
      p: 0,
      failMessage: ''
    }
  },
  computed: {
    interactive() {
      return this.status !== 'success' && this.status !== 'verifying'
    },
    classes() {
      const moving = this.status === 'dragging' || this.status === 'verifying'
      // 按下、拖动中、校验中或键盘挪动过:显示蓝色进度
      return [`is-${this.status}`, { 'is-active': moving || (this.status === 'idle' && this.p > 0) }]
    },
    valueText() {
      if (this.status === 'success') return this.successText
      if (this.status === 'fail') return this.failMessage
      return `${Math.round(this.p * 100)}%`
    }
  },
  created() {
    // 拖动过程量,无需响应式
    this.startX = 0
    this.travel = 0
    this.touch = false
    // 预取的挑战令牌:{ promise → { token, nonce }, requestedAt }
    this.challenge = null
  },
  mounted() {
    this.prefetch()
  },
  beforeDestroy() {
    this.listen(false)
  },
  methods: {
    onDragStart(e) {
      const touch = e.type === 'touchstart'
      if (!this.interactive || (touch ? e.touches.length > 1 : e.button !== 0)) return
      // 阻止文字选中、页面滚动,以及触屏结束后补发的鼠标事件
      e.preventDefault()
      const rail = this.$refs.rail
      this.travel = rail.offsetWidth
      if (!this.travel) return
      // 复位动画途中被再次按住:从当前视觉位置接着拖,不跳回起点
      const matrix = /matrix\(([^)]+)\)/.exec(getComputedStyle(rail).transform)
      if (matrix) this.p = clamp(parseFloat(matrix[1].split(',')[4]) / this.travel)
      this.startX = (touch ? e.touches[0] : e).clientX - this.p * this.travel
      this.status = 'dragging'
      this.touch = touch
      this.ensureChallenge()
      this.listen(true)
    },
    onDragMove(e) {
      const point = e.touches ? e.touches[0] : e
      // 边界限制:进度夹在 0~1,滑块拖不出轨道
      this.p = clamp((point.clientX - this.startX) / this.travel)
      if (this.p === 1) this.submit()
    },
    onDragEnd() {
      if (this.status === 'dragging') this.fail(this.failText)
    },
    onKeydown(e) {
      const step = KEY_STEPS[e.key]
      if (!this.interactive || this.status === 'dragging' || step === undefined) return
      e.preventDefault()
      this.status = 'idle'
      this.ensureChallenge()
      this.p = clamp(Math.round((this.p + step) * 10) / 10)
      if (this.p === 1) this.submit()
    },
    // 键盘挪到一半就移走焦点,与中途松手同样处理
    onBlur() {
      if (this.status === 'idle' && this.p > 0) this.fail(this.failText)
    },
    // 预取挑战令牌并在后台解工作量证明:拖到底时通常已算完,不必再等
    prefetch() {
      const promise = createSliderChallenge().then(({ token, difficulty }) =>
        solvePow(token, difficulty).then(nonce => ({ token, nonce }))
      )
      const challenge = { promise, requestedAt: Date.now() }
      // 失败时作废,下次开始拖动重新领取
      promise.catch(() => {
        if (this.challenge === challenge) this.challenge = null
      })
      this.challenge = challenge
    },
    // 开始拖动前确认有可用令牌:没有或快过期就重新领取(过期的令牌会被后端记为失败)
    ensureChallenge() {
      if (!this.challenge || Date.now() - this.challenge.requestedAt > CHALLENGE_TTL) this.prefetch()
    },
    // 到达终点:提交令牌与工作量证明,由后端判定
    async submit() {
      const { challenge } = this
      this.listen(false)
      this.challenge = null
      this.status = 'verifying'
      try {
        if (!challenge) throw new Error('slider challenge unavailable')
        // 工作量证明一般在用户填表时已算完;没算完就等它,超过 0.3 秒会显示转圈
        const { token, nonce } = await challenge.promise
        await verifySlider({ token, nonce })
        // 校验期间被重置则丢弃结果
        if (this.status === 'verifying') this.succeed(token)
      } catch (e) {
        if (this.status === 'verifying') this.fail(this.rejectText)
      }
    },
    succeed(token) {
      this.status = 'success'
      this.$emit('input', token)
      this.$emit('success', token)
    },
    fail(message) {
      this.listen(false)
      this.failMessage = message
      this.status = 'fail'
      this.p = 0
      // 令牌提交过就作废了,为重试预取新的
      if (!this.challenge) this.prefetch()
    },
    // 重置为初始状态(父组件通过 ref 调用)
    reset() {
      this.listen(false)
      this.status = 'idle'
      this.p = 0
      if (!this.challenge) this.prefetch()
      if (this.value) this.$emit('input', '')
    },
    // 拖动期间的监听挂在 document 上:指针移出滑块乃至窗口也能跟手
    listen(on) {
      const method = on ? 'addEventListener' : 'removeEventListener'
      const [move, end] = this.touch ? ['touchmove', 'touchend'] : ['mousemove', 'mouseup']
      document[method](move, this.onDragMove)
      document[method](end, this.onDragEnd)
      document[method]('touchcancel', this.onDragEnd)
      window[method]('blur', this.onDragEnd)
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../../assets/styles/tokens.scss';

$sv-height: 44px; // 与登录页输入框、按钮同高
$sv-border: 1px;
$sv-gap: 2px; // 滑块与轨道内沿的留白
$sv-inset: $sv-border + $sv-gap; // 滑块距轨道外沿
$sv-thumb-w: 48px;
$sv-fill: mix($color-primary, $fill-quaternary, 16%);
$sv-fill-success: mix($color-success, $fill-quaternary, 14%);
$sv-success-text: mix(#000, $color-success, 20%); // 浅绿底上压暗一档,保证 4.5:1 对比度
$sv-move: transform $duration-slow $ease-out;
$sv-spinner-delay: 0.3s; // 校验很快时不闪转圈

.slider-verify {
  position: relative;
  height: $sv-height;
  user-select: none;

  &__track {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    overflow: hidden;
    background: $fill-quaternary;
    border: $sv-border solid $separator;
    border-radius: $radius-sm;
    transition: border-color $duration-base ease, box-shadow $duration-base ease;
  }

  &__hint,
  &__done {
    position: absolute;
    top: 0;
    bottom: 0;
    overflow: hidden;
    font-size: 13px;
    line-height: $sv-height - 2 * $sv-border;
    text-align: center;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  // 提示居中于滑块右侧的空白区
  &__hint {
    left: $sv-thumb-w + 2 * $sv-gap;
    right: $space-2;
    color: $label-secondary;

    &.is-fail {
      color: $color-danger;
    }
  }

  // 通过文案居中于滑块左侧,叠在进度条之上
  &__done {
    left: $space-2;
    right: $sv-thumb-w + 2 * $sv-gap;
    font-weight: 500;
    color: $sv-success-text;
  }

  // 进度条:与轨道等宽,向左平移藏起未走过的部分;右缘比滑块多出一圈留白,把滑块包住
  &__fill {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: $sv-fill;
    border-radius: $radius-sm - $sv-border;
    opacity: 0;
    transform: translateX(calc((var(--p) - 1) * (100% - #{$sv-thumb-w + 2 * $sv-gap})));
    transition: $sv-move, opacity $duration-base ease, background-color $duration-base ease;
  }

  &__rail {
    position: absolute;
    top: $sv-inset;
    bottom: $sv-inset;
    left: $sv-inset;
    width: calc(100% - #{$sv-thumb-w + 2 * $sv-inset});
    pointer-events: none;
    transform: translateX(calc(var(--p) * 100%));
    transition: $sv-move;
  }

  &__thumb {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: $sv-thumb-w;
    color: $label-secondary;
    background: $bg-base;
    border-radius: $radius-sm - $sv-inset; // 与轨道圆角同心
    box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.12);
    cursor: grab;
    pointer-events: auto;
    touch-action: none;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    transition: color $duration-fast ease, background-color $duration-base ease, box-shadow $duration-base ease;

    // 热区撑满轨道高度,触屏更好按
    &::before {
      content: '';
      position: absolute;
      top: -$sv-inset;
      right: -$sv-inset;
      bottom: -$sv-inset;
      left: -$sv-inset;
    }

    svg {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 18px;
      height: 18px;
      margin: -9px 0 0 -9px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }

  &__arrow {
    transition: opacity $duration-fast ease, transform $duration-base $ease-out;
  }

  // 校验中的转圈:一段 2/3 圆弧,超过 $sv-spinner-delay 才淡入
  &__spinner {
    opacity: 0;
    stroke-dasharray: 34 100;
    transition: opacity $duration-fast ease;
  }

  // 对勾用描边动画"画"出来:dash 20 覆盖整条路径(约 18.7),偏移 22 时完全藏起
  &__check {
    stroke-dasharray: 20 40;
    stroke-dashoffset: 22;
    transition: stroke-dashoffset $duration-slow $ease-out;
  }
}

@media (hover: hover) {
  .slider-verify.is-idle .slider-verify__thumb:hover,
  .slider-verify.is-fail .slider-verify__thumb:hover {
    color: $color-primary;
  }
}

// 表单校验未通过:与输入框一致的红框
.is-error .slider-verify__track {
  border-color: $color-danger;
}

// 键盘聚焦:与输入框 focus 一致的蓝框 + 光环(鼠标 / 触屏按下不会聚焦)
.slider-verify:focus-within .slider-verify__track {
  border-color: $color-primary;
  box-shadow: 0 0 0 3px rgba($color-primary, 0.12);
}

.slider-verify.is-active {
  .slider-verify__track {
    border-color: $color-primary;
  }

  .slider-verify__fill {
    opacity: 1;
  }

  .slider-verify__thumb {
    color: $color-primary;
  }
}

// 拖动中跟手:关掉位移过渡
.slider-verify.is-dragging {
  .slider-verify__rail {
    transition: none;
  }

  .slider-verify__fill {
    transition: opacity $duration-base ease, background-color $duration-base ease;
  }

  .slider-verify__thumb {
    cursor: grabbing;
    box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.16);
  }
}

.slider-verify.is-verifying {
  .slider-verify__thumb {
    cursor: progress;
  }

  .slider-verify__arrow {
    opacity: 0;
    transition-delay: $sv-spinner-delay;
  }

  .slider-verify__spinner {
    opacity: 1;
    transition-delay: $sv-spinner-delay;
    animation: slider-verify-spin 0.8s linear infinite;
  }
}

.slider-verify.is-success {
  .slider-verify__track {
    border-color: mix($color-success, $fill-quaternary, 50%);
  }

  .slider-verify__fill {
    background: $sv-fill-success;
    opacity: 1;
  }

  .slider-verify__thumb {
    color: #fff;
    background: $color-success;
    box-shadow: none;
    cursor: default;
  }

  .slider-verify__arrow {
    opacity: 0;
    transform: translateX(6px);
  }

  .slider-verify__check {
    stroke-dashoffset: 0;
    transition-delay: 0.05s;
  }

  &:focus-within .slider-verify__track {
    box-shadow: 0 0 0 3px rgba($color-success, 0.15);
  }
}

@keyframes slider-verify-spin {
  to {
    transform: rotate(360deg);
  }
}

.slider-verify-swap-enter-active,
.slider-verify-swap-leave-active {
  transition: opacity $duration-fast ease;
}

.slider-verify-fade-enter-active {
  transition: opacity $duration-base ease 0.05s;
}

.slider-verify-fade-leave-active {
  transition: opacity $duration-fast ease;
}

.slider-verify-swap-enter,
.slider-verify-swap-leave-to,
.slider-verify-fade-enter,
.slider-verify-fade-leave-to {
  opacity: 0;
}

// 减弱动效:位置瞬时到位,对勾直接出现,转圈静止,只保留颜色 / 透明度过渡
@media (prefers-reduced-motion: reduce) {
  .slider-verify__rail,
  .slider-verify.is-dragging .slider-verify__rail {
    transition: none;
  }

  .slider-verify__fill {
    transition: opacity $duration-base ease, background-color $duration-base ease;
  }

  .slider-verify__arrow,
  .slider-verify__check {
    transition: none;
  }

  .slider-verify.is-verifying .slider-verify__spinner {
    animation: none;
  }
}
</style>
