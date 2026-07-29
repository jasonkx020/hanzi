<template>
	<view class="cmm">
		<!-- 源字 -->
		<view v-if="sourceHanzi" class="cmm-source-wrap">
			<view class="cmm-stem cmm-stem--up" aria-hidden="true" />
			<view class="cmm-node cmm-node--source" @click="$emit('source-click')">
				<text class="cmm-node-char">{{ sourceHanzi }}</text>
				<text class="cmm-node-label">源字</text>
			</view>
		</view>

		<!-- 中心部件 -->
		<view class="cmm-center-wrap">
			<view class="cmm-node cmm-node--center">
				<text class="cmm-node-char cmm-node-char--lg">{{ part || '—' }}</text>
				<text class="cmm-node-label">偏旁</text>
			</view>
		</view>

		<view class="cmm-stem cmm-stem--down" aria-hidden="true" />

		<!-- 相关字分支 -->
		<view v-if="!relatedChars.length" class="cmm-empty">
			<text class="cmm-empty-text">{{ emptyText || '暂无相关字' }}</text>
		</view>
		<view v-else class="cmm-branches">
			<text class="cmm-branches-title">相关字 · {{ relatedChars.length }}</text>
			<view class="cmm-grid">
				<view
					v-for="(ch, i) in relatedChars"
					:key="'cmm-' + i + '-' + ch"
					class="cmm-leaf"
					@click="$emit('char-click', ch)"
				>
					<text class="cmm-leaf-char">{{ ch }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ComponentMindMap',
	props: {
		sourceHanzi: { type: String, default: '' },
		part: { type: String, default: '' },
		relatedChars: { type: Array, default: () => [] },
		emptyText: { type: String, default: '' }
	},
	emits: ['char-click', 'source-click']
}
</script>

<style scoped>
.cmm {
	width: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 8rpx 0 24rpx;
}

.cmm-source-wrap {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.cmm-stem {
	width: 4rpx;
	background: linear-gradient(180deg, #ffab91, #ff8a65);
	border-radius: 4rpx;
}

.cmm-stem--up {
	height: 28rpx;
	order: 2;
	margin-top: 4rpx;
}

.cmm-source-wrap .cmm-node--source {
	order: 1;
}

.cmm-stem--down {
	height: 36rpx;
	margin: 4rpx 0 12rpx;
}

.cmm-center-wrap {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.cmm-node {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 12rpx 28rpx;
	border-radius: 24rpx;
	box-sizing: border-box;
}

.cmm-node--source {
	min-width: 120rpx;
	background: #fff8e7;
	border: 2rpx solid rgba(255, 170, 100, 0.55);
	box-shadow: 0 6rpx 16rpx rgba(44, 36, 25, 0.06);
}

.cmm-node--source:active {
	opacity: 0.88;
}

.cmm-node--center {
	min-width: 160rpx;
	min-height: 140rpx;
	padding: 20rpx 36rpx;
	background: linear-gradient(145deg, #fff3e0 0%, #ffe0b2 100%);
	border: 3rpx solid #ff7043;
	box-shadow: 0 10rpx 28rpx rgba(230, 74, 25, 0.18);
}

.cmm-node-char {
	font-size: 44rpx;
	font-weight: 800;
	color: #5d4037;
	line-height: 1.1;
}

.cmm-node-char--lg {
	font-size: 72rpx;
	color: #bf360c;
}

.cmm-node-label {
	margin-top: 4rpx;
	font-size: 20rpx;
	font-weight: 600;
	color: #a1887f;
	letter-spacing: 0.06em;
}

.cmm-empty {
	width: 100%;
	padding: 32rpx 24rpx;
	text-align: center;
}

.cmm-empty-text {
	font-size: 26rpx;
	color: #9e9e9e;
}

.cmm-branches {
	width: 100%;
	box-sizing: border-box;
}

.cmm-branches-title {
	display: block;
	text-align: center;
	font-size: 24rpx;
	font-weight: 700;
	color: #e64a19;
	margin-bottom: 16rpx;
}

.cmm-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	gap: 14rpx 12rpx;
	padding: 4rpx 4rpx 8rpx;
	box-sizing: border-box;
}

.cmm-leaf {
	width: 88rpx;
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #fffef9;
	border: 2rpx solid rgba(255, 140, 100, 0.4);
	border-radius: 18rpx;
	box-shadow: 0 4rpx 12rpx rgba(44, 36, 25, 0.05);
	box-sizing: border-box;
}

.cmm-leaf:active {
	transform: scale(0.96);
	background: #ffe8d6;
}

.cmm-leaf-char {
	font-size: 40rpx;
	font-weight: 700;
	color: #4e342e;
}
</style>
