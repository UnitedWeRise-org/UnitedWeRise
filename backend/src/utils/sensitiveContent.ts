/**
 * Detect sensitive personal/contact information without enumerating every
 * possible phone format. Numbers are normalized to digits and validated by
 * length/context; IP-like dotted quads and short numbers/dates are ignored.
 *
 * @param content - Post/comment/message body
 * @returns The reason code, or null when the content is safe
 */
export function detectSensitiveContent(content: string): 'phone' | 'email' | 'credentials' | null {
  if (!content) return null;

  // Credential-looking assignments (password: ..., login=...)
  if (/\b(?:password|login|account)\s*[:=]\s*\S+/i.test(content)) {
    return 'credentials';
  }

  // Real email addresses, but not @user@instance.social handles.
  if (/(?<![@\w.])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(content)) {
    return 'email';
  }

  const phoneKeyword = /(?:phone|call|text|mobile|cell|tel|whatsapp|signal|telegram)\b/i;
  const candidatePattern = /\+?\d[\d\s().-]{7,}\d/g;
  let match: RegExpExecArray | null;

  while ((match = candidatePattern.exec(content)) !== null) {
    const raw = match[0].trim();
    const digits = raw.replace(/\D/g, '');

    // Phone numbers are 10-15 digits; short numbers, years, and dates are ignored.
    if (digits.length < 10 || digits.length > 15) continue;

    // Ignore IPv4 addresses (192.168.100.100).
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(raw)) continue;

    const prefix = content.slice(Math.max(0, match.index - 30), match.index);
    const hasPhoneKeyword = phoneKeyword.test(prefix);
    const startsWithPlus = raw.startsWith('+');
    const startsWithInternationalZero = digits.startsWith('00') || digits.startsWith('01');
    const hasPhoneSeparators = /[().-]/.test(raw);

    if (hasPhoneKeyword || startsWithPlus || startsWithInternationalZero || hasPhoneSeparators) {
      return 'phone';
    }
  }

  return null;
}

