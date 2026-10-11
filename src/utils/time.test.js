import { describe, expect, it } from "vitest";
import { SOMALIA_TIME_ZONE, toSomaliaDateTime } from "./time";

describe("Somalia time conversion", () => {
  it("converts UTC instants to Somalia wall-clock time regardless of browser zone", () => {
    const time = toSomaliaDateTime("2026-10-10T04:30:00.000Z");

    expect(time.zoneName).toBe(SOMALIA_TIME_ZONE);
    expect(time.toFormat("yyyy-MM-dd HH:mm")).toBe("2026-10-10 07:30");
  });

  it("accepts existing DateTime and Date values without changing their instant", () => {
    const date = new Date("2026-10-10T13:00:00.000Z");

    expect(toSomaliaDateTime(date).toISO()).toBe("2026-10-10T16:00:00.000+03:00");
    expect(toSomaliaDateTime(toSomaliaDateTime(date)).toMillis()).toBe(date.getTime());
  });
});
