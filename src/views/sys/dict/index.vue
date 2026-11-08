<template>
  <el-container>
    <dict-type class="dict-pane" @update:value="(val)=>dictType=val" />
    <dict-data class="dict-pane" :dictType="dictType" />
  </el-container>
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
// 两栏等分
.dict-pane {
  flex-basis: 0;
  min-width: 0;
}
</style>
