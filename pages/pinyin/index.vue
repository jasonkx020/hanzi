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
			<text class="desc">点击拼音按钮可点读，当前支持首版离线朗读能力。</text>
			<text class="narrator">朗读人：{{ narrator === 'female' ? '标准女声' : '童声' }}</text>
			<view class="switches">
				<view class="switch-chip" :class="autoRead ? 'switch-chip-on' : ''" @click="autoRead = !autoRead">
					自动连读：{{ autoRead ? '开' : '关' }}
				</view>
				<view class="switch-chip" :class="followReadScore ? 'switch-chip-on' : ''" @click="toggleFollowRead">
					跟读评分：{{ followReadScore ? '开' : '关' }}
				</view>
			</view>
			<view class="symbol-grid">
				<view
					v-for="s in activeSymbols"
					:key="s"
					class="symbol-item"
					@click="speakSymbol(s)"
				>
					<text class="symbol-text">{{ s }}</text>
				</view>
			</view>
			<view class="actions">
				<button size="mini" type="primary" @click="goDrill">进入拼音闯关</button>
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

export default {
	data() {
		return {
			tabList: ['声母', '韵母', '整体认读', '拼读练习'],
			activeTab: '声母',
			symbolMap: {
				声母: ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w'],
				韵母: ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er', 'an', 'en', 'in', 'un', 'ang', 'eng', 'ing', 'ong'],
				整体认读: ['zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si', 'yi', 'wu', 'yu', 'ye', 'yue', 'yuan', 'yin', 'yun', 'ying'],
				拼读练习: ['ba', 'bo', 'ma', 'de', 'du', 'ge', 'hua', 'xue', 'qiu', 'zhan', 'cheng', 'shi']
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
			// #ifdef APP-PLUS
			try {
				if (typeof plus !== 'undefined' && plus.speech && typeof plus.speech.speak === 'function') {
					plus.speech.speak(text, {
						engine: 'baidu',
						volume: 1,
						pitch: narrator === 'female' ? 1.0 : 1.25,
						rate: narrator === 'female' ? 1.0 : 1.1
					})
					return
				}
			} catch (e) {
				console.warn('[pinyin] speak failed', e)
			}
			// #endif
			uni.showToast({ title: `${getAudioNarratorLabel(narrator)}：${text}`, icon: 'none' })
			if (this.autoRead) {
				const arr = this.activeSymbols
				const idx = arr.indexOf(text)
				const next = idx >= 0 && idx < arr.length - 1 ? arr[idx + 1] : ''
				if (next) {
					setTimeout(() => {
						uni.showToast({ title: `连读下一项：${next}`, icon: 'none' })
					}, 350)
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
.tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10rpx; margin-bottom: 16rpx; }
.tab-item { text-align: center; background: #fff; border-radius: 10rpx; padding: 14rpx 6rpx; font-size: 24rpx; color: #555; }
.tab-item-active { background: #ffe2b8; color: #2c2419; font-weight: 600; }
.panel { background: #fff; border-radius: 14rpx; padding: 22rpx; }
.title { display: block; font-size: 30rpx; font-weight: 700; color: #2c2419; margin-bottom: 10rpx; }
.desc { display: block; font-size: 25rpx; color: #6b6560; line-height: 1.5; margin-bottom: 16rpx; }
.narrator { display: block; font-size: 23rpx; color: #8a8279; margin-bottom: 10rpx; }
.switches { display: flex; gap: 10rpx; margin-bottom: 12rpx; }
.switch-chip { padding: 8rpx 14rpx; border-radius: 999rpx; background: #f2ede3; font-size: 22rpx; color: #6b6560; }
.switch-chip-on { background: #ffe2b8; color: #2c2419; font-weight: 600; }
.symbol-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10rpx; margin-bottom: 16rpx; }
.symbol-item { background: #fff8eb; border-radius: 10rpx; padding: 16rpx 8rpx; text-align: center; }
.symbol-text { font-size: 30rpx; color: #2c2419; font-weight: 700; }
.actions { display: flex; gap: 10rpx; }
.recording-tip { display: block; margin-top: 10rpx; font-size: 22rpx; color: #8a8279; }
.score-tip { display: block; margin-top: 8rpx; font-size: 22rpx; color: #3d6b4a; }
.history-box { margin-top: 10rpx; padding: 12rpx; background: #fff8eb; border-radius: 10rpx; }
.history-title { display: block; font-size: 22rpx; color: #6b6560; margin-bottom: 6rpx; }
.history-item { display: block; font-size: 21rpx; color: #8a8279; margin-top: 4rpx; }
</style>
