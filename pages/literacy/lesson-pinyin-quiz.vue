<!--
  @file lesson-pinyin-quiz.vue
  @layer L1 表现层
  @description 本课拼音听音选字母小测（含带调读音）
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<meng-sub-page
		:title="lessonTitle || '拼音小测'"
		subtitle="听音选拼音 · 含带调"
		:full-height="true"
		:padded="false"
		:overlap-body="false"
	>
		<view v-if="phase === 'quiz'" class="run-shell">
			<view class="top-bar">
				<image class="top-logo" src="/static/mengmeng/logo-icon.png" mode="aspectFit" />
				<view class="top-meta">
					<text class="top-progress">拼音小测 {{ qIndex + 1 }}/{{ totalQ }}</text>
					<text class="top-lesson">{{ lessonTitle }}</text>
				</view>
				<view class="top-hear" @click="onHearAgain">
					<text class="top-hear-icon">🔊</text>
					<text class="top-hear-txt">再听</text>
				</view>
			</view>

			<view class="chip-row">
				<text class="chip">本课 {{ symbolCount }} 项</text>
				<text v-if="priorMixHint" class="chip">含复习 {{ priorMixHint }}</text>
				<text class="chip chip--accent">{{ totalQ }} 题</text>
				<text v-if="currentToned" class="chip chip--tone">带调</text>
			</view>

			<scroll-view
				v-if="totalQ > 1"
				class="dots-scroll"
				scroll-x
				:show-scrollbar="false"
				:scroll-into-view="dotScrollId"
				scroll-with-animation
			>
				<view class="dots-row">
					<view
						v-for="(_, i) in totalQ"
						:id="`py-quiz-dot-${i}`"
						:key="i"
						class="dot"
						:class="{
							'dot--done': i < qIndex,
							'dot--current': i === qIndex,
							'dot--wrong': wrongAt[i]
						}"
					/>
				</view>
			</scroll-view>

			<view class="quiz-card">
				<text class="q-type-label">{{ currentToned ? '听音选带调拼音' : '听音选拼音' }}</text>

				<view class="hear-prompt">
					<view class="hear-ring" @click="onHearAgain">
						<text class="hear-ring-icon">🔊</text>
					</view>
					<text class="hear-hint">听一听，选出听到的拼音</text>
				</view>

				<view class="opts">
					<view
						v-for="(opt, i) in options"
						:key="`o-${qIndex}-${i}-${opt}`"
						class="opt-wrap"
					>
						<view
							class="opt-card"
							:class="optCardClass(opt)"
							@click="onPick(opt)"
						>
							<view class="opt-pflr-box">
								<pinyin-four-lines-row
									class="opt-pflr"
									:syllables="[opt]"
									size="grid"
									font-class="font-pinyin-step"
									:auto-wrap="false"
								/>
							</view>
						</view>
						<text
							v-if="optMark(opt)"
							class="opt-mark"
							:class="'opt-mark--' + optMark(opt)"
						>{{ optMark(opt) === 'ok' ? '✓' : '✗' }}</text>
						<view v-else class="opt-mark-slot" />
					</view>
				</view>

				<text
					v-if="feedbackText && !reveal"
					class="feedback-line feedback-line--hint"
				>{{ feedbackText }}</text>
			</view>
		</view>

		<view v-else class="done-shell">
			<image class="done-logo" src="/static/mengmeng/logo-icon.png" mode="aspectFit" />
			<text class="done-emoji">{{ quizJustPassed ? '🎉' : '💪' }}</text>
			<text class="done-title">拼音小测完成</text>
			<text class="done-score">答对 {{ score }} / {{ totalQ }} 题</text>
			<text v-if="quizJustPassed" class="pass-line">达标啦，已记入本课拼音进度</text>
			<text v-else class="pass-line pass-line--muted">
				达标：答对 ≥ {{ passNeed }} 题（约八成），再练一次吧
			</text>
			<text class="done-msg">{{ doneEncourage }}</text>
			<view class="done-actions">
				<button
					v-if="!quizJustPassed"
					class="back-btn back-btn--ghost"
					type="default"
					@click="restartQuiz"
				>
					再测一遍
				</button>
				<button class="back-btn" type="primary" @click="goBackLesson">回课次</button>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { takeLessonPinyinQuizTransfer } from '@/utils/lesson-mode-session.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import {
	buildStoredLessonKey,
	recordLessonPinyinQuizAttempt
} from '@/utils/user-lesson-progress-storage.js'
import {
	playOpusForDisplayPinyin,
	stopLocalPinyinAudio
} from '@/utils/play-pinyin-local-audio.js'
import pinyinPlayScopeMixin, { PINYIN_PLAY_SCOPES } from '@/mixins/pinyin-play-scope.js'
import { calcQuizPassNeed } from '@/utils/lesson-quiz-plan.js'
import {
	orderedUniqueSymbols,
	buildLessonPinyinQuizPlan,
	buildLessonPinyinQuizOptions,
	buildLessonPinyinQuizOptionPool
} from '@/utils/lesson-pinyin-quiz-plan.js'
import {
	addPinyinWrongCount,
	getPinyinWrongWeightMap
} from '@/utils/user-pinyin-wrong-storage.js'
import { MENG_VOICE, playMengmengVoice } from '@/utils/mengmeng-voice.js'

export default {
	mixins: [pinyinPlayScopeMixin],
	pinyinPlayScope: PINYIN_PLAY_SCOPES.LESSON_PINYIN_QUIZ,
	components: { MengSubPage, PinyinFourLinesRow },
	data() {
		return {
			phase: 'quiz',
			lessonTitle: '拼音小测',
			rjLessonIdx: null,
			baseSymbols: [],
			priorSymbols: [],
			symbolCount: 0,
			priorMixCount: 0,
			optionPool: [],
			plan: [],
			qIndex: 0,
			options: [],
			target: '',
			currentToned: false,
			attempt: 1,
			score: 0,
			totalQ: 0,
			optDisabled: false,
			quizJustPassed: false,
			passNeed: 0,
			feedbackText: '',
			reveal: false,
			wrongAt: {},
			autoHearTimer: null,
			advanceTimer: null,
			dotScrollId: ''
		}
	},
	computed: {
		priorMixHint() {
			const n = Number(this.priorMixCount) || 0
			return n > 0 ? String(n) : ''
		},
		doneEncourage() {
			if (!this.totalQ) return '继续加油！'
			const r = this.score / this.totalQ
			if (r >= 1) return '全对，拼音小达人！'
			if (r >= 0.8) return '很不错，声调再练练会更稳。'
			if (r >= 0.6) return '进步很大，多听几遍就熟了。'
			return '没关系，回本课字母点读几遍再来也很好。'
		}
	},
	onUnload() {
		this.clearAutoHear()
		this.clearAdvanceTimer()
		stopLocalPinyinAudio()
	},
	onLoad() {
		const payload = takeLessonPinyinQuizTransfer()
		if (!payload || !Array.isArray(payload.symbols) || !payload.symbols.length) {
			uni.showToast({ title: '题目数据已失效，请从课次重新进入', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1600)
			return
		}
		const title = String(payload.lessonTitle || '').trim()
		if (title) {
			this.lessonTitle = title
			const nav = title.length > 14 ? `${title.slice(0, 13)}…` : title
			uni.setNavigationBarTitle({ title: `${nav} · 拼音小测` })
		} else {
			this.lessonTitle = '本课拼音'
			uni.setNavigationBarTitle({ title: '拼音小测' })
		}
		const rj = payload.rjLessonIdx
		if (rj != null && rj !== '') {
			const n = Number(rj)
			this.rjLessonIdx = Number.isFinite(n) && n >= 0 ? n : null
		} else {
			this.rjLessonIdx = null
		}
		const base = orderedUniqueSymbols(payload.symbols)
		if (base.length < 2) {
			uni.showToast({ title: '本课至少需要 2 个拼音才能小测', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1800)
			return
		}
		this.baseSymbols = base
		this.priorSymbols = orderedUniqueSymbols(payload.priorSymbols || [])
		this.symbolCount = base.length
		this.bootstrapQuiz()
	},
	methods: {
		bootstrapQuiz() {
			this.clearAutoHear()
			this.clearAdvanceTimer()
			stopLocalPinyinAudio()
			const wrongWeightMap = getPinyinWrongWeightMap(this.curriculumDims())
			const plan = buildLessonPinyinQuizPlan(this.baseSymbols, {
				priorSymbols: this.priorSymbols,
				wrongWeightMap
			})
			if (!plan.length) {
				uni.showToast({ title: '无法生成题目', icon: 'none' })
				setTimeout(() => uni.navigateBack(), 1600)
				return
			}
			this.plan = plan
			this.priorMixCount = plan.filter((item) => item && item.fromPrior).length
			this.optionPool = buildLessonPinyinQuizOptionPool(
				this.baseSymbols,
				plan,
				this.priorSymbols
			)
			this.totalQ = plan.length
			this.passNeed = calcQuizPassNeed(this.totalQ)
			this.qIndex = 0
			this.score = 0
			this.wrongAt = {}
			this.quizJustPassed = false
			this.phase = 'quiz'
			this.loadQuestion(0)
		},
		restartQuiz() {
			this.bootstrapQuiz()
		},
		curriculumDims() {
			const p = getCurriculumPrefs()
			const g = Number(p.grade)
			return {
				textbook_version_id: p.textbook_version_id,
				grade: Number.isFinite(g) && g >= 0 ? g : 1,
				semester: p.semester === '下' ? '下' : '上'
			}
		},
		clearAutoHear() {
			if (this.autoHearTimer != null) {
				clearTimeout(this.autoHearTimer)
				this.autoHearTimer = null
			}
		},
		clearAdvanceTimer() {
			if (this.advanceTimer != null) {
				clearTimeout(this.advanceTimer)
				this.advanceTimer = null
			}
		},
		scheduleAutoHear() {
			this.clearAutoHear()
			if (this.phase !== 'quiz' || !this.target) return
			this.autoHearTimer = setTimeout(() => {
				this.autoHearTimer = null
				this.onHearAgain()
			}, 420)
		},
		scrollDotIntoView() {
			const i = this.qIndex
			this.dotScrollId = ''
			this.$nextTick(() => {
				this.dotScrollId = `py-quiz-dot-${Math.max(0, i - 2)}`
			})
		},
		loadQuestion(idx) {
			this._pyPlay.cancel()
			stopLocalPinyinAudio()
			const item = this.plan[idx]
			if (!item) {
				this.finalizeQuizSession()
				this.phase = 'done'
				return
			}
			this.target = String(item.target || '').trim()
			this.currentToned = !!item.toned
			this.attempt = 1
			this.optDisabled = false
			this.feedbackText = ''
			this.reveal = false
			this.options = buildLessonPinyinQuizOptions(this.optionPool, this.target, 3)
			this.scrollDotIntoView()
			this.scheduleAutoHear()
		},
		optMark(opt) {
			if (!this.reveal) return ''
			return String(opt) === this.target ? 'ok' : 'bad'
		},
		optCardClass(opt) {
			const m = this.optMark(opt)
			if (m === 'ok') return 'opt-card--ok'
			if (m === 'bad') return 'opt-card--bad'
			return ''
		},
		async onHearAgain() {
			if (this.phase !== 'quiz' || !this.target) return
			await this._pyPlay.run(
				({ isCancelled }) => playOpusForDisplayPinyin(this.target, { isCancelled }),
				{ when: () => this.phase !== 'quiz' }
			)
		},
		onPick(opt) {
			if (this.phase !== 'quiz' || this.optDisabled || this.reveal) return
			const pick = String(opt || '').trim()
			if (pick === this.target) {
				this.optDisabled = true
				this.advanceQuestion(true)
				return
			}
			if (this.attempt === 1) {
				this.attempt = 2
				this.feedbackText = '再想一想，可以再听一遍'
				return
			}
			this.reveal = true
			this.optDisabled = true
			this.feedbackText = ''
			this.wrongAt = { ...this.wrongAt, [this.qIndex]: true }
			try {
				addPinyinWrongCount(this.target, 1, this.curriculumDims())
			} catch (e) {
				console.warn('[lesson-pinyin-quiz] addPinyinWrongCount', e)
			}
			this.scheduleAdvance(false, 3000)
		},
		scheduleAdvance(correct, delay = 480) {
			this.clearAdvanceTimer()
			this.advanceTimer = setTimeout(() => {
				this.advanceTimer = null
				this.advanceQuestion(correct)
			}, delay)
		},
		advanceQuestion(correct) {
			if (correct) this.score++
			this.qIndex++
			if (this.qIndex >= this.totalQ) {
				this.clearAutoHear()
				this.finalizeQuizSession()
				this.phase = 'done'
				return
			}
			this.loadQuestion(this.qIndex)
		},
		finalizeQuizSession() {
			const totalQ = this.totalQ
			const score = this.score
			const need = calcQuizPassNeed(totalQ)
			this.passNeed = need
			const passed = totalQ > 0 && score >= need
			this.quizJustPassed = passed
			if (passed) {
				playMengmengVoice(MENG_VOICE.LESSON_QUIZ_PASS, { debounceMs: 400 }).catch(() => {})
			}
			const lessonKey = buildStoredLessonKey(this.rjLessonIdx, this.lessonTitle)
			const d = this.curriculumDims()
			recordLessonPinyinQuizAttempt({
				lesson_key: lessonKey,
				textbook_version_id: d.textbook_version_id,
				grade: d.grade,
				semester: d.semester,
				score,
				totalQ,
				passed
			})
		},
		goBackLesson() {
			this.clearAutoHear()
			this.clearAdvanceTimer()
			stopLocalPinyinAudio()
			uni.navigateBack()
		}
	}
}
</script>

<style scoped>
.run-shell {
	width: 100%;
	height: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.done-shell {
	width: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 48rpx 32rpx 40rpx;
}

.top-bar {
	flex-shrink: 0;
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 8rpx 12rpx;
	margin-bottom: 8rpx;
	border-radius: 20rpx;
	background: rgba(255, 255, 255, 0.92);
	border: 1rpx solid rgba(120, 190, 255, 0.45);
	box-shadow: 0 6rpx 20rpx rgba(80, 150, 220, 0.1);
}

.top-logo {
	width: 52rpx;
	height: 52rpx;
	flex-shrink: 0;
	margin-right: 12rpx;
}

.top-meta {
	flex: 1;
	min-width: 0;
}

.top-progress {
	display: block;
	font-size: 28rpx;
	font-weight: 800;
	color: #2a7ab8;
	line-height: 1.2;
}

.top-lesson {
	display: block;
	font-size: 22rpx;
	color: #6a8aa0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: 1.25;
}

.top-hear {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 6rpx 14rpx;
	border-radius: 14rpx;
	background: #7ec8ff;
}

.top-hear:active {
	opacity: 0.9;
}

.top-hear-icon {
	font-size: 28rpx;
	line-height: 1;
}

.top-hear-txt {
	font-size: 20rpx;
	color: #1a5a90;
	font-weight: 700;
}

.chip-row {
	flex-shrink: 0;
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-bottom: 10rpx;
	padding: 0 4rpx;
}

.chip {
	display: inline-flex;
	padding: 6rpx 16rpx;
	font-size: 22rpx;
	font-weight: 600;
	color: #6a8aa0;
	background: rgba(255, 255, 255, 0.75);
	border-radius: 999rpx;
	border: 1rpx solid rgba(120, 190, 255, 0.35);
}

.chip--accent {
	color: #2a7ab8;
	background: #d4eefc;
}

.chip--tone {
	color: #c44d6a;
	background: #ffd4f0;
}

.dots-scroll {
	flex-shrink: 0;
	width: 100%;
	margin-bottom: 12rpx;
	white-space: nowrap;
}

.dots-row {
	display: inline-flex;
	flex-direction: row;
	align-items: center;
	gap: 10rpx;
	padding: 4rpx 8rpx 8rpx;
}

.dot {
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	background: rgba(120, 190, 255, 0.35);
	flex-shrink: 0;
}

.dot--done {
	background: #64b5f6;
}

.dot--current {
	width: 18rpx;
	height: 18rpx;
	background: #1e88e5;
	box-shadow: 0 0 0 4rpx rgba(30, 136, 229, 0.2);
}

.dot--wrong {
	background: #ffab91;
}

.quiz-card {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	padding: 24rpx 20rpx 20rpx;
	border-radius: 28rpx;
	background: rgba(255, 255, 255, 0.9);
	border: 2rpx solid rgba(255, 255, 255, 0.95);
	box-shadow:
		0 12rpx 40rpx rgba(80, 150, 220, 0.12),
		0 8rpx 24rpx var(--meng-shadow, rgba(44, 36, 25, 0.05));
	box-sizing: border-box;
}

.q-type-label {
	display: block;
	text-align: center;
	font-size: 24rpx;
	font-weight: 700;
	color: #2a7ab8;
	margin-bottom: 20rpx;
}

.hear-prompt {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 28rpx;
}

.hear-ring {
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #e3f2fd;
	border: 3rpx solid rgba(30, 136, 229, 0.35);
	box-shadow: 0 8rpx 24rpx rgba(30, 136, 229, 0.15);
}

.hear-ring:active {
	opacity: 0.9;
}

.hear-ring-icon {
	font-size: 52rpx;
}

.hear-hint {
	margin-top: 16rpx;
	font-size: 26rpx;
	color: #6a8aa0;
	font-weight: 600;
}

.opts {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 18rpx;
	width: 100%;
}

.opt-wrap {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	width: 100%;
}

.opt-card {
	width: 100%;
	padding: 12rpx 10rpx;
	box-sizing: border-box;
	border-radius: 18rpx;
	background: rgba(255, 255, 255, 0.95);
	border: 2rpx solid rgba(120, 190, 255, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
}

.opt-card:active {
	opacity: 0.92;
}

.opt-card--ok {
	background: #e8f5e9;
	border-color: #66bb6a;
}

.opt-card--bad {
	background: #fff3e0;
	border-color: #ffab91;
	opacity: 0.85;
}

.opt-pflr-box {
	width: 100%;
	max-width: 420rpx;
	margin: 0 auto;
	padding: 4rpx 0;
	box-sizing: border-box;
}

.opt-pflr {
	width: 100%;
	/* 与课次本课字母同规格 */
	--pfl-cell-h: 144rpx;
}

.opt-mark {
	margin-top: 6rpx;
	font-size: 22rpx;
	font-weight: 800;
	line-height: 1;
}

.opt-mark--ok {
	color: #2e7d32;
}

.opt-mark--bad {
	color: #e65100;
}

.opt-mark-slot {
	height: 28rpx;
}

.feedback-line {
	display: block;
	margin-top: 20rpx;
	text-align: center;
	font-size: 26rpx;
	font-weight: 600;
	color: #2a7ab8;
}

.feedback-line--hint {
	color: #c44d6a;
}

.done-logo {
	width: 96rpx;
	height: 96rpx;
	margin-bottom: 12rpx;
}

.done-emoji {
	font-size: 64rpx;
	line-height: 1.2;
}

.done-title {
	margin-top: 8rpx;
	font-size: 36rpx;
	font-weight: 800;
	color: #2a7ab8;
}

.done-score {
	margin-top: 12rpx;
	font-size: 30rpx;
	font-weight: 700;
	color: #456;
}

.pass-line {
	margin-top: 16rpx;
	font-size: 26rpx;
	font-weight: 700;
	color: #2e7d32;
}

.pass-line--muted {
	color: #8a6a78;
	font-weight: 600;
}

.done-msg {
	margin-top: 12rpx;
	font-size: 26rpx;
	color: #6a8aa0;
	text-align: center;
}

.done-actions {
	margin-top: 36rpx;
	width: 100%;
	max-width: 560rpx;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.back-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	font-size: 30rpx;
	font-weight: 700;
	border-radius: 999rpx;
}

.back-btn--ghost {
	background: #e3f2fd;
	color: #2a7ab8;
}
</style>
