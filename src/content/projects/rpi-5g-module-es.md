---
title: "Conexión de Módulo 5G Raspberry Pi"
title_es: "Conexión de Módulo 5G Raspberry Pi"
summary: "Detailed guide for connecting and configuring a Quectel 5G LTE module via mini PCIe on Raspberry Pi using QMI mode."
summary_es: "Guía detallada para conectar y configurar un módulo Quectel 5G LTE vía mini PCIe en Raspberry Pi usando modo QMI."
tags: ["Raspberry Pi", "5G", "Quectel", "Networking", "QMI"]
tags_es: ["Raspberry Pi", "5G", "Quectel", "Redes", "QMI"]
date: 2024-03-20
docUrl: ""
codeUrl: ""
team: ["estudiante-jairo-tunon-diaz"]
---

## 0. Material Necesario

*   Una **Raspberry Pi 4** y un **Compute Module 4** (con una placa portadora con una ranura mini PCIe).
*   Un módem mini PCI Express 5G LTE. Se ha utilizado un **Quectel EC25-A**.
*   Una tarjeta SIM con un plan de datos 5G registrada en la red del laboratorio de la cátedra.

<br />

## 1. Configuración Inicial Raspberry Pi

Lo primero es comprobar que la Raspberry Pi reconoce el módulo USB con el módem. Con el siguiente comando mostramos la información sobre los dispositivos USB conectados al sistema:

```bash
lsusb
```

Salida de ejemplo:

```text
starg@raspberrypi:lsusb
Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 001 Device 004: ID 0000:3825 USB OPTICAL MOUSE
```

Con la siguiente instrucción mostramos la topología de los buses USB en forma de árbol jerárquico:

```bash
lsusb -t
```

Salida esperada donde se observa el driver `qmi_wwan`:

```text
/: Bus 02.Port 1: Dev 1, Class=root_hub, Driver=xhci_hcd/4p, 5000M
 |__ Port 1: Dev 2, If 4, Class=Vendor Specific Class, Driver=qmi_wwan, 5000M
```

Una vez hemos comprobado que el módulo está conectado y ha sido reconocido por la Raspberry Pi, revisamos los registros del núcleo:

```bash
dmesg | grep qmi
```

Salida:

```text
[605.039758] qmi_wwan 2-1:1.4: cdc-wdm0: USB WDM device
[605.042129] qmi_wwan 2-1:1.4 wwan0: register 'qmi_wwan' at usb-0000:01:00.0-1, WWAN/QMI device
```

### Identificación del dispositivo

Podemos comprobar nuestro dispositivo que está catalogado como `cdc-wdm0`:

```bash
ls /dev/cdc*
```

Salida: `/dev/cdc-wdm0`

De todos modos, la tarjeta debe aparecer automáticamente como una interfaz de red `wwan`, por lo general `wwan0`. Podemos comprobar la información detallada de todas las interfaces:

```bash
ip a
```

Deberías ver la interfaz `wwan0`:

```text
4: wwan0: <POINTOPOINT,MULTICAST,NOARP> mtu 1500 qdisc noop state DOWN
group default qlen 1000
 link/none
```

La interfaz `wwan0` no tiene ninguna IP asociada porque no está configurado el módem.

Para comprobar la interfaz se puede realizar un ping a una dirección conocida y comprobar que **no funciona** todavía:

```bash
ping -I wwan0 www.google.com -c 5
```

<br />

## 2. Configuración Modo QMI

Lo primero es instalar algunas librerías para interactuar con el módem a través de QMI:

```bash
sudo apt update && sudo apt install libqmi-utils udhcpc
```

A continuación, se comprueba el modo de funcionamiento del módem:

```bash
sudo qmicli -d /dev/cdc-wdm0 --dms-get-operating-mode
```

Si todo ha sido correcto:

```text
[/dev/cdc-wdm0] Operating mode retrieved
Mode: ‘online’
HW restricted: ‘no’
```

A continuación se debe establecer la interfaz en modo `raw_ip`:

```bash
sudo ip link set wwan0 down
echo 'Y' | sudo tee /sys/class/net/wwan0/qmi/raw_ip
sudo ip link set wwan0 up
```

### Confirmación del modo raw-ip

Confirma que está en modo raw-ip con el siguiente comando:

```bash
sudo qmicli -d /dev/cdc-wdm0 --wda-get-data-format
```

Salida esperada: `Link Layer protocol: ‘raw-ip’`

### Conexión a la red 5G

Por último, nos conectamos a la red asociada a la tarjeta SIM. En la red 5G de la cátedra el APN es `oai.ipv4`.

```bash
sudo qmicli -p -d /dev/cdc-wdm0 --device-open-net='net-raw-ip|net-no-qos-header' --wds-start-network="apn='oai.ipv4',ip-type=4" --client-no-release-cid
```

Salida exitosa:

```text
Network started
Packet data handle: 4003082416
Service: 'wds'
CID: '15'
```

Para obtener la dirección IP y el resto de parámetros de la red:

```bash
sudo udhcpc -q -f -i wwan0
```

Si comprobamos con `ifconfig`, la interfaz `wwan0` aparecerá activa con IP asignada. Ahora el ping funciona correctamente:

```bash
ping -I wwan0 www.google.com -c 5
```

### Uso exclusivo de 5G

Podemos desactivar la conexión WiFi:

```bash
sudo ifconfig wlan0 down
```

Tras un reinicio, es necesario volver a ejecutar la secuencia de comandos de conexión.

<br />

## 3. Configuración Reconexión Automática

Para que la Raspberry Pi se conecte automáticamente a la red 5G, creamos un archivo de interfaz:

```bash
sudo nano /etc/network/interfaces.d/wwan0
```

Contenido:

```bash
iface wwan0 inet manual
 pre-up ifconfig wwan0 down
 pre-up echo Y > /sys/class/net/wwan0/qmi/raw_ip
 pre-up for _ in $(seq 1 10); do /usr/bin/test -c /dev/cdc-wdm0 && break; /bin/sleep 1; done
 pre-up for _ in $(seq 1 10); do /usr/bin/qmicli -d /dev/cdc-wdm0 --nas-get-signal-strength && break; /bin/sleep 1; done
 pre-up sudo qmicli -p -d /dev/cdc-wdm0 --device-open-net='net-raw-ip|net-no-qos-header' --wds-start-network="apn='oai.ipv4',ip-type=4" --client-no-release-cid
 pre-up udhcpc -i wwan0
 post-down /usr/bin/qmi-network /dev/cdc-wdm0 stop
```

*Nota: Asegúrese de incluir usuario y contraseña en el comando qmicli si su SIM lo requiere.*

**Activar conexión:**

```bash
sudo ifup wwan0
```

**Desactivar conexión:**

```bash
sudo ifdown wwan0
```

