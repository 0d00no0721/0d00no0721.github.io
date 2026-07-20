# AGENTS.md

## 这是什么

`0d00no0721.github.io` GitHub Pages 静态站点，纯 HTML，无构建步骤。

## 部署

```powershell
git add . ; git commit -m "描述" ; git push origin main
```

推送即部署，1-2 分钟后生效。`.nojekyll` 文件必须保留，否则 GitHub 会用 Jekyll 处理。

## 目录结构

```
/
  index.html          # 首页
  ideas/index.html    # /ideas 页面
  .nojekyll           # 禁用 Jekyll（必须保留）
```

无框架、无构建工具、无 npm 依赖。新增页面只需在对应目录下创建 `index.html`。