document.addEventListener('DOMContentLoaded', async () => {
    const nextTideDiv = document.getElementById('next-tide-info');
    const previousTidesDiv = document.getElementById('previous-tides-list');
    const futureTidesDiv = document.getElementById('future-tides-list');

    const skeletonCard = `
        <div class="tide skeleton">
            <div class="skeleton-line skeleton-badge"></div>
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-value"></div>
        </div>
    `;
    nextTideDiv.innerHTML = skeletonCard;
    futureTidesDiv.innerHTML = skeletonCard.repeat(4);
    previousTidesDiv.innerHTML = skeletonCard.repeat(4);

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const fetchTides = async (date) => {
        const formattedDate = formatDate(date);
        try {
            const beginDate = new Date(date);
        const endDate = new Date(beginDate);
        beginDate.setDate(beginDate.getDate() - 1);
        endDate.setDate(endDate.getDate() + 1);

        const formattedBeginDate = formatDate(beginDate);
        const formattedEndDate = formatDate(endDate);



    const response = await fetch('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date='+formattedBeginDate+'&end_date='+formattedEndDate+'&station=8535163&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=hilo&units=english&format=json');
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    } else{
        const json = await response.json();

        return json;
    }

        } catch (error) {
            console.error(`Error fetching tides for ${formattedDate}:`, error);
            return { error: 'Failed to fetch tide data' };
        }
    };

    const isSameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const convertDateForDisplay = (datetime) => {
        const [date, time24] = datetime.split(' ');
        const [hours, minutes] = time24.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        const minutesFormatted = String(minutes).padStart(2, '0');

        const dateObject = new Date(datetime);
        const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        let dayLabel;
        if (isSameDay(dateObject, now)) {
            dayLabel = 'Today';
        } else if (isSameDay(dateObject, tomorrow)) {
            dayLabel = 'Tomorrow';
        } else if (isSameDay(dateObject, yesterday)) {
            dayLabel = 'Yesterday';
        } else {
            dayLabel = weekday[dateObject.getDay()];
        }

        const day = dateObject.getDate();
        const month = dateObject.getMonth()+1;

        return `<span class="day-label">${dayLabel}</span> <span class="date-label">${month}/${day}</span> <span class="time-label">${hours12}:${minutesFormatted} ${period}</span>`;
    };

    const formatCountdown = (ms) => {
        if (ms <= 0) return 'Happening now';
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return hours > 0 ? `in ${hours}h ${minutes}m` : `in ${minutes}m`;
    };

    const errorCard = (message) => `
        <div class="tide error-card">
            <p>⚠️ ${message}</p>
            <button type="button" class="retry-btn" onclick="location.reload()">Retry</button>
        </div>
    `;

    const formatTides = (data) => {
        if (data.error) {
            return errorCard(data.error);
        }

        if (!data.predictions || !Array.isArray(data.predictions)) {
            return errorCard('No tide predictions available.');
        }

        return data.predictions.map(prediction => {
            const isLowTide = prediction.type === 'L';
            const isHighTide = prediction.type === 'H';
            const icon = isLowTide ? '👇' : (isHighTide ? '☝️' : '');
            const label = isLowTide ? 'Low' : (isHighTide ? 'High' : '');
            const datetime = prediction.t;
            const formattedDatetime = convertDateForDisplay(datetime);

            return `
                <div class="tide ${isLowTide ? 'low-tide' : (isHighTide ? 'high-tide' : '')}">
                    <div class="tide-badge">${icon} ${label}</div>
                    <h3>${formattedDatetime}</h3>
                    <p>${Number(prediction.v).toFixed(1)} ft</p>
                </div>
            `;
        }).join('');
    };

    const today = new Date();

    try {
        const todayData = await Promise.all([
            fetchTides(today)
        ]);


        const predictions = todayData[0].predictions;
        const allTides = predictions;

        allTides.sort((a, b) => new Date(a.t) - new Date(b.t));

        const nextTide = allTides.find(tide => new Date(tide.t) > new Date());
        const nextTideIndex = allTides.indexOf(nextTide);

        const priorTides = allTides.slice(Math.max(0, nextTideIndex - 4), nextTideIndex).reverse();
        const futureTides = allTides.slice(nextTideIndex + 1, nextTideIndex + 5);

        nextTideDiv.innerHTML = formatTides({ predictions: [nextTide] });
        previousTidesDiv.innerHTML = formatTides({ predictions: priorTides });
        futureTidesDiv.innerHTML = formatTides({ predictions: futureTides });

        const nextTideTime = new Date(nextTide.t);
        const headingEl = document.getElementById('next-tide-heading');
        const updateCountdown = () => {
            headingEl.textContent = `Next Tide ${formatCountdown(nextTideTime - new Date())}`;
        };
        updateCountdown();
        setInterval(updateCountdown, 30000);
    } catch (error) {
        console.error('Error processing tide data:', error);
        const message = errorCard('Failed to load tide data.');
        nextTideDiv.innerHTML = message;
        previousTidesDiv.innerHTML = message;
        futureTidesDiv.innerHTML = message;
    }


    function getTides(theUrl, callback){
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true);
    xmlHttp.send(null);
}


});
