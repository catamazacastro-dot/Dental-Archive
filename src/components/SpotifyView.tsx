import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Music2,
  Plus,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import type { SpotifyPlaylistItem } from '../types/dental';

const SPOTIFY_STORAGE_KEY = 'dental_archive_spotify_playlists_v1';
const SPOTIFY_SELECTED_KEY = 'dental_archive_spotify_selected_v1';
const SPOTIFY_MINI_OPEN_KEY = 'dental_archive_spotify_mini_open_v1';
const SPOTIFY_INICIO_COLLAPSED_KEY = 'dental_archive_spotify_inicio_collapsed_v1';

const DEFAULT_PLAYLISTS: SpotifyPlaylistItem[] = [
  {
    id: 'sp-lofi',
    titulo: 'Lofi Beats — Estudio y Resúmenes',
    categoria: 'Lo-Fi / Concentración',
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn',
    embedPath: 'playlist/37i9dQZF1DWWQRwui0ExPn',
    esPredeterminada: true,
  },
  {
    id: 'sp-deep-focus',
    titulo: 'Deep Focus — Lectura y Anatomía',
    categoria: 'Ambient / Focus',
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS',
    embedPath: 'playlist/37i9dQZF1DX8Uebhn9wzrS',
    esPredeterminada: true,
  },
  {
    id: 'sp-piano',
    titulo: 'Peaceful Piano — Repaso de Parciales',
    categoria: 'Piano Instrumental',
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
    embedPath: 'playlist/37i9dQZF1DX4sWSpwq3LiO',
    esPredeterminada: true,
  },
  {
    id: 'sp-instrumental',
    titulo: 'Instrumental Study — Sesiones Pomodoro',
    categoria: 'Instrumental',
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX9sIqqvKsjG8',
    embedPath: 'playlist/37i9dQZF1DX9sIqqvKsjG8',
    esPredeterminada: true,
  },
];

export function parseSpotifyEmbedPath(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;

  const uriMatch = input.match(/^spotify:(playlist|album|track|show|episode):([a-zA-Z0-9]+)$/);
  if (uriMatch) {
    return `${uriMatch[1]}/${uriMatch[2]}`;
  }

  const urlMatch = input.match(
    /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track|show|episode)\/([a-zA-Z0-9]+)/i
  );
  if (urlMatch) {
    return `${urlMatch[1].toLowerCase()}/${urlMatch[2]}`;
  }

  return null;
}

interface SpotifyViewProps {
  isInicioActive: boolean;
  onGoToInicio?: () => void;
}

export const SpotifyView: React.FC<SpotifyViewProps> = ({
  isInicioActive,
  onGoToInicio,
}) => {
  const isOnline = useOnlineStatus();
  const [playlists, setPlaylists] = useState<SpotifyPlaylistItem[]>(() => {
    try {
      const raw = localStorage.getItem(SPOTIFY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SpotifyPlaylistItem[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PLAYLISTS;
  });

  const [selectedId, setSelectedId] = useState<string>(() => {
    try {
      return localStorage.getItem(SPOTIFY_SELECTED_KEY) || DEFAULT_PLAYLISTS[0].id;
    } catch {
      return DEFAULT_PLAYLISTS[0].id;
    }
  });

  const [miniOpen, setMiniOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SPOTIFY_MINI_OPEN_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [inicioCollapsed, setInicioCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SPOTIFY_INICIO_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(SPOTIFY_STORAGE_KEY, JSON.stringify(playlists));
    } catch {
      // Ignore storage errors
    }
  }, [playlists]);

  useEffect(() => {
    try {
      localStorage.setItem(SPOTIFY_SELECTED_KEY, selectedId);
    } catch {
      // Ignore storage errors
    }
  }, [selectedId]);

  useEffect(() => {
    try {
      localStorage.setItem(SPOTIFY_MINI_OPEN_KEY, String(miniOpen));
    } catch {
      // Ignore storage errors
    }
  }, [miniOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(SPOTIFY_INICIO_COLLAPSED_KEY, String(inicioCollapsed));
    } catch {
      // Ignore storage errors
    }
  }, [inicioCollapsed]);

  const activePlaylist =
    playlists.find((p) => p.id === selectedId) || playlists[0] || DEFAULT_PLAYLISTS[0];

  const handleAddPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError('');
    const embedPath = parseSpotifyEmbedPath(customUrl);
    if (!embedPath) {
      setUrlError('Pegá un link válido de Spotify (playlist, álbum, tema o podcast).');
      return;
    }

    const fresh: SpotifyPlaylistItem = {
      id: `sp-${Date.now().toString(36)}`,
      titulo: customTitle.trim() || 'Mi playlist de estudio',
      categoria: 'Personalizada',
      spotifyUrl: customUrl.trim().startsWith('http')
        ? customUrl.trim()
        : `https://open.spotify.com/${embedPath}`,
      embedPath,
    };

    setPlaylists((prev) => [fresh, ...prev]);
    setSelectedId(fresh.id);
    setCustomTitle('');
    setCustomUrl('');
    setShowAddForm(false);
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) return DEFAULT_PLAYLISTS;
      if (selectedId === id) setSelectedId(next[0].id);
      return next;
    });
  };

  // Mantener el <iframe> montado en la misma posición del árbol React para que la música siga sonando al cambiar de página:
  // - En Inicio (expandido): tarjeta compacta al pie de Inicio
  // - En otras páginas con miniOpen=true: mini reproductor flotante
  // - Oculto: fuera de pantalla con 0 impacto visual pero reproducción activa
  const isVisibleOnInicio = isInicioActive && !inicioCollapsed;
  const isVisibleFloating = !isInicioActive && miniOpen;

  const playerCardClass = isVisibleOnInicio
    ? 'rounded-xl border border-rose-200/80 bg-white p-3.5'
    : isVisibleFloating
      ? 'fixed right-3 bottom-16 left-3 z-40 rounded-xl border border-rose-200 bg-white p-3 shadow-xl sm:left-auto sm:w-[360px] md:right-5 md:bottom-5 print:hidden'
      : 'pointer-events-none fixed -left-[9999px] bottom-0 h-[152px] w-[320px] opacity-0 print:hidden';

  return (
    <div
      id="spotify-inicio-card"
      className={
        isInicioActive
          ? 'mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6 lg:px-8'
          : ''
      }
    >
      {/* Barra compacta superior en Inicio */}
      {isInicioActive && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200/80 bg-rose-50/50 px-3.5 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Music2 size={16} className="shrink-0 text-emerald-700" />
            <span className="shrink-0 text-xs font-bold text-rose-950">Spotify</span>
            <select
              aria-label="Seleccionar playlist de Spotify"
              value={activePlaylist.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-8 min-w-0 flex-1 max-w-xs truncate rounded-lg border border-rose-200 bg-white px-2 text-xs font-medium text-slate-800"
            >
              {playlists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.titulo}
                </option>
              ))}
            </select>

            {!activePlaylist.esPredeterminada && (
              <button
                type="button"
                onClick={() => handleDeletePlaylist(activePlaylist.id)}
                title="Eliminar playlist seleccionada"
                aria-label="Eliminar playlist seleccionada"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-white text-slate-500 hover:text-rose-800"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 text-[11px] font-semibold text-rose-950 hover:bg-rose-50"
            >
              <Plus size={13} />
              <span>Link</span>
            </button>

            <a
              href={activePlaylist.spotifyUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir en Spotify"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              <span>Abrir</span>
              <ExternalLink size={12} />
            </a>

            <button
              type="button"
              onClick={() => setInicioCollapsed((c) => !c)}
              aria-label={inicioCollapsed ? 'Mostrar reproductor Spotify' : 'Contraer reproductor Spotify'}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              {inicioCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              <span>{inicioCollapsed ? 'Mostrar' : 'Ocultar'}</span>
            </button>
          </div>
        </div>
      )}

      {isInicioActive && showAddForm && (
        <form
          onSubmit={handleAddPlaylist}
          className="mb-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-white p-3"
        >
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Nombre (opcional)"
            className="h-8 w-40 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
          />
          <input
            type="text"
            required
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="Link de Spotify (https://open.spotify.com/playlist/...)"
            className="h-8 min-w-[200px] flex-1 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
          />
          <button
            type="submit"
            className="h-8 rounded-lg bg-rose-900 px-3 text-xs font-semibold text-white hover:bg-rose-950"
          >
            Guardar
          </button>
          {urlError && (
            <p className="w-full text-[11px] font-medium text-rose-800">{urlError}</p>
          )}
        </form>
      )}

      {isInicioActive && !isOnline && !inicioCollapsed && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-900">
          <WifiOff size={14} className="shrink-0" />
          <span>Sin conexión: Spotify requiere internet para reproducir.</span>
        </div>
      )}

      {/* Reproductor iframe persistente */}
      <div className={playerCardClass}>
        {isVisibleFloating && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Music2 size={14} className="shrink-0 text-emerald-700" />
              <select
                aria-label="Seleccionar playlist de Spotify"
                value={activePlaylist.id}
                onChange={(e) => setSelectedId(e.target.value)}
                className="h-7 min-w-0 flex-1 truncate rounded-md border border-rose-200 bg-rose-50/60 px-2 text-xs font-semibold text-rose-950"
              >
                {playlists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {onGoToInicio && (
                <button
                  type="button"
                  onClick={onGoToInicio}
                  className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-rose-50"
                >
                  Inicio
                </button>
              )}
              <button
                type="button"
                onClick={() => setMiniOpen(false)}
                title="Minimizar reproductor (sigue sonando)"
                aria-label="Minimizar reproductor de Spotify"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-950"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        )}

        <iframe
          key="persistent-spotify-embed"
          title={`Reproductor Spotify: ${activePlaylist.titulo}`}
          src={`https://open.spotify.com/embed/${activePlaylist.embedPath}?utm_source=generator&theme=0`}
          width="100%"
          height={152}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="rounded-xl border border-rose-100"
        />
      </div>

      {/* Botón flotante compacto en otras páginas para controlar Spotify sin interrumpir */}
      {!isInicioActive && !miniOpen && (
        <button
          type="button"
          onClick={() => setMiniOpen(true)}
          aria-label="Abrir reproductor Spotify flotante"
          className="fixed right-3 bottom-16 z-40 inline-flex min-h-[36px] items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-950 shadow-lg transition-colors hover:bg-rose-50 md:right-5 md:bottom-5 print:hidden"
        >
          <Music2 size={14} className="shrink-0 text-emerald-700" />
          <span className="max-w-[140px] truncate">{activePlaylist.titulo}</span>
          <ChevronUp size={13} className="shrink-0 text-slate-500" />
        </button>
      )}
    </div>
  );
};
