# 拼音点读 · 播放会话 API

> 统一快速连点 / 切页时的本地 opus 播放取消逻辑。  
> 实现：`utils/pinyin-play-session.js`（音频）+ `utils/pinyin-play-session-scopes.js`（纯计数，可单测）。

## 页面用法（推荐）

1. 在页面 `export default` 上挂 mixin，并声明 scope：

```javascript
import pinyinPlayScopeMixin, { PINYIN_PLAY_SCOPES } from '@/mixins/pinyin-play-scope.js'

export default {
  mixins: [pinyinPlayScopeMixin],
  pinyinPlayScope: PINYIN_PLAY_SCOPES.LESSON_CARD,
  // created 后可用 this._pyPlay；onHide/onUnload 自动 cancel
}
```

2. 点读时：

```javascript
await this._pyPlay.run(({ isCancelled }) =>
  playOpusForDisplayPinyin(py, { isCancelled })
)
```

3. 切题 / 额外条件：

```javascript
await this._pyPlay.run(playFn, { when: () => this.phase !== 'play' })
```

## Scope 一览

| 常量 | 页面 |
|------|------|
| `LESSON_CARD` | 课次字卡 `lesson.vue` |
| `LESSON_QUIZ` | 课次小测 `lesson-quiz.vue` |
| `DICT_RESULT` | 查字结果 `dictionary/result.vue` |
| `PINYIN_INDEX` | 拼音学习 Tab `pinyin/index.vue` |
| `GAME_HEAR` | 识字游戏听音 `literacy/game.vue` |
| `GLOBAL` | 乐园子页、大闯关（`runPinyinPlaySession` / `playLabPinyinAudio`） |

## 乐园 / 闯关

- `utils/pinyin-lab-play.js` → `playLabPinyinAudio(fn)`（内部 `GLOBAL` scope）
- `services/pinyin-drill-service.js` → `playDrillSymbol` 使用 `runPinyinPlaySession`

## 音频策略

- **仅本地 opus**：`/static/pinyin/{音节}.opus`，无调 → 一声替补；**不使用拼音 TTS**。
- 课文全文朗读（`speakChinese`）与「我的」列表点汉字仍为独立能力，不走本 API。

## 单测

```bash
npm run test:pinyin
```

覆盖：`utils/pinyin-play-session-scopes.js` 的 scope 隔离与世代失效。
