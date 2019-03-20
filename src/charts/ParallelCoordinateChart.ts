declare var zrender: any;
import * as d3 from 'd3';
import Bus from '@/charts/event-bus';
import { CombinationData } from '@/models/targeting';
import { sorter } from './CombinationTargetChart';
import { ScaleLinear, ScalePoint, line, ScaleLogarithmic, lab } from 'd3';
import { throttle } from '@/utils/optimize';

export interface LineDatum {
    name: string;
    points: number[][];
}

// ################ 普通Line z: 10, filteredLine z : 50, activeLine z: 100

export type Indexes = Array<keyof CombinationData>

export default class ParallelCoordinateChart {
    zr!: any;
    width: number = 0;
    height: number = 0;
    cWidth: number = 0;
    cHeight: number = 0;
    marginLeft: number = 50;
    marginRight: number = 70;
    marginTop: number = 50;
    worker: any = null;
    activeLine: any = null;
    container: any = new zrender.Group();
    lineContainer: any = new zrender.Group();
    axisContainer: any = new zrender.Group();
    hoverContainer: any = new zrender.Group();
    brushHoverContainer: any = new zrender.Group();
    map: Map<string, any> = new Map();


    customLine: Element = document.createElement('custom-line');
    customAxis: Element = document.createElement('custom-axis');

    data: CombinationData[] = [];
    lines: any = [];
    axises: Indexes = []
    defaultSorter: sorter = 'freq';
    axisScale: any = null;
    yScales: any = {};
    yBrushes: any = {};
    yFormats: any = {};

    globalLineOpacity: number = 1;
    detailLineOpacity: number = 0.2;

    bins: any = null;
    mode!: string;
    constructor(public dom: string) {
        this.zr = zrender.init(document.querySelector(dom));
        this.zr.add(this.container);
        this.container.add(this.hoverContainer);
        this.container.add(this.brushHoverContainer);
        this.container.add(this.axisContainer);
        this.container.add(this.lineContainer);
        this.resize();
    }
    resize() {
        this.zr.resize();
        this.height = this.zr.getHeight();
        this.width = this.zr.getWidth();
        this.cHeight = this.height - this.marginTop * 2;
        this.cWidth = this.width - this.marginLeft - this.marginRight;
        this.container.attr('position', [this.marginLeft + 0.5, this.marginTop + 0.5]);
    }
    loadData(data: CombinationData[], axises: any, mode: string, activeCmb: any, brushCmbs: any) {
        this.data = data;
        if (mode === 'Detail') {
            let realAxies = axises.slice();
            realAxies.splice(realAxies.indexOf('freq'), 1);
            this.axises = realAxies
        } else
            this.axises = axises;
        this.activeLine = activeCmb;
        this.yBrushes = brushCmbs == null ? {} : brushCmbs.brushes;
        this.preprocess();
        this.mode = mode;
        this.update();
    }
    preprocess() {
        if (this.data == null) return;
        // let axises = this.axisScale.domain();
        let keys = Object.keys(this.data[0]);
        this.data.forEach((d: any) => {
            for (let key of keys) {
                if (key === 'index' || key === 'cmbtargets')
                    continue;
                let value = +d[key];
                if (Number.isInteger(value)) continue;
                if (key === 'ctr') value = +value.toFixed(5);
                else value = +value.toFixed(3);
                d[key] = value;
            }
        });
    }
    update() {
        this.axisScale = d3.scalePoint().domain(this.axises).rangeRound([0, this.cWidth]);
        this.computeAxis(this.data);
        this.buildAxis();
        this.lines = this.computeLine(this.data);
        this.paint(this.lines);
        // }
        this.resolveState();
        this.zr.refresh();
    }

    computeAxis(data: CombinationData[]) {
        let axises = this.axisScale.domain();
        axises.forEach((axis: string) => {
            let values = data.map((d: any) => d[axis]);
            let maxValue = values.reduce((prev: number, next: number) => Math.max(prev, next), -1);
            let minValue = values.reduce((prev: number, next: number) => Math.min(prev, next), Number.MAX_SAFE_INTEGER);
            let scale: any = null;
            if (this.mode === 'Global' || ['ctr', 'cpc', 'ecpm'].indexOf(axis) !== -1)
                scale = d3.scaleLinear().domain([0, maxValue]).nice().rangeRound([this.cHeight, 0]);
            else {
                if (minValue < 1) minValue = 1;
                scale = d3.scaleLog().clamp(true).base(100).domain([minValue, maxValue]).nice().rangeRound([this.cHeight, 0]);
            }

            this.yScales[axis] = scale;
        });
    }

    computeLine(data: CombinationData[]) {

        let lines: Array<LineDatum> = [];
        let axises = this.axisScale.domain() as Indexes;
        data.forEach((d) => {
            let result = this.lineGenerator(d, axises);
            lines.push(result);
        });
        return lines;
    }
    lineGenerator(d: CombinationData, axises: Indexes) {
        let points: any[] = [];
        axises.forEach((axis) => {
            let scale = this.yScales[axis];
            let point = [this.axisScale(axis), scale(d[axis])];
            points.push(point);
        });
        return Object.assign({ name: d.cmbtargets, points, raw: d });
    }
    buildAxis() {
        let axises = this.axisScale.domain();
        let axisHeight = this.cHeight;
        let updates = d3.select(this.customAxis).selectAll('.axis').data(axises, (d: any) => d);
        let enters = updates.enter().append('custom').classed('axis', true);
        let exits = updates.exit();

        exits.each(d => {
            let axis = this.axisContainer.childOfName(d);
            this.axisContainer.remove(axis);
        });
        exits.remove();
        enters.each(d => {
            let x = this.axisScale(d);
            let group = new zrender.Group({ position: [x, 0], name: d });
            let axisLine = new zrender.Line({
                z: 30,
                name: 'axis-line',
                shape: { x1: 0, y1: 0, x2: 0, y2: axisHeight },
                style: { lineWidth: 2, fill: '#000', text: d[0].toUpperCase() + d.substring(1), textAlign: 'center', textPosition: [0, -30] }
            });
            let ticksGroup = this.buildTicks(d);
            let brushYGroup = this.buildBrushY(d);
            group.add(axisLine);
            group.add(ticksGroup);
            group.add(brushYGroup);
            this.axisContainer.add(group);
        });

        updates.each(d => {
            let axisGroup = this.axisContainer.childOfName(d);
            let x = this.axisScale(d);
            let ticksGroup = axisGroup.childOfName('ticks');
            axisGroup.remove(ticksGroup);
            ticksGroup = this.buildTicks(d);
            axisGroup.add(ticksGroup);
            axisGroup.childOfName('axis-line').attr('style', { textFill: '#000' });
            let brushGroup = axisGroup.childOfName('brush-y');
            axisGroup.remove(brushGroup);
            brushGroup = this.buildBrushY(d);
            axisGroup.add(brushGroup);
            axisGroup.animateTo({ position: [x, 0] });
        });
    }

    filterDataByBrush() {
        let keys = Object.keys(this.yBrushes).filter(key => this.yBrushes[key] != null);
        let filteredData: any[] = [];
        this.data.forEach((d: any) => {
            let result = keys.every(key => {
                let scale = this.yScales[key];
                let pos = scale(d[key]);
                return pos <= this.yBrushes[key][1] && pos >= this.yBrushes[key][0];
            });
            if (result === true) filteredData.push(Object.assign({}, d));
        });
        return filteredData;
    }

    buildBrushY(name: string) {

        let brush = this.yBrushes[name];

        let height = brush == null ? 0 : brush[1] - brush[0];
        let originPosY = brush == null ? 0 : brush[0];

        let group = new zrender.Group({ name: 'brush-y' });
        let extent = new zrender.Rect({
            shape: { x: -10, y: 0, width: 20, height: this.cHeight },
            style: { fill: '#000', stroke: 'transparent', opacity: 0.1 },
            invisible: true,
            z: 40
        });

        extent.on('mouseover', () => {
            extent.attr('invisible', false);
        });
        extent.on('mouseout', () => {
            extent.attr('invisible', true);
        });

        let selectionGroup = new zrender.Group({ name: 'selection', position: [0, originPosY] });



        let selectionRect = new zrender.Rect({
            shape: { x: -10, y: 0, width: 20, height: height },
            invisible: brush == null ? true : false,
            style: { fill: 'transparent', stroke: '#000', lineDash: [5, 5], lineWidth: 1 },
            name: 'selection-rect',
            cursor: 'move',
            z: 50
        });

        selectionRect.on('mousedown', (ev: any) => {
            let originPos = this.adjustY(ev.offsetY);
            let dist = originPos - selectionGroup.position[1];
            let selectionRectHeight = selectionRect.shape.height;
            let onMouseMove = (ev: any) => {

                let currentY = this.adjustY(ev.offsetY);
                let newPos = currentY - dist;
                newPos = newPos < 0 ? 0 : newPos;
                newPos = newPos > this.cHeight - selectionRectHeight ? this.cHeight - selectionRectHeight : newPos;
                selectionGroup.attr('position', [0, newPos])
                let [x, y] = [selectionGroup.position[1], selectionRect.shape.height];
                if (y > 0) {
                    this.yBrushes[name] = [x, x + y];
                    // let scale = this.yScales[name];
                    // let format = this.yFormats[name];
                    // let [upper, lower] = [format(scale.invert(x)), format(scale.invert(x + y))];
                    let brushGroup = this.axisContainer.childOfName(name)
                    brushGroup.childOfName('axis-line').attr('style', { textFill: '#409EFF' });
                }
                else {
                    this.yBrushes[name] = null;
                    this.axisContainer.childOfName(name).childOfName('axis-line').attr('style', { textFill: '#000' });
                }
                this.handleBrush();
            };
            onMouseMove = throttle(50, onMouseMove, this);
            let onMouseUp = () => {
                this.zr.dom.removeEventListener('mousemove', onMouseMove);
                this.zr.dom.removeEventListener('mouseup', onMouseUp);
            };
            this.zr.dom.addEventListener('mousemove', onMouseMove);
            this.zr.dom.addEventListener('mouseup', onMouseUp);
        });

        selectionGroup.add(selectionRect);
        let onMouseDown = (ev: any) => {
            this.yBrushes[name] = null;
            if (this.activeLine != null) {
                Bus.$emit('alert-select-cmb');
                return;
            }
            let y = this.adjustY(ev.offsetY);
            selectionRect.attr('invisible', true).attr('shape', { height: 0 });
            this.handleBrush();
            let onMouseMove = (ev: any) => {
                let currentY = this.adjustY(ev.offsetY);
                let height = currentY - y;
                selectionRect.attr('invisible', false);
                // 向下刷选
                if (height >= 1) {
                    if (height + y >= this.cHeight) height = this.cHeight - y;
                    selectionGroup.attr('position', [0, y]);
                    selectionRect.attr('shape', { height: height });

                } else {
                    // 向上刷选
                    height = -height;
                    let groupY = y - height;
                    if (groupY <= 0) {
                        groupY = 0;
                        height = y - groupY;
                    }
                    selectionGroup.attr('position', [0, groupY]);
                    selectionRect.attr('shape', { height: height });
                    selectionRect.attr('invisible', false);
                }
            };
            let onMouseUp = (ev: any) => {
                // if (selectionRect.shape.height <= 5) selectionRect.attr('shpae', { height: 0 }).attr('invisible', true);
                let [x, y] = [selectionGroup.position[1], selectionRect.shape.height];
                if (y > 0) {
                    this.yBrushes[name] = [x, x + y];
                    // let scale = this.yScales[name];
                    // let format = this.yFormats[name];
                    // let [upper, lower] = [format(scale.invert(x)), format(scale.invert(x + y))];
                    // let brushGroup = this.axisContainer.childOfName(name)
                    // brushGroup.childOfName('axis-line').attr('style', { textFill: '#409EFF' });
                    // this.axisContainer.childOfName(name).childOfName('ticks').hide();
                }
                else {
                    this.yBrushes[name] = null;
                    // this.axisContainer.childOfName(name).childOfName('axis-line').attr('style', { textFill: '#000' });
                    // this.axisContainer.childOfName(name).childOfName('ticks').show();
                }

                this.handleBrush();
                this.zr.dom.removeEventListener('mousemove', onMouseMove);
                this.zr.dom.removeEventListener('mouseup', onMouseUp);
            };
            this.zr.dom.addEventListener('mousemove', onMouseMove);
            this.zr.dom.addEventListener('mouseup', onMouseUp);
        };

        extent.on('mousedown', onMouseDown);
        group.add(selectionGroup)
        group.add(extent);
        return group;
    }

    dispose() {
        this.zr.dispose();
    }

    showBrushValue() {
        let brushes = Object.keys(this.yBrushes)
        brushes.forEach(brush => {
            let axisGroup = this.axisContainer.childOfName(brush)
            let group = axisGroup.childOfName('brush-y').childOfName('selection');
            let labelGroup = group.childOfName('labels');
            if (labelGroup == null) {
                labelGroup = new zrender.Group({ name: 'labels' });
                group.add(labelGroup);
            }
            labelGroup.removeAll();
            axisGroup.childOfName('ticks').show();
            axisGroup.childOfName('axis-line').attr('style', { textFill: '#000' });
            if (this.yBrushes[brush] == null) return;
            axisGroup.childOfName('ticks').hide();
            axisGroup.childOfName('axis-line').attr('style', { textFill: '#409EFF' })
            let scale = this.yScales[brush];
            let format = this.yFormats[brush];
            let [lower, upper] = [scale.invert(this.yBrushes[brush][1]), scale.invert(this.yBrushes[brush][0])];

            if (brush === 'freq' || brush === 'cost' || brush === 'expo' || brush === 'click') {
                lower = Math.round(lower);
                upper = Math.round(upper);
            }

            let selectionRect = group.childOfName('selection-rect').shape['height'];
            let upperLabel = new zrender.Text({
                style: { text: format(upper), textAlign: 'left', textVerticalAlign: 'bottom' },
                position: [20, -5]
            });
            let lowerLabel = new zrender.Text({
                style: { text: format(lower), textAlign: 'left', textVerticalAlign: 'top' },
                position: [20, selectionRect + 5]
            });
            labelGroup.add(upperLabel);
            labelGroup.add(lowerLabel);
        });
    }

    handleBrush(canEmit: boolean = true) {
        // 如果是Dedail模式下筛选,则不应该发送选中消息
        if (this.mode === 'Detail') canEmit = false;
        let hasBrush = Object.values(this.yBrushes).some((item: any) => item != null);
        if (hasBrush === true) {

            let filteredData = this.filterDataByBrush();
            this.addHover(filteredData);
            this.toggleHighlight(false);
            if (canEmit === true)
                Bus.$emit('cmbs-brush', Object.assign({ data: filteredData.map((item: any) => item.cmbtargets), brushes: this.yBrushes }));
        } else {
            this.removeHover();
            if (canEmit === true)
                Bus.$emit('cmbs-brush', null);
            if (this.activeLine != null) return;
            else this.toggleHighlight(true);
        }
        this.showBrushValue();

    }

    removeHover() {
        this.brushHoverContainer.removeAll();
    }

    addHover(data: any[]) {
        this.removeHover();
        let lines = data.map((d: any) => {
            let axises = this.axisScale.domain();
            return this.lineGenerator(d, axises);
        });
        lines.forEach((lineData: any) => {
            let line = new zrender.Polyline({
                shape: { points: lineData.points },
                style: { opacity: 1, stroke: '#c23531' },
                z: 50
            });
            this.brushHoverContainer.add(line);
        });
        this.toggleHighlight(false);
    }

    buildTicks(d: string) {
        let format: any = null;
        if (d !== 'ctr') format = d3.format("~s");
        else format = d3.format("~%");

        this.yFormats[d] = format;

        let scale = this.yScales[d];
        let domain = scale.domain();
        let ticks = scale.ticks(5);
        if (ticks[ticks.length - 1] < domain[1]) ticks.push(domain[1]);
        let ticksGroup = new zrender.Group({ name: 'ticks' });
        if (ticks == null) return;
        ticks.forEach((t: any) => {
            let pos = scale(t);
            let text = format(t);
            let tick = new zrender.Line({
                z: 60,
                shape: { x1: -4, y1: pos, x2: 0, y2: pos },
                style: { fill: '#000', lineWidth: 2, text: text, textVerticalAlign: 'middle', textAlign: 'right', textPosition: [-5, 0] }
            });
            ticksGroup.add(tick);
        });
        return ticksGroup;
    }

    adjustY(offsetY: number) {
        return offsetY - this.marginTop;
    }

    paint(data: any[]) {
        this.lineContainer.removeAll();
        let opacity = this.mode === 'Global' ? this.globalLineOpacity : this.detailLineOpacity;
        data.forEach((d, i) => {
            let polyline = new zrender.Polyline({
                shape: { points: d.points },
                style: { lineWidth: 1, stroke: '#d94e5d', opacity: opacity },
                name: 'line-' + d.name,
                z: 10
            });
            this.lineContainer.add(polyline);
        });
        this.lineContainer.attr('active', true);
    }

    resolveState() {
        if (this.activeLine != null) {
            this.activate(this.activeLine.cmbtargets);
        }
        else {
            this.deactivate();
        }
        let hasBrush = Object.values(this.yBrushes).some(brush => brush != null);
        if (hasBrush === false) {
            this.removeHover();
        }
        else {
            let filteredData = this.filterDataByBrush();
            this.addHover(filteredData);
        }
    }

    // addLine(selectedCmb: any | null) {
    //     if (selectedCmb != null) this.activate(selectedCmb.cmbtargets);
    //     else this.deactivate();
    // }

    activate(name: string) {
        this.activeLine = name;
        let hoverLineData = this.lines.find((item: any) => item.name === name);
        this.hoverContainer.removeAll();
        let hoverLine = this.hoverContainer.childOfName('active-line');
        let hoverLabelGroup = this.hoverContainer.childOfName('active-label-group');
        if (hoverLine == null) {
            let line = new zrender.Polyline({
                style: { lineWidth: 1, stroke: '#000' },
                name: 'active-line',
                z: 100
            });
            this.hoverContainer.add(line);
            hoverLine = line;
        }
        if (hoverLabelGroup == null) {
            let group = new zrender.Group({ name: 'active-label-group' });
            this.hoverContainer.add(group);
            hoverLabelGroup = group;
        }
        let newPoints = hoverLineData.points.map((p: any) => [...p]);
        hoverLabelGroup.removeAll();
        let indexes = this.axisScale.domain();
        indexes.forEach((index: string) => {
            let posX = this.axisScale(index);
            let text = new zrender.Text({
                style: { text: index !== 'ctr' ? hoverLineData.raw[index] : (hoverLineData.raw[index] * 100).toFixed(3) + '%', textAlign: 'center', textVerticalAlign: 'middle' },
                position: [posX, this.cHeight + 25]
            });
            hoverLabelGroup.add(text);
        })
        hoverLine.animateTo({ shape: { points: [...newPoints] } });
        this.toggleHighlight(false);
    }

    toggleHighlight(condition: boolean) {
        if (condition === false && this.lineContainer.active === true) {
            let opacity = this.mode === 'Detail' ? 0 : 0.2;
            this.lineContainer.eachChild((child: any) => {
                child.attr('style', { opacity: opacity })
            });
            this.lineContainer.attr('active', false);
        } else if (condition === true && this.lineContainer.active === false) {
            let opacity = this.mode === 'Detail' ? this.detailLineOpacity : this.globalLineOpacity
            this.lineContainer.eachChild((child: any) => {
                child.attr('style', { opacity: opacity })
            });
            this.lineContainer.attr('active', true);
        }
    }

    deactivate() {
        this.hoverContainer.removeAll();
        // 在清除高亮层之前,先判断是否有被刷选的元素
        let hasBrush = Object.values(this.yBrushes).some(brush => brush != null);
        if (hasBrush === true) return;
        else this.toggleHighlight(true);
    }
}