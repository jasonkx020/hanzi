<!--
  @file body.vue
  @layer L1 表现层
  @description 路由页面源文件：body.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<meng-sub-page title="四声身体" subtitle="听萌萌读，做对的动作" avatar-pose="happy" :overlap-body="true">
		<view class="body-page">
			<view class="ear-progress">
				<text class="ear-progress-text">第 {{ qIndex + 1 }} / {{ questions.length }} 题</text>
				<text class="ear-progress-score">已对 {{ correctCount }} 题</text>
			</view>

			<view class="body-demo" v-if="currentGesture">
				<text class="body-demo-title">萌萌示范</text>
				<tone-contour-card :tone="currentGesture.tone" :compact="true" :show-label="true" />
				<text class="body-demo-gesture">{{ currentGesture.emoji }} {{ currentGesture.gesture }}</text>
				<text class="body-demo-tip">{{ currentGesture.tip }}</text>
			</view>

			<view class="ear-play-zone">
				<text class="ear-hint">🙋 先听，再选你做的动作</text>
				<view class="ear-play-btn" @click="playCurrent">
					<text class="ear-play-emoji">🔊</text>
					<text class="ear-play-label">{{ playing ? '播放中…' : '再听一遍' }}</text>
				</view>
			</view>

			<view class="body-grid">
				<view
					v-for="(opt, i) in currentOptions"
					:key="i"
					class="body-cell"
					:class="{ 'body-cell--picked': pickedIndex === i }"
					@click="onPick(i, opt)"
				>
					<text class="body-cell-emoji">{{ opt.emoji }}</text>
					<text class="body-cell-label">{{ opt.gesture }}</text>
				</view>
			</view>

			<view v-if="feedback" class="ear-feedback" :class="'ear-feedback--' + feedback">
				<text>{{ feedbackText }}</text>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import ToneContourCard from '@/components/tone-contour-card.vue'
import { TONE_BODY_GESTURES, BODY_QUIZ_PASS } from '@/utils/pinyin-tone-lab/constants.js'
import { buildBodyQuizQuestions } from '@/utils/pinyin-tone-lab/quiz.js'
import {
	awardLevelStar,
	saveToneLabProgress,
	loadToneLabProgress
} from '@/utils/pinyin-tone-lab/progress.js'
import { getLocalPinyinAudioPath, playPinyinLocalAudio } from '@/utils/play-pinyin-local-audio.js'
import { playLabPinyinAudio, cancelPinyinPlay } from '@/utils/pinyin-lab-play.js'

export default {
	components: { MengSubPage, ToneContourCard },
	data() {
		return {
			gestures: TONE_BODY_GESTURES,
			questions: buildBodyQuizQuestions(),
			qIndex: 0,
			correctCount: 0,
			pickedIndex: -1,
			playing: false,
			feedback: '',
			busy: false
		}
	},
	computed: {
		currentQ() {
			return this.questions[this.qIndex] || null
		},
		currentOptions() {
			return this.currentQ?.options || []
		},
		currentGesture() {
			const t = this.currentQ?.tone
			return this.gestures.find((g) => g.tone === t) || null
		},
		feedbackText() {
			if (this.feedback === 'ok') return '动作对啦！'
			if (this.feedback === 'bad') return '再听一遍，跟萌萌做'
			return ''
		}
	},
	onLoad() {
		this.$nextTick(() => this.playCurrent())
	},
	onHide() { cancelPinyinPlay() },
	onUnload() { cancelPinyinPlay() },
	methods: {
		async playCurrent() {
			const q = this.currentQ
			if (!q) return
			this.playing = true
			try {
				await playLabPinyinAudio(async ({ isCancelled }) => {
					if (isCancelled()) return false
					try {
						await playPinyinLocalAudio(getLocalPinyinAudioPath(q.play), { timeoutMs: 3500 })
						return !isCancelled()
					} catch (_) {
						return false
					}
				})
			} finally {
				this.playing = false
			}
		},
		async onPick(index, opt) {
			if (this.busy || !opt) return
			this.busy = true
			this.pickedIndex = index
			const ok = !!opt.correct
			this.feedback = ok ? 'ok' : 'bad'
			if (ok) this.correctCount++
			await new Promise((r) => setTimeout(r, ok ? 700 : 1100))
			this.feedback = ''
			this.pickedIndex = -1
			if (this.qIndex >= this.questions.length - 1) {
				this.finishQuiz()
				this.busy = false
				return
			}
			this.qIndex++
			this.busy = false
			this.$nextTick(() => this.playCurrent())
		},
		finishQuiz() {
			const pass = this.correctCount >= BODY_QUIZ_PASS
			const p = loadToneLabProgress()
			saveToneLabProgress({
				bodyBest: Math.max(Number(p.bodyBest) || 0, this.correctCount)
			})
			if (pass) {
				awardLevelStar(2, this.correctCount >= 7 ? 3 : this.correctCount >= 6 ? 2 : 1)
				uni.showModal({
					title: '过关啦',
					content: '身体记住四声啦！可以去「调号朋友」咯',
					showCancel: false,
					success: () => uni.navigateBack()
				})
			} else {
				uni.showModal({
					title: '再试一次',
					content: `对了 ${this.correctCount} 题，需要 ${BODY_QUIZ_PASS} 题过关哦`,
					confirmText: '再来',
					cancelText: '返回',
					success: (res) => {
						if (res.confirm) {
							this.qIndex = 0
							this.correctCount = 0
							this.questions = buildBodyQuizQuestions()
							this.$nextTick(() => this.playCurrent())
						} else {
							uni.navigateBack()
						}
					}
				})
			}
		}
	}
}
</script>

<style scoped>
.body-page {
	padding: 8rpx 4rpx 40rpx;
}

.ear-progress {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	margin-bottom: 16rpx;
}

.ear-progress-text,
.ear-progress-score {
	font-size: 26rpx;
	font-weight: 700;
	color: #6d5e52;
}

.body-demo {
	text-align: center;
	padding: 16rpx 20rpx 20rpx;
	margin-bottom: 12rpx;
	border-radius: 24rpx;
	background: #fff;
	border: 3rpx solid var(--meng-border-warm);
}

.body-demo-title {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: #8b4518;
	margin-bottom: 8rpx;
}

.body-demo-gesture {
	display: block;
	margin-top: 12rpx;
	font-size: 32rpx;
	font-weight: 800;
	color: #2c2419;
}

.body-demo-tip {
	display: block;
	margin-top: 6rpx;
	font-size: 24rpx;
	color: #6d5e52;
}

.ear-play-zone {
	text-align: center;
	margin-bottom: 20rpx;
	padding: 20rpx;
	border-radius: 24rpx;
	background: linear-gradient(135deg, #e8f8ff, #fff5fa);
}

.ear-hint {
	font-size: 28rpx;
	font-weight: 700;
	color: #2c5f8f;
}

.ear-play-btn {
	margin-top: 16rpx;
	display: inline-flex;
	flex-direction: row;
	align-items: center;
	padding: 18rpx 36rpx;
	border-radius: 999rpx;
	background: var(--meng-accent-solid, #ff8aab);
	box-shadow: 0 8rpx 18rpx rgba(255, 120, 160, 0.25);
}

.ear-play-emoji {
	font-size: 36rpx;
}

.ear-play-label {
	font-size: 30rpx;
	font-weight: 800;
	color: #fff;
}

.body-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}

.body-cell {
	width: calc(50% - 8rpx);
	box-sizing: border-box;
	padding: 20rpx 16rpx;
	border-radius: 22rpx;
	background: #fff;
	border: 4rpx solid var(--meng-border-warm);
	text-align: center;
	min-height: 140rpx;
}

.body-cell--picked {
	border-color: #ff8aab;
	background: #fff8fc;
}

.body-cell-emoji {
	font-size: 48rpx;
	display: block;
}

.body-cell-label {
	display: block;
	margin-top: 8rpx;
	font-size: 26rpx;
	font-weight: 800;
	color: #2c2419;
}

.ear-feedback {
	margin-top: 20rpx;
	padding: 16rpx;
	border-radius: 16rpx;
	text-align: center;
	font-size: 30rpx;
	font-weight: 800;
}

.ear-feedback--ok {
	background: #e8fff0;
	color: #2a8f5c;
}

.ear-feedback--bad {
	background: #fff3e8;
	color: #b84a20;
}
</style>
