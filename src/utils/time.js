import { DateTime } from "luxon";

export const OPEN_HOUR = 7;
export const CLOSE_HOUR = 17;
export const SOMALIA_TIME_ZONE = "Africa/Mogadishu";

export const toSomaliaDateTime = (value) => {
  const dateTime = DateTime.isDateTime(value)
    ? value
    : DateTime.fromJSDate(value instanceof Date ? value : new Date(value));
  return dateTime.setZone(SOMALIA_TIME_ZONE);
};

export const getClockParts = (date) => {
  const d = date instanceof Date && !isNaN(date) ? date : new Date();
  return {
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
};

export const formatHoursRange = () => {
  const fmt = (h) => {
    const period = h < 12 ? "AM" : "PM";
    const hour = h % 12 || 12;
    return `${hour}:00 ${period}`;
  };
  return `${fmt(OPEN_HOUR)} – ${fmt(CLOSE_HOUR)}`;
};
