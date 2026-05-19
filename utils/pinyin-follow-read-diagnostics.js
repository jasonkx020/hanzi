/**
 * 跟读录音 / 评分环境诊断（权限、Meyda、wxz-record）
 */
import { isAppPlus, getUniFileSystemManager } from '@/utils/pinyin-follow-read-platform.js'
import { isMfccRuntimeAvailable } from '@/utils/pinyin-mfcc-extract.js'
import {
	shouldUseMfccScoring,
	USE_MFCC_SCORING
} from '@/config/pinyin-follow-read-config.js'
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
		wxzRecord: isPcmRealtimeAvailable()
	}
	return out
}

/** 评分链路能力摘要 */
export function getFollowReadScoringDiagnostics() {
	return {
		isAppPlus: isAppPlus(),
		wxzRecord: isPcmRealtimeAvailable(),
		useMfccConfig: USE_MFCC_SCORING,
		mfccRuntimeAvailable: isMfccRuntimeAvailable(),
		shouldUseMfccScoring: shouldUseMfccScoring(),
		micAuthorize: getMicAuthorizeState(),
		featureExtractionNote:
			'App：wxz-record 实时 PCM → Meyda MFCC → DTW；小程序：RecorderManager 录音文件解码'
	}
}

/** 格式化为录音测试页多行文案 */
export function formatDiagnosticsLines(diag) {
	const lines = [
		`平台：${diag.platform || '—'}`,
		`麦克风授权：${diag.micAuthorize || '—'}`,
		`wxz-record：${diag.wxzRecord ? '已集成' : '未集成'}`,
		`RecorderManager：${diag.hasRecorderManager ? '有（小程序）' : '无'}`
	]
	const s = getFollowReadScoringDiagnostics()
	lines.push('—— 特征提取 ——')
	lines.push(`MFCC 配置开启：${s.useMfccConfig ? '是' : '否'}`)
	lines.push(`Meyda 运行时可用：${s.mfccRuntimeAvailable ? '是' : '否（将走 v1 包络）'}`)
	lines.push(`实际走 MFCC 评分：${s.shouldUseMfccScoring ? '是' : '否'}`)
	lines.push(s.featureExtractionNote)
	return lines
}
