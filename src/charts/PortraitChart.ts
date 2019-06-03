import { ScaleBand, ScaleLinear, tickStep } from 'd3';
import * as d3 from 'd3';
declare var zrender: any;
import { throttle } from '@/utils/optimize';
import { TargetingInfo } from '@/models/targeting';

type Datum = {
    click: number;
    expo: number;
    cost: number;
    ecpm: number;
    ctr: number;
    cpc: number;
    freq: number;
    name: string;
}

export default class PortraitChart {
    // zr实例
    zr: any = null;
    // 外层容器
    container: any = new zrender.Group();
    // 刷子容器
    brushContainer: any = new zrender.Group({ name: 'brush' });
    // tooltip容器
    tooltipContainer: any = new zrender.Group({ name: 'tooltip' });
    // 图元容器
    chartContainer: any = new zrender.Group({ name: 'chart' });
    // 坐标轴容器
    axisContainer: any = new zrender.Group({ name: 'axis' });

    height: number = 0;
    width: number = 0;
    cHeight: number = 0;
    cWidth: number = 0;

    // 视图边距
    marginLeft: number = 50;
    marginRight: number = 50;
    marginTop: number = 10;
    marginBottom: number = 120;

    // 视图模式
    mode: boolean = false;

    // 映射
    map: Map<string, number> = new Map();

    // 需要展示的指标
    index: string = ""

    // 颜色
    color: any = d3.scaleOrdinal().domain(['1', '2', '3', '4', '5', '6', '7', '8'])
        .range(["#34ace0", "#00d2d3", "#2ed573", "#b8e994", "#ffdb5c",
            "#f78fb3", "#ff4757", "#ff9f7f"]);

    // 比例尺
    xScale: ScaleBand<string> = d3.scaleBand().paddingInner(0.2).paddingOuter(0.1);
    brushXScale: ScaleBand<string> = d3.scaleBand().paddingInner(0.2).paddingOuter(0.1);
    yScale: ScaleLinear<number, number> = d3.scaleLinear();
    brushYScale: ScaleLinear<number, number> = d3.scaleLinear();

    yFormats: any = {};

    initBrushWidth: number = 0;

    activeId: string | null = null;
    filteredIds!: TargetingInfo[];

    tooltip!: HTMLElement;

    data!: Datum[];
    targets!: TargetingInfo[];

    constructor(dom: string) {
        this.zr = zrender.init(document.querySelector(dom));
        this.container.add(this.axisContainer);
        this.container.add(this.chartContainer);
        this.container.add(this.tooltipContainer);
        this.container.add(this.brushContainer);
        this.zr.add(this.container);
        this.resize();
        this.buildTooltip();

    }
    resize() {
        this.zr.resize();
        this.height = this.zr.getHeight();
        this.width = this.zr.getWidth();
        this.container.attr('position', [0.5 + this.marginLeft, this.marginTop + 0.5]);
        this.cHeight = this.height - this.marginTop - this.marginBottom;
        this.cWidth = this.width - this.marginLeft - this.marginRight;

        this.initBrushWidth = Math.round(this.cWidth * 1);

        this.xScale.rangeRound([0, this.cWidth]);
        this.brushXScale.rangeRound([0, this.cWidth]);
        this.yScale.rangeRound([this.cHeight, 0]);
        this.brushYScale.rangeRound([30, 0]);
        this.brushContainer.attr('position', [0, Math.round(this.cHeight) + this.marginBottom / 2]);
    }

    loadData(data: any[], targets: TargetingInfo[], index: string, activeId: null | TargetingInfo, filteredIds: TargetingInfo[] | null) {
        this.data = data;
        this.data = this.data;
        this.targets = targets;
        this.activeId = activeId == null ? null : activeId.id;
        this.filteredIds = filteredIds == null ? [] : filteredIds;
        this.index = index.toLowerCase();
        this.data.sort((a: any, b: any) => b[this.index] - a[this.index]);
        this.brushXScale.domain(this.data.map((d: any) => d.name));
        this.buildBrushX("brush")
        this.update();
    }

    resolveState() {

        if (this.index === 'target-freq' && this.activeId != null)
            this.highlight(this.activeId);
    }

    highlight(activeId: string) {
        let parentGroup = this.chartContainer;
        parentGroup.eachChild((subGroup: any) => {
            subGroup.eachChild((rect: any) => {
                if (rect.name === 'background-rect') return;
                if (rect.rectId === activeId) rect.attr('style', { stroke: '#000', opacity: 1 });
                else rect.attr('style', { opacity: 0.1, stroke: 'transparent' });
            });
        });
    }

    update() {
        this.processContext();
        this.processFocus();
        this.zr.refresh();
    }

    processContext() {
        this.getMaxValue(this.brushXScale.domain(), this.brushYScale);
        this.buildBrushAxis();
        if (this.index !== 'target-freq')
            this.paintBar(this.data, this.brushXScale, this.brushYScale, 30, '#eceef0', this.brushContainer.childOfName('background'));
        else if (this.index === 'target-freq')
            this.paintGroupBar(this.data, this.brushXScale, this.brushYScale, 30, '#eceef0', this.brushContainer.childOfName('background'));
    }

    processFocus() {
        let domain = this.getDomainExtent();
        this.xScale.domain(domain);
        this.getMaxValue(this.xScale.domain(), this.yScale);
        this.buildHorizonAxis();
        this.buildVerticalAxis();
        if (this.index !== 'target-freq')
            this.paintBar(this.data, this.xScale, this.yScale, this.cHeight, '#c23531', this.chartContainer);
        else if (this.index === 'target-freq')
            this.paintGroupBar(this.data, this.xScale, this.yScale, this.cHeight, "", this.chartContainer);
        this.resolveState();
    }

    buildBrushAxis() {
        let group = this.brushContainer.childOfName('brush-axis');
        group.removeAll()
        let axisLine = new zrender.Line({
            shape: { x1: 0, y1: 0, x2: this.cWidth, y2: 0 },
            style: { stroke: '#000' },
            name: 'axis-line'
        });
        group.add(axisLine);
        let ticksGroup = new zrender.Group({ name: 'ticks' });
        group.add(ticksGroup);
        let domain: string[] = this.brushXScale.domain();
        domain.forEach(d => {
            let posX = this.brushXScale(d) as number + this.brushXScale.bandwidth() / 2;
            posX = Math.round(posX);
            let tick = new zrender.Line({
                name: d,
                shape: { x1: posX, y1: 0, x2: posX, y2: 4 },
                style: {
                    stroke: '#000', text: d,
                    truncate: {
                        outerWidth: Math.round(this.brushXScale.bandwidth() - 20)
                    },
                    textAlign: 'center', textPosition: [0, 8]
                }
            });
            ticksGroup.add(tick);
        });
    }

    buildHorizonAxis() {
        this.axisContainer.removeAll();
        let group = this.axisContainer.childOfName('x-axis');
        if (group == null) {
            group = new zrender.Group({ name: 'x-axis', position: [0, this.cHeight] });
            let axisLine = new zrender.Line({
                shape: { x1: 0, y1: 0, x2: this.cWidth, y2: 0 },
                style: { stroke: '#000' },
                name: 'axis-line'
            });
            group.add(axisLine);
            this.axisContainer.add(group);
        }
        if (this.index !== 'target-freq') {
            let ticksGroup = group.childOfName('ticks');
            if (ticksGroup == null) {
                ticksGroup = new zrender.Group({ name: 'ticks' });
                group.add(ticksGroup);
            }
            ticksGroup.removeAll();
            let labels = this.xScale.domain();
            labels.forEach(label => {
                let posX = this.xScale(label) as number + this.xScale.bandwidth() / 2;
                posX = Math.round(posX);
                let tick = new zrender.Line({
                    shape: { x1: posX, y1: 0, x2: posX, y2: 4 },
                    style: {
                        stroke: '#000', text: label,
                        truncate: {
                            outerWidth: this.xScale.bandwidth() - 6
                        },
                        textAlign: 'center', textPosition: [0, 8]
                    }
                });
                ticksGroup.add(tick);
            });
        }

    }

    buildVerticalAxis() {
        let group = this.axisContainer.childOfName("y-axis");
        if (group == null) {
            group = new zrender.Group({ name: 'y-axis' });
            let axisLine = new zrender.Line({
                shape: { x1: 0, y1: 0, x2: 0, y2: this.cHeight },
                style: { fill: '#000' }
            });
            group.add(axisLine);
            this.axisContainer.add(group);
        }
        let ticksGroup = group.childOfName('ticks');
        if (ticksGroup == null) {
            ticksGroup = new zrender.Group({ name: 'ticks' });
            group.add(ticksGroup);
        }
        ticksGroup.removeAll();

        let ticks = this.yScale.ticks(5);
        let domain = this.yScale.domain();
        if (domain[1] !== ticks[ticks.length - 1]) ticks.push(domain[1]);
        let format: any = null;
        if (this.index === 'ctr') format = d3.format("~%");
        else format = d3.format("~s");
        this.yFormats[this.index] = format;
        ticks.forEach((tick, index) => {
            let posY = this.yScale(tick);
            let t = new zrender.Line({
                shape: { x1: -4, y1: posY, x2: 0, y2: posY },
                style: { fill: '#000', text: format(tick), textAlign: 'right', textVerticalAlign: 'middle', textPosition: [-8, 0] }
            });
            ticksGroup.add(t);
            if (index === 0) return;
            let gridLine = new zrender.Line({
                shape: { x1: 0, y1: posY, x2: this.cWidth, y2: posY },
                style: {
                    stroke: '#cccccc',
                }
            });
            ticksGroup.add(gridLine);
        });
    }

    getMaxValue(domain: string[], scale: any) {
        let maxValue: number = -1;
        this.map.clear();
        if (this.index !== 'target-freq') {
            this.data.forEach((d: any) => {
                let index = domain.indexOf(d.name);
                if (index !== -1) this.map.set(d.name, d[this.index] == null ? 0 : d[this.index]);
            });
            let values = [...this.map.values()];
            maxValue = values.reduce((prev: number, next: number) => Math.max(prev, next), -1);
        } else if (this.index === 'target-freq') {
            this.data.forEach((d: any) => {
                let index = domain.indexOf(d.name);
                if (index !== -1) this.map.set(d.name, d['pattern'] == null ? { all: 0 } : d['pattern']);
            });
            let values = [...this.map.values()];
            let groupMaxValue = values.map((v: any) => {
                return (Object.values(v) as number[]).reduce((p: number, n: number) => Math.max(p, n), -1)
            });
            maxValue = groupMaxValue.reduce((prev: number, next: number) => Math.max(prev, next), -1);
        }
        return scale.domain([0, maxValue]).nice();
    }

    getDomainExtent() {
        let selection = this.brushContainer.childOfName('selection')
        let selectionRect = selection.childOfName('selection-rect');
        let prev = selection.position[0];
        let next = prev + selectionRect.shape.width;
        let domain = this.brushXScale.domain();
        let bandwidth = this.brushXScale.bandwidth();
        let result = domain.filter(d => {
            let pos = this.brushXScale(d) as number + bandwidth / 2;
            return pos >= prev && pos <= next;
        });

        this.brushContainer.childOfName('brush-axis').childOfName('ticks')
            .eachChild((child: any) => {
                if (result.indexOf(child.name) !== -1) child.attr('style', { textFill: '#409eff' });
                else child.attr('style', { textFill: '#000' });
            })

        return result;
    }
    buildTooltip() {
        let tooltip = document.createElement('div');
        tooltip.classList.add('tooltip');
        this.tooltip = tooltip;
        this.zr.dom.appendChild(this.tooltip);

        this.zr.dom.addEventListener('mousemove', (ev: MouseEvent) => {
            let [x, y] = [ev.offsetX + 10, ev.offsetY + 10];
            this.tooltip.style.left = `${x}px`;
            this.tooltip.style.top = `${y}px`;
        });
    }

    buildTooltipStr(name: string, data: any) {
        let tooltipStr = `
        <p><span class="tip" style="background-color: #c23531"></span><span>${name}</span></p>
        `
        if (typeof data !== 'object') tooltipStr += `<p><span class="tip"></span><span>${this.index}: ${data}</span></p>`;
        else {
            // 应对定向频次
            console.log('定向频次');
            let keys: string[] = []
            keys = Object.keys(data);
            keys = keys.filter(key => this.filteredIds.findIndex(item => item.id === key) === -1);
            keys.sort((a, b) => data[b] - data[a]);
            keys.forEach(key => {
                let color = this.color(key[0]);
                let name = (this.targets.find(t => t.id === key) as TargetingInfo)['name'];
                tooltipStr += `<p><span class="tip" style="background-color: ${color}"></span><span>${name}: ${data[key]}</span></p>`
            });
        }
        return tooltipStr;
    }

    paintGroupBar(data: Datum[], xScale: ScaleBand<string>, yScale: ScaleLinear<number, number>, height: number, fill: string, parentGroup: any) {
        // 绘制定向相关柱状图时,应注意查看clicked
        let domain = xScale.domain();
        data = data.filter(d => domain.indexOf(d.name) !== -1);
        parentGroup.removeAll();
        data.forEach((d: any) => {
            let name = d.name;
            let posX = xScale(name);
            let group = new zrender.Group({ name: name, position: [posX, 0] });
            let pattern = d.pattern;
            let keys = Object.keys(pattern);
            keys = keys.filter(key => this.filteredIds.findIndex(item => item.id === key) === -1);
            keys.sort((a, b) => pattern[b] - pattern[a]);
            let width = Math.round(xScale.bandwidth() / keys.length);
            for (let i = 0, j = keys.length; i < j; ++i) {
                let color = fill === "" ? this.color(keys[i][0]) : fill;
                let name = (this.targets.find(target => target.id === keys[i]) as any)['name'];
                let value = yScale(pattern[keys[i]]);
                let rect = new zrender.Rect({
                    shape: { x: i * width, y: value, width, height: height - value },
                    style: { fill: color, stroke: '#000' },
                    rectId: keys[i],
                    z: 10
                });
                if (width >= 15 && domain.length <= 4 && parentGroup.name !== 'background')
                    rect.attr('style', {
                        fontSize: 12,
                        textFill: '#000',
                        truncate: {
                            outerWidth: 65
                        }, textPosition: [Math.round(width / 2), height - value + 5], text: name, textRotation: -Math.PI / 4
                    });
                group.add(rect);
            }
            if (parentGroup.name !== 'background') {
                let backgroundBar = new zrender.Rect({
                    z: 15,
                    shape: { x: 0, y: 0, width: xScale.bandwidth(), height: height },
                    style: { fill: '#000', opacity: 0 },
                    name: 'background-rect',
                    groupName: name
                });
                backgroundBar.on('mouseover', () => {
                    backgroundBar.attr('style', { opacity: 0.5 });
                    let tooltipStr = this.buildTooltipStr(backgroundBar.groupName, this.map.get(backgroundBar.groupName))
                    this.tooltip.style.visibility = 'visible';
                    this.tooltip.innerHTML = tooltipStr;
                });
                backgroundBar.on('mouseout', () => {
                    backgroundBar.attr('style', { opacity: 0 });
                    this.tooltip.style.visibility = 'hidden';
                    this.tooltip.innerHTML = "";
                });
                group.add(backgroundBar);
            }

            parentGroup.add(group);
        });
    }


    paintBar(data: Datum[], xScale: ScaleBand<string>, yScale: ScaleLinear<number, number>, height: number, fill: string, parentGroup: any) {
        let domain = xScale.domain();
        data = data.filter((d: any) => domain.indexOf(d.name) !== -1);
        // 矩形宽度
        let width = Math.round(xScale.bandwidth());
        let step = Math.round(xScale.step());
        // 要展示的指标
        let index = this.index;
        // 每次调用paintBar时先清空所有图元
        parentGroup.removeAll();
        data.forEach((d: any) => {
            let name = d.name;
            let posX = xScale(name);
            let value = yScale(d[index]);
            let group = new zrender.Group({ name: name, position: [posX, 0] });
            let bar = new zrender.Rect({
                shape: { x: 5, y: value - 0.5, width: width - 10, height: height - value },
                style: { fill: fill, stroke: '#d2d2d2' },
                z: 10
            });
            if (parentGroup.name !== 'background') {
                let backgroundBar = new zrender.Rect({
                    z: 15,
                    shape: { x: 0, y: 0, width: xScale.bandwidth(), height: height },
                    style: { fill: '#000', opacity: 0 },
                    name: 'background-rect',
                    groupName: name
                });
                backgroundBar.on('mouseover', () => {
                    backgroundBar.attr('style', { opacity: 0.5 });
                    let tooltipStr = this.buildTooltipStr(backgroundBar.groupName, this.map.get(backgroundBar.groupName))
                    this.tooltip.style.visibility = 'visible';
                    this.tooltip.innerHTML = tooltipStr;
                });
                backgroundBar.on('mouseout', () => {
                    backgroundBar.attr('style', { opacity: 0 });
                    this.tooltip.style.visibility = 'hidden';
                    this.tooltip.innerHTML = "";
                });
                group.add(backgroundBar);
            }

            group.add(bar);
            parentGroup.add(group);
        });
    }

    buildBrushX(groupName: string) {
        let parentGroup = this.container.childOfName(groupName);
        parentGroup.removeAll();

        let initSelectionHeight: number = 30;
        let initSelectionWidth: number = this.initBrushWidth;

        let axisContainer = new zrender.Group({ name: 'brush-axis', position: [0, initSelectionHeight] });
        parentGroup.add(axisContainer);

        let extent = new zrender.Rect({
            shape: { x: 0, y: 0, width: this.cWidth, height: initSelectionHeight },
            style: { fill: 'transparent', stroke: '#ededed' },
            name: 'extent',
            z: 20
        });
        let selection = new zrender.Group({ name: 'selection', position: [0, 0] });
        let selectionRect = new zrender.Rect({
            shape: { x: 0, y: 0, width: initSelectionWidth, height: initSelectionHeight },
            style: { fill: 'transparent', stroke: '#000', lineDash: [5] },
            name: 'selection-rect',
            cursor: 'move',
            z: 25
        });
        let controlLeft = new zrender.Rect({
            shape: { x: -4, y: Math.round((initSelectionHeight - 16) / 2), width: 8, height: 16, },
            style: { fill: '#a7b7cc' },
            name: 'left',
            cursor: 'ew-resize',
            z: 25
        });
        let controlRight = new zrender.Rect({
            shape: { x: -4, y: Math.round((initSelectionHeight - 16) / 2), width: 8, height: 16, },
            style: { fill: '#a7b7cc' },
            name: 'right',
            cursor: 'ew-resize',
            z: 25,
            position: [initSelectionWidth, 0]
        });
        selection.on('mousedown', (ev: any) => {
            let name = ev.target.name;
            let selectionRectWidth = selectionRect.shape.width;
            let distX = this.posAdjust(ev.offsetX) - selection.position[0];
            let selectionRectRearPosX = selectionRectWidth + selection.position[0];
            let selectionRectFrontPosX = selection.position[0];

            let onMove = throttle(30, (ev: any) => {
                let newPosX = this.posAdjust(ev.offsetX) - distX;
                if (newPosX < 0) newPosX = 0;
                if (newPosX + selectionRectWidth > this.cWidth) newPosX = this.cWidth - selectionRectWidth;
                selection.attr('position', [newPosX, 0]);
                this.processFocus();
            }, this);
            let onResizeLeft = throttle(30, (ev: any) => {

                let newPosX = this.posAdjust(ev.offsetX) - distX;
                if (newPosX < 0) newPosX = 0;

                let newSWidth = selectionRectRearPosX - newPosX;
                // 此时左边的滑块已经超过了右边的滑块
                if (newSWidth < 0) {
                    newPosX = selectionRectRearPosX;
                    newSWidth = -newSWidth
                    if (newSWidth + selectionRectRearPosX > this.cWidth) newSWidth = this.cWidth - selectionRectRearPosX;
                }
                selection.attr('position', [newPosX, 0]);
                selectionRect.attr('shape', { width: newSWidth });
                controlRight.attr('position', [newSWidth, 0]);
                // this.initBrushWidth = selectionRect.shape.width;
                this.processFocus();
            }, this);
            let onResizeRight = throttle(30, (ev: any) => {

                let newSWidth = this.posAdjust(ev.offsetX) - selectionRectFrontPosX;
                if (newSWidth + selectionRectFrontPosX > this.cWidth)
                    newSWidth = this.cWidth - selectionRectFrontPosX
                if (newSWidth < 0) {
                    // 此时右边的滑竿超过了左边的滑竿
                    let newPosX = this.posAdjust(ev.offsetX);
                    if (newPosX < 0) newPosX = 0;
                    selection.attr('position', [newPosX, 0]);
                    newSWidth = selectionRectFrontPosX - newPosX;
                } else {
                    selection.attr('position', [selectionRectFrontPosX, 0]);
                }
                selectionRect.attr('shape', { width: newSWidth });
                controlRight.attr('position', [newSWidth, 0]);
                // this.initBrushWidth = selectionRect.shape.width;
                this.processFocus();
            }, this);

            let onUp = (ev: any) => {
                if (name === 'selection-rect') {
                    this.zr.dom.removeEventListener('mousemove', onMove);
                }
                if (name === 'left') {
                    this.zr.dom.removeEventListener('mousemove', onResizeLeft);
                }
                if (name === 'right') {
                    this.zr.dom.removeEventListener('mousemove', onResizeRight)
                }
                document.removeEventListener('mouseup', onUp);
            }
            if (name === 'selection-rect') {
                this.zr.dom.addEventListener('mousemove', onMove);
            }
            if (name === 'left') {
                this.zr.dom.addEventListener('mousemove', onResizeLeft);
            }
            if (name === 'right') {
                this.zr.dom.addEventListener('mousemove', onResizeRight)
            }
            document.addEventListener('mouseup', onUp);
        })
        extent.on('click', (ev: any) => {
            let sWidth = selectionRect.shape['width'];
            let newPosX = ev.offsetX - 10 - Math.round(sWidth / 2);
            if (newPosX < 0) newPosX = 0;
            if (newPosX + sWidth > this.cWidth) newPosX = this.cWidth - sWidth;
            selection.attr('position', [newPosX, 0]);
            this.processFocus();
        });
        selection.add(selectionRect);
        selection.add(controlLeft);
        selection.add(controlRight);
        let extentBackground = parentGroup.childOfName('background');
        if (extentBackground == null) {
            extentBackground = new zrender.Group({ name: 'background' });
        }
        parentGroup.add(extentBackground);
        parentGroup.add(extent);
        parentGroup.add(selection);
    }
    posAdjust(offsetX: number) {
        return offsetX - this.marginLeft
    }
}