const SHEET_ID = '15IaBLt3qavzcnBi2wRxtE1HDwaf7H-JBYNfQzxilSYU';
const RANGE = 'Sheet1!A:L';

exports.handler = async () => {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key not configured' })
        };
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: data.error?.message || 'Google Sheets API error' })
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
};
