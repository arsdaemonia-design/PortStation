# PortStation

Launcher y gestor local de preservación de descompilaciones y ports nativos. La arquitectura contempla Windows, Linux / Steam Deck, Android y macOS; el paquete portable disponible actualmente es **Windows x64**. Los demás targets necesitan builds y pruebas nativas antes de considerarse distribuidos.

## Características principales

- **Catálogo curado de proyectos comunitarios:** Catálogo sincronizable remotamente con ports, recompilaciones estáticas y descompilaciones nativas.
- **Escáner Heurístico Inteligente:** Detección automática de ejecutables, firmas y carpetas de ports.
- **Sincronización Dinámica de Catálogo:** Actualizaciones del catálogo de juegos (`ports_db.json`) directamente desde GitHub sin requerir una nueva instalación de la app.
- **Actualización asistida de PortStation en Windows:** Descarga el ejecutable desde la release, comprueba su SHA-256 y usa un auxiliar para cerrar, reemplazar y volver a abrir la app.
- **Hash SHA-256 y consulta VirusTotal:** Calcula hashes locales y permite consultar la reputación de VirusTotal. Esto no verifica firma digital ni garantiza que un binario sea seguro.
- **Personalización de Arte y Metadatos:** Carátulas, artes de disco/cartucho y notas técnicas.
- **Navegación Total con Gamepad:** Soporte integrado para mandos Xbox, PlayStation y mandos genéricos.

## Estructura del Proyecto

- `src/`: Interfaz moderna construida con React 18, TypeScript, Vite y Lucide Icons.
- `src-tauri/`: Backend nativo en Rust con SQLite, motor heurístico de escaneo y sincronización con GitHub.
- `src-tauri/ports_db.json`: Catálogo curado de ports comunitarios.

### Actualizar PortStation en Windows

1. Abre **Configuración → Actualización de PortStation** y pulsa **Actualizar y reiniciar**.
2. Confirma la operación. PortStation descarga el ejecutable de la release y compara su SHA-256 con el digest publicado por GitHub.
3. La app se cierra. Un auxiliar espera a que el proceso termine, conserva la copia anterior como `PortStation.exe.previous`, instala la nueva y vuelve a abrir PortStation.

La carpeta de PortStation debe permitir escritura. Si está en una ubicación protegida o la release no publica un digest verificable, usa el ZIP manual: cierra PortStation, extrae el paquete y reemplaza `PortStation.exe` en la carpeta original. No abras la copia directamente desde Descargas, porque eso deja la versión anterior intacta.

En Linux y macOS, esta release publica un archivo `.tar.gz`: descarga el paquete de tu sistema, cierra PortStation, extrae el ejecutable y reemplaza la copia existente. En Android se descarga el `.apk` y se instala desde el sistema; Android solicitará confirmar la instalación. El botón asistido de reemplazo se limita a Windows en esta versión. El workflow actual distribuye Linux/macOS como ejecutables portables, no como paquetes administrados por una tienda.

Las versiones anteriores no reciben notificaciones push cuando PortStation está cerrada. Las versiones que ya incluyen el chequeo de actualizaciones consultan GitHub al abrirse y muestran la actualización disponible; para instalar el auxiliar hace falta actualizar manualmente a una release que lo incluya una vez.

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
