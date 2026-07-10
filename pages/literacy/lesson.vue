<!--
  @file lesson.vue
  @layer L1 表现层
  @description 路由页面源文件：lesson.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
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
		<view class="mode-row">
			<view class="mode-tile mode-tile--dictation" @click="onDictation">
				<text class="mode-emoji">✏️</text>
				<text class="mode-label">听写</text>
			</view>
			<view class="mode-tile mode-tile--quiz" @click="onMiniQuiz">
				<text class="mode-emoji">⭐</text>
				<text class="mode-label">小测</text>
			</view>
		</view>

		<view v-if="lessonChars.length" class="card-grid-wrap">
			<view
				v-for="(row, i) in lessonChars"
				:key="row.id != null ? row.id : i"
				class="cell"
				:class="cellClassList(row)"
			>
				<view v-if="isLearned(row.hanzi)" class="cell-learned-badge" aria-label="已学">
					<text class="cell-learned-badge-icon">✓</text>
				</view>
				<view class="cell-py-row" @tap.stop="onCellPyTap(row)">
					<text class="cell-py-hint">拼音 · 点读</text>
					<pinyin-four-lines-row :syllables="pyTokens(row)" size="compact" />
				</view>
				<view class="cell-char-hit" @tap.stop="onCellCharTap(row)">
					<text class="cell-char">{{ row.hanzi }}</text>
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
import { playOpusForDisplayPinyin } from '@/utils/play-pinyin-local-audio.js'
import pinyinPlayScopeMixin, { PINYIN_PLAY_SCOPES } from '@/mixins/pinyin-play-scope.js'
import { speakChinese } from '@/utils/speak-hanzi.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import MengAvatar from '@/components/meng-avatar.vue'
import MengPageNav from '@/components/meng-page-nav.vue'
import MengStatusBarSpacer from '@/components/meng-status-bar-spacer.vue'
import { getMengNavMetrics } from '@/utils/meng-nav-metrics.js'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import { MENG_VOICE, playMengmengVoiceOnce } from '@/utils/mengmeng-voice.js'

export default {
	mixins: [pinyinPlayScopeMixin],
	pinyinPlayScope: PINYIN_PLAY_SCOPES.LESSON_CARD,
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
			/** 上次 reload 对应的教材+课次 key */
			_lastLessonReloadKey: '',
			_lessonVoicePlayedKey: ''
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
		followTipText() {
			return '点汉字看详解；点拼音格听读音'
		}
	},
	onLoad(query) {
		this.refreshStatusBarPx()
		this._lessonLoadQuery(query)
	},
	onShow() {
		this.refreshStatusBarPx()
		const key = this.lessonReloadKey()
		if (key !== this._lastLessonReloadKey) {
			this.reloadLesson().then(() => {
				this._lastLessonReloadKey = key
				this.refreshProgress()
				this.refreshLessonQuizBadge()
			})
		} else {
			this.refreshProgress()
			this.refreshLessonQuizBadge()
		}
		if (this._lessonVoicePlayedKey !== key) {
			this._lessonVoicePlayedKey = key
			const lessonKey = buildStoredLessonKey(this.rjLessonIdx, this.hint)
			playMengmengVoiceOnce(MENG_VOICE.LESSON_START, `meng_voice_lesson_${lessonKey}`).catch(
				() => {}
			)
		}
	},
	methods: {
		lessonReloadKey() {
			const p = getCurriculumPrefs()
			return `${p.textbook_version_id}|${p.grade}|${p.semester}|${this.rjLessonIdx}|${this.hint}`
		},
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
			this._lastLessonReloadKey = this.lessonReloadKey()
			this.refreshProgress()
			this.refreshLessonQuizBadge()
		},
		cellClassList(row) {
			const list = []
			if (this.isLearned(row.hanzi)) list.push('cell-learned')
			return list
		},
		onCellCharTap(row) {
			this.openChar(row)
		},
		onCellPyTap(row) {
			this.onTapSpeakPinyin(row)
		},
		pyTokens(row) {
			const s = String(this.pyShow(row) || '').trim()
			const tokens = splitPinyinDisplayTokens(s)
			if (tokens.length) return tokens
			return s ? [s] : []
		},
		async reloadLesson() {
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
			const ok = await this._pyPlay.run(({ isCancelled }) =>
				playOpusForDisplayPinyin(py, { isCancelled })
			)
			logHanziSpeak('lesson.py_row.play_done', { py, ok })
		},
		onDictation() {
			if (!this.lessonChars.length) return
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

.cell-learned-badge {
	position: absolute;
	top: 6rpx;
	right: 6rpx;
	z-index: 3;
	width: 36rpx;
	height: 36rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: linear-gradient(145deg, #8ee4a8 0%, #5cb87a 100%);
	border: 2rpx solid #fff;
	box-shadow: 0 4rpx 10rpx rgba(46, 125, 50, 0.28);
	pointer-events: none;
}

.cell-learned-badge-icon {
	font-size: 22rpx;
	font-weight: 800;
	color: #fff;
	line-height: 1;
}

.cell-char-hit {
	position: relative;
	padding: 6rpx 0 0;
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

.cell-py-row {
	width: 100%;
	min-width: 0;
	margin: 0 0 8rpx;
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
