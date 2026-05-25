<template>
	<view
		class="tone-contour"
		:class="[
			'tone-contour--' + tone,
			{ 'tone-contour--active': active, 'tone-contour--compact': compact }
		]"
		:style="{ borderColor: meta.color, backgroundColor: active ? meta.color + '22' : '#fff' }"
	>
		<view class="tone-contour-graph" :style="{ '--tc-color': meta.color }">
			<view v-if="tone === 1" class="tc-line tc-line--flat" />
			<view v-else-if="tone === 2" class="tc-line tc-line--rise" />
			<view v-else-if="tone === 3" class="tc-line tc-line--dip" />
			<view v-else class="tc-line tc-line--fall" />
		</view>
		<text v-if="showLabel" class="tone-contour-label" :style="{ color: meta.color }">{{ meta.kidLabel }}</text>
		<text v-if="showSymbol && displayText" class="tone-contour-symbol font-pinyin">{{ displayText }}</text>
	</view>
</template>

<script>
import { TONE_META } from '@/utils/pinyin-tone-lab/constants.js'

export default {
	name: 'ToneContourCard',
	props: {
		tone: { type: Number, default: 1 },
		active: { type: Boolean, default: false },
		compact: { type: Boolean, default: false },
		showLabel: { type: Boolean, default: true },
		showSymbol: { type: Boolean, default: false },
		displayText: { type: String, default: '' }
	},
	computed: {
		meta() {
			return TONE_META.find((m) => m.tone === Number(this.tone)) || TONE_META[0]
		}
	}
}
</script>

<style scoped>
.tone-contour {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 20rpx 16rpx;
	border-radius: 24rpx;
	border-width: 4rpx;
	border-style: solid;
	box-sizing: border-box;
	min-height: 160rpx;
	box-shadow: 0 8rpx 20rpx rgba(44, 36, 25, 0.06);
}

.tone-contour--compact {
	min-height: 120rpx;
	padding: 14rpx 12rpx;
	border-radius: 20rpx;
}

.tone-contour--active {
	box-shadow: 0 10rpx 24rpx rgba(44, 36, 25, 0.12);
	transform: scale(1.03);
}

.tone-contour-graph {
	width: 100%;
	height: 72rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.tone-contour--compact .tone-contour-graph {
	height: 52rpx;
}

.tc-line {
	background: var(--tc-color, #5b9bd5);
	border-radius: 999rpx;
}

.tc-line--flat {
	width: 72%;
	height: 8rpx;
}

.tc-line--rise {
	width: 68%;
	height: 8rpx;
	transform: rotate(-18deg);
	transform-origin: left center;
}

.tc-line--dip {
	width: 64%;
	height: 8rpx;
	border-radius: 0;
	background: transparent;
	border-bottom: 8rpx solid var(--tc-color, #ffc000);
	border-radius: 0 0 40% 40% / 0 0 100% 100%;
	height: 36rpx;
	width: 56%;
}

.tc-line--fall {
	width: 68%;
	height: 8rpx;
	transform: rotate(18deg);
	transform-origin: left center;
}

.tone-contour-label {
	margin-top: 10rpx;
	font-size: 26rpx;
	font-weight: 800;
}

.tone-contour--compact .tone-contour-label {
	font-size: 22rpx;
	margin-top: 6rpx;
}

.tone-contour-symbol {
	margin-top: 6rpx;
	font-size: 36rpx;
	font-weight: 800;
	color: #2c2419;
}
</style>
