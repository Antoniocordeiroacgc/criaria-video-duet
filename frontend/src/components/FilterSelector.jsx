/**
 * FilterSelector — seletor de filtros CSS para vídeo/foto de referência e câmera.
 * Os filtros são aplicados via CSS filter, sem custo de processamento no servidor.
 * O vídeo final NÃO tem os filtros — são apenas visuais para ajudar na gravação.
 */

export const FILTERS = [
  { id: 'none',     label: 'Normal',   css: 'none' },
  { id: 'pb',       label: 'P&B',      css: 'grayscale(100%)' },
  { id: 'sepia',    label: 'Sépia',    css: 'sepia(80%)' },
  { id: 'vintage',  label: 'Vintage',  css: 'sepia(40%) contrast(85%) brightness(110%) saturate(80%)' },
  { id: 'neon',     label: 'Neon',     css: 'saturate(200%) hue-rotate(30deg) brightness(110%)' },
  { id: 'frio',     label: 'Frio',     css: 'saturate(80%) hue-rotate(180deg) brightness(95%)' },
  { id: 'quente',   label: 'Quente',   css: 'saturate(120%) sepia(20%) brightness(105%)' },
  { id: 'blur',     label: 'Suave',    css: 'blur(1.5px) brightness(105%)' },
  { id: 'drama',    label: 'Drama',    css: 'contrast(130%) brightness(90%) saturate(110%)' },
  { id: 'fade',     label: 'Fade',     css: 'brightness(115%) saturate(70%) contrast(90%)' },
];

export default function FilterSelector({ value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 px-0.5">
      {FILTERS.map(f => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          className={`flex flex-col items-center gap-1 shrink-0 transition-all ${value === f.id ? 'opacity-100' : 'opacity-60 hover:opacity-80'}`}
        >
          {/* Preview do filtro */}
          <div
            className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${value === f.id ? 'border-primary' : 'border-transparent'}`}
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)', filter: f.css }}
          />
          <span className={`text-xs font-medium ${value === f.id ? 'text-primary' : 'text-muted-foreground'}`}>
            {f.label}
          </span>
        </button>
      ))}
    </div>
  );
}
