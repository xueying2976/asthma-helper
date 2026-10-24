# AeriDay iOS 静态包

## 当前交付：v7
参阅 [v7 原生集成指南](./V7.zh-CN.md)，包含增量医生摘要协议、完整源码/离线包、测试和本地 iOS 限制。保留最终 v6 洞察及全部原生流程。医生摘要 PDF 分享通过两个原生端点提供；旧的通用导出占位入口仍不可用。

直接复用现有 `AeriDayApp`（网页默认的 **B** 版式）和 `src/styles.css`，未改动界面。网页原型 `/` 不受影响。

## 构建
```
bun install
bun run build:mobile     # = vite build --config ./mobile/vite.config.ts
```
输出：`dist-mobile/`（`index.html` + `assets/*.js|css|woff2` + `licenses/NotoSansSC-OFL.txt`，相对路径，无需服务器、不联网）。以文件夹引用加入 Xcode，用 `WKWebView.loadFileURL(_:allowingReadAccessTo:)` 加载 `index.html`。

## 运行模式
- **浏览器：** 没有 `aeriBridge` → 原有合成示例，标记"示例数据"，与网页工作台一致。
- **原生 v6：** 必须成功调用 `getSnapshot`；失败显示重试，绝不回退示例。五个原生页面复用 v5 的卡片、行、弹窗、字体及配色。洞察及结构化记录单独读取 `getInsights`；趋势展示 `getMetricSeries` 的每日历史。顶部按 `snapshot.isDemo` 显示 Demo data 或 Personal data；同步时间仍为静态文字。
- **未连接的服务**（空气/花粉/天气、问 AI、导出）显示"尚未连接 / 暂不可用"，不显示示例值。原生今日、药物和更多页已移除行动计划及紧急建议入口；浏览器示例和医生原文不变。
- **写入：** 成功和失败后都重新读取快照。药物已保存但提醒失败时，提示"药物已保存，提醒未更新。请查看当前状态。" 刷新失败另行提示，不宣称已刷新。提示 12 秒后消失。新药物部分保存后重试复用返回的 id，避免重复创建；保存药物和设置提醒仍是两个非原子操作。
- **语言（v5）：** 原生 iPhone 试用始终显示英文，即使设备或快照偏好为中文。隐藏顶部语言按钮和更多页语言入口。启动及试用控件不调用 `setLanguage`；Swift 的普通偏好、UI 测试偏好及 v1 协议不变。网页工作台继续支持中英双语。**外观和字号：** 原生模式只在本次运行保留；WebKit 非持久存储可能在终止后重置，不承诺跨启动保留。

## 协议（v1）
JS → 原生：`aeriBridge.postMessage(request)`
```ts
{ v: 1, id: string, method: BridgeMethod, params: object }
```
原生 → JS：`webView.evaluateJavaScript("window.__aeriBridgeReceive(\(json))")`
```ts
{ v: 1, id: string, ok: true, result: object }
{ v: 1, id: string, ok: false, error: { code: string, message: string } }
```
超时 15 秒 → `BridgeError("timeout")`。未列入白名单的方法在 JS 侧直接拒绝，原生侧也应拒绝。

| 方法 | 参数 | 返回 |
|---|---|---|
| getSnapshot | `{}` | `{ isDemo: boolean, generatedAt, healthAuthorized, metrics, notes, medications, language? }` |
| requestHealthAuthorization | `{}` | `{ authorized }`（仅现有类型） |
| saveNote | `{ id?, date, note }` | `{ id }` |
| deleteNote | `{ id }` | `{ ok: true }` |
| saveMedication | `{ id?, name, unit?, remainingDoses?, confirmed?, reminderEnabled?: boolean, reminderHour?, reminderMinute? }` | `{ id }`（省略 id = 新建）|
| deleteMedication | `{ id }` | `{ ok: true }` |
| setReminder | `{ id, time "HH:mm", enabled, kind: "dose"\|"checkin"\|"refill" }` | `{ ok: true }` |
| deleteAll | `{ confirm: true }` | `{ ok: true }` |
| setLanguage | `{ lang: "en"\|"zh" }` | `{ ok: true }` |

`NativeMetric = { source?: string, sampledAt?: ISO8601, unit?: string, semantics?: "latestSample", id, current: number|null, band?: [下限, 上限], status: "within"|"different"|"insufficient"|"changed", points: 30 天数值（旧→新，缺失为 null）, freshness: "HH:mm"|"missing"|"stale"|"changed" }`。来源、采样时间、单位按原生提供的内容显示，不从同步时间推断；缺失时明确标出。范围如有提供则来自现有 Swift，无范围时不声称高于、低于或处于平时范围。前端不计算新基线。`latestSample` 下睡眠为最近一段睡眠、步数为最近一条采样，不是整夜或全天总量；原生单位优先。图表只使用原生提供的按日期排列数值，不聚合或虚构采样。

指标 id：rr、rhr、hrv、sleep（小时）、interruptions、spo2、temperature、steps、activity、workout、symptoms、waking、reliever、controller、pef、aqi、pm25、pollen、outdoorTemp、humidity。类型定义见 `src/lib/aeriday/nativeBridge.ts`。

`NativeNote = { id, date (ISO), note（自由文本）, metricId?, value? }`
`NativeMedication = { id, name, unit?: "puff"|"tablet"|"capsule"|"item", remainingDoses?, confirmed?, reminderEnabled?: boolean, reminderHour?, reminderMinute? }`

## 调用位置
| 方法 | 触发 |
|---|---|
| requestHealthAuthorization | 更多 → Apple 健康 → 连接 Apple 健康（仅用户点击） |
| getSnapshot | 启动、每次写入后、Apple 健康 → 刷新 |
| saveMedication / deleteMedication | 药物页库存添加、编辑、删除（需确认）；v6 移除旧的记录用了 1 次入口 |
| setReminder | 保存带时间的药物时开启；更多 → 用药提醒 中开/关 |
| saveNote / deleteNote | 记录页：自由文本添加、编辑、删除（需确认）；原生数值写入已禁用 |
| deleteAll | 更多 → 删除全部数据（需确认） |
| setLanguage | 协议保留；英文原生试用不调用 |

## v3 更改和验证
更改文件：`mobile/MobileRoot.tsx`、`mobile/main.tsx`、`mobile/mobile.css`；`src/lib/aeriday/nativeBridge.ts`、`nativeCopy.ts`、`scenarios.ts`，新增 `nativeOperations.ts` 和 `nativeOperations.test.mjs`；`src/components/aeriday/NativeScreens.tsx`、`TrendsExperience.tsx`、`state.tsx`；中英移动端说明、`AGENTS.md`、`roadmap.md`。共享视觉组件、网页入口、原有全局样式及医生示例原文不变。

- 提醒显式采用 `reminderEnabled`；字段未提供则显示“状态未提供”，不从时间推断。开/关具有 `aria-pressed` 和选中样式。关闭的药物仍在列表内；若 Swift 已清除时间，点开进入药物编辑重新输入。
- （v4 已替换）中文曾使用系统字体栈。HTML 声明 UTF-8，JS/CSS 使用 UTF-8；移动入口不下载字体、不依赖 Google Fonts，CSP 禁止网络连接。
- 原生记录页仅保存自由文本，移除可选数值附件；状态层和记录弹窗阻止数值写入。协议保留旧的可选读取字段以兼容，但不视为已支持的写入字段。
- 使用离线静态包和模拟桥接检查：中文启动不写入默认语言、提醒开关及重新输入时间、中英部分保存与刷新、文字记录保存后回读、来源/采样时间/单位及睡眠段文字。11 项测试通过。网页仍为明确标记的示例。

## v4 更改和验证
更改文件：`mobile/mobile.css`、`mobile/index.html`、`mobile/vite.config.ts`；新增 `mobile/fonts/noto-sans-sc/`（90 个 woff2 分片、`noto-sans-sc.css`、`OFL.txt`）；中英说明、`AGENTS.md`、`roadmap.md`。共享组件、网页入口、`src/styles.css`、字号和 v3 原生行为不变。

- **中文字体：** 内置 Noto Sans SC Variable 5.3.1（官方 Fontsource 包，SIL OFL 1.1），以本地 woff2 文件通过 `@font-face` 加载，字体名 `AeriDay CJK`。`unicode-range` 仅限中日韩和全角字符，英文、符号和表情仍用原系统字体。外壳、弹窗、按钮、输入框和图表文字都把它放在首位。不使用远程字体、不使用 `local()`、中文不依赖系统回退。`font-display: block` 避免短暂出现方框。界面用到的 513 个中文字符全部覆盖；自由文本记录覆盖常用简体中文。
- **CSP：** 新增 `font-src 'self'`；仍为 `connect-src 'none'`。
- **输入框：** 移动端输入框、文本框和下拉框至少 16px（大字号时更大），iOS 聚焦时不再放大，保存按钮不会被键盘遮住。标签和其他文字字号不变。
- **许可证：** 源码中为 `mobile/fonts/noto-sans-sc/OFL.txt`；离线包中为 `dist-mobile/licenses/NotoSansSC-OFL.txt`。
- **验证：** 构建离线包；在隐藏所有系统中文字体的 Chromium 中测试。对照行使用系统字体时显示方框；应用的今日、记录、添加记录弹窗和趋势（含图表文字）中文显示正常，示例与模拟原生模式均通过。输入框实测 16px。原有 11 项测试通过。

## 剩余限制
- 内置字体仍需在你的 Xcode WKWebView 中确认；Chromium 测试不能证明 WebKit 表现。外壳需允许读取整个包文件夹（含 `assets/*.woff2`）；如使用自定义 URL scheme，`.woff2` 应返回 `font/woff2`。WKWebView 加载、HealthKit 返回、原生存储和实际通知排程仍需在本地 Xcode 验证；浏览器测试不能证明这些结果。
- 外观和字号可能在终止后重置；本次试用的界面语言不读取或写入 Swift 语言偏好。
- 旧文字记录仍禁用数值附件。v6 专用结构化记录方法需由 Swift 配套实现；不支持时显示错误，不静默丢弃字段。
- 图表仅显示原生提供的按日期排列数值；可能有最新采样但无历史点。不新增全天/整夜聚合。
- 环境数据、问 AI、导出仍不可用；无新增权限、后端或分析服务。v6 解释及临床参考逻辑均由 Swift 在设备上实现，前端不计算；未增加低库存阈值，未发布。

## 交付
`aeriday-mobile-source-v6.zip` 包含完整干净网页/移动源码、配置、锁文件、回归测试、字体及许可证，不含 Git 元数据、依赖、构建产物或私有元数据。`aeriday-dist-mobile-v6.zip` 为 `dist-mobile/`。解压源码、安装依赖并构建；在现有 Xcode 外壳中替换整个静态文件夹。

## v5 英文试用无障碍检查
- 证据补充：导出的 XCTest 问题截图指向静态“Synced Oct 18 …”副标题，其 DOM 为普通 `p.t-meta`，不是按钮。该 `WebAccessibilityObjectWrapper` 触摸区域报告可能是 iOS 审计误报，不能据此确认交互控件尺寸不足。副标题保持静态且不变；最小触摸尺寸仅适用于交互控件，不扩大所有文字节点。独立确认的窄顶部按钮和真实控件区域修复保留；Chromium 检查不能证明这条 XCTest 报告已消除。
- 更改：`mobile/MobileRoot.tsx`、`mobile/mobile.css`，新增 `mobile/trialPreferences.ts` 和测试；`AeriDayApp.tsx`、`NativeScreens.tsx` 的可选原生试用标记；`kit.tsx` 的原生药物步进按钮名称；`src/styles.css` 的移动源码扫描；中英指南、`AGENTS.md`、`roadmap.md`。网页入口、双语字典、医生原文及桥接协议不变。
- 移动交互区域至少 44×44 CSS 像素，含外观/字号按钮、选项、指标控件和弹窗。图标尺寸不变。窄屏标签保留并换行，不隐藏；底部导航调整间距以容纳文字。原生药物步进按钮具有英文操作名称。输入框保持至少 16px，长输入值在框内滚动，不改动原有设计。
- 验证：13 项测试通过（原有 11 项，加原生英文和浏览器中文策略测试）；`bun run build:mobile` 输出 `dist-mobile/`。使用模拟原生桥接，在 Chromium 中检查已构建离线包的 320×844、390×844，标准字号/浅色与大字号/深色。检查五个页面、药物添加/编辑/删除确认、提醒时间输入、文字记录添加/编辑/删除确认、Apple 健康、未连接服务、提醒、隐私、删除全部确认、关于、指标详情、7/30 天、采样列表和说明弹窗的触摸尺寸、可访问名称和控件溢出。顶部和导航触摸区域未重叠。中文偏好启动仍显示英文且不写入语言；快照失败显示重试，不回退示例。药物/提醒及记录写入后在界面回读；提醒部分失败保留药物并准确提示。未发送数值记录字段，未观察到运行错误。
- 本次采用 Accessibility Review 检查流程；查看窄屏大字号今日/趋势及弹窗截图。长输入可在框内滚动，超出屏幕的页面内容可滚动。这不是完整 WCAG 认证，也不能代替 XCTest。真实 WKWebView/XCTest 触摸检查、VoiceOver、焦点/导航、iOS 键盘/聚焦缩放、HealthKit/存储/通知仍需本地 Xcode 和设备验证；浏览器检查使用模拟数据，非真实健康数据。没有新增服务、权限、分析、医疗建议或发布。

## v6 个人变化洞察 — 集成指南
本节替代 v3/v5 的纯事实范围说明。用户批准谨慎的哮喘相关解释，**不包括** 发作概率、疾病严重程度评分、处方或剂量建议。所有观察、解释、替代原因、限制、参考值及分析数值均由 Swift 在设备上提供；前端不计算临床评分或个人参考值。突出 Experimental 标签；未检测到变化不表示安全。今日和解释弹窗展示批准的英文严重呼吸困难安全句。网页工作台及医生示例原文不变；原生试用仍为英文。

### 兼容桥接扩展
保持 `{v:1,id,method,params}` 请求及 `{v:1,id,ok,result|error}` 响应。Swift 白名单需新增下列方法。`getInsights` 最长 **60 秒**，独立加载/错误/重试，不回退示例；其他新调用沿用 15 秒。Swift 必须返回所有必需字段，包括 null 和空数组；洞察/时间序列格式不符会明确报错。完整可执行类型定义见 `src/lib/aeriday/insights.ts`、`nativeBridge.ts`，以下字段与英文指南一致。

| 方法 | 参数 | 返回 |
|---|---|---|
| getInsights | `{}` | 下述 Insights |
| setAnalysisEnabled | `{enabled:boolean}` | `{ok:true}` |
| getMetricSeries | `{metricId,days:7|30|90}` | 下述 MetricSeries |
| saveSymptomCheckIn | 下述 SymptomCheckIn，id 可省略 | `{id}` |
| deleteSymptomCheckIn | `{id}` | `{ok:true}` |
| saveMedicationUse | 下述 MedicationUse，id 可省略 | `{id}` |
| deleteMedicationUse | `{id}` | `{ok:true}` |
| savePeakFlow | 下述 PeakFlow，id 可省略 | `{id}` |
| deletePeakFlow | `{id}` | `{ok:true}` |

```ts
// 时间戳需带 Z 或明确偏移；id 为原生 UUID 字符串。
type MetricId = 'rr'|'rhr'|'sleep'|'spo2'|'steps'|'workout';
type Answer = 'unknown'|'no'|'yes';
type Severity = 'unknown'|'none'|'mild'|'moderate'|'severe';
type SymptomCheckIn = {
  id?:string; date:string; cough:Severity; wheeze:Severity;
  chestTightness:Severity; breathlessness:Severity;
  respiratoryNightWaking:Answer; activityLimitation:Answer; context:string;
};
type MedicationUse = {
  id?:string; date:string; medicationID?:string; medicationName:string;
  purpose:'unknown'|'maintenance'|'relief'; regimen:'unknown'|'saba'|'air'|'mart'|'other';
  amount:number; unit:'puff'|'tablet'|'capsule'|'item'; preExercise:Answer;
};
type PeakFlow = {
  id?:string; date:string; value:number; unit:'L/min'; device:string;
  personalBest?:number; personalBestConfirmedByClinician:boolean;
};
type MetricSeries = {
  metricId:MetricId; unit:string; sourceId:string|null;
  points:{date:string;value:number|null;quality:string}[]; baseline:number|null;
};
type Finding = {
  id:string; metricId:MetricId;
  state:'insufficientData'|'noSustainedChangeDetected'|'singleDayChange'|
    'sustainedPersonalDeviation'|'reportedRespiratoryChange'|'baselineReviewNeeded'|
    'contextOnly'|'indeterminate';
  title:string; observation:string; interpretation:string; alternatives:string; limitations:string;
  baseline:number|null; current:number|null; delta:number|null; unit:string;
  referenceValidDays:number; recentValidDays:number; durationDays:number;
  evidenceIds:string[]; sourceId:string|null;
};
type Insights = {
  schemaVersion:1; generatedAt:string; isDemo:boolean; enabled:boolean; experimental:true;
  historyState:string; ruleVersion:string; findings:Finding[]; series:MetricSeries[];
  records:{
    symptomCheckIns:(SymptomCheckIn & {id:string;updatedAt:string})[];
    medicationUseEvents:(MedicationUse & {id:string;updatedAt:string})[];
    peakFlowEntries:(PeakFlow & {id:string;updatedAt:string})[];
  };
  context:{reportedRespiratoryChange:boolean;summary:string};
  evidence:{id:string;title:string;url:string;limitations:string}[]; summary:string;
};
```

`respiratoryNightWaking` 与活动受限均采用 unknown/no/yes；unknown 不等同于 none/no。实际用量和 PEF 为有限正数，这是输入有效性检查，不是治疗阈值。实际使用记录不调用库存写入；移除旧的模糊库存扣减入口，库存校正与提醒保留于药物编辑。仅当用户记录了医生确认的个人最佳值时显示 PEF 百分比，无区域分级；旧文字记录仍不附加数值。

### 页面及回读
- 今日：最多三张原生提供的变化卡，来源/参考及近期覆盖、明确日期、呼吸记录和静态安全句。
- 趋势：全部变化及 7/30/90 天每日序列；null 保留为断点，可展开查看日期、质量及数值。缺失日期应由 Swift 提供 null 行；界面不重采样、不补造个人数据。baseline 标记为个人历史参考（中位数），不是健康正常范围；保留来源/质量变化及参考缺失状态。
- 解释：观察事实、个人比较、可能含义与替代原因、限制；保留证据 id 和规则版本。离线证据文字及完整 URL 可见，复制必须由用户点击；剪贴板失败仍显示完整地址，不自动跳转或请求网络。
- 记录：症状/实际用药/PEF 添加、编辑、确认删除，保留旧文字记录及变化；药物页区分实际使用与库存；更多页分析开关回读、参考状态和证据。
- v6 写入成功或失败均经 `writeAndRefresh` 回读快照及洞察；任一回读失败单独说明。已返回的记录 id 在重试时保留。若超时/错误未返回 id，仍可能已提交：先查看刷新后的列表再重试，避免重复；两个存储的操作并非原子事务。
- 交互区域至少 44×44 CSS px，输入至少 16px；键盘缩放时外壳跟随 visualViewport.height，正文滚动而保存区固定。真实 WKWebView 键盘仍需本地验证。同步副标题保持静态；保留先前 XCTest 可能误报的说明。

### 已验证及限制
- `bun test` **19 项通过**：原有 v5 规则及实际用药不写库存、unknown/none 区分、医生确认最佳值百分比、60 秒超时、无效响应、实验性空历史等新增测试。
- `bun run build:mobile` 输出 `dist-mobile/`，含离线字体/许可证，无需服务器；图表打包产生非阻断的大 JS 文件提示。
- Chromium 已构建包：模拟桥接，390×844 标准/浅色和 320×844 大字/深色；五页、四层解释/证据、90 天图/断点、三类完整 CRUD 界面回读、unknown 默认、确认最佳值百分比、实际用药后库存仍为 120、药物提醒编辑、分析开关、部分已提交记录错误回读、空结果、错误重试、44px 及页面无横向溢出。已检查截图，无运行错误；原网页工作台及合成示例正常显示。
- 可复现：在 localhost:8090 提供 dist-mobile，网页开发服务 :8080，本地安装 Python Playwright 后运行 `python3 mobile/tests/check_v6.py`。截图写入 `/tmp/browser/aeriday-v6`，可用 AERIDAY_SCREENSHOTS 更改。syntheticBridge.js 仅测试使用，不由移动入口加载，不作为个人结果打包进离线应用。
- 新 Swift 方法、真实 HealthKit 历史/算法、证据有效性、记录持久化、通知、WKWebView/VoiceOver/XCTest 和键盘行为需本地验证；浏览器示例不是真实健康数据。既有 v5 原生通过结果由用户报告，不是本次重跑的 v6 原生证据。未启用云、账户、分析服务、新权限或发布。

### v6 来源/参考/上下文增补
- getInsights 必须含 `sourceOptions:{metricId,selectedSourceId:string|null,sources:string[]}[]`。更多页仅用返回的 ID 调用 `setPreferredSource({metricId,sourceId:string|null})->{ok:true}`；null 为自动。多个未选择来源保持不确定，不显示比较/图表、不静默合并；成功及部分已提交失败均回读快照/洞察后显示真实选中状态。Swift 也必须验证来源白名单与不确定策略。
- 所有 series（含 getMetricSeries）必须含 `reference:{median:number,mad:number,referenceStart:ISO,referenceEnd:ISO,validDays:number,frozenAt:ISO|null,ruleVersion:string}|null`；可选 `referenceBand:{lower:number,upper:number}|null`。前端只展示 Swift 提供的中位数和范围，不从 baseline 生成范围；标记实验性历史统计参考，不称健康/临床范围。保留旧 baseline 字段，但图表不拿它替代缺失的参考元数据。
- context 必须含 `reportedSymptomsPresent:boolean`、`changeAssessment:'notEstablished'`、current7/prior7，各为 `{reportingDays:number,expectedDays:7,perItemKnownCounts:Record<string,number>,loggedMedicationCounts:Record<string,number>}`。这些明确的驼峰字段名用于原简写覆盖需求；全部计数由原生提供，不推断。reportedRespiratoryChange 仍由 Swift 提供，未真正建立变化则保持 false。界面展示 context.summary 与报告覆盖，不因症状存在推断恶化。
- 这是实验性个人使用预览，展示事实变化及谨慎、有来源的教育上下文，不代表认可或临床验证。
- 增补验证：**22 项测试通过**；返回 ID/自动不确定/未知 ID 拒绝/参考格式/不生成范围，以及 390 标准、320 大字深色的来源部分写入界面回读。MAD/日期/冻结/规则及明确范围正确显示；原 v6 CRUD 回归仍通过。`python3 mobile/tests/check_sources.py` 可复现新增浏览器检查。真实 Swift 来源筛选、参考算法及 WKWebView 仍需本地验证。
- 新交付 `aeriday-mobile-source-v6-refined.zip`（完整源码及中英指南）、`aeriday-dist-mobile-v6-refined.zip`（dist-mobile/）；替代旧 v6 下载而不覆盖原文件。未发布、未新增服务。

### FINAL v6 参考审查增补
- v1 原生白名单新增 `reviewBaseline({metricId,confirm:true})->{ok:true}`。更多页参考详情及指标序列详情提供 **Rebuild personal reference**，再次点击 **Confirm rebuild personal reference** 才提交；可取消。首次点击或取消不调用原生。成功与失败均回读 getInsights 和 getSnapshot；已提交但报错沿用部分写入提示。
- 兼容增加 `reference.reviewReason?:string|null`。非 null 原因（包括空字符串）会同时隐藏详情和图表中的 referenceBand；JavaScript 不计算范围。
- Swift 必须让冻结/变化/删除的参考输入保持 baselineReviewNeeded，直到用户确认重建或明确更换来源。前端不清除或推断状态。重建仅重置实验性个人参考，不确认健康、不更改原始记录。仅有 frozenAt 日期不自动视为审查原因。
- 最终完整下载为 `aeriday-mobile-source-v6-final.zip`、`aeriday-dist-mobile-v6-final.zip`，包含所有此前 v6 洞察、结构化记录、来源及参考/上下文增补，替代早期与 refined 下载。替换整个包，不是单独文件。
- Swift 参考重建、真实 WKWebView/VoiceOver/XCTest 及键盘表现仍需本地验证；未发布、未新增服务。
- 最终验证：25 项单元测试通过，移动构建成功。Chromium 模拟桥接在 390 标准浅色及 320 大字深色检查确认/取消、v1 请求、两个回读、已提交错误回读、不改库存以及详情/图表范围隐藏；原 v6 CRUD 和来源回归通过。已查看截图，检查中无运行错误。
