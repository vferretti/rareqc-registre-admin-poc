/** Auto-format RAMQ input: uppercase letters (4), then digits (8), with spaces at positions 4 and 8 */
export function formatRAMQ(raw: string): string {
  const stripped = raw.replace(/[^a-zA-Z0-9]/g, "");
  let letters = "";
  let digits = "";

  for (const ch of stripped) {
    if (letters.length < 4 && /[a-zA-Z]/.test(ch)) {
      letters += ch.toUpperCase();
    } else if (digits.length < 8 && /\d/.test(ch)) {
      digits += ch;
    }
  }

  let result = letters;
  if (digits.length > 0) result += " " + digits.slice(0, 4);
  if (digits.length > 4) result += " " + digits.slice(4);
  return result;
}
