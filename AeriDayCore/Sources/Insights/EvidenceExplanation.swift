import Foundation

public struct InsightEvidenceReference: Codable, Equatable, Sendable {
    public let id: String
    public let title: String
    public let url: String
    public let limitation: String
}

/// Bundled research-preview wording, not clinical endorsement or patient-specific advice.
public struct EvidenceExplanation: Codable, Equatable, Sendable {
    public let id: String
    public let possibleMeaning: String
    public let alternatives: [String]
    public let limitations: [String]
    public let evidence: [InsightEvidenceReference]

    public static func forFinding(_ finding: ChangeFinding) -> EvidenceExplanation {
        var meaning: String
        let alternatives: [String]
        switch finding.metric {
        case .respiratoryRate:
            meaning = "A persistent increase relative to your own history may accompany a change in respiratory state. It does not establish that asthma is the cause."
            alternatives = ["Infection", "Exercise recovery", "Different measurement conditions or device"]
        case .restingHeartRate:
            meaning = "A higher resting heart rate is a nonspecific physiological observation. It cannot establish bronchoconstriction or worsening asthma."
            alternatives = ["Fever or infection", "Stress", "Recent activity", "Medication context", "Device or measurement changes"]
        case .sleepAnalysis:
            meaning = "Less device-estimated sleep is a personal change. Owner-reported respiratory night waking is more asthma-relevant than sleep duration alone; the device does not identify the reason for waking."
            alternatives = ["Schedule or travel", "Stress", "Other sleep disruption", "Missing wear or sleep-stage records"]
        case .oxygenSaturation:
            meaning = "Wrist oxygen observations are contextual measurements. An isolated low or normal reading cannot confirm or exclude a respiratory problem."
            alternatives = ["Movement", "Skin contact or circulation", "Device measurement limitations"]
        case .stepCount, .workout:
            meaning = "Activity records provide context. A change can reflect routine, recording coverage, or many health and non-health factors; no asthma conclusion is generated."
            alternatives = ["Routine or travel", "Device wear", "Recording coverage", "Other activity limitations"]
        }
        switch finding.state {
        case .insufficientData:
            meaning = "There are not enough comparable completed days for a personal change finding. Missing data is not evidence of normal health."
        case .indeterminate:
            meaning = "The reference variation is too small to standardize defensibly. Absolute differences are shown without an anomaly conclusion."
        case .baselineReviewNeeded:
            meaning = "The source or personal reference needs review before interpreting a change. No clinical conclusion is available from this state."
        case .noSustainedChangeDetected:
            meaning = "The available observations did not meet the experimental sustained-change rule. This does not establish safety or exclude illness."
        case .singleDayChange:
            meaning = "One recent day met an experimental comparison rule. This is an unconfirmed single-day observation, not a sustained change or an asthma finding. " + meaning
        default: break
        }
        return EvidenceExplanation(id: finding.explanationID, possibleMeaning: meaning, alternatives: alternatives,
                                   limitations: [
                                    "Experimental engineering comparisons; not clinically validated asthma thresholds.",
                                    "A personal reference describes recorded history, not a healthy range.",
                                    "No detected sustained change does not establish safety or exclude illness.",
                                    "Missing or incomparable days reduce what can be concluded."
                                   ], evidence: references.filter { finding.evidenceIDs.contains($0.id) })
    }

    public static let references: [InsightEvidenceReference] = [
        InsightEvidenceReference(id: "R1", title: "GINA 2026 Strategy Report",
                                 url: "https://ginasthma.org/2026-gina-strategy-report/",
                                 limitation: "Supports symptom and lung-function context; does not validate this wearable algorithm or its thresholds."),
        InsightEvidenceReference(id: "R2", title: "Kruizinga et al., ERJ 2022, 2100208",
                                 url: "https://pubmed.ncbi.nlm.nih.gov/34887326/",
                                 limitation: "Pediatric and device-specific findings cannot establish adult personal cutoffs; nocturnal heart rate is not HealthKit resting heart rate."),
        InsightEvidenceReference(id: "R3", title: "Nwaru et al., ERJ 2020, 1901872 (SABINA)",
                                 url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7160635/",
                                 limitation: "Population associations with SABA dispensing do not establish actual inhalations, personal predictions, or universal rules for ICS–formoterol regimens."),
        InsightEvidenceReference(id: "R4", title: "DIGIPREDICT study protocol, 2024",
                                 url: "https://pubmed.ncbi.nlm.nih.gov/38777583/",
                                 limitation: "A protocol motivates multimodal research but does not establish predictive effectiveness or validate this product algorithm."),
        InsightEvidenceReference(id: "R5", title: "Ryan et al., BMJ 2012, e1756",
                                 url: "https://www.bmj.com/content/344/bmj.e1756",
                                 limitation: "Mobile monitoring did not outperform supported paper monitoring in this trial; technical feasibility and more monitoring do not establish clinical benefit."),
        InsightEvidenceReference(id: "R6", title: "FDA pulse oximeter information",
                                 url: "https://www.fda.gov/consumers/consumer-updates/pulse-oximeters-and-oxygen-concentrators-what-know-about-home-oxygen-therapy",
                                 limitation: "Medical oximeter information does not validate consumer wrist readings or acute grading."),
        InsightEvidenceReference(id: "R7", title: "Apple: Authorizing access to health data",
                                 url: "https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data",
                                 limitation: "Empty results cannot distinguish denied read access from absent data; a successful query does not prove all read permissions were granted.")
    ]
}
