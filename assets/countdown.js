const ARRIVAL_DAY = 5; // Friday (0 = Sunday)
const DEPARTURE_DAY = 2; // Tuesday
const RESET_DAY = 2; // Tuesday
const EVENT_HOUR = 17; // 17:00 UTC

function createUtcDate(base, day, hour = EVENT_HOUR, minute = 0, second = 0) {
  const result = new Date(Date.UTC(
    base.getUTCFullYear(),
    base.getUTCMonth(),
    base.getUTCDate(),
    hour,
    minute,
    second,
    0
  ));
  const dayDiff = day - result.getUTCDay();
  result.setUTCDate(result.getUTCDate() + dayDiff);
  return result;
}

function nextOccurrence(base, day, hour = EVENT_HOUR) {
  const result = createUtcDate(base, day, hour);
  if (result <= base) {
    result.setUTCDate(result.getUTCDate() + 7);
  }
  return result;
}

function previousOccurrence(base, day, hour = EVENT_HOUR) {
  const result = createUtcDate(base, day, hour);
  if (result > base) {
    result.setUTCDate(result.getUTCDate() - 7);
  }
  return result;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return "--:--:--";
  }
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  const pad = (value) => String(value).padStart(2, "0");
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}

export function getSchedule(now = new Date()) {
  const current = new Date(now);
  const lastArrival = previousOccurrence(current, ARRIVAL_DAY);
  const activeDeparture = addDays(lastArrival, (DEPARTURE_DAY - ARRIVAL_DAY + 7) % 7 || 7);
  activeDeparture.setUTCHours(EVENT_HOUR, 0, 0, 0);

  const isActive = current >= lastArrival && current < activeDeparture;

  const nextArrival = isActive
    ? nextOccurrence(activeDeparture, ARRIVAL_DAY)
    : nextOccurrence(current, ARRIVAL_DAY);

  const nextDeparture = isActive
    ? activeDeparture
    : addDays(nextArrival, (DEPARTURE_DAY - ARRIVAL_DAY + 7) % 7 || 7);
  nextDeparture.setUTCHours(EVENT_HOUR, 0, 0, 0);

  const nextReset = nextOccurrence(current, RESET_DAY);

  return {
    isActive,
    lastArrival,
    activeDeparture,
    nextArrival,
    nextDeparture,
    nextReset,
  };
}

export function startCountdowns() {
  const arriveLabel = document.getElementById("arriveLabel");
  const leaveLabel = document.getElementById("leaveLabel");
  const arriveValue = document.getElementById("arriveCountdown");
  const leaveValue = document.getElementById("leaveCountdown");
  const resetValue = document.getElementById("resetCountdown");

  if (!arriveValue || !leaveValue || !resetValue) {
    return;
  }

  function update() {
    const now = new Date();
    const schedule = getSchedule(now);

    const arrivalCountdown = schedule.nextArrival - now;
    const departureCountdown = schedule.nextDeparture - now;
    const resetCountdown = schedule.nextReset - now;

    if (arriveLabel) {
      arriveLabel.textContent = schedule.isActive ? "Next Arrival" : "Arrives Friday";
    }
    if (leaveLabel) {
      leaveLabel.textContent = schedule.isActive ? "Leaves Tuesday" : "Next Departure";
    }

    arriveValue.textContent = schedule.isActive
      ? "Live now"
      : formatDuration(arrivalCountdown);

    leaveValue.textContent = formatDuration(departureCountdown);
    resetValue.textContent = formatDuration(resetCountdown);
  }

  update();
  setInterval(update, 1000);
}
