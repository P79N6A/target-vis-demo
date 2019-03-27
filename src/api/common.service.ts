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
        return this.httpModule.post('/updtemplate', payload)
    }

    getAdsData(payload: string) {
        return this.httpModule.post('/adsdata', Object.assign({ adgroupids: payload }));
    }

    getDetail(payload: any) {
        let adgroupids = payload.adgroupids;
        adgroupids = adgroupids.split(",").map((a: any) => "'" + a + "'").join(",");
        return Promise.all([
            this.httpModule.post('/condicmbdata', Object.assign({ ids: payload.ids, adgroupids, condition: 'site_set' })),
            this.httpModule.post('/condicmbdata', Object.assign({ ids: payload.ids, adgroupids, condition: 'industry_id' })),
            this.httpModule.post('/condicmbdata', Object.assign({ ids: payload.ids, adgroupids, condition: 'ad_platform_type' })),
            this.httpModule.post('/condicmbdata', Object.assign({ ids: payload.ids, adgroupids, condition: 'product_type' })),
            this.httpModule.post('/adsdata', Object.assign({ adgroupids }))
        ]).then(res => Object.assign({
            portrait: Object.assign({
                site_set: res[0].data,
                industry_id: res[1].data,
                ad_platform_type: res[2].data,
                product_type: res[3].data
            }),
            ads: res[4].data
        }))
    }

    loadAllState(payload: any) {
        let result: any = {};
        let adgroupids = "";
        return this.httpModule.post('/calrelandcmbdata', payload)
            .then(res => res.data)
            .then((res: any) => {
                let cmbs = res.cmbs;
                let relations = res.relations;
                result['relations'] = relations;
                result['combinations'] = cmbs;
                adgroupids = cmbs.map((d: any) => d.adgroupids).join("");
                return Promise.all([
                    this.httpModule.post('/condicmbdata', Object.assign({ adgroupids, ids: payload.ids, condition: 'site_set' })),
                    this.httpModule.post('/condicmbdata', Object.assign({ adgroupids, ids: payload.ids, condition: 'industry_id' })),
                    this.httpModule.post('/condicmbdata', Object.assign({ adgroupids, ids: payload.ids, condition: 'ad_platform_type' })),
                    this.httpModule.post('/condicmbdata', Object.assign({ adgroupids, ids: payload.ids, condition: 'product_type' })),
                ]);
            }).then(res => res.map(res => res.data))
            .then(res => {
                result['portrait'] = Object.assign({
                    'site_set': res[0],
                    'industry_id': res[1],
                    'ad_platform_type': res[2],
                    'product_type': res[3]
                })
                return result;
            });
    }

    getTypes() {
        return this.httpModule.get('/template');
    }
    getGlobalFilterTemplate() {
        return this.httpModule.get('/template');
    }
}