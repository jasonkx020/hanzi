<template>
	<meng-sub-page title="同组小能手" subtitle="同一组韵母，听音辨认" avatar-pose="happy" :overlap-body="true">
		<view class="quiz-page">
			<view class="quiz-progress">
				<text>第 {{ qIndex + 1 }} / {{ questions.length }} 题</text>
				<text>已对 {{ correctCount }} 题</text>
			</view>
			<view v-if="currentQ?.section" class="group-badge">
				<text class="group-badge-emoji">{{ currentQ.section.emoji }}</text>
				<text class="group-badge-title">{{ currentQ.section.kidTitle }}</text>
				<text class="group-badge-sub">{{ currentQ.section.kidTip }}</text>
			</view>
			<view class="quiz-play-zone">
				<view class="quiz-play-btn" @click="playCurrent">
					<text>🔊</text>
					<text class="quiz-play-label">{{ playing ? '播放中…' : '再听一遍' }}</text>
				</view>
			</view>
			<view class="symbol-grid symbol-grid--group">
				<view
					v-for="(opt, i) in currentOptions"
					:key="i"
					class="symbol-btn font-pinyin"
					:class="{ 'symbol-btn--picked': pickedIndex === i, 'symbol-btn--long': (opt.symbol || '').length > 1 }"
					@click="onPick(i, opt)"
				>{{ opt.symbol }}</view>
			</view>
			<view v-if="feedback" class="quiz-feedback" :class="'quiz-feedback--' + feedback">
				<text>{{ feedback === 'ok' ? '辨对啦！' : '都是好朋友，再听清一点' }}</text>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { VOWEL_GROUP_QUIZ_PASS, VOWEL_GROUP_QUIZ_TOTAL } from '@/utils/pinyin-vowel-lab/constants.js'
import { buildVowelGroupQuestions } from '@/utils/pinyin-vowel-lab/quiz.js'
import {
	awardVowelLevelStar,
	saveVowelLabProgress,
	loadVowelLabProgress
} from '@/utils/pinyin-vowel-lab/progress.js'
import { playVowelLabSymbol } from '@/utils/pinyin-vowel-lab/play.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'

export default {
	components: { MengSubPage },
	data() {
		return {
			questions: buildVowelGroupQuestions(VOWEL_GROUP_QUIZ_TOTAL),
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
			await this.playCurrent()
			await new Promise((r) => setTimeout(r, ok ? 600 : 1000))
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
			const pass = this.correctCount >= VOWEL_GROUP_QUIZ_PASS
			const p = loadVowelLabProgress()
			saveVowelLabProgress({ groupBest: Math.max(Number(p.groupBest) || 0, this.correctCount) })
			if (pass) {
				awardVowelLevelStar(3, this.correctCount >= 6 ? 3 : 2)
				uni.showModal({
					title: '过关啦',
					content: '同组韵母难不倒你！可以去「大闯关」',
					showCancel: false,
					success: () => uni.navigateBack()
				})
			} else {
				uni.showModal({
					title: '再试一次',
					content: `对了 ${this.correctCount} 题，需要 ${VOWEL_GROUP_QUIZ_PASS} 题过关`,
					confirmText: '再来',
					cancelText: '返回',
					success: (res) => {
						if (res.confirm) {
							this.qIndex = 0
							this.correctCount = 0
							this.questions = buildVowelGroupQuestions(VOWEL_GROUP_QUIZ_TOTAL)
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
.group-badge {
	text-align: center;
	padding: 16rpx;
	margin-bottom: 12rpx;
	border-radius: 22rpx;
	background: #fff;
	border: 3rpx solid var(--meng-border-warm);
}
.group-badge-emoji {
	font-size: 40rpx;
}
.group-badge-title {
	display: block;
	margin-top: 6rpx;
	font-size: 30rpx;
	font-weight: 800;
}
.group-badge-sub {
	display: block;
	margin-top: 4rpx;
	font-size: 24rpx;
	color: #6d5e52;
	line-height: 1.35;
}
.quiz-play-zone {
	text-align: center;
	margin-bottom: 16rpx;
}
.quiz-play-btn {
	display: inline-flex;
	align-items: center;
	gap: 12rpx;
	padding: 16rpx 32rpx;
	border-radius: 999rpx;
	background: #c97aff;
}
.quiz-play-label {
	font-size: 28rpx;
	font-weight: 800;
	color: #fff;
}
.symbol-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}
.symbol-grid--group .symbol-btn {
	min-width: calc(50% - 6rpx);
	flex: 1;
}
.symbol-btn {
	box-sizing: border-box;
	min-height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 44rpx;
	font-weight: 800;
	border-radius: 20rpx;
	background: #fff;
	border: 4rpx solid var(--meng-border-warm);
}
.symbol-btn--long {
	font-size: 38rpx;
}
.symbol-btn--picked {
	border-color: #c97aff;
	background: #faf0ff;
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
