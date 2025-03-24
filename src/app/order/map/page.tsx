'use client'
import { getCacheOrderArray, getCacheOrderMap } from '@/db/sqliteHelper';
import queryString from 'query-string';
import { useEffect } from 'react';

export default function OrderMapPage() {
  let orders;

  useEffect(() => {
    const { name } = queryString.parse(location.search);
    if (typeof name === "string") {
      orders = getCacheOrderArray(name);
    } else {
      orders = getCacheOrderMap();
    }
  }, [])

  return (
    orders ? orders : "there is no data cache now."
  );
}
