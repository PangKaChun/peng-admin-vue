<template>
  <div>
    <el-badge :value="unread" :hidden="!unread" class="item">
      <fluent-icon name="alert" style="color: #061e59" />
    </el-badge>
  </div>
</template>

<script>
export default {
  name: 'Notify',
  data() {
    return {
      unread: 0
    }
  },
  mounted() {},
  methods: {}
}
</script>
