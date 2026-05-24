<template>
	<meng-sub-page title="家长报告" subtitle="本机统计，不上传服务器">
		<view class="card head">
			<text class="title">家长报告</text>
			<text class="desc">统计基于本机当前教材设置，不会上传服务器。</text>
			<text class="curriculum">{{ curriculumLine }}</text>
		</view>

		<view class="stats">
			<view class="stat-item">
				<text class="num">{{ learnedScoped }}</text>
				<text class="label">本册已学字</text>
			</view>
			<view class="stat-item">
				<text class="num">{{ wrongScoped }}</text>
				<text class="label">有错记录的字</text>
			</view>
			<view class="stat-item">
				<text class="num">{{ quizPassedCount }}</text>
				<text class="label">课次小测已通过</text>
			</view>
		</view>

		<view class="card">
			<text class="sub-title">本册 · 课次小测</text>
			<text class="sub-desc">在「课本同步学」进入课次字卡，完成「小测」且答对约八成以上，会计入通过。</text>
			<text v-if="quizTouchedCount > 0" class="meta">有过小测记录的课次：{{ quizTouchedCount }}（含未通关）</text>
			<text v-if="!recentPasses.length" class="empty">暂无课次小测通关记录。</text>
			<view v-for="(row, idx) in recentPasses" :key="`${row.lesson_key}-${idx}`" class="pass-row">
				<text class="pass-name">{{ formatLessonLabel(row.lesson_key) }}</text>
				<text class="pass-date">通过 {{ formatPassDate(row.quiz_passed_at_ms) }}</text>
			</view>
			<text v-if="recentPasses.length && quizBestLine" class="best-hint">{{ quizBestLine }}</text>
		</view>

		<view class="card">
			<text class="sub-title">薄弱字 TOP5（本册）</text>
			<text v-if="!topWrong.length" class="empty">暂无错字记录，继续保持。</text>
			<view v-for="(row, idx) in topWrong" :key="`${row.hanzi}-${idx}`" class="weak-row">
				<text class="weak-char">{{ row[hanziKey] }}</text>
				<text class="weak-count">错 {{ row[wrongKey] }} 次</text>
			</view>
		</view>

		<view class="card export-card">
			<text class="sub-title">周学习报告</text>
			<text class="sub-desc">汇总近 7 日本机学习数据，可复制发给家人或自行保存（不上传服务器）。</text>
			<view class="export-actions">
				<view class="export-btn" @click="onExportWeekly">
					<text class="export-btn-text">导出周报告</text>
				</view>
				<view class="export-btn export-btn--ghost" @click="onPreviewWeekly">
					<text class="export-btn-text export-btn-text--ghost">预览</text>
				</view>
			</view>
		</view>

		<view class="foot-note">
			<text class="foot-line">· 「听音找字」不计入课次小测通关数。</text>
			<text class="foot-line">· 切换教材与年级后，本页会显示对应册别数据。</text>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { COL_PROGRESS } from '@/constants/curriculum-schema.js'
import { getCurriculumPrefs, formatCurriculumSummary } from '@/utils/curriculum-storage.js'
import {
	countLearnedCharsForCurriculumPrefs,
	countWrongTrackedCharsForCurriculumPrefs,
	listWrongOftenCharsForCurriculumPrefs
} from '@/utils/user-progress-storage.js'
import { listLessonProgressForCurriculum } from '@/utils/user-lesson-progress-storage.js'
import { buildWeeklyReport } from '@/services/weekly-report-service.js'
import { gateAndPrompt, VIP_FEATURE } from '@/utils/vip-gate.js'
import { copyTextToClipboard } from '@/utils/share-text.js'

export default {
	components: { MengSubPage },
	data() {
		return {
			curriculumLine: '',
			learnedScoped: 0,
			wrongScoped: 0,
			quizPassedCount: 0,
			quizTouchedCount: 0,
			recentPasses: [],
			quizBestLine: '',
			topWrong: [],
			hanziKey: COL_PROGRESS.hanzi,
			wrongKey: COL_PROGRESS.wrong_count
		}
	},
	onShow() {
		const prefs = getCurriculumPrefs()
		this.curriculumLine = formatCurriculumSummary(prefs)

		this.learnedScoped = countLearnedCharsForCurriculumPrefs(prefs)
		this.wrongScoped = countWrongTrackedCharsForCurriculumPrefs(prefs)
		this.topWrong = listWrongOftenCharsForCurriculumPrefs(prefs, 5)

		const dims = {
			textbook_version_id: prefs.textbook_version_id,
			grade: prefs.grade,
			semester: prefs.semester
		}
		const lessons = listLessonProgressForCurriculum(dims)
		const passed = lessons.filter((r) => Number(r.quiz_passed_at_ms) > 0)
		this.quizPassedCount = passed.length
		this.quizTouchedCount = lessons.filter((r) => Number(r.quiz_last_at_ms) > 0).length

		this.recentPasses = passed
			.slice()
			.sort((a, b) => Number(b.quiz_passed_at_ms) - Number(a.quiz_passed_at_ms))
			.slice(0, 8)

		const bestRatioRow = passed
			.filter((r) => Number(r.quiz_best_total) > 0)
			.sort((a, b) => {
				const ra = Number(a.quiz_best_score) / Number(a.quiz_best_total)
				const rb = Number(b.quiz_best_score) / Number(b.quiz_best_total)
				return rb - ra
			})[0]
		if (bestRatioRow && Number(bestRatioRow.quiz_best_total) > 0) {
			const pct = Math.round(
				(100 * Number(bestRatioRow.quiz_best_score)) / Number(bestRatioRow.quiz_best_total)
			)
			this.quizBestLine = `单次小测最高正确率：${pct}%（${bestRatioRow.quiz_best_score}/${bestRatioRow.quiz_best_total} 题）`
		} else {
			this.quizBestLine = ''
		}
	},
	methods: {
		formatLessonLabel(lessonKey) {
			const s = String(lessonKey || '')
			if (s.startsWith('rj:')) {
				const n = parseInt(s.slice(3), 10)
				if (Number.isFinite(n) && n >= 0) return `课本同步 第 ${n + 1} 课`
				return s
			}
			if (s.startsWith('hint:')) {
				const t = s.slice(5).trim()
				return t || '分课次练习'
			}
			return s || '—'
		},
		formatPassDate(ms) {
			const t = Number(ms)
			if (!t) return '—'
			const d = new Date(t)
			return `${d.getMonth() + 1}月${d.getDate()}日`
		},
		async onExportWeekly() {
			const g = await gateAndPrompt(VIP_FEATURE.FAMILY_REPORT, {
				quotaTitle: '周报告导出',
				quotaMessage: '导出近 7 周学习摘要为会员家长功能，请家长开通后使用。'
			})
			if (!g.ok) return
			const { text } = buildWeeklyReport(getCurriculumPrefs())
			await copyTextToClipboard(text, '周报告已复制')
		},
		async onPreviewWeekly() {
			const g = await gateAndPrompt(VIP_FEATURE.FAMILY_REPORT, {
				quotaTitle: '周报告预览',
				quotaMessage: '查看周报告需家长开通会员。'
			})
			if (!g.ok) return
			const { text } = buildWeeklyReport(getCurriculumPrefs())
			uni.showModal({
				title: '周学习报告预览',
				content: text.length > 900 ? `${text.slice(0, 900)}…` : text,
				showCancel: false,
				confirmText: '复制全文',
				success: (res) => {
					if (res.confirm) copyTextToClipboard(text)
				}
			})
		}
	}
}
</script>

<style scoped>
.page {
	box-sizing: border-box;
}

.card {
	background: #fff;
	border-radius: 14rpx;
	padding: 24rpx;
	margin-bottom: 16rpx;
}

.head .title {
	display: block;
	font-size: 34rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 10rpx;
}

.desc {
	display: block;
	font-size: 25rpx;
	color: #6b6560;
	line-height: 1.45;
	margin-bottom: 12rpx;
}

.curriculum {
	display: block;
	font-size: 24rpx;
	color: #1565c0;
	line-height: 1.4;
}

.stats {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin-bottom: 16rpx;
}

.stat-item {
	flex: 0 0 31%;
	width: 31%;
	max-width: 31%;
	box-sizing: border-box;
	margin-right: 3.5%;
	margin-bottom: 12rpx;
	background: #fffef9;
	border-radius: 12rpx;
	padding: 18rpx 8rpx;
	text-align: center;
}

.stat-item:nth-child(3n) {
	margin-right: 0;
}

.num {
	display: block;
	font-size: 34rpx;
	color: var(--meng-text);
	font-weight: 700;
}

.label {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: #8a8279;
	line-height: 1.3;
}

.sub-title {
	display: block;
	font-size: 28rpx;
	color: var(--meng-text);
	font-weight: 600;
	margin-bottom: 8rpx;
}

.sub-desc {
	display: block;
	font-size: 23rpx;
	color: #8a8279;
	line-height: 1.45;
	margin-bottom: 12rpx;
}

.meta {
	display: block;
	font-size: 22rpx;
	color: #78909c;
	margin-bottom: 10rpx;
}

.empty {
	font-size: 24rpx;
	color: #8a8279;
	display: block;
	margin-bottom: 8rpx;
}

.pass-row {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	padding: 14rpx 0;
	border-bottom: 1rpx solid #f0ece3;
}

.pass-name {
	font-size: 28rpx;
	color: var(--meng-text);
	flex: 1;
	min-width: 0;
	padding-right: 12rpx;
}

.pass-date {
	font-size: 24rpx;
	color: #558b2f;
	flex-shrink: 0;
}

.best-hint {
	display: block;
	margin-top: 12rpx;
	font-size: 22rpx;
	color: #6b6560;
}

.weak-row {
	display: flex;
	justify-content: space-between;
	padding: 14rpx 0;
	border-bottom: 1rpx solid #f0ece3;
}

.weak-char {
	font-size: 34rpx;
	color: var(--meng-text);
	font-weight: 600;
}

.weak-count {
	font-size: 24rpx;
	color: #b85d42;
}

.export-card {
	margin-top: 4rpx;
}

.export-actions {
	display: flex;
	flex-direction: row;
	margin-top: 16rpx;
}

.export-actions > .export-btn + .export-btn {
	margin-left: 16rpx;
}

.export-btn {
	flex: 1;
	padding: 18rpx 0;
	border-radius: 999rpx;
	background: var(--meng-accent-solid, #6bae7d);
	text-align: center;
}

.export-btn--ghost {
	background: #f5f0e6;
	border: 1rpx solid #e0d8ca;
}

.export-btn-text {
	font-size: 28rpx;
	font-weight: 700;
	color: #fff;
}

.export-btn-text--ghost {
	color: #5a534c;
}

.foot-note {
	padding: 8rpx 12rpx 32rpx;
}

.foot-line {
	display: block;
	font-size: 22rpx;
	color: #9e9e9e;
	line-height: 1.55;
	margin-bottom: 6rpx;
}
</style>
