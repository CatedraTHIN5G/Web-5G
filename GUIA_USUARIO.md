# Guía de Gestión de Contenido - Cátedra THIN5G

Esta guía es un "paso a paso" para gestionar la web. Sigue las instrucciones para añadir personas, proyectos y traducir nuevos elementos.

---

## 📂 1. Dónde está cada cosa

*   **Personas:** `src/content/team/`
*   **Proyectos:** `src/content/projects/`
*   **Eventos:** `src/content/events/`
*   **Imágenes:** `src/assets/`
*   **Traducciones (Textos fijos):** `src/i18n/ui.ts`

---

## 👥 2. Añadir una Persona (Team)

### Paso A: Crear el archivo
1.  Ve a `src/content/team/`.
2.  Copia un archivo existente o crea uno nuevo (ej. `nombre-apellido.md`).
3.  Pega y rellena esto:

```markdown
---
name: "Nombre Apellido"
role: "PhD Student"     # <--- Debe ser uno de la lista de "Roles Existentes" (ver abajo)
title: ["Ingeniero"]    # <--- Etiquetas extra (Opcional)
status: "active"        # "active" (actual) o "alumni" (antiguo alumno)
avatar: "../../assets/tu-foto.jpg"
email: "correo@uniovi.es"
linkedin: "https://linkedin.com/..."
weight: 10              # Cuanto más bajo, más arriba aparece en la lista
---
```

### Paso B: Qué poner en "role" (Roles Existentes)
Si usas estos nombres exactos (en inglés), la traducción **ya funciona sola**:

*   `Principal Investigator` (Investigador Principal)
*   `Professor` (Catedrático)
*   `Associate Professor` (Profesor Titular)
*   `Assistant Professor` (Profesor Ayudante)
*   `Postdoc` (Investigador Posdoctoral)
*   `PhD Student` (Estudiante de Doctorado)
*   `Research Assistant` (Ayudante de Investigación)
*   `Master Student` (Alumno de Máster)
*   `Undergraduate` (Alumno de Grado)

---

## 🚀 3. Añadir un Proyecto (Projects)

### Paso Único: Crear el archivo
1.  Ve a `src/content/projects/`.
2.  Crea un archivo `.md`.
3.  **Truco para traducir etiquetas:** Usa `tags` para inglés y `tags_es` para español. Deben ir en el mismo orden.

```markdown
---
title: "Nombre en Inglés"
title_es: "Nombre en Español"      # <--- Opcional, si quieres título traducido
description: "Descripción corta en Inglés"
summary: "Resumen muy breve"
coverImage: "../../assets/proyecto.jpg"
date: 2024-01-01
tags: ["AI", "5G", "Robotics"]     # <--- Etiquetas en Inglés
tags_es: ["IA", "5G", "Robótica"]  # <--- Etiquetas en Español (Mismo orden)
status: "ongoing"
team: ["ignacio-rodriguez", "rafael-gonzalez"] # IDs de los miembros (nombre de su archivo)
---

Aquí escribes el contenido largo del proyecto en Inglés (o Español si prefieres solo uno).
```

---

## 📅 4. Añadir un Evento

1.  Ve a `src/content/events/`.
2.  Crea un archivo `.md`.

```markdown
---
title: "Título del Evento"
description: "Breve resumen"
date: 2024-05-20
image: "../../assets/evento.jpg"
location: "Gijón"
type: "conference"
---
Texto largo del evento...
```

---

## 🛠️ 5. AVANZADO: Crear NUEVOS Roles o Etiquetas Traducibles

Si necesitas un rol nuevo que no existe (ej. "Laboratory Manager") y quieres que se traduzca ("Jefe de Laboratorio"), tienes que tocar **3 archivos**. Es fácil, es solo copiar y pegar.

### Paso 1: Añadir las traducciones (`src/i18n/ui.ts`)
Abre `src/i18n/ui.ts` y busca la lista de `role.`.

1.  En la parte de **English (`en`)**, añade:
    ```typescript
    'role.labmanager': 'Laboratory Manager',
    ```
2.  En la parte de **Español (`es`)**, añade:
    ```typescript
    'role.labmanager': 'Jefe de Laboratorio',
    ```

### Paso 2: Conectar el nombre (`src/components/TeamCard.astro`)
Abre este archivo y busca `const roleToKey`. Añade tu nuevo rol al final de la lista:

```javascript
const roleToKey: Record<string, string> = {
  // ... los que ya hay ...
  "Laboratory Manager": "role.labmanager", // <--- AÑADE ESTO (Izquierda: Lo que pones en el MD. Derecha: La clave del paso 1)
};
```

### Paso 3: Conectar en la página de detalle (`src/pages/team/[...slug].astro`)
Haz exactamente lo mismo que en el Paso 2 (busca `const roleToKey` y pégalo).

¡Listo! Ahora si pones `role: "Laboratory Manager"` en el markdown, saldrá traducido.

---

## ⚠️ Resumen de Errores Comunes

1.  **Imágenes rotas:** Asegúrate de que la ruta empieza por `../../assets/` y el archivo existe. Usa nombres sin espacios (`foto-perfil.jpg` ✅, `Foto Perfil.jpg` ❌).
2.  **No se traduce el rol:** Revisa que hayas escrito el rol en inglés EXACTAMENTE igual que en la lista de "Roles Existentes" (mayúsculas importan).
3.  **Etiquetas de proyectos:** Si añades 3 etiquetas en inglés (`tags`), debes poner 3 en español (`tags_es`) en el mismo orden, o la web se liará al traducir.
