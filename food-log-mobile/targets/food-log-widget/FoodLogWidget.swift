import WidgetKit
import SwiftUI

// MARK: - Data models

struct FoodEntry: TimelineEntry {
    let date: Date
    let calories: Int
    let goal: Int
    let protein: Int
    let carbs: Int
    let fat: Int
    let isPlaceholder: Bool
}

struct SheetsResponse: Codable {
    let values: [[String]]?
}

// MARK: - Timeline provider

struct FoodLogProvider: TimelineProvider {

    func placeholder(in context: Context) -> FoodEntry {
        FoodEntry(date: .now, calories: 1240, goal: 2000, protein: 95, carbs: 130, fat: 42, isPlaceholder: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (FoodEntry) -> Void) {
        Task {
            let entry = (try? await fetchEntry()) ?? placeholder(in: context)
            completion(entry)
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FoodEntry>) -> Void) {
        Task {
            let entry = (try? await fetchEntry()) ?? placeholder(in: context)
            // Refresh every 15 minutes
            let next = Calendar.current.date(byAdding: .minute, value: 15, to: .now)!
            let timeline = Timeline(entries: [entry], policy: .after(next))
            completion(timeline)
        }
    }

    // MARK: - Sheets fetch

    private func fetchEntry() async throws -> FoodEntry {
        let info = Bundle.main.infoDictionary ?? [:]
        let apiKey = info["SHEETS_API_KEY"] as? String ?? ""
        let sheetId = info["SHEETS_ID"] as? String ?? ""
        let goal = Int(info["DAILY_GOAL"] as? String ?? "2000") ?? 2000

        guard !apiKey.isEmpty, !sheetId.isEmpty else {
            throw URLError(.badURL)
        }

        let range = "Sheet1!A:L".addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? "Sheet1!A:L"
        let urlStr = "https://sheets.googleapis.com/v4/spreadsheets/\(sheetId)/values/\(range)?key=\(apiKey)"
        guard let url = URL(string: urlStr) else { throw URLError(.badURL) }

        let (data, _) = try await URLSession.shared.data(from: url)
        let decoded = try JSONDecoder().decode(SheetsResponse.self, from: data)
        return parseRows(decoded.values ?? [], goal: goal)
    }

    // MARK: - Row parsing (mirrors web app logic)

    private func parseRows(_ rows: [[String]], goal: Int) -> FoodEntry {
        guard rows.count > 1 else {
            return FoodEntry(date: .now, calories: 0, goal: goal, protein: 0, carbs: 0, fat: 0, isPlaceholder: false)
        }

        let headers = rows[0].map { $0.lowercased().trimmingCharacters(in: .whitespaces) }
        func idx(_ name: String) -> Int? { headers.firstIndex(of: name.lowercased()) }

        let tsIdx    = idx("timestamp")
        let calIdx   = idx("calories")
        let protIdx  = idx("protien (g)")   // intentional typo matches sheet
        let carbIdx  = idx("carbs (g)")
        let fatIdx   = idx("fat (g)")

        let today = todayDateString()

        var totalCal = 0.0, totalProt = 0.0, totalCarb = 0.0, totalFat = 0.0

        for row in rows.dropFirst() {
            guard let ti = tsIdx, let ci = calIdx, row.count > max(ti, ci) else { continue }
            let dateStr = normalizeDate(row[ti])
            guard dateStr == today else { continue }

            totalCal  += Double(row[ci]) ?? 0
            if let pi = protIdx, row.count > pi { totalProt += Double(row[pi]) ?? 0 }
            if let cb = carbIdx, row.count > cb { totalCarb += Double(row[cb]) ?? 0 }
            if let fi = fatIdx,  row.count > fi { totalFat  += Double(row[fi]) ?? 0 }
        }

        return FoodEntry(
            date: .now,
            calories: Int(totalCal.rounded()),
            goal: goal,
            protein: Int(totalProt.rounded()),
            carbs: Int(totalCarb.rounded()),
            fat: Int(totalFat.rounded()),
            isPlaceholder: false
        )
    }

    private func todayDateString() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: .now)
    }

    private func normalizeDate(_ raw: String) -> String {
        let part = raw.trimmingCharacters(in: .whitespaces).components(separatedBy: " ").first ?? raw
        if part.contains("/") {
            let c = part.components(separatedBy: "/")
            if c.count == 3 {
                return String(format: "%04d-%02d-%02d",
                    Int(c[2]) ?? 0, Int(c[0]) ?? 0, Int(c[1]) ?? 0)
            }
        }
        return part
    }
}

// MARK: - Widget views

struct CalorieRingView: View {
    let consumed: Int
    let goal: Int

    var progress: Double { goal > 0 ? min(Double(consumed) / Double(goal), 1.0) : 0 }
    var remaining: Int { max(0, goal - consumed) }
    var overGoal: Bool { consumed > goal }
    var ringColor: Color { overGoal ? .red : .orange }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.15), lineWidth: 10)
            Circle()
                .trim(from: 0, to: CGFloat(progress))
                .stroke(ringColor, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text("\(consumed)")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundColor(ringColor)
                Text("/ \(goal)")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct MacroPill: View {
    let label: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(color)
            Text("\(value)g")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 5)
        .background(color.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: 7))
    }
}

// Small widget (systemSmall)
struct SmallWidgetView: View {
    let entry: FoodEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Food Log")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.secondary)

            CalorieRingView(consumed: entry.calories, goal: entry.goal)
                .frame(width: 80, height: 80)
                .frame(maxWidth: .infinity)

            HStack(spacing: 4) {
                MacroPill(label: "P", value: entry.protein, color: .purple)
                MacroPill(label: "C", value: entry.carbs,   color: .orange)
                MacroPill(label: "F", value: entry.fat,     color: .pink)
            }
        }
        .padding(12)
        .background(Color(red: 0.059, green: 0.09, blue: 0.161))
    }
}

// Medium widget (systemMedium)
struct MediumWidgetView: View {
    let entry: FoodEntry

    var remaining: Int { max(0, entry.goal - entry.calories) }

    var body: some View {
        HStack(spacing: 16) {
            // Ring
            CalorieRingView(consumed: entry.calories, goal: entry.goal)
                .frame(width: 100, height: 100)

            VStack(alignment: .leading, spacing: 8) {
                Text("Food Log")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.secondary)

                HStack(spacing: 16) {
                    VStack(alignment: .leading) {
                        Text("\(entry.calories)")
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundColor(.orange)
                        Text("consumed")
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                    }
                    VStack(alignment: .leading) {
                        Text("\(remaining)")
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        Text("remaining")
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                    }
                }

                HStack(spacing: 6) {
                    MacroPill(label: "Protein", value: entry.protein, color: .purple)
                    MacroPill(label: "Carbs",   value: entry.carbs,   color: .orange)
                    MacroPill(label: "Fat",     value: entry.fat,     color: .pink)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(Color(red: 0.059, green: 0.09, blue: 0.161))
    }
}

struct FoodLogWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: FoodEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// MARK: - Widget configuration

struct FoodLogWidget: Widget {
    let kind = "FoodLogWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FoodLogProvider()) { entry in
            FoodLogWidgetEntryView(entry: entry)
                .containerBackground(Color(red: 0.059, green: 0.09, blue: 0.161), for: .widget)
        }
        .configurationDisplayName("Food Log")
        .description("Daily calories and macros at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
