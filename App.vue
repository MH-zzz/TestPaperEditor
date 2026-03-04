<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
			// #ifdef APP-PLUS
			console.log('App Launch111')
			setTimeout(() => {
				uni.reLaunch({
					url: '/pages/mobile-learning/unit-list'
				})
			}, 0)
			// #endif
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style lang="scss">
	@import './styles/base.scss';
</style>
