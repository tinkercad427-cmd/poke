const API = "https://pokeapi.co/api/v2/pokemon/";
// Último Pokémon con número propio. Las formas especiales usan ids desde 10000.
const MAX_ID = 1025;

const COLORES = {
  normal: "#8a8d7a", fire: "#e8612c", water: "#3b82d9", electric: "#e6b800",
  grass: "#4caf50", ice: "#4fb8c9", fighting: "#b83a2e", poison: "#9b4dbb",
  ground: "#b8914a", flying: "#6c8fe0", psychic: "#e8548a", bug: "#8aa61f",
  rock: "#a08f5a", ghost: "#6a4f9c", dragon: "#5a3fd1", dark: "#4a3f3a",
  steel: "#7a8ea0", fairy: "#e08ac4"
};

const TIPOS_ES = {
  normal: "Normal", fire: "Fuego", water: "Agua", electric: "Eléctrico",
  grass: "Planta", ice: "Hielo", fighting: "Lucha", poison: "Veneno",
  ground: "Tierra", flying: "Volador", psychic: "Psíquico", bug: "Bicho",
  rock: "Roca", ghost: "Fantasma", dragon: "Dragón", dark: "Siniestro",
  steel: "Acero", fairy: "Hada"
};

const STATS_ES = {
  hp: "PS", attack: "Ataque", defense: "Defensa",
  "special-attack": "Ataque esp.", "special-defense": "Defensa esp.", speed: "Velocidad"
};

const $ = (id) => document.getElementById(id);
const form = $("form"), entrada = $("entrada"), estado = $("estado"), tarjeta = $("tarjeta");
const btnAnterior = $("anterior"), btnSiguiente = $("siguiente"), btnAleatorio = $("aleatorio");

/* ---------- Utilidades ---------- */

// Crea un elemento usando textContent (nunca innerHTML con datos externos)
function el(tag, { texto, clase, attrs } = {}) {
  const e = document.createElement(tag);
  if (texto != null) e.textContent = texto;
  if (clase) e.className = clase;
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

// "Mr. Mime" -> "mr-mime", "Farfetch'd" -> "farfetchd", "Flabébé" -> "flabebe"
function normalizar(texto) {
  return texto.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’:]/g, "")
    .replace(/\s+/g, "-");
}

// Elige texto oscuro o blanco según la luminosidad del color de fondo
function textoSobre(hex) {
  const [r, g, b] = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminosidad = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminosidad > 0.2 ? "#14213d" : "#ffffff";
}

function mostrarEstado(texto, esError = false) {
  estado.textContent = texto;
  estado.classList.toggle("error", esError);
}

const esperar = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------- Consulta a la API (con reintentos y caché) ---------- */

class ErrorBusqueda extends Error {}

const cache = new Map();   // Pokémon ya consultados en esta sesión
let controlador = null;    // permite cancelar la búsqueda anterior
let actual = null;         // id del Pokémon que se está mostrando

async function pedir(clave, signal) {
  const MAX_INTENTOS = 3;
  for (let intento = 1; ; intento++) {
    try {
      const res = await fetch(API + encodeURIComponent(clave), { signal });
      if (res.ok) return await res.json();
      if (res.status === 404) {
        throw new ErrorBusqueda(`No se encontró "${clave}". Revisa el nombre o prueba con el número.`);
      }
      if (res.status !== 429 && res.status < 500) {
        throw new ErrorBusqueda("La API rechazó la búsqueda.");
      }
      if (intento >= MAX_INTENTOS) {
        throw new ErrorBusqueda("La API está ocupada. Intenta de nuevo en un momento.");
      }
    } catch (err) {
      if (err instanceof ErrorBusqueda || err.name === "AbortError") throw err;
      if (intento >= MAX_INTENTOS) throw err; // error de red
    }
    await esperar(500 * intento);
  }
}

async function cargar(consulta) {
  const clave = normalizar(consulta);
  if (!clave) return;

  controlador?.abort(); // cancela la búsqueda anterior para que no pise a esta
  controlador = new AbortController();
  const { signal } = controlador;

  mostrarEstado("Buscando…");
  tarjeta.classList.add("cargando");

  try {
    let p = cache.get(clave);
    if (!p) {
      p = await pedir(clave, signal);
      cache.set(String(p.id), p);
      cache.set(p.name, p);
      cache.set(clave, p);
    }
    mostrarPokemon(p);
    mostrarEstado("");
    history.replaceState(null, "", "#" + encodeURIComponent(p.name));
  } catch (err) {
    if (err.name === "AbortError") return;
    tarjeta.hidden = true;
    mostrarEstado(
      err instanceof ErrorBusqueda ? err.message : "No hay conexión con la API. Revisa tu internet.",
      true
    );
  } finally {
    if (controlador.signal === signal) tarjeta.classList.remove("cargando");
  }
}

// Cambia la URL (#nombre); el evento hashchange hace la carga.
// Así el botón "atrás" y los enlaces compartidos funcionan.
function irA(consulta) {
  const clave = normalizar(String(consulta));
  if (!clave) return;
  if (decodeURIComponent(location.hash.slice(1)) === clave) cargar(clave);
  else location.hash = encodeURIComponent(clave);
}

/* ---------- Mostrar el Pokémon ---------- */

function mostrarPokemon(p) {
  actual = p.id;
  const principal = p.types[0].type.name;
  tarjeta.style.setProperty("--tipo", COLORES[principal] || "#8a94a6");

  $("numero").textContent = "N.º " + String(p.id).padStart(4, "0");
  $("nombre").textContent = p.name.replace(/-/g, " ");

  const img = $("imagen");
  const url = p.sprites.other["official-artwork"].front_default || p.sprites.front_default;
  if (url) img.src = url; else img.removeAttribute("src");
  img.alt = "Imagen de " + p.name.replace(/-/g, " ");

  $("tipos").replaceChildren(...p.types.map(t => {
    const n = t.type.name;
    const color = COLORES[n] || "#8a94a6";
    const li = el("li", { texto: TIPOS_ES[n] || n });
    li.style.setProperty("--c", color);
    li.style.color = textoSobre(color);
    return li;
  }));

  $("medidas").textContent = `Altura ${p.height / 10} m · Peso ${p.weight / 10} kg`;

  $("stats").replaceChildren(...p.stats.map(s => {
    const relleno = document.createElement("span");
    relleno.style.width = Math.min(100, (s.base_stat / 255) * 100) + "%";
    const barra = el("div", { clase: "barra" });
    barra.append(relleno);
    const li = document.createElement("li");
    li.append(
      el("span", { texto: STATS_ES[s.stat.name] || s.stat.name }),
      el("b", { texto: String(s.base_stat) }),
      barra
    );
    return li;
  }));

  $("habilidades").replaceChildren(...p.abilities.map(a => {
    const li = el("li", { texto: a.ability.name.replace(/-/g, " ") });
    if (a.is_hidden) li.append(el("small", { texto: "(oculta)" }));
    return li;
  }));

  // Anterior/siguiente solo tienen sentido para Pokémon con número propio
  btnAnterior.disabled = btnSiguiente.disabled = p.id > MAX_ID;
  tarjeta.hidden = false;
}

/* ---------- Sugerencias al escribir ---------- */

const lista = $("sugerencias");
const CLAVE_NOMBRES = "pokemon-nombres-v1";
const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;
let nombres = [];   // [{ nombre, id }]
let activo = -1;

async function cargarNombres() {
  try { // primero la copia guardada en el navegador
    const guardado = JSON.parse(localStorage.getItem(CLAVE_NOMBRES) || "null");
    if (guardado && Date.now() - guardado.fecha < SIETE_DIAS) {
      nombres = guardado.lista;
      return;
    }
  } catch { /* localStorage no disponible: seguimos */ }

  try {
    const res = await fetch(API + "?limit=2000");
    const datos = await res.json();
    nombres = datos.results
      .map(r => ({ nombre: r.name, id: Number(r.url.split("/").filter(Boolean).pop()) }))
      .filter(p => p.id <= MAX_ID); // sin formas especiales (mega, gigamax, etc.)
    try {
      localStorage.setItem(CLAVE_NOMBRES, JSON.stringify({ fecha: Date.now(), lista: nombres }));
    } catch { /* sin caché local */ }
  } catch { /* sin sugerencias; el buscador sigue funcionando */ }
}

function filtrar(t) {
  if (!t) return [];
  if (/^\d+$/.test(t)) {
    return nombres.filter(p => String(p.id).startsWith(t)).slice(0, 8);
  }
  const empiezan = nombres.filter(p => p.nombre.startsWith(t));
  const contienen = nombres.filter(p => !p.nombre.startsWith(t) && p.nombre.includes(t));
  return [...empiezan, ...contienen].slice(0, 8);
}

function cerrarSugerencias() {
  lista.hidden = true;
  lista.replaceChildren();
  activo = -1;
  entrada.setAttribute("aria-expanded", "false");
  entrada.removeAttribute("aria-activedescendant");
}

function mostrarSugerencias() {
  const t = normalizar(entrada.value);
  const items = filtrar(t);
  if (!items.length) return cerrarSugerencias();

  lista.replaceChildren(...items.map((p, i) => {
    const li = el("li", { attrs: { id: `op-${i}`, role: "option", "aria-selected": "false" } });
    li.dataset.nombre = p.nombre;

    const nom = el("span", { clase: "nom" });
    const pos = p.nombre.indexOf(t);
    if (pos >= 0 && !/^\d+$/.test(t)) {
      nom.append(
        p.nombre.slice(0, pos).replace(/-/g, " "),
        el("b", { texto: p.nombre.slice(pos, pos + t.length).replace(/-/g, " ") }),
        p.nombre.slice(pos + t.length).replace(/-/g, " ")
      );
    } else {
      nom.textContent = p.nombre.replace(/-/g, " ");
    }
    li.append(nom, el("span", { clase: "num", texto: "N.º " + p.id }));
    return li;
  }));

  activo = -1;
  lista.hidden = false;
  entrada.setAttribute("aria-expanded", "true");
}

function marcarActivo(nuevo) {
  const opciones = lista.querySelectorAll("li");
  if (!opciones.length) return;
  activo = (nuevo + opciones.length) % opciones.length;
  opciones.forEach((li, i) => li.setAttribute("aria-selected", String(i === activo)));
  opciones[activo].scrollIntoView({ block: "nearest" });
  entrada.setAttribute("aria-activedescendant", opciones[activo].id);
}

function elegir(nombre) {
  entrada.value = nombre.replace(/-/g, " ");
  cerrarSugerencias();
  irA(nombre);
}

entrada.addEventListener("input", mostrarSugerencias);

entrada.addEventListener("keydown", (e) => {
  if (lista.hidden) return;
  if (e.key === "ArrowDown") { e.preventDefault(); marcarActivo(activo + 1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); marcarActivo(activo - 1); }
  else if (e.key === "Enter" && activo >= 0) {
    e.preventDefault();
    elegir(lista.children[activo].dataset.nombre);
  }
  else if (e.key === "Escape") cerrarSugerencias();
});

// mousedown (no click) para que ocurra antes de que el campo pierda el foco
lista.addEventListener("mousedown", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  e.preventDefault();
  elegir(li.dataset.nombre);
});

entrada.addEventListener("blur", cerrarSugerencias);

/* ---------- Eventos y arranque ---------- */

form.addEventListener("submit", (e) => {
  e.preventDefault();
  cerrarSugerencias();
  irA(entrada.value);
});

btnAnterior.addEventListener("click", () => irA(actual <= 1 ? MAX_ID : actual - 1));
btnSiguiente.addEventListener("click", () => irA(actual >= MAX_ID ? 1 : actual + 1));
btnAleatorio.addEventListener("click", () => irA(Math.floor(Math.random() * MAX_ID) + 1));

window.addEventListener("hashchange", () => {
  cargar(decodeURIComponent(location.hash.slice(1)) || "ditto");
});

cargarNombres();
// Si la URL trae #pikachu se abre ese Pokémon; si no, el del ejemplo (ditto)
cargar(decodeURIComponent(location.hash.slice(1)) || "ditto");
