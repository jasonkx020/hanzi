<template>
	<meng-sub-page
		:title="lessonTitle || '小测验'"
		subtitle="听音认字 · 看字选音"
		:full-height="true"
		:padded="false"
		:overlap-body="false"
	>
		<view v-if="phase === 'quiz'" class="run-shell">
			<view class="top-bar">
				<image class="top-logo" src="/static/mengmeng/logo-icon.png" mode="aspectFit" />
				<view class="top-meta">
					<text class="top-progress">小测 {{ qIndex + 1 }}/{{ totalQ }}</text>
					<text class="top-lesson">{{ lessonTitle }}</text>
				</view>
				<view
					v-if="qType === 'hear_pick'"
					class="top-hear"
					@click="onHearAgain"
				>
					<text class="top-hear-icon">🔊</text>
					<text class="top-hear-txt">再听</text>
				</view>
				<view v-else class="top-hear top-hear--muted">
					<text class="top-hear-txt">看字</text>
				</view>
			</view>

			<view class="chip-row">
				<text class="chip">{{ isWrongReview ? `易错 ${charCount} 字` : `本站 ${charCount} 字` }}</text>
				<text class="chip chip--accent">{{ totalQ }} 题</text>
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
						:id="`quiz-dot-${i}`"
						:key="i"
						class="dot"
						:class="dotClass(i)"
					/>
				</view>
			</scroll-view>

			<view class="quiz-card">
				<text class="q-type-label">{{ qTypeLabel }}</text>

				<view v-if="qType === 'hear_pick'" class="hear-prompt">
					<view class="hear-ring" @click="onHearAgain">
						<text class="hear-ring-icon">🔊</text>
					</view>
					<text class="hear-hint">听一听，选出听到的字</text>
				</view>

				<view v-else class="see-char-prompt">
					<text class="see-char">{{ targetHanzi }}</text>
					<text class="see-hint">选出这个字的读音</text>
				</view>

				<view
					v-if="qType === 'hear_pick'"
					class="opts opts-hear"
					:class="optionColClass"
				>
					<view
						v-for="(c, i) in options"
						:key="`h-${qIndex}-${i}-${c}`"
						class="opt-cell-wrap"
					>
						<view
							class="opt-square"
							:class="hanziSquareClass(c)"
							@click="onPickHanzi(c)"
						>
							<text class="opt-char">{{ c }}</text>
						</view>
						<text
							v-if="hanziOptionMark(c)"
							class="opt-mark"
							:class="'opt-mark--' + hanziOptionMark(c)"
						>{{ hanziOptionMark(c) === 'ok' ? '✓' : '✗' }}</text>
						<view v-else class="opt-mark-slot" />
					</view>
				</view>

				<view v-else class="opts opts-py">
					<view
						class="quiz-py-wrap"
						:class="{ 'quiz-py-wrap--reading': pyHighlightCol >= 0 }"
					>
						<pinyin-four-lines-row
							class="quiz-py-pflr"
							:syllables="pyOptionsForPflr"
							size="tone"
							sheet-bd="#e53935"
							:interactive="!optDisabled"
							:highlight-column-index="pyHighlightCol"
							@cell-click="onPickPinyinCell"
						/>
					</view>
					<view class="opts-py-marks">
						<view
							v-for="(py, i) in pyOptions"
							:key="`pm-${qIndex}-${i}-${py}`"
							class="opt-py-mark-col"
						>
							<text
								v-if="pyOptionMark(py, i)"
								class="opt-mark"
								:class="'opt-mark--' + pyOptionMark(py, i)"
							>{{ pyOptionMark(py, i) === 'ok' ? '✓' : '✗' }}</text>
							<view v-else class="opt-mark-slot" />
						</view>
					</view>
				</view>

				<text
					v-if="feedbackText && (qType !== 'hear_pick' || !hanziReveal)"
					class="feedback-line"
					:class="qType === 'hear_pick' ? 'feedback-line--hint' : ''"
				>{{ feedbackText }}</text>
			</view>
		</view>

		<view v-else class="done-shell">
			<image class="done-logo" src="/static/mengmeng/logo-icon.png" mode="aspectFit" />
			<text class="done-emoji">{{ quizJustPassed ? '🎉' : '💪' }}</text>
			<text class="done-title">{{ isWrongReview ? '易错复习完成' : '小测完成' }}</text>
			<text class="done-score">答对 {{ score }} / {{ totalQ }} 题</text>
			<text v-if="isWrongReview" class="done-cover">
				本轮测了 {{ charCount }} 个易错字
				<template v-if="clearedCount > 0"> · 已移出 {{ clearedCount }} 个</template>
			</text>
			<text v-else class="done-cover">本站 {{ charCount }} 个生字均已测到</text>
			<template v-if="isWrongReview">
				<text v-if="clearedCount > 0" class="pass-line">测对的字已从易错本移除，继续加油！</text>
				<text v-else class="pass-line pass-line--muted">还没有移出易错字，再练一遍吧</text>
			</template>
			<template v-else>
				<text v-if="quizJustPassed" class="pass-line">满分通关，已解锁下一关进度</text>
				<text v-else class="pass-line pass-line--muted">
					达标：需全部答对（{{ passNeed }} 题），再练一次吧
				</text>
			</template>
			<text class="done-msg">{{ doneEncourage }}</text>
			<view class="done-actions">
				<button
					v-if="!quizJustPassed || (isWrongReview && clearedCount < charCount)"
					class="back-btn back-btn--ghost"
					type="default"
					@click="restartQuiz"
				>
					再测一遍
				</button>
				<button class="back-btn" type="primary" @click="goBackLesson">
					{{ isWrongReview ? '回易错本' : '回字卡' }}
				</button>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { takeLessonQuizTransfer } from '@/utils/lesson-mode-session.js'
import { addCharWrongCount, clearCharWrongCount } from '@/utils/user-progress-storage.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { buildStoredLessonKey, recordLessonQuizAttempt } from '@/utils/user-lesson-progress-storage.js'
import { playLessonTargetReading } from '@/utils/lesson-mode-play-target.js'
import {
	playOpusForDisplayPinyin,
	stopLocalPinyinAudio
} from '@/utils/play-pinyin-local-audio.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import {
	orderedUniqueRows,
	buildLessonQuizPlan,
	buildWrongOftenQuizPlan,
	buildHanziOptions,
	buildPinyinOptions,
	calcQuizPassNeed,
	firstHanzi,
	normDisplayPinyin
} from '@/utils/lesson-quiz-plan.js'
import {
	MENG_VOICE,
	playMengmengVoice,
	stopMengmengVoice
} from '@/utils/mengmeng-voice.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'

function filterValidPlan(plan, pool) {
	return (plan || []).filter((item) => {
		if (item.type === 'see_py') {
			return buildPinyinOptions(item.target, pool, spellDisplayString).length >= 3
		}
		return true
	})
}

export default {
	components: { MengSubPage, PinyinFourLinesRow },
	data() {
		return {
			phase: 'quiz',
			lessonTitle: '小测验',
			rjLessonIdx: null,
			pool: [],
			charCount: 0,
			plan: [],
			qIndex: 0,
			qType: 'hear_pick',
			options: [],
			pyOptions: [],
			attempt: 1,
			score: 0,
			totalQ: 0,
			targetHanzi: '',
			targetPinyin: '',
			optDisabled: false,
			quizJustPassed: false,
			passNeed: 0,
			feedbackText: '',
			/** 听音选字：已揭晓对错标记 */
			hanziReveal: false,
			revealCorrect: false,
			/** 听音选字：当前点中的候选字 */
			pickedHanzi: '',
			/** 看字选音：当前点中的拼音列下标 */
			pickedPyIndex: -1,
			/** 每题结果：correct | wrong */
			questionResults: {},
			autoHearTimer: null,
			dotScrollId: '',
			/** 题目代数：换题递增，作废过期异步回调 */
			questionGen: 0,
			/** 答题锁：防止连点/听音未结束时重复进入 */
			pickBusy: false,
			/** 推进锁：防止 completeQuestion 并发导致跳题、重复加分 */
			advanceBusy: false,
			/** 易错复习模式 */
			reviewMode: '',
			/** 易错目标字（组卷用，干扰项在 pool） */
			targetRows: [],
			/** 本轮已从易错本清除的字 */
			clearedHanziMap: Object.create(null),
			clearedCount: 0
		}
	},
	computed: {
		isWrongReview() {
			return this.reviewMode === 'wrong_often'
		},
		optionColClass() {
			return this.options.length >= 3 ? 'opts-3' : 'opts-2'
		},
		qTypeLabel() {
			return this.qType === 'see_py' ? '看字选音' : '听音选字'
		},
		doneEncourage() {
			if (this.isWrongReview) {
				if (this.clearedCount > 0 && this.clearedCount >= this.charCount) {
					return '易错本清空啦，你真棒！'
				}
				if (this.clearedCount > 0) return '部分易错字已移出，剩下的再练练就更稳。'
				return '没关系，回易错本看看颜色深的字，优先攻克它们。'
			}
			if (!this.totalQ) return '继续加油！'
			const r = this.score / this.totalQ
			if (r >= 1) return '全对，太棒了！'
			if (r >= 0.8) return '很不错，再认几遍会更稳哦。'
			if (r >= 0.6) return '进步很大，多听多读就会更熟。'
			return '没关系，回字卡多练几遍再来小测也很好。'
		},
		/** 看字选音：三个选项各占四线三格一列，同一行展示 */
		pyOptionsForPflr() {
			return (this.pyOptions || []).map((py) => {
				const raw = String(py || '').trim().replace(/\s+/g, ' ')
				if (!raw) return '—'
				const tokens = splitPinyinDisplayTokens(raw)
				return tokens.length ? tokens[0] : raw
			})
		},
		pyHighlightCol() {
			if (!this.pyOptions.length) return -1
			if (this.revealCorrect) {
				const correct = normDisplayPinyin(this.targetPinyin, this.targetHanzi)
				const i = this.pyOptions.findIndex((py) => py === correct)
				return i >= 0 ? i : -1
			}
			return this.pickedPyIndex >= 0 ? this.pickedPyIndex : -1
		}
	},
	onUnload() {
		this.clearAutoHear()
		stopLocalPinyinAudio()
		stopMengmengVoice()
	},
	onHide() {
		stopLocalPinyinAudio()
		stopMengmengVoice()
	},
	onLoad() {
		const payload = takeLessonQuizTransfer()
		if (!payload || !Array.isArray(payload.rows) || !payload.rows.length) {
			uni.showToast({ title: '题目数据已失效，请重新进入', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1600)
			return
		}
		const reviewMode = String(payload.reviewMode || '').trim()
		this.reviewMode = reviewMode === 'wrong_often' ? 'wrong_often' : ''

		const title = String(payload.lessonTitle || '').trim()
		if (title) {
			this.lessonTitle = title
			const nav = title.length > 14 ? `${title.slice(0, 13)}…` : title
			uni.setNavigationBarTitle({
				title: this.isWrongReview ? nav : `${nav} · 小测`
			})
		} else if (this.isWrongReview) {
			this.lessonTitle = '易错字小测'
			uni.setNavigationBarTitle({ title: '易错字小测' })
		} else {
			this.lessonTitle = '本站生字'
			uni.setNavigationBarTitle({ title: '小测验' })
		}
		const rj = payload.rjLessonIdx
		if (rj != null && rj !== '') {
			const n = Number(rj)
			this.rjLessonIdx = Number.isFinite(n) && n >= 0 ? n : null
		} else {
			this.rjLessonIdx = null
		}

		const targetRows = orderedUniqueRows(payload.rows)
		const distractorRows = orderedUniqueRows(
			Array.isArray(payload.distractorRows) && payload.distractorRows.length
				? payload.distractorRows
				: payload.rows
		)

		if (this.isWrongReview) {
			const optionPool = orderedUniqueRows([...distractorRows, ...targetRows])
			if (!targetRows.length) {
				uni.showToast({ title: '暂无易错字可测', icon: 'none' })
				setTimeout(() => uni.navigateBack(), 1600)
				return
			}
			if (optionPool.length < 2) {
				uni.showToast({ title: '再积累几个字再来测吧', icon: 'none' })
				setTimeout(() => uni.navigateBack(), 1800)
				return
			}
			this.targetRows = targetRows
			this.pool = optionPool
			this.charCount = targetRows.length
			this.clearedHanziMap = Object.create(null)
			this.clearedCount = 0
			this.bootstrapQuiz()
			return
		}

		const pool = targetRows
		if (pool.length < 2) {
			uni.showToast({ title: '本站至少需要 2 个不同生字才能小测', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1800)
			return
		}
		this.targetRows = pool
		this.pool = pool
		this.charCount = pool.length
		this.bootstrapQuiz()
	},
	methods: {
		bootstrapQuiz() {
			this.clearAutoHear()
			stopLocalPinyinAudio()
			stopMengmengVoice()
			let plan = []
			if (this.isWrongReview) {
				const remain = (this.targetRows || []).filter((r) => {
					const h = firstHanzi(r.hanzi)
					return h && !this.clearedHanziMap[h]
				})
				if (!remain.length) {
					this.phase = 'done'
					this.quizJustPassed = true
					this.totalQ = 0
					this.score = 0
					return
				}
				const built = buildWrongOftenQuizPlan(remain, this.pool)
				plan = filterValidPlan(built.plan, built.optionPool.length ? built.optionPool : this.pool)
				if (built.optionPool.length) this.pool = built.optionPool
				this.charCount = remain.length
			} else {
				plan = filterValidPlan(buildLessonQuizPlan(this.pool), this.pool)
			}
			if (!plan.length) {
				uni.showToast({ title: '无法生成题目', icon: 'none' })
				setTimeout(() => uni.navigateBack(), 1600)
				return
			}
			this.plan = plan
			this.totalQ = plan.length
			this.passNeed = calcQuizPassNeed(this.totalQ)
			this.qIndex = 0
			this.score = 0
			this.questionResults = {}
			this.quizJustPassed = false
			this.phase = 'quiz'
			this.questionGen = 0
			this.pickBusy = false
			this.advanceBusy = false
			if (!this.isWrongReview) {
				this.clearedHanziMap = Object.create(null)
				this.clearedCount = 0
			}
			this.loadQuestion(0)
		},
		restartQuiz() {
			this.bootstrapQuiz()
		},
		applyWrongReviewResult(correct, hanzi) {
			if (!this.isWrongReview) return
			const h = firstHanzi(hanzi)
			if (!h) return
			const dims = this.curriculumDims()
			if (correct) {
				if (!this.clearedHanziMap[h]) {
					clearCharWrongCount(h, dims)
					this.clearedHanziMap = { ...this.clearedHanziMap, [h]: 1 }
					this.clearedCount = Object.keys(this.clearedHanziMap).length
				}
			} else {
				addCharWrongCount(h, 1, dims)
			}
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
		async playQuizAnswerVoice(correct) {
			/* 先清队列，避免上一段卡死导致对错提示永远播不出来 */
			try {
				stopMengmengVoice()
			} catch (_) {}
			const id = correct ? MENG_VOICE.DAILY_QUIZ_CORRECT : MENG_VOICE.DAILY_QUIZ_WRONG
			try {
				await Promise.race([
					playMengmengVoice(id, { minGapMs: 0, allowRepeat: true }),
					new Promise((resolve) => setTimeout(resolve, 2800))
				])
			} catch (_) {}
		},
		async completeQuestion(correct, gen) {
			if (this.phase !== 'quiz') return
			if (this.advanceBusy) return
			const qi = this.qIndex
			const myGen = gen != null ? gen : this.questionGen
			if (myGen !== this.questionGen) return
			this.advanceBusy = true
			this.optDisabled = true
			this.pickBusy = true
			try {
				try {
					stopLocalPinyinAudio()
				} catch (_) {}
				/* 略等一拍，避免刚停拼音读音时新 InnerAudio 抢不到通道 */
				await new Promise((r) => setTimeout(r, 80))
				if (myGen !== this.questionGen || this.phase !== 'quiz') return
				await this.playQuizAnswerVoice(!!correct)
				if (this.phase !== 'quiz') return
				if (myGen !== this.questionGen || this.qIndex !== qi) return
				this.advanceQuestion(!!correct)
			} finally {
				this.advanceBusy = false
			}
		},
		scheduleAutoHear() {
			this.clearAutoHear()
			if (this.phase !== 'quiz' || this.qType !== 'hear_pick' || !this.targetHanzi) return
			this.autoHearTimer = setTimeout(() => {
				this.autoHearTimer = null
				this.onHearAgain()
			}, 420)
		},
		dotClass(i) {
			const result = this.questionResults[i]
			if (result === 'correct') return { dot: true, 'dot--correct': true }
			if (result === 'wrong') return { dot: true, 'dot--wrong': true }
			if (i === this.qIndex && this.phase === 'quiz') {
				return { dot: true, 'dot--current': true }
			}
			return { dot: true }
		},
		scrollDotIntoView() {
			const i = this.qIndex
			this.dotScrollId = ''
			this.$nextTick(() => {
				this.dotScrollId = `quiz-dot-${Math.max(0, i - 2)}`
			})
		},
		loadQuestion(idx) {
			const item = this.plan[idx]
			if (!item) {
				this.finalizeQuizSession()
				this.phase = 'done'
				return
			}
			this.questionGen += 1
			this.pickBusy = false
			this.advanceBusy = false
			this.qType = item.type
			this.targetHanzi = item.target.hanzi
			this.targetPinyin =
				item.target.pinyin != null ? String(item.target.pinyin) : ''
			this.attempt = 1
			this.optDisabled = false
			this.feedbackText = ''
			this.hanziReveal = false
			this.revealCorrect = false
			this.pickedHanzi = ''
			this.pickedPyIndex = -1
			this.scrollDotIntoView()

			if (item.type === 'hear_pick') {
				this.options = buildHanziOptions(item.target, this.pool)
				this.pyOptions = []
				this.scheduleAutoHear()
				return
			}
			this.clearAutoHear()
			this.options = []
			this.pyOptions = buildPinyinOptions(
				item.target,
				this.pool,
				spellDisplayString
			)
			if (this.pyOptions.length < 3) {
				/* 无法出题：不计入对错，直接跳过 */
				this.$nextTick(() => {
					if (this.qIndex === idx && this.phase === 'quiz') {
						this.advanceQuestion(null)
					}
				})
				return
			}
		},
		hanziOptionMark(c) {
			const h = firstHanzi(c)
			if (!h) return ''
			if (this.hanziReveal) {
				return h === this.targetHanzi ? 'ok' : 'bad'
			}
			/* 选对：正确答案下打 ✓ */
			if (
				this.pickedHanzi &&
				this.pickedHanzi === this.targetHanzi &&
				h === this.targetHanzi
			) {
				return 'ok'
			}
			/* 第一次选错：仅在点中的错误项下打 ✗ */
			if (
				this.pickedHanzi &&
				h === this.pickedHanzi &&
				h !== this.targetHanzi
			) {
				return 'bad'
			}
			return ''
		},
		hanziSquareClass(c) {
			const m = this.hanziOptionMark(c)
			if (m === 'ok') return 'opt-square--ok'
			if (m === 'bad') return 'opt-square--bad'
			if (firstHanzi(c) === this.pickedHanzi) return 'opt-square--sel'
			return ''
		},
		pyOptionMark(py, index) {
			const correct = normDisplayPinyin(this.targetPinyin, this.targetHanzi)
			const n = normDisplayPinyin(py)
			if (this.revealCorrect) {
				return n && n === correct ? 'ok' : 'bad'
			}
			const i = Number(index)
			if (!Number.isFinite(i) || i !== this.pickedPyIndex || !n || !correct) {
				return ''
			}
			/* 选对打 ✓，选错打 ✗ */
			return n === correct ? 'ok' : 'bad'
		},
		onPickPinyinCell(payload) {
			const i = payload && Number(payload.index)
			if (!Number.isFinite(i) || i < 0 || i >= this.pyOptions.length) return
			this.onPickPinyin(this.pyOptions[i], i)
		},
		async onHearAgain() {
			if (this.phase !== 'quiz' || this.qType !== 'hear_pick' || !this.targetHanzi) return
			if (this.optDisabled || this.advanceBusy) return
			await playLessonTargetReading(this.targetHanzi, this.targetPinyin)
		},
		onPickHanzi(c) {
			if (
				this.phase !== 'quiz' ||
				this.optDisabled ||
				this.hanziReveal ||
				this.pickBusy ||
				this.advanceBusy ||
				this.qType !== 'hear_pick'
			) {
				return
			}
			const pick = firstHanzi(c)
			if (!pick) return
			const gen = this.questionGen
			this.pickedHanzi = pick
			if (pick === this.targetHanzi) {
				this.optDisabled = true
				this.pickBusy = true
				this.feedbackText = '答对了！'
				this.completeQuestion(true, gen)
				return
			}
			if (this.attempt === 1) {
				this.attempt = 2
				this.feedbackText = '再想一想，可以再听一遍'
				this.pickBusy = true
				this.playQuizAnswerVoice(false).finally(() => {
					if (gen === this.questionGen && this.phase === 'quiz') {
						this.pickBusy = false
					}
				})
				return
			}
			this.revealHanziMarksAfterWrong(gen)
		},
		revealHanziMarksAfterWrong(gen) {
			this.hanziReveal = true
			this.optDisabled = true
			this.pickBusy = true
			this.feedbackText = ''
			if (!this.isWrongReview) {
				addCharWrongCount(this.targetHanzi, 1, this.curriculumDims())
			}
			this.completeQuestion(false, gen != null ? gen : this.questionGen)
		},
		async onPickPinyin(py, pickIndex) {
			if (
				this.phase !== 'quiz' ||
				this.optDisabled ||
				this.pickBusy ||
				this.advanceBusy ||
				this.qType !== 'see_py'
			) {
				return
			}
			const gen = this.questionGen
			this.pickBusy = true
			if (Number.isFinite(pickIndex) && pickIndex >= 0) {
				this.pickedPyIndex = pickIndex
			}
			const pyStr = String(py || '').trim()
			try {
				if (pyStr) {
					await playOpusForDisplayPinyin(pyStr, {
						isCancelled: () => gen !== this.questionGen
					})
				}
			} catch (_) {}
			if (gen !== this.questionGen || this.phase !== 'quiz') return

			const correct = normDisplayPinyin(this.targetPinyin, this.targetHanzi)
			const pickNorm = normDisplayPinyin(pyStr)
			if (pickNorm && correct && pickNorm === correct) {
				this.feedbackText = '读音对了！'
				this.optDisabled = true
				await this.completeQuestion(true, gen)
				return
			}
			if (this.attempt === 1) {
				this.attempt = 2
				this.feedbackText = '再想想这个字的读音'
				await this.playQuizAnswerVoice(false)
				if (gen !== this.questionGen || this.phase !== 'quiz') return
				this.pickBusy = false
				return
			}
			this.markWrongAndReveal(gen)
		},
		markWrongAndReveal(gen) {
			if (!this.isWrongReview) {
				addCharWrongCount(this.targetHanzi, 1, this.curriculumDims())
			}
			this.optDisabled = true
			this.pickBusy = true
			if (this.qType === 'see_py') {
				this.revealCorrect = true
				const py = normDisplayPinyin(this.targetPinyin, this.targetHanzi)
				this.feedbackText = `正确读音：${py || this.targetPinyin}`
				this.completeQuestion(false, gen != null ? gen : this.questionGen)
			}
		},
		advanceQuestion(correct) {
			const qi = this.qIndex
			if (typeof correct === 'boolean' && qi >= 0 && qi < this.totalQ) {
				const prev = this.questionResults[qi]
				/* 同一题只记一次，避免并发重复加分 */
				if (prev !== 'correct' && prev !== 'wrong') {
					this.questionResults = {
						...this.questionResults,
						[qi]: correct ? 'correct' : 'wrong'
					}
					if (correct) this.score++
					if (this.isWrongReview) {
						this.applyWrongReviewResult(correct, this.targetHanzi)
					}
				}
			}
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
			const passed = this.isWrongReview
				? this.clearedCount > 0 && this.clearedCount >= this.charCount
				: totalQ > 0 && score >= need
			this.quizJustPassed = passed
			if (passed) {
				playMengmengVoice(MENG_VOICE.LESSON_QUIZ_PASS, { debounceMs: 400 }).catch(() => {})
			}
			/* 易错复习不写课次通关进度 */
			if (this.isWrongReview) return
			const lessonKey = buildStoredLessonKey(this.rjLessonIdx, this.lessonTitle)
			const d = this.curriculumDims()
			recordLessonQuizAttempt({
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
			stopLocalPinyinAudio()
			stopMengmengVoice()
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
	border: 1rpx solid rgba(255, 160, 190, 0.45);
	box-shadow: 0 6rpx 20rpx rgba(255, 140, 170, 0.1);
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
	color: #c44d6a;
	line-height: 1.2;
}

.top-lesson {
	display: block;
	font-size: 22rpx;
	color: #9a7a86;
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
	background: #ff9ec4;
}

.top-hear:active {
	opacity: 0.9;
}

.top-hear--muted {
	background: #efe0e8;
}

.top-hear-icon {
	font-size: 28rpx;
	line-height: 1;
}

.top-hear-txt {
	font-size: 20rpx;
	color: #a83258;
	font-weight: 700;
}

.top-hear--muted .top-hear-txt {
	color: #8a6a78;
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
	color: #8a6a78;
	background: rgba(255, 255, 255, 0.75);
	border-radius: 999rpx;
	border: 1rpx solid rgba(255, 160, 190, 0.35);
}

.chip--accent {
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
	background: rgba(255, 180, 200, 0.35);
	flex-shrink: 0;
}

.dot--current {
	width: 18rpx;
	height: 18rpx;
	background: #e91e63;
	box-shadow: 0 0 0 4rpx rgba(233, 30, 99, 0.2);
}

.dot--correct {
	background: #43a047;
	box-shadow: 0 0 0 2rpx rgba(67, 160, 71, 0.35);
}

.dot--wrong {
	background: #e53935;
	box-shadow: 0 0 0 2rpx rgba(229, 57, 53, 0.35);
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
		0 12rpx 40rpx rgba(255, 150, 180, 0.12),
		0 8rpx 24rpx var(--meng-shadow, rgba(44, 36, 25, 0.05));
	box-sizing: border-box;
}

.q-type-label {
	display: block;
	text-align: center;
	font-size: 24rpx;
	font-weight: 700;
	color: #c44d6a;
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
	background: #ffe0ec;
	border: 3rpx solid rgba(255, 120, 160, 0.45);
	box-shadow: 0 8rpx 24rpx rgba(255, 120, 160, 0.2);
}

.hear-ring:active {
	transform: scale(0.97);
}

.hear-ring-icon {
	font-size: 52rpx;
	line-height: 1;
}

.hear-hint {
	margin-top: 16rpx;
	font-size: 26rpx;
	color: #8a6a78;
	font-weight: 600;
}

.see-char-prompt {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 28rpx;
}

.see-char {
	font-size: 120rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
	line-height: 1.1;
}

.see-hint {
	margin-top: 12rpx;
	font-size: 26rpx;
	color: #8a6a78;
	font-weight: 600;
}

.opts {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	gap: 16rpx;
	flex: 1;
	align-content: flex-start;
}

.opts-hear {
	align-items: flex-start;
	padding-top: 8rpx;
}

.opts-hear.opts-2 {
	gap: 28rpx;
}

.opts-hear.opts-2 .opt-square {
	width: 200rpx;
	height: 200rpx;
}

.opts-hear.opts-2 .opt-char {
	font-size: 108rpx;
}

.opt-cell-wrap {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex-shrink: 0;
}

.opt-square {
	width: 176rpx;
	height: 176rpx;
	border-radius: 8rpx;
	border: 3rpx solid #d4a8b8;
	background: #fff;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 14rpx rgba(255, 140, 170, 0.1);
}

.opt-square:active {
	opacity: 0.92;
}

.opt-square--ok {
	border-color: #66bb6a;
	background: #fff;
	box-shadow: 0 4rpx 16rpx rgba(102, 187, 106, 0.2);
}

.opt-square--bad {
	border-color: #e57373;
	background: #fff;
	box-shadow: 0 4rpx 16rpx rgba(229, 115, 115, 0.15);
}

.opt-square--sel {
	border-color: #c44d6a;
	background: #fff5f8;
	box-shadow: 0 0 0 4rpx rgba(196, 77, 106, 0.22);
	animation: quiz-opt-pick-flash 0.45s ease forwards;
}

@keyframes quiz-opt-pick-flash {
	0% {
		background-color: #ffd4e8;
	}
	100% {
		background-color: #fff5f8;
	}
}

.opt-mark-slot {
	width: 1rpx;
	height: 44rpx;
	margin-top: 10rpx;
}

.opt-mark {
	display: block;
	margin-top: 10rpx;
	height: 44rpx;
	line-height: 44rpx;
	font-size: 40rpx;
	font-weight: 800;
	text-align: center;
}

.opt-mark--ok {
	color: #43a047;
}

.opt-mark--bad {
	color: #e53935;
}

.opts-py {
	flex-direction: column;
	align-items: stretch;
	padding: 8rpx 4rpx 0;
}

/* 与拼音页「音调」一致：连读列 scale(1.16)，带调韵母 1.12em */
.quiz-py-wrap {
	width: 100%;
	min-width: 0;
}

.quiz-py-pflr {
	width: 100%;
	min-width: 0;
}

/* 拼音红色 + 四线谱蓝色，常规字重 */
.quiz-py-pflr ::v-deep .pflr-glyph {
	color: #e53935;
	font-weight: normal;
	font-synthesis: none;
}

.quiz-py-pflr ::v-deep .pflr-line-top {
	border-top-color: #42a5f5;
}

.quiz-py-pflr ::v-deep .pflr-line-dash {
	border-top-color: rgba(66, 165, 245, 0.78);
}

.quiz-py-pflr ::v-deep .pflr-line-base {
	border-top-color: #1e88e5;
}

.quiz-py-pflr ::v-deep .pflr-line-bottom {
	border-bottom-color: #42a5f5;
}

.quiz-py-pflr ::v-deep .pflr-cell:not(:last-child) {
	border-right-color: rgba(66, 165, 245, 0.4);
}

.quiz-py-pflr ::v-deep .pflr-cell {
	overflow: visible;
}

.quiz-py-pflr ::v-deep .pflr-cell--reading {
	z-index: 4;
}

.quiz-py-pflr ::v-deep .pflr-cell--reading .pflr-glyph {
	color: #c62828;
}

.quiz-py-wrap--reading ::v-deep .pflr--reading-glow .pflr-sheet {
	box-shadow: 0 0 0 3rpx rgba(255, 120, 150, 0.35);
}

.opts-py-marks {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	width: 100%;
	margin-top: 10rpx;
}

.opt-py-mark-col {
	flex: 1 1 0;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.opt-char {
	font-size: 96rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
	line-height: 1;
}

.feedback-line {
	flex-shrink: 0;
	display: block;
	margin-top: 20rpx;
	text-align: center;
	font-size: 26rpx;
	color: #c44d6a;
	font-weight: 600;
	line-height: 1.4;
	min-height: 36rpx;
}

.feedback-line--hint {
	color: #8a6a78;
	font-weight: 500;
}

.done-shell {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 24rpx;
	box-sizing: border-box;
}

.done-logo {
	width: 88rpx;
	height: 88rpx;
	margin-bottom: 8rpx;
}

.done-emoji {
	font-size: 64rpx;
	margin-bottom: 8rpx;
}

.done-title {
	font-size: 36rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
	margin-bottom: 12rpx;
}

.done-score {
	font-size: 30rpx;
	color: #c44d6a;
	font-weight: 700;
	margin-bottom: 8rpx;
}

.done-cover {
	font-size: 24rpx;
	color: #8a6a78;
	margin-bottom: 16rpx;
}

.pass-line {
	display: block;
	font-size: 26rpx;
	color: #2e7d32;
	font-weight: 600;
	text-align: center;
	margin-bottom: 12rpx;
	padding: 0 20rpx;
}

.pass-line--muted {
	color: #8a6a78;
	font-weight: 500;
}

.done-msg {
	font-size: 26rpx;
	color: #9a7a86;
	text-align: center;
	line-height: 1.5;
	margin-bottom: 28rpx;
	padding: 0 24rpx;
}

.done-actions {
	width: 100%;
	max-width: 480rpx;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.back-btn {
	width: 100%;
	border-radius: 18rpx;
	font-size: 28rpx;
	background: #f06292;
	color: #fff;
	border: none;
}

.back-btn--ghost {
	background: #fff !important;
	color: #c44d6a !important;
	border: 2rpx solid rgba(255, 140, 170, 0.55) !important;
}
</style>
