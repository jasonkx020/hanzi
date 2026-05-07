<template>
	<view class="page">
		<text class="hanzi">{{ hanzi || '—' }}</text>
		<text class="meta">grade={{ grade }} semester={{ semester }}</text>
		<text class="tip">后续在此接入笔顺画布与 COL.hanzi / COL.pinyin / COL.lesson_hint</text>
		<view class="actions">
			<button type="primary" size="mini" plain @click="onMarkLearned">标记已学过</button>
			<button type="warn" size="mini" plain @click="onRecordWrong">记录一次出错（演示）</button>
			<button type="default" size="mini" @click="goStrokeLab">笔顺实验室</button>
		</view>
	</view>
</template>

<script>
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { markCharLearned, addCharWrongCount } from '@/utils/user-progress-storage.js'

export default {
	data() {
		return {
			hanzi: '',
			grade: '',
			semester: ''
		}
	},
	onLoad(query) {
		this.hanzi = query.hanzi ? decodeURIComponent(query.hanzi) : ''
		this.grade = query.grade || ''
		this.semester = query.semester ? decodeURIComponent(query.semester) : ''
	},
	methods: {
		curriculumDims() {
			const p = getCurriculumPrefs()
			const grade = this.grade !== '' && this.grade !== undefined ? Number(this.grade) : p.grade
			const semester = this.semester ? decodeURIComponent(this.semester) : p.semester
			return {
				textbook_version_id: p.textbook_version_id,
				grade: Number.isFinite(grade) ? grade : p.grade,
				semester: semester === '下' ? '下' : '上'
			}
		},
		onMarkLearned() {
			if (!this.hanzi) {
				uni.showToast({ title: '无生字', icon: 'none' })
				return
			}
			markCharLearned(this.hanzi, this.curriculumDims())
			uni.showToast({ title: '已加入学过的字库', icon: 'success' })
		},
		onRecordWrong() {
			if (!this.hanzi) {
				uni.showToast({ title: '无生字', icon: 'none' })
				return
			}
			addCharWrongCount(this.hanzi, 1, this.curriculumDims())
			uni.showToast({ title: '已记录易错', icon: 'none' })
		},
		goStrokeLab() {
			uni.navigateTo({ url: '/pages/tools/stroke' })
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 40rpx;
	background: #f4f1ea;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.hanzi {
	font-size: 160rpx;
	font-weight: 600;
	color: #2c2419;
	line-height: 1.2;
}

.meta {
	margin-top: 16rpx;
	font-size: 24rpx;
	color: #6b6560;
}

.tip {
	margin-top: 32rpx;
	font-size: 24rpx;
	color: #8a8279;
	text-align: center;
	line-height: 1.5;
}

.actions {
	margin-top: 32rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20rpx;
	width: 100%;
	max-width: 520rpx;
}

.actions button {
	margin: 0;
	width: 100%;
}
</style>
