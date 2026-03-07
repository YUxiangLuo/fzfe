/**
 * 检查文本是否满足最小字数要求。
 * @param text 要检查的文本。
 * @param minLength 最小字数，默认为100。
 * @returns 如果满足则返回true，否则返回false。
 */
export const checkMinLength = (text: string, minLength: number = 100): boolean => {
  // 使用正则表达式匹配中文字符和英文单词
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g)?.length || 0;
  const englishWords = text.match(/\b[a-zA-Z]+\b/g)?.length || 0;
  const totalCount = chineseChars + englishWords;
  return totalCount >= minLength;
};

/**
 * 计算文本的重复率。
 * 使用n-gram算法来评估文本的重复程度。
 * @param text 要检查的文本。
 * @param n n-gram的大小，默认为3。
 * @returns 重复率，范围在0到1之间。
 */
export const calculateRepetitionRate = (text: string, n: number = 3): number => {
  if (n <= 0 || text.length < n) {
    return 0;
  }

  const cleanedText = text.replace(/\s+/g, ''); // 移除所有空白字符
  const ngrams = new Map<string, number>();
  let totalNgrams = 0;

  for (let i = 0; i <= cleanedText.length - n; i++) {
    const ngram = cleanedText.substring(i, i + n);
    ngrams.set(ngram, (ngrams.get(ngram) || 0) + 1);
    totalNgrams++;
  }

  if (totalNgrams === 0) {
    return 0;
  }

  let repeatedNgrams = 0;
  for (const count of ngrams.values()) {
    if (count > 1) {
      repeatedNgrams += count - 1;
    }
  }

  return repeatedNgrams / totalNgrams;
};

/**
 * 验证所有分析文本框是否都已填写。
 * @param analyses 包含所有分析文本的对象。
 * @returns 如果所有字段都非空则返回true，否则返回false。
 */
export const validateAnalyses = <T extends object>(analyses: T): boolean => {
  for (const value of Object.values(analyses)) {
    if (typeof value !== 'string' || value.trim() === '') {
      return false;
    }
  }
  return true;
};
