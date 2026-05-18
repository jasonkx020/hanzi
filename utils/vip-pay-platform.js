/**
 * 支付渠道识别与平台调起（微信小程序 / App / 其它）
 */

/** @returns {'wx_mp'|'wx_app'|'alipay_app'|'apple_iap'|'h5'|'mock'} */
export function detectPayChannel(prefer) {
	if (prefer && prefer !== 'auto') return prefer
	// #ifdef MP-WEIXIN
	return 'wx_mp'
	// #endif
	// #ifdef APP-PLUS
	try {
		const sys = uni.getSystemInfoSync()
		if (String(sys.platform || '').toLowerCase() === 'ios') return 'apple_iap'
	} catch (_) {}
	return 'wx_app'
	// #endif
	// #ifdef H5
	return 'h5'
	// #endif
	return 'mock'
}

export function payChannelLabel(channel) {
	const map = {
		wx_mp: '微信支付',
		wx_app: '微信支付',
		alipay_app: '支付宝',
		apple_iap: '苹果内购',
		h5: '网页支付',
		mock: '演示支付'
	}
	return map[channel] || '支付'
}

/**
 * 微信小程序 login code（供服务端换 openId）
 * @returns {Promise<string>}
 */
export function getWxLoginCode() {
	return new Promise((resolve, reject) => {
		// #ifdef MP-WEIXIN
		uni.login({
			provider: 'weixin',
			success: (res) => {
				if (res && res.code) resolve(res.code)
				else reject(new Error('no_wx_code'))
			},
			fail: (err) => reject(err || new Error('wx_login_fail'))
		})
		// #endif
		// #ifndef MP-WEIXIN
		reject(new Error('not_mp_weixin'))
		// #endif
	})
}

/**
 * @param {object} payParams 服务端返回
 * @param {string} payChannel
 */
export function invokePlatformPayment(payParams, payChannel) {
	const channel = payChannel || detectPayChannel()
	if (channel === 'mock') {
		return Promise.resolve({ ok: true, channel: 'mock' })
	}
	if (channel === 'apple_iap') {
		return Promise.reject(
			new Error('苹果内购需配置 App Store 商品与 receipt 校验接口，当前请使用服务端 mock 或 H5/安卓微信通道')
		)
	}
	if (channel === 'h5') {
		return Promise.reject(new Error('H5 请使用收银台跳转或配置 apiBaseUrl'))
	}

	const params = payParams || {}
	return new Promise((resolve, reject) => {
		const opt = {
			success: (res) => resolve({ ok: true, channel, raw: res }),
			fail: (err) => {
				const msg = err && err.errMsg ? String(err.errMsg) : ''
				if (/cancel/i.test(msg)) reject(new Error('cancel'))
				else reject(err || new Error('pay_fail'))
			}
		}
		if (channel === 'wx_mp') {
			opt.timeStamp = params.timeStamp
			opt.nonceStr = params.nonceStr
			opt.package = params.package
			opt.signType = params.signType || 'RSA'
			opt.paySign = params.paySign
		} else if (channel === 'wx_app') {
			opt.provider = 'wxpay'
			opt.orderInfo = params.orderInfo || params
		} else if (channel === 'alipay_app') {
			opt.provider = 'alipay'
			opt.orderInfo = params.orderInfo || params
		}
		uni.requestPayment(opt)
	})
}
