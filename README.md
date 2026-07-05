📡 NOC Monitor - Sistema de Monitoreo Geográfico SNMP en Tiempo Real
Este proyecto es un Centro de Operaciones de Red (NOC) interactivo que interroga de forma asíncrona y en paralelo a nodos remotos (Raspberry Pi / Servidores Linux) utilizando el protocolo SNMP. Los datos se centralizan en MongoDB y se empujan instantáneamente hacia un mapa táctico en React utilizando WebSockets (Socket.io).

🛠️ Arquitectura del Sistema
Frontend: React, @vis.gl/react-google-maps (Advanced Markers HTML5), Socket.io-client.

Backend: Node.js, Express, net-snmp (Escaneo asíncrono UDP), Socket.io.

Base de Datos: MongoDB (Persistencia de inventario, coordenadas y estados).

🚀 Requisitos Previos
Asegúrate de tener instalado en tu máquina de desarrollo:

Node.js (v18 o superior)

MongoDB de forma local (Puerto 27017)

📦 Configuración del Nodo Remoto (Raspberry Pi)
En cada dispositivo que desees monitorear en la red local, debes instalar y exponer las métricas de hardware a través del agente SNMP.

Instalar el servicio en la Raspberry Pi:

Bash
sudo apt update && sudo apt install -y snmp snmpd
Configurar las extensiones de telemetría:
Edita el archivo de configuración limpiando su contenido previo:

Bash
sudo nano /etc/snmp/snmpd.conf
Pega las siguientes directivas de red y scripts de extracción de hardware:

Plaintext
# Escuchar peticiones UDP externas en el puerto estándar 161
agentaddress udp:161

# Permitir acceso de lectura a tu subred local (Ejemplo para rango 192.168.5.X)
rocommunity comunidad_monitoreo 192.168.5.0/24

# Mapeo de comandos nativos del sistema para telemetría
extend cputemp /bin/sh -c "cat /sys/class/thermal/thermal_zone0/temp | awk '{print \$1/1000}'"
extend fanspeed /bin/sh -c "echo 2100"
extend ramdisponible /bin/sh -c "free -m | awk '/Mem:/ {print \$7}'"
Habilitar y reiniciar el servicio:

Bash
sudo systemctl enable snmpd
sudo systemctl restart snmpd
💻 Instalación y Despliegue del Proyecto
1. Configuración del Backend
Navega a la carpeta del servidor:

Bash
cd backend-maps
Instala las dependencias necesarias:

Bash
npm install express mongoose cors net-snmp socket.io
Inicia el demonio de monitoreo continuo en paralelo:

Bash
npm run dev
(El backend interrogará a todos los equipos registrados cada 15 segundos en paralelo utilizando Promise.all).

2. Configuración del Frontend
Navega a la carpeta de la interfaz:

Bash
cd frontend-maps
Instala los módulos de Google Maps y WebSockets:

Bash
npm install @vis.gl/react-google-maps socket.io-client
Lanza el servidor de desarrollo:

Bash
npm start
🚦 Estados Visuales del Mapa
El mapa procesa las alteraciones de red de forma reactiva y cambia los pines al instante sin necesidad de refrescar el navegador:

🟢 Verde (#2ecc71): Equipo Online. Respuestas SNMP correctas y estables.

🟡 Naranja (#f39c12): Advertencia de Hardware. Equipo operativo pero con picos de temperatura en la CPU superiores a 65°C.

🔴 Rojo Parpadeante (#e74c3c): Alerta Crítica (Offline). El equipo sufrió un corte de energía, desconexión de red o caída del demonio SNMP (Exceso de timeout UDP).

🔌 Endpoints de la API REST
Para la administración del inventario de dispositivos de red en MongoDB, puedes utilizar las siguientes rutas HTTP:

GET /api/devices ➔ Obtiene la lista completa de nodos con sus últimas métricas mapeadas.

POST /api/devices ➔ Registra o actualiza (upsert) un nodo pasando deviceId, ip, location, lat, lng.

DELETE /api/devices/:id ➔ Remueve un nodo de la base de datos y destruye su marcador del mapa en tiempo real.
