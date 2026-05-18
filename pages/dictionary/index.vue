<template>
	<view class="page tab-page-shell dict-page tab-root-page" :style="tabPageStyle">
		<meng-tab-hero
			:status-bar-px="statusBarHeight"
			title="查字"
			:subtitle="dictHeroSubtitle"
			avatar-pose="curious"
		>
			<template #actions>
				<view class="tab-hero-btn" @click="goSettings">
					<text class="tab-hero-btn-icon">⚙️</text>
				</view>
			</template>
		</meng-tab-hero>

		<view class="dict-body tab-dock-overlap tab-content-bleed">
			<view class="glass-card search-card">
				<view class="search-row">
					<text class="search-glyph">🔍</text>
					<input
						v-model="hanziInput"
						class="hanzi-input"
						type="text"
						maxlength="12"
						placeholder="输入汉字，如「萌」"
						confirm-type="search"
						@confirm="runHanziLookup"
					/>
					<view class="search-go" @click="runHanziLookup">
						<text class="search-go-text">查</text>
					</view>
				</view>
				<view
					class="quick-pill quick-pill--rad"
					:class="{ 'quick-pill--on': radicalPanelOn }"
					@click="toggleRadicalPanel"
				>
					<text class="quick-pill-emoji">📖</text>
					<text class="quick-pill-label">部首检索</text>
				</view>
			</view>

		<!-- 部首候选字置顶：选中部首后最先看到，滚动详情时仍吸顶 -->
			<view
				v-if="radicalPanelOn && radicalFilter && radicalHits.length"
				class="glass-card radical-hits-top"
			>
			<view class="radical-hits-top-head">
				<text class="radical-hits-top-title">部首「{{ radicalFilter }}」</text>
				<text class="radical-hits-top-count">共 {{ radicalHits.length }} 字 · 点字查看</text>
			</view>
			<view class="radical-grid radical-grid--top">
				<view
					v-for="(row, i) in radicalHits"
					:key="row.id != null ? row.id : `${row.hanzi}-${i}`"
					class="rad-cell"
					:class="{ 'rad-cell--active': activeEntry && activeEntry.hanzi === row.hanzi }"
					@click="selectGridChar(row.hanzi)"
				>
					<text class="rad-cell-char">{{ row.hanzi }}</text>
				</view>
			</view>
		</view>

			<view v-if="radicalPanelOn" class="glass-card radical-panel">
			<text class="radical-title">按部首筛选 · 全年级识字表 {{ radicalBrowseChars.length }} 字</text>
			<view class="radical-chips">
				<text
					v-for="r in radicalOptions"
					:key="r"
					class="rad-chip"
					:class="radicalFilter === r ? 'rad-chip-on' : ''"
					@click="pickRadical(r)"
				>{{ r }}</text>
			</view>
			<text v-if="radicalFilter && !radicalHits.length" class="radical-count radical-count--empty">
				该部首暂无候选字，请换部首
			</text>
		</view>

			<view v-if="loadingEntry" class="glass-card loading-card">
				<text class="loading-text">加载中…</text>
			</view>
			<view v-else-if="activeEntry" class="glass-card result-card">
			<!-- 左：田字格动画；右：拼音与部首等（并排省纵向空间，便于一屏看完） -->
			<view class="hero-top-row">
				<view class="hero-top-left" @click="playActiveDictionaryPinyin">
					<view class="tianzi-wrap-cnchar" :style="dictStrokeWrapStyle">
						<canvas
							v-if="dictStrokeReady && !dictAnimFallback"
							id="dict-stroke-box"
							canvas-id="dict-stroke-box"
							class="dict-stroke-canvas"
							disable-scroll
							:style="dictStrokeCanvasStyle"
						/>
						<text v-else-if="dictStrokeReady && dictAnimFallback" class="hero-char-fallback">{{ displayHanzi }}</text>
						<text v-else class="hero-char-fallback">{{ displayHanzi }}</text>
					</view>
				</view>
				<view class="hero-top-right">
					<view class="meta-compact" @click="playActiveDictionaryPinyin">
						<view class="meta-compact-row meta-compact-row-py">
							<text class="meta-compact-k">拼音</text>
							<view class="meta-compact-v meta-py-wrap">
								<view v-if="pinyinSyllableTokens.length" class="meta-py-row meta-py-rows-stack">
									<view
										v-for="(tok, ti) in pinyinSyllableTokens"
										:key="'dict-py-' + ti"
										class="meta-py-line-row"
									>
										<!-- <text v-if="pinyinSyllableTokens.length > 1" class="meta-py-line-label">拼音{{ ti + 1 }}</text> -->
										<pinyin-four-lines-row
											class="meta-py-line-core"
											:syllables="[tok]"
											size="md"
										/>
									</view>
								</view>
								<text v-else class="meta-py-fallback font-pinyin">{{ pinyinDisplayPlain }}</text>
							</view>
						</view>
						<view class="meta-compact-row">
							<text class="meta-compact-k">部首</text>
							<text class="meta-compact-v">{{ activeEntry.radical }}</text>
						</view>
						<view class="meta-compact-row">
							<text class="meta-compact-k">结构</text>
							<text class="meta-compact-v">{{ activeEntry.structure }}</text>
						</view>
						<view class="meta-compact-row">
							<text class="meta-compact-k">笔画</text>
							<text class="meta-compact-v">{{ activeEntry.strokes }}</text>
						</view>
						<view v-if="activeEntry.tradForm" class="meta-compact-row meta-compact-row-trad">
							<text class="meta-compact-k">繁体</text>
							<text class="meta-compact-v">{{ activeEntry.tradForm }}</text>
						</view>
						<!-- <view class="meta-compact-speak" @click.stop="playActiveDictionaryPinyin">
							<image class="meta-compact-speak-img" :src="dictSpeakerIconSrc" mode="aspectFit" />
						</view> -->
					</view>
				</view>
			</view>
			<view class="stroke-box">
				<text class="stroke-title">笔顺分解</text>
				<text v-if="activeEntry.strokeShapes" class="stroke-glyphs">{{ activeEntry.strokeShapes }}</text>
				<text v-if="activeEntry.strokeNames" class="stroke-names">{{ activeEntry.strokeNames }}</text>
				<text class="stroke-desc">{{ strokeHint }}</text>
			</view>
			<view v-if="activeEntry.explainText" class="explain-box">
				<text class="explain-title">释义</text>
				<text class="explain-body">{{ activeEntry.explainText }}</text>
			</view>
			<view class="words-box">
				<text class="words-title">组词</text>
				<view class="words-wrap">
					<text v-for="(w, idx) in activeEntry.words" :key="`${w}-${idx}`" class="word-chip">{{ w }}</text>
				</view>
			</view>
			<view class="card-actions">
				<button class="notebook-btn" type="primary" @click="addToNotebook">加入生字本</button>
			</view>
			</view>
			<view v-else class="glass-card empty-card">
				<meng-avatar class="empty-logo" pose="curious" size="md" />
				<text class="empty-title">查一查汉字</text>
				<text class="empty-desc">
					输入汉字看笔顺动画、拼音与组词；也可按部首从当前字库里找字。
				</text>
				<view class="empty-demo" @click="tryDemoChar">
					<text class="empty-demo-text">试试「天」</text>
				</view>
			</view>

			<view class="glass-card detective" @click="playDetective">
				<view class="detective-icon-wrap">
					<meng-avatar pose="book" size="sm" />
				</view>
				<view class="detective-main">
					<text class="detective-label">汉字小侦探</text>
					<text class="detective-clue">{{ currentDetective.clue }}</text>
					<text class="detective-hint">点我揭晓并查看该字</text>
				</view>
			</view>

			<view class="glass-card advanced">
				<view class="advanced-head" @click="showPinyinTools = !showPinyinTools">
					<text class="advanced-toggle">
						{{ showPinyinTools ? '收起拼音筛选' : '拼音筛选（进阶）' }}
					</text>
					<text class="advanced-arrow">{{ showPinyinTools ? '▲' : '▼' }}</text>
				</view>
				<text class="curriculum-hint">{{ summary }}</text>
				<view v-if="showPinyinTools" class="advanced-body">
				<input
					v-model="pinyinKeyword"
					class="pinyin-filter-input"
					type="text"
					placeholder="筛选拼音，如 tian"
					confirm-type="search"
				/>
				<text class="filter-tip">匹配到 {{ filteredChars.length }} 字</text>
				<view v-if="filteredChars.length" class="filter-grid">
					<view
						v-for="(row, i) in filteredChars"
						:key="row.id != null ? row.id : i"
						class="filter-cell"
						@click="selectGridChar(row.hanzi)"
					>
						<text class="filter-cell-char">{{ row.hanzi }}</text>
					</view>
				</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import cnchar from '@/utils/cnchar-setup.js'
import drawNative from '@/utils/draw-native.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import { getAudioNarrator } from '@/utils/audio-settings.js'
import { speakDictionaryEntryPinyin, DICTIONARY_LOCAL_PINYIN_OPTS } from '@/utils/dictionary-pinyin-speak.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import {
	getCurriculumPrefs,
	formatCurriculumSummary,
	formatGradeSemesterLabel
} from '@/utils/curriculum-storage.js'
import { queryAllShiziCurriculumChars, queryCurriculumChars } from '@/utils/curriculum-db.js'
import { getDictionaryEntry, getRadicalLabel } from '@/repositories/dictionary-repository.js'
import { DICTIONARY_RADICAL_PRESETS } from '@/data/dictionary-radical-presets.js'
import { charMatchesRadicalFilter } from '@/utils/dictionary-radical-filter.js'
import { consumeDictionaryPendingHanzi } from '@/utils/dictionary-tab-nav.js'
import { VIP_QUOTA_LIMITS } from '@/constants/vip-quota-limits.js'
import { gateAndPromptWithAd, VIP_FEATURE, QUOTA_KEYS } from '@/utils/vip-gate.js'
import { AD_PLACEMENTS } from '@/constants/ad-placements.js'
import { recordDictLookup } from '@/utils/achievement-stats-storage.js'
import { recordCharLearned } from '@/repositories/learning-repository.js'
import tabMain from '@/mixins/tab-main-page.js'
import MengAvatar from '@/components/meng-avatar.vue'
import MengTabHero from '@/components/meng-tab-hero.vue'
import { MENG_ASSETS } from '@/utils/mengmeng-assets.js'
import {
	MENG_VOICE,
	playMengmengVoice,
	playMengmengVoiceOnce,
	stopMengmengVoice
} from '@/utils/mengmeng-voice.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'

const DETECTIVES = [
	{ clue: '猜一猜「艹 + 明」是什么字？', answer: '萌' },
	{ clue: '「木 + 公」常组成？', answer: '松' },
	{ clue: '三点水加「青」', answer: '清' },
	{ clue: '「日 + 月」并排', answer: '明' },
	{ clue: '「女 + 子」合成', answer: '好' },
	{ clue: '「口 + 巴」是什么字？', answer: '吧' }
]

/** draw-native canvas 绘制边长（与 utils/draw-native 中 length+30 为画布外边一致） */
const DICTIONARY_STROKE_LENGTH = 148

export default {
	mixins: [tabMain],
	components: {
		PinyinFourLinesRow,
		MengAvatar,
		MengTabHero
	},
	data() {
		return {
			assets: MENG_ASSETS,
			dictStrokeReady: false,
			dictAnimFallback: false,
			dictDrawWriter: null,
			dictStrokeMountGen: 0,
			dictStrokeAttachTimer: null,
			dictWordNotFoundRegistered: false,
			summary: '',
			chars: [],
			/** 部首检索：全年级识字表，与当前学习进度无关 */
			radicalBrowseChars: [],
			hanziInput: '',
			pinyinKeyword: '',
			activeEntry: null,
			pinyinDisplay: '',
			loadingEntry: false,
			radicalPanelOn: false,
			radicalFilter: '',
			radicalOptions: [],
			showPinyinTools: false,
			detectiveIndex: 0,
			narrator: 'kid',
			dictPinyinPlaying: false,
			/** 属性区右下角喇叭：按当前条目拼音播本地 opus（与拼音页一致） */
			dictSpeakerIconSrc:
				'data:image/svg+xml,' +
				encodeURIComponent(
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9a9289"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>'
				)
		}
	},
	computed: {
		curriculumChip() {
			return formatGradeSemesterLabel(getCurriculumPrefs())
		},
		dictHeroSubtitle() {
			return `${this.curriculumChip} · 字库 ${this.chars.length} 字`
		},
		pinyinDisplayPlain() {
			const t = String(this.pinyinDisplay || '').replace(/[()（）]/g, '').trim()
			return t || '—'
		},
		pinyinSyllableTokens() {
			const tokens = splitPinyinDisplayTokens(this.pinyinDisplay)
			if (tokens.length) return tokens
			const s = String(this.pinyinDisplay || '').trim().replace(/[()（）]/g, '').trim()
			if (s && s !== '—' && s !== '-') return [s]
			return []
		},
		filteredChars() {
			const kw = this.normalizePinyin(this.pinyinKeyword)
			if (!kw) return this.chars
			return this.chars.filter((row) => {
				let py = this.normalizePinyin(row?.pinyin || '')
				if (!py) {
					const h = String(row?.hanzi || '').trim().charAt(0)
					if (h) {
						try {
							py = this.normalizePinyin(spellDisplayString(h, 'tone', 'poly', 'low'))
						} catch (_) {}
					}
				}
				return py.includes(kw)
			})
		},
		radicalHits() {
			if (!this.radicalFilter) return []
			const rad = this.radicalFilter
			return this.radicalBrowseChars.filter((row) => charMatchesRadicalFilter(row.hanzi, rad))
		},
		strokeHint() {
			if (!this.activeEntry) return ''
			const n = this.activeEntry.strokes
			const tail =
				this.dictStrokeReady && !this.dictAnimFallback
					? '可看左侧动画并对照下方笔画名'
					: '左侧动画加载中，可先对照下方笔画字形'
			return `共 ${n} 笔 · ${tail}`
		},
		dictStrokeCanvasStyle() {
			const px = DICTIONARY_STROKE_LENGTH + 30
			return {
				width: px + 'px',
				height: px + 'px',
				display: 'block'
			}
		},
		/** 外包框与画布逻辑像素一致；原先固定 268rpx 小于 178px 画布会导致右侧、底边被 overflow 裁切 */
		dictStrokeWrapStyle() {
			const px = DICTIONARY_STROKE_LENGTH + 30
			return {
				width: px + 'px',
				height: px + 'px',
				boxSizing: 'border-box'
			}
		},
		currentDetective() {
			return DETECTIVES[this.detectiveIndex % DETECTIVES.length]
		},
		/** 经 cnchar 校验的展示用单字（与 draw/cnchar 数据同源） */
		displayHanzi() {
			const e = this.activeEntry
			if (!e) return ''
			return this.resolveDictHanzi(e.hanzi)
		}
	},
	onShow() {
		this.setTabBarIndex(2)
		this.narrator = getAudioNarrator()
		this.summary = formatCurriculumSummary(getCurriculumPrefs())
		this.reloadDb().then(() => this.applyPendingDictionaryHanzi())
		playMengmengVoiceOnce(MENG_VOICE.DICT_SEARCH_HINT).catch(() => {})
	},
	onHide() {
		stopMengmengVoice()
		stopLocalPinyinAudio()
	},
	onUnload() {
		stopMengmengVoice()
		stopLocalPinyinAudio()
		this.teardownDictStroke()
	},
	methods: {
		registerDictWordNotFoundOnce() {
			if (this.dictWordNotFoundRegistered) return
			drawNative.onWordNotFound(() => {})
			this.dictWordNotFoundRegistered = true
		},
		/** 取 cnchar 认可的单个汉字；非法则返回首字供降级展示 */
		resolveDictHanzi(raw) {
			const c = String(raw || '').trim().charAt(0)
			if (!c) return ''
			try {
				if (typeof cnchar.isCnChar === 'function' && !cnchar.isCnChar(c)) return c
			} catch (_) {}
			return c
		},
		dictDrawSharedOpts(vm) {
			return {
				vm,
				style: {
					length: DICTIONARY_STROKE_LENGTH,
					charInsetRatio: 0.15,
					strokeColor: '#2c3e50',
					outlineColor: '#d5d5d5',
					currentColor: '#e74c3c'
				},
				line: {
					show: true,
					borderColor: '#d7d7d7',
					centerColor: '#cfcfcf',
					diagonalColor: '#e2e2e2'
				},
				watermark: {
					text: 'HanziStroke.com',
					alpha: 0.22,
					fontSize: 10,
					position: 'bottom-right'
				},
				test: {
					onTestStatus: () => {}
				}
			}
		},
		teardownDictStroke() {
			if (this.dictStrokeAttachTimer) {
				clearTimeout(this.dictStrokeAttachTimer)
				this.dictStrokeAttachTimer = null
			}
			this.dictStrokeMountGen++
			this.dictStrokeReady = false
			this.dictAnimFallback = false
			if (this.dictDrawWriter && typeof this.dictDrawWriter.destroy === 'function') {
				this.dictDrawWriter.destroy()
			}
			this.dictDrawWriter = null
		},
		destroyDictWritersOnly() {
			if (this.dictDrawWriter && typeof this.dictDrawWriter.destroy === 'function') {
				this.dictDrawWriter.destroy()
			}
			this.dictDrawWriter = null
		},
		scheduleDictStrokeMount() {
			const hanzi = this.resolveDictHanzi(this.activeEntry && this.activeEntry.hanzi)
			if (!hanzi || typeof drawNative !== 'function') {
				this.dictStrokeReady = false
				this.destroyDictWritersOnly()
				return
			}
			this.registerDictWordNotFoundOnce()
			this.dictStrokeReady = true
			this.dictAnimFallback = false
			this.destroyDictWritersOnly()
			if (this.dictStrokeAttachTimer) {
				clearTimeout(this.dictStrokeAttachTimer)
				this.dictStrokeAttachTimer = null
			}
			const token = ++this.dictStrokeMountGen
			const attach = () => {
				this.dictStrokeAttachTimer = null
				if (token !== this.dictStrokeMountGen) return
				this.mountDictStrokeWriters(hanzi)
			}
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.dictStrokeAttachTimer = setTimeout(attach, 48)
				})
			})
		},
		mountDictStrokeWriters(char) {
			if (typeof drawNative !== 'function') {
				this.dictStrokeReady = false
				return
			}
			const vm = this
			const base = this.dictDrawSharedOpts(vm)
			try {
				this.dictDrawWriter = drawNative(char, {
					...base,
					el: '#dict-stroke-box',
					type: drawNative.TYPE.ANIMATION,
					animation: {
						autoAnimate: true,
						loopAnimate: true,
						strokeAnimationSpeed: 1.15,
						delayBetweenStrokes: 400,
						delayBetweenLoops: 1000
					}
				})
			} catch (e) {
				console.warn('[dictionary] dict animation mount failed', e)
				this.dictDrawWriter = null
				this.dictAnimFallback = true
			}
		},
		async reloadDb() {
			const prefs = getCurriculumPrefs()
			const [chars, radicalBrowseChars] = await Promise.all([
				queryCurriculumChars(prefs),
				queryAllShiziCurriculumChars()
			])
			this.chars = chars
			this.radicalBrowseChars = radicalBrowseChars
			this.rebuildRadicalOptions()
		},
		findCharRow(hanzi) {
			const c = String(hanzi || '').trim()
			if (!c) return null
			return (
				this.chars.find((r) => String(r.hanzi || '').trim() === c) ||
				this.radicalBrowseChars.find((r) => String(r.hanzi || '').trim() === c) ||
				null
			)
		},
		/** 从首页示范等 switchTab 带入的待查字 */
		async applyPendingDictionaryHanzi() {
			const ch = consumeDictionaryPendingHanzi()
			if (!ch) return
			this.hanziInput = ch
			await this.loadEntryForChar(ch)
		},
		rebuildRadicalOptions() {
			const fromDb = new Set()
			for (const row of this.radicalBrowseChars) {
				const ch = String(row.hanzi || '').trim().charAt(0)
				if (!ch) continue
				const rad = getRadicalLabel(ch)
				if (rad && rad !== '—') fromDb.add(rad)
			}
			const extra = [...fromDb]
				.filter((r) => DICTIONARY_RADICAL_PRESETS.indexOf(r) === -1)
				.sort((a, b) => String(a).localeCompare(String(b), 'zh-Hans-CN'))
			this.radicalOptions = [...DICTIONARY_RADICAL_PRESETS, ...extra]
		},
		normalizePinyin(s) {
			return String(s || '')
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.replace(/\s+/g, '')
		},
		firstHanziFromInput(s) {
			const m = String(s || '').match(/[\u4e00-\u9fff]/)
			return m ? m[0] : ''
		},
		async runHanziLookup() {
			const ch = this.firstHanziFromInput(this.hanziInput)
			if (!ch) {
				uni.showToast({ title: '请输入汉字', icon: 'none' })
				return
			}
			const g = await gateAndPromptWithAd(VIP_FEATURE.DAILY_CHARS_SOFT_CAP, {
				quotaKey: QUOTA_KEYS.DICT_LOOKUP,
				quotaLimit: VIP_QUOTA_LIMITS[QUOTA_KEYS.DICT_LOOKUP],
				quotaTitle: '今日查字次数已用完',
				quotaMessage: '免费版每日可查约 18 次。开通会员后查字不限次。',
				adPlacement: AD_PLACEMENTS.DICT_EXTRA_LOOKUPS
			})
			if (!g.ok) return
			await this.loadEntryForChar(ch)
		},
		async loadEntryForChar(ch) {
			const c = String(ch || '').trim().charAt(0)
			if (!c) return
			this.teardownDictStroke()
			this.loadingEntry = true
			this.activeEntry = null
			try {
				const row = this.findCharRow(c)
				const lessonHint = row ? String(row.lesson_hint || '') : ''
				const entry = await getDictionaryEntry(c, lessonHint)
				if (!entry) {
					uni.showToast({ title: '未找到该字', icon: 'none' })
					playMengmengVoice(MENG_VOICE.DICT_NOT_FOUND).catch(() => {})
					return
				}
				this.activeEntry = entry
				this.hanziInput = c
				this.pinyinDisplay = entry.pinyin ? entry.pinyin : '—'
				recordDictLookup()
				this.scheduleDictStrokeMount()
			} finally {
				this.loadingEntry = false
			}
		},
		async playActiveDictionaryPinyin() {
			if (!this.activeEntry?.hanzi || this.dictPinyinPlaying) return
			this.dictPinyinPlaying = true
			try {
				await speakDictionaryEntryPinyin({
					hanzi: this.activeEntry.hanzi,
					// fallbackPinyin: this.pinyinDisplay,
					narrator: this.narrator,
					...DICTIONARY_LOCAL_PINYIN_OPTS
				})
			} finally {
				this.dictPinyinPlaying = false
			}
		},
		/** 部首/字库点选后收起部首区，避免吸顶字表挡住下方田字格（输入框「查」不走此逻辑） */
		collapseRadicalBrowse() {
			this.radicalPanelOn = false
		},
		async selectGridChar(hanzi) {
			const c = String(hanzi || '').trim().charAt(0)
			if (!c) return
			const g = await gateAndPromptWithAd(VIP_FEATURE.DAILY_CHARS_SOFT_CAP, {
				quotaKey: QUOTA_KEYS.DICT_LOOKUP,
				quotaLimit: VIP_QUOTA_LIMITS[QUOTA_KEYS.DICT_LOOKUP],
				quotaTitle: '今日查字次数已用完',
				quotaMessage: '免费版每日可查约 18 次。开通会员后查字不限次。',
				adPlacement: AD_PLACEMENTS.DICT_EXTRA_LOOKUPS
			})
			if (!g.ok) return
			this.collapseRadicalBrowse()
			const row = this.findCharRow(c)
			const fp = row?.pinyin ? String(row.pinyin).replace(/\s+/g, ' ').trim() : ''
			if (!this.dictPinyinPlaying) {
				this.dictPinyinPlaying = true
				try {
					await speakDictionaryEntryPinyin({
						hanzi: c,
						fallbackPinyin: fp,
						narrator: this.narrator,
						...DICTIONARY_LOCAL_PINYIN_OPTS
					})
				} finally {
					this.dictPinyinPlaying = false
				}
			}
			this.hanziInput = c
			this.loadEntryForChar(c)
		},
		tryDemoChar() {
			this.hanziInput = '天'
			this.loadEntryForChar('天')
		},
		toggleRadicalPanel() {
			this.radicalPanelOn = !this.radicalPanelOn
			if (this.radicalPanelOn && !this.radicalOptions.length) this.rebuildRadicalOptions()
		},
		pickRadical(r) {
			this.radicalFilter = this.radicalFilter === r ? '' : r
		},
		addToNotebook() {
			if (!this.activeEntry?.hanzi) return
			recordCharLearned(this.activeEntry.hanzi, getCurriculumPrefs())
			uni.showToast({ title: '已加入生字本（已学字库）', icon: 'success' })
		},
		goSettings() {
			uni.navigateTo({ url: '/pages/settings/curriculum' })
		},
		playDetective() {
			const d = DETECTIVES[this.detectiveIndex % DETECTIVES.length]
			this.detectiveIndex++
			this.loadEntryForChar(d.answer)
			uni.showToast({ title: `揭晓：${d.answer}`, icon: 'none' })
		}
	}
}
</script>

<style scoped>
.dict-page {
	box-sizing: border-box;
}

.dict-body {
	padding: 0 0 24rpx;
	box-sizing: border-box;
}

.glass-card {
	margin-top: 16rpx;
	padding: 20rpx 14rpx;
	border-radius: 24rpx;
	background: rgba(255, 255, 255, 0.9);
	border: 2rpx solid rgba(255, 255, 255, 0.95);
	box-shadow:
		0 8rpx 32rpx rgba(255, 150, 180, 0.1),
		0 12rpx 36rpx var(--meng-shadow, rgba(44, 36, 25, 0.06));
	box-sizing: border-box;
}

.search-card {
	margin-top: 0;
}

.search-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 8rpx 10rpx 8rpx 16rpx;
	border-radius: 20rpx;
	background: #faf8f5;
	border: 2rpx solid var(--meng-border-warm, #e3d9c8);
}

.search-glyph {
	font-size: 30rpx;
	margin-right: 10rpx;
	opacity: 0.85;
}

.hanzi-input {
	flex: 1;
	min-width: 0;
	height: 76rpx;
	font-size: 30rpx;
	color: var(--meng-text, #2c2419);
}

.search-go {
	flex-shrink: 0;
	padding: 0 28rpx;
	height: 68rpx;
	line-height: 68rpx;
	border-radius: 16rpx;
	background: var(--meng-accent-solid);
	box-shadow: 0 6rpx 18rpx var(--meng-shadow-warm, rgba(255, 120, 72, 0.22));
}

.search-go-text {
	font-size: 28rpx;
	font-weight: 800;
	color: #fff;
}

.quick-pill {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	margin-top: 16rpx;
	padding: 18rpx 12rpx;
	border-radius: 18rpx;
	border: 2rpx solid rgba(144, 202, 249, 0.45);
	background: #eef6ff;
}

.quick-pill--on {
	border-color: rgba(255, 140, 170, 0.65);
	background: var(--meng-card);
	box-shadow: 0 0 0 2rpx rgba(255, 107, 157, 0.2);
}

.quick-pill-emoji {
	font-size: 30rpx;
	line-height: 1;
}

.quick-pill-label {
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text, #2c2419);
}

.radical-hits-top {
	position: sticky;
	top: 0;
	z-index: 30;
	border-color: rgba(127, 212, 154, 0.45);
	box-shadow: 0 8rpx 28rpx rgba(90, 160, 110, 0.12);
}

.radical-hits-top-head {
	display: flex;
	flex-direction: row;
	align-items: baseline;
	flex-wrap: wrap;
	margin-bottom: 12rpx;
}

.radical-hits-top-title {
	font-size: 28rpx;
	font-weight: 800;
	color: #3d9a5c;
	margin-right: 12rpx;
}

.radical-hits-top-count {
	font-size: 22rpx;
	color: var(--meng-text-secondary, #6d5e52);
	font-weight: 600;
}

.radical-grid--top {
	margin-top: 0;
	max-height: 42vh;
	overflow-y: auto;
}

.radical-panel {
	padding: 20rpx 18rpx;
}

.radical-title {
	display: block;
	font-size: 24rpx;
	color: var(--meng-text-muted, #8a8076);
	margin-bottom: 14rpx;
}

.radical-chips {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin: -6rpx;
}

.rad-chip {
	margin: 6rpx;
	padding: 10rpx 20rpx;
	border-radius: 999rpx;
	font-size: 26rpx;
	color: var(--meng-text-secondary, #6d5e52);
	background: rgba(255, 255, 255, 0.85);
	border: 2rpx solid rgba(255, 200, 220, 0.35);
}

.rad-chip-on {
	color: #c44d6a;
	font-weight: 700;
	background: #ffd4f0;
	border-color: rgba(255, 120, 160, 0.45);
}

.radical-count {
	display: block;
	font-size: 24rpx;
	color: var(--meng-leaf, #6bae7d);
	margin-top: 12rpx;
	font-weight: 600;
}

.radical-count--empty {
	color: var(--meng-text-muted, #8a8076);
}

.radical-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin-top: 16rpx;
}

.rad-cell {
	flex: 0 0 22%;
	width: 22%;
	max-width: 22%;
	box-sizing: border-box;
	margin-right: 4%;
	margin-bottom: 12rpx;
	min-height: 72rpx;
	background: rgba(255, 255, 255, 0.95);
	border-radius: 14rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2rpx solid rgba(255, 220, 200, 0.5);
}

.rad-cell:nth-child(4n) {
	margin-right: 0;
}

.rad-cell--active {
	background: #fff;
	border-color: #ff8aab;
	box-shadow: 0 4rpx 14rpx rgba(255, 140, 170, 0.2);
}

.rad-cell-char {
	font-size: 38rpx;
	font-weight: 700;
	color: var(--meng-text, #2c2419);
}

.loading-card {
	padding: 48rpx 24rpx;
	text-align: center;
}

.loading-text {
	font-size: 28rpx;
	color: var(--meng-text-muted, #8a8076);
}

.result-card {
	padding: 24rpx 20rpx 28rpx;
}

.hero-top-row {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16rpx;
	margin-bottom: 16rpx;
	box-sizing: border-box;
}

.hero-top-left {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.hero-top-right {
	flex: 1;
	min-width: 0;
	padding-top: 2rpx;
	box-sizing: border-box;
}

.meta-compact {
	position: relative;
	background: #fff5f8;
	border-radius: 16rpx;
	border: 2rpx solid rgba(255, 180, 200, 0.4);
	padding: 14rpx 16rpx;
	box-sizing: border-box;
}

.meta-compact-speak {
	position: absolute;
	right: 6rpx;
	bottom: 6rpx;
	width: 36rpx;
	height: 36rpx;
	padding: 4rpx;
	box-sizing: border-box;
	opacity: 0.92;
}

.meta-compact-speak-img {
	width: 100%;
	height: 100%;
	display: block;
}

.meta-compact-row {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	margin-bottom: 8rpx;
}

.meta-compact-row:last-child {
	margin-bottom: 0;
}

.meta-compact-row-trad .meta-compact-v {
	color: #1565c0;
}

.meta-compact-k {
	flex-shrink: 0;
	width: 64rpx;
	font-size: 22rpx;
	color: var(--meng-text-muted, #8a8076);
	line-height: 1.4;
	padding-top: 2rpx;
}

.meta-compact-v {
	flex: 1;
	min-width: 0;
	font-size: 26rpx;
	font-weight: 600;
	color: var(--meng-text, #2c2419);
	line-height: 1.4;
	word-break: break-all;
}

.meta-compact-row-py {
	align-items: flex-end;
}

.meta-py-row {
	width: 100%;
	min-width: 0;
	box-sizing: border-box;
}

/* 查字：多读音时每行「拼音1」与四线格同一行；仅一条读音时不显示序号 */
.meta-py-rows-stack {
	display: flex;
	flex-direction: column;
	align-items: stretch;
}
.meta-py-line-row {
	display: flex;
	flex-direction: row;
	align-items: flex-end;
	width: 100%;
	box-sizing: border-box;
}
.meta-py-line-row + .meta-py-line-row {
	margin-top: 8rpx;
}
.meta-py-line-label {
	flex-shrink: 0;
	font-size: 22rpx;
	font-weight: 600;
	color: #c44d6a;
	margin-right: 10rpx;
	line-height: 1.2;
	padding-bottom: 4rpx;
}
.meta-py-line-core {
	flex: 1;
	min-width: 0;
}

.meta-py-fallback {
	font-size: 26rpx;
	font-weight: normal;
	color: #4e4e4e;
	line-height: 1.4;
}

/* 外包框尺寸与画布一致（由内联 dictStrokeWrapStyle 控制），田字线由 draw-native 绘制 */
.tianzi-wrap-cnchar {
	margin: 0 auto;
	border-radius: 12rpx;
	overflow: visible;
	padding: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
}

.stroke-anim-caption {
	margin-top: 6rpx;
	font-size: 20rpx;
	color: #8a8279;
	text-align: center;
	line-height: 1.3;
}

.dict-stroke-canvas {
	display: block;
}

.hero-char-fallback {
	font-size: 132rpx;
	line-height: 1;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
}

.tap-speak-tip {
	margin-top: 8rpx;
	font-size: 20rpx;
	color: #b8875c;
	text-align: center;
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	background: #fff8ed;
	border: 1rpx solid #f0e0cc;
}

.stroke-box {
	margin-top: 12rpx;
	padding: 16rpx 18rpx;
	background: var(--meng-leaf-soft, #e8f4ec);
	border-radius: 18rpx;
	border: 2rpx solid rgba(127, 212, 154, 0.35);
}

.stroke-title {
	display: block;
	font-size: 24rpx;
	font-weight: 800;
	color: #3d9a5c;
	margin-bottom: 8rpx;
}

.stroke-glyphs {
	display: block;
	font-size: 30rpx;
	letter-spacing: 3rpx;
	color: var(--meng-text);
	margin-bottom: 8rpx;
	word-break: break-all;
	line-height: 1.35;
}

.stroke-names {
	display: block;
	font-size: 22rpx;
	color: var(--meng-text-secondary, #6d5e52);
	margin-bottom: 10rpx;
	line-height: 1.45;
}

.stroke-desc {
	display: block;
	font-size: 22rpx;
	color: var(--meng-text-secondary, #6d5e52);
	line-height: 1.45;
	margin-bottom: 0;
}

.explain-box {
	margin-top: 14rpx;
	padding: 16rpx 18rpx;
	background: var(--meng-card);
	border-radius: 18rpx;
	border: 2rpx solid rgba(255, 160, 190, 0.4);
}

.explain-title {
	display: block;
	font-size: 24rpx;
	font-weight: 800;
	color: #c44d6a;
	margin-bottom: 10rpx;
}

.explain-body {
	display: block;
	font-size: 24rpx;
	color: var(--meng-text, #2c2419);
	line-height: 1.55;
}

.words-box {
	margin-top: 14rpx;
}

.words-title {
	display: block;
	font-size: 24rpx;
	font-weight: 800;
	color: #1565c0;
	margin-bottom: 12rpx;
}

.words-wrap {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin: -8rpx;
}

.word-chip {
	margin: 6rpx;
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	background: #e3f2fd;
	font-size: 24rpx;
	color: #1565c0;
	font-weight: 600;
}

.card-actions {
	margin-top: 20rpx;
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

.notebook-btn {
	border-radius: 999rpx !important;
	background: var(--meng-leaf, #6bae7d) !important;
	border: none !important;
	font-size: 28rpx !important;
	font-weight: 700 !important;
	color: #fff !important;
}

.empty-card {
	padding: 36rpx 28rpx 32rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	border: 2rpx dashed rgba(255, 160, 190, 0.45);
}

.empty-logo {
	margin-bottom: 16rpx;
}

.empty-title {
	display: block;
	font-size: 34rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
	margin-bottom: 12rpx;
	text-align: center;
}

.empty-desc {
	display: block;
	font-size: 26rpx;
	color: var(--meng-text-secondary, #6d5e52);
	line-height: 1.55;
	margin-bottom: 24rpx;
	text-align: center;
}

.empty-demo {
	padding: 14rpx 36rpx;
	border-radius: 999rpx;
	background: #ffd4f0;
	border: 2rpx solid rgba(255, 120, 160, 0.4);
}

.empty-demo-text {
	font-size: 28rpx;
	font-weight: 700;
	color: #c44d6a;
}

.detective {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	background: var(--meng-banner-soft);
	border-color: rgba(200, 160, 255, 0.35);
}

.detective-icon-wrap {
	width: 80rpx;
	height: 80rpx;
	border-radius: 22rpx;
	background: rgba(255, 255, 255, 0.85);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-right: 16rpx;
}

.detective-emoji {
	font-size: 44rpx;
	line-height: 1;
}

.detective-main {
	flex: 1;
	min-width: 0;
}

.detective-label {
	display: block;
	font-size: 22rpx;
	color: #9c6ade;
	font-weight: 800;
	margin-bottom: 6rpx;
}

.detective-clue {
	display: block;
	font-size: 28rpx;
	color: var(--meng-text, #2c2419);
	line-height: 1.45;
	font-weight: 600;
}

.detective-hint {
	display: block;
	font-size: 22rpx;
	color: #c44d6a;
	margin-top: 10rpx;
}

.advanced {
	padding-bottom: 8rpx;
}

.advanced-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8rpx;
}

.advanced-toggle {
	font-size: 28rpx;
	color: #1565c0;
	font-weight: 800;
}

.advanced-arrow {
	font-size: 22rpx;
	color: var(--meng-text-muted, #8a8076);
}

.curriculum-hint {
	display: block;
	font-size: 22rpx;
	color: var(--meng-text-muted, #8a8076);
	line-height: 1.45;
	margin-bottom: 12rpx;
}

.advanced-body {
	margin-top: 8rpx;
	padding: 18rpx;
	border-radius: 18rpx;
	background: #faf8f5;
	border: 2rpx solid var(--meng-border, #ebe3d8);
}

.pinyin-filter-input {
	height: 72rpx;
	border: 2rpx solid var(--meng-border-warm, #e3d9c8);
	border-radius: 14rpx;
	padding: 0 16rpx;
	font-size: 28rpx;
	background: #fff;
	box-sizing: border-box;
}

.filter-tip {
	display: block;
	font-size: 22rpx;
	color: var(--meng-text-muted, #8a8076);
	margin-top: 10rpx;
}

.filter-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin-top: 16rpx;
}

.filter-cell {
	flex: 0 0 22%;
	width: 22%;
	max-width: 22%;
	box-sizing: border-box;
	margin-right: 4%;
	margin-bottom: 12rpx;
	min-height: 80rpx;
	background: rgba(255, 255, 255, 0.95);
	border-radius: 14rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2rpx solid rgba(255, 220, 200, 0.45);
	box-shadow: 0 2rpx 8rpx rgba(44, 36, 25, 0.05);
}

.filter-cell:nth-child(4n) {
	margin-right: 0;
}

.filter-cell-char {
	font-size: 40rpx;
	font-weight: 600;
	color: var(--meng-text);
}
</style>
