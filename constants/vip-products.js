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

/** 年级字库永久解锁（单次 IAP） */
export const GRADE_IAP_PRODUCTS = [1, 2, 3, 4, 5, 6].map((grade) => ({
	id: `grade_pack_${grade}`,
	name: `${grade} 年级字库`,
	priceYuan: 12,
	kind: 'grade_pack',
	grade,
	durationDays: 0,
	tag: '永久',
	highlight: false
}))

/** 期末复习字包 */
export const REVIEW_IAP_PRODUCT = {
	id: 'review_pack_final',
	name: '期末复习 200 字包',
	priceYuan: 6,
	kind: 'review_pack',
	durationDays: 0,
	tag: '复习',
	highlight: false
}

export const IAP_PRODUCTS = [...GRADE_IAP_PRODUCTS, REVIEW_IAP_PRODUCT]

export const ALL_VIP_PRODUCTS = [...VIP_PLANS, ...IAP_PRODUCTS]

/** @param {string} productId */
export function findVipProduct(productId) {
	return ALL_VIP_PRODUCTS.find((p) => p.id === productId) || null
}

/** 免费版与会员版对比（面向家长说明） */
export const VIP_COMPARE = [
	{ label: '字库范围', free: '当前年级册别', vip: '1～6 年级上下册任意切换' },
	{ label: '笔顺/写字', free: '每日少量次数', vip: '动画、描红、写字不限' },
	{ label: '拼音自动连读', free: '需会员', vip: '整页自动连读不限' },
	{ label: '每日一练', free: '每日 1 轮', vip: '多轮练习与弱项计划' },
	{ label: '趣味营/拼读', free: '每日有限次', vip: '气球营、换一批不限' },
	{ label: '查字', free: '每日约 18 次', vip: '不限次' },
	{ label: '易错复习', free: '仅展示前 5 个', vip: '完整易错字夹' },
	{ label: '导出', free: '—', vip: '生字清单与周报告可分享' },
	{ label: '家庭档案', free: '—', vip: '家庭年卡支持 2 位孩子' },
	{ label: '展示', free: '含教育类推荐位', vip: '去除第三方推广' }
]
