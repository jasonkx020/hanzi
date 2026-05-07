<template>
	<view class="page">
		<view v-if="rows.length === 0" class="empty">
			<text class="empty-title">暂无易错记录</text>
			<text class="empty-tip">笔顺练习写错、或在生字页「记录一次出错」会增加计数；按 wrong_count 排序，与 SQLite user_char_progress.wrong_count 对应。</text>
		</view>
		<view v-else class="list">
			<view
				v-for="(r, i) in rows"
				:key="i"
				class="row"
				@click="openDetail(r)"
			>
				<text class="char">{{ r[COL_PROGRESS.hanzi] }}</text>
				<view class="meta">
					<text class="dim">{{ r[COL_PROGRESS.grade] }}年级{{ r[COL_PROGRESS.semester] }}</text>
					<text class="badge">错 {{ r[COL_PROGRESS.wrong_count] }} 次</text>
				</view>
				<text class="arrow">›</text>
			</view>
		</view>
	</view>
</template>

<script>
import { COL_PROGRESS } from '@/constants/curriculum-schema.js'
import { listWrongOftenChars } from '@/utils/user-progress-storage.js'

export default {
	data() {
		return {
			COL_PROGRESS,
			rows: []
		}
	},
	onShow() {
		this.rows = listWrongOftenChars()
	},
	methods: {
		openDetail(r) {
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

.list {
	background: #fffef9;
	border-radius: 16rpx;
	overflow: hidden;
}

.row {
	display: flex;
	align-items: center;
	padding: 24rpx;
	border-bottom: 1rpx solid #eee;
	gap: 20rpx;
}

.row:last-child {
	border-bottom: none;
}

.char {
	font-size: 40rpx;
	font-weight: 600;
	color: #2c2419;
	min-width: 72rpx;
}

.meta {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.dim {
	font-size: 22rpx;
	color: #8a8279;
}

.badge {
	font-size: 24rpx;
	color: #9a3412;
	font-weight: 500;
}

.arrow {
	font-size: 32rpx;
	color: #c4bcb4;
}
</style>
