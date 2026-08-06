export function cleanTranscript(raw: string): string {
  return raw
    .replace(/\[.*?\]/g, '')
    .replace(/♪/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen).split(' ').slice(0, -1).join(' ') + '...';
}
