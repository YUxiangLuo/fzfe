import fs from "node:fs/promises";
import path from "node:path";
import type { TestInfo } from "@playwright/test";

export const writeTempCsv = async (
  testInfo: TestInfo,
  fileName: string,
  content: string,
): Promise<string> => {
  const csvPath = testInfo.outputPath(fileName);
  await fs.mkdir(path.dirname(csvPath), { recursive: true });
  await fs.writeFile(csvPath, content, "utf8");
  return csvPath;
};
