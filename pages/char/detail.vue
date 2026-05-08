<script>
export default {
	onLoad(query) {
		const hanzi = query.hanzi ? decodeURIComponent(query.hanzi) : ''
		const pinyin = query.pinyin ? decodeURIComponent(query.pinyin) : ''
		const lesson = query.lesson ? decodeURIComponent(query.lesson) : ''
		uni.redirectTo({
			url: `/pages/dictionary/result?hanzi=${encodeURIComponent(hanzi)}&pinyin=${encodeURIComponent(pinyin)}&lesson=${encodeURIComponent(lesson)}`
		})
	}
}
</script>
