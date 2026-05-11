# 教材生字与用户进度 · 数据结构说明

本文档与 **`constants/curriculum-schema.js`**、`utils/curriculum-db.js`、`utils/user-progress-storage.js` 保持一致。运行时**不使用 SQLite**：教材生字来自打包内的 **`constants/hanzi_curriculum_seed.json`**，用户进度在 **`uni.storage`**。

> 历史：`docs/sqlite/ddl.sql` 仍为参考 DDL，便于本地用 sqlite3 做实验或与旧文档对照。

---

## 约定

| 项目 | 说明 |
|------|------|
| 进度布尔字段 | Storage 中为 **`0` / `1`**（与 `COL_PROGRESS` 读写一致） |
| 时间 | **`updated_at_ms`** 为 Unix 毫秒时间戳 |
| 学期 **`semester`** | 文本：`上`、`下`（与 `SEMESTER` 常量一致） |
| 教材版本 **`textbook_version_id`** | 文本，例如：`统编(人教版)`（见 `TEXTBOOK_VERSION_IDS`） |
| 字表类型 **`list_type`** | 文本：`识字表`、`写字表`、`生字汇总`、`识字写字基本字表`（课标附录4，见 `LIST_TYPE`） |
| 关联 | 应用层用 `(textbook_version_id, grade, semester, hanzi)` 对齐生字与进度 |

---

## 逻辑数据集一览

| 名称 | 常量 / 实现 | 用途 |
|------|----------------|------|
| **`hanzi_curriculum`** | `TABLE_HANZI_CURRICULUM`；数据见 seed JSON | 教材生字（按版本·年级·学期·字表类型） |
| **`user_char_progress`** | `TABLE_USER_CHAR_PROGRESS`；`STORAGE_KEYS.USER_CHAR_PROGRESS` | 用户对单个字的进度 |

---

## 1. `hanzi_curriculum` — 教材生字（JSON 行）

源文件：**`scripts/seed-curriculum.json`**。构建生成：**`constants/hanzi_curriculum_seed.json`**。

```bash
npm run db:build
```

构建脚本：**`scripts/build-db.mjs`**（只做规范化与写出 JSON，不写 `.db`）。

展示顺序：按 **`sort_order`** 升序，其次 **`id`** 升序（与 `queryCurriculumChars` 一致）。其中「识字写字基本字表」300 字在 **`scripts/build-db.mjs`** 中按 **`cnchar.stroke` 笔画数**从小到大排列后写入 `sort_order`（同笔画数则按 `zh-Hans-CN` 的 `localeCompare` 稳定排序）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 构建时从 1 递增的稳定行号 |
| `textbook_version_id` | string | 教材版本 |
| `grade` | number | 年级 1～6 |
| `semester` | string | `上` / `下` |
| `list_type` | string | 识字表 / 写字表 / 生字汇总 |
| `hanzi` | string | 汉字（或应用层允许的词组） |
| `pinyin` | string \| null | 拼音 |
| `sort_order` | number | 同级内排序，越小越靠前 |
| `lesson_hint` | string \| null | 课时/课文提示 |
| `source_url` | string \| null | 数据来源 |

**等价筛选（示意）**

```
textbook_version_id = ?
AND grade = ?
AND semester = ?
AND（若字表偏好不是「全部」）list_type = ?
ORDER BY sort_order ASC, id ASC
```

具体实现见 **`utils/curriculum-db.js`**；调试文案见 **`debugCurriculumFilter`**。

---

## 2. `user_char_progress` — 用户字进度（Storage）

持久化：键 **`user_char_progress_v1`**（`STORAGE_KEYS.USER_CHAR_PROGRESS`），值为 **对象映射**：键为 `makeProgressKey(version, grade, semester, hanzi)`，值为下列字段的对象。

| 字段 | 类型 | 说明 |
|------|------|------|
| `textbook_version_id` | string | 教材版本 |
| `grade` | number | 年级 |
| `semester` | string | `上` / `下` |
| `hanzi` | string | 汉字 |
| `learned` | 0 \| 1 | 是否已学过（「学过的字库」） |
| `mastered` | 0 \| 1 | 是否已掌握 |
| `wrong_count` | number | 累计错误次数（易错排序） |
| `updated_at_ms` | number | 最后更新时间 |

读写 API：**`utils/user-progress-storage.js`**（`upsertUserCharProgress`、`getUserProgressMap` 等）。

---

## 本地 Storage · 教材偏好

| 键名 | 常量 | 说明 |
|------|------|------|
| `curriculum_prefs_v1` | `STORAGE_KEYS.CURRICULUM_PREFS` | 当前教材：版本、年级、学期、字表偏好 |

---

## 变更记录建议

1. 改生字数据：编辑 **`scripts/seed-curriculum.json`**，执行 **`npm run db:build`**，提交更新后的 **`constants/hanzi_curriculum_seed.json`**。
2. 改字段约定：同步 **`constants/curriculum-schema.js`**、构建脚本与本说明。
3. 若恢复 SQLite：可再以 **`docs/sqlite/ddl.sql`** 为起点设计迁移与版本号。
