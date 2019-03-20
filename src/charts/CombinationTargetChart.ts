import { CombinationData, TargetingInfo } from '@/models/targeting';
import * as d3 from 'd3';
import { throttle } from '@/utils/optimize';
// declare var d3: any;
declare var zrender: any;

export type sorter = 'click' | 'ctr' | 'expo' | 'ecpm'
    | 'cost' | 'cpc' | 'freq';

import Bus from '@/charts/event-bus';
import { ScaleBand, brush } from 'd3';
export default class CombinationTargetChart {
    zr: any = this;
    width: number = 0;
    height: number = 0;
    data: CombinationData[] = [];
    targets: TargetingInfo[] = [];
    xScale: ScaleBand<string> = d3.scaleBand();

    activeGroup: string | null = null;

    activeCombinations: string[] = [];

    tooltip: any = null;

    defaultSort: sorter = 'freq';

    lock: boolean = false;

    // 颜色
    color: any = d3.scaleOrdinal().domain(['1', '2', '3', '4', '5', '6', '7', '8'])
        .range(["#34ace0", "#00d2d3", "#2ed573", "#b8e994", "#ffdb5c",
            "#f78fb3", "#ff4757", "#ff9f7f"]);

    container: any = new zrender.Group();
    customBar: any = document.createElement('custom-bar');
    customTitle: any = document.createElement('custom-title');

    marginLeft: number = 60;
    marginTop: number = 5;
    barHeight: number = 30;

    selectedCmb: any | null = null;
    brushCmb: any = null;
    and: string[] = [];
    or: string[] = [];
    filteredIds: TargetingInfo[] = [];

    constructor(public dom: string) {
        this.zr = zrender.init(document.querySelector(dom));
        this.resize();
        this.zr.add(this.container);
    }
    resize() {
        this.zr.resize();
        this.height = this.zr.getHeight();
        this.width = this.zr.getWidth();
        this.container.attr('position', [this.marginLeft + 0.5, this.marginTop + 0.5]);
        this.xScale.rangeRound([0, this.width - 2 * this.marginLeft]);
    }
    loadData(data: CombinationData[], targets: TargetingInfo[], and: string[], or: string[], filteredIds: TargetingInfo[], selectedCmb: TargetingInfo[] | null, brushCmbs: any) {
        // 此时视图应恢复到最初始状态

        this.data = data;
        this.filteredIds = filteredIds == null ? [] : filteredIds;
        this.targets = targets;
        this.and = and;
        this.or = or;
        this.selectedCmb = selectedCmb;
        this.brushCmb = brushCmbs;
        this.zr.resize({ height: this.barHeight * this.data.length + this.marginTop * 2 })
        this.update();
    }

    update() {
        this.xScale.domain(this.targets.map(target => target.name));
        this.paintBar(this.data);
        this.paintTitle(this.targets);
        this.resolveState();
        this.zr.refresh();
    }

    lockChart(condition: boolean) {
        this.container.attr('silent', condition);
    }

    paintTitle(targets: TargetingInfo[]) {

        let result = targets.map((d, i) => {
            let isAndTarget = this.and.indexOf(d.id) !== -1;
            let isOrTarget = this.or.indexOf(d.id) !== -1;
            let isFiltered = this.filteredIds.findIndex(item => item.id === d.id) !== -1;
            let content: any = null;
            let textFill: any = null;
            let leftPos = Math.round((this.xScale(d.name) as number) + this.xScale.bandwidth() / 2);
            if (isAndTarget === true) {
                content = `${d.name} *`;
                textFill = '#409EFF';
            } else if (isOrTarget) {
                content = `${d.name}`;
                textFill = 'red';
            } else if (isFiltered) {
                content = d.name;
                textFill = "#d2d2d2";
            } else {
                content = d.name;
                textFill = "#000";
            }
            return Object.assign({ content, textFill, leftPos });
        });
        Bus.$emit('paint-titles', result);
        // this.titleContainer.removeAll();
        // // targets = targets.filter(target => this.filteredIds.findIndex(item => item.id === target.id) === -1);
        // targets.forEach((d, i) => {
        //     let content: string = "";
        //     let textFill: string = "";
        //     let isAndTarget = this.and.indexOf(d.id) !== -1;
        //     let isOrTarget = this.or.indexOf(d.id) !== -1;
        //     let isFiltered = this.filteredIds.findIndex(item => item.id === d.id) !== -1;
        //     if (isAndTarget === true) {
        //         content = `${d.name} *`;
        //         textFill = '#409EFF';
        //     } else if (isOrTarget) {
        //         content = `${d.name}`;
        //         textFill = 'red';
        //     } else if (isFiltered) {
        //         content = d.name;
        //         textFill = "gray";
        //     } else {
        //         content = d.name;
        //         textFill = "#000";
        //     }
        //     let text = new zrender.Text({
        //         name: d.name,
        //         style: { text: content, textFill: textFill, textAlign: 'left', textVerticalAlign: 'middle' },
        //         rotation: Math.PI / 4,
        //         position: [Math.round((this.xScale(d.name) as number) + this.xScale.bandwidth() / 2), this.marginTop - 10]
        //         // , zlevel: 2,
        //     });
        //     // this.zr.configLayer(2, { width: this.width, height: 30 })
        //     this.titleContainer.add(text);
        // });
        // this.zr.addHover(this.titleContainer);
    }
    paintBar(data: CombinationData[], ) {
        this.container.removeAll();
        data = data.filter(d => this.brushCmb == null || this.brushCmb.data.findIndex((item: any) => item === d.cmbtargets) !== -1);
        data.forEach((d: any, i) => {
            // posIndex 用于指示该定向组合的排名
            let rank = d.rank;
            let group = new zrender.Group({ position: [0, i * this.barHeight] });
            // 将定向组合取出
            let cmbTargets = d.cmbtargets.split(',');
            group.attr('name', d.cmbtargets);
            let rectGroup = new zrender.Group({ name: 'rects' })
            let ad = cmbTargets.map((c: any) => {
                return this.targets.find(t => t.id === c);
            }).filter((item: any) => item != null);

            (ad as any).cmbtargets = d.cmbtargets;
            let width = this.xScale.bandwidth()
            for (let target of this.targets) {
                let color = this.color(target.id[0]);
                let rect = new zrender.Rect({
                    shape: {
                        x: this.xScale(target.name), y: 0, width: width,
                        height: this.barHeight / 3
                    },
                    style: { fill: color, stroke: d3.rgb(color).darker() },
                    name: target.name,
                    z: 20
                });
                let isInCmb = cmbTargets.indexOf(target.id);
                let isFiltered = this.filteredIds.findIndex(f => f.id === target.id);

                if (isInCmb === -1 || isFiltered !== -1) rect.attr('style', { opacity: 0.1 });
                rectGroup.add(rect);
            }
            group.add(rectGroup);
            let star = new zrender.Star({
                shape: { cx: - Math.round(this.marginLeft / 4), cy: 5, n: 6, r: Math.round(this.barHeight / 4), r0: 5 },
                style: { fill: 'transparent', stroke: '#000', text: rank, textOffset: [- Math.round(this.marginLeft / 2) + 5, 0] },
                active: false,
                cmbtargets: d.cmbtargets,
                raw: ad,
                index: d.index,
                name: 'star',
                z: 10
            });

            star.on('click', this.handleGroupClick, this);
            group.add(star);

            this.container.add(group);
        });
        this.zr.refresh();
    }
    filterCmbsByBrush(brushCmbs: any | null) {
        let filteredCmbs = brushCmbs.data;
        this.container.eachChild((child: any) => {
            let name = child.name
            if (filteredCmbs.indexOf(name) !== -1) {
                // let star = child.childOfName('star').attr('style', { opacity: 1 })
                //     .attr('silent', false);
                child.show();
            }
            else {
                // let star = child.childOfName('star').attr('style', { stroke: '#000', opacity: 0.1 })
                //     .attr('silent', true);
                child.hide();
            }
        })

    }
    resolveState() {
        if (this.selectedCmb != null) {
            let group = this.container.childOfName(this.selectedCmb.cmbtargets);
            group.childOfName('star').attr('active', true).attr('style', { fill: '#000' });
        }
        if (this.brushCmb != null)
            this.filterCmbsByBrush(this.brushCmb);
    }
    handleGroupClick(ev: any) {
        let target = ev.target;
        let group = target.parent;
        if (target.active === false) {
            target.attr('active', true).attr('style', { fill: '#000' });
            // 单选模式下需要检查之前是否有被点击的定向组合
            if (this.selectedCmb != null) {
                let group = this.container.childOfName(this.selectedCmb.cmbtargets);
                group.childOfName("star").attr('active', false).attr('style', { fill: 'transparent' });
            }
            this.selectedCmb = target.raw;
            Bus.$emit('select-cmb', target.raw);
        } else {
            target.attr('active', false).attr('style', { fill: 'transparent' })
            this.selectedCmb = null;
            Bus.$emit('select-cmb', null);
        }
    }
}