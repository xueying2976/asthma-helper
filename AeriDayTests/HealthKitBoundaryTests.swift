@testable import AeriDay
import AeriDayCore
import Foundation
import HealthKit
import Testing

struct HealthKitBoundaryTests {
    @Test func readAllowlistContainsExactlySixApprovedTypes() {
        let expected: Set<String> = [
            HKQuantityType(.respiratoryRate).identifier,
            HKQuantityType(.restingHeartRate).identifier,
            HKCategoryType(.sleepAnalysis).identifier,
            HKQuantityType(.oxygenSaturation).identifier,
            HKQuantityType(.stepCount).identifier,
            HKObjectType.workoutType().identifier
        ]

        #expect(Set(HealthKitTypeRegistry.readTypes.map(\.identifier)) == expected)
        #expect(HealthKitTypeRegistry.readTypes.count == 6)
    }

    @Test func domainMetricKindsMatchTheApprovedAllowlist() {
        #expect(Set(HealthMetricKind.allCases) == [
            .respiratoryRate,
            .restingHeartRate,
            .sleepAnalysis,
            .oxygenSaturation,
            .stepCount,
            .workout
        ])
    }

    @Test func uiTestsAlwaysUseSyntheticServices() {
        let configuration = AppRuntimeConfiguration.current(arguments: [
            "AeriDay",
            "-uiTestLocale", "en-US"
        ])
        #expect(configuration.usesSyntheticServices)
    }

    @Test func regularLaunchUsesLiveServiceComposition() {
        let configuration = AppRuntimeConfiguration.current(arguments: ["AeriDay"])
        #expect(!configuration.usesSyntheticServices)
    }

    @Test func syntheticMultipleSourceFixturePreservesProvenance() async {
        let snapshot = await AppEnvironment.synthetic(.multipleSources).healthData.latestSnapshot()
        let respiratorySources = Set(
            snapshot.metrics
                .filter { $0.kind == .respiratoryRate }
                .map(\.sourceBundleIdentifier)
        )

        #expect(respiratorySources.count == 2)
        #expect(snapshot.metrics.allSatisfy { !$0.sourceBundleIdentifier.isEmpty })
        #expect(snapshot.provenance.isSynthetic)
    }
}

