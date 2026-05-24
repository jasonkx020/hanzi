import {
	PRESCHOOL_LESSON_CHAR_GROUPS,
	buildPreschoolCurriculum,
	MOE_BASIC_CHARS_SOURCE
} from './preschool-bridge-curriculum.mjs'

const all = [...MOE_BASIC_CHARS_SOURCE]
const flat = PRESCHOOL_LESSON_CHAR_GROUPS.join('')
const assigned = new Set(flat)
const missing = all.filter((c) => !assigned.has(c))
const extra = [...flat].filter((c) => !all.includes(c))
const dups = []
const seen = new Set()
for (const ch of flat) {
	if (seen.has(ch)) dups.push(ch)
	seen.add(ch)
}

let metaLessons = 0
let buildErr = ''
try {
	for (const u of buildPreschoolCurriculum()) metaLessons += u.lessons.length
} catch (e) {
	buildErr = e.message
}

console.log('groups', PRESCHOOL_LESSON_CHAR_GROUPS.length, 'flat', flat.length, 'unique', seen.size)
console.log('meta lessons', metaLessons, buildErr ? `(build err: ${buildErr})` : '')
console.log('missing', missing.length, missing.join(''))
if (extra.length) console.log('extra', extra.join(''))
if (dups.length) console.log('dups', [...new Set(dups)].join(''))
process.exit(missing.length || extra.length || dups.length ? 1 : 0)
