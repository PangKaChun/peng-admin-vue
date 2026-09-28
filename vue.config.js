"use strict";
const path = require("path");

function resolve(dir) {
  return path.join(__dirname, dir);
}

const CompressionPlugin = require("compression-webpack-plugin");
// @vue/cli-service 自带依赖,用于随构建发布 pdf.js 的 CJK 字型映射与标准字体
const CopyWebpackPlugin = require("copy-webpack-plugin");

const name = process.env.VUE_APP_TITLE || "PENG ADMIN"; // 网页标题

const port = process.env.port || process.env.npm_config_port || 80; // 端口

const isProd = process.env.NODE_ENV === "production";

// 预压缩范围;wasm 为 libarchive.js 的 rar/7z 解码器(约 1MB,brotli 后约 40%)
const compressTest = /\.(js|css|html|svg|wasm)$/i;

// vue.config.js 配置说明
//官方vue.config.js 参考文档 https://cli.vuejs.org/zh/config/
module.exports = {
  // 仅在生产构建转译 bpmn 属性面板 / FEEL 链路（terser 需要降级其现代 ESM 语法）。
  transpileDependencies: isProd
    ? [
        'lezer-feel',
        '@lezer/lr',
        '@lezer/common',
        '@lezer/highlight',
        'lang-feel',
        'feelers',
        'feelin',
        '@bpmn-io/feel-editor',
        '@bpmn-io/properties-panel',
        'bpmn-js-properties-panel'
      ]
    : ['lezer-feel'],
  // 部署生产环境和开发环境下的URL。
  // 默认情况下，Vue CLI 会假设你的应用是被部署在一个域名的根路径上
  publicPath: isProd ? "/" : "/",
  // 在npm run build 或 yarn build 时 ，生成文件的目录名称（要和baseUrl的生产环境路径一致）（默认dist）
  outputDir: "dist",
  // 用于放置生成的静态资源 (js、css、img、fonts) 的；（项目打包之后，静态资源会放在这个文件夹下）
  assetsDir: "static",
  // 如果你不需要生产环境的 source map，可以将其设置为 false 以加速生产环境构建。
  productionSourceMap: false,
  // webpack-dev-server 相关配置
  devServer: {
    host: "0.0.0.0",
    port: port,
    open: true,
    client: {
      overlay: {
        warnings: false,
        errors: true,
      },
    },
    proxy: {
      // detail: https://cli.vuejs.org/config/#devserver-proxy
      [process.env.VUE_APP_BASE_API]: {
        target: `http://localhost:8080`,
        changeOrigin: true,
        pathRewrite: {
          ["^" + process.env.VUE_APP_BASE_API]: "",
        },
        headers: {
          'X-Forwarded-For': '113.90.49.179'
        },
      },
    },
    allowedHosts: "all",
  },
  css: {
    loaderOptions: {
      sass: {
        sassOptions: { outputStyle: "expanded" },
      },
    },
  },
  configureWebpack: {
    name: name,
    resolve: {
      alias: {
        "@": resolve("src"),
      },
      fallback: {
        path: require.resolve("path-browserify"),
      },
    },
    // webpack 5 持久化缓存：二次构建大幅提速
    cache: {
      type: "filesystem",
      buildDependencies: {
        // browserslist(在 package.json 中)与 babel 配置决定转译结果,二者变更时缓存必须整体失效
        config: [__filename, resolve("package.json"), resolve("babel.config.js")],
      },
    },
    // vue-loader 15 总会导入样式块的默认导出,而生产环境样式被抽离为无导出模块,每个 .vue 都会报一条无害警告
    ignoreWarnings: [/export 'default' \(imported as 'style\d+'\) was not found/],
    // 体积已由 Vue CLI 构建摘要逐项列出;固定 244KB 阈值必被 echarts / 图标包触发,只会制造常驻警告
    performance: { hints: false },
    plugins: [
      // pdf.js 运行时按需加载的 CJK 字型映射与标准字体(中文 PDF 渲染必需),发布为静态资源
      // libarchive.js 的 Worker 与 WASM(rar/7z 预览用):Worker 以 new URL('libarchive.wasm', import.meta.url)
      // 就近取 wasm,故两者须落在同一目录;整包按原样发布,不经 webpack 处理
      new CopyWebpackPlugin({
        patterns: [
          { from: "node_modules/pdfjs-dist/cmaps", to: "static/pdf-assets/cmaps" },
          { from: "node_modules/pdfjs-dist/standard_fonts", to: "static/pdf-assets/standard_fonts" },
          { from: "node_modules/libarchive.js/dist/worker-bundle.js", to: "static/libarchive/worker-bundle.js" },
          { from: "node_modules/libarchive.js/dist/libarchive.wasm", to: "static/libarchive/libarchive.wasm" },
        ],
      }),
      ...(isProd
        ? [
          // gzip 压缩
          new CompressionPlugin({
            test: compressTest,
            filename: "[path][base].gz",
            algorithm: "gzip",
            threshold: 10240, // 仅压缩大于 10KB 的文件
            minRatio: 0.8,
          }),
          // brotli 压缩，压缩率比 gzip 更高，现代浏览器和 nginx/cdn 普遍支持
          new CompressionPlugin({
            test: compressTest,
            filename: "[path][base].br",
            algorithm: "brotliCompress",
            threshold: 10240,
            minRatio: 0.8,
          }),
        ]
        : []),
    ],
  },
  chainWebpack(config) {
    // 只删 prefetch；preload 保留，避免拖慢首屏 LCP
    // config.plugins.delete("preload");
    config.plugins.delete("prefetch");

    // set svg-sprite-loader
    config.module
      .rule("svg")
      .exclude.add(resolve("src/assets/icons"))
      .add(resolve("node_modules/@fluentui/svg-icons"))
      .end();
    config.module
      .rule("icons")
      .test(/\.svg$/)
      .include.add(resolve("src/assets/icons"))
      .end()
      .use("svg-sprite-loader")
      .loader("svg-sprite-loader")
      .options({
        symbolId: "icon-[name]",
      })
      .end();

    // Fluent UI 图标（@fluentui/svg-icons）：以源码字符串方式引入，由 FluentIcon 组件内联渲染
    config.module
      .rule("fluent-icons")
      .test(/\.svg$/)
      .include.add(resolve("node_modules/@fluentui/svg-icons"))
      .end()
      .set("type", "asset/source");

    // pdf.js worker：发布为独立静态资源(import 得到 URL)，浏览器以真 Worker 线程加载，避免主线程解析 PDF 卡 UI
    config.module
      .rule("pdf-worker")
      .test(/pdf\.worker(\.min)?\.js$/)
      .include.add(resolve("node_modules/pdfjs-dist"))
      .end()
      .set("type", "asset/resource")
      .set("generator", { filename: "static/js/[name].[contenthash:8][ext]" });

    config.when(isProd, (config) => {
      config.optimization.splitChunks({
        chunks: "all",
        cacheGroups: {
          libs: {
            name: "chunk-libs",
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: "initial", // only package third parties that are initially dependent
          },
          elementUI: {
            name: "chunk-elementUI", // split elementUI into a single package
            priority: 20, // the weight needs to be larger than libs and app or it will be packaged into libs or app
            test: /[\\/]node_modules[\\/]_?element-ui(.*)/, // in order to adapt to cnpm
          },
          // 首屏最大的两个依赖单独成包:图标注册表增删或其它依赖升级时,不连带 1MB 级的 echarts / 图标包缓存失效
          echarts: {
            name: "chunk-echarts",
            priority: 20,
            test: /[\\/]node_modules[\\/](echarts|zrender)[\\/]/,
          },
          fluentIcons: {
            name: "chunk-fluent-icons",
            priority: 20,
            test: /[\\/]node_modules[\\/]@fluentui[\\/]svg-icons[\\/]/,
          },
          commons: {
            name: "chunk-commons",
            test: resolve("src/components"), // can customize your rules
            minChunks: 3, //  minimum common number
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      });
      config.optimization.runtimeChunk("single");

      // 生产构建去除调试输出与 debugger，减小包体
      config.optimization.minimizer("terser").tap((args) => {
        const opts = args[0] || {};
        // pdf.js 与 libarchive 的 worker 是上游已压缩产物(合计约 1.1MB),再压一遍只耗时
        opts.exclude = /pdf\.worker|worker-bundle/;
        opts.terserOptions = opts.terserOptions || {};
        opts.terserOptions.compress = {
          ...(opts.terserOptions.compress || {}),
          // 保留 warn / error:Vue 经 console.error 上报组件异常,全删会让线上报错无迹可查
          drop_console: ["log", "info", "debug"],
          drop_debugger: true,
        };
        return args;
      });
    });
  },
};
