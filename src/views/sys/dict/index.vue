<template>
  <div class="page-split">
    <dict-type @update:value="val => (dictType = val)" />
    <dict-data class="dict-pane--right" :dictType="dictType" />
  </div>
</template>

<script>
import dictType from './type'
import dictData from './data'

export default {
  name: 'Dict',
  components: { dictType, dictData },
  data() {
    return {
      dictType: undefined
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.dict-pane--right {
  border-left: 1px solid $separator;
}
</style>
