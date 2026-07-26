<template>
	<meng-sub-page
		title="萌萌的气球营"
		subtitle="听一听、配对闯关，收集小星星"
		:show-avatar="false"
		:padded="false"
		:overlap-body="false"
	>
		<!-- 营地大厅 -->
		<view v-if="phase === 'lobby'" class="lobby">
			<image class="lobby-mascot" src="/static/mengmeng/ip/balloon.png" mode="aspectFit" />
			<text class="lobby-balloon" aria-hidden="true">🎈</text>
			<text class="lobby-title">萌萌的气球营</text>
			<text class="lobby-lead">听一听、把汉字和拼音配一对，帮萌萌收集小星星～</text>
			<text class="lobby-sub">字都来自萌萌常用字；下面可以优先带上「常错的字」多练几遍。</text>

			<view class="lobby-switch-row">
				<text class="lobby-switch-label">常错字优先进字池</text>
				<switch :checked="preferWrongChars" color="#ec407a" @change="onPreferWrongChange" />
			</view>

			<button class="lobby-btn" type="default" :loading="starting" @click="startRun('hear')">听一听 · 升气球（3关）</button>
			<button class="lobby-btn lobby-btn-sec" type="default" :loading="starting" @click="startRun('pair')">星星配对 · 汉字配拼音（4对）</button>
			<button class="lobby-btn lobby-btn-mix" type="default" :loading="starting" @click="startRun('mixed')">轮换闯关（听2+配1）</button>
			<button class="lobby-ghost" type="default" @click="goHome">回识字首页</button>
		</view>

		<!-- 耳朵捉字 -->
		<view v-else-if="phase === 'play'" class="play">
			<view class="play-head">
				<image class="play-mascot-img" src="/static/mengmeng/logo-icon.png" mode="aspectFit" />
				<view class="play-head-text">
					<text class="play-tag">气球关</text>
					<text class="play-step">第 {{ qIndex + 1 }} / {{ totalQ }} 关</text>
				</view>
			</view>
			<view class="balloon-track">
				<text
					v-for="n in totalQ"
					:key="n"
					class="track-dot"
					:class="n - 1 < qIndex ? 'track-done' : n - 1 === qIndex ? 'track-on' : 'track-off'"
				>●</text>
			</view>

			<view v-if="hearPinyinShow" class="play-hear-pinyin" :class="{ 'play-hear-pinyin--reading': hearLocked }">
				<text class="play-hear-pinyin-label">正在读的拼音</text>
				<pinyin-four-lines-row
					class="play-hear-pflr"
					:syllables="hearPinyinTokens"
					size="lg"
					:highlight-column-index="hearHighlightCol"
				/>
			</view>

			<button class="hear-btn" type="default" :disabled="hearLocked" @click="onHearAgain">再听一遍</button>

			<view class="opts" :class="optionColClass">
				<button
					v-for="(c, i) in options"
					:key="`${qIndex}-${i}-${c}`"
					class="opt-btn"
					type="default"
					:disabled="optDisabled || hearLocked"
					@click="onPick(c)"
				>
					<text class="opt-char">{{ c }}</text>
				</button>
			</view>

			<text class="play-hint">{{ hearLocked ? '听一听中，听完再选哦～' : '先听一听，再点你听到的那个字' }}</text>
			<button class="play-ghost" type="default" @click="backToLobby">回营地</button>
		</view>

		<!-- 星星配对（点选连线） -->
		<view v-else-if="phase === 'pair'" class="pair-wrap">
			<view class="play-head">
				<text class="play-mascot">⭐</text>
				<view class="play-head-text">
					<text class="play-tag pair-tag">星星配对</text>
					<text class="play-step">点左边的字，再点右边拼音，连成一条线</text>
				</view>
			</view>
			<text class="pair-progress">已配好 {{ pairMatched }} / {{ pairTarget }} 对</text>

			<view id="pair-board" class="pair-board">
				<canvas
					canvas-id="pair-link-canvas"
					id="pair-link-canvas"
					class="pair-link-canvas"
					:style="pairCanvasStyle"
					:width="pairCanvasBufW"
					:height="pairCanvasBufH"
				/>
				<view class="pair-columns">
					<view class="pair-col">
						<text class="pair-col-hd">汉字</text>
						<view
							v-for="(cell, i) in pairLeft"
							:id="'pair-L-' + i"
							:key="'L' + i"
							class="pair-cell"
							:class="{
								'pair-cell-done': cell.done,
								'pair-cell-sel': pickLIdx === i && !cell.done
							}"
							@click="onTapPairLeft(i)"
						>
							<text class="pair-char">{{ cell.done ? '✓' : cell.hanzi }}</text>
						</view>
					</view>
					<view class="pair-mid" />
					<view class="pair-col">
						<text class="pair-col-hd">拼音</text>
						<view
							v-for="(cell, i) in pairRight"
							:id="'pair-R-' + i"
							:key="'R' + i"
							class="pair-cell pair-cell-py"
							:class="{
								'pair-cell-done': cell.done,
								'pair-cell-sel': pickRIdx === i && !cell.done
							}"
							@click="onTapPairRight(i)"
						>
							<text v-if="cell.done" class="pair-char">✓</text>
							<pinyin-four-lines-row
								v-else
								class="pair-pflr"
								:syllables="pairSyllablesForPinyin(cell.pinyin)"
								size="compact"
							/>
						</view>
					</view>
				</view>
			</view>

			<text class="play-hint">点字再点拼音，连线配对；配错了红线会闪一下哦</text>
			<button class="play-ghost" type="default" @click="backToLobby">回营地</button>
		</view>

		<!-- 结算模态框（先播提示音再弹出） -->
		<view
			v-if="doneModalVisible"
			class="done-modal-mask"
			@touchmove.stop.prevent
		>
			<view class="done-modal-panel" @click.stop>
				<text class="done-icon" aria-hidden="true">{{ doneIcon }}</text>
				<text class="done-title">这一轮玩完啦</text>
				<text class="done-score">{{ doneScoreLine }}</text>
				<text class="done-msg">{{ doneEncourage }}</text>
				<button class="done-btn" type="default" @click="onDoneReplay">再玩一轮</button>
				<button class="done-primary" type="primary" @click="onDoneGoHome">回识字首页</button>
				<button class="done-ghost" type="default" @click="onDoneBackLobby">回营地</button>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { COL, COL_PROGRESS, LIST_TYPE_PREFERENCE } from '@/constants/curriculum-schema.js'
import { queryAllShiziCurriculumChars, queryCurriculumChars } from '@/utils/curriculum-db.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import { normLessonPayloadPinyin, playLessonTargetReading } from '@/utils/lesson-mode-play-target.js'
import { playOpusForDisplayPinyin, stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import { stopHanziSpeech } from '@/utils/speak-hanzi.js'
import { MENG_VOICE_PLANNED, playMengmengVoice } from '@/utils/mengmeng-voice.js'
import {
	addCharWrongCount,
	listWrongOftenCharsForCurriculumPrefs
} from '@/utils/user-progress-storage.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import { VIP_QUOTA_LIMITS } from '@/constants/vip-quota-limits.js'
import { gateAndPromptWithAd, VIP_FEATURE, QUOTA_KEYS } from '@/utils/vip-gate.js'
import { AD_PLACEMENTS } from '@/constants/ad-placements.js'
import { reLaunchHome } from '@/utils/root-nav.js'
import { recordGameLevelClear } from '@/utils/achievement-stats-storage.js'
import { createLegacyCanvasContext, flushLegacyCanvasDraw } from '@/utils/uni-legacy-canvas.js'

const STORAGE_PREFER_WRONG = 'literacy_camp_prefer_wrong_v1'
const ROUND_HEAR = 3
const ROUND_PAIR = 4
const MIXED_PAIR_PAIRS = 3
/** 听音辨字至少需要 2 个不同汉字（1 目标 + 干扰项） */
const MIN_GAME_POOL = 2
const FALLBACK_GAME_CHARS = ['大', '小', '天', '口', '手', '人', '山', '水', '火', '木']
/** 配对成功连线配色（轮换） */
const PAIR_LINK_COLORS = ['#66bb6a', '#7e57c2', '#42a5f5', '#ffa726', '#ec407a']
const PAIR_BAD_FLASH_MS = 420
const PAIR_LINK_CANVAS_ID = 'pair-link-canvas'

function shuffle(arr) {
	const a = (arr || []).slice()
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

function firstHanzi(text) {
	const s = String(text || '').trim()
	const m = s.match(/[\u4e00-\u9fff]/)
	return m ? m[0] : ''
}

function uniquePoolRows(rows) {
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

export default {
	components: {
		MengSubPage,
		PinyinFourLinesRow
	},
	data() {
		return {
			phase: 'lobby',
			starting: false,
			preferWrongChars: true,
			runMode: 'hear',
			lastRunMode: 'hear',
			pool: [],
			targets: [],
			qIndex: 0,
			totalQ: ROUND_HEAR,
			options: [],
			attempt: 1,
			score: 0,
			targetHanzi: '',
			targetPinyin: '',
			optDisabled: false,
			/** 读音未播完时禁止点选 */
			hearLocked: true,
			/** 连读时当前高亮音节列，-1 为无 */
			hearHighlightCol: -1,
			doneModalVisible: false,
			_openingDoneModal: false,
			autoHearTimer: null,
			retryHearTimer: null,
			/** 递增以取消在途读音，避免快速点选叠音 */
			hearPlayGen: 0,
			/** 混合闯关：{ type: 'hear'|'pair', n?: number } */
			segmentPlan: [],
			segmentIdx: 0,
			mixedHearScore: 0,
			_hearBaseForSeg: 0,
			pairLeft: [],
			pairRight: [],
			pairTarget: ROUND_PAIR,
			pickLIdx: null,
			pickRIdx: null,
			pairMatched: 0,
			/** 已配对连线 { lIdx, rIdx, color } */
			pairLinks: [],
			/** 临时错线 { lIdx, rIdx } */
			pairBadLink: null,
			pairBoardCssW: 300,
			pairBoardCssH: 400,
			pairCanvasBufW: 300,
			pairCanvasBufH: 400,
			_pairBadTimer: null,
			_pairRedrawTimer: null,
			_pairDrawGen: 0,
			_pairBadToken: 0
		}
	},
	computed: {
		pairCanvasStyle() {
			return {
				width: `${this.pairBoardCssW}px`,
				height: `${this.pairBoardCssH}px`
			}
		},
		optionColClass() {
			return this.options.length >= 3 ? 'opts-3' : 'opts-2'
		},
		hearPinyinTokens() {
			return this.pinyinTokensFromDisplay(this.targetPinyin)
		},
		hearPinyinShow() {
			return this.hearPinyinTokens.length > 0
		},
		doneIcon() {
			if (this.lastRunMode === 'pair') return '⭐⭐⭐'
			if (this.lastRunMode === 'mixed') return '🎈⭐'
			return '🎈🎈🎈'
		},
		doneScoreLine() {
			if (this.lastRunMode === 'pair') return `配对了 ${this.score} 组汉字与拼音`
			if (this.lastRunMode === 'mixed') {
				const h = this.mixedHearScore
				const p = Math.max(0, this.score - h)
				return `听音答对 ${h} 题 · 配对 ${p} 组`
			}
			return `点亮了 ${this.score} 颗游戏星星`
		},
		doneEncourage() {
			if (this.lastRunMode === 'pair') {
				if (this.score >= this.pairTarget) return '汉字和拼音都对上啦，真棒！'
				if (this.score >= 2) return '很不错，多玩几次就更快啦～'
				return '慢慢来，字音会越来越熟的～'
			}
			if (this.lastRunMode === 'mixed') {
				const max = 2 + MIXED_PAIR_PAIRS
				if (this.score >= max && this.mixedHearScore >= 2) return '闯关小能手，萌萌给你点赞！'
				return '轮换闯关完成啦，下次再来～'
			}
			if (this.score >= this.totalQ) return '全点亮啦，小耳朵真厉害！'
			if (this.score >= 2) return '很棒啦，下次试试全点亮～'
			return '多玩几轮就会更熟，萌萌陪你～'
		}
	},
	created() {
		try {
			const v = uni.getStorageSync(STORAGE_PREFER_WRONG)
			if (v === false || v === 'false' || v === 0) this.preferWrongChars = false
			else if (v === true || v === 'true' || v === 1) this.preferWrongChars = true
		} catch (_) {}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: '萌萌的气球营' })
	},
	onUnload() {
		this._openingDoneModal = false
		this.doneModalVisible = false
		this.clearPairLineTimers()
		this.stopGameAudio()
	},
	onHide() {
		this.stopGameAudio()
	},
	methods: {
		clearPairLineTimers() {
			if (this._pairBadTimer != null) {
				clearTimeout(this._pairBadTimer)
				this._pairBadTimer = null
			}
			if (this._pairRedrawTimer != null) {
				clearTimeout(this._pairRedrawTimer)
				this._pairRedrawTimer = null
			}
		},
		clearPairLineState() {
			this.clearPairLineTimers()
			this.pairLinks = []
			this.pairBadLink = null
			this._pairDrawGen++
			this._pairBadToken++
			this.clearPairCanvas()
		},
		clearPairCanvas() {
			const ctx = createLegacyCanvasContext(PAIR_LINK_CANVAS_ID, this)
			if (!ctx) return
			const w = this.pairCanvasBufW || this.pairBoardCssW || 1
			const h = this.pairCanvasBufH || this.pairBoardCssH || 1
			try {
				ctx.clearRect(0, 0, w, h)
				flushLegacyCanvasDraw(ctx)
			} catch (_) {}
		},
		scheduleRedrawPairLines(delayMs = 48) {
			if (this._pairRedrawTimer != null) {
				clearTimeout(this._pairRedrawTimer)
				this._pairRedrawTimer = null
			}
			const gen = this._pairDrawGen
			this.$nextTick(() => {
				this._pairRedrawTimer = setTimeout(() => {
					this._pairRedrawTimer = null
					if (gen !== this._pairDrawGen || this.phase !== 'pair') return
					this.redrawPairLines()
				}, Math.max(0, delayMs))
			})
		},
		measurePairBoardLayout() {
			return new Promise((resolve) => {
				const nL = this.pairLeft.length
				const nR = this.pairRight.length
				if (!nL || !nR) {
					resolve(null)
					return
				}
				const q = uni.createSelectorQuery().in(this)
				q.select('#pair-board').boundingClientRect()
				for (let i = 0; i < nL; i++) q.select(`#pair-L-${i}`).boundingClientRect()
				for (let i = 0; i < nR; i++) q.select(`#pair-R-${i}`).boundingClientRect()
				q.exec((res) => {
					const board = res && res[0]
					if (!board || !(board.width > 0) || !(board.height > 0)) {
						resolve(null)
						return
					}
					const lefts = (res || []).slice(1, 1 + nL)
					const rights = (res || []).slice(1 + nL, 1 + nL + nR)
					resolve({ board, lefts, rights })
				})
			})
		},
		anchorFromRect(rect, board, side) {
			if (!rect || !board) return null
			const y = rect.top - board.top + rect.height / 2
			const x =
				side === 'right'
					? rect.left - board.left + rect.width
					: rect.left - board.left
			if (!Number.isFinite(x) || !Number.isFinite(y)) return null
			return { x, y }
		},
		strokePairSegment(ctx, x1, y1, x2, y2, color, width, dashed) {
			ctx.setStrokeStyle(color)
			ctx.setLineWidth(width)
			ctx.setLineCap('round')
			if (dashed) {
				const dx = x2 - x1
				const dy = y2 - y1
				const len = Math.sqrt(dx * dx + dy * dy) || 1
				const ux = dx / len
				const uy = dy / len
				const dash = 7
				const gap = 5
				let d = 0
				let draw = true
				while (d < len) {
					const seg = Math.min(draw ? dash : gap, len - d)
					const sx = x1 + ux * d
					const sy = y1 + uy * d
					const ex = x1 + ux * (d + seg)
					const ey = y1 + uy * (d + seg)
					if (draw) {
						ctx.beginPath()
						ctx.moveTo(sx, sy)
						ctx.lineTo(ex, ey)
						ctx.stroke()
					}
					d += seg
					draw = !draw
				}
				return
			}
			ctx.beginPath()
			ctx.moveTo(x1, y1)
			ctx.lineTo(x2, y2)
			ctx.stroke()
		},
		fillPairDot(ctx, x, y, color, r) {
			ctx.setFillStyle(color)
			ctx.beginPath()
			ctx.arc(x, y, r, 0, Math.PI * 2)
			ctx.fill()
		},
		async redrawPairLines() {
			if (this.phase !== 'pair') return
			const layout = await this.measurePairBoardLayout()
			if (!layout) return
			const { board, lefts, rights } = layout
			const cssW = Math.max(1, Math.round(board.width))
			const cssH = Math.max(1, Math.round(board.height))
			this.pairBoardCssW = cssW
			this.pairBoardCssH = cssH
			this.pairCanvasBufW = cssW
			this.pairCanvasBufH = cssH

			await new Promise((r) => this.$nextTick(r))
			if (this.phase !== 'pair') return
			const ctx = createLegacyCanvasContext(PAIR_LINK_CANVAS_ID, this)
			if (!ctx) return
			ctx.clearRect(0, 0, cssW, cssH)

			const midX = cssW / 2
			for (const link of this.pairLinks || []) {
				const a = this.anchorFromRect(lefts[link.lIdx], board, 'right')
				const b = this.anchorFromRect(rights[link.rIdx], board, 'left')
				if (!a || !b) continue
				const color = link.color || PAIR_LINK_COLORS[0]
				this.strokePairSegment(ctx, a.x, a.y, b.x, b.y, color, 3.2, false)
				this.fillPairDot(ctx, a.x, a.y, color, 4.5)
				this.fillPairDot(ctx, b.x, b.y, color, 4.5)
			}

			if (this.pairBadLink) {
				const a = this.anchorFromRect(lefts[this.pairBadLink.lIdx], board, 'right')
				const b = this.anchorFromRect(rights[this.pairBadLink.rIdx], board, 'left')
				if (a && b) {
					this.strokePairSegment(ctx, a.x, a.y, b.x, b.y, '#e53935', 3.5, false)
					this.fillPairDot(ctx, a.x, a.y, '#e53935', 4)
					this.fillPairDot(ctx, b.x, b.y, '#e53935', 4)
				}
			} else if (this.pickLIdx != null && this.pickRIdx == null) {
				const a = this.anchorFromRect(lefts[this.pickLIdx], board, 'right')
				if (a) {
					this.strokePairSegment(ctx, a.x, a.y, midX, a.y, '#b39ddb', 2.4, true)
					this.fillPairDot(ctx, a.x, a.y, '#7e57c2', 4)
				}
			}

			flushLegacyCanvasDraw(ctx)
		},
		clearAutoHear() {
			if (this.autoHearTimer != null) {
				clearTimeout(this.autoHearTimer)
				this.autoHearTimer = null
			}
		},
		clearRetryHear() {
			if (this.retryHearTimer != null) {
				clearTimeout(this.retryHearTimer)
				this.retryHearTimer = null
			}
		},
		/** 停止自动听音、本地拼音与 TTS，并作废在途播放 */
		stopGameAudio() {
			this.hearPlayGen++
			this.hearHighlightCol = -1
			this.clearAutoHear()
			this.clearRetryHear()
			stopLocalPinyinAudio()
			stopHanziSpeech()
		},
		pinyinTokensFromDisplay(pyRaw) {
			const raw = normLessonPayloadPinyin(pyRaw)
			if (!raw || raw === '-') return []
			let tokens = splitPinyinDisplayTokens(raw)
			if (!tokens.length) {
				const s = raw.replace(/[()（）]/g, '').trim()
				if (s && s !== '-') tokens = [s]
			}
			return tokens
		},
		onPreferWrongChange(e) {
			const on = !!(e.detail && e.detail.value)
			this.preferWrongChars = on
			try {
				uni.setStorageSync(STORAGE_PREFER_WRONG, on)
			} catch (_) {}
		},
		pyShowRow(row) {
			let s = String(row[COL.pinyin] || '').replace(/\s+/g, ' ').trim()
			if (!s && row[COL.hanzi]) {
				try {
					const c = String(row[COL.hanzi]).trim().charAt(0)
					if (c) s = spellDisplayString(c, 'tone', 'poly', 'low') || ''
				} catch (_) {}
			}
			return s ? s : '-'
		},
		pyFromWrongRec(rec) {
			const h = String(rec[COL_PROGRESS.hanzi] || '').trim().charAt(0)
			if (!h) return '-'
			try {
				return spellDisplayString(h, 'tone', 'poly', 'low') || '-'
			} catch (_) {
				return '-'
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
		mapRowsToPoolEntries(rows) {
			return (rows || []).map((row) => ({
				hanzi: String(row[COL.hanzi] || '').trim(),
				pinyin: this.pyShowRow(row)
			}))
		},
		appendWrongCharsToPool(combined, prefs) {
			if (!this.preferWrongChars) return
			const wrongList = listWrongOftenCharsForCurriculumPrefs(prefs, 20)
			for (const w of wrongList) {
				combined.push({
					hanzi: String(w[COL_PROGRESS.hanzi] || '').trim(),
					pinyin: this.pyFromWrongRec(w)
				})
			}
		},
		async buildPool() {
			const prefs = getCurriculumPrefs()
			const combined = []

			this.appendWrongCharsToPool(combined, prefs)
			combined.push(...this.mapRowsToPoolEntries(await queryCurriculumChars(prefs)))

			let pool = uniquePoolRows(combined)

			// 教材设置里若只选了「写字表」等，当前年级可能只剩 0～1 字 → 放宽为全部字表
			if (pool.length < MIN_GAME_POOL) {
				const relaxed = { ...prefs, list_type_preference: LIST_TYPE_PREFERENCE.ALL }
				const extra = []
				this.appendWrongCharsToPool(extra, relaxed)
				extra.push(...this.mapRowsToPoolEntries(await queryCurriculumChars(relaxed)))
				pool = uniquePoolRows([...pool, ...extra])
			}

			// 仍不足：同版本全册识字表（跨年级）
			if (pool.length < MIN_GAME_POOL) {
				const tv = prefs.textbook_version_id
				const allShizi = (await queryAllShiziCurriculumChars()).filter(
					(r) => r.textbook_version_id === tv
				)
				pool = uniquePoolRows([...pool, ...this.mapRowsToPoolEntries(allShizi)])
			}

			if (pool.length < MIN_GAME_POOL) {
				const fallback = FALLBACK_GAME_CHARS.map((hanzi) => ({ hanzi, pinyin: '' }))
				pool = uniquePoolRows([...pool, ...fallback])
			}

			return shuffle(pool)
		},
		async startRun(mode) {
			if (this.starting) return
			const g = await gateAndPromptWithAd(VIP_FEATURE.GAME_UNLIMITED, {
				quotaKey: QUOTA_KEYS.GAME_SESSION,
				quotaLimit: VIP_QUOTA_LIMITS[QUOTA_KEYS.GAME_SESSION],
				quotaTitle: '今日气球营次数已用完',
				quotaMessage: '免费版每日可闯关 2 次。开通会员后不限次。',
				adPlacement: AD_PLACEMENTS.GAME_EXTRA_SESSION
			})
			if (!g.ok) return
			this.starting = true
			this.clearAutoHear()
			this.lastRunMode = mode
			this.runMode = mode
			this.segmentPlan = []
			this.segmentIdx = 0
			this.mixedHearScore = 0
			this._hearBaseForSeg = 0
			try {
				this.pool = await this.buildPool()
				if (this.pool.length < MIN_GAME_POOL) {
					uni.showToast({
						title: '字库加载失败，请稍后重试',
						icon: 'none',
						duration: 2800
					})
					return
				}
				if (mode === 'hear') {
					this.startHearRound(ROUND_HEAR)
				} else if (mode === 'pair') {
					if (this.pool.length < ROUND_PAIR) {
						uni.showToast({ title: '汉字不够配对啦，稍后再来', icon: 'none' })
						return
					}
					this.startPairRound(ROUND_PAIR)
				} else {
					if (this.pool.length < MIXED_PAIR_PAIRS) {
						uni.showToast({ title: '生字不够闯关啦', icon: 'none' })
						return
					}
					this.segmentPlan = shuffle([
						{ type: 'hear', q: 1 },
						{ type: 'hear', q: 1 },
						{ type: 'pair', pairs: MIXED_PAIR_PAIRS }
					])
					this.score = 0
					this.startMixedSegment()
				}
			} catch (e) {
				console.warn('[game] startRun', e)
				uni.showToast({ title: '加载失败，请重试', icon: 'none' })
				this.phase = 'lobby'
			} finally {
				this.starting = false
			}
		},
		replayLastRun() {
			this.closeDoneModal()
			this.startRun(this.lastRunMode || 'hear')
		},
		startHearRound(n) {
			this._hearBaseForSeg = this.score
			if (this.runMode !== 'mixed') this.score = 0
			const count = Math.min(n, this.pool.length)
			this.targets = shuffle(this.pool).slice(0, count)
			this.totalQ = this.targets.length
			this.qIndex = 0
			this.phase = 'play'
			this.loadQuestion(0)
		},
		startMixedSegment() {
			const seg = this.segmentPlan[this.segmentIdx]
			if (!seg) {
				this.enterDonePhase()
				return
			}
			if (seg.type === 'hear') {
				this.startHearRound(seg.q || 1)
			} else {
				this.startPairRound(seg.pairs || MIXED_PAIR_PAIRS)
			}
		},
		pairPinyinLabel(row) {
			let s = String(row && row.pinyin != null ? row.pinyin : '')
				.replace(/\s+/g, ' ')
				.trim()
			if (!s || s === '-') {
				const h = firstHanzi(row && row.hanzi)
				if (h) {
					try {
						s = spellDisplayString(h, 'tone', 'poly', 'low') || ''
					} catch (_) {
						s = ''
					}
				}
			}
			return s || '—'
		},
		pairSyllablesForPinyin(py) {
			const raw = String(py || '').trim()
			if (!raw || raw === '—') return []
			const tokens = splitPinyinDisplayTokens(raw)
			if (tokens.length) return tokens
			const s = raw.replace(/[()（）]/g, '').trim()
			if (s && s !== '-') return [s]
			return [raw]
		},
		startPairRound(nPairs) {
			if (this.runMode === 'pair') this.score = 0
			const n = Math.min(nPairs, this.pool.length)
			this.pairTarget = n
			const selected = shuffle(this.pool).slice(0, n)
			const leftOrder = shuffle(selected.map((r) => firstHanzi(r.hanzi)).filter(Boolean))
			const rightOrder = shuffle(
				selected.map((r) => {
					const hanzi = firstHanzi(r.hanzi)
					return { hanzi, pinyin: this.pairPinyinLabel(r) }
				})
			)
			this.clearPairLineState()
			this.pairLeft = leftOrder.map((hanzi) => ({ hanzi, done: false }))
			this.pairRight = rightOrder.map((x) => ({ hanzi: x.hanzi, pinyin: x.pinyin, done: false }))
			this.pickLIdx = null
			this.pickRIdx = null
			this.pairMatched = 0
			this.phase = 'pair'
			this.scheduleRedrawPairLines(80)
		},
		onTapPairLeft(i) {
			const cell = this.pairLeft[i]
			if (!cell || cell.done) return
			if (this._pairBadTimer != null) {
				clearTimeout(this._pairBadTimer)
				this._pairBadTimer = null
			}
			this.pairBadLink = null
			this.pickLIdx = i
			this.scheduleRedrawPairLines(16)
			this.tryPairMatch()
		},
		onTapPairRight(i) {
			const cell = this.pairRight[i]
			if (!cell || cell.done) return
			if (this.pickLIdx == null) {
				uni.showToast({ title: '先点左边的汉字哦', icon: 'none' })
				return
			}
			this.pickRIdx = i
			this.tryPairMatch()
		},
		tryPairMatch() {
			if (this.pickLIdx == null || this.pickRIdx == null) return
			const li = this.pickLIdx
			const ri = this.pickRIdx
			const L = this.pairLeft[li]
			const R = this.pairRight[ri]
			if (!L || !R) return
			if (L.hanzi === R.hanzi) {
				if (this._pairBadTimer != null) {
					clearTimeout(this._pairBadTimer)
					this._pairBadTimer = null
				}
				this.pairBadLink = null
				const color = PAIR_LINK_COLORS[this.pairLinks.length % PAIR_LINK_COLORS.length]
				this.pairLinks = this.pairLinks.concat([{ lIdx: li, rIdx: ri, color }])
				this.$set(this.pairLeft, li, { ...L, done: true })
				this.$set(this.pairRight, ri, { ...R, done: true })
				this.pickLIdx = null
				this.pickRIdx = null
				this.pairMatched++
				this.score++
				recordGameLevelClear(1)
				this.scheduleRedrawPairLines(32)
				if (this.pairMatched >= this.pairTarget) {
					this.finishPairPhase()
				}
			} else {
				uni.showToast({ title: '这个字和这条拼音不是一对哦', icon: 'none' })
				this.pairBadLink = { lIdx: li, rIdx: ri }
				this.pickLIdx = null
				this.pickRIdx = null
				this.scheduleRedrawPairLines(16)
				if (this._pairBadTimer != null) clearTimeout(this._pairBadTimer)
				const badToken = ++this._pairBadToken
				this._pairBadTimer = setTimeout(() => {
					this._pairBadTimer = null
					if (badToken !== this._pairBadToken) return
					this.pairBadLink = null
					this.scheduleRedrawPairLines(0)
				}, PAIR_BAD_FLASH_MS)
			}
		},
		finishPairPhase() {
			if (this.runMode === 'mixed') {
				this.segmentIdx++
				if (this.segmentIdx >= this.segmentPlan.length) {
					this.enterDonePhase()
					return
				}
				this.startMixedSegment()
				return
			}
			this.enterDonePhase()
		},
		enterDonePhase() {
			void this.openDoneModal()
		},
		async openDoneModal() {
			if (this._openingDoneModal || this.doneModalVisible) return
			this._openingDoneModal = true
			this.hearHighlightCol = -1
			this.stopGameAudio()
			try {
				await playMengmengVoice(MENG_VOICE_PLANNED.GAME_ROUND_DONE, { minGapMs: 0 })
			} catch (_) {}
			if (this._openingDoneModal) {
				this.targetHanzi = ''
				this.targetPinyin = ''
				this.phase = 'done'
				this.doneModalVisible = true
			}
			this._openingDoneModal = false
		},
		closeDoneModal() {
			this.doneModalVisible = false
			this._openingDoneModal = false
		},
		onDoneReplay() {
			this.closeDoneModal()
			this.phase = 'lobby'
			this.replayLastRun()
		},
		onDoneGoHome() {
			this.closeDoneModal()
			this.goHome()
		},
		onDoneBackLobby() {
			this.closeDoneModal()
			this.backToLobby()
		},
		scheduleAutoHear() {
			this.clearAutoHear()
			const hanzi = this.targetHanzi
			this.autoHearTimer = setTimeout(() => {
				this.autoHearTimer = null
				if (this.phase === 'play' && this.targetHanzi === hanzi) {
					void this.playTargetSound()
				}
			}, 400)
		},
		async playTargetHearReading(hanzi, py, gen) {
			const cancelled = () => gen !== this.hearPlayGen || this.phase !== 'play'
			const tokens = this.pinyinTokensFromDisplay(py)
			stopLocalPinyinAudio()
			stopHanziSpeech()
			if (cancelled()) return
			if (tokens.length > 1) {
				for (let i = 0; i < tokens.length; i++) {
					if (cancelled()) return
					this.hearHighlightCol = i
					const ok = await playOpusForDisplayPinyin(tokens[i], {
						isCancelled: cancelled,
						gapMs: 0
					})
					if (ok && i < tokens.length - 1 && !cancelled()) {
						await new Promise((r) => setTimeout(r, 80))
					}
				}
				return
			}
			this.hearHighlightCol = tokens.length === 1 ? 0 : 0
			await playLessonTargetReading(hanzi, py, { isCancelled: cancelled })
		},
		async playTargetSound() {
			if (this.phase !== 'play' || !this.targetHanzi) return
			const gen = ++this.hearPlayGen
			const hanzi = this.targetHanzi
			const py = this.targetPinyin
			this.hearLocked = true
			this.hearHighlightCol = -1
			try {
				if (gen !== this.hearPlayGen) return
				await this.playTargetHearReading(hanzi, py, gen)
			} catch (e) {
				console.warn('[game] playTargetSound', e)
			} finally {
				this.hearHighlightCol = -1
				if (this.phase !== 'play' || gen !== this.hearPlayGen) {
					stopLocalPinyinAudio()
					stopHanziSpeech()
				} else {
					this.hearLocked = false
				}
			}
		},
		buildOptions(target) {
			const others = shuffle(this.pool.filter((r) => r.hanzi !== target.hanzi))
			if (this.pool.length >= 3) {
				return shuffle([target.hanzi, others[0].hanzi, others[1].hanzi])
			}
			return shuffle([target.hanzi, others[0].hanzi])
		},
		loadQuestion(idx) {
			this.stopGameAudio()
			const t = this.targets[idx]
			if (!t) {
				this.finishHearPhase()
				return
			}
			this.targetHanzi = t.hanzi
			this.targetPinyin = t.pinyin != null ? String(t.pinyin) : ''
			this.options = this.buildOptions(t)
			this.attempt = 1
			this.optDisabled = false
			this.hearLocked = true
			this.scheduleAutoHear()
		},
		finishHearPhase() {
			if (this.runMode === 'mixed') {
				this.mixedHearScore += this.score - this._hearBaseForSeg
				this.stopGameAudio()
				this.segmentIdx++
				if (this.segmentIdx >= this.segmentPlan.length) {
					this.enterDonePhase()
					return
				}
				this.startMixedSegment()
				return
			}
			this.enterDonePhase()
		},
		onHearAgain() {
			if (this.phase !== 'play' || !this.targetHanzi || this.hearLocked) return
			this.clearAutoHear()
			this.clearRetryHear()
			void this.playTargetSound()
		},
		onPick(c) {
			if (this.phase !== 'play' || this.optDisabled || this.hearLocked) return
			const pick = firstHanzi(c)
			if (pick === this.targetHanzi) {
				this.stopGameAudio()
				this.score++
				this.advanceQuestion()
				return
			}
			if (this.attempt === 1) {
				this.attempt = 2
				this.hearLocked = true
				this.stopGameAudio()
				const hanzi = this.targetHanzi
				uni.showToast({ title: '再听一遍', icon: 'none' })
				this.retryHearTimer = setTimeout(() => {
					this.retryHearTimer = null
					if (this.phase !== 'play' || this.targetHanzi !== hanzi) return
					void this.playTargetSound()
				}, 280)
				return
			}
			this.stopGameAudio()
			addCharWrongCount(this.targetHanzi, 1, this.curriculumDims())
			uni.showToast({ title: `是「${this.targetHanzi}」`, icon: 'none' })
			this.optDisabled = true
			this.hearLocked = true
			setTimeout(() => {
				this.optDisabled = false
				this.stopGameAudio()
				this.advanceQuestion()
			}, 900)
		},
		advanceQuestion() {
			recordGameLevelClear(1)
			this.qIndex++
			if (this.qIndex >= this.totalQ) {
				this.loadQuestion(this.qIndex)
				return
			}
			this.loadQuestion(this.qIndex)
		},
		backToLobby() {
			this.closeDoneModal()
			this.stopGameAudio()
			this.clearPairLineState()
			this.phase = 'lobby'
		},
		goHome() {
			this.stopGameAudio()
			reLaunchHome()
		}
	}
}
</script>

<style scoped>
.lobby {
	padding: 8rpx 24rpx 48rpx;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 36rpx;
}

.lobby-mascot {
	width: 200rpx;
	height: 200rpx;
	margin-bottom: 8rpx;
}

.lobby-balloon {
	font-size: 56rpx;
	margin-bottom: 16rpx;
}

.lobby-title {
	font-size: 40rpx;
	font-weight: 800;
	color: #c2185b;
	margin-bottom: 16rpx;
	text-align: center;
}

.lobby-lead {
	font-size: 30rpx;
	color: #5d4037;
	font-weight: 600;
	text-align: center;
	margin-bottom: 12rpx;
	padding: 0 16rpx;
}

.lobby-sub {
	font-size: 24rpx;
	color: #8a8279;
	line-height: 1.5;
	text-align: center;
	margin-bottom: 24rpx;
	padding: 0 20rpx;
}

.lobby-switch-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	width: 86%;
	max-width: 520rpx;
	padding: 16rpx 20rpx;
	margin-bottom: 28rpx;
	background: #fff;
	border-radius: 16rpx;
	border: 1rpx solid #f8bbd0;
	box-sizing: border-box;
}

.lobby-switch-label {
	font-size: 26rpx;
	color: #5d4037;
	flex: 1;
	padding-right: 16rpx;
}

.lobby-btn {
	width: 78%;
	max-width: 460rpx;
	padding: 20rpx;
	font-size: 30rpx;
	font-weight: 700;
	color: #fff;
	background: #ec407a;
	border: none;
	border-radius: 999rpx;
	margin-bottom: 14rpx;
}

.lobby-btn-sec {
	background: #7e57c2;
}

.lobby-btn-mix {
	background: #00897b;
}

.lobby-ghost {
	font-size: 26rpx;
	color: #8a8279;
	background: transparent;
	border: none;
	margin-top: 12rpx;
}

.play {
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

.play-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-bottom: 16rpx;
}

.play-mascot-img {
	width: 72rpx;
	height: 72rpx;
	margin-right: 14rpx;
	flex-shrink: 0;
}

.play-mascot-star {
	font-size: 52rpx;
	margin-right: 14rpx;
	line-height: 1;
}

.play-head-text {
	flex: 1;
	min-width: 0;
}

.play-tag {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: #ec407a;
}

.pair-tag {
	color: #7e57c2;
}

.play-step {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: #5d4037;
	margin-top: 4rpx;
}

.balloon-track {
	display: flex;
	flex-direction: row;
	justify-content: center;
	margin-bottom: 24rpx;
}

.track-dot {
	font-size: 22rpx;
	margin: 0 10rpx;
	line-height: 1;
}

.track-done {
	color: #66bb6a;
}

.track-on {
	color: #ff9800;
}

.track-off {
	color: #e0e0e0;
}

.play-hear-pinyin {
	width: 100%;
	max-width: 560rpx;
	margin: 0 auto 28rpx;
	padding: 20rpx 16rpx 12rpx;
	box-sizing: border-box;
	background: rgba(255, 255, 255, 0.92);
	border-radius: 20rpx;
	border: 2rpx solid #f8bbd0;
}

.play-hear-pinyin-label {
	display: block;
	text-align: center;
	font-size: 24rpx;
	color: #ad1457;
	margin-bottom: 12rpx;
	font-weight: 600;
}

.play-hear-pflr {
	width: 100%;
}

.play-hear-pinyin--reading ::v-deep .pflr-cell--reading .pflr-glyphs-row {
	animation: game-hear-py-pulse 0.9s ease-in-out infinite;
}

@keyframes game-hear-py-pulse {
	0%,
	100% {
		filter: brightness(1);
	}
	50% {
		filter: brightness(1.22);
	}
}

.hear-btn {
	margin-bottom: 32rpx;
	background: #fce4ec;
	color: #ad1457;
	font-size: 30rpx;
	border-radius: 16rpx;
	border: 2rpx solid #f8bbd0;
}

.hear-btn[disabled] {
	opacity: 0.55;
}

.opts {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	margin-bottom: 16rpx;
}

.opts-3 .opt-btn {
	width: 30%;
	min-width: 160rpx;
}

.opts-2 .opt-btn {
	width: 42%;
	min-width: 200rpx;
}

.opt-btn {
	margin: 12rpx;
	padding: 36rpx 20rpx;
	background: #fff;
	border-radius: 16rpx;
	border: 2rpx solid #f0e6d4;
	box-sizing: border-box;
}

.opt-btn[disabled] {
	opacity: 0.5;
}

.opt-char {
	font-size: 72rpx;
	font-weight: 700;
	color: #4e342e;
}

.play-hint {
	display: block;
	text-align: center;
	font-size: 24rpx;
	color: #9e9e9e;
	margin-bottom: 24rpx;
}

.play-ghost {
	font-size: 26rpx;
	color: #8a8279;
	background: transparent;
	border: none;
}

.pair-wrap {
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

.pair-progress {
	display: block;
	text-align: center;
	font-size: 26rpx;
	color: #5d4037;
	font-weight: 600;
	margin-bottom: 20rpx;
}

.pair-board {
	position: relative;
	width: 100%;
	margin-bottom: 16rpx;
	box-sizing: border-box;
}

.pair-link-canvas {
	position: absolute;
	left: 0;
	top: 0;
	z-index: 1;
	pointer-events: none;
}

.pair-columns {
	position: relative;
	z-index: 2;
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: flex-start;
}

.pair-col {
	display: flex;
	flex-direction: column;
	width: 34%;
	max-width: 260rpx;
}

.pair-col-hd {
	display: block;
	text-align: center;
	font-size: 22rpx;
	font-weight: 700;
	color: #7e57c2;
	margin-bottom: 10rpx;
}

.pair-cell-py {
	padding: 16rpx 6rpx;
	min-height: 100rpx;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
}

.pair-pflr {
	width: 100%;
	min-width: 0;
}

.pair-mid {
	width: 100rpx;
	flex-shrink: 0;
}

.pair-cell {
	margin-bottom: 16rpx;
	padding: 28rpx 12rpx;
	background: #fff;
	border-radius: 16rpx;
	border: 2rpx solid #e1bee7;
	text-align: center;
}

.pair-cell-sel {
	border-color: #7e57c2;
	background: #f3e5f5;
}

.pair-cell-done {
	border-color: #a5d6a7;
	background: #e8f5e9;
	opacity: 0.95;
}

.pair-char {
	font-size: 56rpx;
	font-weight: 700;
	color: #4e342e;
}

.done-modal-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 1000;
	background: rgba(45, 35, 35, 0.52);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40rpx 32rpx;
	box-sizing: border-box;
}

.done-modal-panel {
	width: 100%;
	max-width: 620rpx;
	background: #fff;
	border-radius: 28rpx;
	padding: 48rpx 36rpx 40rpx;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	box-shadow: 0 24rpx 64rpx rgba(173, 20, 87, 0.18);
}

.done-icon {
	font-size: 56rpx;
	margin-bottom: 12rpx;
}

.done-title {
	font-size: 38rpx;
	font-weight: 700;
	color: #c2185b;
	margin-bottom: 16rpx;
}

.done-score {
	font-size: 28rpx;
	color: #5d4037;
	margin-bottom: 16rpx;
	text-align: center;
	padding: 0 20rpx;
	line-height: 1.45;
}

.done-msg {
	font-size: 26rpx;
	color: #8a8279;
	text-align: center;
	line-height: 1.5;
	margin-bottom: 40rpx;
	padding: 0 28rpx;
}

.done-btn {
	width: 72%;
	max-width: 420rpx;
	margin-bottom: 16rpx;
	border-radius: 16rpx;
	background: #fff;
	border: 2rpx solid #f8bbd0;
	color: #ad1457;
}

.done-primary {
	width: 72%;
	max-width: 420rpx;
	border-radius: 16rpx;
	margin-bottom: 12rpx;
}

.done-ghost {
	width: 72%;
	max-width: 420rpx;
	border-radius: 16rpx;
	background: transparent;
	border: none;
	color: #8a8279;
	font-size: 26rpx;
}
</style>
