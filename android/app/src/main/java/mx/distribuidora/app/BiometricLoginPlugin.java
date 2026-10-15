package mx.distribuidora.app;

import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Arrays;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

/** Local quick login. Each encryption/decryption requires a strong Android biometric. */
@CapacitorPlugin(name = "BiometricLogin")
public class BiometricLoginPlugin extends Plugin {
    private static final String KEY_PREFIX = "distribuidora.biometric.";
    private PluginCall pending;
    private BiometricPrompt prompt;
    private String pendingAlias;

    // noBackupFilesDir is private and never included in Android backups/device transfers.
    private AtomicFile credentialFile() {
        return new AtomicFile(new File(getContext().getNoBackupFilesDir(), "biometric-login.json"));
    }

    private KeyStore keyStore() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        return store;
    }

    private JSONObject readRecord() throws Exception {
        try (FileInputStream input = credentialFile().openRead();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[1024];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            return new JSONObject(output.toString("UTF-8"));
        }
    }

    private void writeRecord(JSONObject record) throws Exception {
        AtomicFile file = credentialFile();
        FileOutputStream output = null;
        try {
            output = file.startWrite();
            output.write(record.toString().getBytes(StandardCharsets.UTF_8));
            file.finishWrite(output);
        } catch (Exception error) {
            file.failWrite(output);
            throw error;
        }
    }

    private void deleteKey(String alias) {
        if (alias == null || !alias.startsWith(KEY_PREFIX)) return;
        try { keyStore().deleteEntry(alias); } catch (Exception ignored) { }
    }

    private void clearRecord() {
        try { deleteKey(readRecord().getString("alias")); } catch (Exception ignored) { }
        credentialFile().delete();
    }

    private int availability() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE;
        return BiometricManager.from(getContext()).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
    }

    private Cipher decryptionCipher(JSONObject record) throws Exception {
        SecretKey key = (SecretKey) keyStore().getKey(record.getString("alias"), null);
        if (key == null) throw new IllegalStateException("Missing key");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key,
            new GCMParameterSpec(128, Base64.decode(record.getString("iv"), Base64.NO_WRAP)));
        return cipher;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            boolean enrolled = credentialFile().getBaseFile().exists();
            boolean invalidated = false;
            String account = null;
            if (enrolled) {
                try {
                    JSONObject record = readRecord();
                    decryptionCipher(record);
                    account = record.optString("account", "");
                }
                catch (Exception error) {
                    clearRecord();
                    enrolled = false;
                    invalidated = true;
                }
            }
            int status = availability();
            JSObject result = new JSObject();
            result.put("available", status == BiometricManager.BIOMETRIC_SUCCESS);
            result.put("enrolled", enrolled);
            result.put("invalidated", invalidated);
            result.put("account", account);
            result.put("reason", status == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED
                ? "Configura una huella o un rostro compatible en los ajustes de Android."
                : "El lector biométrico no está disponible. Puedes usar tu contraseña.");
            call.resolve(result);
        });
    }

    private boolean begin(PluginCall call) {
        if (pending != null) {
            call.reject("Ya hay una solicitud biométrica en curso.", "BUSY");
            return false;
        }
        if (availability() != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject("Biometría no disponible.", "UNAVAILABLE");
            return false;
        }
        pending = call;
        return true;
    }

    @PluginMethod
    public void enroll(PluginCall call) {
        final String email = call.getString("email");
        final String password = call.getString("password");
        final String service = call.getString("service");
        // Do not retain the password in the bridge's options object.
        call.getData().remove("password");
        getActivity().runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                call.reject("Se requiere Android 6 o posterior.", "UNAVAILABLE");
                return;
            }
            if (email == null || email.trim().isEmpty() || password == null || password.isEmpty()
                || service == null || service.isEmpty()) {
                call.reject("Faltan credenciales.", "INVALID_INPUT");
                return;
            }
            if (!begin(call)) return;
            try {
                pendingAlias = KEY_PREFIX + UUID.randomUUID();
                KeyGenParameterSpec.Builder spec = new KeyGenParameterSpec.Builder(pendingAlias,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setUserAuthenticationRequired(true);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) spec.setInvalidatedByBiometricEnrollment(true);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    spec.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);
                }
                KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
                generator.init(spec.build());
                SecretKey key = generator.generateKey();
                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.ENCRYPT_MODE, key);
                showPrompt(cipher, true, unlocked -> {
                    byte[] plaintext = new JSONObject().put("email", email).put("password", password)
                        .put("service", service).toString().getBytes(StandardCharsets.UTF_8);
                    byte[] encrypted;
                    try { encrypted = unlocked.doFinal(plaintext); }
                    finally { Arrays.fill(plaintext, (byte) 0); }
                    String oldAlias = null;
                    try { oldAlias = readRecord().getString("alias"); } catch (Exception ignored) { }
                    writeRecord(new JSONObject().put("alias", pendingAlias).put("account", email)
                        .put("iv", Base64.encodeToString(unlocked.getIV(), Base64.NO_WRAP))
                        .put("ciphertext", Base64.encodeToString(encrypted, Base64.NO_WRAP)));
                    pendingAlias = null; // Commit succeeded; preserve this key.
                    deleteKey(oldAlias);
                    succeed(new JSObject());
                });
            } catch (Exception error) { fail("No se pudo activar la biometría.", "FAILED"); }
        });
    }

    @PluginMethod
    public void unlock(PluginCall call) {
        final String service = call.getString("service");
        getActivity().runOnUiThread(() -> {
            if (!begin(call)) return;
            final JSONObject record;
            final Cipher cipher;
            try {
                record = readRecord();
                cipher = decryptionCipher(record);
            } catch (Exception error) {
                clearRecord();
                fail("Activa de nuevo el acceso biométrico.", "INVALIDATED");
                return;
            }
            showPrompt(cipher, false, unlocked -> {
                byte[] plaintext = unlocked.doFinal(Base64.decode(record.getString("ciphertext"), Base64.NO_WRAP));
                JSONObject credentials;
                try { credentials = new JSONObject(new String(plaintext, StandardCharsets.UTF_8)); }
                finally { Arrays.fill(plaintext, (byte) 0); }
                // Credentials belong to one backend; never send them to a different environment.
                if (service == null || !service.equals(credentials.getString("service"))) {
                    fail("Activa la biometría para este servidor.", "SERVICE_CHANGED");
                    return;
                }
                JSObject result = new JSObject();
                result.put("email", credentials.getString("email"));
                result.put("password", credentials.getString("password"));
                succeed(result);
            });
        });
    }

    private interface CryptoAction { void run(Cipher cipher) throws Exception; }

    private void showPrompt(Cipher cipher, boolean enrolling, CryptoAction action) {
        prompt = new BiometricPrompt(getActivity(), ContextCompat.getMainExecutor(getContext()),
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                    if (pending == null) return;
                    try {
                        if (result.getCryptoObject() == null || result.getCryptoObject().getCipher() == null) {
                            throw new IllegalStateException("Missing authenticated cipher");
                        }
                        action.run(result.getCryptoObject().getCipher());
                    } catch (Exception error) {
                        if (!enrolling) clearRecord();
                        fail("Usa tu contraseña para continuar.", enrolling ? "FAILED" : "INVALIDATED");
                    }
                }

                @Override
                public void onAuthenticationError(int code, @NonNull CharSequence message) {
                    String reason = "UNAVAILABLE";
                    if (code == BiometricPrompt.ERROR_USER_CANCELED || code == BiometricPrompt.ERROR_CANCELED
                        || code == BiometricPrompt.ERROR_NEGATIVE_BUTTON) reason = "CANCELLED";
                    else if (code == BiometricPrompt.ERROR_LOCKOUT || code == BiometricPrompt.ERROR_LOCKOUT_PERMANENT) reason = "LOCKED_OUT";
                    fail("No se completó la autenticación biométrica.", reason);
                }
            });
        BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
            .setTitle(enrolling ? "Activar acceso biométrico" : "Entrar a Productos Osuna")
            .setSubtitle("Usa la huella o el rostro registrado en este teléfono")
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .setNegativeButtonText(enrolling ? "Ahora no" : "Usar contraseña")
            .build();
        try { prompt.authenticate(info, new BiometricPrompt.CryptoObject(cipher)); }
        catch (Exception error) { fail("No se pudo abrir el lector biométrico.", "UNAVAILABLE"); }
    }

    private void succeed(JSObject result) {
        PluginCall call = pending;
        pending = null;
        prompt = null;
        if (call != null) call.resolve(result);
    }

    private void fail(String message, String code) {
        deleteKey(pendingAlias);
        pendingAlias = null;
        PluginCall call = pending;
        pending = null;
        prompt = null;
        if (call != null) call.reject(message, code);
    }

    @PluginMethod
    public void clear(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (pending != null) { call.reject("Solicitud en curso.", "BUSY"); return; }
            clearRecord();
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (prompt != null) prompt.cancelAuthentication();
        fail("Solicitud cancelada.", "CANCELLED");
        super.handleOnDestroy();
    }
}
