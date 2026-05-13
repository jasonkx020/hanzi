<template>
	<view class="page">
		<!-- 对应线框：←（系统返回）+ 年级学期 + 课次标题 -->
		<view class="lesson-head">
			<text class="lesson-grade">{{ gradeSemesterLabel }}</text>
			<text class="lesson-title">{{ hint }}</text>
			<view v-if="rjContent" class="rj-content-box" @click="onTapSpeakRjContent">
				<text class="rj-content-label">课文原文 · 点击朗读</text>
				<text class="rj-content-body">{{ rjContent }}</text>
			</view>
			<text class="lesson-sub">本课共 {{ lessonChars.length }} 字 · 点汉字看详解；点拼音按当前字串匹配本地音频</text>
		</view>

		<view v-if="lessonChars.length" class="card-grid-wrap">
			<view
				v-for="(row, i) in lessonChars"
				:key="row.id != null ? row.id : i"
				class="cell"
				:class="isLearned(row.hanzi) ? 'cell-learned' : ''"
			>
				<view class="cell-char-hit" @click.stop="openChar(row)">
					<text class="cell-char">{{ row.hanzi }}</text>
					<text v-if="isLearned(row.hanzi)" class="cell-badge">已学</text>
				</view>
				<view class="cell-py-row" @click.stop="onTapSpeakPinyin(row)">
					<text class="cell-py-hint">拼音 · 点读</text>
					<pinyin-four-lines-row :syllables="pyTokens(row)" size="compact" />
				</view>
			</view>
		</view>

		<view v-else class="empty-lesson">
			<text class="empty-text">本课暂无生字数据，请在「课本同步学」或教材设置中检查课次与字库。</text>
		</view>

		<view class="panda-tip">
			<text class="panda-emoji">🐼</text>
			<text class="panda-msg">点汉字看详解；点拼音按格内字串播放读音</text>
		</view>

		<view class="mode-row">
			<button class="mode-btn mode-follow" type="default" @click="goFollowRead">跟读模式</button>
			<button class="mode-btn mode-dictation" type="default" @click="onDictation">听写模式</button>
			<button class="mode-btn mode-quiz" type="default" @click="onMiniQuiz">小测</button>
		</view>

		<view class="progress-strip">
			<text class="progress-label">进度</text>
			<view class="stars">
				<text
					v-for="n in 5"
					:key="n"
					class="star"
					:class="n <= starFilled ? 'star-on' : 'star-off'"
				>★</text>
			</view>
			<text class="progress-num">已学 {{ learnedCount }}/{{ totalChars }} 字</text>
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
import { logHanziSpeak } from '@/utils/hanzi-speak-debug-log.js'
import { playOpusForDisplayPinyin } from '@/utils/play-pinyin-local-audio.js'
import { speakChinese } from '@/utils/speak-hanzi.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'

export default {
	components: {
		PinyinFourLinesRow
	},
	data() {
		return {
			hint: '课次字卡',
			lessonChars: [],
			learnedCount: 0,
			totalChars: 0,
			/** 人教 JSON 课次下标，与课本同步学列表一致 */
			rjLessonIdx: null,
			/** 人教 JSON 该篇 content */
			rjContent: ''
		}
	},
	computed: {
		gradeSemesterLabel() {
			return formatGradeSemesterLabel(getCurriculumPrefs())
		},
		starFilled() {
			const t = this.totalChars
			if (!t) return 0
			return Math.min(5, Math.round((this.learnedCount / t) * 5))
		}
	},
	async onLoad(query) {
		const rjRaw = query.rjLesson
		if (rjRaw != null && rjRaw !== '') {
			const n = Number(rjRaw)
			this.rjLessonIdx = Number.isFinite(n) && n >= 0 ? n : null
		} else {
			this.rjLessonIdx = null
		}
		if (this.rjLessonIdx == null) {
			this.hint = query.hint ? decodeURIComponent(query.hint) : '课次字卡'
		}
		await this.reloadLesson()
		this.refreshProgress()
	},
	async onShow() {
		await this.reloadLesson()
		this.refreshProgress()
	},
	methods: {
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
			const ok = await playOpusForDisplayPinyin(py)
			logHanziSpeak('lesson.py_row.play_done', { py, ok })
				uni.showToast({ title: '未找到该拼音的本地音频', icon: 'none' })
			}
		},
		goFollowRead() {
			uni.navigateTo({ url: '/pages/pinyin/index' })
		},
		onDictation() {
			uni.showToast({ title: '听写模式开发中：将支持报拼音/笔顺填空', icon: 'none' })
		},
		onMiniQuiz() {
			if (!this.lessonChars.length) return
			const first = this.lessonChars[0]
			uni.navigateTo({
				url: `/pages/tools/stroke?hanzi=${encodeURIComponent(first.hanzi || '')}&mode=test`
			})
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 20rpx 24rpx 40rpx;
	background: #fff8e7;
	box-sizing: border-box;
}

.lesson-head {
	margin-bottom: 20rpx;
	padding: 8rpx 4rpx 4rpx;
}

.lesson-grade {
	display: block;
	font-size: 24rpx;
	color: #9e9e9e;
	margin-bottom: 8rpx;
}

.lesson-title {
	display: block;
	font-size: 34rpx;
	font-weight: 700;
	color: #4e4e4e;
	line-height: 1.35;
	margin-bottom: 8rpx;
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

.card-grid-wrap {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}

.cell {
	position: relative;
	flex: 0 0 31%;
	width: 31%;
	max-width: 31%;
	box-sizing: border-box;
	margin-right: 3.5%;
	margin-bottom: 16rpx;
	padding: 22rpx 12rpx 18rpx;
	text-align: center;
	background: #fff;
	border-radius: 16rpx;
	border: 2rpx solid #f0e6d4;
	box-shadow: 0 4rpx 14rpx rgba(78, 78, 78, 0.06);
}

.cell:nth-child(3n) {
	margin-right: 0;
}

.cell-learned {
	border-color: #c5e1a5;
	background: linear-gradient(180deg, #f9fff4 0%, #fff 100%);
}

.cell-char-hit {
	position: relative;
	padding: 4rpx 0 8rpx;
	min-height: 56rpx;
}

.cell-char {
	display: block;
	font-size: 44rpx;
	font-weight: 700;
	color: #2c2419;
	line-height: 1.1;
}

.cell-py-row {
	width: 100%;
	min-width: 0;
	margin-top: 4rpx;
	padding: 10rpx 6rpx 8rpx;
	min-height: 100rpx;
	box-sizing: border-box;
	background: #fffbf5;
	border-radius: 12rpx;
	border: 1rpx solid #ffe8cc;
}

.cell-py-row:active {
	opacity: 0.92;
	background: #fff3e0;
}

.cell-py-hint {
	display: block;
	font-size: 18rpx;
	color: #bf8f68;
	margin-bottom: 6rpx;
	line-height: 1.2;
}

.cell-badge {
	position: absolute;
	top: 0;
	right: 0;
	font-size: 18rpx;
	color: #558b2f;
	background: #e8f5e9;
	padding: 2rpx 8rpx;
	border-radius: 999rpx;
}

.empty-lesson {
	padding: 40rpx 24rpx;
	background: #fff;
	border-radius: 16rpx;
	border: 1rpx dashed #ffe0b2;
}

.empty-text {
	font-size: 26rpx;
	color: #9e9e9e;
	line-height: 1.55;
}

.panda-tip {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	margin: 8rpx 0 20rpx;
	padding: 14rpx 20rpx;
	background: rgba(255, 167, 38, 0.12);
	border-radius: 999rpx;
	border: 1rpx solid rgba(255, 167, 38, 0.35);
}

.panda-emoji {
	font-size: 32rpx;
	margin-right: 10rpx;
}

.panda-msg {
	font-size: 24rpx;
	color: #6d4c41;
	font-weight: 500;
}

.mode-row {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: space-between;
	margin-bottom: 22rpx;
}

.mode-btn {
	flex: 1;
	min-width: 28%;
	margin: 0 6rpx 12rpx;
	height: auto !important;
	min-height: 72rpx;
	padding: 16rpx 8rpx !important;
	line-height: 1.3 !important;
	font-size: 24rpx !important;
	border-radius: 14rpx !important;
	box-sizing: border-box;
}

.mode-follow {
	background: #fff3e0 !important;
	border: 1rpx solid #ffa726 !important;
	color: #e65100 !important;
	font-weight: 600;
}

.mode-dictation {
	background: #e3f2fd !important;
	border: 1rpx solid #42a5f5 !important;
	color: #1565c0 !important;
}

.mode-quiz {
	background: #f3e5f5 !important;
	border: 1rpx solid #ce93d8 !important;
	color: #6a1b9a !important;
}

.progress-strip {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;
	padding: 18rpx 20rpx;
	background: #fff;
	border-radius: 16rpx;
	border: 1rpx solid #f0e6d4;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}

.progress-label {
	font-size: 26rpx;
	font-weight: 700;
	color: #4e4e4e;
	margin-right: 14rpx;
}

.stars {
	display: flex;
	flex-direction: row;
	margin-right: 16rpx;
}

.star {
	font-size: 28rpx;
	margin-right: 4rpx;
	line-height: 1;
}

.star-on {
	color: #ffa726;
}

.star-off {
	color: #e0e0e0;
}

.progress-num {
	font-size: 24rpx;
	color: #6b6560;
	flex: 1;
	min-width: 0;
	text-align: right;
}
</style>
