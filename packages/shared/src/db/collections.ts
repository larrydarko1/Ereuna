/** MongoDB document types for EreunaDB. */
import type { ObjectId } from 'mongodb';

export type UserRole = 'user' | 'admin';

export type UserDoc = {
    username: string;
    /** Lowercased `username`, uniquely indexed. Exists so a case-insensitive
     *  lookup is an equality match on an index instead of a `$regex` built from
     *  request input (which was both a ReDoS vector and unindexable). */
    usernameLower: string;
    passwordHash: string;
    role: UserRole;
    totpSecretEncrypted: string | null; // AES-256-GCM ciphertext of the TOTP secret. Never stored in plaintext
    pendingTotpSecretEncrypted: string | null; // A secret that has been generated but not yet confirmed with a valid code
    totpEnabled: boolean;
    recoveryCodeHashes: string[]; // Argon2id hashes of single-use recovery codes. The plaintext is shown once
    language: string;
    theme: string | null;
    defaultSymbol: string;
    hiddenSymbols: string[]; // Symbols the user has hidden from screener results
    chartSettings: Record<string, unknown> | null;
    panels: Record<string, unknown> | null; // Saved layouts for the two chart side panels and the watchlist panel
    screenerColumns: string[];
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    passwordChangedAt: Date | null;
};

export type RefreshTokenDoc = {
    tokenHash: string; // SHA-256 of the raw token. The client holds the only plaintext copy
    userId: ObjectId;
    familyId: string; // One family per login session — reuse detection revokes by family.
    rememberMe: boolean;
    expiresAt: Date; // Absolute session ceiling, set at login. Rotation inherits it, never extends it
    createdAt: Date;
    usedAt?: Date;
};

export type ScreenerDoc = {
    userId: ObjectId;
    name: string;
    nameLower: string; // Lowercased `name` — uniqueness per user is enforced on (userId, nameLower)
    include: boolean; // Whether the screener participates in combined results.
    filters: Record<string, ScreenerFilterValue>;
    createdAt: Date;
    updatedAt: Date;
};

export type ScreenerFilterValue = [number, number] | string[] | string | boolean;

export type WatchlistEntry = {
    ticker: string;
    exchange: string;
};

export type WatchlistDoc = {
    userId: ObjectId;
    name: string;
    nameLower: string;
    list: WatchlistEntry[];
    position: number; // Explicit ordering position, so reordering does not depend on insertion order.
    createdAt: Date;
    updatedAt: Date;
};

export type TradeAction = 'buy' | 'sell';

export type TradeDoc = {
    userId: ObjectId;
    portfolioNumber: number;
    symbol: string;
    action: TradeAction;
    shares: number;
    price: number;
    total: number;
    tradeDate: Date;
    createdAt: Date;
};

export type PositionDoc = {
    userId: ObjectId;
    portfolioNumber: number;
    symbol: string;
    shares: number;
    avgPrice: number;
    updatedAt: Date;
};

export type PortfolioStatsSnapshot = {
    realizedPL: number;
    realizedPLPercent: number;
    winnerCount: number;
    loserCount: number;
    breakevenCount: number;
    winnerPercent: number;
    loserPercent: number;
    breakevenPercent: number;
    avgGain: number;
    avgLoss: number;
    avgGainAbs: number;
    avgLossAbs: number;
    avgPositionSize: number;
    avgHoldTimeWinners: number;
    avgHoldTimeLosers: number;
    gainLossRatio: number;
    profitFactor: number;
    riskRewardRatio: number;
    sortinoRatio: number;
    biggestWinner: TradeExtreme | null;
    biggestLoser: TradeExtreme | null;
};

export type TradeExtreme = {
    ticker: string;
    amount: number;
    tradeCount: number;
};

export type PortfolioValuePoint = {
    date: string;
    value: number;
};

export type PortfolioDoc = {
    userId: ObjectId;
    number: number; // 0–9. A user gets a fixed set of portfolio slots.
    cash: number;
    baseValue: number;
    benchmarks: string[];
    stats: PortfolioStatsSnapshot | null;
    valueHistory: PortfolioValuePoint[];
    createdAt: Date;
    updatedAt: Date;
};

export type NoteDoc = {
    userId: ObjectId;
    symbol: string;
    message: string;
    createdAt: Date;
    updatedAt: Date;
};

export type ChartDrawingDoc = {
    userId: ObjectId;
    symbol: string;
    timeframe: string;
    drawings: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
};

export type AssetInfoDoc = {
    Symbol: string;
    Name?: string;
    AssetType?: string;
    Sector?: string;
    Industry?: string;
    Exchange?: string;
    Country?: string;
    Currency?: string;
    Delisted?: boolean;
    quarterlyFinancials?: Record<string, unknown>[];
    [field: string]: unknown;
};

export type OhlcvDoc = {
    Symbol: string;
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

export type SystemSettingsDoc = {
    key: string;
    maintenanceMode: boolean;
    message: string | null;
    updatedAt: Date;
};
