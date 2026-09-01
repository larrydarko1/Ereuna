/** Decoration for the sign-in aside. */
export type InvestingQuote = {
    text: string;
    author: string;
};

export const INVESTING_QUOTES: readonly InvestingQuote[] = [
    { text: 'Price is what you pay. Value is what you get.', author: 'Warren Buffett' },
    {
        text: 'It is far better to buy a wonderful company at a fair price than a fair company at a wonderful price.',
        author: 'Warren Buffett',
    },
    { text: 'Our favorite holding period is forever.', author: 'Warren Buffett' },
    { text: 'Invest in what you know.', author: 'Peter Lynch' },
    {
        text: 'Go for a business that any idiot can run — because sooner or later, any idiot probably is going to run it.',
        author: 'Peter Lynch',
    },
    { text: 'Know what you own, and know why you own it.', author: 'Peter Lynch' },
    {
        text: 'Markets are constantly in a state of uncertainty and flux, and money is made by discounting the obvious and betting on the unexpected.',
        author: 'George Soros',
    },
    { text: 'The biggest risk is not taking any risk.', author: 'Ray Dalio' },
    { text: 'Diversify or die.', author: 'Ray Dalio' },
    {
        text: 'The most important thing is to think for yourself and not be influenced by the crowd.',
        author: 'Ray Dalio',
    },
    {
        text: 'There is nothing new in Wall Street. There can not be, because speculation is as old as the hills. Whatever happens in the stock market today has happened before and will happen again.',
        author: 'Jesse Livermore',
    },
    {
        text: 'The game of speculation is the most uniformly fascinating game in the world. But it is not a game for the stupid, the mentally lazy, or the get-rich-quick adventurer.',
        author: 'Jesse Livermore',
    },
    {
        text: 'In the short run, the market is a voting machine. In the long run, it is a weighing machine.',
        author: 'Benjamin Graham',
    },
    {
        text: 'The intelligent investor is a realist who sells to optimists and buys from pessimists.',
        author: 'Benjamin Graham',
    },
    {
        text: 'The stock investor is neither right nor wrong because others agreed or disagreed with him; he is right because his facts and analysis are right.',
        author: 'Benjamin Graham',
    },
] as const;
