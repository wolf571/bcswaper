'use client'
import { countLogs, findLogs } from '@/db/sqliteHandler';
import { TablePagination } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function LogPage() {
  const t = useTranslations('LogPage');

  const [datas, setDatas] = useState<API.Log[]>();
  const [count, setCount] = useState(0);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    (async function f() {
      const count = await countLogs();
      setCount(count);
    })();
  }, []);

  useEffect(() => {
    (async function f() {
      const datas: API.Log[] = await findLogs(page, rowsPerPage);
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

  const handleMouseOver = (id: string) => {
    const log = datas?.filter(d => d.id === id)?.at(0);
    const dc = document.getElementById(`content-${id}`)?.firstChild;
    if (dc) {
      dc.textContent = log?.content || "";
    }
  };

  const handleMouseLeave = (id: string) => {
    const log = datas?.filter(d => d.id === id)?.at(0);
    const content = log?.content;
    if (content && content.length > 120) {
      const cc = content.substring(0, 120).concat("...");
      const dc = document.getElementById(`content-${id}`)?.firstChild;
      if (dc) {
        dc.textContent = cc;
      }
    }
  };

  // 转换过长的内容
  const convertContent = (content: string) => {
    if (content?.length > 120) {
      const cc = content.substring(0, 120).concat("...");
      return cc;
    }

    return content;
  }

  return (
    <div className="divide-y divide-slate-100 w-full">
      <nav className="py-4 px-6 text-sm font-medium">
      </nav>
      <table className="mx-6 my-1 tbl">
        <thead>
          <tr>
            <th>{t('swapName')}</th>
            <th>{t('symbol')}</th>
            <th>{t('createAt')}</th>
            <th>{t('content')}</th>
          </tr>
        </thead>
        <tbody>
          {datas?.map((row) => (
            <tr key={row.id}>
              <td>{row.swapName}</td>
              <td>{row.symbol}</td>
              <td>{row.createAt?.toISOString()}</td>
              <td>
                <div className="content">{row.content}</div>
              </td>
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
