import { Banner } from './components/Banner';
import { Demo } from './Demo';
import { getLang } from './i18n';

export function App() {
  const lang = getLang();
  return (
    <>
      <Banner lang={lang} />
      <main>
        <Demo lang={lang} />
      </main>
    </>
  );
}
