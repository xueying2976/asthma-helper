import AeriDayCore
import HealthKit

enum HealthKitTypeRegistry {
    static let quantityTypes: [(HealthMetricKind, HKQuantityType, HKUnit)] = [
        (.respiratoryRate, HKQuantityType(.respiratoryRate), HKUnit.count().unitDivided(by: .minute())),
        (.restingHeartRate, HKQuantityType(.restingHeartRate), HKUnit.count().unitDivided(by: .minute())),
        (.oxygenSaturation, HKQuantityType(.oxygenSaturation), .percent()),
        (.stepCount, HKQuantityType(.stepCount), .count())
    ]

    static let sleepType = HKCategoryType(.sleepAnalysis)
    static let workoutType = HKObjectType.workoutType()

    static var readTypes: Set<HKObjectType> {
        var types = Set<HKObjectType>(quantityTypes.map(\.1))
        types.insert(sleepType)
        types.insert(workoutType)
        return types
    }

    static var sampleTypes: Set<HKSampleType> {
        Set(readTypes.compactMap { $0 as? HKSampleType })
    }
}

