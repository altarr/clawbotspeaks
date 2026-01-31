import { describe, it, expect } from "vitest";
import { cleanForTTS, isQuestion } from "../src/voice-utils.js";

describe("cleanForTTS", () => {
  it("should remove code blocks", () => {
    const input = "Here is some code:\n```javascript\nconsole.log('hello');\n```\nThat's it.";
    const result = cleanForTTS(input);
    expect(result).not.toContain("```");
    expect(result).not.toContain("console.log");
  });

  it("should remove inline code", () => {
    const input = "Use the `console.log` function.";
    const result = cleanForTTS(input);
    expect(result).toBe("Use the console.log function.");
  });

  it("should remove bold markdown", () => {
    const input = "This is **important** text.";
    const result = cleanForTTS(input);
    expect(result).toBe("This is important text.");
  });

  it("should remove italic markdown", () => {
    const input = "This is *emphasized* text.";
    const result = cleanForTTS(input);
    expect(result).toBe("This is emphasized text.");
  });

  it("should convert markdown links to plain text", () => {
    const input = "Check out [this link](https://example.com) for more.";
    const result = cleanForTTS(input);
    expect(result).toBe("Check out this link for more.");
  });

  it("should remove plain URLs", () => {
    const input = "Visit https://example.com for more info.";
    const result = cleanForTTS(input);
    expect(result).toBe("Visit for more info.");
  });

  it("should remove markdown headers", () => {
    const input = "## Header\nSome content here.";
    const result = cleanForTTS(input);
    expect(result).toContain("Header");
    expect(result).not.toContain("##");
  });

  it("should remove bullet points", () => {
    const input = "Items:\n- First\n- Second\n- Third";
    const result = cleanForTTS(input);
    expect(result).not.toContain("-");
    expect(result).toContain("First");
  });

  it("should convert multiple newlines to periods", () => {
    const input = "First paragraph.\n\nSecond paragraph.";
    const result = cleanForTTS(input);
    expect(result).toBe("First paragraph. Second paragraph.");
  });

  it("should truncate long text", () => {
    const longText = "This is a sentence. ".repeat(50);
    const result = cleanForTTS(longText, 100);
    expect(result.length).toBeLessThanOrEqual(103); // 100 + "..."
  });

  it("should truncate at sentence boundary when possible", () => {
    const input = "First sentence here. Second sentence here. Third sentence here.";
    const result = cleanForTTS(input, 45);
    expect(result).toBe("First sentence here. Second sentence here.");
  });
});

describe("isQuestion", () => {
  it("should detect questions ending with ?", () => {
    expect(isQuestion("What is your name?")).toBe(true);
    expect(isQuestion("Hello there?")).toBe(true);
  });

  it("should detect questions starting with question words", () => {
    expect(isQuestion("How do I do this")).toBe(true);
    expect(isQuestion("What is happening")).toBe(true);
    expect(isQuestion("Why does this work")).toBe(true);
    expect(isQuestion("Can you help me")).toBe(true);
  });

  it("should not flag statements as questions", () => {
    expect(isQuestion("I want to know more.")).toBe(false);
    expect(isQuestion("Tell me about it.")).toBe(false);
  });
});
