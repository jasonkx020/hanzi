<template>
	<meng-sub-page title="学习档案" subtitle="家庭年卡可添加 2 位孩子，进度分开保存">
		<view class="card head">
			<text class="head-title">当前档案</text>
			<text class="head-desc">{{ familyHint }}</text>
		</view>

		<view v-for="p in profiles" :key="p.id" class="card profile" @click="switchProfile(p.id)">
			<view class="profile-row">
				<meng-avatar :pose="p.id === activeId ? 'wave' : 'book'" size="xs" />
				<view class="profile-copy">
					<text class="profile-name">{{ p.name }}</text>
					<text class="profile-meta">{{ p.id === activeId ? '使用中' : '点击切换' }}</text>
				</view>
				<text v-if="p.id === activeId" class="profile-badge">当前</text>
			</view>
			<view class="profile-actions" @click.stop>
				<view class="mini-btn" @click="renameProfile(p)">
					<text class="mini-btn-text">改名</text>
				</view>
			</view>
		</view>

		<view
			v-if="profiles.length < maxProfiles"
			class="card add-card"
			@click="addProfile"
		>
			<text class="add-text">+ 添加孩子档案</text>
		</view>

		<view class="foot">
			<text class="foot-line">切换档案会加载各自的学习进度与识字记录。</text>
			<text class="foot-line">非家庭年卡仅保留 1 份档案；开通家庭年卡后可添加第 2 位。</text>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import MengAvatar from '@/components/meng-avatar.vue'
import {
	listLearningProfiles,
	getActiveProfileId,
	switchLearningProfile,
	createLearningProfile,
	renameLearningProfile,
	maxLearningProfiles,
	persistCurriculumToActiveProfile
} from '@/utils/learning-profile-storage.js'
import { hasFamilyPlan } from '@/utils/vip-entitlements.js'
import { isVipActive } from '@/utils/vip.js'

export default {
	components: { MengSubPage, MengAvatar },
	data() {
		return {
			profiles: [],
			activeId: '',
			maxProfiles: 1
		}
	},
	computed: {
		familyHint() {
			if (hasFamilyPlan()) return '家庭年卡已启用，最多 2 位孩子。'
			if (isVipActive()) return '当前为普通会员，仅 1 份档案；升级家庭年卡可添加第 2 位。'
			return '开通家庭年卡后可使用 2 份独立档案。'
		}
	},
	onShow() {
		this.refresh()
	},
	methods: {
		refresh() {
			this.maxProfiles = maxLearningProfiles()
			this.profiles = listLearningProfiles()
			this.activeId = getActiveProfileId()
		},
		switchProfile(id) {
			if (id === this.activeId) return
			persistCurriculumToActiveProfile()
			if (switchLearningProfile(id)) {
				uni.showToast({ title: '已切换档案', icon: 'success' })
				this.refresh()
			}
		},
		renameProfile(p) {
			uni.showModal({
				title: '修改昵称',
				editable: true,
				placeholderText: '最多 12 字',
				content: p.name,
				success: (res) => {
					if (!res.confirm) return
					const name = res.content != null ? String(res.content).trim() : ''
					if (renameLearningProfile(p.id, name)) {
						this.refresh()
						uni.showToast({ title: '已保存', icon: 'success' })
					}
				}
			})
		},
		addProfile() {
			if (!hasFamilyPlan() && this.profiles.length >= 1) {
				uni.showModal({
					title: '家庭年卡',
					content: '添加第 2 位孩子需开通家庭年卡，是否前往会员中心？',
					confirmText: '去看看',
					success: (res) => {
						if (res.confirm) uni.navigateTo({ url: '/pages/vip/vip' })
					}
				})
				return
			}
			const id = createLearningProfile(`孩子 ${this.profiles.length + 1}`)
			if (id) {
				switchLearningProfile(id)
				this.refresh()
				uni.showToast({ title: '已创建并切换', icon: 'success' })
			}
		}
	}
}
</script>

<style scoped>
.card {
	background: #fff;
	border-radius: 16rpx;
	padding: 22rpx;
	margin-bottom: 16rpx;
	border: 1rpx solid #ebe5da;
}

.head-title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: var(--meng-text);
}

.head-desc {
	display: block;
	font-size: 24rpx;
	color: #6b6560;
	margin-top: 8rpx;
	line-height: 1.45;
}

.profile-row {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.profile-copy {
	flex: 1;
	margin-left: 14rpx;
}

.profile-name {
	font-size: 30rpx;
	font-weight: 600;
	color: var(--meng-text);
}

.profile-meta {
	display: block;
	font-size: 22rpx;
	color: #8a8279;
	margin-top: 4rpx;
}

.profile-badge {
	font-size: 22rpx;
	color: #3d6b4a;
	background: #e8f5e9;
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
}

.profile-actions {
	margin-top: 14rpx;
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
}

.mini-btn {
	padding: 8rpx 20rpx;
	border-radius: 999rpx;
	background: #f5f0e6;
}

.mini-btn-text {
	font-size: 24rpx;
	color: #5a534c;
}

.add-card {
	text-align: center;
	border-style: dashed;
}

.add-text {
	font-size: 28rpx;
	color: #6b4f2a;
	font-weight: 600;
}

.foot {
	padding: 8rpx 8rpx 32rpx;
}

.foot-line {
	display: block;
	font-size: 22rpx;
	color: #9e9e9e;
	line-height: 1.55;
	margin-bottom: 6rpx;
}
</style>
