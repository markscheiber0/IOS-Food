// ============================================
// CONFIGURATION
// ============================================
const GOOGLE_API_KEY = 'AIzaSyB_s_loxgny9nE8IbIGMng13ENtP3rP684'; // Add your Google API key here
const SHEET_ID = '15IaBLt3qavzcnBi2wRxtE1HDwaf7H-JBYNfQzxilSYU';
const RANGE = 'Sheet1!A:L'; // All columns
const DAILY_GOAL = 2000;

// Dark mode colors
const COLORS = {
    primary: '#2563EB',
    secondary: '#3B82F6',
    cta: '#F97316',
    protein: '#8B5CF6',
    carbs: '#F97316',
    fat: '#EC4899',
    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1',
    bgSecondary: '#1e293b',
    border: '#475569'
};

// ============================================
// STATE
// ============================================
let chartInstances = {
    calorieRing: null,
    macroChart: null,
    trendChart: null
};

let todayData = {
    meals: [],
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0
};

let weeklyData = {};

// ============================================
// DATE UTILITIES
// ============================================
function formatDate(date) {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function getDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function initializePage() {
    document.getElementById('todayDate').textContent = formatDate(new Date());
    fetchData();
}

// ============================================
// GOOGLE SHEETS API
// ============================================
async function fetchData() {
    if (!GOOGLE_API_KEY) {
        showError('Please add your Google API key to the GOOGLE_API_KEY variable in script.js');
        return;
    }

    try {
        showLoading(true);

        const encodedRange = encodeURIComponent(RANGE);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}?key=${GOOGLE_API_KEY}`;
        console.log('Fetching from:', url);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        processSheetData(data.values);
        renderCharts();
        renderMeals();
        showLoading(false);

    } catch (error) {
        console.error('Error fetching data:', error);
        showError(`Failed to fetch data: ${error.message}`);
        showLoading(false);
    }
}

// ============================================
// DATA PROCESSING
// ============================================
function processSheetData(rows) {
    if (!rows || rows.length < 2) {
        console.error('No data in sheet or missing headers');
        return;
    }

    const headers = rows[0];
    console.log('Sheet headers found:', headers);

    // Case-insensitive header search
    const findIndex = (arr, name) => {
        return arr.findIndex(h => h && h.toLowerCase().trim() === name.toLowerCase().trim());
    };

    const today = getDateString(new Date());

    const columnMap = {
        timestamp: findIndex(headers, 'TimeStamp'),
        food: findIndex(headers, 'Food'),
        source: findIndex(headers, 'Source'),
        calories: findIndex(headers, 'Calories'),
        protein: findIndex(headers, 'Protien (g)'), // Note: typo in sheet "Protien" not "Protein"
        carbs: findIndex(headers, 'Carbs (g)'),
        fat: findIndex(headers, 'Fat (g)'),
        fiber: findIndex(headers, 'Fiber (g)'),
        sugars: findIndex(headers, 'Sugars(g)'), // Note: no space before parenthesis
        confidence: findIndex(headers, 'Confidence(0-100)'), // Note: no space before parenthesis
        aiModel: findIndex(headers, 'AI Model Used'),
        notes: findIndex(headers, 'Notes')
    };

    console.log('Column indices:', columnMap);
    console.log('Total data rows:', rows.length - 1);
    console.log('TODAY DATE STRING:', today);
    const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 6));

    // Initialize weekly data for past 7 days
    for (let i = 0; i < 7; i++) {
        const date = new Date(new Date().setDate(new Date().getDate() - i));
        const dateStr = getDateString(date);
        weeklyData[dateStr] = 0;
    }

    // Process each row
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[columnMap.timestamp] || !row[columnMap.calories]) {
            continue;
        }

        const timestamp = row[columnMap.timestamp].trim();
        console.log(`Row ${i} timestamp:`, timestamp);

        // Handle multiple date formats
        let dateStr = timestamp.split(' ')[0]; // Try YYYY-MM-DD format

        // If format is MM/DD/YYYY, convert to YYYY-MM-DD
        if (dateStr.includes('/')) {
            const [month, day, year] = dateStr.split('/');
            dateStr = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        console.log(`Row ${i} extracted date:`, dateStr, 'Today is:', today);

        const caloriesStr = String(row[columnMap.calories]).trim();
        const calories = parseFloat(caloriesStr) || 0;
        console.log(`Row ${i} calories:`, caloriesStr, '→', calories);
        const protein = parseFloat(row[columnMap.protein]) || 0;
        const carbs = parseFloat(row[columnMap.carbs]) || 0;
        const fat = parseFloat(row[columnMap.fat]) || 0;
        const sugars = parseFloat(row[columnMap.sugars]) || 0;

        // Add to weekly data
        if (weeklyData.hasOwnProperty(dateStr)) {
            weeklyData[dateStr] += calories;
        }

        // Add to today's data
        if (dateStr === today) {
            todayData.meals.push({
                timestamp,
                food: row[columnMap.food] || 'Unknown',
                source: row[columnMap.source] || '',
                calories,
                protein,
                carbs,
                fat,
                sugars,
                confidence: parseInt(row[columnMap.confidence]) || 0,
                aiModel: row[columnMap.aiModel] || '',
                notes: row[columnMap.notes] || ''
            });

            todayData.totalCalories += calories;
            todayData.totalProtein += protein;
            todayData.totalCarbs += carbs;
            todayData.totalFat += fat;
        }
    }

    // Log final data
    console.log('FINAL TODAY DATA:', todayData);
    console.log('Weekly data:', weeklyData);

    // Update UI
    updateCalorieStats();
}

function updateCalorieStats() {
    const remaining = Math.max(0, DAILY_GOAL - todayData.totalCalories);
    document.getElementById('calorieCount').textContent = Math.round(todayData.totalCalories);
    document.getElementById('calorieRemaining').textContent = remaining;
    document.getElementById('proteinValue').textContent = Math.round(todayData.totalProtein) + 'g';
    document.getElementById('carbsValue').textContent = Math.round(todayData.totalCarbs) + 'g';
    document.getElementById('fatValue').textContent = Math.round(todayData.totalFat) + 'g';
}

// ============================================
// CHARTS
// ============================================
function renderCharts() {
    renderCalorieRing();
    renderMacroChart();
    renderTrendChart();
}

function renderCalorieRing() {
    const ctx = document.getElementById('calorieRing').getContext('2d');

    if (chartInstances.calorieRing) {
        chartInstances.calorieRing.destroy();
    }

    const remaining = Math.max(0, DAILY_GOAL - todayData.totalCalories);
    const consumed = Math.min(todayData.totalCalories, DAILY_GOAL);

    chartInstances.calorieRing = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Consumed', 'Remaining'],
            datasets: [{
                data: [consumed, remaining],
                backgroundColor: [COLORS.cta, COLORS.border],
                borderColor: COLORS.bgSecondary,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: COLORS.textPrimary,
                    bodyColor: COLORS.textPrimary,
                    borderColor: COLORS.border,
                    borderWidth: 1,
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 }
                }
            }
        }
    });
}

function renderMacroChart() {
    const ctx = document.getElementById('macroChart').getContext('2d');

    if (chartInstances.macroChart) {
        chartInstances.macroChart.destroy();
    }

    chartInstances.macroChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Protein', 'Carbs', 'Fat'],
            datasets: [{
                data: [
                    todayData.totalProtein,
                    todayData.totalCarbs,
                    todayData.totalFat
                ],
                backgroundColor: [COLORS.protein, COLORS.carbs, COLORS.fat],
                borderColor: COLORS.bgSecondary,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: COLORS.textPrimary,
                    bodyColor: COLORS.textPrimary,
                    borderColor: COLORS.border,
                    borderWidth: 1,
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + Math.round(context.parsed) + 'g';
                        }
                    }
                }
            }
        }
    });
}

function renderTrendChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');

    if (chartInstances.trendChart) {
        chartInstances.trendChart.destroy();
    }

    // Sort dates and prepare data
    const sortedDates = Object.keys(weeklyData).sort().reverse();
    const labels = sortedDates.map(dateStr => {
        const [year, month, day] = dateStr.split('-');
        return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }).reverse();

    const data = sortedDates.map(dateStr => weeklyData[dateStr]).reverse();

    chartInstances.trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Daily Calories',
                data,
                borderColor: COLORS.cta,
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: COLORS.cta,
                pointBorderColor: COLORS.bgSecondary,
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }, {
                label: 'Daily Goal',
                data: Array(data.length).fill(DAILY_GOAL),
                borderColor: COLORS.primary,
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0,
                tension: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: COLORS.textSecondary,
                        font: { size: 13 },
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: COLORS.textPrimary,
                    bodyColor: COLORS.textPrimary,
                    borderColor: COLORS.border,
                    borderWidth: 1,
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: COLORS.textSecondary, font: { size: 12 } },
                    grid: { color: COLORS.border, drawBorder: false },
                    title: {
                        display: true,
                        text: 'Calories',
                        color: COLORS.textSecondary
                    }
                },
                x: {
                    ticks: { color: COLORS.textSecondary, font: { size: 12 } },
                    grid: { display: false, drawBorder: false }
                }
            }
        }
    });
}

// ============================================
// RENDERING
// ============================================
function renderMeals() {
    const mealsList = document.getElementById('mealsList');
    mealsList.innerHTML = '';

    if (todayData.meals.length === 0) {
        mealsList.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <p>No meals logged yet today</p>
            </div>
        `;
        return;
    }

    // Sort by timestamp (most recent first)
    const sortedMeals = [...todayData.meals].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    sortedMeals.forEach(meal => {
        const time = meal.timestamp.split(' ')[1]?.slice(0, 5) || '';
        const mealEl = document.createElement('div');
        mealEl.className = 'meal-item';
        mealEl.innerHTML = `
            <div class="meal-info">
                <div class="meal-food">${meal.food}</div>
                <div class="meal-meta">
                    <span>${Math.round(meal.protein)}g protein</span>
                    <span>${Math.round(meal.sugars || 0)}g sugar</span>
                </div>
            </div>
            <div class="meal-calories">
                <div class="meal-calories-value">${Math.round(meal.calories)}</div>
                <div class="meal-calories-label">cal</div>
            </div>
        `;
        mealsList.appendChild(mealEl);
    });
}

// ============================================
// UI UTILITIES
// ============================================
function showLoading(show) {
    const loader = document.getElementById('loadingSpinner');
    if (show) {
        loader.classList.add('active');
    } else {
        loader.classList.remove('active');
    }
}

function showError(message) {
    console.error(message);
    const mealsList = document.getElementById('mealsList');
    mealsList.innerHTML = `
        <div class="empty-state">
            <p style="color: #FF6B6B;">${message}</p>
        </div>
    `;
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', initializePage);
