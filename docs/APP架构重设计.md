# 萌萌识字 App 架构重设计（V2）

基于 `docs/原始设计.md` 与 `docs/页面大致布局.md`，本方案给出一套可实施的产品与工程架构。目标是：**低龄易用、课内同步、可持续迭代、家长可感知效果**。

---

## 1. 产品信息架构（IA）

底部 4 Tab（固定）：

1. `识字`（默认首页）
2. `拼音`
3. `查字`
4. `我的`

### 1.1 识字（核心学习闭环）

- 顶部：推荐横幅 + 年级册别快捷切换（幼升小 ~ 九年级上下）
- 主体三大入口：
  - `课本同步学`
  - `趣味识字营`
  - `每日一练`
- 底部：本周进度 + IP 激励文案（萌萌）

二级页面建议：
- `教材目录页`（年级/册别/单元/课次）
- `课次字卡页`（本课全部生字）
- `单字学习页`（字形、拼音、笔顺、组词、跟读）
- `课后小测页`（听音选字/看图识字/笔顺测试）

### 1.2 拼音

- 分类标签：`声母` `韵母` `整体认读` `拼读练习`
- 拼音卡网格：点击可听读音 + 示例
- 闯关入口：`拼音大闯关`

### 1.3 查字（工具导向）

- 搜索输入（汉字）
- 手写输入 / 部首检索
- 结果卡：
  - 大字田字格
  - 拼音 / 部首 / 结构 / 笔画
  - 组词
  - 动态笔顺
  - 加入生字本

### 1.4 我的（家长与激励）

- 用户信息与连续学习天数
- 学习报告（周/月）
- 我的字库（已掌握 / 易错）
- 勋章墙
- 设置（年级、提醒、音色、护眼、家长验证）

---

## 2. 页面路由架构（建议）

> 在当前 UniApp 项目里新增以下路由分组，保证主干清晰。

- `pages/home/home`：识字首页
- `pages/literacy/textbook`：课本同步学（目录）
- `pages/literacy/lesson`：课次字卡
- `pages/literacy/char`：单字学习
- `pages/literacy/daily`：每日一练
- `pages/literacy/game`：趣味识字营
- `pages/pinyin/index`：拼音主页（含分类）
- `pages/pinyin/drill`：拼音闯关
- `pages/dictionary/index`：查字主页
- `pages/dictionary/result`：查字结果详情
- `pages/me/me`：我的主页
- `pages/me/report`：学习报告
- `pages/me/medals`：勋章墙
- `pages/settings/curriculum`：教材设置
- `pages/settings/guardian`：家长验证与学习控制

说明：
- 原有 `pages/tools/stroke` 作为能力实验页可保留，后续逐步并入 `单字学习` 与 `查字详情`。

---

## 3. 工程分层架构（前端）

采用 5 层分离，避免页面直接耦合存储与算法。

1. `UI 层`（pages + components）
2. `应用层`（usecases / orchestrators）
3. `领域层`（entities + rules，如掌握度判定、复习策略）
4. `数据层`（repositories：SQLite、localStorage、远端 API）
5. `基础设施层`（音频、埋点、权限、动画、TTS）

目录建议：

- `pages/`：页面入口
- `components/`：通用组件（字卡、进度条、勋章、拼音按钮）
- `modules/literacy/`
- `modules/pinyin/`
- `modules/dictionary/`
- `modules/profile/`
- `repositories/`
- `services/`（audio, stroke, speech, analytics）
- `store/`（全局状态）
- `constants/`

---

## 4. 核心数据模型（统一口径）

建议至少维护以下模型：

- `UserProfile`
  - `id, nickname, avatar, streakDays, currentGrade, currentSemester`
- `CurriculumNode`
  - `grade, semester, unitId, lessonId, lessonTitle`
- `CharEntry`
  - `hanzi, pinyin, radicals, structure, strokeCount, words[]`
- `LearningRecord`
  - `hanzi, lessonId, learned, mastered, wrongCount, lastReviewedAt`
- `PinyinRecord`
  - `symbol, mastery, wrongCount, lastPracticedAt`
- `MedalRecord`
  - `medalId, earnedAt, progress`
- `DailyTask`
  - `taskDate, targetCount, finishedCount, weakChars[]`

---

## 5. 关键业务流

### 5.1 识字学习闭环

`首页 -> 课本同步学 -> 课次字卡 -> 单字学习 -> 小测 -> 更新学习记录 -> 首页进度与激励刷新`

### 5.2 易错回流

`笔顺测试/听写错题 -> wrongCount +1 -> 进入“我的字库-待复习” -> 每日一练优先抽取`

### 5.3 拼音训练闭环

`拼音卡学习 -> 跟读反馈 -> 闯关题组 -> 掌握度更新 -> 报告页可视化`

---

## 6. 状态管理策略

全局状态建议拆为 4 个 store：

- `appStore`：版本、主题、启动状态、权限状态
- `curriculumStore`：当前年级册别、当前课次
- `learningStore`：识字/拼音进度、今日任务、弱项池
- `userStore`：用户信息、勋章、家长设置

规则：
- 页面只读 store，不直接拼业务逻辑；
- 业务逻辑放到 `modules/*/usecases`；
- 数据写入只经 repository。

---

## 7. 能力服务拆分

- `strokeService`
  - 统一封装笔顺动画、测试、结果回调（对接现有 `draw-native`）
- `speechService`
  - 发音播放、跟读录音、评分接口（可先预留 mock）
- `recommendService`
  - 每日一练选题（优先易错 + 间隔复习）
- `rewardService`
  - 星星、勋章、连续打卡、鼓励文案
- `guardianService`
  - 家长锁、学习时长、休息提醒

---

## 8. 视觉与交互系统（落地约束）

沿用设计稿基调并沉淀设计 Token：

- 色彩 Token：
  - `primary #FFA726`
  - `success #8BC34A`
  - `info #42A5F5`
  - `accent #F48FB1`
  - `bg #FFF8E7`
  - `textPrimary #4E4E4E`
  - `textSecondary #9E9E9E`
  - `danger #EF5350`
- 圆角层级：`12/16/20/28`
- 动效时长：`120ms / 220ms / 350ms`
- 触控目标最小尺寸：`>= 88rpx`

---

## 9. 兼容当前项目的迁移路径

### Phase 1（1~2 周）：架构打底

- 完成模块目录重组（先不改 UI）
- 抽离 repository / service
- 统一学习记录模型（识字、拼音、错题）

### Phase 2（2~3 周）：四大 Tab 成型

- 首页改为“识字”设计稿版本
- 拼音页首版上线（声母/韵母/闯关）
- 查字页首版上线（检索 + 结果卡）
- 我的页聚合报告与字库

### Phase 3（2 周）：学习闭环强化

- 每日一练推荐
- 勋章墙与激励
- 家长控制（提醒、护眼、验证）

### Phase 4（持续）：体验优化

- 跟读评分接入
- 启动页 IP 动画
- 游戏化内容扩充

---

## 10. 当前代码映射建议（结合你现有项目）

- 保留并升级：
  - `pages/tools/stroke.vue` -> 迁入 `modules/literacy/strokeService`
  - `utils/user-progress-storage.js` -> 升级为 `repositories/learningRepository.js`
  - `utils/curriculum-storage.js` -> 升级为 `repositories/curriculumRepository.js`
- 调整：
  - `pages/home/home.vue` 从“入口页”升级为“识字工作台”
  - `pages/catalog/catalog.vue` 升级为“课次字卡页/教材目录页”

---

## 11. 验收标准（Definition of Done）

- 四个 Tab 均可独立完成核心任务
- 识字学习链路可闭环并回写进度
- 错题可进入复习池并被每日一练命中
- 家长可看到周报与弱项
- 低龄用户在 3 次点击内可进入学习内容

---

这份 V2 架构可直接作为后续开发蓝图。若你需要，我下一步可以继续给出：

1. `pages.json` 的完整新版路由清单  
2. `modules/*` 的目录脚手架（可直接创建文件）  
3. “识字首页 + 课本同步学”两页的首版代码落地清单
