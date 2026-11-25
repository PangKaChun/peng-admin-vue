# CLAUDE.md

This file provides guidance to Claude Code and AI coding agents working in this repository.

## Commands

```bash
npm install         # install dependencies (Node >= 8.9 required)
npm run dev         # dev server with hot reload (vue-cli-service serve)
npm run build:prod  # production build -> ./dist
npm run build:stage # staging build (uses .env.staging)
npm run preview     # build then serve dist on http://localhost:9526
```

There are no lint or test scripts defined. The project is Vue 2 + Vue CLI 5; configuration lives in [vue.config.js](vue.config.js) and `.env.*` files at the repo root.

The dev server proxies `process.env.VUE_APP_BASE_API` (`/dev-api`, `/stage-api`, `/prod-api`) to `http://localhost:8080` with the prefix stripped — change the proxy target in [vue.config.js](vue.config.js) when pointing at a different backend.

## Architecture

Vue 2.7 admin shell using Vuex 3, Vue Router 3 (history mode), and Element UI 2.15. The repo aliases `@` -> `src/`.

### Authentication & request flow

Authentication uses a single OAuth2 **PKCE `authorization_code`** flow against `/api-auth`:

- [src/views/login.vue](src/views/login.vue) runs step-by-step precheck (`user/Precheck`: username + password + image captcha or PoW `SliderVerify`), optional/enforced TOTP MFA (`user/VerifyMfa`, QR binding via `bindMfaForLogin`), and expired/initial password change (`changePwdForLogin`), then dispatches `user/AuthorizeWithPKCE`.
- [src/store/modules/user.js](src/store/modules/user.js) `AuthorizeWithPKCE` generates `code_verifier` + `code_challenge` (S256) via [src/utils/pkce.js](src/utils/pkce.js), stores `pkce_verifier` / `pkce_state` / `oauth_redirect_uri` in `sessionStorage`, and submits a hidden form to `VUE_APP_OAUTH_AUTHORIZE_ENDPOINT`.
- The IdP redirects to `/oauth/callback`; [src/views/oauth/callback.vue](src/views/oauth/callback.vue) validates `state`, dispatches `user/ExchangeCodeForToken`, and navigates directly to the saved route.

Passwords sent to the backend are encrypted with **SM2** ([src/utils/jsencrypt.js](src/utils/jsencrypt.js)), which dynamically fetches and caches the public key from `GET /api-auth/login/public-key`; `encrypt(txt)` is **`async`** and returns a Promise.

Tokens live in cookies via [src/utils/auth.js](src/utils/auth.js) (`Access-Token`, `Refresh-Token`). The axios instance in [src/utils/request.js](src/utils/request.js) attaches `Bearer` automatically and implements **single-flight refresh**: on 401/424 the first request triggers `refreshToken()`, subsequent in-flight requests queue on `requests[]` until resolved, then replay with the new token. Request headers `isToken: false` skip `Authorization`; `repeatSubmit: false` skips the 1-second duplicate-POST guard backed by `sessionStorage.sessionObj`.

API path prefixes are service-based — `/api-auth` for auth ([src/api/login.js](src/api/login.js)), `/api-system` for system & menu APIs ([src/api/menu.js](src/api/menu.js), [src/api/sys/](src/api/sys)), `/api-file` for OSS storage ([src/api/sys/oss.js](src/api/sys/oss.js)), `/api-job` for scheduled jobs ([src/api/mon/job.js](src/api/mon/job.js), [src/api/mon/jobLog.js](src/api/mon/jobLog.js)), `/api-log` for audit logs ([src/api/mon/log.js](src/api/mon/log.js)), and `/api-flowable` for workflows ([src/api/flowable/](src/api/flowable)).

### Routing & permissions

[src/router/index.js](src/router/index.js) exports `constantRoutes` (login, callback, 404, 401, redirect, index, user/profile) wired at startup, plus `dynamicRoutes` filtered by permissions.

[src/permission.js](src/permission.js) is the global `beforeEach` guard. White-listed paths: `/login`, `/oauth/callback`. Authenticated users without loaded roles dispatch `user/GetInfo` then `GenerateRoutes`, and route meta titles update `document.title` via `settings/setTitle`.

[src/store/modules/permission.js](src/store/modules/permission.js) `GenerateRoutes` fetches backend routes via `getRouters()` and transforms component strings:

- `'Layout'` -> [src/layout/index.vue](src/layout/index.vue)
- `'ParentView'` -> [src/components/ParentView](src/components/ParentView)
- anything else -> `loadView(path)` using `require` in dev and dynamic `import` in prod (keep both branches — do not collapse `loadView`).

Permission checks read `store.getters.permissions` / `roles` (wildcard `*:*:*` and role `admin` always pass):

- Directives `v-hasPermi="['sys:user:add']"` / `v-hasRole="['admin']"` ([src/directive/permission](src/directive/permission))
- Imperative `$auth.hasPermi(...)` / `hasPermiOr(...)` / `hasPermiAnd(...)` ([src/plugins/auth.js](src/plugins/auth.js))

### Global registrations (main.js) & shared utilities

[src/main.js](src/main.js) registers global components (`DictTag`, `Pagination`, `FluentIcon`, and `svg-icon` via [src/assets/icons/index.js](src/assets/icons/index.js)), prototype helpers from [src/utils/common.js](src/utils/common.js) (`parseTime`, `resetForm`, `addDateRange`, `handleTree`), directives (`hasPermi`, `hasRole`), plugins (`$tab`, `$auth`, `$modal`), and Element UI defaults (`closeOnClickModal = false`, `size = 'small'`).

Shared helpers:
- [src/utils/common.js](src/utils/common.js): `parseTime`, `resetForm`, `addDateRange`, `parseStrEmpty`, `mergeRecursive`, `handleTree`, `tansParams`.
- [src/utils/clipboard.js](src/utils/clipboard.js): `copyText(text)` returning a Promise (Clipboard API with hidden-textarea fallback).
- [src/utils/validate.js](src/utils/validate.js): `isExternal`, `DEFAULT_PASSWORD_POLICY`, `formatPasswordRule`, `validPassword`, `newPasswordRule`.

### Dictionary system

Backend-driven enums load lazily via the `dicts` component option ([src/utils/dict](src/utils/dict), configured in [src/components/DictData/index.js](src/components/DictData/index.js) with `labelField: dictLabel`, `valueField: dictValue`). Components declaring `dicts: ['user_status', ...]` receive reactive `this.dict.type.user_status` and render values with `<dict-tag>`.

### Design system & layout grammar

Visual style follows Linear / Apple Notes restraint: pure white `#FFFFFF` workspace, `#F7F7F8` subtle chrome, crisp `1px` hairlines (`#E6E6E9` / `#F0F0F3`), single accent `#094194`, tabular numbers on timestamps/metrics, and zero decorative boxes, slogans, helper-text paragraphs, or redundant tags.

- **Tokens**: [src/assets/styles/tokens.scss](src/assets/styles/tokens.scss) defines all colors, fonts (`$font-sans`, `$font-mono`), spacing, radii, shadows, layout sizes (`$topbar-height: 44px`, `$sidebar-width: 220px`), and motion curves.
- **App Shell**: [src/layout/index.vue](src/layout/index.vue) combines a collapsible/resizable sidebar (sash drag) with a single `44px` top bar ([src/layout/components/Navbar.vue](src/layout/components/Navbar.vue)) containing sidebar toggle, scrollable route tabs ([src/layout/components/TagsView](src/layout/components/TagsView)), fullscreen toggle, and user menu.
- **Canonical Page Classes** (defined in [src/assets/styles/index.scss](src/assets/styles/index.scss)):
  - Single-pane views: `.page` > `.page-toolbar` (`.page-filters` left + `.page-actions` right) + `.page-body` (full-height `<el-table height="100%">`) + `.page-footer` (`<pagination>`).
  - Split-pane views: `.page-split` containing `.page-aside` (or `.page-aside--right`) + `.page-content` (with `.page-header` / `.page-toolbar`, `.page-body` or `.page-body--scroll`, `.page-footer`).
- **UI Discipline**: If a control or layout needs explanatory prose, `<el-alert>` boxes, or helper tooltips to be understood, fix the layout/structure (progressive disclosure, clear labels, side-by-side grouping, auto-selection of initial rows) instead of adding hint text. Keep one primary CTA per toolbar, left-align text/path columns and dialog titles, and keep `name` on every routed view matching backend routes for `keep-alive`.

### Heavy modules & file viewers

- [src/components/FluentIcon/index.vue](src/components/FluentIcon/index.vue) and [src/components/IconSelect/index.vue](src/components/IconSelect/index.vue) lazy-load [src/components/FluentIcon/icons.js](src/components/FluentIcon/icons.js) into an async `chunk-fluent-icons` bundle on first use.
- Preview dialogs under `src/components/` (`PdfViewer`, `ExcelViewer`, `WordViewer`, `ArchiveViewer`, `MarkdownViewer`) share [src/components/ViewerDialog](src/components/ViewerDialog) and lazy-load `pdfjs-dist`, `xlsx`, `docx-preview`, `jszip`, `libarchive.js`, and `marked`/`dompurify`/`highlight.js`; [src/components/VideoPlayer](src/components/VideoPlayer) wraps `<el-dialog>` directly and lazy-loads `hls.js`.
- Flowable `BpmnDesigner` and `BpmnViewer` are loaded asynchronously by [src/views/flowable/definition/index.vue](src/views/flowable/definition/index.vue).
- Non-Vue instances (PDF docs, workbooks, HLS, BPMN modeler/viewer) live on non-reactive `this._xxx` fields so Vue 2 never deep-observes them.

### Build pipeline

[vue.config.js](vue.config.js) splits vendor chunks (`chunk-libs`, `chunk-elementUI`, async `chunk-fluent-icons`, `chunk-commons`), drops `console.log/info/debug` and `debugger` in production via Terser, emits `.gz` + `.br` for assets > 10KB, copies PDF/libarchive static assets, and enables webpack 5 filesystem cache. `browserslist` targets modern ESM browsers (Chrome >= 63, Edge >= 79, Firefox >= 60, Safari >= 11.1).

## Conventions

- Use `@/...` imports for modules under `src/`.
- Add new API modules under `src/api/<domain>/` reusing `service` from `@/utils/request`.
- Sidebar routes come from the backend `getRouters` response — only auth/error/index/profile routes belong in `constantRoutes`.
- Passwords sent to the backend must be SM2-encrypted via `await encrypt(...)` from [src/utils/jsencrypt.js](src/utils/jsencrypt.js).
- Match the codebase's Chinese UI copy and comments when editing nearby content.
