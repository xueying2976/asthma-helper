import Foundation

enum LocalStorageDirectoryPolicy {
    static let directoryName = "AeriDayLocalData"

    static func prepareDirectory(
        in baseDirectory: URL? = nil,
        fileManager: FileManager = .default
    ) throws -> URL {
        let baseURL = try baseDirectory ?? fileManager.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        let directoryURL = baseURL.appendingPathComponent(directoryName, isDirectory: true)
        try fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)

        var resourceValues = URLResourceValues()
        resourceValues.isExcludedFromBackup = true
        var mutableURL = directoryURL
        try mutableURL.setResourceValues(resourceValues)

        #if os(iOS)
        try fileManager.setAttributes(
            [.protectionKey: FileProtectionType.complete],
            ofItemAtPath: directoryURL.path
        )
        #endif

        return directoryURL
    }

    static func reapplyBackupExclusion(
        recursivelyAt directoryURL: URL,
        fileManager: FileManager = .default
    ) throws {
        let keys: Set<URLResourceKey> = [.isDirectoryKey]
        let children = fileManager.enumerator(
            at: directoryURL,
            includingPropertiesForKeys: Array(keys),
            options: [.skipsHiddenFiles]
        )

        var URLs = [directoryURL]
        while let child = children?.nextObject() as? URL {
            URLs.append(child)
        }

        for var URL in URLs {
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try URL.setResourceValues(values)
        }
    }
}

