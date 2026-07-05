import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function AddDeviceForm({ onDeviceAdded }) {
  const [manualDevice, setManualDevice] = useState({
    deviceId: '',
    ip: '',
    comunidad: 'comunidad_monitoreo',
    location: '', // <--- Inicializado vacío
    lat: '',
    lng: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setManualDevice(prev => ({ ...prev, [name]: value }));
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('http://localhost:5000/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualDevice,
          lat: parseFloat(manualDevice.lat),
          lng: parseFloat(manualDevice.lng)
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `¡Equipo "${manualDevice.deviceId}" registrado con éxito!` });
        setManualDevice({ deviceId: '', ip: '', comunidad: 'comunidad_monitoreo', location: '', lat: '', lng: '' });
        if (onDeviceAdded) onDeviceAdded();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al registrar.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión con el backend.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) throw new Error("Archivo vacío.");

        let creados = 0;
        for (const row of jsonData) {
          const deviceId = row.deviceId || row.id || row.Nombre;
          const ip = row.ip || row.IP || row.direccion;
          const location = row.location || row.direccion_texto || row.Ubicacion || row.ubicacion || 'Sin ubicación'; // <--- Mapeo Excel
          const lat = parseFloat(row.lat || row.LAT);
          const lng = parseFloat(row.lng || row.LNG);
          const comunidad = row.comunidad || 'comunidad_monitoreo';

          if (!deviceId || !ip || isNaN(lat) || isNaN(lng)) continue;

          await fetch('http://localhost:5000/api/devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, ip, location, lat, lng, comunidad })
          });
          creados++;
        }

        setMessage({ type: 'success', text: `Carga masiva completada. Se importaron ${creados} equipos.` });
        if (onDeviceAdded) onDeviceAdded();
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const templateData = [
      { deviceId: 'Nodo_Ejemplo_01', ip: '192.168.5.198', location: 'Oficina Central Valdivia', lat: -39.8142, lng: -73.2459, comunidad: 'comunidad_monitoreo' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");
    XLSX.writeFile(workbook, "plantilla_nodos.xlsx");
  };

  return (
    <div style={{ padding: '25px', fontFamily: 'sans-serif', maxWidth: '950px', margin: '20px auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f0f3f4', paddingBottom: '15px', marginBottom: '20px' }}>
        <h2 style={{ color: '#2c3e50', margin: 0, fontSize: '22px' }}>Gestión de Equipos SNMP</h2>
        <button onClick={downloadTemplate} style={{ backgroundColor: '#27ae60', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>📊 Plantilla .xlsx</button>
      </div>

      {message.text && <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '6px', backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee', color: message.type === 'success' ? '#2e7d32' : '#c62828' }}>{message.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '35px' }}>
        <div>
          <h3 style={{ color: '#34495e', marginTop: 0 }}>Alta Individual</h3>
          <form onSubmit={handleManualSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#566573' }}>ID del Dispositivo</label>
              <input type="text" name="deviceId" value={manualDevice.deviceId} onChange={handleInputChange} required placeholder="Ej: RPi_Servidores" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #d5dbdb' }} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#566573' }}>Dirección IP</label>
              <input type="text" name="ip" value={manualDevice.ip} onChange={handleInputChange} required placeholder="Ej: 192.168.5.198" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #d5dbdb' }} />
            </div>

            {/* NUEVO INPUT DE TEXTO PARA LA UBICACIÓN */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#566573' }}>Ubicación / Dirección Física</label>
              <input type="text" name="location" value={manualDevice.location} onChange={handleInputChange} required placeholder="Ej: Campus Centro, Sala 3" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #d5dbdb' }} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#566573' }}>Comunidad String</label>
              <input type="text" name="comunidad" value={manualDevice.comunidad} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #d5dbdb' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#566573' }}>Latitud</label>
                <input type="number" step="any" name="lat" value={manualDevice.lat} onChange={handleInputChange} required placeholder="-39.8142" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #d5dbdb' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#566573' }}>Longitud</label>
                <input type="number" step="any" name="lng" value={manualDevice.lng} onChange={handleInputChange} required placeholder="-73.2459" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #d5dbdb' }} />
              </div>
            </div>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#3498db', color: '#fff', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
              {loading ? 'Guardando...' : 'Registrar Dispositivo'}
            </button>
          </form>
        </div>

        <div style={{ borderLeft: '1px solid #f0f3f4', paddingLeft: '20px' }}>
          <h3 style={{ color: '#34495e', marginTop: 0 }}>Importación Masiva</h3>
          <p style={{ fontSize: '13px', color: '#7f8c8d', lineHeight: '1.5' }}>Asegúrate de agregar la columna <b>location</b> en tu archivo de Excel o CSV antes de arrastrarlo.</p>
          <div style={{ border: '2px dashed #3498db', padding: '40px 20px', textAlign: 'center', borderRadius: '8px', backgroundColor: '#fcfcfc', position: 'relative' }}>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={loading} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            <div>📁</div>
            <span style={{ fontSize: '14px', display: 'block', marginTop: '10px' }}>Arrastra tu archivo aquí</span>
          </div>
        </div>
      </div>
    </div>
  );
}