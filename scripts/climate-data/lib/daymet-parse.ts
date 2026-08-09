/**
 * Parse Daymet Single Pixel CSV responses (header metadata + daily rows).
 */

export interface DaymetHeader {
  lat: number;
  lon: number;
  elevationM: number;
  tile?: string;
  softwareVersion: string;
  citation?: string;
}

export interface DaymetDailyRow {
  year: number;
  yday: number;
  tmax: number;
  tmin: number;
  prcp: number;
  vp: number;
  srad: number;
  dayl: number;
  swe: number;
}

export interface DaymetCsvParseResult {
  header: DaymetHeader;
  rows: DaymetDailyRow[];
  rawBody: string;
}

const HEADER_LAT = /^Latitude:\s*([-\d.]+)\s+Longitude:\s*([-\d.]+)/i;
const HEADER_ELEV = /^Elevation:\s*([-\d.]+)\s*meters/i;
const HEADER_TILE = /^Tile:\s*(.+)$/i;
const HEADER_SOFT = /Daymet Software Version\s*([0-9.]+)/i;

function parseNum(v: string | undefined, field: string, line: number): number {
  if (v == null || v.trim() === "") throw new Error(`Missing ${field} at line ${line}`);
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Non-finite ${field} at line ${line}: ${v}`);
  return n;
}

export function parseDaymetCsv(raw: string): DaymetCsvParseResult {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  let lat = NaN;
  let lon = NaN;
  let elevationM = NaN;
  let tile: string | undefined;
  let softwareVersion = "unknown";
  let citation: string | undefined;
  let headerLine = -1;

  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i]!.trim();
    const latLon = HEADER_LAT.exec(line);
    if (latLon) {
      lat = Number(latLon[1]);
      lon = Number(latLon[2]);
      continue;
    }
    const elev = HEADER_ELEV.exec(line);
    if (elev) {
      elevationM = Number(elev[1]);
      continue;
    }
    const tileMatch = HEADER_TILE.exec(line);
    if (tileMatch) {
      tile = tileMatch[1]!.trim();
      continue;
    }
    const soft = HEADER_SOFT.exec(line);
    if (soft) {
      softwareVersion = soft[1]!;
      continue;
    }
    if (/^How to cite:/i.test(line)) {
      citation = line.replace(/^How to cite:\s*/i, "").trim();
      continue;
    }
    if (/^year,/i.test(line)) {
      headerLine = i;
      break;
    }
  }

  if (headerLine < 0) throw new Error("Daymet CSV missing column header row");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Daymet CSV missing Latitude/Longitude header");
  }
  if (!Number.isFinite(elevationM)) {
    throw new Error("Daymet CSV missing Elevation header");
  }

  const cols = lines[headerLine]!.split(",").map(c => c.trim().toLowerCase());
  const idx = (name: string) => {
    const i = cols.findIndex(c => c.startsWith(name));
    if (i < 0) throw new Error(`Daymet CSV missing column ${name}`);
    return i;
  };
  const iYear = idx("year");
  const iYday = idx("yday");
  const iTmax = idx("tmax");
  const iTmin = idx("tmin");
  const iPrcp = idx("prcp");
  const iVp = idx("vp");
  const iSrad = idx("srad");
  const iDayl = idx("dayl");
  const iSwe = idx("swe");

  const rows: DaymetDailyRow[] = [];
  for (let i = headerLine + 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    const parts = line.split(",");
    rows.push({
      year: parseNum(parts[iYear], "year", i + 1),
      yday: parseNum(parts[iYday], "yday", i + 1),
      tmax: parseNum(parts[iTmax], "tmax", i + 1),
      tmin: parseNum(parts[iTmin], "tmin", i + 1),
      prcp: parseNum(parts[iPrcp], "prcp", i + 1),
      vp: parseNum(parts[iVp], "vp", i + 1),
      srad: parseNum(parts[iSrad], "srad", i + 1),
      dayl: parseNum(parts[iDayl], "dayl", i + 1),
      swe: parseNum(parts[iSwe], "swe", i + 1),
    });
  }

  if (rows.length === 0) throw new Error("Daymet CSV contained no daily rows");

  return {
    header: { lat, lon, elevationM, tile, softwareVersion, citation },
    rows,
    rawBody: raw,
  };
}

export function detectCorruptDaymetPayload(raw: string): string | null {
  if (!raw || !raw.trim()) return "empty response";
  if (/error|not found|invalid/i.test(raw.slice(0, 400)) && !/^Latitude:/m.test(raw)) {
    return "error-like payload without Daymet header";
  }
  if (!/^year,/m.test(raw) && !/^Latitude:/m.test(raw)) {
    return "missing Daymet header/columns";
  }
  return null;
}
