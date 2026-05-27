<template>
	<meng-sub-page title="声母耳朵" subtitle="听萌萌读，点对的声母" avatar-pose="happy" :overlap-body="true">
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
			<text class="quiz-question">你听到的是哪个声母？</text>
			<view class="letter-grid">
				<pinyin-lab-cell
					v-for="(opt, i) in currentOptions"
					:key="i"
					class="letter-grid-item"
					:symbol="opt.symbol"
					category-tab="声母"
					:picked="pickedIndex === i"
					block
					@click="onPick(i, opt)"
				/>
			</view>
			<view v-if="feedback" class="quiz-feedback" :class="'quiz-feedback--' + feedback">
				<text>{{ feedback === 'ok' ? '太棒啦！' : '再听一遍' }}</text>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import PinyinLabCell from '@/components/pinyin-lab-cell.vue'
import { INITIAL_EAR_QUIZ_PASS } from '@/utils/pinyin-initial-lab/constants.js'
import { buildInitialEarQuestions } from '@/utils/pinyin-initial-lab/quiz.js'
import {
	awardInitialLevelStar,
	saveInitialLabProgress,
	loadInitialLabProgress
} from '@/utils/pinyin-initial-lab/progress.js'
import { getLocalPinyinAudioPath, playPinyinLocalAudio } from '@/utils/play-pinyin-local-audio.js'
import { playLabPinyinAudio, cancelPinyinPlay } from '@/utils/pinyin-lab-play.js'

export default {
	components: { MengSubPage, PinyinLabCell },
	data() {
		return {
			questions: buildInitialEarQuestions(),
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
			const pass = this.correctCount >= INITIAL_EAR_QUIZ_PASS
			const p = loadInitialLabProgress()
			saveInitialLabProgress({ earBest: Math.max(Number(p.earBest) || 0, this.correctCount) })
			if (pass) {
				awardInitialLevelStar(1, this.correctCount >= 7 ? 3 : 2)
				uni.showModal({
					title: '过关啦',
					content: '小耳朵真灵！下一步「口型朋友」',
					showCancel: false,
					success: () => uni.navigateBack()
				})
			} else {
				uni.showModal({
					title: '再试一次',
					content: `对了 ${this.correctCount} 题，需要 ${INITIAL_EAR_QUIZ_PASS} 题过关`,
					confirmText: '再来',
					cancelText: '返回',
					success: (res) => {
						if (res.confirm) {
							this.qIndex = 0
							this.correctCount = 0
							this.questions = buildInitialEarQuestions()
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
	background: linear-gradient(135deg, #e8f4ff, #fff5fa);
}
.quiz-hint {
	font-size: 28rpx;
	font-weight: 700;
	color: #4a6a9a;
}
.quiz-play-btn {
	margin-top: 16rpx;
	display: inline-flex;
	align-items: center;
	padding: 18rpx 36rpx;
	border-radius: 999rpx;
	background: #6eb5ff;
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
.letter-grid {
	display: flex;
	flex-wrap: wrap;
}
.letter-grid-item {
	width: calc(50% - 8rpx);
	box-sizing: border-box;
	margin: 0 8rpx 10rpx 0;
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
