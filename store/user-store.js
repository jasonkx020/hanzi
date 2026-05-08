const userState = {
	nickname: '小朋友',
	streakDays: 0
}

export function getUserState() {
	return userState
}

export function setUserProfile(patch = {}) {
	Object.assign(userState, patch)
	return userState
}
