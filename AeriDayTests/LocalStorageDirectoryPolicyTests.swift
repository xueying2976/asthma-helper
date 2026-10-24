@testable import AeriDay
import Foundation
import Testing

struct LocalStorageDirectoryPolicyTests {
    @Test func preparedDirectoryIsExcludedFromBackup() throws {
        let baseURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        defer { try? FileManager.default.removeItem(at: baseURL) }

        let directory = try LocalStorageDirectoryPolicy.prepareDirectory(in: baseURL)
        let values = try directory.resourceValues(forKeys: [.isExcludedFromBackupKey])

        #expect(values.isExcludedFromBackup == true)
    }

    @Test func exclusionIsAppliedToExistingChildren() throws {
        let baseURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        defer { try? FileManager.default.removeItem(at: baseURL) }

        let directory = try LocalStorageDirectoryPolicy.prepareDirectory(in: baseURL)
        let child = directory.appendingPathComponent("synthetic-store.sqlite")
        try Data("synthetic only".utf8).write(to: child)
        try LocalStorageDirectoryPolicy.reapplyBackupExclusion(recursivelyAt: directory)
        let values = try child.resourceValues(forKeys: [.isExcludedFromBackupKey])

        #expect(values.isExcludedFromBackup == true)
    }
}

