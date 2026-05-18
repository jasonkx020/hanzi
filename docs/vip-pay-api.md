# 会员支付 API 约定（P1）

客户端实现：`services/vip-order-service.js`、`services/vip-pay-service.js`。

## 通用

- 鉴权：建议 Header `Authorization: Bearer <token>` 或绑定 `clientUserId`（客户端持久化 UUID）。
- 金额单位：服务端与微信统一下单均为 **分**；客户端展示用元。

## POST `/api/vip/orders`

创建待支付订单。

**请求体**

```json
{
  "planId": "vip_quarter",
  "payChannel": "wx_mp",
  "clientUserId": "uuid-xxx",
  "wxLoginCode": "仅 wx_mp 需要，uni.login 的 code"
}
```

`payChannel` 枚举：

| 值 | 说明 |
|----|------|
| `wx_mp` | 微信小程序 JSAPI |
| `wx_app` | 微信 App 支付 |
| `alipay_app` | 支付宝 App |
| `apple_iap` | 苹果内购（需额外 receipt 校验接口） |
| `mock` | 演示 |

**响应**

```json
{
  "orderId": "ord_20260518_xxx",
  "planId": "vip_quarter",
  "amountFen": 4800,
  "payChannel": "wx_mp",
  "payParams": {
    "timeStamp": "1716000000",
    "nonceStr": "...",
    "package": "prepay_id=...",
    "signType": "RSA",
    "paySign": "..."
  }
}
```

`payParams` 字段因渠道而异；App 微信可能为 `orderInfo` 字符串。

## POST `/api/vip/orders/:orderId/confirm`

支付完成后客户端查单（微信/支付宝建议以服务端查单为准，勿只信客户端回调）。

**请求体**

```json
{
  "planId": "vip_quarter",
  "clientUserId": "uuid-xxx"
}
```

**响应**

```json
{
  "orderId": "ord_20260518_xxx",
  "status": "paid",
  "expireAtMs": 1747526400000
}
```

## GET `/api/vip/entitlement?clientUserId=uuid-xxx`

**响应**

```json
{
  "active": true,
  "expireAtMs": 1747526400000
}
```

## 微信回调（服务端）

微信支付结果通知 URL 由商户平台配置，回调成功后更新订单表并写入 `expireAtMs`，与 confirm 接口返回一致。

## 苹果内购（扩展）

建议单独接口 `POST /api/vip/apple/verify`，body 含 `receiptData`、`planId`、`clientUserId`。
