# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install         # install dependencies (Node >= 8.9 required)
npm run dev         # dev server with hot reload (vue-cli-service serve)
npm run build:prod  # production build → ./dist
npm run build:stage # staging build (uses .env.staging)
npm run preview     # build then serve dist on http://localhost:9526
```

There are no lint or test scripts defined. The project is Vue 2 + Vue CLI 5; configuration lives in [vue.config.js](vue.config.js) and `.env.*` files at the repo root.

The dev server proxies `process.env.VUE_APP_BASE_API` (`/dev-api`, `/stage-api`, `/prod-api`) to `http://localhost:8080` with the prefix stripped — change the proxy target in [vue.config.js](vue.config.js) when pointing at a different backend.

## Architecture

Vue 2.7 admin shell using Vuex 3, Vue Router 3 (history mode), Element UI 2.15, and ECharts 5. The repo aliases `@` → `src/`.

### Authentication & request flow

Two OAuth2 flows coexist against the same `/api-auth/oauth2/token` endpoint:

- **PKCE `authorization_code`** (primary): [src/store/modules/user.js](src/store/modules/user.js) `AuthorizeWithPKCE` generates `code_verifier` + `code_challenge` (S256) via [src/utils/pkce.js](src/utils/pkce.js), stashes `pkce_verifier` / `pkce_state` / `oauth_redirect_uri` in `sessionStorage`, then POSTs a hidden form to `VUE_APP_OAUTH_AUTHORIZE_ENDPOINT`. The IdP redirects to `/oauth/callback`, [src/views/oauth/callback.vue](src/views/oauth/callback.vue) validates `state`, calls `ExchangeCodeForToken`, and routes to the saved target.
- **Password grant** (legacy): [src/views/login-legacy.vue](src/views/login-legacy.vue) → `login()` in [src/api/login.js](src/api/login.js) with Basic auth from `VUE_APP_OAUTH_CLIENT_ID/SECRET`.

Both flows encrypt the password with **SM2** ([src/utils/jsencrypt.js](src/utils/jsencrypt.js)) before transmission — the public key is hardcoded and must match the backend keypair.

Tokens live in cookies via [src/utils/auth.js](src/utils/auth.js) (`Access-Token`, `Refresh-Token`). The axios instance in [src/utils/request.js](src/utils/request.js) attaches `Bearer` automatically and implements **single-flight refresh**: on 401/424 the first request triggers `refreshToken()`, subsequent in-flight requests queue on `requests[]` until the refresh resolves, then replay with the new token. If refresh fails (or no refresh token exists), `reloginMessageBox()` prompts the user and routes back through `user/LogOut`. Request headers `isToken: false` skip the Authorization header; `repeatSubmit: false` skips the 1-second duplicate-POST guard backed by `sessionStorage.sessionObj`.

API path prefixes are convention-based — `/api-auth` for auth (see [src/api/login.js](src/api/login.js)), `/api-system` for system modules (see [src/api/menu.js](src/api/menu.js), [src/api/sys/](src/api/sys)).

### Routing & permissions

[src/router/index.js](src/router/index.js) exports `constantRoutes` (login, callback, 404, redirect, index) wired at startup, plus `dynamicRoutes` that are filtered by permissions.

[src/permission.js](src/permission.js) is the global beforeEach guard. White-listed paths: `/login`, `/oauth/callback`, `/login/legacy`. For authenticated users without loaded roles, it dispatches `user/GetInfo` then `GenerateRoutes`.

[src/store/modules/permission.js](src/store/modules/permission.js) `GenerateRoutes` calls `getRouters()` (the backend returns a route tree as JSON), then `filterAsyncRouter` recursively replaces string `component` values:

- `'Layout'` → [src/layout/index.vue](src/layout/index.vue)
- `'ParentView'` → [src/components/ParentView](src/components/ParentView)
- anything else → `loadView(path)` which uses `require` in dev and dynamic `import` in prod (this distinction matters — do not change `loadView` to a single form).

`filterDynamicRoutes` separately filters `dynamicRoutes` by `permissions` / `roles` arrays using the `$auth` plugin.

Permission checks have three surfaces, all reading `store.getters.permissions` / `roles`:

- `v-hasPermi="['sys:user:add']"` / `v-hasRole="['admin']"` directives ([src/directive/permission](src/directive/permission)) remove the element from the DOM when denied.
- `this.$auth.hasPermi(...)` / `hasPermiOr(...)` / `hasPermiAnd(...)` ([src/plugins/auth.js](src/plugins/auth.js)) for imperative checks.
- The wildcard permission `*:*:*` and role `admin` always pass.

### Global registrations (main.js)

[src/main.js](src/main.js) wires global components (`DictTag`, `Pagination`, `RightTool`), global prototypes (`$echarts`, `$tab`, `$auth`, `$modal`, `parseTime`, `handleTree`, `resetForm`, etc. from [src/utils/rongji.js](src/utils/rongji.js)), and patches Element UI defaults:

- `el-input` default `maxlength=50` (textarea: 300) unless explicitly overridden
- `el-dialog` `closeOnClickModal` defaulted to `false`
- ElementUI default size: `small`

When adding a global utility, mount it here so views can call `this.xxx` without importing.

### Dictionary system

Backend-driven enums are loaded lazily via the `dicts` component option. [src/utils/dict](src/utils/dict) installs a Vue mixin: any component declaring `dicts: ['user_status', ...]` gets a reactive `this.dict.type.user_status` populated by `getDicts(type)` ([src/api/sys/dict/data.js](src/api/sys/dict/data.js)). `<dict-tag>` renders a value against a dict array. Configuration of label/value field names lives in [src/components/DictData/index.js](src/components/DictData/index.js) (`labelField: dictLabel`, `valueField: dictValue`).

### Layout

[src/layout/index.vue](src/layout/index.vue) is the shell: sidebar (with mousedown-drag resize, min 200px, right pane min 1000px), navbar, tags-view, app-main. The watermark on every page is set in `mounted` via [src/utils/waterMark.js](src/utils/waterMark.js) using the logged-in username + timestamp.

### Build pipeline

[vue.config.js](vue.config.js) splits chunks into `chunk-libs` / `chunk-elementUI` / `chunk-echarts` / `chunk-fluent-icons` / `chunk-commons`, drops `console.log/info/debug` and `debugger` in production via Terser (keeps `warn`/`error` — Vue reports component errors through `console.error`), emits `.gz` + `.br` for assets > 10KB (including the libarchive `.wasm`), and uses webpack 5 filesystem cache (`cache.type = 'filesystem'`, invalidated when `vue.config.js`, `package.json` or `babel.config.js` changes) — expect a slow first build, fast subsequent ones.

The `browserslist` in package.json is an explicit ES2018 floor (Chrome 63 / Edge 79 / Firefox 60 / Safari 11.1), matching the syntax that untranspiled `node_modules` code in the initial bundle already requires. Every target supports ES modules, so Vue CLI does a single modern build; adding a non-ESM target (e.g. IE 11) would bring back the modern + legacy double build without making the app work in that browser.

SCSS values exported to JS via `:export` must live in a `*.module.scss` file (e.g. `src/assets/styles/variables.module.scss`). Vue CLI 5's css-loader only processes `:export` for CSS modules, so importing a plain `.scss` file into JS yields `undefined` in production builds. SVGs under `src/assets/icons/svg/` are auto-registered as `<svg-icon icon-class="name"/>` via svg-sprite-loader; other SVGs go through the default loader.

Webpack `prefetch` plugin is deleted (preload is kept) to avoid hurting first-paint LCP.

## Conventions

- Use `@/...` imports for anything under `src/`.
- Add new API modules under `src/api/<domain>/` and reuse the `service` instance from `@/utils/request` so token refresh / repeat-submit guards apply.
- When adding a route that should appear in the sidebar, it must come from the backend `getRouters` response — only auth/error/index routes belong in `constantRoutes`.
- Passwords sent to the backend must be SM2-encrypted with `encrypt()` from [src/utils/jsencrypt.js](src/utils/jsencrypt.js).
- The codebase is in Chinese (comments, UI strings, commit messages). Match the existing language when editing nearby content.
