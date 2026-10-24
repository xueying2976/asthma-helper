import CoreText
import Testing
import UIKit

struct ChineseFontTests {
    @Test @MainActor func systemFallbackContainsChineseGlyphs() {
        let text = "中文今日" as CFString
        let base = CTFontCreateWithName(UIFont.systemFont(ofSize: 16).fontName as CFString, 16, nil)
        let fallback = CTFontCreateForString(base, text, CFRange(location: 0, length: 4))
        let name = CTFontCopyPostScriptName(fallback) as String
        #expect(!name.contains("LastResort"), "Chinese glyphs require a real CJK fallback font, found \(name)")
        let chars: [UniChar] = Array("中文今日".utf16)
        var glyphs = Array(repeating: CGGlyph(0), count: chars.count)
        let supported = CTFontGetGlyphsForCharacters(fallback, chars, &glyphs, chars.count)
        #expect(supported, "System Chinese fallback font: \(CTFontCopyPostScriptName(fallback))")
    }
}
