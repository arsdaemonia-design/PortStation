import React, { useState } from 'react';
import './EditGameModal.css';
import { GameItem, PortMethod } from '../types';
import { X, Save, Edit3, Globe, Cpu, Check, Sparkles, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { lookupGameMetadata } from '../services/gameMetadata';
import { hasCommunityPort as inferCommunityPort, isAbandonware as inferAbandonware } from '../utils/gameClassification';

interface EditGameModalProps {
  game: GameItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedGame: GameItem) => void;
  isTauri: boolean;
}

export const EditGameModal: React.FC<EditGameModalProps> = ({
  game,
  isOpen,
  onClose,
  onSave,
  isTauri,
}) => {
  const [title, setTitle] = useState(game.title);
  const [projectTitle, setProjectTitle] = useState(game.projectTitle || '');
  const [originalPlatform, setOriginalPlatform] = useState(game.originalPlatform || 'PC');
  const [releaseYear, setReleaseYear] = useState<string>(game.releaseYear ? String(game.releaseYear) : '');
  const [developer, setDeveloper] = useState(game.developer || '');
  const [author, setAuthor] = useState(game.author || '');
  const [method, setMethod] = useState<PortMethod>(game.method || 'PORT');
  const [repositoryUrl, setRepositoryUrl] = useState(game.repositoryUrl || '');
  const [synopsis, setSynopsis] = useState(game.synopsis || '');
  const [technicalNotes, setTechnicalNotes] = useState(game.technicalNotes || '');
  const [featuresText, setFeaturesText] = useState((game.features || []).join('\n'));
  const [isAbandonware, setIsAbandonware] = useState(inferAbandonware(game));
  const [hasCommunityProject, setHasCommunityProject] = useState(inferCommunityPort(game));
  const platforms = [
    'PC', 'DOS', 'Windows', 'macOS', 'Linux', 'Amiga', 'Commodore 64', 'MSX', 'Arcade',
    'Nintendo Entertainment System', 'Super Nintendo', 'Nintendo 64', 'Game Boy', 'Game Boy Color',
    'Game Boy Advance', 'Nintendo DS', 'Nintendo 3DS', 'GameCube', 'Wii', 'Wii U', 'Nintendo Switch',
    'PlayStation', 'PlayStation 2', 'PlayStation 3', 'PlayStation 4', 'PlayStation Portable', 'PlayStation Vita',
    'Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series X|S', 'Atari 2600', 'Atari 7800', 'Sega Master System',
    'Sega Genesis / Mega Drive', 'Sega CD', 'Sega Saturn', 'Dreamcast', 'Neo Geo', 'TurboGrafx-16 / PC Engine',
  ];

  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [metadataSourceUrl, setMetadataSourceUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAutofill = async () => {
    const query = title.trim();
    if (!query) {
      alert('Escribe primero el título del juego para buscar su información.');
      return;
    }

    setAutofilling(true);
    setStatusMsg(null);
    setMetadataSourceUrl(null);
    const completed: string[] = [];
    const isEmptyOrPlaceholder = (value: string) => !value.trim() || /^(proyecto no catalogado|comunidad \/ no identificado|no especificado|desconocido)$/i.test(value.trim());

    try {
      // Repository metadata can supply the project name, but the GitHub owner
      // is not necessarily the port author, so don't mislabel it as authorship.
      if (hasCommunityProject && repositoryUrl.includes('github.com/')) {
        try {
          const match = repositoryUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
          if (match) {
            const [, owner, rawRepo] = match;
            const repo = rawRepo.replace(/\.git$/i, '');
            const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
              headers: { Accept: 'application/vnd.github+json' },
            });
            if (res.ok) {
              const data = await res.json();
              if (isEmptyOrPlaceholder(projectTitle) && data.name) {
                setProjectTitle(data.name);
                completed.push('nombre del proyecto');
              }
            }
          }
        } catch (e) { console.warn('GitHub autofill error:', e); }
      }

      const metadata = await lookupGameMetadata(query);
      if (!metadata) {
        setStatusMsg('No se encontró una ficha clara en Wikipedia. No se modificaron los campos.');
        return;
      }

      setMetadataSourceUrl(metadata.pageUrl);
      if (metadata.synopsis && !synopsis.trim()) { setSynopsis(metadata.synopsis); completed.push('sinopsis'); }
      if (metadata.developer && isEmptyOrPlaceholder(developer)) { setDeveloper(metadata.developer); completed.push('desarrollador original'); }
      if (metadata.releaseYear && !releaseYear.trim()) { setReleaseYear(String(metadata.releaseYear)); completed.push('año'); }
      const canFillPlatform = !game.originalPlatform.trim() || /^(pc|plataforma no especificada)$/i.test(game.originalPlatform.trim());
      if (metadata.platforms?.length && canFillPlatform) {
        setOriginalPlatform(metadata.platforms.join(' / '));
        completed.push('plataforma original');
      }

      setStatusMsg(completed.length
        ? `Campos completados: ${completed.join(', ')}. Revisa la fuente antes de guardar.`
        : 'Se encontró una fuente, pero los campos existentes se conservaron. Revisa el enlace y edita lo que necesites.');
    } catch (err) {
      console.warn('Autofill error:', err);
      setStatusMsg('Error al consultar datos externos.');
    } finally {
      setAutofilling(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const parsedYear = releaseYear.trim() ? parseInt(releaseYear.trim(), 10) : undefined;
    const parsedFeatures = featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const updatedGame: GameItem = {
      ...game,
      title: title.trim() || game.title,
      projectTitle: hasCommunityProject ? (projectTitle.trim() || title.trim()) : 'Sin proyecto comunitario',
      isAbandonware,
      hasCommunityPort: hasCommunityProject,
      originalPlatform: originalPlatform.trim() || 'PC',
      releaseYear: isNaN(parsedYear as number) ? undefined : parsedYear,
      developer: developer.trim() || undefined,
      author: hasCommunityProject ? (author.trim() || undefined) : undefined,
      method: hasCommunityProject ? method : 'UNKNOWN',
      repositoryUrl: hasCommunityProject ? (repositoryUrl.trim() || undefined) : undefined,
      synopsis: synopsis.trim() || undefined,
      technicalNotes: hasCommunityProject ? (technicalNotes.trim() || undefined) : undefined,
      features: hasCommunityProject && parsedFeatures.length > 0 ? parsedFeatures : undefined,
    };

    // 1. Save in Tauri backend (ports_db.json)
    if (isTauri) {
      try {
        await invoke('update_game_metadata', {
          gameId: game.id,
          title: updatedGame.title,
          projectTitle: updatedGame.projectTitle,
          originalPlatform: updatedGame.originalPlatform,
          releaseYear: updatedGame.releaseYear ?? null,
          developer: updatedGame.developer ?? null,
          author: updatedGame.author ?? null,
          method: updatedGame.method,
          repositoryUrl: updatedGame.repositoryUrl ?? null,
          synopsis: updatedGame.synopsis ?? null,
          technicalNotes: updatedGame.technicalNotes ?? null,
          features: updatedGame.features ?? null,
        });
      } catch (err) {
        console.warn('Error saving to Tauri backend:', err);
      }
    }

    // 2. Save in localStorage overrides
    try {
      const existingStr = localStorage.getItem('portstation_custom_metadata');
      const existing = existingStr ? JSON.parse(existingStr) : {};
      existing[game.id] = {
        title: updatedGame.title,
        projectTitle: updatedGame.projectTitle,
        isAbandonware: updatedGame.isAbandonware,
        hasCommunityPort: updatedGame.hasCommunityPort,
        originalPlatform: updatedGame.originalPlatform,
        releaseYear: updatedGame.releaseYear,
        developer: updatedGame.developer,
        author: updatedGame.author ?? null,
        method: updatedGame.method,
        repositoryUrl: updatedGame.repositoryUrl ?? null,
        synopsis: updatedGame.synopsis,
        technicalNotes: updatedGame.technicalNotes ?? null,
        features: updatedGame.features ?? [],
      };
      localStorage.setItem('portstation_custom_metadata', JSON.stringify(existing));
    } catch (err) {
      console.warn('Error saving to localStorage:', err);
    }

    setSaving(false);
    setStatusMsg('¡Información guardada exitosamente!');
    onSave(updatedGame);

    setTimeout(() => {
      onClose();
    }, 600);
  };

  const standardPlatform = platforms.includes(originalPlatform);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="edit-game-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-game-header">
          <div className="edit-game-header-title">
            <Edit3 size={18} className="edit-icon" />
            <div>
              <h3>{hasCommunityProject ? 'Editar Ficha del Port' : 'Editar Ficha del Juego'}</h3>
              <small>Completa los datos de la obra original{hasCommunityProject ? ' y del proyecto de comunidad' : ''}.</small>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form className="edit-game-body" onSubmit={handleSave}>
          <div className="edit-form-grid">
            {/* Title */}
            <div className="form-group full-width">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label>Título del Videojuego *</label>
                <button
                  type="button"
                  onClick={() => void handleAutofill()}
                  disabled={autofilling}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#38bdf8',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '4px',
                    padding: '0.2rem 0.5rem',
                  }}
                  title="Busca sinopsis, año, desarrollador y plataforma en Wikipedia/Wikidata; no sobrescribe datos ya escritos"
                >
                  <Sparkles size={12} />
                  <span>{autofilling ? 'Buscando ficha…' : '✨ Autocompletar ficha'}</span>
                </button>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Lotus Esprit Turbo Challenge"
                required
              />
            </div>

            <div className="form-group full-width edit-classification-options">
              <label className="edit-toggle-row">
                <input type="checkbox" checked={isAbandonware} onChange={(e) => { setIsAbandonware(e.target.checked); if (e.target.checked) setHasCommunityProject(false); }} />
                <span><strong>Descatalogado / considerado abandonware</strong><small>Etiqueta informativa; no implica que el juego sea de dominio público.</small></span>
              </label>
              <label className="edit-toggle-row">
                <input type="checkbox" checked={hasCommunityProject} onChange={(e) => setHasCommunityProject(e.target.checked)} />
                <span><strong>Tiene port o proyecto de comunidad</strong><small>Desactívalo para ocultar GitHub y la pestaña “El Port”.</small></span>
              </label>
            </div>

            <div className="form-section-heading full-width">Datos de la obra original</div>

            <div className="form-group">
              <label>Plataforma Original</label>
              <select
                value={standardPlatform ? originalPlatform : '__custom__'}
                onChange={(e) => setOriginalPlatform(e.target.value === '__custom__' ? (standardPlatform ? '' : originalPlatform) : e.target.value)}
              >
                {!standardPlatform && originalPlatform && <option value="__custom__">Actual: {originalPlatform}</option>}
                {platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                <option value="__custom__">Otra / multiconsola…</option>
              </select>
              {!standardPlatform && (
                <input
                  type="text"
                  value={originalPlatform}
                  onChange={(e) => setOriginalPlatform(e.target.value)}
                  placeholder="Escribe otra plataforma o combinación"
                  aria-label="Otra plataforma o combinación de plataformas"
                />
              )}
            </div>

            <div className="form-group">
              <label>Año de Lanzamiento</label>
              <input type="number" min="1970" max="2035" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="Ej: 1990" />
            </div>

            <div className="form-group full-width">
              <label>Desarrollador Original</label>
              <input type="text" value={developer} onChange={(e) => setDeveloper(e.target.value)} placeholder="Ej: Magnetic Fields / Gremlin Graphics" />
            </div>

            {hasCommunityProject && <>
            <div className="form-section-heading full-width">Proyecto de comunidad</div>
            {/* Project Title */}
            <div className="form-group">
              <label>Nombre del Proyecto / Port *</label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Ej: Nelumbo"
                required
              />
            </div>

            {/* Port Author */}
            <div className="form-group">
              <label>Autor / Desarrollador del Port</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ej: Almost There Games"
              />
            </div>

            {/* Port Method */}
            <div className="form-group">
              <label>Método de Implementación</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as PortMethod)}>
                <option value="PORT">PORT (Port Nativo / Recreación C)</option>
                <option value="DECOMP_NATIVE">DECOMP_NATIVE (Decompilado)</option>
                <option value="STATIC_RECOMP">STATIC_RECOMP (Recompilación Estática)</option>
                <option value="HYBRID">HYBRID (Híbrido)</option>
                <option value="UNKNOWN">UNKNOWN (Sin Catalogar)</option>
              </select>
            </div>

            {/* Repository or Website URL */}
            <div className="form-group full-width">
              <label>
                <Globe size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Enlace Oficial (GitHub, itch.io o Web)
              </label>
              <input
                type="url"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                placeholder="https://almost-there-games.itch.io/nelumbo"
              />
            </div>
            </>}

            {/* Synopsis */}
            <div className="form-group full-width">
              <label>Sinopsis / Descripción</label>
              <textarea
                rows={3}
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="Breve resumen de la experiencia del juego..."
              />
            </div>

            {/* Technical Notes */}
            <div className="form-group full-width">
              <label>
                <Cpu size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Notas Técnicas & Arquitectura
              </label>
              <textarea
                rows={2}
                value={technicalNotes}
                onChange={(e) => setTechnicalNotes(e.target.value)}
                placeholder="Requisitos de assets originales, librerías (SDL, Vulkan, DX12), etc."
              />
            </div>

            {/* Features */}
            <div className="form-group full-width">
              <label>Características y Mejoras (Una por línea)</label>
              <textarea
                rows={3}
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                placeholder="Tres campañas de Lotus juntas&#10;Soporte widescreen y 60+ FPS&#10;Compatibilidad con volantes y vibración"
              />
            </div>
          </div>

          <div className="edit-game-footer">
            {statusMsg && (
              <span className="save-status-msg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Check size={14} /> {statusMsg}
                {metadataSourceUrl && <a href={metadataSourceUrl} target="_blank" rel="noreferrer" style={{ color: '#79c0ff' }}>Fuente consultada <ExternalLink size={12} /></a>}
              </span>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-save-edit" disabled={saving}>
              <Save size={15} />
              {saving ? 'Guardando…' : 'Guardar Información'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
