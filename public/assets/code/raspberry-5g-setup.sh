#!/bin/bash

# Raspberry Pi as 5G Access Point Setup Script
# Based on documentation by Daniel Solares Ardisana

echo "Starting 5G Access Point Configuration..."

# 1. Install necessary software
echo "Installing dependencies..."
sudo apt update
sudo apt install -y dnsmasq hostapd iptables minicom

# 2. Enable hostapd
echo "Enabling hostapd..."
sudo systemctl unmask hostapd
sudo systemctl enable hostapd

# 3. 5G Module Configuration (Manual steps reminder)
echo "----------------------------------------------------------------"
echo "IMPORTANT: The following steps require interaction with the 5G modem via minicom."
echo "Run 'minicom -D /dev/ttyUSB2 -b 115200' and execute:"
echo "  AT"
echo "  AT+QCFG=\"usbnet\",1"
echo "  AT+CFUN=1,1  (Wait for reboot)"
echo "  AT+CGDCONT=1,\"IP\",\"oai.ipv4\""
echo "  AT+CFUN=1,1"
echo "Then check 'ifconfig' for usb0 interface with IP 192.168.225.0/24"
echo "----------------------------------------------------------------"

# 4. WiFi AP Configuration
echo "Configuring WiFi Access Point..."

# Clear wpa_supplicant
echo "" | sudo tee /etc/wpa_supplicant/wpa_supplicant.conf

# Configure hostapd.conf
cat <<EOF | sudo tee /etc/hostapd/hostapd.conf
interface=wlan0
hw_mode=g
channel=10
wmm_enabled=1
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
ssid=RPIthin5g
wpa_passphrase=catedra5g
EOF

# Point daemon to config
sudo sed -i 's|#DAEMON_CONF=""|DAEMON_CONF="/etc/hostapd/hostapd.conf"|g' /etc/default/hostapd

# 5. DHCP Configuration (dnsmasq)
echo "Configuring DHCP..."
echo "dhcp-range=interface:br0,192.168.10.2,192.168.10.10,255.255.255.0,24h" | sudo tee -a /etc/dnsmasq.conf

# 6. Network Bridge Configuration
echo "Configuring Network Bridge..."
echo "denyinterfaces wlan0 eth0" | sudo tee -a /etc/dhcpcd.conf

# Setup bridge commands (to be run, but persistent config requires network interfaces file edit usually, 
# here we follow the guide's runtime commands)
sudo ip link add name br0 type bridge
sudo ip address add dev br0 192.168.10.1/24
sudo ip link set br0 up
sudo ip link set wlan0 master br0
sudo ip link set eth0 master br0

# 7. Traffic Forwarding & NAT
echo "Configuring Traffic Forwarding..."
sudo sed -i 's|#net.ipv4.ip_forward=1|net.ipv4.ip_forward=1|g' /etc/sysctl.conf
sudo sysctl -p

# IPTV rules
sudo iptables -A FORWARD -i br0 -o usb0 -j ACCEPT
sudo iptables -A FORWARD -i usb0 -o br0 -m state --state ESTABLISHED,RELATED -j ACCEPT
sudo iptables -t nat -A POSTROUTING -o usb0 -j MASQUERADE

# Save iptables (optional, requires iptables-persistent)
# sudo netfilter-persistent save

# Restart services
echo "Restarting services..."
sudo systemctl restart hostapd dnsmasq

echo "Configuration complete. Please check connectivity."
