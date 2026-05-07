<template>
	<view class="page">
		<view class="bar">
			<text class="bar-text">{{ summary }}</text>
		</view>
		<view class="placeholder">
			<text class="p-title">字表</text>
			<text class="p-desc">当前筛选共 {{ chars.length }} 字（App 读 plus.sqlite；其它端无库时为 0）。</text>
			<button type="primary" size="mini" @click="goSettings">筛选条件</button>
			<button class="mt" type="default" size="mini" @click="openDemoChar">打开示例生字页</button>
			<button class="mt" type="default" size="mini" @click="reloadDb">刷新数据</button>
		</view>
		<view v-if="chars.length" class="grid">
			<view
				v-for="(row, i) in chars"
				:key="row.id != null ? row.id : i"
				class="cell"
				@click="openChar(row)"
			>
				<text class="cell-char">{{ row.hanzi }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { getCurriculumPrefs, formatCurriculumSummary } from '@/utils/curriculum-storage.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'

export default {
	data() {
		return {
			summary: '',
			chars: []
		}
	},
	onShow() {
		this.summary = formatCurriculumSummary(getCurriculumPrefs())
		this.reloadDb()
	},
	methods: {
		async reloadDb() {
			this.chars = await queryCurriculumChars(getCurriculumPrefs())
		},
		openChar(row) {
			const p = getCurriculumPrefs()
			const h = encodeURIComponent(row.hanzi || '')
			uni.navigateTo({
				url: `/pages/char/detail?hanzi=${h}&grade=${p.grade}&semester=${encodeURIComponent(p.semester)}`
			})
		},
		goSettings() {
			uni.navigateTo({ url: '/pages/settings/curriculum' })
		},
		openDemoChar() {
			const p = getCurriculumPrefs()
			uni.navigateTo({
				url: `/pages/char/detail?hanzi=${encodeURIComponent('天')}&grade=${p.grade}&semester=${encodeURIComponent(p.semester)}`
			})
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	background: #f4f1ea;
	padding: 24rpx;
	box-sizing: border-box;
}

.bar {
	padding: 16rpx 20rpx;
	background: #fffef9;
	border-radius: 12rpx;
	margin-bottom: 24rpx;
}

.bar-text {
	font-size: 24rpx;
	color: #4a453f;
}

.placeholder {
	padding: 48rpx 32rpx;
	background: #fff;
	border-radius: 20rpx;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 16rpx;
}

.p-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #2c2419;
}

.p-desc {
	font-size: 26rpx;
	color: #6b6560;
	line-height: 1.5;
}

.mt {
	margin-top: 8rpx;
}

.grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
	margin-top: 24rpx;
}

.cell {
	width: calc((100% - 48rpx) / 4);
	aspect-ratio: 1;
	background: #fffef9;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2rpx 8rpx rgba(44, 36, 25, 0.06);
}

.cell-char {
	font-size: 40rpx;
	font-weight: 600;
	color: #2c2419;
}
</style>
