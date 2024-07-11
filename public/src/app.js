document.addEventListener('DOMContentLoaded', async () => {
    const nextTideDiv = document.getElementById('next-tide-info');
    const previousTidesDiv = document.getElementById('previous-tides');
    const futureTidesDiv = document.getElementById('future-tides');

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const fetchTides = async (date) => {
        const formattedDate = formatDate(date);
        try {
            const response = await fetch(`/.netlify/functions/getTides?date=${formattedDate}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error(`Error fetching tides for ${formattedDate}:`, error);
            return { error: 'Failed to fetch tide data' };
        }
    };

    const convertTo12HourTime = (datetime) => {
        const [date, time24] = datetime.split(' ');
        const [hours, minutes] = time24.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        const minutesFormatted = String(minutes).padStart(2, '0');
        return `${date} ${hours12}:${minutesFormatted} ${period}`;
    };

    const formatTides = (data) => {
        if (data.error) {
            return `<p>${data.error}</p>`;
        }

        if (!data.predictions || !Array.isArray(data.predictions)) {
            return `<p>No tide predictions available.</p>`;
        }

        return data.predictions.map(prediction => {
            const isLowTide = prediction.type === 'L';
            const isHighTide = prediction.type === 'H';
            const icon = isLowTide ? '⬇️' : (isHighTide ? '⬆️' : '');
            const datetime = prediction.t;
            const formattedDatetime = convertTo12HourTime(datetime);

            return `
                <div class="tide ${isLowTide ? 'low-tide' : (isHighTide ? 'high-tide' : '')}">
                    <h3>${formattedDatetime}</h3>
                    <p>Height: ${prediction.v} feet <span class="tide-icon">${icon}</span></p>
                </div>
            `;
        }).join('');
    };

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    try {
        const [todayData, yesterdayData, tomorrowData] = await Promise.all([
            fetchTides(today),
            fetchTides(yesterday),
            fetchTides(tomorrow)
        ]);

        const allTides = [
            ...(yesterdayData.predictions || []),
            ...(todayData.predictions || []),
            ...(tomorrowData.predictions || [])
        ];

        allTides.sort((a, b) => new Date(a.t) - new Date(b.t));

        const nextTide = allTides.find(tide => new Date(tide.t) > new Date());
        const nextTideIndex = allTides.indexOf(nextTide);

        const priorTides = allTides.slice(Math.max(0, nextTideIndex - 4), nextTideIndex).reverse();
        const futureTides = allTides.slice(nextTideIndex + 1, nextTideIndex + 5);

        nextTideDiv.innerHTML = formatTides({ predictions: [nextTide] });
        previousTidesDiv.innerHTML = formatTides({ predictions: priorTides });
        futureTidesDiv.innerHTML = formatTides({ predictions: futureTides });
    } catch (error) {
        console.error('Error processing tide data:', error);
        nextTideDiv.innerHTML = `<p>Failed to process tide data.</p>`;
        previousTidesDiv.innerHTML = `<p>Failed to process tide data.</p>`;
        futureTidesDiv.innerHTML = `<p>Failed to process tide data.</p>`;
    }
});
