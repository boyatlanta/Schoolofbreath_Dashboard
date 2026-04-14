import { getContentApiUrl } from '../utils/envConfig';

export interface MembershipAuditRow {
  userId: string;
  email: string;
  systemIoId: string | null;
  dbStoreActive: boolean;
  dbStoreKind: string;
  dbStoreWillRenew: boolean | null;
  dbStoreExpiresAt: string | null;
  dbSnapshotSource: string;
  dbSnapshotAt: string | null;
  dbStoreHasEverBeenActive: boolean;
  rcAvailable: boolean | null;
  rcActive: boolean | null;
  rcKind: string | null;
  rcWillRenew: boolean | null;
  rcExpiresAt: string | null;
  systemeConfigured: boolean | null;
  systemeContactId: string | null;
  systemeContactResolvedBy: string | null;
  systemeHasEnroll: boolean | null;
  systemeHasStoreTag: boolean | null;
  systemeHasCanceledTag: boolean | null;
  systemeTags: string[];
  classification: string;
  rcError: string | null;
  systemeError: string | null;
}

export interface MembershipAuditOptions {
  limit: number;
  skip: number;
  concurrency: number;
  delayMs: number;
  storeFocus: boolean;
  onlyMismatches: boolean;
}

export interface MembershipAuditData {
  options: MembershipAuditOptions;
  totalCandidates: number;
  scannedCount: number;
  returnedCount: number;
  hasMore: boolean;
  nextSkip: number;
  summary: Record<string, number>;
  rows: MembershipAuditRow[];
  durationMs: number;
}

export interface MembershipAuditParams {
  limit?: number;
  skip?: number;
  concurrency?: number;
  delayMs?: number;
  storeFocus?: boolean;
  onlyMismatches?: boolean;
}

const ADMIN_AUDIT_KEY = import.meta.env.VITE_ADMIN_DASHBOARD_API_KEY || '';
const MEMBERSHIP_AUDIT_BASE_URL = (import.meta.env.VITE_MEMBERSHIP_AUDIT_API_URL || '').trim();

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const getMembershipAuditBaseUrl = (): string => {
  if (MEMBERSHIP_AUDIT_BASE_URL) {
    return trimTrailingSlash(MEMBERSHIP_AUDIT_BASE_URL);
  }
  return trimTrailingSlash(getContentApiUrl());
};

const toBoolParam = (value: boolean | undefined): string | undefined => {
  if (typeof value !== 'boolean') return undefined;
  return value ? 'true' : 'false';
};

export const fetchMembershipAuditReport = async (
  params: MembershipAuditParams = {}
): Promise<MembershipAuditData> => {
  const query = new URLSearchParams();

  if (typeof params.limit === 'number') query.set('limit', String(params.limit));
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.concurrency === 'number') query.set('concurrency', String(params.concurrency));
  if (typeof params.delayMs === 'number') query.set('delayMs', String(params.delayMs));

  const storeFocus = toBoolParam(params.storeFocus);
  const onlyMismatches = toBoolParam(params.onlyMismatches);
  if (storeFocus) query.set('storeFocus', storeFocus);
  if (onlyMismatches) query.set('onlyMismatches', onlyMismatches);

  const url = `${getMembershipAuditBaseUrl()}/admin/membership-audit${query.toString() ? `?${query.toString()}` : ''}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (ADMIN_AUDIT_KEY) {
    headers['x-admin-key'] = ADMIN_AUDIT_KEY;
  }

  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.success === false) {
    const message = payload?.message || `Membership audit failed (${response.status})`;
    throw new Error(message);
  }

  return payload.data as MembershipAuditData;
};

const csvEscape = (value: unknown): string => {
  const stringValue = value == null ? '' : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const createMembershipAuditCsv = (rows: MembershipAuditRow[]): string => {
  const headers = [
    'userId',
    'email',
    'classification',
    'dbStoreActive',
    'dbStoreKind',
    'dbStoreHasEverBeenActive',
    'rcAvailable',
    'rcActive',
    'rcKind',
    'rcWillRenew',
    'rcExpiresAt',
    'systemeConfigured',
    'systemeContactId',
    'systemeHasEnroll',
    'systemeHasStoreTag',
    'systemeHasCanceledTag',
    'systemeTags',
    'rcError',
    'systemeError',
  ];

  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push([
      row.userId,
      row.email,
      row.classification,
      row.dbStoreActive,
      row.dbStoreKind,
      row.dbStoreHasEverBeenActive,
      row.rcAvailable,
      row.rcActive,
      row.rcKind,
      row.rcWillRenew,
      row.rcExpiresAt,
      row.systemeConfigured,
      row.systemeContactId,
      row.systemeHasEnroll,
      row.systemeHasStoreTag,
      row.systemeHasCanceledTag,
      row.systemeTags.join('|'),
      row.rcError,
      row.systemeError,
    ].map(csvEscape).join(','));
  }

  return `${lines.join('\n')}\n`;
};

export const downloadMembershipAuditCsv = (
  rows: MembershipAuditRow[],
  filename = `membership-audit-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
) => {
  const csv = createMembershipAuditCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
