import fetch from "node-fetch";

// === Productos a vigilar ===
const PRODUCTOS = [
  { nombre: "Mega Lucario - Premium Poster Collection", asin: "B0G3CS6XB9" },
  { nombre: "Victini Illustration Collection", asin: "B0F6PV45YM" },
  { nombre: "First Partner Collection", asin: "B0GN2GWKT3" },
  { nombre: "Booster Box - Ascended Heroes", asin: "B0G3CV6Z9D" },
  { nombre: "Pin Collection - Ascended Heroes", asin: "B0G71VXSWN" },
  { nombre: "ETB - Ascended Heroes", asin: "B0GV1TN5VR" },
  { nombre: "Mega Gardevoir Collection", asin: "B0G3CSF9TF" },
  { nombre: "TCG Day 2026 Collection", asin: "B0G2FVLXVL" },
];

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const INTERVALO = (Number(process.env.INTERVALO_SEG) || 90) * 1000;

// Espera entre producto y producto (para no saturar a Amazon)
const ESPERA_ENTRE = 4000;

const url = (asin) => `https://www.amazon.com.mx/dp/${asin}`;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Recuerda qué productos ya avisamos (para no repetir el aviso)
const yaAvisado = {};

async function avisar(texto) {
  const api = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  try {
    await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: texto,
        disable_web_page_preview: false,
      }),
    });
  } catch (e) {
    console.log("Error enviando Telegram:", e.message);
  }
}

async function revisarProducto(prod) {
  const URL = url(prod.asin);
  try {
    const res = await fetch(URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "es-MX,es;q=0.9",
      },
    });
    const html = (await res.text()).toLowerCase();

    const captcha =
      html.includes("captcha") || html.includes("automated access");
    if (captcha) {
      console.log(
        new Date().toLocaleTimeString(),
        `⚠️ CAPTCHA en ${prod.nombre} (bloqueo temporal)`
      );
      return;
    }

    const noDisponible =
      html.includes("vendedores externos") ||
      html.includes("ver opciones de compra") ||
      html.includes("no disponible") ||
      html.includes("actualmente no disponible");

    const sePuedeComprar =
      html.includes("agregar al carrito") || html.includes("comprar ahora");

    if (sePuedeComprar && !noDisponible) {
      if (!yaAvisado[prod.asin]) {
        await avisar(`🚨 ¡DISPONIBLE!\n\n${prod.nombre}\n\n👉 ${URL}\n\n¡Cómpralo rápido!`);
        yaAvisado[prod.asin] = true;
        console.log(new Date().toLocaleTimeString(), `✅ DISPONIBLE: ${prod.nombre} — aviso enviado`);
      }
    } else {
      yaAvisado[prod.asin] = false; // se reinicia para volver a avisar si reaparece
      console.log(new Date().toLocaleTimeString(), `⏳ Aún no: ${prod.nombre}`);
    }
  } catch (e) {
    console.log(new Date().toLocaleTimeString(), `Error en ${prod.nombre}:`, e.message);
  }
}

async function rondaCompleta() {
  for (const prod of PRODUCTOS) {
    await revisarProducto(prod);
    await dormir(ESPERA_ENTRE);
  }
}

console.log(`Monitor iniciado. Vigilando ${PRODUCTOS.length} productos.`);
avisar(`✅ Monitor encendido. Vigilando ${PRODUCTOS.length} productos Pokémon en Amazon MX.`);

(async function loop() {
  while (true) {
    await rondaCompleta();
    await dormir(INTERVALO);
  }
})();
