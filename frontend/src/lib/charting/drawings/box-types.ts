/**
 * What a box is, shared by the tool that edits one and the geometry that
 * measures it.
 */
import { type AnchoredPoint } from '@/lib/charting/drawings/drawing-layer';

export type BoxPoint = AnchoredPoint;

export type Box = {
    id: string;
    point1: BoxPoint; // The corner clicked first
    point2: BoxPoint; // The corner clicked second, diagonally opposite
    fillColor: string;
    borderColor: string;
    fillOpacity: number;
    borderWidth: number;
    locked: boolean;
};

export type BoxCorner = 'tl' | 'tr' | 'bl' | 'br';
