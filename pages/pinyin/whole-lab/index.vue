<template>
	<meng-sub-page title="整体认读乐园" subtitle="整音节记住，不用拼" avatar-pose="happy" :overlap-body="true">
		<view class="lab-map">
			<view v-for="lv in levels" :key="lv.id" class="lab-map-node-wrap">
				<view
					class="lab-map-node"
					:class="{
						'lab-map-node--done': nodeDone(lv.id),
						'lab-map-node--locked': !nodeUnlocked(lv.id),
						'lab-map-node--current': nodeUnlocked(lv.id) && !nodeDone(lv.id) && !lv.isLink
					}"
					@click="onTapLevel(lv)"
				>
					<text class="lab-map-emoji">{{ lv.emoji }}</text>
					<text class="lab-map-title">{{ lv.title }}</text>
					<text class="lab-map-sub">{{ lv.subtitle }}</text>
					<view v-if="!lv.isLink" class="lab-map-stars">
						<text v-for="n in 3" :key="n" class="lab-map-star">{{ starChar(lv.id, n) }}</text>
					</view>
					<text v-if="!nodeUnlocked(lv.id)" class="lab-map-lock">🔒 先完成上一关</text>
				</view>
			</view>
			<view class="lab-map-actions">
				<view class="lab-map-action" @click="goChart">
					<text class="lab-map-action-emoji">📋</text>
					<text class="lab-map-action-text">整体认读表</text>
					<text class="lab-map-action-sub">按组浏览，点格子听读音</text>
				</view>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { WHOLE_LEVELS } from '@/utils/pinyin-whole-lab/constants.js'
import { loadWholeLabProgress, isWholeLevelUnlocked } from '@/utils/pinyin-whole-lab/progress.js'

const ROUTES = {
	1: '/pages/pinyin/whole-lab/ear',
	2: '/pages/pinyin/whole-lab/tip',
	3: '/pages/pinyin/whole-lab/group'
}

export default {
	components: { MengSubPage },
	data() {
		return {
			levels: WHOLE_LEVELS,
			progress: loadWholeLabProgress()
		}
	},
	onShow() {
		this.progress = loadWholeLabProgress()
	},
	methods: {
		nodeUnlocked(id) {
			if (id === 1) return true
			return isWholeLevelUnlocked(id, this.progress)
		},
		nodeDone(id) {
			if (id === 1) return !!this.progress.level1Done
			if (id === 2) return !!this.progress.level2Done
			if (id === 3) return !!this.progress.level3Done
			return false
		},
		starChar(levelId, n) {
			const c = Number(this.progress.stars[String(levelId)]) || 0
			return n <= c ? '★' : '☆'
		},
		onTapLevel(lv) {
			if (lv.isLink) {
				if (!this.nodeUnlocked(lv.id)) {
					uni.showToast({ title: '先完成「同组小能手」哦', icon: 'none' })
					return
				}
				uni.navigateTo({ url: '/pages/pinyin/drill?category=whole' })
				return
			}
			if (!this.nodeUnlocked(lv.id)) {
				const hint =
					lv.id === 2
						? '先完成「认读耳朵」哦'
						: lv.id === 3
							? '先完成「认读小贴士」哦'
							: '先完成上一关哦'
				uni.showToast({ title: hint, icon: 'none' })
				return
			}
			const url = ROUTES[lv.id]
			if (url) uni.navigateTo({ url })
		},
		goChart() {
			uni.navigateTo({ url: '/pages/pinyin/whole-lab/chart' })
		}
	}
}
</script>

<style scoped>
.lab-map {
	padding: 8rpx 8rpx 32rpx;
}
.lab-map-node-wrap {
	margin-bottom: 20rpx;
}
.lab-map-node {
	padding: 28rpx 24rpx;
	border-radius: 28rpx;
	background: #fff;
	border: 4rpx solid var(--meng-border-warm, #e8dfd0);
	box-shadow: 0 10rpx 24rpx rgba(44, 36, 25, 0.08);
}
.lab-map-node--done {
	border-color: #7fd49a;
	background: linear-gradient(135deg, #f0fff4 0%, #fff 100%);
}
.lab-map-node--current {
	border-color: #e8a020;
	background: linear-gradient(135deg, #fff8e8 0%, #fff 100%);
}
.lab-map-node--locked {
	opacity: 0.55;
}
.lab-map-emoji {
	font-size: 48rpx;
	display: block;
	margin-bottom: 8rpx;
}
.lab-map-title {
	display: block;
	font-size: 34rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
}
.lab-map-sub {
	display: block;
	margin-top: 6rpx;
	font-size: 26rpx;
	color: #6d5e52;
	line-height: 1.4;
}
.lab-map-stars {
	margin-top: 12rpx;
}
.lab-map-star {
	font-size: 32rpx;
	color: #f5a623;
	margin-right: 6rpx;
}
.lab-map-lock {
	display: block;
	margin-top: 10rpx;
	font-size: 24rpx;
	color: #9a9088;
}
.lab-map-actions {
	margin-top: 24rpx;
}
.lab-map-action {
	padding: 24rpx;
	border-radius: 24rpx;
	background: linear-gradient(135deg, #fff8e8 0%, #fff5f0 100%);
	border: 3rpx solid var(--meng-border-warm);
	display: flex;
	flex-direction: column;
	align-items: center;
}
.lab-map-action-emoji {
	font-size: 40rpx;
}
.lab-map-action-text {
	margin-top: 8rpx;
	font-size: 30rpx;
	font-weight: 800;
	color: #2c2419;
}
.lab-map-action-sub {
	margin-top: 4rpx;
	font-size: 24rpx;
	color: #6d5e52;
}
</style>
