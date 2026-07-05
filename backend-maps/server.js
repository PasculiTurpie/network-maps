const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const snmp = require("net-snmp");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// =============================================================================
// 1. CONEXIÓN A BASE DE DATOS (MONGODB)
// =============================================================================
mongoose
  .connect("mongodb://127.0.0.1:27017/monitoring_db")
  .then(() => console.log("Conectado a MongoDB con éxito."))
  .catch((err) => console.error("Error al conectar a MongoDB:", err));

// Esquema de la colección de dispositivos
const DeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  ip: { type: String, required: true },
  comunidad: { type: String, default: "comunidad_monitoreo" },
  location: { type: String, required: true }, // Campo de texto para la ubicación física
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  status: { type: String, default: "offline" },
  metrics: {
    temperature: Number,
    fanSpeed: Number,
    ramAvailable: Number,
  },
  lastUpdated: { type: Date, default: Date.now },
});

const Device = mongoose.model("Device", DeviceSchema);

// =============================================================================
// 2. LÓGICA CORE: CONSULTA SNMP SEGURA POR OID NUMÉRICO ABSOLUTO
// =============================================================================

// Función auxiliar: Consulta SNMP unificada mediante OIDs numéricos directos de nsExtendOutput1Line
// Función auxiliar: Consulta SNMP unificada mediante getNext para resolver índices dinámicos
const consultarEquipoSNMP = (device) => {
  return new Promise((resolve) => {
    const session = snmp.createSession(device.ip, device.comunidad, { 
      version: snmp.Version2c, 
      timeout: 2500,
      retries: 0 
    });
    
    // Apuntamos a la raíz de la OID de cada extensión.
    // getNext le pedirá a la Raspberry Pi que complete la OID dinámicamente.
    const oids = [
      "1.3.6.1.4.1.8072.1.3.2.4.1.2.7.99.112.117.116.101.109.112",       // Raíz de cputemp
      "1.3.6.1.4.1.8072.1.3.2.4.1.2.8.102.97.110.115.112.101.101.100",   // Raíz de fanspeed
      "1.3.6.1.4.1.8072.1.3.2.4.1.2.13.114.97.109.100.105.115.112.111.110.105.98.108.101" // Raíz de ramdisponible
    ];

    // .getNext es el estándar de la industria para leer tablas indexadas sin conocer el MIB exacto
    session.getNext(oids, (error, varbinds) => {
      let result = { status: 'offline', metrics: null };

      if (!error && varbinds && varbinds.length === 3) {
        // Verificamos que no haya errores de Varbind devueltos por la Pi
        const hasError = varbinds.some(vb => snmp.isVarbindError(vb) || !vb.value);

        if (!hasError) {
          result.status = 'online'; 
          result.metrics = {
            temperature: parseFloat(varbinds[0].value.toString().trim()) || 0,
            fanSpeed: parseInt(varbinds[1].value.toString().trim()) || 0,
            ramAvailable: parseInt(varbinds[2].value.toString().trim()) || 0
          };
          console.log(`\x1b[32m[SNMP OK]\x1b[0m Nodo ${device.deviceId} (${device.ip}) actualizado con éxito. T°: ${result.metrics.temperature}°C`);
        } else {
          console.warn(`\x1b[33m[SNMP WARN]\x1b[0m Respuestas fuera de rango o vacías para ${device.deviceId}.`);
        }
      } else {
        console.error(`\x1b[31m[SNMP OFFLINE]\x1b[0m Inaccesible ${device.deviceId} (${device.ip}): ${error ? error.message : 'Timeout o respuesta incompleta'}`);
      }

      session.close();
      resolve(result);
    });
  });
};

// Función principal: Escanea todos los dispositivos en paralelo cada 15 segundos
const pollDevices = async () => {
  try {
    const devices = await Device.find({});

    // Mapeamos los dispositivos a promesas de ejecución simultánea en paralelo
    const mapeoPromesas = devices.map(async (device) => {
      const snmpData = await consultarEquipoSNMP(device);

      // Escribimos directamente el resultado en el documento correspondiente de Mongo
      return Device.updateOne(
        { _id: device._id },
        {
          $set: {
            status: snmpData.status,
            metrics: snmpData.metrics,
            lastUpdated: new Date(),
          },
        },
      );
    });

    // Lanza todas las llamadas UDP al mismo tiempo en paralelo
    await Promise.all(mapeoPromesas);
    console.log(
      `[POLLING] Sincronización masiva completada para ${devices.length} nodos.`,
    );
  } catch (err) {
    console.error("Error crítico en el daemon de escaneo:", err.message);
  }
};

// Ejecución inicial del sondeo automático y bucle repetitivo cada 15 segundos
pollDevices();
setInterval(pollDevices, 15000);

// =============================================================================
// 3. RUTAS / ENDPOINTS DE LA API REST
// =============================================================================

// GET: Obtener todos los dispositivos para pintarlos en el mapa de React
app.get("/api/devices", async (req, res) => {
  try {
    const devices = await Device.find({});
    res.json(devices);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error al obtener los dispositivos de la BD." });
  }
});

// POST: Registrar un nuevo dispositivo (Manual o Carga Masiva Excel/CSV)
app.post("/api/devices", async (req, res) => {
  try {
    const { deviceId, ip, comunidad, location, lat, lng } = req.body;

    // Validaciones básicas de campos requeridos
    if (
      !deviceId ||
      !ip ||
      !location ||
      lat === undefined ||
      lng === undefined
    ) {
      return res
        .status(400)
        .json({ error: "Faltan parámetros obligatorios para el registro." });
    }

    // Buscamos si existe para actualizarlo (upsert) o creamos uno nuevo de forma limpia
    const dispositivoActualizado = await Device.findOneAndUpdate(
      { deviceId },
      { deviceId, ip, comunidad, location, lat: Number(lat), lng: Number(lng) },
      { upsert: true, new: true },
    );

    res.status(201).json(dispositivoActualizado);
  } catch (err) {
    console.error("Error guardando el dispositivo:", err.message);
    res
      .status(500)
      .json({ error: "Error interno del servidor al almacenar en MongoDB." });
  }
});

// DELETE: Eliminar un equipo del inventario por su ID
app.delete("/api/devices/:id", async (req, res) => {
  try {
    const result = await Device.findByIdAndDelete(req.params.id);
    if (!result)
      return res.status(404).json({ error: "El dispositivo no existe." });
    res.json({ message: "Dispositivo eliminado con éxito del monitoreo." });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar el dispositivo." });
  }
});

// =============================================================================
// 4. ARRANQUE DEL SERVIDOR
// =============================================================================
app.listen(PORT, () => {
  console.log(`Servidor de Monitoreo corriendo en el puerto ${PORT}`);
});
