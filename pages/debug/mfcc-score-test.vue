<template>
	<view class="page">
		<text class="title">MFCC 评分调试</text>
		<text class="desc">选择音节预提取指纹，按住录音，用 PCM 提取 MFCC 与预提取做 DTW 比对（与跟读评分同链路）。</text>
		<text class="spec-hint">音频规范：{{ audioSpec }}</text>

		<view class="field">
			<text class="label">目标音节（{{ symbolList.length }} 个）</text>
			<view class="symbol-row">
				<input
					class="input input--flex"
					v-model="symbolInput"
					placeholder="输入或点选"
					@blur="syncSymbol"
				/>
				<picker
					mode="selector"
					:range="pickerLabels"
					:value="pickerIndex"
					:disabled="!pickerLabels.length"
					@change="onPickerChange"
				>
					<view class="picker-btn"><text>列表</text></view>
				</picker>
			</view>
			<input class="input" v-model="filterKw" placeholder="筛选（可选）" />
			<scroll-view v-if="filteredSymbols.length" class="chips" scroll-y>
				<view
					v-for="s in filteredSymbols.slice(0, 60)"
					:key="s"
					class="chip"
					:class="{ 'chip--on': s === symbol }"
					@click="selectSymbol(s)"
				>
					<text>{{ s }}</text>
				</view>
			</scroll-view>
		</view>

		<view v-if="refPreview" class="card card--ref">
			<text class="card-title">预提取「{{ symbol }}」</text>
			<text class="card-line">帧数 {{ refPreview.frameCount }} · 时长 {{ refPreview.durationMs }} ms</text>
			<text class="card-line">有效发声占比 {{ formatVoiced(refPreview.voicedRatio) }}</text>
			<text v-if="refPreview.meta" class="card-line card-line--meta">
				_meta v{{ refPreview.meta.version }} · {{ refPreview.meta.sampleRate }}Hz · hop
				{{ refPreview.meta.hopSize }}
			</text>
		</view>

		<view class="section">
			<text class="section-title">按住说话 → 自动比对</text>
			<view class="status" :class="'status--' + phase">
				<text>{{ statusText }}</text>
				<text v-if="phase === 'recording' && liveDb" class="status-sub">{{ liveDb }}</text>
			</view>
			<view
				class="hold-btn"
				:class="{ 'hold-btn--on': phase === 'recording', 'hold-btn--off': !canRecord }"
				@touchstart.stop.prevent="onHoldStart"
				@touchend.stop.prevent="onHoldEnd"
				@touchcancel.stop.prevent="onHoldEnd"
				@mousedown.prevent="onHoldStart"
				@mouseup.prevent="onHoldEnd"
				@mouseleave.prevent="onHoldEnd"
			>
				<text class="hold-emoji">{{ phase === 'recording' ? '🔴' : '🎤' }}</text>
				<text class="hold-label">{{ holdLabel }}</text>
			</view>
			<button
				class="btn-sub"
				:disabled="!lastPcm || busy || phase === 'recording'"
				@click="onRecompare"
			>
				用上次 PCM 重新比对
			</button>
		</view>

		<view v-if="summary" class="summary" :class="summary.pass ? 'summary--ok' : 'summary--fail'">
			<text class="summary-main">{{ summary.text }}</text>
		</view>

		<view v-if="resultLines.length" class="card">
			<view class="card-head">
				<text class="card-title">比对明细</text>
				<text class="copy-link" @click="onCopy">复制</text>
			</view>
			<text v-for="(line, i) in resultLines" :key="i" class="card-line">{{ line }}</text>
		</view>

		<text class="foot">{{ footHint }}</text>
	</view>
</template>

<script>
import { formatPinyinAudioSpec } from '@/constants/pinyin-audio-sample-rate.js'
import { isFollowReadScoringSupported } from '@/utils/pinyin-follow-read-platform.js'
import {
	listMfccFingerprintSymbols,
	hasMfccFingerprint,
	getMfccFingerprintPreview,
	runMfccScoreDebugCompare
} from '@/utils/pinyin-mfcc-algorithm-test.js'
import {
	startWxzRecordTest,
	stopWxzRecordTest,
	cancelWxzRecordTest,
	isWxzRecordTestAvailable,
	formatDecibel
} from '@/utils/wxz-record-test.js'

export default {
	data() {
		return {
			symbol: 'm',
			symbolInput: 'm',
			symbolList: [],
			filterKw: '',
			pickerIndex: 0,
			refPreview: null,
			phase: 'idle',
			liveDb: '',
			busy: false,
			lastPcm: null,
			lastDurationMs: 0,
			lastTempPath: '',
			lastFormat: 'pcm',
			summary: null,
			resultLines: []
		}
	},
	computed: {
		audioSpec() {
			return formatPinyinAudioSpec()
		},
		canRecord() {
			return isWxzRecordTestAvailable() && isFollowReadScoringSupported()
		},
		filteredSymbols() {
			const kw = String(this.filterKw || '').trim().toLowerCase()
			if (!kw) return this.symbolList
			return this.symbolList.filter((s) => String(s).toLowerCase().includes(kw))
		},
		pickerLabels() {
			const list = this.filteredSymbols.length ? this.filteredSymbols : this.symbolList
			return list.slice(0, 400)
		},
		statusText() {
			if (!this.canRecord) return '请使用 App（wxz-record + 48k PCM）'
			const m = {
				idle: `按住说话，比对「${this.symbol}」`,
				recording: '录音中… 松开即比对',
				stopping: '结束录音…',
				comparing: '提取 MFCC 并 DTW 比对…',
				done: '完成，可换音节或再录',
				error: '失败，请重试'
			}
			return m[this.phase] || ''
		},
		holdLabel() {
			if (!this.canRecord) return '不可用'
			return this.phase === 'recording' ? '松开结束' : '按住说话'
		},
		footHint() {
			return '与跟读 requestFollowReadScore 使用相同 decodeUserRecordingForScore + MFCC + DTW。'
		}
	},
	onLoad() {
		this.symbolList = listMfccFingerprintSymbols()
		const i = this.symbolList.indexOf('m')
		this.pickerIndex = i >= 0 ? i : 0
		if (i < 0 && this.symbolList.length) {
			this.symbol = this.symbolList[0]
			this.symbolInput = this.symbol
		}
		this.refreshRefPreview()
	},
	onHide() {
		cancelWxzRecordTest()
	},
	onUnload() {
		cancelWxzRecordTest()
	},
	methods: {
		formatVoiced(v) {
			const n = Number(v)
			if (!Number.isFinite(n)) return '—'
			return `${Math.round(n * 1000) / 10}%`
		},
		syncSymbol() {
			const s = String(this.symbolInput || '').trim()
			if (!s) return
			this.symbol = s
			this.refreshRefPreview()
			if (!hasMfccFingerprint(s)) {
				uni.showToast({ title: '无该音节预提取', icon: 'none' })
			}
		},
		selectSymbol(s) {
			this.symbol = s
			this.symbolInput = s
			const i = this.pickerLabels.indexOf(s)
			if (i >= 0) this.pickerIndex = i
			this.refreshRefPreview()
		},
		onPickerChange(e) {
			const i = Number(e.detail?.value) || 0
			this.pickerIndex = i
			const s = this.pickerLabels[i]
			if (s) this.selectSymbol(s)
		},
		refreshRefPreview() {
			this.refPreview = getMfccFingerprintPreview(this.symbol)
		},
		async onHoldStart() {
			if (!this.canRecord || this.busy) return
			if (this.phase === 'recording' || this.phase === 'stopping') return
			this.syncSymbol()
			if (!hasMfccFingerprint(this.symbol)) {
				uni.showToast({ title: '请选择有预提取的音节', icon: 'none' })
				return
			}
			this.phase = 'recording'
			this.liveDb = ''
			this.summary = null
			this.resultLines = []
			const res = await startWxzRecordTest((st) => {
				this.liveDb = `音量 ${formatDecibel(st.currentDecibel)}`
			})
			if (!res.ok) {
				this.phase = 'error'
				uni.showToast({ title: res.message || '无法录音', icon: 'none' })
			}
		},
		async onHoldEnd() {
			if (this.phase !== 'recording') return
			this.phase = 'stopping'
			this.liveDb = ''
			const stopRes = await stopWxzRecordTest()
			if (!stopRes.ok) {
				this.phase = 'error'
				uni.showToast({ title: stopRes.message || '录音失败', icon: 'none' })
				return
			}
			this.lastPcm = stopRes.recordPcmBuffer || null
			this.lastDurationMs = stopRes.durationMs || 0
			this.lastTempPath = stopRes.tempFilePath || ''
			this.lastFormat = stopRes.recordFormat || 'pcm'
			await this.runCompare()
		},
		async onRecompare() {
			if (!this.lastPcm && !this.lastTempPath) return
			await this.runCompare()
		},
		async runCompare() {
			this.busy = true
			this.phase = 'comparing'
			this.summary = null
			this.resultLines = []
			try {
				const res = await runMfccScoreDebugCompare(this.symbol, this.lastPcm, {
					durationMs: this.lastDurationMs,
					tempFilePath: this.lastTempPath,
					recordFormat: this.lastFormat
				})
				this.resultLines = res.lines || []
				this.summary = {
					pass: res.mainPass,
					text: res.summaryText || ''
				}
				uni.showToast({
					title: res.mainPass ? '通过' : '未通过',
					icon: res.mainPass ? 'success' : 'none'
				})
				console.log('[mfcc-score-test]', res)
				this.phase = 'done'
			} catch (e) {
				const msg = e?.message || String(e)
				this.resultLines = [`错误：${msg}`]
				this.summary = { pass: false, text: msg }
				this.phase = 'error'
				console.warn('[mfcc-score-test]', e)
			}
			this.busy = false
		},
		onCopy() {
			if (!this.resultLines.length) return
			uni.setClipboardData({
				data: this.resultLines.join('\n'),
				success: () => uni.showToast({ title: '已复制', icon: 'success' })
			})
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 28rpx 24rpx 48rpx;
	background: #f6f3ec;
	box-sizing: border-box;
}
.title {
	font-size: 34rpx;
	font-weight: 700;
	color: #2c2419;
	display: block;
	margin-bottom: 8rpx;
}
.desc,
.spec-hint,
.foot {
	font-size: 24rpx;
	color: #6b6560;
	line-height: 1.5;
	display: block;
	margin-bottom: 16rpx;
}
.field {
	margin-bottom: 20rpx;
}
.label {
	font-size: 26rpx;
	color: #8b4518;
	margin-bottom: 8rpx;
	display: block;
}
.symbol-row {
	display: flex;
	gap: 12rpx;
	margin-bottom: 12rpx;
}
.input {
	background: #fff;
	border: 1rpx solid #e3d9c8;
	border-radius: 12rpx;
	padding: 14rpx 18rpx;
	font-size: 28rpx;
	margin-bottom: 12rpx;
}
.input--flex {
	flex: 1;
	margin-bottom: 0;
}
.picker-btn {
	padding: 14rpx 22rpx;
	background: #fff;
	border: 1rpx solid #e3d9c8;
	border-radius: 12rpx;
	font-size: 26rpx;
	color: #8b4518;
}
.chips {
	max-height: 180rpx;
	background: #fff;
	border-radius: 12rpx;
	padding: 10rpx;
	border: 1rpx solid #e3d9c8;
}
.chip {
	display: inline-block;
	margin: 6rpx;
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	background: #f5f0e8;
	border: 1rpx solid #e3d9c8;
}
.chip--on {
	background: #e87830;
	border-color: #c85a20;
}
.chip--on text {
	color: #fff;
}
.chip text {
	font-size: 26rpx;
	color: #5c554c;
}
.card {
	background: #fff;
	border-radius: 14rpx;
	padding: 18rpx 20rpx;
	margin-bottom: 20rpx;
	border: 1rpx solid #e3d9c8;
}
.card--ref {
	background: #faf8f4;
}
.card-head {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8rpx;
}
.card-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #8b4518;
	display: block;
	margin-bottom: 8rpx;
}
.card-line {
	font-size: 24rpx;
	color: #5c554c;
	line-height: 1.55;
	display: block;
	margin-bottom: 4rpx;
	word-break: break-all;
}
.card-line--meta {
	font-size: 22rpx;
	color: #8b8680;
}
.copy-link {
	font-size: 24rpx;
	color: #e87830;
}
.section {
	margin-bottom: 20rpx;
	padding: 18rpx;
	background: #fff;
	border-radius: 14rpx;
	border: 1rpx solid #e3d9c8;
}
.section-title {
	font-size: 28rpx;
	font-weight: 600;
	margin-bottom: 12rpx;
	display: block;
}
.status {
	padding: 16rpx;
	border-radius: 10rpx;
	background: #faf8f4;
	margin-bottom: 16rpx;
	text-align: center;
}
.status--recording {
	background: #fff8f0;
}
.status--comparing {
	background: #f0f6ff;
}
.status--error {
	background: #fff5f5;
}
.status text {
	font-size: 26rpx;
	color: #2c2419;
}
.status-sub {
	display: block;
	font-size: 22rpx;
	color: #8b4518;
	margin-top: 6rpx;
}
.hold-btn {
	width: 260rpx;
	height: 260rpx;
	margin: 0 auto 16rpx;
	border-radius: 50%;
	background: linear-gradient(145deg, #f0a060, #e87830);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}
.hold-btn--on {
	transform: scale(0.96);
}
.hold-btn--off {
	opacity: 0.45;
}
.hold-emoji {
	font-size: 56rpx;
}
.hold-label {
	font-size: 28rpx;
	color: #fff;
	font-weight: 600;
}
.btn-sub {
	margin-bottom: 8rpx;
}
.summary {
	padding: 18rpx 20rpx;
	border-radius: 14rpx;
	margin-bottom: 16rpx;
}
.summary--ok {
	background: #f0faf4;
	border: 1rpx solid #6a9f6a;
}
.summary--fail {
	background: #fff5f5;
	border: 1rpx solid #c45c5c;
}
.summary-main {
	font-size: 28rpx;
	color: #2c2419;
}
.foot {
	text-align: center;
	font-size: 22rpx;
}
</style>
