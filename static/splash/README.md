# App 原生启动图（云打包）

由 `static/mengmeng/ip/happy.png` 生成，配置在 `manifest.json` → `app-plus.distribute.splashscreen`。

## 重新生成

```bash
npm run assets:splash
```

会生成：

- Android：`static/splash/android/{hdpi,xhdpi,xxhdpi}.png`
- iOS：`static/splash/ios/storyboard-src/`（源码）与 `static/splash/ios/CustomStoryboard.zip`（云打包用）

首次生成 iOS 需存在 DCloud 模板目录（脚本会读 `static/splash/ios/_template/CustomStoryboard/`）。若缺失，可从 [CustomStoryboard.zip](https://native-res.dcloud.net.cn/uni-app/file/CustomStoryboard.zip) 解压到该路径。

## 说明

- **仅云打包 / 正式包生效**，HBuilderX 标准基座通常仍是默认闪屏。
- 原生启动图为**静态图**（iOS 为 Storyboard + PNG），不支持 GIF 帧动画。
- **Android**：自定义整屏启动图。
- **iOS**：`iosStyle: storyboard`，居中 `happy` 大图、背景 `#F6F3EC`，符合 App Store 对 Storyboard 启动页的要求。

HBuilderX 也可在 `manifest.json` → **App 启动界面配置** → iOS **自定义 storyboard 启动界面** 中选择 `CustomStoryboard.zip` 核对。
