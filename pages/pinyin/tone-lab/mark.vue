<!--
  @file mark.vue
  @layer L1 表现层
  @description 路由页面源文件：mark.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<meng-sub-page title="标调魔法" subtitle="调号要标在韵母上" avatar-pose="happy" :overlap-body="true">
		<view class="mark-page">
			<scroll-view scroll-x class="mark-rules-scroll" :show-scrollbar="false">
				<view class="mark-rules-row">
					<view v-for="card in ruleCards" :key="card.key" class="mark-rule-card">
						<text class="mark-rule-emoji">{{ card.emoji }}</text>
						<text class="mark-rule-title">{{ card.title }}</text>
						<text class="mark-rule-desc">{{ card.desc }}</text>
					</view>
				</view>
			</scroll-view>

			<view class="ear-progress">
				<text class="ear-progress-text">第 {{ qIndex + 1 }} / {{ questions.length }} 题</text>
				<text class="ear-progress-score">已对 {{ correctCount }} 题</text>
			</view>

			<view v-if="currentQ" class="mark-target">
				<tone-contour-card :tone="currentQ.tone" :compact="true" :show-label="true" />
				<pinyin-lab-cell
					class="mark-syllable-cell"
					:symbol="currentQ.bare"
					category-tab="韵母"
					size="grid"
					:interactive="false"
				/>
				<text class="mark-bare-hint">没有声调的拼音（四线格书写）</text>
				<text class="mark-question">第 {{ toneLabel }}，调号标在哪个字母上？</text>
			</view>

			<view class="ear-play-zone">
				<view class="ear-play-btn" @click="playCurrent">
					<text class="ear-play-emoji">🔊</text>
					<text class="ear-play-label">{{ playing ? '播放中…' : '听这个声调' }}</text>
				</view>
			</view>

			<view class="mark-letter-grid">
				<pinyin-lab-cell
					v-for="(opt, i) in currentOptions"
					:key="i"
					class="mark-letter-item"
					:symbol="opt.letter"
					category-tab="韵母"
					size="compact"
					:picked="pickedIndex === i"
					block
					@click="onPick(i, opt)"
				/>
			</view>

			<text v-if="currentQ && showHint" class="mark-tip">{{ currentQ.ruleHint }}</text>

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
import { TONE_META, MARK_QUIZ_PASS, MARK_QUIZ_TOTAL } from '@/utils/pinyin-tone-lab/constants.js'
import {
	TONE_MARK_RULE_CARDS,
	buildMarkQuizQuestions
} from '@/utils/pinyin-tone-lab/tone-mark-rules.js'
import {
	awardLevelStar,
	saveToneLabProgress,
	loadToneLabProgress
} from '@/utils/pinyin-tone-lab/progress.js'
import { getLocalPinyinAudioPath, playPinyinLocalAudio } from '@/utils/play-pinyin-local-audio.js'
import { playLabPinyinAudio, cancelPinyinPlay } from '@/utils/pinyin-lab-play.js'

export default {
	components: { MengSubPage, PinyinLabCell, ToneContourCard },
	data() {
		return {
			ruleCards: TONE_MARK_RULE_CARDS,
			questions: buildMarkQuizQuestions(MARK_QUIZ_TOTAL),
			qIndex: 0,
			correctCount: 0,
			pickedIndex: -1,
			picked: false,
			playing: false,
			feedback: '',
			busy: false,
			showHint: false
		}
	},
	computed: {
		currentQ() {
			return this.questions[this.qIndex] || null
		},
		currentOptions() {
			return this.currentQ?.options || []
		},
		toneLabel() {
			const t = this.currentQ?.tone
			return TONE_META.find((m) => m.tone === t)?.label || ''
		},
		feedbackText() {
			if (this.feedback === 'ok') return '标对啦！'
			if (this.feedback === 'bad') return '看看上面口诀，再试'
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
			this.picked = ok
			if (!ok) this.showHint = true
			if (ok) this.correctCount++
			if (ok) await this.playCurrent()
			await new Promise((r) => setTimeout(r, ok ? 750 : 1100))
			this.feedback = ''
			this.pickedIndex = -1
			this.picked = false
			if (this.qIndex >= this.questions.length - 1) {
				this.finishQuiz()
				this.busy = false
				return
			}
			this.qIndex++
			this.showHint = false
			this.busy = false
			this.$nextTick(() => this.playCurrent())
		},
		finishQuiz() {
			const pass = this.correctCount >= MARK_QUIZ_PASS
			const p = loadToneLabProgress()
			saveToneLabProgress({
				markBest: Math.max(Number(p.markBest) || 0, this.correctCount)
			})
			if (pass) {
				awardLevelStar(4, this.correctCount >= 7 ? 3 : this.correctCount >= 6 ? 2 : 1)
				uni.showModal({
					title: '过关啦',
					content: '你会标调啦！可以去「四声词语」',
					showCancel: false,
					success: () => uni.navigateBack()
				})
			} else {
				uni.showModal({
					title: '再试一次',
					content: `对了 ${this.correctCount} 题，需要 ${MARK_QUIZ_PASS} 题过关`,
					confirmText: '再来',
					cancelText: '返回',
					success: (res) => {
						if (res.confirm) {
							this.qIndex = 0
							this.correctCount = 0
							this.showHint = false
							this.questions = buildMarkQuizQuestions(MARK_QUIZ_TOTAL)
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
.mark-page {
	padding: 8rpx 4rpx 40rpx;
}

.mark-rules-scroll {
	width: 100%;
	margin-bottom: 16rpx;
	white-space: nowrap;
}

.mark-rules-row {
	display: inline-flex;
	flex-direction: row;
	padding: 4rpx 4rpx 8rpx;
}

.mark-rule-card {
	width: 280rpx;
	padding: 16rpx 18rpx;
	border-radius: 20rpx;
	background: #fff;
	border: 3rpx solid var(--meng-border-warm);
	vertical-align: top;
	white-space: normal;
}

.mark-rule-emoji {
	font-size: 32rpx;
	display: block;
}

.mark-rule-title {
	display: block;
	margin-top: 6rpx;
	font-size: 26rpx;
	font-weight: 800;
	color: #2c2419;
}

.mark-rule-desc {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: #6d5e52;
	line-height: 1.35;
}

.ear-progress {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	margin-bottom: 12rpx;
}

.ear-progress-text,
.ear-progress-score {
	font-size: 26rpx;
	font-weight: 700;
	color: #6d5e52;
}

.mark-target {
	text-align: center;
	padding: 16rpx 20rpx 20rpx;
	border-radius: 24rpx;
	background: #fff;
	border: 3rpx solid var(--meng-border-warm);
	margin-bottom: 12rpx;
}

.mark-syllable-cell {
	margin: 12rpx auto;
	max-width: 360rpx;
}

.mark-bare-hint {
	display: block;
	font-size: 24rpx;
	color: #9a9088;
}

.mark-question {
	display: block;
	margin-top: 10rpx;
	font-size: 30rpx;
	font-weight: 800;
	color: #2c2419;
}

.ear-play-zone {
	text-align: center;
	margin-bottom: 16rpx;
}

.ear-play-btn {
	display: inline-flex;
	flex-direction: row;
	align-items: center;
	padding: 14rpx 32rpx;
	border-radius: 999rpx;
	background: var(--meng-accent-solid, #ff8aab);
}

.ear-play-emoji {
	font-size: 32rpx;
}

.ear-play-label {
	font-size: 28rpx;
	font-weight: 800;
	color: #fff;
}

.mark-letter-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
}

.mark-letter-item {
	min-width: 120rpx;
	margin: 0 10rpx 10rpx 0;
}

.mark-tip {
	display: block;
	margin-top: 14rpx;
	padding: 12rpx 16rpx;
	border-radius: 14rpx;
	background: #fff8e8;
	font-size: 24rpx;
	color: #8b4518;
	text-align: center;
}

.ear-feedback {
	margin-top: 16rpx;
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
