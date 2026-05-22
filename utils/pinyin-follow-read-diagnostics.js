/**
 * 跟读录音 / 评分环境诊断（权限、Meyda、Recorder-UniCore）
 */
import { isAppPlus, getUniFileSystemManager, isFollowReadScoringSupported } from '@/utils/pinyin-follow-read-platform.js'
import { formatPinyinAudioSpec } from '@/constants/pinyin-audio-sample-rate.js'
// #ifdef APP-PLUS
import { isMfccRuntimeAvailable } from '@/utils/pinyin-mfcc-extract.js'
// #endif
import { isPcmRealtimeAvailable } from '@/utils/pinyin-pcm-realtime.js'

function getMicAuthorizeState() {
	try {
		if (typeof uni.getAppAuthorizeSetting !== 'function') return 'unknown'
		const s = uni.getAppAuthorizeSetting()
		return String(s?.microphoneAuthorized || 'unknown')
	} catch (_) {
		return 'error'
	}
}

/** @returns {Promise<object>} */
export async function probeMicPermission() {
	const out = {
		platform: isAppPlus() ? 'app-plus' : 'other',
		micAuthorize: getMicAuthorizeState(),
		hasRecorderManager: typeof uni?.getRecorderManager === 'function',
		hasFileSystemManager: !!getUniFileSystemManager(),
		recorderPcm: isPcmRealtimeAvailable()
	}
	return out
}

/** 评分链路能力摘要 */
export function getFollowReadScoringDiagnostics() {
	return {
		isAppPlus: isAppPlus(),
		scoringSupported: isFollowReadScoringSupported(),
		recorderPcm: isPcmRealtimeAvailable(),
		// #ifdef APP-PLUS
		mfccRuntimeAvailable: isMfccRuntimeAvailable(),
		// #endif
		// #ifndef APP-PLUS
		mfccRuntimeAvailable: false,
		// #endif
		micAuthorize: getMicAuthorizeState(),
		audioSpec: formatPinyinAudioSpec(),
		featureExtractionNote: isFollowReadScoringSupported()
			? 'App：Recorder-UniCore 48k PCM → Meyda MFCC → DTW'
			: '小程序/H5 暂不支持跟读评分'
	}
}

/** 格式化为录音测试页多行文案 */
export function formatDiagnosticsLines(diag) {
	const lines = [
		`平台：${diag.platform || '—'}`,
		`麦克风授权：${diag.micAuthorize || '—'}`,
		`Recorder-UniCore：${(diag.recorderPcm ?? diag.wxzRecord) ? '已集成' : '未集成'}`,
		`RecorderManager：${diag.hasRecorderManager ? '有（小程序）' : '无'}`
	]
	const s = getFollowReadScoringDiagnostics()
	lines.push(`音频规范：${s.audioSpec || '—'}`)
	lines.push(`本端评分：${s.scoringSupported ? '支持（MFCC）' : '不支持'}`)
	lines.push('—— 特征提取 ——')
	lines.push(`Meyda 运行时可用：${s.mfccRuntimeAvailable ? '是' : '否'}`)
	lines.push(s.featureExtractionNote)
	return lines
}
