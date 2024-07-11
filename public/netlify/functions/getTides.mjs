import fetch from 'node-fetch';

export async function handler(event) {
    const { date } = event.queryStringParameters;

    if (!date) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Date parameter is required' })
        };
    }

    try {
        const beginDate = new Date(date);
        const endDate = new Date(beginDate);
        endDate.setDate(endDate.getDate() + 1);

        const formattedBeginDate = formatDate(beginDate);
        const formattedEndDate = formatDate(endDate);

        const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${formattedBeginDate}&end_date=${formattedEndDate}&station=8535163&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=hilo&units=english&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `HTTP error! Status: ${response.status}`, details: errorText })
            };
        }

        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch tide data', details: error.message })
        };
    }
}

const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
};
