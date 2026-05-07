<template>
	<view class="page">
		<text class="hint">字段与 SQLite hanzi_curriculum 一致：textbook_version_id、grade、semester、list_type（偏好）</text>

		<view class="field">
			<text class="label">教材版本 textbook_version_id</text>
			<picker :range="versionLabels" :value="versionIndex" @change="onVersion">
				<view class="picker">{{ versionLabels[versionIndex] }}</view>
			</picker>
		</view>

		<view class="field">
			<text class="label">年级 grade（1–6）</text>
			<picker mode="selector" :range="grades" :value="gradeIndex" @change="onGrade">
				<view class="picker">{{ grades[gradeIndex] }}</view>
			</picker>
		</view>

		<view class="field">
			<text class="label">学期 semester</text>
			<picker :range="semesters" range-key="label" :value="semesterIndex" @change="onSemester">
				<view class="picker">{{ semesters[semesterIndex].label }}</view>
			</picker>
		</view>

		<view class="field">
			<text class="label">字表 list_type（浏览偏好）</text>
			<picker :range="listLabels" :value="listIndex" @change="onList">
				<view class="picker">{{ listLabels[listIndex] }}</view>
			</picker>
		</view>

		<button type="primary" @click="save">保存到本地</button>
		<text class="ok" v-if="saved">已写入 uni.storage（键 curriculum_prefs_v1）</text>
	</view>
</template>

<script>
import { TEXTBOOK_VERSION_IDS, LIST_TYPE, LIST_TYPE_PREFERENCE } from '@/constants/curriculum-schema.js'
import { getCurriculumPrefs, setCurriculumPrefs } from '@/utils/curriculum-storage.js'

export default {
	data() {
		return {
			versionLabels: ['统编（部编）人教', '预留版本 B'],
			versionValues: [TEXTBOOK_VERSION_IDS.TONGBIAN_RJ, 'reserved-b'],
			versionIndex: 0,
			grades: ['1', '2', '3', '4', '5', '6'],
			gradeIndex: 0,
			semesters: [
				{ label: '上册', value: '上' },
				{ label: '下册', value: '下' }
			],
			semesterIndex: 0,
			listLabels: ['全部', LIST_TYPE.SHIZI, LIST_TYPE.XIEZI, LIST_TYPE.HUIZONG],
			listValues: [
				LIST_TYPE_PREFERENCE.ALL,
				LIST_TYPE.SHIZI,
				LIST_TYPE.XIEZI,
				LIST_TYPE.HUIZONG
			],
			listIndex: 0,
			saved: false
		}
	},
	onLoad() {
		const p = getCurriculumPrefs()
		const vi = this.versionValues.indexOf(p.textbook_version_id)
		this.versionIndex = vi >= 0 ? vi : 0
		this.gradeIndex = Math.max(0, Math.min(5, p.grade - 1))
		this.semesterIndex = p.semester === '下' ? 1 : 0
		const li = this.listValues.indexOf(p.list_type_preference)
		this.listIndex = li >= 0 ? li : 0
	},
	methods: {
		onVersion(e) {
			this.versionIndex = Number(e.detail.value)
			this.saved = false
		},
		onGrade(e) {
			this.gradeIndex = Number(e.detail.value)
			this.saved = false
		},
		onSemester(e) {
			this.semesterIndex = Number(e.detail.value)
			this.saved = false
		},
		onList(e) {
			this.listIndex = Number(e.detail.value)
			this.saved = false
		},
		save() {
			setCurriculumPrefs({
				textbook_version_id: this.versionValues[this.versionIndex],
				grade: this.gradeIndex + 1,
				semester: this.semesters[this.semesterIndex].value,
				list_type_preference: this.listValues[this.listIndex]
			})
			this.saved = true
			uni.showToast({ title: '已保存', icon: 'success' })
		}
	}
}
</script>

<style scoped>
.page {
	padding: 28rpx;
	min-height: 100vh;
	background: #f4f1ea;
	box-sizing: border-box;
}

.hint {
	display: block;
	font-size: 22rpx;
	color: #8a8279;
	line-height: 1.45;
	margin-bottom: 28rpx;
}

.field {
	margin-bottom: 28rpx;
}

.label {
	display: block;
	font-size: 24rpx;
	color: #5a534c;
	margin-bottom: 10rpx;
}

.picker {
	padding: 20rpx;
	background: #fff;
	border-radius: 12rpx;
	font-size: 28rpx;
	color: #2c2419;
}

.ok {
	display: block;
	margin-top: 20rpx;
	font-size: 22rpx;
	color: #3d6b4a;
}
</style>
