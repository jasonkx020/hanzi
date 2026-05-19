# 拼音跟读评分 · Meyda + MFCC + DTW 重构计划

> 状态：**已落地**（v2 默认开启，`USE_MFCC_SCORING = true`）  
> 目标：用 **Meyda 提取 MFCC 帧序列** + **DTW 比对** 替换当前「包络 + Goertzel 频带」方案。  
> 原则：**示范音离线预提取**，**用户录音仅运行时提取**；构建脚本与端上 **算法参数完全一致**。

---

## 一、现状与目标

### 现状（v1 · 已上线）

| 环节 | 实现 |
|------|------|
| 录音 | `uni.getRecorderManager` + 自研 VAD |
| 参考特征 | `data/pinyin-audio-fingerprints.json`（`e` 包络 32 点 + `b` 8 频带） |
| 用户特征 | `extractPcmFingerprint`（与构建脚本同逻辑） |
| 比对 | 包络 DTW + 频带余弦（`pinyin-follow-read-audio-compare.js`） |
| 构建 | `npm run pinyin:fingerprints`（Node + ffmpeg，无 Meyda） |

### 目标（v2 · MFCC）

| 环节 | 实现 |
|------|------|
| 参考特征 | `data/pinyin-mfcc-fingerprints.json`（MFCC 帧序列 + 元数据） |
| 用户特征 | 运行时滑窗 + Meyda MFCC（与构建脚本同参） |
| 比对 | MFCC 序列 **DTW**（可选保留时长/有声比例门控） |
| 构建 | `npm run pinyin:mfcc-fingerprints`（Node + ffmpeg + **Meyda**） |

### 不变部分

- 对外 API：`startFollowReadRecord` / `stopFollowReadRecord` / `requestFollowReadScore` 签名不变。
- 业务接入：`pages/pinyin/index.vue`、`pages/literacy/lesson.vue`、会员配额门禁不变。
- 解码链：`decodeRecordingToMono`、16kHz 单声道、去静音思路可复用或微调。

---

## 二、预提取流程（示范音 · 必须先做）

### 2.1 输入与输出

| 项目 | 说明 |
|------|------|
| **输入** | `static/pinyin/*.opus`（及后续新增示范音） |
| **输出** | `data/pinyin-mfcc-fingerprints.json` |
| **环境** | 开发机 Node.js + **ffmpeg** + **meyda**（`npm i -D meyda`） |

### 2.2 处理流水线

```text
1. 扫描 static/pinyin/*.opus → stem（如 ma1、shi2）
2. ffmpeg 解码 → 16kHz mono s16le PCM
3. 可选：与运行时相同的 trimSilence（阈值写死在共享常量）
4. 滑窗分帧：
   - sampleRate = 16000
   - frameSize = 512（32ms）
   - hopSize   = 160（10ms）
5. 每帧 Meyda.extract('mfcc', frame) → 13 维（维数可配置，默认 13）
6. 可选：CMVN（按 utterance）或 Δ/ΔΔ（二期）
7. 写入 JSON：frames[][]、durationMs、voicedRatio、算法版本号
8. CI/发布前：pnpm/npm run pinyin:mfcc-fingerprints 校验成功数
```

### 2.3 预提取 JSON 结构（草案）

```json
{
  "_meta": {
    "version": 2,
    "sampleRate": 16000,
    "frameSize": 512,
    "hopSize": 160,
    "mfccCoeffs": 13,
    "extractor": "meyda@x.y.z"
  },
  "ma1": {
    "durationMs": 420,
    "voicedRatio": 0.72,
    "frames": [
      [-12.1, 8.3, ...],
      ...
    ]
  }
}
```

### 2.4 与「用户录音」的关系

| | 示范音（参考） | 用户录音 |
|--|----------------|----------|
| **何时提取** | 构建时 / 发版前 **一次性** | 每次跟读 **实时** |
| **存储** | 打进包或随资源下发 JSON | 不持久化（仅 temp 文件 → 内存特征） |
| **算法** | 与运行时 **同一模块** `pinyin-mfcc-extract.js` | 同左 |
| **比对** | 作为 DTW 的 **参考序列** | 作为 DTW 的 **待测序列** |

> **禁止**：Node 用 Meyda 提参考、小程序用另一套自写 MFCC（会导致分数漂移）。

---

## 三、时间步骤（开发排期）

建议总工期 **约 2～3 周**（1 人为主力，含真机调参）。按阶段推进，**先预提取与离线对齐，再接运行时**。

### 阶段 0：方案冻结（0.5 天）

| 序号 | 任务 | 产出 |
|------|------|------|
| 0.1 | 固定 MFCC 参数表（sr / frame / hop / 维数 / 是否 CMVN） | `constants/pinyin-mfcc-config.js` |
| 0.2 | 确定 JSON v2 字段与 `_meta.version` | 本文档 §2.3 |
| 0.3 | 确定及格阈值策略（DTW 距离 → matchScore → pass） | 设计说明 §五 |
| 0.4 | 评估 Meyda 包体（微信主包/分包体积预算） | 评估结论 |

### 阶段 1：共享提取模块 + 离线构建（3～4 天）

| 序号 | 任务 | 产出 |
|------|------|------|
| 1.1 | 新增 `utils/pinyin-mfcc-extract.js`（滑窗 + Meyda，**无 uni 依赖**） | 可被 Node 与端上 import |
| 1.2 | 新增 `scripts/build-pinyin-mfcc-fingerprints.mjs` | 复用 extract，写 JSON |
| 1.3 | `package.json` 增加 `pinyin:mfcc-fingerprints`、devDependency `meyda` | 脚本可跑 |
| 1.4 | 全量跑通 `static/pinyin`，生成 `pinyin-mfcc-fingerprints.json` | 数据文件入库 |
| 1.5 | 抽样：同一 opus 用「构建脚本」与「运行时模块」各提一次，帧矩阵 diff < ε | 对齐报告 |

**里程碑 M1**：参考指纹 JSON 齐全，且离线/在线提取一致。

### 阶段 2：DTW 比对与评分映射（2～3 天）

| 序号 | 任务 | 产出 |
|------|------|------|
| 2.1 | 新增 `utils/pinyin-mfcc-compare.js`（序列 DTW，支持变长） | `matchScore` 0～1 |
| 2.2 | 扩展 `utils/pinyin-follow-read-score.js` 或新建 `pinyin-mfcc-score.js` | 分数 0～99、文案 |
| 2.3 | 保留/迁移 `voicedRatio`、最短时长、`FOLLOW_READ_MIN_*` 门控 | 与 v1 行为可比 |
| 2.4 | 用 20～50 条标注录音（对/错/杂音）标定 `PASS_THRESHOLD` | 阈值写入 config |

**里程碑 M2**：给定 ref + user 帧序列，本地 CLI 可输出稳定分数。

### 阶段 3：接入运行时服务（2～3 天）

| 序号 | 任务 | 产出 |
|------|------|------|
| 3.1 | `getReferenceFingerprint` → `getReferenceMfccSequence`（读 v2 JSON，内存缓存） | `pinyin-follow-read-audio-decode.js` 或新文件 |
| 3.2 | `requestFollowReadScore` 切到 MFCC+DTW 路径（feature flag） | `pinyin-follow-read-service.js` |
| 3.3 | `config/pinyin-follow-read-config.js`：`USE_MFCC_SCORING = true/false` | 可回滚 v1 |
| 3.4 | H5 / App 真机：录音 → 评分端到端 | 测试通过 |
| 3.5 | 微信小程序：分包体积、评分耗时（目标 < 800ms/次） | 测试通过 |

**里程碑 M3**：拼音页、课次页跟读评分走 v2，可开关回退 v1。

### 阶段 4：清理与文档（1～2 天）

| 序号 | 任务 | 产出 |
|------|------|------|
| 4.1 | 默认开启 v2；v1 指纹与 compare 标记 `@deprecated` 保留 1 个版本 | 代码注释 |
| 4.2 | 更新 `docs/会员与变现设计.md` 或本计划状态为「已落地」 | 文档 |
| 4.3 | README：`pinyin:mfcc-fingerprints` 说明、发版前必跑 | 运维说明 |
| 4.4 | 勋章/成就 `recordPinyinFollowPass` 无需改（仍调同一 service） | — |

**里程碑 M4**：v2 默认上线，发版 checklist 含预提取步骤。

### 阶段 5（可选 · 二期）：体验与精度

| 序号 | 任务 | 说明 |
|------|------|------|
| 5.1 | ΔMFCC / ΔΔ | 提升辨音 |
| 5.2 | CMVN 按句归一化 | 抗音量差 |
| 5.3 | 构建脚本增量更新（仅新 opus） | 加速 CI |
| 5.4 | 调试页展示 envSim / DTW 距离 / 帧数 | 家长/运营排查 |

---

## 四、文件改动清单（预估）

| 操作 | 路径 |
|------|------|
| **新增** | `constants/pinyin-mfcc-config.js` |
| **新增** | `utils/pinyin-mfcc-extract.js` |
| **新增** | `utils/pinyin-mfcc-compare.js` |
| **新增** | `scripts/build-pinyin-mfcc-fingerprints.mjs` |
| **新增** | `data/pinyin-mfcc-fingerprints.json`（生成物） |
| **新增** | `config/pinyin-follow-read-config.js` |
| **修改** | `services/pinyin-follow-read-service.js` |
| **修改** | `utils/pinyin-follow-read-audio-decode.js`（读 v2 参考） |
| **修改** | `package.json`（meyda、脚本） |
| **暂留** | `utils/pinyin-follow-read-audio-features.js`（v1 回退） |
| **暂留** | `data/pinyin-audio-fingerprints.json`（v1 回退） |

---

## 五、评分公式（草案）

```text
userPcm → extractMfccFrames → userFrames
symbol  → loadRefMfccFrames  → refFrames

gate: durationMs、voicedRatio（不足 → no_speech）

dtwDist = DTW(refFrames, userFrames)   // 归一化到 [0,1]
matchScore = 1 - f(dtwDist)            // 单调递减映射

pass = matchScore >= PASS_THRESHOLD    // 初值建议 0.48～0.55，需标定

score = buildFollowReadScoreFromAudio({ matchScore, ... })  // 沿用 0～99 映射
```

---

## 六、风险与对策

| 风险 | 对策 |
|------|------|
| 微信小程序包体增大 | Meyda 按需引入 extractor；或参考指纹仅 JSON、运行时只打包 extract 子集 |
| 构建与运行时 MFCC 不一致 | 共用 `pinyin-mfcc-extract.js`；阶段 1.5 自动 diff |
| 新拼音未跑构建 → ref 缺失 | `getReferenceMfcc` 失败时明确 `ref_error`；CI 校验 JSON 覆盖 stem |
| 分数分布与 v1 不同 | feature flag 并行一周；重新标定阈值与文案 |
| Meyda 在部分端无 `AudioContext` | 用户录音仍依赖现有 decode；仅特征层换 MFCC |

---

## 七、验收标准

1. **预提取**：`npm run pinyin:mfcc-fingerprints` 对现有 opus **成功率 ≥ 99%**，JSON 含 `_meta.version: 2`。  
2. **一致性**：同一 PCM 文件，Node 构建与端上 extract 的帧矩阵 **L2 差 < 1e-4**（或约定容差）。  
3. **功能**：拼音页跟读通过/不通过与人工听感 **基本一致**（抽样 30 音节）。  
4. **性能**：微信小程序单次评分 **P95 < 1s**（不含录音）。  
5. **回滚**：`USE_MFCC_SCORING = false` 可恢复 v1 行为。  

---

## 八、发版 Checklist（含预提取）

- [x] 新增/更新 `static/pinyin` 后执行 `npm run pinyin:mfcc-fingerprints`  
- [x] 提交 `data/pinyin-mfcc-fingerprints.json`（1420 条，约 5.6MB）  
- [x] 确认 `_meta.extractor` 与 lockfile 中 meyda 版本一致  
- [ ] 真机抽测 10 个音节（含 ü、复韵母、整体认读）  
- [x] 确认 feature flag 默认值与发布说明（默认 v2）  

---

## 九、修订记录

| 日期 | 说明 |
|------|------|
| 2026-05-19 | 初版：Meyda+MFCC+DTW 重构时间步骤与预提取流程 |
| 2026-05-19 | 落地：代码接入 + `npm run pinyin:mfcc-fingerprints` 全量 1420 条；构建依赖 `ffmpeg-static` |
