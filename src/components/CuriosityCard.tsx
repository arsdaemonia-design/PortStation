import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Lightbulb, Shuffle, X } from 'lucide-react';
import { Curiosity, CURIOSITY_CATEGORY_LABELS } from '../data/curiosities';

interface Props {
  curiosity: Curiosity;
  onClose: () => void;
  onAnother: () => void;
}

export const CuriosityCard: React.FC<Props> = ({ curiosity, onClose, onAnother }) => (
  <div className="curiosity-backdrop" onClick={onClose} role="presentation">
    <section className="curiosity-modal" role="dialog" aria-modal="true" aria-labelledby="curiosity-title" onClick={(event) => event.stopPropagation()}>
      <header className="curiosity-modal-header">
        <span className="curiosity-kicker"><Lightbulb size={17} /> DATO DE LA BÓVEDA · {curiosity.id}</span>
        <button className="curiosity-close" onClick={onClose} aria-label="Cerrar"><X size={19} /></button>
      </header>
      <h2 id="curiosity-title">{curiosity.title}</h2>
      <p className="curiosity-text">{curiosity.text}</p>
      <div className="curiosity-tags">
        {curiosity.categories.map((category) => <span key={category}>{CURIOSITY_CATEGORY_LABELS[category]}</span>)}
      </div>
      {curiosity.relatedGames?.length ? <p className="curiosity-related">Conexiones: {curiosity.relatedGames.join(' · ')}</p> : null}
      <a className="curiosity-source" href={curiosity.source.url} target="_blank" rel="noreferrer">
        Fuente: {curiosity.source.label} <ExternalLink size={14} />
      </a>
      <footer className="curiosity-modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        <button className="btn btn-primary" onClick={onAnother}><Shuffle size={15} /> Otro dato</button>
      </footer>
    </section>
  </div>
);

interface ToastProps {
  curiosity: Curiosity;
  onAnother: () => void;
  onDismiss: () => void;
  durationMs: number;
  size: 'small' | 'medium' | 'large';
  transitionMs: number;
}

export const CuriosityToast: React.FC<ToastProps> = ({ curiosity, onAnother, onDismiss, durationMs, size, transitionMs }) => {
  const [isExiting, setIsExiting] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);
  const remainingMs = useRef(durationMs);
  const startedAt = useRef(0);
  const isHovered = useRef(false);
  const isClosing = useRef(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const closeRef = useRef<() => void>(() => undefined);
  closeRef.current = () => {
    if (isClosing.current) return;
    isClosing.current = true;
    setIsExiting(true);
    exitTimer.current = window.setTimeout(() => dismissRef.current(), transitionMs);
  };

  const scheduleHideRef = useRef<() => void>(() => undefined);
  scheduleHideRef.current = () => {
    if (isHovered.current || isClosing.current || remainingMs.current <= 0) return;
    startedAt.current = Date.now();
    hideTimer.current = window.setTimeout(() => closeRef.current(), remainingMs.current);
  };

  useEffect(() => {
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    isClosing.current = false;
    remainingMs.current = durationMs;
    setIsExiting(false);
    scheduleHideRef.current();
    return () => {
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    };
  }, [curiosity.id, durationMs]);

  const pauseHide = () => {
    if (isClosing.current || isHovered.current) return;
    isHovered.current = true;
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
      remainingMs.current = Math.max(0, remainingMs.current - (Date.now() - startedAt.current));
    }
  };

  const resumeHide = () => {
    if (!isHovered.current) return;
    isHovered.current = false;
    scheduleHideRef.current();
  };

  return (
    <aside
      className={`curiosity-toast curiosity-toast-${size}${isExiting ? ' is-exiting' : ''}`}
      style={{ '--curiosity-motion-ms': `${transitionMs}ms` } as React.CSSProperties}
      aria-live="polite"
      onMouseEnter={pauseHide}
      onMouseLeave={resumeHide}
      onFocusCapture={pauseHide}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) resumeHide();
      }}
    >
      <div className="curiosity-toast-mark"><Lightbulb size={19} /><span>¡PING!</span></div>
      <div className="curiosity-toast-copy">
        <strong>{curiosity.title}</strong>
        <p>{curiosity.text}</p>
        <a href={curiosity.source.url} target="_blank" rel="noreferrer">Fuente: {curiosity.source.label} <ExternalLink size={12} /></a>
      </div>
      <div className="curiosity-toast-actions">
        <button onClick={onAnother}><Shuffle size={14} /> Otro dato</button>
        <button className="curiosity-toast-dismiss" onClick={() => closeRef.current()} aria-label="Cerrar dato"><X size={16} /></button>
      </div>
    </aside>
  );
};

export function playCuriosityChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const startAt = context.currentTime;
    [659.25, 880, 1318.5].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = startAt + index * 0.085;
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.055, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.105);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.11);
    });
    window.setTimeout(() => void context.close(), 500);
  } catch { /* Audio is a small enhancement; never block the UI. */ }
}
