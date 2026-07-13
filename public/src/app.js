document.addEventListener('DOMContentLoaded', () => {
    const nextTideDiv = document.getElementById('next-tide-info');
    const previousTidesDiv = document.getElementById('previous-tides-list');
    const futureTidesDiv = document.getElementById('future-tides-list');
    const moonPhaseDiv = document.getElementById('moon-phase-info');
    const refreshBtn = document.getElementById('refresh-btn');

    let countdownIntervalId = null;

    const getMoonPhase = (date) => {
        const synodicMonth = 29.53058867;
        const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
        const daysSinceNewMoon = (date.getTime() - knownNewMoon) / 86400000;
        const phaseFraction = (((daysSinceNewMoon % synodicMonth) + synodicMonth) % synodicMonth) / synodicMonth;

        const phases = [
            { max: 0.03, name: 'New Moon', emoji: '🌑' },
            { max: 0.22, name: 'Waxing Crescent', emoji: '🌒' },
            { max: 0.28, name: 'First Quarter', emoji: '🌓' },
            { max: 0.47, name: 'Waxing Gibbous', emoji: '🌔' },
            { max: 0.53, name: 'Full Moon', emoji: '🌕' },
            { max: 0.72, name: 'Waning Gibbous', emoji: '🌖' },
            { max: 0.78, name: 'Last Quarter', emoji: '🌗' },
            { max: 0.97, name: 'Waning Crescent', emoji: '🌘' },
            { max: 1, name: 'New Moon', emoji: '🌑' },
        ];
        const phase = phases.find(p => phaseFraction <= p.max);
        const illumination = Math.round((1 - Math.cos(phaseFraction * 2 * Math.PI)) / 2 * 100);

        return { name: phase.name, emoji: phase.emoji, illumination };
    };

    const renderMoonPhase = () => {
        const moonPhase = getMoonPhase(new Date());
        moonPhaseDiv.innerHTML = `
            <div class="tide moon-card">
                <div class="moon-emoji">${moonPhase.emoji}</div>
                <div class="moon-name">${moonPhase.name}</div>
                <div class="moon-illumination">${moonPhase.illumination}% illuminated</div>
            </div>
        `;
    };

    const skeletonCard = `
        <div class="tide skeleton">
            <div class="skeleton-line skeleton-badge"></div>
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-value"></div>
        </div>
    `;

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

            const response = await fetch(
                'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=' + formattedBeginDate +
                '&end_date=' + formattedEndDate +
                '&station=8535163&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=hilo&units=english&format=json',
                { cache: 'no-store' }
            );
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching tides for ${formattedDate}:`, error);
            return { error: 'Failed to fetch tide data' };
        }
    };

    const isSameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const getDisplayParts = (datetime) => {
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

        const isNight = hours < 6 || hours >= 20;

        return {
            dateLabel: `${dayLabel} ${month}/${day}`,
            timeLabel: `${hours12}:${minutesFormatted} ${period}`,
            isNight
        };
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

    const formatTides = (data, range) => {
        if (data.error) {
            return errorCard(data.error);
        }

        if (!data.predictions || !Array.isArray(data.predictions)) {
            return errorCard('No tide predictions available.');
        }

        return data.predictions.map(prediction => {
            const isLowTide = prediction.type === 'L';
            const isHighTide = prediction.type === 'H';
            const label = isLowTide ? 'Low' : (isHighTide ? 'High' : '');
            const { dateLabel, timeLabel, isNight } = getDisplayParts(prediction.t);

            const value = Number(prediction.v);
            const heightPercent = range.maxV === range.minV
                ? 50
                : ((value - range.minV) / (range.maxV - range.minV)) * 100;
            const waterStop = 5 + (heightPercent / 100) * 80;
            const sandStop = Math.min(waterStop + 20, 100);

            return `
                <div class="tide ${isLowTide ? 'low-tide' : (isHighTide ? 'high-tide' : '')} ${isNight ? 'is-night' : ''}"
                     style="--water-stop: ${waterStop}%; --sand-stop: ${sandStop}%;">
                    <div class="tide-meta">
                        <span class="tide-date">${dateLabel}</span>
                        <span class="tide-badge">${label}</span>
                    </div>
                    <div class="tide-main">
                        <span class="tide-time">${timeLabel}</span>
                        <span class="tide-height">${value.toFixed(1)} ft</span>
                    </div>
                </div>
            `;
        }).join('');
    };

    const loadTides = async () => {
        nextTideDiv.innerHTML = skeletonCard;
        futureTidesDiv.innerHTML = skeletonCard.repeat(4);
        previousTidesDiv.innerHTML = skeletonCard.repeat(4);

        try {
            const todayData = await fetchTides(new Date());
            const allTides = todayData.predictions;

            allTides.sort((a, b) => new Date(a.t) - new Date(b.t));

            const nextTide = allTides.find(tide => new Date(tide.t) > new Date());
            const nextTideIndex = allTides.indexOf(nextTide);

            const priorTides = allTides.slice(Math.max(0, nextTideIndex - 4), nextTideIndex).reverse();
            const futureTides = allTides.slice(nextTideIndex + 1, nextTideIndex + 5);

            const heights = allTides.map(tide => Number(tide.v));
            const heightRange = { minV: Math.min(...heights), maxV: Math.max(...heights) };

            nextTideDiv.innerHTML = formatTides({ predictions: [nextTide] }, heightRange);
            previousTidesDiv.innerHTML = formatTides({ predictions: priorTides }, heightRange);
            futureTidesDiv.innerHTML = formatTides({ predictions: futureTides }, heightRange);

            const nextTideTime = new Date(nextTide.t);
            const headingEl = document.getElementById('next-tide-heading');
            const updateCountdown = () => {
                headingEl.textContent = `Next Tide ${formatCountdown(nextTideTime - new Date())}`;
            };
            updateCountdown();

            if (countdownIntervalId) clearInterval(countdownIntervalId);
            countdownIntervalId = setInterval(updateCountdown, 30000);
        } catch (error) {
            console.error('Error processing tide data:', error);
            const message = errorCard('Failed to load tide data.');
            nextTideDiv.innerHTML = message;
            previousTidesDiv.innerHTML = message;
            futureTidesDiv.innerHTML = message;
        }
    };

    const refreshAll = () => {
        renderMoonPhase();
        loadTides();
    };

    refreshBtn.addEventListener('click', refreshAll);

    refreshAll();
});
