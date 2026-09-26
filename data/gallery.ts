export interface GalleryItem {
  id: string;
  title: string;
  category: "Artwork" | "Sketches" | "Photography" | "Creative Coding" | "Design" | "Experiments";
  imageUrl: string;
  caption: string;
  year: string;
  aspectRatio: "1:1" | "4:3" | "16:9" | "3:4";
  tags: string[];
}

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "art-1",
    title: "Convergence in Ink",
    category: "Artwork",
    imageUrl: "/images/artwork/convergence-ink.svg",
    caption: "Geometric pen and ink exploration studying focal depth, contrast, and balance.",
    year: "2026",
    aspectRatio: "4:3",
    tags: ["Ink", "Traditional", "Geometry"],
  },
  {
    id: "sketch-1",
    title: "Neuro-Cognitive UI Wireframes",
    category: "Sketches",
    imageUrl: "/images/artwork/neuro-sketches.svg",
    caption: "Early pencil layout sketches exploring tremor-tolerant touch targets for Saksham.",
    year: "2026",
    aspectRatio: "1:1",
    tags: ["UI Sketches", "Assistive Tech", "Paper Wireframes"],
  },
  {
    id: "code-1",
    title: "Algorithmic Sine Waves",
    category: "Creative Coding",
    imageUrl: "/images/artwork/sine-waves.svg",
    caption: "Generative canvas experiment exploring oscillating harmonic waveforms and phase shift.",
    year: "2026",
    aspectRatio: "16:9",
    tags: ["Canvas", "Math", "Generative Art"],
  },
  {
    id: "design-1",
    title: "Bilingual Typography Study: Devanagari & Latin",
    category: "Design",
    imageUrl: "/images/artwork/typography-study.svg",
    caption: "Visual balance study matching Latin sans-serif line metrics with Devanagari shirorekha.",
    year: "2026",
    aspectRatio: "4:3",
    tags: ["Typography", "Devanagari", "Editorial"],
  },
  {
    id: "photo-1",
    title: "Architectural Shadows at Golden Hour",
    category: "Photography",
    imageUrl: "/images/artwork/architectural-shadows.svg",
    caption: "Study of diagonal sunlight cast across brutalist concrete forms.",
    year: "2026",
    aspectRatio: "3:4",
    tags: ["Photography", "Shadows", "Minimalism"],
  },
  {
    id: "exp-1",
    title: "Acoustic Metronome Frequency Grid",
    category: "Experiments",
    imageUrl: "/images/artwork/frequency-grid.svg",
    caption: "Oscilloscope frequency mapping for rhythmic auditory stimulation pacing.",
    year: "2026",
    aspectRatio: "16:9",
    tags: ["Sound Design", "Oscillators", "Acoustics"],
  },
];
