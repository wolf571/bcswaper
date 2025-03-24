'use client'
import { useEffect, useState } from 'react';
import { Alert, Box, Button, InputLabel, Link, MenuItem, Select, Snackbar, SwipeableDrawer, Tab, TextField } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { createSwap, findStrategys, findSwaps, updateSwap } from '@/db/sqliteHandler';
import { generateDate } from '@/utils/formatter';
import { start, stop } from '@/service/swapServer';
import Circular from './circular';
import { useTranslations } from 'next-intl';
import { findAccountInfos } from './service';

export default function SwapPage() {
  const t = useTranslations('SwapPage');

  //行模板
  const dataline = (data: API.Swap) => {
    return (
      <article className="flex items-start space-x-6 p-6 bg-white mb-1 mr-2" key={data.id}>
        <div className="min-w-0 relative flex-auto">
          <h3 className="font-normal text-slate-900 truncate pr-20 flex flex-row">
            <label className="title">{data.name}/{data.subaccount} </label>
            <a href="#" onClick={() => {
              swapAction(data);
            }}>
              {data.status ?
                <svg className="w-4 h-4 ml-2 mt-0.5 svgstop" viewBox="0 0 1024 1024"><path d="M510.978229 62.897515c-246.926856 0-447.091688 200.158692-447.091688 447.089641 0 246.934019 200.164832 447.089641 447.091688 447.089641 246.934019 0 447.087595-200.158692 447.087595-447.090665C958.065823 263.056208 757.911224 62.897515 510.978229 62.897515zM510.978229 897.466142c-213.647915 0-387.480009-173.828001-387.480009-387.477962 0-213.646891 173.832094-387.475915 387.480009-387.475915s387.474892 173.830047 387.474892 387.475915C898.454144 723.636095 724.626143 897.466142 510.978229 897.466142z" p-id="9356"></path><path d="M317.222363 316.233338 317.222363 703.740976l387.507638 0L704.730001 316.233338 317.222363 316.233338zM648.391878 646.379547 375.607098 646.379547 375.607098 373.59579l272.78478 0L648.391878 646.379547z" p-id="9357"></path></svg>
                :
                <svg className="w-4 h-4 ml-2 mt-0.5 svgstart" viewBox="0 0 1024 1024"><path d="M708.14216283 502.27134828L431.03251478 313.66104496c-8.63025501-6.27654898-31.53965997-6.27654898-33.42262331 17.57433765v377.22060664c2.03987839 23.85088663 25.4200248 24.32162809 33.42262331 17.57433887L708.14216283 537.4200248c7.21803188-4.39358442 17.1035962-21.96792206 0-35.14867652z m-259.84913681 155.34459259V381.91851839L650.39791021 519.84568593l-202.10488419 137.77025494z" p-id="12324"></path><path d="M511.84308619 30.27484914C247.12962352 30.27484914 31.84398609 249.95407099 31.84398609 519.84568593s215.28563743 489.57083679 479.9991001 489.570838 479.9991001-219.67922183 479.99910008-489.570838S776.55654885 30.27484914 511.84308619 30.27484914z m0 927.67397115C274.90335434 957.94882029 82.37020805 761.49283104 82.37020805 519.84568593S275.06026815 81.74255278 512 81.74255278 941.47287813 278.19854203 941.47287813 519.84568593 748.78281804 957.94882029 511.84308619 957.94882029z" p-id="12325"></path></svg>
              }
            </a>
          </h3>
          <dl className="mt-2 flex flex-wrap text-sm leading-6 font-medium">
            <div className="absolute top-0 right-0 flex items-center space-x-1">
              <a href="#" onClick={() => { handleEdit(data.id) }}>
                <img className="w-4 h-4" src="/images/edit.svg" alt='edit' />
              </a>
            </div>
            <div>
              <dd className="px-1.5 ring-1 ring-slate-200 rounded">{data.exchange}</dd>
            </div>
            <div className="ml-2">
              <dd>{data.strategy} for {data.symbol}</dd>
            </div>
            <div className="absolute right-0 flex items-center text-xs">
              {data.status ?
                <dd className='text-green-600'>{t('status.running')}</dd>
                :
                <dd className='text-slate-400'>{t('status.stopped')}</dd>}
            </div>
            <div className="w-full mt-2 font-normal">
              <dd className="text-slate-400"> params = {data.params}</dd>
            </div>
          </dl>
        </div >
      </article >
    )
  }

  const [datas, setDatas] = useState<API.Swap[]>();
  //account list
  const [accountDatas, setAccountDatas] = useState<API.AccountInfo[]>();
  // strategy list
  const [strategyDatas, setStrategyDatas] = useState<API.Strategy[]>();

  useEffect(() => {
    (async function f() {
      const accounts: API.AccountInfo[] = await findAccountInfos();
      setAccountDatas(accounts);

      const strategys: API.Strategy[] = await findStrategys();
      setStrategyDatas(strategys);

      const datas: API.Swap[] = await findSwaps();
      setDatas(datas);
    })();
  }, []);

  // drawer
  const [open, setOpen] = useState(false);
  const toggleDrawer = (newOpen: boolean) => {
    setOpen(newOpen);
    // console.log("open")
    if (newOpen) {
      // showToast("hi")
    }
  };

  const openDrawer = () => {
    toggleDrawer(true);
  }

  const closeDrawer = () => {
    toggleDrawer(false);
  }

  // 启动/停止
  const swapAction = async (data: API.Swap) => {
    setLoading(true);
    const ds = datas?.filter(d => d.id != data.id);
    let result;
    if (!data.status) {
      result = await start(data);
      if (result?.code === "0000") {
        data.status = true;
        ds?.unshift(data);
        setDatas(ds);
      }
    } else {
      result = await stop(data);
      if (result?.code === "0000") {
        data.status = false;
        ds?.unshift(data);
        setDatas(ds);
      }
    }
    // console.log(result)
    setLoading(false);
    if (result?.message) {
      setStateOpen(true);
      setMessage(result?.message);
      // setSeverity(result?.code == "0000");
      const s = result?.code == "0000" ? "success" : "error";
      setSeverity(s);
    }
  }

  // Snackbar 
  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setStateOpen(false);
  };
  const [loading, setLoading] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  // const [severity, setSeverity] = useState(false);
  const [severity, setSeverity] = useState<any>();
  const [message, setMessage] = useState("");

  //form data
  const [id, setId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [strategy, setStrategy] = useState<string>('');
  const [exchange, setExchange] = useState<string>('');
  const [account, setAccount] = useState<string>('');
  const [subaccount, setSubaccount] = useState<number>(0);
  const [status, setStatus] = useState<boolean>(false);
  const [symbol, setSymbol] = useState<string>('');
  const [ccy, setCcy] = useState<string>('');
  const [params, setParams] = useState<string>('');
  const [paramsHelperText, setParamsHelperText] = useState<string>('json');

  // add btn
  const handleAdd = () => {
    setId('');
    setName('');
    setStrategy('');
    setExchange('');
    setAccount('');
    setSubaccount(0);
    setSymbol('');
    setCcy('');
    setStatus(false);
    setParams('');
    setParamsHelperText('');

    openDrawer();
  }

  // edit btn
  const handleEdit = (id: string) => {
    const dt = datas?.find(d => d.id == id);
    setId(id);
    setName(dt?.name || '');
    setStrategy(dt?.strategy || '');
    setExchange(dt?.exchange || '');
    setAccount(dt?.account || '');
    setSubaccount(dt?.subaccount || 0);
    setSymbol(dt?.symbol || '');
    setCcy(dt?.ccy || '');
    setStatus(dt?.status || false);
    setParams(dt?.params || '');

    // filter strategy
    const st = strategyDatas?.find(sd => sd.name == dt?.strategy);
    setParamsHelperText(st?.params || 'json');

    openDrawer();
  }

  // save
  const handleSubmit = async () => {
    const a: API.Swap = {
      id,
      name,
      strategy,
      exchange,
      account,
      subaccount,
      status,
      symbol,
      ccy,
      params,
    }
    //create
    if (!id) {
      a.id = generateDate();
      const c = await createSwap(a);
      datas?.unshift(a);
      setDatas(datas);
    } else {
      //update
      const b = await updateSwap(a);
      const ds = datas?.filter(d => d.id !== b.id);
      ds?.unshift(b);
      setDatas(ds);
    }

    closeDrawer();
  }

  // tab 切换
  const [tab, setTab] = useState('1');
  const tabChange = (event: React.SyntheticEvent, v: string) => {
    setTab(v);
  };

  return (
    <div className="divide-y divide-slate-100 w-full">
      <nav className="py-4 px-6 text-sm font-medium">
        <ul className="flex space-x-3">
          <li>
            <a href="#" onClick={handleAdd}
              className={`block px-3 py-2 rounded-md`}
            >
              + {t('title')}
            </a>
          </li>
        </ul>
      </nav>
      <div className="py-4 px-6 flex flex-row">
        {
          datas?.map((data) => {
            return dataline(data);
          })
        }
      </div>
      <Circular open={loading} />
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={stateOpen}
        autoHideDuration={5000}
        onClose={handleClose}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
      <SwipeableDrawer
        anchor="right"
        open={open}
        onClose={closeDrawer}
        onOpen={openDrawer}
      >
        <div className='editBox'>
          {/* <div className="flex flex-row"> */}
          <div className='w-80'>
            <TabContext value={tab}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <TabList onChange={tabChange}>
                  <Tab label={t('tab.basic')} value="1" />
                  <Tab label={t('tab.param')} value="2" />
                </TabList>
              </Box>
              <TabPanel value="1">
                <div className="line">
                  <TextField
                    required
                    fullWidth
                    id="dt-name"
                    label={t('name')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="line">
                  <InputLabel id="lblStrategy">{t('strategy')}</InputLabel>
                  <Select
                    required
                    fullWidth
                    id="dt-strategy"
                    labelId="lblStrategy"
                    value={strategy}
                    onChange={(e) => {
                      const s = e.target.value;
                      setStrategy(s);
                      // 
                      const dt = strategyDatas?.find(sd => sd.name == s);
                      setExchange(dt?.exchange || '');
                      setParamsHelperText(dt?.params || 'json');
                    }}
                  >
                    {
                      strategyDatas?.map((sd) => sd.name == strategy ? <MenuItem key={sd.id} value={sd.name} selected>{sd.name}</MenuItem> : <MenuItem key={sd.id} value={sd.name}>{sd.name}</MenuItem>)
                    }
                  </Select>
                </div>
                <div className="line">
                  <div className="half">
                    <InputLabel id="lblExchange">{t('exchange')}</InputLabel>
                    <Select
                      required
                      fullWidth
                      id="dt-exchange"
                      labelId="lblExchange"
                      value={exchange}
                      onChange={(e) => setExchange(e.target.value)}
                    >
                      <MenuItem value="dydx">DYDX</MenuItem>
                      <MenuItem value="okx">OKX</MenuItem>
                    </Select>
                  </div>
                  <div className="half">
                    <InputLabel id="lblAccount">{t('account')}</InputLabel>
                    <Select
                      required
                      fullWidth
                      id="dt-account"
                      labelId="lblAccount"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                    >
                      {
                        accountDatas?.filter(acc => acc.exchange == exchange)?.map((acc) => acc.name == account ? <MenuItem key={acc.id} value={acc.name} selected>{acc.name}</MenuItem> : <MenuItem key={acc.id} value={acc.name}>{acc.name}</MenuItem>)
                      }
                    </Select>
                  </div>
                </div>
                <div className="line">
                  <div className="half">
                    <TextField
                      required
                      fullWidth
                      id="dt-subaccount"
                      label={t('subaccount')}
                      value={subaccount}
                      onChange={(e) => setSubaccount(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="half">
                    <TextField
                      required
                      fullWidth
                      id="dt-symbol"
                      label={t('symbol')}
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                    // helperText="the contract/coin to swap"
                    />
                  </div>
                </div>
                <div className="line">
                  <InputLabel id="lblCcy">{t('ccy')}</InputLabel>
                  <Select
                    required
                    fullWidth
                    id="dt-ccy"
                    labelId="lblCcy"
                    value={ccy}
                    onChange={(e) => setCcy(e.target.value)}
                  >
                    <MenuItem value="USDC">USDC</MenuItem>
                    <MenuItem value="USDT">USDT</MenuItem>
                  </Select>
                </div>
              </TabPanel>
              <TabPanel value="2">
                <div className="line">
                  <TextField
                    required
                    fullWidth
                    multiline
                    rows={12}
                    id="dt-params"
                    label={t('params')}
                    value={params}
                    onChange={(e) => setParams(e.target.value)}
                    placeholder="like {a:'a value', b:'b value'}"
                    helperText={paramsHelperText}
                  />
                </div>
              </TabPanel>
            </TabContext>
            <div className="btn">
              <Button variant="text" type="button" onClick={handleSubmit} >Save</Button>
            </div>
          </div>
        </div>
      </SwipeableDrawer >
    </div >
  );
}
