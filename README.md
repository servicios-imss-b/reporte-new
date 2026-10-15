# Reporte de situación hospitalaria

El reporte muestra gráficas y resúmenes agregados de las respuestas de la encuesta.
El JSON incluye resultados agrupados por CLUES, hospital y entidad, además de los
conteos por pregunta. No contiene las filas originales de la encuesta; sin embargo,
algunas unidades pueden tener una sola respuesta, por lo que sus resultados son
atribuibles a esa unidad. Confirma que esté autorizado publicar este nivel de detalle.

## Actualizar los datos agregados

Coloca el archivo `resultados_encuesta_imss_bienestar (1).xlsx` en `base/` y ejecuta:

```sh
npm run data:build
```

El generador lee la hoja `Respuestas` y escribe `public/reporte-data.json` con
conteos por pregunta, calificación, formación, entidad y CLUES. El selector de
unidades desglosa las gráficas; la pestaña Bases permite consultar y exportar
los agregados por CLUES. El sitio local y la compilación de GitHub Pages usan
ese JSON. No publiques el libro Excel original.

La pestaña Respuestas por pregunta incluye un diagrama de selección Estado →
CLUES → Pregunta y una vista de todas las preguntas. Las unidades disponibles
se filtran por el estado seleccionado. Sus subpestañas permiten consultar
el explorador (dona y barras) o los gráficos de donas con total central y leyenda,
para una pregunta o todas. El tablero conserva solo Calificación general por
entidad. Las tablas de preguntas por unidad muestran únicamente las respuestas,
sin prefijos de conteo ni porcentajes. En las tablas de calificación,
Distribución (%) muestra porcentajes verde/amarillo/rojo en el orden
Buena/Regular/Mala, también en la exportación (sin formato de color en Excel).

Los indicadores generales aparecen sobre la navegación y se mantienen en todas
las vistas. Tablero contiene Calificación general y Gráficos de preguntas;
Resumen usa los mismos filtros Estado/CLUES/Pregunta y muestra tarjetas de
frecuencias sin gráficas. Escoger Pregunta incluye Todas las preguntas.