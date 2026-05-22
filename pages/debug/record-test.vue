<template>

	<view class="page">

		<text class="title">麦克风录音测试</text>

		<text class="desc">选择目标拼音字母，按住说话，松开后自动播放并与标准读音做 MFCC 相似度评分。</text>

		<text class="format-hint">当前格式：{{ recordFormatLabel }} · {{ audioSpecLabel }}</text>

		<view v-if="letterList.length" class="score-field">
			<text class="score-label">目标字母（{{ letterList.length }} 个可选）</text>
			<picker
				mode="selector"
				:range="letterList"
				:value="scorePickerIndex"
				:disabled="!letterList.length"
				@change="onScorePickerChange"
			>
				<view class="score-picker">
					<text class="score-picker-main">{{ scoreSymbol }}</text>
					<text class="score-picker-hint">点击选择字母 ▼</text>
				</view>
			</picker>
			<text v-if="refPreview" class="score-ref">
				标准音：{{ refPreview.frameCount }} 帧 · {{ refPreview.durationMs }} ms
			</text>
			<text v-else-if="scoreSymbol" class="score-ref score-ref--warn">暂无「{{ scoreSymbol }}」预提取指纹</text>
		</view>
		<view v-else-if="scoringSupported" class="score-field">
			<text class="score-ref score-ref--warn">未找到可用字母指纹，请检查 static/pinyin 预提取</text>
		</view>



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

		<view v-if="scoreSummary" class="score-summary" :class="scoreSummary.pass ? 'score-summary--ok' : 'score-summary--fail'">
			<text class="score-summary-text">{{ scoreSummary.text }}</text>
		</view>

		<view v-if="scoreLines.length" class="info-card info-card--score">
			<view class="info-card-head">
				<text class="info-title">相似度明细</text>
				<text class="copy-link" @click="onCopyScoreLines">复制</text>
			</view>
			<text v-for="(line, i) in scoreLines" :key="'sc-' + i" class="info-line">{{ line }}</text>
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
			:disabled="!canRescore || scoreBusy || phase === 'recording'"
			@click="onRescore"
		>
			重新评分
		</button>

		<button

			class="replay-btn"

			type="default"

			:disabled="(!lastFile && !lastFrameBytes) || phase === 'recording' || readTestBusy"

			@click="onReadTest"

		>

			测试读取（解码路径）

		</button>



		<text class="foot-hint">{{ footHint }}</text>

	</view>

</template>



<script>

import { getRecordTestState } from '@/services/pinyin-follow-read-service.js'

import { isAppPlus, isFollowReadScoringSupported } from '@/utils/pinyin-follow-read-platform.js'
import {
	listMfccLetterSymbols,
	hasMfccFingerprint,
	getMfccFingerprintPreview,
	runMfccScoreDebugCompare
} from '@/utils/pinyin-mfcc-algorithm-test.js'

import {
	createRecordTestController,
	isRecorderRecordTestAvailable,
	formatDecibel,
	RECORD_PCM_CONFIG,
	formatRecorderPluginDiagnosticLines,
	notifyRecorderPageShow
} from '@/utils/recorder-record-test.js'
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

			_lastChartRefreshAt: 0,

			/** Recorder-UniCore 测试控制器 */
			recTest: null,

			recorderReady: false,

			scoreSymbol: 'm',
			letterList: [],
			scorePickerIndex: 0,
			refPreview: null,
			scoreSummary: null,
			scoreLines: [],
			scoreBusy: false,
			lastDurationMs: 0

		}

	},

	computed: {

		scoringSupported() {
			return isFollowReadScoringSupported()
		},

		canRecord() {

			return isRecorderRecordTestAvailable() && this.recorderReady

		},

		canRescore() {
			return (
				this.scoringSupported &&
				hasMfccFingerprint(this.scoreSymbol) &&
				(!!this.lastPcmBuffer?.byteLength || !!this.lastFile)
			)
		},

		audioSpecLabel() {

			return formatPinyinAudioSpec()

		},

		recordFormatLabel() {

			if (isRecorderRecordTestAvailable()) {

				return `pcm（Recorder-UniCore · ${PINYIN_RECORD_PCM_SAMPLE_RATE / 1000}kHz 单声道）`

			}

			if (!isAppPlus()) return '仅 App 支持本页 Recorder-UniCore 测试'

			return '未集成 Recorder-UniCore（请 npm install recorder-core）'

		},

		footHint() {

			if (!isRecorderRecordTestAvailable()) {

				return '本页在 App 真机通过 Recorder-UniCore 采集 PCM；需 npm install recorder-core 且页面含 renderjs 模块。'

			}

			if (!this.recorderReady) {

				return '正在申请麦克风权限并连接 renderjs，请稍候…'

			}

			if (!this.scoringSupported) {
				return 'PCM 来自 RecordApp onProcess；MFCC 评分仅 App 可用。'
			}
			return '松开后自动 MFCC 评分；控制台 [recorder-pcm]、[record-test.score]。'

		},

		statusText() {

			if (!isRecorderRecordTestAvailable()) {

				return '当前环境无法使用 Recorder-UniCore'

			}

			if (!this.recorderReady) {

				return '录音初始化中…'

			}

			const map = {

				idle: `按住录音，将与「${this.scoreSymbol}」标准音比对`,

				recording: '正在录音… 松开结束并评分',

				stopping: '正在保存录音…',

				comparing: `正在与「${this.scoreSymbol}」比对…`,

				playing: '正在播放录音…',

				done: '完成。可重录、重新评分或再次播放',

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

		initLetterPicker() {
			this.letterList = listMfccLetterSymbols()
			let idx = this.letterList.indexOf(this.scoreSymbol)
			if (idx < 0 && this.letterList.length) {
				this.scoreSymbol = this.letterList[0]
				idx = 0
			}
			this.scorePickerIndex = idx >= 0 ? idx : 0
			this.refreshRefPreview()
		},

		onScorePickerChange(e) {
			const i = Number(e.detail?.value) || 0
			this.scorePickerIndex = i
			const s = this.letterList[i]
			if (s) {
				this.scoreSymbol = s
				this.refreshRefPreview()
				this.scoreSummary = null
				this.scoreLines = []
			}
		},

		refreshRefPreview() {
			this.refPreview = getMfccFingerprintPreview(this.scoreSymbol)
		},

		async runLetterScoreCompare() {
			if (!this.scoringSupported) {
				this.scoreSummary = { pass: false, text: 'MFCC 评分仅支持 App 真机' }
				return
			}
			if (!hasMfccFingerprint(this.scoreSymbol)) {
				this.scoreSummary = { pass: false, text: `「${this.scoreSymbol}」无预提取指纹` }
				return
			}
			if (!this.lastPcmBuffer?.byteLength && !this.lastFile) {
				this.scoreSummary = { pass: false, text: '无录音数据，请先按住说话' }
				return
			}
			this.scoreBusy = true
			this.scoreSummary = null
			this.scoreLines = []
			const prevPhase = this.phase
			if (prevPhase !== 'playing') this.phase = 'comparing'
			try {
				const res = await runMfccScoreDebugCompare(this.scoreSymbol, this.lastPcmBuffer, {
					durationMs: this.lastDurationMs,
					tempFilePath: this.lastFile,
					recordFormat: this.lastFormat
				})
				this.scoreLines = res.lines || []
				this.scoreSummary = {
					pass: !!res.mainPass,
					text: res.summaryText || ''
				}
				uni.showToast({
					title: res.mainPass ? '读音接近' : '差异较大',
					icon: res.mainPass ? 'success' : 'none',
					duration: 2200
				})
				console.log('[record-test.score]', res)
			} catch (e) {
				const msg = e?.message || String(e)
				this.scoreLines = [`错误：${msg}`]
				this.scoreSummary = { pass: false, text: msg }
				console.warn('[record-test.score]', e)
			}
			this.scoreBusy = false
			if (this.phase === 'comparing') {
				this.phase = prevPhase === 'playing' ? 'playing' : 'done'
			}
		},

		async onRescore() {
			if (!this.canRescore || this.scoreBusy) return
			await this.runLetterScoreCompare()
		},

		onCopyScoreLines() {
			if (!this.scoreLines.length) return
			uni.setClipboardData({
				data: this.scoreLines.join('\n'),
				success: () => uni.showToast({ title: '已复制', icon: 'success' })
			})
		},

		async loadDiagnostics() {

			const perm = await probeMicPermission()

			this.diagLines = formatDiagnosticsLines(perm)

			const scoring = getFollowReadScoringDiagnostics()

			if (isRecorderRecordTestAvailable()) {

				this.diagLines.push('录音采集：Recorder-UniCore + recorder-core（npm）')

				this.diagLines.push(

					`插件配置：${RECORD_PCM_CONFIG.sampleRate}Hz · mono · ${RECORD_PCM_CONFIG.bitsPerSample}bit · frameSize=${RECORD_PCM_CONFIG.frameSize}B`

				)

			} else if (isAppPlus()) {

				this.diagLines.push('录音采集：Recorder-UniCore 不可用（检查 npm 与页面 renderjs）')

			}

			console.log('[record-test] diagnostics', perm, scoring)

		},

		teardown() {

			stopFollowReadDebugPlayback()

			this.recTest?.cancel()

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

			let frameLine = `JS 帧 ${stats.frameCount} · ${stats.totalBytes} B · 最近 ${stats.lastFrameSize} B`

			const nd = stats.pluginDiagnostics

			if (nd?.frameCount != null && nd.frameCount !== stats.frameCount) {

				frameLine += ` · 原生回调 ${nd.frameCount}`

			}

			this.liveFrameLabel = frameLine

			this.refreshPcmCharts(this.recTest?.peekPcmBuffer() || null)

		},

		async onHoldStart() {

			if (!this.recTest || !this.canRecord) {

				uni.showToast({ title: '请使用 App 并集成 Recorder-UniCore', icon: 'none' })

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

			const res = await this.recTest.startHold((s) => this.onLiveStats(s))

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

			const stopRes = await this.recTest.stopHold()

			if (!stopRes.ok) {

				this.phase = 'error'

				const diagMsg = stopRes.pluginDiagnostics?.message

				uni.showToast({

					title: diagMsg || stopRes.message || '录音失败',

					icon: 'none',

					duration: 3200

				})

				if (stopRes.frameCaptureBytes > 0 || stopRes.pluginDiagnostics) {

					await this.refreshLastInfo({

						...stopRes,

						ok: false,

						capture: 'Recorder-UniCore',

						durationMs: stopRes.durationMs || 0

					})

				}

				this.busy = false

				return

			}

			this.lastFile = stopRes.tempFilePath || ''

			this.lastFormat = stopRes.recordFormat || 'pcm'

			this.lastPcmBuffer = stopRes.recordPcmBuffer || null

			this.lastFrameBytes = Number(stopRes.frameCaptureBytes) || 0

			this.lastDurationMs = Number(stopRes.durationMs) || 0

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

			await this.runLetterScoreCompare()

			this.busy = false

		},

		async refreshLastInfo(stopRes) {

			const path = stopRes.tempFilePath || ''

			const stat = path ? await statFollowReadRecording(path) : { ok: false, err: '无文件' }

			const sniff = path ? await sniffFollowReadRecordingFile(path) : { sniff: '—', bytes: 0 }

			const lines = [

				`采集：${stopRes.capture || 'recorder-unicore'}（onProcess → JS 合并）`,

				`时长：${Math.round(Number(stopRes.durationMs) || 0)} ms`,

				`格式：${stopRes.recordFormat || 'pcm'} · ${stopRes.sampleRate || PINYIN_RECORD_PCM_SAMPLE_RATE}Hz`,

				`PCM 缓存：${this.lastFrameBytes || 0} 字节 · JS 帧 ${stopRes.frameCount || 0}`,

				`音量：当前 ${formatDecibel(stopRes.currentDecibel)} · 峰 ${formatDecibel(stopRes.maxDecibel)} · 谷 ${formatDecibel(stopRes.minDecibel)}`

			]

			const pluginLines = formatRecorderPluginDiagnosticLines(stopRes.pluginDiagnostics)

			if (pluginLines.length) {

				lines.push('—— 插件诊断 ——', ...pluginLines)

			}

			if (stopRes.startResult?.sampleRate) {

				lines.push(

					`startRecord 回报：${stopRes.startResult.sampleRate}Hz · ${stopRes.startResult.channels}ch · ${stopRes.startResult.bitsPerSample}bit`

				)

			}

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

	async mounted() {
		this.recTest = createRecordTestController(this)
		const warm = await this.recTest.warmUp()
		this.recorderReady = !!warm.ok
		if (!warm.ok) {
			this.phase = 'error'
			uni.showToast({ title: warm.message || '录音未就绪', icon: 'none', duration: 2800 })
		}
	},

	onShow() {
		notifyRecorderPageShow(this)
		this.recTest?.warmUp().then((r) => {
			this.recorderReady = !!r.ok
		})
	},

	onLoad() {
		this.loadDiagnostics()
		this.initLetterPicker()
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

.status--comparing {

	border-color: #8b6fd4;

	background: #f5f0ff;

}

.score-field {

	margin-bottom: 20rpx;

	padding: 18rpx 20rpx;

	background: #fff;

	border-radius: 14rpx;

	border: 1rpx solid #e3d9c8;

}

.score-label {

	font-size: 26rpx;

	color: #8b4518;

	display: block;

	margin-bottom: 10rpx;

}

.score-picker {

	display: flex;

	align-items: center;

	justify-content: space-between;

	padding: 16rpx 20rpx;

	background: #faf8f4;

	border-radius: 12rpx;

	border: 1rpx solid #e3d9c8;

}

.score-picker-main {

	font-size: 40rpx;

	font-weight: 700;

	color: #2c2419;

}

.score-picker-hint {

	font-size: 24rpx;

	color: #8b4518;

}

.score-ref {

	font-size: 24rpx;

	color: #6b6560;

	margin-top: 10rpx;

	display: block;

}

.score-ref--warn {

	color: #c45c5c;

}

.score-summary {

	margin: 16rpx 0;

	padding: 20rpx;

	border-radius: 14rpx;

	text-align: center;

}

.score-summary--ok {

	background: #e8f5e9;

	border: 1rpx solid #81c784;

}

.score-summary--fail {

	background: #fff3e0;

	border: 1rpx solid #ffb74d;

}

.score-summary-text {

	font-size: 28rpx;

	font-weight: 600;

	color: #2c2419;

}

.info-card--score .info-card-head {

	display: flex;

	justify-content: space-between;

	align-items: center;

	margin-bottom: 8rpx;

}

.copy-link {

	font-size: 24rpx;

	color: #e87830;

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

<!-- #ifdef APP-PLUS -->
<script module="recorderModule" lang="renderjs">
import 'recorder-core'
import RecordApp from 'recorder-core/src/app-support/app'
import '../../uni_modules/Recorder-UniCore/app-uni-support.js'
import 'recorder-core/src/engine/pcm'

export default {
	mounted() {
		RecordApp.UniRenderjsRegister(this)
	}
}
</script>
<!-- #endif -->

