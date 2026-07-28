import { bridge } from "./native";
import type { Source } from "./app";

/** Browser fallback. `desktopCapturer` has no web equivalent — enumerating
 *  every screen and window without a prompt is exactly what a browser refuses
 *  to do — so the source list is empty here and the app uses getDisplayMedia's
 *  own picker instead. Recording itself is standard MediaRecorder, so the
 *  preview genuinely records. */
export const call = bridge({
  list_sources: (): Source[] => [],
  save_recording: ({ name }: { name: string; bytes: number[] }) =>
    `${name} kept in memory — the desktop build writes it to ~/Movies`,
});
