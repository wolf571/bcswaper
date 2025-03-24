'use client'
import { useEffect, useState } from 'react';
import { Button, InputLabel, MenuItem, Select, SwipeableDrawer, TextField } from '@mui/material';
import { createDydxAccount, updateDydxAccount } from "@/db/sqliteHandler";
import { generateDate } from '@/utils/formatter';
import { useTranslations } from 'next-intl';
import { findDydxAccountList } from '../service';

export default function DydxAccountPage() {
  const t = useTranslations('DydxAccountPage');

  //行模板
  const dataline = (data: API.DydxAccount) => {
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
              <dd>address: {data.address}</dd>
            </div>
            <div className="flex-none w-full mt-2 font-normal">
              <dd className="text-slate-400">privateKey: {data.privateKey} </dd>
            </div>
            <div className="flex-none w-full mt-2 font-normal">
              <dd className="text-slate-400"> mnemonic: {data.mnemonic}</dd>
            </div>
          </dl>
        </div >
      </article >
    )
  }

  const [datas, setDatas] = useState<API.DydxAccount[]>();

  useEffect(() => {
    (async function f() {
      const datas: API.DydxAccount[] = await findDydxAccountList();
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
  const [address, setAddress] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [mnemonic, setMnemonic] = useState<string>('');
  const [exchange, setExchange] = useState<string>('dydx');

  // add btn
  const handleAdd = () => {
    setId('');
    setName('');
    setAddress("");
    setPrivateKey("");
    setMnemonic("");
    setExchange("dydx");

    openDrawer();
  }

  // edit btn
  const handleEdit = (id: string) => {
    const dt = datas?.find(d => d.id == id);
    setId(id);
    setName(dt?.name || '');
    setAddress(dt?.address || '');
    setPrivateKey(dt?.privateKey || '');
    setMnemonic(dt?.mnemonic || '');
    // setExchange(dt?.exchange || 'dydx');

    openDrawer();
  }

  // save
  const handleSubmit = async () => {
    const a: API.DydxAccount = {
      id,
      name,
      address,
      privateKey,
      mnemonic,
      // exchange,
    }
    //create
    if (!id) {
      a.id = generateDate();
      const c = await createDydxAccount(a);
      datas?.unshift(a);
      setDatas(datas);
    } else {
      //update
      const b = await updateDydxAccount(a);
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
                  id="dt-address"
                  label={t('address')}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="line">
                <TextField
                  fullWidth
                  id="dt-privateKey"
                  label={t('privateKey')}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                />
              </div>
              <div className="line">
                <TextField
                  fullWidth
                  id="dt-mnemonic"
                  label={t('mnemonic')}
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
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
