import type { Lang } from "./copy";

/**
 * v3 copy — automated-first Today. Short labels only; long explanations live
 * in contextual info sheets so the default screen stays glanceable.
 */
export const d = {
  en: {
    dashTitle: "Today",
    dashMeta: "Updated 08:40",

    /* air */
    airTitle: "Air quality",
    airValue: "58",
    airUnit: "AQI",
    airCat: "Moderate",
    airDom: "Main pollutant: PM2.5",
    airSrc: "Air provider · 08:40",

    /* pollen */
    pollenTitle: "Pollen & mold",
    pollenValue: "8.2",
    pollenUnit: "/ 10",
    pollenCat: "High · oak",
    pollenMold: "Mold 3.1 / 10 · low",
    pollenSrc: "Pollen provider · 07:30",

    /* weather */
    wxTitle: "Weather",
    wxTemp: "26",
    wxUnit: "°C",
    wxDelta: "+3 °C since yesterday",
    wxRange: "19° – 29°",
    wxHum: "Outdoor humidity",
    wxHumVal: "71%",
    wxAlert: "Thunderstorm watch this afternoon",
    wxSrc: "Weather provider · 08:40",

    /* indoor */
    indoorTitle: "Indoor humidity",
    indoorStale: "Last update yesterday 22:10",
    indoorUnavailable: "No sensor data",

    /* health */
    hlTitle: "Health trends",
    hlMeta: "4 of 6 · updated 06:14",
    hlSeeAll: "See all",
    hlSheetT: "Health trends",
    hlNeedsAttention: "to review",
    hlAllSteady: "All within your usual range",
    hlAbove: "Above your usual range",
    hlBelow: "Below your usual range",
    hlSourceChanged: "Source changed",
    hlSteady: "Within your usual range",
    hlNoData: "Not enough data",
    hlStale: "No recent data",
    hlRange7: "Last 7 days",
    hlAxisStart: "7 days ago",
    hlAxisEnd: "Today",
    hlCoverage: "{n} of 7 days recorded",
    hlGapNote: "Gaps mean no data.",
    hlBandNote: "Shaded band = your usual range",
    hlNoChart: "No chart after a source change.",
    hlSummary: "Summary: {v} · {s} · {c}",
    iRecentT: "Your usual range",
    iRecentB: [
      "This compares today's value with your own readings from the last few weeks.",
      "It is not a clinical threshold and does not diagnose or rule out anything.",
    ],
    hlWithin: "In personal range",
    hlOut: "Above personal range",
    hlChanged: "Source changed",
    hlNone: "Not enough data",

    /* environment details */
    envSheetT: "Environment details",
    envSheetSub: "Sources and updates",
    envAirRow: "Air quality",
    envPollenRow: "Pollen & mold",
    envWxRow: "Weather",
    envIndoorRow: "Indoor humidity",
    envDetails: "Environment details",
    envSensorNone: "Not connected",


    /* meds */
    medTitle: "Medications today",
    medNext: "20:00 · controller · 1 inhalation",
    medTaken: "08:00 taken",
    medLow: "Reliever low",
    medLowSub: "12 doses · about 4 days",
    medRefill: "Refill",

    /* plan row */
    planRow: "Action plan",
    planUnset: "Today's zone not set",
    planSrc: "Edited Jun 12",
    emergency: "Emergency steps",

    /* manual */
    askTitle: "Anything unusual?",
    askNone: "Nothing to note",
    askLog: "Log symptoms",
    noteSaved: "Nothing noted · {t}",
    reportedTitle: "Symptoms reported",
    reportedSub: "Saved {t}",
    reportedOpenPlan: "Action plan",
    reportedEmergency: "Emergency steps",
    reportedView: "View",

    /* info sheets */
    iAqiT: "What AQI means",
    iAqiB: [
      "AQI describes outdoor air near you.",
      "It does not reflect your symptoms.",
    ],
    iRangeT: "What “personal range” means",
    iRangeB: [
      "Compared with your own recent readings.",
      "This is not an asthma rating.",
    ],
    iIndoorT: "Indoor humidity ranges",
    iIndoorB: [
      "Under 30% dry · 30–50% recommended · over 50% above range · 60%+ check for damp.",
      "These bands describe the room only and do not change your asthma status.",
    ],
    iFreshT: "Source and freshness",
    iFreshB: [
      "Each value shows its source and update time.",
      "Missing data is not estimated.",
    ],
    info: "What is this?",
  },

  zh: {
    dashTitle: "今日",
    dashMeta: "08:40 更新",

    airTitle: "空气质量",
    airValue: "58",
    airUnit: "AQI",
    airCat: "中等",
    airDom: "主要污染物：PM2.5",
    airSrc: "空气数据服务 · 08:40",

    pollenTitle: "花粉与霉菌",
    pollenValue: "8.2",
    pollenUnit: "/ 10",
    pollenCat: "高 · 橡树",
    pollenMold: "霉菌 3.1 / 10 · 偏低",
    pollenSrc: "花粉数据服务 · 07:30",

    wxTitle: "天气",
    wxTemp: "26",
    wxUnit: "°C",
    wxDelta: "比昨天高 3 °C",
    wxRange: "19° – 29°",
    wxHum: "室外湿度",
    wxHumVal: "71%",
    wxAlert: "今天下午有雷暴预警",
    wxSrc: "气象数据服务 · 08:40",

    indoorTitle: "室内湿度",
    indoorStale: "昨天 22:10 更新",
    indoorUnavailable: "暂无传感器数据",

    hlTitle: "健康趋势",
    hlMeta: "4 / 6 项 · 06:14 更新",
    hlSeeAll: "查看全部",
    hlSheetT: "健康趋势",
    hlNeedsAttention: "项需查看",
    hlAllSteady: "均在平时范围内",
    hlAbove: "高于平时范围",
    hlBelow: "低于平时范围",
    hlSourceChanged: "来源已更换",
    hlSteady: "在平时范围内",
    hlNoData: "数据不足",
    hlStale: "暂无近期数据",
    hlRange7: "近 7 天",
    hlAxisStart: "7 天前",
    hlAxisEnd: "今天",
    hlCoverage: "7 天中有 {n} 天有记录",
    hlGapNote: "空缺表示没有数据。",
    hlBandNote: "阴影 = 你的平时范围",
    hlNoChart: "来源更换后暂不显示曲线。",
    hlSummary: "摘要：{v} · {s} · {c}",
    iRecentT: "你的平时范围",
    iRecentB: [
      "这是把今天的数值与你自己近几周的读数比较。",
      "它不是临床阈值，也不能诊断或排除任何疾病。",
    ],
    hlWithin: "处于个人范围",
    hlOut: "高于个人范围",
    hlChanged: "来源已变更",
    hlNone: "数据不足",

    envSheetT: "环境数据详情",
    envSheetSub: "来源与更新时间",
    envAirRow: "空气质量",
    envPollenRow: "花粉与霉菌",
    envWxRow: "天气",
    envIndoorRow: "室内湿度",
    envDetails: "环境数据详情",
    envSensorNone: "未连接",


    medTitle: "今日用药",
    medNext: "20:00 · 控制药 · 1 吸",
    medTaken: "08:00 已服用",
    medLow: "缓解药快用完了",
    medLowSub: "剩 12 吸 · 约 4 天",
    medRefill: "补药",

    planRow: "行动计划",
    planUnset: "今天还没设置区间",
    planSrc: "6 月 12 日编辑",
    emergency: "应急步骤",

    askTitle: "今天有异常吗？",
    askNone: "暂无不适",
    askLog: "记录症状",
    noteSaved: "无异常 · {t}",
    reportedTitle: "已记录症状",
    reportedSub: "{t} 保存",
    reportedOpenPlan: "行动计划",
    reportedEmergency: "应急步骤",
    reportedView: "查看",

    iAqiT: "AQI 是什么",
    iAqiB: [
      "AQI 反映附近的室外空气质量。",
      "它不代表你的症状。",
    ],
    iRangeT: "「个人范围」是什么",
    iRangeB: [
      "只与你自己的近期数据比较。",
      "这不是哮喘分级。",
    ],
    iIndoorT: "室内湿度区间",
    iIndoorB: [
      "低于 30% 偏干 · 30–50% 建议区间 · 高于 50% 偏高 · 60% 及以上请检查潮湿。",
      "这些区间只描述房间环境，不改变你的哮喘状态。",
    ],
    iFreshT: "数据来源与更新时间",
    iFreshB: [
      "每项数据都显示来源和更新时间。",
      "缺失数据不会用估算值补上。",
    ],
    info: "这是什么？",
  },
} satisfies Record<Lang, Record<string, string | string[]>>;
