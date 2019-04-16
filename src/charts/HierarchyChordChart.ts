import * as d3 from 'd3';
import { RelationData, TargetingInfo } from '@/models/targeting';
import { Group, Link } from '@/models/chord';
import Bus from '@/charts/event-bus';
import { throttle } from '@/utils/optimize';
import { RibbonGenerator, ScaleLinear, Ribbon } from 'd3';

export type GroupDatum = {
    index: number;
    startAngle: number;
    endAngle: number;
    freq: number;
    cost: number;
    id: string;
    name: string;
    level: number;
    value: number;
}

declare var zrender: any;
export default class HierarchyChordChart {
    // zrender实例 
    zr: any = null;
    // 用于装载数据
    data: RelationData[] = [];
    targets: TargetingInfo[] = [];
    filteredTargets: TargetingInfo[] = [];

    // 弦图布局计算器
    chordGenerator: any = d3.chord().padAngle(0.05).sortSubgroups(d3.descending)
    // 弦生成器
    ribbonGenerator: any = d3.ribbon()


    // 颜色
    color: any = d3.scaleOrdinal().domain(['1', '2', '3', '4', '5', '6', '7', '8'])
        .range(["#34ace0", "#00d2d3", "#2ed573", "#b8e994", "#ffdb5c",
            "#f78fb3", "#ff4757", "#ff9f7f"]);
    radius: number = 0;
    // 圆心
    origin: number[] = [0, 0];

    initZValue: number = 1;
    inactiveOpacity: number = 0.1;
    inactiveTextFill: string = "#d1d1d1";

    // 画布宽度 === canvas宽度
    width: number = 0;
    // 同上
    height: number = 0;

    // 最外层容器
    container: any = new zrender.Group({ position: [0.5, 0.5] });
    // 弦图容器
    chartContainer: any = new zrender.Group();
    // 弦容器
    groupContainer: any = new zrender.Group();
    // 弧容器
    ribbonContainer: any = new zrender.Group();

    // 背景容器
    backContainer: any = new zrender.Group();
    // 图例容器
    legendContainer: any = new zrender.Group();

    // 用于限制层级半径
    radiusScale: any = d3.scaleOrdinal().domain(["2", "3", "4", "5"]).range([0, 40, 80, 120]);

    matrix: number[][] = [];

    lastOperation: string = "";

    // 用于保存被高亮的target
    activeId!: TargetingInfo | null;

    map: Map<number, TargetingInfo> = new Map();

    tooltip!: any;

    index: string = "";

    arcWidthScale: ScaleLinear<number, number> = d3.scaleLinear().rangeRound([5, 25])

    customNode: Element = document.createElement('custom-node');
    customRibbon: Element = document.createElement('custom-ribbon');
    customLegend: Element = document.createElement('custom-legend');
    customLog: Element = document.createElement('custom-log');

    deprecatedTargets: TargetingInfo[] = [];
    selectedCmb: any;

    constructor(public dom: string) {
        this.zr = zrender.init(document.querySelector(dom));
        this.chartContainer.add(this.groupContainer);
        this.chartContainer.add(this.ribbonContainer);
        this.container.add(this.legendContainer);
        this.container.add(this.chartContainer);
        this.container.add(this.backContainer);
        this.buildTooltip();
        this.zr.add(this.container);
        this.resize();
    }

    loadData(data: RelationData[], ids: TargetingInfo[], filteredIds: TargetingInfo[] | null, activeId: TargetingInfo | null, index: string, selectedCmb: any) {
        // 在加载数据时,应考虑上次加载数据时,是否有被高亮的定向
        // 或者是否有被过滤掉的定向
        this.data = data;
        this.targets = ids.filter((item: any) => this.data.findIndex(d => d.id === item.id) !== -1);
        this.activeId = activeId;
        this.index = index;
        this.selectedCmb = selectedCmb;
        this.filteredTargets = filteredIds == null ? [] : filteredIds;
        this.update();

    }
    // 当装载完数据后，开始绘制视图
    // 也可以在进入全屏后，重新绘制视图
    update() {
        // 计算关系矩阵
        this.computeMatrix(this.data, this.targets);
        // 设置弧宽比例尺
        this.computeArcWidth(this.targets);

        let chordData = this.chordGenerator(this.matrix);
        let groups = chordData.groups.map((group: GroupDatum) => {
            let result = this.map.get(group.index);
            if (result == null) return;
            let newGroup = Object.assign({}, group, result, {
                startAngle: group.startAngle - Math.PI / 2,
                endAngle: group.endAngle - Math.PI / 2
            });
            return newGroup;
        });
        this.paint(groups, [...chordData], this.targets);
        // resolveState主要用于处理是否有高亮以及筛选行为
        this.resolveState();
        this.zr.refresh();
    }
    paint(groups: Group[], ribbons: Link[], legends: TargetingInfo[]) {
        this.paintGroup(groups);
        this.paintRibbon(ribbons);
        // this.paintLegend(legends);
    }

    computeArcWidth(targets: TargetingInfo[]) {
        let values = targets.map((t: any) => t[this.index]);
        let maxValue = values.reduce((prev, next) => Math.max(prev, next), -1);
        let minValue = values.reduce((prev, next) => Math.min(prev, next), Number.MAX_VALUE);
        this.arcWidthScale.domain([minValue, maxValue]);
    }

    computeMatrix(raw: RelationData[], targets: TargetingInfo[]) {
        if (raw.length === 0) return;
        let matrix: number[][] = [];

        // 每次计算数据时均需要考虑该定向是否包含在targets内而又没有被过滤
        let ids = targets.filter(item => {
            let idx1 = raw.findIndex(r => r.id === item.id);
            if (idx1 !== -1) return true;
            return false;
        });

        ids.sort((a: any, b: any) => b[this.index] - a[this.index]);


        const self: any = this;
        ids.forEach((id: TargetingInfo, row: number) => {
            self.map.set(row, id);
            let tmp: number[] = [];
            // 找到某一定向对应的定向关系
            let matrixRow = raw.find((item) => item.id === id.id);
            let relation = matrixRow && matrixRow.relation;
            if (relation == null) return;

            let totalCount: number = relation.reduce((prev, curr) => Object.assign({ value: prev.value + curr.value })).value;
            let baseValue = Math.round((id as any)[this.index]);
            for (let col = 0, cols = ids.length; col < cols; ++col) {
                let colId = ids[col].id;
                let result = relation.find((rel: any) => rel.id === colId);
                if (result == null) tmp[col] = 0;
                else {
                    let proportion = Math.round(result.value / totalCount * baseValue)
                    tmp[col] = proportion;
                }
            }
            matrix[row] = tmp;
        });
        this.matrix = matrix;
    }

    resize() {
        this.zr.resize();
        this.width = this.zr.getWidth();
        this.height = this.zr.getHeight();
        this.origin = [Math.round(this.width / 2), Math.round(this.height / 2)];
        this.radius = Math.round(Math.min(this.origin[0], this.origin[1]) * 0.7);
        this.chartContainer.attr('position', [...this.origin]);
    }

    paintGroup(groups: Group[]) {

        this.groupContainer.removeAll();

        // 先创建新增的group
        groups.forEach((d: any) => {
            let angle = -1 * (d.startAngle + d.endAngle) / 2;
            let color = this.color(d.id[0]);

            let arcWidth = 10;
            let radius = this.radius + this.radiusScale(d.level);
            let offsetX = Math.cos(angle) * (radius + arcWidth + 10)
            let offsetY = Math.sin(angle) * -  (radius + arcWidth + 10);

            let textOption = {
                style: {
                    text: `${d.name}`, textVerticalAlign: 'middle',
                    textAlign: 'left'
                },
                name: 'label',
                position: [offsetX, offsetY],
                rotation: angle
            };

            if (angle < (-1 * Math.PI / 2)) {
                angle = angle + Math.PI;
                textOption.rotation = angle;
                textOption.style.textAlign = 'right';
            }

            let group = new zrender.Group({
                index: d.index, gId: d.id, active: false, name: d.name
            });

            group.on('click', this.handleGroupClick, this);

            let sector = new zrender.Sector({
                shape: {
                    startAngle: d.startAngle,
                    endAngle: d.endAngle,
                    r0: radius,
                    r: radius + arcWidth
                },
                style: {
                    fill: color,
                    stroke: d3.rgb(color).darker(),
                },
                z: this.initZValue,
                name: 'sector'
            });
            let text = new zrender.Text(Object.assign({}, textOption));
            group.add(sector);
            group.add(text);
            this.groupContainer.add(group);
        });
    }

    handleGroupClick(ev: any) {
        let target = ev.target.parent;
        // 以下为处理下钻的逻辑
        if (ev.event.shiftKey === true) {
            let message: any = {};
            let currentIds = this.targets.filter(t => {
                let index = this.data.findIndex(d => d.id === t.id);
                let index2 = this.filteredTargets.findIndex(f => f.id === t.id);
                if (index !== -1 && index2 === -1) return true;
                else return false;
            }).map(item => Object.assign({}, item));
            let clicked = this.map.get(target.index);
            message.drilldown = Object.assign({ clicked, currentIds });
            Bus.$emit('drilldown-addState', message); return
        };

        if (this.selectedCmb != null) {
            Bus.$emit('alert-send-cmb');
            return;
        }

        if (target.active === false)
            this.highlight(target);

        else this.unHighlight(target);
    }


    unHighlight(group: any) {
        this.activeId = null;
        this.update();
        // 取消对组合图的And操作
        Bus.$emit('highlight-target', null);
    }

    highlight(group: any, canEmit: boolean = true) {

        let activeId = this.targets.find(t => t.name === group.name);
        if (activeId != null) this.activeId = activeId;

        let groupToShow = new Set();
        this.ribbonContainer.eachChild((child: any) => {
            // 当前ribbon与被选中定向无关
            if (child.sname !== group.name && child.tname !== group.name) {
                let color = child['r-color'];
                child.attr('style', { opacity: this.inactiveOpacity, fill: color, stroke: 'transparent' })
                    .attr('z', this.initZValue);
                child.attr('silent', true);
            } else {
                // 当前ribbon与被选中定向有关
                let gColor = this.color(group['gId'][0]);
                let sColor = child['s-color'];
                let tColor = child['t-color'];
                let color = gColor === sColor ? tColor : sColor;
                let value = child.value;
                child.attr('style', { opacity: 1, fill: color, stroke: d3.rgb(color).darker() })
                    .attr('z', Math.round(value) + this.initZValue);
                groupToShow.add(child.sname);
                groupToShow.add(child.tname);
                child.attr('silent', false);
            }
        });
        this.groupContainer.eachChild((child: any) => {
            if (child.id === group.id) {
                child.attr('active', true);
                child.childOfName('label').attr('style', { textFill: '#409EFF' });
                child.childOfName('sector').attr('style', { opacity: 1 });
                child.attr('silent', false);
                return;
            }
            child.attr('active', false);
            if (!groupToShow.has(child.name)) {
                child.childOfName('label').attr('style', { textFill: this.inactiveTextFill });
                child.childOfName('sector').attr('style', { opacity: this.inactiveOpacity });
                child.attr('silent', true);
            } else {
                child.childOfName('label').attr('style', { textFill: '#000' });
                child.childOfName('sector').attr('style', { opacity: 1 });
                child.attr('silent', false);
            }
        });
        if (canEmit === true)
            Bus.$emit('highlight-target', this.activeId);
    }

    // 该死的联动
    handleCoordinate(cmbs: TargetingInfo[] | null) {
        if (cmbs == null) {
            this.update();
            return;
        }
        this.groupContainer.eachChild((child: any) => {
            let idx = cmbs.findIndex(item => item.id === child.gId);
            // 该定向组合不应显示
            if (idx === -1) {
                child.childOfName('sector').attr('style', { opacity: this.inactiveOpacity });
                child.childOfName('label').attr('style', { textFill: this.inactiveTextFill });
                child.attr('silent', true);
            } else {
                child.attr('silent', false);
                child.childOfName('sector').attr('style', { opacity: 1 });
                child.childOfName('label').attr('style', { textFill: '#000' });
            }
        });
        this.ribbonContainer.eachChild((child: any) => {
            let sName = child.sname;
            let tName = child.tname;
            let idx1 = cmbs.findIndex(item => item.name === sName);
            let idx2 = cmbs.findIndex(item => item.name === tName);
            if (idx1 !== -1 && idx2 !== -1) {
                child.attr('style', { opacity: 1 }).attr('z', this.initZValue + 100).attr('silent', false);
            } else {
                child.attr('style', { opacity: this.inactiveOpacity }).attr('z', this.initZValue)
                    .attr('silent', true);
            }
        });
    }


    computeRibbonRelateData(s: any, t: any) {
        let source = this.map.get(s) as TargetingInfo;
        let target = this.map.get(t) as TargetingInfo;


        let sourceRow: any = this.data.find(item => item.id === source.id);
        let targetRow: any = this.data.find(item => item.id === target.id);

        sourceRow = sourceRow.relation.reduce((prev: any, next: any) => Object.assign({ value: prev.value + next.value }));
        targetRow = targetRow.relation.reduce((prev: any, next: any) => Object.assign({ value: prev.value + next.value }));

        let sourceFreq = source.freq;
        let targetFreq = target.freq;

        let sourceCost = source.cost.toFixed(3);
        let targetCost = target.cost.toFixed(3);

        let totalConcurrent: any = this.data.find(item => item.id === source.id);
        if (totalConcurrent != null) totalConcurrent = totalConcurrent.relation.find((item: any) => item.id === target.id);

        let sourceRatio = +parseFloat("" + (totalConcurrent.value / sourceRow.value)).toFixed(4) * 100;
        let targetRatio = +parseFloat("" + (totalConcurrent.value / targetRow.value)).toFixed(4) * 100;


        let color = this.color(sourceRatio > targetRatio ? source.id[0] : target.id[0]);
        let sourceColor = this.color(source.id[0]);
        let targetColor = this.color(target.id[0]);
        let sourceRadius = this.radiusScale(source.level + "") + this.radius;
        let targetRadius = (this.radiusScale(target.level + "") + this.radius);
        return { totalConcurrent: totalConcurrent.value, sourceCost, targetCost, sourceFreq, targetFreq, sourceName: source.name, targetName: target.name, sourceRatio, targetRatio, color, sourceColor, targetColor, sourceRadius, targetRadius };
    }

    paintRibbon(ribbons: Link[]) {
        // 因不知如何用zrender对ribbon进行动画，所以直接重绘
        this.ribbonContainer.removeAll();
        ribbons.forEach((d) => {

            let value = d.source.value;

            let { sourceColor, targetColor, sourceRadius, targetRadius, color, sourceName, targetName } = this.computeRibbonRelateData(d.source.index, d.target.index);

            let tmpData = Object.assign({}, {
                source: { startAngle: d.source.startAngle, endAngle: d.source.endAngle, radius: sourceRadius },
                target: { startAngle: d.target.startAngle, endAngle: d.target.endAngle, radius: targetRadius }
            });
            let pathStr = this.ribbonGenerator(tmpData);
            let path = zrender.path.createFromString(pathStr, {
                style: { fill: color, stroke: d3.rgb(color).darker() },
                z: this.initZValue
            });
            path.attr('r-color', color);
            path.attr('source', d.source.index);
            path.attr('target', d.target.index);
            path.attr('s-color', sourceColor);
            path.attr('t-color', targetColor);
            path.attr('sname', sourceName);
            path.attr('tname', targetName);
            path.attr('value', value);
            path.on('mouseover', this.handleRibbonHover, this);
            path.on('mouseout', this.handleRibbonOut, this);
            this.ribbonContainer.add(path);
        });
    }


    // 全屏
    fullscreen() {
        this.resize();
        this.update();
        // 当进入全屏时，应考虑是否之前已进行相关筛选操作
        // 进入/退出全屏前已有被点击的定向up
    }

    resolveState() {
        if (this.activeId != null) {
            let group = this.groupContainer.childOfName(this.activeId.name);
            this.highlight(group, false);
        }
        if (this.selectedCmb != null) this.handleCoordinate(this.selectedCmb);
    }

    buildTooltip() {
        let tooltip = document.createElement('div');
        tooltip.classList.add('tooltip');
        this.tooltip = tooltip;
        this.zr.dom.appendChild(this.tooltip);
        this.zr.dom.addEventListener('mousemove', throttle(100, (ev: MouseEvent) => {
            let [x, y] = [ev.offsetX + 10, ev.offsetY + 10];
            this.tooltip.style.left = `${x}px`;
            this.tooltip.style.top = `${y}px`;
        }, this));
    }

    buildTooltipStr(s: any, t: any) {


        let { sourceColor, sourceRatio, targetRatio, totalConcurrent, sourceFreq, sourceCost, targetFreq, targetCost, sourceName, targetName, targetColor } = this.computeRibbonRelateData(s, t);
        let str = `
        <p>
        <span class="tip" style="border-color: ${sourceColor};"></span><span>${sourceName}</span>
        <span>-${this.index === 'freq' ? '频次' : '消耗'}: ${this.index === 'freq' ? sourceFreq : sourceCost}</span> 
        </p>
        <p>
        <span class="tip" style="border-color: ${targetColor};"></span><span>${targetName}</span>
        <span>-${this.index === 'freq' ? '频次' : '消耗'}: ${this.index === 'freq' ? targetFreq : targetCost}</span> 
        </p>
      
        <p>
        <span style="margin-left: 15px;">两种定向共现${totalConcurrent}次</span>
        </p>
        <p>
            <span style="margin-left: 15px;"> 占${sourceName}共现比例: 
            ${(sourceRatio + "").substr(0, 4) + "%"}</span>
           </p>
            <p>
            <span style="margin-left: 15px;">占${targetName}共现比例: ${(targetRatio + "").substr(0, 4) + '%'}</span>
            </p>
        `

        return str;
    }


    handleRibbonHover(ev: any) {
        // 鼠标移动到了Ribbon上
        // 将ribbon的z值设为最高



        let target = ev.target;

        target.attr('oldZ', ev.target.z);
        target.attr('z', Number.MAX_SAFE_INTEGER);
        target.attr('style', {
            shadowBlur: 1,
            shadowColor: '#000'
        });
        this.tooltip.style.visibility = 'visible';
        // 
        let tooptipStr = this.buildTooltipStr(target.source, target.target);
        this.tooltip.innerHTML = tooptipStr;
    }



    handleRibbonOut(ev: any) {
        ev.target.attr('z', ev.target.oldZ);
        ev.target.attr('oldZ', null);
        ev.target.attr('style', {
            shadowBlur: 0,
            shadowColor: 'transparent'
        });
        this.tooltip.style.visibility = 'hidden';
        this.tooltip.innerHTML = ""
    }

    reset() {
        this.chartContainer.attr({ position: [...this.origin] });
        this.chartContainer.animateTo({
            scale: [1, 1]
        });
        this.drag(false);
        this.zoom(false);
        this.zr.refresh();
    }
    drag(condition: boolean) {
        const self = this;
        let onMouseDown = function (ev: any) {
            self.ribbonContainer.attr('silent', true);
            let origin = [ev.event.pageX, ev.event.offsetY];
            let originPosition = [...self.chartContainer.position];
            let onMouseMove = function (ev: any) {
                let dist = [ev.pageX - origin[0], ev.pageY - origin[1]];
                self.chartContainer.attr('position', [originPosition[0] + dist[0], originPosition[1] + dist[1]]);
            };
            let onMouseUp = function (ev: any) {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                self.ribbonContainer.attr('silent', false);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        if (condition === true) {
            this.container.on('mousedown', onMouseDown);
        }
        else {
            this.container.off('mousedown', null);
        }

    }
    zoom(condition: boolean) {
        const self: any = this;
        let initScale = self.container.scale[0];
        let onMouseWheel = function (e: any) {
            let storage = self.zr.storage;
            let delta = e.wheelDelta;
            let newScale = initScale + delta / 10.0;
            if (newScale < 0.5 || newScale > 3.0) return;
            initScale = newScale;
            self.chartContainer.animateTo({
                scale: [newScale, newScale]
            });
            self.zr.refresh();
        }
        if (condition === true) this.zr.on('mousewheel', onMouseWheel);
        else this.zr.off('mousewheel')
    }
}

