import AeriDayCore
import Foundation
import SwiftData

@MainActor
protocol LocalEntriesPersisting {
    func load() throws -> LocalEntries
    func save(_ entries: LocalEntries) throws
}

@Model
final class StoredLocalEntries {
    var payload: Data
    init(payload: Data) { self.payload = payload }
}

@MainActor
final class SwiftDataEntriesPersistence: LocalEntriesPersisting {
    let container: ModelContainer
    let directory: URL
    private let context: ModelContext

    init(baseDirectory: URL? = nil) throws {
        directory = try LocalStorageDirectoryPolicy.prepareDirectory(in: baseDirectory)
        let configuration = ModelConfiguration(
            url: directory.appendingPathComponent("entries.store"), cloudKitDatabase: .none
        )
        container = try ModelContainer(for: StoredLocalEntries.self, configurations: configuration)
        context = ModelContext(container)
        context.autosaveEnabled = false
        try protectFiles()
    }

    func load() throws -> LocalEntries {
        try protectFiles()
        let rows = try context.fetch(FetchDescriptor<StoredLocalEntries>())
        guard rows.count <= 1 else { throw CocoaError(.fileReadCorruptFile) }
        guard let row = rows.first else { return LocalEntries() }
        let entries = try JSONDecoder().decode(LocalEntries.self, from: row.payload)
        guard entries.version == 1 else { throw CocoaError(.fileReadUnknown) }
        return entries
    }

    func save(_ entries: LocalEntries) throws {
        try protectFiles()
        let data = try JSONEncoder().encode(entries)
        do {
            if let row = try context.fetch(FetchDescriptor<StoredLocalEntries>()).first {
                row.payload = data
            } else {
                context.insert(StoredLocalEntries(payload: data))
            }
            try context.save()
        } catch {
            context.rollback()
            throw error
        }
        try protectFiles()
    }

    private func protectFiles() throws {
        try LocalStorageDirectoryPolicy.reapplyBackupExclusion(recursivelyAt: directory)
        let urls = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
        for url in urls {
            try FileManager.default.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: url.path)
        }
    }
}

@MainActor
final class MemoryEntriesPersistence: LocalEntriesPersisting {
    var value = LocalEntries()
    func load() throws -> LocalEntries { value }
    func save(_ entries: LocalEntries) throws { value = entries }
}
