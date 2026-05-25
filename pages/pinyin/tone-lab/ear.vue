<template>
	<meng-sub-page title="四声耳朵" subtitle="听萌萌读，点对的形状" avatar-pose="happy" :overlap-body="true">
		<view class="ear-page">
			<view class="ear-progress">
				<text class="ear-progress-text">第 {{ qIndex + 1 }} / {{ questions.length }} 题</text>
				<text class="ear-progress-score">已对 {{ correctCount }} 题</text>
			</view>

			<view class="ear-play-zone">
				<text class="ear-hint">👂 先听，再选</text>
				<view class="ear-play-btn" @click="playCurrent">
					<text class="ear-play-emoji">🔊</text>
					<text class="ear-play-label">{{ playing ? '播放中…' : '再听一遍' }}</text>
				</view>
			</view>

			<text class="ear-question">这是第几声？</text>

			<view class="ear-grid">
				<view
					v-for="m in toneMeta"
					:key="m.tone"
					class="ear-cell"
					@click="onPick(m.tone)"
				>
					<tone-contour-card
						:tone="m.tone"
						:active="pickedTone === m.tone"
						:compact="true"
						:show-label="true"
					/>
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
import { TONE_META, EAR_QUIZ_PASS } from '@/utils/pinyin-tone-lab/constants.js'
import { buildEarQuizQuestions } from '@/utils/pinyin-tone-lab/quiz.js'
import {
	awardLevelStar,
	saveToneLabProgress,
	loadToneLabProgress
} from '@/utils/pinyin-tone-lab/progress.js'
import {
	getLocalPinyinAudioPath,
	playPinyinLocalAudio,
	stopLocalPinyinAudio
} from '@/utils/play-pinyin-local-audio.js'

export default {
	components: { MengSubPage, ToneContourCard },
	data() {
		return {
			toneMeta: TONE_META,
			questions: buildEarQuizQuestions(),
			qIndex: 0,
			correctCount: 0,
			pickedTone: 0,
			playing: false,
			feedback: '',
			busy: false
		}
	},
	computed: {
		currentQ() {
			return this.questions[this.qIndex] || null
		},
		feedbackText() {
			if (this.feedback === 'ok') return '太棒啦！'
			if (this.feedback === 'bad') return '再听一遍，试试别的'
			return ''
		}
	},
	onLoad() {
		this.$nextTick(() => this.playCurrent())
	},
	onHide() {
		stopLocalPinyinAudio()
	},
	onUnload() {
		stopLocalPinyinAudio()
	},
	methods: {
		async playCurrent() {
			const q = this.currentQ
			if (!q || this.playing) return
			this.playing = true
			stopLocalPinyinAudio()
			try {
				await playPinyinLocalAudio(getLocalPinyinAudioPath(q.play), { timeoutMs: 3500 })
			} catch (_) {}
			this.playing = false
		},
		async onPick(tone) {
			if (this.busy || !this.currentQ) return
			this.busy = true
			this.pickedTone = tone
			const ok = tone === this.currentQ.tone
			this.feedback = ok ? 'ok' : 'bad'
			if (ok) this.correctCount++
			await new Promise((r) => setTimeout(r, ok ? 700 : 1100))
			this.feedback = ''
			this.pickedTone = 0
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
			const pass = this.correctCount >= EAR_QUIZ_PASS
			const p = loadToneLabProgress()
			const earBest = Math.max(Number(p.earBest) || 0, this.correctCount)
			saveToneLabProgress({ earBest })
			if (pass) {
				awardLevelStar(1, this.correctCount >= 7 ? 3 : this.correctCount >= 6 ? 2 : 1)
				uni.showModal({
					title: '过关啦',
					content: `你听对了 ${this.correctCount} 题！下一步去「四声身体」`,
					showCancel: false,
					success: () => uni.navigateBack()
				})
			} else {
				uni.showModal({
					title: '再试一次',
					content: `对了 ${this.correctCount} 题，需要 ${EAR_QUIZ_PASS} 题过关哦`,
					confirmText: '再来',
					cancelText: '返回',
					success: (res) => {
						if (res.confirm) {
							this.qIndex = 0
							this.correctCount = 0
							this.questions = buildEarQuizQuestions()
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
.ear-page {
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

.ear-play-zone {
	text-align: center;
	margin-bottom: 20rpx;
	padding: 20rpx;
	border-radius: 24rpx;
	background: linear-gradient(135deg, #fff8e8, #ffe8f4);
}

.ear-hint {
	font-size: 28rpx;
	font-weight: 700;
	color: #8b4518;
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

.ear-question {
	display: block;
	text-align: center;
	font-size: 32rpx;
	font-weight: 800;
	color: #2c2419;
	margin-bottom: 16rpx;
}

.ear-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}

.ear-cell {
	width: calc(50% - 8rpx);
	min-height: 140rpx;
	box-sizing: border-box;
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
