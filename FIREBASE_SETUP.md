# 🔥 Configuración Firebase — Horión

Pasos manuales que tenés que hacer en la **Firebase Console** *una sola vez*
para que la app funcione end-to-end.

---

## 1. Activar Authentication

1. Andá a [Firebase Console](https://console.firebase.google.com/) → proyecto **app-horion**.
2. Sidebar → **Build → Authentication** → **Get started**.
3. Pestaña **Sign-in method** → habilitar:
   - **Email/Password** (toggle ON, sin link de email — basta password)
   - **Google** (toggle ON, elegí email de soporte)
4. **NO** habilites Apple — requiere Apple Developer Program ($99/año).

---

## 2. Activar Firestore

1. Sidebar → **Build → Firestore Database** → **Create database**.
2. **Production mode** (no Test mode).
3. Region: **eur3 (Europe)** o **nam5 (US)** según prefieras (Dayana en
   Europa → recomendado `eur3`).
4. Una vez creada, pestaña **Rules** → pegá el contenido de `firestore.rules`
   y dale **Publish**.

> Las rules garantizan que cada usuario solo accede a su propio namespace
> `users/{uid}/...` — nadie puede leer datos de otra persona aunque tenga el
> proyecto ID.

---

## 3. Storage — POR AHORA NO

Como Storage requiere plan **Blaze** (con tarjeta), saltamos este paso.
Las fotos del portafolio quedan en **IndexedDB local** del navegador.

Cuando se decida pasar a Blaze:
1. Habilitar Storage en la console.
2. Pegar las reglas de Storage similares (ver más abajo).
3. Editar `src/data/repositories/portfolio.ts` para subir blobs a Storage en
   vez de a IndexedDB. Estimado: 30 minutos de trabajo.

```js
// Reglas de Storage para cuando se active Blaze:
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## 4. Variables de entorno (.env.local)

Ya está configurado en `app/.env.local` con las credenciales del proyecto
**app-horion**. Si rotás el proyecto Firebase, actualizá ese archivo.

⚠️ El archivo `.env.local` está en `.gitignore` — NO se commitea.

⚠️ El API key de Firebase es **público por diseño** (identifica el proyecto,
no autentica acceso). El control real lo dan las rules. Aún así, mantenelo
fuera del repo por buena práctica.

---

## 5. Deploy a Vercel

1. `npm install -g vercel`
2. Desde la carpeta `app/`: `vercel`
3. Cuando pregunte por las env vars, pegá las mismas que están en `.env.local`:
   - `VITE_FB_API_KEY`
   - `VITE_FB_AUTH_DOMAIN`
   - `VITE_FB_PROJECT_ID`
   - `VITE_FB_STORAGE_BUCKET`
   - `VITE_FB_MESSAGING_SENDER_ID`
   - `VITE_FB_APP_ID`
4. **Importante**: en Firebase Console → Authentication → Settings →
   **Authorized domains** → agregá tu dominio de Vercel
   (`horion-XXX.vercel.app` y/o el custom).

---

## 6. Costos esperados (plan Spark gratis)

Con una sola usuaria activa (Dayana), el consumo estimado es:

| Recurso         | Free tier        | Uso esperado | Ratio       |
|-----------------|------------------|--------------|-------------|
| Firestore reads | 50,000/día       | ~150/día     | 0.3%        |
| Firestore writes| 20,000/día       | ~60/día      | 0.3%        |
| Storage         | 1 GB             | 0 GB         | 0%          |
| Auth            | Sin límite       | 1 user       | n/a         |

→ **Cero costo** prácticamente garantizado.

Estrategias activas para bajar consumo:
- `persistentLocalCache` → la mayoría de lecturas vienen del caché.
- `increment()` en lugar de read-then-write → no consume reads para
  modificar saldos / stock / etc.
- `onSnapshot` solo en pantallas que realmente necesitan reactividad.
- `getDocs` (one-shot) en operaciones puntuales.
- Sin Cloud Functions = sin invocaciones extra.

---

## 7. Cuándo pasar a Blaze

Solo cuando la clienta confirme que quiere **fotos del portafolio
sincronizadas entre sus 3 dispositivos** (iPhone + iPad + Computador).
Mientras tanto, las fotos se ven solo en el dispositivo donde se subieron.

Blaze NO cobra mientras estés bajo los límites Spark — agrega capacidad
de pago-por-uso si te pasás. Para una persona, prácticamente nunca pasás
los límites.
