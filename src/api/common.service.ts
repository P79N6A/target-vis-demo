import HttpModule, { ResponseData } from './http-module';
import { defaultSource } from './http-module';
import Axios from 'axios';

export default class CommonService {
    private static instance: CommonService;
    public httpModule: HttpModule;
    constructor() {
        this.httpModule = new HttpModule();
    }
    static getInstance() {
        if (this.instance == null) this.instance = new CommonService();
        return this.instance;
    }

    loadTemplate<T>(payload: any) {

        return this.httpModule.get(`/updtemplate?requestobject=${JSON.stringify(payload)}`)
            .then(res => res.data)
            .then((res: any) => res.data.template);
    }

    getAdsData(payload: string) {
        return this.httpModule.post('/adsdata', Object.assign({ adgroupids: payload }));
    }

    getTargetFreq(payload: any) {

        return this.httpModule.get(`/getpattern?requestobject=${JSON.stringify({
            adgroupids: "",
            filter: JSON.parse(payload.filter),
            ids: payload.ids,
            condition: payload.condition,
            list: payload.list
        })}`);
    }

    // 获取详情模式数据
    getDetail(payload: any) {

        return Promise.all([
            this.httpModule.get(`/condicmbdata?requestobject=${
                JSON.stringify(payload)
                }`),
            this.httpModule.get(`/adsdata?requestobject=${
                JSON.stringify(payload)
                }`),
        ]).then((res: any) => {
            return Object.assign({
                portrait: Object.assign({
                    siteSet: res[0].data.data['site_set'],
                    industry: res[0].data.data['industry_id'],
                    platform: res[0].data.data['ad_platform_type'],
                    prodType: res[0].data.data['product_type'],
                }),
                ads: res[1].data.data
            });
        }).catch(error => {
            console.error(error);
            return null;
        });
    }

    loadAllState(payload: any) {
        let result: any = {};
        return this.httpModule.get(`/calrelandcmbdata?requestobject=${JSON.stringify({
            filter: payload.filter, ids: payload.ids,
        })}`)
            .then(res => res.data)
            .then((res: any) => res.data)
            .then((res: any) => {
                let cmbs = res.cmbs;
                let relations = res.relations;
                result['relations'] = relations;
                result['combinations'] = cmbs;
                let newCondition = Object.assign({ adgroupids: "" }, payload);
                return this.httpModule.get(`/condicmbdata?requestobject=${
                    JSON.stringify(newCondition)
                    }`).then(res => res.data);
            })
            .then((res: any) => {
                let data = res.data;
                result['portrait'] = Object.assign({
                    'siteSet': data['site_set'],
                    'industry': data['industry_id'],
                    'platform': data['ad_platform_type'],
                    'prodType': data['product_type']
                });
                return result;
            }).catch(error => {
                console.error(error);
                return null;
            })
    }

    getTypes() {
        return this.httpModule.get('/gettype')
            .then(res => res.data)
            .then((res: any) => res.data);
    }
    getGlobalFilterTemplate() {
        return this.httpModule.get('/template');
    }
}