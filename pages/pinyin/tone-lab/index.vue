<!--
  @file index.vue
  @layer L1 表现层
  @description 路由页面源文件：index.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<meng-sub-page title="声调乐园" subtitle="听一听，调号就会啦" avatar-pose="happy" :overlap-body="true">
		<view class="tone-map">
			<view v-for="lv in levels" :key="lv.id" class="tone-map-node-wrap">
				<view
					class="tone-map-node"
					:class="{
						'tone-map-node--done': nodeDone(lv.id),
						'tone-map-node--locked': !nodeUnlocked(lv.id),
						'tone-map-node--current': nodeUnlocked(lv.id) && !nodeDone(lv.id) && !lv.locked
					}"
					@click="onTapLevel(lv)"
				>
					<text class="tone-map-emoji">{{ lv.emoji }}</text>
					<text class="tone-map-title">{{ lv.title }}</text>
					<text class="tone-map-sub">{{ lv.subtitle }}</text>
					<view class="tone-map-stars">
						<text v-for="n in 3" :key="n" class="tone-map-star">{{ starChar(lv.id, n) }}</text>
					</view>
					<text v-if="!nodeUnlocked(lv.id)" class="tone-map-lock">🔒 先完成上一关</text>
					<text v-else-if="lv.locked" class="tone-map-lock">🔒 即将开放</text>
				</view>
			</view>

			<view class="tone-map-actions">
				<view class="tone-map-action" @click="goChart">
					<text class="tone-map-action-emoji">📖</text>
					<text class="tone-map-action-text">四声词典</text>
					<text class="tone-map-action-sub">点一行，听四声连读</text>
				</view>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { TONE_LEVELS } from '@/utils/pinyin-tone-lab/constants.js'
import { loadToneLabProgress, isLevelUnlocked } from '@/utils/pinyin-tone-lab/progress.js'

const ROUTES = {
	1: '/pages/pinyin/tone-lab/ear',
	2: '/pages/pinyin/tone-lab/body',
	3: '/pages/pinyin/tone-lab/match',
	4: '/pages/pinyin/tone-lab/mark',
	5: '/pages/pinyin/tone-lab/words'
}

export default {
	components: { MengSubPage },
	data() {
		return {
			levels: TONE_LEVELS,
			progress: loadToneLabProgress()
		}
	},
	onShow() {
		this.progress = loadToneLabProgress()
	},
	methods: {
		nodeUnlocked(id) {
			if (id === 1) return true
			return isLevelUnlocked(id, this.progress)
		},
		nodeDone(id) {
			if (id === 1) return !!this.progress.level1Done
			if (id === 2) return !!this.progress.level2Done
			if (id === 3) return !!this.progress.level3Done
			if (id === 4) return !!this.progress.level4Done
			if (id === 5) return !!this.progress.level5Done
			return false
		},
		starChar(levelId, n) {
			const c = Number(this.progress.stars[String(levelId)]) || 0
			return n <= c ? '★' : '☆'
		},
		onTapLevel(lv) {
			if (lv.locked) {
				uni.showToast({ title: '这一关还在准备中', icon: 'none' })
				return
			}
			if (!this.nodeUnlocked(lv.id)) {
				const hint =
					lv.id === 2
						? '先完成「四声耳朵」哦'
						: lv.id === 3
							? '先完成「四声身体」哦'
							: lv.id === 4
							? '先完成「调号朋友」哦'
							: lv.id === 5
								? '先完成「标调魔法」哦'
								: '先完成上一关哦'
				uni.showToast({ title: hint, icon: 'none' })
				return
			}
			const url = ROUTES[lv.id]
			if (!url) {
				uni.showToast({ title: '即将开放', icon: 'none' })
				return
			}
			uni.navigateTo({ url })
		},
		goChart() {
			uni.navigateTo({ url: '/pages/pinyin/tone-lab/chart' })
		}
	}
}
</script>

<style scoped>
.tone-map {
	padding: 8rpx 8rpx 32rpx;
}

.tone-map-node-wrap {
	margin-bottom: 20rpx;
}

.tone-map-node {
	padding: 28rpx 24rpx;
	border-radius: 28rpx;
	background: #fff;
	border: 4rpx solid var(--meng-border-warm, #e8dfd0);
	box-shadow: 0 10rpx 24rpx rgba(44, 36, 25, 0.08);
}

.tone-map-node--done {
	border-color: #7fd49a;
	background: linear-gradient(135deg, #f0fff4 0%, #fff 100%);
}

.tone-map-node--current {
	border-color: #ff8aab;
	background: linear-gradient(135deg, #fff5fa 0%, #fff 100%);
}

.tone-map-node--locked {
	opacity: 0.55;
}

.tone-map-emoji {
	font-size: 48rpx;
	display: block;
	margin-bottom: 8rpx;
}

.tone-map-title {
	display: block;
	font-size: 34rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
}

.tone-map-sub {
	display: block;
	margin-top: 6rpx;
	font-size: 26rpx;
	color: #6d5e52;
	line-height: 1.4;
}

.tone-map-stars {
	margin-top: 12rpx;
}

.tone-map-star {
	font-size: 32rpx;
	color: #f5a623;
	margin-right: 6rpx;
}

.tone-map-lock {
	display: block;
	margin-top: 10rpx;
	font-size: 24rpx;
	color: #9a9088;
}

.tone-map-actions {
	margin-top: 24rpx;
}

.tone-map-action {
	padding: 24rpx;
	border-radius: 24rpx;
	background: var(--meng-banner-soft, #fff8f0);
	border: 3rpx solid var(--meng-border-warm);
	display: flex;
	flex-direction: column;
	align-items: center;
}

.tone-map-action-emoji {
	font-size: 40rpx;
}

.tone-map-action-text {
	margin-top: 8rpx;
	font-size: 30rpx;
	font-weight: 800;
	color: #2c2419;
}

.tone-map-action-sub {
	margin-top: 4rpx;
	font-size: 24rpx;
	color: #6d5e52;
}
</style>
