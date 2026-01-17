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
  chunkInterval: 200,
  chunkDelay: 50,
  disableClusteringAtZoom: 18
});

// ================================
// ESTADO LOCAL (EL QUE FUNCIONABA)
// ================================
let reportadas = JSON.parse(
  localStorage.getItem("lamparas_reportadas")
) || {};

let lamparaActual = null;

function marcarReportada(id) {
  reportadas[id] = true;
  localStorage.setItem(
    "lamparas_reportadas",
    JSON.stringify(reportadas)
  );
}

// ================================
// CARGAR LÁMPARAS
// ================================
omnivore.kml("lamparas_ciudad.kml")
  .on("ready", function () {

    const geo = this.toGeoJSON();

    const capa = L.geoJSON(geo, {
      pointToLayer: function (feature, latlng) {

        const id =
          feature.properties?.ID ||
          feature.properties?.name ||
          `${latlng.lat.toFixed(6)},${latlng.lng.toFixed(6)}`;

        const yaReportada = reportadas[id];

        const marker = L.marker(latlng, {
          icon: yaReportada ? iconReportado : iconNormal
        });

        if (yaReportada) {
          marker.bindPopup("<b>Lámpara ya reportada</b>");
        } else {
          marker.bindPopup(`
            <button onclick="abrirReporte('${id}')"
              style="padding:8px;background:#d9534f;color:white;border:none;">
              Reportar lámpara
            </button>
          `);
        }

        return marker;
      }
    });

    clusters.addLayer(capa);
    map.addLayer(clusters);
    map.fitBounds(clusters.getBounds());
  });

// ================================
// REPORTE
// ================================
function abrirReporte(id) {
  lamparaActual = id;
  document.getElementById("comentario").value = "";
  document.getElementById("reporteModal").style.display = "flex";
}

function enviarReporte() {
  const texto = document.getElementById("comentario").value.trim();
  if (!texto) {
    alert("Describe el problema.");
    return;
  }

  if (!confirm("¿Confirmas el envío del reporte?")) return;

  marcarReportada(lamparaActual);
  document.getElementById("reporteModal").style.display = "none";
  alert("Reporte enviado correctamente");
  location.reload();
}
