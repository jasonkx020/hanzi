<template>
	<meng-sub-page title="四声词语" subtitle="同一个音，意思不一样" avatar-pose="book" :overlap-body="true">
		<view class="words-page">
			<view class="ear-progress">
				<text class="ear-progress-text">第 {{ qIndex + 1 }} / {{ questions.length }} 题</text>
				<text class="ear-progress-score">已对 {{ correctCount }} 题</text>
			</view>

			<view v-if="comicSet" class="words-comic">
				<pinyin-lab-cell
					v-if="comicSet"
					class="words-comic-title-cell"
					:symbol="comicSet.title"
					category-tab="韵母"
					size="grid"
					:interactive="false"
				/>
				<view class="words-comic-row">
					<view
						v-for="it in comicSet.items"
						:key="it.tone"
						class="words-comic-cell"
						@click="playItem(it)"
					>
						<text class="words-comic-emoji">{{ it.emoji }}</text>
						<text class="words-comic-hanzi">{{ it.hanzi }}</text>
						<text class="words-comic-hint">{{ it.hint }}</text>
					</view>
				</view>
				<text class="words-comic-foot">点卡片可听读音</text>
			</view>

			<view class="ear-play-zone">
				<text class="ear-hint">👂 听的是哪一个？</text>
				<view class="ear-play-btn" @click="playCurrent">
					<text class="ear-play-emoji">🔊</text>
					<text class="ear-play-label">{{ playing ? '播放中…' : '再听一遍' }}</text>
				</view>
			</view>

			<view class="words-options">
				<view
					v-for="(opt, i) in currentOptions"
					:key="i"
					class="words-opt"
					:class="{ 'words-opt--picked': pickedIndex === i }"
					@click="onPick(i, opt)"
				>
					<text class="words-opt-emoji">{{ opt.emoji }}</text>
					<text class="words-opt-hanzi">{{ opt.hanzi }}</text>
					<text class="words-opt-hint">{{ opt.hint }}</text>
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
import { WORDS_QUIZ_PASS } from '@/utils/pinyin-tone-lab/constants.js'
import { buildWordsQuizQuestions } from '@/utils/pinyin-tone-lab/quiz.js'
import { TONE_WORD_COMIC_SETS } from '@/utils/pinyin-tone-lab/words-data.js'
import {
	awardLevelStar,
	saveToneLabProgress,
	loadToneLabProgress
} from '@/utils/pinyin-tone-lab/progress.js'
import { applyToneToSyllableStem } from '@/utils/play-pinyin-local-audio.js'
import {
	getLocalPinyinAudioPath,
	playPinyinLocalAudio
} from '@/utils/play-pinyin-local-audio.js'
import { playLabPinyinAudio, cancelPinyinPlay } from '@/utils/pinyin-lab-play.js'

export default {
	components: { MengSubPage, PinyinLabCell },
	data() {
		return {
			questions: buildWordsQuizQuestions(),
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
		comicSet() {
			const id = this.currentQ?.setId
			return TONE_WORD_COMIC_SETS.find((s) => s.id === id) || null
		},
		feedbackText() {
			if (this.feedback === 'ok') return '认对啦！'
			if (this.feedback === 'bad') return '再听听，看漫画卡片'
			return ''
		}
	},
	onLoad() {
		this.$nextTick(() => this.playCurrent())
	},
	onHide() {
		cancelPinyinPlay()
	},
	onUnload() {
		cancelPinyinPlay()
	},
	methods: {
		async playStem(bare, tone) {
			const stem = applyToneToSyllableStem(bare, tone)
			if (!stem) return
			await playLabPinyinAudio(async ({ isCancelled }) => {
				if (isCancelled()) return false
				try {
					await playPinyinLocalAudio(getLocalPinyinAudioPath(stem), { timeoutMs: 3200 })
					return !isCancelled()
				} catch (_) {
					return false
				}
			})
		},
		playItem(it) {
			if (!this.comicSet || !it) return
			this.playStem(this.comicSet.bare, it.tone)
		},
		async playCurrent() {
			const q = this.currentQ
			if (!q) return
			this.playing = true
			try {
				await this.playStem(q.bare, q.tone)
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
			await this.playStem(this.currentQ.bare, opt.tone)
			await new Promise((r) => setTimeout(r, ok ? 650 : 1000))
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
			const pass = this.correctCount >= WORDS_QUIZ_PASS
			const p = loadToneLabProgress()
			saveToneLabProgress({
				wordsBest: Math.max(Number(p.wordsBest) || 0, this.correctCount)
			})
			if (pass) {
				awardLevelStar(5, this.correctCount >= 6 ? 3 : 2)
				uni.showModal({
					title: '过关啦',
					content: '同一个音，不同声调，意思不一样！',
					showCancel: false,
					success: () => uni.navigateBack()
				})
			} else {
				uni.showModal({
					title: '再试一次',
					content: `对了 ${this.correctCount} 题，需要 ${WORDS_QUIZ_PASS} 题过关`,
					confirmText: '再来',
					cancelText: '返回',
					success: (res) => {
						if (res.confirm) {
							this.qIndex = 0
							this.correctCount = 0
							this.questions = buildWordsQuizQuestions()
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
.words-page {
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

.words-comic {
	padding: 16rpx;
	margin-bottom: 16rpx;
	border-radius: 24rpx;
	background: linear-gradient(135deg, #fff8f0, #fff);
	border: 3rpx solid var(--meng-border-warm);
}

.words-comic-title-cell {
	display: block;
	margin: 0 auto 12rpx;
	max-width: 420rpx;
}

.words-comic-row {
	display: flex;
	flex-direction: row;
}

.words-comic-cell {
	flex: 1;
	padding: 12rpx 8rpx;
	border-radius: 18rpx;
	background: #fff;
	border: 2rpx solid #e8dfd0;
	text-align: center;
}

.words-comic-emoji {
	font-size: 32rpx;
	display: block;
}

.words-comic-hanzi {
	display: block;
	margin-top: 4rpx;
	font-size: 36rpx;
	font-weight: 800;
	color: #2c2419;
}

.words-comic-hint {
	display: block;
	margin-top: 4rpx;
	font-size: 20rpx;
	color: #6d5e52;
	line-height: 1.2;
}

.words-comic-foot {
	display: block;
	margin-top: 10rpx;
	text-align: center;
	font-size: 22rpx;
	color: #9a9088;
}

.ear-play-zone {
	text-align: center;
	margin-bottom: 16rpx;
	padding: 18rpx;
	border-radius: 24rpx;
	background: linear-gradient(135deg, #fff5e8, #ffe8f4);
}

.ear-hint {
	font-size: 28rpx;
	font-weight: 700;
	color: #8b4518;
}

.ear-play-btn {
	margin-top: 12rpx;
	display: inline-flex;
	flex-direction: row;
	align-items: center;
	padding: 16rpx 32rpx;
	border-radius: 999rpx;
	background: var(--meng-accent-solid, #ff8aab);
}

.ear-play-emoji {
	font-size: 34rpx;
}

.ear-play-label {
	font-size: 28rpx;
	font-weight: 800;
	color: #fff;
}

.words-options {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}

.words-opt {
	width: calc(50% - 6rpx);
	box-sizing: border-box;
	padding: 16rpx 12rpx;
	border-radius: 20rpx;
	background: #fff;
	border: 4rpx solid var(--meng-border-warm);
	text-align: center;
}

.words-opt--picked {
	border-color: #ff8aab;
	background: #fff8fc;
}

.words-opt-emoji {
	font-size: 40rpx;
	display: block;
}

.words-opt-hanzi {
	display: block;
	margin-top: 6rpx;
	font-size: 40rpx;
	font-weight: 800;
	color: #2c2419;
}

.words-opt-hint {
	display: block;
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #6d5e52;
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
