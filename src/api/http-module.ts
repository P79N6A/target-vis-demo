import Axios, { AxiosInstance, AxiosRequestConfig, AxiosPromise } from 'axios'
export let defaultSource = Axios.CancelToken.source();
export interface rxiosConfig extends AxiosRequestConfig {
    localCache?: boolean
}
export interface ResponseData<T = any> {
    success: boolean;
    result: T;
    message: string;
}
export default class HttpModule {
    private httpClient: AxiosInstance;
    // http://10.40.185.58:9001
    // 'http://tubi.oa.com/ucube_test/tagvis/'
    constructor(private options: rxiosConfig = { baseURL: 'http://10.40.185.58:9001' }) {
        this.httpClient = Axios.create(options);
        Axios.interceptors.request.use((config: any) => {
            if (config.cancelToken == null) {
                config.cancelToken = defaultSource.token;
            }
            return config;
        });
    }
    private makeRequest<T>(method: string, url: string, queryParams?: object, body?: object, headers?: object) {
        let request: AxiosPromise<T>;
        switch (method) {
            case 'GET':
                request = this.httpClient.get<T>(url, { params: queryParams })
                break;
            case 'POST':
                request = this.httpClient.post<T>(url, body, { params: queryParams, headers: headers })
                break;
            case 'PUT':
                request = this.httpClient.put<T>(url, body, { params: queryParams });
                break;
            case 'PATCH':
                request = this.httpClient.patch<T>(url, body, { params: queryParams })
                break;
            case 'DELETE':
                request = this.httpClient.delete(url, { params: queryParams })
                break;
            default:
                throw new Error('Method not supported');
        }
        return request;
    }
    public get<T>(url: string, queryParams?: object) {
        return this.makeRequest<T>('GET', url, queryParams);
    }

    public post<T>(url: string, body: object, queryParams?: object, headers?: object) {
        return this.makeRequest<T>('POST', url, queryParams, body);
    }

    public put<T>(url: string, body: object, queryParams?: object, headers?: object) {
        return this.makeRequest<T>('PUT', url, queryParams, body);
    }

    public patch<T>(url: string, body: object, queryParams?: object) {
        return this.makeRequest<T>('PATCH', url, queryParams, body);
    }

    public delete(url: string, queryParams?: object) {
        return this.makeRequest('DELETE', url, queryParams);
    }

}