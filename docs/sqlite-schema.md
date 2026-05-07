# SQLite 数据结构说明（汉字教材 · 用户进度）

本文档与代码 **`constants/curriculum-schema.js`** 中的表名、列名、`SQL_CREATE_*` **保持一致**，便于 App（`plus.sqlite`）、Node 构建脚本、调试工具共用同一套约定。

---

## 约定

| 项目 | 说明 |
|------|------|
| 布尔 | SQLite 用 **`INTEGER`**：`0` = 否，`1` = 是 |
| 时间 | **`updated_at_ms`** 为 Unix 毫秒时间戳 |
| 学期 **`semester`** | 文本：`上`、`下`（与 `SEMESTER` 常量一致） |
| 教材版本 **`textbook_version_id`** | 文本，例如统编人教：`tongbian-rj`（见 `TEXTBOOK_VERSION_IDS`） |
| 字表类型 **`list_type`** | 文本：`识字表`、`写字表`、`生字汇总`（见 `LIST_TYPE`） |
| 关联 | 未声明 **`FOREIGN KEY`**：便于离线导入与裁剪字库；应用层用 `(textbook_version_id, grade, semester, hanzi)` 对齐两表 |

---

## 表一览

| 表名 | 用途 |
|------|------|
| **`hanzi_curriculum`** | 教材生字主数据（按版本·年级·学期·字表类型） |
| **`user_char_progress`** | 用户对单个字的进度（学过 / 掌握 / 易错计数等） |

---

## 1. `hanzi_curriculum` — 教材生字

教材内置数据；导入时按 **`sort_order`** 排序展示。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 行号 |
| `textbook_version_id` | TEXT | NOT NULL | 教材版本标识 |
| `grade` | INTEGER | NOT NULL | 年级（如 1～6） |
| `semester` | TEXT | NOT NULL | `上` / `下` |
| `list_type` | TEXT | NOT NULL | 识字表 / 写字表 / 生字汇总 |
| `hanzi` | TEXT | NOT NULL | 单个汉字或兼容词组（应用层可约束单字） |
| `pinyin` | TEXT | | 拼音（可空） |
| `sort_order` | INTEGER | NOT NULL DEFAULT 0 | 同级内排序，越小越靠前 |
| `lesson_hint` | TEXT | | 课时/课文提示 |
| `source_url` | TEXT | | 数据来源链接（可空） |

**索引**

- `idx_hanzi_curriculum_lookup`：`(`textbook_version_id`, `grade`, `semester`, `list_type`)` — 列表筛选。
- `idx_hanzi_curriculum_char`：`(`hanzi`)` — 按字反查。

**示例查询：当前教材条件下的生字列表**

```sql
SELECT hanzi, pinyin, list_type, sort_order, lesson_hint
FROM hanzi_curriculum
WHERE textbook_version_id = ?
  AND grade = ?
  AND semester = ?
  AND (? IS NULL OR list_type = ?)
ORDER BY sort_order ASC, id ASC;
```

（若「全部字表」不传 `list_type`，可把条件改为应用层拼接：不加 `list_type` 条件即可。）

---

## 2. `user_char_progress` — 用户字进度

可与 **`hanzi_curriculum`** 通过 `(textbook_version_id, grade, semester, hanzi)` 逻辑关联；本地可先只用 Storage，上线 SQLite 后结构与 **`COL_PROGRESS`** 对齐。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 行号 |
| `textbook_version_id` | TEXT | NOT NULL | 教材版本 |
| `grade` | INTEGER | NOT NULL | 年级 |
| `semester` | TEXT | NOT NULL | `上` / `下` |
| `hanzi` | TEXT | NOT NULL | 汉字 |
| `learned` | INTEGER | NOT NULL DEFAULT 0 | 是否已学过（1=纳入「学过的字库」） |
| `mastered` | INTEGER | NOT NULL DEFAULT 0 | 是否已掌握 |
| `wrong_count` | INTEGER | NOT NULL DEFAULT 0 | 累计错误次数（易错排序） |
| `updated_at_ms` | INTEGER | NOT NULL | 最后更新时间（毫秒） |

**唯一约束**

- `UNIQUE(textbook_version_id, grade, semester, hanzi)` — 同一进度维度每个字一行。

**索引**

- `idx_user_progress_wrong`：`(`textbook_version_id`, `wrong_count`)` — 按版本筛「易错榜」时可辅助排序（排序仍以 `wrong_count DESC` 为准）。

**示例： upsert 语义（应用层）**

1. 按唯一键查询是否存在；
2. 存在则 `UPDATE` 各进度字段与 `updated_at_ms`；
3. 不存在则 `INSERT`。

---

## 本地 Storage（非 SQLite）

以下键仅 **`uni.storage`**，不入库；字段语义与表筛选一致：

| 键名 | 常量 | 说明 |
|------|------|------|
| `curriculum_prefs_v1` | `STORAGE_KEYS.CURRICULUM_PREFS` | 当前教材：版本、年级、学期、字表偏好 |
| `user_char_progress_v1` | `STORAGE_KEYS.USER_CHAR_PROGRESS` | 进度映射（待迁移 SQLite 时可对照 `COL_PROGRESS`） |

---

## 初始化脚本

可直接执行的 DDL 汇总见：**`docs/sqlite/ddl.sql`**。

**生成预置 `.db` 文件（建表 + 默认种子数据）：**

- 教材生字种子：**`scripts/seed-curriculum.json`**（统编 `tongbian-rj`、一年级上、识字表 / 写字表 / 生字汇总示例，可按课增删）。
- 用户进度演示种子：**`scripts/seed-user-progress.json`**（可选；构建时写入 `user_char_progress`，便于联调「学过的字 / 易错」）。

```bash
npm install
npm run db:build
```

生成 **`static/db/hanzi_curriculum.db`**。App 首次会把包内库复制到 **`_doc/hanzi_curriculum.db`**；若设备上已有旧 `_doc` 文件，不会自动替换，需清应用数据或删该文件后重装，才会用上新版种子。

运行时亦可使用：

```js
import { SQL_CREATE_HANZI_CURRICULUM, SQL_CREATE_USER_CHAR_PROGRESS } from '@/constants/curriculum-schema.js'
// 依次执行两段 SQL（或多语句一次 execute）
```

---

## 变更记录建议

以后若增列：

1. 修改 **`constants/curriculum-schema.js`**（`COL` / `COL_PROGRESS`、`SQL_CREATE_*`）；
2. 同步更新 **`docs/sqlite-schema.md`** 与 **`docs/sqlite/ddl.sql`**；
3. App 端对已发布库做 **`ALTER TABLE`** 或版本号迁移脚本。
