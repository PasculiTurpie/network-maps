import React from 'react';

export default function Navbar({ activeTab, setActiveTab, deviceCount }) {
  // Configuración de los botones de navegación
  const navItems = [
    { id: 'map', label: '🗺️ Mapa en Tiempo Real' },
    { id: 'register', label: '⚙️ Inventario y Carga Masiva' },
    { id: 'dashboard', label: '📊 Panel de Alertas' }
  ];

  return (
    <nav style={{
      backgroundColor: '#2c3e50',
      padding: '0 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      fontFamily: '"Segoe UI", Roboto, sans-serif',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      height: '60px'
    }}>
      {/* SECCIÓN LOGO / TÍTULO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>📡</span>
        <h1 style={{
          color: '#ffffff',
          margin: 0,
          fontSize: '18px',
          fontWeight: 'bold',
          letterSpacing: '0.5px'
        }}>
          SNMP Map Monitor <span style={{ fontSize: '12px', color: '#bdc3c7', fontWeight: 'normal' }}>v1.0</span>
        </h1>
      </div>

      {/* BOTONES DE NAVEGACIÓN */}
      <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                backgroundColor: 'transparent',
                color: isActive ? '#3498db' : '#ecf0f1',
                border: 'none',
                borderBottom: isActive ? '3px solid #3498db' : '3px solid transparent',
                padding: '0 20px',
                height: '100%',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: isActive ? 'bold' : '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.target.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.target.style.color = '#ecf0f1';
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* RESUMEN DE ESTADO RÁPIDO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{
          backgroundColor: '#34495e',
          color: '#ffffff',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '6px',
          border: '1px solid #1a252f'
        }}>
          Nodos: <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>{deviceCount}</span>
        </div>
      </div>
    </nav>
  );
}