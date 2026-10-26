# PortStation

Launcher y gestor de preservación de descompilaciones y ports nativos para PC (Windows, Linux / Steam Deck, Android y macOS).

## Características principales

- **Catálogo de Ports Oficiales:** Catálogo sincronizable remotamente con decenas de ports, recompilaciones estáticas y descompilaciones nativas de la comunidad.
- **Escáner Heurístico Inteligente:** Detección automática de ejecutables, firmas y carpetas de ports.
- **Sincronización Dinámica de Catálogo:** Actualizaciones del catálogo de juegos (`ports_db.json`) directamente desde GitHub sin requerir una nueva instalación de la app.
- **Detección de Actualizaciones Multiplataforma:** Escaneo automático de nuevas releases del launcher en GitHub con binarios optimizados para Windows (`.exe`), Linux / Steam Deck (`.AppImage`), Android (`.apk`) y macOS (`.dmg`).
- **Auditoría de Seguridad con VirusTotal:** Hash SHA-256 y consulta de reputación antivirus en tiempo real.
- **Personalización de Arte y Metadatos:** Carátulas, artes de disco/cartucho y notas técnicas.
- **Navegación Total con Gamepad:** Soporte integrado para mandos Xbox, PlayStation y mandos genéricos.

## Estructura del Proyecto

- `src/`: Interfaz moderna construida con React 18, TypeScript, Vite y Lucide Icons.
- `src-tauri/`: Backend nativo en Rust con SQLite, motor heurístico de escaneo y sincronización con GitHub.
- `src-tauri/ports_db.json`: Catálogo curado de ports comunitarios.

## Desarrollo

### Requisitos
- Node.js 18+
- Rust (Cargo) y herramientas de compilación de C++ (MSVC / Build Tools)

### Comandos
```bash
npm install
npm run dev          # Desarrollo frontend
npm run tauri dev    # Ejecutar en entorno de escritorio Tauri
npm run build        # Compilar frontend
cargo test --manifest-path src-tauri/Cargo.toml --lib # Pruebas unitarias
```
