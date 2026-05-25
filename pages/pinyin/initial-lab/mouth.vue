<template>
	<meng-sub-page title="口型朋友" subtitle="看口型，听声音，选声母" avatar-pose="happy" :overlap-body="true">
		<view class="quiz-page">
			<view class="quiz-progress">
				<text>第 {{ qIndex + 1 }} / {{ questions.length }} 题</text>
				<text>已对 {{ correctCount }} 题</text>
			</view>
			<initial-mouth-card
				v-if="currentQ?.section"
				:section="currentQ.section"
				:active="true"
				:bg-color="mouthColors.bg"
				:border-color="mouthColors.bd"
			/>
			<view class="quiz-play-zone">
				<view class="quiz-play-btn" @click="playCurrent">
					<text>🔊</text>
					<text class="quiz-play-label">{{ playing ? '播放中…' : '听这个声母' }}</text>
				</view>
			</view>
			<text class="quiz-question">口型像上面这样，是哪个声母？</text>
			<view class="letter-grid">
				<view
					v-for="(opt, i) in currentOptions"
					:key="i"
					class="letter-btn font-pinyin"
					:class="{ 'letter-btn--picked': pickedIndex === i }"
					@click="onPick(i, opt)"
				>{{ opt.symbol }}</view>
			</view>
			<view v-if="feedback" class="quiz-feedback" :class="'quiz-feedback--' + feedback">
				<text>{{ feedback === 'ok' ? '口型对啦！' : '再看看口型提示' }}</text>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import InitialMouthCard from '@/components/initial-mouth-card.vue'
import { INITIAL_MOUTH_QUIZ_PASS } from '@/utils/pinyin-initial-lab/constants.js'
import { buildInitialMouthQuestions } from '@/utils/pinyin-initial-lab/quiz.js'
import { getPinyinSymbolCategory } from '@/utils/pinyin-pep-category.js'
import {
	awardInitialLevelStar,
	saveInitialLabProgress,
	loadInitialLabProgress
} from '@/utils/pinyin-initial-lab/progress.js'
import {
	getLocalPinyinAudioPath,
	playPinyinLocalAudio,
	stopLocalPinyinAudio
} from '@/utils/play-pinyin-local-audio.js'

export default {
	components: { MengSubPage, InitialMouthCard },
	data() {
		return {
			questions: buildInitialMouthQuestions(),
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
		mouthColors() {
			const sym = this.currentQ?.symbol || 'b'
			const cat = getPinyinSymbolCategory(sym, '声母')
			return { bg: cat.bg, bd: cat.bd }
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
			const pass = this.correctCount >= INITIAL_MOUTH_QUIZ_PASS
			const p = loadInitialLabProgress()
			saveInitialLabProgress({ mouthBest: Math.max(Number(p.mouthBest) || 0, this.correctCount) })
			if (pass) {
				awardInitialLevelStar(2, this.correctCount >= 7 ? 3 : 2)
				uni.showModal({
					title: '过关啦',
					content: '口型记住啦！去「同组小能手」',
					showCancel: false,
					success: () => uni.navigateBack()
				})
			} else {
				uni.showModal({
					title: '再试一次',
					content: `对了 ${this.correctCount} 题，需要 ${INITIAL_MOUTH_QUIZ_PASS} 题过关`,
					confirmText: '再来',
					cancelText: '返回',
					success: (res) => {
						if (res.confirm) {
							this.qIndex = 0
							this.correctCount = 0
							this.questions = buildInitialMouthQuestions()
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
	margin-bottom: 12rpx;
	font-size: 26rpx;
	font-weight: 700;
	color: #6d5e52;
}
.quiz-play-zone {
	text-align: center;
	margin: 16rpx 0;
}
.quiz-play-btn {
	display: inline-flex;
	align-items: center;
	gap: 12rpx;
	padding: 16rpx 32rpx;
	border-radius: 999rpx;
	background: #6eb5ff;
}
.quiz-play-label {
	font-size: 28rpx;
	font-weight: 800;
	color: #fff;
}
.quiz-question {
	display: block;
	text-align: center;
	font-size: 30rpx;
	font-weight: 800;
	margin-bottom: 16rpx;
}
.letter-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}
.letter-btn {
	width: calc(50% - 8rpx);
	box-sizing: border-box;
	min-height: 96rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 48rpx;
	font-weight: 800;
	border-radius: 22rpx;
	background: #fff;
	border: 4rpx solid var(--meng-border-warm);
}
.letter-btn--picked {
	border-color: #6eb5ff;
	background: #f0f8ff;
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
