<template>
	<view class="page">
		<view v-if="rows.length === 0" class="empty">
			<text class="empty-title">暂无记录</text>
			<text class="empty-tip">在生字详情中「标记已学过」后，会出现在这里；数据字段与本地 SQLite user_char_progress 一致。</text>
		</view>
		<view v-else class="grid">
			<view
				v-for="(r, i) in rows"
				:key="i"
				class="cell"
				@click="openDetail(r)"
			>
				<text class="char">{{ r[COL_PROGRESS.hanzi] }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { COL_PROGRESS } from '@/constants/curriculum-schema.js'
import { speakHanzi } from '@/utils/speak-hanzi.js'
import { listLearnedChars } from '@/utils/user-progress-storage.js'

export default {
	data() {
		return {
			COL_PROGRESS,
			rows: []
		}
	},
	onShow() {
		this.rows = listLearnedChars()
	},
	methods: {
		openDetail(r) {
			speakHanzi(r[COL_PROGRESS.hanzi] || '')
			const h = encodeURIComponent(r[COL_PROGRESS.hanzi] || '')
			const g = r[COL_PROGRESS.grade] ?? ''
			const s = encodeURIComponent(r[COL_PROGRESS.semester] || '')
			uni.navigateTo({
				url: `/pages/char/detail?hanzi=${h}&grade=${g}&semester=${s}`
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

.empty {
	padding: 48rpx 24rpx;
	background: #fffef9;
	border-radius: 16rpx;
}

.empty-title {
	display: block;
	font-size: 30rpx;
	font-weight: 600;
	color: #2c2419;
	margin-bottom: 16rpx;
}

.empty-tip {
	display: block;
	font-size: 24rpx;
	color: #8a8279;
	line-height: 1.55;
}

.grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}

.cell {
	flex: 0 0 22%;
	width: 22%;
	max-width: 22%;
	box-sizing: border-box;
	margin-right: 4%;
	margin-bottom: 16rpx;
	min-height: 88rpx;
	background: #fffef9;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2rpx 8rpx rgba(44, 36, 25, 0.06);
}

.cell:nth-child(4n) {
	margin-right: 0;
}

.char {
	font-size: 44rpx;
	font-weight: 600;
	color: #2c2419;
}
</style>
