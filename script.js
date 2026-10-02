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
