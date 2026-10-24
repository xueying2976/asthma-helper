import AeriDayCore
import Foundation
import UserNotifications

@MainActor
final class LocalReminderService {
    private let isEnabled: Bool
    private let center = UNUserNotificationCenter.current()
    init(isEnabled: Bool = true) { self.isEnabled = isEnabled }

    func authorize() async -> Bool {
        guard isEnabled else { return true }
        return (try? await center.requestAuthorization(options: [.alert, .sound])) ?? false
    }

    func schedule(_ item: MedicationItem, locale: Locale) async throws {
        guard isEnabled else { return }
        guard let hour = item.reminderHour, let minute = item.reminderMinute else { cancel(item.id); return }
        let content = UNMutableNotificationContent()
        content.title = "AeriDay"
        content.body = String(localized: "reminder.body", locale: locale)
        content.sound = .default
        let trigger = UNCalendarNotificationTrigger(dateMatching: DateComponents(hour: hour, minute: minute), repeats: true)
        try await center.add(UNNotificationRequest(identifier: identifier(item.id), content: content, trigger: trigger))
    }

    func cancel(_ id: UUID) {
        guard isEnabled else { return }
        center.removePendingNotificationRequests(withIdentifiers: [identifier(id)])
        center.removeDeliveredNotifications(withIdentifiers: [identifier(id)])
    }

    func cancelAll() {
        guard isEnabled else { return }
        // All notifications in this app are user-set local reminders.
        center.removeAllPendingNotificationRequests()
        center.removeAllDeliveredNotifications()
    }

    func reconcile(currentItems: () -> [MedicationItem]) async {
        guard isEnabled else { return }
        let pending = await center.pendingNotificationRequests()
        let validIDs = Set(currentItems().filter { $0.reminderHour != nil }.map { identifier($0.id) })
        let obsolete = pending.map(\.identifier).filter { $0.hasPrefix("aeriday.reminder.") && !validIDs.contains($0) }
        center.removePendingNotificationRequests(withIdentifiers: obsolete)
        center.removeDeliveredNotifications(withIdentifiers: obsolete)
    }

    private func identifier(_ id: UUID) -> String { "aeriday.reminder." + id.uuidString }
}
