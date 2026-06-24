# Mermaid Docs Validator

Valida los diagramas Mermaid en la documentación del proyecto.

## Ejecutar validador

```bash
python C:\Users\Thor_\.codex\skills\mermaid-docs-validator\scripts\validate_mermaid_docs.py frontend\docs frontend\src\app\shared\ui\docs
```

Usar `--list` para una inspección rápida que reporta bloques Mermaid sin renderizarlos.

## Directorios de docs

- Docs frontend: `frontend/docs/`
- Docs UI Storybook: `frontend/src/app/shared/ui/docs/`

Si hay docs en `backend/docs/`, añadirlos al comando.

## Notas

- Preferir `flowchart`, `sequenceDiagram` o `stateDiagram-v2`
- Mantener diagramas pequeños, cercanos al texto que explican
- Usar labels legibles e ids de nodo estables
- Entrecomillar labels con puntuación, HTML, acentos o espacios

## Archivos a validar (opcional)

$ARGUMENTS
