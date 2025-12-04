import React, { useState, useRef, useEffect } from "react";

function IconPlay(props) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M5 3v18l15-9L5 3z" fill="white" />
    </svg>
  );
}
function IconPause(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="white" />
    </svg>
  );
}
function IconLyrics(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 6h16v2H4zM4 10h10v2H4zM4 14h8v2H4z" fill="white" />
    </svg>
  );
}
function IconEye(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="white"/>
    </svg>
  );
}

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [lyricsVisible, setLyricsVisible] = useState(false);
  const [lyricsDraft, setLyricsDraft] = useState("");
  const [showLyricsEditor, setShowLyricsEditor] = useState(false);

  const audioRef = useRef(new Audio());
  const lyricsRef = useRef(null);

  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  async function addFiles() {
    const files = await window.arkiaAPI.openAudioFiles();
    if (!files || !files.length) return;

    const metaList = await Promise.all(files.map((p) => window.arkiaAPI.readMetadata(p)));

    const items = metaList.map((m, i) => ({
      id: Date.now() + i,
      path: files[i],
      title: m.title,
      artist: m.artist,
      lyrics: m.lyrics,
      artwork: null
    }));

    setTracks((s) => [...s, ...items]);
  }

  async function playIndex(i) {
    const t = tracks[i];
    if (!t) return;
    try {
      const dataUrl = await window.arkiaAPI.readFileDataUrl(t.path);
      const audio = audioRef.current;
      audio.src = dataUrl;
      audio.onloadedmetadata = () => {
        setDuration(audio.duration || 0);
      };
      await audio.play();
      setCurrentIndex(i);
      setPlaying(true);
      if (t.lyrics) {
        // prefill lyricsDraft (for editor)
        setLyricsDraft(t.lyrics);
      } else {
        setLyricsDraft("");
      }
    } catch (err) {
      console.error("playIndex error:", err);
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch((e) => console.error("play failed:", e));
    }
  }

  useEffect(() => {
    const audio = audioRef.current;
    const onTime = () => setPosition(audio.currentTime || 0);
    const onDuration = () => setDuration(audio.duration || 0);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("ended", () => setPlaying(false));
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("ended", () => setPlaying(false));
    };
  }, []);

  // Auto-scroll lyrics proportionally to playback progress
  useEffect(() => {
    if (!lyricsVisible || !lyricsRef.current || !duration || duration === Infinity) return;
    const el = lyricsRef.current;
    const scrollRange = el.scrollHeight - el.clientHeight;
    if (scrollRange <= 0) return;
    const percent = Math.min(1, Math.max(0, position / (duration || 1)));
    el.scrollTop = percent * scrollRange;
  }, [position, duration, lyricsVisible]);

  const format = (sec) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };
  const remaining = Math.max(0, (duration || 0) - (position || 0));

  async function saveLyrics() {
    if (!currentIndex && currentIndex !== 0) return;
    const cur = tracks[currentIndex];
    const ok = await window.arkiaAPI.saveLyrics(cur.path, lyricsDraft);
    if (ok) {
      const updated = [...tracks];
      updated[currentIndex] = { ...updated[currentIndex], lyrics: lyricsDraft };
      setTracks(updated);
      setShowLyricsEditor(false);
      // keep lyrics visible and synced
      setLyricsVisible(true);
    } else {
      alert("Failed to save lyrics");
    }
  }

  const current = currentIndex !== null ? tracks[currentIndex] : null;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0f1113", color: "#fff", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* LEFT SIDEBAR */}
      <div style={{ width: 230, background: "#0b0c0d", padding: 24, borderRight: "1px solid #121314" }}>
        <div style={{ fontWeight: 700, letterSpacing: 1.2, marginBottom: 18 }}>ARKIA</div>
        <button onClick={addFiles} style={{ width: "100%", padding: "10px 12px", background: "#1e1f22", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer" }}>Add Music Files</button>
        <div style={{ marginTop: 28, opacity: 0.65 }}>Library</div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
        <h2 style={{ margin: 0, marginBottom: 16 }}>Songs</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          {tracks.map((t, i) => (
            <div key={t.id} style={{ background: "#0b0c0d", padding: 12, borderRadius: 10, border: currentIndex === i ? "1px solid #2a9d8f" : "1px solid #1a1b1c" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 8, background: "#111" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{t.title}</div>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>{t.artist}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => playIndex(i)} style={{ background: "transparent", border: "1px solid #2b2c2d", padding: 8, borderRadius: 8, cursor: "pointer" }}>
                    <IconPlay />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM PLAYER */}
      {current && (
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          background: "#0b0c0d", borderTop: "1px solid #121314", padding: "14px 22px",
          display: "flex", alignItems: "center", gap: 18
        }}>
          {/* artwork */}
          <div style={{ width: 72, height: 72, borderRadius: 10, background: "#111", flex: "0 0 72px" }}>
            {/* Real artwork extraction can replace this background with an <img /> */}
          </div>

          {/* info + timeline */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{current.title}</div>
                <div style={{ fontSize: 13, opacity: 0.75 }}>{current.artist}</div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {/* Lyrics toggle (icon) */}
                <button title="Toggle lyrics" onClick={() => setLyricsVisible(v => !v)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 8 }}>
                  {lyricsVisible ? <IconEye /> : <IconLyrics />}
                </button>

                {/* Edit lyrics */}
                <button title="Edit lyrics" onClick={() => { setLyricsDraft(current.lyrics || ""); setShowLyricsEditor(true); }} style={{ background: "#1e1f22", border: "none", color: "#fff", padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}>
                  Edit Lyrics
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <div style={{ fontSize: 13, opacity: 0.7 }}>{format(position)}</div>
              <input
                type="range"
                min="0"
                max={duration || 1}
                value={position}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  audioRef.current.currentTime = v;
                  setPosition(v);
                }}
                style={{ flex: 1 }}
              />
              <div style={{ fontSize: 13, opacity: 0.7 }}>- {format(remaining)}</div>
            </div>
          </div>

          {/* controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={togglePlay} style={{ width: 56, height: 56, borderRadius: 14, background: "#1e1f22", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {playing ? <IconPause /> : <IconPlay />}
            </button>
          </div>

          {/* lyrics panel (right) */}
          {lyricsVisible && (
            <div style={{ width: 360, marginLeft: 12, padding: 12, background: "#080808", borderRadius: 8, border: "1px solid #111", height: 120, overflow: "hidden" }}>
              <div ref={lyricsRef} style={{ height: "100%", overflowY: "auto", paddingRight: 8 }}>
                {current.lyrics ? (
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6, opacity: 0.95 }}>{current.lyrics}</pre>
                ) : (
                  <div style={{ opacity: 0.6 }}>No embedded lyrics found. Click Edit Lyrics to add.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LYRICS EDITOR MODAL */}
      {showLyricsEditor && (
        <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.6)" }}>
          <div style={{ width: 520, background: "#0f1113", padding: 18, borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>Edit Lyrics</div>
              <div>
                <button onClick={() => setShowLyricsEditor(false)} style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer" }}>Close</button>
              </div>
            </div>

            <textarea value={lyricsDraft} onChange={(e) => setLyricsDraft(e.target.value)} style={{ width: "100%", height: 260, background: "#0b0c0d", color: "#fff", padding: 12, borderRadius: 8, border: "1px solid #121314", resize: "vertical" }} />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <button onClick={() => setShowLyricsEditor(false)} style={{ padding: "8px 12px", background: "#1e1f22", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}>Cancel</button>
              <button onClick={saveLyrics} style={{ padding: "8px 12px", background: "#2a9d8f", border: "none", borderRadius: 8, color: "#000", cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}