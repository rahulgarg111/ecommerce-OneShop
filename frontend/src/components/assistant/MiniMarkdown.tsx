import { Fragment } from 'react';
import type { ReactNode } from 'react';

/** Renders **bold**, *italic*, bullet lists and paragraphs. Text is never parsed as HTML. */
const inline = (text: string): ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });

const MiniMarkdown = ({ text }: { text: string }) => {
  const blocks: ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="ml-1 space-y-1">
        {list.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
            <span>{inline(item)}</span>
          </li>
        ))}
      </ul>
    );
    list = [];
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flushList();
    if (!line) continue;
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(
      <p key={`p-${blocks.length}`} className={heading ? 'font-semibold text-ink' : undefined}>
        {inline(heading ? heading[1] : line)}
      </p>
    );
  }
  flushList();

  return <div className="space-y-2">{blocks}</div>;
};

export default MiniMarkdown;
