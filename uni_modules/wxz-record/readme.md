# wxz-record

支持PCM录音实时帧回调的UTS插件

## 功能特性

- ✅ 支持PCM格式录音
- ✅ 实时帧回调，可获取录音过程中的PCM数据
- ✅ **实时分贝计算**，每次回调同时返回当前分贝值
- ✅ 支持自定义采样率、声道数、位深
- ✅ 支持Android、iOS、HarmonyOS平台

## 使用方法

### 引入插件

```typescript
import { startRecord, stopRecord, StartRecordOptions, StopRecordOptions } from '@/uni_modules/wxz-record'
```

### 开始录音

```typescript
startRecord({
  config: {
    sampleRate: 16000,      // 采样率，默认16000
    channels: 1,            // 声道数，1=单声道，2=立体声，默认1
    bitsPerSample: 16,       // 位深，8/16/24/32，默认16
    frameSize: 4096         // 帧大小（字节），每次回调的PCM数据大小，默认4096
  },
  onFrame: (data: ArrayBuffer, decibel: number) => {
    // 实时接收PCM数据帧和分贝值
    console.log('收到PCM数据，大小:', data.byteLength, '分贝:', decibel);
    // 处理PCM数据...
    // decibel 范围通常在 -60 到 0 之间
    // -10 dB 以上：非常大声
    // -20 到 -10 dB：大声
    // -30 到 -20 dB：正常
    // -40 到 -30 dB：安静
    // -40 dB 以下：非常安静
    // -Infinity：无声音
  },
  success: (res) => {
    console.log('录音开始成功', res);
  },
  fail: (err) => {
    console.error('录音开始失败', err);
  }
});
```

### 停止录音

```typescript
stopRecord({
  success: (res) => {
    console.log('录音停止成功', res);
    console.log('录音时长:', res.duration, 'ms');
  },
  fail: (err) => {
    console.error('录音停止失败', err);
  }
});
```

## 配置说明

### 录音配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| sampleRate | number | 16000 | 采样率（Hz），常见值：8000, 16000, 44100, 48000 |
| channels | number | 1 | 声道数，1=单声道，2=立体声 |
| bitsPerSample | number | 16 | 位深，支持8/16/24/32 |
| frameSize | number | 4096 | 每次回调的PCM数据大小（字节） |

### 错误码

| 错误码 | 说明 |
|--------|------|
| 9010001 | 录音权限被拒绝 |
| 9010002 | 录音初始化失败 |
| 9010003 | 录音启动失败 |
| 9010004 | 录音停止失败 |
| 9010005 | 录音过程中发生错误 |
| 9010006 | 参数错误 |

## 权限配置

### Android

插件已自动配置 `RECORD_AUDIO` 权限，需要在应用manifest中声明。

### iOS

插件已自动配置 `NSMicrophoneUsageDescription`，需要在Info.plist中配置权限说明。

### HarmonyOS

插件已自动配置 `ohos.permission.MICROPHONE` 权限。

## 实时分贝功能

插件会在每次 `onFrame` 回调时自动计算并返回当前音频帧的实时分贝值。

### 分贝值说明

- **分贝范围**：通常在 -60 到 0 dB 之间
- **-10 dB 以上**：非常大声（红色显示）
- **-20 到 -10 dB**：大声（橙色显示）
- **-30 到 -20 dB**：正常音量（黄色显示）
- **-40 到 -30 dB**：安静（绿色显示）
- **-40 dB 以下**：非常安静（青色显示）
- **-Infinity**：无声音（灰色显示）

### 分贝计算公式

```
RMS = sqrt(sum(sample²) / sampleCount)
dB = 20 * log10(RMS)
```

## 完整示例

以下是一个完整的录音示例，包含实时分贝显示：

```vue
<template>
  <view>
    <view class="status-info">
      <text>录音状态: {{ isRecording ? "录音中" : "未录音" }}</text>
      <text v-if="duration > 0">录音时长: {{ formatDuration(duration) }}</text>
    </view>

    <!-- 实时分贝显示 -->
    <view class="decibel-section" v-if="isRecording">
      <text class="section-title">实时分贝</text>
      <view class="decibel-display">
        <text class="decibel-value" :class="getDecibelClass(currentDecibel)">
          {{ formatDecibel(currentDecibel) }}
        </text>
        <text class="decibel-label">当前分贝</text>
      </view>
      <view class="decibel-info">
        <text>最大分贝: {{ formatDecibel(maxDecibel) }}</text>
        <text>最小分贝: {{ formatDecibel(minDecibel) }}</text>
      </view>
    </view>

    <view class="config-section">
      <text class="section-title">录音配置</text>
      <view class="config-item">
        <text>采样率:</text>
        <input v-model.number="config.sampleRate" type="number" placeholder="16000" />
      </view>
      <view class="config-item">
        <text>声道数:</text>
        <input v-model.number="config.channels" type="number" placeholder="1" />
      </view>
      <view class="config-item">
        <text>位深:</text>
        <input v-model.number="config.bitsPerSample" type="number" placeholder="16" />
      </view>
      <view class="config-item">
        <text>帧大小:</text>
        <input v-model.number="config.frameSize" type="number" placeholder="640" />
      </view>
    </view>

    <view class="button-group">
      <button @tap="startRecording" :disabled="isRecording" type="primary">
        开始录音
      </button>
      <button @tap="stopRecording" :disabled="!isRecording" type="warn">
        停止录音
      </button>
    </view>

    <view class="data-info">
      <text class="section-title">数据统计</text>
      <text>接收帧数: {{ frameCount }}</text>
      <text>总数据量: {{ formatBytes(totalBytes) }}</text>
      <text>最后一帧大小: {{ lastFrameSize }} 字节</text>
    </view>
  </view>
</template>

<script>
// #ifdef APP
import { startRecord, stopRecord } from "@/uni_modules/wxz-record";
// #endif

export default {
  data() {
    return {
      title: "PCM录音测试",
      isRecording: false,
      duration: 0,
      frameCount: 0,
      totalBytes: 0,
      lastFrameSize: 0,
      config: {
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        frameSize: 640,
      },
      startTime: 0,
      timer: null,
      currentDecibel: -Infinity,
      maxDecibel: -Infinity,
      minDecibel: Infinity,
    };
  },

  onUnload() {
    if (this.isRecording) {
      this.stopRecording();
    }
    if (this.timer) {
      clearInterval(this.timer);
    }
  },

  methods: {
    formatDuration(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    },

    formatBytes(bytes) {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    },

    formatDecibel(decibel) {
      if (decibel === -Infinity || decibel === Infinity || isNaN(decibel)) {
        return "-∞ dB";
      }
      return decibel.toFixed(1) + " dB";
    },

    getDecibelClass(decibel) {
      if (decibel === -Infinity || decibel === Infinity || isNaN(decibel)) {
        return "decibel-silent";
      }
      if (decibel >= -10) {
        return "decibel-very-loud";
      } else if (decibel >= -20) {
        return "decibel-loud";
      } else if (decibel >= -30) {
        return "decibel-normal";
      } else if (decibel >= -40) {
        return "decibel-quiet";
      } else {
        return "decibel-very-quiet";
      }
    },

    startRecording() {
      // #ifdef APP
      this.frameCount = 0;
      this.totalBytes = 0;
      this.lastFrameSize = 0;
      this.currentDecibel = -Infinity;
      this.maxDecibel = -Infinity;
      this.minDecibel = Infinity;

      startRecord({
        config: this.config,
        onFrame: (data, decibel) => {
          // 实时接收PCM数据帧和分贝值
          const frameSize = data.byteLength;
          this.frameCount++;
          this.totalBytes += frameSize;
          this.lastFrameSize = frameSize;

          // 更新分贝值
          if (decibel !== -Infinity && decibel !== Infinity && !isNaN(decibel)) {
            this.currentDecibel = decibel;
            if (decibel > this.maxDecibel) {
              this.maxDecibel = decibel;
            }
            if (decibel < this.minDecibel) {
              this.minDecibel = decibel;
            }
          }
        },
        success: (res) => {
          console.log('录音开始成功', res);
          this.isRecording = true;
          this.startTime = Date.now();

          // 启动定时器更新时长
          this.timer = setInterval(() => {
            if (this.isRecording) {
              this.duration = Date.now() - this.startTime;
            }
          }, 100);
        },
        fail: (err) => {
          console.error('录音开始失败', err);
        },
      });
      // #endif
    },

    stopRecording() {
      // #ifdef APP
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }

      stopRecord({
        success: (res) => {
          console.log('录音停止成功', res);
          this.isRecording = false;
          this.duration = res.duration;
        },
        fail: (err) => {
          console.error('录音停止失败', err);
          this.isRecording = false;
        },
      });
      // #endif
    },
  },
};
</script>

<style>
.status-info {
  background-color: #f5f5f5;
  padding: 20rpx;
  border-radius: 10rpx;
  margin-bottom: 20rpx;
}

.decibel-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30rpx;
  border-radius: 10rpx;
  margin-bottom: 20rpx;
}

.decibel-value {
  font-size: 72rpx;
  font-weight: bold;
  color: #fff;
}

.decibel-very-loud { color: #ff0000 !important; }
.decibel-loud { color: #ff6600 !important; }
.decibel-normal { color: #ffcc00 !important; }
.decibel-quiet { color: #66cc00 !important; }
.decibel-very-quiet { color: #00ccff !important; }
.decibel-silent { color: #999999 !important; }
</style>
```

## 开发文档

[UTS 语法](https://uniapp.dcloud.net.cn/tutorial/syntax-uts.html)
[UTS API插件](https://uniapp.dcloud.net.cn/plugin/uts-plugin.html)
[UTS uni-app兼容模式组件](https://uniapp.dcloud.net.cn/plugin/uts-component.html)
[UTS 标准模式组件](https://doc.dcloud.net.cn/uni-app-x/plugin/uts-vue-component.html)
[Hello UTS](https://gitcode.net/dcloud/hello-uts)