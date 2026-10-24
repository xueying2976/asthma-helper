import Foundation

public struct JournalEntry: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var date: Date
    public var text: String
    public init(id: UUID = UUID(), date: Date, text: String) {
        self.id = id; self.date = date; self.text = text
    }
}

public enum SupplyUnit: String, Codable, CaseIterable, Sendable {
    case puff, tablet, capsule, item
}

public struct MedicationItem: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var name: String
    public var unit: SupplyUnit
    public var remaining: Int
    public var confirmedAt: Date
    public var reminderHour: Int?
    public var reminderMinute: Int?
    public init(id: UUID = UUID(), name: String, unit: SupplyUnit, remaining: Int,
                confirmedAt: Date, reminderHour: Int? = nil, reminderMinute: Int? = nil) {
        self.id = id; self.name = name; self.unit = unit; self.remaining = remaining
        self.confirmedAt = confirmedAt; self.reminderHour = reminderHour; self.reminderMinute = reminderMinute
    }
}

public struct SupplyChange: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var medicationID: UUID
    public var date: Date
    public var before: Int
    public var after: Int
    public init(medicationID: UUID, date: Date, before: Int, after: Int) {
        id = UUID(); self.medicationID = medicationID; self.date = date; self.before = before; self.after = after
    }
}

/// Unanswered observations remain distinct from an explicit absence.
public enum ReportedAnswer: String, Codable, CaseIterable, Sendable {
    case unknown, no, yes
}

public enum SymptomSeverity: String, Codable, CaseIterable, Sendable {
    case unknown, none, mild, moderate, severe
}

public struct SymptomCheckIn: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var date: Date
    public var cough: SymptomSeverity
    public var wheeze: SymptomSeverity
    public var chestTightness: SymptomSeverity
    public var breathlessness: SymptomSeverity
    public var respiratoryNightWaking: ReportedAnswer
    public var activityLimitation: ReportedAnswer
    public var context: String
    public var updatedAt: Date

    public init(id: UUID = UUID(), date: Date, cough: SymptomSeverity = .unknown,
                wheeze: SymptomSeverity = .unknown, chestTightness: SymptomSeverity = .unknown,
                breathlessness: SymptomSeverity = .unknown,
                respiratoryNightWaking: ReportedAnswer = .unknown,
                activityLimitation: ReportedAnswer = .unknown, context: String = "",
                updatedAt: Date? = nil) {
        self.id = id; self.date = date; self.cough = cough; self.wheeze = wheeze
        self.chestTightness = chestTightness; self.breathlessness = breathlessness
        self.respiratoryNightWaking = respiratoryNightWaking; self.activityLimitation = activityLimitation
        self.context = context; self.updatedAt = updatedAt ?? date
    }
}

public enum MedicationUsePurpose: String, Codable, CaseIterable, Sendable {
    case unknown, maintenance, relief
}

/// Explicit user-confirmed context; never inferred from inventory or reminders.
public enum MedicationRegimen: String, Codable, CaseIterable, Sendable {
    case unknown, saba, air, mart, other
}

public struct MedicationUseEvent: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var date: Date
    public var medicationID: UUID?
    public var medicationName: String
    public var purpose: MedicationUsePurpose
    public var regimen: MedicationRegimen
    public var amount: Double
    public var unit: SupplyUnit
    public var preExercise: ReportedAnswer
    public var updatedAt: Date

    public init(id: UUID = UUID(), date: Date, medicationID: UUID? = nil,
                medicationName: String, purpose: MedicationUsePurpose = .unknown,
                regimen: MedicationRegimen = .unknown, amount: Double, unit: SupplyUnit,
                preExercise: ReportedAnswer = .unknown, updatedAt: Date? = nil) {
        self.id = id; self.date = date; self.medicationID = medicationID
        self.medicationName = medicationName; self.purpose = purpose; self.regimen = regimen
        self.amount = amount; self.unit = unit; self.preExercise = preExercise
        self.updatedAt = updatedAt ?? date
    }
}

public enum PeakFlowUnit: String, Codable, CaseIterable, Sendable {
    case litresPerMinute = "L/min"
}

public struct PeakFlowEntry: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var date: Date
    public var value: Double
    public var unit: PeakFlowUnit
    public var device: String
    public var personalBest: Double?
    public var personalBestConfirmedByClinician: Bool
    public var updatedAt: Date

    public init(id: UUID = UUID(), date: Date, value: Double,
                unit: PeakFlowUnit = .litresPerMinute, device: String = "",
                personalBest: Double? = nil, personalBestConfirmedByClinician: Bool = false,
                updatedAt: Date? = nil) {
        self.id = id; self.date = date; self.value = value; self.unit = unit; self.device = device
        self.personalBest = personalBest
        self.personalBestConfirmedByClinician = personalBestConfirmedByClinician
        self.updatedAt = updatedAt ?? date
    }

    /// An unconfirmed best is retained as entered but cannot drive interpretation.
    public var percentOfConfirmedPersonalBest: Double? {
        guard personalBestConfirmedByClinician, let personalBest,
              personalBest.isFinite, personalBest > 0, value.isFinite, value > 0 else { return nil }
        return value / personalBest * 100
    }
}

public struct LocalEntries: Codable, Equatable, Sendable {
    public var version = 1
    public var notes: [JournalEntry] = []
    public var medications: [MedicationItem] = []
    public var changes: [SupplyChange] = []
    public var symptomCheckIns: [SymptomCheckIn] = []
    public var medicationUseEvents: [MedicationUseEvent] = []
    public var peakFlowEntries: [PeakFlowEntry] = []
    public init() {}

    private enum CodingKeys: String, CodingKey {
        case version, notes, medications, changes, symptomCheckIns, medicationUseEvents, peakFlowEntries
    }

    public init(from decoder: any Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        version = try values.decode(Int.self, forKey: .version)
        notes = try values.decode([JournalEntry].self, forKey: .notes)
        medications = try values.decode([MedicationItem].self, forKey: .medications)
        changes = try values.decode([SupplyChange].self, forKey: .changes)
        symptomCheckIns = try values.decodeIfPresent([SymptomCheckIn].self, forKey: .symptomCheckIns) ?? []
        medicationUseEvents = try values.decodeIfPresent([MedicationUseEvent].self, forKey: .medicationUseEvents) ?? []
        peakFlowEntries = try values.decodeIfPresent([PeakFlowEntry].self, forKey: .peakFlowEntries) ?? []
    }
}
