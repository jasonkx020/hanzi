<template>
	<meng-sub-page
		title="教材与进度"
		subtitle="版本、年级册别与字表偏好"
		avatar-pose="book"
		:padded="false"
		:overlap-body="true"
	>
		<view class="curriculum-sheet">
			<view class="summary-pill">
				<text class="summary-label">当前设置</text>
				<text class="summary-value clamp-2">{{ summaryPreview }}</text>
			</view>

			<view class="card card--hint">
				<meng-avatar pose="curious" size="xs" />
				<text class="hint-text">{{ hintText }}</text>
			</view>

			<view class="card">
				<text class="field-label">教材版本</text>
				<picker :range="versionLabels" :value="versionIndex" @change="onVersion">
					<view class="picker-row">
						<text class="picker-value">{{ versionLabels[versionIndex] }}</text>
						<text class="picker-chevron">›</text>
					</view>
				</picker>
			</view>

			<view class="card">
				<text class="field-label">年级册别</text>
				<text v-if="isPreschoolOnlyVersion" class="field-note">该版本仅含幼小衔接字表</text>
				<picker
					v-if="gradeSemesterOptions.length > 1"
					mode="selector"
					:range="gradeSemesterLabels"
					:value="gradeSemesterIndex"
					@change="onGradeSemester"
				>
					<view class="picker-row">
						<text class="picker-value">{{ gradeSemesterLabels[gradeSemesterIndex] }}</text>
						<text class="picker-chevron">›</text>
					</view>
				</picker>
				<view v-else class="picker-row picker-row--static">
					<text class="picker-value">{{ gradeSemesterLabels[0] }}</text>
				</view>
			</view>

			<view class="card">
				<text class="field-label">字表浏览偏好</text>
				<picker :range="listLabels" :value="listIndex" @change="onList">
					<view class="picker-row">
						<text class="picker-value">{{ listLabels[listIndex] }}</text>
						<text class="picker-chevron">›</text>
					</view>
				</picker>
			</view>

			<text v-if="gradeUnlockHint" class="unlock-hint">{{ gradeUnlockHint }}</text>

			<button class="save-btn" type="primary" @click="save">保存到本地</button>
			<text v-if="saved" class="ok-tip">已保存，首页与课本同步将按此设置加载字表</text>

			<button class="debug-btn" type="default" @click="goDebugConsole">调试：查看 JS 日志</button>
			<button class="debug-btn debug-btn--second" type="default" @click="goRecordTest">调试：麦克风录音测试</button>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import MengAvatar from '@/components/meng-avatar.vue'
import {
	TEXTBOOK_VERSION_IDS,
	LIST_TYPE,
	LIST_TYPE_PREFERENCE
} from '@/constants/curriculum-schema.js'
import {
	getCurriculumPrefs,
	setCurriculumPrefs,
	listGradeSemesterPickerOptions,
	indexOfGradeSemesterOption,
	formatCurriculumSummary
} from '@/utils/curriculum-storage.js'
import { curriculumChangeRequiresVip } from '@/utils/vip-curriculum.js'
import { gateAndPrompt, VIP_FEATURE } from '@/utils/vip-gate.js'
import { persistCurriculumToActiveProfile } from '@/utils/learning-profile-storage.js'
import { listUnlockedGrades } from '@/utils/vip-entitlements.js'
import { isVipActive } from '@/utils/vip.js'

const VERSION_OPTIONS = [
	{
		label: '统编（部编）人教',
		value: TEXTBOOK_VERSION_IDS.TONGBIAN_RJ,
		hint: '含幼小衔接与小学一至六年级上下册生字，可与「课本同步学」配合使用。'
	},
	{
		label: '幼小衔接·课标300基本字',
		value: TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300,
		hint: '教育部课标附录「识字、写字教学基本字表」300 字，适合幼升小衔接。'
	}
]

const LIST_OPTIONS = [
	{ label: '全部字表', value: LIST_TYPE_PREFERENCE.ALL },
	{ label: LIST_TYPE.SHIZI, value: LIST_TYPE.SHIZI },
	{ label: LIST_TYPE.XIEZI, value: LIST_TYPE.XIEZI },
	{ label: LIST_TYPE.HUIZONG, value: LIST_TYPE.HUIZONG },
	{ label: LIST_TYPE.JIBENZIBIAO, value: LIST_TYPE.JIBENZIBIAO }
]

export default {
	components: { MengSubPage, MengAvatar },
	data() {
		return {
			versionIndex: 0,
			gradeSemesterIndex: 0,
			listIndex: 0,
			saved: false
		}
	},
	computed: {
		versionLabels() {
			return VERSION_OPTIONS.map((o) => o.label)
		},
		versionValues() {
			return VERSION_OPTIONS.map((o) => o.value)
		},
		currentVersionId() {
			return this.versionValues[this.versionIndex] || TEXTBOOK_VERSION_IDS.TONGBIAN_RJ
		},
		isPreschoolOnlyVersion() {
			return this.currentVersionId === TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300
		},
		hintText() {
			return VERSION_OPTIONS[this.versionIndex]?.hint || VERSION_OPTIONS[0].hint
		},
		gradeSemesterOptions() {
			return listGradeSemesterPickerOptions(this.currentVersionId)
		},
		gradeSemesterLabels() {
			return this.gradeSemesterOptions.map((o) => o.label)
		},
		listLabels() {
			return LIST_OPTIONS.map((o) => o.label)
		},
		listValues() {
			return LIST_OPTIONS.map((o) => o.value)
		},
		draftPrefs() {
			const gs = this.gradeSemesterOptions[this.gradeSemesterIndex] || this.gradeSemesterOptions[0] || {}
			return {
				textbook_version_id: this.currentVersionId,
				grade: gs.grade ?? 1,
				semester: gs.semester === '下' ? '下' : '上',
				list_type_preference: this.listValues[this.listIndex] ?? LIST_TYPE_PREFERENCE.ALL
			}
		},
		summaryPreview() {
			return formatCurriculumSummary(this.draftPrefs)
		},
		gradeUnlockHint() {
			if (isVipActive()) return ''
			const grades = listUnlockedGrades(this.currentVersionId)
			if (!grades.length) return ''
			return `已永久解锁年级：${grades.map((g) => `${g}年级`).join('、')}（可在会员中心购买更多年级）`
		}
	},
	onLoad() {
		this.loadFromStorage()
	},
	onShow() {
		this.loadFromStorage()
	},
	methods: {
		loadFromStorage() {
			const p = getCurriculumPrefs()
			const vi = this.versionValues.indexOf(p.textbook_version_id)
			this.versionIndex = vi >= 0 ? vi : 0
			const li = this.listValues.indexOf(p.list_type_preference)
			this.listIndex = li >= 0 ? li : 0
			this.$nextTick(() => {
				this.syncGradeSemesterIndex(p.grade, p.semester)
			})
		},
		syncGradeSemesterIndex(grade, semester) {
			const opts = listGradeSemesterPickerOptions(this.currentVersionId)
			this.gradeSemesterIndex = indexOfGradeSemesterOption(opts, grade, semester)
		},
		onVersion(e) {
			const next = Number(e.detail.value)
			if (!Number.isFinite(next) || next < 0 || next >= this.versionValues.length) return
			const prev = { ...this.draftPrefs }
			this.versionIndex = next
			this.saved = false
			this.$nextTick(() => {
				this.syncGradeSemesterIndex(prev.grade, prev.semester)
				if (this.isPreschoolOnlyVersion && Number(prev.grade) !== 0) {
					uni.showToast({ title: '已切换为幼小衔接字表', icon: 'none' })
				}
			})
		},
		onGradeSemester(e) {
			this.gradeSemesterIndex = Number(e.detail.value)
			this.saved = false
		},
		onList(e) {
			this.listIndex = Number(e.detail.value)
			this.saved = false
		},
		async save() {
			if (curriculumChangeRequiresVip(this.draftPrefs)) {
				const g = await gateAndPrompt(VIP_FEATURE.FULL_GRADES, {
					quotaTitle: '切换年级需会员',
					quotaMessage:
						'免费版仅可使用当前已保存的年级册别。如需切换 1～6 年级或幼小衔接字表，请家长开通会员。'
				})
				if (!g.ok) return
			}
			setCurriculumPrefs(this.draftPrefs)
			persistCurriculumToActiveProfile()
			this.saved = true
			uni.showToast({ title: '已保存', icon: 'success' })
		},
		goDebugConsole() {
			uni.navigateTo({ url: '/pages/debug/console' })
		},
		goRecordTest() {
			uni.navigateTo({ url: '/pages/debug/record-test' })
		}
	}
}
</script>

<style scoped>
.curriculum-sheet {
	margin: 0 20rpx 32rpx;
	padding: 22rpx 20rpx 28rpx;
	border-radius: 36rpx 36rpx 28rpx 28rpx;
	background: rgba(255, 255, 255, 0.92);
	border: 2rpx solid rgba(255, 255, 255, 0.96);
	box-shadow: 0 -12rpx 48rpx var(--meng-shadow), 0 16rpx 40rpx var(--meng-shadow);
	box-sizing: border-box;
}

.summary-pill {
	padding: 18rpx 20rpx;
	margin-bottom: 18rpx;
	border-radius: 20rpx;
	background: var(--meng-card);
	border: 1rpx solid var(--meng-border-warm, #e3d9c8);
}

.summary-label {
	display: block;
	font-size: 22rpx;
	font-weight: 700;
	color: var(--meng-text-muted);
	letter-spacing: 1rpx;
	margin-bottom: 6rpx;
}

.summary-value {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: var(--meng-chocolate, #5c3d2e);
	line-height: 1.4;
}

.card {
	background: var(--meng-card-solid, #fff);
	border-radius: 24rpx;
	padding: 22rpx 20rpx;
	margin-bottom: 16rpx;
	border: 1rpx solid var(--meng-border, #ebe4d8);
	box-shadow: 0 6rpx 20rpx var(--meng-shadow, rgba(44, 36, 25, 0.06));
	box-sizing: border-box;
}

.card--hint {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	gap: 12rpx;
	background: var(--meng-card, #fffef9);
}

.hint-text {
	flex: 1;
	min-width: 0;
	font-size: 22rpx;
	color: var(--meng-text-secondary);
	line-height: 1.5;
}

.field-label {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 8rpx;
}

.field-note {
	display: block;
	font-size: 22rpx;
	color: var(--meng-leaf, #6bae7d);
	margin-bottom: 10rpx;
	line-height: 1.4;
}

.picker-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 18rpx 16rpx;
	border-radius: 16rpx;
	background: var(--meng-page-bg, #f6f3ec);
	border: 1rpx solid var(--meng-border-warm, #e3d9c8);
}

.picker-row--static {
	opacity: 0.92;
}

.picker-value {
	flex: 1;
	min-width: 0;
	font-size: 28rpx;
	color: var(--meng-text);
}

.picker-chevron {
	font-size: 36rpx;
	line-height: 1;
	color: var(--meng-text-muted);
	margin-left: 8rpx;
}

.unlock-hint {
	display: block;
	margin-top: 12rpx;
	font-size: 22rpx;
	color: #5c7a48;
	line-height: 1.45;
	padding: 0 4rpx;
}

.save-btn {
	margin-top: 8rpx;
	border-radius: 999rpx;
	font-size: 30rpx;
	font-weight: 700;
}

.ok-tip {
	display: block;
	margin-top: 16rpx;
	text-align: center;
	font-size: 22rpx;
	color: var(--meng-leaf, #6bae7d);
	line-height: 1.45;
	padding: 0 12rpx;
}

.debug-btn {
	margin-top: 24rpx;
	font-size: 26rpx;
	color: var(--meng-text-secondary);
	background: transparent;
	border: 1rpx dashed var(--meng-border);
	border-radius: 16rpx;
}

.debug-btn--second {
	margin-top: 12rpx;
}
</style>
