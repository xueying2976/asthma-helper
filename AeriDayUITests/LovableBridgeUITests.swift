import XCTest

final class LovableBridgeUITests: XCTestCase {
    @MainActor
    func testDemoShowsSeededRecordsAcrossRelaunch() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-demo"]
        app.launch()
        XCTAssertTrue(app.webViews.buttons["Medications"].waitForExistence(timeout: 15))
        app.webViews.buttons["Medications"].tap()
        XCTAssertTrue(app.webViews.staticTexts["[DEMO] Sample inhaler A"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.webViews.staticTexts["[DEMO] Sample supply B"].exists)
        app.webViews.buttons["History"].tap()
        XCTAssertTrue(app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "[DEMO] Sample note 1")).firstMatch.waitForExistence(timeout: 5))
        app.terminate()
        app.launch()
        app.webViews.buttons["Trends"].tap()
        XCTAssertTrue(app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "DEMO — simulated sample")).firstMatch.waitForExistence(timeout: 5))
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "Demo trends"
        shot.lifetime = .keepAlways
        add(shot)
    }

    @MainActor
    func testEnglishAccessibilityAudit() throws {
        continueAfterFailure = true
        let app = XCUIApplication()
        app.launchArguments = ["-uiTestLovable", "-uiTestReset", "-uiTestLocale", "en-US", "-uiTestScenario", "insufficientData"]
        app.launch()
        XCTAssertTrue(app.webViews.buttons["Today"].waitForExistence(timeout: 15))
        // These checks inspect the actual WebKit UI, not the legacy SwiftUI root.
        // Contrast and screen-reader order still need separate visual/manual review.
        // iOS 26's WebKit hit-region audit also flags noninteractive paragraphs.
        // Measure real visible controls directly instead; retain the other audits.
        let checks: XCUIAccessibilityAuditType = [.sufficientElementDescription, .textClipped, .trait]
        for title in ["Today", "Medications", "Trends", "History", "More"] {
            app.webViews.buttons[title].tap()
            try XCTContext.runActivity(named: "Audit \(title)") { _ in
                try app.performAccessibilityAudit(for: checks)
                let web = app.webViews.firstMatch
                let controls = web.buttons.allElementsBoundByIndex + web.switches.allElementsBoundByIndex
                for control in controls where control.isHittable {
                    XCTAssertGreaterThanOrEqual(control.frame.width, 43, "\(title): \(control.label) width")
                    XCTAssertGreaterThanOrEqual(control.frame.height, 43, "\(title): \(control.label) height")
                }
            }
        }
    }

    @MainActor
    func testEnglishNavigationAndHealthControls() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-uiTestLovable", "-uiTestReset", "-uiTestLocale", "en-US", "-uiTestScenario", "insufficientData"]
        app.launch()
        XCTAssertTrue(app.webViews.buttons["Today"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.webViews.staticTexts["On this iPhone"].exists)
        XCTAssertFalse(app.webViews.staticTexts["Demo data"].exists)
        for title in ["Medications", "Trends", "History", "More", "Today"] {
            let tab = app.webViews.buttons[title]
            XCTAssertTrue(tab.exists)
            tab.tap()
        }
        XCTAssertFalse(app.webViews.buttons["Emergency steps"].exists)
        XCTAssertFalse(app.webViews.staticTexts["Action plan"].exists)
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "English Lovable Today"
        shot.lifetime = .keepAlways
        add(shot)
        app.webViews.buttons["More"].tap()
        let health = app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Apple Health")).firstMatch
        XCTAssertTrue(health.waitForExistence(timeout: 3))
        health.tap()
        XCTAssertTrue(app.webViews.buttons["Connect Apple Health"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.webViews.buttons["Refresh"].exists)
    }

    @MainActor
    func testEnglishTrialIgnoresStoredChinesePresentation() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-uiTestLovable", "-uiTestReset", "-uiTestLocale", "zh-Hans", "-uiTestScenario", "insufficientData"]
        app.launch()
        XCTAssertTrue(app.webViews.buttons["Today"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.webViews.buttons["Language / 语言"].exists)
        app.webViews.buttons["More"].tap()
        XCTAssertFalse(app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "language")).firstMatch.exists)
        app.terminate()
        app.launchArguments = ["-uiTestLovable", "-uiTestScenario", "insufficientData"]
        app.launch()
        XCTAssertTrue(app.webViews.buttons["Today"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.webViews.buttons["今日"].exists)
    }

    @MainActor
    func testMedicationReminderPersistsAndCanBeRemoved() {
        continueAfterFailure = false
        let app = XCUIApplication()
        let args = ["-uiTestLovable", "-uiTestLocale", "en-US", "-uiTestScenario", "insufficientData"]
        app.launchArguments = args + ["-uiTestReset"]
        app.launch()
        let meds = app.webViews.buttons["Medications"]
        XCTAssertTrue(meds.waitForExistence(timeout: 15))
        meds.tap()
        app.webViews.buttons["+ Add medicine"].tap()
        let name = app.webViews.textFields["Name"]
        XCTAssertTrue(name.waitForExistence(timeout: 3))
        name.tap()
        name.typeText("Bridge test supply")
        if app.toolbars.buttons["Done"].exists { app.toolbars.buttons["Done"].tap() }
        app.webViews.switches["On"].tap()
        let time = app.webViews.textFields["Reminder time (HH:MM)"]
        XCTAssertTrue(time.waitForExistence(timeout: 3))
        time.tap()
        time.typeText("08:00")
        if app.toolbars.buttons["Done"].exists { app.toolbars.buttons["Done"].tap() }
        app.webViews.buttons["Save"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Bridge test supply"].waitForExistence(timeout: 5))
        app.terminate()
        app.launchArguments = args
        app.launch()
        XCTAssertTrue(meds.waitForExistence(timeout: 15))
        meds.tap()
        XCTAssertTrue(app.webViews.staticTexts["Bridge test supply"].waitForExistence(timeout: 5))
        app.webViews.buttons["Edit"].tap()
        XCTAssertEqual(time.value as? String, "08:00")
        app.webViews.buttons["Cancel"].firstMatch.tap()
        app.webViews.buttons["More"].tap()
        let reminders = app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Medicine reminders")).firstMatch
        XCTAssertTrue(reminders.waitForExistence(timeout: 3))
        reminders.tap()
        let on = app.webViews.switches["Bridge test supply · On"]
        let off = app.webViews.switches["Bridge test supply · Off"]
        XCTAssertTrue(on.waitForExistence(timeout: 3))
        XCTAssertEqual(on.value as? String, "1")
        off.tap()
        let disabled = NSPredicate(format: "value == %@", "1")
        expectation(for: disabled, evaluatedWith: off)
        waitForExpectations(timeout: 5)
        app.webViews.buttons["Close"].firstMatch.tap()
        meds.tap()
        XCTAssertTrue(app.webViews.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Reminder Off")).firstMatch.waitForExistence(timeout: 5))
        app.webViews.buttons["Delete"].firstMatch.tap()
        app.webViews.buttons["Delete"].firstMatch.tap()
        XCTAssertTrue(app.webViews.staticTexts["No medicines added"].waitForExistence(timeout: 5))
    }

    @MainActor
    func testNotePersistsAcrossWebViewRelaunch() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-uiTestLovable", "-uiTestReset", "-uiTestLocale", "en-US", "-uiTestScenario", "insufficientData"]
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 15))
        let history = app.webViews.buttons["History"]
        XCTAssertTrue(history.waitForExistence(timeout: 15), app.debugDescription)
        history.tap()
        app.webViews.buttons["+ Add note"].tap()
        let text = app.webViews.textFields["Required"]
        XCTAssertTrue(text.waitForExistence(timeout: 3), app.debugDescription)
        text.tap()
        text.typeText("Bridge persistence test")
        if app.toolbars.buttons["Done"].exists { app.toolbars.buttons["Done"].tap() }
        app.webViews.buttons["Save"].tap()
        XCTAssertTrue(app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Bridge persistence test")).firstMatch.waitForExistence(timeout: 5))
        app.terminate()
        app.launchArguments = ["-uiTestLovable", "-uiTestLocale", "en-US", "-uiTestScenario", "insufficientData"]
        app.launch()
        XCTAssertTrue(history.waitForExistence(timeout: 15))
        history.tap()
        XCTAssertTrue(app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Bridge persistence test")).firstMatch.waitForExistence(timeout: 5))
        app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Bridge persistence test")).firstMatch.tap()
        let edit = app.webViews.textFields["Note"]
        XCTAssertTrue(edit.waitForExistence(timeout: 3))
        edit.tap()
        edit.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: "Bridge persistence test".count) + "Bridge edited note")
        if app.toolbars.buttons["Done"].exists { app.toolbars.buttons["Done"].tap() }
        app.webViews.buttons["Save"].tap()
        let edited = app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Bridge edited note")).firstMatch
        XCTAssertTrue(edited.waitForExistence(timeout: 5))
        edited.tap()
        app.webViews.buttons["Delete"].firstMatch.tap()
        app.webViews.buttons["Delete"].firstMatch.tap()
        XCTAssertTrue(app.webViews.staticTexts["No notes yet"].waitForExistence(timeout: 5))
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
