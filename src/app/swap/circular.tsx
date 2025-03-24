import React from 'react';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import styled from '@emotion/styled';

// 使用 styled 创建一个样式化的 Backdrop  
const StyledBackdrop = styled(Backdrop)`  
  z-index: 10000;  
  color: #1677ff;  
`;

interface CircularProps {
    open: boolean;
}

const Circular: React.FC<CircularProps> = ({ open }) => {
    if (!open) return null;

    return (
        <StyledBackdrop open={open} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <CircularProgress color="inherit" />
        </StyledBackdrop>
    );
};

export default Circular;