<template>
	<meng-sub-page title="发音小贴士" subtitle="看提示，听声音，选韵母" avatar-pose="happy" :overlap-body="true">
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
					<text class="quiz-play-label">{{ playing ? '播放中…' : '听这个韵母' }}</text>
				</view>
			</view>
			<text class="quiz-question">是哪一组里的韵母？</text>
			<view class="symbol-grid">
				<pinyin-lab-cell
					v-for="(opt, i) in currentOptions"
					:key="i"
					class="symbol-grid-item"
					:symbol="opt.symbol"
					category-tab="韵母"
					:picked="pickedIndex === i"
					block
					@click="onPick(i, opt)"
				/>
			</view>
			<view v-if="feedback" class="quiz-feedback" :class="'quiz-feedback--' + feedback">
				<text>{{ feedback === 'ok' ? '选对啦！' : '再看看小贴士' }}</text>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import PinyinLabCell from '@/components/pinyin-lab-cell.vue'
import InitialMouthCard from '@/components/initial-mouth-card.vue'
import { VOWEL_MOUTH_QUIZ_PASS, VOWEL_MOUTH_QUIZ_TOTAL } from '@/utils/pinyin-vowel-lab/constants.js'
import { buildVowelMouthQuestions } from '@/utils/pinyin-vowel-lab/quiz.js'
import { getPinyinSymbolCategory } from '@/utils/pinyin-pep-category.js'
import {
	awardVowelLevelStar,
	saveVowelLabProgress,
	loadVowelLabProgress
} from '@/utils/pinyin-vowel-lab/progress.js'
import { playVowelLabSymbol } from '@/utils/pinyin-vowel-lab/play.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'

export default {
	components: { MengSubPage, InitialMouthCard, PinyinLabCell },
	data() {
		return {
			questions: buildVowelMouthQuestions(VOWEL_MOUTH_QUIZ_TOTAL),
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
			const sym = this.currentQ?.symbol || 'a'
			const cat = getPinyinSymbolCategory(sym, '韵母')
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
				await playVowelLabSymbol(q.play)
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
			const pass = this.correctCount >= VOWEL_MOUTH_QUIZ_PASS
			const p = loadVowelLabProgress()
			saveVowelLabProgress({ mouthBest: Math.max(Number(p.mouthBest) || 0, this.correctCount) })
			if (pass) {
				awardVowelLevelStar(2, this.correctCount >= 7 ? 3 : 2)
				uni.showModal({
					title: '过关啦',
					content: '韵母记住啦！去「同组小能手」',
					showCancel: false,
					success: () => uni.navigateBack()
				})
			} else {
				uni.showModal({
					title: '再试一次',
					content: `对了 ${this.correctCount} 题，需要 ${VOWEL_MOUTH_QUIZ_PASS} 题过关`,
					confirmText: '再来',
					cancelText: '返回',
					success: (res) => {
						if (res.confirm) {
							this.qIndex = 0
							this.correctCount = 0
							this.questions = buildVowelMouthQuestions(VOWEL_MOUTH_QUIZ_TOTAL)
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
	padding: 16rpx 32rpx;
	border-radius: 999rpx;
	background: #c97aff;
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
.symbol-grid {
	display: flex;
	flex-wrap: wrap;
}
.symbol-grid-item {
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
