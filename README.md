# 后溪奶龙大乱斗 (BigNailong)

可在手机浏览器直接玩的物理合成小游戏。HTML5 Canvas + 原生 JavaScript + CSS，无框架、无后端、无运行时外部依赖。

**游玩地址：<https://shenzhuangz.github.io/bignainai/>**（仓库首次启用 Pages、部署成功后生效）

## 玩法

- 手机：在游戏区域拖动瞄准，松手投放；取消触摸不会投放，多指操作不会重复投放。
- 电脑：移动鼠标瞄准，点击投放；也可用方向键移动、空格投放、R 重开。
- 两个相同等级的奶龙碰撞后合成下一级，获得对应积分。
- 初始只会生成 1–4 级，最终目标是 11 级「超级奶龙」。达成后可以继续玩；两只最高级不会继续合成。
- 已落在堆叠上的奶龙持续超过警戒线 2 秒则结束。新投放的奶龙穿过警戒线不会导致失败。
- 最高分保存在当前浏览器的 localStorage。存储被禁用时仍可游玩。
- 工具栏支持重开和音效开关，音效默认关闭。打开图鉴、切换到后台会暂停游戏。

## 本地运行

直接双击 `index.html` 即可游玩。推荐用静态服务器测试，与 Pages 的运行方式一致：

```sh
python -m http.server 8000
```

打开 <http://localhost:8000/>。无需安装依赖、打包或配置环境变量。

## 项目结构

```text
bignainai/
├── index.html
├── css/style.css
├── js/
│   ├── game.js             # 输入、计分、状态、Canvas 绘制和动画
│   ├── physics.js          # 圆形碰撞、重力、冲量、摩擦和旋转
│   └── assets.js           # 11 级素材、半径和合成积分
├── assets/nailong/         # level1.svg … level11.svg
├── tests/
│   ├── physics.test.cjs    # 不依赖第三方库的物理检查
│   └── browser.test.cjs    # 可选 Playwright 浏览器集成检查
├── tools/create-placeholders.cjs
├── README.md
└── .github/workflows/pages.yml
```

## 替换奶龙 sprite

当前 11 张图是项目原创的可爱黄色小龙 **SVG 占位图**，不是官方奶龙素材。先保证游戏完整可玩，再换入正式 sprite。

1. 将图片放入 `assets/nailong/`，推荐透明背景、正方形画布，角色居中。
2. 在 `js/assets.js` 的等级定义中更新对应 `src`；支持 SVG、PNG、WebP。也可直接覆盖同名 SVG。
3. 等级的 `radius` 是物理半径，独立于原始图片像素。透明留白过大会造成视觉和碰撞范围不一致，应裁切后再替换。
4. 图片加载失败时 Canvas 使用带等级数字的圆形后备图，继续运行游戏。

运行 `node tools/create-placeholders.cjs` 可重新生成占位图；它会覆盖 11 张同名 SVG，替换正式素材后请勿运行。

| 等级 | 名称 | 半径 | 合成积分 |
| --- | --- | ---: | ---: |
| 1 | 小奶龙 | 17 | 0（起始形态） |
| 2 | 呆萌奶龙 | 22 | 4 |
| 3 | 惊讶奶龙 | 28 | 10 |
| 4 | 调皮奶龙 | 35 | 20 |
| 5 | 喝奶奶龙 | 43 | 36 |
| 6 | 甜心奶龙 | 52 | 60 |
| 7 | 金箍奶龙 | 62 | 100 |
| 8 | 派对奶龙 | 74 | 160 |
| 9 | 太空奶龙 | 87 | 260 |
| 10 | 皇冠奶龙 | 102 | 420 |
| 11 | 超级奶龙 | 119 | 800 |

## 物理与性能

固定 1/120 秒子步，采用质量加权的位置约束和速度冲量。每子步 7 轮圆形碰撞求解，包含重力、碰撞反弹、库仑摩擦、角速度和空气阻力。合成对在同一子步锁定，防止同一只奶龙重复合成；新生成物体有短暂的合成冷却和超线宽限。

逻辑画布为 420 × 600，显示等比缩放。屏幕像素比最多使用 2，粒子限制 100 个；短屏手机会缩小游戏区以完整显示落点。碰撞采用 O(n²) 小型求解器，适合本游戏的堆叠规模。后台或图鉴打开时停止模拟，恢复时不补算暂停时间。

## 检查

```sh
node --check js/game.js
node --check js/physics.js
node --check js/assets.js
node tests/physics.test.cjs
```

物理检查覆盖重力、反弹、摩擦旋转、全部合成等级、重复合成、最高级、警戒线宽限、拥挤堆叠和重开。Pages 发布前自动执行该检查。

可选浏览器检查需另行安装 Playwright，不属于游戏运行依赖。在静态服务器运行时执行 `node tests/browser.test.cjs`。可用 `GAME_URL` 指定站点、`BROWSER_PATH` 指定 Chromium/Chrome/Edge 路径；截图输出到忽略的 `test-results/`。

## GitHub Pages 部署

**仓库首次设置：** 在 GitHub 的 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。这是 GitHub 的仓库设置，单纯提交 YAML 不能替代首次启用。

- `.github/workflows/pages.yml` 在每次 push `main` 时自动验证并部署，也支持 Actions 页面手动 Run workflow。
- 发布内容只包含 `index.html`、`css/`、`js/`、`assets/`；所有引用使用相对路径，兼容 `/bignainai/` 子路径。
- 部署成功后访问 <https://shenzhuangz.github.io/bignainai/>。
- 若 Pages 尚未启用，Configure Pages 会失败；启用后在 Actions 重跑失败的 workflow。

## 完成状态

- [x] 项目初始化
- [x] 11 级独立占位 sprite 与素材替换接口
- [x] Canvas 圆形物理系统与合成计分
- [x] 合成粒子、分数动画和解锁提示
- [x] 手机触摸、鼠标、键盘和短屏适配
- [x] 最高分保存、预览、图鉴、结束界面和重新开始
- [x] GitHub Pages 自动部署工作流
- [ ] 替换正式奶龙 sprite
