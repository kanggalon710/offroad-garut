import { describe, expect, it } from "vitest";

import { formatNumberInput, parseFormattedNumber } from "@/components/ui/input";

describe("CurrencyInput utils", () => {
  it("formats numbers to IDR grouped string", () => {
    expect(formatNumberInput(150000)).toBe("150.000");
    expect(formatNumberInput("500000")).toBe("500.000");
    expect(formatNumberInput(50000)).toBe("50.000");
    expect(formatNumberInput(0)).toBe("0");
    expect(formatNumberInput("")).toBe("");
  });

  it("parses formatted string correctly to pure number without decimal loss", () => {
    expect(parseFormattedNumber("150.000")).toBe(150000);
    expect(parseFormattedNumber("500.000")).toBe(500000);
    expect(parseFormattedNumber("50.000")).toBe(50000);
    expect(parseFormattedNumber("Rp 150.000")).toBe(150000);
    expect(parseFormattedNumber("")).toBe(0);
  });
});
