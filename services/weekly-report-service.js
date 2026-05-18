/**
 * 周学习报告（本机统计，供家长导出）
 */

import { COL_PROGRESS } from '@/constants/curriculum-schema.js'
import { formatCurriculumSummary, getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import {
	countLearnedCharsForCurriculumPrefs,
	countWrongTrackedCharsForCurriculumPrefs,
	listWrongOftenCharsForCurriculumPrefs
} from '@/utils/user-progress-storage.js'
import { listLessonProgressForCurriculum } from '@/utils/user-lesson-progress-storage.js'
import { loadAchievementStats } from '@/utils/achievement-stats-storage.js'
import { getActiveProfile } from '@/utils/learning-profile-storage.js'
import {
	getCurrentGrowthLevel,
	formatGrowthLevelLabel,
	countUnlockedMedals
} from '@/services/medal-service.js'
import { MEDAL_LIST } from '@/data/medals.js'

function pad2(n) {
	return `${n}`.padStart(2, '0')
}

function dateKey(d = new Date()) {
	return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
}

function parseDateKey(dk) {
	const y = Number(dk.slice(0, 4))
	const m = Number(dk.slice(4, 6)) - 1
	const day = Number(dk.slice(6, 8))
	return new Date(y, m, day)
}

function lastNDaysKeys(n = 7) {
	const out = []
	const d = new Date()
	for (let i = 0; i < n; i++) {
		out.push(dateKey(d))
		d.setDate(d.getDate() - 1)
	}
	return out
}

function formatLessonLabel(lessonKey) {
	const s = String(lessonKey || '')
	if (s.startsWith('rj:')) {
		const n = parseInt(s.slice(3), 10)
		if (Number.isFinite(n) && n >= 0) return `第 ${n + 1} 课`
	}
	if (s.startsWith('hint:')) return s.slice(5).trim() || '分课次'
	return s || '—'
}

/**
 * @param {object} [prefs]
 * @returns {{ text: string, stats: object }}
 */
export function buildWeeklyReport(prefs = getCurriculumPrefs()) {
	const weekKeys = lastNDaysKeys(7)
	const weekStart = parseDateKey(weekKeys[weekKeys.length - 1])
	const weekEnd = parseDateKey(weekKeys[0])

	const ach = loadAchievementStats()
	const dailyInWeek = (ach.dailyCompleteDates || []).filter((d) => weekKeys.includes(d)).length

	const dims = {
		textbook_version_id: prefs.textbook_version_id,
		grade: prefs.grade,
		semester: prefs.semester
	}
	const learnedScoped = countLearnedCharsForCurriculumPrefs(prefs)
	const wrongScoped = countWrongTrackedCharsForCurriculumPrefs(prefs)
	const topWrong = listWrongOftenCharsForCurriculumPrefs(prefs, 5)

	const lessons = listLessonProgressForCurriculum(dims)
	const passedWeek = lessons.filter((r) => {
		const t = Number(r.quiz_passed_at_ms)
		return t >= weekStart.getTime() && t <= weekEnd.getTime() + 86400000
	})

	const { current } = getCurrentGrowthLevel()
	const profile = getActiveProfile()
	const medals = countUnlockedMedals()

	const lines = []
	lines.push('【萌萌识字 · 周学习报告】')
	lines.push(`统计周期：${weekStart.getMonth() + 1}月${weekStart.getDate()}日 — ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`)
	lines.push(`学习档案：${profile?.name || '默认'}`)
	lines.push(`教材：${formatCurriculumSummary(prefs)}`)
	lines.push('')
	lines.push('—— 本周概览 ——')
	lines.push(`每日一练完成：${dailyInWeek} 天`)
	lines.push(`拼音跟读通过（累计）：${ach.pinyinFollowPass || 0} 次`)
	lines.push(`写字/描红（累计）：${ach.strokePractice || 0} 次`)
	lines.push(`查字（累计）：${ach.dictLookup || 0} 次`)
	lines.push(`气球营过关（累计）：${ach.gameLevelClear || 0} 关`)
	lines.push('')
	lines.push('—— 本册进度 ——')
	lines.push(`已学字：${learnedScoped} · 有错记录：${wrongScoped}`)
	lines.push(`本周小测通关课次：${passedWeek.length}`)
	if (passedWeek.length) {
		const names = passedWeek
			.slice(0, 6)
			.map((r) => formatLessonLabel(r.lesson_key))
			.join('、')
		lines.push(`通关课次：${names}${passedWeek.length > 6 ? '…' : ''}`)
	}
	lines.push('')
	lines.push('—— 成长 ——')
	lines.push(`${formatGrowthLevelLabel(current)} · 勋章 ${medals}/${MEDAL_LIST.length}`)
	if (topWrong.length) {
		lines.push('')
		lines.push('—— 薄弱字 TOP ——')
		lines.push(
			topWrong
				.map((r) => `${r[COL_PROGRESS.hanzi]}(${r[COL_PROGRESS.wrong_count]}次)`)
				.join('、')
		)
	}
	lines.push('')
	lines.push('本报告由本机学习记录生成，未上传服务器。')

	return {
		text: lines.join('\n'),
		stats: {
			dailyInWeek,
			learnedScoped,
			wrongScoped,
			quizPassedWeek: passedWeek.length,
			medals
		}
	}
}
