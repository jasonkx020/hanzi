<template>
	<meng-sub-page title="认读耳朵" subtitle="听萌萌读，点对的音节" avatar-pose="happy" :overlap-body="true">
		<view class="quiz-page">
			<view class="quiz-progress">
				<text>第 {{ qIndex + 1 }} / {{ questions.length }} 题</text>
				<text>已对 {{ correctCount }} 题</text>
			</view>
			<view class="quiz-play-zone">
				<text class="quiz-hint">👂 先听，再选</text>
				<view class="quiz-play-btn" @click="playCurrent">
					<text>🔊</text>
					<text class="quiz-play-label">{{ playing ? '播放中…' : '再听一遍' }}</text>
				</view>
			</view>
			<text class="quiz-question">你听到的是哪个整体认读？</text>
			<view class="symbol-grid">
				<view
					v-for="(opt, i) in currentOptions"
					:key="i"
					class="symbol-btn font-pinyin"
					:class="{ 'symbol-btn--picked': pickedIndex === i, 'symbol-btn--long': (opt.symbol || '').length > 2 }"
					@click="onPick(i, opt)"
				>{{ opt.symbol }}</view>
			</view>
			<view v-if="feedback" class="quiz-feedback" :class="'quiz-feedback--' + feedback">
				<text>{{ feedback === 'ok' ? '太棒啦！' : '再听一遍' }}</text>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { WHOLE_EAR_QUIZ_PASS, WHOLE_EAR_QUIZ_TOTAL } from '@/utils/pinyin-whole-lab/constants.js'
import { buildWholeEarQuestions } from '@/utils/pinyin-whole-lab/quiz.js'
import {
	awardWholeLevelStar,
	saveWholeLabProgress,
	loadWholeLabProgress
} from '@/utils/pinyin-whole-lab/progress.js'
import { playWholeLabSymbol } from '@/utils/pinyin-whole-lab/play.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'

export default {
	components: { MengSubPage },
	data() {
		return {
			questions: buildWholeEarQuestions(WHOLE_EAR_QUIZ_TOTAL),
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
				await playWholeLabSymbol(q.play)
			} catch (_) {}
			this.playing = false
		},
		async onPick(index, opt) {
			if (this.busy || !opt) return
			this.busy = true
			this.pickedIndex = index
			const ok = !!opt.correct
			this.feedback = ok ? 'ok' : 'bad'
			if (ok) this.correctCount++
			await new Promise((r) => setTimeout(r, ok ? 700 : 1000))
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
			const pass = this.correctCount >= WHOLE_EAR_QUIZ_PASS
			const p = loadWholeLabProgress()
			saveWholeLabProgress({ earBest: Math.max(Number(p.earBest) || 0, this.correctCount) })
			if (pass) {
				awardWholeLevelStar(1, this.correctCount >= 7 ? 3 : 2)
				uni.showModal({
					title: '过关啦',
					content: '小耳朵真灵！下一步「认读小贴士」',
					showCancel: false,
					success: () => uni.navigateBack()
				})
			} else {
				uni.showModal({
					title: '再试一次',
					content: `对了 ${this.correctCount} 题，需要 ${WHOLE_EAR_QUIZ_PASS} 题过关`,
					confirmText: '再来',
					cancelText: '返回',
					success: (res) => {
						if (res.confirm) {
							this.qIndex = 0
							this.correctCount = 0
							this.questions = buildWholeEarQuestions(WHOLE_EAR_QUIZ_TOTAL)
							this.$nextTick(() => this.playCurrent())
						} else uni.navigateBack()
					}
				})
			}
		}
	}
}
</script>

<style scoped>
.quiz-page {
	padding: 8rpx 4rpx 40rpx;
}
.quiz-progress {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	margin-bottom: 16rpx;
	font-size: 26rpx;
	font-weight: 700;
	color: #6d5e52;
}
.quiz-play-zone {
	text-align: center;
	margin-bottom: 20rpx;
	padding: 20rpx;
	border-radius: 24rpx;
	background: linear-gradient(135deg, #fff8e8, #fff5f0);
}
.quiz-hint {
	font-size: 28rpx;
	font-weight: 700;
	color: #c07810;
}
.quiz-play-btn {
	margin-top: 16rpx;
	display: inline-flex;
	align-items: center;
	gap: 12rpx;
	padding: 18rpx 36rpx;
	border-radius: 999rpx;
	background: #e8a020;
}
.quiz-play-label {
	font-size: 30rpx;
	font-weight: 800;
	color: #fff;
}
.quiz-question {
	display: block;
	text-align: center;
	font-size: 32rpx;
	font-weight: 800;
	margin-bottom: 16rpx;
}
.symbol-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}
.symbol-btn {
	width: calc(50% - 8rpx);
	box-sizing: border-box;
	min-height: 100rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 48rpx;
	font-weight: 800;
	border-radius: 22rpx;
	background: #fff;
	border: 4rpx solid var(--meng-border-warm);
}
.symbol-btn--long {
	font-size: 40rpx;
}
.symbol-btn--picked {
	border-color: #e8a020;
	background: #fff8e8;
}
.quiz-feedback {
	margin-top: 20rpx;
	padding: 16rpx;
	border-radius: 16rpx;
	text-align: center;
	font-size: 30rpx;
	font-weight: 800;
}
.quiz-feedback--ok {
	background: #e8fff0;
	color: #2a8f5c;
}
.quiz-feedback--bad {
	background: #fff3e8;
	color: #b84a20;
}
</style>
