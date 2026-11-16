// Actualizaciones por paquete, igual que las apps LBO.
//
// En la carpeta de actualizaciones (por defecto OneDrive\Documentos\Cierre Cignetti\Actualizaciones):
//   ultima.json   { version, carpeta, electron, notas: [..], archivos: { "ruta/relativa": "sha256" } }
//   <carpeta>/    los archivos de la app (lo que va en resources\app)
//
// Aplicar = verificar cada archivo contra su sha256, respaldar la versión actual,
// copiar los archivos nuevos sobre resources\app y reiniciar. Si algo falla en la
// copia, se restaura el respaldo. "Volver a la versión anterior" restaura el último respaldo.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function compararVersion(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return Math.sign(d); }
  return 0;
}

const sha256 = (archivo) => crypto.createHash('sha256').update(fs.readFileSync(archivo)).digest('hex');

function listar(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listar(p, base)); else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

// Escribe el CONTENIDO (no copia atributos como "solo lectura"), le saca el solo lectura
// al archivo viejo si lo tenía, y reintenta si Windows / OneDrive / el antivirus lo tienen tomado.
const esperar = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function escribirArchivo(origen, destino) {
  const contenido = fs.readFileSync(origen);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  let ultimo;
  for (let intento = 0; intento < 5; intento++) {
    try {
      if (fs.existsSync(destino)) { try { fs.chmodSync(destino, 0o666); } catch (_) {} }
      fs.writeFileSync(destino, contenido);
      try { fs.chmodSync(destino, 0o666); } catch (_) {}
      return;
    } catch (e) {
      ultimo = e;
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      // Último recurso: borrar el archivo bloqueado y volver a escribirlo.
      if (intento === 2) { try { fs.chmodSync(destino, 0o666); fs.unlinkSync(destino); } catch (_) {} }
      esperar(400 * (intento + 1));
    }
  }
  throw ultimo;
}

function copiarArbol(origen, destino) {
  for (const rel of listar(origen)) escribirArchivo(path.join(origen, ...rel.split('/')), path.join(destino, ...rel.split('/')));
}

// Rutas del manifiesto: relativas, sin "..", sin unidad.
const rutaSegura = (rel) => typeof rel === 'string' && rel.length > 0 && !rel.includes('..') && !path.isAbsolute(rel) && !/^[a-z]:/i.test(rel) && !rel.includes('\\');

class Actualizador {
  constructor({ carpeta, appDir, respaldoDir, versionActual, electronActual }) {
    Object.assign(this, { carpeta, appDir, respaldoDir, versionActual, electronActual });
  }

  leerManifiesto() {
    const archivo = path.join(this.carpeta, 'ultima.json');
    if (!fs.existsSync(this.carpeta)) return { estado: 'sin-carpeta', mensaje: `No encuentro la carpeta de actualizaciones (${this.carpeta}).` };
    if (!fs.existsSync(archivo)) return { estado: 'sin-paquete', mensaje: 'La carpeta de actualizaciones no tiene ningún paquete.' };
    let m;
    try { m = JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch (_) { return { estado: 'error', mensaje: 'El archivo ultima.json está dañado.' }; }
    if (!m || !m.version || !m.carpeta || !m.archivos) return { estado: 'error', mensaje: 'El paquete de actualización está incompleto.' };
    return { estado: 'ok', manifiesto: m };
  }

  buscar() {
    const r = this.leerManifiesto();
    if (r.estado !== 'ok') return { ...r, versionActual: this.versionActual };
    const m = r.manifiesto;
    const nueva = compararVersion(m.version, this.versionActual) > 0;
    const requiereInstalador = !!(m.electron && m.electron !== this.electronActual);
    return { estado: nueva ? 'disponible' : 'al-dia', versionActual: this.versionActual, versionNueva: m.version, notas: m.notas || [], requiereInstalador, hayRespaldo: this.hayRespaldo() };
  }

  hayRespaldo() { return fs.existsSync(path.join(this.respaldoDir, 'package.json')); }

  aplicar() {
    const r = this.leerManifiesto();
    if (r.estado !== 'ok') throw new Error(r.mensaje);
    const m = r.manifiesto;
    if (compararVersion(m.version, this.versionActual) <= 0) throw new Error('Ya tenés esta versión o una más nueva.');
    if (m.electron && m.electron !== this.electronActual) throw new Error('Esta versión necesita el instalador nuevo (cambia la base de la app). Ejecutá "Instalar Cierre Cignetti.exe" de la carpeta Cierre Cignetti.');
    const origen = path.join(this.carpeta, m.carpeta);
    // 1. Verificar todo antes de tocar nada.
    for (const [rel, hash] of Object.entries(m.archivos)) {
      if (!rutaSegura(rel)) throw new Error(`Ruta inválida en el paquete: ${rel}`);
      const f = path.join(origen, ...rel.split('/'));
      if (!fs.existsSync(f)) throw new Error(`Falta un archivo del paquete: ${rel}. Si OneDrive todavía está sincronizando, esperá un momento y probá de nuevo.`);
      if (sha256(f) !== hash) throw new Error(`Un archivo del paquete no coincide (${rel}). Si OneDrive todavía está sincronizando, esperá un momento y probá de nuevo.`);
    }
    // 2. Respaldo de la versión actual.
    fs.rmSync(this.respaldoDir, { recursive: true, force: true });
    fs.mkdirSync(this.respaldoDir, { recursive: true });
    copiarArbol(this.appDir, this.respaldoDir);
    // 3. Copiar. Si falla a mitad de camino, se vuelve al respaldo.
    try {
      for (const rel of Object.keys(m.archivos)) escribirArchivo(path.join(origen, ...rel.split('/')), path.join(this.appDir, ...rel.split('/')));
    } catch (e) {
      try { copiarArbol(this.respaldoDir, this.appDir); } catch (_) {}
      throw new Error('No se pudo copiar la actualización; se dejó la versión anterior. ' + (e.message || ''));
    }
    return { version: m.version };
  }

  revertir() {
    if (!this.hayRespaldo()) throw new Error('No hay una versión anterior guardada.');
    copiarArbol(this.respaldoDir, this.appDir);
    let v = '?';
    try { v = JSON.parse(fs.readFileSync(path.join(this.respaldoDir, 'package.json'), 'utf8')).version; } catch (_) {}
    return { version: v };
  }
}

// Arma un paquete (lo usa el script de publicación).
function armarManifiesto(dirApp, version, electron, notas) {
  const archivos = {};
  for (const rel of listar(dirApp)) archivos[rel] = sha256(path.join(dirApp, ...rel.split('/')));
  return { version, carpeta: version, electron, notas, publicado: new Date().toISOString(), archivos };
}

module.exports = { Actualizador, compararVersion, armarManifiesto, listar, escribirArchivo };
