# PO Brief — Revisión de transcripción por palabra

## Problema

La usuaria (no técnica, Municipalidad de Subtanjalla) corrige transcripciones de sesiones de consejo de 3–4 h. La UI actual le muestra cada segmento como un `textarea` con la frase completa, y la obliga a **releer el 100%** del texto para encontrar los errores.

El dato real (medido sobre el audio de muestra con `large-v3`): **~95% de las palabras tienen confianza ≥0.80 y son correctas.** Solo ~5% son dudosas — y resultan ser exactamente los **nombres propios, apellidos y términos legales** ("Karla"→"Carla" 0.58, "Medina" 0.64, "Ad"[-hoc] 0.28, "moción" 0.77). Esas son las que hay que arreglar.

## Objetivo

Que la usuaria procese solo el ~5% dudoso, de forma lineal, sin escanear el 95% correcto. Reducir el tiempo de corrección de "releer todo" a "atender las dudas marcadas".

## Estrategia (6 pilares)

1. **Resaltado por palabra.** El transcrito se renderiza como palabras, no como bloque editable. Las dudosas llevan color: ámbar (`0.55 ≤ conf < 0.80`, "dudosa") y rojo (`conf < 0.55`, "muy dudosa"). El ojo va directo a ellas.
2. **Editar la palabra en el sitio.** Click en una palabra dudosa → input inline (no editar el párrafo entero). Arreglar y seguir.
3. **Saltar entre dudas.** Tecla/boton "siguiente duda" que enfoca la próxima palabra dudosa y hace scroll. Contador "N dudas restantes".
4. **Escuchar la palabra.** Cada palabra guarda su `start_ms`/`end_ms`; click en un icono reproduce solo ese tramo, para verificar de oído sin scrubbing.
5. **Progreso por dudas resueltas**, no por segmentos visitados. La barra mide dudas confirmadas/corregidas — el trabajo real.
6. **Confirmar vs corregir.** Una palabra dudosa que la usuaria lee y acepta tal cual → "confirmar" (un click, quita el resaltado). Una equivocada → corregir. Ambas la sacan de la cola de dudas. Da una meta clara de "terminé".

## Estados nombrados (para la galería = homólogo de Storybook)

| Estado | Qué muestra |
|--------|-------------|
| `happy` | Segmentos con mezcla de palabras confirmadas + dudosas (ámbar/rojo) |
| `doubt-focused` | Una palabra dudosa en su estado de edición inline (foco) |
| `empty-no-doubts` | Sesión transcrita con CERO dudas → "nada que revisar", felicitación |
| `loading` | Transcripción en progreso (barra de progreso, % real) |
| `error` | Transcripción falló, con acción de reintento (lenguaje claro, sin stack trace) |
| `all-resolved` | Todas las dudas atendidas → CTA de exportar prominente |

## Restricciones de la arquitectura

- Stack: FastAPI + HTMX + Jinja2. **No** React, **no** Storybook. El homólogo de Storybook es una **galería de estados** servida en `/dev/gallery`, que renderiza cada estado contra datos fixture (sin backend de transcripción corriendo).
- El autoguardado sigue siendo HTMX (`POST` por cambio), como hoy.
- Lenguaje de la UI: español, sin jerga (H2). Errores en lenguaje plano con acción (H9).
