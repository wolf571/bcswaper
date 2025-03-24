//
// 'use client'

import { CircularProgress } from "@mui/material"

export default function Loading() {
    // return <>Loading...</>;
    return <CircularProgress sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: '-12px',
        marginLeft: '-12px',
    }} />
}