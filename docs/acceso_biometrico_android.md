# Acceso biométrico en la aplicación Android

La función aparece únicamente en la aplicación Android de Capacitor. Está disponible para cualquier perfil que pueda iniciar sesión, en Android 6 o posterior con una biometría de clase fuerte configurada (huella o rostro compatible). En equipos sin lector compatible sigue disponible la contraseña.

## Uso

1. Escribir correo y contraseña en el login.
2. Marcar **Activar acceso con huella o rostro** y pulsar **Entrar**.
3. Confirmar la huella o el rostro en la ventana de Android. Si se cancela, se entra normalmente con la contraseña sin modificar la activación anterior.
4. Después de cerrar sesión o reiniciar la aplicación, pulsar **Entrar con huella o rostro**. El login muestra el correo de la cuenta activada.

Solo se guarda una cuenta por instalación. Para cambiarla, entrar con la contraseña de la nueva cuenta y marcar **Actualizar cuenta para acceso biométrico**. Para quitarla, usar **Desactivar acceso biométrico** en el login. Cerrar sesión conserva la activación; desactivarla elimina la credencial y su llave.

Activar únicamente en teléfonos personales: cualquier biometría registrada en ese teléfono puede autorizar el acceso a la cuenta guardada. Android administra las huellas y rostros; la aplicación y el servidor no reciben esos datos. Algunas funciones de reconocimiento facial de Android no tienen la clase de seguridad requerida y no se podrán usar.

Se necesita internet en cada inicio: la aplicación vuelve a validar las credenciales con `/auth/login`. Cambiar la contraseña o desactivar la cuenta impide nuevos accesos con las credenciales anteriores. Después de un rechazo del servidor se elimina la activación local y se solicita entrar con contraseña. Un fallo de conexión conserva la activación para reintentar.

## Implementación

- Plugin local `BiometricLoginPlugin.java`, registrado en `MainActivity`. Usa AndroidX Biometric 1.1.0, `BIOMETRIC_STRONG` y `CryptoObject`.
- Acceso rápido mediante credenciales cifradas, no mediante passkeys. El correo y la contraseña se cifran con AES-GCM y una llave de Android Keystore que requiere biometría en **cada operación**. La contraseña pasa temporalmente por el proceso de la app para llamar al login existente; no se guarda en localStorage ni en archivos sin cifrar.
- El archivo cifrado se guarda en `noBackupFilesDir`, fuera de copias de seguridad y transferencias. El correo de la cuenta aparece como metadato local para identificarla antes de entrar. La llave no es exportable. Cambios en la biometría o la seguridad del teléfono invalidan la llave y requieren activación de nuevo.
- Cada credencial se vincula a la URL del backend que la registró. Cambiar de servidor requiere activar otra vez.
- Una activación cancelada conserva la cuenta anterior. Solo después de cifrar y guardar correctamente se sustituye la llave anterior.
- En Android, el JWT y la sesión viven en memoria. Reiniciar el proceso o recargar la app requiere entrar nuevamente. Cambiar momentáneamente a otra app no bloquea la sesión. La web conserva su persistencia habitual.
- Se desactivaron los logs automáticos del puente Capacitor (`loggingBehavior: none`) para no registrar credenciales en los mensajes del puente.
- No requiere migraciones ni cambios del backend. Actualizar el frontend web por sí solo no instala este plugin: se necesita una nueva APK.

## Compilar y verificar

Desde `frontend`: `npm test`, `npm run build` y `npx cap sync android`. Desde `frontend/android`, con JDK 17 y el SDK configurados: `./gradlew.bat assembleDebug lintDebug`.

La APK de depuración se genera en `android/app/build/outputs/apk/debug/app-debug.apk`. Para distribuir una actualización se debe generar una APK de release con la misma firma que la aplicación instalada.

Comprobar en Android: activación y acceso correctos; cancelación y huella incorrecta; cierre de sesión y reinicio del proceso; cambio de cuenta; quitar activación; falta de internet sin perder la activación; cambio de contraseña o cuenta desactivada; invalidación al registrar otra huella; funcionamiento normal en un equipo sin biometría. La web no debe mostrar controles biométricos.

Validación realizada el 14 de octubre de 2026: 17 pruebas de Node aprobadas, compilación Vite, sincronización Capacitor, `assembleDebug` y `lintDebug` correctos. Se verificó la interfaz con respuestas y puente biométrico simulados: acceso web habitual, activación después de contraseña válida, rechazo de contraseña sin activar, cancelación, acceso biométrico, reinicio sin JWT persistido, falta de red, rechazo 401 y desactivación confirmada/cancelada. No se realizaron operaciones contra cuentas reales. Falta probar el diálogo y el cifrado con un lector Android real; el emulador local no arrancó por una imagen de sistema incompleta.

Referencias: [autenticación biométrica de Android](https://developer.android.com/identity/sign-in/biometric-auth), [plugins locales de Capacitor 6](https://capacitorjs.com/docs/v6/android/custom-code).
