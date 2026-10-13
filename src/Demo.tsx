import { useEffect, useRef, useState } from 'react';
import type { Lang } from './i18n';
import { OrbHero } from './orb/OrbHero';
import { createOrbController, type OrbState } from './orb/machine';
import { Shell } from './ui/Shell';
import { Frame } from './ui/Frame';
import { DANGEROUS_TOOLS, PROHIBITED, SAFE_TOOLS, route, type Outcome, type Pending } from './lib/router';

const T = {
  en: {
    eyebrow: 'Case study / local assistant', title: 'JARVIS: code-enforced safety router',
    lead: 'The model proposes; the code decides. Safe tools run, dangerous ones wait for a confirmation, prohibited ones never run.',
    placeholder: 'Type a request...', send: 'Send', tryH: 'Try these', examples: ['what time is it', 'open docs', 'confirm', 'delete the file report.txt', 'hola', 'no abras docs', '/pc'],
    tools: 'Tools', safe: 'safe', danger: 'dangerous (needs "confirm")', prohib: 'prohibited (never run)', latNote: 'Latency measured on the real system (shown fixed here)', you: 'You', bot: 'Router',
    orbState: 'Orb state', actions: 'Actions', noActions: 'No tool has been proposed yet.',
    level: { safe: 'safe', dangerous: 'dangerous', prohibited: 'prohibited' },
    result: { executed: 'executed', blocked: 'blocked by code', waiting: 'waiting for confirmation' },
    honest: 'Demo interface. The real JARVIS runs locally as a voice assistant; its orb UI is planned.',
    states: { idle: 'idle', listening: 'listening', thinking: 'thinking', speaking: 'speaking', blocked: 'blocked', confirm: 'confirm' },
  },
  es: {
    eyebrow: 'Caso de estudio / asistente local', title: 'JARVIS: router de seguridad aplicado por código',
    lead: 'El modelo propone; el código decide. Las herramientas seguras corren, las peligrosas esperan confirmación y las prohibidas nunca corren.',
    placeholder: 'Escribe una petición...', send: 'Enviar', tryH: 'Prueba esto', examples: ['qué hora es', 'abre docs', 'confirmo', 'borra el archivo report.txt', 'hello', 'no open docs', '/pc'],
    tools: 'Herramientas', safe: 'seguras', danger: 'peligrosas (piden "confirmo")', prohib: 'prohibidas (nunca corren)', latNote: 'Latencia medida en el sistema real (aquí se muestra fija)', you: 'Tú', bot: 'Router',
    orbState: 'Estado del orbe', actions: 'Acciones', noActions: 'Aún no se propuso ninguna herramienta.',
    level: { safe: 'segura', dangerous: 'peligrosa', prohibited: 'prohibida' },
    result: { executed: 'ejecutada', blocked: 'bloqueada por código', waiting: 'esperando confirmación' },
    honest: 'Interfaz de la demo. El JARVIS real corre en local como asistente de voz; su interfaz de orbe está planeada.',
    states: { idle: 'reposo', listening: 'escuchando', thinking: 'pensando', speaking: 'hablando', blocked: 'bloqueado', confirm: 'confirmar' },
  },
};

interface Msg { who: 'you' | 'bot'; text: string; out?: Outcome }
interface Act { tool: string; level: 'safe' | 'dangerous' | 'prohibited'; result: 'executed' | 'blocked' | 'waiting' }

const levelOf = (tool: string): Act['level'] =>
  (PROHIBITED as readonly string[]).includes(tool) ? 'prohibited' : (DANGEROUS_TOOLS as readonly string[]).includes(tool) ? 'dangerous' : 'safe';

export function Demo({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const pending = useRef<Pending | undefined>(undefined);
  const [orb, setOrb] = useState<OrbState>('idle');
  const [acts, setActs] = useState<Act[]>([]);
  const ctl = useRef<ReturnType<typeof createOrbController> | null>(null);
  useEffect(() => {
    ctl.current = createOrbController(setOrb);
    return () => ctl.current?.dispose();
  }, []);

  const send = (q: string) => {
    if (!q.trim()) return;
    const out = route(q, lang, pending.current);
    pending.current = out.pending;
    ctl.current?.run(out);
    if (out.tool) {
      const tool = out.tool as string;
      const result: Act['result'] = out.executed ? 'executed' : out.pending ? 'waiting' : 'blocked';
      setActs((a) => [{ tool, level: levelOf(tool), result }, ...a].slice(0, 6));
    }
    setMsgs((m) => [...m, { who: 'you', text: q }, { who: 'bot', text: out.reply, out }]);
    setText('');
  };

  return (
    <Shell lang={lang} eyebrow={t.eyebrow} title={t.title} lead={t.lead}>
      <OrbHero state={orb} labels={{ state: t.orbState, names: t.states, honest: t.honest }} />
      <Frame tl="ROUTER" tr={t.latNote}>
        <div role="log" aria-live="polite" style={{ display: 'grid', gap: 'var(--s-3)', marginBottom: 'var(--s-4)', minHeight: '6rem' }}>
          {msgs.map((m, i) => (
            <div key={i} className="card" style={{ borderColor: m.who === 'bot' ? 'var(--c-coral)' : undefined }}>
              <div className="label">{m.who === 'you' ? t.you : t.bot}</div>
              <p style={{ margin: '0.25rem 0' }}>{m.text}</p>
              {m.out && (
                <div className="row" style={{ gap: '0.4rem' }}>
                  <span className="chip accent">{m.out.path}</span>
                  {m.out.trace.map((c) => <span key={c} className="chip">{c}</span>)}
                  <span className="chip">{m.out.latencySec} s</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <form className="row" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <label className="vh" htmlFor="q">{t.placeholder}</label>
          <input id="q" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.placeholder} style={{ flex: '1 1 14rem' }} />
          <button className="btn primary" type="submit">{t.send}</button>
        </form>
        <h2 className="actions-h">{t.actions}</h2>
        {acts.length === 0 ? <p className="note">{t.noActions}</p> : (
          <ul className="actions" aria-label={t.actions}>
            {acts.map((a, i) => (
              <li key={i}>
                <code>{a.tool}</code>
                <span className="chip">{t.level[a.level]}</span>
                <span className={`chip ${a.result === 'executed' ? 'ok' : a.result === 'blocked' ? 'bad' : 'warn'}`}>{t.result[a.result]}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mono" style={{ marginTop: 'var(--s-4)' }}>{t.tryH}</p>
        <div className="row">{t.examples.map((e) => <button key={e} className="toggle" onClick={() => send(e)}>{e}</button>)}</div>
      </Frame>

      <Frame tl="TOOLS">
        <h2>{t.tools}</h2>
        <div className="grid">
          <div className="card"><div className="label">{t.safe}</div><p>{SAFE_TOOLS.join(', ')}</p></div>
          <div className="card"><div className="label">{t.danger}</div><p>{DANGEROUS_TOOLS.join(', ')}</p></div>
          <div className="card"><div className="label">{t.prohib}</div><p>{PROHIBITED.join(', ')}</p></div>
        </div>
      </Frame>
    </Shell>
  );
}
