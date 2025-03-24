'use client'
import { Tabs, Tab } from '@mui/material';
import { useTranslations } from 'next-intl';
import React from 'react';

export default function AccountPage() {
  const t = useTranslations('AccountPage');
  function samePageLinkNavigation(
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  ) {
    if (
      event.defaultPrevented ||
      event.button !== 0 || // ignore everything but left-click
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    ) {
      return false;
    }
    return true;
  }

  interface LinkTabProps {
    label?: string;
    href?: string;
    selected?: boolean;
  }

  function LinkTab(props: LinkTabProps) {
    return (
      <Tab
        component="a"
        onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
          // Routing libraries handle this, you can remove the onClick handle when using them.
          if (samePageLinkNavigation(event)) {
            event.preventDefault();
          }
        }}
        aria-current={props.selected && 'page'}
        {...props}
      />
    );
  }

  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    // event.type can be equal to focus with selectionFollowsFocus.
    if (
      event.type !== 'click' ||
      (event.type === 'click' &&
        samePageLinkNavigation(
          event as React.MouseEvent<HTMLAnchorElement, MouseEvent>,
        ))
    ) {
      setValue(newValue);
    }
  };

  return (
    <div className="divide-y divide-slate-100">
      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="choose an exchange"
        role="navigation"
      >
        <LinkTab label="Dydx" href="/account/dydx" />
        <LinkTab label="Okx" href="/account/okx" />
      </Tabs>
    </div >
  );
}
