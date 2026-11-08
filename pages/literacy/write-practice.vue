<!--
  @file write-practice.vue
  @layer L1 表现层
  @description 路由页面源文件：write-practice.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<view v-if="compact" class="write-compact-root">
		<!-- 每日一练内嵌：仅田字格 + 极简辅助 -->
		<view class="write-compact">
			<view class="canvas-shell canvas-shell--compact">
				<canvas
					v-if="canvasReady"
					:id="canvasId"
					:canvas-id="canvasId"
					class="practice-canvas"
					disable-scroll
					:style="canvasStyle"
					@touchstart="onTouchStart"
					@touchmove="onTouchMove"
					@touchend="onTouchEnd"
					@touchcancel="onTouchCancel"
				/>
				<text v-else class="canvas-fallback canvas-fallback--compact">{{
					mountPending ? '…' : displayChar
				}}</text>
			</view>
			<view
				v-if="!completed && !demoPlaying"
				class="write-compact-hint"
				@click.stop="playCompactStrokeHint"
			>
				<text class="write-compact-caption">{{ compactHintLabel }}</text>
				<text class="write-compact-hint-btn">🔊 听提示</text>
			</view>
			<text v-else-if="compactStatusLine" class="write-compact-caption write-compact-caption--static">{{
				compactStatusLine
			}}</text>
			<view class="write-compact-actions">
				<text class="write-compact-link" @click.stop="showStrokeDemo">笔顺</text>
				<text class="write-compact-sep">·</text>
				<text class="write-compact-link" @click.stop="resetPractice">重写</text>
			</view>
		</view>
	</view>

	<meng-sub-page
		v-else
		:title="pageTitle"
		:subtitle="pageSubtitle"
		avatar-pose="happy"
		:overlap-body="false"
	>
		<view class="wp-page">
			<!-- 顶栏：大字 + 轻量拼音 + 笔顺提示 -->
			<view class="wp-head">
				<view class="wp-char-col" @click.stop="replayCharReading">
					<text class="wp-char">{{ displayChar }}</text>
					<text v-if="pinyinPlain" class="wp-pinyin">{{ pinyinPlain }}</text>
				</view>
				<view class="wp-head-main">
					<text class="wp-progress">{{ strokeProgressLabel }}</text>
					<text class="wp-guide">{{
						completed ? '全部写对了' : currentStrokeGuidancePhrase || '按笔顺书写'
					}}</text>
					<text
						v-if="!completed && currentStrokeLabel"
						class="wp-listen"
						@click.stop="playCurrentStrokeAudio"
					>听笔画</text>
				</view>
			</view>

			<view v-if="allWords.length" class="wp-words">
				<text
					v-for="(w, i) in displayWords"
					:key="'ww-' + wordsPage + '-' + i"
					class="wp-word"
				>{{ w }}</text>
				<text
					v-if="canRefreshWords"
					class="wp-words-more"
					@click.stop="refreshWordsBatch"
				>换一批</text>
			</view>

			<!-- 田字格居中；完成态右侧悬浮雷达 -->
			<view class="wp-stage">
				<canvas
					v-if="canvasReady"
					:id="canvasId"
					:canvas-id="canvasId"
					class="practice-canvas"
					disable-scroll
					:style="canvasStyle"
					@touchstart="onTouchStart"
					@touchmove="onTouchMove"
					@touchend="onTouchEnd"
					@touchcancel="onTouchCancel"
				/>
				<text v-else class="canvas-fallback">{{ displayChar }}</text>
				<view v-if="scoreRadarVisible" class="wp-score-card">
					<text class="wp-score-card-title">本字评分</text>
					<score-radar-chart
						:key="'wp-radar-' + scoreRadarKey"
						canvas-id="write-practice-score-radar"
						:axes="scoreRadarAxes"
						:size="radarSizePx"
						:show-legend="true"
						:compact="true"
						fill-color="rgba(232, 122, 74, 0.42)"
						stroke-color="#d4562a"
					/>
				</view>
			</view>

			<text
				class="wp-feedback"
				:class="{
					'wp-feedback--ok': feedbackType === 'ok',
					'wp-feedback--bad': feedbackType === 'bad'
				}"
			>{{ feedbackIcon ? feedbackIcon + ' ' : '' }}{{ feedbackText }}</text>

			<view v-if="recentHistory.length" class="wp-history">
				<text
					v-for="(line, i) in recentHistory"
					:key="'h-' + i"
					class="wp-history-item"
					:class="historyItemClass(line)"
				>{{ line }}</text>
			</view>

			<view
				v-if="!completed"
				class="wp-stroke-audio"
				:class="{ 'wp-stroke-audio--off': !strokeAudioEnabled }"
				@click.stop="toggleStrokeAudio"
			>
				<view class="wp-stroke-audio-switch" :class="{ 'wp-stroke-audio-switch--on': strokeAudioEnabled }">
					<view class="wp-stroke-audio-knob" />
				</view>
				<text class="wp-stroke-audio-label">{{
					strokeAudioEnabled ? '笔画语音：开' : '笔画语音：关（仅动画）'
				}}</text>
			</view>

			<!-- 书写中：三按钮；完成后：再写一次 + 下一字 -->
			<view v-if="!completed" class="wp-tools">
				<button class="wp-btn wp-btn--ghost" :disabled="demoPlaying" @click="showStrokeDemo">
					看笔顺
				</button>
				<button class="wp-btn wp-btn--ghost" @click="resetPractice">重写</button>
				<button class="wp-btn wp-btn--primary" @click="nextChar">
					{{ lessonMode ? '下一字' : '换一字' }}
				</button>
			</view>
			<view v-else class="wp-tools wp-tools--done">
				<button class="wp-btn wp-btn--ghost" @click="resetPractice">再写一次</button>
				<button class="wp-btn wp-btn--primary" @click="nextChar">
					{{ lessonMode ? '下一字' : '换一字' }}
				</button>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import ScoreRadarChart from '@/components/score-radar-chart.vue'
import drawNative from '@/utils/draw-native.js'
import { buildScoreRadarAxes } from '@/utils/score-radar-axes.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import {
	getCncharStrokeNameList,
	playStrokeGuidanceAudio,
	formatStrokeGuidancePhrase,
	resetStrokeAudioQueue
} from '@/utils/stroke-order-audio.js'
import {
	playOpusForDisplayPinyin,
	playPinyinLocalAudioSequence,
	sleep,
	stopLocalPinyinAudio
} from '@/utils/play-pinyin-local-audio.js'
import { stopHanziSpeech } from '@/utils/speak-hanzi.js'
import {
	getAudioNarrator,
	getWritePracticeStrokeAudioEnabled,
	setWritePracticeStrokeAudioEnabled
} from '@/utils/audio-settings.js'
import pinyinPlayScopeMixin, { PINYIN_PLAY_SCOPES } from '@/mixins/pinyin-play-scope.js'
import { formatStrokeLabelDisplay } from '@/data/stroke-name-pinyin.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { addCharWrongCount } from '@/utils/user-progress-storage.js'
import { recordStrokePractice } from '@/utils/achievement-stats-storage.js'
import { buildWritePracticeCharPool } from '@/utils/write-practice-char-pool.js'
import { takeLessonWriteTransfer } from '@/utils/lesson-mode-session.js'
import {
	MENG_VOICE,
	playMengmengVoice,
	playMengmengVoiceOnce,
	stopMengmengVoice,
	waitForMengmengVoiceIdle
} from '@/utils/mengmeng-voice.js'
import { LESSON_AUDIO_GAP_MS, sleepMs } from '@/utils/lesson-mode-audio.js'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import { getDictionaryEntry } from '@/repositories/dictionary-repository.js'

const CANVAS_LENGTH_FULL = 200
const CANVAS_LENGTH_COMPACT = 200
/** 整字读音播完后，再过多久才播笔画名 / 闪笔画 */
const CHAR_TO_STROKE_AUDIO_GAP_MS = 2000
const CHAR_TO_STROKE_AUDIO_GAP_MS_COMPACT = 600
/** 关闭笔画语音时：字音后尽快进入可写状态 */
const CHAR_TO_STROKE_GAP_MS_SILENT = 420
/** 字音结束后的短缓冲，避免尾音被笔画引导掐断 */
const CHAR_READING_TAIL_PAD_MS = 360
/** 组词每屏展示条数 */
const WORDS_PAGE_SIZE = 4
const WRITE_WELCOME_ONCE_KEY = 'meng_voice_write_practice_welcome'

export default {
	components: { MengSubPage, ScoreRadarChart },
	mixins: [pinyinPlayScopeMixin],
	pinyinPlayScope: PINYIN_PLAY_SCOPES.WRITE_PRACTICE,
	props: {
		/** 每日一练内嵌：无换字输入、紧凑布局 */
		compact: {
			type: Boolean,
			default: false
		},
		initialHanzi: {
			type: String,
			default: ''
		},
		initialPinyin: {
			type: String,
			default: ''
		},
		canvasId: {
			type: String,
			default: 'write-practice-canvas'
		},
		/** 播放萌萌语音提示（每日一练内嵌建议开启） */
		mengVoice: {
			type: Boolean,
			default: false
		}
	},
	emits: ['compact-complete'],
	data() {
		return {
			hanzi: '人',
			inputHanzi: '人',
			pinyinText: '',
			strokeNames: [],
			strokeTotal: 0,
			activeStroke: 0,
			canvasReady: false,
			writer: null,
			mountGen: 0,
			attachTimer: null,
			feedbackText: '',
			feedbackType: '',
			completed: false,
			demoPlaying: false,
			introGen: 0,
			introBusy: false,
			introDelayTimer: null,
			/** 本轮 mount 是否已启动进场引导，防重复 ready/挂载掐断字音 */
			introStartedForMount: 0,
			history: [],
			charPool: [],
			poolIndex: 0,
			wrongAddedAt: 0,
			/** 当前字本轮是否已记入易错（避免一笔加一次） */
			wrongCountedForChar: false,
			autoNextTimer: null,
			mountPending: false,
			/** 本课写字：固定字表，不走全书换字池 */
			lessonMode: false,
			lessonTitle: '',
			/** @type {Record<string, string>} */
			lessonPinyinMap: {},
			/** 当前字组词（来自字典详情） */
			charWords: [],
			wordsGen: 0,
			/** 组词分页：换一批 */
			wordsPage: 0,
			/** 自动播笔画名；关则仅闪笔画 / 看笔顺动画 */
			strokeAudioEnabled: true,
			/** 本字逐笔分项（供完成态雷达） */
			strokeScoreResults: [],
			scoreRadarVisible: false,
			scoreRadarAxes: [],
			scoreRadarKey: 0
		}
	},
	created() {
		this.strokeAudioEnabled = getWritePracticeStrokeAudioEnabled()
	},
	computed: {
		radarSizePx() {
			try {
				const sys = uni.getSystemInfoSync()
				const w = Number(sys.windowWidth) || 375
				return Math.max(72, Math.min(96, Math.round(w * 0.22)))
			} catch (_) {
				return 84
			}
		},
		pageTitle() {
			return this.lessonMode ? '本课写字' : '写字练习'
		},
		/** 本课字表进度：第 N / M 字（按当前字在池中的位置，换字即更新） */
		charProgressLabel() {
			if (!this.lessonMode) return ''
			const pool = this.charPool
			const n = Array.isArray(pool) ? pool.length : 0
			if (n <= 0) return ''
			const ch = this.displayChar
			let idx = -1
			if (ch && ch !== '—') idx = pool.indexOf(ch)
			if (idx < 0) {
				const raw = Number(this.poolIndex)
				idx = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0
			}
			const no = Math.min(n, Math.max(1, idx + 1))
			return `第 ${no} / ${n} 字`
		},
		pageSubtitle() {
			const prog = this.charProgressLabel
			if (this.lessonMode) {
				const title = String(this.lessonTitle || '').trim()
				if (title && prog) return `${title} · ${prog}`
				if (prog) return `本课写字 · ${prog}`
				return title || '本课写字练习'
			}
			return '按笔顺在田字格里写'
		},
		displayChar() {
			const c = String(this.hanzi || '').trim().charAt(0)
			return c || '—'
		},
		pinyinTokens() {
			const tokens = splitPinyinDisplayTokens(this.pinyinText)
			if (tokens.length) return tokens
			const s = String(this.pinyinText || '').trim()
			return s ? [s] : []
		},
		/** 写字页只需确认读音，用纯文本即可，不必四线三格 */
		pinyinPlain() {
			const tokens = this.pinyinTokens
			if (!tokens.length) return ''
			return tokens.join(' ')
		},
		strokeProgressLabel() {
			const stroke = `第 ${this.currentStrokeNo} / ${this.strokeTotal || 1} 笔`
			const charProg = this.charProgressLabel
			return charProg ? `${charProg} · ${stroke}` : stroke
		},
		/** 仅保留最近几笔，避免侧栏挤占田字格 */
		recentHistory() {
			const list = Array.isArray(this.history) ? this.history : []
			return list.slice(-4)
		},
		currentStrokeNo() {
			return Math.min(this.strokeTotal || 1, this.activeStroke + 1)
		},
		currentStrokeLabel() {
			const name = this.strokeNames[this.activeStroke]
			return name ? formatStrokeLabelDisplay(name) : ''
		},
		currentStrokeGuidance() {
			const label = this.strokeNames[this.activeStroke]
			if (!label) return ''
			return `请写：${formatStrokeGuidancePhrase(this.activeStroke, label)}`
		},
		currentStrokeGuidancePhrase() {
			const label = this.strokeNames[this.activeStroke]
			if (!label) return ''
			return formatStrokeGuidancePhrase(this.activeStroke, label)
		},
		canvasLength() {
			return this.compact ? CANVAS_LENGTH_COMPACT : CANVAS_LENGTH_FULL
		},
		canvasStyle() {
			const px = this.canvasLength + 30
			return { width: px + 'px', height: px + 'px', display: 'block' }
		},
		feedbackIcon() {
			if (this.feedbackType === 'ok') return '✓'
			if (this.feedbackType === 'bad') return '✗'
			return ''
		},
		compactHintLabel() {
			if (!this.compact || this.completed || this.demoPlaying) return ''
			if (this.currentStrokeGuidancePhrase) return this.currentStrokeGuidancePhrase
			if (this.strokeTotal > 0) {
				return `第 ${this.currentStrokeNo} / ${this.strokeTotal} 笔`
			}
			return '当前笔画'
		},
		compactStatusLine() {
			if (!this.compact) return ''
			if (this.completed) return '全部写对了'
			if (this.demoPlaying) return '笔顺演示中'
			return ''
		},
		charToStrokeGapMs() {
			if (!this.strokeAudioEnabled) return CHAR_TO_STROKE_GAP_MS_SILENT
			return this.compact ? CHAR_TO_STROKE_AUDIO_GAP_MS_COMPACT : CHAR_TO_STROKE_AUDIO_GAP_MS
		},
		/** 当前字全部可用组词（去重） */
		allWords() {
			const raw = this.charWords
			if (!Array.isArray(raw) || !raw.length) return []
			const out = []
			const seen = Object.create(null)
			for (const w of raw) {
				const k = String(w || '').trim()
				if (!k || k === '暂无组词' || seen[k]) continue
				seen[k] = 1
				out.push(k)
			}
			return out
		},
		/** 当前页组词（每页 WORDS_PAGE_SIZE 个） */
		displayWords() {
			const list = this.allWords
			if (!list.length) return []
			const pages = Math.max(1, Math.ceil(list.length / WORDS_PAGE_SIZE))
			const page = ((Number(this.wordsPage) % pages) + pages) % pages
			const start = page * WORDS_PAGE_SIZE
			return list.slice(start, start + WORDS_PAGE_SIZE)
		},
		canRefreshWords() {
			return this.allWords.length > WORDS_PAGE_SIZE
		}
	},
	onLoad(query) {
		if (this.compact) return
		const fromLesson = String(query?.from || '') === 'lesson'
		if (fromLesson) {
			const payload = takeLessonWriteTransfer()
			const rows = Array.isArray(payload?.rows) ? payload.rows : []
			const seen = new Set()
			const pool = []
			const pyMap = {}
			for (const r of rows) {
				const h = String(r?.hanzi || '').match(/[\u4e00-\u9fff]/)?.[0] || ''
				if (!h || seen.has(h)) continue
				seen.add(h)
				pool.push(h)
				const py = String(r?.pinyin || '').trim()
				if (py && py !== '-') pyMap[h] = py
			}
			if (pool.length) {
				this.lessonMode = true
				this.lessonTitle = String(payload?.lessonTitle || '').trim()
				this.lessonPinyinMap = pyMap
				this.charPool = pool
				this.poolIndex = 0
				this.hanzi = pool[0]
				this.inputHanzi = pool[0]
				return
			}
			uni.showToast({ title: '本课暂无生字', icon: 'none' })
		}
		const from = query?.hanzi ? decodeURIComponent(query.hanzi) : ''
		const pure = String(from || '').match(/[\u4e00-\u9fff]/)?.[0]
		if (pure) {
			this.hanzi = pure
			this.inputHanzi = pure
		}
	},
	watch: {
		initialHanzi(val, oldVal) {
			if (!this.compact || !val || val === oldVal) return
			const pure = String(val || '').match(/[\u4e00-\u9fff]/)?.[0]
			if (!pure || (pure === this.hanzi && this.writer)) return
			this.initCompactPractice(pure, this.initialPinyin)
		}
	},
	mounted() {
		if (this.compact) {
			this.initCompactPractice()
		}
	},
	onReady() {
		if (this.compact) return
		this.bootstrap()
	},
	onUnload() {
		this.clearAutoNextTimer()
		this.stopAllPracticeAudio()
		stopMengmengVoice()
	},
	onHide() {
		this.clearAutoNextTimer()
		this.stopAllPracticeAudio()
		stopMengmengVoice()
	},
	methods: {
		clearAutoNextTimer() {
			if (this.autoNextTimer != null) {
				clearTimeout(this.autoNextTimer)
				this.autoNextTimer = null
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
		/** 内嵌在每日一练：子组件无 onReady，须在 mounted 后挂载 canvas */
		initCompactPractice(hanzi, pinyin) {
			const pure =
				String(hanzi || this.initialHanzi || '')
					.match(/[\u4e00-\u9fff]/)?.[0] || ''
			if (!pure) return
			const py = pinyin != null ? pinyin : this.initialPinyin
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.applyChar(pure, py)
				})
			})
		},
		async bootstrap() {
			if (!this.lessonMode) {
				await this.loadCharPool()
			} else {
				const py = this.lessonPinyinMap[this.displayChar]
				this.refreshMeta(py)
				this.mountTestWriter()
				this.loadCharWords(this.displayChar)
				return
			}
			this.refreshMeta()
			this.mountTestWriter()
			this.loadCharWords(this.displayChar)
		},
		async loadCharPool(excludeChar) {
			if (this.lessonMode) return
			try {
				this.charPool = await buildWritePracticeCharPool({
					excludeChar: excludeChar != null ? excludeChar : this.displayChar,
					shuffleSalt: Date.now()
				})
			} catch (_) {
				this.charPool = ['大', '小', '天', '口', '手', '人']
			}
		},
		refreshMeta(externalPinyin) {
			const fromLesson =
				this.lessonMode && this.lessonPinyinMap[this.displayChar]
					? this.lessonPinyinMap[this.displayChar]
					: ''
			const pyIn = String(
				externalPinyin != null
					? externalPinyin
					: fromLesson || this.initialPinyin || ''
			)
				.replace(/\s+/g, ' ')
				.trim()
			if (pyIn) {
				this.pinyinText = pyIn
			} else {
				try {
					this.pinyinText = spellDisplayString(this.displayChar, 'poly', 'tone', 'array', 'low')
				} catch (_) {
					this.pinyinText = ''
				}
			}
			this.strokeNames = getCncharStrokeNameList(this.displayChar)
			this.strokeTotal = this.strokeNames.length || 0
		},
		applyChar(hanzi, pinyin) {
			const pure = String(hanzi || '').match(/[\u4e00-\u9fff]/)?.[0]
			if (!pure) return
			this.clearAutoNextTimer()
			this.mountPending = true
			this.stopAllPracticeAudio()
			this.hanzi = pure
			this.inputHanzi = pure
			this.history = []
			this.completed = false
			this.activeStroke = 0
			this.wrongCountedForChar = false
			this.charWords = []
			this.wordsPage = 0
			this.refreshMeta(pinyin)
			this.mountTestWriter()
			this.loadCharWords(pure)
		},
		async loadCharWords(hanzi) {
			if (this.compact) return
			const pure = String(hanzi || '').trim().charAt(0)
			if (!pure) {
				this.charWords = []
				this.wordsPage = 0
				return
			}
			const gen = ++this.wordsGen
			try {
				const entry = await getDictionaryEntry(pure)
				if (gen !== this.wordsGen || this.displayChar !== pure) return
				this.charWords = Array.isArray(entry?.words) ? entry.words : []
				this.wordsPage = 0
			} catch (_) {
				if (gen !== this.wordsGen || this.displayChar !== pure) return
				this.charWords = []
				this.wordsPage = 0
			}
		},
		refreshWordsBatch() {
			if (!this.canRefreshWords) return
			const pages = Math.ceil(this.allWords.length / WORDS_PAGE_SIZE)
			this.wordsPage = (Number(this.wordsPage) + 1) % pages
		},
		pushHistory(text) {
			this.history = [...this.history, text].slice(-12)
		},
		historyItemClass(line) {
			const s = String(line || '')
			if (s.includes('✓')) return 'history-item--ok'
			if (s.includes('✗')) return 'history-item--bad'
			return ''
		},
		/** 停字音 / 笔画音 / TTS，并作废进行中的引导（不销毁 canvas） */
		stopPracticePlayback() {
			this.introGen++
			this.introBusy = false
			if (this.introDelayTimer != null) {
				clearTimeout(this.introDelayTimer)
				this.introDelayTimer = null
			}
			try {
				this._pyPlay?.cancel?.()
			} catch (_) {}
			if (this.writer && typeof this.writer.stop === 'function') {
				try {
					this.writer.stop()
				} catch (_) {}
			}
			resetStrokeAudioQueue()
			stopLocalPinyinAudio()
			stopHanziSpeech()
		},
		/** 换字、演示、离开页：停音 + 取消挂载 + 销毁 writer */
		stopAllPracticeAudio() {
			stopMengmengVoice()
			this.demoPlaying = false
			this.stopPracticePlayback()
			if (this.attachTimer != null) {
				clearTimeout(this.attachTimer)
				this.attachTimer = null
			}
			this.mountGen++
			this.introStartedForMount = 0
			if (this.writer) {
				try {
					if (typeof this.writer.destroy === 'function') {
						this.writer.destroy()
					}
				} catch (_) {}
				this.writer = null
			}
		},
		cancelWriteIntro() {
			this.stopPracticePlayback()
		},
		waitIntroGap(ms, gen) {
			const delay = Math.max(0, Number(ms) || 0)
			if (!delay || gen !== this.introGen) return Promise.resolve()
			return new Promise((resolve) => {
				this.introDelayTimer = setTimeout(() => {
					this.introDelayTimer = null
					resolve()
				}, delay)
			})
		},
		/** 进场欢迎（只播一次）→ 等闲 → 再播字音，避免与 onShow 并行掐断 */
		async playEntryWelcomeIfNeeded(gen) {
			if (this.compact) return
			const cancelled = () => gen !== this.introGen || this.completed || this.demoPlaying
			if (cancelled()) return
			try {
				await playMengmengVoiceOnce(MENG_VOICE.STROKE_WELCOME, WRITE_WELCOME_ONCE_KEY, {
					debounceMs: 0
				})
			} catch (_) {}
			if (cancelled()) return
			try {
				await waitForMengmengVoiceIdle()
			} catch (_) {}
			if (cancelled()) return
			await sleep(LESSON_AUDIO_GAP_MS)
		},
		/** 进入/换字：先欢迎（若有）→ 整字读音 → 间隔 → 笔画名 */
		async runWriteIntro(strokeIndex, opts = {}) {
			const playCharFirst = opts.playCharFirst === true
			const gen = ++this.introGen
			this.introBusy = true
			try {
				if (playCharFirst) {
					await this.playEntryWelcomeIfNeeded(gen)
					if (gen !== this.introGen || this.completed || this.demoPlaying) return
					if (!this.compact) {
						this.feedbackText = `先听「${this.displayChar}」的读音`
						this.feedbackType = ''
					}
					await this.playCharReading(gen)
					if (gen !== this.introGen || this.completed || this.demoPlaying) return
					try {
						await sleep(CHAR_READING_TAIL_PAD_MS)
					} catch (_) {}
					if (gen !== this.introGen || this.completed || this.demoPlaying) return
					if (!this.compact) {
						this.feedbackText = '想一想，准备写第一笔…'
						this.feedbackType = ''
					}
					await this.waitIntroGap(this.charToStrokeGapMs, gen)
					if (gen !== this.introGen || this.completed || this.demoPlaying) return
				}
				await this.beginStrokeGuidance(strokeIndex, gen)
			} finally {
				if (gen === this.introGen) this.introBusy = false
			}
		},
		/** @param {number} [introGen] runWriteIntro 会话 id，换字后丢弃在途播放 */
		async playCharReading(introGen) {
			const gen = introGen != null ? introGen : this.introGen
			const charSnap = this.displayChar
			const pageCancelled = () => gen !== this.introGen || this.displayChar !== charSnap
			if (pageCancelled()) return
			const narrator = getAudioNarrator()
			const tokens = this.pinyinTokens
			const py = String(this.pinyinText || '').trim()
			await this._pyPlay.run(({ isCancelled }) => {
				const cancelled = () => isCancelled() || pageCancelled()
				const body = async () => {
					if (cancelled()) return false
					if (tokens.length > 1) {
						return playPinyinLocalAudioSequence(tokens, {
							narrator,
							gapMs: 90,
							isCancelled: cancelled
						})
					}
					if (tokens.length === 1) {
						return playOpusForDisplayPinyin(tokens[0], {
							narrator,
							gapMs: 0,
							isCancelled: cancelled
						})
					}
					if (py) {
						return playOpusForDisplayPinyin(py, {
							narrator,
							gapMs: 0,
							isCancelled: cancelled
						})
					}
					return false
				}
				return body()
			})
		},
		toggleStrokeAudio() {
			const next = setWritePracticeStrokeAudioEnabled(!this.strokeAudioEnabled)
			this.strokeAudioEnabled = next
			if (!this.compact) {
				this.feedbackText = next
					? '已开启笔画语音'
					: '已关闭笔画语音，写字时只闪笔画提示'
				this.feedbackType = ''
			}
			uni.showToast({
				title: next ? '笔画语音已开' : '笔画语音已关',
				icon: 'none',
				duration: 1400
			})
		},
		async beginStrokeGuidance(strokeIndex, introGen, opts = {}) {
			const gen = introGen != null ? introGen : this.introGen
			const charSnap = this.displayChar
			const pageCancelled = () => gen !== this.introGen || this.displayChar !== charSnap
			const idx = Number(strokeIndex)
			if (!Number.isFinite(idx) || idx < 0 || this.completed || this.demoPlaying) return
			if (pageCancelled()) return
			if (this.writer && typeof this.writer.setTestStrokeGuide === 'function') {
				this.writer.setTestStrokeGuide(true, { blink: true, blinkTimes: 3 })
			}
			const label = this.strokeNames[idx]
			if (label && !this.compact) {
				this.feedbackText = `请写：${formatStrokeGuidancePhrase(idx, label)}`
				this.feedbackType = ''
			}
			if (!label) return
			/** 自动引导尊重开关；手动「听笔画」可强制播 */
			const forceAudio = opts.forceAudio === true
			if (!forceAudio && !this.strokeAudioEnabled) return
			await this._pyPlay.run(({ isCancelled }) =>
				playStrokeGuidanceAudio(idx, label, {
					narrator: getAudioNarrator(),
					isCancelled: () => isCancelled() || pageCancelled()
				})
			)
		},
		playCurrentStrokeAudio() {
			if (this.completed || this.demoPlaying || this.introBusy) return
			this.cancelWriteIntro()
			const gen = ++this.introGen
			this.introBusy = true
			const run = async () => {
				try {
					await this.beginStrokeGuidance(this.activeStroke, gen, { forceAudio: true })
				} finally {
					if (gen === this.introGen) this.introBusy = false
				}
			}
			run()
		},
		/** 点大字重听整字读音（替代四线格点读） */
		replayCharReading() {
			if (this.completed || this.demoPlaying || this.introBusy) return
			this.cancelWriteIntro()
			this.runWriteIntro(this.activeStroke, { playCharFirst: true })
		},
		/** 内嵌模式：仅高亮当前应收笔（不播音） */
		applyCompactStrokeGuideVisual(strokeIndex) {
			if (!this.compact || this.completed || this.demoPlaying) return
			const idx =
				strokeIndex != null && Number.isFinite(Number(strokeIndex))
					? Number(strokeIndex)
					: this.activeStroke
			if (idx < 0) return
			if (this.writer && typeof this.writer.setTestStrokeGuide === 'function') {
				this.writer.setTestStrokeGuide(true, { blink: true, blinkTimes: 3 })
			}
		},
		/** 内嵌模式：用户点击后播放当前应收笔画提示 */
		playCompactStrokeHint() {
			if (this.completed || this.demoPlaying || this.introBusy) return
			const voiceId = this.compact ? MENG_VOICE.DAILY_STROKE_HINT : MENG_VOICE.STROKE_HINT_PLAY
			this.cancelWriteIntro()
			const gen = ++this.introGen
			this.introBusy = true
			this.applyCompactStrokeGuideVisual(this.activeStroke)
			const run = async () => {
				try {
					await this.playMengVoiceIf(voiceId, { minGapMs: 700 })
					await waitForMengmengVoiceIdle()
					await sleepMs(LESSON_AUDIO_GAP_MS)
					/** 用户主动点「听提示」：即使总开关关闭也播本次 */
					await this.beginStrokeGuidance(this.activeStroke, gen, { forceAudio: true })
				} finally {
					if (gen === this.introGen) this.introBusy = false
				}
			}
			run()
		},
		playMengVoiceIf(id, opts) {
			if (this.compact && !this.mengVoice) return Promise.resolve(false)
			return playMengmengVoice(id, opts).catch(() => false)
		},
		compactToast() {
			/* 每日一练内嵌：不弹 Toast，避免打断书写 */
		},
		clearScoreRadar() {
			this.scoreRadarVisible = false
			this.scoreRadarAxes = []
			this.strokeScoreResults = []
		},
		showScoreRadarFromResults() {
			if (this.compact) return
			const list = this.strokeScoreResults
			const axes = buildScoreRadarAxes(list, {
				expectedCount: this.strokeTotal,
				actualCount: list.length
			})
			this.scoreRadarAxes = axes
			this.scoreRadarKey += 1
			this.scoreRadarVisible = true
		},
		pushStrokeScoreResult(index, data = {}) {
			if (this.compact) return
			const idx = Number(index)
			this.strokeScoreResults = [
				...this.strokeScoreResults,
				{
					index: Number.isFinite(idx) ? idx : this.strokeScoreResults.length,
					dirScore: Number(data.dirScore) || 0,
					fitScore: Number(data.fitScore) || 0,
					strokeScore: Number(data.strokeScore) || 0,
					pass: data.pass !== false
				}
			]
		},
		handleTestStatus(index, status, data = {}) {
			const strokeNo = Number(index) + 1
			if (status === 'correct') {
				this.pushStrokeScoreResult(index, data)
				if (!this.compact) {
					this.feedbackType = 'ok'
					this.feedbackText =
						strokeNo >= this.strokeTotal
							? `第 ${strokeNo} 笔写对了`
							: `第 ${strokeNo} 笔写对了，请写第 ${strokeNo + 1} 笔`
				}
				this.activeStroke = strokeNo
				if (!this.compact) this.pushHistory(`第 ${strokeNo} 笔 ✓`)
				if (!this.completed && strokeNo < this.strokeTotal) {
					if (this.compact) {
						this.$nextTick(() => this.applyCompactStrokeGuideVisual(strokeNo))
					} else {
						this.$nextTick(() =>
							this.runWriteIntro(strokeNo, { playCharFirst: false })
						)
					}
				}
				return
			}
			if (status === 'mistake') {
				if (data.reason === 'tooShort') {
					if (!this.compact) {
						this.feedbackType = 'bad'
						this.feedbackText = '笔画太短啦，请按住田字格多拖一段再松手'
					}
					this.compactToast('请画完整一笔')
					if (!this.compact) {
						uni.showToast({ title: '请画完整一笔', icon: 'none' })
					}
					if (!this.compact) this.pushHistory(`第 ${strokeNo} 笔 ✗ 笔画太短`)
					return
				}
				const expectedNo = Number(data.expectedStroke) + 1
				const expectedLabel =
					this.strokeNames[data.expectedStroke] != null
						? this.strokeNames[data.expectedStroke]
						: ''
				const expectedPhrase = expectedLabel
					? formatStrokeGuidancePhrase(data.expectedStroke, expectedLabel)
					: ''
				if (!this.compact) {
					this.feedbackType = 'bad'
					const shapeHint =
						typeof data.score === 'number' && data.score > 30
							? '形状或方向不太像，'
							: ''
					this.feedbackText = expectedPhrase
						? `${shapeHint}这一笔不对。应先写${expectedPhrase}，请重画`
						: `${shapeHint}这一笔不对，请按提示重画第 ${expectedNo} 笔`
					this.pushHistory(`第 ${strokeNo} 笔 ✗ → 应收第 ${expectedNo} 笔`)
					uni.showToast({ title: '再试一次', icon: 'none', duration: 1500 })
				} else {
					this.compactToast(expectedPhrase ? `应写${expectedPhrase}` : '再试一次')
					this.playMengVoiceIf(
						this.compact ? MENG_VOICE.DAILY_STROKE_WRONG : MENG_VOICE.STROKE_WRITE_WRONG,
						{ minGapMs: 800 }
					)
				}
				if (Number.isFinite(data.expectedStroke) && data.expectedStroke >= 0) {
					if (this.compact) {
						this.activeStroke = data.expectedStroke
						this.$nextTick(() =>
							this.applyCompactStrokeGuideVisual(data.expectedStroke)
						)
					} else {
						this.$nextTick(() =>
							this.runWriteIntro(data.expectedStroke, { playCharFirst: false })
						)
					}
				}
				// 写错：本字本轮只记入易错一次，避免一笔加一次
				if (!this.wrongCountedForChar) {
					const now = Date.now()
					if (now - this.wrongAddedAt > 300) {
						addCharWrongCount(this.displayChar, 1, this.curriculumDims())
						this.wrongAddedAt = now
						this.wrongCountedForChar = true
						if (!this.compact) {
							uni.showToast({ title: '已加入易错字', icon: 'none', duration: 1200 })
						}
					}
				}
				return
			}
			if (status === 'complete') {
				this.completed = true
				this.activeStroke = this.strokeTotal
				recordStrokePractice(1)
				if (this.compact) {
					this.compactToast('全部写对了', 'success')
					this.playMengVoiceIf(MENG_VOICE.DAILY_COMPLETE, { minGapMs: 2000 })
					this.$emit('compact-complete')
				} else {
					this.clearAutoNextTimer()
					this.playMengVoiceIf(MENG_VOICE.STROKE_ALL_DONE, { minGapMs: 2000 })
					this.feedbackType = 'ok'
					this.feedbackText = '全部笔画写对了！查看右侧评分，点「下一字」继续'
					this.pushHistory('✓ 全部通过')
					this.showScoreRadarFromResults()
				}
			}
		},
		sharedDrawOpts() {
			return {
				vm: this,
				style: {
					length: this.canvasLength,
					charInsetRatio: 0.12,
					strokeColor: '#2c3e50',
					/** 关闭灰底稿，避免泄题；写对的笔画再画 strokeColor */
					showOutline: false,
					outlineColor: '#fffcf8',
					backgroundColor: '#fffcf8',
					currentColor: '#ff7043',
					drawingColor: '#ff7043',
					drawingWidth: 5,
					guideStrokeColor: '#ff6b9d',
					highlightColor: '#ffab40'
				},
				line: {
					show: true,
					borderColor: '#e0cfc0',
					centerColor: '#d4c4b4',
					diagonalColor: '#ebe0d6'
				},
				watermark: { text: '', alpha: 0 }
			}
		},
		teardownWriter() {
			this.stopPracticePlayback()
			if (this.attachTimer) {
				clearTimeout(this.attachTimer)
				this.attachTimer = null
			}
			this.mountGen++
			if (this.writer) {
				try {
					if (typeof this.writer.destroy === 'function') {
						this.writer.destroy()
					}
				} catch (_) {}
				this.writer = null
			}
		},
		scheduleMount(fn) {
			this.teardownWriter()
			this.canvasReady = true
			const token = ++this.mountGen
			const attach = () => {
				this.attachTimer = null
				if (token !== this.mountGen) return
				fn(token)
			}
			const delayMs = this.compact ? 120 : 48
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.attachTimer = setTimeout(attach, delayMs)
				})
			})
		},
		mountTestWriter() {
			this.stopAllPracticeAudio()
			this.clearAutoNextTimer()
			this.clearScoreRadar()
			this.completed = false
			this.activeStroke = 0
			if (!this.compact) {
				this.feedbackText = '请用手指在下方田字格写出当前这一笔，写完后松手'
				this.feedbackType = ''
			}
			this.demoPlaying = false
			const ch = this.displayChar
			if (!ch || ch === '—') return
			this.scheduleMount((mountToken) => {
				const vm = this
				try {
					this.writer = drawNative(ch, {
						...this.sharedDrawOpts(),
						el: `#${this.canvasId}`,
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
					vm.mountPending = false
					if (vm.compact) {
						vm.$nextTick(() => {
							if (mountToken !== vm.mountGen) return
							vm.applyCompactStrokeGuideVisual(0)
						})
					} else {
						vm.$nextTick(() => {
							if (mountToken !== vm.mountGen) return
							if (vm.introStartedForMount === mountToken) return
							vm.introStartedForMount = mountToken
							vm.runWriteIntro(0, { playCharFirst: true })
						})
					}
				} catch (e) {
					vm.mountPending = false
					vm.canvasReady = false
					console.warn('[write-practice] mount test', e)
					if (!vm.compact) {
						uni.showToast({ title: '该字暂不支持练习', icon: 'none' })
					}
				}
			})
		},
		mountDemoWriter() {
			const ch = this.displayChar
			if (!ch || ch === '—') return
			this.demoPlaying = true
			if (!this.compact) this.feedbackText = '笔顺演示中…'
			this.scheduleMount(() => {
				try {
					const vm = this
					this.writer = drawNative(ch, {
						...this.sharedDrawOpts(),
						el: `#${this.canvasId}`,
						type: drawNative.TYPE.ANIMATION,
						animation: {
							autoAnimate: true,
							loopAnimate: false,
							strokeAnimationSpeed: 0.55,
							strokeDurationMs: 880,
							delayBetweenStrokes: 120,
							animateComplete() {
								vm.demoPlaying = false
								vm.mountTestWriter()
							}
						}
					})
				} catch (e) {
					this.demoPlaying = false
					if (!this.compact) {
						uni.showToast({ title: '笔顺演示失败', icon: 'none' })
					}
					this.mountTestWriter()
				}
			})
		},
		showStrokeDemo() {
			if (this.demoPlaying || this.completed) return
			this.playMengVoiceIf(MENG_VOICE.STROKE_MODE_ANIM, { minGapMs: 1500 })
			this.stopAllPracticeAudio()
			this.mountDemoWriter()
		},
		resetPractice() {
			this.clearAutoNextTimer()
			this.clearScoreRadar()
			this.stopPracticePlayback()
			this.completed = false
			this.activeStroke = 0
			this.wrongCountedForChar = false
			this.history = []
			if (!this.compact) {
				this.feedbackText = '已重置，先听字音再写第一笔'
				this.feedbackType = ''
			}
			if (this.writer && typeof this.writer.resetStrokeTest === 'function') {
				this.writer.resetStrokeTest()
				if (this.compact) {
					this.$nextTick(() => this.applyCompactStrokeGuideVisual(0))
				} else {
					/** 重置视为新一轮进场：允许再播字音（欢迎语仍 once） */
					this.introStartedForMount = 0
					this.$nextTick(() => this.runWriteIntro(0, { playCharFirst: true }))
				}
				return
			}
			this.mountTestWriter()
		},
		async applyHanzi() {
			const pure = String(this.inputHanzi || '').match(/[\u4e00-\u9fff]/)?.[0]
			if (!pure) {
				uni.showToast({ title: '请输入汉字', icon: 'none' })
				return
			}
			if (this.lessonMode && !this.charPool.includes(pure)) {
				uni.showToast({ title: '请输入本课生字', icon: 'none' })
				return
			}
			this.clearAutoNextTimer()
			this.stopAllPracticeAudio()
			this.hanzi = pure
			this.inputHanzi = pure
			this.history = []
			this.wrongCountedForChar = false
			this.charWords = []
			this.wordsPage = 0
			if (this.lessonMode) {
				const idx = this.charPool.indexOf(pure)
				if (idx >= 0) this.poolIndex = idx
				this.refreshMeta(this.lessonPinyinMap[pure])
			} else {
				this.refreshMeta()
				await this.loadCharPool(pure)
			}
			this.mountTestWriter()
			this.loadCharWords(pure)
		},
		async nextChar() {
			this.clearAutoNextTimer()
			this.clearScoreRadar()
			this.stopAllPracticeAudio()
			this.canvasReady = false
			this.wrongCountedForChar = false
			if (this.lessonMode) {
				if (!this.charPool.length) return
				this.poolIndex = (Number(this.poolIndex) + 1) % this.charPool.length
				const next = this.charPool[this.poolIndex]
				this.hanzi = next
				this.inputHanzi = next
				this.history = []
				this.charWords = []
				this.wordsPage = 0
				this.refreshMeta(this.lessonPinyinMap[next])
				this.mountTestWriter()
				this.loadCharWords(next)
				return
			}
			const prev = this.displayChar
			await this.loadCharPool(prev)
			if (!this.charPool.length) {
				this.applyHanzi()
				return
			}
			this.poolIndex = 0
			this.hanzi = this.charPool[0]
			this.inputHanzi = this.hanzi
			this.history = []
			this.charWords = []
			this.wordsPage = 0
			this.refreshMeta()
			this.mountTestWriter()
			this.loadCharWords(this.hanzi)
		},
		pickCanvasTouch(e) {
			if (!e) return null
			return (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || null
		},
		onTouchStart(e) {
			if (this.completed || this.demoPlaying) return
			const t = this.pickCanvasTouch(e)
			if (t && this.writer?.handleTouchStart) {
				this.writer.handleTouchStart(t, e.detail)
			}
		},
		onTouchMove(e) {
			if (this.completed || this.demoPlaying) return
			const t = this.pickCanvasTouch(e)
			if (t && this.writer?.handleTouchMove) {
				this.writer.handleTouchMove(t, e.detail)
			}
		},
		onTouchEnd(e) {
			if (this.completed || this.demoPlaying) return
			if (this.writer?.handleTouchEnd) {
				this.writer.handleTouchEnd()
			}
		},
		onTouchCancel(e) {
			this.onTouchEnd(e)
		}
	}
}
</script>

<style scoped>
.write-compact-root {
	width: 100%;
	box-sizing: border-box;
}

.write-compact {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
}

.write-compact-hint {
	margin-top: 12rpx;
	padding: 12rpx 18rpx;
	border-radius: 16rpx;
	background: rgba(255, 252, 248, 0.98);
	border: 1rpx solid rgba(235, 227, 216, 0.9);
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	flex-wrap: wrap;
	gap: 10rpx 16rpx;
}

.write-compact-caption {
	font-size: 26rpx;
	color: var(--meng-text);
	font-weight: 600;
	line-height: 1.4;
	text-align: center;
}

.write-compact-caption--static {
	display: block;
	margin-top: 12rpx;
	width: 100%;
	font-weight: 500;
	color: var(--meng-text-muted);
}

.write-compact-hint-btn {
	font-size: 24rpx;
	color: #c44d6a;
	font-weight: 600;
}

.write-compact-actions {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	margin-top: 10rpx;
}

.write-compact-link {
	font-size: 24rpx;
	color: #c44d6a;
	font-weight: 600;
	padding: 6rpx 12rpx;
}

.write-compact-sep {
	font-size: 22rpx;
	color: var(--meng-text-muted);
}

/* —— 独立写字页：田字格为主，信息克制 —— */
.wp-page {
	position: relative;
	width: 100%;
	box-sizing: border-box;
}

.wp-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 28rpx;
	margin-bottom: 20rpx;
	padding: 8rpx 4rpx 4rpx;
}

.wp-char-col {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
	flex-shrink: 0;
	min-width: 120rpx;
}

.wp-char {
	font-size: 96rpx;
	font-weight: 700;
	color: var(--meng-text);
	line-height: 1.05;
	letter-spacing: 0;
}

.wp-pinyin {
	font-size: 26rpx;
	color: var(--meng-text-muted);
	line-height: 1.2;
	font-weight: 500;
}

.wp-head-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8rpx;
}

.wp-progress {
	font-size: 24rpx;
	font-weight: 600;
	color: var(--meng-text-secondary);
	line-height: 1.3;
}

.wp-guide {
	font-size: 32rpx;
	font-weight: 700;
	color: var(--meng-text);
	line-height: 1.35;
}

.wp-listen {
	margin-top: 4rpx;
	font-size: 24rpx;
	font-weight: 600;
	color: #c44d6a;
	padding: 4rpx 0;
}

.wp-words {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
	gap: 10rpx 14rpx;
	margin-bottom: 16rpx;
	padding: 0 4rpx;
}

.wp-word {
	font-size: 26rpx;
	color: var(--meng-text-secondary);
	line-height: 1.3;
}

.wp-words-more {
	font-size: 24rpx;
	font-weight: 600;
	color: #c44d6a;
	margin-left: 4rpx;
}

.wp-stage {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20rpx;
	margin-bottom: 16rpx;
	border-radius: 28rpx;
	background: #fff;
	border: 1rpx solid rgba(235, 227, 216, 0.9);
	box-sizing: border-box;
}

.wp-score-card {
	position: absolute;
	top: 16rpx;
	right: 12rpx;
	z-index: 20;
	width: 220rpx;
	padding: 8rpx 8rpx 10rpx;
	box-sizing: border-box;
	border-radius: 14rpx;
	background: rgba(255, 252, 248, 0.96);
	border: 1rpx solid rgba(232, 122, 74, 0.35);
	box-shadow: 0 6rpx 16rpx rgba(44, 36, 25, 0.14);
	pointer-events: none;
}

.wp-score-card-title {
	display: block;
	font-size: 20rpx;
	font-weight: 800;
	color: #b84a28;
	text-align: center;
	margin-bottom: 2rpx;
	letter-spacing: 1rpx;
}

.canvas-shell--compact {
	width: 100%;
	padding: 10rpx;
	box-shadow: none;
	border-radius: 24rpx;
	background: #fffefb;
	border: 2rpx solid rgba(235, 227, 216, 0.95);
}

.canvas-fallback--compact {
	min-height: 200px;
	font-size: 100rpx;
}

.practice-canvas {
	margin: 0 auto;
}

.canvas-fallback {
	font-size: 120rpx;
	color: var(--meng-text-muted);
}

.wp-feedback {
	display: block;
	margin-bottom: 12rpx;
	padding: 0 8rpx;
	min-height: 44rpx;
	font-size: 28rpx;
	font-weight: 600;
	color: var(--meng-text-secondary);
	line-height: 1.45;
	text-align: center;
}

.wp-feedback--ok {
	color: #3d9a5c;
}

.wp-feedback--bad {
	color: #c44;
}

.wp-history {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	gap: 8rpx 16rpx;
	margin-bottom: 20rpx;
	padding: 0 8rpx;
}

.wp-history-item {
	font-size: 22rpx;
	color: var(--meng-text-muted);
	line-height: 1.3;
}

.history-item--ok {
	color: #3d9a5c;
	font-weight: 600;
}

.history-item--bad {
	color: #c44;
	font-weight: 600;
}

.wp-stroke-audio {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 14rpx;
	margin-bottom: 18rpx;
	padding: 12rpx 16rpx;
	min-height: 72rpx;
	box-sizing: border-box;
}

.wp-stroke-audio-switch {
	width: 72rpx;
	height: 40rpx;
	border-radius: 999rpx;
	background: rgba(200, 190, 175, 0.55);
	position: relative;
	flex-shrink: 0;
	transition: background 0.18s ease;
}

.wp-stroke-audio-switch--on {
	background: var(--meng-accent-solid);
}

.wp-stroke-audio-knob {
	position: absolute;
	top: 4rpx;
	left: 4rpx;
	width: 32rpx;
	height: 32rpx;
	border-radius: 50%;
	background: #fff;
	box-shadow: 0 2rpx 8rpx rgba(44, 36, 25, 0.18);
	transition: transform 0.18s ease;
}

.wp-stroke-audio-switch--on .wp-stroke-audio-knob {
	transform: translateX(32rpx);
}

.wp-stroke-audio-label {
	font-size: 26rpx;
	font-weight: 600;
	color: var(--meng-text-secondary);
	line-height: 1.3;
}

.wp-stroke-audio--off .wp-stroke-audio-label {
	color: var(--meng-text-muted);
}

.wp-tools {
	display: flex;
	flex-direction: row;
	gap: 16rpx;
	margin-bottom: 28rpx;
}

.wp-tools--done .wp-btn--primary {
	flex: 1.35;
}

.wp-btn {
	flex: 1;
	height: 96rpx !important;
	min-height: 96rpx !important;
	padding: 0 12rpx !important;
	border-radius: 24rpx !important;
	font-size: 32rpx !important;
	font-weight: 700 !important;
	line-height: 96rpx !important;
	box-sizing: border-box !important;
}

.wp-btn--ghost {
	background: #fff !important;
	color: var(--meng-text) !important;
	border: 2rpx solid rgba(200, 190, 175, 0.85) !important;
}

.wp-btn--primary {
	background: var(--meng-accent-solid) !important;
	color: #fff !important;
	border: none !important;
}

</style>
