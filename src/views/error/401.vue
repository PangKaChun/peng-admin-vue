<template>
  <div class="error-page">
    <div class="error-code">401</div>
    <p class="error-message">无访问权限</p>
    <el-button type="primary" size="small" @click="$router.replace('/')">返回首页</el-button>
  </div>
</template>

<script>
export default {
  name: 'Page401'
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: $space-6;
  background: $bg-base;
  text-align: center;
}

.error-code {
  font-size: 56px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: $label-tertiary;
}

.error-message {
  margin: $space-3 0 $space-5;
  font-size: 14px;
  color: $label-secondary;
}
</style>
