/**
 * What every axis view has in common: it can be asked to update itself.
 */
import { type IAxisRenderer } from '@/lib/charting/engine/renderers/iaxis-view-renderer';

export type IAxisView = {
    renderer(): IAxisRenderer | null;
};
