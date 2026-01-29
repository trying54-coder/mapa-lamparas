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
      if (!navigator.geolocation) {
        alert("Tu navegador no soporta ubicación.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          // borrar punto anterior
          if (markerMiUbicacion) map.removeLayer(markerMiUbicacion);

          // ✅ marcador tachuela (bolita roja)
          markerMiUbicacion = L.circleMarker([lat, lng], {
            radius: 8,
            color: "#b30000",
            fillColor: "#ff0000",
            fillOpacity: 1
          }).addTo(map)
            .bindPopup("<b>Tu ubicación actual</b>")
            .openPopup();

          map.setView([lat, lng], 18);
        },
        () => {
          alert("No se pudo obtener tu ubicación. Activa el GPS o da permisos.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    return btn;
  }
});

map.addControl(new UbicacionControl());

// ================================
// ICONOS LÁMPARAS
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
// ESTADO LOCAL
// ================================
let reportadas = JSON.parse(
  localStorage.getItem("lamparas_reportadas")
) || {};

let lamparaActual = null;

function marcarReportada(id, dataReporte) {
  reportadas[id] = dataReporte; // guarda datos
  localStorage.setItem("lamparas_reportadas", JSON.stringify(reportadas));
}

// ================================
// CARGAR LÁMPARAS DESDE KML
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

        const reporte = reportadas[id];
        const yaReportada = !!reporte;

        const marker = L.marker(latlng, {
          icon: yaReportada ? iconReportado : iconNormal
        });

        if (yaReportada) {
          const comentario = reporte?.comentario ? reporte.comentario : "Sin comentarios.";
          const fechaISO = reporte?.fecha ? reporte.fecha : null;

          const fechaBonita = fechaISO
            ? new Date(fechaISO).toLocaleString()
            : "Fecha no disponible";

          // ✅ privacidad: NO se muestra nombre ni teléfono
          marker.bindPopup(`
            <b>Lámpara ya reportada</b><br><br>
            <b>Fecha del reporte:</b> ${fechaBonita}<br><br>
            <b>Comentario:</b><br>
            ${comentario}
          `);

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

  document.getElementById("nombre").value = "";
  document.getElementById("telefono").value = "";
  document.getElementById("comentario").value = "";

  document.getElementById("reporteModal").style.display = "flex";
}

function enviarReporte() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const comentario = document.getElementById("comentario").value.trim();

  if (!nombre) {
    alert("Ingresa tu nombre.");
    return;
  }

  if (!telefono) {
    alert("Ingresa un teléfono de contacto.");
    return;
  }

  if (!comentario) {
    alert("Describe el problema.");
    return;
  }

  if (!confirm("¿Confirmas el envío del reporte?")) return;

  marcarReportada(lamparaActual, {
    nombre,
    telefono,
    comentario,
    fecha: new Date().toISOString()
  });

  document.getElementById("reporteModal").style.display = "none";
  alert("Reporte enviado correctamente");
  location.reload();
}
