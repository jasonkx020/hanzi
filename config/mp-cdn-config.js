/**
 * 微信小程序外置资源（拼音音频、萌萌语音、笔顺 JSON、大图）。
 * 发行前把 CDN 根地址填到这里，并在微信后台配置 downloadFile / request 合法域名。
 * 例：https://cdn.example.com/mengmeng
 */
export const MP_CDN_BASE = ''

/**
 * 微信小程序 AppID。填好后运行 npm run assets:mp:prepare 会写回 manifest.json。
 * 也可直接改 manifest.json → mp-weixin.appid。
 */
export const MP_WEIXIN_APPID = ''
