// Cierre Cignetti — app de escritorio para el seguimiento del cierre económico del Grupo.
//
//  1. La app abre en su propia ventana la versión web de "Seguimiento de Cierre Económico"
//     (publicada en claude.ai). Los datos viven en la nube: todos los que ingresan ven y
//     cargan lo mismo. La sesión de claude.ai queda guardada en la app (no hay que
//     volver a ingresar cada vez).
//  2. Las mejoras de la pantalla (cálculos, vistas, carga) se publican en la versión web y
//     aparecen solas al abrir la app, con el cartel de «Novedades».
//  3. La app en sí (ventana, menú, instalador) se actualiza igual que las apps LBO: al abrir
//     revisa la carpeta OneDrive\Documentos\Cierre Cignetti\Actualizaciones, muestra las
//     notas de la versión nueva y se actualiza con un clic (con vuelta atrás).

const { app, BrowserWindow, session, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Actualizador, compararVersion } = require('./nucleo/actualizador');

const NOMBRE = 'Cierre Cignetti';
const URL_POR_DEFECTO = 'https://claude.ai/artifact/34wyM7QgktBthdLSwg8oGi';
const PARTICION = 'persist:cierre-cignetti';           // sesión guardada en disco
// Sitios que se pueden abrir dentro de la app (la app y el ingreso a claude.ai).
const DENTRO_DE_LA_APP = /^https:\/\/([a-z0-9-]+\.)*(claude\.ai|claude\.com|anthropic\.com|google\.com|googleusercontent\.com|gstatic\.com|apple\.com|microsoftonline\.com|live\.com)(\/|$|\?|#)/i;

let win = null;
let yaRevisado = false;

// ── Ajustes ────────────────────────────────────────────────────────────────
const rutaAjustes = () => path.join(app.getPath('userData'), 'ajustes.json');
function leerAjustes() { try { return JSON.parse(fs.readFileSync(rutaAjustes(), 'utf8')); } catch (_) { return {}; } }
function guardarAjustes(a) { fs.mkdirSync(path.dirname(rutaAjustes()), { recursive: true }); fs.writeFileSync(rutaAjustes(), JSON.stringify(a, null, 2)); }
const urlApp = () => leerAjustes().url || URL_POR_DEFECTO;

function carpetaActualizaciones() {
  const a = leerAjustes();
  if (a.carpetaActualizaciones) return a.carpetaActualizaciones;
  const onedrive = process.env.OneDrive || path.join(os.homedir(), 'OneDrive');
  return path.join(onedrive, 'Documentos', NOMBRE, 'Actualizaciones');
}
const actualizador = () => new Actualizador({
  carpeta: carpetaActualizaciones(), appDir: app.getAppPath(), respaldoDir: path.join(app.getPath('userData'), 'version-anterior'),
  versionActual: app.getVersion(), electronActual: process.versions.electron,
});

// ── Novedades de la app instalada ───────────────────────────────────────────
function leerNovedades() { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'novedades.json'), 'utf8')).versiones || []; } catch (_) { return []; } }
const textoNotas = (lista) => lista.map(n => `Versión ${n.v}${n.f ? ' (' + n.f + ')' : ''}\n` + n.items.map(i => '  • ' + i).join('\n')).join('\n\n');

async function mostrarNovedades(todas) {
  const a = leerAjustes();
  const vista = a.versionVista;
  // Primera vez que se abre: no se repite el cartel (la pantalla del cierre ya muestra sus novedades).
  if (!vista && !todas) { guardarAjustes({ ...a, versionVista: app.getVersion() }); return; }
  const lista = leerNovedades().filter(n => todas || !vista || compararVersion(n.v, vista) > 0);
  if (lista.length && win) {
    await dialog.showMessageBox(win, { type: 'info', title: NOMBRE, buttons: ['Entendido'], message: `Novedades de ${NOMBRE} ${app.getVersion()}`, detail: textoNotas(lista) });
  }
  if (vista !== app.getVersion()) guardarAjustes({ ...leerAjustes(), versionVista: app.getVersion() });
}

// ── Actualizaciones (mismo esquema que las apps LBO) ───────────────────────
async function revisarActualizacion(manual) {
  let r;
  try { r = actualizador().buscar(); } catch (e) { r = { estado: 'error', mensaje: e.message }; }
  if (r.estado === 'disponible') {
    if (r.requiereInstalador) {
      const b = await dialog.showMessageBox(win, { type: 'info', title: NOMBRE, buttons: ['Abrir la carpeta', 'Más tarde'], defaultId: 0, cancelId: 1,
        message: `Hay una versión nueva de ${NOMBRE} (${r.versionNueva}) que necesita el instalador nuevo.`,
        detail: `Cerrá la app y ejecutá «Instalar ${NOMBRE}.exe» de la carpeta OneDrive\\Documentos\\${NOMBRE}. Tus datos no se tocan.\n\n` + (r.notas || []).map(n => '• ' + n).join('\n') });
      if (b.response === 0) shell.openPath(path.dirname(carpetaActualizaciones()));
      return;
    }
    const b = await dialog.showMessageBox(win, { type: 'info', title: NOMBRE, buttons: ['Actualizar ahora', 'Más tarde'], defaultId: 0, cancelId: 1,
      message: `Hay una versión nueva de ${NOMBRE}: ${r.versionNueva} (tenés la ${r.versionActual}).`,
      detail: (r.notas && r.notas.length ? 'Novedades:\n' + r.notas.map(n => '• ' + n).join('\n') + '\n\n' : '') + 'La actualización tarda unos segundos y la app se reinicia sola.' });
    if (b.response !== 0) return;
    if (!app.isPackaged) { dialog.showMessageBox(win, { type: 'info', message: 'Modo desarrollo: no se aplican actualizaciones.' }); return; }
    try {
      const res = actualizador().aplicar();
      await dialog.showMessageBox(win, { type: 'info', title: NOMBRE, buttons: ['Reiniciar ahora'], message: `${NOMBRE} se actualizó a la versión ${res.version}.`, detail: 'La app se va a reiniciar para usar la versión nueva.' });
      app.relaunch(); app.exit(0);
    } catch (e) {
      dialog.showMessageBox(win, { type: 'error', title: NOMBRE, message: 'No se pudo actualizar.', detail: e.message || String(e) });
    }
    return;
  }
  if (!manual) return;   // al abrir, si no hay nada nuevo no se molesta
  const msg = r.estado === 'al-dia' ? `Tenés la última versión (${app.getVersion()}).` : (r.mensaje || 'No se pudo revisar.');
  dialog.showMessageBox(win, { type: r.estado === 'al-dia' ? 'info' : 'warning', title: NOMBRE, message: msg, detail: `Carpeta de actualizaciones:\n${carpetaActualizaciones()}` });
}

async function revertir() {
  if (!app.isPackaged) return;
  const r0 = await dialog.showMessageBox(win, { type: 'question', buttons: ['Cancelar', 'Volver a la versión anterior'], defaultId: 0, cancelId: 0, message: `¿Volver a la versión anterior de ${NOMBRE}?`, detail: 'Los datos del cierre no se tocan: viven en la nube.' });
  if (r0.response !== 1) return;
  try { actualizador().revertir(); app.relaunch(); app.exit(0); }
  catch (e) { dialog.showMessageBox(win, { type: 'error', message: e.message || String(e) }); }
}

async function elegirCarpeta() {
  const r = await dialog.showOpenDialog(win, { title: `Carpeta de actualizaciones de ${NOMBRE}`, defaultPath: carpetaActualizaciones(), properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return;
  guardarAjustes({ ...leerAjustes(), carpetaActualizaciones: r.filePaths[0] });
  revisarActualizacion(true);
}

// ── Menú ───────────────────────────────────────────────────────────────────
function armarMenu() {
  const plantilla = [
    { label: NOMBRE, submenu: [
      { label: 'Ir al inicio', accelerator: 'Ctrl+H', click: () => win && win.loadURL(urlApp()) },
      { label: 'Recargar', accelerator: 'Ctrl+R', click: () => win && win.webContents.reload() },
      { type: 'separator' },
      { label: 'Salir', accelerator: 'Ctrl+Q', click: () => app.quit() },
    ] },
    { label: 'Ver', submenu: [
      { role: 'zoomIn', label: 'Acercar' }, { role: 'zoomOut', label: 'Alejar' }, { role: 'resetZoom', label: 'Tamaño normal' },
      { type: 'separator' }, { role: 'togglefullscreen', label: 'Pantalla completa' },
    ] },
    { label: 'Actualizaciones', submenu: [
      { label: 'Buscar actualizaciones', click: () => revisarActualizacion(true) },
      { label: 'Novedades de la app', click: () => mostrarNovedades(true) },
      { type: 'separator' },
      { label: 'Volver a la versión anterior', click: revertir },
      { label: 'Cambiar carpeta de actualizaciones…', click: elegirCarpeta },
      { type: 'separator' },
      { label: `Versión ${app.getVersion()}`, enabled: false },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(plantilla));
}

// ── Ventana ────────────────────────────────────────────────────────────────
function crearVentana() {
  const ses = session.fromPartition(PARTICION);
  // Navegador estándar: sin la marca "Electron" para que el ingreso a claude.ai funcione igual que en Chrome.
  ses.setUserAgent(ses.getUserAgent().replace(/\s(Electron|cierre-cignetti)\/\S+/gi, ''));

  win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 900, minHeight: 600, title: NOMBRE, backgroundColor: '#1c2230', show: false,
    icon: path.join(__dirname, 'icono.ico'),
    webPreferences: { partition: PARTICION, contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });

  // Links: claude.ai y el ingreso quedan dentro de la app; el resto se abre en el navegador.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (DENTRO_DE_LA_APP.test(url)) return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, icon: path.join(__dirname, 'icono.ico') } };
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (DENTRO_DE_LA_APP.test(url) || url.startsWith('file:')) return;
    e.preventDefault();
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });
  win.on('page-title-updated', (e) => { e.preventDefault(); win.setTitle(NOMBRE); });

  // Sin conexión: pantalla propia con «Reintentar».
  win.webContents.on('did-fail-load', (_e, codigo, _desc, url, esPrincipal) => {
    if (!esPrincipal || codigo === -3) return;
    win.loadFile(path.join(__dirname, 'interfaz', 'sin-conexion.html'), { query: { url: urlApp() } });
  });

  // Al abrir: novedades de la versión instalada y búsqueda de actualizaciones.
  win.webContents.on('did-finish-load', async () => {
    if (yaRevisado) return;
    yaRevisado = true;
    await mostrarNovedades(false);
    await revisarActualizacion(false);
  });

  win.loadURL(urlApp());
  win.on('closed', () => { win = null; });
}

if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => { armarMenu(); crearVentana(); });
  app.on('window-all-closed', () => app.quit());
}
