<template>
  <el-container>
    <el-main>
      <dict-type @update:value="(val)=>dictType=val" />
    </el-main>
    <el-main>
      <dict-data :dictType="dictType" />
    </el-main>
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
.el-container {
  height: 100%;
}
.el-main {
  flex-basis: 0;
  padding: 0;
}
</style>