<template>
	<view class="page tab-root-page pinyin-page" :style="pinyinRootStyle">
		<view class="pinyin-top-bar">
			<view class="tabs">
				<view
					v-for="item in tabList"
					:key="item"
					class="tab-item"
					:class="activeTab === item ? 'tab-item-active' : ''"
					@click="activeTab = item"
				>{{ item }}</view>
			</view>
		</view>
		<view class="pinyin-scroll-wrap">
			<scroll-view scroll-y class="pinyin-scroll" :style="pinyinScrollStyle">
				<view class="panel">
			<text class="title">{{ activeTab }}</text>
			<!-- <text class="desc">点击下方格子朗读对应拼音（H5 / App 均已支持）</text>
			<text class="narrator">朗读人：{{ narrator === 'female' ? '标准女声' : '童声' }}</text> -->
			<view class="switches">
				<view class="switch-chip" :class="autoRead ? 'switch-chip-on' : ''" @click="autoRead = !autoRead">
					自动连读：{{ autoRead ? '开' : '关' }}
				</view>
				<view class="switch-chip" :class="followReadScore ? 'switch-chip-on' : ''" @click="toggleFollowRead">
					跟读评分：{{ followReadScore ? '开' : '关' }}
				</view>
			</view>

			<!-- 声母：按发音部位分块 + 成阻说明 -->
			<template v-if="activeTab === '声母'">
				<view v-for="sec in initialSections" :key="sec.title" class="vowel-block">
					<text class="vowel-block-title">{{ sec.title }}</text>
					<text class="whole-block-desc">{{ sec.desc }}</text>
					<view class="pinyin-homework-strip">
						<view
							v-for="(chunk, ri) in chunkHomeworkSymbols(sec.symbols)"
							:key="sec.title + '-hw-' + ri"
							class="pinyin-homework-wrap symbol-item"
							:style="homeworkStripStyle(entriesForInitial(chunk))"
						>
							<pinyin-four-lines-row
								size="grid"
								interactive
								:syllables="chunk"
								@cell-click="onHomeworkCellSpeak"
							/>
						</view>
					</view>
				</view>
			</template>
			<!-- 韵母：分块纵向排版，避免单/复/鼻韵母混在一起 -->
			<template v-else-if="activeTab === '韵母'">
				<view v-for="sec in vowelSections" :key="sec.title" class="vowel-block">
					<text class="vowel-block-title">{{ sec.title }}</text>
					<view class="pinyin-homework-strip">
						<view
							v-for="(chunk, ri) in chunkHomeworkSymbols(sec.symbols)"
							:key="sec.title + '-hw-' + ri"
							class="pinyin-homework-wrap symbol-item"
							:style="homeworkStripStyle(entriesForSymbols(chunk))"
						>
							<pinyin-four-lines-row
								size="grid"
								interactive
								:syllables="chunk"
								@cell-click="onHomeworkCellSpeak"
							/>
						</view>
					</view>
				</view>
			</template>
			<!-- 音调：表头仅一声～四声；每行对应韵母/整体认读音节的四声写法 -->
			<template v-else-if="activeTab === '音调'">
				<view v-for="block in toneTabBlocks" :key="block.key" class="vowel-block">
					<text class="vowel-block-title">{{ block.title }}</text>
					<view class="tone-wrap">
						<view class="tone-header-row">
							<text v-for="lab in toneColumnLabels" :key="block.key + '-' + lab" class="tone-head-cell">{{ lab }}</text>
						</view>
						<view
							v-for="row in block.rows"
							:key="block.key + '-row-' + row.bare"
							class="tone-data-row"
						>
							<view
								class="pinyin-homework-wrap symbol-item"
								:style="{ backgroundColor: row.cat.bg, borderColor: row.cat.bd }"
							>
								<pinyin-four-lines-row
									size="tone"
									interactive
									:syllables="toneRowDisplays(row)"
									@cell-click="onToneHomeworkCell(row, $event)"
								/>
							</view>
						</view>
					</view>
				</view>
			</template>
			<!-- 整体认读：分块 + 说明，排版同韵母页 -->
			<template v-else-if="activeTab === '整体认读'">
				<view v-for="sec in wholeReadingSections" :key="sec.title" class="vowel-block">
					<text class="vowel-block-title">{{ sec.title }}</text>
					<text class="whole-block-desc">{{ sec.desc }}</text>
					<view class="pinyin-homework-strip">
						<view
							v-for="(chunk, ri) in chunkHomeworkSymbols(sec.symbols)"
							:key="sec.title + '-hw-' + ri"
							class="pinyin-homework-wrap symbol-item"
							:style="homeworkStripStyle(entriesForWholeReading(chunk))"
						>
							<pinyin-four-lines-row
								size="grid"
								interactive
								:syllables="chunk"
								@cell-click="onHomeworkCellSpeak"
							/>
						</view>
					</view>
				</view>
			</template>
			<view class="pinyin-homework-strip">
				<view
					v-for="(chunk, ri) in chunkHomeworkSymbols(symbolMap[activeTab] || [])"
					:key="'drill-hw-' + ri"
					class="pinyin-homework-wrap symbol-item"
					:style="homeworkStripStyle(entriesForSymbols(chunk))"
				>
					<pinyin-four-lines-row
						size="grid"
						interactive
						:syllables="chunk"
						@cell-click="onHomeworkCellSpeak"
					/>
				</view>
			</view>
			<view class="actions">
				<button size="mini" type="primary" @click="goDrill">进入闯关</button>
				<button size="mini" @click="goGuardian" :disabled="true">切换朗读人</button>
				<button size="mini" type="warn" @click="startRecord" :disabled="recording">开始跟读</button>
				<button size="mini" @click="stopRecordAndScore" :disabled="!recording">结束并评分</button>
			</view>
			<text class="recording-tip">{{ recording ? '录音中...' : '未录音' }}</text>
			<text v-if="lastScoreText" class="score-tip">{{ lastScoreText }}</text>
			<view v-if="followReadHistory.length" class="history-box">
				<text class="history-title">最近录音</text>
				<text
					v-for="(r, idx) in followReadHistory.slice(0, 3)"
					:key="`${idx}-${r.createdAt}`"
					class="history-item"
				>第{{ idx + 1 }}条 · {{ Math.round((r.durationMs || 0) / 1000) }}s · {{ r.sampleRate }}Hz</text>
			</view>
				</view>
			</scroll-view>
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
	requestFollowReadScore
} from '@/services/pinyin-follow-read-service.js'
import { getPinyinSymbolCategory, legendForTab } from '@/utils/pinyin-pep-category.js'

/** 韵母分块（顺序与教材常见层级一致，自上而下） */
const VOWEL_SECTIONS = [
	{ title: '单韵母(6个)', symbols: ['ɑ', 'o', 'e', 'i', 'u', 'ü'] },
	{ title: '复韵母(8个)', symbols: ['ɑi', 'ei', 'ui', 'ɑo', 'ou', 'iu', 'ie', 'üe'] },
	{ title: '特殊韵母(1个)', symbols: ['er'] },
	{ title: '前鼻韵母(5个)', symbols: ['ɑn', 'en', 'in', 'un', 'ün'] },
	{ title: '后鼻韵母(4个)', symbols: ['ɑng', 'eng', 'ing', 'ong'] }
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
			'（yi、wu、yu、ye、yue、yuɑn、yin、yun、ying）它们按照拼写规则变化而来（如增加 y 或 w，或省略 ü 上两点等）。为不加重拼写规则负担，就作为整体来认读。',
		symbols: ['yi', 'wu', 'yu', 'ye', 'yue', 'yuɑn', 'yin', 'yun', 'ying']
	}
]
import { applyToneToSyllableStem, playToneGridCell, stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
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
				拼读练习: ['bɑ', 'bo', 'mɑ', 'de', 'du', 'ge', 'huɑ', 'xue', 'qiu', 'zhan', 'cheng', 'shi']
			},
			narrator: 'kid',
			autoRead: false,
			followReadScore: false,
			recording: false,
			followReadHistory: [],
			lastScoreText: '',
			lastRecordFile: '',
			vowelSections: VOWEL_SECTIONS,
			initialSections: INITIAL_SECTIONS,
			wholeReadingSections: WHOLE_READING_SECTIONS,
			/** scroll-view 高度（px），旧版 Android WebView 需显式高度才能滚动 */
			scrollAreaHeightPx: 0
		}
	},
	computed: {
		pinyinRootStyle() {
			return this.tabPageStyle || {}
		},
		pinyinScrollStyle() {
			const h = this.scrollAreaHeightPx
			return h > 0 ? { height: `${h}px` } : { height: '65vh' }
		},
		/** 音调页：自上而下两块，标题「韵母」「整体认读」（排版同韵母 Tab 的 vowel-block） */
		toneTabBlocks() {
			return [
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
		},
		/** 自动连读：先韵母块再整体认读块；每行仅一声→四声（不含本音/轻声格） */
		autoReadQueue() {
			if (this.activeTab === '音调') {
				return this.toneTabBlocks.flatMap((block) =>
					block.rows.flatMap((row) =>
						row.cells
							.filter((c) => c.play && !c.disabled)
							.map((c) => ({ symbol: c.play, asNeutral: c.asNeutral }))
					)
				)
			}
			return (this.symbolMap[this.activeTab] || []).map((s) => ({ symbol: s, asNeutral: false }))
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
		}
	},
	onReady() {
		this.measureScrollHeight()
	},
	onShow() {
		this.setTabBarIndex(1)
		this.narrator = getAudioNarrator()
		this.recording = getFollowReadState().recording
		this.followReadHistory = getFollowReadHistory()
		this.measureScrollHeight()
	},
	onHide() {
		stopLocalPinyinAudio()
	},
	methods: {
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
			this.$nextTick(() => {
				apply()
				setTimeout(apply, 120)
			})
		},
		/** 作业本行：每行固定 maxPerRow 格（默认 4），不足补 null 左对齐留空 */
		chunkHomeworkSymbols(symbols, maxPerRow = 4) {
			const arr = Array.isArray(symbols) ? symbols.map((s) => String(s || '').trim()).filter(Boolean) : []
			const m = Math.min(Math.max(1, Math.floor(Number(maxPerRow)) || 4), 99)
			const out = []
			for (let i = 0; i < arr.length; i += m) {
				const slice = arr.slice(i, i + m)
				while (slice.length < m) {
					slice.push(null)
				}
				out.push(slice)
			}
			return out
		},
		homeworkStripStyle(entries) {
			const arr = Array.isArray(entries) ? entries : []
			const e = arr.find((x) => x && x.symbol != null && String(x.symbol).trim()) || null
			if (!e) return {}
			return { backgroundColor: e.bg, borderColor: e.bd }
		},
		toneRowDisplays(row) {
			return (row && row.cells ? row.cells : []).map((c) => c.display)
		},
		onHomeworkCellSpeak(payload) {
			if (!payload || payload.syllable == null || payload.syllable === '') return
			this.speakSymbol(String(payload.syllable))
		},
		onToneHomeworkCell(row, payload) {
			const idx = payload && typeof payload.index === 'number' ? payload.index : -1
			const cell = row && row.cells && idx >= 0 ? row.cells[idx] : null
			if (!cell || cell.disabled) return
			this.speakSymbol(cell.play, { asNeutral: cell.asNeutral })
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
		async speakSymbol(symbol, opts) {
			const text = String(symbol || '')
			const narrator = this.narrator
			const asNeutral = !!(opts && opts.asNeutral)
			const t0 = Date.now()
			let ok = false
			let blend = false
			if (this.activeTab === '音调') {
				ok = await playToneGridCell(text, { asNeutral, narrator })
			} else {
				const useTone1Fb = this.activeTab === '整体认读' || this.activeTab === '拼读练习'
				blend = this.activeTab === '拼读练习'
				ok = await speakBlendedPinyinSyllable(text, {
					narrator,
					useTone1Fb,
					blend,
					showFailToast: true
				})
			}
			let delayMs = 380
			if (blend && ok) {
				delayMs = Math.max(520, Date.now() - t0 + 280)
			} else if (ok) {
				delayMs = 520
			}
			if (this.autoRead) {
				const queue = this.autoReadQueue
				const idx = queue.findIndex((q) => q.symbol === text && !!q.asNeutral === asNeutral)
				const nextSlot = idx >= 0 && idx < queue.length - 1 ? queue[idx + 1] : null
				if (nextSlot) {
					setTimeout(() => {
						this.speakSymbol(nextSlot.symbol, { asNeutral: nextSlot.asNeutral })
					}, delayMs)
				}
			}
			if (this.followReadScore) {
				const scoreRes = await requestFollowReadScore({
					symbol: text,
					durationMs: 0,
					sampleRate: 16000,
					volumeStd: 0.78,
					matchScore: 0.82
				})
				this.lastScoreText = scoreRes.ok
					? `跟读${scoreRes.score}分 · 稳定度${scoreRes.details.volumeStability}% · 匹配${scoreRes.details.targetMatch}%`
					: scoreRes.message
				uni.showToast({
					title: scoreRes.ok ? `跟读${scoreRes.score}分` : scoreRes.message,
					icon: 'none'
				})
			}
		},
		goDrill() {
			uni.navigateTo({ url: '/pages/pinyin/drill' })
		},
		goGuardian() {
			uni.navigateTo({ url: '/pages/settings/guardian' })
		},
		toggleFollowRead() {
			this.followReadScore = !this.followReadScore
			uni.showToast({
				title: this.followReadScore ? '跟读评分占位已开启' : '跟读评分占位已关闭',
				icon: 'none'
			})
		},
		async startRecord() {
			const res = await startFollowReadRecord()
			if (!res.ok) {
				uni.showToast({ title: res.message || '无法开始录音', icon: 'none' })
				return
			}
			this.recording = true
			uni.showToast({ title: '开始录音', icon: 'none' })
		},
		async stopRecordAndScore() {
			const stopRes = await stopFollowReadRecord()
			this.recording = false
			if (!stopRes.ok) {
				uni.showToast({ title: stopRes.message || '录音结束失败', icon: 'none' })
				return
			}
			this.lastRecordFile = stopRes.tempFilePath || ''
			const symbol = this.activeSymbols[0] || ''
			const scoreRes = await requestFollowReadScore({
				symbol,
				durationMs: stopRes.durationMs,
				sampleRate: stopRes.sampleRate,
				volumeStd: 0.8,
				matchScore: 0.83
			})
			this.followReadHistory = getFollowReadHistory()
			this.lastScoreText = scoreRes.ok
				? `跟读${scoreRes.score}分 · 稳定度${scoreRes.details.volumeStability}% · 匹配${scoreRes.details.targetMatch}%`
				: scoreRes.message
			uni.showToast({
				title: scoreRes.ok ? `跟读${scoreRes.score}分` : scoreRes.message,
				icon: 'none'
			})
		}
	}
}
</script>

<style scoped>
.page.tab-root-page.pinyin-page {
	height: 100vh;
	max-height: 100vh;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	overflow: hidden;
}
.page { min-height: 100vh; padding: 24rpx; background: #f4f1ea; }
.pinyin-top-bar {
	flex-shrink: 0;
	width: 100%;
	box-sizing: border-box;
	margin-bottom: 16rpx;
}
.pinyin-scroll-wrap {
	flex: 1;
	min-height: 0;
	width: 100%;
	overflow: hidden;
}
.pinyin-scroll {
	width: 100%;
}
.tabs { display: flex; flex-direction: row; align-items: stretch; margin-bottom: 0; }
.tab-item + .tab-item { margin-left: 10rpx; }
.tab-item { flex: 1; min-width: 0; text-align: center; background: #fff; border-radius: 10rpx; padding: 12rpx 4rpx; font-size: 22rpx; color: #555; }
.tab-item-active { background: #ffe2b8; color: #2c2419; font-weight: 600; }
.panel { background: #fff; border-radius: 14rpx; padding: 22rpx; }
.title { display: block; font-size: 30rpx; font-weight: 700; color: #2c2419; margin-bottom: 10rpx; }
.desc { display: block; font-size: 24rpx; color: #6b6560; line-height: 1.45; margin-bottom: 12rpx; }
.narrator { display: block; font-size: 23rpx; color: #8a8279; margin-bottom: 10rpx; }
.switches { display: flex; flex-direction: row; margin-bottom: 12rpx; }
.switch-chip + .switch-chip { margin-left: 10rpx; }
.switch-chip { padding: 8rpx 14rpx; border-radius: 999rpx; background: #f2ede3; font-size: 22rpx; color: #6b6560; }
.switch-chip-on { background: #ffe2b8; color: #2c2419; font-weight: 600; }
.legend {
	margin-bottom: 14rpx;
	padding: 12rpx 14rpx;
	background: #faf8f5;
	border-radius: 12rpx;
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
	color: #4a433a;
	margin-bottom: 12rpx;
	padding-left: 12rpx;
	border-left: 6rpx solid #e8cfa8;
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
.pinyin-homework-strip .pinyin-homework-wrap.symbol-item + .pinyin-homework-wrap.symbol-item {
	margin-top: 8rpx;
}
.pinyin-homework-wrap.symbol-item {
	flex: 0 0 100%;
	width: 100%;
	max-width: 100%;
	margin-right: 0;
	margin-bottom: 32rpx;
	padding: 32rpx 24rpx 24rpx;
	min-height: 0;
	display: flex;
	flex-direction: column;
	align-items: stretch;
}
.symbol-item {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	flex: 0 0 18%;
	width: 18%;
	max-width: 18%;
	min-width: 0;
	margin-right: 2.5%;
	margin-bottom: 28rpx;
	min-height: 192rpx;
	padding: 44rpx 12rpx;
	border-radius: 12rpx;
	border-width: 1rpx;
	border-style: solid;
	text-align: center;
}
.symbol-item:nth-child(5n) {
	margin-right: 0;
}
.actions {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}
.actions > button {
	box-sizing: border-box;
	flex: 0 0 22%;
	width: 22%;
	max-width: 22%;
	min-width: 0;
	margin-right: 4%;
	margin-bottom: 12rpx;
	height: auto;
	min-height: 64rpx;
	padding: 12rpx 8rpx;
	line-height: 1.35;
	font-size: 22rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	white-space: normal;
	word-break: break-word;
}
.actions > button:nth-child(4n) {
	margin-right: 0;
}
.recording-tip { display: block; margin-top: 10rpx; font-size: 22rpx; color: #8a8279; }
.score-tip { display: block; margin-top: 8rpx; font-size: 22rpx; color: #3d6b4a; }
.history-box { margin-top: 10rpx; padding: 12rpx; background: #fff8eb; border-radius: 10rpx; }
.history-title { display: block; font-size: 22rpx; color: #6b6560; margin-bottom: 6rpx; }
.history-item { display: block; font-size: 21rpx; color: #8a8279; margin-top: 4rpx; }
</style>
