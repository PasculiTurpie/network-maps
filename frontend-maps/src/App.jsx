import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MapMonitor from './components/MapMonitor';
import AddDeviceForm from './components/AddDeviceForm';

export default function App() {
  const [activeTab, setActiveTab] = useState('map'); // Controla la pestaña activa
  const [devices, setDevices] = useState([]);

  // Función global para consultar los dispositivos del backend
  const fetchDevices = () => {
    fetch('http://localhost:5000/api/devices')
      .then(res => res.json())
      .then(data => setDevices(data))
      .catch(err => console.error("Error al sincronizar inventario:", err));
  };

  // Cargar lista inicial al arrancar y configurar sondeo rápido
  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 15000); // Sincroniza cada 15 segundos
    return () => clearInterval(interval);
  }, []);

  // Renderizado Condicional según la pestaña seleccionada en el Navbar
  const renderContent = () => {
    switch (activeTab) {
      case 'map':
        return (
          <div style={{ height: 'calc(100vh - 60px)', width: '100%' }}>
            {/* Le pasamos la lista precargada al mapa para ahorrar requests */}
            <MapMonitor devices={devices} />
          </div>
        );
      case 'register':
        return (
          <div style={{ padding: '20px', backgroundColor: '#f4f6f7', minHeight: 'calc(100vh - 60px)', boxSizing: 'border-box' }}>
            {/* Al agregar un equipo, dispara el refresco de datos inmediato */}
            <AddDeviceForm onDeviceAdded={fetchDevices} />
          </div>
        );
      case 'dashboard':
        return (
          <div style={{ padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f4f6f7', minHeight: 'calc(100vh - 60px)', boxSizing: 'border-box' }}>
            <h2 style={{ color: '#2c3e50', marginTop: 0 }}>Consola de Alertas Globales</h2>
            <p style={{ color: '#7f8c8d', fontSize: '14px' }}>Resumen del estado operativo de los agentes SNMP distribuidos en la infraestructura geográfica.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #2ecc71' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#7f8c8d' }}>NODOS ONLINE</h4>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#2ecc71' }}>
                  {devices.filter(d => d.status === 'online').length}
                </span>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #e74c3c' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#7f8c8d' }}>NODOS OFFLINE</h4>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#e74c3c' }}>
                  {devices.filter(d => d.status === 'offline').length}
                </span>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #e67e22' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#7f8c8d' }}>ALERTAS TÓ CRÍTICA</h4>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#e67e22' }}>
                  {devices.filter(d => d.status === 'online' && d.metrics?.temperature > 65).length}
                </span>
              </div>
            </div>
          </div>
        );
      default:
        return <div style={{ padding: '20px' }}>Vista no encontrada.</div>;
    }
  };

  return (
    <div style={{ margin: 0, padding: 0, minHeight: '100vh', backgroundColor: '#ffffff' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        deviceCount={devices.length}
      />
      {renderContent()}
    </div>
  );
}