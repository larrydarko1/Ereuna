/**
 * Hardcoded Fund Families and Categories
 * These values are relatively stable and don't change frequently
 * Last updated: October 2025
 */

export const FUND_FAMILIES = [
    'American Century Investments',
    'American Funds',
    'Artisan Partners',
    'Avantis Investors',
    'Baillie Gifford',
    'Baron Funds',
    'BlackRock',
    'BNY Mellon',
    'Calamos Investments',
    'Columbia Threadneedle',
    'Delaware Funds',
    'Dimensional Fund Advisors',
    'Dodge & Cox',
    'Eaton Vance',
    'Federated Hermes',
    'Fidelity Investments',
    'First Eagle Investments',
    'Franklin Templeton',
    'Goldman Sachs Asset Management',
    'Hartford Funds',
    'Invesco',
    'iShares',
    'Janus Henderson',
    'JPMorgan',
    'Lord Abbett',
    'Loomis Sayles',
    'MFS Investment Management',
    'Morgan Stanley',
    'Nuveen',
    'Oakmark Funds',
    'PIMCO',
    'Principal Funds',
    'Prudential',
    'Putnam Investments',
    'Russell Investments',
    'Schwab Funds',
    'State Street',
    'T. Rowe Price',
    'The Vanguard Group',
    'TIAA',
    'Victory Capital',
    'Virtus Investment Partners',
    'Wells Fargo Asset Management',
    'WisdomTree',
].sort();

export const FUND_CATEGORIES = [
    'Allocation--15% to 30% Equity',
    'Allocation--30% to 50% Equity',
    'Allocation--50% to 70% Equity',
    'Allocation--70% to 85% Equity',
    'Allocation--85%+ Equity',
    'Alternative--Event Driven',
    'Alternative--Long/Short Equity',
    'Alternative--Macro Trading',
    'Alternative--Multi-Strategy',
    'Alternative--Other',
    'Commodities Agriculture',
    'Commodities Broad Basket',
    'Commodities Energy',
    'Commodities Focused',
    'Commodities Industrial Metals',
    'Commodities Precious Metals',
    'Communications',
    'Consumer Cyclical',
    'Consumer Defensive',
    'Corporate Bond',
    'Convertibles',
    'Cryptocurrency',
    'Derivative Income',
    'Equity Energy',
    'Equity Market Neutral',
    'Equity Precious Metals',
    'Financial',
    'Foreign Large Blend',
    'Foreign Large Growth',
    'Foreign Large Value',
    'Foreign Small/Mid Blend',
    'Foreign Small/Mid Growth',
    'Foreign Small/Mid Value',
    'Global Allocation',
    'Global Real Estate',
    'Health',
    'High Yield Bond',
    'Industrials',
    'Inflation-Protected Bond',
    'Infrastructure',
    'Intermediate Core Bond',
    'Intermediate Core-Plus Bond',
    'Intermediate Government',
    'International Bond',
    'Large Blend',
    'Large Growth',
    'Large Value',
    'Long Government',
    'Long-Short Credit',
    'Long-Short Equity',
    'Managed Futures',
    'Market Neutral',
    'Mid-Cap Blend',
    'Mid-Cap Growth',
    'Mid-Cap Value',
    'Muni California Intermediate',
    'Muni California Long',
    'Muni National Intermediate',
    'Muni National Long',
    'Muni National Short',
    'Muni New York Intermediate',
    'Muni New York Long',
    'Muni Single State Intermediate',
    'Muni Single State Long',
    'Multialternative',
    'Multicurrency',
    'Multisector Bond',
    'Natural Resources',
    'Nontraditional Bond',
    'Options Trading',
    'Other',
    'Pacific/Asia ex-Japan Stock',
    'Real Estate',
    'Short Government',
    'Short-Term Bond',
    'Small Blend',
    'Small Growth',
    'Small Value',
    'Target Date 2000-2010',
    'Target Date 2011-2015',
    'Target Date 2016-2020',
    'Target Date 2021-2025',
    'Target Date 2026-2030',
    'Target Date 2031-2035',
    'Target Date 2036-2040',
    'Target Date 2041-2045',
    'Target Date 2046-2050',
    'Target Date 2051-2055',
    'Target Date 2056-2060',
    'Target Date 2061-2065',
    'Target Date 2066+',
    'Target Date Retirement',
    'Technology',
    'Trading--Inverse Commodities',
    'Trading--Inverse Debt',
    'Trading--Inverse Equity',
    'Trading--Leveraged Commodities',
    'Trading--Leveraged Debt',
    'Trading--Leveraged Equity',
    'Trading--Miscellaneous',
    'Ultrashort Bond',
    'Utilities',
    'World Allocation',
    'World Bond',
    'World Large Stock',
    'World Small/Mid Stock',
].sort();

/**
 * Get all fund families
 */
export function getFundFamilies(): string[] {
    return [...FUND_FAMILIES];
}

/**
 * Get all fund categories
 */
export function getFundCategories(): string[] {
    return [...FUND_CATEGORIES];
}

/**
 * Search fund families by query
 */
export function searchFundFamilies(query: string): string[] {
    if (!query) return getFundFamilies();
    const lowerQuery = query.toLowerCase();
    return FUND_FAMILIES.filter(family =>
        family.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Search fund categories by query
 */
export function searchFundCategories(query: string): string[] {
    if (!query) return getFundCategories();
    const lowerQuery = query.toLowerCase();
    return FUND_CATEGORIES.filter(category =>
        category.toLowerCase().includes(lowerQuery)
    );
}
