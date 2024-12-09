import React, { useEffect, useState } from "react";
import { GoogleMap, LoadScript, Polyline, Marker } from "@react-google-maps/api";
import axios from "axios";
import './Map.css';

// Configuración del mapa
const mapContainerStyle = {
  width: "100%",
  height: "600px",
};

const center = {
  lat: -17.5,
  lng: -66.2,
};

const Map = () => {
  const [routes, setRoutes] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [highlightedRoute, setHighlightedRoute] = useState(null);
  const [mapCenter, setMapCenter] = useState(center);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [incidencias, setIncidencias] = useState([]);
  const [selectedIncidencia, setSelectedIncidencia] = useState("");
  const [selectedMotivo, setSelectedMotivo] = useState(null);
  const [showReportPopup, setShowReportPopup] = useState(false)
  const [reportData, setReportData] = useState({
    detalle: "",
    foto: null,
    latitud: "",
    longitud: "",
});

  // Carga las carreteras y municipios
  useEffect(() => {
    axios
      .get("http://localhost:3000/carreteras")
      .then((response) => setRoutes(response.data))
      .catch((error) => console.error("Error al cargar las carreteras:", error));

    axios
      .get("http://localhost:3000/municipios")
      .then((response) => setMunicipios(response.data))
      .catch((error) => console.error("Error al cargar los municipios:", error));

    axios
      .get("http://localhost:3000/incidencias")
      .then((response) => setIncidencias(response.data))
      .catch((error) => console.error("Error al cargar las incidencias:", error));
  }, []);

  // Manejar clic en "Ver carretera"
  const handleViewRoute = (route) => {
    setHighlightedRoute(route);
    setMapCenter({
      lat: parseFloat(route.municipioOrigen?.latitud),
      lng: parseFloat(route.municipioOrigen?.longitud),
    });
  };

  //BUSQUEDA
  const handleSearch = () => {
    const municipio = municipios.find((m) => m.nombre.toLowerCase() === search.toLowerCase());
    if (municipio) {
      setMapCenter({ lat: parseFloat(municipio.latitud), lng: parseFloat(municipio.longitud) });
    } else {
      alert("Municipio no encontrado");
    }
  };

  //Filtrar por incidencia
  const filteredRoutes = selectedIncidencia
    ? routes.filter((route) =>
        incidencias.some(
          (incidencia) =>
            incidencia.carretera_id === route.id && incidencia.tipo === selectedIncidencia
        )
      )
    : routes;
    
    //MOTIVO
  const handleViewMotivo = (routeId) => {
    const motivo = incidencias.find((incidencia) => incidencia.carretera_id === routeId);
    if (motivo) {
      setSelectedMotivo(motivo);
    }
  };
    
  const handleClosePopup = () => {
    setSelectedMotivo(null);
  };

  // Maneja cambios en los campos del formulario
const handleReportChange = (e) => {
  const { name, value } = e.target;
  setReportData({ ...reportData, [name]: value });
};

//imagen
const handleFileChange = (e) => {
  setReportData({ ...reportData, foto: e.target.files[0] });
};

// Envia reporte al backend
const handleReportSubmit = async () => {
  const formData = new FormData();
  formData.append("detalle", reportData.detalle);
  formData.append("foto", reportData.foto);
  formData.append("latitud", reportData.latitud);
  formData.append("longitud", reportData.longitud);

  try {
    await axios.post("http://localhost:3000/solicitudes-incidencia", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    alert("Incidente reportado con éxito");
    setShowReportPopup(false);
    setReportData({ detalle: "", foto: null, latitud: "", longitud: "" });
  } catch (error) {
    console.error("Error al enviar el incidente:", error);
    alert("Error al reportar el incidente");
  }
};

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <label htmlFor="search">Buscar municipio:</label>
        <input
          id="search"
          type="text"
          placeholder="Buscar municipio"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <button onClick={handleSearch}>Buscar</button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="incidenciaFilter">Filtrar por tipo de incidencia:</label>
        <select
          id="incidenciaFilter"
          value={selectedIncidencia}
          onChange={(e) => setSelectedIncidencia(e.target.value)}
        >
          <option value="">Mostrar todas</option>
          <option value="Transitable con desvios y/o horarios de circulación">
            Transitable con desvios y/o horarios de circulación
          </option>
          <option value="No transitable por conflictos sociales">No transitable por conflictos sociales</option>
          <option value="Restricción vehicular">Restricción vehicular</option>
          <option value="No transitable tráfico cerrado">No transitable tráfico cerrado</option>
          <option value="Restricción vehicular, especial">Restricción vehicular, especial</option>
        </select>
      </div>

      {/* Mapa */}
      <LoadScript googleMapsApiKey="AIzaSyDO3YmC6P-fbwpffGZosTeOSLCTtFAzxeY">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={7}
        onLoad={() => setMapLoaded(true)} // Marca el mapa como cargado
      >
        {/* Dibuja solo si el mapa y los datos están listos */}
        {mapLoaded &&
          filteredRoutes.map(
            (route) =>
              route.municipioOrigen &&
              route.municipioDestino && (
                <Polyline
                  key={route.id}
                  path={[
                    {
                      lat: parseFloat(route.municipioOrigen.latitud),
                      lng: parseFloat(route.municipioOrigen.longitud),
                    },
                    {
                      lat: parseFloat(route.municipioDestino.latitud),
                      lng: parseFloat(route.municipioDestino.longitud),
                    },
                  ]}
                  options={{
                    strokeColor:
                      highlightedRoute?.id === route.id
                        ? "blue"
                        : route.estado === "bloqueada"
                        ? "red"
                        : "green",
                    strokeOpacity: 0.8,
                    strokeWeight: highlightedRoute?.id === route.id ? 6 : 4,
                  }}
                />
              )
          )}

        {/* Dibuja marcadores*/}
        {mapLoaded &&
          municipios.map(
            (municipio) =>
              municipio.latitud &&
              municipio.longitud && (
                <Marker
                  key={municipio.id}
                  position={{
                    lat: parseFloat(municipio.latitud),
                    lng: parseFloat(municipio.longitud),
                  }}
                  title={municipio.nombre}
                />
              )
          )}
      </GoogleMap>
    </LoadScript>

      <div style={{ marginTop: "20px" }}>
        <h3>Listado de Carreteras</h3>
        <table border="1" cellPadding="5" cellSpacing="0" style={{ width: "100%", textAlign: "left" }}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Municipio de Origen</th>
              <th>Municipio de Destino</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoutes.map((route) => (
              <tr key={route.id}>
                <td>{route.nombre}</td>
                <td>{route.municipioOrigen?.nombre}</td>
                <td>{route.municipioDestino?.nombre}</td>
                <td>{route.estado}</td>
                <td>
                  <button onClick={() => handleViewRoute(route)}>Ver carretera</button>
                  {route.estado === "bloqueada" && (
                    <button onClick={() => handleViewMotivo(route.id)} style={{ marginLeft: "10px" }}>
                      Ver motivo
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        {/* motivo del bloqueo */}
        {selectedMotivo && (
          <>
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                zIndex: 999,
              }}
              onClick={handleClosePopup}
            />
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "white",
                padding: "20px",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                zIndex: 1000,
              }}
            >
              <h3>Motivo del Bloqueo</h3>
              <p><strong>Tipo:</strong> {selectedMotivo.tipo}</p>
              <p><strong>Detalle:</strong> {selectedMotivo.detalle}</p>
              {selectedMotivo.foto && (
                <img
                  src={`http://localhost:3000/${selectedMotivo.foto}`}
                  alt="Motivo del bloqueo"
                  style={{ width: "100%", marginTop: "10px" }}
                />
              )}
              <button onClick={handleClosePopup} style={{ marginTop: "10px" }}>Cerrar</button>
            </div>
          </>
        )}
      </div>

      <div>

    <button onClick={() => setShowReportPopup(true)} style={{ marginBottom: "20px" }}>
      Reportar incidente
    </button>

    {/* reportar un incidente */}
    {showReportPopup && (
      <>
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 999,
          }}
          onClick={() => setShowReportPopup(false)}
        />
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            padding: "20px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            zIndex: 1000,
            width: "400px",
          }}
        >
          <h3>Reportar Incidente</h3>
          <div style={{ marginBottom: "10px" }}>
            <label>Detalle:</label>
            <textarea
              name="detalle"
              value={reportData.detalle}
              onChange={handleReportChange}
              rows="3"
              style={{ width: "100%" }}
            ></textarea>
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label>Foto:</label>
            <input type="file" name="foto" onChange={handleFileChange} />
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label>Latitud:</label>
            <input
              type="text"
              name="latitud"
              value={reportData.latitud}
              onChange={handleReportChange}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label>Longitud:</label>
            <input
              type="text"
              name="longitud"
              value={reportData.longitud}
              onChange={handleReportChange}
              style={{ width: "100%" }}
            />
          </div>
          <button onClick={handleReportSubmit} style={{ marginRight: "10px" }}>
            Enviar
          </button>
          <button onClick={() => setShowReportPopup(false)}>Cancelar</button>
        </div>
      </>
    )}
  </div>
    </div>
  );
};

export default Map;
