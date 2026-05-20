<template>
  <div class="oauth-callback">
    <div class="oauth-wrap">

      <div class="oauth-box">
        <div class="oauth-box__header">
          <h1 class="oauth-box__title">{{ title }}</h1>
          <span class="oauth-status" :class="'oauth-status--' + status">
            <span class="oauth-status__dot"></span>
            <span>{{ statusLabel }}</span>
          </span>
        </div>

        <!-- Flash 状态横幅 -->
        <div class="oauth-flash" :class="'oauth-flash--' + flashType" v-if="flashType">
          <svg class="oauth-flash__icon" viewBox="0 0 16 16" aria-hidden="true">
            <!-- info -->
            <path v-if="flashType === 'default'" fill="currentColor"
              d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm6.5-.25a.75.75 0 0 0 0 1.5h.75v2.75a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-1.5ZM8 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
            <!-- check -->
            <path v-else-if="flashType === 'success'" fill="currentColor" fill-rule="evenodd"
              d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
            <!-- alert -->
            <path v-else fill="currentColor"
              d="M8.22 1.754a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368L8.22 1.754ZM6.462 1.052a1.75 1.75 0 0 1 3.076 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.538-2.57L6.462 1.052ZM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5Zm1 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
          </svg>
          <span>{{ hint }}</span>
        </div>

        <!-- spinner / 状态图标 + 步骤列表 -->
        <div class="oauth-body">
          <div class="oauth-icon">
            <svg v-if="status === 'loading'" class="gh-spinner" viewBox="0 0 32 32" aria-label="加载中">
              <circle cx="16" cy="16" r="13"></circle>
              <path d="M16 3 a13 13 0 0 1 13 13"></path>
            </svg>
            <svg v-else-if="status === 'success'" class="oauth-iconmark oauth-iconmark--success" viewBox="0 0 16 16">
              <path fill="currentColor" fill-rule="evenodd"
                d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
            </svg>
            <svg v-else class="oauth-iconmark oauth-iconmark--danger" viewBox="0 0 16 16">
              <path fill="currentColor" fill-rule="evenodd"
                d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94 6.03 4.97Z" />
            </svg>
          </div>

          <ul class="oauth-steps">
            <li v-for="(s, i) in steps" :key="s" :class="stepClass(i)">
              <span class="oauth-steps__icon">
                <svg v-if="i < stepIndex || status === 'success'" viewBox="0 0 16 16" width="14" height="14">
                  <path fill="currentColor"
                    d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                </svg>
                <svg v-else-if="status === 'error' && i === stepIndex" viewBox="0 0 16 16" width="14" height="14">
                  <path fill="currentColor"
                    d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                </svg>
                <span v-else-if="i === stepIndex" class="oauth-steps__pulse"></span>
                <span v-else class="oauth-steps__dot"></span>
              </span>
              <span class="oauth-steps__label">{{ s }}</span>
            </li>
          </ul>
        </div>

        <!-- footer / meta -->
        <div class="oauth-box__footer">
          <span class="oauth-meta">
            <code>state</code> {{ shortState || '—' }}
            <span class="oauth-meta__sep">·</span>
            <code>code</code> {{ shortCode || '—' }}
          </span>
          <a v-if="status === 'error'" class="oauth-link" href="javascript:void(0)" @click="goLogin">返回登录 →</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Message } from 'element-ui'

const PKCE_VERIFIER_KEY = 'pkce_verifier'
const PKCE_STATE_KEY = 'pkce_state'
const OAUTH_REDIRECT_KEY = 'oauth_redirect_uri'

export default {
  name: 'OAuthCallback',
  data() {
    return {
      status: 'loading', // loading | success | error
      title: '正在登录',
      hint: '我们正在与认证服务通信，请稍候。',
      stepIndex: 0,
      steps: ['校验回调参数', '换取访问令牌', '准备跳转工作台']
    }
  },
  computed: {
    statusLabel() {
      return { loading: '处理中', success: '已完成', error: '失败' }[this.status]
    },
    flashType() {
      return { loading: 'default', success: 'success', error: 'danger' }[this.status]
    },
    shortCode() {
      const c = (this.$route && this.$route.query && this.$route.query.code) || ''
      return c ? c.slice(0, 7) + '…' : ''
    },
    shortState() {
      const s = (this.$route && this.$route.query && this.$route.query.state) || ''
      return s ? s.slice(0, 7) + '…' : ''
    }
  },
  mounted() {
    this.handleCallback()
  },
  methods: {
    stepClass(i) {
      if (this.status === 'success') return 'is-done'
      if (this.status === 'error' && i === this.stepIndex) return 'is-error'
      if (i < this.stepIndex) return 'is-done'
      if (i === this.stepIndex) return 'is-active'
      return ''
    },
    goLogin() {
      this.$router.replace({ path: '/login' }).catch(() => {})
    },
    fail(message) {
      this.status = 'error'
      this.title = '登录失败'
      this.hint = message || '授权过程中出现问题，即将返回登录页。'
      if (message) Message.error(message)
      sessionStorage.removeItem(PKCE_VERIFIER_KEY)
      sessionStorage.removeItem(PKCE_STATE_KEY)
      sessionStorage.removeItem(OAUTH_REDIRECT_KEY)
      setTimeout(() => this.goLogin(), 2000)
    },
    succeed(target) {
      this.status = 'success'
      this.stepIndex = this.steps.length
      this.title = '登录成功'
      this.hint = '已获取访问令牌，正在为你打开工作台。'
      setTimeout(() => {
        this.$router.replace({ path: target }).catch(() => {})
      }, 600)
    },
    handleCallback() {
      const query = (this.$route && this.$route.query) || {}
      if (query.error) {
        this.fail(query.error_description || query.error || '授权失败')
        return
      }
      const code = query.code
      const state = query.state
      if (!code || !state) {
        this.fail('回调参数缺失')
        return
      }
      this.stepIndex = 1
      const expectedState = sessionStorage.getItem(PKCE_STATE_KEY)
      if (!expectedState || expectedState !== state) {
        this.fail('state 校验失败，可能存在 CSRF 风险')
        return
      }
      const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
      if (!codeVerifier) {
        this.fail('本地 code_verifier 缺失，请重新登录')
        return
      }
      this.$store
        .dispatch('user/ExchangeCodeForToken', { code, codeVerifier })
        .then(() => {
          this.stepIndex = 2
          const target = sessionStorage.getItem(OAUTH_REDIRECT_KEY) || '/'
          sessionStorage.removeItem(OAUTH_REDIRECT_KEY)
          this.succeed(target)
        })
        .catch((err) => {
          const msg = (err && err.response && err.response.data && err.response.data.msg) || '换取 token 失败'
          this.fail(msg)
        })
    }
  }
}
</script>

<style lang="scss" scoped>
/* GitHub Primer tokens */
$canvas-default:  #ffffff;
$canvas-subtle:   #f6f8fa;
$canvas-inset:    #eaeef2;
$border-default:  #d0d7de;
$border-muted:    #d8dee4;
$fg-default:      #1f2328;
$fg-muted:        #59636e;
$fg-subtle:       #6e7781;
$accent-fg:       #0969da;
$accent-emphasis: #0969da;
$accent-subtle:   #ddf4ff;
$success-fg:      #1a7f37;
$success-subtle:  #dafbe1;
$success-muted:   rgba(74, 194, 107, 0.4);
$danger-fg:       #d1242f;
$danger-subtle:   #ffebe9;
$danger-muted:    rgba(255, 129, 130, 0.4);
$attention-fg:    #9a6700;

.oauth-callback {
  min-height: 100vh;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: $canvas-subtle;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans",
    Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: $fg-default;
  -webkit-font-smoothing: antialiased;
  padding: 24px;
}

.oauth-wrap {
  width: 100%;
  max-width: 448px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.oauth-logo {
  width: 36px;
  height: 36px;
  color: $fg-default;
}

.oauth-box {
  width: 100%;
  background: $canvas-default;
  border: 1px solid $border-default;
  border-radius: 6px;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid $border-muted;
    background: $canvas-subtle;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: $fg-default;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 20px;
    border-top: 1px solid $border-muted;
    background: $canvas-subtle;
    font-size: 12px;
    color: $fg-muted;
    flex-wrap: wrap;
  }
}

/* Status pill */
.oauth-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }

  &--loading {
    color: $accent-fg;
    background: $accent-subtle;
    border-color: rgba(9, 105, 218, 0.2);

    .oauth-status__dot {
      animation: oauth-pulse 1.4s ease-in-out infinite;
    }
  }

  &--success {
    color: $success-fg;
    background: $success-subtle;
    border-color: $success-muted;
  }

  &--error {
    color: $danger-fg;
    background: $danger-subtle;
    border-color: $danger-muted;
  }
}

@keyframes oauth-pulse {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 1; }
}

/* Flash banner */
.oauth-flash {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 16px 20px 0;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid;
  font-size: 13px;
  line-height: 1.5;

  &__icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  &--default {
    color: $fg-default;
    background: $accent-subtle;
    border-color: rgba(9, 105, 218, 0.4);

    .oauth-flash__icon { color: $accent-fg; }
  }

  &--success {
    color: $fg-default;
    background: $success-subtle;
    border-color: $success-muted;

    .oauth-flash__icon { color: $success-fg; }
  }

  &--danger {
    color: $fg-default;
    background: $danger-subtle;
    border-color: $danger-muted;

    .oauth-flash__icon { color: $danger-fg; }
  }
}

/* body */
.oauth-body {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.oauth-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
}

.gh-spinner {
  width: 32px;
  height: 32px;
  animation: gh-spin 0.8s linear infinite;

  circle {
    fill: none;
    stroke: $border-default;
    stroke-width: 2;
  }

  path {
    fill: none;
    stroke: $accent-emphasis;
    stroke-width: 2;
    stroke-linecap: round;
  }
}

@keyframes gh-spin {
  to { transform: rotate(360deg); }
}

.oauth-iconmark {
  width: 40px;
  height: 40px;

  &--success { color: $success-fg; }
  &--danger  { color: $danger-fg; }
}

/* Steps */
.oauth-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: $fg-muted;
    padding: 4px 0;

    &.is-active {
      color: $fg-default;
      font-weight: 500;

      .oauth-steps__icon {
        color: $accent-fg;
        border-color: $accent-fg;
      }
    }

    &.is-done {
      color: $fg-default;

      .oauth-steps__icon {
        background: $success-fg;
        border-color: $success-fg;
        color: #fff;
      }
    }

    &.is-error {
      color: $danger-fg;

      .oauth-steps__icon {
        background: $danger-fg;
        border-color: $danger-fg;
        color: #fff;
      }
    }
  }

  &__icon {
    position: relative;
    flex: 0 0 20px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid $border-default;
    background: $canvas-default;
    display: grid;
    place-items: center;
    color: $fg-muted;
  }

  &__dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.6;
  }

  &__pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $accent-fg;
    box-shadow: 0 0 0 0 rgba(9, 105, 218, 0.4);
    animation: oauth-step-pulse 1.6s ease-out infinite;
  }
}

@keyframes oauth-step-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(9, 105, 218, 0.4); }
  70%  { box-shadow: 0 0 0 8px rgba(9, 105, 218, 0); }
  100% { box-shadow: 0 0 0 0 rgba(9, 105, 218, 0); }
}

/* meta + link */
.oauth-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  code {
    background: $canvas-inset;
    border: 1px solid $border-muted;
    border-radius: 4px;
    padding: 1px 5px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 11px;
    color: $fg-default;
  }

  &__sep {
    color: $fg-subtle;
    margin: 0 2px;
  }
}

.oauth-link {
  color: $accent-fg;
  text-decoration: none;
  font-weight: 500;

  &:hover { text-decoration: underline; }
}

/* footer caption */
.oauth-foot {
  margin: 0;
  font-size: 12px;
  color: $fg-muted;
  text-align: center;

  a {
    color: $accent-fg;
    text-decoration: none;

    &:hover { text-decoration: underline; }
  }
}
</style>
