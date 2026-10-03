import fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createChart } from '@/lib/charting/engine/api/create-chart';
import { secondsToTime } from '@/lib/charting/shared/time-conversion';

describe('probe', () => {
    it('dumps the chart DOM', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        const chart = createChart(el, { width: 600, height: 400 });
        chart.addLineSeries().setData([{ time: secondsToTime(1700000000), value: 1 }]);

        const lines: string[] = [];
        const dump = (node: Element, depth: number): void => {
            lines.push(`${'  '.repeat(depth)}${node.tagName.toLowerCase()} class="${String(node.className)}"`);
            for (const child of Array.from(node.children)) dump(child, depth + 1);
        };
        dump(chart.chartElement(), 0);
        lines.push(`TouchEvent=${typeof TouchEvent} Touch=${typeof Touch} rAF=${typeof requestAnimationFrame}`);
        fs.writeFileSync('/tmp/chart-dom.txt', lines.join('\n'));
        expect(true).toBe(true);
        chart.remove();
    });
});
