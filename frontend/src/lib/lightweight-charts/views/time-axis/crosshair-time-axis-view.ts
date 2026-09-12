import { getNotNull } from '@/lib/lightweight-charts/helpers/assertions';
import { generateContrastColors } from '@/lib/lightweight-charts/helpers/color';

import { type IChartModelBase } from '@/lib/lightweight-charts/model/chart-model';
import {
    type Crosshair,
    CrosshairMode,
    type TimeAndCoordinateProvider,
} from '@/lib/lightweight-charts/model/crosshair';
import {
    TimeAxisViewRenderer,
    type TimeAxisViewRendererData,
} from '@/lib/lightweight-charts/renderers/time-axis-view-renderer';

import { type ITimeAxisView } from '@/lib/lightweight-charts/views/time-axis/itime-axis-view';

export class CrosshairTimeAxisView implements ITimeAxisView {
    private _invalidated = true;
    private readonly _crosshair: Crosshair;
    private readonly _model: IChartModelBase;
    private readonly _valueProvider: TimeAndCoordinateProvider;
    private readonly _renderer: TimeAxisViewRenderer = new TimeAxisViewRenderer();
    private readonly _rendererData: TimeAxisViewRendererData = {
        visible: false,
        background: '#4c525e',
        color: 'white',
        text: '',
        width: 0,
        coordinate: NaN,
        tickVisible: true,
    };

    public constructor(crosshair: Crosshair, model: IChartModelBase, valueProvider: TimeAndCoordinateProvider) {
        this._crosshair = crosshair;
        this._model = model;
        this._valueProvider = valueProvider;
    }

    public update(): void {
        this._invalidated = true;
    }

    public renderer(): TimeAxisViewRenderer {
        if (this._invalidated) {
            this._updateImpl();
            this._invalidated = false;
        }

        this._renderer.setData(this._rendererData);

        return this._renderer;
    }

    private _updateImpl(): void {
        const data = this._rendererData;
        data.visible = false;

        if (this._crosshair.options().mode === CrosshairMode.Hidden) {
            return;
        }

        const options = this._crosshair.options().vertLine;

        if (!options.labelVisible) {
            return;
        }

        const timeScale = this._model.timeScale();
        if (timeScale.isEmpty()) {
            return;
        }

        data.width = timeScale.width();

        const value = this._valueProvider();
        if (value === null) {
            return;
        }

        data.coordinate = value.coordinate;
        const currentTime = timeScale.indexToTimeScalePoint(this._crosshair.appliedIndex());
        data.text = timeScale.formatDateTime(getNotNull(currentTime));
        data.visible = true;

        const colors = generateContrastColors(options.labelBackgroundColor);
        data.background = colors.background;
        data.color = colors.foreground;
        data.tickVisible = timeScale.options().ticksVisible;
    }
}
