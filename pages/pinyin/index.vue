<template>
	<view
		class="page tab-page-shell tab-page-shell--edge tab-root-page pinyin-page"
		:style="tabPageStyle"
	>
		<view class="pinyin-hero-stack">
			<meng-tab-hero
				:status-bar-px="statusBarHeight"
				title="拼音"
				subtitle="拼读 · 闯关"
				avatar-pose="happy"
			>
				<template #actions>
					<view class="pinyin-auto-read-check" @click.stop="toggleAutoReadPrefer">
						<view
							class="pinyin-auto-read-box"
							:class="{ 'pinyin-auto-read-box--on': autoReadPrefer }"
						>
							<text v-if="autoReadPrefer" class="pinyin-auto-read-mark">✓</text>
						</view>
						<text class="pinyin-auto-read-label">自动连读</text>
					</view>
				</template>
			</meng-tab-hero>
			<meng-page-nav
				class="pinyin-hero-nav-overlay"
				:style="{ paddingTop: statusBarHeight + 'px' }"
				title=""
				:show-back="true"
				:inset-status-bar="false"
			/>
		</view>

		<view class="tab-dock-overlap pinyin-dock">
			<view class="tab-dock-panel pinyin-dock-panel">
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

				<view v-if="pinyinModeStatusText" class="pinyin-mode-bar">
					<view class="pinyin-mode-status">
						<text
							class="pinyin-mode-status-text"
							:class="{ 'font-pinyin': pinyinModeStatusUsePinyinFont }"
						>{{ pinyinModeStatusText }}</text>
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
						:enable-flex="true"
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
									category-tab="声母"
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
									category-tab="韵母"
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
									category-tab="整体认读"
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
								<view class="drill-practice-bar">
									<text class="drill-practice-hint clamp-2">{{ drillPracticeHint }}</text>
									<view
										class="drill-practice-shuffle"
										:class="{ 'drill-practice-shuffle--busy': drillPracticeLoading }"
										@click="refreshDrillPracticePool(true)"
									>
										<text class="drill-practice-shuffle-text">{{
											drillPracticeLoading ? '抽取中…' : '换一批'
										}}</text>
									</view>
								</view>
								<view
									v-for="row in tabViewDrillRows"
									:key="row.scrollId"
									class="pinyin-chunk-anchor pinyin-drill-syllable"
								>
									<view :id="row.scrollPadId" class="pinyin-mascot-scroll-pad" />
									<view
										:id="row.scrollId"
										class="pinyin-homework-wrap pinyin-homework-wrap--drill-one"
										:class="{
											'pinyin-homework-wrap--reading': autoReadChunkActive('drill', 0, row.ri, row.chunk)
										}"
									>
										<pinyin-four-lines-row
											size="tone"
											interactive
											category-tab="拼读练习"
											:sheet-bg="row.sheetBg"
											:sheet-bd="row.sheetBd"
											:reading-segments="row.drillSegments"
											:highlight-reading-part-index="autoReadDrillPartIndex(row.ri)"
											:syllables="row.chunk"
											@cell-click="(p) => onDrillCellSpeak(row, p)"
										/>
									</view>
								</view>
							</view>
						</view>
					</scroll-view>

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
									'pinyin-quick-btn--disabled': false
								}"
								@click="toggleAutoReadChain"
							>
								<text class="pinyin-quick-emoji">{{ autoReadRunning ? '⏹' : '▶' }}</text>
								<text class="pinyin-quick-label">{{ autoReadRunning ? '停止连读' : '开始连读' }}</text>
							</view>
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
						:src="mengMascotIp"
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
	describePinyinPracticeSource,
	FALLBACK_BLEND_SYLLABLES,
	pickRandomPinyinPracticeSyllables
} from '@/services/pinyin-practice-pool-service.js'
import { getPinyinSymbolCategory, legendForTab } from '@/utils/pinyin-pep-category.js'
import { chunkHomeworkSymbols as chunkHomeworkSymbolsByWidth } from '@/utils/pinyin-homework-chunk.js'
import {
	buildHomeworkSectionViews,
	buildHomeworkDrillRows,
	autoReadSlotsFromSectionViews,
	autoReadSlotsFromDrillRows,
	autoReadSlotsFromToneBlocks
} from '@/utils/pinyin-index-tab-views.js'
import { VIP_QUOTA_LIMITS } from '@/constants/vip-quota-limits.js'
import { gateAndPrompt, VIP_FEATURE, QUOTA_KEYS } from '@/utils/vip-gate.js'
import { recordPinyinAutoReadChainComplete } from '@/utils/achievement-stats-storage.js'

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
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'
import {
	speakBlendedPinyinFromIndex,
	speakBlendedPinyinSyllable
} from '@/utils/hanzi-pinyin-blend-speak.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import MengAvatar from '@/components/meng-avatar.vue'
import MengTabHero from '@/components/meng-tab-hero.vue'
import MengPageNav from '@/components/meng-page-nav.vue'
import tabMain from '@/mixins/tab-main-page.js'
import { MENG_ASSETS } from '@/utils/mengmeng-assets.js'
import { MENG_VOICE, playMengmengVoice, playMengmengVoiceOnce, stopMengmengVoice } from '@/utils/mengmeng-voice.js'

export default {
	mixins: [tabMain],
	components: {
		PinyinFourLinesRow,
		MengAvatar,
		MengTabHero,
		MengPageNav
	},
	data() {
		return {
			assets: MENG_ASSETS,
			mengMascotIp: MENG_ASSETS.ip.book,
			tabList: ['声母', '韵母', '整体认读', '音调', '拼读练习'],
			toneColumnLabels: ['一声', '二声', '三声', '四声'],
			activeTab: '声母',
			symbolMap: {
				声母: INITIAL_SECTIONS.flatMap((s) => s.symbols),
				韵母: VOWEL_SECTIONS.flatMap((s) => s.symbols),
				整体认读: WHOLE_READING_SECTIONS.flatMap((s) => s.symbols),
				拼读练习: FALLBACK_BLEND_SYLLABLES.slice()
			},
			drillPracticeHint: '正在从识字表抽取拼音…',
			drillPracticeLoading: false,
			narrator: 'kid',
			autoReadRunning: false,
			autoReadPrefer: false,
			autoReadActiveSlot: null,
			pinyinScrollTop: 0,
			_lastPinyinScrollTop: 0,
			autoReadRunId: 0,
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
		pinyinScrollStyle() {
			const h = this.scrollAreaHeightPx
			if (h > 0) return { height: `${h}px`, flex: 'none' }
			return { flex: '1', height: '0', minHeight: '200px' }
		},
		autoReadActiveLabel() {
			return this.autoReadActiveSlot?.symbol || ''
		},
		autoReadActiveSection() {
			return this.autoReadActiveSlot?.sectionTitle || ''
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
		pinyinModeStatusUsePinyinFont() {
			return this.autoReadRunning
		},
		pinyinModeStatusText() {
			if (this.autoReadRunning) {
				const sym = this.autoReadActiveLabel
				return sym ? `正在连读 · ${sym}` : '正在连读'
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
		this.refreshDrillPracticePool()
		this.scheduleMeasureScrollHeight(80)
		this.scheduleMeasureScrollHeight(320)
		this.$nextTick(() => {
			this.tryAutoStartReadChain()
		})
	},
	onHide() {
		stopMengmengVoice()
		this.stopAutoReadChain()
	},
	methods: {
		async refreshDrillPracticePool(userInitiated = false) {
			if (this.drillPracticeLoading) return
			if (userInitiated) {
				const g = await gateAndPrompt(VIP_FEATURE.DRILL_UNLIMITED, {
					quotaKey: QUOTA_KEYS.DRILL_SHUFFLE,
					quotaLimit: VIP_QUOTA_LIMITS[QUOTA_KEYS.DRILL_SHUFFLE],
					quotaTitle: '今日换一批次数已用完',
					quotaMessage: '免费版每日可换 3 批拼读练习。开通会员后不限次。'
				})
				if (!g.ok) return
			}
			this.drillPracticeLoading = true
			try {
				const [symbols, hint] = await Promise.all([
					pickRandomPinyinPracticeSyllables(12),
					describePinyinPracticeSource()
				])
				if (!symbols.length) return
				this.$set(this.symbolMap, '拼读练习', symbols)
				this.tabViewDrillRows = buildHomeworkDrillRows(symbols)
				this._slotsDrill = autoReadSlotsFromDrillRows(this.tabViewDrillRows)
				this.drillPracticeHint = hint
				if (this.activeTab === '拼读练习' && this.autoReadRunning) {
					this.stopAutoReadChain()
					this.$nextTick(() => this.tryAutoStartReadChain())
				}
			} catch (e) {
				console.warn('[pinyin] refreshDrillPracticePool', e)
				this.drillPracticeHint = '抽取失败，已使用常用音节'
			} finally {
				this.drillPracticeLoading = false
			}
		},
		onPickTab(tab) {
			const next = String(tab || '')
			if (!next || next === this.activeTab) return
			if (this.autoReadRunning) {
				this.stopAutoReadChain()
			} else {
				stopLocalPinyinAudio()
			}
			if (!this.mountedTabs[next]) {
				this.$set(this.mountedTabs, next, true)
			}
			this.activeTab = next
			this.applyPinyinScrollTop(0)
			this.scheduleMeasureScrollHeight()
			this.scheduleMeasureScrollHeight(280)
			if (this.autoReadPrefer) {
				this.$nextTick(() => {
					setTimeout(() => this.tryAutoStartReadChain(), 150)
				})
			}
		},
		async toggleAutoReadPrefer() {
			if (!this.autoReadPrefer) {
				const g = await gateAndPrompt(VIP_FEATURE.PINYIN_AUTO_READ)
				if (!g.ok) return
			}
			this.autoReadPrefer = !this.autoReadPrefer
			if (this.autoReadPrefer) {
				this.tryAutoStartReadChain()
			} else if (this.autoReadRunning) {
				this.stopAutoReadChain()
			}
		},
		tryAutoStartReadChain() {
			if (!this.autoReadPrefer || this.autoReadRunning) {
				return
			}
			if (!this.autoReadSlots.length) return
			this.startAutoReadChain()
		},
		sleep(ms) {
			return new Promise((r) => setTimeout(r, ms))
		},
		async toggleAutoReadChain() {
			if (this.autoReadRunning) {
				this.stopAutoReadChain()
				uni.showToast({ title: '已停止连读', icon: 'none', duration: 1600 })
				return
			}
			const g = await gateAndPrompt(VIP_FEATURE.PINYIN_AUTO_READ)
			if (!g.ok) return
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
			this.scheduleMeasureScrollHeight()
			const runId = this.autoReadRunId
			const slot = fromSlot || queue[0]
			this.$nextTick(() => {
				this.playSlotInChain(slot, runId)
			})
		},
		stopAutoReadChain() {
			this.autoReadRunning = false
			this.pinyinMascotReady = false
			this.pinyinMascotPosReady = false
			this._pinyinMascotLastRowId = ''
			this.clearPinyinMascotScrollTimers()
			this.autoReadRunId += 1
			stopLocalPinyinAudio()
			this.cancelAutoReadSpeech()
			this.setAutoReadHighlight(null)
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
			const finish = () => {
				if (typeof onDone === 'function') onDone()
			}
			const viewH =
				this.scrollAreaHeightPx > 0
					? this.scrollAreaHeightPx
					: Math.floor((uni.getSystemInfoSync().windowHeight || 600) * 0.55)
			const anchorRatio = 0.36
			const desiredTop = Math.floor(viewH * anchorRatio)
			const margin = 28

			const runQuery = (attempt) => {
				const query = uni.createSelectorQuery().in(this)
				query.select('.pinyin-scroll').scrollOffset()
				query.select('.pinyin-scroll').boundingClientRect()
				query.select(`#${anchorId}`).boundingClientRect()
				query.exec((res) => {
					const scroll = res && res[0]
					const svRect = res && res[1]
					const rowRect = res && res[2]
					if (!scroll || !svRect || !rowRect || !svRect.height) {
						if (attempt < 3) {
							setTimeout(() => runQuery(attempt + 1), 80 + attempt * 40)
						} else {
							finish()
						}
						return
					}
					const current = scroll.scrollTop != null ? scroll.scrollTop : this._lastPinyinScrollTop || 0
					const rowTopInView = rowRect.top - svRect.top
					const rowBottomInView = rowRect.bottom - svRect.top
					const inView =
						rowTopInView >= margin &&
						rowBottomInView <= svRect.height - margin
					if (inView && Math.abs(rowTopInView - desiredTop) < 32) {
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
			}
			runQuery(0)
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
			this.handlePinyinScrollMotion()
		},
		handlePinyinScrollMotion() {
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
			if (kind === 'drill') return true
			return (chunk || []).some((sym, ci) => sym && slot.ci === ci)
		},
		autoReadHighlightCol(kind, si, ri, chunk) {
			const slot = this.autoReadActiveSlot
			if (!slot || slot.kind !== kind || slot.si !== si || slot.ri !== ri) return -1
			if (kind === 'drill') return -1
			const ci = slot.ci
			return chunk && chunk[ci] ? ci : -1
		},
		autoReadDrillPartIndex(ri) {
			const slot = this.autoReadActiveSlot
			if (!slot || slot.kind !== 'drill' || slot.ri !== ri) return -1
			return Number.isFinite(slot.ci) ? slot.ci : -1
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
		scheduleMeasureScrollHeight(delayMs = 0) {
			if (this._measureScrollTimer != null) {
				clearTimeout(this._measureScrollTimer)
			}
			this._measureScrollTimer = setTimeout(() => {
				this._measureScrollTimer = null
				this.measureScrollHeight()
			}, Math.max(0, Number(delayMs) || 0))
		},
		measureScrollHeight() {
			const apply = () => {
				try {
					const sys = uni.getSystemInfoSync()
					const winH = Number(sys.windowHeight) || Number(sys.screenHeight) || 0
					const q = uni.createSelectorQuery().in(this)
					q.select('.pinyin-scroll-wrap').boundingClientRect()
					q.select('.pinyin-footer').boundingClientRect()
					q.exec((res) => {
						const wrap = res && res[0]
						const foot = res && res[1]
						let h = 0
						if (wrap && wrap.height > 40) {
							h = Math.floor(wrap.height)
						} else if (wrap && wrap.top > 0 && winH > 0) {
							const footH = foot && foot.height ? foot.height : 72
							h = Math.floor(winH - wrap.top - footH - 8)
						}
						if (h > 80) {
							const next = Math.max(80, Math.ceil(h))
							if (next !== this.scrollAreaHeightPx) {
								this.scrollAreaHeightPx = next
							}
						}
					})
				} catch (_) {}
			}
			this.$nextTick(() => {
				this.$nextTick(apply)
			})
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
		/** 拼读练习：按列播放 lookup 序列（展示列为 display，查音列为 lookup） */
		onDrillCellSpeak(row, payload) {
			if (!row || !payload) return
			const ci = Number(payload.index)
			if (!Number.isFinite(ci) || ci < 0) return
			const lookup = row.drillLookup || row.chunk || []
			const symbol = lookup[ci] || String(payload.syllable || '').trim()
			if (!symbol) return
			const whole = row.drillWhole || symbol
			const slot = {
				kind: 'drill',
				symbol,
				asNeutral: false,
				drillPlay: ci === lookup.length - 1 && lookup.length > 1 ? 'whole' : 'part',
				slotKey: `drill|0|${row.ri}|${ci}`,
				scrollId: row.scrollId,
				scrollPadId: row.scrollPadId,
				sectionTitle: '拼读练习',
				si: 0,
				ri: row.ri,
				ci,
				drillWhole: whole
			}
			if (this.autoReadRunning) {
				stopLocalPinyinAudio()
				this.autoReadRunId += 1
				const runId = this.autoReadRunId
				const startSlot =
					(this._slotsDrill || []).find((s) => s.ri === row.ri && s.ci === ci) || slot
				this.playSlotInChain(startSlot, runId)
				return
			}
			this.playDrillFromIndex(whole, ci, slot)
		},
		async playDrillFromIndex(wholeSyllable, startCi, slotHint, runId) {
			const text = String(wholeSyllable || '').trim()
			if (!text) return
			if (slotHint?.scrollId) {
				this.setAutoReadHighlight(slotHint)
			}
			try {
				const playTask = () =>
					speakBlendedPinyinFromIndex(text, startCi, {
						useTone1Fb: false,
						blend: true
					})
				const ok = await this.withPlayTimeout(playTask(), 12000)
				if (!ok) {
					stopLocalPinyinAudio()
					this.cancelAutoReadSpeech()
				}
			} finally {
				if (runId == null || runId === this.autoReadRunId) {
					if (!this.autoReadRunning) {
						this.setAutoReadHighlight(null)
					}
				}
			}
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
			const slot =
				this.findAutoReadSlot(text, opts.asNeutral) ||
				this.buildPlaySlotFromClick(text, opts)
			if (this.autoReadRunning) {
				stopLocalPinyinAudio()
				this.autoReadRunId += 1
				const runId = this.autoReadRunId
				if (slot) this.playSlotInChain(slot, runId)
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
			const asNeutral = !!(opts && opts.asNeutral)
			const drillPlay = opts && opts.drillPlay
			const playTask = async () => {
				if (this.activeTab === '音调') {
					return playToneGridCell(text, { asNeutral })
				}
				if (this.activeTab === '拼读练习') {
					if (drillPlay === 'part' || drillPlay === 'whole') {
						return playLocalPinyinNeutralThenTone1(text, false)
					}
					return speakBlendedPinyinSyllable(text, {
						useTone1Fb: false,
						blend: true
					})
				}
				return playLocalPinyinNeutralThenTone1(text, true)
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
			try {
				await this.playReferenceSymbol(text, opts)
			} finally {
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
			const opts = {
				asNeutral: !!slot.asNeutral,
				drillPlay: slot.drillPlay || ''
			}
			if (slot.scrollId) {
				this.setAutoReadHighlight(slot)
			}

			const t0 = Date.now()
			const blend = this.activeTab === '拼读练习'
			const ok = await this.playReferenceSymbol(text, opts)
			if (!this.autoReadRunning || runId !== this.autoReadRunId) return

			let delayMs = 380
			if (blend && ok) {
				const partGap = slot.drillPlay === 'whole' ? 420 : 340
				delayMs = Math.max(partGap, Date.now() - t0 + 220)
			} else if (ok) {
				delayMs = 520
			} else {
				delayMs = 320
			}
			await this.sleep(delayMs)

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
				recordPinyinAutoReadChainComplete()
				uni.showToast({ title: '连读完成', icon: 'none', duration: 1800 })
			}
		},
		goDrill() {
			uni.navigateTo({ url: '/pages/pinyin/drill' })
		},
		goGuardian() {
			uni.navigateTo({ url: '/pages/settings/guardian' })
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
	width: 100%;
	padding-bottom: env(safe-area-inset-bottom);
}

.pinyin-hero-stack {
	position: relative;
	width: 100%;
}

.pinyin-hero-nav-overlay {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	z-index: 10;
	pointer-events: none;
}

.pinyin-hero-nav-overlay :deep(.meng-page-nav__back) {
	pointer-events: auto;
}

.pinyin-hero-nav-overlay :deep(.meng-page-nav__title) {
	display: none;
}

.pinyin-hero-nav-overlay :deep(.meng-page-nav__right) {
	display: none;
}

.pinyin-auto-read-check {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	min-width: 128rpx;
	padding: 14rpx 18rpx;
	border-radius: 24rpx;
	background: rgba(255, 255, 255, 0.92);
	border: 2rpx solid rgba(255, 255, 255, 0.98);
	box-shadow: 0 6rpx 20rpx rgba(92, 61, 46, 0.12);
	box-sizing: border-box;
}

.pinyin-auto-read-box {
	width: 52rpx;
	height: 52rpx;
	border-radius: 12rpx;
	border: 3rpx solid #c8bfb0;
	background: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.pinyin-auto-read-box--on {
	background: #ffd4f0;
	border-color: #ff8aab;
}

.pinyin-auto-read-mark {
	font-size: 32rpx;
	color: #c44d6a;
	font-weight: 800;
	line-height: 1;
}

.pinyin-auto-read-label {
	font-size: 28rpx;
	font-weight: 700;
	color: var(--meng-text, #2c2419);
	line-height: 1.2;
	white-space: nowrap;
}

.pinyin-page .tab-dock-overlap {
	margin-top: -20rpx;
	width: 100%;
}

.pinyin-page .pinyin-dock-panel {
	padding: 12rpx 4rpx 6rpx;
	margin: 0;
	border-left: none;
	border-right: none;
	border-radius: 24rpx 24rpx 0 0;
}

.pinyin-page > .tab-dock-overlap.pinyin-dock {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.pinyin-dock {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	width: 100%;
}

.pinyin-dock-panel {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
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
	background: #ffd4f0;
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
	flex-shrink: 0;
	margin-bottom: 10rpx;
	padding: 0 6rpx;
}

.pinyin-mode-status {
	width: 100%;
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

.pinyin-scroll-wrap {
	flex: 1;
	min-height: 0;
	width: 100%;
	overflow: hidden;
	display: flex;
	flex-direction: column;
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

/* 每个音节左右各留约 1 个字母宽（相对当前拼音字号 1em） */
.pinyin-content :deep(.pflr-glyphs-row) {
	padding-left: 1em;
	padding-right: 1em;
	box-sizing: border-box;
	max-width: 100%;
}

.pinyin-footer {
	flex-shrink: 0;
	margin-top: 6rpx;
	padding: 8rpx 4rpx 4rpx;
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
	background: #7fd49a;
}

.pinyin-quick-btn--autoread {
	background: var(--meng-accent-solid);
}

.pinyin-quick-btn--autoread-on {
	background: #6b7d8c;
}

.pinyin-quick-btn--stop {
	background: #ff6b9d;
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
	flex: 1;
	min-height: 0;
	box-sizing: border-box;
}

.fr-debug-play-standalone {
	margin: 8rpx 8rpx 4rpx;
	padding: 14rpx 18rpx;
	border-radius: 16rpx;
	background: rgba(80, 120, 200, 0.1);
	border: 1rpx dashed rgba(80, 120, 200, 0.4);
}

.fr-debug-play-standalone-text {
	font-size: 24rpx;
	color: #4a6a9a;
	text-align: center;
	display: block;
}

.fr-debug-play-standalone--link {
	border-color: rgba(232, 120, 48, 0.45);
	background: rgba(240, 160, 96, 0.08);
}

.fr-debug-play-standalone--link .fr-debug-play-standalone-text {
	color: #8b4518;
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
	background: var(--meng-accent-solid);
	border: none;
	border-radius: 999rpx;
	box-shadow: 0 8rpx 20rpx var(--meng-shadow-warm);
}

.auto-read-btn--on {
	background: #6b7d8c;
	box-shadow: 0 6rpx 16rpx rgba(80, 90, 100, 0.25);
}

.auto-read-btn[disabled] {
	opacity: 0.55;
}
.legend {
	flex-shrink: 0;
	margin-bottom: 12rpx;
	padding: 12rpx 6rpx;
	background: var(--meng-banner-soft);
	border-radius: 16rpx;
	border: 2rpx solid var(--meng-border-warm);
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
.drill-practice-bar {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	margin-bottom: 16rpx;
	padding: 14rpx 16rpx;
	border-radius: 16rpx;
	background: var(--meng-banner-soft);
	border: 2rpx solid var(--meng-border-warm);
	box-sizing: border-box;
}

.drill-practice-hint {
	flex: 1;
	min-width: 0;
	font-size: 22rpx;
	color: var(--meng-text-secondary, #6d5e52);
	line-height: 1.45;
}

.drill-practice-shuffle {
	flex-shrink: 0;
	padding: 10rpx 22rpx;
	border-radius: 999rpx;
	background: var(--meng-accent-solid);
}

.drill-practice-shuffle--busy {
	opacity: 0.65;
}

.drill-practice-shuffle-text {
	font-size: 24rpx;
	font-weight: 600;
	color: #fff;
}

.pinyin-drill-syllable {
	width: 100%;
	margin-bottom: 20rpx;
	box-sizing: border-box;
}

.pinyin-drill-syllable:last-child {
	margin-bottom: 8rpx;
}

.pinyin-homework-wrap--drill-one {
	width: 100%;
	display: flex;
	flex-direction: row;
	justify-content: stretch;
	align-items: stretch;
	box-sizing: border-box;
}

.pinyin-homework-wrap--drill-one :deep(.pflr--reading-flow) {
	width: 100%;
	flex: 1;
	min-width: 0;
}

.pinyin-homework-wrap--drill-one :deep(.pflr--reading-flow .pflr-sheet) {
	overflow: visible;
	border-radius: 18rpx;
	box-shadow: inset 0 0 0 1rpx rgba(125, 154, 173, 0.2);
}

.pinyin-homework-wrap--drill-one :deep(.pflr--reading-flow .pflr-cols) {
	overflow: visible;
}

.pinyin-homework-strip.pinyin-tab-panel {
	padding-left: 0;
	padding-right: 0;
}

.pinyin-content :deep(.pinyin-homework-strip .pflr--reading-flow.pflr--tone) {
	--pfl-cell-h: 124rpx;
}

.pinyin-content :deep(.pinyin-homework-strip .pflr--reading-flow .pflr-glyphs-row) {
	padding-left: 0.28em;
	padding-right: 0.28em;
}

.pinyin-content :deep(.pflr-sheet) {
	width: 100%;
}

.pinyin-homework-strip {
	width: 100%;
}

.clamp-2 {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
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
</style>
