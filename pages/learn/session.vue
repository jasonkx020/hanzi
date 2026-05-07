<template>
	<view class="page">
		<text class="title">学习会话</text>
		<text class="desc">按当前教材偏好从 hanzi_curriculum 取字序列，配合 VIP 限额策略逐字练习。</text>
		<text class="count">当前库中本筛选字数：{{ dbCount }}（App 端有效）</text>
		<view class="box">
			<text class="mono">{{ debugSql }}</text>
		</view>
		<button type="primary" @click="goCatalog">先浏览字表</button>
	</view>
</template>

<script>
import { debugSelectSql, queryCurriculumChars } from '@/utils/curriculum-db.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'

export default {
	data() {
		return {
			debugSql: '',
			dbCount: 0
		}
	},
	async onShow() {
		const { sql, params } = debugSelectSql(getCurriculumPrefs())
		this.debugSql = `${sql}\n-- params: ${JSON.stringify(params)}`
		const rows = await queryCurriculumChars(getCurriculumPrefs())
		this.dbCount = rows.length
	},
	methods: {
		goCatalog() {
			uni.switchTab({ url: '/pages/catalog/catalog' })
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 32rpx;
	background: #f4f1ea;
	box-sizing: border-box;
}

.title {
	display: block;
	font-size: 36rpx;
	font-weight: 700;
	color: #2c2419;
	margin-bottom: 16rpx;
}

.desc {
	display: block;
	font-size: 26rpx;
	color: #5a534c;
	line-height: 1.55;
	margin-bottom: 16rpx;
}

.count {
	display: block;
	font-size: 26rpx;
	color: #3d6b4a;
	font-weight: 600;
	margin-bottom: 24rpx;
}

.box {
	background: #fff;
	padding: 20rpx;
	border-radius: 12rpx;
	margin-bottom: 28rpx;
}

.mono {
	font-size: 20rpx;
	color: #57606a;
	word-break: break-all;
	white-space: pre-wrap;
}
</style>
