<template>
  <span class="dict-tag">
    <template v-for="(item, index) in options">
      <template v-if="values.includes(item.value)">
        <span
          v-if="item.raw.listClass == 'default' || item.raw.listClass == ''"
          :key="item.value"
          :index="index"
        >{{ item.label }}</span>
        <el-tag
          v-else
          :disable-transitions="true"
          :key="item.value"
          :index="index"
          :type="type ? type : item.raw.listClass == 'primary' ? '' : item.raw.listClass"
        >{{ item.label }}</el-tag>
      </template>
    </template>
  </span>
</template>

<script>
export default {
  name: 'DictTag',
  props: {
    options: {
      type: Array,
      default: null
    },
    value: [Number, String, Array],
    type: {
      type: String,
      default: null
    }
  },
  computed: {
    values() {
      if (this.value !== null && typeof this.value !== 'undefined') {
        return Array.isArray(this.value) ? this.value.map(String) : [String(this.value)]
      }
      return []
    }
  }
}
</script>

<style scoped>
.dict-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
