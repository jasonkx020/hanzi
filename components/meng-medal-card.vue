<!--
  @file meng-medal-card.vue
  @layer L1 表现层
  @description UI 组件源文件：meng-medal-card.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<view class="medal-card" :class="medal.unlocked ? 'medal-card--on' : 'medal-card--off'" @click="$emit('tap', medal)">
		<view class="medal-art">
			<image
				class="medal-img"
				:class="{ 'medal-img--dim': !medal.unlocked }"
				:src="displaySrc"
				mode="aspectFit"
				@error="onImgError"
			/>
			<view v-if="!medal.unlocked" class="medal-lock">
				<text class="medal-lock-icon">🔒</text>
			</view>
		</view>
		<text class="medal-name">{{ medal.name }}</text>
		<text class="medal-rule">{{ medal.rule }}</text>
		<view v-if="!medal.unlocked && medal.progress" class="medal-progress">
			<view class="medal-bar">
				<view class="medal-bar-fill" :style="{ width: medal.progress.percent + '%' }" />
			</view>
			<text class="medal-progress-text">{{ medal.progress.current }}/{{ medal.progress.target }}</text>
		</view>
		<text v-else-if="medal.unlocked" class="medal-done">已点亮</text>
	</view>
</template>

<script>
export default {
	name: 'MengMedalCard',
	props: {
		medal: {
			type: Object,
			required: true
		}
	},
	emits: ['tap'],
	data() {
		return {
			useFallback: false
		}
	},
	computed: {
		displaySrc() {
			if (this.useFallback) {
				return this.medal.fallbackImage || this.medal.image
			}
			return this.medal.image || this.medal.fallbackImage
		}
	},
	watch: {
		'medal.id'() {
			this.useFallback = false
		}
	},
	methods: {
		onImgError() {
			this.useFallback = true
		}
	}
}
</script>

<style scoped>
.medal-card {
	box-sizing: border-box;
	flex: 0 0 48%;
	width: 48%;
	max-width: 48%;
	margin-right: 4%;
	margin-bottom: 20rpx;
	padding: 18rpx 16rpx 20rpx;
	border-radius: 18rpx;
	background: var(--meng-card-solid, #fff);
	border: 1rpx solid #e7e1d4;
}

.medal-card:nth-child(2n) {
	margin-right: 0;
}

.medal-card--on {
	border-color: #e8c96a;
	box-shadow: 0 6rpx 20rpx rgba(201, 162, 39, 0.18);
}

.medal-card--off {
	opacity: 0.92;
}

.medal-art {
	position: relative;
	width: 120rpx;
	height: 120rpx;
	margin: 0 auto 12rpx;
}

.medal-img {
	width: 120rpx;
	height: 120rpx;
}

.medal-img--dim {
	filter: grayscale(0.85);
	opacity: 0.55;
}

.medal-lock {
	position: absolute;
	right: 0;
	bottom: 0;
	width: 44rpx;
	height: 44rpx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.92);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2rpx 8rpx rgba(44, 36, 25, 0.12);
}

.medal-lock-icon {
	font-size: 22rpx;
}

.medal-name {
	display: block;
	text-align: center;
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 6rpx;
}

.medal-rule {
	display: block;
	text-align: center;
	font-size: 21rpx;
	line-height: 1.45;
	color: #8a8279;
	min-height: 60rpx;
}

.medal-progress {
	margin-top: 10rpx;
}

.medal-bar {
	height: 8rpx;
	border-radius: 999rpx;
	background: #efe8dc;
	overflow: hidden;
}

.medal-bar-fill {
	height: 100%;
	background: linear-gradient(90deg, #8bc34a, #c9a227);
	border-radius: 999rpx;
}

.medal-progress-text {
	display: block;
	text-align: center;
	font-size: 20rpx;
	color: #a8a29e;
	margin-top: 6rpx;
}

.medal-done {
	display: block;
	text-align: center;
	font-size: 20rpx;
	color: #3d6b4a;
	margin-top: 8rpx;
	font-weight: 600;
}
</style>
