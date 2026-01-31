/**
 * Utilities for cleaning text for text-to-speech (TTS) output
 */

// Default maximum length for TTS responses
const DEFAULT_MAX_LENGTH = 500;

/**
 * Clean text for TTS by removing markdown and formatting
 */
export function cleanForTTS(text: string, maxLength: number = DEFAULT_MAX_LENGTH): string {
  let cleaned = text;

  // Remove code blocks (``` ... ```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");

  // Remove inline code (`code`)
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // Remove bold (**text** or __text__)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");

  // Remove italic (*text* or _text_)
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");

  // Remove strikethrough (~~text~~)
  cleaned = cleaned.replace(/~~([^~]+)~~/g, "$1");

  // Remove markdown links [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove plain URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, "");

  // Remove markdown headers (# Header)
  cleaned = cleaned.replace(/^#+\s*/gm, "");

  // Remove bullet points and numbered lists
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "");
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, "");

  // Convert multiple newlines to a pause indicator (space before for separation)
  cleaned = cleaned.replace(/\n{2,}/g, " ");

  // Convert single newlines to spaces
  cleaned = cleaned.replace(/\n/g, " ");

  // Remove multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  // Clean up double periods that might occur
  cleaned = cleaned.replace(/\.{2,}/g, ".");

  // Trim whitespace
  cleaned = cleaned.trim();

  // Truncate if too long, trying to break at sentence boundary
  if (cleaned.length > maxLength) {
    cleaned = truncateAtSentence(cleaned, maxLength);
  }

  return cleaned;
}

/**
 * Truncate text at a sentence boundary if possible
 */
function truncateAtSentence(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to find a sentence boundary within the limit
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(". ");
  const lastQuestion = truncated.lastIndexOf("? ");
  const lastExclaim = truncated.lastIndexOf("! ");

  const lastBoundary = Math.max(lastPeriod, lastQuestion, lastExclaim);

  if (lastBoundary > maxLength * 0.5) {
    // Found a reasonable sentence boundary
    return text.slice(0, lastBoundary + 1).trim();
  }

  // No good boundary found, just truncate and add ellipsis
  return truncated.trim() + "...";
}

/**
 * Check if text appears to be a question
 */
export function isQuestion(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.endsWith("?") || /^(who|what|when|where|why|how|is|are|can|could|would|should|do|does|did)/i.test(trimmed);
}
