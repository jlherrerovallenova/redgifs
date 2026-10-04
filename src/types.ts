export interface RedGifItem {
  id: string;
  title: string;
  userName: string;
  duration: number;
  views: number;
  likes: number;
  tags: string[];
  hd_url: string;
  sd_url: string;
  poster_url: string;
  thumbnail_url: string;
  watch_url: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  userName: string;
  duration: number;
  views: number;
  likes?: number;
  hasAudio?: boolean;
  verified?: boolean;
  tags?: string[];
  hd_url: string;
  sd_url: string;
  silent_url?: string;
  thumbnail_url: string;
  poster_url?: string;
  watch_url: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  userName: string;
  filename: string;
  quality: string;
  timestamp: number;
  url: string;
  size_mb?: number;
}
