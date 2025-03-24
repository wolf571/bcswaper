'use client'
import { countOrders, findOrders } from '@/db/sqliteHandler';
import { TablePagination } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function OrderPage() {
  const t = useTranslations('OrderPage');

  const [datas, setDatas] = useState<API.Order[]>();
  const [count, setCount] = useState(0);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    (async function f() {
      const count = await countOrders();
      setCount(count);
    })();
  }, []);

  useEffect(() => {
    (async function f() {
      const datas: API.Order[] = await findOrders(page, rowsPerPage);
      setDatas(datas);
    })();
  }, [page, rowsPerPage]);

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <div className="divide-y divide-slate-100 w-full">
      <nav className="py-4 px-6 text-sm font-medium">
      </nav>
      <table className="mx-6 my-1 tbl">
        <thead>
          <tr>
            <th>{t('account')}</th>
            <th>{t('symbol')}</th>
            <th>{t('side')}</th>
            <th>{t('type')}</th>
            <th>{t('status')}</th>
            <th>{t('price')}</th>
            <th>{t('size')}</th>
            <th>{t('time')}</th>
          </tr>
        </thead>
        <tbody>
          {datas?.map((row: any) => (
            <tr key={row.id}>
              <td>{row.account}</td>
              <td>{row.symbol}</td>
              <td>{row.side}</td>
              <td>{row.type}</td>
              <td>{row.status}</td>
              <td>{row.price}</td>
              <td>{row.size}</td>
              <td>{row.createAt?.toISOString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <TablePagination
        showFirstButton showLastButton
        className='mx-6 border-none'
        component="div"
        count={count}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </div >
  );
}
