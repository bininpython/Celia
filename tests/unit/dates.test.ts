import { describe, expect, it } from "vitest";
import {
  addMonths, ageFrom, diffDays, endOfMonth, formatDate, isoToLocalDateTime, localDateTimeToISO, monthRange, todayISO,
} from "@/lib/dates";

describe("datas", () => {
  it("soma meses respeitando o último dia do mês", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });
  it("calcula diferença de dias e fim de mês", () => {
    expect(diffDays("2026-10-01", "2026-10-24")).toBe(23);
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
  });
  it("gera intervalo de competências", () => {
    expect(monthRange("2026-11-20", "2027-02-01")).toEqual(["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"]);
  });
  it("usa o fuso de São Paulo para 'hoje'", () => {
    // 02:00 UTC de 25/10 ainda é 24/10 em São Paulo (UTC-3)
    expect(todayISO(new Date("2026-10-25T02:00:00Z"))).toBe("2026-10-24");
  });
  it("formata datas puras sem deslocamento de fuso", () => {
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
    expect(formatDate(null)).toBe("—");
  });
  it("calcula idade", () => {
    expect(ageFrom("1990-10-25", "2026-10-24")).toBe(35);
    expect(ageFrom("1990-10-24", "2026-10-24")).toBe(36);
  });
  it("converte horário local da academia para UTC e de volta", () => {
    const iso = localDateTimeToISO("2026-10-24T07:30");
    expect(iso).toBe("2026-10-24T10:30:00.000Z");
    expect(isoToLocalDateTime(iso)).toBe("2026-10-24T07:30");
  });
});
