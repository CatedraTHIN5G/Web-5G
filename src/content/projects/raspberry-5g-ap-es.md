---
title: "Raspberry Pi as 5G Laboratory Gateway"
title_es: "Raspberry Pi como Punto de Acceso 5G"
summary: "Configuring a Raspberry Pi 4 to provide Internet access via the laboratory's 5G network using Ethernet or WiFi bridging."
summary_es: "Configuración de una Raspberry Pi 4 para dar acceso a Internet usando la red 5G del laboratorio mediante Ethernet o WiFi."
tags: ["5G", "Raspberry Pi", "IoT", "Networking", "Linux"]
tags_es: ["5G", "Raspberry Pi", "IoT", "Redes", "Linux"]
date: 2024-02-01
team: ["estudiante-daniel-solares-ardisana"]
---

## Descripción del Proyecto

Este proyecto detalla la configuración técnica para implementar una **Raspberry Pi 4** como puerta de enlace (Gateway) a la red 5G del laboratorio. Esta arquitectura permite dotar de conectividad de banda ancha a dispositivos externos mediante interfaces Ethernet o WiFi, enrutando todo el tráfico a través de un módem 5G industrial Quectel RM502QA.

El sistema actúa como un puente de red transparente, facilitando la integración de equipos IoT y setups experimentales que carecen de conectividad 5G nativa.

<br />

## Requisitos del Sistema

Para la implementación exitosa de este proyecto se requiere el siguiente equipamiento y software:

*   **Hardware**: Raspberry Pi 4, Módulo 5G (Quectel RM502QA) con adaptador USB 3.0 o HAT, Tarjeta SIM provisionada.
*   **Software**: Sistema operativo Raspberry Pi OS (basado en Debian).
*   **Paquetes de Red**: `dnsmasq` para servicios DHCP/DNS, `hostapd` para gestión del punto de acceso, e `iptables` para la traducción de direcciones de red (NAT).

<br />

## Procedimiento de Implementación

### 1. Preparación del Entorno

El primer paso consiste en actualizar los repositorios e instalar las utilidades fundamentales para la gestión de red y comunicación serie.

```bash
sudo apt update && sudo apt install -y dnsmasq hostapd iptables minicom
```

Habilite el servicio `hostapd` para asegurar su ejecución al inicio del sistema:

```bash
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
```

### 2. Configuración del Módem 5G

La inicialización del módem se realiza mediante comandos AT a través del puerto serie. Utilice `minicom` para establecer conexión con el dispositivo (típicamente en `/dev/ttyUSB2`):

```bash
minicom -D /dev/ttyUSB2 -b 115200
```

**Secuencia de comandos de configuración:**

1.  Verificación de estado:
    ```bash
    AT
    ```
2.  Habilitación del modo Ethernet (ECM):
    ```bash
    AT+QCFG="usbnet",1
    ```
3.  Configuración del APN:
    ```bash
    AT+CGDCONT=1,"IP","oai.ipv4"
    ```
    *(Nota: Sustituya "oai.ipv4" por el APN correspondiente a su red 5G privada o pública)*

4.  Reinicio del módulo:
    ```bash
    AT+CFUN=1,1
    ```

Tras el reinicio, verifique mediante `ifconfig` que la interfaz `usb0` ha obtenido una dirección IP válida (ej. `192.168.225.x`):

```bash
ifconfig
```

### 3. Configuración del Punto de Acceso WiFi

Edite el archivo `/etc/hostapd/hostapd.conf`:

```bash
sudo nano /etc/hostapd/hostapd.conf
```

Defina los siguientes parámetros de la red inalámbrica. Se recomienda utilizar encriptación WPA2 para garantizar la seguridad.

```ini
interface=wlan0
ssid=RPIthin5g
wpa_passphrase=catedra5g
hw_mode=g
channel=10
wpa=2
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
```

Asegúrese de vincular este archivo de configuración en `/etc/default/hostapd` estableciendo la variable `DAEMON_CONF`:

```bash
DAEMON_CONF="/etc/hostapd/hostapd.conf"
```

### 4. Gestión de Direcciones y Puente de Red

Para unificar las interfaces de red y simplificar el enrutamiento, se configura un puente de red (`br0`) que agrupa la interfaz inalámbrica (`wlan0`) y la cableada (`eth0`).

Edite la configuración de red o ejecute los siguientes comandos para establecer el puente:

```bash
sudo ip link add name br0 type bridge
sudo ip address add dev br0 192.168.10.1/24
sudo ip link set wlan0 master br0
sudo ip link set eth0 master br0
sudo ip link set br0 up
```

Servicio DHCP (`dnsmasq`): Configure el rango de asignación de direcciones para los clientes conectados al puente en `/etc/dnsmasq.conf`:

```ini
dhcp-range=interface:br0,192.168.10.2,192.168.10.10,255.255.255.0,24h
```

### 5. Enrutamiento y NAT

Para permitir el acceso a Internet, es necesario habilitar el reenvío de paquetes IP y configurar las reglas de traducción de direcciones (NAT) para que el tráfico saliente utilice la interfaz del módem 5G (`usb0`).

1.  Habilite el reenvío en `/etc/sysctl.conf`:

    ```ini
    net.ipv4.ip_forward=1
    ```
2.  Aplique las reglas de firewall:

```bash
# Permitir tráfico entre el puente local y la interfaz 5G
sudo iptables -A FORWARD -i br0 -o usb0 -j ACCEPT
sudo iptables -A FORWARD -i usb0 -o br0 -m state --state ESTABLISHED,RELATED -j ACCEPT

# Enmascarar tráfico saliente
sudo iptables -t nat -A POSTROUTING -o usb0 -j MASQUERADE
```

Una vez reiniciados los servicios de red, la Raspberry Pi operará como un enrutador 5G completo.

