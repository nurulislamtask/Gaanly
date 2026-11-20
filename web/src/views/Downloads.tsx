import { useT } from "../i18n";
import { PageHeader } from "../components/Page";
import { TrackList } from "../components/TrackList";
import { offlineSupported, useOffline } from "../lib/offline";

/** Songs saved on this device. */
export default function Downloads() {
  const t = useT();
  const tracks = useOffline((s) => s.tracks);
  return (
    <div className="pb-8">
      <PageHeader title={t.listen.downloadsTitle} />
      {tracks.length ? (
        <div className="px-2 md:px-3">
          <TrackList tracks={tracks} context={tracks} header={false} showAlbum={false} />
        </div>
      ) : (
        <p className="px-6 py-16 text-center text-sm text-fg-2">{offlineSupported ? t.listen.downloadsEmpty : t.listen.downloadsUnsupported}</p>
      )}
    </div>
  );
}
