<template>
  <div class="page">
    <div class="page-body page-body--scroll">
      <div v-if="groups.length" class="home-directory">
        <section v-for="group in groups" :key="group.title || '__standalone__'" class="home-group">
          <h2 v-if="group.title" class="home-group__title">{{ group.title }}</h2>
          <div class="home-grid">
            <template v-for="item in group.items">
              <a
                v-if="item.external"
                :key="`external-${item.to}`"
                :href="item.to"
                target="_blank"
                rel="noopener"
                class="home-item"
              >
                <fluent-icon v-if="item.icon && item.icon.startsWith('fluent:')" :name="item.icon.slice(7)" class="home-item__icon" />
                <svg-icon v-else-if="item.icon && item.icon !== '#'" :icon-class="item.icon" class="home-item__icon" />
                <span class="home-item__label">{{ item.title }}</span>
              </a>
              <router-link v-else :key="`internal-${item.to}`" :to="item.to" class="home-item">
                <fluent-icon v-if="item.icon && item.icon.startsWith('fluent:')" :name="item.icon.slice(7)" class="home-item__icon" />
                <svg-icon v-else-if="item.icon && item.icon !== '#'" :icon-class="item.icon" class="home-item__icon" />
                <span class="home-item__label">{{ item.title }}</span>
              </router-link>
            </template>
          </div>
        </section>
      </div>
      <div v-else class="page-empty">PENG ADMIN</div>
    </div>
  </div>
</template>

<script>
import path from 'path'
import { mapGetters } from 'vuex'
import { isExternal } from '@/utils/validate'

export default {
  name: 'Index',
  computed: {
    ...mapGetters(['sidebarRouters']),
    groups() {
      const result = []
      const standalone = []
      const routes = this.sidebarRouters || []

      routes.forEach(route => {
        if (route.hidden) return
        const children = (route.children || []).filter(c => !c.hidden)

        if (children.length && route.meta && route.meta.title) {
          const items = this.collectItems(children, route.path || '/')
          if (items.length) {
            result.push({ title: route.meta.title, items })
          }
        } else if (children.length) {
          standalone.push(...this.collectItems(children, route.path || '/', (route.meta && route.meta.icon) || ''))
        } else if (route.meta && route.meta.title && !route.meta.affix) {
          const to = this.resolvePath(route.path || '/', '')
          standalone.push({
            title: route.meta.title,
            icon: route.meta.icon || '',
            to,
            external: isExternal(to)
          })
        }
      })

      if (standalone.length) {
        result.unshift({ title: '', items: standalone })
      }
      return result
    }
  },
  methods: {
    resolvePath(basePath, routePath) {
      if (isExternal(routePath)) return routePath
      if (isExternal(basePath)) return basePath
      return path.resolve(basePath || '/', routePath || '')
    },
    collectItems(children, basePath, fallbackIcon = '') {
      const items = []
      children.forEach(child => {
        if (child.hidden || (child.meta && child.meta.affix)) return
        const fullPath = this.resolvePath(basePath, child.path)
        const nested = (child.children || []).filter(c => !c.hidden)
        if (nested.length) {
          items.push(...this.collectItems(nested, fullPath))
        } else if (child.meta && child.meta.title) {
          items.push({
            title: child.meta.title,
            icon: child.meta.icon || fallbackIcon,
            to: fullPath,
            external: isExternal(fullPath)
          })
        }
      })
      return items
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.home-directory {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: $space-6;
}

.home-group__title {
  margin: 0 0 $space-3;
  font-size: 12px;
  font-weight: 500;
  color: $label-secondary;
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: $space-2;
}

.home-item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3 $space-4;
  border: 1px solid $separator;
  border-radius: $radius-md;
  background: $bg-base;
  color: $label;
  font-size: 13px;
  font-weight: 500;
  transition: border-color $duration-fast ease, background-color $duration-fast ease;

  &:hover {
    background: $bg-subtle;
    border-color: darken($separator, 8%);
  }

  &__icon {
    flex: none;
    font-size: 16px;
    color: $label-secondary;
  }

  &__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
