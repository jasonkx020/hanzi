<template>
	<meng-sub-page title="整体认读表" subtitle="按组听读音" avatar-pose="book" :overlap-body="true">
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
							category-tab="整体认读"
							size="compact"
							:active="playingKey === sec.sectionKey + sym"
							@click="onPlay(sym, sec.sectionKey)"
						/>
					</view>
				</view>
			</scroll-view>
			<text class="chart-foot">点格子听整体认读</text>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import PinyinLabCell from '@/components/pinyin-lab-cell.vue'
import { WHOLE_SECTIONS } from '@/utils/pinyin-whole-lab/sections.js'
import { playWholeLabSymbol } from '@/utils/pinyin-whole-lab/play.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'

export default {
	components: { MengSubPage, PinyinLabCell },
	data() {
		return {
			sections: WHOLE_SECTIONS,
			playingKey: '',
			busy: false
		}
	},
	onHide() {
		stopLocalPinyinAudio()
		this.playingKey = ''
	},
	onUnload() {
		stopLocalPinyinAudio()
	},
	methods: {
		async onPlay(sym, sectionKey) {
			if (this.busy) return
			this.busy = true
			this.playingKey = sectionKey + sym
			stopLocalPinyinAudio()
			try {
				await playWholeLabSymbol(sym)
			} catch (_) {}
			this.playingKey = ''
			this.busy = false
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
	max-height: 72vh;
}
.chart-sec {
	margin-bottom: 24rpx;
}
.chart-sec-head {
	display: flex;
	align-items: flex-start;
	margin-bottom: 12rpx;
}
.chart-sec-emoji {
	font-size: 40rpx;
}
.chart-sec-title {
	display: block;
	font-size: 30rpx;
	font-weight: 800;
}
.chart-sec-tip {
	display: block;
	margin-top: 4rpx;
	font-size: 24rpx;
	color: #6d5e52;
	line-height: 1.4;
}
.chart-cells {
	display: flex;
	flex-wrap: wrap;
}
.chart-cells-item {
	width: calc(33.33% - 8rpx);
	box-sizing: border-box;
	margin: 0 8rpx 8rpx 0;
}
.chart-foot {
	display: block;
	text-align: center;
	margin-top: 16rpx;
	font-size: 24rpx;
	color: #9a9088;
}
</style>
