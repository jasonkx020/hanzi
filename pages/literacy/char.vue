<!--
  @file char.vue
  @layer L1 表现层
  @description 路由页面源文件：char.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<meng-sub-page title="单字学习" subtitle="字形、笔顺、组词与跟读">
		<view class="card meng-card">
			<meng-avatar pose="book" size="md" />
			<text class="title">功能整合中</text>
			<text class="desc">请从课次字卡或查字结果进入单字详情。</text>
		</view>
	</meng-sub-page>
</template>
<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import MengAvatar from '@/components/meng-avatar.vue'
export default { components: { MengSubPage, MengAvatar } }
</script>
<style scoped>
.card { display: flex; flex-direction: column; align-items: center; text-align: center; }
.title { display: block; font-size: 32rpx; font-weight: 700; color: var(--meng-text); margin-bottom: 10rpx; }
.desc { display: block; font-size: 25rpx; color: #6b6560; }
</style>
