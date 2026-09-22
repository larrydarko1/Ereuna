/**
 * Orders the sources on a pane for drawing: by z-order, and by the order they
 * were added within one.
 *
 * The sort has to be stable, because two sources at the same z-order are drawn in
 * the order the caller added them and a caller can see that.
 */
import { getNotNull } from '@/lib/charting/engine/helpers/assertions';
import { type ZOrdered } from '@/lib/charting/engine/model/chart/idata-source';

export function sortSources<T extends ZOrdered>(sources: readonly T[]): T[] {
    return sources.slice().sort((s1: ZOrdered, s2: ZOrdered) => {
        return getNotNull(s1.zorder()) - getNotNull(s2.zorder());
    });
}
