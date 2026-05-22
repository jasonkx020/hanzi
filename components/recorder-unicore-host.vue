<template>
	<!-- 已废弃：RecordApp 要求 renderjs 写在页面根 .vue 末尾，见 utils/recorder-app-renderjs-snippet.md -->
	<view class="recorder-unicore-host" aria-hidden="true" />
</template>

<script>
export default {
	name: 'recorder-unicore-host'
}
</script>

<style scoped>
.recorder-unicore-host {
	display: none;
}
</style>
