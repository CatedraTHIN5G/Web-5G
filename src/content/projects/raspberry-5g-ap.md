---
title: "Raspberry Pi as 5G Laboratory Gateway"
title_es: "Raspberry Pi como Punto de Acceso 5G"
summary: "A comprehensive guide on configuring a Raspberry Pi 4 to function as a 5G Gateway for the laboratory network. This project covers the setup of Ethernet or WiFi bridging to provide high-speed 5G internet access to other devices, effectively turning the RPi into a versatile 5G router."
summary_es: "Guía completa para configurar una Raspberry Pi 4 como pasarela 5G de laboratorio. El proyecto abarca la configuración de puentes Ethernet o WiFi para proporcionar acceso a Internet 5G de alta velocidad a otros dispositivos, convirtiendo la RPi en un router 5G versátil."
tags: ["5G", "Raspberry Pi", "IoT", "Networking", "Linux"]
tags_es: ["5G", "Raspberry Pi", "IoT", "Redes", "Linux"]
date: 2024-02-01
docUrl: "/assets/docs/THIN5G MODULO 5G RASPBERRY PI.pdf"
codeUrl: "/assets/code/raspberry-5g-setup.sh"
team: ["estudiante-daniel-solares-ardisana"]
---

## Project Description

This project details the technical configuration for implementing a **Raspberry Pi 4** as a 5G Gateway for the laboratory network. This architecture provides broadband connectivity to external devices via Ethernet or WiFi interfaces, routing all traffic through an industrial Quectel RM502QA 5G modem.

The system acts as a transparent network bridge, facilitating the integration of IoT equipment and experimental setups that lack native 5G connectivity.

<br />

## System Requirements

Successful implementation of this project requires the following hardware and software:

*   **Hardware**: Raspberry Pi 4, 5G Module (Quectel RM502QA) with USB 3.0 adapter or HAT, Provisioned SIM card.
*   **Software**: Raspberry Pi OS (Debian-based).
*   **Network Packages**: `dnsmasq` for DHCP/DNS services, `hostapd` for access point management, and `iptables` for network address translation (NAT).

<br />

## Implementation Procedure

### 1. Environment Preparation

The first step involves updating repositories and installing essential utilities for network management and serial communication.

```bash
sudo apt update && sudo apt install -y dnsmasq hostapd iptables minicom
```

Enable the `hostapd` service to ensure it starts on system boot:

```bash
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
```

### 2. 5G Modem Configuration

Modem initialization is performed via AT commands over the serial port. Use `minicom` to establish a connection with the device (typically at `/dev/ttyUSB2`):

```bash
minicom -D /dev/ttyUSB2 -b 115200
```

**Configuration Command Sequence:**

1.  Status verification:
    ```bash
    AT
    ```
2.  Enable Ethernet Mode (ECM):
    ```bash
    AT+QCFG="usbnet",1
    ```
3.  APN Configuration:
    ```bash
    AT+CGDCONT=1,"IP","oai.ipv4"
    ```
    *(Note: Replace "oai.ipv4" with the APN corresponding to your private or public 5G network)*

4.  Module Reboot:
    ```bash
    AT+CFUN=1,1
    ```

After reboot, verify via `ifconfig` that the `usb0` interface has obtained a valid IP address (e.g., `192.168.225.x`):

```bash
ifconfig
```

### 3. WiFi Access Point Configuration

Edit the `/etc/hostapd/hostapd.conf` file:

```bash
sudo nano /etc/hostapd/hostapd.conf
```

Define the wireless network parameters. Using WPA2 encryption is recommended to ensure security.

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

Ensure this configuration file is linked in `/etc/default/hostapd` by setting the `DAEMON_CONF` variable:

```bash
DAEMON_CONF="/etc/hostapd/hostapd.conf"
```

### 4. Address Management and Network Bridge

To unify network interfaces and simplify routing, a network bridge (`br0`) is configured to group the wireless (`wlan0`) and wired (`eth0`) interfaces.

Edit the network configuration or execute the following commands to establish the bridge:

```bash
sudo ip link add name br0 type bridge
sudo ip address add dev br0 192.168.10.1/24
sudo ip link set wlan0 master br0
sudo ip link set eth0 master br0
sudo ip link set br0 up
```

DHCP Service (`dnsmasq`): Configure the address assignment range for clients connected to the bridge in `/etc/dnsmasq.conf`:

```ini
dhcp-range=interface:br0,192.168.10.2,192.168.10.10,255.255.255.0,24h
```

### 5. Routing and NAT

To allow Internet access, IP packet forwarding must be enabled, and network address translation (NAT) rules configured so that outgoing traffic uses the 5G modem interface (`usb0`).

1.  Enable forwarding in `/etc/sysctl.conf`:

    ```ini
    net.ipv4.ip_forward=1
    ```
2.  Apply firewall rules:

```bash
# Allow traffic between local bridge and 5G interface
sudo iptables -A FORWARD -i br0 -o usb0 -j ACCEPT
sudo iptables -A FORWARD -i usb0 -o br0 -m state --state ESTABLISHED,RELATED -j ACCEPT

# Masquerade outgoing traffic
sudo iptables -t nat -A POSTROUTING -o usb0 -j MASQUERADE
```

Once network services are restarted, the Raspberry Pi will operate as a fully functional 5G router.

