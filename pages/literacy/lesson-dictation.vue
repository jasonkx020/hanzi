<!--
  @file lesson-dictation.vue
  @layer L1 表现层
  @description 路由页面源文件：lesson-dictation.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<meng-sub-page
		:title="lessonTitle || '听写'"
		subtitle="听音按笔顺写一写"
		:full-height="true"
		:padded="false"
		:overlap-body="false"
	>
		<view v-if="phase === 'run'" class="run-shell">
			<view class="top-bar">
				<image class="top-logo" :src="logoSrc" mode="aspectFit" />
				<view class="top-meta">
					<text class="top-progress">第 {{ qIndex + 1 }}/{{ totalQ }} 个字</text>
					<text class="top-lesson">{{ lessonTitle }}</text>
				</view>
				<view class="top-hear" @click="onHearAgain">
					<image class="top-hear-img" :src="labaSrc" mode="aspectFit" @error="onLabaError" />
					<text class="top-hear-txt">再听</text>
				</view>
			</view>

			<view class="progress-track">
				<view class="progress-fill" :style="{ width: progressPct + '%' }" />
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
						:id="`dict-dot-${i}`"
						:key="i"
						class="dot"
						:class="{
							'dot--done': i < qIndex,
							'dot--imperfect': i === qIndex && awaitingRetryChoice,
							'dot--current': i === qIndex && !completed && !awaitingRetryChoice,
							'dot--pending': i > qIndex
						}"
					/>
				</view>
			</scroll-view>

			<view class="hint-card">
				<image class="hint-meng" :src="mengPoseSrc" mode="aspectFit" />
				<view class="hint-body">
					<view class="hint-title-row">
						<text class="hint-mystery">？</text>
						<text v-if="strokeTotal > 0" class="hint-stroke">第 {{ currentStrokeNo }}/{{ strokeTotal }} 笔</text>
						<text v-else class="hint-stroke">听一听，写一写</text>
					</view>
					<view v-if="strokeTotal > 1" class="stroke-pills">
						<view
							v-for="n in strokeTotal"
							:key="n"
							class="stroke-pill"
							:class="{
								'stroke-pill--done': n <= activeStroke || (completed && n <= strokeTotal),
								'stroke-pill--current': !completed && n === currentStrokeNo
							}"
						/>
					</view>
					<text class="hint-sub">{{ promptSubline }}</text>
				</view>
			</view>

			<view class="canvas-area">
				<view class="canvas-shell">
					<canvas
						v-if="canvasReady"
						id="lesson-dictation-canvas"
						canvas-id="lesson-dictation-canvas"
						class="dictation-canvas"
						disable-scroll
						:style="canvasStyle"
						@touchstart="onTouchStart"
						@touchmove="onTouchMove"
						@touchend="onTouchEnd"
						@touchcancel="onTouchCancel"
					/>
					<text v-else class="canvas-fallback">…</text>
					<view
						v-if="canvasReady && !completed && !advancing && showCanvasGuide"
						class="canvas-guide"
					>
						<text class="canvas-guide-icon">👆</text>
						<text class="canvas-guide-txt">按住田字格，按笔顺写，松手自动判断</text>
					</view>
				</view>
			</view>

			<view class="bottom-dock">
				<view
					class="feedback-bubble"
					:class="feedbackType === 'bad' ? 'feedback-bubble--bad' : feedbackType === 'ok' ? 'feedback-bubble--ok' : ''"
				>
					<text v-if="feedbackIcon" class="feedback-icon">{{ feedbackIcon }}</text>
					<text class="feedback-text">{{ feedbackText }}</text>
				</view>
				<view v-if="awaitingRetryChoice" class="choice-row">
					<button class="action-btn action-btn--ghost" size="mini" @click="onChooseRetryPractice">
						重新练习
					</button>
					<button class="action-btn action-btn--primary" size="mini" @click="onChooseSkipToNext">
						先下一个
					</button>
				</view>
				<view v-else class="action-row">
					<button
						class="action-btn action-btn--ghost"
						size="mini"
						:disabled="!canvasReady || advancing || completed"
						@click="resetWriting"
					>
						重写
					</button>
					<button
						class="action-btn action-btn--primary"
						size="mini"
						:disabled="!canvasReady || advancing || (completed && !charPerfect)"
						@click="onManualComplete"
					>
						{{ primaryActionLabel }}
					</button>
				</view>
			</view>
		</view>

		<view v-else class="done-shell" :class="'done-shell--' + doneTier">
			<image class="done-meng" :src="doneMengSrc" mode="aspectFit" />
			<view class="done-stars">
				<text
					v-for="i in 3"
					:key="i"
					class="done-star"
					:class="{ 'done-star--on': i <= doneStarCount }"
				>★</text>
			</view>
			<text class="done-title">{{ doneTitle }}</text>
			<text class="done-score">笔顺全对 {{ score }}/{{ totalQ }} 字</text>
			<text class="done-msg">{{ doneEncourage }}</text>
			<button class="back-btn" type="primary" @click="goBackLesson">回字卡</button>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { takeLessonDictationTransfer } from '@/utils/lesson-mode-session.js'
import { addCharWrongCount, markCharLearned } from '@/utils/user-progress-storage.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import {
	playLessonHintThenTargetReading,
	playLessonReplayThenTargetReading,
	playLessonTargetReadingAfterVoice
} from '@/utils/lesson-mode-audio.js'
import {
	MENG_VOICE,
	getMengmengVoiceCopy,
	playMengmengVoice,
	stopMengmengVoice
} from '@/utils/mengmeng-voice.js'
import {
	MENG_ASSETS,
	buildMengAssetSrcCandidates,
	mengIp,
	resolveMengAssetUrl
} from '@/utils/mengmeng-assets.js'
import drawNative from '@/utils/draw-native.js'
import { getCncharStrokeNameList } from '@/utils/stroke-order-audio.js'

function firstHanzi(text) {
	const s = String(text || '').trim()
	const m = s.match(/[\u4e00-\u9fff]/)
	return m ? m[0] : ''
}

function orderedUniqueRows(rows) {
	const seen = new Set()
	const out = []
	for (const r of rows || []) {
		const h = firstHanzi(r && r.hanzi)
		if (!h || seen.has(h)) continue
		seen.add(h)
		out.push({
			hanzi: h,
			pinyin: r && r.pinyin != null ? String(r.pinyin) : ''
		})
	}
	return out
}

/** 屏上提示与萌萌语音文案对齐 */
const FEEDBACK = {
	idle: '听一听读音，在格子里按笔顺写',
	retryClear: '已清空，再听一遍写',
	/** 单笔写错（过程内），语气柔和、不报「第几笔」 */
	strokeWrong: '笔顺不太对哦，继续加油',
	strokeShort: '笔画再长一点哦，继续加油',
	charPass: (ch) => `全写对了，是「${ch}」！点「下一个」`,
	charFinishWithMistakes: (n) =>
		n > 1 ? `写过 ${n} 处小失误，要不要再练一遍？` : '有过小失误，要不要再练一遍？'
}

export default {
	components: { MengSubPage },
	data() {
		return {
			phase: 'run',
			lessonTitle: '',
			targets: [],
			qIndex: 0,
			score: 0,
			totalQ: 0,
			targetHanzi: '',
			targetPinyin: '',
			autoHearTimer: null,
			advanceTimer: null,
			canvasReady: false,
			canvasLength: 168,
			writer: null,
			mountGen: 0,
			attachTimer: null,
			strokeNames: [],
			strokeTotal: 0,
			activeStroke: 0,
			completed: false,
			/** 本轮是否全程无笔顺/笔画失误 */
			charPerfect: false,
			/** 已写完但过程有误，等待选「重新练习」或「先下一个」 */
			awaitingRetryChoice: false,
			feedbackText: FEEDBACK.idle,
			feedbackType: '',
			/** 当前字本轮书写中的笔顺/笔画错误次数 */
			charStrokeMistakes: 0,
			advancing: false,
			dictationWelcomed: false,
			/** 取消未完成的自动听音 / 切题 */
			hearSeq: 0,
			labaSrcIndex: 0,
			logoSrc: resolveMengAssetUrl(MENG_ASSETS.logoIcon)
		}
	},
	computed: {
		canvasStyle() {
			const px = this.canvasLength + 30
			return { width: px + 'px', height: px + 'px', display: 'block' }
		},
		currentStrokeNo() {
			if (this.completed) return this.strokeTotal
			return Math.min(this.strokeTotal || 1, this.activeStroke + 1)
		},
		progressPct() {
			if (!this.totalQ) return 0
			const base = this.qIndex / this.totalQ
			const bump = this.charPerfect && this.completed ? 1 / this.totalQ : 0
			return Math.min(100, Math.round((base + bump) * 100))
		},
		primaryActionLabel() {
			if (this.charPerfect && this.completed) return '下一个'
			return '写好了'
		},
		dotScrollId() {
			const i = Math.max(0, this.qIndex - 2)
			return `dict-dot-${i}`
		},
		labaSrcCandidates() {
			return buildMengAssetSrcCandidates(MENG_ASSETS.laba)
		},
		labaSrc() {
			const list = this.labaSrcCandidates
			if (list.length && this.labaSrcIndex < list.length) return list[this.labaSrcIndex]
			return resolveMengAssetUrl(MENG_ASSETS.logoIcon)
		},
		mengPoseSrc() {
			if (this.charPerfect && this.completed) return resolveMengAssetUrl(mengIp('happy'))
			if (this.awaitingRetryChoice || this.feedbackType === 'bad') {
				return resolveMengAssetUrl(mengIp('trying'))
			}
			return resolveMengAssetUrl(mengIp('book'))
		},
		feedbackIcon() {
			if (this.feedbackType === 'bad') return '💪'
			if (this.charPerfect && this.completed) return '✓'
			return ''
		},
		promptSubline() {
			if (this.completed) return getMengmengVoiceCopy(MENG_VOICE.DICTATION_CHAR_PASS) || '这个字写对啦'
			if (this.feedbackType === 'bad') return '萌萌陪你再试一次'
			const idle = !this.feedbackType && this.feedbackText === FEEDBACK.idle
			if (idle && this.qIndex > 0) {
				return getMengmengVoiceCopy(MENG_VOICE.DICTATION_CHAR_ENTER) || '听一听，再写一写'
			}
			if (idle && this.qIndex === 0) {
				return getMengmengVoiceCopy(MENG_VOICE.DICTATION_WELCOME) || '听一听，按笔顺写'
			}
			return '点右上角喇叭可以再听'
		},
		showCanvasGuide() {
			return !this.feedbackType && !this.charStrokeMistakes && !this.awaitingRetryChoice
		},
		doneTier() {
			if (!this.totalQ) return 'encourage'
			const r = this.score / this.totalQ
			if (r >= 1) return 'perfect'
			if (r >= 0.6) return 'good'
			return 'encourage'
		},
		doneStarCount() {
			if (this.doneTier === 'perfect') return 3
			if (this.doneTier === 'good') return 2
			return 1
		},
		doneTitle() {
			if (this.doneTier === 'perfect') return '全写对啦'
			if (this.doneTier === 'good') return '听写完成'
			return '完成啦'
		},
		doneMengSrc() {
			if (this.doneTier === 'perfect') {
				return resolveMengAssetUrl(mengIp('happy'))
			}
			if (this.doneTier === 'good') {
				return resolveMengAssetUrl(mengIp('wave'))
			}
			return resolveMengAssetUrl(mengIp('trying'))
		},
		doneEncourage() {
			if (!this.totalQ) return '继续加油！'
			const id =
				this.doneTier === 'perfect'
					? MENG_VOICE.DICTATION_DONE_PERFECT
					: this.doneTier === 'good'
						? MENG_VOICE.DICTATION_DONE_GOOD
						: MENG_VOICE.DICTATION_DONE_ENCOURAGE
			return getMengmengVoiceCopy(id) || '继续加油！'
		}
	},
	onUnload() {
		this.clearAutoHear()
		this.clearAdvanceTimer()
		this.teardownWriter()
		stopLocalPinyinAudio()
		stopMengmengVoice()
	},
	onHide() {
		stopLocalPinyinAudio()
		stopMengmengVoice()
	},
	onLoad() {
		this.calcCanvasSize()
		const payload = takeLessonDictationTransfer()
		if (!payload || !Array.isArray(payload.rows) || !payload.rows.length) {
			uni.showToast({ title: '题目数据已失效，请从课次字卡重新进入', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1600)
			return
		}
		const title = String(payload.lessonTitle || '').trim()
		if (title) {
			this.lessonTitle = title
			const nav = title.length > 14 ? `${title.slice(0, 13)}…` : title
			uni.setNavigationBarTitle({ title: `${nav} · 听一听写` })
		} else {
			this.lessonTitle = '本课生字'
			uni.setNavigationBarTitle({ title: '听一听写' })
		}
		const pool = orderedUniqueRows(payload.rows)
		if (!pool.length) {
			uni.showToast({ title: '本课无生字可听写', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1800)
			return
		}
		this.targets = pool
		this.totalQ = pool.length
		this.qIndex = 0
		this.score = 0
		this.phase = 'run'
		this.loadQuestion(0)
	},
	methods: {
		onLabaError() {
			if (this.labaSrcIndex < this.labaSrcCandidates.length - 1) {
				this.labaSrcIndex += 1
			}
		},
		calcCanvasSize() {
			try {
				const sys = uni.getSystemInfoSync()
				const h = Number(sys.windowHeight) || 667
				const w = Number(sys.windowWidth) || 375
				const reserved = 268
				const avail = h - reserved
				const maxW = w - 40
				const side = Math.min(avail, maxW, 240)
				this.canvasLength = Math.max(132, Math.floor(side - 30))
			} catch (_) {
				this.canvasLength = 168
			}
		},
		clearAutoHear() {
			this.hearSeq++
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
		/** 进入新字：萌萌提示播完后再自动播生字读音 */
		queueIntroHear(idx) {
			this.clearAutoHear()
			const token = this.hearSeq
			let voiceId = null
			let voiceOpts = {}
			if (idx === 0 && !this.dictationWelcomed) {
				this.dictationWelcomed = true
				voiceId = MENG_VOICE.DICTATION_WELCOME
			} else if (idx > 0) {
				voiceId = MENG_VOICE.DICTATION_CHAR_ENTER
				voiceOpts = { debounceMs: 200, minGapMs: 1500 }
			}
			const run = async () => {
				if (token !== this.hearSeq || this.phase !== 'run' || !this.targetHanzi) return
				try {
					await playLessonHintThenTargetReading(
						this.targetHanzi,
						this.targetPinyin,
						voiceId,
						voiceOpts
					)
				} catch (e) {
					console.warn('[lesson-dictation] intro hear', e)
				}
			}
			if (voiceId) {
				run()
				return
			}
			this.autoHearTimer = setTimeout(() => {
				this.autoHearTimer = null
				if (token !== this.hearSeq) return
				run()
			}, 480)
		},
		/** 提示音已单独触发时，仅排队播生字 */
		scheduleTargetReadingAfterVoice() {
			this.clearAutoHear()
			const token = this.hearSeq
			const hanzi = this.targetHanzi
			const py = this.targetPinyin
			const run = async () => {
				if (token !== this.hearSeq || this.phase !== 'run' || !hanzi) return
				try {
					await playLessonTargetReadingAfterVoice(hanzi, py)
				} catch (e) {
					console.warn('[lesson-dictation] after-voice hear', e)
				}
			}
			run()
		},
		playDictVoice(id, opts = {}) {
			stopLocalPinyinAudio()
			return playMengmengVoice(id, opts).catch(() => false)
		},
		/** 听写过程单笔写错：屏上文案 + daily_stroke_wrong 口播 */
		playStrokeWrongHint(reason) {
			this.feedbackType = 'bad'
			this.feedbackText = reason === 'tooShort' ? FEEDBACK.strokeShort : FEEDBACK.strokeWrong
			return this.playDictVoice(MENG_VOICE.DAILY_STROKE_WRONG, { minGapMs: 1400 })
		},
		playDictationDoneVoice() {
			if (!this.totalQ) return
			const id =
				this.doneTier === 'perfect'
					? MENG_VOICE.DICTATION_DONE_PERFECT
					: this.doneTier === 'good'
						? MENG_VOICE.DICTATION_DONE_GOOD
						: MENG_VOICE.DICTATION_DONE_ENCOURAGE
			this.playDictVoice(id, { debounceMs: 320 })
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
		loadQuestion(idx) {
			const t = this.targets[idx]
			if (!t) {
				this.phase = 'done'
				this.playDictationDoneVoice()
				return
			}
			this.clearAdvanceTimer()
			this.advancing = false
			this.targetHanzi = t.hanzi
			this.targetPinyin = t.pinyin != null ? String(t.pinyin) : ''
			this.completed = false
			this.charPerfect = false
			this.awaitingRetryChoice = false
			this.activeStroke = 0
			this.charStrokeMistakes = 0
			this.feedbackType = ''
			this.feedbackText = FEEDBACK.idle
			this.strokeNames = getCncharStrokeNameList(this.targetHanzi)
			this.strokeTotal = this.strokeNames.length || 0
			this.mountTestWriter()
			this.queueIntroHear(idx)
		},
		onHearAgain() {
			if (this.phase !== 'run' || !this.targetHanzi) return
			this.clearAutoHear()
			const hanzi = this.targetHanzi
			const py = this.targetPinyin
			const token = this.hearSeq
			playLessonReplayThenTargetReading(hanzi, py, MENG_VOICE.DAILY_PINYIN_REPLAY).catch((e) => {
				if (token === this.hearSeq) console.warn('[lesson-dictation] hear again', e)
			})
		},
		sharedDrawOpts() {
			return {
				vm: this,
				style: {
					length: this.canvasLength,
					charInsetRatio: 0.12,
					strokeColor: '#2c2419',
					outlineColor: '#d5d5d5',
					currentColor: '#e87a4a',
					drawingColor: '#e87a4a',
					drawingWidth: 5
				},
				line: {
					show: true,
					borderColor: '#ebe3d8',
					centerColor: '#f0e8dc',
					diagonalColor: '#f5efe6'
				},
				watermark: { text: '', alpha: 0 }
			}
		},
		teardownWriter() {
			if (this.attachTimer) {
				clearTimeout(this.attachTimer)
				this.attachTimer = null
			}
			this.mountGen++
			if (this.writer && typeof this.writer.destroy === 'function') {
				this.writer.destroy()
			}
			this.writer = null
			this.canvasReady = false
		},
		scheduleMount(fn) {
			this.teardownWriter()
			this.canvasReady = true
			const token = ++this.mountGen
			const attach = () => {
				this.attachTimer = null
				if (token !== this.mountGen) return
				fn()
			}
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.attachTimer = setTimeout(attach, 48)
				})
			})
		},
		mountTestWriter() {
			const ch = this.targetHanzi
			if (!ch) return
			this.scheduleMount(() => {
				try {
					const vm = this
					this.writer = drawNative(ch, {
						...this.sharedDrawOpts(),
						el: '#lesson-dictation-canvas',
						type: drawNative.TYPE.TEST,
						animation: { autoAnimate: false },
						test: {
							testStrictOrder: true,
							testDirectionWeight: 0.32,
							testScoreThreshold: 26,
							showHintAfterMisses: 2,
							onTestStatus: ({ index, status, data }) => {
								vm.handleTestStatus(index, status, data || {})
							}
						}
					})
					const total = this.writer?.charData?.medians?.length || 0
					if (total) this.strokeTotal = total
					if (typeof this.writer.updateCanvasRect === 'function') {
						this.writer.updateCanvasRect()
					}
				} catch (e) {
					console.warn('[lesson-dictation] mount test', e)
					vm.playDictVoice(MENG_VOICE.DICTATION_UNSUPPORTED)
					uni.showToast({ title: '这个字暂时不能写', icon: 'none' })
					setTimeout(() => vm.advanceQuestion(), 1200)
				}
			})
		},
		handleTestStatus(index, status, data = {}) {
			if (this.phase !== 'run' || this.advancing) return
			const strokeNo = Number(index) + 1
			if (status === 'correct') {
				this.activeStroke = strokeNo
				if (this.feedbackType === 'bad' && !this.awaitingRetryChoice && !this.completed) {
					this.feedbackType = ''
					this.feedbackText = FEEDBACK.idle
				}
				return
			}
			if (status === 'mistake') {
				this.charStrokeMistakes += 1
				this.playStrokeWrongHint(data.reason)
				return
			}
			if (status === 'complete') {
				this.onCharRoundFinished()
			}
		},
		charRoundMistakeCount() {
			const local = Number(this.charStrokeMistakes) || 0
			const fromWriter = Number(this.writer?.testState?.totalMistakes) || 0
			return Math.max(local, fromWriter)
		},
		onCharRoundFinished() {
			if (this.advancing || this.completed || this.awaitingRetryChoice) return
			if (this.charRoundMistakeCount() > 0) {
				this.onCharFinishedWithMistakes()
				return
			}
			this.onCharWriteSuccess()
		},
		/** 笔画都画完，但过程中有过失误：询问是否重练，不记已学 */
		onCharFinishedWithMistakes() {
			if (this.advancing || this.awaitingRetryChoice) return
			const n = this.charRoundMistakeCount()
			this.completed = true
			this.charPerfect = false
			this.awaitingRetryChoice = true
			this.feedbackType = 'bad'
			this.feedbackText = FEEDBACK.charFinishWithMistakes(n)
			this.playDictVoice(MENG_VOICE.DICTATION_CHAR_RETRY, { minGapMs: 1500 })
		},
		recordImperfectChar() {
			try {
				addCharWrongCount(this.targetHanzi, 1, this.curriculumDims())
			} catch (e) {
				console.warn('[lesson-dictation] addCharWrongCount', e)
			}
		},
		onChooseRetryPractice() {
			if (!this.awaitingRetryChoice || this.phase !== 'run') return
			this.awaitingRetryChoice = false
			this.completed = false
			this.charPerfect = false
			this.recordImperfectChar()
			this.resetWritingForRetry()
		},
		onChooseSkipToNext() {
			if (!this.awaitingRetryChoice || this.phase !== 'run') return
			this.awaitingRetryChoice = false
			this.completed = false
			this.charPerfect = false
			this.recordImperfectChar()
			this.advanceQuestion()
		},
		resetWritingForRetry() {
			if (this.phase !== 'run' || this.advancing) return
			this.awaitingRetryChoice = false
			this.charStrokeMistakes = 0
			this.completed = false
			this.charPerfect = false
			this.activeStroke = 0
			this.feedbackType = ''
			this.feedbackText = FEEDBACK.retryClear
			if (this.writer && typeof this.writer.resetStrokeTest === 'function') {
				this.writer.resetStrokeTest()
				this.scheduleTargetReadingAfterVoice()
				return
			}
			this.mountTestWriter()
			this.scheduleTargetReadingAfterVoice()
		},
		onCharWriteSuccess() {
			if (this.advancing || this.completed || this.awaitingRetryChoice) return
			this.completed = true
			this.charPerfect = true
			this.activeStroke = this.strokeTotal
			this.feedbackType = 'ok'
			this.feedbackText = FEEDBACK.charPass(this.targetHanzi)
			this.score++
			try {
				markCharLearned(this.targetHanzi, this.curriculumDims())
			} catch (e) {
				console.warn('[lesson-dictation] markCharLearned', e)
			}
			this.playDictVoice(MENG_VOICE.DICTATION_CHAR_PASS, { minGapMs: 1200 })
		},
		onManualComplete() {
			if (this.phase !== 'run' || this.advancing || this.awaitingRetryChoice) return
			if (this.charPerfect && this.completed) {
				this.advanceQuestion()
				return
			}
			const total = this.strokeTotal || this.writer?.charData?.medians?.length || 0
			const doneStrokes = this.writer?.testState?.activeStroke ?? this.activeStroke
			if (total > 0 && doneStrokes >= total) {
				this.onCharRoundFinished()
				return
			}
			const remaining = Math.max(0, total - doneStrokes)
			this.feedbackType = ''
			this.feedbackText = remaining > 0 ? `还有 ${remaining} 笔哦` : '请按笔顺写完'
		},
		resetWriting() {
			if (this.phase !== 'run' || this.advancing || this.completed) return
			this.resetWritingForRetry()
		},
		advanceQuestion() {
			if (this.advancing) return
			this.advancing = true
			this.clearAutoHear()
			this.clearAdvanceTimer()
			this.teardownWriter()
			this.qIndex++
			if (this.qIndex >= this.totalQ) {
				this.phase = 'done'
				this.advancing = false
				this.playDictationDoneVoice()
				return
			}
			this.advancing = false
			this.loadQuestion(this.qIndex)
		},
		pickCanvasTouch(e) {
			if (!e) return null
			return (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || null
		},
		onTouchStart(e) {
			if (this.completed || this.advancing || this.awaitingRetryChoice) return
			const t = this.pickCanvasTouch(e)
			if (t && this.writer?.handleTouchStart) {
				this.writer.handleTouchStart(t, e.detail)
			}
		},
		onTouchMove(e) {
			if (this.completed || this.advancing || this.awaitingRetryChoice) return
			const t = this.pickCanvasTouch(e)
			if (t && this.writer?.handleTouchMove) {
				this.writer.handleTouchMove(t, e.detail)
			}
		},
		onTouchEnd() {
			if (this.completed || this.advancing || this.awaitingRetryChoice) return
			if (this.writer?.handleTouchEnd) {
				this.writer.handleTouchEnd()
			}
		},
		onTouchCancel() {
			this.onTouchEnd()
		},
		goBackLesson() {
			this.clearAutoHear()
			this.clearAdvanceTimer()
			this.teardownWriter()
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
	padding: 10rpx 14rpx;
	margin-bottom: 8rpx;
	border-radius: 20rpx;
	background: var(--meng-card-solid, #fff);
	border: 1rpx solid var(--meng-border-warm, #e3d9c8);
	box-shadow: 0 4rpx 16rpx var(--meng-shadow, rgba(44, 36, 25, 0.07));
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
	color: var(--meng-chocolate, #5c3d2e);
	line-height: 1.2;
}

.top-lesson {
	display: block;
	font-size: 22rpx;
	color: var(--meng-text-muted, #8a8076);
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
	padding: 8rpx 16rpx;
	border-radius: 16rpx;
	background: var(--meng-tip-bg, #fff4e8);
	border: 1rpx solid var(--meng-chip-active-border, rgba(232, 122, 74, 0.42));
}

.top-hear:active {
	opacity: 0.88;
}

.top-hear-img {
	width: 44rpx;
	height: 44rpx;
}

.top-hear-txt {
	font-size: 20rpx;
	color: var(--meng-tab-active-text, #b84a28);
	font-weight: 700;
	margin-top: 2rpx;
}

.progress-track {
	flex-shrink: 0;
	height: 8rpx;
	border-radius: 8rpx;
	background: rgba(232, 122, 74, 0.15);
	margin-bottom: 8rpx;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	border-radius: 8rpx;
	background: var(--meng-accent-solid, #e87a4a);
	transition: width 0.35s ease;
}

.dots-scroll {
	flex-shrink: 0;
	width: 100%;
	margin-bottom: 8rpx;
	white-space: nowrap;
}

.dots-row {
	display: inline-flex;
	flex-direction: row;
	gap: 10rpx;
	padding: 4rpx 8rpx 8rpx;
}

.dot {
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	background: #e8e0d6;
	flex-shrink: 0;
}

.dot--done {
	background: var(--meng-leaf, #7ec8a0);
}

.dot--current {
	background: var(--meng-accent-solid, #e87a4a);
	transform: scale(1.25);
}

.dot--imperfect {
	background: #ffcc80;
	transform: scale(1.15);
}

.hint-card {
	flex-shrink: 0;
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 12rpx;
	padding: 12rpx 16rpx;
	margin-bottom: 6rpx;
	border-radius: 20rpx;
	background: var(--meng-card, #fffcf8);
	border: 1rpx solid var(--meng-border, #ebe3d8);
}

.hint-meng {
	width: 72rpx;
	height: 72rpx;
	flex-shrink: 0;
}

.hint-body {
	flex: 1;
	min-width: 0;
}

.hint-title-row {
	display: flex;
	flex-direction: row;
	align-items: baseline;
	gap: 12rpx;
}

.hint-mystery {
	font-size: 40rpx;
	font-weight: 800;
	color: var(--meng-sky, #b8dcf0);
	line-height: 1;
}

.hint-stroke {
	font-size: 26rpx;
	color: var(--meng-chocolate, #5c3d2e);
	font-weight: 700;
}

.stroke-pills {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 6rpx;
	margin-top: 8rpx;
}

.stroke-pill {
	width: 20rpx;
	height: 8rpx;
	border-radius: 4rpx;
	background: #e8e0d6;
}

.stroke-pill--done {
	background: var(--meng-leaf, #7ec8a0);
}

.stroke-pill--current {
	background: var(--meng-accent-solid, #e87a4a);
}

.hint-sub {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: var(--meng-text-secondary, #6d5e52);
	line-height: 1.35;
}

.canvas-area {
	flex: 1;
	min-height: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.canvas-shell {
	position: relative;
	padding: 10rpx;
	border-radius: 20rpx;
	background: #fff;
	border: 2rpx solid var(--meng-border-warm, #e3d9c8);
	box-shadow: 0 8rpx 24rpx var(--meng-shadow, rgba(44, 36, 25, 0.08));
}

.dictation-canvas {
	display: block;
	border-radius: 6rpx;
}

.canvas-fallback {
	display: block;
	width: 160rpx;
	height: 160rpx;
	line-height: 160rpx;
	text-align: center;
	font-size: 28rpx;
	color: var(--meng-text-muted, #8a8076);
}

.canvas-guide {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 10rpx 12rpx;
	border-radius: 0 0 14rpx 14rpx;
	background: rgba(255, 252, 248, 0.92);
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 6rpx;
	pointer-events: none;
}

.canvas-guide-icon {
	font-size: 22rpx;
}

.canvas-guide-txt {
	font-size: 20rpx;
	color: var(--meng-tip-text, #7a5f2a);
	line-height: 1.3;
	text-align: center;
}

.bottom-dock {
	flex-shrink: 0;
	padding: 8rpx 0 12rpx;
}

.feedback-bubble {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	justify-content: center;
	gap: 8rpx;
	padding: 12rpx 16rpx;
	margin-bottom: 12rpx;
	border-radius: 16rpx;
	background: var(--meng-banner-soft, #fff6ec);
	border: 1rpx solid var(--meng-border, #ebe3d8);
	min-height: 44rpx;
}

.feedback-bubble--ok {
	background: var(--meng-leaf-soft, #e8f4ec);
	border-color: rgba(126, 200, 160, 0.45);
}

.feedback-bubble--bad {
	background: #fff0e8;
	border-color: rgba(232, 122, 74, 0.35);
}

.feedback-icon {
	font-size: 26rpx;
	line-height: 1.4;
	color: var(--meng-leaf, #7ec8a0);
	font-weight: 800;
}

.feedback-bubble--bad .feedback-icon {
	color: var(--meng-accent-solid, #e87a4a);
}

.feedback-text {
	flex: 1;
	font-size: 24rpx;
	color: var(--meng-text-secondary, #6d5e52);
	line-height: 1.45;
	text-align: center;
}

.feedback-bubble--ok .feedback-text {
	color: #2e6b45;
	font-weight: 600;
}

.feedback-bubble--bad .feedback-text {
	color: #a85a28;
	font-weight: 600;
}

.action-row,
.choice-row {
	display: flex;
	flex-direction: row;
	gap: 12rpx;
}

.action-btn {
	flex: 1;
	margin: 0 !important;
	padding: 0 16rpx !important;
	height: 72rpx !important;
	line-height: 72rpx !important;
	font-size: 28rpx !important;
	border-radius: 18rpx !important;
}

.action-btn--ghost {
	background: #fff !important;
	border: 2rpx solid var(--meng-border-warm, #e3d9c8) !important;
	color: var(--meng-chocolate, #5c3d2e) !important;
}

.action-btn--primary {
	background: var(--meng-accent-solid, #e87a4a) !important;
	color: #fff !important;
	border: none !important;
	font-weight: 700 !important;
}

.done-shell {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 32rpx 24rpx;
	box-sizing: border-box;
}

.done-meng {
	width: 120rpx;
	height: 120rpx;
	margin-bottom: 12rpx;
}

.done-stars {
	display: flex;
	flex-direction: row;
	gap: 8rpx;
	margin-bottom: 16rpx;
}

.done-star {
	font-size: 40rpx;
	color: #e8e0d6;
}

.done-star--on {
	color: #ffb300;
}

.done-shell--perfect .done-title {
	color: var(--meng-tab-active-text, #b84a28);
}

.done-title {
	font-size: 38rpx;
	font-weight: 800;
	color: var(--meng-chocolate, #5c3d2e);
	margin-bottom: 12rpx;
}

.done-score {
	font-size: 30rpx;
	color: var(--meng-text-secondary, #6d5e52);
	font-weight: 700;
	margin-bottom: 12rpx;
}

.done-msg {
	font-size: 26rpx;
	color: var(--meng-text-muted, #8a8076);
	text-align: center;
	line-height: 1.5;
	margin-bottom: 32rpx;
	padding: 0 24rpx;
}

.back-btn {
	width: 62%;
	max-width: 380rpx;
	border-radius: 20rpx;
	font-size: 30rpx;
	font-weight: 700;
	background: var(--meng-accent-solid, #e87a4a);
	border: none;
}
</style>
