import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';

export const metadata: Metadata = {
  title: "BCSwaper",
  description: "a programmatic trading framework for digital currencies.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const locale = await getLocale();

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();
  const t = await getTranslations('RootLayout');

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <header>
            <div className="logo">
              <Link href={"/"}>
                <img src="/images/logo.svg" alt="logo" />
              </Link>
              <Link href={"/"}>
                {t('title')}
              </Link>
            </div>
            <div className="navigation">
              <ul>
                <li><Link href="/conf">{t('config')}</Link></li>
                <li>
                  <div className="profile">
                    <label className="self"><img src="/images/user.svg" alt="mine" /> {t('profile')}</label>
                    <div className="dds">
                      <a href="/account/dydx">Dydx</a>
                      <a href="/account/okx">Okx</a>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </header>
          <aside>
            <div className="self-center mb-14">
              <div className="self-center appbtn">
                <Link href={"/strategy"}>
                  <img src="/images/strategy.svg" alt="strategy" />
                  {t('strategy')}</Link>
              </div>
              <div className="self-center appbtn">
                <Link href={"/swap"}>
                  <img src="/images/swap.svg" alt="swap" />
                  {t('swap')}
                </Link>
              </div>
              <div className="self-center appbtn">
                <Link href={"/order"}>
                  <img src="/images/order.svg" alt="order" />
                  {t('order')}
                </Link>
              </div>
              <div className="self-center appbtn">
                <Link href={"/log"}>
                  <img src="/images/log.svg" alt="log" />
                  {t('log')}
                </Link>
              </div>
              <div className="self-center appbtn">
                <Link href={"https://www.github.com"} target="_blank">
                  <img src="/images/help.svg" alt="help" />
                  {t('help')}
                </Link>
              </div>
            </div>
            <div className="absolute bottom-0">
              <div className="lang">
                <img src="/images/lang.svg" alt="lang" />
              </div>
            </div>
          </aside>
          <main>
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html >
  );
}
