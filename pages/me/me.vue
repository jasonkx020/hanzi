<template>
	<view class="page tab-page-shell tab-root-page me-page" :style="tabPageStyle">
		<meng-tab-hero
			:status-bar-px="statusBarHeight"
			:title="t('me.title')"
			:subtitle="summary"
			avatar-pose="wave"
		/>

		<view class="stat-row tab-dock-overlap">
			<view class="stat-card">
				<text class="stat-num">{{ learnedCount }}</text>
				<text class="stat-label">{{ t('me.stat.learned') }}</text>
			</view>
			<view class="stat-card">
				<text class="stat-num">{{ wrongCount }}</text>
				<text class="stat-label">{{ t('me.stat.review') }}</text>
			</view>
		</view>
		<view class="section-label">{{ t('me.section.overview') }}</view>
		<view class="list">
			<view class="item" @click="goReport">
				<text>{{ t('me.item.report') }}</text>
				<text class="arrow">›</text>
			</view>
			<view class="item" @click="goMedals">
				<view class="item-main">
					<text>{{ t('me.item.medals') }}</text>
					<text v-if="medalHint" class="item-subline">{{ medalHint }}</text>
				</view>
				<text class="arrow">›</text>
			</view>
			<view class="item" @click="goFamilyProfiles">
				<view class="item-main">
					<text>{{ t('me.item.profiles') }}</text>
					<text v-if="profileHint" class="item-subline">{{ profileHint }}</text>
				</view>
				<text class="arrow">›</text>
			</view>
		</view>
		<view class="section-label">{{ t('me.section.chars') }}</view>
		<view class="list">
			<view class="item" @click="goLearned">
				<text>{{ t('me.item.learnedLib') }}</text>
				<text class="arrow">›</text>
			</view>
			<view class="item item-sub" @click="goWrongOften">
				<text class="sub-indent">{{ t('me.item.wrongOften') }}</text>
				<text class="arrow">›</text>
			</view>
		</view>
		<view class="section-label section-label-spaced">{{ t('me.section.settings') }}</view>
		<view class="list list-gap">
			<view class="item" @click="goLearned">
				<text>{{ t('me.item.progress') }}</text>
				<text class="arrow">›</text>
			</view>
			<view class="item" @click="goGuardian">
				<text>{{ t('me.item.guardian') }}</text>
				<text class="arrow">›</text>
			</view>
			<view class="item" @click="goVip">
				<text>{{ t('me.item.vip') }}</text>
				<text class="arrow">›</text>
			</view>
			<view class="item" @click="goStroke">
				<text>{{ t('me.item.strokeLab') }}</text>
				<text class="arrow">›</text>
			</view>
			<view class="item" @click="pickLanguage">
				<view class="item-main">
					<text>{{ t('me.item.language') }}</text>
					<text class="item-subline">{{ languageLabel }}</text>
				</view>
				<text class="arrow">›</text>
			</view>
		</view>
		<!-- 原生 tabBar 启动即隐藏；各端统一挂载自定义栏 -->
		<custom-tab-bar />
	</view>
</template>

<script>
import { formatCurriculumSummary, getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { getLearnedChars, getWrongChars } from '@/repositories/learning-repository.js'
import tabMain from '@/mixins/tab-main-page.js'
import i18nPage from '@/mixins/i18n-page.js'
import MengTabHero from '@/components/meng-tab-hero.vue'
import {
	MENG_VOICE,
	playMengmengVoice,
	playMengmengVoiceOnce,
	stopMengmengVoice
} from '@/utils/mengmeng-voice.js'
import { syncWrongReviewState } from '@/utils/achievement-stats-storage.js'
import {
	getCurrentGrowthLevel,
	formatGrowthLevelLabel,
	countUnlockedMedals
} from '@/services/medal-service.js'
import { MEDAL_LIST } from '@/data/medals.js'
import { getActiveProfile, listLearningProfiles } from '@/utils/learning-profile-storage.js'
import { hasFamilyPlan } from '@/utils/vip-entitlements.js'
import { getLocaleDisplayName, listLocales, setLocale } from '@/utils/i18n.js'

export default {
	components: { MengTabHero },
	mixins: [tabMain, i18nPage],
	data() {
		return {
			summary: '',
			learnedCount: 0,
			wrongCount: 0,
			medalHint: '',
			profileHint: ''
		}
	},
	computed: {
		languageLabel() {
			void this.localeTick
			return getLocaleDisplayName()
		}
	},
	onShow() {
		this.setTabBarIndex(2)
		this.refreshMeCopy()
		playMengmengVoiceOnce(MENG_VOICE.ME_WELCOME).catch(() => {})
	},
	onHide() {
		stopMengmengVoice()
	},
	methods: {
		onLocaleChanged() {
			this.refreshMeCopy()
		},
		refreshMeCopy() {
			this.summary = formatCurriculumSummary(getCurriculumPrefs())
			this.learnedCount = getLearnedChars().length
			this.wrongCount = getWrongChars().length
			syncWrongReviewState(this.wrongCount)
			const { current } = getCurrentGrowthLevel()
			const unlocked = countUnlockedMedals()
			this.medalHint = this.t('me.hint.medal', {
				level: formatGrowthLevelLabel(current),
				u: unlocked,
				t: MEDAL_LIST.length
			})
			const active = getActiveProfile()
			const n = listLearningProfiles().length
			this.profileHint = hasFamilyPlan()
				? this.t('me.hint.profile.family', {
						name: active?.name || this.t('me.hint.profile.fallback'),
						n
					})
				: active?.name || this.t('me.hint.profile.default')
		},
		pickLanguage() {
			const locales = listLocales()
			uni.showActionSheet({
				itemList: locales.map((x) => x.label),
				success: (res) => {
					const picked = locales[res.tapIndex]
					if (!picked) return
					if (setLocale(picked.code)) {
						this.localeTick += 1
						this.refreshMeCopy()
					}
				}
			})
		},
		goReport() {
			uni.navigateTo({ url: '/pages/me/report' })
		},
		goMedals() {
			uni.navigateTo({ url: '/pages/me/medals' })
		},
		goFamilyProfiles() {
			uni.navigateTo({ url: '/pages/me/family-profiles' })
		},
		goCurriculum() {
			uni.navigateTo({ url: '/pages/me/learned' })
		},
		goGuardian() {
			uni.navigateTo({ url: '/pages/settings/guardian' })
		},
		goVip() {
			uni.navigateTo({ url: '/pages/vip/vip' })
		},
		goStroke() {
			playMengmengVoice(MENG_VOICE.HOME_STROKE_LAB, { debounceMs: 160 }).catch(() => {})
			uni.navigateTo({ url: '/pages/tools/stroke' })
		},
		goLearned() {
			uni.navigateTo({ url: '/pages/me/learned' })
		},
		goWrongOften() {
			uni.navigateTo({ url: '/pages/me/wrong-often' })
		}
	}
}
</script>

<style scoped>
.stat-row {
	display: flex;
	flex-direction: row;
	margin-bottom: 24rpx;
	gap: 20rpx;
}

.stat-card {
	flex: 1;
	background: var(--meng-card-solid);
	border-radius: 24rpx;
	padding: 28rpx 20rpx;
	text-align: center;
	box-shadow: 0 8rpx 24rpx var(--meng-shadow);
	border: 1rpx solid var(--meng-border);
}

.stat-num {
	display: block;
	font-size: 44rpx;
	font-weight: 800;
	color: var(--meng-accent-solid);
	line-height: 1.1;
}

.stat-label {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	color: var(--meng-text-muted);
}

.section-label {
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text-muted);
	margin-bottom: 12rpx;
	padding-left: 4rpx;
}

.section-label-spaced {
	margin-top: 28rpx;
}

.list {
	background: var(--meng-card-solid);
	border-radius: 24rpx;
	overflow: hidden;
	border: 1rpx solid var(--meng-border);
	box-shadow: 0 6rpx 20rpx var(--meng-shadow);
}

.list-gap {
	margin-bottom: 8rpx;
}

.item {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 24rpx;
	font-size: 30rpx;
	color: var(--meng-text);
	border-bottom: 1rpx solid var(--meng-border);
}

.item-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.item-subline {
	font-size: 22rpx;
	color: #8a8279;
	margin-top: 6rpx;
}

.item:last-child {
	border-bottom: none;
}

.item-sub .sub-indent {
	padding-left: 8rpx;
	color: var(--meng-text-secondary);
}

.arrow {
	font-size: 36rpx;
	color: var(--meng-text-muted);
	line-height: 1;
}
</style>
