<!--
  @file meng-avatar.vue
  @layer L1 表现层
  @description UI 组件源文件：meng-avatar.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<image
		class="meng-avatar"
		:class="[`meng-avatar--${size}`, customClass]"
		:src="resolvedSrc"
		:mode="mode"
		@error="$emit('error', $event)"
	/>
</template>

<script>
import { mengIp } from '@/utils/mengmeng-assets.js'

export default {
	name: 'MengAvatar',
	props: {
		pose: {
			type: String,
			default: 'book'
		},
		src: {
			type: String,
			default: ''
		},
		size: {
			type: String,
			default: 'md'
		},
		mode: {
			type: String,
			default: 'aspectFit'
		},
		customClass: {
			type: String,
			default: ''
		}
	},
	emits: ['error'],
	computed: {
		resolvedSrc() {
			if (this.src) return this.src
			return mengIp(this.pose)
		}
	}
}
</script>

<style scoped>
.meng-avatar {
	display: block;
	flex-shrink: 0;
}
.meng-avatar--xs {
	width: 56rpx;
	height: 56rpx;
}
.meng-avatar--sm {
	width: 88rpx;
	height: 88rpx;
}
.meng-avatar--md {
	width: 120rpx;
	height: 120rpx;
}
.meng-avatar--lg {
	width: 200rpx;
	height: 200rpx;
}
.meng-avatar--xl {
	width: 320rpx;
	height: 320rpx;
}
</style>
