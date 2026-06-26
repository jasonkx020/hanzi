<!--
  @file initial-mouth-card.vue
  @layer L1 表现层
  @description UI 组件源文件：initial-mouth-card.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<view
		class="mouth-card"
		:class="{ 'mouth-card--active': active }"
		:style="{ borderColor: borderColor, backgroundColor: active ? bgColor + '33' : '#fff' }"
	>
		<text class="mouth-card-emoji">{{ section.emoji || '👄' }}</text>
		<text class="mouth-card-title">{{ section.kidTitle || section.title }}</text>
		<text class="mouth-card-tip">{{ section.kidTip }}</text>
	</view>
</template>

<script>
export default {
	name: 'InitialMouthCard',
	props: {
		section: { type: Object, default: () => ({}) },
		active: { type: Boolean, default: false },
		bgColor: { type: String, default: '#ffe8f2' },
		borderColor: { type: String, default: '#e8b8cc' }
	}
}
</script>

<style scoped>
.mouth-card {
	padding: 20rpx 18rpx;
	border-radius: 24rpx;
	border-width: 4rpx;
	border-style: solid;
	text-align: center;
}

.mouth-card--active {
	transform: scale(1.02);
	box-shadow: 0 10rpx 22rpx rgba(44, 36, 25, 0.1);
}

.mouth-card-emoji {
	font-size: 52rpx;
	display: block;
}

.mouth-card-title {
	display: block;
	margin-top: 8rpx;
	font-size: 30rpx;
	font-weight: 800;
	color: #2c2419;
}

.mouth-card-tip {
	display: block;
	margin-top: 6rpx;
	font-size: 24rpx;
	color: #6d5e52;
	line-height: 1.35;
}
</style>
