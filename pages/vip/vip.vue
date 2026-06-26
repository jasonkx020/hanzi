<!--
  @file vip.vue
  @layer L1 表现层
  @description 路由页面源文件：vip.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<meng-sub-page title="会员中心" :show-avatar="false">
		<template #hero>
			<view class="hero" @longpress="debugResetVip">
				<meng-avatar pose="wave" size="sm" />
				<view class="hero-copy">
					<text class="hero-badge">{{ vipActive ? '会员生效中' : '家长专享' }}</text>
					<text class="hero-title">开通会员，系统化陪伴孩子识字</text>
					<text class="hero-sub">付费说明面向监护人展示；学习内容适龄、无诱导打赏。</text>
					<view v-if="vipActive" class="hero-expire">
						<text class="expire-label">当前到期日</text>
						<text class="expire-val">{{ expireText }}</text>
					</view>
				</view>
			</view>
		</template>

		<view class="card notice">
			<text class="notice-title">家长须知</text>
			<text class="notice-body">
				本产品会员为虚拟权益，用于解锁字库与练习能力。请通过官方支付渠道完成购买；若涉及未成年人使用，建议由家长本人操作并保管支付密码。
			</text>
		</view>

		<view class="card">
			<text class="section-title">免费版 vs 会员版</text>
			<view class="compare-head">
				<text class="ch-label">对比项</text>
				<text class="ch-free">免费版</text>
				<text class="ch-vip">会员版</text>
			</view>
			<view v-for="(row, idx) in compareRows" :key="idx" class="compare-block">
				<text class="compare-label">{{ row.label }}</text>
				<view class="compare-row">
					<text class="compare-free">{{ row.free }}</text>
					<text class="compare-vip">{{ row.vip }}</text>
				</view>
			</view>
		</view>

		<view class="card">
			<text class="section-title">订阅会员</text>
			<view class="plans">
				<view
					v-for="p in subscriptionPlans"
					:key="p.id"
					class="plan"
					:class="{ highlight: p.highlight, 'plan--family': p.familyPlan }"
					@click="buy(p.id)"
				>
					<text v-if="p.tag" class="plan-tag">{{ p.tag }}</text>
					<text class="plan-name">{{ p.name }}</text>
					<text class="plan-price">¥{{ p.priceYuan }}</text>
					<text class="plan-meta">约 {{ p.durationDays }} 天 · {{ p.familyPlan ? '含 2 孩子档案' : '全功能会员' }}</text>
				</view>
			</view>
			<button class="link-btn" type="default" @click="goFamilyProfiles">管理学习档案</button>
		</view>

		<view class="card">
			<text class="section-title">年级字库（永久）</text>
			<text class="section-desc">单独解锁某年级上下册，无需订阅也可切换该年级（统编人教版）。</text>
			<view class="grade-grid">
				<view
					v-for="g in gradeProducts"
					:key="g.id"
					class="grade-tile"
					:class="{ 'grade-tile--on': isGradeOwned(g.grade) }"
					@click="buy(g.id)"
				>
					<text class="grade-num">{{ g.grade }} 年级</text>
					<text class="grade-price">{{ isGradeOwned(g.grade) ? '已解锁' : `¥${g.priceYuan}` }}</text>
				</view>
			</view>
		</view>

		<view class="card">
			<text class="section-title">复习字包</text>
			<view class="plan plan--flat" @click="buy(reviewProduct.id)">
				<text class="plan-name">{{ reviewProduct.name }}</text>
				<text class="plan-price">¥{{ reviewProduct.priceYuan }}</text>
				<text class="plan-meta">{{ reviewPackOwned ? '已购买' : '期末集中复习用' }}</text>
			</view>
		</view>

		<view class="card card--trial">
			<button class="trial-btn" type="default" @click="claimTrial">
				领取一次性体验（演示 · {{ trialDays }} 天）
			</button>
			<!-- #ifdef APP-PLUS -->
			<button class="restore-btn" type="default" @click="onRestore">恢复购买</button>
			<!-- #endif -->
		</view>

		<view class="card faq">
			<text class="section-title">常见问题</text>
			<text class="faq-q">换手机后会员还在吗？</text>
			<text class="faq-a">正式上线需登录同一账号，由云端同步订单；当前演示仅保存在本机。</text>
			<text class="faq-q">可以退款吗？</text>
			<text class="faq-a">按应用商店与支付渠道规则执行；请在付费前阅读《会员服务协议》。</text>
		</view>

		<view class="footer-hint">长按顶部「开通会员」文案区域可清除本地会员与体验记录（仅调试）</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import {
	VIP_PLANS,
	VIP_COMPARE,
	GRADE_IAP_PRODUCTS,
	REVIEW_IAP_PRODUCT
} from '@/constants/vip-products.js'
import { listUnlockedGrades, hasReviewPack } from '@/utils/vip-entitlements.js'
import MengAvatar from '@/components/meng-avatar.vue'
import {
	isVipActive,
	getVipExpireDateText,
	requestPurchase,
	tryClaimInstallTrialIfEligible,
	clearVipForDebug
} from '@/utils/vip.js'
import {
	syncVipEntitlementFromServer,
	restoreVipPurchases
} from '@/services/vip-pay-service.js'
import { VIP_PAY_API_BASE_URL } from '@/config/vip-pay-config.js'

export default {
	components: { MengSubPage, MengAvatar },
	data() {
		return {
			subscriptionPlans: VIP_PLANS,
			gradeProducts: GRADE_IAP_PRODUCTS,
			reviewProduct: REVIEW_IAP_PRODUCT,
			compareRows: VIP_COMPARE,
			unlockedGrades: [],
			reviewPackOwned: false,
			vipActive: false,
			expireText: '',
			trialDays: 7,
			paying: false,
			payConfigured: Boolean(VIP_PAY_API_BASE_URL)
		}
	},
	onLoad() {
		this.refresh()
	},
	async onShow() {
		this.refresh()
		try {
			await syncVipEntitlementFromServer()
			this.refresh()
		} catch (_) {}
	},
	methods: {
		refresh() {
			this.vipActive = isVipActive()
			this.expireText = getVipExpireDateText()
			this.unlockedGrades = listUnlockedGrades()
			this.reviewPackOwned = hasReviewPack()
		},
		isGradeOwned(grade) {
			if (this.vipActive) return true
			return this.unlockedGrades.includes(Number(grade))
		},
		goFamilyProfiles() {
			uni.navigateTo({ url: '/pages/me/family-profiles' })
		},
		async buy(planId) {
			if (this.paying) return
			this.paying = true
			try {
				const r = await requestPurchase(planId)
				this.refresh()
				const product = [...this.subscriptionPlans, ...this.gradeProducts, this.reviewProduct].find(
					(x) => x.id === planId
				)
				let title = this.payConfigured ? '购买成功' : '已开通（演示）'
				if (product?.kind === 'grade_pack') title = '年级已解锁'
				if (product?.kind === 'review_pack') title = '复习包已解锁'
				uni.showToast({ title, icon: 'success' })
				return r
			} catch (e) {
				const msg = e && e.message ? String(e.message) : ''
				if (msg === 'cancel') return
				if (msg === 'pay_api_not_configured') {
					uni.showToast({ title: '支付未配置', icon: 'none' })
					return
				}
				if (msg === 'wx_login_required') {
					uni.showToast({ title: '请重新打开小程序后再试', icon: 'none' })
					return
				}
				uni.showToast({
					title: msg.includes('苹果') ? '请使用安卓或配置内购' : '支付未完成',
					icon: 'none'
				})
			} finally {
				this.paying = false
			}
		},
		async onRestore() {
			try {
				await restoreVipPurchases()
			} catch (_) {}
		},
		claimTrial() {
			const r = tryClaimInstallTrialIfEligible(this.trialDays)
			if (r.ok) {
				this.refresh()
				uni.showToast({ title: `已领取${r.days}天体验`, icon: 'success' })
				return
			}
			if (r.reason === 'used') {
				uni.showToast({ title: '每台设备限领一次', icon: 'none' })
				return
			}
			if (r.reason === 'already_vip') {
				uni.showToast({ title: '您已是会员', icon: 'none' })
			}
		},
		debugResetVip() {
			clearVipForDebug()
			this.refresh()
			uni.showToast({ title: '已清除本地会员（调试）', icon: 'none' })
		}
	}
}
</script>

<style scoped>
.page {
	box-sizing: border-box;
}

.hero {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	gap: 16rpx;
	margin-bottom: 24rpx;
}

.hero-copy {
	flex: 1;
	min-width: 0;
}

.hero-badge {
	display: inline-block;
	font-size: 22rpx;
	color: #6b4f2a;
	background: rgba(212, 175, 55, 0.35);
	padding: 6rpx 16rpx;
	border-radius: 999rpx;
	margin-bottom: 12rpx;
}

.hero-title {
	display: block;
	font-size: 40rpx;
	font-weight: 700;
	color: var(--meng-text);
	line-height: 1.35;
	margin-bottom: 12rpx;
}

.hero-sub {
	display: block;
	font-size: 24rpx;
	color: #6b6560;
	line-height: 1.5;
}

.hero-expire {
	margin-top: 20rpx;
	padding: 16rpx 20rpx;
	background: rgba(255, 255, 255, 0.65);
	border-radius: 12rpx;
}

.expire-label {
	font-size: 22rpx;
	color: #6b6560;
	margin-right: 12rpx;
}

.expire-val {
	font-size: 28rpx;
	font-weight: 600;
	color: #3d6b4a;
}

.card {
	background: var(--meng-card-solid);
	border-radius: 24rpx;
	padding: 28rpx;
	margin-bottom: 24rpx;
	border: 1rpx solid var(--meng-border);
	box-shadow: 0 8rpx 28rpx var(--meng-shadow);
}

.notice {
	border-left: 6rpx solid #c9a227;
}

.notice-title {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: #5c4a2e;
	margin-bottom: 10rpx;
}

.notice-body {
	font-size: 24rpx;
	color: #5a534c;
	line-height: 1.55;
}

.section-title {
	display: block;
	font-size: 30rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 20rpx;
}

.compare-head {
	display: flex;
	justify-content: space-between;
	margin-bottom: 16rpx;
	padding-bottom: 10rpx;
	border-bottom: 1rpx solid #e5dfd4;
}

.ch-label {
	font-size: 22rpx;
	color: #a8a29e;
	width: 22%;
}

.ch-free,
.ch-vip {
	font-size: 22rpx;
	color: #8a8279;
	width: 36%;
	text-align: left;
}

.compare-block {
	margin-bottom: 18rpx;
}

.compare-label {
	display: block;
	font-size: 24rpx;
	font-weight: 600;
	color: #4a453f;
	margin-bottom: 8rpx;
}

.compare-row {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
}

.compare-row > .compare-free {
	margin-right: 12rpx;
}

.compare-free,
.compare-vip {
	flex: 1;
	font-size: 22rpx;
	line-height: 1.45;
	color: #4a453f;
}

.compare-vip {
	color: #2d5a3d;
	font-weight: 500;
}

.plans {
	display: flex;
	flex-direction: column;
}

.plans > .plan + .plan {
	margin-top: 16rpx;
}

.plan {
	position: relative;
	padding: 24rpx 22rpx;
	border-radius: 16rpx;
	border: 2rpx solid #e0d8ca;
	background: #fff;
}

.plan.highlight {
	border-color: #c9a227;
	background: #fff8e8;
}

.plan-tag {
	position: absolute;
	top: 12rpx;
	right: 16rpx;
	font-size: 20rpx;
	color: #8b6914;
	background: rgba(201, 162, 39, 0.25);
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
}

.plan-name {
	font-size: 28rpx;
	font-weight: 600;
	color: var(--meng-text);
}

.plan-price {
	display: block;
	font-size: 44rpx;
	font-weight: 700;
	color: #b8860b;
	margin-top: 8rpx;
}

.plan-meta {
	font-size: 22rpx;
	color: #8a8279;
	margin-top: 4rpx;
}

.section-desc {
	display: block;
	font-size: 24rpx;
	color: #8a8279;
	line-height: 1.45;
	margin: -8rpx 0 16rpx;
}

.link-btn {
	margin-top: 16rpx;
	font-size: 26rpx;
	color: #5c7a48;
}

.grade-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}

.grade-tile {
	flex: 0 0 31%;
	width: 31%;
	margin-right: 3.5%;
	margin-bottom: 12rpx;
	padding: 18rpx 8rpx;
	border-radius: 14rpx;
	border: 1rpx solid #e0d8ca;
	background: #fff;
	text-align: center;
	box-sizing: border-box;
}

.grade-tile:nth-child(3n) {
	margin-right: 0;
}

.grade-tile--on {
	border-color: #8bc34a;
	background: #f1f8e9;
}

.grade-num {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	color: var(--meng-text);
}

.grade-price {
	display: block;
	font-size: 22rpx;
	color: #8a8279;
	margin-top: 6rpx;
}

.plan--family {
	border-color: #d4a574;
}

.plan--flat {
	margin-top: 0;
}

.card--trial {
	padding-top: 8rpx;
}

.trial-btn,
.restore-btn {
	margin-top: 24rpx;
	font-size: 26rpx;
	color: #4a5568;
}

.faq-q {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	color: #3d3833;
	margin-top: 16rpx;
}

.faq-a {
	display: block;
	font-size: 24rpx;
	color: #6b6560;
	line-height: 1.5;
	margin-top: 6rpx;
}

.footer-hint {
	text-align: center;
	font-size: 20rpx;
	color: #a8a29e;
	padding: 24rpx 0;
}
</style>
