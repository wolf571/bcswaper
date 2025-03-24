'use client'
import { useWindowSize } from '@/components/windowSize';
import { findLatelyOrderList } from '@/db/sqliteHelper';
import { formatToYYYYMMDD } from '@/utils/formatter';
import { unique } from '@/utils/bchelper';
import { OrderSide } from "@/service/client";
import { BarChart, PieChart } from '@mui/x-charts';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { findAccountInfos } from './swap/service';

interface P { value: number, label: string };
// const pData = [
//   { value: 5, label: 'dydx' },
//   { value: 10, label: 'uniswap' },
//   { value: 15, label: '1inch' },
// ];
export default function HomePage() {
  const size = useWindowSize();
  const t = useTranslations('HomePage');

  const [xLabels, setXLabels] = useState<string[]>([]);
  const [bData, setBData] = useState<number[]>([]);
  const [sData, setSData] = useState<number[]>([]);

  const [pData, setPData] = useState<P[]>([]);

  useEffect(() => {
    (async function f() {
      const orders = await findLatelyOrderList();
      if (orders) {
        // 计算买/卖数量
        const xs = orders.map(o => formatToYYYYMMDD(o.createAt));
        const x = await unique(xs);
        // setXLabels(x);
        let bs = new Array();
        let ss = new Array();
        x.forEach(a => {
          const ab = orders.filter(o => o.side == OrderSide.BUY && formatToYYYYMMDD(o.createAt) === a).length;
          const as = orders.filter(o => o.side == OrderSide.SELL && formatToYYYYMMDD(o.createAt) === a).length;
          bs.push(ab);
          ss.push(as);
        })
        setBData(bs);
        setSData(ss);
        // 简化xlables
        let y = new Array();
        let ds = ["", "", ""];
        x.forEach(e => {
          const es: string = e.toString();
          const year = es.substring(0, 4);
          const month = es.substring(4, 6);
          const day = es.substring(6, 8);
          if (ds[0] != year) {
            y.push(e);
          }
          else if (ds[1] != month) {
            y.push(month.concat(day));
          }
          else {
            y.push(day);
          }
          ds = [year, month, day];
        });
        setXLabels(y);
        // 计算账户订单数量
        const accounts = orders.map(o => o.account);
        const accs = await unique(accounts);
        let pdatas: P[] = new Array();
        console.log("accs === ", accs)
        // 获取用户信息列表
        const accountInfos = await findAccountInfos();
        // console.log(accountInfos)
        accs.forEach(a => {
          const acc = accountInfos.find(c => c.account == a);
          const name = acc?.name || a;
          const c = orders.filter(o => o.account === a)?.length || 0;
          pdatas.push({ value: c, label: name });
        })
        setPData(pdatas);
      }
    })();
  }, []);

  return <>
    <div className="divide-y divide-slate-100">
      <div className="my-4 mx-6 bg-white float-left">
        <BarChart
          width={(size.width - 120) / 2}
          height={300}
          series={[
            { data: bData, id: 'pvId', color: "CornflowerBlue" },
            { data: sData, id: 'uvId', color: "DeepSkyBlue" },
          ]}
          xAxis={[{ data: xLabels, scaleType: 'band' }]}
        />
        <div className='title text-center pb-2'>{t('statistic')}</div>
      </div>
      <div className="my-4 bg-white float-left">
        <PieChart series={[{ data: pData, innerRadius: 80, outerRadius: 100 }]}
          width={(size.width - 120) / 3}
          height={300}
        // margin={{ right: 15 }}
        />
        <div className='title text-center pb-2'>{t('pie')}</div>
      </div>
    </div>
  </>
}

