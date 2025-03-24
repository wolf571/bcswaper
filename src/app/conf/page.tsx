'use client'
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { findConfig } from './service';
import { InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { updateConf } from '@/db/sqliteHandler';
import { sleep } from '@/utils/bchelper';

export default function ConfPage() {
  const t = useTranslations('ConfPage');

  const locales = [
    { key: 'en', value: "English" },
    { key: 'zh', value: "中文" }
  ];

  const defaultLocale = "zh";

  const [conf, setConf] = useState<API.Conf>();
  //form data
  const [locale, setLocale] = useState<string>(defaultLocale);
  const [orderInterval, setOrderInterval] = useState<number>(3);
  const [effortTimes, setEffortTimes] = useState<number>(2);
  const [effortInterval, setEffortInterval] = useState<number>(20);
  const [cancelingTimes, setCancelingTimes] = useState<number>(2);
  const [cancelingInterval, setCancelingInterval] = useState<number>(10);
  const [bestEffortSeconds, setBestEffortSeconds] = useState<number>(3);
  const [marketSpreads, setMarketSpreads] = useState<number>(0.001);
  const [orderCacheDays, setOrderCacheDays] = useState<number>(30);
  const [logKeepDays, setLogKeepDays] = useState<number>(10);

  useEffect(() => {
    (async function f() {
      const conf = await findConfig();
      setConf(conf);
      setLocale(conf.locale)
      setOrderInterval(conf.orderInterval);
      setEffortTimes(conf.effortTimes);
      setEffortInterval(conf.effortInterval);
      setCancelingTimes(conf.cancelingTimes);
      setCancelingInterval(conf.cancelingInterval);
      setBestEffortSeconds(conf.bestEffortSeconds);
      setMarketSpreads(conf.marketSpreads);
      setOrderCacheDays(conf.orderCacheDays);
      setLogKeepDays(conf.logKeepDays);
    })();
  }, []);

  // 保存
  const saveConf = async () => {
    const conf = {
      id: 1,
      locale: locale || defaultLocale,
      orderInterval: orderInterval || 3,
      // 下单重试次数
      effortTimes: effortTimes || 1,
      // 下单重试间隔s
      effortInterval: effortInterval || 20,
      // 撤单重试次数
      cancelingTimes: cancelingTimes || 1,
      // 撤单重试间隔s
      cancelingInterval: cancelingInterval || 10,
      bestEffortSeconds: bestEffortSeconds || 3,
      // 扫单时给出的溢/折价
      marketSpreads: marketSpreads || 0.0001,
      orderCacheDays: orderCacheDays || 30,
      logKeepDays: logKeepDays || 10,
    }

    // console.log("save ==== ", conf)
    updateConf(conf);
    await sleep(3000);
    // console.log("reload ==== ", conf)
    window.location.reload();
  }


  return (
    <div className="divide-y divide-slate-100">
      <nav className="py-4 px-6 text-sm font-medium">
        <ul className="flex space-x-3">
          <li>
            {t('title')}
          </li>
        </ul>
      </nav>
      <div className="py-4 px-6">
        <article className="flex items-start space-x-6 p-6 bg-white my-1">
          <div className="line">
            <InputLabel id="lblLocale">{t('locale')}</InputLabel>
            <Select
              required
              fullWidth
              id="dt-locale"
              labelId="lblLocale"
              value={locale}
              onChange={(e) => {
                const value = e.target.value;
                setLocale(value);
              }}
              onBlur={(e) => {
                saveConf();
              }}
            >
              {
                locales?.map((lc) => lc.key == conf?.locale ? <MenuItem key={lc.key} value={lc.key} selected>{lc.value}</MenuItem> : <MenuItem key={lc.key} value={lc.key}>{lc.value}</MenuItem>)
              }
            </Select>
          </div>
        </article >
        <article className="flex items-start space-x-6 p-6 bg-white my-1">
          <div className="line">
            <TextField
              type="number"
              fullWidth
              id="dt-orderInterval"
              label="orderInterval"
              placeholder={orderInterval?.toString()}
              value={orderInterval}
              helperText={t('orderInterval')}
              onChange={(e) => {
                const em = Number(e.target.value) || 0;
                console.log(em)
                setOrderInterval(em);
              }}
              onBlur={(e) => {
                saveConf();
              }}
            />
          </div>
          <div className="line">
            <TextField
              type="number"
              fullWidth
              id="dt-effortTimes"
              label="effortTimes"
              placeholder={effortTimes?.toString()}
              helperText={t('effortTimes')}
              value={effortTimes}
              onChange={(e) => {
                const em = Number(e.target.value) || 0;
                setEffortTimes(em);
              }}
              onBlur={(e) => {
                saveConf();
              }}
            />
          </div>
          <div className="line">
            <TextField
              type="number"
              fullWidth
              id="dt-effortInterval"
              label="effortInterval"
              placeholder={effortInterval?.toString()}
              helperText={t('effortInterval')}
              value={effortInterval}
              onChange={(e) => {
                const em = Number(e.target.value) || 0;
                setEffortInterval(em);
              }}
              onBlur={(e) => {
                saveConf();
              }}
            />
          </div>
        </article >
        <article className="flex items-start space-x-6 p-6 bg-white my-1">
          <div className="line">
            <TextField
              type="number"
              fullWidth
              id="dt-cancelingTimes"
              label="cancelingTimes"
              placeholder={cancelingTimes?.toString()}
              helperText={t('cancelingTimes')}
              value={cancelingTimes}
              onChange={(e) => {
                const em = Number(e.target.value) || 0;
                setCancelingTimes(em);
              }}
              onBlur={(e) => {
                saveConf();
              }}
            />
          </div>
          <div className="line">
            <TextField
              type="number"
              fullWidth
              id="dt-cancelingInterval"
              label="cancelingInterval"
              placeholder={cancelingInterval?.toString()}
              helperText={t('cancelingInterval')}
              value={cancelingInterval}
              onChange={(e) => {
                const em = Number(e.target.value) || 0;
                setCancelingInterval(em);
              }}
              onBlur={(e) => {
                saveConf();
              }}
            />
          </div>
          <div className="line">
            <TextField
              type="number"
              fullWidth
              id="dt-bestEffortSeconds"
              label="bestEffortSeconds"
              placeholder={bestEffortSeconds?.toString()}
              value={bestEffortSeconds}
              helperText={t('bestEffortSeconds')}
              onChange={(e) => {
                const em = Number(e.target.value) || 0;
                setBestEffortSeconds(em);
              }}
              onBlur={(e) => {
                saveConf();
              }}
            />
          </div>
        </article >
        <article className="flex items-start space-x-6 p-6 bg-white my-1">
          <div className="line">
            <TextField
              type="number"
              fullWidth
              id="dt-marketSpreads"
              label="marketSpreads"
              placeholder={marketSpreads?.toString()}
              helperText={t('marketSpreads')}
              value={marketSpreads}
              onChange={(e) => {
                const em = Number(e.target.value) || 0;
                setMarketSpreads(em);
              }}
              onBlur={(e) => {
                saveConf();
              }}
            />
          </div>
          <div className="line">
            <TextField
              type="number"
              fullWidth
              id="dt-orderCacheDays"
              label="orderCacheDays"
              placeholder={orderCacheDays?.toString()}
              helperText={t('orderCacheDays')}
              value={orderCacheDays}
              onChange={(e) => {
                const em = Number(e.target.value) || 30;
                setOrderCacheDays(em);
              }}
              onBlur={(e) => {
                saveConf();
              }}
            />
          </div>
          <div className="line">
            <TextField
              type="number"
              fullWidth
              id="dt-logKeepDays"
              label="logKeepDays"
              value={logKeepDays}
              placeholder={logKeepDays?.toString()}
              helperText={t('logKeepDays')}
              onChange={(e) => {
                const em = Number(e.target.value) || 10;
                setLogKeepDays(em);
              }}
              onBlur={(e) => {
                saveConf();
              }}
            />
          </div>
        </article >
      </div>
    </div >
  );
}
