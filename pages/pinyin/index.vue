<template>
	<view class="page tab-root-page pinyin-page" :style="pinyinRootStyle">
		<view class="pinyin-dock">
			<view class="pinyin-dock-glass">
				<scroll-view scroll-x class="pinyin-tab-scroll" :show-scrollbar="false">
					<view class="pinyin-tab-row">
						<view
							v-for="item in tabList"
							:key="item"
							class="pinyin-tab-chip"
							:class="{ 'pinyin-tab-chip--on': activeTab === item }"
							@click="onPickTab(item)"
						>
							<text class="pinyin-tab-chip-text">{{ item }}</text>
						</view>
					</view>
				</scroll-view>

				<view class="pinyin-mode-bar">
					<view class="follow-read-check" @click="toggleFollowReadMode">
						<view class="check-icon" :class="{ 'check-icon--on': followReadMode }">
							<text v-if="followReadMode" class="check-mark">✓</text>
						</view>
						<text class="follow-read-label">跟读模式</text>
					</view>
					<view v-if="pinyinModeStatusText" class="pinyin-mode-status">
						<text
							class="pinyin-mode-status-text"
							:class="{
								'pinyin-mode-status-text--warn': pinyinModeStatusWarn,
								'pinyin-mode-status-text--ok': pinyinModeStatusOk,
								'font-pinyin': pinyinModeStatusUsePinyinFont
							}"
						>{{ pinyinModeStatusText }}</text>
					</view>
					<view class="follow-read-check" @click="toggleAutoReadPrefer">
						<view class="check-icon" :class="{ 'check-icon--on': autoReadPrefer }">
							<text v-if="autoReadPrefer" class="check-mark">✓</text>
						</view>
						<text class="follow-read-label">自动连读</text>
					</view>
				</view>

				<view v-if="activeLegend.length" class="legend">
					<text class="legend-title">颜色分类</text>
					<view class="legend-row">
						<view
							v-for="(leg, li) in activeLegend"
							:key="li + '-' + leg.label"
							class="legend-chip"
							:style="{ backgroundColor: leg.bg, borderColor: leg.bd }"
						>
							<text class="legend-chip-text">{{ leg.label }}</text>
						</view>
					</view>
				</view>

				<view class="pinyin-scroll-wrap">
			<scroll-view
				scroll-y
				class="pinyin-scroll"
				:style="pinyinScrollStyle"
				:scroll-top="pinyinScrollTop"
				scroll-with-animation
				@scroll="onPinyinScroll"
			>
				<view class="pinyin-content">
			<view v-if="mountedTabs['声母']" v-show="activeTab === '声母'" class="pinyin-tab-panel">
				<view
					v-for="sec in tabViewInitial"
					:key="sec.title"
					class="vowel-block"
					:class="{ 'vowel-block--reading': autoReadSectionActive(sec.si, 'initial') }"
				>
					<text class="vowel-block-title">{{ sec.title }}</text>
					<text v-if="sec.desc" class="whole-block-desc">{{ sec.desc }}</text>
					<view class="pinyin-homework-strip">
						<view
							v-for="row in sec.rows"
							:key="row.scrollId"
							class="pinyin-chunk-anchor"
						>
							<view :id="row.scrollPadId" class="pinyin-mascot-scroll-pad" />
							<view
								:id="row.scrollId"
								class="pinyin-homework-wrap"
								:class="{ 'pinyin-homework-wrap--reading': autoReadChunkActive('initial', sec.si, row.ri, row.chunk) }"
							>
								<pinyin-four-lines-row
									size="grid"
									interactive
									:sheet-bg="row.sheetBg"
									:sheet-bd="row.sheetBd"
									:highlight-column-index="autoReadHighlightCol('initial', sec.si, row.ri, row.chunk)"
									:syllables="row.chunk"
									@cell-click="onHomeworkCellSpeak"
								/>
							</view>
						</view>
					</view>
				</view>
			</view>
			<view v-if="mountedTabs['韵母']" v-show="activeTab === '韵母'" class="pinyin-tab-panel">
				<view
					v-for="sec in tabViewVowel"
					:key="sec.title"
					class="vowel-block"
					:class="{ 'vowel-block--reading': autoReadSectionActive(sec.si, 'vowel') }"
				>
					<text class="vowel-block-title">{{ sec.title }}</text>
					<view class="pinyin-homework-strip">
						<view
							v-for="row in sec.rows"
							:key="row.scrollId"
							class="pinyin-chunk-anchor"
						>
							<view :id="row.scrollPadId" class="pinyin-mascot-scroll-pad" />
							<view
								:id="row.scrollId"
								class="pinyin-homework-wrap"
								:class="{ 'pinyin-homework-wrap--reading': autoReadChunkActive('vowel', sec.si, row.ri, row.chunk) }"
							>
								<pinyin-four-lines-row
									size="grid"
									interactive
									:sheet-bg="row.sheetBg"
									:sheet-bd="row.sheetBd"
									:highlight-column-index="autoReadHighlightCol('vowel', sec.si, row.ri, row.chunk)"
									:syllables="row.chunk"
									@cell-click="onHomeworkCellSpeak"
								/>
							</view>
						</view>
					</view>
				</view>
			</view>
			<view v-if="mountedTabs['音调']" v-show="activeTab === '音调'" class="pinyin-tab-panel">
				<view v-for="block in toneTabBlocksData" :key="block.key" class="vowel-block">
					<text class="vowel-block-title">{{ block.title }}</text>
					<view class="tone-wrap">
						<view class="tone-header-row">
							<text v-for="lab in toneColumnLabels" :key="block.key + '-' + lab" class="tone-head-cell">{{ lab }}</text>
						</view>
						<view
							v-for="(row, rowIdx) in block.rows"
							:key="block.key + '-row-' + row.bare"
							class="pinyin-chunk-anchor tone-data-row"
							:class="{ 'tone-data-row--reading': autoReadToneRowActive(block.key, rowIdx) }"
						>
							<view
								:id="autoReadScrollPadIdForToneRow(block.key, rowIdx)"
								class="pinyin-mascot-scroll-pad"
							/>
							<view
								:id="autoReadScrollIdForToneRow(block.key, rowIdx)"
								class="tone-data-row-inner"
							>
							<view class="pinyin-homework-wrap">
								<pinyin-four-lines-row
									size="tone"
									interactive
									:sheet-bg="row.cat.bg"
									:sheet-bd="row.cat.bd"
									:highlight-column-index="autoReadToneHighlightCol(block.key, rowIdx)"
									:syllables="toneRowDisplays(row)"
									@cell-click="onToneHomeworkCell(row, $event)"
								/>
							</view>
							</view>
						</view>
					</view>
				</view>
			</view>
			<view v-if="mountedTabs['整体认读']" v-show="activeTab === '整体认读'" class="pinyin-tab-panel">
				<view
					v-for="sec in tabViewWhole"
					:key="sec.title"
					class="vowel-block"
					:class="{ 'vowel-block--reading': autoReadSectionActive(sec.si, 'whole') }"
				>
					<text class="vowel-block-title">{{ sec.title }}</text>
					<text v-if="sec.desc" class="whole-block-desc">{{ sec.desc }}</text>
					<view class="pinyin-homework-strip">
						<view
							v-for="row in sec.rows"
							:key="row.scrollId"
							class="pinyin-chunk-anchor"
						>
							<view :id="row.scrollPadId" class="pinyin-mascot-scroll-pad" />
							<view
								:id="row.scrollId"
								class="pinyin-homework-wrap"
								:class="{ 'pinyin-homework-wrap--reading': autoReadChunkActive('whole', sec.si, row.ri, row.chunk) }"
							>
								<pinyin-four-lines-row
									size="grid"
									interactive
									:sheet-bg="row.sheetBg"
									:sheet-bd="row.sheetBd"
									:highlight-column-index="autoReadHighlightCol('whole', sec.si, row.ri, row.chunk)"
									:syllables="row.chunk"
									@cell-click="onHomeworkCellSpeak"
								/>
							</view>
						</view>
					</view>
				</view>
			</view>
			<view
				v-if="mountedTabs['拼读练习']"
				v-show="activeTab === '拼读练习'"
				class="pinyin-tab-panel pinyin-homework-strip"
			>
				<view
					v-for="row in tabViewDrillRows"
					:key="row.scrollId"
					class="pinyin-chunk-anchor"
				>
					<view :id="row.scrollPadId" class="pinyin-mascot-scroll-pad" />
					<view
						:id="row.scrollId"
						class="pinyin-homework-wrap"
						:class="{ 'pinyin-homework-wrap--reading': autoReadChunkActive('drill', 0, row.ri, row.chunk) }"
					>
						<pinyin-four-lines-row
							size="grid"
							interactive
							:sheet-bg="row.sheetBg"
							:sheet-bd="row.sheetBd"
							:highlight-column-index="autoReadHighlightCol('drill', 0, row.ri, row.chunk)"
							:syllables="row.chunk"
							@cell-click="onHomeworkCellSpeak"
						/>
					</view>
				</view>
			</view>
				</view>
			</scroll-view>
				</view>

				<view class="pinyin-footer">
					<view class="pinyin-quick-row">
						<view class="pinyin-quick-btn pinyin-quick-btn--drill" @click="goDrill">
							<text class="pinyin-quick-emoji">🎯</text>
							<text class="pinyin-quick-label">闯关</text>
						</view>
						<view
							class="pinyin-quick-btn pinyin-quick-btn--autoread"
							:class="{
								'pinyin-quick-btn--autoread-on': autoReadRunning,
								'pinyin-quick-btn--disabled': followReadBusy
							}"
							@click="toggleAutoReadChain"
						>
							<text class="pinyin-quick-emoji">{{ autoReadRunning ? '⏹' : '▶' }}</text>
							<text class="pinyin-quick-label">{{ autoReadRunning ? '停止连读' : '开始连读' }}</text>
						</view>
						<view
							class="pinyin-quick-btn pinyin-quick-btn--stop"
							:class="{ 'pinyin-quick-btn--disabled': !recording || followReadBusy }"
							@click="stopRecordAndScore"
						>
							<text class="pinyin-quick-emoji">✓</text>
							<text class="pinyin-quick-label">评分</text>
						</view>
					</view>
				</view>
			</view>
		</view>
		<!-- 连读跳动 logo：fixed 全屏层，置于页面 DOM 末尾以保证盖在最上 -->
		<view
			v-if="autoReadRunning && pinyinMascotReady"
			class="pinyin-mascot-layer"
		>
			<view
				class="pinyin-mascot-wrap"
				:class="{ 'pinyin-mascot-wrap--settled': pinyinMascotPosReady }"
				:style="pinyinMascotStyle"
			>
				<view class="pinyin-mascot-hit" @click.stop="onPinyinMascotTap">
					<image
						class="pinyin-mascot"
						:class="pinyinMascotJumping ? 'pinyin-mascot--jump' : ''"
						src="/static/logo.png"
						mode="aspectFit"
					/>
					<text class="pinyin-mascot-hint">点我停止</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getAudioNarrator } from '@/utils/audio-settings.js'
import {
	getFollowReadState,
	getFollowReadHistory,
	startFollowReadRecord,
	stopFollowReadRecord,
	cancelFollowReadAutoStop,
	requestFollowReadScore
} from '@/services/pinyin-follow-read-service.js'
import {
	followReadStatusBarHint,
	followReadToastTitle
} from '@/utils/pinyin-follow-read-ui-messages.js'
import { getPinyinSymbolCategory, legendForTab } from '@/utils/pinyin-pep-category.js'
import { chunkHomeworkSymbols as chunkHomeworkSymbolsByWidth } from '@/utils/pinyin-homework-chunk.js'
import {
	buildHomeworkSectionViews,
	buildHomeworkDrillRows,
	autoReadSlotsFromSectionViews,
	autoReadSlotsFromDrillRows,
	autoReadSlotsFromToneBlocks
} from '@/utils/pinyin-index-tab-views.js'

/** 韵母分块（顺序与教材常见层级一致，自上而下） */
const VOWEL_SECTIONS = [
	{ title: '单韵母(6个)', symbols: ['a', 'o', 'e', 'i', 'u', 'ü'] },
	{ title: '复韵母(8个)', symbols: ['ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe'] },
	{ title: '特殊韵母(1个)', symbols: ['er'] },
	{ title: '前鼻韵母(5个)', symbols: ['an', 'en', 'in', 'un', 'ün'] },
	{ title: '后鼻韵母(4个)', symbols: ['ang', 'eng', 'ing', 'ong'] }
]

/**
 * 声母：按发音部位分块；块与块之间的顺序为人教版常见「字母先后」教学顺序：
 * b p m f → d t n l → g k h → j q x → zh ch sh r → z c s → y w
 */
const INITIAL_SECTIONS = [
	{
		title: '双唇音',
		desc: '上唇与下唇接触成阻。b、p、m',
		symbols: ['b', 'p', 'm']
	},
	{
		title: '唇齿音',
		desc: '上齿与下唇内侧接触成阻。f',
		symbols: ['f']
	},
	{
		title: '舌尖中音',
		desc: '舌尖与上齿龈接触成阻。d、t、n、l',
		symbols: ['d', 't', 'n', 'l']
	},
	{
		title: '舌根音',
		desc: '舌根与软腭接触成阻。g、k、h',
		symbols: ['g', 'k', 'h']
	},
	{
		title: '舌面音',
		desc: '舌面前部与硬腭前部接触成阻。j、q、x',
		symbols: ['j', 'q', 'x']
	},
	{
		title: '舌尖后音（翘舌音）',
		desc: '舌尖与硬腭前部接触成阻。zh、ch、sh、r',
		symbols: ['zh', 'ch', 'sh', 'r']
	},
	{
		title: '舌尖前音（平舌音）',
		desc: '舌尖与上齿背接触成阻。z、c、s',
		symbols: ['z', 'c', 's']
	},
	{
		title: '隔音字母',
		desc: '写在音节开头起隔音作用，读音分别接近韵母 i、u。y、w',
		symbols: ['y', 'w']
	}
]

/** 整体认读：分块 + 说明（与韵母页 vowel-block 一致） */
const WHOLE_READING_SECTIONS = [
	{
		title: '第一类(7个)',
		desc:
			'（zhi、chi、shi、ri、zi、ci、si）它们的韵母不是普通的「i（衣）」，而是发音特殊的「-i」，直接拼读很困难，所以需要整体记住读音。',
		symbols: ['zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si']
	},
	{
		title: '第二类(9个)',
		desc:
			'（yi、wu、yu、ye、yue、yuan、yin、yun、ying）它们按照拼写规则变化而来（如增加 y 或 w，或省略 ü 上两点等）。为不加重拼写规则负担，就作为整体来认读。',
		symbols: ['yi', 'wu', 'yu', 'ye', 'yue', 'yuan', 'yin', 'yun', 'ying']
	}
]
import {
	applyToneToSyllableStem,
	playLocalPinyinNeutralThenTone1,
	playToneGridCell,
	stopLocalPinyinAudio
} from '@/utils/play-pinyin-local-audio.js'
import { speakPinyinSymbolAsync } from '@/utils/speak-pinyin-symbol.js'
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'
import { speakBlendedPinyinSyllable } from '@/utils/hanzi-pinyin-blend-speak.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import tabMain from '@/mixins/tab-main-page.js'

export default {
	mixins: [tabMain],
	components: {
		PinyinFourLinesRow
	},
	data() {
		return {
			tabList: ['声母', '韵母', '整体认读', '音调', '拼读练习'],
			toneColumnLabels: ['一声', '二声', '三声', '四声'],
			activeTab: '声母',
			symbolMap: {
				声母: INITIAL_SECTIONS.flatMap((s) => s.symbols),
				韵母: VOWEL_SECTIONS.flatMap((s) => s.symbols),
				整体认读: WHOLE_READING_SECTIONS.flatMap((s) => s.symbols),
				拼读练习: ['ba', 'bo', 'ma', 'de', 'du', 'ge', 'hua', 'xue', 'qiu', 'zhan', 'cheng', 'shi']
			},
			narrator: 'kid',
			/** 是否正在自动连读（与跟读复选框可同时开启） */
			autoReadRunning: false,
			/** 进入页面 / 切换 Tab 后是否自动开始连读 */
			autoReadPrefer: true,
			autoReadActiveSlot: null,
			/** 连读滚动位置（px），使当前行停在视区中上部而非顶格 */
			pinyinScrollTop: 0,
			_lastPinyinScrollTop: 0,
			/** 自动连读会话 id，用于丢弃过期连读步骤 */
			autoReadRunId: 0,
			/** 连读+跟读时等待录音结束 */
			_autoReadFollowDone: null,
			_autoReadFollowRunId: null,
			/** 开启后点格子：先听示范再自动录音 */
			followReadMode: false,
			followReadTarget: '',
			followReadPlayOpts: null,
			followReadBusy: false,
			recording: false,
			followReadHistory: [],
			lastScoreText: '',
			/** 模式栏中间跟读结果/提示（优先于连读文案） */
			followReadStatusHint: '',
			followReadStatusKind: '',
			_followReadHintTimer: null,
			lastRecordFile: '',
			vowelSections: VOWEL_SECTIONS,
			initialSections: INITIAL_SECTIONS,
			wholeReadingSections: WHOLE_READING_SECTIONS,
			/** scroll-view 高度（px），旧版 Android WebView 需显式高度才能滚动 */
			scrollAreaHeightPx: 0,
			pinyinMascotReady: false,
			/** 滚动到位后再显示，避免先错位再被顶回去 */
			pinyinMascotPosReady: false,
			pinyinMascotJumping: false,
			pinyinMascotStyle: {
				left: '50%',
				top: '0px',
				transform: 'translate(-50%, -50%)'
			},
			_pinyinMascotScrollTimer: null,
			_pinyinMascotScrollEndTimer: null,
			_pinyinMascotScrollAnim: false,
			_pinyinMascotLastRowId: '',
			tabViewInitial: [],
			tabViewVowel: [],
			tabViewWhole: [],
			tabViewDrillRows: [],
			toneTabBlocksData: [],
			_slotsInitial: [],
			_slotsVowel: [],
			_slotsWhole: [],
			_slotsDrill: [],
			_slotsTone: [],
			mountedTabs: { 声母: true },
			_measureScrollTimer: null
		}
	},
	created() {
		this.tabViewInitial = buildHomeworkSectionViews(INITIAL_SECTIONS, 'initial', '声母')
		this.tabViewVowel = buildHomeworkSectionViews(VOWEL_SECTIONS, 'vowel', '韵母')
		this.tabViewWhole = buildHomeworkSectionViews(WHOLE_READING_SECTIONS, 'whole', '整体认读')
		this.tabViewDrillRows = buildHomeworkDrillRows(this.symbolMap['拼读练习'])
		this.toneTabBlocksData = [
			{
				key: 'final',
				title: '韵母',
				rows: this.buildToneRows(this.symbolMap['韵母'] || [], '韵母')
			},
			{
				key: 'whole',
				title: '整体认读',
				rows: this.buildToneRows(this.symbolMap['整体认读'] || [], '整体认读')
			}
		]
		this._slotsInitial = autoReadSlotsFromSectionViews(this.tabViewInitial)
		this._slotsVowel = autoReadSlotsFromSectionViews(this.tabViewVowel)
		this._slotsWhole = autoReadSlotsFromSectionViews(this.tabViewWhole)
		this._slotsDrill = autoReadSlotsFromDrillRows(this.tabViewDrillRows)
		this._slotsTone = autoReadSlotsFromToneBlocks(this.toneTabBlocksData)
	},
	computed: {
		pinyinRootStyle() {
			return this.tabPageStyle || {}
		},
		pinyinScrollStyle() {
			const h = this.scrollAreaHeightPx
			return h > 0 ? { height: `${h}px` } : { height: '65vh' }
		},
		autoReadActiveLabel() {
			return this.autoReadActiveSlot?.symbol || ''
		},
		autoReadActiveSection() {
			return this.autoReadActiveSlot?.sectionTitle || ''
		},
		autoReadBannerKicker() {
			if (this.followReadMode && this.recording) return '连读 · 跟读中'
			if (this.followReadMode && this.followReadBusy) return '连读 · 播放示范'
			if (this.followReadMode) return '连读 · 跟读'
			return '正在连读'
		},
		/** 与页面格子一一对应（启动时已预计算） */
		autoReadSlots() {
			switch (this.activeTab) {
				case '声母':
					return this._slotsInitial
				case '韵母':
					return this._slotsVowel
				case '整体认读':
					return this._slotsWhole
				case '拼读练习':
					return this._slotsDrill
				case '音调':
					return this._slotsTone
				default:
					return []
			}
		},
		autoReadQueue() {
			return this.autoReadSlots
		},
		activeSymbols() {
			if (this.activeTab === '音调') {
				return this.autoReadQueue.map((q) => q.symbol)
			}
			return this.symbolMap[this.activeTab] || []
		},
		activeSymbolEntries() {
			const tab = this.activeTab
			const arr = this.symbolMap[tab] || []
			return arr.map((symbol) => {
				const cat = getPinyinSymbolCategory(symbol, tab)
				return { symbol, bg: cat.bg, bd: cat.bd, key: cat.key }
			})
		},
		activeLegend() {
			if (this.activeTab === '音调' || this.activeTab === '整体认读' || this.activeTab === '声母') return []
			return legendForTab(this.activeTab, this.activeSymbols)
		},
		pinyinModeStatusWarn() {
			return this.followReadStatusKind === 'warn'
		},
		pinyinModeStatusOk() {
			return this.followReadStatusKind === 'ok'
		},
		pinyinModeStatusUsePinyinFont() {
			if (this.recording || this.followReadBusy) return true
			if (this.autoReadRunning) return true
			const h = this.followReadStatusHint || ''
			return /[a-züɑ]/i.test(h)
		},
		/** 工具栏中间一行状态（替代原连读大卡片） */
		pinyinModeStatusText() {
			if (this.followReadBusy) return '播放示范…'
			if (this.recording) {
				const t = String(this.followReadTarget || '').trim()
				return t ? `跟读中 · ${t}` : '跟读中'
			}
			if (this.followReadStatusHint) return this.followReadStatusHint
			if (this.autoReadRunning) {
				const sym = this.autoReadActiveLabel
				const k = this.autoReadBannerKicker
				if (sym) return `${k} · ${sym}`
				return k
			}
			return ''
		}
	},
	onReady() {
		this.scheduleMeasureScrollHeight()
	},
	onShow() {
		this.setTabBarIndex(1)
		this.narrator = getAudioNarrator()
		this.recording = getFollowReadState().recording
		this.followReadHistory = getFollowReadHistory()
		this.scheduleMeasureScrollHeight()
		this.$nextTick(() => {
			this.tryAutoStartReadChain()
		})
	},
	onHide() {
		this.stopAutoReadChain()
		cancelFollowReadAutoStop()
		this.clearFollowReadStatusHint()
	},
	methods: {
		setFollowReadStatusHint(hint, kind = 'warn', ttlMs = 6000) {
			if (this._followReadHintTimer) {
				clearTimeout(this._followReadHintTimer)
				this._followReadHintTimer = null
			}
			this.followReadStatusHint = String(hint || '').trim()
			this.followReadStatusKind = this.followReadStatusHint ? kind : ''
			if (this.followReadStatusHint && ttlMs > 0) {
				this._followReadHintTimer = setTimeout(() => {
					this.followReadStatusHint = ''
					this.followReadStatusKind = ''
					this._followReadHintTimer = null
				}, ttlMs)
			}
		},
		clearFollowReadStatusHint() {
			if (this._followReadHintTimer) {
				clearTimeout(this._followReadHintTimer)
				this._followReadHintTimer = null
			}
			this.followReadStatusHint = ''
			this.followReadStatusKind = ''
		},
		onPickTab(tab) {
			const next = String(tab || '')
			if (!next || next === this.activeTab) return
			if (this.autoReadRunning) {
				this.stopAutoReadChain()
			} else {
				stopLocalPinyinAudio()
				cancelFollowReadAutoStop()
			}
			if (!this.mountedTabs[next]) {
				this.$set(this.mountedTabs, next, true)
			}
			this.activeTab = next
			this.pinyinScrollTop = 0
			this._lastPinyinScrollTop = 0
			this.scheduleMeasureScrollHeight()
			if (this.autoReadPrefer) {
				this.$nextTick(() => {
					setTimeout(() => this.tryAutoStartReadChain(), 150)
				})
			}
		},
		toggleAutoReadPrefer() {
			this.autoReadPrefer = !this.autoReadPrefer
			if (this.autoReadPrefer) {
				this.tryAutoStartReadChain()
			} else if (this.autoReadRunning) {
				this.stopAutoReadChain()
			}
		},
		tryAutoStartReadChain() {
			if (!this.autoReadPrefer || this.autoReadRunning || this.recording || this.followReadBusy) {
				return
			}
			if (!this.autoReadSlots.length) return
			this.startAutoReadChain()
		},
		scheduleMeasureScrollHeight() {
			if (this._measureScrollTimer != null) {
				clearTimeout(this._measureScrollTimer)
			}
			this._measureScrollTimer = setTimeout(() => {
				this._measureScrollTimer = null
				this.measureScrollHeight()
			}, 80)
		},
		sleep(ms) {
			return new Promise((r) => setTimeout(r, ms))
		},
		toggleAutoReadChain() {
			if (this.autoReadRunning) {
				this.stopAutoReadChain()
				uni.showToast({ title: '已停止连读', icon: 'none', duration: 1600 })
				return
			}
			this.startAutoReadChain()
		},
		startAutoReadChain(fromSlot) {
			const queue = this.autoReadSlots
			if (!queue.length) {
				uni.showToast({ title: '当前页暂无可连读内容', icon: 'none' })
				return
			}
			if (this.autoReadRunning) {
				this.stopAutoReadChain()
			}
			this.autoReadRunning = true
			this.pinyinMascotReady = true
			this.autoReadRunId += 1
			const runId = this.autoReadRunId
			const slot = fromSlot || queue[0]
			this.playSlotInChain(slot, runId)
		},
		stopAutoReadChain() {
			this.autoReadRunning = false
			this.pinyinMascotReady = false
			this.pinyinMascotPosReady = false
			this._pinyinMascotLastRowId = ''
			this.clearPinyinMascotScrollTimers()
			this.autoReadRunId += 1
			this.releaseAutoReadFollowWait(false)
			stopLocalPinyinAudio()
			cancelFollowReadAutoStop()
			this.cancelAutoReadSpeech()
			this.setAutoReadHighlight(null)
			if (this.recording) {
				stopFollowReadRecord().catch(() => {})
				this.recording = false
			}
			this.followReadBusy = false
		},
		releaseAutoReadFollowWait(ok) {
			if (typeof this._autoReadFollowDone === 'function') {
				const done = this._autoReadFollowDone
				this._autoReadFollowDone = null
				this._autoReadFollowRunId = null
				done(!!ok)
			}
		},
		cancelAutoReadSpeech() {
			try {
				const synth =
					typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null
				if (synth && typeof synth.cancel === 'function') synth.cancel()
			} catch (_) {}
		},
		withPlayTimeout(promise, ms = 7500) {
			return Promise.race([
				promise,
				new Promise((resolve) => setTimeout(() => resolve(false), ms))
			])
		},
		clearPinyinMascotScrollTimers() {
			if (this._pinyinMascotScrollTimer != null) {
				clearTimeout(this._pinyinMascotScrollTimer)
				this._pinyinMascotScrollTimer = null
			}
			if (this._pinyinMascotScrollEndTimer != null) {
				clearTimeout(this._pinyinMascotScrollEndTimer)
				this._pinyinMascotScrollEndTimer = null
			}
			this._pinyinMascotScrollAnim = false
		},
		setAutoReadHighlight(slot) {
			this.autoReadActiveSlot = slot || null
			const rowId = slot?.scrollId || ''
			if (!rowId) {
				this.pinyinMascotPosReady = false
				this._pinyinMascotLastRowId = ''
				this.clearPinyinMascotScrollTimers()
				return
			}
			const rowChanged = this._pinyinMascotLastRowId !== rowId
			this._pinyinMascotLastRowId = rowId
			if (rowChanged) {
				this._pinyinMascotScrollAnim = true
				this.pinyinMascotPosReady = false
				this.clearPinyinMascotScrollTimers()
				this.$nextTick(() => {
					this.scrollAutoReadToRow(slot, () => {
						this._pinyinMascotScrollAnim = false
						this.$nextTick(() => {
							this.$nextTick(() => {
								this.updatePinyinMascotPosition(true)
							})
						})
					})
				})
			} else {
				this.$nextTick(() => {
					this.$nextTick(() => {
						this.updatePinyinMascotPosition(true)
					})
				})
			}
		},
		/** 连读时把当前作业行滚到视区中上部（约 36%），避免顶格盖住 logo */
		scrollAutoReadToRow(slot, onDone) {
			const anchorId = slot?.scrollId || ''
			if (!anchorId) {
				if (typeof onDone === 'function') onDone()
				return
			}
			const viewH =
				this.scrollAreaHeightPx > 0 ? this.scrollAreaHeightPx : Math.floor((uni.getSystemInfoSync().windowHeight || 600) * 0.55)
			const anchorRatio = 0.36
			const desiredTop = Math.floor(viewH * anchorRatio)

			const query = uni.createSelectorQuery().in(this)
			query.select('.pinyin-scroll').scrollOffset()
			query.select('.pinyin-scroll').boundingClientRect()
			query.select(`#${anchorId}`).boundingClientRect()
			query.exec((res) => {
				const scroll = res && res[0]
				const svRect = res && res[1]
				const rowRect = res && res[2]
				if (!scroll || !svRect || !rowRect) {
					if (typeof onDone === 'function') onDone()
					return
				}
				const current = scroll.scrollTop != null ? scroll.scrollTop : this._lastPinyinScrollTop || 0
				const rowTopInView = rowRect.top - svRect.top
				const finish = () => {
					if (typeof onDone === 'function') onDone()
				}
				if (Math.abs(rowTopInView - desiredTop) < 32) {
					finish()
					return
				}
				const next = Math.max(0, Math.round(current + rowTopInView - desiredTop))
				this.applyPinyinScrollTop(next)
				this._pinyinMascotScrollEndTimer = setTimeout(() => {
					this._pinyinMascotScrollEndTimer = null
					finish()
				}, 420)
			})
		},
		applyPinyinScrollTop(top) {
			const t = Math.max(0, Math.round(top))
			if (t === this.pinyinScrollTop) {
				this.pinyinScrollTop = t + 1
				this.$nextTick(() => {
					this.pinyinScrollTop = t
				})
			} else {
				this.pinyinScrollTop = t
			}
			this._lastPinyinScrollTop = t
		},
		autoReadScrollPadIdForChunk(kind, si, ri) {
			return `pyar-pad-${kind}-${si}-${ri}`
		},
		autoReadScrollPadIdForToneRow(blockKey, rowIdx) {
			return `pyar-pad-tone-${blockKey}-${rowIdx}`
		},
		onPinyinMascotTap() {
			if (!this.autoReadRunning) return
			this.stopAutoReadChain()
			uni.showToast({ title: '已停止连读', icon: 'none', duration: 1600 })
		},
		onPinyinScroll(e) {
			const top = e && e.detail && e.detail.scrollTop
			if (top != null && !Number.isNaN(top)) {
				this._lastPinyinScrollTop = top
			}
			if (!this.autoReadRunning || !this.pinyinMascotReady) return
			if (this._pinyinMascotScrollAnim) return
			if (this._pinyinMascotScrollTimer != null) {
				clearTimeout(this._pinyinMascotScrollTimer)
			}
			this._pinyinMascotScrollTimer = setTimeout(() => {
				this._pinyinMascotScrollTimer = null
				this.updatePinyinMascotPosition(false)
			}, 120)
		},
		updatePinyinMascotPosition(allowBounce) {
			if (!this.autoReadRunning || !this.pinyinMascotReady) return
			const slot = this.autoReadActiveSlot
			if (!slot) return
			const anchorId = slot.scrollId || ''
			if (!anchorId) return
			const colIndex = typeof slot.ci === 'number' ? slot.ci : -1
			const query = uni.createSelectorQuery().in(this)
			query.selectAll(`#${anchorId} .pflr-cols .pflr-cell`).boundingClientRect()
			query.select(`#${anchorId} .pflr-cell--reading`).boundingClientRect()
			query.select(`#${anchorId}`).boundingClientRect()
			query.exec((res) => {
				if (!this.autoReadRunning) return
				const cellRects = res && res[0]
				const readingCell = res && res[1]
				const rowRect = res && res[2]

				let cell = null
				if (Array.isArray(cellRects) && colIndex >= 0 && colIndex < cellRects.length) {
					const c = cellRects[colIndex]
					if (c && c.width > 0) cell = c
				}
				if (!cell && readingCell && readingCell.width > 0) {
					cell = readingCell
				}
				const hTarget = cell && cell.width > 0 ? cell : rowRect
				if (!hTarget || hTarget.width <= 0) return

				let winH = 667
				let safeTop = 12
				let safeBottom = winH - 24
				try {
					const sys = uni.getSystemInfoSync()
					winH = Number(sys.windowHeight) || winH
					safeTop = (Number(sys.statusBarHeight) || 0) + 12
					safeBottom = winH - 100
				} catch (_) {}

				const mascotH = 72
				const centerX = hTarget.left + hTarget.width / 2
				let topY = hTarget.top - 12
				let transform = 'translate(-50%, -100%)'
				if (topY < safeTop) {
					topY = hTarget.top + 4
					transform = 'translate(-50%, 0)'
				}
				topY = Math.max(safeTop, Math.min(topY, safeBottom - mascotH))

				this.pinyinMascotStyle = {
					left: `${centerX}px`,
					top: `${topY}px`,
					transform
				}
				this.pinyinMascotPosReady = true
				if (!allowBounce) return
				this.pinyinMascotJumping = false
				this.$nextTick(() => {
					this.pinyinMascotJumping = true
					setTimeout(() => {
						this.pinyinMascotJumping = false
					}, 520)
				})
			})
		},
		findAutoReadSlot(symbol, asNeutral) {
			const text = String(symbol || '')
			const slots = this.autoReadSlots
			return (
				slots.find((s) => s.symbol === text && !!s.asNeutral === !!asNeutral) ||
				slots.find((s) => s.symbol === text) ||
				null
			)
		},
		autoReadScrollIdForChunk(kind, si, ri, chunk) {
			return `pyar-${kind}-${si}-${ri}`
		},
		autoReadChunkActive(kind, si, ri, chunk) {
			const slot = this.autoReadActiveSlot
			if (!slot || slot.kind !== kind || slot.si !== si || slot.ri !== ri) return false
			return (chunk || []).some((sym, ci) => sym && slot.ci === ci)
		},
		autoReadHighlightCol(kind, si, ri, chunk) {
			const slot = this.autoReadActiveSlot
			if (!slot || slot.kind !== kind || slot.si !== si || slot.ri !== ri) return -1
			const ci = slot.ci
			return chunk && chunk[ci] ? ci : -1
		},
		autoReadSectionActive(si, kind) {
			const slot = this.autoReadActiveSlot
			return !!slot && slot.kind === kind && slot.si === si
		},
		autoReadScrollIdForToneRow(blockKey, rowIdx) {
			return `pyar-tone-${blockKey}-${rowIdx}`
		},
		autoReadToneRowActive(blockKey, rowIdx) {
			const slot = this.autoReadActiveSlot
			return !!slot && slot.kind === 'tone' && slot.blockKey === blockKey && slot.rowIdx === rowIdx
		},
		autoReadToneHighlightCol(blockKey, rowIdx) {
			const slot = this.autoReadActiveSlot
			if (!slot || slot.kind !== 'tone') return -1
			if (slot.blockKey !== blockKey || slot.rowIdx !== rowIdx) return -1
			return slot.ci
		},
		measureScrollHeight() {
			const apply = () => {
				try {
					uni.createSelectorQuery()
						.in(this)
						.select('.pinyin-scroll-wrap')
						.boundingClientRect((rect) => {
							if (rect && rect.height > 0) {
								this.scrollAreaHeightPx = Math.floor(rect.height)
							}
						})
						.exec()
				} catch (_) {}
			}
			this.$nextTick(apply)
		},
		/** 作业本分行（按音节宽度防重叠，见 utils/pinyin-homework-chunk.js） */
		chunkHomeworkSymbols(symbols, options) {
			return chunkHomeworkSymbolsByWidth(symbols, options)
		},
		homeworkSheetColors(entries) {
			const arr = Array.isArray(entries) ? entries : []
			const e = arr.find((x) => x && x.symbol != null && String(x.symbol).trim()) || null
			if (!e) return { bg: '', bd: '' }
			return { bg: e.bg || '', bd: e.bd || '' }
		},
		toneRowDisplays(row) {
			return (row && row.cells ? row.cells : []).map((c) => c.display)
		},
		onHomeworkCellSpeak(payload) {
			if (!payload || payload.syllable == null || payload.syllable === '') return
			this.selectFollowReadTarget(String(payload.syllable), {})
		},
		onToneHomeworkCell(row, payload) {
			const idx = payload && typeof payload.index === 'number' ? payload.index : -1
			const cell = row && row.cells && idx >= 0 ? row.cells[idx] : null
			if (!cell || cell.disabled) return
			this.selectFollowReadTarget(cell.play, { asNeutral: cell.asNeutral })
		},
		selectFollowReadTarget(symbol, opts = {}) {
			const text = String(symbol || '').trim()
			if (!text) return
			this.followReadTarget = text
			this.followReadPlayOpts = opts || {}
			const slot =
				this.findAutoReadSlot(text, opts.asNeutral) ||
				this.buildPlaySlotFromClick(text, opts)
			if (this.autoReadRunning) {
				stopLocalPinyinAudio()
				cancelFollowReadAutoStop()
				this.releaseAutoReadFollowWait(false)
				this.autoReadRunId += 1
				const runId = this.autoReadRunId
				if (slot) {
					this.playSlotInChain(slot, runId)
				}
				return
			}
			if (this.followReadMode) {
				this.runFollowReadSession(text, opts, slot)
				return
			}
			this.speakSymbolOnce(text, opts, slot)
		},
		buildPlaySlotFromClick(symbol, opts) {
			const text = String(symbol || '').trim()
			if (!text) return null
			return {
				kind: 'click',
				symbol: text,
				asNeutral: !!opts.asNeutral,
				slotKey: `click|${text}|${opts.asNeutral ? 1 : 0}`,
				scrollId: '',
				sectionTitle: ''
			}
		},
		buildToneRows(symbols, categoryTab) {
			return (symbols || []).map((sym) => {
				const bare = stripPinyinToneMarks(String(sym).trim().toLowerCase())
				const cat = getPinyinSymbolCategory(sym, categoryTab)
				const cells = [1, 2, 3, 4].map((t) => {
					const stem = applyToneToSyllableStem(bare, t)
					return {
						display: stem || '—',
						play: stem,
						asNeutral: false,
						disabled: !stem
					}
				})
				return { bare: sym, cat, cells }
			})
		},
		entriesForSymbols(symbols) {
			const tab = this.activeTab
			return (symbols || []).map((symbol) => {
				if (symbol == null || !String(symbol).trim()) return null
				const cat = getPinyinSymbolCategory(symbol, tab)
				return { symbol, bg: cat.bg, bd: cat.bd, key: cat.key }
			})
		},
		entriesForWholeReading(symbols) {
			const tab = '整体认读'
			return (symbols || []).map((symbol) => {
				if (symbol == null || !String(symbol).trim()) return null
				const cat = getPinyinSymbolCategory(symbol, tab)
				return { symbol, bg: cat.bg, bd: cat.bd, key: cat.key }
			})
		},
		entriesForInitial(symbols) {
			const tab = '声母'
			return (symbols || []).map((symbol) => {
				if (symbol == null || !String(symbol).trim()) return null
				const cat = getPinyinSymbolCategory(symbol, tab)
				return { symbol, bg: cat.bg, bd: cat.bd, key: cat.key }
			})
		},
		async playReferenceSymbol(symbol, opts = {}) {
			const text = String(symbol || '').trim()
			if (!text) return false
			const narrator = this.narrator
			const asNeutral = !!(opts && opts.asNeutral)
			const playTask = async () => {
				if (this.activeTab === '音调') {
					return playToneGridCell(text, { asNeutral, narrator })
				}
				if (this.activeTab === '整体认读') {
					const played = await playLocalPinyinNeutralThenTone1(text, true)
					if (played) return true
					return speakPinyinSymbolAsync(text, narrator)
				}
				const useTone1Fb = this.activeTab === '拼读练习'
				const blend = this.activeTab === '拼读练习'
				return speakBlendedPinyinSyllable(text, {
					narrator,
					useTone1Fb,
					blend,
					showFailToast: !this.autoReadRunning
				})
			}
			const ok = await this.withPlayTimeout(playTask(), 7500)
			if (!ok) {
				stopLocalPinyinAudio()
				this.cancelAutoReadSpeech()
			}
			return !!ok
		},
		async speakSymbolOnce(symbol, opts, slotHint) {
			const text = String(symbol || '').trim()
			if (!text) return
			const slot = slotHint || this.findAutoReadSlot(text, opts?.asNeutral)
			if (slot?.scrollId) {
				this.setAutoReadHighlight(slot)
			}
			await this.playReferenceSymbol(text, opts)
			if (!this.autoReadRunning) {
				await this.sleep(480)
				if (!this.autoReadRunning) {
					this.setAutoReadHighlight(null)
				}
			}
		},
		async playSlotInChain(slot, runId) {
			if (!this.autoReadRunning || runId !== this.autoReadRunId || !slot) return

			const text = String(slot.symbol || '').trim()
			if (!text) {
				this.advanceAutoReadChain(slot, runId)
				return
			}
			const opts = { asNeutral: !!slot.asNeutral }
			this.followReadTarget = text
			this.followReadPlayOpts = opts
			if (slot.scrollId) {
				this.setAutoReadHighlight(slot)
			}

			const t0 = Date.now()
			const blend = this.activeTab === '拼读练习'
			const ok = await this.playReferenceSymbol(text, opts)
			if (!this.autoReadRunning || runId !== this.autoReadRunId) return

			if (this.followReadMode) {
				const frOk = await this.waitFollowReadUntilDone(text, opts, runId)
				if (!this.autoReadRunning || runId !== this.autoReadRunId) return
				if (!frOk) {
					this.stopAutoReadChain()
					return
				}
			} else {
				let delayMs = 380
				if (blend && ok) {
					delayMs = Math.max(520, Date.now() - t0 + 280)
				} else if (ok) {
					delayMs = 520
				} else {
					delayMs = 320
				}
				await this.sleep(delayMs)
			}

			if (!this.autoReadRunning || runId !== this.autoReadRunId) return
			this.advanceAutoReadChain(slot, runId)
		},
		advanceAutoReadChain(currentSlot, runId) {
			if (!this.autoReadRunning || runId !== this.autoReadRunId) return
			const queue = this.autoReadSlots
			const idx = currentSlot
				? queue.findIndex((q) => q.slotKey === currentSlot.slotKey)
				: -1
			const nextSlot = idx >= 0 && idx < queue.length - 1 ? queue[idx + 1] : null
			if (nextSlot) {
				this.playSlotInChain(nextSlot, runId)
			} else {
				this.autoReadRunning = false
				this.pinyinMascotReady = false
				this.pinyinMascotPosReady = false
				this.setAutoReadHighlight(null)
				uni.showToast({ title: '连读完成', icon: 'none', duration: 1800 })
			}
		},
		waitFollowReadUntilDone(symbol, opts, runId) {
			const text = String(symbol || '').trim()
			if (!text) return Promise.resolve(false)
			if (!this.autoReadRunning || runId !== this.autoReadRunId) {
				return Promise.resolve(false)
			}
			if (this.recording || this.followReadBusy) {
				return Promise.resolve(false)
			}
			return new Promise((resolve) => {
				this._autoReadFollowDone = resolve
				this._autoReadFollowRunId = runId
				startFollowReadRecord({
					symbol: text,
					autoStop: true,
					onAutoStop: (stopRes) => this.onFollowReadAutoEnded(stopRes)
				}).then((res) => {
					if (!this.autoReadRunning || runId !== this.autoReadRunId) {
						this.releaseAutoReadFollowWait(false)
						return
					}
					if (!res.ok) {
						this.releaseAutoReadFollowWait(false)
						uni.showToast({ title: res.message || '无法开始录音', icon: 'none' })
						return
					}
					this.recording = true
					this.lastScoreText = ''
					this.clearFollowReadStatusHint()
				})
			})
		},
		async runFollowReadSession(symbol, opts, slotHint) {
			const text = String(symbol || '').trim()
			if (!text) {
				uni.showToast({ title: '请先点选要跟读的拼音', icon: 'none' })
				return
			}
			if (this.followReadBusy || this.recording) return
			if (this.autoReadRunning) {
				this.stopAutoReadChain()
			}
			this.followReadTarget = text
			this.followReadPlayOpts = opts || {}
			if (slotHint?.scrollId) {
				this.setAutoReadHighlight(slotHint)
			}
			this.followReadBusy = true
			stopLocalPinyinAudio()
			const played = await this.playReferenceSymbol(text, opts)
			await this.sleep(played ? 420 : 120)
			this.followReadBusy = false
			if (!played) {
				uni.showToast({ title: '示范播放失败，请重试', icon: 'none' })
				return
			}
			const res = await startFollowReadRecord({
				symbol: text,
				autoStop: true,
				onAutoStop: (stopRes) => this.onFollowReadAutoEnded(stopRes)
			})
			if (!res.ok) {
				uni.showToast({ title: res.message || '无法开始录音', icon: 'none' })
				return
			}
			this.recording = true
			this.lastScoreText = ''
			this.clearFollowReadStatusHint()
		},
		async onFollowReadAutoEnded(stopRes) {
			if (!this.recording) return
			await this.finishFollowReadScoring(stopRes, true)
		},
		goDrill() {
			uni.navigateTo({ url: '/pages/pinyin/drill' })
		},
		goGuardian() {
			uni.navigateTo({ url: '/pages/settings/guardian' })
		},
		toggleFollowReadMode() {
			this.followReadMode = !this.followReadMode
			if (!this.followReadMode) {
				this.clearFollowReadStatusHint()
			}
		},
		async stopRecordAndScore() {
			if (!this.recording) return
			cancelFollowReadAutoStop()
			const stopRes = await stopFollowReadRecord()
			await this.finishFollowReadScoring(stopRes, false)
		},
		async finishFollowReadScoring(stopRes, autoEnded) {
			this.recording = false
			const chainRunId = this._autoReadFollowRunId
			const chainWait = typeof this._autoReadFollowDone === 'function'
			if (!stopRes?.ok) {
				if (chainWait) {
					this.releaseAutoReadFollowWait(false)
					if (this.autoReadRunning && chainRunId === this.autoReadRunId) {
						this.stopAutoReadChain()
					}
				}
				const failMsg = stopRes?.message || '录音结束失败'
				if (this.followReadMode) {
					this.setFollowReadStatusHint('没听清，请靠近麦克风', 'warn', 6500)
				}
				uni.showToast({ title: failMsg, icon: 'none' })
				return
			}
			this.lastRecordFile = stopRes.tempFilePath || ''
			const symbol = String(this.followReadTarget || '').trim() || this.activeSymbols[0] || ''
			const scoreRes = await requestFollowReadScore({
				symbol,
				durationMs: stopRes.durationMs,
				sampleRate: stopRes.sampleRate,
				tempFilePath: stopRes.tempFilePath,
				recordFormat: stopRes.recordFormat
			})
			this.followReadHistory = getFollowReadHistory()
			const verdict = scoreRes.details?.verdict || ''
			if (scoreRes.ok && scoreRes.pass) {
				this.lastScoreText = `跟读 ${scoreRes.score} 分 · 与示范音相似 ${scoreRes.details?.targetMatch ?? 0}%`
				this.setFollowReadStatusHint(
					scoreRes.statusHint || `跟读 ${scoreRes.score} 分`,
					'ok',
					2800
				)
			} else {
				this.lastScoreText = scoreRes.message || '跟读未通过，请再试一次'
				const hint =
					scoreRes.statusHint ||
					followReadStatusBarHint(verdict, symbol)
				const hintTtl =
					verdict === 'analysis_error' || verdict === 'decode_error' ? 8000 : 6500
				this.setFollowReadStatusHint(hint, 'warn', hintTtl)
			}
			if (!chainWait) {
				uni.showToast({
					title: followReadToastTitle(scoreRes, symbol),
					icon: 'none',
					duration: scoreRes.ok && scoreRes.pass ? 1800 : 2600
				})
			}
			if (chainWait) {
				this.releaseAutoReadFollowWait(true)
			}
		}
	}
}
</script>

<style scoped>
.pinyin-page {
	min-height: 100vh;
	height: 100vh;
	max-height: 100vh;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	overflow: hidden;
	padding-left: 0;
	padding-right: 0;
	background: var(--meng-page-bg);
}

.pinyin-dock {
	position: relative;
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.pinyin-dock-glass {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	margin: 12rpx 20rpx 16rpx;
	padding: 22rpx 20rpx 16rpx;
	border-radius: 40rpx 40rpx 28rpx 28rpx;
	background: rgba(255, 255, 255, 0.9);
	border: 2rpx solid rgba(255, 255, 255, 0.95);
	box-shadow:
		0 -12rpx 48rpx rgba(255, 150, 180, 0.1),
		0 16rpx 40rpx var(--meng-shadow);
	/* #ifdef H5 */
	backdrop-filter: blur(24px);
	/* #endif */
}

.pinyin-tab-scroll {
	width: 100%;
	flex-shrink: 0;
	margin-bottom: 18rpx;
}

.pinyin-tab-row {
	display: flex;
	flex-direction: row;
	white-space: nowrap;
	padding: 4rpx 0;
}

.pinyin-tab-chip {
	display: inline-flex;
	padding: 12rpx 24rpx;
	margin-right: 12rpx;
	border-radius: 999rpx;
	background: rgba(255, 240, 248, 0.92);
	border: 2rpx solid rgba(255, 180, 200, 0.22);
}

.pinyin-tab-chip--on {
	background: linear-gradient(135deg, #ffe0ec 0%, #ffd4f0 100%);
	border-color: var(--meng-chip-active-border);
	box-shadow: 0 6rpx 16rpx rgba(255, 120, 160, 0.18);
}

.pinyin-tab-chip-text {
	font-size: 24rpx;
	color: var(--meng-text-secondary);
	font-weight: 500;
}

.pinyin-tab-chip--on .pinyin-tab-chip-text {
	color: #c44d6a;
	font-weight: 700;
}

.pinyin-mode-bar {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: nowrap;
	gap: 10rpx;
	flex-shrink: 0;
	margin-bottom: 10rpx;
}

.pinyin-mode-status {
	flex: 1;
	min-width: 0;
	padding: 0 6rpx;
	text-align: center;
}

.pinyin-mode-status-text {
	display: block;
	font-size: 22rpx;
	font-weight: 600;
	color: #c44d6a;
	line-height: 1.35;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pinyin-mode-status-text--warn {
	color: #b84a20;
}

.pinyin-mode-status-text--ok {
	color: #2a8f5c;
}

.follow-read-check {
	flex-shrink: 0;
}

.pinyin-scroll-wrap {
	flex: 1;
	min-height: 0;
	width: 100%;
	overflow: hidden;
}

/* 全页最上层浮动层（fixed），logo 不被 glass / scroll 裁切 */
.pinyin-mascot-layer {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 9999;
	pointer-events: none;
	overflow: visible;
}

.pinyin-content {
	padding-bottom: 8rpx;
}

.pinyin-tab-panel {
	width: 100%;
	box-sizing: border-box;
}

/* 拼音页放大四线格，便于点读 */
.pinyin-content :deep(.pflr--grid) {
	--pfl-cell-h: 168rpx;
}

.pinyin-content :deep(.pflr--tone) {
	--pfl-cell-h: 132rpx;
}

.pinyin-footer {
	flex-shrink: 0;
	margin-top: 10rpx;
	padding-top: 12rpx;
	border-top: 2rpx solid var(--meng-border);
}

.pinyin-quick-row {
	display: flex;
	flex-direction: row;
	gap: 14rpx;
}

.pinyin-quick-btn {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 14rpx 8rpx;
	border-radius: 22rpx;
	box-shadow: 0 8rpx 20rpx rgba(44, 36, 25, 0.08);
}

.pinyin-quick-btn--drill {
	background: linear-gradient(160deg, #b8e8c8 0%, #7fd49a 100%);
}

.pinyin-quick-btn--autoread {
	background: linear-gradient(145deg, var(--meng-accent-from) 0%, var(--meng-accent-to) 100%);
}

.pinyin-quick-btn--autoread-on {
	background: linear-gradient(145deg, #8a9aaa 0%, #6b7d8c 100%);
}

.pinyin-quick-btn--stop {
	background: linear-gradient(145deg, #ffb3c8 0%, #ff6b9d 100%);
}

.pinyin-quick-btn--disabled {
	opacity: 0.45;
	pointer-events: none;
}

.pinyin-quick-emoji {
	font-size: 32rpx;
	line-height: 1.2;
}

.pinyin-quick-label {
	margin-top: 4rpx;
	font-size: 22rpx;
	font-weight: 700;
	color: #fff;
	text-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.1);
}

.pinyin-mascot-wrap {
	position: fixed;
	z-index: 10000;
	display: flex;
	flex-direction: column;
	align-items: center;
	pointer-events: none;
	opacity: 0;
	visibility: hidden;
	overflow: visible;
}

.pinyin-mascot-wrap--settled {
	opacity: 1;
	visibility: visible;
	transition: opacity 0.2s ease;
}

.pinyin-mascot-hit {
	display: flex;
	flex-direction: column;
	align-items: center;
	pointer-events: auto;
}

.pinyin-mascot {
	width: 88rpx;
	height: 88rpx;
	filter: drop-shadow(0 8rpx 16rpx rgba(196, 77, 106, 0.28));
}

.pinyin-mascot-hint {
	margin-top: 4rpx;
	padding: 6rpx 14rpx;
	font-size: 18rpx;
	font-weight: 700;
	color: #fff;
	background: rgba(196, 77, 106, 0.88);
	border-radius: 999rpx;
	line-height: 1.3;
	white-space: nowrap;
}

.pinyin-mascot-hit:active .pinyin-mascot-hint {
	opacity: 0.88;
}

.pinyin-mascot--jump {
	animation: pinyin-mascot-bounce 0.52s ease;
}

@keyframes pinyin-mascot-bounce {
	0% {
		transform: translateY(0) scale(1);
	}
	38% {
		transform: translateY(-20rpx) scale(1.08);
	}
	68% {
		transform: translateY(6rpx) scale(0.96);
	}
	100% {
		transform: translateY(0) scale(1);
	}
}

.pinyin-chunk-anchor {
	width: 100%;
	box-sizing: border-box;
}

.pinyin-mascot-scroll-pad {
	width: 100%;
	height: 8rpx;
	flex-shrink: 0;
	pointer-events: none;
}

.tone-data-row.pinyin-chunk-anchor {
	flex-direction: column;
	align-items: stretch;
}

.tone-data-row-inner {
	width: 100%;
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: row;
	align-items: stretch;
	box-sizing: border-box;
}
.pinyin-scroll {
	width: 100%;
	height: 100%;
}

.follow-read-check {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 10rpx;
	flex: 1;
	min-width: 0;
}

.check-icon {
	width: 36rpx;
	height: 36rpx;
	border-radius: 8rpx;
	border: 2rpx solid #c8bfb0;
	background: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.check-icon--on {
	background: linear-gradient(145deg, #ffe0ec 0%, #ffd4f0 100%);
	border-color: #ff8aab;
}

.check-mark {
	font-size: 22rpx;
	color: #c44d6a;
	font-weight: 800;
	line-height: 1;
}

.follow-read-label {
	font-size: 24rpx;
	color: var(--meng-text, #2c2419);
}

.auto-read-btn {
	flex-shrink: 0;
	margin: 0;
	padding: 0 28rpx;
	height: 64rpx;
	line-height: 64rpx;
	font-size: 24rpx;
	font-weight: 700;
	color: #fff;
	background: linear-gradient(145deg, var(--meng-accent-from) 0%, var(--meng-accent-to) 100%);
	border: none;
	border-radius: 999rpx;
	box-shadow: 0 8rpx 20rpx var(--meng-shadow-warm);
}

.auto-read-btn--on {
	background: linear-gradient(145deg, #8a9aaa 0%, #6b7d8c 100%);
	box-shadow: 0 6rpx 16rpx rgba(80, 90, 100, 0.25);
}

.auto-read-btn[disabled] {
	opacity: 0.55;
}
.legend {
	flex-shrink: 0;
	margin-bottom: 12rpx;
	padding: 12rpx 14rpx;
	background: var(--meng-banner-soft);
	border-radius: 16rpx;
	border: 2rpx solid rgba(255, 180, 200, 0.15);
}
.legend-title {
	display: block;
	font-size: 22rpx;
	color: #6b6560;
	margin-bottom: 10rpx;
}
.legend-row {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}
.legend-chip {
	margin-right: 10rpx;
	margin-bottom: 8rpx;
	padding: 6rpx 12rpx;
	border-radius: 999rpx;
	border-width: 1rpx;
	border-style: solid;
	box-sizing: border-box;
}
.legend-chip-text {
	font-size: 20rpx;
	color: #3e3830;
	line-height: 1.3;
}
.vowel-block {
	margin-bottom: 28rpx;
}
.vowel-block:last-of-type {
	margin-bottom: 16rpx;
}
.vowel-block-title {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 12rpx;
	padding-left: 12rpx;
	border-left: 6rpx solid var(--meng-accent-solid);
}
.whole-block-desc {
	display: block;
	font-size: 24rpx;
	line-height: 1.55;
	color: #5c554c;
	margin-bottom: 14rpx;
	padding: 0 6rpx 0 18rpx;
}
.tone-wrap {
	margin-bottom: 0;
}
.tone-header-row,
.tone-data-row {
	display: flex;
	flex-direction: row;
	align-items: stretch;
	width: 100%;
	box-sizing: border-box;
}
.tone-header-row {
	margin-bottom: 10rpx;
	padding: 0 2rpx;
}
.tone-head-cell {
	flex: 1;
	min-width: 0;
	text-align: center;
	font-size: 22rpx;
	font-weight: 600;
	color: #6b6560;
	padding: 8rpx 4rpx;
	box-sizing: border-box;
	line-height: 1.25;
}
.tone-data-row {
	margin-bottom: 12rpx;
}
.tone-data-row:last-child {
	margin-bottom: 0;
}
/* 作业本式：整块共用一行四线三格 */
.pinyin-homework-strip {
	width: 100%;
	box-sizing: border-box;
}
.pinyin-homework-strip .pinyin-homework-wrap + .pinyin-homework-wrap {
	margin-top: 6rpx;
}

.pinyin-homework-wrap {
	width: 100%;
	box-sizing: border-box;
	margin: 0 0 10rpx;
	padding: 0;
	background: transparent;
	border: none;
	box-shadow: none;
}
.vowel-block--reading .vowel-block-title {
	color: #c44d6a;
	font-weight: 700;
}

</style>
