/** 会员档位展示（实际金额与 applets / 微信商户配置保持一致后替换） */
export const VIP_PLANS = [
	{
		id: 'vip_month',
		name: '月度会员',
		priceYuan: 18,
		durationDays: 31,
		tag: '',
		highlight: false
	},
	{
		id: 'vip_quarter',
		name: '季度会员',
		priceYuan: 48,
		durationDays: 93,
		tag: '省心之选',
		highlight: true
	},
	{
		id: 'vip_year',
		name: '年度会员',
		priceYuan: 128,
		durationDays: 372,
		tag: '均价更低',
		highlight: false
	}
]

/** 免费版与会员版对比（面向家长说明） */
export const VIP_COMPARE = [
	{ label: '字库范围', free: '当前年级每日限额练习', vip: '1～6 年级上下册按需切换' },
	{ label: '笔顺练习', free: '演示次数有限', vip: '动画 / 描红不限次' },
	{ label: '复习巩固', free: '随机少量', vip: '易错字夹、复习计划、报表' },
	{ label: '导出', free: '—', vip: '导出生字清单（可打印）' },
	{ label: '展示', free: '含教育类推荐位', vip: '去除第三方推广' }
]
