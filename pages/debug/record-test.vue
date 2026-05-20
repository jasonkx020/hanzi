<template>

	<view class="page">

		<text class="title">麦克风录音测试</text>

		<text class="desc">按住说话，松开后回放录音，并提取 MFCC 与示范音预提取指纹做 DTW 相似度比对（与跟读评分同链路）。</text>

		<text class="format-hint">当前格式：{{ recordFormatLabel }} · {{ audioSpec }}</text>

		<view class="field">
			<text class="field-label">比对目标（对应 /static/pinyin/{{ symbol }}.opus）</text>
			<view class="symbol-row">
				<input
					class="field-input field-input--flex"
					v-model="symbolInput"
					placeholder="音节 stem，默认 m"
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
		</view>

		<view v-if="refPreview" class="info-card info-card--ref">
			<text class="info-title">预提取「{{ symbol }}」（由 {{ symbol }}.opus 离线构建）</text>
			<text class="info-line">帧数 {{ refPreview.frameCount }} · 时长 {{ refPreview.durationMs }} ms</text>
			<text class="info-line">有效发声占比 {{ formatVoiced(refPreview.voicedRatio) }}</text>
		</view>



		<view v-if="diagLines.length" class="info-card info-card--diag">

			<text class="info-title">环境与特征提取</text>

			<text v-for="(line, i) in diagLines" :key="'d-' + i" class="info-line">{{ line }}</text>

		</view>



		<view class="status-box" :class="'status--' + phase">

			<text class="status-text">{{ statusText }}</text>

			<text v-if="phase === 'recording' && liveDecibelLabel" class="status-db">{{ liveDecibelLabel }}</text>

			<text v-if="phase === 'recording' && liveFrameLabel" class="status-meta">{{ liveFrameLabel }}</text>

		</view>



		<view

			class="hold-btn"

			:class="{ 'hold-btn--active': phase === 'recording', 'hold-btn--disabled': !canRecord }"

			@touchstart.stop.prevent="onHoldStart"

			@touchend.stop.prevent="onHoldEnd"

			@touchcancel.stop.prevent="onHoldEnd"

			@mousedown.prevent="onHoldStart"

			@mouseup.prevent="onHoldEnd"

			@mouseleave.prevent="onHoldEnd"

		>

			<text class="hold-btn-emoji">{{ phase === 'recording' ? '🔴' : '🎤' }}</text>

			<text class="hold-btn-label">{{ holdBtnLabel }}</text>

		</view>



		<view v-if="mfccSummary" class="summary" :class="mfccSummary.pass ? 'summary--ok' : 'summary--fail'">
			<text class="summary-text">{{ mfccSummary.text }}</text>
		</view>

		<view v-if="lastInfo.lines.length" class="info-card">

			<text class="info-title">上次录音</text>

			<text v-for="(line, i) in lastInfo.lines" :key="i" class="info-line">{{ line }}</text>

		</view>

		<view v-if="mfccLines.length" class="info-card">
			<view class="info-head">
				<text class="info-title">MFCC 特征比对</text>
				<text class="copy-link" @click="onCopyMfcc">复制</text>
			</view>
			<text v-for="(line, i) in mfccLines" :key="'m-' + i" class="info-line">{{ line }}</text>
		</view>



		<button

			class="replay-btn"

			type="default"

			:disabled="!lastFile || phase === 'recording' || phase === 'stopping'"

			@click="onReplay"

		>

			再次播放

		</button>

		<button
			class="replay-btn"
			type="default"
			:disabled="!canMfccScore || (!lastPcmBuffer && !lastFile) || phase === 'recording' || mfccBusy"
			@click="onMfccCompare"
		>
			与「{{ symbol }}」预提取特征重新比对
		</button>

		<button

			class="replay-btn"

			type="default"

			:disabled="(!lastFile && !lastFrameBytes) || phase === 'recording' || readTestBusy"

			@click="onReadTest"

		>

			测试读取（跟读评分同路径）

		</button>



		<text class="foot-hint">{{ footHint }}</text>

	</view>

</template>



<script>

import { getRecordTestState } from '@/services/pinyin-follow-read-service.js'

import { isAppPlus } from '@/utils/pinyin-follow-read-platform.js'

import {

	startWxzRecordTest,

	stopWxzRecordTest,

	cancelWxzRecordTest,

	isWxzRecordTestAvailable,

	formatDecibel

} from '@/utils/wxz-record-test.js'

import {

	playRecordingFile,

	stopFollowReadDebugPlayback,

	statFollowReadRecording,

	sniffFollowReadRecordingFile

} from '@/utils/pinyin-follow-read-debug-playback.js'

import { decodeUserRecordingForScore } from '@/utils/pinyin-follow-read-audio-decode.js'

import {

	probeMicPermission,

	formatDiagnosticsLines,

	getFollowReadScoringDiagnostics

} from '@/utils/pinyin-follow-read-diagnostics.js'
import { formatPinyinAudioSpec, PINYIN_RECORD_MIN_PCM_BYTES } from '@/constants/pinyin-audio-sample-rate.js'
import { isFollowReadScoringSupported } from '@/utils/pinyin-follow-read-platform.js'
import {
	listMfccFingerprintSymbols,
	hasMfccFingerprint,
	getMfccFingerprintPreview,
	runMfccCompareUserRecording,
	DEFAULT_OPUS_WEB_PATH
} from '@/utils/pinyin-mfcc-algorithm-test.js'

export default {

	data() {

		return {

			/** idle | recording | stopping | playing | done | error */

			phase: 'idle',

			lastFile: '',

			lastFormat: 'pcm',

			lastPcmBuffer: null,

			lastFrameBytes: 0,

			lastDurationMs: 0,

			lastInfo: { lines: [] },

			diagLines: [],

			busy: false,

			readTestBusy: false,

			liveDecibelLabel: '',

			liveFrameLabel: '',

			symbol: 'm',

			symbolInput: 'm',

			symbolList: [],

			pickerIndex: 0,

			refPreview: null,

			mfccSummary: null,

			mfccLines: [],

			mfccBusy: false

		}

	},

	computed: {

		audioSpec() {
			return formatPinyinAudioSpec()
		},

		canRecord() {

			return isWxzRecordTestAvailable()

		},

		canMfccScore() {
			return isWxzRecordTestAvailable() && isFollowReadScoringSupported()
		},

		pickerLabels() {
			return (this.symbolList.length ? this.symbolList : ['m']).slice(0, 400)
		},

		recordFormatLabel() {

			if (isWxzRecordTestAvailable()) {

				return 'pcm（wxz-record）'

			}

			if (!isAppPlus()) return '仅 App 支持本页 wxz-record 测试'

			return '未集成 wxz-record（请安装插件并自定义基座）'

		},

		footHint() {

			if (!isWxzRecordTestAvailable()) {

				return '本页在 App 真机通过 wxz-record 采集 PCM；请安装 uni_modules/wxz-record 后重新打包自定义基座。'

			}

			const ref = DEFAULT_OPUS_WEB_PATH || '/static/pinyin/m.opus'
			return `松开后自动与「${this.symbol}」预提取指纹比对（源自 ${ref}）。若无结果请确认 App 自定义基座与 data/pinyin-mfcc-fingerprints.json。`

		},

		statusText() {

			if (!this.canRecord) {

				return '当前环境无法使用 wxz-record'

			}

			const map = {

				idle: '按住下方按钮开始录音',

				recording: '正在录音… 松开结束',

				stopping: '正在保存录音…',

				playing: '正在播放录音…',

				done: '完成。可再次按住录音，或点「再次播放」',

				error: '录音失败，请重试'

			}

			return map[this.phase] || ''

		},

		holdBtnLabel() {

			if (!this.canRecord) return '不可用'

			if (this.phase === 'recording') return '松开结束'

			return '按住说话'

		}

	},

	async onLoad() {

		this.symbolList = listMfccFingerprintSymbols()
		const i = this.symbolList.indexOf('m')
		this.pickerIndex = i >= 0 ? i : 0
		if (i < 0 && this.symbolList.length) {
			this.symbol = this.symbolList[0]
			this.symbolInput = this.symbol
		}
		this.refreshRefPreview()
		await this.loadDiagnostics()

	},

	onHide() {

		this.teardown()

	},

	onUnload() {

		this.teardown()

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
		},

		onPickerChange(e) {
			const i = Number(e.detail?.value) || 0
			this.pickerIndex = i
			const s = this.pickerLabels[i]
			if (s) {
				this.symbol = s
				this.symbolInput = s
				this.refreshRefPreview()
			}
		},

		refreshRefPreview() {
			this.refPreview = getMfccFingerprintPreview(this.symbol)
		},

		async loadDiagnostics() {

			const perm = await probeMicPermission()

			this.diagLines = formatDiagnosticsLines(perm)

			const scoring = getFollowReadScoringDiagnostics()

			if (isWxzRecordTestAvailable()) {

				this.diagLines.push('录音采集：wxz-record（本页直连插件）')

			} else if (isAppPlus()) {

				this.diagLines.push('录音采集：wxz-record 未就绪')

			}

			if (this.canMfccScore) {
				this.diagLines.push(
					hasMfccFingerprint(this.symbol)
						? `MFCC 比对：已加载「${this.symbol}」预提取（${this.symbol}.opus）`
						: `MFCC 比对：无「${this.symbol}」预提取，请 npm run pinyin:mfcc-fingerprints`
				)
			} else {
				this.diagLines.push('MFCC 比对：仅 App 自定义基座可用')
			}

			console.log('[record-test] diagnostics', perm, scoring)

		},

		teardown() {

			stopFollowReadDebugPlayback()

			cancelWxzRecordTest()

			this.phase = 'idle'

			this.busy = false

			this.liveDecibelLabel = ''

			this.liveFrameLabel = ''

		},

		onLiveStats(stats) {

			this.liveDecibelLabel = `实时音量：${formatDecibel(stats.currentDecibel)}（峰值 ${formatDecibel(stats.maxDecibel)}）`

			this.liveFrameLabel = `帧 ${stats.frameCount} · ${stats.totalBytes} 字节 · 最近帧 ${stats.lastFrameSize} B`

		},

		async onHoldStart() {

			if (!this.canRecord) {

				uni.showToast({ title: '请使用 App 并集成 wxz-record', icon: 'none' })

				return

			}

			if (this.busy || this.phase === 'recording' || this.phase === 'stopping') return

			if (getRecordTestState().followReadRecording) {

				uni.showToast({ title: '跟读录音进行中，请先停止', icon: 'none' })

				return

			}

			this.busy = true

			this.phase = 'recording'

			this.liveDecibelLabel = ''

			this.liveFrameLabel = ''

			this.mfccSummary = null

			this.mfccLines = []

			this.syncSymbol()

			stopFollowReadDebugPlayback()

			const res = await startWxzRecordTest((s) => this.onLiveStats(s))

			if (!res.ok) {

				this.phase = 'error'

				uni.showToast({ title: res.message || '无法开始录音', icon: 'none', duration: 2800 })

				this.busy = false

				return

			}

			this.busy = false

		},

		async onHoldEnd() {

			if (this.phase !== 'recording') return

			if (this.busy) return

			this.busy = true

			this.phase = 'stopping'

			this.liveDecibelLabel = ''

			this.liveFrameLabel = ''

			const stopRes = await stopWxzRecordTest()

			if (!stopRes.ok) {

				this.phase = 'error'

				uni.showToast({ title: stopRes.message || '录音失败', icon: 'none', duration: 2800 })

				this.busy = false

				return

			}

			this.lastFile = stopRes.tempFilePath || ''

			this.lastFormat = stopRes.recordFormat || 'pcm'

			this.lastPcmBuffer = stopRes.recordPcmBuffer || null

			this.lastFrameBytes = Number(stopRes.frameCaptureBytes) || 0

			this.lastDurationMs = Number(stopRes.durationMs) || 0

			await this.refreshLastInfo(stopRes)

			await this.runMfccCompare(stopRes)

			if (this.lastFile) {

				this.phase = 'playing'

				const playRes = await playRecordingFile(this.lastFile, { delayMs: 120 })

				if (!playRes?.ok) {

					this.phase = 'error'

					uni.showToast({ title: playRes?.message || '播放失败', icon: 'none', duration: 2800 })

				} else {

					this.phase = 'done'

				}

			} else {

				this.phase = 'done'

				uni.showToast({

					title: stopRes.wavWriteMessage || '已录到 PCM，但写入 wav 失败，可用「测试读取」',

					icon: 'none',

					duration: 3200

				})

			}

			this.busy = false

		},

		async refreshLastInfo(stopRes) {

			const path = stopRes.tempFilePath || ''

			const stat = path ? await statFollowReadRecording(path) : { ok: false, err: '无文件' }

			const sniff = path ? await sniffFollowReadRecordingFile(path) : { sniff: '—', bytes: 0 }

			const lines = [

				`采集：${stopRes.capture || 'wxz-record'}`,

				`时长：${Math.round(Number(stopRes.durationMs) || 0)} ms`,

				`格式：${stopRes.recordFormat || 'pcm'}`,

				`PCM 缓存：${this.lastFrameBytes || 0} 字节 · ${stopRes.frameCount || 0} 帧`,

				`音量：当前 ${formatDecibel(stopRes.currentDecibel)} · 峰 ${formatDecibel(stopRes.maxDecibel)} · 谷 ${formatDecibel(stopRes.minDecibel)}`

			]

			if (path) {

				lines.push(`回放文件：${stat.ok ? stat.size + ' 字节' : stat.err || '未知'}`)

				lines.push(`嗅探：${sniff.sniff || '—'}（${sniff.bytes || 0} 字节已读）`)

				lines.push(`路径：${path}`)

			} else if (stopRes.wavWriteMessage) {

				lines.push(`WAV 写入：${stopRes.wavWriteMessage}`)

			}

			if (sniff.err) {

				lines.push(`读取：${sniff.err}`)

			}

			this.lastInfo = { lines }

		},

		async onMfccCompare() {
			if (!this.lastPcmBuffer && !this.lastFile) return
			await this.runMfccCompare({
				recordPcmBuffer: this.lastPcmBuffer,
				tempFilePath: this.lastFile,
				durationMs: this.lastDurationMs,
				recordFormat: this.lastFormat
			})
		},

		async runMfccCompare(stopRes) {
			if (!this.canMfccScore) return
			this.syncSymbol()
			if (!hasMfccFingerprint(this.symbol)) {
				this.mfccLines = [
					`无「${this.symbol}」预提取指纹，请执行 npm run pinyin:mfcc-fingerprints 后重新打包`
				]
				this.mfccSummary = { pass: false, text: '缺少预提取指纹' }
				return
			}
			const pcm = stopRes?.recordPcmBuffer || this.lastPcmBuffer
			if (!pcm?.byteLength && !stopRes?.tempFilePath && !this.lastFile) return

			this.mfccBusy = true
			this.mfccSummary = null
			this.mfccLines = []
			try {
				const res = await runMfccCompareUserRecording(this.symbol, pcm, {
					durationMs: Number(stopRes?.durationMs) || 0,
					tempFilePath: stopRes?.tempFilePath || this.lastFile || '',
					recordFormat: stopRes?.recordFormat || this.lastFormat || 'pcm'
				})
				this.mfccLines = res.lines || []
				this.mfccSummary = {
					pass: res.mainPass,
					text: res.summaryText || ''
				}
				uni.showToast({
					title: res.mainPass ? '相似度达标' : '相似度偏低',
					icon: res.mainPass ? 'success' : 'none',
					duration: 2200
				})
				console.log('[record-test] mfcc', res)
			} catch (e) {
				const msg = e?.message || String(e)
				this.mfccLines = [`MFCC 比对失败：${msg}`]
				this.mfccSummary = { pass: false, text: msg }
			}
			this.mfccBusy = false
		},

		onCopyMfcc() {
			if (!this.mfccLines.length) return
			uni.setClipboardData({
				data: this.mfccLines.join('\n'),
				success: () => uni.showToast({ title: '已复制', icon: 'success' })
			})
		},

		onReplay() {

			if (!this.lastFile) {

				uni.showToast({ title: '无回放文件', icon: 'none' })

				return

			}

			this.phase = 'playing'

			playRecordingFile(this.lastFile).then((r) => {

				this.phase = r?.ok ? 'done' : 'error'

				if (!r?.ok) {

					uni.showToast({ title: r?.message || '播放失败', icon: 'none' })

				}

			})

		},

		async onReadTest() {

			if ((!this.lastFile && !this.lastFrameBytes) || this.readTestBusy) return

			this.readTestBusy = true

			const lines = [...(this.lastInfo.lines || [])]

			lines.push('—— 评分解码测试 ——')



			if (this.lastFrameBytes >= PINYIN_RECORD_MIN_PCM_BYTES && this.lastPcmBuffer) {

				try {

					const dec = await decodeUserRecordingForScore(this.lastFile, this.lastFormat, {

						recordPcmBuffer: this.lastPcmBuffer

					})

					const n = dec.int16?.length || dec.samples?.length || 0

					lines.push(`✓ 内存 PCM 解码成功：${n} 采样点，路径 ${dec.decodePath}`)

				} catch (e) {

					lines.push(`✗ 内存 PCM 解码失败：${e?.message || e}`)

				}

			} else {

				lines.push(`✗ PCM 过少（${this.lastFrameBytes} 字节），请按住至少 2 秒`)

			}



			if (this.lastFile) {

				const sniff = await sniffFollowReadRecordingFile(this.lastFile)

				if (sniff.err) {

					lines.push(`readFile：失败 ${sniff.err}`)

				} else {

					lines.push(`readFile：成功 ${sniff.bytes} 字节，${sniff.sniff}`)

				}

			}



			const ok = lines.some((l) => l.includes('PCM 解码成功') || l.includes('readFile：成功'))

			uni.showToast({

				title: ok ? '至少一种解码成功' : '解码均失败',

				icon: ok ? 'success' : 'none',

				duration: 2800

			})

			this.lastInfo = { lines }

			this.readTestBusy = false

		}

	}

}

</script>



<style scoped>

.page {

	min-height: 100vh;

	padding: 32rpx 28rpx 48rpx;

	box-sizing: border-box;

	background: #f6f3ec;

	display: flex;

	flex-direction: column;

	align-items: stretch;

}



.title {

	font-size: 36rpx;

	font-weight: 700;

	color: #2c2419;

	margin-bottom: 12rpx;

}



.desc,

.format-hint,

.foot-hint {

	font-size: 26rpx;

	color: #6b6560;

	line-height: 1.5;

	margin-bottom: 16rpx;

}



.format-hint {

	color: #8b4518;

}



.status-box {

	margin: 20rpx 0 32rpx;

	padding: 24rpx;

	border-radius: 20rpx;

	background: #fff;

	border: 2rpx solid #e3d9c8;

}



.status--recording {

	border-color: #e87830;

	background: #fff8f0;

}



.status--playing {

	border-color: #5a8fd4;

	background: #f0f6ff;

}



.status--error {

	border-color: #c45c5c;

	background: #fff5f5;

}



.status-text {

	font-size: 28rpx;

	color: #2c2419;

	text-align: center;

	display: block;

}



.status-db,

.status-meta {

	display: block;

	text-align: center;

	font-size: 24rpx;

	color: #8b4518;

	margin-top: 10rpx;

}



.status-meta {

	color: #6b6560;

	font-size: 22rpx;

}



.hold-btn {

	margin: 0 auto 36rpx;

	width: 320rpx;

	height: 320rpx;

	border-radius: 50%;

	background: linear-gradient(145deg, #f0a060, #e87830);

	box-shadow: 0 16rpx 40rpx rgba(232, 120, 48, 0.35);

	display: flex;

	flex-direction: column;

	align-items: center;

	justify-content: center;

	user-select: none;

}



.hold-btn--active {

	transform: scale(0.96);

	background: linear-gradient(145deg, #e87830, #c85a20);

}



.hold-btn--disabled {

	opacity: 0.45;

}



.hold-btn-emoji {

	font-size: 72rpx;

	line-height: 1;

	margin-bottom: 12rpx;

}



.hold-btn-label {

	font-size: 30rpx;

	font-weight: 600;

	color: #fff;

}



.info-card {

	padding: 20rpx 22rpx;

	border-radius: 16rpx;

	background: #fff;

	border: 1rpx solid #e3d9c8;

	margin-bottom: 24rpx;

}



.info-card--diag {

	margin-bottom: 16rpx;

	background: #faf8f4;

}



.info-title {

	font-size: 26rpx;

	font-weight: 600;

	color: #8b4518;

	display: block;

	margin-bottom: 12rpx;

}



.info-line {

	display: block;

	font-size: 24rpx;

	color: #5c554c;

	line-height: 1.55;

	margin-bottom: 6rpx;

	word-break: break-all;

}



.replay-btn {

	margin-bottom: 24rpx;

}



.foot-hint {

	margin-top: auto;

	font-size: 22rpx;

	text-align: center;

}

.field {
	margin-bottom: 16rpx;
}

.field-label {
	font-size: 26rpx;
	color: #8b4518;
	display: block;
	margin-bottom: 8rpx;
}

.symbol-row {
	display: flex;
	gap: 12rpx;
	margin-bottom: 8rpx;
}

.field-input {
	background: #fff;
	border: 1rpx solid #e3d9c8;
	border-radius: 12rpx;
	padding: 14rpx 18rpx;
	font-size: 28rpx;
}

.field-input--flex {
	flex: 1;
}

.picker-btn {
	padding: 14rpx 22rpx;
	background: #fff;
	border: 1rpx solid #e3d9c8;
	border-radius: 12rpx;
	font-size: 26rpx;
	color: #8b4518;
}

.info-card--ref {
	background: #faf8f4;
}

.info-head {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8rpx;
}

.copy-link {
	font-size: 24rpx;
	color: #5a8fd4;
}

.summary {
	padding: 20rpx 22rpx;
	border-radius: 16rpx;
	margin-bottom: 20rpx;
	border: 2rpx solid #e3d9c8;
}

.summary--ok {
	background: #f0faf4;
	border-color: #6ab07a;
}

.summary--fail {
	background: #fff5f5;
	border-color: #c45c5c;
}

.summary-text {
	font-size: 28rpx;
	font-weight: 600;
	color: #2c2419;
	display: block;
	text-align: center;
}

</style>

