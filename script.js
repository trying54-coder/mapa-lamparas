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
// 🔍 BARRA DE BÚSQUEDA (URUAPAN)
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
.on("markgeocode", function(e) {
  map.setView(e.geocode.center, 18);
})
.addTo(map);

// ================================
// BOTÓN: MI UBICACIÓN
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
// ICONOS
// ================================
const iconNormal = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const iconReportado = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

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
// CLUSTER
// ================================
const clusters = L.markerClusterGroup({
  chunkedLoading: true,
  disableClusteringAtZoom: 20
});

// ================================
// GOOGLE SHEETS
// ================================
const URL_SHEETS = "https://script.google.com/macros/s/AKfycbwpRcEPmOGtqjtGq-Cnpv_2njDy8hkwttQqLKCdxJsENfKxzyn9qeYqTD32Fchye7ijTQ/exec";
let estadosSheets = {};
let lamparaActual = null;

// ================================
// CARGAR ESTADOS DESDE SHEETS
// ================================
fetch(URL_SHEETS)
  .then(r => r.json())
  .then(data => {
    data.forEach(r => {
      estadosSheets[r.id] = {
        estado: r.estado,
        fecha: r.fecha,
        comentario: r.comentario
      };
    });
    cargarLamparas();
  })
  .catch(() => cargarLamparas());

// ================================
// CARGAR LÁMPARAS
// ================================
function cargarLamparas() {
  omnivore.kml("lamparas_ciudad.kml")
    .on("ready", function () {

      const capa = L.geoJSON(this.toGeoJSON(), {
        pointToLayer: function (feature, latlng) {

          // ID ÚNICO Y ESTABLE
          const id = `${latlng.lat.toFixed(8)},${latlng.lng.toFixed(8)}`;

          // Nombre solo visual
          const nombre =
            feature.properties?.name ||
            feature.properties?.ID ||
            "Lámpara sin nombre";

          const info = estadosSheets[id];
          const pendiente = info?.estado === "pendiente";

          const marker = L.marker(latlng, {
            icon: pendiente ? iconReportado : iconNormal
          });

          if (pendiente) {
            marker.bindPopup(`
              <b>${nombre}</b><br><br>
              <b>Estado:</b> Pendiente<br>
              <b>Fecha del reporte:</b><br>
              ${new Date(info.fecha).toLocaleString()}<br><br>
              <b>Comentario:</b><br>
              ${info.comentario || "Sin comentario"}
            `);
          } else {
            marker.bindPopup(`
              <b>${nombre}</b><br><br>
              <button onclick="abrirReporte('${id}', ${latlng.lat}, ${latlng.lng})"
                style="padding:8px;background:#d9534f;color:white;border:none;">
                Reportar lámpara
              </button>
            `);
          }

          return marker;
        }
      });

      clusters.clearLayers();
      clusters.addLayer(capa);
      map.addLayer(clusters);
      map.fitBounds(clusters.getBounds());
    });
}

// ================================
// REPORTE → GOOGLE SHEETS
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
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const referencia = document.getElementById("referencia").value.trim();
  const comentario = document.getElementById("comentario").value.trim();

  if (!nombre || !telefono || !comentario) {
    alert("Completa los campos requeridos.");
    return;
  }

  fetch(URL_SHEETS, {
    method: "POST",
    body: JSON.stringify({
      id: lamparaActual.id,
      latitud: lamparaActual.lat,
      longitud: lamparaActual.lng,
      nombre,
      telefono,
      referencia,
      comentario
    })
  });

  document.getElementById("reporteModal").style.display = "none";
  alert("Reporte enviado correctamente");
  location.reload();
}
