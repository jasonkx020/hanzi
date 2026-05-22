/**
 * @deprecated 请使用 recorder-record-test.js
 * 保留本文件仅为 mfcc-score-test 等旧路径兼容
 */
export {
	RECORD_PCM_CONFIG,
	RECORD_PCM_CONFIG as WXZ_RECORD_PCM_CONFIG,
	formatDecibel,
	formatRecorderPluginDiagnosticLines,
	formatRecorderDiagnosticLines as formatWxzPluginDiagnosticLines,
	isRecorderRecordTestAvailable,
	isRecorderRecordTestAvailable as isRecorderPcmTestAvailable,
	getLastRecorderPluginDiagnostics,
	startRecorderPcmTest,
	stopRecorderPcmTest,
	cancelRecorderPcmTest,
	peekRecorderPcmTestBuffer,
	createRecordTestController,
	buildWavFromPcmS16le,
	notifyRecorderPageShow
} from '@/utils/recorder-record-test.js'
