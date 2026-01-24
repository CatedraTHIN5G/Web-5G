---
title: "Raspberry Pi Wireguard Tunnel"
title_es: "Túnel Wireguard con dos Raspberry Pi"
summary: "Setting up a secure tunnel between two Raspberry Pis using Wireguard to bridge networks."
summary_es: "Configuración de un túnel seguro entre dos Raspberry Pi utilizando Wireguard para interconectar redes."
tags: ["Raspberry Pi", "Wireguard", "Networking", "VPN", "Linux"]
tags_es: ["Raspberry Pi", "Wireguard", "Redes", "VPN", "Linux"]
date: 2024-02-15
docUrl: ""
codeUrl: ""
team: ["estudiante-daniel-solares-ardisana"]
---

## Descripción del Proyecto

El objetivo inicial de esta idea era crear un túnel para conectar dos Raspberry Pi a través de la red 5G del laboratorio. Desgraciadamente, y tras varios intentos, parece ser que la red 5G (o los módulos Quectel conectados a la Raspberry) no permiten la comunicación entre dispositivos "locales". Por ello, configuraremos el túnel por WiFi, y si en un futuro el problema se solucionara, tan solo sería necesario cambiar las interfaces e IPs correspondientes al Router Laboratorio.

Cada Raspberry tendrá una IP para el túnel y otra asignada por el Router del laboratorio. Además, podremos conectar dispositivos al puerto Ethernet de cualquiera de las Raspberry y tendrá conectividad con los dispositivos conectados al puerto Ethernet de la otra Raspberry.

<br />

## Programas Necesarios

Necesitaremos: `iptables` (un firewall para redirigir el tráfico), `dnsmasq` (para el servidor DHCP en las interfaces ethernet) y `wireguard` (para la creación del túnel).

Los instalamos con:

```bash
sudo apt install iptables dnsmasq wireguard -y
```

<br />

## IPs Estáticas y DHCP en ETH0

Empecemos por asignar IPs estáticas a los puertos `eth0` de ambas Raspberry.

Abrimos el archivo de configuración correspondiente:

```bash
cd
sudo nano /etc/dhcpcd.conf
```

Al final del mismo, copiamos (para el caso de RPI1):

```properties
interface eth0
static ip_address=192.168.11.1/28
```

Ahora configuraremos `dnsmasq` para que la Raspberry asigne IPs a los dispositivos conectados a su puerto Ethernet vía DHCP.

Para ello:

```bash
cd
sudo nano /etc/dnsmasq.conf
```

Y al principio, copiamos (para el caso de RPI1):

```properties
dhcp-range=interface:eth0,192.168.11.2,192.168.11.14,255.255.255.240,24h
```

Esto le indica a `dnsmasq` que las IPs asignadas en la interfaz `eth0` han de estar entre `192.168.11.2` y `192.168.11.14`, con un lease time de 24 horas.

Ahora, reiniciamos `dnsmasq` y `dhcpcd` para que la configuración tenga efecto:

```bash
sudo sysctl restart dnsmasq dhcpcd
```

Podemos comprobar que todo ha salido bien si al conectar un ordenador a una de las Raspberry vía Ethernet se nos asigna una IP en el rango elegido y la puerta de enlace predeterminada es (en este caso) `192.168.11.1`.

<br />

## Creación del Túnel

En la propia página de [Wireguard](https://www.wireguard.com/quickstart/), hay una guía sobre como usar el servicio. No obstante, detallamos los pasos aquí para nuestro caso.

Wireguard utiliza una clave pública y una privada para cada "peer" (cada Raspberry). Creamos una clave privada en RPI1 y RPI2 con:

```bash
sudo wg genkey > /etc/rpi/Desktop/private
```

Un nuevo archivo aparecerá en el escritorio con la clave. Ahora debemos crear la interfaz `wg0`, asignarle la IP correspondiente, indicar qué clave ha de usar y en qué puerto estará el servicio.

Para RPI1:

```bash
sudo ip link add wg0 type wireguard
sudo ip addr add 10.0.0.1/24 dev wg0
sudo wg set wg0 private-key /etc/rpi/Desktop/private
sudo wg set wg0 listen-port 51820
ip link set wg0 up
```

Para RPI2 el procedimiento sería el mismo, cambiando el comando de la segunda línea para utilizar `10.0.0.2/24`.

Si ahora utilizamos el comando:

```bash
ip addr
```

...deberíamos ver la interfaz `wg0` con la IP que hayamos configurado. Además, podemos utilizar el comando:

```bash
sudo wg
```

...recibiremos por pantalla las claves que está utilizando la interfaz, así como el puerto en el que el servicio está escuchando.

Guardamos la clave pública de cada Raspberry, pues las necesitaremos para decirle a cada Raspberry cómo encriptar el tráfico que mande a la otra Raspberry.

Por ejemplo, en RPI1:

```bash
sudo wg set wg0 peer clave_pública_de_RPI2 allowed-ips 10.0.0.2/24,192.168.22.0/24 endpoint 192.168.1.213:51820
```

En RPI2:

```bash
sudo wg set wg0 peer clave_pública_de_RPI1 allowed-ips 10.0.0.1/24,192.168.11.0/24 endpoint 192.168.1.162:51820
```

Si ahora hacemos un ping desde RPI1 a `10.0.0.2`, y todo ha salido bien, tendremos respuesta.

### Herramienta wg-quick

Para facilitar el proceso descrito anteriormente tras un reinicio, Wireguard incluye una herramienta llamada `wg-quick`, que permite iniciar interfaces a partir de un archivo de configuración (y también borrarlas).

Para utilizarla, creamos un archivo con el nombre de la interfaz en `/etc/wireguard/`:

```bash
sudo nano /etc/wireguard/wg0.conf
```

En él escribimos lo siguiente (ejemplo para RPI1):

```ini
[Interface]
PrivateKey = clave_privada_de_RPI1
Address = 10.0.0.1/24
PostUp = iptables -A FORWARD -i wg0 -o eth0 -j ACCEPT; iptables -A FORWARD -i eth0 -o wg0 -j ACCEPT;
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -i eth0 -o wg0 -j ACCEPT;
ListenPort = 51820

[Peer]
PublicKey = clave_pública_de_RPI2
AllowedIPs = 10.0.0.2/32, 192.168.22.0/28
Endpoint = 192.168.1.213:51820
```

Ahora, con el simple comando:

```bash
wg-quick up wg0
```

...podemos activar el túnel. Para desactivarlo, solo necesitamos usar:

```bash
wg-quick down wg0
```

