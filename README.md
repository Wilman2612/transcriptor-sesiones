# Transcriptor de Sesiones Municipales

Herramienta asistida por IA para convertir las grabaciones largas de las sesiones de concejo
en una transcripción que se puede **revisar y corregir fácilmente**, y exportar como **acta**
en Word. Está pensada para que una persona **sin conocimientos técnicos** solo tenga que
arreglar lo poco que la IA dudó, en vez de teclear horas de audio.

> Este repositorio no contiene audio real ni nombres reales: todos los datos de ejemplo son
> ficticios (ver [Privacidad](#privacidad)).

---

## Instalación fácil (Windows)

No necesitas saber programar. Solo Windows 10/11 y conexión a internet (solo durante la
instalación). Si tu PC tiene tarjeta gráfica NVIDIA será mucho más rápida, pero no es
obligatorio.

1. **Descarga el proyecto completo.** En la página de GitHub: botón verde **Code → Download ZIP**
   (o descarga el ZIP de la última *release* si la hay).
2. **Descomprime** la carpeta donde quieras (por ejemplo, en *Documentos*).
3. **Doble clic en `INSTALAR.bat`.** Acepta el aviso de Windows (pide permiso de administrador).
   El instalador hace todo solo: instala Python, ffmpeg y las librerías, descarga el modelo de
   IA adecuado a tu PC y crea un acceso directo en el escritorio. La primera vez tarda unos
   minutos.
4. **Para usarlo:** doble clic en **«Transcriptor Municipal»** en el escritorio (o en
   `INICIAR.bat` dentro de la carpeta). Se abre solo en tu navegador.

Si algo falla, el instalador te dice qué pasó en lenguaje claro y cómo seguir.

## Cómo se usa

1. **Sube** la grabación de la sesión (y, si la tienes, la transcripción automática del teléfono
   Samsung con los hablantes).
2. **Espera** a que la IA transcriba (verás una barra de progreso).
3. **Revisa**: el texto se lee como un documento de Word. Las palabras que la IA **dudó** salen
   resaltadas — pasa el cursor para ver el tiempo y la confianza, y corrígelas. Puedes:
   - mover un control para resaltar más o menos palabras según la confianza,
   - ponerle nombre a cada hablante de una sola vez,
   - re-procesar un tramo que salió mal,
   - dejar un **marcador** para continuar la revisión después.
4. **Exporta** el acta final en Word.

---

## Para desarrolladores

El objetivo técnico del proyecto es una **arquitectura hexagonal (puertos y adaptadores)**
limpia. La regla de dependencia es estricta: siempre apunta hacia adentro.

```
app/
  domain/          ← entidades puras, sin frameworks
  application/     ← casos de uso + puertos (interfaces). Nunca importa infrastructure.
  infrastructure/  ← adaptadores concretos (Whisper, audio, persistencia, jobs)
  interfaces/web/  ← FastAPI: API JSON en /api + sirve la SPA de React en /app
web/               ← frontend React + TypeScript, desacoplado por REST + Storybook
```

El backend de Whisper (local `faster-whisper` o la API de OpenAI), el alineador de hablantes y
el motor de sugerencias (planeado) están aislados tras interfaces para poder cambiarlos sin
tocar la lógica de negocio. El frontend habla con el backend **solo** por el contrato REST, y
cada estado de la UI se materializa como una *story* de Storybook contra un adaptador falso —
así la UI se construye y se revisa sin backend.

**Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.0 + SQLite, faster-whisper / OpenAI, worker de
fondo en un solo proceso (sin Redis/Celery) · React 19, TypeScript, Vite, TipTap, Storybook.

### Arranque en desarrollo

Requiere **ffmpeg** en el sistema.

```bash
# Backend
pip install -e .
python run.py            # migra + sirve en http://localhost:8000 (abre /app)

# Frontend (otra terminal) — solo si vas a tocar la UI
cd web
npm install
npm run dev              # dev server de Vite con recarga en caliente
npm run storybook        # galería de componentes en :6006
npm run build            # regenera el build estático (web/dist)
```

> **Nota:** el build estático de React (`web/dist`) **se versiona en el repo** a propósito, para
> que el usuario final no necesite Node. Si cambias la UI, recompila con `npm run build` y
> commitea `web/dist`. FastAPI lo sirve en `/app`.

---

## Privacidad

La herramienta procesa **datos personales** (voces y nombres en sesiones de concejo). El repo
está hecho para que nada de eso se filtre:

- El audio real y la transcripción del teléfono viven en `sample/` y `data/`, ambos **ignorados
  por git**.
- El listado real de consejeros vive **solo en la base de datos local**, nunca en el código.
- Todos los *fixtures*, *stories* y documentos usan un roster **ficticio**.

## Estado

Fases 0–5 implementadas (estructura → audio → transcripción → hablantes → revisión → exportar).
La **fase 6 — sugerencias automáticas** (aprender de las correcciones del historial) está
diseñada pero aún no construida.

## Licencia

MIT — ver [LICENSE](LICENSE).
