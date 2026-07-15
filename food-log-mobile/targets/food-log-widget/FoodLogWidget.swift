import WidgetKit
import SwiftUI

// MARK: - Constants

/// Must match APP_GROUP in app.config.js
let appGroup = "group.com.markscheiber.foodlog"

// MARK: - Data models

struct FoodEntry: TimelineEntry {
    let date: Date
    let calories: Int
    let goal: Int
    let protein: Int
    let carbs: Int
    let fat: Int
    let isPlaceholder: Bool
    let isSignedOut: Bool
}

/// Row shape returned by PostgREST for food_logs
struct FoodLogRow: Codable {
    let calories: Int?
    let protein_g: Double?
    let carbs_g: Double?
    let fat_g: Double?
}

/// Cached payload the app writes via ExtensionStorage
struct CachedPayload: Codable {
    let calories: Int
    let goal: Int
    let protein: Int
    let carbs: Int
    let fat: Int
    let updatedAt: String
}

// MARK: - Timeline provider

struct FoodLogProvider: TimelineProvider {

    func placeholder(in context: Context) -> FoodEntry {
        FoodEntry(date: .now, calories: 1240, goal: 2000, protein: 95, carbs: 130, fat: 42,
                  isPlaceholder: true, isSignedOut: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (FoodEntry) -> Void) {
        Task {
            completion(await fetchEntry())
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FoodEntry>) -> Void) {
        Task {
            let entry = await fetchEntry()
            // Refresh every 15 minutes
            let next = Calendar.current.date(byAdding: .minute, value: 15, to: .now)!
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    // MARK: - Supabase fetch

    private func fetchEntry() async -> FoodEntry {
        let defaults = UserDefaults(suiteName: appGroup)
        let supabaseUrl = defaults?.string(forKey: "supabaseUrl") ?? ""
        let anonKey = defaults?.string(forKey: "supabaseAnonKey") ?? ""
        let accessToken = defaults?.string(forKey: "accessToken")
        let goal = (defaults?.object(forKey: "dailyGoal") as? Int) ?? 2000

        // No session yet — show the sign-in placeholder, never crash
        guard let token = accessToken, !token.isEmpty, !supabaseUrl.isEmpty, !anonKey.isEmpty else {
            return signedOutEntry(goal: goal)
        }

        do {
            let rows = try await fetchTodayRows(supabaseUrl: supabaseUrl, anonKey: anonKey, token: token)
            var cal = 0.0, prot = 0.0, carb = 0.0, fat = 0.0
            for row in rows {
                cal  += Double(row.calories ?? 0)
                prot += row.protein_g ?? 0
                carb += row.carbs_g ?? 0
                fat  += row.fat_g ?? 0
            }
            return FoodEntry(
                date: .now,
                calories: Int(cal.rounded()),
                goal: goal,
                protein: Int(prot.rounded()),
                carbs: Int(carb.rounded()),
                fat: Int(fat.rounded()),
                isPlaceholder: false,
                isSignedOut: false
            )
        } catch {
            // Token expired or offline — fall back to the payload the app cached
            if let cached = cachedEntry(defaults: defaults) {
                return cached
            }
            return signedOutEntry(goal: goal)
        }
    }

    private func fetchTodayRows(supabaseUrl: String, anonKey: String, token: String) async throws -> [FoodLogRow] {
        // Start of the local day, ISO8601 with offset, so timestamptz compares correctly
        let startOfDay = Calendar.current.startOfDay(for: .now)
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        let sinceISO = formatter.string(from: startOfDay)

        var components = URLComponents(string: "\(supabaseUrl)/rest/v1/food_logs")!
        components.queryItems = [
            URLQueryItem(name: "select", value: "calories,protein_g,carbs_g,fat_g"),
            URLQueryItem(name: "logged_at", value: "gte.\(sinceISO)"),
        ]
        guard let url = components.url else { throw URLError(.badURL) }

        var request = URLRequest(url: url)
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.userAuthenticationRequired)
        }
        return try JSONDecoder().decode([FoodLogRow].self, from: data)
    }

    private func cachedEntry(defaults: UserDefaults?) -> FoodEntry? {
        guard let raw = defaults?.string(forKey: "cachedPayload"),
              let data = raw.data(using: .utf8),
              let payload = try? JSONDecoder().decode(CachedPayload.self, from: data)
        else { return nil }
        return FoodEntry(
            date: .now,
            calories: payload.calories,
            goal: payload.goal,
            protein: payload.protein,
            carbs: payload.carbs,
            fat: payload.fat,
            isPlaceholder: false,
            isSignedOut: false
        )
    }

    private func signedOutEntry(goal: Int) -> FoodEntry {
        FoodEntry(date: .now, calories: 0, goal: goal, protein: 0, carbs: 0, fat: 0,
                  isPlaceholder: false, isSignedOut: true)
    }
}

// MARK: - Widget views

struct SignedOutView: View {
    var body: some View {
        VStack(spacing: 8) {
            Text("Food Log")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.secondary)
            Text("Open the app to sign in")
                .font(.system(size: 12))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 0.059, green: 0.09, blue: 0.161))
    }
}

struct CalorieRingView: View {
    let consumed: Int
    let goal: Int

    var progress: Double { goal > 0 ? min(Double(consumed) / Double(goal), 1.0) : 0 }
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
        if entry.isSignedOut {
            SignedOutView()
        } else {
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
