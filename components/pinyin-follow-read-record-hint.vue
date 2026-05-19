<template>
	<view v-if="visible" class="fr-record-hint">
		<text class="fr-record-hint-title">{{ title }}</text>
		<view class="fr-record-hint-track">
			<view class="fr-record-hint-fill" :style="{ width: progressWidth }" />
		</view>
		<text class="fr-record-hint-sub">{{ subText }}</text>
		<view
			v-if="showDebugPlayback"
			class="fr-record-hint-debug"
			@click.stop="$emit('debug-play')"
		>
			<text class="fr-record-hint-debug-text">🔊 试听上次录音</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'PinyinFollowReadRecordHint',
	props: {
		visible: { type: Boolean, default: false },
		/** 0–100 */
		progress: { type: Number, default: 0 },
		target: { type: String, default: '' },
		scoring: { type: Boolean, default: false },
		/** 已检测到有效发声，进度条从此刻起按有效时长推进 */
		speechStarted: { type: Boolean, default: false },
		/** 调试：显示「试听上次录音」 */
		showDebugPlayback: { type: Boolean, default: false }
	},
	computed: {
		progressWidth() {
			const p = Math.max(0, Math.min(100, Number(this.progress) || 0))
			return `${p}%`
		},
		title() {
			if (this.scoring) return '正在对比读音…'
			const t = String(this.target || '').trim()
			return t ? `请跟读「${t}」` : '请跟读'
		},
		subText() {
			if (this.scoring) return '请稍候'
			if (!this.speechStarted) return '请开口跟读'
			const left = Math.max(0, 100 - (Number(this.progress) || 0))
			if (left <= 8) return '即将结束'
			return '录音中，请大声读'
		}
	}
}
</script>

<style scoped>
.fr-record-hint {
	margin: 12rpx 8rpx 4rpx;
	padding: 16rpx 18rpx 14rpx;
	border-radius: 20rpx;
	background: rgba(255, 252, 245, 0.96);
	border: 2rpx solid rgba(200, 120, 60, 0.35);
	box-shadow: 0 6rpx 16rpx rgba(44, 36, 25, 0.06);
}

.fr-record-hint-title {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	color: #8b4518;
	text-align: center;
	margin-bottom: 12rpx;
}

.fr-record-hint-track {
	height: 14rpx;
	border-radius: 999rpx;
	background: rgba(200, 120, 60, 0.18);
	overflow: hidden;
}

.fr-record-hint-fill {
	height: 100%;
	border-radius: 999rpx;
	background: linear-gradient(90deg, #f0a060, #e87830);
	transition: width 0.04s linear;
}

.fr-record-hint-sub {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	color: #9a6b42;
	text-align: center;
}

.fr-record-hint-debug {
	margin-top: 14rpx;
	padding: 10rpx 16rpx;
	border-radius: 12rpx;
	background: rgba(80, 120, 200, 0.12);
	border: 1rpx dashed rgba(80, 120, 200, 0.45);
}

.fr-record-hint-debug-text {
	font-size: 22rpx;
	color: #4a6a9a;
	text-align: center;
}
</style>
