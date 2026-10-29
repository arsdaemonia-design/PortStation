# PortStation

Launcher y gestor local de preservación de descompilaciones y ports nativos. La arquitectura contempla Windows, Linux / Steam Deck, Android y macOS; el paquete portable disponible actualmente es **Windows x64**. Los demás targets necesitan builds y pruebas nativas antes de considerarse distribuidos.

## Características principales

- **Catálogo curado de proyectos comunitarios:** Catálogo sincronizable remotamente con ports, recompilaciones estáticas y descompilaciones nativas.
- **Escáner Heurístico Inteligente:** Detección automática de ejecutables, firmas y carpetas de ports.
- **Sincronización Dinámica de Catálogo:** Actualizaciones del catálogo de juegos (`ports_db.json`) directamente desde GitHub sin requerir una nueva instalación de la app.
- **Detección de Actualizaciones del Launcher:** Consulta releases de GitHub, clasifica assets por OS/arquitectura y abre la descarga seleccionada. No instala ni reemplaza la app automáticamente.
- **Hash SHA-256 y consulta VirusTotal:** Calcula hashes locales y permite consultar la reputación de VirusTotal. Esto no verifica firma digital ni garantiza que un binario sea seguro.
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
