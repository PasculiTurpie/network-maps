import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';

export default function MapMonitor() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Consultar al Backend en Node.js cada 10 segundos para refrescar las métricas
  useEffect(() => {
    const fetchDevices = () => {
      fetch('http://localhost:5000/api/devices')
        .then(res => res.json())
        .then(data => {
          // =================================================================
          // CONSOLE.LOG PARA INSPECCIONAR LOS DATOS DE MONGO EN EL NAVEGADOR
          // =================================================================
          console.log("=== DATOS ACTUALES DESDE MONGODB ===");
          console.log(`Total de equipos encontrados: ${data.length}`);
          console.log(data); // Muestra una hermosa tabla con el inventario en la consola

          setDevices(data);
        })
        .catch(err => console.error("Error cargando dispositivos desde el backend:", err));
    };

    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);
  return (
    <APIProvider apiKey={"AIzaSyAHa2Lu3XyxguEZTG0VSrbbK72fLOJD9q4"}>
      <div style={{ height: '100vh', width: '100%' }}>
        <Map
          defaultZoom={13}
          defaultCenter={{ lat: -39.8142, lng: -73.2459 }} // Ubicación por defecto (Valdivia)
          mapId={"b02d45ea1937851cb7baf7b9"}
        >
          {devices && devices.map(device => {
            // 1. BLINDAJE DE COORDENADAS: Forzamos la conversión a números flotantes puros
            const latitude = Number(device.lat);
            const longitude = Number(device.lng);

            // Si las coordenadas guardadas son inválidas, omitimos el nodo de forma segura
            if (isNaN(latitude) || isNaN(longitude)) {
              return null;
            }

            // 2. CONTROL DE ALERTAS VISUALES POR COLOR
            let pinColor = "#119122"; // Verde = Online y Operando OK

            if (device.status === 'offline') {
              pinColor = "#861003"; // Rojo = Alerta, equipo caído o Timeout SNMP
            } else if (device.metrics && device.metrics.temperature > 65) {
              pinColor = "#fc9d05"; // Naranja = Advertencia por temperatura elevada
            }

            return (
              <React.Fragment key={device._id}>

                {/* MARCADOR AVANZADO GEOGRÁFICO */}
                <AdvancedMarker
                  position={{ lat: latitude, lng: longitude }}
                  onClick={() => setSelectedDevice(device)}
                  collisionBehavior={"REQUIRED"} // Evita que Google Maps oculte el pin por textos o colisiones
                >
                  {/* Pin circular estilizado en HTML puro */}
                  <div style={{
                    backgroundColor: pinColor,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '3px solid #ffffff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    cursor: 'pointer',
                    transform: 'translate(-50%, -50%)',
                    transition: 'transform 0.1s ease',
                  }}
                    onMouseEnter={(e) => e.target.style.transform = 'translate(-50%, -50%) scale(1.2)'}
                    onMouseLeave={(e) => e.target.style.transform = 'translate(-50%, -50%) scale(1.0)'}
                  />
                </AdvancedMarker>

                {/* VENTANA FLOTANTE DE INFORMACIÓN TÉCNICA (INFO WINDOW) */}
                {selectedDevice && selectedDevice._id === device._id && (
                  <InfoWindow
                    position={{ lat: latitude, lng: longitude }}
                    headerDisabled={true} // Desactivamos la cabecera nativa para usar nuestro botón HTML
                  >
                    <div style={{
                      color: '#333',
                      fontFamily: '"Segoe UI", Roboto, sans-serif',
                      padding: '5px',
                      minWidth: '220px',
                      maxWidth: '260px',
                      position: 'relative'
                    }}>

                      {/* BOTÓN DE CIERRE PERSONALIZADO */}
                      <button
                        onClick={() => setSelectedDevice(null)}
                        style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-2px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          fontSize: '16px',
                          color: '#95a5a6',
                          cursor: 'pointer',
                          padding: '4px',
                          fontWeight: 'bold',
                          lineHeight: '1',
                          zIndex: 10
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#e74c3c'}
                        onMouseLeave={(e) => e.target.style.color = '#95a5a6'}
                      >
                        ✕
                      </button>

                      {/* DATOS DE IDENTIFICACIÓN */}
                      <h4 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '15px', borderBottom: '1px solid #f2f4f4', paddingBottom: '4px', paddingRight: '20px' }}>
                        {device.deviceId}
                      </h4>

                      <p style={{ margin: '6px 0', fontSize: '11px', backgroundColor: '#eaedf1', padding: '5px 8px', borderRadius: '4px', color: '#2c3e50', lineHeight: '1.4' }}>
                        📍 <b>Ubicación:</b> {device.location || 'Sin dirección registrada'}
                      </p>

                      <p style={{ margin: '4px 0', fontSize: '12px' }}><b>IP:</b> <code>{device.ip}</code></p>

                      <p style={{ margin: '4px 0', fontSize: '12px' }}>
                        <b>Estado:</b>{' '}
                        <span style={{
                          color: device.status === 'online' ? '#2ecc71' : '#e74c3c',
                          fontWeight: 'bold'
                        }}>
                          {device.status.toUpperCase()}
                        </span>
                      </p>

                      {/* SECCIÓN DE MÉTRICAS ADAPTATIVA */}
                      {device.status === 'online' && device.metrics ? (
                        <div style={{ borderTop: '1px solid #f2f4f4', marginTop: '10px', paddingTop: '8px' }}>
                          <p style={{ margin: '4px 0', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>🌡️ T° CPU:</span> <b>{device.metrics.temperature ?? 'N/A'}°C</b>
                          </p>
                          <p style={{ margin: '4px 0', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>🌀 Ventilador:</span> <b>{device.metrics.fanSpeed ?? 'N/A'} RPM</b>
                          </p>
                          <p style={{ margin: '4px 0', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>🧠 RAM Libre:</span> <b>{device.metrics.ramAvailable ?? 'N/A'} MB</b>
                          </p>
                        </div>
                      ) : (
                        <div style={{
                          borderTop: '1px solid #f2f4f4',
                          marginTop: '10px',
                          paddingTop: '8px',
                          color: '#7f8c8d',
                          fontSize: '11px',
                          fontStyle: 'italic',
                          textAlign: 'center'
                        }}>
                          ⚠️ Agente inaccesible. Verifique cableado o servicio SNMP.
                        </div>
                      )}

                    </div>
                  </InfoWindow>
                )}
              </React.Fragment>
            );
          })}
        </Map>
      </div>
    </APIProvider>
  );
}