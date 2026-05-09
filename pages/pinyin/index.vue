<template>
	<view class="page">
		<view class="tabs">
			<view
				v-for="item in tabList"
				:key="item"
				class="tab-item"
				:class="activeTab === item ? 'tab-item-active' : ''"
				@click="activeTab = item"
			>{{ item }}</view>
		</view>
		<view class="panel">
			<text class="title">{{ activeTab }}</text>
			<text class="desc">点击下方格子朗读对应拼音（H5 / App 均已支持）</text>
			<text class="narrator">朗读人：{{ narrator === 'female' ? '标准女声' : '童声' }}</text>
			<view class="switches">
				<view class="switch-chip" :class="autoRead ? 'switch-chip-on' : ''" @click="autoRead = !autoRead">
					自动连读：{{ autoRead ? '开' : '关' }}
				</view>
				<view class="switch-chip" :class="followReadScore ? 'switch-chip-on' : ''" @click="toggleFollowRead">
					跟读评分：{{ followReadScore ? '开' : '关' }}
				</view>
			</view>
			<view v-if="activeLegend.length" class="legend">
				<text class="legend-title">颜色分类（人教版常见分法）</text>
				<view class="legend-row">
					<view
						v-for="item in activeLegend"
						:key="item.key"
						class="legend-chip"
						:style="{ backgroundColor: item.bg, borderColor: item.bd }"
					>
						<text class="legend-chip-text">{{ item.label }}</text>
					</view>
				</view>
			</view>
			<view class="symbol-grid">
				<view
					v-for="entry in activeSymbolEntries"
					:key="entry.symbol"
					class="symbol-item"
					:style="{ backgroundColor: entry.bg, borderColor: entry.bd }"
					@click="speakSymbol(entry.symbol)"
				>
					<text class="symbol-text">{{ entry.symbol }}</text>
				</view>
			</view>
			<view class="actions">
				<button size="mini" type="primary" @click="goDrill">进入闯关</button>
				<button size="mini" @click="goGuardian">切换朗读人</button>
				<button size="mini" type="warn" @click="startRecord" :disabled="recording">开始跟读</button>
				<button size="mini" @click="stopRecordAndScore" :disabled="!recording">结束并评分</button>
			</view>
			<text class="recording-tip">{{ recording ? '录音中...' : '未录音' }}</text>
			<text v-if="lastScoreText" class="score-tip">{{ lastScoreText }}</text>
			<view v-if="followReadHistory.length" class="history-box">
				<text class="history-title">最近录音</text>
				<text
					v-for="(r, idx) in followReadHistory.slice(0, 3)"
					:key="`${idx}-${r.createdAt}`"
					class="history-item"
				>第{{ idx + 1 }}条 · {{ Math.round((r.durationMs || 0) / 1000) }}s · {{ r.sampleRate }}Hz</text>
			</view>
		</view>
	</view>
</template>

<script>
import { getAudioNarrator, getAudioNarratorLabel } from '@/utils/audio-settings.js'
import {
	getFollowReadState,
	getFollowReadHistory,
	startFollowReadRecord,
	stopFollowReadRecord,
	requestFollowReadScore
} from '@/services/pinyin-follow-read-service.js'
import { getPinyinSymbolCategory, legendForTab } from '@/utils/pinyin-pep-category.js'
import { speakPinyinSymbol } from '@/utils/speak-pinyin-symbol.js'

export default {
	data() {
		return {
			tabList: ['声母', '韵母', '整体认读', '拼读练习'],
			activeTab: '声母',
			symbolMap: {
				声母: ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w'],
				韵母: ['ɑ', 'o', 'e', 'i', 'u', 'ü', 'ɑi', 'ei', 'ui', 'ɑo', 'ou', 'iu', 'ie', 'üe', 'er', 'ɑn', 'en', 'in', 'un', 'ün','ɑng', 'eng', 'ing', 'ong'],
				整体认读: ['zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si', 'yi', 'wu', 'yu', 'ye', 'yue', 'yuɑn', 'yin', 'yun', 'ying'],
				拼读练习: ['bɑ', 'bo', 'mɑ', 'de', 'du', 'ge', 'huɑ', 'xue', 'qiu', 'zhan', 'cheng', 'shi']
			},
			narrator: 'kid',
			autoRead: false,
			followReadScore: false,
			recording: false,
			followReadHistory: [],
			lastScoreText: '',
			lastRecordFile: ''
		}
	},
	computed: {
		activeSymbols() {
			return this.symbolMap[this.activeTab] || []
		},
		activeSymbolEntries() {
			const tab = this.activeTab
			const arr = this.symbolMap[tab] || []
			return arr.map((symbol) => {
				const cat = getPinyinSymbolCategory(symbol, tab)
				return { symbol, bg: cat.bg, bd: cat.bd, key: cat.key }
			})
		},
		activeLegend() {
			return legendForTab(this.activeTab, this.activeSymbols)
		}
	},
	onShow() {
		this.narrator = getAudioNarrator()
		this.recording = getFollowReadState().recording
		this.followReadHistory = getFollowReadHistory()
	},
	methods: {
		async speakSymbol(symbol) {
			const text = String(symbol || '')
			const narrator = this.narrator
			const ok = speakPinyinSymbol(text, narrator)
			if (!ok) {
				uni.showToast({ title: `${getAudioNarratorLabel(narrator)}：${text}`, icon: 'none' })
			}
			if (this.autoRead) {
				const arr = this.activeSymbols
				const idx = arr.indexOf(text)
				const next = idx >= 0 && idx < arr.length - 1 ? arr[idx + 1] : ''
				if (next) {
					setTimeout(() => {
						if (!speakPinyinSymbol(next, narrator)) {
							uni.showToast({ title: `下一项：${next}`, icon: 'none' })
						}
					}, ok ? 520 : 380)
				}
			}
			if (this.followReadScore) {
				const scoreRes = await requestFollowReadScore({
					symbol: text,
					durationMs: 0,
					sampleRate: 16000,
					volumeStd: 0.78,
					matchScore: 0.82
				})
				this.lastScoreText = scoreRes.ok
					? `跟读${scoreRes.score}分 · 稳定度${scoreRes.details.volumeStability}% · 匹配${scoreRes.details.targetMatch}%`
					: scoreRes.message
				uni.showToast({
					title: scoreRes.ok ? `跟读${scoreRes.score}分` : scoreRes.message,
					icon: 'none'
				})
			}
		},
		goDrill() {
			uni.navigateTo({ url: '/pages/pinyin/drill' })
		},
		goGuardian() {
			uni.navigateTo({ url: '/pages/settings/guardian' })
		},
		toggleFollowRead() {
			this.followReadScore = !this.followReadScore
			uni.showToast({
				title: this.followReadScore ? '跟读评分占位已开启' : '跟读评分占位已关闭',
				icon: 'none'
			})
		},
		async startRecord() {
			const res = await startFollowReadRecord()
			if (!res.ok) {
				uni.showToast({ title: res.message || '无法开始录音', icon: 'none' })
				return
			}
			this.recording = true
			uni.showToast({ title: '开始录音', icon: 'none' })
		},
		async stopRecordAndScore() {
			const stopRes = await stopFollowReadRecord()
			this.recording = false
			if (!stopRes.ok) {
				uni.showToast({ title: stopRes.message || '录音结束失败', icon: 'none' })
				return
			}
			this.lastRecordFile = stopRes.tempFilePath || ''
			const symbol = this.activeSymbols[0] || ''
			const scoreRes = await requestFollowReadScore({
				symbol,
				durationMs: stopRes.durationMs,
				sampleRate: stopRes.sampleRate,
				volumeStd: 0.8,
				matchScore: 0.83
			})
			this.followReadHistory = getFollowReadHistory()
			this.lastScoreText = scoreRes.ok
				? `跟读${scoreRes.score}分 · 稳定度${scoreRes.details.volumeStability}% · 匹配${scoreRes.details.targetMatch}%`
				: scoreRes.message
			uni.showToast({
				title: scoreRes.ok ? `跟读${scoreRes.score}分` : scoreRes.message,
				icon: 'none'
			})
		}
	}
}
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: #f4f1ea; }
.tabs { display: flex; flex-direction: row; align-items: stretch; margin-bottom: 16rpx; }
.tab-item + .tab-item { margin-left: 10rpx; }
.tab-item { flex: 1; min-width: 0; text-align: center; background: #fff; border-radius: 10rpx; padding: 14rpx 6rpx; font-size: 24rpx; color: #555; }
.tab-item-active { background: #ffe2b8; color: #2c2419; font-weight: 600; }
.panel { background: #fff; border-radius: 14rpx; padding: 22rpx; }
.title { display: block; font-size: 30rpx; font-weight: 700; color: #2c2419; margin-bottom: 10rpx; }
.desc { display: block; font-size: 24rpx; color: #6b6560; line-height: 1.45; margin-bottom: 12rpx; }
.narrator { display: block; font-size: 23rpx; color: #8a8279; margin-bottom: 10rpx; }
.switches { display: flex; flex-direction: row; margin-bottom: 12rpx; }
.switch-chip + .switch-chip { margin-left: 10rpx; }
.switch-chip { padding: 8rpx 14rpx; border-radius: 999rpx; background: #f2ede3; font-size: 22rpx; color: #6b6560; }
.switch-chip-on { background: #ffe2b8; color: #2c2419; font-weight: 600; }
.legend {
	margin-bottom: 14rpx;
	padding: 12rpx 14rpx;
	background: #faf8f5;
	border-radius: 12rpx;
}
.legend-title {
	display: block;
	font-size: 22rpx;
	color: #6b6560;
	margin-bottom: 10rpx;
}
.legend-row {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}
.legend-chip {
	margin-right: 10rpx;
	margin-bottom: 8rpx;
	padding: 6rpx 12rpx;
	border-radius: 999rpx;
	border-width: 1rpx;
	border-style: solid;
	box-sizing: border-box;
}
.legend-chip-text {
	font-size: 20rpx;
	color: #3e3830;
	line-height: 1.3;
}
.symbol-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin-bottom: 16rpx;
}
.symbol-item {
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	flex: 0 0 18%;
	width: 18%;
	max-width: 18%;
	min-width: 0;
	margin-right: 2.5%;
	margin-bottom: 14rpx;
	min-height: 96rpx;
	padding: 22rpx 6rpx;
	border-radius: 12rpx;
	border-width: 1rpx;
	border-style: solid;
	text-align: center;
}
.symbol-item:nth-child(5n) {
	margin-right: 0;
}
.symbol-text { font-size: 44rpx; color: #2c2419; font-weight: 700; }
.actions {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}
.actions > button {
	box-sizing: border-box;
	flex: 0 0 22%;
	width: 22%;
	max-width: 22%;
	min-width: 0;
	margin-right: 4%;
	margin-bottom: 12rpx;
	height: auto;
	min-height: 64rpx;
	padding: 12rpx 8rpx;
	line-height: 1.35;
	font-size: 22rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	white-space: normal;
	word-break: break-word;
}
.actions > button:nth-child(4n) {
	margin-right: 0;
}
.recording-tip { display: block; margin-top: 10rpx; font-size: 22rpx; color: #8a8279; }
.score-tip { display: block; margin-top: 8rpx; font-size: 22rpx; color: #3d6b4a; }
.history-box { margin-top: 10rpx; padding: 12rpx; background: #fff8eb; border-radius: 10rpx; }
.history-title { display: block; font-size: 22rpx; color: #6b6560; margin-bottom: 6rpx; }
.history-item { display: block; font-size: 21rpx; color: #8a8279; margin-top: 4rpx; }
</style>
