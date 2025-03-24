'use client'
import { useEffect, useState } from 'react';
import { Button, InputLabel, MenuItem, Select, SwipeableDrawer, TextField } from '@mui/material';
import { createOkxAccount, findOkxAccount, updateOkxAccount } from "@/db/sqliteHandler";
import { generateDate } from '@/utils/formatter';
import { useTranslations } from 'next-intl';
import { findOkxAccountList } from '../service';

export default function OkxAccountPage() {
  const t = useTranslations('OkxAccountPage');

  //行模板
  const dataline = (data: API.OkxAccount) => {
    return (
      <article className="flex items-start space-x-6 p-6 bg-white my-1" key={data.id}>
        <div className="min-w-0 relative flex-auto">
          <h3 className="font-normal text-slate-900 truncate pr-20 flex flex-row">
            <label className="title">{data.name} </label>
          </h3>
          <dl className="mt-2 flex flex-wrap text-sm leading-6 font-medium">
            <div className="absolute top-0 right-0 flex items-center space-x-1">
              <a href="#" onClick={() => { handleEdit(data.id) }}>
                <img className="w-4 h-4" src="/images/edit.svg" alt='edit' />
              </a>
            </div>
            <div className="flex-none w-full mt-2 font-normal">
              <dd>apiKey: {data.apiKey}</dd>
            </div>
            <div className="flex-none w-full mt-2 font-normal">
              <dd className="text-slate-400">passphrase: {data.passphrase} </dd>
            </div>
            <div className="flex-none w-full mt-2 font-normal">
              <dd className="text-slate-400">secretKey: {data.secretKey}</dd>
            </div>
          </dl>
        </div >
      </article >
    )
  }

  const [datas, setDatas] = useState<API.OkxAccount[]>();

  useEffect(() => {
    (async function f() {
      const datas: API.OkxAccount[] = await findOkxAccountList();
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

  //form data
  const [id, setId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [passphrase, setPassphrase] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [formally, setFormally] = useState<boolean>(false);

  // add btn
  const handleAdd = () => {
    setId('');
    setName('');
    setApiKey("");
    setPassphrase("");
    setSecretKey("");
    setFormally(false);

    openDrawer();
  }

  // edit btn
  const handleEdit = (id: string) => {
    const dt = datas?.find(d => d.id == id);
    setId(id);
    setName(dt?.name || '');
    setApiKey(dt?.apiKey || '');
    setPassphrase(dt?.passphrase || '');
    setSecretKey(dt?.secretKey || '');
    setFormally(dt?.formally || false);

    openDrawer();
  }

  // save
  const handleSubmit = async () => {
    const a: API.OkxAccount = {
      id,
      name,
      apiKey,
      passphrase,
      secretKey,
      formally,
    }
    //create
    if (!id) {
      a.id = generateDate();
      const c = await createOkxAccount(a);
      datas?.unshift(a);
      setDatas(datas);
    } else {
      //update
      const b = await updateOkxAccount(a);
      const ds = datas?.filter(d => d.id !== b.id);
      ds?.unshift(b);
      setDatas(ds);
    }
    closeDrawer();

  }

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
      <div className="py-4 px-6">
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
          <div className="flex flex-row w-[500px]">
            <div className='w-full'>
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
                  id="dt-apiKey"
                  label={t('apiKey')}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div className="line">
                <TextField
                  fullWidth
                  id="dt-passphrase"
                  label={t('passphrase')}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                />
              </div>
              <div className="line">
                <TextField
                  fullWidth
                  id="dt-secretKey"
                  label={t('secretKey')}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                />
              </div>
              <div className="line">
                <InputLabel id="lblFormally">{t('formally')}</InputLabel>
                <Select
                  required
                  fullWidth
                  id="dt-formally"
                  labelId="lblFormally"
                  value={formally}
                  onChange={(e) => {
                    const value = e.target.value;
                    const result = value === "true" ? true : false;
                    setFormally(result);
                  }}
                >
                  <MenuItem value="false">{t('formallyFalse')}</MenuItem>
                  <MenuItem value="true">{t('formallyTrue')}</MenuItem>
                </Select>
              </div>
              <div className="line">
                <Button variant="text" type="button" onClick={handleSubmit}>Save</Button>
              </div>
            </div>
            <div className="w-8">

            </div>
          </div>
        </div>
      </SwipeableDrawer>
    </div >
  );
}
