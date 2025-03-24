'use client'
import { useEffect, useState, useRef } from 'react';
import { Button, InputLabel, MenuItem, Select, SwipeableDrawer, TextField, Tab, Box } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { createStrategy, findStrategys, updateStrategy } from '@/db/sqliteHandler';
import { formatDate, generateDate } from '@/utils/formatter';
import { useTranslations } from 'next-intl';
import { monacoExtraLib } from '@/utils/monacoEditor';
import Editor, { loader } from '@monaco-editor/react';

export default function StrategyPage() {
  const t = useTranslations('StrategyPage');

  //行模板
  const dataline = (data: API.Strategy) => {
    return (
      <article className="flex items-start space-x-6 p-6 bg-white mb-1 mr-2" key={data.id}>
        <div className="min-w-0 relative flex-auto">
          <h3 className="title font-normal text-slate-900 truncate pr-20">{data.name}</h3>
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
              <dd>{data.remark}</dd>
            </div>
            <div className="flex-none w-full mt-2 font-normal">
              <dd className="text-slate-400">{data.symbol} <label className='ml-6'> {formatDate(data.createAt)}</label></dd>
            </div>
          </dl>
        </div >
      </article >
    )
  }

  const [datas, setDatas] = useState<API.Strategy[]>();

  useEffect(() => {
    (async function f() {
      const datas: API.Strategy[] = await findStrategys();
      setDatas(datas);
    })();
  }, []);

  // drawer
  const [open, setOpen] = useState(false);
  const toggleDrawer = (newOpen: boolean) => {
    setOpen(newOpen);
    // console.log("open")
    if (newOpen) {

    }
  };

  const openDrawer = () => {
    toggleDrawer(true);
  }

  const closeDrawer = () => {
    toggleDrawer(false);
  }

  const jsvalue = "// here start writing the strategy.\n";

  //form data
  const [id, setId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [exchange, setExchange] = useState<string>('dydx');
  const [symbol, setSymbol] = useState<string>('');
  const [params, setParams] = useState<string>('');
  const [jscontent, setJscontent] = useState<string>(jsvalue);

  useEffect(() => {
    const regex = /^(https?:\/\/.+(:\d+)?)\//;
    const path = location.href;
    let prefix = "/";
    var match = regex.exec(path);
    if (match) {
      prefix = match[0];
    }
    const loaderConfig = {
      'vs/nls': {
        availableLanguages: {
          '*': 'zh-cn',
        },
      },
      paths: {
        // 根据需要调整版本和产物类型
        // https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs
        vs: prefix + '_next/static/monaco/vs',
      },
    };
    loader.config(loaderConfig);
  }, []);

  //编辑器
  interface EditorRefType {
    getValue?: any;
    setValue?: any;
  }
  const editorRef = useRef<EditorRefType>();
  interface MonacoRefType {
    languages?: any;
  }
  const monacoRef = useRef<MonacoRefType>();

  const onEditorDidMount = (editor: any, monaco: any) => {
    // console.log('editor', editor, monaco)
    monaco.languages.typescript.typescriptDefaults.addExtraLib(monacoExtraLib, 'so-lib');
    monacoRef.current = monaco;

    editor.onDidChangeModelContent(() => {
      setJscontent(editor.getValue());
    })
    editorRef.current = editor;
  }

  const onEditorChange = (value: any, event: any) => {
    setJscontent(value);
  }

  useEffect(() => {
    if (params) {
      monacoRef?.current?.languages.typescript.typescriptDefaults.addExtraLib(
        `class Params {
          ${params}
        }`, 'params-lib');
    }
  }, [params]);

  // add btn
  const handleAdd = () => {
    setId('');
    setName('');
    setRemark('');
    setExchange("dydx");
    setSymbol('');
    setParams('');
    setJscontent('');

    openDrawer();
  }

  // edit btn
  const handleEdit = (id: string) => {
    const dt = datas?.find(d => d.id == id);
    setId(id);
    setName(dt?.name || '');
    setRemark(dt?.remark || '');
    setExchange(dt?.exchange || 'dydx');
    setSymbol(dt?.symbol || '');
    setParams(dt?.params || '');
    setJscontent(dt?.jscontent || jsvalue);

    openDrawer();
  }

  // save
  const handleSubmit = async () => {
    const a: API.Strategy = {
      id,
      name,
      remark,
      exchange,
      symbol,
      params,
      jscontent,
    }
    //create
    if (!id) {
      a.id = generateDate();
      const c = await createStrategy(a);
      datas?.unshift(a);
      setDatas(datas);
    } else {
      //update
      const b = await updateStrategy(a);
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
    <div className="divide-y divide-slate-100">
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
      <SwipeableDrawer
        anchor="right"
        open={open}
        onClose={closeDrawer}
        onOpen={openDrawer}
      >
        <div className='editBox'>
          <div id="monacoEditor" className='codeArea'>
            <Editor
              height="100%"
              language="typescript"
              theme="vs"
              options={{
                minimap: {
                  enabled: false,
                }
              }}
              defaultValue={jsvalue}
              value={jscontent}
              onMount={onEditorDidMount}
              onChange={onEditorChange}
            />
          </div>
          <div className='formArea w-72'>
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
                  <TextField
                    required
                    fullWidth
                    id="dt-remark"
                    label={t('remark')}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                  />
                </div>
                <div className="line">
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
                <div className="line">
                  <TextField
                    fullWidth
                    id="dt-symbol"
                    label={t('symbol')}
                    value={symbol}
                    onChange={(e) => {
                      const s = e.target.value;
                      setSymbol(s);
                    }}
                    helperText="default contract/coin"
                  />
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
                    onChange={(e) => {
                      const p = e.target.value;
                      setParams(p);
                    }}
                    placeholder="filed: type;"
                    helperText="a: string; b: number;"
                  />
                </div>
              </TabPanel>
            </TabContext>
            <div className="btn">
              <Button variant="text" type="button" onClick={handleSubmit}>Save</Button>
            </div>
          </div>
        </div>
      </SwipeableDrawer>
    </div >
  );
}
