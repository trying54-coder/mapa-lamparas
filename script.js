// ================================
// MAPA
// ================================
const map = L.map("map", {
  preferCanvas: true,
  maxZoom: 22
}).setView([19.43, -102.03], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 22
}).addTo(map);

// ================================
// BUSCADOR
// ================================
L.Control.geocoder({
  defaultMarkGeocode: false,
  geocoder: L.Control.Geocoder.nominatim({
    geocodingQueryParams: {
      countrycodes: "mx",
      viewbox: "-102.15,19.38,-101.95,19.50",
      bounded: 1
    }
  })
})
.on("markgeocode", e => map.setView(e.geocode.center, 18))
.addTo(map);

// ================================
// MI UBICACIÓN
// ================================
let markerMiUbicacion = null;

const UbicacionControl = L.Control.extend({
  options: { position: "topleft" },
  onAdd: function () {
    const btn = L.DomUtil.create("button", "btn-ubicacion");
    btn.innerHTML = "📍 Mi ubicación";
    L.DomEvent.disableClickPropagation(btn);

    btn.onclick = () => {
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (markerMiUbicacion) map.removeLayer(markerMiUbicacion);

        markerMiUbicacion = L.circleMarker([lat, lng], {
          radius: 8,
          color: "#b30000",
          fillColor: "#ff0000",
          fillOpacity: 1
        }).addTo(map)
          .bindPopup("<b>Tu ubicación actual</b>")
          .openPopup();

        map.setView([lat, lng], 18);
      });
    };
    return btn;
  }
});
map.addControl(new UbicacionControl());

// ================================
// FILTRO REPORTADAS
// ================================
let mostrarSoloReportadas = false;

const FiltroControl = L.Control.extend({
  options: { position: "topright" },
  onAdd: function () {
    const btn = L.DomUtil.create("button", "btn-ubicacion");
    btn.innerHTML = "🚨 Solo reportadas";
    L.DomEvent.disableClickPropagation(btn);

    btn.onclick = () => {
      mostrarSoloReportadas = !mostrarSoloReportadas;
      cargarLamparas();
    };
    return btn;
  }
});
map.addControl(new FiltroControl());

// ================================
// MODALES
// ================================
function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}
function cancelarReporte() {
  document.getElementById("reporteModal").style.display = "none";
  lamparaActual = null;
}

// ================================
// GOOGLE SHEETS
// ================================
const URL_SHEETS = "https://script.google.com/macros/s/AKfycbwpRcEPmOGtqjtGq-Cnpv_2njDy8hkwttQqLKCdxJsENfKxzyn9qeYqTD32Fchye7ijTQ/exec";
let estadosSheets = {};
let lamparaActual = null;
let capaLamparas = null;

// ================================
// CARGAR ESTADOS
// ================================
fetch(URL_SHEETS)
  .then(r => r.json())
  .then(data => {
    data.forEach(r => {
      estadosSheets[r.id] = r;
    });
    cargarLamparas();
  })
  .catch(() => cargarLamparas());

// ================================
// CARGAR LÁMPARAS (SIN AGRUPAR)
// ================================
function cargarLamparas() {

  if (capaLamparas) map.removeLayer(capaLamparas);

  omnivore.kml("lamparas_ciudad.kml")
    .on("ready", function () {

      capaLamparas = L.geoJSON(this.toGeoJSON(), {
        pointToLayer: function (feature, latlng) {

          const id = `${latlng.lat.toFixed(8)},${latlng.lng.toFixed(8)}`;
          const info = estadosSheets[id];
          const pendiente = info?.estado === "pendiente";

          if (mostrarSoloReportadas && !pendiente) return null;

          const marker = L.circleMarker(latlng, {
            radius: 6,
            color: pendiente ? "#b30000" : "#0044cc",
            fillColor: pendiente ? "#ff0000" : "#3399ff",
            fillOpacity: 0.9
          });

          if (pendiente) {
            marker.bindPopup(`
              <b>Lámpara reportada</b><br><br>
              <b>Fecha:</b><br>${new Date(info.fecha).toLocaleString()}<br><br>
              <b>Comentario:</b><br>${info.comentario || "Sin comentario"}
            `);
          } else {
            marker.bindPopup(`
              <b>Lámpara</b><br><br>
              <button onclick="abrirReporte('${id}', ${latlng.lat}, ${latlng.lng})"
                style="padding:8px;background:#d9534f;color:white;border:none;">
                Reportar lámpara
              </button>
            `);
          }

          return marker;
        }
      }).addTo(map);
    });
}

// ================================
// REPORTE
// ================================
function abrirReporte(id, lat, lng) {
  lamparaActual = { id, lat, lng };

  document.getElementById("nombre").value = "";
  document.getElementById("telefono").value = "";
  document.getElementById("referencia").value = "";
  document.getElementById("comentario").value = "";

  document.getElementById("reporteModal").style.display = "flex";
}

function enviarReporte() {
  fetch(URL_SHEETS, {
    method: "POST",
    body: JSON.stringify({
      id: lamparaActual.id,
      latitud: lamparaActual.lat,
      longitud: lamparaActual.lng,
      nombre: nombre.value,
      telefono: telefono.value,
      referencia: referencia.value,
      comentario: comentario.value
    })
  });

  alert("Reporte enviado correctamente");
  location.reload();
}
