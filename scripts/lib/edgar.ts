/**
 * Minimal SEC EDGAR client. The SEC asks automated clients to declare who
 * they are and to stay under 10 requests per second; we send a contact
 * User-Agent and pause between calls.
 */

const USER_AGENT = 'DocSight fgclavano@gmail.com';
const REQUEST_DELAY_MS = 250;

export interface CompanySpec {
  ticker: string;
  name: string;
}

export const COMPANIES: CompanySpec[] = [
  { ticker: 'AAPL', name: 'Apple' },
  { ticker: 'NVDA', name: 'Nvidia' },
  { ticker: 'TSLA', name: 'Tesla' },
  { ticker: 'MSFT', name: 'Microsoft' },
  { ticker: 'AMZN', name: 'Amazon' },
  { ticker: 'DIS', name: 'Disney' },
  { ticker: 'NFLX', name: 'Netflix' },
  { ticker: 'NKE', name: 'Nike' },
  { ticker: 'MCD', name: "McDonald's" },
  { ticker: 'JPM', name: 'JPMorgan Chase' },
];

export interface Filing {
  ticker: string;
  cik: string;
  form: string;
  filingDate: string;
  url: string;
}

interface TickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

interface SubmissionsResponse {
  filings: {
    recent: {
      form: string[];
      accessionNumber: string[];
      primaryDocument: string[];
      filingDate: string[];
    };
  };
}

const pause = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const fetchEdgarJson = async <T>(url: string): Promise<T> => {
  await pause(REQUEST_DELAY_MS);

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  if (!response.ok) {
    throw new Error(`EDGAR request failed: ${response.status} ${response.statusText} for ${url}`);
  }

  return (await response.json()) as T;
};

let tickerTablePromise: Promise<Record<string, TickerEntry>> | null = null;

const loadTickerTable = (): Promise<Record<string, TickerEntry>> => {
  tickerTablePromise ??= fetchEdgarJson<Record<string, TickerEntry>>('https://www.sec.gov/files/company_tickers.json');
  return tickerTablePromise;
};

const resolveCik = async (ticker: string): Promise<string> => {
  const table = await loadTickerTable();
  const entry = Object.values(table).find(candidate => candidate.ticker === ticker);

  if (!entry) {
    throw new Error(`Ticker ${ticker} not found in the EDGAR company table`);
  }

  return String(entry.cik_str).padStart(10, '0');
};

/** Finds the company's most recent 10-K and builds the primary document URL. */
export const findLatestTenK = async (ticker: string): Promise<Filing> => {
  const cik = await resolveCik(ticker);
  const submissions = await fetchEdgarJson<SubmissionsResponse>(`https://data.sec.gov/submissions/CIK${cik}.json`);
  const { form, accessionNumber, primaryDocument, filingDate } = submissions.filings.recent;
  const index = form.findIndex(candidate => candidate === '10-K');

  if (index === -1) {
    throw new Error(`No recent 10-K found for ${ticker}`);
  }

  const accession = accessionNumber[index].replaceAll('-', '');

  return {
    ticker,
    cik,
    form: form[index],
    filingDate: filingDate[index],
    url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession}/${primaryDocument[index]}`,
  };
};

export { USER_AGENT };
