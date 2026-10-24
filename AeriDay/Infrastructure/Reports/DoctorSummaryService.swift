import AeriDayCore
import CryptoKit
import Foundation
import UIKit

/// Platform orchestration for the recent doctor summary (R3).
///
/// Responsibilities kept OUT of the pure builder: computing the record-revision digest, holding a
/// short-lived in-memory token that binds a previewed snapshot to a later export, rendering a
/// multi-page PDF, and cleaning up protected temporary files. All numeric/aggregation logic lives
/// in `AeriDayCore.DoctorSummaryBuilder`, so preview and export describe the identical snapshot.
@MainActor
final class DoctorSummaryService {
    struct Token {
        let value: String
        let recordRevision: String
        let summary: DoctorVisitSummary
        let createdAt: Date
    }

    enum Failure: Error { case invalidRange, reportStale, unavailable }

    private let calendar: Calendar
    private let isDemo: Bool
    private var active: Token?
    /// A token is only valid briefly and only in memory; it never persists across launches.
    private let tokenTTL: TimeInterval = 10 * 60

    init(isDemo: Bool, calendar: Calendar = .current) {
        self.isDemo = isDemo
        self.calendar = calendar
    }

    /// Deterministic digest of the local records. Used as `recordRevision` because no monotonic
    /// store-revision API exists. A change to any record changes the digest, invalidating a token.
    static func recordRevision(for entries: LocalEntries) -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(entries) else { return "invalid" }
        return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    /// Build the immutable summary from a consistent snapshot and mint a preview token.
    func makeSummary(entries: LocalEntries, findings: [ChangeFinding], wearable: [DailyFeature],
                     range: DoctorSummaryRange, options: DoctorSummaryOptions,
                     now: Date = Date()) throws -> DoctorVisitSummary {
        let revision = Self.recordRevision(for: entries)
        let summary: DoctorVisitSummary
        do {
            summary = try DoctorSummaryBuilder.build(from: entries, findings: findings, wearable: wearable,
                                                     range: range, options: options, recordRevision: revision,
                                                     isDemo: isDemo, now: now, calendar: calendar)
        } catch is DoctorSummaryError {
            throw Failure.invalidRange
        }
        active = Token(value: UUID().uuidString, recordRevision: revision, summary: summary, createdAt: now)
        return summary
    }

    var activeToken: String? { active?.value }

    /// Invalidate the token (called on delete-all and when records change).
    func invalidate() { active = nil }

    /// Export the EXACT previewed snapshot as a PDF. Fails if the token is unknown/expired, or if
    /// the records changed since preview (caller must regenerate rather than export different data).
    func exportPDF(token: String, currentEntries: LocalEntries, now: Date = Date()) throws -> URL {
        guard let active, active.value == token else { throw Failure.reportStale }
        guard now.timeIntervalSince(active.createdAt) <= tokenTTL else { self.active = nil; throw Failure.reportStale }
        guard active.recordRevision == Self.recordRevision(for: currentEntries) else { throw Failure.reportStale }
        return try render(active.summary)
    }

    // MARK: PDF rendering

    private func render(_ summary: DoctorVisitSummary) throws -> URL {
        let pageSize = CGSize(width: 612, height: 792) // US Letter, 72dpi
        let margin: CGFloat = 48
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: pageSize))
        let lines = DoctorSummaryText.lines(for: summary)

        let url = try temporaryURL()
        let isDemo = summary.isDemo
        try renderer.writePDF(to: url) { ctx in
            var y: CGFloat = margin
            var pageNumber = 0
            func newPage() {
                ctx.beginPage()
                pageNumber += 1
                y = margin
                if isDemo { Self.drawDemoBanner(pageSize: pageSize, margin: margin) }
            }
            newPage()
            for line in lines {
                let font = line.style.font
                let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: UIColor.label]
                let maxWidth = pageSize.width - margin * 2
                let text = line.text as NSString
                let bounding = text.boundingRect(with: CGSize(width: maxWidth, height: .greatestFiniteMagnitude),
                                                 options: [.usesLineFragmentOrigin], attributes: attrs, context: nil)
                let needed = ceil(bounding.height) + line.style.spacingAfter
                if y + needed > pageSize.height - margin - 24 { // leave room for footer
                    Self.drawFooter(pageSize: pageSize, margin: margin, page: pageNumber)
                    newPage()
                }
                text.draw(with: CGRect(x: margin, y: y, width: maxWidth, height: ceil(bounding.height)),
                          options: [.usesLineFragmentOrigin], attributes: attrs, context: nil)
                y += needed
            }
            Self.drawFooter(pageSize: pageSize, margin: margin, page: pageNumber)
        }
        return url
    }

    private nonisolated static func drawDemoBanner(pageSize: CGSize, margin: CGFloat) {
        let text = "DEMO — synthetic data" as NSString
        let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.boldSystemFont(ofSize: 10), .foregroundColor: UIColor.systemRed
        ]
        text.draw(at: CGPoint(x: pageSize.width - margin - 140, y: 16), withAttributes: attrs)
    }

    private nonisolated static func drawFooter(pageSize: CGSize, margin: CGFloat, page: Int) {
        let text = "Asthma Helper · patient-generated · page \(page)" as NSString
        let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9), .foregroundColor: UIColor.secondaryLabel
        ]
        text.draw(at: CGPoint(x: margin, y: pageSize.height - margin + 8), withAttributes: attrs)
    }

    private func temporaryURL() throws -> URL {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("AeriDayReports", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true,
                                                 attributes: [.protectionKey: FileProtectionType.complete])
        let url = dir.appendingPathComponent("doctor-summary-\(UUID().uuidString).pdf")
        return url
    }

    /// Remove any temporary report files. Called on dismiss/expiry/next launch.
    static func cleanupTemporaryFiles() {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("AeriDayReports", isDirectory: true)
        if let items = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) {
            for item in items { try? FileManager.default.removeItem(at: item) }
        }
    }
}

private extension DoctorSummaryLineStyle {
    var font: UIFont {
        switch self {
        case .title: UIFont.boldSystemFont(ofSize: 17)
        case .heading: UIFont.boldSystemFont(ofSize: 13)
        case .body: UIFont.systemFont(ofSize: 11)
        case .caption: UIFont.italicSystemFont(ofSize: 9)
        }
    }
    var spacingAfter: CGFloat {
        switch self {
        case .title: 10
        case .heading: 6
        case .body: 3
        case .caption: 4
        }
    }
}
