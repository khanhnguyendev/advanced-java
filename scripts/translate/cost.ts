export function projectCost(i: {
  pilot: { slug: string; zhChars: number; outputTokens: number }[];
  remainingZhChars: number;
}): { tokensPerZhChar: number; projectedOutputTokens: number } {
  if (!i.pilot.length) throw new Error('projectCost needs at least one pilot measurement');
  const chars = i.pilot.reduce((s, p) => s + p.zhChars, 0);
  const tokens = i.pilot.reduce((s, p) => s + p.outputTokens, 0);
  const tokensPerZhChar = tokens / chars;
  return { tokensPerZhChar, projectedOutputTokens: Math.round(tokensPerZhChar * i.remainingZhChars) };
}
