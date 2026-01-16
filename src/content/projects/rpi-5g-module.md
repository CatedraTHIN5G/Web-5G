---
title: "Connecting a 5G Module to Raspberry Pi"
title_es: "Conexión de Módulo 5G Raspberry Pi"
summary: "A step-by-step tutorial on integrating the Quectel EC25-A 5G LTE module with a Raspberry Pi using a mini PCIe adapter. The guide explains the hardware connection, driver installation, and QMI mode configuration to establish a stable and high-performance cellular connection."
summary_es: "Tutorial paso a paso sobre la integración del módulo Quectel EC25-A 5G LTE con una Raspberry Pi mediante un adaptador mini PCIe. La guía explica la conexión de hardware, la instalación de controladores y la configuración del modo QMI para establecer una conexión celular estable y de alto rendimiento."
tags: ["Raspberry Pi", "5G", "Quectel", "Networking", "QMI"]
tags_es: ["Raspberry Pi", "5G", "Quectel", "Redes", "QMI"]
date: 2024-03-20
docUrl: ""
codeUrl: ""
team: ["estudiante-jairo-tunon-diaz"]
---

## 0. Required Material

*   A **Raspberry Pi 4** and a **Compute Module 4** (with a carrier board with a mini PCIe slot).
*   A mini PCI Express 5G LTE modem. A **Quectel EC25-A** was used.
*   A SIM card with a 5G data plan registered on the chair's laboratory network.

<br />

## 1. Initial Raspberry Pi Configuration

The first step is to verify that the Raspberry Pi recognizes the USB module with the modem. Using the following command, we show information about the USB devices connected to the system:

```bash
lsusb
```

Example output:

```text
starg@raspberrypi:lsusb
Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 001 Device 004: ID 0000:3825 USB OPTICAL MOUSE
```

With the following instruction, we show the topology of the USB buses in a hierarchical tree form:

```bash
lsusb -t
```

Expected output where the `qmi_wwan` driver is observed:

```text
/: Bus 02.Port 1: Dev 1, Class=root_hub, Driver=xhci_hcd/4p, 5000M
 |__ Port 1: Dev 2, If 4, Class=Vendor Specific Class, Driver=qmi_wwan, 5000M
```

Once we have verified that the module is connected and recognized by the Raspberry Pi, checking the kernel logs:

```bash
dmesg | grep qmi
```

Output:

```text
[605.039758] qmi_wwan 2-1:1.4: cdc-wdm0: USB WDM device
[605.042129] qmi_wwan 2-1:1.4 wwan0: register 'qmi_wwan' at usb-0000:01:00.0-1, WWAN/QMI device
```

### Device Identification

We can verify our device which is cataloged as `cdc-wdm0`:

```bash
ls /dev/cdc*
```

Output: `/dev/cdc-wdm0`

In any case, the card should automatically appear as a network interface `wwan`, usually `wwan0`. We can check detailed information of all network interfaces:

```bash
ip a
```

You should see the `wwan0` interface:

```text
4: wwan0: <POINTOPOINT,MULTICAST,NOARP> mtu 1500 qdisc noop state DOWN
group default qlen 1000
 link/none
```

The `wwan0` interface has no IP associated because the modem is not configured.

To check the interface, you can ping a known address and check that it **does not work** yet:

```bash
ping -I wwan0 www.google.com -c 5
```

<br />

## 2. QMI Mode Configuration

First, install some libraries to interact with the modem via QMI:

```bash
sudo apt update && sudo apt install libqmi-utils udhcpc
```

Next, check the modem's operating mode:

```bash
sudo qmicli -d /dev/cdc-wdm0 --dms-get-operating-mode
```

If everything is correct:

```text
[/dev/cdc-wdm0] Operating mode retrieved
Mode: ‘online’
HW restricted: ‘no’
```

Next, set the interface to `raw_ip` mode:

```bash
sudo ip link set wwan0 down
echo 'Y' | sudo tee /sys/class/net/wwan0/qmi/raw_ip
sudo ip link set wwan0 up
```

### Confirm raw-ip mode

Confirm it is in raw-ip mode with the following command:

```bash
sudo qmicli -d /dev/cdc-wdm0 --wda-get-data-format
```

Expected output: `Link Layer protocol: ‘raw-ip’`

### Connection to 5G Network

Finally, we connect to the network associated with the SIM card. On the chair's 5G network, the APN is `oai.ipv4`.

```bash
sudo qmicli -p -d /dev/cdc-wdm0 --device-open-net='net-raw-ip|net-no-qos-header' --wds-start-network="apn='oai.ipv4',ip-type=4" --client-no-release-cid
```

Successful output:

```text
Network started
Packet data handle: 4003082416
Service: 'wds'
CID: '15'
```

To obtain the IP address and other network parameters:

```bash
sudo udhcpc -q -f -i wwan0
```

If we check with `ifconfig`, the `wwan0` interface will appear active with an assigned IP. Now ping works correctly:

```bash
ping -I wwan0 www.google.com -c 5
```

### Exclusive 5G Usage

We can disable the WiFi connection:

```bash
sudo ifconfig wlan0 down
```

After a reboot, it is necessary to re-execute the connection command sequence.

<br />

## 3. Automatic Reconnection Configuration

For the Raspberry Pi to connect automatically to the 5G network, create an interface file:

```bash
sudo nano /etc/network/interfaces.d/wwan0
```

Content:

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

*Note: Ensure you include username and password in the qmicli command if your SIM requires it.*

**Activate connection:**

```bash
sudo ifup wwan0
```

**Deactivate connection:**

```bash
sudo ifdown wwan0
```
