import type { Lang } from '../i18n';

export const SAFE_TOOLS = ['current_time', 'pc_status', 'list_folder'] as const;
export const DANGEROUS_TOOLS = ['open_url', 'add_to_catalog'] as const;
export const PROHIBITED = ['delete_file', 'run_shell', 'send_message'] as const;
export type Tool = (typeof SAFE_TOOLS)[number] | (typeof DANGEROUS_TOOLS)[number] | (typeof PROHIBITED)[number];
export type Path = 'shortcut' | 'catalog' | 'fast' | 'llm';

/** Latencies measured on the real system (fast path vs LLM with streaming). Fixed here; nothing is slow in this demo. */
export const LATENCY_SEC = { fast: 2.7, llm: 8.6 } as const;

export interface Pending { tool: Tool; arg: string }
export interface Outcome {
  reply: string;
  trace: string[];
  path: Path;
  tool?: Tool;
  executed: boolean;
  pending?: Pending;
  latencySec: number;
}

// Fictional catalog of things the assistant may open.
export const CATALOG: Record<string, string> = {
  docs: 'https://example.com/docs',
  board: 'https://example.com/board',
  notes: 'https://example.com/notes',
};
const SHORTCUTS: Record<string, Tool> = { '/time': 'current_time', '/pc': 'pc_status', '/ls': 'list_folder' };

const VETO = /(borra|elimina|delete|remove|\bno\b)/i;
const FAST: Array<[RegExp, Tool, string]> = [
  [/(qu[eé] hora|what time|current time|\bhora\b)/i, 'current_time', 'time'],
  [/(qu[eé] d[ií]a|\bfecha\b|what('s| is) the date|today'?s date|\bdate\b)/i, 'current_time', 'date'],
  [/(estado de la pc|c[oó]mo est[aá] la pc|pc status|computer status|how is the (pc|computer))/i, 'pc_status', 'pc'],
];
const GREETING = /^\s*(hola|buenas|buenos d[ií]as|hello|hi|hey)\b/i;
const PROHIBITED_ASKS: Array<[RegExp, Tool]> = [
  [/(delete|remove|borra|elimina)\b.*\b(file|archivo)/i, 'delete_file'],
  [/(run|execute|ejecuta|corre)\b.*\b(shell|command|comando|terminal)/i, 'run_shell'],
  [/(send|manda|env[ií]a)\b.*\b(message|mensaje)/i, 'send_message'],
];

const CONFIRM = /^\s*(confirmo|confirm)\s*$/i;

const TEXT = {
  en: {
    prohibited: (t: string) => `Prohibited by code, not by the model: "${t}" can never run, whatever anyone asks.`,
    confirm: (t: string, a: string) => `"${t}" (${a}) needs your confirmation. Type "confirm" to run it.`,
    cancelled: 'Pending action cancelled.',
    greeting: 'Hello. Ask me the time, the date or the PC status.',
    llm: 'Simulated LLM: I understood the request and will not take any action on it.',
    unknownOpen: (n: string) => `"${n}" is not in the catalog.`,
    done: { open_url: (a: string) => `Opened (simulated): ${a}`, add_to_catalog: (a: string) => `Added to the catalog (simulated): ${a}` },
  },
  es: {
    prohibited: (t: string) => `Prohibido por código, no por el modelo: "${t}" nunca se ejecuta, lo pida quien lo pida.`,
    confirm: (t: string, a: string) => `"${t}" (${a}) necesita tu confirmación. Escribe "confirmo" para ejecutarla.`,
    cancelled: 'Acción pendiente cancelada.',
    greeting: 'Hola. Pregúntame la hora, la fecha o el estado de la PC.',
    llm: 'LLM simulado: entendí la petición y no tomaré ninguna acción sobre ella.',
    unknownOpen: (n: string) => `"${n}" no está en el catálogo.`,
    done: { open_url: (a: string) => `Abierto (simulado): ${a}`, add_to_catalog: (a: string) => `Agregado al catálogo (simulado): ${a}` },
  },
};

/** The only place a tool can run. PROHIBITED tools never get here: they are refused by code. */
export function runTool(tool: Tool, arg: string, lang: Lang, now: Date = new Date()): { executed: boolean; reply: string } {
  if ((PROHIBITED as readonly string[]).includes(tool)) return { executed: false, reply: TEXT[lang].prohibited(tool) };
  switch (tool) {
    case 'current_time': return { executed: true, reply: arg === 'date' ? now.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { dateStyle: 'full' }) : now.toLocaleTimeString(lang === 'es' ? 'es-MX' : 'en-US', { timeStyle: 'short' }) };
    case 'pc_status': return { executed: true, reply: 'CPU 12% / RAM 41% / Disk 63% (fictional)' };
    case 'list_folder': return { executed: true, reply: 'demo/  notes.txt  report.md (fictional)' };
    case 'open_url': return { executed: true, reply: TEXT[lang].done.open_url(arg) };
    case 'add_to_catalog': return { executed: true, reply: TEXT[lang].done.add_to_catalog(arg) };
    default: return { executed: false, reply: '' };
  }
}

const isDangerous = (t: Tool) => (DANGEROUS_TOOLS as readonly string[]).includes(t);

function dispatch(tool: Tool, arg: string, path: Path, trace: string[], lang: Lang, now: Date): Outcome {
  const latencySec = path === 'llm' ? LATENCY_SEC.llm : LATENCY_SEC.fast;
  if ((PROHIBITED as readonly string[]).includes(tool)) {
    return { reply: TEXT[lang].prohibited(tool), trace: [...trace, `tool:${tool}`, 'blocked by code'], path, tool, executed: false, latencySec };
  }
  if (isDangerous(tool)) {
    return { reply: TEXT[lang].confirm(tool, arg), trace: [...trace, `tool:${tool}`, 'dangerous: waiting for confirmation'], path, tool, executed: false, pending: { tool, arg }, latencySec };
  }
  const r = runTool(tool, arg, lang, now);
  return { reply: r.reply, trace: [...trace, `tool:${tool}`, 'safe: executed'], path, tool, executed: r.executed, latencySec };
}

/** Order: confirmation -> shortcut -> catalog -> fast route -> simulated LLM. Veto words always go to the LLM. */
export function route(text: string, lang: Lang, pending?: Pending, now: Date = new Date()): Outcome {
  const trace: string[] = [];
  if (pending) {
    if (CONFIRM.test(text)) {
      const r = runTool(pending.tool, pending.arg, lang, now);
      return { reply: r.reply, trace: ['confirmation received', `tool:${pending.tool}`, 'executed'], path: 'fast', tool: pending.tool, executed: r.executed, latencySec: LATENCY_SEC.fast };
    }
    trace.push('pending action cancelled');
  }

  const veto = VETO.test(text);
  if (veto) trace.push('veto word -> LLM');

  if (!veto) {
    const sc = SHORTCUTS[text.trim().toLowerCase()];
    if (sc) return dispatch(sc, '', 'shortcut', [...trace, 'shortcut'], lang, now);

    const open = /^\s*(abre|open)\s+(\S+)\s*$/i.exec(text);
    if (open) {
      const name = open[2].toLowerCase();
      if (CATALOG[name]) return dispatch('open_url', CATALOG[name], 'catalog', [...trace, 'catalog hit'], lang, now);
      return { reply: TEXT[lang].unknownOpen(name), trace: [...trace, 'catalog miss'], path: 'catalog', executed: false, latencySec: LATENCY_SEC.fast };
    }
    const add = /^\s*(agrega|add)\s+(\S+)\s+(al cat[aá]logo|to (the )?catalog)\s*$/i.exec(text);
    if (add) return dispatch('add_to_catalog', add[2], 'catalog', [...trace, 'catalog command'], lang, now);

    for (const [re, tool, arg] of FAST) if (re.test(text)) return dispatch(tool, arg, 'fast', [...trace, 'fast route'], lang, now);
    if (GREETING.test(text)) return { reply: TEXT[lang].greeting, trace: [...trace, 'fast route', 'greeting'], path: 'fast', executed: false, latencySec: LATENCY_SEC.fast };
  }

  // Simulated LLM. It may "propose" a tool; the code decides whether it runs.
  const llmTrace = [...trace, 'simulated LLM'];
  for (const [re, tool] of PROHIBITED_ASKS) if (re.test(text)) return dispatch(tool, '', 'llm', llmTrace, lang, now);
  if (/(list|lista|ls)\b.*\b(folder|carpeta)/i.test(text) && !veto) return dispatch('list_folder', '', 'llm', llmTrace, lang, now);
  return { reply: TEXT[lang].llm, trace: llmTrace, path: 'llm', executed: false, latencySec: LATENCY_SEC.llm };
}
