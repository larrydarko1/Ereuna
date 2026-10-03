/** Whole documents for the suites that seed the Mongo double, each field the type has filled. */
import { ObjectId, type WithId } from 'mongodb';

import type { PortfolioStatsSnapshot, UserDoc } from '@ereuna/shared';

/** A user with every field set to its default for a new account; `overrides` replaces any of them. */
export function userDoc(overrides: Partial<WithId<UserDoc>> = {}): WithId<UserDoc> {
    return {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        username: 'Larry',
        usernameLower: 'larry',
        passwordHash: '',
        totpSecretEncrypted: null,
        pendingTotpSecretEncrypted: null,
        totpEnabled: false,
        recoveryCodeHashes: [],
        passwordResetRequired: false,
        language: 'en',
        theme: null,
        defaultSymbol: 'AAPL',
        hiddenSymbols: [],
        chartSettings: null,
        panels: null,
        screenerColumns: [],
        createdAt: new Date(0),
        updatedAt: new Date(0),
        lastLoginAt: null,
        passwordChangedAt: null,
        ...overrides,
    };
}

/** The statistics of a log with no closed trade in it; `overrides` replaces any of them. */
export function statsSnapshot(overrides: Partial<PortfolioStatsSnapshot> = {}): PortfolioStatsSnapshot {
    return {
        realizedPL: 0,
        realizedPLPercent: 0,
        winnerCount: 0,
        loserCount: 0,
        breakevenCount: 0,
        winnerPercent: 0,
        loserPercent: 0,
        breakevenPercent: 0,
        avgGain: 0,
        avgLoss: 0,
        avgGainAbs: 0,
        avgLossAbs: 0,
        avgPositionSize: 0,
        avgHoldTimeWinners: 0,
        avgHoldTimeLosers: 0,
        gainLossRatio: null,
        profitFactor: null,
        riskRewardRatio: null,
        sortinoRatio: null,
        totalCommission: 0,
        longCount: 0,
        shortCount: 0,
        biggestWinner: null,
        biggestLoser: null,
        tradeReturnsChart: { bins: [], medianBinIndex: -1 },
        ...overrides,
    };
}
