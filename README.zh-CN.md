# Asthma Helper

**帮助人们在普通的每一天与哮喘更舒适地相处。**

出门散步前可能忽略花粉或空气质量变化；夜间不适后可能说不清哪里不同；吸入器可能比预想更早需要补充。Asthma Helper 把日常环境、药品和余量信息、个人观察与趋势放在一起，支持每天与哮喘相处。就诊摘要只是其中一个辅助功能。

本 Hackachusetts 快照包含两个相关实现。Lovable 开发前端，Kiro 开发原生后端，Codex 协调任务、集成和验证。项目基于既有概念与代码；本次贡献包括后端摘要、契约、集成修复、specs/steering 与模拟场景改进，不声称整个产品在活动当天从零写成。

## 评委快速体验：网页演示

需要 Bun 和现代浏览器：

```sh
cd web-demo
bun install
bun run dev
```

打开 Vite 输出的本地地址，体验 Today、Medications、Trends、History 和 More。新增或编辑合成记录，查看模拟变化示例，在 More → Prepare for a doctor visit 选择日期、笔记和问题，生成预览并打开 Print / Save PDF。

详见 [网页说明](web-demo/JUDGES.zh-CN.md)。其中测试结果来自前端工具自述，并非对此公开快照的独立重新认证。

**网页使用合成数据。JavaScript 选择模拟变化示例，不执行原生 Swift 分析，不访问 HealthKit。请勿输入真实健康信息。** 虚构编辑存在 localStorage；空气质量、花粉、天气、地点和时间线均为模拟。

## 原生 iOS 应用

需要 macOS、支持 iOS 模拟器的 Xcode 和 XcodeGen。最低 iOS 17，项目生成配置记录 Xcode 26.3。保留内部 AeriDay target 和路径，避免破坏构建配置。

```sh
make doctor
make demo DERIVED_DATA=/tmp/AsthmaHelperDerivedData
```

命令生成 Xcode 工程、构建模拟器应用并启动合成模式；不为实体设备 release 配置签名。源码位于 `AeriDay/`、`AeriDayCore/` 和 `AeriDayDesignSystem/`。对应原生前端位于 `LovableFrontend/aeriday-mobile-source-v8/`，已打包资源在 `AeriDay/Resources/Web/`。

独立重建对应前端：

```sh
cd LovableFrontend/aeriday-mobile-source-v8
bun install
bun run build:mobile
```

输出 `dist-mobile/`；替换应用资源需明确集成并重建 iOS。更新的 `web-demo/` 单独保留，没有覆盖原生前端。

## 检查

```sh
./scripts/run_pure_report_tests.sh
./scripts/typecheck_report_service.sh
cd LovableFrontend/aeriday-mobile-source-v8 && bun install && cd ../..
./scripts/run_wire_contract_check.sh
```

网页单元检查：

```sh
cd web-demo
bun test src/lib/aeriday/*.test.mjs mobile/trialPreferences.test.mjs
```

这些是可复现入口，不表示本快照已重跑所有命令。之前普通模拟器构建和启动成功；Kiro 全应用构建遇到 Apple 宏插件沙箱限制，后续原生更改仍需全量构建和运行验收。网页摘要内容和系统打印窗口已操作；原生 PDF 分享尚未运行确认。Core 检查不能证明 UI 和导出成功。

## Kiro 证据与来源

实际 specs 和 steering 保留于 `.kiro/specs/asthma-helper-hackathon/`、`.kiro/steering/`。摘要构建在 `AeriDayCore/Sources/Reports/`，原生服务和桥接在 `AeriDay/Infrastructure/`。包含测试源码和脚本。

本干净公开快照来自截至本地 `d9cb5a3` 的原生源码与独立下载的最终 Lovable 评委前端。可追溯事件阶段包括 `f25245a`（响应契约）、`0f65020`（原生前端集成）、`0fca4b5`（呈现/场景）、`a26bf1c`（Cambridge 场景/时区）。不包含原私有 Git 历史；短 SHA 是来源记录，不是此新仓库的 commit 链接。

## 差异与边界

**因开发时间有限，网页和原生版本尚未完全一致。** 部分 UI 和行为存在差异。原生应用包含 Swift 变化与摘要后端，网页是可访问的合成演示。不声称临床验证、实体 HealthKit 验证、实时环境接入、原生 PDF 分享成功或完整端到端认证。

本产品是实验原型，不是医疗器械，不诊断、不区分哮喘与焦虑、不预测发作、不推荐调整用药，也不判定环境因果。

## 公开内容与许可

前端保留上游 Lovable 错误报告 hooks 和 Vite/TanStack 配置。若编辑器提供对应全局函数，hooks 会调用它们；这不是新接入的健康数据服务。托管预览/平台行为和依赖代码不在此次源码扫描认证范围内。没有添加凭据或账号专属配置。

快照不含私有 Git 历史、个人文档/简历/PDF、录屏、原始日志、账号设置、凭据、旧前端和历史归档。字体和第三方许可保留上游条款，依赖保持各自许可。未擅自给原始项目代码添加统一许可；超出此次授权仓库公开的再分发应向所有者确认。
