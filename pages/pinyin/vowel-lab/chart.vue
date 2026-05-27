<template>
	<meng-sub-page title="韵母表" subtitle="按组听读音" avatar-pose="book" :overlap-body="true">
		<view class="chart-page">
			<scroll-view scroll-y class="chart-scroll" :show-scrollbar="false">
				<view v-for="sec in sections" :key="sec.sectionKey" class="chart-sec">
					<view class="chart-sec-head">
						<text class="chart-sec-emoji">{{ sec.emoji }}</text>
						<view class="chart-sec-texts">
							<text class="chart-sec-title">{{ sec.kidTitle || sec.title }}</text>
							<text class="chart-sec-tip">{{ sec.kidTip }}</text>
						</view>
					</view>
					<view class="chart-cells">
						<pinyin-lab-cell
							v-for="sym in sec.symbols"
							:key="sym"
							class="chart-cells-item"
							:symbol="sym"
							category-tab="韵母"
							size="compact"
							:active="playingKey === sec.sectionKey + sym"
							@click="onPlay(sym, sec.sectionKey)"
						/>
					</view>
				</view>
			</scroll-view>
			<text class="chart-foot">点格子听韵母读音</text>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import PinyinLabCell from '@/components/pinyin-lab-cell.vue'
import { VOWEL_SECTIONS } from '@/utils/pinyin-vowel-lab/sections.js'
import { playVowelLabSymbol } from '@/utils/pinyin-vowel-lab/play.js'
import { playLabPinyinAudio, cancelPinyinPlay } from '@/utils/pinyin-lab-play.js'

export default {
	components: { MengSubPage, PinyinLabCell },
	data() {
		return {
			sections: VOWEL_SECTIONS,
			playingKey: '',
			busy: false
		}
	},
	onHide() {
		cancelPinyinPlay()
		this.playingKey = ''
	},
	onUnload() {
		cancelPinyinPlay()
	},
	methods: {
		async onPlay(sym, sectionKey) {
			const key = sectionKey + sym
			this.busy = true
			this.playingKey = key
			try {
				await playLabPinyinAudio(async ({ isCancelled }) => {
					return playVowelLabSymbol(sym, { isCancelled })
				})
			} finally {
				if (this.playingKey === key) this.playingKey = ''
				this.busy = false
			}
		}
	}
}
</script>

<style scoped>
.chart-page {
	padding: 4rpx 4rpx 24rpx;
	display: flex;
	flex-direction: column;
	min-height: 60vh;
}
.chart-scroll {
	flex: 1;
	height: 85vh;
}
.chart-sec {
	margin-bottom: 24rpx;
	padding: 16rpx;
	border-radius: 24rpx;
	background: #fff;
	border: 3rpx solid var(--meng-border-warm);
}
.chart-sec-head {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	margin-bottom: 14rpx;
}
.chart-sec-emoji {
	font-size: 40rpx;
}
.chart-sec-texts {
	flex: 1;
}
.chart-sec-title {
	display: block;
	font-size: 30rpx;
	font-weight: 800;
	color: #2c2419;
}
.chart-sec-tip {
	display: block;
	margin-top: 4rpx;
	font-size: 24rpx;
	color: #6d5e52;
	line-height: 1.35;
}
.chart-cells {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}
.chart-cells-item {
	margin: 0 10rpx 10rpx 0;
}
.chart-foot {
	display: block;
	margin-top: 12rpx;
	text-align: center;
	font-size: 24rpx;
	color: #009a9088;
}
</style>
