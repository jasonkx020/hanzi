/**
 * 跟读录音 / 评分环境诊断（权限、Meyda、读盘能力）
 */
import { isAppPlus, getUniFileSystemManager, mustUsePlusIoForLocalFiles } from '@/utils/pinyin-follow-read-platform.js'
import { isMfccRuntimeAvailable } from '@/utils/pinyin-mfcc-extract.js'
import {
	shouldUseMfccScoring,
	USE_MFCC_SCORING,
	PINYIN_FOLLOW_READ_PREFER_PCM
} from '@/config/pinyin-follow-read-config.js'

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
		mustUsePlusIo: mustUsePlusIoForLocalFiles(),
		hasPlusIo: typeof plus !== 'undefined' && !!plus?.io?.resolveLocalFileSystemURL
	}
	try {
		// #ifdef APP-PLUS
		if (typeof plus !== 'undefined' && plus.os?.name === 'Android') {
			out.androidOs = true
		}
		// #endif
	} catch (_) {}
	return out
}

/** 评分链路能力摘要 */
export function getFollowReadScoringDiagnostics() {
	return {
		isAppPlus: isAppPlus(),
		preferPcmFormat: PINYIN_FOLLOW_READ_PREFER_PCM,
		useMfccConfig: USE_MFCC_SCORING,
		mfccRuntimeAvailable: isMfccRuntimeAvailable(),
		shouldUseMfccScoring: shouldUseMfccScoring(),
		micAuthorize: getMicAuthorizeState(),
		featureExtractionImplemented: true,
		featureExtractionNote:
			'已实现：wav/pcm 解码 → Meyda MFCC（utils/pinyin-mfcc-extract.js）→ DTW（utils/pinyin-mfcc-compare.js）；App 另支持录音帧直出 PCM 绕过 readFile'
	}
}

/** 格式化为录音测试页多行文案 */
export function formatDiagnosticsLines(diag) {
	const lines = [
		`平台：${diag.platform || '—'}`,
		`麦克风授权：${diag.micAuthorize || '—'}`,
		`RecorderManager：${diag.hasRecorderManager ? '有' : '无'}`,
		`FileSystemManager：${diag.hasFileSystemManager ? '有' : '无（App 正常，读文件走 plus.io）'}`,
		`读录音策略：${diag.mustUsePlusIo ? 'plus.io' : 'uni FS 优先'}`,
		`plus.io：${diag.hasPlusIo ? '有' : '无'}`
	]
	const s = getFollowReadScoringDiagnostics()
	lines.push('—— 特征提取 ——')
	lines.push(`MFCC 配置开启：${s.useMfccConfig ? '是' : '否'}`)
	lines.push(`Meyda 运行时可用：${s.mfccRuntimeAvailable ? '是' : '否（将走 v1 包络）'}`)
	lines.push(`实际走 MFCC 评分：${s.shouldUseMfccScoring ? '是' : '否'}`)
	lines.push(s.featureExtractionNote)
	return lines
}
