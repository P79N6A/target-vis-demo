import HttpModule, { ResponseData } from './http-module';
import { RelationPostData } from '@/models';

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

    getDetailed() {
        return this.httpModule.get('http://localhost:3000/detail')
    }

    getTypes() {
        return this.httpModule.get('http://localhost:3000/tempAndTypes');
    }

    getRelations<T>(url: string, payload: RelationPostData) {
        return this.httpModule.post<ResponseData<T>>(url, payload);
    }
    loadCombinationData<T>(url: string) {
        return this.httpModule.get(url);
    }
    getPortrait(payload: any) {
        return this.httpModule.post('/condicmbdata', payload)
    }
    getGlobalFilterTemplate() {
        return this.httpModule.get('/template');
    }
}