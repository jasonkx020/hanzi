<template>
	<meng-sub-page
		title="识字进度"
		subtitle="和萌萌一起认字"
		avatar-pose="book"
		:padded="false"
		:overlap-body="true"
	>
		<view class="curriculum-sheet">
			<view class="summary-pill">
				<text class="summary-label">当前字库</text>
				<text class="summary-value clamp-2">{{ summaryPreview }}</text>
			</view>

			<view class="card card--hint">
				<meng-avatar pose="curious" size="xs" />
				<text class="hint-text">萌萌识字使用「萌萌常用字」字库，和萌萌一起认字、写字、玩游戏就好啦。</text>
			</view>

			<view class="card">
				<text class="field-label">字库</text>
				<view class="picker-row picker-row--static">
					<text class="picker-value">萌萌常用字</text>
				</view>
			</view>

			<button class="save-btn" type="primary" @click="goLearned">查看我学过的字</button>
			<button class="link-btn" type="default" @click="goMengmeng">去萌萌识字</button>
			<button class="debug-btn" type="default" @click="goDebugConsole">调试：查看 JS 日志</button>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import MengAvatar from '@/components/meng-avatar.vue'
import {
	ensurePreschoolCurriculumPrefs,
	formatCurriculumSummary,
	getCurriculumPrefs
} from '@/utils/curriculum-storage.js'
import { startTextbookLearning } from '@/modules/literacy/usecases/start-textbook-learning.js'

export default {
	components: { MengSubPage, MengAvatar },
	data() {
		return {
			summaryPreview: ''
		}
	},
	onShow() {
		ensurePreschoolCurriculumPrefs()
		this.summaryPreview = formatCurriculumSummary(getCurriculumPrefs())
	},
	methods: {
		goLearned() {
			uni.navigateTo({ url: '/pages/me/learned' })
		},
		goMengmeng() {
			startTextbookLearning()
		},
		goDebugConsole() {
			uni.navigateTo({ url: '/pages/debug/console' })
		}
	}
}
</script>

<style scoped>
.curriculum-sheet {
	padding: 8rpx 4rpx 40rpx;
	box-sizing: border-box;
}

.summary-pill {
	margin-bottom: 16rpx;
	padding: 20rpx 22rpx;
	border-radius: 24rpx;
	background: linear-gradient(135deg, #fff8f0, #fff);
	border: 3rpx solid var(--meng-border-warm, #eadfce);
}

.summary-label {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
	color: #9a9088;
	margin-bottom: 8rpx;
}

.summary-value {
	display: block;
	font-size: 28rpx;
	font-weight: 800;
	color: #2c2419;
	line-height: 1.4;
}

.card {
	margin-bottom: 14rpx;
	padding: 20rpx 22rpx;
	border-radius: 22rpx;
	background: #fff;
	border: 3rpx solid var(--meng-border-warm, #eadfce);
}

.card--hint {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
}

.hint-text {
	flex: 1;
	margin-left: 12rpx;
	font-size: 26rpx;
	line-height: 1.45;
	color: #5c554c;
	font-weight: 600;
}

.field-label {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
	color: #9a9088;
	margin-bottom: 10rpx;
}

.picker-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
}

.picker-row--static {
	justify-content: flex-start;
}

.picker-value {
	font-size: 30rpx;
	font-weight: 800;
	color: #2c2419;
}

.save-btn {
	margin-top: 20rpx;
	border-radius: 999rpx;
	font-weight: 800;
}

.link-btn {
	margin-top: 16rpx;
	border-radius: 999rpx;
	font-weight: 700;
}

.debug-btn {
	margin-top: 24rpx;
	border-radius: 16rpx;
	font-size: 24rpx;
}
</style>
