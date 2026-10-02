const API = "https://pokeapi.co/api/v2/pokemon/";

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

function mostrarEstado(texto, esError = false) {
  estado.textContent = texto;
  estado.classList.toggle("error", esError);
}

async function buscar(consulta) {
  const termino = consulta.trim().toLowerCase();
  if (!termino) return;

  mostrarEstado("Buscando…");
  try {
    const res = await fetch(API + encodeURIComponent(termino));
    if (res.status === 404) throw new Error(`No se encontró "${termino}". Revisa el nombre o prueba con el número.`);
    if (!res.ok) throw new Error("La API no respondió. Intenta de nuevo en un momento.");
    mostrarPokemon(await res.json());
    mostrarEstado("");
  } catch (err) {
    tarjeta.hidden = true;
    const sinRed = err instanceof TypeError;
    mostrarEstado(sinRed ? "No hay conexión con la API. Revisa tu internet." : err.message, true);
  }
}

function mostrarPokemon(p) {
  const principal = p.types[0].type.name;
  tarjeta.style.setProperty("--tipo", COLORES[principal] || "#8a94a6");

  $("numero").textContent = "N.º " + String(p.id).padStart(4, "0");
  $("nombre").textContent = p.name.replace(/-/g, " ");

  const img = $("imagen");
  img.src = p.sprites.other["official-artwork"].front_default || p.sprites.front_default || "";
  img.alt = "Imagen de " + p.name;

  $("tipos").innerHTML = p.types.map(t => {
    const n = t.type.name;
    return `<li style="--c:${COLORES[n] || "#8a94a6"}">${TIPOS_ES[n] || n}</li>`;
  }).join("");

  $("medidas").textContent = `Altura ${p.height / 10} m · Peso ${p.weight / 10} kg`;

  $("stats").innerHTML = p.stats.map(s => {
    const pct = Math.min(100, (s.base_stat / 255) * 100);
    return `<li>
      <span>${STATS_ES[s.stat.name] || s.stat.name}</span>
      <b>${s.base_stat}</b>
      <div class="barra"><span style="width:${pct}%"></span></div>
    </li>`;
  }).join("");

  $("habilidades").innerHTML = p.abilities.map(a =>
    `<li>${a.ability.name.replace(/-/g, " ")}${a.is_hidden ? "<small>(oculta)</small>" : ""}</li>`
  ).join("");

  tarjeta.hidden = false;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  buscar(entrada.value);
});

// Pokémon inicial del ejemplo
buscar("ditto");

/* ---------- Sugerencias al escribir ---------- */
const lista = $("sugerencias");
let nombres = [];
let activo = -1;

async function cargarNombres() {
  try {
    const res = await fetch(API + "?limit=2000");
    const datos = await res.json();
    nombres = datos.results.map(r => r.name);
  } catch {
    // Si falla, el buscador sigue funcionando sin sugerencias
  }
}

function filtrar(texto) {
  const t = texto.trim().toLowerCase();
  if (!t) return [];
  const empiezan = nombres.filter(n => n.startsWith(t));
  const contienen = nombres.filter(n => !n.startsWith(t) && n.includes(t));
  return [...empiezan, ...contienen].slice(0, 8);
}

function cerrarSugerencias() {
  lista.hidden = true;
  lista.innerHTML = "";
  activo = -1;
  entrada.setAttribute("aria-expanded", "false");
  entrada.removeAttribute("aria-activedescendant");
}

function mostrarSugerencias() {
  const t = entrada.value.trim().toLowerCase();
  const items = filtrar(t);
  if (!items.length) return cerrarSugerencias();

  lista.innerHTML = items.map((n, i) => {
    const pos = n.indexOf(t);
    const html = pos >= 0
      ? `${n.slice(0, pos)}<b>${n.slice(pos, pos + t.length)}</b>${n.slice(pos + t.length)}`
      : n;
    return `<li id="op-${i}" role="option" data-nombre="${n}" aria-selected="false">${html.replace(/-/g, " ")}</li>`;
  }).join("");
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
  entrada.value = nombre;
  cerrarSugerencias();
  buscar(nombre);
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

// mousedown (no click) para que se ejecute antes de que el campo pierda el foco
lista.addEventListener("mousedown", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  e.preventDefault();
  elegir(li.dataset.nombre);
});

entrada.addEventListener("blur", cerrarSugerencias);
form.addEventListener("submit", cerrarSugerencias);

cargarNombres();
