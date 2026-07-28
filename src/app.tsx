import { useEffect, useRef, useState } from "react";
import { Win, NavItem } from "./shell";
import { isNative } from "./native";
import { call } from "./web";

const RELEASES = "https://github.com/hanzo-templates/desktop-recorder/releases/latest";

export type Source = { id: string; name: string; kind: string; thumb: string };
type Take = { name: string; bytes: number; ms: number; url: string; path?: string };

const size = (n: number) => (n / 1024 ** 2).toFixed(1) + " MB";
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function App() {
  const [sources, setSources] = useState<Source[]>([]);
  const [pick, setPick] = useState("");
  const [takes, setTakes] = useState<Take[]>([]);
  const [rec, setRec] = useState(false);
  const [ms, setMs] = useState(0);
  const [note, setNote] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const t0 = useRef(0);

  async function scan() {
    const s = await call("list_sources");
    setSources(s);
    setPick((p) => p || s[0]?.id || "");
  }
  useEffect(() => { scan(); }, []);

  useEffect(() => {
    if (!rec) return;
    const iv = setInterval(() => setMs(Date.now() - t0.current), 200);
    return () => clearInterval(iv);
  }, [rec]);

  /** The one Electron-only step: a chromeMediaSourceId picked from the main
   *  process turns into a stream with no OS picker. The browser has no such
   *  API, so the web build falls back to getDisplayMedia's own picker. */
  async function grab(): Promise<MediaStream> {
    if (isNative && pick) {
      return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-expect-error chromium-only constraint, the reason this app is Electron
          mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: pick },
        },
      });
    }
    return navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  }

  async function start() {
    try {
      const stream = await grab();
      if (video.current) {
        video.current.srcObject = stream;
        video.current.play();
      }
      chunks.current = [];
      const m = new MediaRecorder(stream, { mimeType: "video/webm" });
      m.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      m.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "video/webm" });
        const name = `take-${takes.length + 1}.webm`;
        const saved = await call("save_recording", {
          name,
          bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
        });
        setTakes((ts) => [
          { name, bytes: blob.size, ms: Date.now() - t0.current, url: URL.createObjectURL(blob), path: saved },
          ...ts,
        ]);
        setNote(saved);
      };
      m.start(1000);
      mr.current = m;
      t0.current = Date.now();
      setMs(0);
      setRec(true);
      setNote("");
    } catch (e) {
      setNote((e as Error).message);
    }
  }

  function stop() {
    mr.current?.stop();
    setRec(false);
  }

  return (
    <Win
      title="Recorder"
      sub={rec ? "recording " + clock(ms) : "idle"}
      releases={RELEASES}
      wide
      status={
        <>
          <span>{isNative ? "desktopCapturer (no OS picker)" : "getDisplayMedia (browser picker)"}</span>
          <span className="grow" />
          {note && <span>{note}</span>}
          <span>{takes.length} takes</span>
        </>
      }
      actions={
        rec ? (
          <button className="btn" onClick={stop}>stop</button>
        ) : (
          <button className="btn pri" onClick={start}>record</button>
        )
      }
      side={
        <>
          <div className="row">
            <h2 style={{ margin: 0 }}>Sources</h2>
            <span className="grow" />
            <button className="btn" style={{ padding: "2px 8px", fontSize: 11 }} onClick={scan}>rescan</button>
          </div>
          <nav className="nav" style={{ marginTop: 8 }}>
            {sources.map((s) => (
              <NavItem key={s.id} on={s.id === pick} onClick={() => setPick(s.id)} tail={s.kind}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
              </NavItem>
            ))}
            {sources.length === 0 && (
              <p className="dim" style={{ fontSize: 11, padding: "0 8px" }}>
                Enumerating screens and windows without a permission prompt is a
                Chromium-only capability — this pane is empty in the browser and
                full in the installed app.
              </p>
            )}
          </nav>
          <h2>Preview</h2>
          <div style={{ padding: "0 4px" }}>
            {sources.find((s) => s.id === pick)?.thumb ? (
              <img src={sources.find((s) => s.id === pick)!.thumb}
                   style={{ width: "100%", borderRadius: 8, border: "1px solid var(--line)" }} />
            ) : (
              <div className="dim" style={{ fontSize: 11, padding: "0 4px" }}>no thumbnail</div>
            )}
          </div>
        </>
      }
    >
      <div style={{ display: "grid", gap: 16, gridTemplateRows: "auto 1fr" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden", background: "#000" }}>
          <video ref={video} muted playsInline
                 style={{ width: "100%", aspectRatio: "16/9", display: "block", background: "#000" }} />
        </div>
        <div>
          <div className="row">
            <h3 style={{ margin: 0 }}>Takes</h3>
            <span className="grow" />
            {rec && <span className="tag warn mono">● {clock(ms)}</span>}
          </div>
          <div className="grid" style={{ marginTop: 10 }}>
            {takes.length === 0 && <div className="empty">hit record — output is webm, written by the main process</div>}
            {takes.map((t) => (
              <div className="card row" key={t.name}>
                <video src={t.url} controls style={{ width: 200, borderRadius: 6 }} />
                <div>
                  <div><b>{t.name}</b></div>
                  <div className="dim mono" style={{ fontSize: 11 }}>
                    {clock(t.ms)} · {size(t.bytes)}
                  </div>
                  <div className="dim mono" style={{ fontSize: 11 }}>{t.path}</div>
                </div>
                <span className="grow" />
                <a className="btn" href={t.url} download={t.name}>save as…</a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Win>
  );
}
