import puppeteer, { type Browser } from 'puppeteer-core';
import { USER_AGENT } from './edgar';

/** EDGAR 10-K pages are huge single documents; give them room to load and print. */
const NAVIGATION_TIMEOUT_MS = 300_000;
const PRINT_TIMEOUT_MS = 600_000;

export interface PdfConverter {
  convertUrlToPdf: (url: string, outputPath: string) => Promise<void>;
  close: () => Promise<void>;
}

/**
 * One headless Chrome (the system install, via puppeteer-core) reused across
 * every filing. Printing through Chrome drops content the browser would not
 * render, which conveniently strips hidden inline XBRL markup.
 */
export const createPdfConverter = async (): Promise<PdfConverter> => {
  const browser: Browser = await puppeteer.launch({ channel: 'chrome', headless: true });

  const convertUrlToPdf = async (url: string, outputPath: string): Promise<void> => {
    const page = await browser.newPage();

    try {
      await page.setUserAgent(USER_AGENT);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: NAVIGATION_TIMEOUT_MS });
      await page.pdf({
        path: outputPath,
        format: 'letter',
        printBackground: true,
        margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
        timeout: PRINT_TIMEOUT_MS,
      });
    } finally {
      await page.close();
    }
  };

  return {
    convertUrlToPdf,
    close: () => browser.close(),
  };
};
