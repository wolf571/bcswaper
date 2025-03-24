// 
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import crypto from "crypto";
import qs from "query-string";
import { ClientSettings, OkxAccount } from '../context';
import { InstType, OkxConstants } from './okxContext';

export class OkxHttpClient {
    // 账户信息
    private okxAccInfo!: OkxAccount;

    private apiClient: AxiosInstance;

    constructor(okxAccInfo: OkxAccount, baseURL?: string) {
        this.okxAccInfo = okxAccInfo;

        baseURL = baseURL || OkxConstants.HTTP_ENDPOINT;
        this.apiClient = axios.create({
            baseURL,
        });
    }

    // 设置header
    getSignedHeader(method: string, path: string, params: any = "") {
        const signData = this.sign(this.okxAccInfo.secretKey, path, params, method);
        return {
            "OK-ACCESS-KEY": this.okxAccInfo.apiKey,
            "OK-ACCESS-TIMESTAMP": signData[0],
            "OK-ACCESS-SIGN": signData[1],
            "OK-ACCESS-PASSPHRASE": this.okxAccInfo.passphrase,
        };
    }

    // 签名
    sign(secretkey: string, path: string, params: string = '', method: string = 'GET') {
        const hmac = crypto.createHmac('sha256', secretkey);
        const ts = new Date().toISOString();
        return [
            ts,
            hmac.update(`${ts}${method}${path}${params && JSON.stringify(params)}`).digest('base64')
        ];
    }

    async get<T>(path: string, params: any = ""): Promise<T> {
        if (params) {
            for (const key of Object.keys(params || {})) {
                if (params[key] === null || params[key] === undefined)
                    delete params[key];
            }
            path += "?" + qs.stringify(params);
        }

        const res = await this.apiClient.get<any, AxiosResponse<T, any>, T>(path, {
            headers: this.getSignedHeader("GET", path),
        });
        return res.data;
    }

    async post<T>(path: string, body: any): Promise<T> {
        const headers = {
            ...this.getSignedHeader("POST", path, body),
            "Content-Type": "application/json",
        };

        const res = await this.apiClient.post<any, AxiosResponse<T, any>, T>(
            path,
            body,
            { headers }
        );
        return res.data;
    }

    // 获取K线
    async getCandles(instId: string, bar: string) {
        const {
            data: { data },
        } = await this.apiClient.get("/api/v5/market/candles", {
            params: {
                instId,
                bar,
                limit: ClientSettings.ListLenths,
            },
        });
        return data;
    }
    // 获取产品信息
    async getInstInfo(instType: InstType, instId: string) {
        const {
            data: { data },
        } = await this.apiClient.get("/api/v5/public/instruments", {
            params: {
                instType,
                instId,
            },
        });
        return data;
    }
}