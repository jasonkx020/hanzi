<template>

	<view class="page">

		<text class="title">麦克风录音测试</text>

		<text class="desc">按住下方按钮说话，松开后自动播放，用于确认是否能录到声音。</text>

		<text class="format-hint">当前格式：{{ recordFormatLabel }} · {{ audioSpecLabel }}</text>



		<view v-if="diagLines.length" class="info-card info-card--diag">

			<text class="info-title">环境与特征提取</text>

			<text v-for="(line, i) in diagLines" :key="'d-' + i" class="info-line">{{ line }}</text>

		</view>



		<view v-if="showPcmSection" class="info-card info-card--charts">
			<text class="info-title">PCM 图谱</text>
			<text v-if="chartCanvasTip" class="chart-platform-tip">{{ chartCanvasTip }}</text>
			<template v-if="chartCanvasSupported">
				<pcm-audio-chart
					:key="'wave-' + chartLayoutKey"
					canvas-id="record-test-pcm-wave"
					title="时域波形"
					mode="wave"
					:values="chartPeaks"
					:active="phase === 'recording'"
					:width-px="chartWidthPx"
					:height-px="chartWaveHeightPx"
					:hint="chartWaveHint"
				/>
				<pcm-audio-chart
					:key="'spec-' + chartLayoutKey"
					canvas-id="record-test-pcm-spectrum"
					title="频谱（中段 FFT）"
					mode="spectrum"
					:values="chartSpectrum"
					:active="phase === 'recording'"
					:width-px="chartWidthPx"
					:height-px="chartSpectrumHeightPx"
					:hint="chartSpectrumHint"
				/>
			</template>
			<view v-else class="chart-fallback">
				<text class="chart-fallback-line">{{ chartPcmSummary }}</text>
				<text v-if="chartPeaks.length" class="chart-fallback-line chart-fallback-line--mono">
					波形采样点 {{ chartPeaks.length }} · 频谱柱 {{ chartSpectrum.length }}
				</text>
			</view>
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



		<view v-if="lastInfo.lines.length" class="info-card">

			<text class="info-title">上次录音</text>

			<text v-for="(line, i) in lastInfo.lines" :key="i" class="info-line">{{ line }}</text>

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

	formatDecibel,

	peekWxzRecordTestPcmBuffer

} from '@/utils/wxz-record-test.js'
import {
	peaksFromPcm,
	spectrumBarsFromPcm,
	isPcmPeaksMostlySilent
} from '@/utils/pcm-visualization.js'
import PcmAudioChart from '@/components/pcm-audio-chart.vue'
import { formatPinyinAudioSpec, PINYIN_RECORD_PCM_SAMPLE_RATE } from '@/constants/pinyin-audio-sample-rate.js'
import {
	isLegacyCanvasApiAvailable,
	computeLegacyCanvasWidthPx,
	getUniRuntimeLabel
} from '@/utils/uni-legacy-canvas.js'

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
import { PINYIN_RECORD_MIN_PCM_BYTES } from '@/constants/pinyin-audio-sample-rate.js'

export default {

	components: { PcmAudioChart },

	data() {

		return {

			/** idle | recording | stopping | playing | done | error */

			phase: 'idle',

			lastFile: '',

			lastFormat: 'pcm',

			lastPcmBuffer: null,

			lastFrameBytes: 0,

			lastInfo: { lines: [] },

			diagLines: [],

			busy: false,

			readTestBusy: false,

			liveDecibelLabel: '',

			liveFrameLabel: '',

			chartPeaks: [],

			chartSpectrum: [],

			chartWidthPx: 320,

			chartWaveHeightPx: 100,

			chartSpectrumHeightPx: 72,

			chartSilent: true,

			chartCanvasSupported: false,

			chartLayoutKey: 0,

			_lastChartRefreshAt: 0

		}

	},

	computed: {

		canRecord() {

			return isWxzRecordTestAvailable()

		},

		audioSpecLabel() {

			return formatPinyinAudioSpec()

		},

		recordFormatLabel() {

			if (isWxzRecordTestAvailable()) {

				return `pcm（wxz-record · ${PINYIN_RECORD_PCM_SAMPLE_RATE / 1000}kHz 单声道）`

			}

			if (!isAppPlus()) return '仅 App 支持本页 wxz-record 测试'

			return '未集成 wxz-record（请安装插件并自定义基座）'

		},

		footHint() {

			if (!isWxzRecordTestAvailable()) {

				return '本页在 App 真机通过 wxz-record 采集 PCM；请安装 uni_modules/wxz-record 后重新打包自定义基座。'

			}

			return '若听不到回放：检查麦克风权限、系统静音、蓝牙耳机。评分可点「测试读取」验证内存 PCM 解码。'

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

		},

		/** 图谱区：App 可录音时展示；非 App 不展示（本页录音仅 App） */
		showPcmSection() {

			if (!this.canRecord) return false

			return (
				this.phase === 'recording' ||
				this.chartPeaks.length > 0 ||
				this.lastFrameBytes > 0
			)

		},

		chartCanvasTip() {

			if (!this.showPcmSection) return ''

			if (!this.chartCanvasSupported) {

				return `${getUniRuntimeLabel()} 不支持旧版 canvas，已改为数值摘要（请用 App 真机查看波形）。`

			}

			return ''

		},

		chartPcmSummary() {

			if (!this.chartPeaks.length) {

				return this.phase === 'recording' ? '等待 PCM 帧…' : '尚无 PCM 数据'

			}

			const max = Math.max(...this.chartPeaks)

			const pct = (max * 100).toFixed(1)

			if (this.chartSilent) {

				return `振幅极低（峰值约 ${pct}%），可能静音或未采到声`

			}

			return `振幅正常（峰值约 ${pct}%），${this.phase === 'recording' ? '录音中' : '已录完'}`

		},

		chartWaveHint() {

			if (this.phase === 'recording') {

				return '录音中实时刷新；正常说话应看到明显起伏，平直可能未采到声。'

			}

			if (this.chartSilent) {

				return '波形几乎平直：可能静音、权限未开或麦克风异常。'

			}

			return '松开后为整段录音波形；可对照回放确认是否有声。'

		},

		chartSpectrumHint() {

			if (!this.chartSpectrum.length) return ''

			if (this.chartSilent) {

				return '频谱能量偏低，与静音或极弱输入一致。'

			}

			return '语音通常在低频柱较高；仅高频尖峰可能是噪声。'

		}

	},

	methods: {

		initChartLayout() {

			this.chartCanvasSupported = isLegacyCanvasApiAvailable()

			this.chartWidthPx = computeLegacyCanvasWidthPx(56, 260)

		},

		bumpChartLayout() {

			this.chartLayoutKey += 1

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

		refreshPcmCharts(pcmBuffer, { force } = {}) {

			if (!pcmBuffer?.byteLength) {

				if (force) {

					this.chartPeaks = []

					this.chartSpectrum = []

					this.chartSilent = true

				}

				return

			}

			const now = Date.now()

			if (!force && now - this._lastChartRefreshAt < 80) return

			this._lastChartRefreshAt = now

			const peaks = peaksFromPcm(pcmBuffer)

			const spectrum = spectrumBarsFromPcm(pcmBuffer)

			this.chartPeaks = peaks

			this.chartSpectrum = spectrum

			this.chartSilent = isPcmPeaksMostlySilent(peaks)

		},

		onLiveStats(stats) {

			this.liveDecibelLabel = `实时音量：${formatDecibel(stats.currentDecibel)}（峰值 ${formatDecibel(stats.maxDecibel)}）`

			this.liveFrameLabel = `帧 ${stats.frameCount} · ${stats.totalBytes} 字节 · 最近帧 ${stats.lastFrameSize} B`

			this.refreshPcmCharts(peekWxzRecordTestPcmBuffer())

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

			this.refreshPcmCharts(null, { force: true })

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

			this.refreshPcmCharts(this.lastPcmBuffer, { force: true })

			await this.refreshLastInfo(stopRes)

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

				lines.push(`✗ PCM 过少（${this.lastFrameBytes} 字节），请按住多说 0.5 秒`)

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

	},

	onLoad() {

		this.loadDiagnostics()

	},

	onReady() {

		this.initChartLayout()

		this.$nextTick(() => this.bumpChartLayout())

	},

	onHide() {

		this.teardown()

	},

	onUnload() {

		this.teardown()

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



.info-card--charts {

	margin-bottom: 20rpx;

}



.chart-platform-tip {

	display: block;

	font-size: 22rpx;

	color: #9a948c;

	line-height: 1.45;

	margin-bottom: 12rpx;

}



.chart-fallback {

	padding: 16rpx 8rpx;

}



.chart-fallback-line {

	display: block;

	font-size: 24rpx;

	color: #5c554c;

	line-height: 1.5;

	margin-bottom: 8rpx;

}



.chart-fallback-line--mono {

	font-size: 22rpx;

	color: #9a948c;

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

</style>

