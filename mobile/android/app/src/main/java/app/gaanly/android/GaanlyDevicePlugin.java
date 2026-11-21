package app.gaanly.android;

import android.app.UiModeManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.media.audiofx.Equalizer;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * What kind of device the app runs on (web/src/native/android.ts): the same APK serves phones and Android TV.
 * Also the in-app updater: downloads the new APK from Gaanly's GitHub releases and hands it to Android's installer.
 */
@CapacitorPlugin(name = "GaanlyDevice")
public class GaanlyDevicePlugin extends Plugin {

    private volatile boolean updating = false;

    @PluginMethod
    public void info(PluginCall call) {
        Context context = getContext();
        UiModeManager uiMode = (UiModeManager) context.getSystemService(Context.UI_MODE_SERVICE);
        boolean tv =
            (uiMode != null && uiMode.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION) ||
            context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_LEANBACK);
        JSObject result = new JSObject();
        result.put("tv", tv);
        call.resolve(result);
    }

    private Equalizer equalizer;

    /**
     * The phone's equaliser on the whole audio output. The app sends ten gains (dB, 31 Hz to 16 kHz); the phone usually
     * has five bands, so each takes the average of the app bands closest to its centre frequency.
     */
    @PluginMethod
    public void setEqualizer(PluginCall call) {
        JSObject result = new JSObject();
        try {
            org.json.JSONArray gains = call.getArray("gains");
            if (equalizer == null) {
                equalizer = new Equalizer(0, 0);
            }
            double[] hz = { 31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 };
            short[] range = equalizer.getBandLevelRange();
            boolean flat = true;
            for (int i = 0; i < gains.length(); i++) {
                if (gains.getDouble(i) != 0) flat = false;
            }
            equalizer.setEnabled(!flat);
            for (short band = 0; band < equalizer.getNumberOfBands(); band++) {
                double centre = equalizer.getCenterFreq(band) / 1000.0;
                double sum = 0;
                int n = 0;
                for (int i = 0; i < hz.length; i++) {
                    if (Math.abs(Math.log(hz[i] / centre)) < 0.85) {
                        sum += gains.getDouble(i);
                        n++;
                    }
                }
                double db = n == 0 ? 0 : sum / n;
                int level = (int) Math.round(db * 100);
                level = Math.max(range[0], Math.min(range[1], level));
                equalizer.setBandLevel(band, (short) level);
            }
            result.put("supported", true);
        } catch (Throwable e) {
            equalizer = null;
            result.put("supported", false);
        }
        call.resolve(result);
    }

    /** Only Gaanly's own GitHub downloads are accepted (the web side checks the repository path too). */
    private static boolean trusted(URL url) {
        String host = url.getHost();
        return (
            "https".equals(url.getProtocol()) &&
            (host.equals("github.com") || host.endsWith(".githubusercontent.com") || host.equals("githubusercontent.com"))
        );
    }

    private void progress(int percent) {
        JSObject data = new JSObject();
        data.put("percent", percent);
        getActivity().runOnUiThread(() -> notifyListeners("updateProgress", data));
    }

    /** installUpdate({ url }): downloads the APK, then opens Android's installer. Rejects with code "permission". */
    @PluginMethod
    public void installUpdate(PluginCall call) {
        String link = call.getString("url");
        if (link == null) {
            call.reject("No download address.");
            return;
        }
        final URL url;
        try {
            url = new URL(link);
        } catch (Exception e) {
            call.reject("Bad download address.");
            return;
        }
        if (!trusted(url)) {
            call.reject("Updates only come from Gaanly's GitHub releases.");
            return;
        }
        Context context = getContext();

        // Android asks once, per app, to allow installing apps from it. Open that screen and let the user come back.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + context.getPackageName()));
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(settings);
            call.reject("Allow installing from Gaanly, then tap Update again.", "permission");
            return;
        }
        if (updating) {
            call.reject("Already downloading.", "busy");
            return;
        }
        updating = true;

        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                File dir = new File(context.getCacheDir(), "update");
                //noinspection ResultOfMethodCallIgnored
                dir.mkdirs();
                File apk = new File(dir, "gaanly-update.apk");
                //noinspection ResultOfMethodCallIgnored
                apk.delete();

                conn = (HttpURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.setRequestProperty("User-Agent", "Gaanly-Updater");
                int code = conn.getResponseCode();
                // GitHub answers with a redirect to its file host: follow it ourselves when HttpURLConnection did not.
                if (code >= 300 && code < 400) {
                    URL next = new URL(url, conn.getHeaderField("Location"));
                    if (!trusted(next)) throw new Exception("Unexpected redirect.");
                    conn.disconnect();
                    conn = (HttpURLConnection) next.openConnection();
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(30000);
                    conn.setRequestProperty("User-Agent", "Gaanly-Updater");
                    code = conn.getResponseCode();
                }
                if (code != 200) throw new Exception("Download failed (" + code + ").");

                long total = conn.getContentLengthLong();
                long done = 0;
                int last = -1;
                try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
                    byte[] buffer = new byte[32 * 1024];
                    int n;
                    while ((n = in.read(buffer)) != -1) {
                        out.write(buffer, 0, n);
                        done += n;
                        if (total > 0) {
                            int percent = (int) (done * 100 / total);
                            if (percent != last) {
                                last = percent;
                                progress(percent);
                            }
                        }
                    }
                }
                if (done < 1024 * 1024) throw new Exception("The download is incomplete.");

                Uri uri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", apk);
                Intent install = new Intent(Intent.ACTION_VIEW);
                install.setDataAndType(uri, "application/vnd.android.package-archive");
                install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(install);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "Update failed.");
            } finally {
                if (conn != null) conn.disconnect();
                updating = false;
            }
        }, "gaanly-update").start();
    }
}
