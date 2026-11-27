<template>
  <div class="oauth-callback">
    <div class="oauth-panel">
      <div v-if="status === 'loading'" class="oauth-state">
        <i class="el-icon-loading oauth-icon" />
        <span class="oauth-text">正在登录</span>
      </div>

      <div v-else-if="status === 'error'" class="oauth-state oauth-state--error">
        <i class="el-icon-circle-close oauth-icon oauth-icon--error" />
        <p class="oauth-text">{{ errorMessage }}</p>
        <el-button type="primary" size="small" @click="goLogin">返回登录</el-button>
      </div>
    </div>
  </div>
</template>

<script>
const PKCE_VERIFIER_KEY = 'pkce_verifier'
const PKCE_STATE_KEY = 'pkce_state'
const OAUTH_REDIRECT_KEY = 'oauth_redirect_uri'

export default {
  name: 'OAuthCallback',
  data() {
    return {
      status: 'loading',
      errorMessage: ''
    }
  },
  created() {
    this._redirectTimer = null
  },
  mounted() {
    this.handleCallback()
  },
  beforeDestroy() {
    if (this._redirectTimer) {
      clearTimeout(this._redirectTimer)
      this._redirectTimer = null
    }
  },
  methods: {
    goLogin() {
      if (this._redirectTimer) {
        clearTimeout(this._redirectTimer)
        this._redirectTimer = null
      }
      this.$router.replace({ path: '/login' }).catch(() => {})
    },
    fail(message) {
      this.status = 'error'
      this.errorMessage = message || '授权失败'
      sessionStorage.removeItem(PKCE_VERIFIER_KEY)
      sessionStorage.removeItem(PKCE_STATE_KEY)
      sessionStorage.removeItem(OAUTH_REDIRECT_KEY)
      this._redirectTimer = setTimeout(() => this.goLogin(), 3000)
    },
    handleCallback() {
      const query = (this.$route && this.$route.query) || {}
      if (query.error) {
        this.fail(query.error_description || query.error || '授权失败')
        return
      }
      const { code, state } = query
      if (!code || !state) {
        this.fail('回调参数缺失')
        return
      }
      const expectedState = sessionStorage.getItem(PKCE_STATE_KEY)
      if (!expectedState || expectedState !== state) {
        this.fail('state 校验失败')
        return
      }
      const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
      if (!codeVerifier) {
        this.fail('本地校验凭证缺失，请重新登录')
        return
      }
      this.$store
        .dispatch('user/ExchangeCodeForToken', { code, codeVerifier })
        .then(() => {
          const target = sessionStorage.getItem(OAUTH_REDIRECT_KEY) || '/'
          sessionStorage.removeItem(OAUTH_REDIRECT_KEY)
          this.$router.replace({ path: target }).catch(() => {})
        })
        .catch(err => {
          const msg = (err && err.response && err.response.data && err.response.data.msg) || '换取访问令牌失败'
          this.fail(msg)
        })
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.oauth-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: $space-5;
  background: $bg-subtle;
}

.oauth-panel {
  width: 340px;
  max-width: 100%;
  padding: $space-8 $space-6;
  background: $bg-base;
  border: 1px solid $separator;
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
  text-align: center;
}

.oauth-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-3;
}

.oauth-icon {
  font-size: 24px;
  color: $color-primary;

  &--error {
    color: $color-danger;
  }
}

.oauth-text {
  margin: 0;
  font-size: 14px;
  color: $label;
  line-height: 1.5;
}
</style>
