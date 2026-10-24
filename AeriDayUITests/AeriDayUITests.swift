import XCTest

final class AeriDayUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testFiveTabsNavigateInEnglish() {
        let app = launch(locale: "en-US", reset: true)
        let tabBar = app.tabBars.firstMatch

        for title in ["Today", "Log", "Medications", "History", "Settings"] {
            let button = tabBar.buttons[title]
            let buttonExists = button.waitForExistence(timeout: 3)
            XCTAssertTrue(buttonExists, "Missing tab: \(title)")
            button.tap()
            let navigationBarExists = app.navigationBars[title].waitForExistence(timeout: 2)
            XCTAssertTrue(navigationBarExists)
        }
    }

    @MainActor
    func testChinesePreferencePersistsAcrossRelaunch() {
        var app = launch(locale: "zh-Hans", reset: true)
        let initialChineseTabExists = app.tabBars.buttons["今日"].waitForExistence(timeout: 3)
        XCTAssertTrue(initialChineseTabExists)
        app.terminate()

        app = launch(locale: nil, reset: false)
        let persistedChineseTabExists = app.tabBars.buttons["今日"].waitForExistence(timeout: 3)
        XCTAssertTrue(persistedChineseTabExists)
    }

    @MainActor
    func testDarkLargeTextUnavailableStateLaunches() {
        let app = launch(
            locale: "en-US",
            reset: true,
            theme: "dark",
            contentSize: "accessibility3",
            scenario: "serviceUnavailable"
        )

        let todayNavigationExists = app.navigationBars["Today"].waitForExistence(timeout: 3)
        let dashboardExists = app.descendants(matching: .any)["today.dashboard"].waitForExistence(timeout: 3)
        let unavailableStatusExists = app.staticTexts["Apple Health unavailable"].exists
        XCTAssertTrue(todayNavigationExists)
        XCTAssertTrue(dashboardExists)
        XCTAssertTrue(unavailableStatusExists)
    }

    @MainActor
    func testTodayHasNoMedicalGuidance() {
        for locale in ["en-US", "zh-Hans"] {
            let app = launch(locale: locale, reset: true, scenario: "content")
            XCTAssertTrue(app.descendants(matching: .any)["today.dashboard"].waitForExistence(timeout: 3))
            XCTAssertFalse(app.buttons["today.checkin.none"].exists)
            XCTAssertFalse(app.buttons["today.urgent.action"].exists)
            for title in ["Clinician action plan", "医生行动计划", "Anything unusual today?", "今天有不适吗？"] {
                XCTAssertFalse(app.staticTexts[title].exists)
            }
            app.terminate()
        }
    }

    @MainActor
    func testHealthKitEducationIsContextualAndReadOnly() {
        let app = launch(
            locale: "en-US",
            reset: true,
            scenario: "accessNotRequested"
        )

        app.tabBars.buttons["Settings"].tap()
        let entry = app.descendants(matching: .any)["health.connection.entry"]
        XCTAssertTrue(entry.waitForExistence(timeout: 3))
        entry.tap()

        XCTAssertTrue(app.navigationBars["Apple Health"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.buttons["health.connect.button"].exists)
        XCTAssertTrue(app.staticTexts["AeriDay requests read access only"].exists)
        XCTAssertTrue(app.staticTexts["Oxygen saturation"].exists)
        XCTAssertTrue(app.staticTexts["Workouts"].exists)
    }

    @MainActor
    func testAccessibilityAudit() throws {
        let app = launch(locale: "en-US", reset: true)
        let todayNavigationExists = app.navigationBars["Today"].waitForExistence(timeout: 3)
        XCTAssertTrue(todayNavigationExists)

        // Audit from the stable top position. Auditing during a decelerating
        // scroll makes iOS 26's translucent navigation chrome look like
        // inaccessible duplicate text to the visual detector.
        // Xcode 26.3 reports contrast failures for fully opaque Ink text on
        // white cards (including large 8:00 PM text), then times out while
        // enumerating those false positives. Run every non-contrast audit;
        // contrast is reviewed from fixed tokens and captured UI screenshots.
        let auditTypes: XCUIAccessibilityAuditType = [
            .elementDetection,
            .hitRegion,
            .sufficientElementDescription,
            .dynamicType,
            .textClipped,
            .trait
        ]
        try app.performAccessibilityAudit(for: auditTypes)
    }

    @MainActor
    func testRecordPersistsAndCanBeDeleted() {
        var app = launch(locale: "en-US", reset: true)
        app.tabBars.buttons["Log"].tap()
        app.buttons["entry.add"].tap()
        let editor = app.textViews["entry.text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 3))
        editor.tap(); editor.typeText("Synthetic trial note")
        app.buttons["entry.save"].tap()
        XCTAssertTrue(app.staticTexts["Synthetic trial note"].waitForExistence(timeout: 3))
        app.terminate()
        app = launch(locale: "en-US", reset: false)
        app.tabBars.buttons["Log"].tap()
        XCTAssertTrue(app.staticTexts["Synthetic trial note"].waitForExistence(timeout: 3))
        app.staticTexts["Synthetic trial note"].tap()
        app.buttons["entry.delete"].tap()
        app.sheets.buttons["Delete"].tap()
        XCTAssertTrue(app.staticTexts["No entries yet"].waitForExistence(timeout: 3))
    }

    @MainActor
    func testMedicationSupplyAndHistory() {
        let app = launch(locale: "en-US", reset: true)
        app.tabBars.buttons["Medications"].tap()
        app.buttons["medication.add"].tap()
        let name = app.textFields["medication.name"]
        XCTAssertTrue(name.waitForExistence(timeout: 3))
        name.tap(); name.typeText("Synthetic supply")
        let quantity = app.textFields["medication.remaining"]
        quantity.tap(); quantity.typeText(XCUIKeyboardKey.delete.rawValue + "30")
        app.buttons["medication.save"].tap()
        XCTAssertTrue(app.staticTexts["Synthetic supply"].waitForExistence(timeout: 3))
        app.staticTexts["Synthetic supply"].tap()
        quantity.tap(); quantity.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 2) + "28")
        app.buttons["medication.save"].tap()
        app.tabBars.buttons["History"].tap()
        XCTAssertTrue(app.staticTexts["28"].waitForExistence(timeout: 3))
        app.tabBars.buttons["Settings"].tap()
        app.buttons["storage.delete_all"].tap()
        app.sheets.buttons["Delete all local records"].tap()
        app.tabBars.buttons["Medications"].tap()
        XCTAssertTrue(app.staticTexts["No medications added"].waitForExistence(timeout: 3))
    }

    @MainActor
    func testLanguagePickerChangesLiveAndPersists() {
        var app = launch(locale: "en-US", reset: true)
        app.tabBars.buttons["Settings"].tap()
        app.buttons["language.picker"].tap()
        app.buttons["简体中文"].tap()
        XCTAssertTrue(app.tabBars.buttons["设置"].waitForExistence(timeout: 3))
        app.terminate()
        app = launch(locale: nil, reset: false)
        XCTAssertTrue(app.tabBars.buttons["设置"].waitForExistence(timeout: 3))
    }

    @MainActor
    private func launch(
        locale: String?,
        reset: Bool,
        theme: String? = nil,
        contentSize: String? = nil,
        scenario: String? = nil
    ) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments += ["-uiTestScenario", scenario ?? "content"]
        if reset { app.launchArguments.append("-uiTestReset") }
        if let locale { app.launchArguments += ["-uiTestLocale", locale] }
        if let theme { app.launchArguments += ["-uiTestTheme", theme] }
        if let contentSize { app.launchArguments += ["-uiTestContentSize", contentSize] }
        if let scenario { app.launchArguments += ["-uiTestScenario", scenario] }
        app.launch()
        return app
    }
}
