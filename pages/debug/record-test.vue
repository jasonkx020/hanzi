<template>
	<view class="page">
		<text class="title">麦克风录音测试</text>
		<text class="desc">按住下方按钮说话，松开后自动播放，用于确认是否能录到声音。</text>
		<text class="format-hint">当前格式：{{ recordFormatLabel }} · 16kHz 单声道</text>

		<view v-if="diagLines.length" class="info-card info-card--diag">
			<text class="info-title">环境与特征提取</text>
			<text v-for="(line, i) in diagLines" :key="'d-' + i" class="info-line">{{ line }}</text>
		</view>

		<view class="status-box" :class="'status--' + phase">
			<text class="status-text">{{ statusText }}</text>
		</view>

		<view
			class="hold-btn"
			:class="{ 'hold-btn--active': phase === 'recording' }"
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
			:disabled="!lastFile || phase === 'recording' || readTestBusy"
			@click="onReadTest"
		>
			测试读取文件（跟读评分同路径）
		</button>

		<text class="foot-hint">若听不到回放：检查麦克风权限、系统静音、是否误用蓝牙耳机。跟读评分还需「读取文件」成功，可点上方按钮验证。</text>
	</view>
</template>

<script>
import {
	startHoldRecordTest,
	stopHoldRecordTest,
	cancelHoldRecordTest,
	getRecordTestState
} from '@/services/pinyin-follow-read-service.js'
import { PINYIN_FOLLOW_READ_PREFER_PCM } from '@/config/pinyin-follow-read-config.js'
import { isAppPlus } from '@/utils/pinyin-follow-read-platform.js'
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

export default {
	data() {
		return {
			/** idle | recording | stopping | playing | done | error */
			phase: 'idle',
			lastFile: '',
			lastFormat: 'wav',
			lastPcmBuffer: null,
			lastFrameBytes: 0,
			lastInfo: { lines: [] },
			diagLines: [],
			busy: false,
			readTestBusy: false
		}
	},
	computed: {
		recordFormatLabel() {
			if (!isAppPlus()) return 'mp3'
			if (!PINYIN_FOLLOW_READ_PREFER_PCM) return 'mp3'
			const fs = typeof uni !== 'undefined' && uni.getFileSystemManager?.()
			return fs ? 'wav（App）' : 'pcm（App · 无 uni 文件系统）'
		},
		statusText() {
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
			if (this.phase === 'recording') return '松开结束'
			return '按住说话'
		}
	},
	async onLoad() {
		await this.loadDiagnostics()
	},
	onHide() {
		this.teardown()
	},
	onUnload() {
		this.teardown()
	},
	methods: {
		async loadDiagnostics() {
			const perm = await probeMicPermission()
			this.diagLines = formatDiagnosticsLines(perm)
			const scoring = getFollowReadScoringDiagnostics()
			console.log('[record-test] diagnostics', perm, scoring)
		},
		teardown() {
			stopFollowReadDebugPlayback()
			if (getRecordTestState().recording) {
				cancelHoldRecordTest()
			}
			this.phase = 'idle'
			this.busy = false
		},
		async onHoldStart() {
			if (this.busy || this.phase === 'recording' || this.phase === 'stopping') return
			if (getRecordTestState().followReadRecording) {
				uni.showToast({ title: '跟读录音进行中，请先停止', icon: 'none' })
				return
			}
			this.busy = true
			this.phase = 'recording'
			stopFollowReadDebugPlayback()
			const res = await startHoldRecordTest()
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
			const stopRes = await stopHoldRecordTest()
			if (!stopRes.ok) {
				this.phase = 'error'
				uni.showToast({ title: stopRes.message || '录音失败', icon: 'none', duration: 2800 })
				this.busy = false
				return
			}
			this.lastFile = stopRes.tempFilePath || ''
			this.lastFormat = stopRes.recordFormat || 'wav'
			this.lastPcmBuffer = stopRes.recordPcmBuffer || null
			this.lastFrameBytes = Number(stopRes.frameCaptureBytes) || stopRes.recordPcmBuffer?.byteLength || 0
			await this.refreshLastInfo(stopRes)
			this.phase = 'playing'
			const playRes = await playRecordingFile(this.lastFile, { delayMs: 120 })
			if (!playRes?.ok) {
				this.phase = 'error'
				uni.showToast({ title: playRes?.message || '播放失败', icon: 'none', duration: 2800 })
			} else {
				this.phase = 'done'
			}
			this.busy = false
		},
		async refreshLastInfo(stopRes) {
			const path = stopRes.tempFilePath || ''
			const stat = await statFollowReadRecording(path)
			const sniff = await sniffFollowReadRecordingFile(path)
			const lines = [
				`时长：${Math.round(Number(stopRes.durationMs) || 0)} ms`,
				`格式：${stopRes.recordFormat || '—'}`,
				`录音帧缓存：${this.lastFrameBytes || 0} 字节（跟读评分优先用此内存数据）`,
				`文件大小：${stat.ok ? stat.size + ' 字节' : stat.err || '未知'}`,
				`文件类型嗅探：${sniff.sniff || '—'}（${sniff.bytes || 0} 字节已读）`
			]
			if (stat.path) {
				lines.push(`路径：${stat.path}`)
			}
			if (sniff.err) {
				lines.push(`读取：${sniff.err}`)
			}
			this.lastInfo = { lines }
		},
		onReplay() {
			if (!this.lastFile) return
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

			if (this.lastFrameBytes >= 1600 && this.lastPcmBuffer) {
				try {
					const dec = await decodeUserRecordingForScore(this.lastFile, this.lastFormat, {
						recordPcmBuffer: this.lastPcmBuffer
					})
					const n = dec.int16?.length || dec.samples?.length || 0
					lines.push(`✓ 录音帧解码成功：${n} 采样点，路径 ${dec.decodePath}`)
				} catch (e) {
					lines.push(`✗ 录音帧解码失败：${e?.message || e}`)
				}
			} else {
				lines.push(`✗ 录音帧过少（${this.lastFrameBytes} 字节），请按住多说 0.5 秒`)
			}

			if (this.lastFile) {
				const sniff = await sniffFollowReadRecordingFile(this.lastFile)
				if (sniff.err) {
					lines.push(`readFile：失败 ${sniff.err}`)
				} else {
					lines.push(`readFile：成功 ${sniff.bytes} 字节，${sniff.sniff}`)
				}
			}

			const ok = lines.some((l) => l.includes('录音帧解码成功') || l.includes('readFile：成功'))
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
</style>
