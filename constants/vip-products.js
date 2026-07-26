/** 订阅会员档位 */
export const VIP_PLANS = [
	{
		id: 'vip_month',
		name: '月度会员',
		priceYuan: 18,
		durationDays: 31,
		tag: '',
		highlight: false,
		kind: 'subscription'
	},
	{
		id: 'vip_quarter',
		name: '季度会员',
		priceYuan: 48,
		durationDays: 93,
		tag: '省心之选',
		highlight: true,
		kind: 'subscription'
	},
	{
		id: 'vip_year',
		name: '年度会员',
		priceYuan: 128,
		durationDays: 372,
		tag: '均价更低',
		highlight: false,
		kind: 'subscription'
	},
	{
		id: 'vip_family_year',
		name: '家庭年卡',
		priceYuan: 168,
		durationDays: 372,
		tag: '2 个孩子',
		highlight: false,
		kind: 'subscription',
		familyPlan: true
	}
]

/** 年级字库永久解锁（已下线对外售卖，保留常量避免旧订单解析报错） */
export const GRADE_IAP_PRODUCTS = []

/** 期末复习字包（已下线） */
export const REVIEW_IAP_PRODUCT = null

export const IAP_PRODUCTS = []

export const ALL_VIP_PRODUCTS = [...VIP_PLANS]

/** @param {string} productId */
export function findVipProduct(productId) {
	return ALL_VIP_PRODUCTS.find((p) => p.id === productId) || null
}

/** 免费版与会员版对比（面向家长说明） */
export const VIP_COMPARE = [
	{ label: '字库范围', free: '萌萌常用字', vip: '萌萌常用字 · 完整体验' },
	{ label: '笔顺/写字', free: '每日少量次数', vip: '动画、描红、写字不限' },
	{ label: '每日一练', free: '每日 1 轮', vip: '多轮练习与弱项计划' },
	{ label: '气球营', free: '每日有限次', vip: '不限次' },
	{ label: '查字', free: '每日约 18 次', vip: '不限次' },
	{ label: '易错复习', free: '仅展示前 5 个', vip: '完整易错字夹' },
	{ label: '导出', free: '—', vip: '生字清单与周报告可分享' },
	{ label: '家庭档案', free: '—', vip: '家庭年卡支持 2 位孩子' },
	{ label: '展示', free: '含推荐位', vip: '去除第三方推广' }
]
