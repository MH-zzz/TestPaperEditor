# 云知声口语评测 WebSocket 接入说明

更新时间：2026-03-03  
适用范围：本项目口语题型（中文评测）接入与后续维护

## 1. 文档目的

1. 说明该接口“是什么、何时用”。
2. 给出可直接落地的调用流程与最小示例。
3. 提供后续扩展时的检查清单与待完善项，便于查询。

## 2. 官方资料

1. WebSocket 文档：https://ai.unisound.com/doc/sacalleval/WebSocket.html
2. 错误码查询（文档内跳转）：https://gitee.com/

## 3. 这个接口是什么

云知声口语评测 WebSocket 接口用于将用户朗读音频上传到评测服务，并返回结构化评分结果。  
典型输出包括：总分、完整度、标准度、流利度，以及逐词/音素维度结果，可用于教学反馈和考试评分。

## 4. 快速查询索引

| 想查什么 | 看哪一节 |
| --- | --- |
| 接口地址与协议 | 5. 接入要求与地址 |
| 一次调用的完整顺序 | 6. 调用流程 |
| 请求字段怎么填 | 7. 请求消息（中文评测） |
| 返回结果有哪些字段 | 8. 响应消息 |
| 录音回放 URL 怎么拼 | 9. 录音回放地址拼接 |
| 报错如何排查 | 10. 错误处理建议 |
| 代码怎么快速跑通 | 11. 最小 Node.js 示例 |
| 后续还要补什么 | 12. 待完善清单 |

## 5. 接入要求与地址

### 5.1 通用要求

1. 协议：`ws` 或 `wss`（建议 `wss`）。
2. 字符编码：UTF-8。
3. 响应格式：JSON。
4. 音频属性：16k 采样率、16bit、单声道。
5. 音频格式：文档要求中出现 `mp3`、`wxspeex`、`pcm`；字段说明里常见 `mp3`、`speex`。建议优先 `mp3`，上线前以联调结果为准。

### 5.2 地址

1. 中文：
   1. `ws://wscn-edu.hivoice.cn:18081/ws/eval/`
   2. `wss://wsscn-edu.hivoice.cn/ws/eval/`
2. 英文：
   1. `ws://ws-edu.hivoice.cn:8081/ws/eval/`
   2. `wss://wss-edu.hivoice.cn:443/ws/eval/`

## 6. 调用流程

1. 建立 WebSocket 连接。
2. 发送“评测配置 JSON”（文本帧）。
3. 发送音频数据（二进制帧，可分片）。
4. 音频发送完成后，发送 `eof` 字符串（文本帧）。
5. 接收服务端 JSON 响应，判断 `errcode`。
6. 成功则解析 `result`；失败则按 `errcode/errmsg` 排查。

## 7. 请求消息（中文评测）

### 7.1 最小请求示例

```json
{
  "EvalType": "sentence",
  "Language": "cn",
  "displayText": "你好",
  "appkey": "AppKey@AppSecret",
  "scoreCoefficient": "1",
  "userID": "u1001",
  "audioFormat": "mp3",
  "eof": "eof-uuid-xxx"
}
```

### 7.2 字段说明

1. `EvalType`：必填，`word | sentence | paragraph`。
2. `Language`：必填，中文固定 `cn`。
3. `displayText`：必填，标准朗读文本。
4. `appkey`：必填，格式 `AppKey@AppSecret`。
5. `audioFormat`：必填，建议 `mp3`。
6. `eof`：必填，结束标记，必须全局唯一（建议 UUID）。
7. `scoreCoefficient`：可选，范围 `0.6~1.9`，值越大越宽松。
8. `userID`：可选，建议传，便于问题追踪。

备注：文档声明“关键字不区分大小写”，但工程实现中建议统一使用固定大小写，避免歧义。

## 8. 响应消息

### 8.1 响应结构

```json
{
  "result": {},
  "area": "sh",
  "time": "1551409712576231666",
  "sid": "f4376e83-7ad0-4635-9812-bec949a2fa27",
  "errcode": 0,
  "errmsg": "ok"
}
```

### 8.2 关键字段

1. `errcode`：`0` 表示成功，非 `0` 表示失败。
2. `errmsg`：错误描述。
3. `result`：评测明细（包含完整度、标准度、流利度、词级结果等）。
4. `sid/time/area`：可用于拼接录音回放地址。

## 9. 录音回放地址拼接

可用响应中的 `sid`、`time`、`area` 拼接回放地址：

1. HTTP：`http://edu.hivoice.cn:9088/WebAudio-1.0-SNAPSHOT/audio/play/{sid}/{time}/{area}`
2. HTTPS：`https://edu.hivoice.cn/WebAudio-1.0-SNAPSHOT/audio/play/{sid}/{time}/{area}`

## 10. 错误处理建议

1. 首层判断：`errcode !== 0` 直接按失败处理，不进入业务评分流程。
2. 记录诊断信息：请求参数（脱敏后）、`sid`、`errcode`、`errmsg`、耗时。
3. 音频问题优先排查：采样率、声道、比特率、时长、静音段、空音频。
4. `eof` 必须唯一，避免并发请求串话。
5. 与官方错误码表建立本地映射，形成“可读提示 + 排查动作”。

## 11. 最小 Node.js 示例

```js
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';

const WS_URL = 'wss://wsscn-edu.hivoice.cn/ws/eval/';
const APPKEY = 'YourAppKey@YourAppSecret';
const EOF_FLAG = `eof-${randomUUID()}`;

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  ws.send(JSON.stringify({
    EvalType: 'sentence',
    Language: 'cn',
    displayText: '你好，很高兴见到你',
    appkey: APPKEY,
    audioFormat: 'mp3',
    scoreCoefficient: '1',
    userID: 'demo-user-1',
    eof: EOF_FLAG
  }));

  const audio = fs.readFileSync('./demo.mp3');
  ws.send(audio);
  ws.send(EOF_FLAG);
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.errcode !== 0) {
    console.error('评测失败', msg.errcode, msg.errmsg);
    return;
  }
  console.log('评测成功', msg.result);
});

ws.on('error', (err) => {
  console.error('WebSocket 异常', err);
});
```

## 12. 待完善清单

1. 增补本项目真实错误码映射表（按 `errcode -> 文案 -> 排查`）。
2. 增补“前端录音格式转换”说明（`wav/pcm -> mp3`）。
3. 增补“分片发送策略”与最大音频时长建议。
4. 补齐 TypeScript 类型定义（请求体、响应体、result 子结构）。
5. 增补联调脚本与回归测试用例。
6. 明确 `speex/wxspeex` 字段差异的最终平台口径。

## 13. 联调 Checklist

- [ ] 已使用 `wss` 地址。
- [ ] `appkey` 已按 `AppKey@AppSecret` 配置。
- [ ] 音频为 16k/16bit/单声道。
- [ ] 已先发配置 JSON，再发音频，再发 `eof`。
- [ ] `eof` 在每次请求中唯一。
- [ ] 已记录 `sid/time/area` 便于复盘与回放。
- [ ] 错误码可在日志中快速检索。

## 14. 变更记录

1. 2026-03-03：初版整理，覆盖中文评测主链路、最小示例、排查建议与待完善项。

