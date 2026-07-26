<template>
	<view class="page">
		<!-- 顶区背景向下延伸，导航浮在上方（仿微信小程序自定义顶栏） -->
		<view class="page-header-bg" :style="headerBgStyle">
			<image class="page-header-bg-img" src="/static/mengmeng/hero-bg.png" mode="aspectFill" />
			<view class="page-header-bg-fade" />
		</view>

		<meng-page-nav :title="navTitle" class="result-nav" @back="goBack">
			<template #right>
				<view class="nav-right" @click="speakCurrentPinyin">
					<text class="nav-right-icon">🔊</text>
				</view>
			</template>
		</meng-page-nav>

		<view v-if="quizPassedForLesson || stationProgressLine" class="station-progress-bar">
			<text v-if="quizPassedForLesson" class="station-quiz-badge">小测验已通过</text>
			<text v-if="stationProgressLine" class="station-progress-num">{{ stationProgressLine }}</text>
		</view>

		<scroll-view scroll-y class="page-scroll">
			<!-- 左缘：属性轨；右侧：田字格 -->
			<view class="hero-section">
				<view class="meta-rail">
					<view class="meta-rail-facts">
						<view class="meta-rail-row">
							<text class="meta-rail-k">部首</text>
							<text class="meta-rail-v">{{ ext.radical || '—' }}</text>
						</view>
						<view class="meta-rail-row">
							<text class="meta-rail-k">结构</text>
							<text class="meta-rail-v">{{ ext.structure || '—' }}</text>
						</view>
						<view
							class="meta-rail-row"
							:class="{
								'meta-rail-row--tap': hasStrokeAnalysis,
								'meta-rail-row--on': showStrokeAnalysis
							}"
							@click.stop="toggleStrokeAnalysis"
						>
							<text class="meta-rail-k">笔画</text>
							<view class="meta-rail-v-row">
								<text class="meta-rail-v meta-rail-v--num">{{
									ext.strokes != null && ext.strokes !== '' ? ext.strokes : '—'
								}}</text>
								<text v-if="hasStrokeAnalysis" class="meta-rail-chevron">{{
									showStrokeAnalysis ? '▴' : '▾'
								}}</text>
							</view>
						</view>
					</view>
					<view class="meta-rail-divider" />
					<view class="meta-rail-actions">
						<view
							class="meta-rail-action"
							:class="{ 'meta-rail-action--on': resultStrokeAnimating }"
							@click.stop="toggleStrokePlayer"
						>
							<text class="meta-rail-action-k">笔顺</text>
							<text class="meta-rail-action-v">{{
								resultStrokeAnimating ? '暂停' : '动画'
							}}</text>
						</view>
					</view>
				</view>
				<view class="hero-stage">
					<view class="hero-center">
						<view class="hero-tianzi-wrap" :style="tianziUnifiedStyle">
						<view class="hero-tianzi-unified">
							<view class="tianzi-pinyin-row">
								<view class="tianzi-pinyin-edge" @click.stop="speakCurrentPinyin">
									<pinyin-four-lines-row
										v-if="pinyinRowSyllables.length"
										class="pinyin-edge-full"
										:syllables="pinyinRowSyllables"
										size="xl"
									/>
									<text v-else class="pinyin-edge-plain font-pinyin">{{ pinyinPlain }}</text>
								</view>
								<view
									class="tianzi-speak-btn"
									:class="{ 'tianzi-speak-btn--playing': dictPinyinPlaying }"
									role="button"
									aria-label="听读音"
									@click.stop="speakCurrentPinyin"
								>
									<image
										v-if="showLabaImg"
										:key="'laba-' + labaImgSrcIndex"
										class="tianzi-speak-img"
										:src="labaImgSrc"
										mode="aspectFit"
										:show-menu-by-longpress="false"
										@error="onLabaImgError"
									/>
									<image
										v-else
										class="tianzi-speak-img tianzi-speak-img--fallback"
										:src="labaFallbackIconSrc"
										mode="aspectFit"
									/>
								</view>
							</view>
							<view class="hero-tianzi-body" @click="speakCurrentPinyin">
								<hanzi-stroke-player
									ref="strokePlayer"
									canvas-id="result-stroke-box"
									:char="displayHanzi"
									:display-pinyin="pinyin"
									:narrator="narrator"
									:length="tianziLength"
									:show-play-fab="false"
									:stroke-audio-enabled="true"
									:hide-stroke-hint="true"
									@animating-change="onStrokeAnimatingChange"
									@click-canvas="speakCurrentPinyin"
								/>
							</view>
						</view>
						</view>
					</view>
					<view v-if="heroWordsList.length" class="hero-words">
						<text class="hero-words-title">组词</text>
						<view class="hero-words-list">
							<text
								v-for="(w, wi) in heroWordsList"
								:key="'hw-' + wi + '-' + w"
								class="hero-words-item"
							>{{ w }}</text>
						</view>
					</view>
					<view v-else class="hero-words hero-words--empty">
						<text class="hero-words-title">组词</text>
						<text class="hero-words-empty">暂无</text>
					</view>
				</view>
			</view>

			<view v-if="hasStrokeAnalysis && showStrokeAnalysis" class="stroke-analysis-full">
				<!-- <text class="stroke-analysis-title">笔顺分解</text> -->
				<text v-if="ext.strokeShapes" class="stroke-analysis-glyphs">{{ ext.strokeShapes }}</text>
				<text v-if="ext.strokeNames" class="stroke-analysis-names">{{ ext.strokeNames }}</text>
			</view>

			<view v-if="ext.tradForm" class="trad-row">
				<text class="trad-k">繁体</text>
				<text class="trad-v">{{ ext.tradForm }}</text>
			</view>

			<text v-if="lessonHint" class="lesson-line">来自：{{ lessonHint }}</text>

			<view v-if="ext.explainText" class="info-card info-explain">
				<text class="info-card-title">释义</text>
				<text class="info-body">{{ ext.explainText }}</text>
			</view>

			<!-- 同站字：折叠下拉 + 纵向列表 -->
			<view v-if="sameLesson.length" class="same-station">
				<view class="same-station-head" @click="toggleSameLessonPanel">
					<text class="same-station-title">同站字（{{ sameLesson.length }}）</text>
					<text class="same-station-chevron">{{ showSameLessonPanel ? '▴' : '▾' }}</text>
				</view>
				<scroll-view
					v-if="showSameLessonPanel"
					scroll-y
					class="same-station-scroll"
					:show-scrollbar="true"
				>
					<view class="same-station-grid">
						<view
							v-for="ch in sameLesson"
							:key="'s-' + ch"
							class="same-station-cell"
							:class="{
								'same-station-cell--current': isSameStationCurrent(ch),
								'same-station-cell--learned': isSameStationLearned(ch)
							}"
							@click="onPickRecoChar(ch)"
						>
							<text class="same-station-char">{{ ch }}</text>
							<text v-if="isSameStationLearned(ch)" class="same-station-learned-tag">已学</text>
						</view>
					</view>
				</scroll-view>
			</view>

			<!-- 相近字 -->
			<view v-if="similarChars.length" class="similar-section">
				<text class="similar-title">相近字</text>
				<view class="similar-chips">
					<view
						v-for="ch in similarChars"
						:key="'p-' + ch"
						class="similar-chip"
						@click="onPickRecoChar(ch)"
					>
						<text class="similar-chip-char">{{ ch }}</text>
					</view>
				</view>
			</view>

			<view class="bottom-spacer" />
		</scroll-view>

		<view class="bottom-bar" :style="bottomBarStyle">
			<button class="bar-btn bar-dictation" @click="goDictation">听写</button>
			<button class="bar-btn bar-quiz" @click="goQuiz">小测</button>
		</view>
	</view>
</template>

<script>
import { getAudioNarrator } from '@/utils/audio-settings.js'
import {
	speakDictionaryEntryPinyin,
	DICTIONARY_LOCAL_PINYIN_OPTS
} from '@/utils/dictionary-pinyin-speak.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { recordCharLearned, recordCharWrong } from '@/repositories/learning-repository.js'
import { getDictionaryEntry, getDictionaryRelated } from '@/repositories/dictionary-repository.js'
import { COL_PROGRESS } from '@/constants/curriculum-schema.js'
import { makeProgressKey, getUserProgressMap } from '@/utils/user-progress-storage.js'
import { buildStoredLessonKey, hasLessonQuizPassed } from '@/utils/user-lesson-progress-storage.js'
import { loadStationCharRows } from '@/utils/load-station-char-rows.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import HanziStrokePlayer from '@/components/hanzi-stroke-player.vue'
import MengPageNav from '@/components/meng-page-nav.vue'
import { getMengNavMetrics, mengHeaderBgHeightStyle } from '@/utils/meng-nav-metrics.js'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import cnchar from '@/utils/cnchar-setup.js'
import {
	MENG_ASSETS,
	buildMengAssetSrcCandidates,
	resolveMengAssetUrl
} from '@/utils/mengmeng-assets.js'
import { navigateToDictionaryHome } from '@/utils/root-nav.js'
import { stopStrokeOrderAudio } from '@/utils/stroke-order-audio.js'
import {
	putLessonDictationTransfer,
	putLessonQuizTransfer
} from '@/utils/lesson-mode-session.js'

export default {
	components: {
		PinyinFourLinesRow,
		HanziStrokePlayer,
		MengPageNav
	},
	data() {
		return {
			statusBarPx: 0,
			assets: MENG_ASSETS,
			/** 听读音图 src 候选下标（App 逐级重试） */
			labaImgSrcIndex: 0,
			labaImgFailed: false,
			narrator: 'kid',
			dictPinyinPlaying: false,
			hanzi: '',
			pinyin: '',
			lessonHint: '',
			/** 关卡人教下标；查字深链可为 null */
			rjLessonIdx: null,
			quizPassedForLesson: false,
			learnedCount: 0,
			stationCharTotal: 0,
			/** 同站已学汉字 → 1，供网格标注 */
			learnedHanziMap: Object.create(null),
			ext: {
				radical: '-',
				structure: '-',
				strokes: '-',
				words: ['暂无组词'],
				explainText: '',
				strokeShapes: '',
				strokeNames: '',
				tradForm: ''
			},
			sameLesson: [],
			sameLessonRows: [],
			similarChars: [],
			resultStrokeAnimating: false,
			/** 笔画顺序（字形/笔名）是否展开 */
			showStrokeAnalysis: false,
			/** 同站字列表是否展开（默认展开） */
			showSameLessonPanel: true,
			/** 点同站/相近字换字序号，用于取消过期读音 */
			recoPickSeq: 0,
			/** 读音代数：打断/换字递增，避免误弹「未播放成功」 */
			speakGen: 0,
			/** 同站字换字防抖 timer */
			recoDebounceTimer: null,
			/** 防抖待切换的目标字 */
			recoPendingChar: '',
			/** 本轮连点开始前已稳定展示的字（用于标记已学） */
			recoSwitchFrom: '',
			/** 听写/小测跳转锁，防止连点打开两页 */
			practiceNavLock: false,
			/** 与 hanzi-stroke-player 默认 length 一致，用于统一拼音/田字格宽度 */
			tianziLength: 142
		}
	},
	computed: {
		tianziShellPx() {
			return this.tianziLength + 30
		},
		tianziUnifiedStyle() {
			return {
				width: `${this.tianziShellPx}px`,
				maxWidth: '100%'
			}
		},
		pinyinRowSyllables() {
			if (this.pinyinSyllableTokens.length) return this.pinyinSyllableTokens
			const s = this.pinyinPlain
			if (s && s !== '—' && s !== '-') return [s]
			return []
		},
		hasStrokeAnalysis() {
			return !!(this.ext.strokeShapes || this.ext.strokeNames)
		},
		labaImgSrcList() {
			return buildMengAssetSrcCandidates(MENG_ASSETS.laba)
		},
		labaImgSrc() {
			const list = this.labaImgSrcList
			if (!list.length) return MENG_ASSETS.laba
			const i = Math.min(this.labaImgSrcIndex, list.length - 1)
			return list[i]
		},
		showLabaImg() {
			return !this.labaImgFailed
		},
		labaFallbackIconSrc() {
			return resolveMengAssetUrl(MENG_ASSETS.laba)
		},
		/** 顶图区高度：状态栏 + 导航 + 向下延伸一段，与下方内容自然衔接 */
		headerBgStyle() {
			return mengHeaderBgHeightStyle(this.statusBarPx, 56)
		},
		bottomBarStyle() {
			return { paddingBottom: 'calc(16rpx + env(safe-area-inset-bottom))' }
		},
		displayHanzi() {
			const c = String(this.hanzi || '').trim().charAt(0)
			if (!c || c === '—') return this.hanzi || '—'
			try {
				if (typeof cnchar.isCnChar === 'function' && !cnchar.isCnChar(c)) return c
			} catch (_) {}
			return c
		},
		pinyinPlain() {
			const t = String(this.pinyin || '').replace(/[()（）]/g, '').trim()
			return t || '—'
		},
		pinyinSyllableTokens() {
			const tokens = splitPinyinDisplayTokens(this.pinyin)
			if (tokens.length) return tokens
			const s = String(this.pinyin || '').trim().replace(/[()（）]/g, '').trim()
			if (s && s !== '—' && s !== '-') return [s]
			return []
		},
		/** 主汉字右侧组词：最多 8 个，一词一行 */
		heroWordsList() {
			const w = this.ext.words
			if (!Array.isArray(w) || !w.length) return []
			const list = w
				.map((x) => String(x || '').trim())
				.filter((x) => x && x !== '暂无组词')
			return list.slice(0, 8)
		},
		navTitle() {
			const h = String(this.lessonHint || '').trim()
			if (h) return h.length > 12 ? `${h.slice(0, 11)}…` : h
			return '查字'
		},
		stationProgressLine() {
			const t = Number(this.stationCharTotal) || 0
			if (!t) return ''
			return `已学 ${this.learnedCount}/${t} 字`
		}
	},
	onLoad(query) {
		this.statusBarPx = getMengNavMetrics().statusBarPx
		this.resetLabaImgSrc()
		this.bootFromQuery(query)
	},
	onShow() {
		this.practiceNavLock = false
		this.statusBarPx = getMengNavMetrics().statusBarPx
		this.narrator = getAudioNarrator()
		this.refreshStationProgress()
	},
	onHide() {
		this.invalidateSpeak()
		this.$refs.strokePlayer?.stopAnimation()
	},
	onUnload() {
		this.clearRecoDebounce()
		this.invalidateSpeak()
		this.$refs.strokePlayer?.stopAnimation()
	},
	methods: {
		clearRecoDebounce() {
			if (this.recoDebounceTimer != null) {
				clearTimeout(this.recoDebounceTimer)
				this.recoDebounceTimer = null
			}
			this.recoPendingChar = ''
			this.recoSwitchFrom = ''
		},
		/** 打断当前读音并作废进行中的 speak，不弹失败 Toast */
		invalidateSpeak() {
			this.speakGen++
			stopLocalPinyinAudio()
			this.dictPinyinPlaying = false
		},
		async bootFromQuery(query) {
			const hanzi = query.hanzi ? decodeURIComponent(query.hanzi) : ''
			const pinyin = query.pinyin ? decodeURIComponent(query.pinyin) : ''
			const lessonHintRaw =
				(query.lesson && decodeURIComponent(query.lesson)) ||
				(query.hint && decodeURIComponent(query.hint)) ||
				''
			const rjRaw = query.rjLesson
			let rjLessonIdx = null
			if (rjRaw != null && rjRaw !== '') {
				const n = Number(rjRaw)
				if (Number.isFinite(n) && n >= 0) rjLessonIdx = n
			}
			this.rjLessonIdx = rjLessonIdx

			const needStation = rjLessonIdx != null || !!String(lessonHintRaw).trim()
			if (needStation) {
				const station = await loadStationCharRows({
					rjLessonIdx,
					lessonHint: lessonHintRaw
				})
				this.applyStationBundle(station)
				const pick =
					String(hanzi || '')
						.trim()
						.charAt(0) ||
					(station.rows[0] && station.rows[0].hanzi) ||
					''
				const hit = station.rows.find((r) => r.hanzi === pick)
				await this.loadResultPage({
					hanzi: pick,
					pinyin: (hit && hit.pinyin) || pinyin,
					lessonHint: station.lessonTitle || lessonHintRaw
				})
				this.refreshStationProgress()
				return
			}

			await this.loadResultPage({
				hanzi,
				pinyin,
				lessonHint: lessonHintRaw
			})
			this.refreshStationProgress()
		},
		applyStationBundle(station) {
			const rows = (station && station.rows) || []
			this.sameLessonRows = rows
			this.sameLesson = rows.map((r) => r.hanzi)
			this.stationCharTotal = rows.length
			if (station && station.lessonTitle) this.lessonHint = station.lessonTitle
			if (station && station.rjLessonIdx != null) this.rjLessonIdx = station.rjLessonIdx
		},
		refreshStationProgress() {
			const prefs = getCurriculumPrefs()
			const rows = this.sameLessonRows || []
			const map = getUserProgressMap()
			const learnedHanziMap = Object.create(null)
			let n = 0
			for (const r of rows) {
				const h = String(r.hanzi || '').trim().charAt(0)
				if (!h) continue
				const key = makeProgressKey(
					prefs.textbook_version_id,
					prefs.grade,
					prefs.semester,
					h
				)
				const rec = map[key]
				if (rec && Number(rec[COL_PROGRESS.learned]) === 1) {
					n++
					learnedHanziMap[h] = 1
				}
			}
			this.learnedHanziMap = learnedHanziMap
			this.learnedCount = n
			this.stationCharTotal = rows.length
			const lk = buildStoredLessonKey(this.rjLessonIdx, this.lessonHint)
			this.quizPassedForLesson = hasLessonQuizPassed(
				{
					textbook_version_id: prefs.textbook_version_id,
					grade: prefs.grade,
					semester: prefs.semester
				},
				lk
			)
		},
		markStationCharLearned(hanzi) {
			const h = String(hanzi || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			if (!h) return
			recordCharLearned(h, getCurriculumPrefs())
			if (!this.learnedHanziMap || !this.learnedHanziMap[h]) {
				this.learnedHanziMap = { ...(this.learnedHanziMap || {}), [h]: 1 }
				this.learnedCount = Object.keys(this.learnedHanziMap).length
			}
		},
		resetLabaImgSrc() {
			this.labaImgSrcIndex = 0
			this.labaImgFailed = false
		},
		onLabaImgError(e) {
			const list = this.labaImgSrcList
			if (this.labaImgSrcIndex < list.length - 1) {
				this.labaImgSrcIndex += 1
				return
			}
			this.labaImgFailed = true
			console.warn('[result] laba.png load failed', this.labaImgSrc, e)
		},
		onStrokeAnimatingChange(v) {
			this.resultStrokeAnimating = !!v
		},
		toggleStrokePlayer() {
			this.$refs.strokePlayer?.toggleAnimation()
		},
		toggleStrokeAnalysis() {
			if (!this.hasStrokeAnalysis) {
				uni.showToast({ title: '暂无笔顺', icon: 'none' })
				return
			}
			this.showStrokeAnalysis = !this.showStrokeAnalysis
		},
		collapseDetailPanels() {
			this.showStrokeAnalysis = false
			this.showSameLessonPanel = true
		},
		toggleSameLessonPanel() {
			this.showSameLessonPanel = !this.showSameLessonPanel
		},
		reloadStrokePlayer() {
			this.$nextTick(() => {
				this.$refs.strokePlayer?.reload()
			})
		},
		/**
		 * 等当前字已写入视图，且田字格 remount 完成（writer 挂好或降级）后再播读音。
		 * remount 内部约 2×nextTick + 48ms 才 attach，固定 80ms 不够。
		 */
		waitRecoUiSettled(expectedChar, timeoutMs = 900) {
			const want = String(expectedChar || this.hanzi || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			return new Promise((resolve) => {
				const deadline = Date.now() + timeoutMs
				const finish = () => {
					this.$nextTick(() => setTimeout(resolve, 32))
				}
				const tick = () => {
					const cur = String(this.hanzi || '')
						.trim()
						.match(/[\u4e00-\u9fff]/)?.[0]
					if (want && cur && cur !== want) {
						resolve()
						return
					}
					const p = this.$refs.strokePlayer
					const playerChar = p
						? String(p.displayChar || p.char || '')
								.trim()
								.charAt(0)
						: ''
					const ready =
						p &&
						p.strokeReady &&
						(!want || playerChar === want) &&
						(p.writer || p.animFallback || !want)
					if (ready) {
						finish()
						return
					}
					if (Date.now() >= deadline) {
						resolve()
						return
					}
					setTimeout(tick, 24)
				}
				this.$nextTick(() => {
					this.$nextTick(() => {
						setTimeout(tick, 56)
					})
				})
			})
		},
		goBack() {
			this.navigateBackAfterAction()
		},
		navigateBackAfterAction() {
			this.invalidateSpeak()
			const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
			if (pages.length > 1) {
				uni.navigateBack({ delta: 1 })
				return
			}
			navigateToDictionaryHome()
		},
		markCurrentAsLearned() {
			const h = String(this.hanzi || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			if (!h) return false
			recordCharLearned(h, getCurriculumPrefs())
			return true
		},
		async loadResultPage(payload) {
			const hanzi = String(payload.hanzi || '').trim()
			let lessonHint = String(payload.lessonHint || '').trim()
			let pinyin = String(payload.pinyin || '').trim()
			this.$refs.strokePlayer?.stopAnimation()
			this.collapseDetailPanels()
			if (!hanzi || hanzi === '—') {
				this.hanzi = hanzi || '—'
				this.pinyin = pinyin
				this.lessonHint = lessonHint
				this.ext = {
					radical: '-',
					structure: '-',
					strokes: '-',
					words: ['暂无组词'],
					explainText: '',
					strokeShapes: '',
					strokeNames: '',
					tradForm: ''
				}
				this.sameLesson = []
				this.sameLessonRows = []
				this.similarChars = []
				this.reloadStrokePlayer()
				return
			}
			const entry = await getDictionaryEntry(hanzi, lessonHint)
			if (entry) {
				pinyin = String(pinyin || entry.pinyin || '').replace(/\s+/g, ' ').trim()
				lessonHint = lessonHint || entry.lessonHint || ''
			} else if (pinyin) {
				pinyin = String(pinyin).replace(/\s+/g, ' ').trim()
			}
			const related = await getDictionaryRelated(hanzi, lessonHint)
			const ext = entry
				? {
						radical: entry.radical,
						structure: entry.structure,
						strokes: entry.strokes,
						words: entry.words,
						explainText: entry.explainText || '',
						strokeShapes: entry.strokeShapes || '',
						strokeNames: entry.strokeNames || '',
						tradForm: entry.tradForm || ''
					}
				: {
						radical: '-',
						structure: '-',
						strokes: '-',
						words: ['暂无组词'],
						explainText: '',
						strokeShapes: '',
						strokeNames: '',
						tradForm: ''
					}
			this.resetLabaImgSrc()
			this.hanzi = hanzi
			this.pinyin = pinyin
			this.lessonHint = lessonHint
			this.ext = ext
			this.similarChars = related.similar || []
			if (this.rjLessonIdx != null) {
				const station = await loadStationCharRows({
					rjLessonIdx: this.rjLessonIdx,
					lessonHint: lessonHint
				})
				this.applyStationBundle(station)
			} else {
				this.sameLesson = related.sameLesson || []
				this.sameLessonRows = related.sameLessonRows || []
				this.stationCharTotal = this.sameLesson.length
			}
			this.refreshStationProgress()
			this.reloadStrokePlayer()
			try {
				uni.pageScrollTo({ scrollTop: 0, duration: 0 })
			} catch (_) {}
		},
		async speakCurrentPinyin() {
			if (!this.hanzi || this.hanzi === '—' || this.dictPinyinPlaying) return
			if (this.resultStrokeAnimating) stopStrokeOrderAudio()
			const gen = ++this.speakGen
			this.dictPinyinPlaying = true
			try {
				const ok = await speakDictionaryEntryPinyin({
					hanzi: this.hanzi,
					fallbackPinyin: this.pinyin,
					narrator: this.narrator,
					...DICTIONARY_LOCAL_PINYIN_OPTS
				})
				// 被换字/连点打断时 gen 已变，不弹误报
				if (!ok && gen === this.speakGen) {
					uni.showToast({ title: '未播放成功，请检查静音或重试', icon: 'none' })
				}
			} finally {
				if (gen === this.speakGen) {
					this.dictPinyinPlaying = false
				}
			}
		},
		markLearned() {
			if (!this.markCurrentAsLearned()) return
			uni.showToast({ title: '已加入学过字库', icon: 'success', duration: 1000 })
			setTimeout(() => this.navigateBackAfterAction(), 450)
		},
		markWrong() {
			const h = String(this.hanzi || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			if (!h) return
			recordCharWrong(h, 1, getCurriculumPrefs())
			uni.showToast({ title: '已加入易错字', icon: 'none', duration: 1000 })
			setTimeout(() => this.navigateBackAfterAction(), 450)
		},
		buildSameStationPracticeRows() {
			const rows = Array.isArray(this.sameLessonRows) ? this.sameLessonRows : []
			if (rows.length) {
				return rows
					.map((r) => ({
						hanzi: String(r.hanzi || '').trim(),
						pinyin: String(r.pinyin || '').trim()
					}))
					.filter((r) => r.hanzi)
			}
			const h = String(this.hanzi || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			if (!h) return []
			return [{ hanzi: h, pinyin: String(this.pinyin || '').trim() }]
		},
		practiceLessonTitle() {
			return String(this.lessonHint || '').trim() || '同站练习'
		},
		goDictation() {
			if (this.practiceNavLock) return
			const rows = this.buildSameStationPracticeRows()
			if (!rows.length) {
				uni.showToast({ title: '暂无可听写的字', icon: 'none' })
				return
			}
			const lessonTitle = this.practiceLessonTitle()
			putLessonDictationTransfer({
				lessonTitle,
				rjLessonIdx: this.rjLessonIdx,
				rows
			})
			let q = ''
			if (this.rjLessonIdx != null) {
				q = `rjLesson=${encodeURIComponent(String(this.rjLessonIdx))}`
			} else {
				q = `hint=${encodeURIComponent(lessonTitle)}`
			}
			this.practiceNavLock = true
			uni.navigateTo({
				url: `/pages/literacy/lesson-dictation?${q}`,
				fail: () => {
					this.practiceNavLock = false
				}
			})
		},
		goQuiz() {
			if (this.practiceNavLock) return
			const rows = this.buildSameStationPracticeRows()
			const uniq = new Set(rows.map((r) => r.hanzi))
			if (uniq.size < 2) {
				uni.showToast({ title: '同站至少需要 2 个字才能小测', icon: 'none' })
				return
			}
			const lessonTitle = this.practiceLessonTitle()
			putLessonQuizTransfer({
				lessonTitle,
				rjLessonIdx: this.rjLessonIdx,
				rows
			})
			let q = ''
			if (this.rjLessonIdx != null) {
				q = `rjLesson=${encodeURIComponent(String(this.rjLessonIdx))}`
			} else {
				q = `hint=${encodeURIComponent(lessonTitle)}`
			}
			this.practiceNavLock = true
			uni.navigateTo({
				url: `/pages/literacy/lesson-quiz?${q}`,
				fail: () => {
					this.practiceNavLock = false
				}
			})
		},
		onPickRecoChar(ch) {
			const c = String(ch || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			if (!c) return
			const prev = String(this.hanzi || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			// 点过即标已学（含点当前字重播）
			this.markStationCharLearned(c)
			// 点当前字（且不在换字防抖中）：正在播则忽略；否则重播
			if (c === prev && !this.recoPendingChar) {
				if (this.dictPinyinPlaying) return
				this.speakCurrentPinyin()
				return
			}
			// 换字：280ms 防抖，连点只保留最后一字
			if (!this.recoPendingChar && prev && prev !== c) {
				this.recoSwitchFrom = prev
			}
			this.invalidateSpeak()
			this.recoPendingChar = c
			// 乐观换字：用同站字池拼音，避免先清空导致拼音/田字格整页闪白
			this.applyOptimisticStationChar(c)
			this.showStrokeAnalysis = false
			if (this.recoDebounceTimer != null) {
				clearTimeout(this.recoDebounceTimer)
			}
			this.recoDebounceTimer = setTimeout(() => {
				this.recoDebounceTimer = null
				const target = this.recoPendingChar
				this.recoPendingChar = ''
				if (target) this.commitRecoCharSwitch(target)
			}, 280)
		},
		/** 同站字池内立刻切汉字+拼音，不清空、不重载列表 */
		applyOptimisticStationChar(c) {
			const h = String(c || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			if (!h) return
			this.hanzi = h
			const hit = (this.sameLessonRows || []).find(
				(r) =>
					String(r.hanzi || '')
						.trim()
						.charAt(0) === h
			)
			const py = hit ? String(hit.pinyin || '').replace(/\s+/g, ' ').trim() : ''
			if (py) this.pinyin = py
		},
		async commitRecoCharSwitch(c) {
			const pickSeq = ++this.recoPickSeq
			const from = this.recoSwitchFrom
			this.recoSwitchFrom = ''
			if (from && from !== c) {
				this.markStationCharLearned(from)
			}
			this.markStationCharLearned(c)
			this.applyOptimisticStationChar(c)
			this.showStrokeAnalysis = false
			this.$refs.strokePlayer?.stopAnimation()
			await this.$nextTick()
			// 轻量换字：只补详情，不整页 loadResultPage（避免重载同站字池/滚顶/二次 remount）
			await this.loadStationCharDetail(c)
			if (pickSeq !== this.recoPickSeq) return
			await this.waitRecoUiSettled(c)
			if (pickSeq !== this.recoPickSeq) return
			const still = String(this.hanzi || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			if (still !== c) return
			await this.speakCurrentPinyin()
		},
		/**
		 * 同站内切换：拉取单字详情更新 meta/组词；不重建同站列表、不 pageScrollTo、不强制 reload 田字格
		 *（田字格随 :char 变更自行 remount）
		 */
		async loadStationCharDetail(hanzi) {
			const h = String(hanzi || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			if (!h) return
			const lessonHint = String(this.lessonHint || '').trim()
			const entry = await getDictionaryEntry(h, lessonHint)
			if (
				String(this.hanzi || '')
					.trim()
					.charAt(0) !== h
			) {
				return
			}
			if (entry) {
				const py = String(entry.pinyin || this.pinyin || '')
					.replace(/\s+/g, ' ')
					.trim()
				if (py) this.pinyin = py
				if (entry.lessonHint && !this.lessonHint) this.lessonHint = entry.lessonHint
				this.ext = {
					radical: entry.radical,
					structure: entry.structure,
					strokes: entry.strokes,
					words: entry.words,
					explainText: entry.explainText || '',
					strokeShapes: entry.strokeShapes || '',
					strokeNames: entry.strokeNames || '',
					tradForm: entry.tradForm || ''
				}
			} else if (!this.pinyin) {
				this.ext = {
					radical: '-',
					structure: '-',
					strokes: '-',
					words: ['暂无组词'],
					explainText: '',
					strokeShapes: '',
					strokeNames: '',
					tradForm: ''
				}
			}
			// 相近字可异步补，失败不影响主展示
			try {
				const related = await getDictionaryRelated(h, this.lessonHint)
				if (
					String(this.hanzi || '')
						.trim()
						.charAt(0) === h
				) {
					this.similarChars = related.similar || []
				}
			} catch (_) {}
			this.refreshStationProgress()
		},
		isSameStationCurrent(ch) {
			const c = String(ch || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			const cur = String(this.hanzi || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			return !!(c && cur && c === cur)
		},
		isSameStationLearned(ch) {
			const c = String(ch || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			if (!c) return false
			return !!(this.learnedHanziMap && this.learnedHanziMap[c])
		}
	}
}
</script>

<style scoped>
.page {
	height: 100vh;
	min-height: 100vh;
	background: var(--meng-page-bg);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	position: relative;
}

/* 顶区背景（延伸至导航栏下方） */
.page-header-bg {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	z-index: 0;
	overflow: hidden;
	pointer-events: none;
}

.page-header-bg-img {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.page-header-bg-fade {
	position: absolute;
	inset: 0;
	background: var(--meng-page-bg);
}

.result-nav {
	position: relative;
	z-index: 2;
	flex-shrink: 0;
}

.station-progress-bar {
	position: relative;
	z-index: 2;
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;
	gap: 12rpx 20rpx;
	padding: 4rpx 28rpx 12rpx;
	box-sizing: border-box;
	flex-shrink: 0;
}

.station-quiz-badge {
	font-size: 22rpx;
	font-weight: 700;
	color: #fff;
	background: #43a047;
	padding: 6rpx 16rpx;
	border-radius: 999rpx;
}

.station-progress-num {
	font-size: 24rpx;
	font-weight: 600;
	color: var(--meng-text-secondary, #6b6560);
}

.nav-right {
	width: 72rpx;
	height: 72rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.nav-right-icon {
	font-size: 36rpx;
}

.page-scroll {
	position: relative;
	z-index: 1;
	flex: 1;
	height: 0;
	width: 100%;
	box-sizing: border-box;
}

/* 整行：左缘属性轨 + 右侧田字格舞台 */
.hero-section {
	width: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	min-height: 320rpx;
	margin-top: -8rpx;
}

.meta-rail {
	flex-shrink: 0;
	width: 136rpx;
	margin-top: 48rpx;
	padding: 16rpx 12rpx 14rpx 10rpx;
	padding-left: calc(10rpx + env(safe-area-inset-left, 0px));
	box-sizing: border-box;
	background: rgba(255, 253, 248, 0.96);
	border: 1rpx solid rgba(255, 170, 100, 0.32);
	border-left: none;
	border-radius: 0 24rpx 24rpx 0;
	box-shadow: 6rpx 8rpx 22rpx rgba(44, 36, 25, 0.08);
}

.meta-rail-facts {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.meta-rail-row {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
}

.meta-rail-row--tap:active {
	opacity: 0.88;
}

.meta-rail-row--on .meta-rail-v,
.meta-rail-row--on .meta-rail-chevron {
	color: #e65100;
}

.meta-rail-k {
	font-size: 20rpx;
	font-weight: 600;
	color: var(--meng-text-muted, #9a9289);
	letter-spacing: 0.04em;
}

.meta-rail-v {
	font-size: 32rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
	line-height: 1.2;
	text-align: center;
	word-break: break-all;
}

.meta-rail-v--num {
	font-size: 34rpx;
	font-variant-numeric: tabular-nums;
	color: #e65100;
}

.meta-rail-v-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 4rpx;
}

.meta-rail-chevron {
	font-size: 18rpx;
	font-weight: 700;
	color: #e65100;
	line-height: 1;
}

.meta-rail-divider {
	height: 1rpx;
	margin: 16rpx 8rpx 12rpx;
	background: rgba(255, 180, 120, 0.45);
}

.meta-rail-actions {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.meta-rail-action {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4rpx;
	min-height: 72rpx;
	padding: 10rpx 6rpx;
	border-radius: 16rpx;
	background: rgba(255, 244, 230, 0.9);
	border: 1rpx solid rgba(255, 154, 69, 0.22);
	box-sizing: border-box;
}

.meta-rail-action:active {
	opacity: 0.88;
	transform: scale(0.98);
}

.meta-rail-action--on {
	background: #ffe8f0;
	border-color: rgba(236, 64, 122, 0.4);
}

.meta-rail-action--on .meta-rail-action-v {
	color: #c2185b;
}

.meta-rail-action--disabled {
	opacity: 0.55;
}

.meta-rail-action-k {
	font-size: 20rpx;
	font-weight: 600;
	color: var(--meng-text-muted, #9a9289);
}

.meta-rail-action-v {
	font-size: 28rpx;
	font-weight: 800;
	color: #e65100;
	letter-spacing: 0.02em;
}

.hero-stage {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: flex-start;
	gap: 12rpx;
	padding: 24rpx 16rpx 12rpx 8rpx;
	box-sizing: border-box;
}

.hero-center {
	position: relative;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-right: 4rpx;
	padding-bottom: 8rpx;
	box-sizing: border-box;
}

.hero-words {
	flex: 1;
	min-width: 0;
	max-width: 200rpx;
	align-self: stretch;
	display: flex;
	flex-direction: column;
	padding: 8rpx 4rpx 8rpx 8rpx;
	box-sizing: border-box;
}

.hero-words--empty {
	justify-content: flex-start;
	opacity: 0.72;
}

.hero-words-title {
	display: block;
	font-size: 22rpx;
	font-weight: 700;
	color: var(--meng-text-muted, #9a9289);
	margin-bottom: 10rpx;
	letter-spacing: 0.06em;
}

.hero-words-list {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 6rpx;
}

.hero-words-item {
	display: block;
	width: 100%;
	font-size: 28rpx;
	font-weight: 700;
	color: var(--meng-text, #2c2419);
	line-height: 1.35;
	word-break: break-all;
}

.hero-words-empty {
	font-size: 26rpx;
	color: var(--meng-text-muted, #9a9289);
}

.hero-tianzi-wrap {
	position: relative;
	flex-shrink: 0;
	box-sizing: border-box;
}

.hero-tianzi-unified {
	position: relative;
	width: 100%;
	background: var(--meng-card-solid);
	border-radius: 28rpx;
	box-shadow: 0 12rpx 36rpx var(--meng-shadow);
	border: 2rpx solid rgba(255, 255, 255, 0.9);
	overflow: hidden;
	box-sizing: border-box;
}

.tianzi-pinyin-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	width: 100%;
	box-sizing: border-box;
	background: #fff8f0;
	border-bottom: 2rpx solid #e8d5c8;
}

.tianzi-speak-btn {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 96rpx;
	padding: 6rpx 10rpx 4rpx 4rpx;
	background: transparent;
	border: none;
}

.tianzi-speak-btn--playing .tianzi-speak-img {
	animation: tianzi-speak-pulse 0.85s ease-in-out infinite;
}

@keyframes tianzi-speak-pulse {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.06);
	}
}

.tianzi-speak-img {
	width: 80rpx;
	height: 80rpx;
	display: block;
}

.tianzi-speak-img--fallback {
	opacity: 0.92;
}

.tianzi-speak-label {
	margin-top: 0;
	font-size: 18rpx;
	font-weight: 700;
	color: var(--meng-tab-active-text);
	white-space: nowrap;
	pointer-events: none;
}

.tianzi-pinyin-edge {
	flex: 1;
	min-width: 0;
	padding: 12rpx 0 10rpx 4rpx;
	box-sizing: border-box;
}

.pinyin-edge-full {
	width: 100%;
	display: block;
}

/* 详情页四线谱：蓝色线 */
.pinyin-edge-full :deep(.pflr-line-top) {
	border-top-color: #42a5f5;
}

.pinyin-edge-full :deep(.pflr-line-dash) {
	border-top-color: rgba(66, 165, 245, 0.78);
}

.pinyin-edge-full :deep(.pflr-line-base) {
	border-top-color: #1e88e5;
}

.pinyin-edge-full :deep(.pflr-line-bottom) {
	border-bottom-color: #42a5f5;
}

.pinyin-edge-full :deep(.pflr-cell:not(:last-child)) {
	border-right-color: rgba(66, 165, 245, 0.4);
}

/* 拼音字形：暖对比色，相对蓝线/米底更醒目 */
.pinyin-edge-full :deep(.pflr-glyph) {
	color: #e65100;
	font-weight: 700;
}

.pinyin-edge-plain {
	display: block;
	text-align: center;
	font-size: 52rpx;
	line-height: 1.2;
	font-weight: 700;
	color: #e65100;
	padding: 12rpx 8rpx;
}

.hero-tianzi-body {
	padding: 6rpx;
	display: flex;
	justify-content: center;
	box-sizing: border-box;
}

.hero-tianzi-body :deep(.hanzi-stroke-player) {
	width: 100%;
}

.hero-tianzi-body :deep(.tianzi-shell) {
	margin: 0 auto;
}

/* 笔顺分解：通栏全宽 */
.stroke-analysis-full {
	width: 100%;
	box-sizing: border-box;
	padding: 20rpx 28rpx 24rpx;
	margin: 0 0 8rpx;
	background: #f9fbe7;
	border-top: 2rpx solid #c5e1a5;
	border-bottom: 2rpx solid #c5e1a5;
}

.stroke-analysis-title {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 12rpx;
}

.stroke-analysis-glyphs {
	display: block;
	width: 100%;
	font-size: 30rpx;
	color: var(--meng-text);
	letter-spacing: 0.14em;
	line-height: 1.5;
	word-break: break-all;
	text-align: center;
	margin-bottom: 8rpx;
}

.stroke-analysis-names {
	display: block;
	width: 100%;
	font-size: 26rpx;
	color: var(--meng-text-secondary);
	line-height: 1.55;
	word-break: break-all;
	text-align: center;
}

.trad-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	margin: 0 28rpx 12rpx;
	padding: 12rpx 20rpx;
	border-radius: 16rpx;
	background: rgba(255, 255, 255, 0.88);
	border: 1rpx solid var(--meng-border);
}

.trad-k {
	font-size: 24rpx;
	color: var(--meng-text-muted);
}

.trad-v {
	font-size: 32rpx;
	font-weight: 700;
	color: var(--meng-text);
}

.lesson-line {
	display: block;
	margin: 0 28rpx 16rpx;
	font-size: 24rpx;
	color: var(--meng-text-muted);
}

/* 快捷操作 */
.quick-actions {
	margin: 0 24rpx 20rpx;
}

.quick-pair {
	display: flex;
	flex-direction: row;
	gap: 16rpx;
}

.quick-pair--single .quick-pill {
	flex: 1;
}

.quick-pill {
	flex: 1;
	text-align: center;
	padding: 18rpx 12rpx;
	border-radius: 999rpx;
	font-size: 26rpx;
	font-weight: 600;
}

.pill-warm {
	background: var(--meng-accent-solid);
	color: #fffef9;
	box-shadow: 0 6rpx 16rpx var(--meng-shadow-warm);
}

.pill-leaf {
	background: var(--meng-leaf);
	color: #fffef9;
}

/* 信息卡 */
.info-card {
	margin: 0 24rpx 16rpx;
	padding: 20rpx 22rpx;
	border-radius: 20rpx;
	background: rgba(255, 255, 255, 0.92);
	border: 1rpx solid var(--meng-border);
}

.info-explain {
	background: #fff8f5;
}

.info-card-title {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 10rpx;
}

.info-glyphs {
	display: block;
	font-size: 30rpx;
	color: var(--meng-text);
	margin-bottom: 6rpx;
	word-break: break-all;
}

.info-names {
	display: block;
	font-size: 24rpx;
	color: var(--meng-text-secondary);
	line-height: 1.45;
}

.info-body {
	display: block;
	font-size: 26rpx;
	color: var(--meng-text);
	line-height: 1.55;
}

/* 同站字 */
.same-station {
	margin: 8rpx 28rpx 20rpx;
	border-radius: 20rpx;
	background: var(--meng-card-solid);
	border: 1rpx solid var(--meng-border-warm, rgba(255, 200, 180, 0.45));
	overflow: hidden;
	box-sizing: border-box;
}

.same-station-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 22rpx 24rpx;
}

.same-station-head:active {
	opacity: 0.9;
}

.same-station-title {
	font-size: 28rpx;
	font-weight: 800;
	color: var(--meng-text);
}

.same-station-chevron {
	font-size: 28rpx;
	color: var(--meng-text-muted, #9a9289);
	margin-left: 12rpx;
}

.same-station-scroll {
	max-height: 360rpx;
	border-top: 1rpx solid rgba(255, 220, 200, 0.5);
	box-sizing: border-box;
}

.same-station-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	padding: 16rpx 16rpx 20rpx;
	gap: 12rpx;
	box-sizing: border-box;
}

.same-station-cell {
	position: relative;
	width: calc((100% - 36rpx) / 4);
	height: 96rpx;
	border-radius: 16rpx;
	background: #fff8f2;
	border: 2rpx solid rgba(255, 154, 69, 0.28);
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.same-station-cell:active {
	opacity: 0.88;
	transform: scale(0.97);
}

.same-station-cell--learned {
	background: #e8f5e9;
	border-color: rgba(76, 175, 80, 0.45);
}

.same-station-cell--current {
	background: #ffe8f0;
	border-color: rgba(236, 64, 122, 0.55);
	box-shadow: 0 0 0 2rpx rgba(236, 64, 122, 0.2);
}

.same-station-cell--current.same-station-cell--learned {
	background: #ffe8f0;
	border-color: rgba(236, 64, 122, 0.55);
}

.same-station-cell--current .same-station-char {
	color: #c2185b;
}

.same-station-char {
	font-size: 40rpx;
	font-weight: 700;
	color: var(--meng-text);
}

.same-station-learned-tag {
	position: absolute;
	right: 4rpx;
	bottom: 4rpx;
	padding: 0 6rpx;
	font-size: 16rpx;
	font-weight: 700;
	line-height: 1.4;
	color: #fff;
	background: #43a047;
	border-radius: 6rpx;
}

.same-station-cell--current .same-station-learned-tag {
	background: #ec407a;
}

/* 相近字 */
.similar-section {
	margin: 0 28rpx 20rpx;
}

.similar-title {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text-secondary);
	margin-bottom: 12rpx;
	padding-left: 4rpx;
}

.similar-chips {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 12rpx;
}

.similar-chip {
	min-width: 72rpx;
	padding: 12rpx 18rpx;
	border-radius: 16rpx;
	background: #e8f4fc;
	border: 2rpx solid #5c9fd6;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.similar-chip:active {
	opacity: 0.9;
}

.similar-chip-char {
	font-size: 36rpx;
	font-weight: 700;
	color: var(--meng-text);
}

.bottom-spacer {
	height: 32rpx;
}

/* 底栏 */
.bottom-bar {
	flex-shrink: 0;
	display: flex;
	flex-direction: row;
	gap: 20rpx;
	padding: 16rpx 24rpx 0;
	background: rgba(255, 252, 248, 0.96);
	border-top: 1rpx solid var(--meng-border);
	box-shadow: 0 -8rpx 24rpx var(--meng-shadow);
}

.bar-btn {
	flex: 1;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 999rpx;
	font-size: 30rpx;
	font-weight: 700;
	border: none;
	padding: 0;
	margin: 0;
}

.bar-btn::after {
	border: none;
}

.bar-dictation {
	background: var(--meng-leaf);
	color: #fffef9;
}

.bar-quiz {
	background: var(--meng-accent-solid);
	color: #fffef9;
	box-shadow: 0 6rpx 18rpx var(--meng-shadow-warm);
}
</style>
