<template>
	<view class="page">
		<text class="hint">与生字库字段一致：版本 ID、年级册别（含幼小衔接 grade=0）、字表偏好。「幼小衔接·课标300基本字」对应教育部《义务教育语文课程标准》附录「识字、写字教学基本字表」。</text>

		<view class="field">
			<text class="label">教材版本 textbook_version_id</text>
			<picker :range="versionLabels" :value="versionIndex" @change="onVersion">
				<view class="picker">{{ versionLabels[versionIndex] }}</view>
			</picker>
		</view>

		<view class="field">
			<text class="label">年级册别</text>
			<picker mode="selector" :range="gradeSemesterLabels" :value="gradeSemesterIndex" @change="onGradeSemester">
				<view class="picker">{{ gradeSemesterLabels[gradeSemesterIndex] }}</view>
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

		<button type="default" class="debug-nav" @click="goDebugConsole">调试：查看 JS 日志（Console）</button>
	</view>
</template>

<script>
import {
	TEXTBOOK_VERSION_IDS,
	LIST_TYPE,
	LIST_TYPE_PREFERENCE
} from '@/constants/curriculum-schema.js'
import { getCurriculumPrefs, setCurriculumPrefs, listGradeSemesterPickerOptions } from '@/utils/curriculum-storage.js'

export default {
	data() {
		return {
			versionLabels: ['统编（部编）人教', '幼小衔接·课标300基本字'],
			versionValues: [TEXTBOOK_VERSION_IDS.TONGBIAN_RJ, TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300],
			versionIndex: 0,
			gradeSemesterOptions: listGradeSemesterPickerOptions(),
			gradeSemesterIndex: 0,
			listLabels: ['全部', LIST_TYPE.SHIZI, LIST_TYPE.XIEZI, LIST_TYPE.HUIZONG, LIST_TYPE.JIBENZIBIAO],
			listValues: [
				LIST_TYPE_PREFERENCE.ALL,
				LIST_TYPE.SHIZI,
				LIST_TYPE.XIEZI,
				LIST_TYPE.HUIZONG,
				LIST_TYPE.JIBENZIBIAO
			],
			listIndex: 0,
			saved: false
		}
	},
	computed: {
		gradeSemesterLabels() {
			return this.gradeSemesterOptions.map((o) => o.label)
		}
	},
	onLoad() {
		const p = getCurriculumPrefs()
		const vi = this.versionValues.indexOf(p.textbook_version_id)
		this.versionIndex = vi >= 0 ? vi : 0
		const gsi = this.gradeSemesterOptions.findIndex(
			(o) => o.grade === p.grade && o.semester === p.semester
		)
		this.gradeSemesterIndex = gsi >= 0 ? gsi : 0
		const li = this.listValues.indexOf(p.list_type_preference)
		this.listIndex = li >= 0 ? li : 0
	},
	methods: {
		onVersion(e) {
			this.versionIndex = Number(e.detail.value)
			this.saved = false
		},
		onGradeSemester(e) {
			this.gradeSemesterIndex = Number(e.detail.value)
			this.saved = false
		},
		onList(e) {
			this.listIndex = Number(e.detail.value)
			this.saved = false
		},
		save() {
			const gs = this.gradeSemesterOptions[this.gradeSemesterIndex]
			setCurriculumPrefs({
				textbook_version_id: this.versionValues[this.versionIndex],
				grade: gs.grade,
				semester: gs.semester,
				list_type_preference: this.listValues[this.listIndex]
			})
			this.saved = true
			uni.showToast({ title: '已保存', icon: 'success' })
		},
		goDebugConsole() {
			uni.navigateTo({ url: '/pages/debug/console' })
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

.debug-nav {
	margin-top: 36rpx;
	font-size: 26rpx;
	color: #6b6560;
	background: #fff;
	border: 1rpx dashed #c9c4bc;
}
</style>
