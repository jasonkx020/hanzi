<!--
  @file meng-tab-hero.vue
  @layer L1 表现层
  @description UI 组件源文件：meng-tab-hero.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<view class="tab-hero">
		<image class="tab-hero-bg" :src="bgSrc" mode="aspectFill" />
		<view class="tab-hero-overlay" />
		<meng-status-bar-spacer :height-px="statusBarPx" />
		<view class="tab-hero-body">
			<meng-avatar
				:pose="avatarPose"
				:size="avatarSize"
				@error="$emit('avatar-error')"
			/>
			<view class="tab-hero-text">
				<text class="tab-hero-title">{{ title }}</text>
				<text v-if="subtitle" class="tab-hero-sub">{{ subtitle }}</text>
			</view>
			<view v-if="$slots.actions" class="tab-hero-actions">
				<slot name="actions" />
			</view>
		</view>
		<view v-if="$slots.foot" class="tab-hero-foot">
			<slot name="foot" />
		</view>
	</view>
</template>

<script>
import MengAvatar from '@/components/meng-avatar.vue'
import MengStatusBarSpacer from '@/components/meng-status-bar-spacer.vue'
import { MENG_ASSETS } from '@/utils/mengmeng-assets.js'

export default {
	name: 'MengTabHero',
	components: { MengAvatar, MengStatusBarSpacer },
	props: {
		title: { type: String, default: '' },
		subtitle: { type: String, default: '' },
		avatarPose: { type: String, default: 'happy' },
		avatarSize: { type: String, default: 'lg' },
		heroBg: { type: String, default: () => MENG_ASSETS.heroBg },
		/** 状态栏高度（px），不传则由 spacer 自行读取系统值 */
		statusBarPx: { type: Number, default: 0 },
		/** @deprecated 已改用内部 spacer，保留兼容 */
		bleedStyle: { type: Object, default: () => ({}) }
	},
	emits: ['avatar-error'],
	computed: {
		bgSrc() {
			return this.heroBg || MENG_ASSETS.heroBg
		}
	}
}
</script>
