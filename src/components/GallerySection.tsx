import { useState, useEffect } from 'react';
import { Trash2, Share2 } from 'lucide-react';

interface GalleryItem {
  id: number;
  image: string;
  date: string;
  isPreset?: boolean;
}

const NEBULA_CORE_SVG = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bg" r="75%"><stop offset="0" stop-color="#09090e"/><stop offset="1" stop-color="#020204"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="10" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="100%" height="100%" fill="url(#bg)"/><circle cx="400" cy="300" r="100" stroke="#00f3ff" stroke-width="4" fill="none" filter="url(#glow)"/><circle cx="400" cy="300" r="60" stroke="#b026ff" stroke-width="6" fill="none" filter="url(#glow)"/><circle cx="400" cy="300" r="30" stroke="#ff007f" stroke-width="2" fill="none" filter="url(#glow)"/><circle cx="280" cy="220" r="3" fill="#fff" filter="url(#glow)"/><circle cx="520" cy="380" r="4" fill="#fff" filter="url(#glow)"/><circle cx="340" cy="420" r="2" fill="#fff" filter="url(#glow)"/><circle cx="480" cy="180" r="3" fill="#fff" filter="url(#glow)"/></svg>`;

const SYMMETRIC_AURORA_SVG = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bg" r="75%"><stop offset="0" stop-color="#09090e"/><stop offset="1" stop-color="#020204"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="8" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="100%" height="100%" fill="url(#bg)"/><path d="M 100 100 L 700 500 M 700 100 L 100 500" stroke="#39ff14" stroke-width="4" filter="url(#glow)"/><path d="M 400 50 L 400 550 M 50 300 L 750 300" stroke="#00f3ff" stroke-width="3" filter="url(#glow)"/><polygon points="400,220 460,300 400,380 340,300" stroke="#ffb300" stroke-width="2" fill="none" filter="url(#glow)"/></svg>`;

const QUANTUM_SPIRAL_SVG = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bg" r="75%"><stop offset="0" stop-color="#09090e"/><stop offset="1" stop-color="#020204"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="12" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="100%" height="100%" fill="url(#bg)"/><path d="M 400 300 Q 450 200, 550 250 T 350 400 T 250 200 T 550 450" fill="none" stroke="#ff8c00" stroke-width="6" filter="url(#glow)"/><path d="M 400 300 Q 450 200, 550 250 T 350 400 T 250 200 T 550 450" fill="none" stroke="#fff" stroke-width="1.5"/></svg>`;

const PRESET_GALLERY: GalleryItem[] = [
  {
    id: 1,
    image: `data:image/svg+xml;utf8,${encodeURIComponent(NEBULA_CORE_SVG)}`,
    date: 'Exhibition',
    isPreset: true,
  },
  {
    id: 2,
    image: `data:image/svg+xml;utf8,${encodeURIComponent(SYMMETRIC_AURORA_SVG)}`,
    date: 'Exhibition',
    isPreset: true,
  },
  {
    id: 3,
    image: `data:image/svg+xml;utf8,${encodeURIComponent(QUANTUM_SPIRAL_SVG)}`,
    date: 'Exhibition',
    isPreset: true,
  },
];

export function GallerySection() {
  const [items, setItems] = useState<GalleryItem[]>([]);

  const loadGallery = () => {
    const saved = localStorage.getItem('glow_ar_gallery');
    let userItems: GalleryItem[] = [];
    if (saved) {
      try {
        userItems = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    setItems([...userItems, ...PRESET_GALLERY]);
  };

  useEffect(() => {
    loadGallery();
    // Listen for custom gallery updates within the same window context
    const handleGalleryUpdate = () => loadGallery();
    window.addEventListener('gallery-update', handleGalleryUpdate);
    return () => window.removeEventListener('gallery-update', handleGalleryUpdate);
  }, []);

  const deleteItem = (id: number) => {
    const saved = localStorage.getItem('glow_ar_gallery');
    if (saved) {
      try {
        const userItems: GalleryItem[] = JSON.parse(saved);
        const updated = userItems.filter((item) => item.id !== id);
        localStorage.setItem('glow_ar_gallery', JSON.stringify(updated));
        loadGallery();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <section className="interactive-gallery w-full max-w-7xl mx-auto px-6 py-20 z-10 pointer-events-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold mb-3 tracking-tight text-[#2c2b29]">
          Gallery of Masterpieces
        </h2>
        <p className="text-[#5c5952] text-sm max-w-lg mx-auto font-light leading-relaxed">
          Stunning artworks and gaming snapshots captured from your AR studio sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative bg-[#faf8f5] border-2 border-[#4a453f] rounded-[2.5rem] overflow-hidden shadow-[4px_4px_0px_#4a453f] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_#4a453f] transition-all duration-300"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-[#f0ede6] border-b-2 border-[#4a453f] relative">
              <img
                src={item.image}
                alt="Masterpiece"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
             />
            </div>
            
            <div className="p-6 flex justify-between items-center bg-[#faf8f5]">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#4a453f]/40 font-bold uppercase tracking-widest">
                  {item.isPreset ? 'Collection' : 'Captured'}
                </span>
                <span className="text-sm text-[#4a453f]/70 font-semibold">{item.date}</span>
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this artwork I created in Glow AR Studio! 🎨✨ #GlowAR #SpatialComputing`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-[#1DA1F2]/10 border border-[#1DA1F2]/20 text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white transition-all duration-300"
                  title="Share to X"
                >
                  <Share2 size={16}/>
                </a>
                
                {!item.isPreset && (
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300"
                    title="Delete Snapshot"
                  >
                    <Trash2 size={16}/>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
