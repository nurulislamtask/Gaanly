import { en, type Messages } from "./en";

type Deep<T> = { [K in keyof T]?: T[K] extends (...a: never[]) => unknown ? T[K] : T[K] extends object ? Deep<T[K]> : T[K] };

function merge<T extends object>(base: T, over: Deep<T>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = out[k];
    out[k] = v && typeof v === "object" && b && typeof b === "object" ? merge(b as object, v as Deep<object>) : v;
  }
  return out as T;
}

const count = (n: number, w: string) => `${n} ${w}`;

/** Bangla. The main screens are translated; anything not yet translated shows in English. */
export const bn: Messages = merge(en, {
  locale: "bn-BD",
  common: {
    close: "বন্ধ করুন",
    back: "পেছনে",
    cancel: "বাতিল",
    retry: "আবার চেষ্টা করুন",
    loading: "লোড হচ্ছে",
    play: "চালান",
    pause: "থামান",
    playX: (title: string) => `${title} চালান`,
    playAll: "সব চালান",
    favorite: "প্রিয়",
    playlist: "প্লেলিস্ট",
    addToFavorites: "প্রিয়তে যোগ করুন",
    removeFromFavorites: "প্রিয় থেকে সরান",
    inFavorites: "প্রিয়তে আছে",
    video: "ভিডিও",
    searchMusic: "গান খুঁজুন",
    install: "ইনস্টল",
    update: "আপডেট",
    tracks: (n: number) => count(n, "টি গান"),
    songs: (n: number) => count(n, "টি গান"),
    artists: (n: number) => count(n, "জন শিল্পী"),
  },
  time: {
    greeting: (hour: number): string =>
      hour < 5 ? "শুভ রাত্রি" : hour < 12 ? "শুভ সকাল" : hour < 17 ? "শুভ দুপুর" : hour < 19 ? "শুভ বিকেল" : "শুভ সন্ধ্যা",
  },
  nav: {
    home: "হোম",
    search: "খুঁজুন",
    library: "লাইব্রেরি",
    settings: "সেটিংস",
    updatePill: "আপডেট",
    yourCollection: "আপনার সংগ্রহ",
    newPlaylist: "নতুন প্লেলিস্ট",
    favorites: "প্রিয়",
    recentlyPlayed: "সম্প্রতি শোনা",
    history: "ইতিহাস",
  },
  home: {
    startTitle: "খুঁজে শুরু করুন",
    seeAll: "সব দেখুন",
    yourFavorites: "আপনার প্রিয় গান",
    shelves: {
      "yt-trending": "YouTube Music-এ ট্রেন্ডিং",
      "sp-global": "Spotify Top 50 · বিশ্ব",
      "sp-hits": "Spotify · আজকের হিট",
      "yt-new": "নতুন অ্যালবাম ও সিঙ্গেল",
      "sp-india": "Spotify Top 50 · ভারত",
    },
    tune: {
      button: "হোম সাজান",
      title: "হোম সাজান",
      languages: "ভাষা",
      languagesHint: "যা শোনেন তা বেছে নিন। হোমে শুধু সেগুলোই দেখাবে। কিছু না বাছলে সব দেখাবে।",
      singers: "শিল্পী ও ব্যান্ড",
      singerPlaceholder: "শিল্পী যোগ করুন, যেমন Arijit Singh",
      add: "যোগ",
      suggestions: "পরামর্শ",
      playlists: "শর্টকাটে প্লেলিস্ট",
      playlistsHint: "হোমের উপরে কোন প্লেলিস্ট দেখাবে তা বাছুন।",
      defaultPlaylists: "ডিফল্ট (প্রথম ৬টি)",
      clear: "ফিল্টার সরান",
      done: "হয়েছে",
      filtering: (what: string) => `শুধু দেখাচ্ছে: ${what}`,
      removeX: (x: string) => `${x} সরান`,
      edit: "প্লেলিস্ট বাছুন",
    },
    feed: {
      chips: { all: "সব", bangla: "বাংলা", hindi: "হিন্দি", english: "ইংরেজি", urdu: "উর্দু", tamil: "তামিল", telugu: "তেলুগু", punjabi: "পাঞ্জাবি", kpop: "কে-পপ", romantic: "রোমান্টিক", chill: "চিল", workout: "ওয়ার্কআউট", party: "পার্টি" },
      newSongs: (x: string) => `নতুন ${x} গান`,
      oldSongs: (x: string) => `পুরনো ${x} ক্লাসিক`,
      hits: (x: string) => `${x} হিট গান`,
      moreFrom: (x: string) => `${x}-এর আরও গান`,
      refresh: "নতুন কিছু দেখান",
      featured: "বিশেষ",
      yourLibrary: "আপনার লাইব্রেরি",
      playX: (x: string) => `${x} চালান`,
    },
    spotifyNote: "Spotify-এর তালিকা তাদের পাবলিক চার্ট থেকে আসে; গান YouTube থেকে বাজে।",
  },
  nowPlaying: {
    title: "এখন বাজছে",
    startRadio: "এই গান থেকে রেডিও চালু করুন",
    upNext: "এরপর",
    tabPlaying: "বাজছে",
    tabQueue: "কিউ",
  },
  customize: {
    palette: "থিম",
    palettes: { ocean: "সমুদ্র", midnight: "মধ্যরাত (AMOLED)", graphite: "গ্রাফাইট", plum: "বেগুনি", forest: "বন", sunset: "সূর্যাস্ত" },
  },
  listen: {
    lyrics: "লিরিক্স",
    loadingLyrics: "লিরিক্স খোঁজা হচ্ছে",
    noLyrics: "এই গানের লিরিক্স পাওয়া যায়নি।",
    speed: "গতি",
    speedX: (x: string) => `গতি ${x}x`,
    sleep: "স্লিপ টাইমার",
    sleepOff: "স্লিপ টাইমার: বন্ধ",
    sleepMinutes: (n: number) => `${n} মিনিট`,
    sleepEnd: "গান শেষে",
    sleepSet: (label: string) => `স্লিপ টাইমার: ${label}`,
    sleepDone: "স্লিপ টাইমার: গান থেমেছে। শুভ রাত্রি!",
    sleepCancelled: "স্লিপ টাইমার বন্ধ",
    lyricsSource: "লিরিক্স LRCLIB থেকে",
  },
} as Deep<Messages>);
