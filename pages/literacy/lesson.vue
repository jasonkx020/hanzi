<template>
	<view class="page lesson-page">
		<view class="lesson-hero">
			<image class="meng-hero-bg-layer" src="/static/mengmeng/hero-bg.png" mode="aspectFill" />
			<view class="meng-hero-sky-layer" />
			<view class="lesson-hero-sky" />
			<meng-status-bar-spacer :height-px="statusBarPx" />
			<meng-page-nav :title="lessonNavTitle" class="lesson-nav" :inset-status-bar="false" />
			<view class="lesson-hero-card">
				<text class="lesson-grade-chip">{{ gradeSemesterLabel }}</text>
				<text class="lesson-title">{{ hint }}</text>
				<view class="lesson-progress-row">
					<view class="stars">
						<text
							v-for="n in 5"
							:key="n"
							class="star"
							:class="n <= starFilled ? 'star-on' : 'star-off'"
						>★</text>
					</view>
					<text class="lesson-progress-num">已学 {{ learnedCount }}/{{ totalChars }} 字</text>
				</view>
				<text v-if="quizPassedForLesson" class="lesson-quiz-badge">本课小测已通过</text>
			</view>
		</view>

		<view class="lesson-sheet">
		<view v-if="followPhase === 'active'" class="follow-reading-bar">
			<image class="follow-reading-bar-logo" src="/static/mengmeng/logo-icon.png" mode="aspectFit" />
			<view class="follow-reading-bar-text">
				<text class="follow-reading-label">跟读 · 第 {{ followIdx + 1 }}/{{ lessonChars.length }} 字</text>
				<text class="follow-reading-sub">点跳动 logo 停止 · 点「点重听」可重听</text>
			</view>
			<text class="follow-exit" @click="exitFollow">退出</text>
		</view>

		<view class="mode-row" :class="followPhase === 'active' ? 'mode-row--dim' : ''">
			<view
				class="mode-tile mode-tile--follow"
				:class="showFollowGuide ? 'mode-tile--guide' : ''"
				@click="goFollowRead"
			>
				<text class="mode-emoji">🎤</text>
				<text class="mode-label">{{ followPhase === 'active' ? '跟读中' : '跟读' }}</text>
				<text v-if="showFollowGuide" class="mode-guide">点我开始</text>
			</view>
			<view class="mode-tile mode-tile--dictation" @click="onDictation">
				<text class="mode-emoji">✏️</text>
				<text class="mode-label">听写</text>
			</view>
			<view class="mode-tile mode-tile--quiz" @click="onMiniQuiz">
				<text class="mode-emoji">⭐</text>
				<text class="mode-label">小测</text>
			</view>
		</view>

		<view v-if="lessonChars.length" class="card-grid-wrap" :class="followPhase === 'active' ? 'card-grid-wrap--follow' : ''">
			<view
				v-if="followPhase === 'active' && mascotReady"
				class="follow-mascot-wrap"
				:style="mascotStyle"
			>
				<image
					class="follow-mascot"
					:class="mascotJumping ? 'follow-mascot--jump' : ''"
					src="/static/mengmeng/logo-icon.png"
					mode="aspectFit"
				/>
				<text class="follow-mascot-stop" @tap.stop="onMascotTapStop">点我停止</text>
			</view>
			<view
				v-for="(row, i) in lessonChars"
				:key="row.id != null ? row.id : i"
				:id="'follow-cell-' + i"
				class="cell"
				:class="cellClassList(row, i)"
			>
				<view
					v-if="followPhase === 'active' && canFollowJumpTo(i)"
					class="cell-jump-hit"
					@tap.stop="onFollowCellJump(i, row)"
				/>
				<view class="cell-char-hit" @tap.stop="onCellCharTap(row, i)">
					<text class="cell-char">{{ row.hanzi }}</text>
				</view>
				<text
					v-if="followCellStatusLabel(i)"
					class="cell-status-line"
					:class="followCellStatusClass(i)"
				>{{ followCellStatusLabel(i) }}</text>
				<text
					v-else-if="isLearned(row.hanzi) && followPhase !== 'active'"
					class="cell-status-line cell-status-line--learned"
				>已学</text>
				<view class="cell-py-row" @tap.stop="onCellPyTap(row, i)">
					<text class="cell-py-hint">拼音 · 点读</text>
					<pinyin-four-lines-row :syllables="pyTokens(row)" size="compact" />
				</view>
			</view>
		</view>

		<view v-else class="empty-lesson">
			<text class="empty-text">本课暂无生字数据，请在「课本同步学」或教材设置中检查课次与字库。</text>
		</view>

		<view class="meng-tip">
			<meng-avatar pose="happy" size="xs" />
			<text class="meng-tip-msg">{{ followTipText }}</text>
		</view>
		</view>

		<view v-if="followPhase === 'done'" class="follow-done-mask">
			<view class="follow-done-card">
				<image class="follow-done-logo" src="/static/mengmeng/logo-icon.png" mode="aspectFit" />
				<text class="follow-done-title">跟读完成</text>
				<text class="follow-done-sub">{{ followDoneSummary }}</text>
				<view class="follow-done-actions">
					<button class="follow-done-btn" type="default" @click="restartFollowFromHead">再来一遍</button>
					<button class="follow-done-btn follow-done-btn--primary" type="primary" @click="dismissFollowDone">继续看字卡</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { COL_PROGRESS, TEXTBOOK_VERSION_IDS } from '@/constants/curriculum-schema.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'
import {
	buildLessonCharRowsFromRenjiaoItem,
	filterRenjiaoTextbookSyncLessons,
	loadRenjiaoTextbookTexts
} from '@/utils/renjiao-textbook-loader.js'
import { getCurriculumPrefs, formatGradeSemesterLabel } from '@/utils/curriculum-storage.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import { makeProgressKey, getUserProgressMap } from '@/utils/user-progress-storage.js'
import {
	putLessonQuizTransfer,
	putLessonDictationTransfer
} from '@/utils/lesson-mode-session.js'
import { buildStoredLessonKey, hasLessonQuizPassed } from '@/utils/user-lesson-progress-storage.js'
import { logHanziSpeak } from '@/utils/hanzi-speak-debug-log.js'
import { playOpusForDisplayPinyin, stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import { speakChinese } from '@/utils/speak-hanzi.js'
import { playLessonTargetReading } from '@/utils/lesson-mode-play-target.js'
import {
	startFollowReadRecord,
	stopFollowReadRecord,
	cancelFollowReadAutoStop,
	requestFollowReadScore
} from '@/services/pinyin-follow-read-service.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import MengAvatar from '@/components/meng-avatar.vue'
import MengPageNav from '@/components/meng-page-nav.vue'
import MengStatusBarSpacer from '@/components/meng-status-bar-spacer.vue'
import { getMengNavMetrics } from '@/utils/meng-nav-metrics.js'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import { MENG_VOICE, playMengmengVoiceOnce } from '@/utils/mengmeng-voice.js'

function firstHanzi(text) {
	const s = String(text || '').trim()
	const m = s.match(/[\u4e00-\u9fff]/)
	return m ? m[0] : ''
}

function delay(ms) {
	return new Promise((r) => setTimeout(r, ms))
}

export default {
	components: {
		PinyinFourLinesRow,
		MengAvatar,
		MengPageNav,
		MengStatusBarSpacer
	},
	data() {
		return {
			statusBarPx: 44,
			hint: '课次字卡',
			lessonChars: [],
			learnedCount: 0,
			totalChars: 0,
			/** 人教 JSON 课次下标，与课本同步学列表一致 */
			rjLessonIdx: null,
			/** 人教 JSON 该篇 content */
			rjContent: '',
			/** 本课是否曾达到小测通关线（课级 storage，与「已学」字计数独立） */
			quizPassedForLesson: false,
			/** null | active | done */
			followPhase: null,
			followIdx: 0,
			/** @type {Array<'pending'|'reading'|'pass'|'miss'>} */
			followStatuses: [],
			followRecording: false,
			followRecordWatchdog: null,
			/** 防止录音结束回调重复触发导致卡住 */
			followEndHandledKey: '',
			followSessionToken: 0,
			mascotReady: false,
			mascotJumping: false,
			mascotStyle: {
				left: '50%',
				top: '0px',
				transform: 'translate(-50%, 0)'
			}
		}
	},
	computed: {
		lessonNavTitle() {
			const h = String(this.hint || '').trim()
			return h || '课次字卡'
		},
		gradeSemesterLabel() {
			return formatGradeSemesterLabel(getCurriculumPrefs())
		},
		starFilled() {
			const t = this.totalChars
			if (!t) return 0
			return Math.min(5, Math.round((this.learnedCount / t) * 5))
		},
		showFollowGuide() {
			return !!this.lessonChars.length && !this.followPhase
		},
		currentFollowHanzi() {
			const row = this.lessonChars[this.followIdx]
			return row ? firstHanzi(row.hanzi) : ''
		},
		followTipText() {
			if (this.followPhase === 'active') {
				return `看字卡上粉色边框的字跟读；已读的字下方有「点重听」`
			}
			if (this.followPhase === 'done') {
				return '跟读结束，可点生字看详解'
			}
			if (this.showFollowGuide) {
				return '点上方粉色「跟读」开始练习；也可点汉字、拼音格学习'
			}
			return '点汉字看详解；点拼音格听读音'
		},
		followDoneSummary() {
			const miss = this.followStatuses.filter((s) => s === 'miss').length
			if (!miss) return '太棒了，本课生字都跟读通过啦'
			return `有 ${miss} 个字标了「再读」，可以多练几遍`
		}
	},
	onUnload() {
		this.teardownFollowAll()
	},
	onHide() {
		if (this.followPhase === 'active') {
			this.teardownFollowRecording()
		}
	},
	onLoad(query) {
		this.refreshStatusBarPx()
		this._lessonLoadQuery(query)
	},
	async onShow() {
		this.refreshStatusBarPx()
		await this.reloadLesson()
		this.refreshProgress()
		this.refreshLessonQuizBadge()
		const lessonKey = buildStoredLessonKey(this.rjLessonIdx, this.hint)
		playMengmengVoiceOnce(MENG_VOICE.LESSON_START, `meng_voice_lesson_${lessonKey}`).catch(
			() => {}
		)
	},
	methods: {
		refreshStatusBarPx() {
			this.statusBarPx = getMengNavMetrics().statusBarPx
		},
		async _lessonLoadQuery(query) {
			const rjRaw = query?.rjLesson
			if (rjRaw != null && rjRaw !== '') {
				const n = Number(rjRaw)
				this.rjLessonIdx = Number.isFinite(n) && n >= 0 ? n : null
			} else {
				this.rjLessonIdx = null
			}
			if (this.rjLessonIdx == null) {
				this.hint = query?.hint ? decodeURIComponent(query.hint) : '课次字卡'
			}
			await this.reloadLesson()
			this.refreshProgress()
			this.refreshLessonQuizBadge()
		},
		followStatusAt(i) {
			return this.followStatuses[i] || 'pending'
		},
		/** 跟读时汉字下方唯一状态文案 */
		followCellStatusLabel(i) {
			if (this.followPhase !== 'active') return ''
			const idx = Number(i)
			const st = this.followStatusAt(idx)
			if (idx === this.followIdx && st === 'reading') return '跟读中'
			if (this.canFollowJumpTo(idx)) return '点重听'
			if (st === 'pass') return '读过'
			if (st === 'miss') return '再读'
			return ''
		},
		followCellStatusClass(i) {
			const st = this.followStatusAt(i)
			if (Number(i) === this.followIdx && st === 'reading') return 'cell-status-line--reading'
			if (this.canFollowJumpTo(i)) return 'cell-status-line--tap'
			if (st === 'pass') return 'cell-status-line--pass'
			if (st === 'miss') return 'cell-status-line--miss'
			return ''
		},
		/** 跟读中可点击回跳的字（仅当前字之前的读过/再读，不含正在读的这一格） */
		canFollowJumpTo(i) {
			const idx = Number(i)
			if (this.followPhase !== 'active' || !Number.isFinite(idx) || idx < 0) return false
			if (idx >= this.lessonChars.length) return false
			if (idx === this.followIdx) return false
			const st = this.followStatusAt(idx)
			if (st === 'pass' || st === 'miss') return true
			return idx < this.followIdx
		},
		cellClassList(row, i) {
			const list = []
			if (this.isLearned(row.hanzi)) list.push('cell-learned')
			const st = this.followStatusAt(i)
			if (this.followPhase === 'active') {
				if (i === this.followIdx) list.push('cell--follow-current')
				if (st === 'miss') list.push('cell--follow-miss')
				if (st === 'pass') list.push('cell--follow-pass')
				if (this.canFollowJumpTo(i)) list.push('cell--follow-jumpable')
			}
			return list
		},
		followScoreSymbol(row) {
			const tokens = this.pyTokens(row)
			if (tokens.length) return String(tokens[0] || '').trim()
			const s = String(this.pyShow(row) || '').trim()
			return s && s !== '-' ? s : ''
		},
		beginFollowActive() {
			if (!this.lessonChars.length) return
			this.teardownFollowRecording()
			this.followPhase = 'active'
			this.followIdx = 0
			this.followStatuses = this.lessonChars.map(() => 'pending')
			this.mascotReady = false
			this.followSessionToken += 1
			const token = this.followSessionToken
			uni.setNavigationBarTitle({ title: '跟读中…' })
			this.$nextTick(() => {
				this.mascotReady = true
				this.runFollowCharAt(0, token)
			})
		},
		clearFollowRecordWatchdog() {
			if (this.followRecordWatchdog != null) {
				clearTimeout(this.followRecordWatchdog)
				this.followRecordWatchdog = null
			}
		},
		scheduleFollowRecordWatchdog(idx, token) {
			this.clearFollowRecordWatchdog()
			this.followRecordWatchdog = setTimeout(() => {
				this.followRecordWatchdog = null
				if (token !== this.followSessionToken || this.followPhase !== 'active') return
				if (this.followIdx !== idx || !this.followRecording) return
				cancelFollowReadAutoStop()
				stopFollowReadRecord()
					.then((stopRes) => this.onFollowRecordEnded(idx, token, stopRes))
					.catch(() => {
						this.followRecording = false
						this.$set(this.followStatuses, idx, 'miss')
						this.advanceFollow(idx, token)
					})
			}, 22000)
		},
		syncFollowUi(idx) {
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.scrollCellIntoView(idx)
					this.updateMascotPosition()
				})
			})
		},
		async runFollowCharAt(idx, token) {
			if (token !== this.followSessionToken || this.followPhase !== 'active') return
			if (idx >= this.lessonChars.length) {
				this.finishFollowSession()
				return
			}
			this.clearFollowRecordWatchdog()
			this.followEndHandledKey = ''
			this.followIdx = idx
			this.$set(this.followStatuses, idx, 'reading')
			this.syncFollowUi(idx)
			const row = this.lessonChars[idx]
			const hanzi = firstHanzi(row.hanzi)
			const py = this.pyShow(row)
			const symbol = this.followScoreSymbol(row)
			stopLocalPinyinAudio()
			await playLessonTargetReading(hanzi, py)
			if (token !== this.followSessionToken || this.followPhase !== 'active') return
			await delay(420)
			if (!symbol) {
				this.$set(this.followStatuses, idx, 'pass')
				await delay(700)
				return this.advanceFollow(idx, token)
			}
			this.followRecording = true
			this.scheduleFollowRecordWatchdog(idx, token)
			const res = await startFollowReadRecord({
				symbol,
				autoStop: true,
				onAutoStop: (stopRes) => this.onFollowRecordEnded(idx, token, stopRes)
			})
			if (token !== this.followSessionToken || this.followPhase !== 'active') return
			if (!res.ok) {
				this.followRecording = false
				this.clearFollowRecordWatchdog()
				this.$set(this.followStatuses, idx, 'miss')
				uni.showToast({ title: res.message || '无法开始录音', icon: 'none' })
				await delay(1100)
				return this.advanceFollow(idx, token)
			}
		},
		async onFollowRecordEnded(idx, token, stopRes) {
			if (token !== this.followSessionToken || this.followPhase !== 'active') return
			if (this.followIdx !== idx) return
			const endKey = `${token}-${idx}`
			if (this.followEndHandledKey === endKey) return
			this.followEndHandledKey = endKey
			this.clearFollowRecordWatchdog()
			this.followRecording = false
			if (!stopRes?.ok) {
				this.$set(this.followStatuses, idx, 'miss')
				await delay(900)
				return this.advanceFollow(idx, token)
			}
			const row = this.lessonChars[idx]
			const symbol = this.followScoreSymbol(row)
			const scoreRes = await requestFollowReadScore({
				symbol,
				durationMs: stopRes?.durationMs,
				sampleRate: stopRes?.sampleRate,
				tempFilePath: stopRes?.tempFilePath,
				recordFormat: stopRes?.recordFormat
			})
			if (token !== this.followSessionToken || this.followPhase !== 'active') return
			const pass = !!(scoreRes.ok && scoreRes.pass)
			this.$set(this.followStatuses, idx, pass ? 'pass' : 'miss')
			if (!pass) {
				const ch = firstHanzi(row.hanzi)
				uni.showToast({
					title: ch ? `再读「${ch}」` : '再试一次',
					icon: 'none',
					duration: 2200
				})
				await delay(1300)
			} else {
				await delay(480)
			}
			this.advanceFollow(idx, token)
		},
		advanceFollow(idx, token) {
			if (token !== this.followSessionToken || this.followPhase !== 'active') return
			this.runFollowCharAt(idx + 1, token)
		},
		finishFollowSession() {
			this.teardownFollowRecording()
			this.followPhase = 'done'
			this.mascotReady = false
			this.setLessonNavTitle()
		},
		dismissFollowDone() {
			this.followPhase = null
			this.followStatuses = []
			this.setLessonNavTitle()
		},
		restartFollowFromHead() {
			this.followPhase = null
			this.followStatuses = []
			this.beginFollowActive()
		},
		exitFollow() {
			this.teardownFollowAll()
			this.followPhase = null
			this.followStatuses = []
			this.mascotReady = false
			this.setLessonNavTitle()
		},
		onMascotTapStop() {
			if (this.followPhase !== 'active') return
			this.exitFollow()
			uni.showToast({ title: '已停止跟读', icon: 'none', duration: 1600 })
		},
		teardownFollowRecording() {
			this.clearFollowRecordWatchdog()
			cancelFollowReadAutoStop()
			if (this.followRecording) {
				this.followRecording = false
				stopFollowReadRecord().catch(() => {})
			}
			stopLocalPinyinAudio()
		},
		teardownFollowAll() {
			this.followSessionToken += 1
			this.teardownFollowRecording()
		},
		scrollCellIntoView(idx) {
			const query = uni.createSelectorQuery().in(this)
			query.selectViewport().scrollOffset()
			query.select(`#follow-cell-${idx}`).boundingClientRect()
			query.exec((res) => {
				const scroll = res && res[0]
				const rect = res && res[1]
				if (!scroll || !rect) return
				const top = (scroll.scrollTop || 0) + rect.top - 180
				uni.pageScrollTo({
					scrollTop: Math.max(0, top),
					duration: 260,
					fail: () => {}
				})
			})
		},
		updateMascotPosition() {
			const query = uni.createSelectorQuery().in(this)
			query.select('.card-grid-wrap').boundingClientRect()
			query.select(`#follow-cell-${this.followIdx}`).boundingClientRect()
			query.exec((res) => {
				const wrap = res && res[0]
				const cell = res && res[1]
				if (!wrap || !cell) return
				const centerX = cell.left - wrap.left + cell.width / 2
				const topY = cell.top - wrap.top - 6
				this.mascotStyle = {
					left: `${centerX}px`,
					top: `${Math.max(0, topY)}px`,
					transform: 'translate(-50%, -100%)'
				}
				this.mascotJumping = false
				this.$nextTick(() => {
					this.mascotJumping = true
					setTimeout(() => {
						this.mascotJumping = false
					}, 520)
				})
			})
		},
		onCellCharTap(row, index) {
			if (this.followPhase === 'active') {
				if (this.canFollowJumpTo(index)) {
					this.onFollowCellJump(index, row)
				}
				return
			}
			this.openChar(row)
		},
		onCellPyTap(row, index) {
			if (this.followPhase === 'active') {
				if (this.canFollowJumpTo(index)) {
					this.onFollowCellJump(index, row)
				}
				return
			}
			this.onTapSpeakPinyin(row)
		},
		/** 跟读中点「读过」等字格：从该字起重新往下读 */
		onFollowCellJump(index, row) {
			const idx = Number(index)
			if (!this.canFollowJumpTo(idx)) return
			this.teardownFollowRecording()
			for (let j = idx; j < this.lessonChars.length; j++) {
				const st = this.followStatuses[j]
				if (st === 'pass' || st === 'miss' || st === 'reading') {
					this.$set(this.followStatuses, j, 'pending')
				}
			}
			this.followSessionToken += 1
			const token = this.followSessionToken
			const ch = firstHanzi(row && row.hanzi)
			uni.showToast({
				title: ch ? `从「${ch}」再听读` : '从此字继续',
				icon: 'none',
				duration: 1400
			})
			this.$nextTick(() => {
				this.runFollowCharAt(idx, token)
			})
		},
		pyTokens(row) {
			const s = String(this.pyShow(row) || '').trim()
			const tokens = splitPinyinDisplayTokens(s)
			if (tokens.length) return tokens
			return s ? [s] : []
		},
		async reloadLesson() {
			if (this.followPhase === 'active') return
			const prefs = getCurriculumPrefs()
			if (prefs.textbook_version_id === TEXTBOOK_VERSION_IDS.TONGBIAN_RJ && this.rjLessonIdx != null) {
				const rows = await loadRenjiaoTextbookTexts({
					grade: prefs.grade,
					semester: prefs.semester
				})
				const syncLessons = filterRenjiaoTextbookSyncLessons(rows)
				const item = syncLessons[this.rjLessonIdx]
				if (!item) {
					this.lessonChars = []
					this.totalChars = 0
					this.rjContent = ''
					this.hint = '课次字卡'
					this.setLessonNavTitle()
					return
				}
				this.hint = String(item.title || '课次字卡')
				this.rjContent = String(item.content != null ? item.content : '').trim()
				this.lessonChars = buildLessonCharRowsFromRenjiaoItem(item)
				this.totalChars = this.lessonChars.length
				this.setLessonNavTitle()
				return
			}
			this.rjContent = ''
			const rows = await queryCurriculumChars(getCurriculumPrefs())
			this.lessonChars = rows.filter((r) => String(r.lesson_hint || '未分课次') === this.hint)
			this.totalChars = this.lessonChars.length
			this.setLessonNavTitle()
		},
		setLessonNavTitle() {
			const t = this.hint.length > 16 ? `${this.hint.slice(0, 15)}…` : this.hint
			uni.setNavigationBarTitle({ title: t || '课次字卡' })
		},
		refreshProgress() {
			const prefs = getCurriculumPrefs()
			const map = getUserProgressMap()
			let n = 0
			for (const row of this.lessonChars) {
				const h = String(row.hanzi || '').trim().charAt(0)
				if (!h) continue
				const key = makeProgressKey(
					prefs.textbook_version_id,
					prefs.grade,
					prefs.semester,
					h
				)
				const rec = map[key]
				if (rec && Number(rec[COL_PROGRESS.learned]) === 1) n++
			}
			this.learnedCount = n
		},
		refreshLessonQuizBadge() {
			const p = getCurriculumPrefs()
			const lk = buildStoredLessonKey(this.rjLessonIdx, this.hint)
			this.quizPassedForLesson = hasLessonQuizPassed(
				{
					textbook_version_id: p.textbook_version_id,
					grade: p.grade,
					semester: p.semester
				},
				lk
			)
		},
		isLearned(hanzi) {
			const h = String(hanzi || '').trim().charAt(0)
			if (!h) return false
			const prefs = getCurriculumPrefs()
			const key = makeProgressKey(
				prefs.textbook_version_id,
				prefs.grade,
				prefs.semester,
				h
			)
			const rec = getUserProgressMap()[key]
			return !!(rec && Number(rec[COL_PROGRESS.learned]) === 1)
		},
		pyShow(row) {
			let s = String(row.pinyin || '').replace(/\s+/g, ' ').trim()
			// uni.showToast({ title: s+'1', icon: 'none' })
			if (!s && row.hanzi) {
				try {
					const c = String(row.hanzi).trim().charAt(0)
					if (c) s = spellDisplayString(c, 'tone', 'poly', 'low') || ''
				} catch (_) {}
			}
			
			return s ? s : '-'
		},
		openChar(row) {
			const p = getCurriculumPrefs()
			const lesson = encodeURIComponent(this.hint || '')
			const py = this.pyShow(row)
			const pyQ = py && py !== '-' ? `&pinyin=${encodeURIComponent(py)}` : ''
			const url = `/pages/char/detail?hanzi=${encodeURIComponent(row.hanzi || '')}&grade=${p.grade}&semester=${encodeURIComponent(p.semester)}&lesson=${lesson}${pyQ}`
			uni.navigateTo({ url })
		},
		onTapSpeakRjContent() {
			if (!this.rjContent) return
			speakChinese(this.rjContent)
		},
		async onTapSpeakPinyin(row) {
			const py = String(this.pyShow(row) || '').trim()
			logHanziSpeak('lesson.py_row.tap', { py, hanzi: row && row.hanzi })
			if (!py || py === '-') {
				uni.showToast({ title: '暂无拼音', icon: 'none' })
				return
			}
			// uni.showToast({ title: py, icon: 'none' })
			const ok = await playOpusForDisplayPinyin(py)
			logHanziSpeak('lesson.py_row.play_done', { py, ok })
			// uni.showToast({ title: '未找到该拼音的本地音频', icon: 'none' })
		},
		goFollowRead() {
			if (!this.lessonChars.length) return
			if (this.followPhase === 'active') return
			if (this.followPhase === 'done') {
				this.dismissFollowDone()
			}
			this.beginFollowActive()
		},
		onDictation() {
			if (!this.lessonChars.length) return
			if (this.followPhase === 'active') {
				uni.showToast({ title: '请先停止跟读', icon: 'none' })
				return
			}
			const rows = this.lessonChars.map((r) => ({
				hanzi: String(r.hanzi || '').trim(),
				pinyin: this.pyShow(r)
			}))
			putLessonDictationTransfer({
				lessonTitle: this.hint,
				rjLessonIdx: this.rjLessonIdx,
				rows
			})
			let q = ''
			if (this.rjLessonIdx != null) q = `rjLesson=${encodeURIComponent(String(this.rjLessonIdx))}`
			else q = `hint=${encodeURIComponent(this.hint || '')}`
			uni.navigateTo({ url: `/pages/literacy/lesson-dictation?${q}` })
		},
		onMiniQuiz() {
			if (!this.lessonChars.length) return
			const rows = this.lessonChars.map((r) => ({
				hanzi: String(r.hanzi || '').trim(),
				pinyin: this.pyShow(r)
			}))
			putLessonQuizTransfer({
				lessonTitle: this.hint,
				rjLessonIdx: this.rjLessonIdx,
				rows
			})
			let q = ''
			if (this.rjLessonIdx != null) q = `rjLesson=${encodeURIComponent(String(this.rjLessonIdx))}`
			else q = `hint=${encodeURIComponent(this.hint || '')}`
			uni.navigateTo({ url: `/pages/literacy/lesson-quiz?${q}` })
		}
	}
}
</script>

<style scoped>
.lesson-page {
	min-height: 100vh;
	padding: 0 0 48rpx;
	box-sizing: border-box;
	background: var(--meng-page-bg);
}

.lesson-hero {
	position: relative;
	padding: 0 20rpx 36rpx;
	box-sizing: border-box;
	overflow: hidden;
}

.lesson-nav {
	position: relative;
	z-index: 3;
	margin-left: -20rpx;
	margin-right: -20rpx;
}

.lesson-hero-sky {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	height: 220rpx;
	background: rgba(255, 255, 255, 0);
	pointer-events: none;
}

.lesson-hero-card {
	position: relative;
	z-index: 1;
	padding: 22rpx 22rpx 20rpx;
	border-radius: 32rpx;
	background: rgba(255, 255, 255, 0.9);
	border: 2rpx solid rgba(255, 255, 255, 0.95);
	box-shadow:
		0 12rpx 40rpx rgba(255, 150, 180, 0.14),
		0 8rpx 24rpx var(--meng-shadow, rgba(44, 36, 25, 0.06));
}

.lesson-grade-chip {
	display: inline-flex;
	padding: 8rpx 18rpx;
	margin-bottom: 12rpx;
	border-radius: 999rpx;
	font-size: 22rpx;
	font-weight: 600;
	color: #c44d6a;
	background: #ffd4f0;
	border: 2rpx solid rgba(255, 120, 160, 0.35);
}

.lesson-title {
	display: block;
	font-size: 36rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
	line-height: 1.35;
	letter-spacing: 1rpx;
}

.lesson-progress-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;
	margin-top: 16rpx;
}

.lesson-progress-num {
	font-size: 24rpx;
	color: var(--meng-text-secondary, #6d5e52);
	font-weight: 600;
	flex: 1;
	min-width: 0;
}

.lesson-quiz-badge {
	display: inline-flex;
	margin-top: 12rpx;
	padding: 6rpx 16rpx;
	font-size: 22rpx;
	font-weight: 700;
	color: #2e7d32;
	background: #d4f0dc;
	border-radius: 999rpx;
	border: 1rpx solid rgba(111, 186, 125, 0.4);
}

.lesson-sheet {
	position: relative;
	z-index: 2;
	margin: -32rpx 20rpx 0;
	padding: 22rpx 20rpx 24rpx;
	border-radius: 36rpx 36rpx 28rpx 28rpx;
	background: rgba(255, 255, 255, 0.88);
	border: 2rpx solid rgba(255, 255, 255, 0.95);
	box-shadow:
		0 -8rpx 36rpx rgba(255, 150, 180, 0.1),
		0 16rpx 40rpx var(--meng-shadow, rgba(44, 36, 25, 0.06));
	box-sizing: border-box;
}

.rj-content-box {
	margin-bottom: 12rpx;
	padding: 16rpx 18rpx;
	background: #fafafa;
	border-radius: 12rpx;
	border: 1rpx solid #eee;
}

.rj-content-box:active {
	opacity: 0.88;
}

.rj-content-label {
	display: block;
	font-size: 22rpx;
	color: #9e9e9e;
	margin-bottom: 8rpx;
}

.rj-content-body {
	display: block;
	font-size: 26rpx;
	color: #5d4037;
	line-height: 1.65;
	white-space: pre-wrap;
	word-break: break-all;
}

.lesson-sub {
	display: block;
	font-size: 22rpx;
	color: #8a8279;
	line-height: 1.45;
}

.mode-row {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	gap: 12rpx;
	margin-bottom: 22rpx;
}

.mode-tile {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 18rpx 8rpx 16rpx;
	border-radius: 24rpx;
	box-shadow:
		0 8rpx 20rpx rgba(44, 36, 25, 0.08),
		inset 0 2rpx 0 rgba(255, 255, 255, 0.45);
}

.mode-tile:active {
	opacity: 0.92;
	transform: scale(0.98);
}

.mode-tile--follow {
	background: #ff6b9d;
}

.mode-tile--guide {
	animation: follow-tile-pulse 1.6s ease-in-out infinite;
	box-shadow:
		0 0 0 4rpx rgba(255, 255, 255, 0.65),
		0 10rpx 28rpx rgba(255, 107, 157, 0.45);
}

.mode-guide {
	margin-top: 4rpx;
	font-size: 20rpx;
	font-weight: 800;
	color: rgba(255, 255, 255, 0.95);
	line-height: 1.2;
}

@keyframes follow-tile-pulse {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.04);
	}
}

.mode-tile--dictation {
	background: #7eb8ff;
}

.mode-tile--quiz {
	background: #ffd060;
}

.mode-emoji {
	font-size: 36rpx;
	margin-bottom: 6rpx;
}

.mode-label {
	font-size: 24rpx;
	font-weight: 800;
	color: rgba(255, 255, 255, 0.95);
	text-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.12);
}

.card-grid-wrap {
	position: relative;
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin: -6rpx;
}

.card-grid-wrap--follow {
	padding-top: 56rpx;
}

.follow-mascot-wrap {
	position: absolute;
	z-index: 30;
	display: flex;
	flex-direction: column;
	align-items: center;
	pointer-events: none;
	transition:
		left 0.48s cubic-bezier(0.34, 1.15, 0.64, 1),
		top 0.48s cubic-bezier(0.34, 1.15, 0.64, 1);
}

.follow-mascot {
	width: 96rpx;
	height: 96rpx;
	filter: drop-shadow(0 8rpx 16rpx rgba(196, 77, 106, 0.28));
}

.follow-mascot-stop {
	margin-top: 4rpx;
	padding: 6rpx 14rpx;
	font-size: 18rpx;
	font-weight: 700;
	color: #fff;
	background: rgba(196, 77, 106, 0.88);
	border-radius: 999rpx;
	line-height: 1.3;
	white-space: nowrap;
	pointer-events: auto;
}

.follow-mascot-stop:active {
	opacity: 0.88;
}

.follow-mascot--jump {
	animation: follow-mascot-bounce 0.52s ease;
}

@keyframes follow-mascot-bounce {
	0% {
		transform: translateY(0) scale(1);
	}
	38% {
		transform: translateY(-22rpx) scale(1.1);
	}
	68% {
		transform: translateY(8rpx) scale(0.95);
	}
	100% {
		transform: translateY(0) scale(1);
	}
}

.cell--follow-current {
	z-index: 12;
	border-color: #ff6b9d !important;
	background: #fff !important;
	box-shadow:
		0 0 0 4rpx rgba(255, 107, 157, 0.35),
		0 10rpx 28rpx rgba(196, 77, 106, 0.18) !important;
	transform: scale(1.04);
}

.cell--follow-miss {
	border-color: #ff8a65 !important;
	background: #fff !important;
	box-shadow: 0 6rpx 18rpx rgba(255, 138, 101, 0.2) !important;
}

.cell--follow-pass {
	border-color: rgba(127, 212, 154, 0.65);
}

.cell--follow-jumpable {
	z-index: 35;
	box-shadow: 0 0 0 2rpx rgba(127, 212, 154, 0.45);
}

.cell-jump-hit {
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 40;
	border-radius: 22rpx;
}

.cell--follow-jumpable:active {
	opacity: 0.92;
}

.follow-reading-bar {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-bottom: 18rpx;
	padding: 16rpx 18rpx;
	border-radius: 22rpx;
	background: var(--meng-card);
	border: 2rpx solid rgba(255, 120, 160, 0.35);
}

.follow-reading-bar-logo {
	width: 72rpx;
	height: 72rpx;
	flex-shrink: 0;
	margin-right: 14rpx;
}

.follow-reading-bar-text {
	flex: 1;
	min-width: 0;
}

.follow-reading-label {
	display: block;
	font-size: 22rpx;
	color: #c44d6a;
	font-weight: 600;
}

.follow-reading-sub {
	display: block;
	font-size: 22rpx;
	color: #8a8076;
	line-height: 1.35;
	margin-top: 4rpx;
}

.follow-exit {
	font-size: 24rpx;
	color: #8a8076;
	padding: 8rpx 12rpx;
}

.mode-row--dim {
	opacity: 0.45;
	pointer-events: none;
}

.follow-done-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 500;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(44, 36, 25, 0.42);
	padding: 40rpx;
	box-sizing: border-box;
}

.follow-done-card {
	width: 100%;
	max-width: 560rpx;
	padding: 48rpx 36rpx 40rpx;
	border-radius: 36rpx;
	background: rgba(255, 255, 255, 0.96);
	box-shadow: 0 24rpx 60rpx rgba(196, 77, 106, 0.2);
	display: flex;
	flex-direction: column;
	align-items: center;
}

.follow-done-logo {
	width: 120rpx;
	height: 120rpx;
	margin-bottom: 20rpx;
}

.follow-done-title {
	font-size: 40rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
	margin-bottom: 16rpx;
}

.follow-done-sub {
	font-size: 26rpx;
	color: var(--meng-text-secondary, #6d5e52);
	text-align: center;
	line-height: 1.5;
	margin-bottom: 32rpx;
}

.follow-done-actions {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.follow-done-btn {
	width: 100%;
	border-radius: 20rpx;
	font-size: 28rpx;
}

.follow-done-btn--primary {
	background: #ff6b9d;
}

.cell {
	position: relative;
	z-index: 1;
	flex: 0 0 31%;
	width: 31%;
	max-width: 31%;
	box-sizing: border-box;
	margin: 6rpx 3.5% 6rpx 0;
	padding: 18rpx 10rpx 14rpx;
	text-align: center;
	background: #fff;
	border-radius: 22rpx;
	border: 2rpx solid rgba(255, 220, 200, 0.65);
	box-shadow: 0 6rpx 18rpx rgba(44, 36, 25, 0.05);
}

.cell:nth-child(3n) {
	margin-right: 0;
}

.cell-learned {
	border-color: rgba(127, 212, 154, 0.75);
	background: #fff;
	box-shadow: 0 6rpx 16rpx rgba(90, 160, 110, 0.12);
}

.cell-char-hit {
	position: relative;
	padding: 4rpx 0 0;
	min-height: 0;
}

.cell-char {
	display: block;
	font-size: 88rpx;
	font-weight: 400;
	color: var(--meng-chocolate, #5c3d2e);
	line-height: 1.05;
	-webkit-font-smoothing: antialiased;
}

.cell-status-line {
	display: block;
	text-align: center;
	font-size: 22rpx;
	font-weight: 700;
	line-height: 1.3;
	margin: 4rpx 0 8rpx;
	padding: 0 4rpx;
}

.cell-status-line--reading {
	color: #c44d6a;
}

.cell-status-line--tap {
	color: #1565c0;
}

.cell-status-line--pass {
	color: #2e7d32;
}

.cell-status-line--miss {
	color: #e65100;
}

.cell-status-line--learned {
	color: #2e7d32;
}

.cell-py-row {
	width: 100%;
	min-width: 0;
	margin-top: 6rpx;
	padding: 8rpx 4rpx 6rpx;
	min-height: 96rpx;
	box-sizing: border-box;
	background: #fff5f8;
	border-radius: 14rpx;
	border: 1rpx solid rgba(255, 200, 180, 0.4);
}

.cell-py-row:active {
	opacity: 0.9;
	background: #fff0f5;
}

.cell-py-hint {
	display: block;
	font-size: 18rpx;
	color: #c44d6a;
	margin-bottom: 4rpx;
	line-height: 1.2;
	font-weight: 600;
}


.empty-lesson {
	padding: 40rpx 24rpx;
	background: #fff0f5;
	border-radius: 22rpx;
	border: 2rpx dashed rgba(255, 180, 200, 0.45);
}

.empty-text {
	font-size: 26rpx;
	color: var(--meng-text-muted, #8a8076);
	line-height: 1.55;
}

.meng-tip {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	margin-top: 16rpx;
	padding: 16rpx 18rpx;
	background: #fff0f5;
	border-radius: 20rpx;
	border: 1rpx solid rgba(255, 200, 180, 0.35);
}

.meng-tip-msg {
	flex: 1;
	min-width: 0;
	margin-left: 10rpx;
	font-size: 24rpx;
	color: var(--meng-tip-text, #7a5f2a);
	font-weight: 500;
	line-height: 1.45;
}

.stars {
	display: flex;
	flex-direction: row;
	margin-right: 14rpx;
}

.star {
	font-size: 30rpx;
	margin-right: 4rpx;
	line-height: 1;
}

.star-on {
	color: #ff9a3d;
	text-shadow: 0 2rpx 6rpx rgba(255, 140, 60, 0.35);
}

.star-off {
	color: #e8e0d8;
}
</style>
