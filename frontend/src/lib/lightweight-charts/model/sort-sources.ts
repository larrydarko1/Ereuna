import { getNotNull } from '@/lib/lightweight-charts/helpers/assertions';

import { type ZOrdered } from '@/lib/lightweight-charts/model/idata-source';

export function sortSources<T extends ZOrdered>(sources: readonly T[]): T[] {
    return sources.slice().sort((s1: ZOrdered, s2: ZOrdered) => {
        return getNotNull(s1.zorder()) - getNotNull(s2.zorder());
    });
}
