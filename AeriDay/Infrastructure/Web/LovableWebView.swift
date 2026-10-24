import AeriDayCore
import SwiftUI
import WebKit

/// Hosts the actual Lovable-generated assets. All health operations remain in Swift.
struct LovableWebView: UIViewRepresentable {
    let store: LocalEntriesStore
    let healthData: any HealthDataProviding
    var isDemo = false

    func makeCoordinator() -> Coordinator { Coordinator(store: store, healthData: healthData, isDemo: isDemo) }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.setURLSchemeHandler(LocalWebAssets(), forURLScheme: "aeriday")
        configuration.userContentController.add(context.coordinator, name: "aeriBridge")
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = context.coordinator
        view.isOpaque = false
        view.backgroundColor = .systemBackground
        view.scrollView.isScrollEnabled = false
        view.scrollView.contentInsetAdjustmentBehavior = .never
        context.coordinator.webView = view
        let rules = """
        [{"trigger":{"url-filter":"^https?://"},"action":{"type":"block"}}]
        """
        WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "AeriDayLocalOnly", encodedContentRuleList: rules) { list, _ in
            Task { @MainActor in
                guard let list else { return } // Fail closed: do not load without network blocking.
                configuration.userContentController.add(list)
                if let url = URL(string: "aeriday://localhost/index.html") {
                    view.load(URLRequest(url: url))
                }
            }
        }
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "aeriBridge")
        uiView.stopLoading()
    }

    @MainActor
    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        weak var webView: WKWebView?
        private let store: LocalEntriesStore
        private let healthData: any HealthDataProviding
        private let isDemo: Bool
        private let insights: PersonalInsightsService
        private let reports: DoctorSummaryService
        private let iso = ISO8601DateFormatter()

        init(store: LocalEntriesStore, healthData: any HealthDataProviding, isDemo: Bool,
             insights: PersonalInsightsService? = nil) {
            self.store = store
            self.healthData = healthData
            self.isDemo = isDemo
            // The fixed synthetic scenario is anchored to Cambridge, Massachusetts (city-level only,
            // no coordinates/network/permission). In DEMO mode we pin the analysis + report calendar
            // to America/New_York so the header, timestamps, timeline and report time zone agree.
            // Real mode keeps the device calendar untouched.
            var demoCalendar = Calendar(identifier: .gregorian)
            if let zone = TimeZone(identifier: "America/New_York") { demoCalendar.timeZone = zone }
            let calendar: Calendar = isDemo ? demoCalendar : .current
            self.insights = insights ?? PersonalInsightsService(isDemo: isDemo, calendar: calendar)
            self.reports = DoctorSummaryService(isDemo: isDemo, calendar: calendar)
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
            guard let url = navigationAction.request.url, url.scheme == "aeriday", url.host == "localhost" else {
                return .cancel
            }
            return .allow
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "aeriBridge", message.frameInfo.isMainFrame,
                  message.frameInfo.request.url?.scheme == "aeriday",
                  message.frameInfo.request.url?.host == "localhost",
                  let request = message.body as? [String: Any], request["v"] as? Int == 1,
                  let id = request["id"] as? String, id.count <= 100,
                  let method = request["method"] as? String,
                  let params = request["params"] as? [String: Any] else { return }
            Task { @MainActor [weak self] in
                guard let self else { return }
                do {
                    let result = try await self.perform(method, params: params)
                    self.respond(["v": 1, "id": id, "ok": true, "result": result])
                } catch BridgeFailure.reportStale {
                    self.respond(["v": 1, "id": id, "ok": false,
                                  "error": ["code": "report_stale",
                                            "message": "Records changed since this preview. Regenerate the summary before exporting."]])
                } catch BridgeFailure.presentationFailed {
                    self.respond(["v": 1, "id": id, "ok": false,
                                  "error": ["code": "share_unavailable",
                                            "message": "The PDF was created but the share sheet could not be opened. Try again."]])
                } catch {
                    self.respond(["v": 1, "id": id, "ok": false,
                                  "error": ["code": "operation_failed", "message": "The local operation could not be completed."]])
                }
            }
        }

        private func respond(_ response: [String: Any]) {
            guard JSONSerialization.isValidJSONObject(response),
                  let data = try? JSONSerialization.data(withJSONObject: response, options: [.sortedKeys]),
                  let json = String(data: data, encoding: .utf8) else { return }
            webView?.evaluateJavaScript("window.__aeriBridgeReceive(\(json));", completionHandler: nil)
        }

        private func identifier(_ value: Any?) throws -> UUID {
            guard let value = value as? String, let id = UUID(uuidString: value) else { throw BridgeFailure.invalid }
            return id
        }

        private func doctorRange(_ params: [String: Any]) throws -> DoctorSummaryRange {
            guard let range = params["range"] as? [String: Any], let kind = range["kind"] as? String else {
                throw BridgeFailure.invalid
            }
            let includeToday = range["includeToday"] as? Bool ?? false
            switch kind {
            case "last7": return DoctorSummaryRange(kind: .last7, includeToday: includeToday)
            case "last30": return DoctorSummaryRange(kind: .last30, includeToday: includeToday)
            case "custom":
                let start = try date(range["start"])
                let end = try date(range["end"])
                return DoctorSummaryRange(kind: .custom, customStart: start, customEnd: end, includeToday: includeToday)
            default: throw BridgeFailure.invalid
            }
        }

        private func doctorOptions(_ params: [String: Any]) throws -> DoctorSummaryOptions {
            var noteIDs: [UUID] = []
            if let raw = params["selectedNoteIds"] as? [String] {
                noteIDs = try raw.map { try identifier($0) }
            } else if params["selectedNoteIds"] != nil {
                throw BridgeFailure.invalid
            }
            var questions: [String] = []
            if let raw = params["patientQuestions"] as? [String] {
                guard raw.count <= 20, raw.allSatisfy({ $0.count <= 500 }) else { throw BridgeFailure.invalid }
                questions = raw
            } else if params["patientQuestions"] != nil {
                throw BridgeFailure.invalid
            }
            return DoctorSummaryOptions(selectedNoteIDs: noteIDs, patientQuestions: questions)
        }

        /// Share only on user action; no automatic email or delivery. Cancel leaves no history.
        /// Throws if no live view controller can present, so the bridge reports failure instead of a
        /// false success (the earlier version returned silently, so a tap produced no sheet and no error).
        private func presentShareSheet(_ url: URL) throws {
            guard let presenter = Self.topmostViewController() else { throw BridgeFailure.presentationFailed }
            let activity = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            activity.completionWithItemsHandler = { _, _, _, _ in
                // Temporary report files are removed after the share dismisses.
                DoctorSummaryService.cleanupTemporaryFiles()
            }
            if let pop = activity.popoverPresentationController {
                pop.sourceView = presenter.view
                pop.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 0, height: 0)
                pop.permittedArrowDirections = []
            }
            presenter.present(activity, animated: true)
        }

        /// Resolve the controller that should present modally: the foreground-active scene's key
        /// window if there is one, otherwise ANY window with a root controller (SwiftUI apps do not
        /// always mark a window key), then walk to the topmost already-presented controller.
        private static func topmostViewController() -> UIViewController? {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            let ordered = scenes.sorted { lhs, rhs in
                (lhs.activationState == .foregroundActive ? 0 : 1) < (rhs.activationState == .foregroundActive ? 0 : 1)
            }
            let windows = ordered.flatMap { $0.windows }
            let root = windows.first(where: { $0.isKeyWindow })?.rootViewController
                ?? windows.first(where: { $0.rootViewController != nil })?.rootViewController
            guard var presenter = root else { return nil }
            while let presented = presenter.presentedViewController, !presented.isBeingDismissed {
                presenter = presented
            }
            return presenter
        }

        private func date(_ value: Any?) throws -> Date {
            guard let value = value as? String else { throw BridgeFailure.invalid }
            if let parsed = iso.date(from: value) { return parsed }
            let fractional = ISO8601DateFormatter()
            fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let parsed = fractional.date(from: value) { return parsed }
            let local = DateFormatter()
            local.locale = Locale(identifier: "en_US_POSIX")
            local.isLenient = false
            local.dateFormat = value.count == 10 ? "yyyy-MM-dd" :
                (value.contains("T") ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd HH:mm")
            guard let parsed = local.date(from: value) else { throw BridgeFailure.invalid }
            return parsed
        }

        private func structured<T: Decodable>(_ params: [String: Any], defaults: [String: Any]) throws -> T {
            var value = defaults.merging(params) { _, supplied in supplied }
            value["id"] = try params["id"].map { try identifier($0).uuidString } ?? UUID().uuidString
            value["date"] = iso.string(from: try date(params["date"]))
            value["updatedAt"] = iso.string(from: Date())
            guard JSONSerialization.isValidJSONObject(value) else { throw BridgeFailure.invalid }
            let decoder = JSONDecoder(); decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(T.self, from: JSONSerialization.data(withJSONObject: value))
        }

        func perform(_ method: String, params: [String: Any]) async throws -> [String: Any] {
            guard store.isAvailable else { throw BridgeFailure.unavailable }
            switch method {
            case "getSnapshot": return await snapshot()
            case "getInsights":
                return try await insights.refresh(provider: healthData, entries: store.entries)
            case "getMetricSeries":
                guard let metric = params["metricId"] as? String, let days = params["days"] as? Int else { throw BridgeFailure.invalid }
                return try insights.series(metricID: metric, days: days)
            case "getDoctorSummary":
                let range = try doctorRange(params)
                let options = try doctorOptions(params)
                let inputs = insights.reportInputs()
                do {
                    let summary = try reports.makeSummary(entries: store.entries, findings: inputs.findings,
                                                          wearable: inputs.wearable, range: range, options: options)
                    let encoder = JSONEncoder(); encoder.dateEncodingStrategy = .iso8601
                    guard let data = try? encoder.encode(summary),
                          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                          let token = reports.activeToken else { throw BridgeFailure.invalid }
                    return ["summary": json, "token": token]
                } catch DoctorSummaryService.Failure.invalidRange { throw BridgeFailure.invalid }
            case "exportDoctorSummary":
                guard let token = params["token"] as? String else { throw BridgeFailure.invalid }
                if let format = params["format"] as? String, format != "pdf" { throw BridgeFailure.invalid }
                do {
                    let url = try reports.exportPDF(token: token, currentEntries: store.entries)
                    try presentShareSheet(url)
                    return ["ok": true, "format": "pdf"]
                } catch DoctorSummaryService.Failure.reportStale {
                    throw BridgeFailure.reportStale
                }
            case "reviewBaseline":
                guard params["confirm"] as? Bool == true, let metric = params["metricId"] as? String else { throw BridgeFailure.invalid }
                try insights.reviewBaseline(metricID: metric)
                return ["ok": true]
            case "setPreferredSource":
                guard let metric = params["metricId"] as? String,
                      params["sourceId"] is String || params["sourceId"] is NSNull else { throw BridgeFailure.invalid }
                try insights.setPreferredSource(metricID: metric, sourceID: params["sourceId"] as? String)
                return ["ok": true]
            case "setAnalysisEnabled":
                guard let enabled = params["enabled"] as? Bool else { throw BridgeFailure.invalid }
                try insights.setEnabled(enabled)
                return ["ok": true]
            case "saveSymptomCheckIn":
                let record: SymptomCheckIn = try structured(params, defaults: [
                    "cough": "unknown", "wheeze": "unknown", "chestTightness": "unknown", "breathlessness": "unknown",
                    "respiratoryNightWaking": "unknown", "activityLimitation": "unknown", "context": ""])
                guard store.saveSymptomCheckIn(record) else { throw BridgeFailure.invalid }
                insights.invalidate()
                reports.invalidate()
                return ["id": record.id.uuidString]
            case "saveMedicationUse":
                let record: MedicationUseEvent = try structured(params, defaults: [
                    "purpose": "unknown", "regimen": "unknown", "preExercise": "unknown"])
                guard store.saveMedicationUse(record) else { throw BridgeFailure.invalid }
                insights.invalidate()
                reports.invalidate()
                return ["id": record.id.uuidString]
            case "savePeakFlow":
                let record: PeakFlowEntry = try structured(params, defaults: [
                    "unit": "L/min", "device": "", "personalBestConfirmedByClinician": false])
                guard store.savePeakFlow(record) else { throw BridgeFailure.invalid }
                insights.invalidate()
                reports.invalidate()
                return ["id": record.id.uuidString]
            case "deleteSymptomCheckIn":
                guard store.deleteSymptomCheckIn(try identifier(params["id"])) else { throw BridgeFailure.invalid }
                insights.invalidate()
                reports.invalidate()
                return ["ok": true]
            case "deleteMedicationUse":
                guard store.deleteMedicationUse(try identifier(params["id"])) else { throw BridgeFailure.invalid }
                insights.invalidate()
                reports.invalidate()
                return ["ok": true]
            case "deletePeakFlow":
                guard store.deletePeakFlow(try identifier(params["id"])) else { throw BridgeFailure.invalid }
                insights.invalidate()
                reports.invalidate()
                return ["ok": true]
            case "requestHealthAuthorization":
                if isDemo { return ["authorized": false, "isDemo": true] }
                let health = await healthData.requestAuthorization()
                return ["authorized": health.availability == .sampleAvailable]
            case "setLanguage":
                guard let lang = params["lang"] as? String, ["en", "zh"].contains(lang) else { throw BridgeFailure.invalid }
                UserDefaults.standard.set(lang == "zh" ? AppLanguage.simplifiedChinese.rawValue : AppLanguage.englishUS.rawValue,
                                          forKey: AppLanguage.storageKey)
                return ["ok": true]
            case "saveNote":
                // The existing protected store supports free text only. Reject unsupported
                // structured fields rather than silently losing a supplied measurement.
                guard params["metricId"] == nil, params["value"] == nil else { throw BridgeFailure.invalid }
                let id = try params["id"].map { try identifier($0) } ?? UUID()
                let timestamp = try date(params["date"])
                let text: String
                if let note = params["note"] as? String, !note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    text = note
                } else { throw BridgeFailure.invalid }
                guard store.saveNote(JournalEntry(id: id, date: timestamp, text: text)) else { throw BridgeFailure.unavailable }
                return ["id": id.uuidString]
            case "deleteNote":
                let id = try identifier(params["id"])
                guard store.entries.notes.contains(where: { $0.id == id }) else { throw BridgeFailure.invalid }
                store.deleteNote(id)
                guard !store.entries.notes.contains(where: { $0.id == id }) else { throw BridgeFailure.unavailable }
                return ["ok": true]
            case "saveMedication":
                let id = try params["id"].map { try identifier($0) } ?? UUID()
                let old = store.entries.medications.first { $0.id == id }
                guard let name = params["name"] as? String,
                      let number = params["remainingDoses"] as? NSNumber,
                      number.doubleValue.isFinite, number.doubleValue.rounded() == number.doubleValue,
                      (0...99999).contains(number.doubleValue) else { throw BridgeFailure.invalid }
                let unit: SupplyUnit
                if let raw = params["unit"] as? String {
                    guard let supplied = SupplyUnit(rawValue: raw) else { throw BridgeFailure.invalid }
                    unit = supplied
                } else { unit = old?.unit ?? .puff }
                let item = MedicationItem(id: id, name: name, unit: unit, remaining: number.intValue,
                                          confirmedAt: old?.confirmedAt ?? Date(),
                                          reminderHour: old?.reminderHour, reminderMinute: old?.reminderMinute)
                guard store.saveMedication(item) else { throw BridgeFailure.unavailable }
                return ["id": id.uuidString]
            case "deleteMedication":
                let id = try identifier(params["id"])
                guard store.entries.medications.contains(where: { $0.id == id }) else { throw BridgeFailure.invalid }
                store.deleteMedication(id)
                guard !store.entries.medications.contains(where: { $0.id == id }) else { throw BridgeFailure.unavailable }
                return ["ok": true]
            case "setReminder":
                let id = try identifier(params["id"])
                guard var item = store.entries.medications.first(where: { $0.id == id }),
                      let enabled = params["enabled"] as? Bool else { throw BridgeFailure.invalid }
                if enabled {
                    guard let time = params["time"] as? String else { throw BridgeFailure.invalid }
                    let parts = time.split(separator: ":").compactMap { Int($0) }
                    guard parts.count == 2, (0...23).contains(parts[0]), (0...59).contains(parts[1]),
                          await store.reminders.authorize() else { throw BridgeFailure.invalid }
                    item.reminderHour = parts[0]; item.reminderMinute = parts[1]
                    let lang = UserDefaults.standard.string(forKey: AppLanguage.storageKey)
                    try await store.reminders.schedule(item, locale: Locale(identifier: lang ?? "en-US"))
                } else {
                    item.reminderHour = nil; item.reminderMinute = nil
                    store.reminders.cancel(id)
                }
                guard store.saveMedication(item) else {
                    if let old = store.entries.medications.first(where: { $0.id == id }) {
                        try? await store.reminders.schedule(old, locale: .autoupdatingCurrent)
                    }
                    throw BridgeFailure.unavailable
                }
                return ["ok": true]
            case "deleteAll":
                guard params["confirm"] as? Bool == true else { throw BridgeFailure.invalid }
                store.deleteAll()
                guard store.entries.notes.isEmpty, store.entries.medications.isEmpty,
                      store.entries.symptomCheckIns.isEmpty, store.entries.medicationUseEvents.isEmpty,
                      store.entries.peakFlowEntries.isEmpty else { throw BridgeFailure.unavailable }
                try insights.clear()
                reports.invalidate()
                return ["ok": true]
            default: throw BridgeFailure.invalid
            }
        }

        private func snapshot() async -> [String: Any] {
            let health = await healthData.latestSnapshot()
            let keys: [HealthMetricKind: String] = [.respiratoryRate: "rr", .restingHeartRate: "rhr", .sleepAnalysis: "sleep",
                                                   .oxygenSaturation: "spo2", .stepCount: "steps", .workout: "workout"]
            let grouped = Dictionary(grouping: health.metrics, by: \.kind)
            let metrics: [[String: Any]] = grouped.compactMap { kind, samples in
                guard let key = keys[kind], let latest = samples.max(by: { $0.endDate < $1.endDate }) else { return nil }
                return ["id": key, "current": latest.value as Any? ?? NSNull(), "status": "insufficient",
                        "points": isDemo ? DemoFixtures.points(kind: kind) : Array(repeating: NSNull(), count: 30),
                        "freshness": Date().timeIntervalSince(latest.endDate) > 48 * 3600 ? "stale" : iso.string(from: latest.endDate),
                        "source": latest.sourceName, "sampledAt": iso.string(from: latest.endDate),
                        "unit": latest.unit ?? "", "semantics": "latestSample"]
            }
            let notes: [[String: Any]] = store.entries.notes.map {
                ["id": $0.id.uuidString, "date": iso.string(from: $0.date), "note": $0.text]
            }
            let medications: [[String: Any]] = store.entries.medications.map {
                var value: [String: Any] = ["id": $0.id.uuidString, "name": $0.name, "unit": $0.unit.rawValue,
                                            "remainingDoses": $0.remaining, "confirmed": true,
                                            "reminderEnabled": $0.reminderHour != nil && $0.reminderMinute != nil]
                if let hour = $0.reminderHour, let minute = $0.reminderMinute {
                    value["reminderHour"] = hour; value["reminderMinute"] = minute
                }
                return value
            }
            return ["generatedAt": iso.string(from: Date()), "healthAuthorized": !isDemo && health.availability == .sampleAvailable,
                    "isDemo": isDemo,
                    "healthState": health.availability.rawValue, "metrics": metrics, "notes": notes,
                    "medications": medications,
                    "language": UserDefaults.standard.string(forKey: AppLanguage.storageKey) == "zh-Hans" ? "zh" : "en"]
        }
    }
}

private enum BridgeFailure: Error { case invalid, unavailable, reportStale, presentationFailed }

/// A local origin for ES modules and CSP; never serves data outside the bundled Web folder.
private final class LocalWebAssets: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start urlSchemeTask: any WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url, url.scheme == "aeriday", url.host == "localhost",
              let root = Bundle.main.resourceURL?.appendingPathComponent("Web").standardizedFileURL else {
            urlSchemeTask.didFailWithError(URLError(.badURL)); return
        }
        let file = root.appendingPathComponent(url.path == "/" ? "index.html" : String(url.path.dropFirst())).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file) else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        let mime: String
        switch file.pathExtension {
        case "html": mime = "text/html"
        case "js": mime = "text/javascript"
        case "css": mime = "text/css"
        case "svg": mime = "image/svg+xml"
        case "png": mime = "image/png"
        case "woff2": mime = "font/woff2"
        case "woff": mime = "font/woff"
        case "ttf": mime = "font/ttf"
        case "otf": mime = "font/otf"
        default: mime = "application/octet-stream"
        }
        let encoding = ["text/html", "text/javascript", "text/css", "image/svg+xml"].contains(mime) ? "utf-8" : nil
        urlSchemeTask.didReceive(URLResponse(url: url, mimeType: mime, expectedContentLength: data.count, textEncodingName: encoding))
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }
    func webView(_ webView: WKWebView, stop urlSchemeTask: any WKURLSchemeTask) {}
}
