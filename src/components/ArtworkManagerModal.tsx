import React, { useState, useEffect, useRef, useMemo } from 'react';
import './ArtworkManagerModal.css';
import { GameItem } from '../types';
import {
  X,
  Upload,
  Clipboard,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Save,
  Search,
  Check,
  HelpCircle,
  Image as ImageIcon,
  Star,
  AlertTriangle,
} from 'lucide-react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import {
  searchMultiSourceArtwork,
  ArtworkSearchResult,
  getRankedRecommendations,
} from '../services/artworkApi';
import { mapPlatformToProfile, PROFILES } from './PhysicalMedia';

interface ArtworkManagerModalProps {
  game: GameItem;
  isOpen: boolean;
  onClose: () => void;
  onSaveArtwork: (updated: {
    boxArtUrl?: string;
    discArtUrl?: string;
    cartridgeArtUrl?: string;
    portArtUrl?: string;
  }) => void;
  isTauri: boolean;
}

export const ArtworkManagerModal: React.FC<ArtworkManagerModalProps> = ({
  game,
  isOpen,
  onClose,
  onSaveArtwork,
  isTauri,
}) => {
  // Active asset target: 'box' | 'media' | 'port'
  const [activeTarget, setActiveTarget] = useState<'box' | 'media' | 'port'>('box');

  const platformProfileKey = mapPlatformToProfile(game.originalPlatform || '');
  const profile = PROFILES[platformProfileKey] || PROFILES.pc || PROFILES.ps2;
  const isDisc = profile.kind === 'disc';

  // Local draft state for artwork URLs
  const [boxArtUrl, setBoxArtUrl] = useState<string>(game.boxArtUrl || `/games/${game.id}/cover.png`);
  const [discArtUrl, setDiscArtUrl] = useState<string>(game.discArtUrl || (isDisc ? `/games/${game.id}/disc.png` : ''));
  const [cartridgeArtUrl, setCartridgeArtUrl] = useState<string>(game.cartridgeArtUrl || (!isDisc ? `/games/${game.id}/label.png` : ''));
  const [portArtUrl, setPortArtUrl] = useState<string>(game.portArtUrl || `/games/${game.id}/cover.png`);

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // In-modal Live Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingLive, setIsSearchingLive] = useState<boolean>(false);
  const [liveResults, setLiveResults] = useState<ArtworkSearchResult[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<'recommended' | 'media' | 'box' | 'port' | 'all'>('recommended');
  const [showAllResults, setShowAllResults] = useState(false);

  // Hidden file input for web fallback or direct upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync draft state on open
  useEffect(() => {
    if (isOpen) {
      setBoxArtUrl(game.boxArtUrl || `/games/${game.id}/cover.png`);
      setDiscArtUrl(game.discArtUrl || (isDisc ? `/games/${game.id}/disc.png` : ''));
      setCartridgeArtUrl(game.cartridgeArtUrl || (!isDisc ? `/games/${game.id}/label.png` : ''));
      setPortArtUrl(game.portArtUrl || `/games/${game.id}/cover.png`);
      setSaveSuccess(false);

      const cleanTitle = game.title
        .replace(/The Legend of Zelda:\s*/i, '')
        .replace(/\s*\(.*\)/, '')
        .trim();
      setSearchQuery(cleanTitle);

      // Perform initial fast search in ArcadeArtwork
      triggerLiveSearch(cleanTitle);
    }
  }, [isOpen, game, isDisc]);

  if (!isOpen) return null;

  // Active target values
  const currentImageUrl =
    activeTarget === 'box'
      ? boxArtUrl
      : activeTarget === 'media'
      ? isDisc
        ? discArtUrl
        : cartridgeArtUrl
      : portArtUrl;

  const currentMediaLabel =
    activeTarget === 'box'
      ? 'Carátula / Caja Comercial'
      : activeTarget === 'media'
      ? isDisc
        ? 'Disco Óptico Serigrafiado'
        : 'Etiqueta Frontal de Cartucho'
      : 'Arte Oficial del Port Nativo';

  // Detect provenance / source information
  const getProvenanceInfo = (url: string) => {
    if (!url) return { source: 'No asignada', format: 'Desconocido', isPageUrl: false };
    const isPageUrl =
      url.includes('mobygames.com/game/') ||
      url.includes('thecoverproject.net/view.php') ||
      url.includes('steamgriddb.com/grid/') ||
      url.includes('gametdb.com/Game/');

    let source = 'Enlace Externo';
    if (url.includes('steamgriddb.com')) source = 'SteamGridDB';
    else if (url.includes('arcadeartwork.org')) source = 'ArcadeArtwork';
    else if (url.includes('gametdb.com')) source = 'GameTDB';
    else if (url.includes('thecoverproject.net')) source = 'The Cover Project';
    else if (url.includes('mobygames.com')) source = 'MobyGames';
    else if (url.includes('github') || url.includes('githubusercontent.com')) source = 'GitHub Oficial';
    else if (url.startsWith('data:') || url.startsWith('asset:') || url.startsWith('http://asset.localhost'))
      source = 'Archivo Local (Cargado en PC)';
    else if (url.startsWith('/games/')) source = 'Pack Local de PortStation';

    let format = 'Imagen Web';
    if (url.endsWith('.png')) format = 'PNG Transparente';
    else if (url.endsWith('.webp')) format = 'WebP Moderno';
    else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) format = 'JPEG / JPG';
    else if (url.startsWith('data:image/png')) format = 'PNG (Embebido)';
    else if (url.startsWith('data:image')) format = 'DataURL (Local)';

    return { source, format, isPageUrl };
  };

  const currentProvenance = getProvenanceInfo(currentImageUrl);

  // Ranked recommendations based on current target
  const rankedSources = getRankedRecommendations(
    activeTarget,
    game.title,
    game.originalPlatform || 'Retro',
    game.repositoryUrl
  );

  const handleOpenExternal = async (url: string) => {
    try {
      if (isTauri) {
        await invoke('open_browser', { url });
      } else {
        window.open(url, '_blank');
      }
    } catch {
      window.open(url, '_blank');
    }
  };

  const handlePickLocalFile = async () => {
    if (isTauri) {
      try {
        const selected = await invoke<string | null>('pick_image_file', {
          defaultPath: game.installPath || 'E:\\Games\\Ports',
        });
        if (selected) {
          const assetUrl = convertFileSrc(selected);
          applyImageToTarget(assetUrl);
          return;
        }
      } catch (err) {
        console.warn('Tauri file dialog failed, falling back to browser picker:', err);
      }
    }
    // Web fallback
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result as string;
      if (result) {
        applyImageToTarget(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        alert('El portapapeles está vacío o no contiene texto legible.');
        return;
      }
      applyImageToTarget(text.trim());
    } catch (err) {
      alert(`No se pudo leer el portapapeles: ${err}. Puedes pegar con Ctrl+V directamente en el campo de texto.`);
    }
  };

  const applyImageToTarget = (url: string) => {
    if (activeTarget === 'box') {
      setBoxArtUrl(url);
    } else if (activeTarget === 'media') {
      if (isDisc) setDiscArtUrl(url);
      else setCartridgeArtUrl(url);
    } else if (activeTarget === 'port') {
      setPortArtUrl(url);
    }
  };

  const handleResetTarget = () => {
    if (activeTarget === 'box') {
      setBoxArtUrl(`/games/${game.id}/cover.png`);
    } else if (activeTarget === 'media') {
      if (isDisc) setDiscArtUrl(`/games/${game.id}/disc.png`);
      else setCartridgeArtUrl(`/games/${game.id}/label.png`);
    } else if (activeTarget === 'port') {
      setPortArtUrl(game.authorAvatarUrl || `/games/${game.id}/cover.png`);
    }
  };

  const triggerLiveSearch = async (queryToSearch: string, targetOverride?: 'box' | 'media' | 'port') => {
    if (!queryToSearch.trim()) return;
    setShowAllResults(false);
    setIsSearchingLive(true);
    try {
      const results = await searchMultiSourceArtwork(
        queryToSearch,
        game.originalPlatform,
        game.repositoryUrl,
        targetOverride || activeTarget
      );
      setLiveResults(results);
    } catch (err) {
      console.error('Error fetching live artwork:', err);
    } finally {
      setIsSearchingLive(false);
    }
  };

  const displayedResults = useMemo(() => {
    let list = [...liveResults];
    if (galleryFilter === 'recommended') {
      if (activeTarget === 'media') {
        const filtered = list.filter((item) => item.category === 'disc' || item.category === 'cart');
        if (filtered.length > 0) list = filtered;
      } else if (activeTarget === 'box') {
        const filtered = list.filter((item) => item.category === 'box');
        if (filtered.length > 0) list = filtered;
      } else if (activeTarget === 'port') {
        const filtered = list.filter((item) => item.category === 'port' || item.category === 'banner');
        if (filtered.length > 0) list = filtered;
      }
    } else if (galleryFilter === 'media') {
      list = list.filter((item) => item.category === 'disc' || item.category === 'cart');
    } else if (galleryFilter === 'box') {
      list = list.filter((item) => item.category === 'box');
    } else if (galleryFilter === 'port') {
      list = list.filter((item) => item.category === 'port' || item.category === 'banner');
    }

    // Default / All: sort so that active target items appear at the very front
    list.sort((a, b) => {
      const matchA =
        (activeTarget === 'media' && (a.category === 'disc' || a.category === 'cart')) ||
        (activeTarget === 'box' && a.category === 'box') ||
        (activeTarget === 'port' && (a.category === 'port' || a.category === 'banner'));
      const matchB =
        (activeTarget === 'media' && (b.category === 'disc' || b.category === 'cart')) ||
        (activeTarget === 'box' && b.category === 'box') ||
        (activeTarget === 'port' && (b.category === 'port' || b.category === 'banner'));
      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      return 0;
    });

    // Different providers often return the same artwork at different URLs or
    // sizes. Keep one visible card per thumbnail, preferring the first result.
    const seen = new Set<string>();
    return list.filter((item) => {
      const key = (item.thumbnailUrl || item.url).split('?')[0].replace(/\/$/, '').toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [liveResults, galleryFilter, activeTarget]);

  const visibleResults = showAllResults ? displayedResults : displayedResults.slice(0, 16);

  const handleSave = () => {
    onSaveArtwork({
      boxArtUrl,
      discArtUrl: isDisc ? discArtUrl : undefined,
      cartridgeArtUrl: !isDisc ? cartridgeArtUrl : undefined,
      portArtUrl,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container artwork-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Hidden HTML file input for universal fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        {/* Modal Header & Game Identity */}
        <div className="modal-header artwork-hub-header">
          <div className="artwork-identity-top">
            <div className="identity-title-row">
              <span className="hub-badge">🎨 Artwork Hub</span>
              <h2 className="identity-game-title">{game.title}</h2>
              <span className="identity-platform-tag">{game.originalPlatform}</span>
            </div>
            <div className="identity-project-sub">
              <span className="project-label">Proyecto detectado:</span>
              <span className="project-name-highlight">{game.projectTitle}</span>
              {game.author && (
                <>
                  <span className="sub-bullet">·</span>
                  <span className="author-tag">Por {game.author}</span>
                </>
              )}
              {game.repositoryUrl && (
                <button
                  className="repo-link-pill"
                  onClick={() => handleOpenExternal(game.repositoryUrl!)}
                  title="Ver repositorio oficial en GitHub"
                >
                  <span>GitHub ↗</span>
                </button>
              )}
            </div>
          </div>
          <button className="btn-close" onClick={onClose} title="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="artwork-modal-body">
          {/* Target Selector Tabs */}
          <div className="artwork-target-nav">
            <button
              className={`target-tab-btn ${activeTarget === 'box' ? 'active' : ''}`}
              onClick={() => {
                setActiveTarget('box');
                setGalleryFilter('recommended');
                triggerLiveSearch(searchQuery, 'box');
              }}
            >
              <span className="tab-icon">📦</span>
              <div className="tab-text">
                <span className="tab-main">Carátula / Caja</span>
                <span className="tab-sub">Cubierta 3D y Grids</span>
              </div>
            </button>

            <button
              className={`target-tab-btn ${activeTarget === 'media' ? 'active' : ''}`}
              onClick={() => {
                setActiveTarget('media');
                setGalleryFilter('recommended');
                triggerLiveSearch(searchQuery, 'media');
              }}
            >
              <span className="tab-icon">{isDisc ? '💿' : '💾'}</span>
              <div className="tab-text">
                <span className="tab-main">{isDisc ? 'Disco Óptico' : 'Cartucho Físico'}</span>
                <span className="tab-sub">{isDisc ? 'Serigrafía circular' : 'Etiqueta sticker'}</span>
              </div>
            </button>

            <button
              className={`target-tab-btn ${activeTarget === 'port' ? 'active' : ''}`}
              onClick={() => {
                setActiveTarget('port');
                setGalleryFilter('recommended');
                triggerLiveSearch(searchQuery, 'port');
              }}
            >
              <span className="tab-icon">⚡</span>
              <div className="tab-text">
                <span className="tab-main">Arte del Proyecto</span>
                <span className="tab-sub">Icono o logo del port</span>
              </div>
            </button>

            <button
              className={`target-tab-help ${showGuide ? 'active' : ''}`}
              onClick={() => setShowGuide(!showGuide)}
              title="¿Cómo funciona este centro de medios?"
            >
              <HelpCircle size={15} />
              <span>¿Cómo funciona?</span>
            </button>
          </div>

          {/* Collapsible Info Drawer */}
          {showGuide && (
            <div className="artwork-guide-banner">
              <div className="guide-content">
                <h4>💡 Centro Activo de Medios Físicos</h4>
                <p>
                  1. Selecciona arriba qué medio deseas configurar (<strong>Carátula</strong>, <strong>Disco</strong> o <strong>Arte del Port</strong>).
                  <br />
                  2. PortStation reorganiza automáticamente las mejores fuentes de búsqueda clasificadas por estrellas (★★★★★).
                  <br />
                  3. Puedes explorar la <strong>Galería en Vivo</strong> abajo y pulsar <em>"Usar esta imagen"</em> con 1 solo clic, o subir tu propio archivo local.
                </p>
              </div>
              <button className="guide-close-btn" onClick={() => setShowGuide(false)}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* INSPECTOR: CURRENT ARTWORK PREVIEW & METADATA */}
          <div className="current-artwork-card">
            <div className="preview-container-col">
              <div className="preview-media-wrapper">
                {activeTarget === 'box' && (
                  <div className="preview-frame-box">
                    <img
                      src={boxArtUrl}
                      alt="Caja"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `/games/${game.id}/cover.png`;
                      }}
                    />
                    <span className="frame-type-badge">600×900 Front</span>
                  </div>
                )}

                {activeTarget === 'media' && isDisc && (
                  <div className="preview-frame-disc">
                    <img
                      src={discArtUrl}
                      alt="Disco"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `/games/${game.id}/disc.png`;
                      }}
                    />
                    <div className="preview-disc-hole" />
                    <span className="frame-type-badge">PNG Circular</span>
                  </div>
                )}

                {activeTarget === 'media' && !isDisc && (
                  <div className="preview-frame-cart">
                    <img
                      src={cartridgeArtUrl}
                      alt="Cartucho"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `/games/${game.id}/label.png`;
                      }}
                    />
                    <span className="frame-type-badge">Sticker</span>
                  </div>
                )}

                {activeTarget === 'port' && (
                  <div className="preview-frame-port">
                    <img
                      src={portArtUrl}
                      alt="Arte del Port"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          game.authorAvatarUrl || `/games/${game.id}/cover.png`;
                      }}
                    />
                    <span className="frame-type-badge">Icono Nativo</span>
                  </div>
                )}
              </div>
            </div>

            <div className="details-col">
              <div className="details-header-row">
                <div>
                  <span className="details-kicker">Medio Activo</span>
                  <h3 className="details-target-title">{currentMediaLabel}</h3>
                </div>
                <div className="provenance-pill">
                  <span className="prov-dot" />
                  <span className="prov-source">{currentProvenance.source}</span>
                </div>
              </div>

              {/* Metadata specs table */}
              <div className="specs-table-compact">
                <div className="spec-item">
                  <span className="spec-label">Resolución Sugerida</span>
                  <span className="spec-val">
                    {activeTarget === 'box'
                      ? '600 × 900 (Proporción 2:3)'
                      : activeTarget === 'media'
                      ? '1000 × 1000 (1:1 Transparente)'
                      : '512 × 512 (Logo / Icono)'}
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Formato Detectado</span>
                  <span className="spec-val">{currentProvenance.format}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Plataforma</span>
                  <span className="spec-val">{game.originalPlatform || 'Nativa'}</span>
                </div>
              </div>

              {/* URL warning if user pasted a webpage instead of image */}
              {currentProvenance.isPageUrl && (
                <div className="url-warning-callout">
                  <AlertTriangle size={15} />
                  <span>
                    Este enlace parece ser una página web y no una imagen directa (.png / .jpg). Se recomienda hacer clic derecho en la imagen y elegir <em>"Copiar dirección de imagen"</em>.
                  </span>
                </div>
              )}

              {/* Quick Actions Row */}
              <div className="media-actions-bar">
                <button className="action-btn action-upload" onClick={handlePickLocalFile}>
                  <Upload size={14} />
                  <span>Elegir Archivo Local</span>
                </button>
                <button className="action-btn action-paste" onClick={handlePasteClipboard}>
                  <Clipboard size={14} />
                  <span>Pegar Portapapeles</span>
                </button>
                <button className="action-btn action-reset" onClick={handleResetTarget}>
                  <RotateCcw size={14} />
                  <span>Restaurar Predeterminado</span>
                </button>
                {activeTarget === 'port' && game.authorAvatarUrl && (
                  <button
                    className="action-btn action-special"
                    onClick={() => applyImageToTarget(game.authorAvatarUrl!)}
                    title="Usar avatar oficial del desarrollador en GitHub"
                  >
                    <span>Usar Avatar de GitHub</span>
                  </button>
                )}
              </div>

              {/* Direct URL input bar */}
              <div className="direct-url-box">
                <span className="direct-url-label">URL Directa de Imagen:</span>
                <input
                  type="text"
                  className="direct-url-input"
                  value={currentImageUrl}
                  onChange={(e) => applyImageToTarget(e.target.value)}
                  placeholder="https://.../imagen.png"
                />
              </div>
            </div>
          </div>

          {/* SECTION: LIVE IN-MODAL SEARCH & SMART SOURCES */}
          <div className="artwork-discovery-panel">
            <div className="discovery-header">
              <div className="discovery-title-group">
                <h3 className="discovery-title">✨ Buscador en Vivo & Fuentes Recomendadas</h3>
                <span className="discovery-subtitle">
                  Especializado para: <strong>{currentMediaLabel}</strong>
                </span>
              </div>

              <div className="discovery-search-bar">
                <input
                  type="text"
                  className="discovery-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && triggerLiveSearch(searchQuery)}
                  placeholder="Buscar en bases de datos..."
                />
                <button
                  className="discovery-btn"
                  onClick={() => triggerLiveSearch(searchQuery)}
                  disabled={isSearchingLive}
                >
                  <Search size={14} />
                  <span>{isSearchingLive ? 'Buscando...' : 'Buscar'}</span>
                </button>
                <button
                  className="discovery-quick-media-btn"
                  onClick={() => {
                    const extra = isDisc ? 'CD' : 'cart';
                    const q = searchQuery.includes(extra) ? searchQuery : `${searchQuery} ${extra}`;
                    setSearchQuery(q);
                    setGalleryFilter('media');
                    triggerLiveSearch(q, 'media');
                  }}
                  title={isDisc ? 'Buscar serigrafías de CD / DVD ópticos' : 'Buscar etiquetas frontales de cartucho'}
                >
                  <span>{isDisc ? '💿 Buscar Discos' : '🕹️ Buscar Cartuchos'}</span>
                </button>
              </div>
            </div>

            {/* LIVE RESULTS GALLERY (MULTI-SOURCE) */}
            <div className="live-gallery-container">
              <div className="gallery-header-row">
                <div className="gallery-title-wrap">
                  <span className="gallery-badge">Multi-API Live</span>
                  <span className="gallery-count">
                    {isSearchingLive
                      ? 'Consultando repositorios en vivo...'
                      : `${displayedResults.length} imágenes mostradas (${liveResults.length} en total)`}
                  </span>
                </div>

                <div className="gallery-filter-chips">
                  <button
                    className={`filter-chip ${galleryFilter === 'recommended' ? 'active' : ''}`}
                    onClick={() => setGalleryFilter('recommended')}
                    title="Filtra automáticamente según la pestaña activa"
                  >
                    <span>⭐ Recomendados</span>
                  </button>
                  <button
                    className={`filter-chip ${galleryFilter === 'media' ? 'active' : ''}`}
                    onClick={() => setGalleryFilter('media')}
                    title="Solo discos ópticos y etiquetas de cartucho"
                  >
                    <span>💿 Discos & Cartuchos</span>
                  </button>
                  <button
                    className={`filter-chip ${galleryFilter === 'box' ? 'active' : ''}`}
                    onClick={() => setGalleryFilter('box')}
                    title="Solo cajas y carátulas comerciales"
                  >
                    <span>📦 Carátulas</span>
                  </button>
                  <button
                    className={`filter-chip ${galleryFilter === 'port' ? 'active' : ''}`}
                    onClick={() => setGalleryFilter('port')}
                    title="Logos transparentes y arte oficial de GitHub"
                  >
                    <span>⚡ Port & Logos</span>
                  </button>
                  <button
                    className={`filter-chip ${galleryFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setGalleryFilter('all')}
                    title="Mostrar todas las imágenes encontradas"
                  >
                    <span>🌐 Todos</span>
                  </button>
                </div>
              </div>

              {isSearchingLive ? (
                <div className="gallery-loading">
                  <Sparkles size={24} className="spin-icon" />
                  <span>Consultando repositorios de arte en vivo...</span>
                </div>
              ) : displayedResults.length > 0 ? (
                <div className="live-gallery-grid">
                  {visibleResults.map((item) => (
                    <div key={`${item.provider}-${item.id}`} className="gallery-item-card">
                      <div className={`gallery-thumb-wrap ${item.category === 'disc' ? 'thumb-is-disc' : item.category === 'cart' ? 'thumb-is-cart' : ''}`}>
                        <img
                          src={item.thumbnailUrl}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://placehold.co/150x200/161b22/8b949e?text=Sin+Preview';
                          }}
                        />
                        {item.category === 'disc' && <div className="disc-hole-preview" />}
                        <div className="thumb-badges-row">
                          <span className={`cat-badge cat-${item.category}`}>
                            {item.category === 'disc' ? '💿 DISCO' : item.category === 'cart' ? '🕹️ CART' : item.category.toUpperCase()}
                          </span>
                          <span className="prov-mini-badge">{item.provider}</span>
                        </div>
                      </div>
                      <div className="gallery-item-overlay">
                        <button
                          className="use-btn"
                          onClick={() => applyImageToTarget(item.url)}
                          title="Usar esta imagen para el medio actual"
                        >
                          <Check size={14} />
                          <span>Usar imagen</span>
                        </button>
                        <button
                          className="view-btn"
                          onClick={() => handleOpenExternal(item.url)}
                          title="Ver en resolución completa"
                        >
                          <ExternalLink size={12} />
                        </button>
                      </div>
                      <div className="gallery-item-meta">
                        <span className="item-name" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gallery-empty">
                  <ImageIcon size={28} />
                  <span>No hay imágenes para el filtro seleccionado. Puedes cambiar de filtro arriba o pulsar en las fuentes recomendadas abajo.</span>
                </div>
              )}
              {!isSearchingLive && displayedResults.length > 16 && (
                <button
                  className="gallery-show-more"
                  onClick={() => setShowAllResults((current) => !current)}
                >
                  {showAllResults ? 'Mostrar menos' : `Mostrar las ${displayedResults.length} imágenes`}
                </button>
              )}
            </div>

            {/* RANKED SOURCES CARDS */}
            <div className="ranked-sources-wrap">
              <h4 className="ranked-sources-title">
                Fuentes Especializadas para {activeTarget === 'box' ? 'Carátulas' : activeTarget === 'media' ? 'Discos y Cartuchos' : 'Arte del Port'}:
              </h4>
              <div className="ranked-sources-grid">
                {rankedSources.map((source) => (
                  <div key={source.id} className="source-card">
                    <div className="source-card-top">
                      <div className="source-name-row">
                        <span className="source-name">{source.name}</span>
                        <div className="stars-row">
                          {Array.from({ length: source.rating }).map((_, i) => (
                            <Star key={i} size={11} fill="#ffb703" color="#ffb703" />
                          ))}
                        </div>
                      </div>
                      <span className="source-badge" style={{ borderColor: source.color, color: source.color }}>
                        {source.badge}
                      </span>
                    </div>

                    <p className="source-purpose">
                      <strong>Ideal para:</strong> {source.bestFor}
                    </p>

                    <button
                      className="source-action-btn"
                      onClick={() => handleOpenExternal(source.url)}
                      title={`Buscar en ${source.name}`}
                    >
                      <span>Buscar en {source.name}</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer artwork-modal-footer">
          <div className="footer-status-zone">
            {saveSuccess && (
              <span className="save-success-msg">
                <Check size={16} /> ¡Artwork actualizado con éxito!
              </span>
            )}
          </div>
          <div className="footer-buttons-group">
            <button className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary btn-save-artwork" onClick={handleSave}>
              <Save size={16} />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
