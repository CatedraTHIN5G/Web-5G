---
title: "Raspberry Pi Wireguard Tunnel"
title_es: "Túnel Wireguard con dos Raspberry Pi"
summary: "Implementation of a secure VPN tunnel between two Raspberry Pi devices using Wireguard. This project explores the configuration of encrypted communication channels to bridge networks securely, overcoming limitations of direct device-to-device communication in certain 5G network configurations."
summary_es: "Implementación de un túnel VPN seguro entre dos dispositivos Raspberry Pi utilizando Wireguard. Este proyecto explora la configuración de canales de comunicación cifrados para interconectar redes de forma segura, superando las limitaciones de comunicación directa dispositivo a dispositivo en ciertas configuraciones de red 5G."
tags: ["Raspberry Pi", "Wireguard", "Networking", "VPN", "Linux"]
tags_es: ["Raspberry Pi", "Wireguard", "Redes", "VPN", "Linux"]
date: 2024-02-15
docUrl: ""
codeUrl: ""
team: ["investigador-daniel-solares-ardisana"]
---

## Project Description

The initial goal of this idea was to create a tunnel to connect two Raspberry Pis through the laboratory's 5G network. Unfortunately, after several attempts, it seems that the 5G network (or the Quectel modules connected to the Raspberry Pi) do not allow communication between "local" devices. Therefore, we will configure the tunnel via WiFi, and if the problem is resolved in the future, it would only be necessary to change the interfaces and IPs corresponding to the Laboratory Router.

Each Raspberry Pi will have one IP for the tunnel and another assigned by the laboratory Router. Additionally, we will be able to connect devices to the Ethernet port of either Raspberry Pi and have connectivity with devices connected to the Ethernet port of the other Raspberry Pi.

<br />

## Required Software

We will need: `iptables` (a firewall to redirect traffic), `dnsmasq` (for the DHCP server on ethernet interfaces), and `wireguard` (for tunnel creation).

Install them with:

```bash
sudo apt install iptables dnsmasq wireguard -y
```

<br />

## Static IPs and DHCP on ETH0

Let's start by assigning static IPs to the `eth0` ports of both Raspberry Pis.

Open the corresponding configuration file:

```bash
cd
sudo nano /etc/dhcpcd.conf
```

At the end of it, copy (for the case of RPI1):

```properties
interface eth0
static ip_address=192.168.11.1/28
```

Now we will configure `dnsmasq` so that the Raspberry/Gateway assigns IPs to devices connected to its Ethernet port via DHCP.

To do this:

```bash
cd
sudo nano /etc/dnsmasq.conf
```

And at the beginning, copy (for the case of RPI1):

```properties
dhcp-range=interface:eth0,192.168.11.2,192.168.11.14,255.255.255.240,24h
```

This tells `dnsmasq` that the IPs assigned on the `eth0` interface must be between `192.168.11.2` and `192.168.11.14`, with a lease time of 24 hours.

Now, restart `dnsmasq` and `dhcpcd` for the configuration to take effect:

```bash
sudo sysctl restart dnsmasq dhcpcd
```

We can verify that everything went well if connecting a computer to one of the Raspberry Pis via Ethernet assigns us an IP in the chosen range and the default gateway is (in this case) `192.168.11.1`.

<br />

## Tunnel Creation

On the [Wireguard](https://www.wireguard.com/quickstart/) page itself, there is a guide on how to use the service. However, we detail the steps here for our case.

Wireguard uses a public and private key for each "peer". Create a private key on RPI1 and RPI2 with:

```bash
sudo wg genkey > /etc/rpi/Desktop/private
```

A new file will appear on the desktop with the key. Now we must create the `wg0` interface, assign it the corresponding IP, indicate which key to use, and on which port the service will be.

For RPI1:

```bash
sudo ip link add wg0 type wireguard
sudo ip addr add 10.0.0.1/24 dev wg0
sudo wg set wg0 private-key /etc/rpi/Desktop/private
sudo wg set wg0 listen-port 51820
ip link set wg0 up
```

For RPI2, the procedure would be the same, changing the second line command to use `10.0.0.2/24`.

If we now use the command:

```bash
ip addr
```

...we should see the `wg0` interface with the IP we configured. Additionally, we can use the command:

```bash
sudo wg
```

...we will receive on screen the keys that the interface is using, as well as the port on which the service is listening.

Save the public key of each Raspberry Pi, as we will need them to tell each Raspberry Pi how to encrypt traffic sent to the other.

For example, on RPI1:

```bash
sudo wg set wg0 peer RPI2_public_key allowed-ips 10.0.0.2/24,192.168.22.0/24 endpoint 192.168.1.213:51820
```

On RPI2:

```bash
sudo wg set wg0 peer RPI1_public_key allowed-ips 10.0.0.1/24,192.168.11.0/24 endpoint 192.168.1.162:51820
```

If we now ping from RPI1 to `10.0.0.2`, and everything went well, we will get a response.

### wg-quick Tool

To facilitate the process described above after a reboot, Wireguard includes a tool called `wg-quick`, which allows starting interfaces from a configuration file (and also deleting them).

To use it, create a file with the interface name in `/etc/wireguard/`:

```bash
sudo nano /etc/wireguard/wg0.conf
```

Write the following in it (example for RPI1):

```ini
[Interface]
PrivateKey = RPI1_private_key
Address = 10.0.0.1/24
PostUp = iptables -A FORWARD -i wg0 -o eth0 -j ACCEPT; iptables -A FORWARD -i eth0 -o wg0 -j ACCEPT;
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -i eth0 -o wg0 -j ACCEPT;
ListenPort = 51820

[Peer]
PublicKey = RPI2_public_key
AllowedIPs = 10.0.0.2/32, 192.168.22.0/28
Endpoint = 192.168.1.213:51820
```

Now, with the simple command:

```bash
wg-quick up wg0
```

...we can activate the tunnel. To deactivate it, we only need to use:

```bash
wg-quick down wg0
```

