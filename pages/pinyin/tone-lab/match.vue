<template>
	<meng-sub-page title="调号朋友" subtitle="形状和带调拼音配一对" avatar-pose="happy" :overlap-body="true">
		<view class="match-page">
			<view class="ear-progress">
				<text class="ear-progress-text">第 {{ qIndex + 1 }} / {{ questions.length }} 题</text>
				<text class="ear-progress-score">已对 {{ correctCount }} 题</text>
			</view>

			<view v-if="currentQ" class="match-target">
				<pinyin-lab-cell
					class="match-bare-cell"
					:symbol="currentQ.bare"
					category-tab="韵母"
					size="md"
					:interactive="false"
				/>
				<text class="match-hint">左边是第几声？右边点对应的拼音</text>
				<tone-contour-card :tone="currentQ.tone" :show-label="true" :show-symbol="false" />
			</view>

			<view v-if="currentQ" class="match-options">
				<view
					v-for="(opt, i) in currentQ.options"
					:key="i"
					class="match-opt"
					:class="{ 'match-opt--picked': pickedIndex === i }"
					@click="onPick(i, opt)"
				>
					<pinyin-lab-cell
						class="match-opt-pflr"
						:symbol="opt.display"
						category-tab="韵母"
						size="grid"
						:picked="pickedIndex === i"
						:interactive="false"
					/>
					<view class="match-opt-play" @click.stop="playStem(opt.display)">
						<text>🔊</text>
					</view>
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
import PinyinLabCell from '@/components/pinyin-lab-cell.vue'
import ToneContourCard from '@/components/tone-contour-card.vue'
import { MATCH_QUIZ_PASS } from '@/utils/pinyin-tone-lab/constants.js'
import { buildMatchQuizQuestions } from '@/utils/pinyin-tone-lab/quiz.js'
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
	components: { MengSubPage, PinyinLabCell, ToneContourCard },
	data() {
		return {
			questions: buildMatchQuizQuestions(),
			qIndex: 0,
			correctCount: 0,
			pickedIndex: -1,
			feedback: '',
			busy: false
		}
	},
	computed: {
		currentQ() {
			return this.questions[this.qIndex] || null
		},
		feedbackText() {
			if (this.feedback === 'ok') return '配对成功！'
			if (this.feedback === 'bad') return '再想想，听一听每一个'
			return ''
		}
	},
	onHide() {
		stopLocalPinyinAudio()
	},
	onUnload() {
		stopLocalPinyinAudio()
	},
	methods: {
		async playStem(stem) {
			if (!stem) return
			stopLocalPinyinAudio()
			try {
				await playPinyinLocalAudio(getLocalPinyinAudioPath(stem), { timeoutMs: 3200 })
			} catch (_) {}
		},
		async onPick(index, opt) {
			if (this.busy || !opt) return
			this.busy = true
			this.pickedIndex = index
			const ok = !!opt.correct
			this.feedback = ok ? 'ok' : 'bad'
			if (ok) this.correctCount++
			await this.playStem(opt.display)
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
		},
		finishQuiz() {
			const pass = this.correctCount >= MATCH_QUIZ_PASS
			const p = loadToneLabProgress()
			saveToneLabProgress({
				matchBest: Math.max(Number(p.matchBest) || 0, this.correctCount)
			})
			if (pass) {
				awardLevelStar(3, this.correctCount >= 6 ? 3 : 2)
				uni.showModal({
					title: '过关啦',
					content: '调号和拼音你是好朋友啦！下一步「标调魔法」',
					showCancel: false,
					success: () => uni.navigateBack()
				})
			} else {
				uni.showModal({
					title: '再试一次',
					content: `对了 ${this.correctCount} 题，需要 ${MATCH_QUIZ_PASS} 题过关`,
					confirmText: '再来',
					cancelText: '返回',
					success: (res) => {
						if (res.confirm) {
							this.qIndex = 0
							this.correctCount = 0
							this.questions = buildMatchQuizQuestions()
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
.match-page {
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

.match-target {
	text-align: center;
	padding: 20rpx;
	border-radius: 24rpx;
	background: #fff;
	border: 3rpx solid var(--meng-border-warm);
	margin-bottom: 20rpx;
}

.match-bare-cell {
	margin: 0 auto 12rpx;
	max-width: 280rpx;
}

.match-hint {
	display: block;
	margin: 12rpx 0 16rpx;
	font-size: 26rpx;
	color: #6d5e52;
}

.match-options {
	display: flex;
	flex-direction: column;
}

.match-opt {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 22rpx 24rpx;
	border-radius: 22rpx;
	background: #fff;
	border: 4rpx solid var(--meng-border-warm);
	min-height: 96rpx;
}

.match-opt--picked {
	border-color: #ff8aab;
	background: #fff8fc;
}

.match-opt-pflr {
	flex: 1;
	min-width: 0;
}

.match-opt-play {
	padding: 12rpx 20rpx;
	font-size: 32rpx;
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
