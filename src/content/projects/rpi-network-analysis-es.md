---
title: "Raspberry Pi Network Monitoring & Diagnostics"
title_es: "Monitorización y Diagnóstico de Red en Raspberry Pi"
summary: "Python scripts for monitoring network interfaces, retrieving IP/SSID, tracking connected devices, and measuring signal strength on Raspberry Pi."
summary_es: "Scripts de Python para monitorizar interfaces de red, obtener IP/SSID, rastrear dispositivos conectados y medir la intensidad de la señal en Raspberry Pi."
tags: ["Raspberry Pi", "Python", "Networking", "Monitoring", "WiFi"]
tags_es: ["Raspberry Pi", "Python", "Redes", "Monitorización", "WiFi"]
date: 2024-04-10
docUrl: ""
codeUrl: ""
team: ["estudiante-jairo-tunon-diaz"]
---

## Datos De La Red

A continuación, se muestran dos funciones de Python para obtener diferente información sobre la interfaz de red deseada.

### Obtener SSID

```python
import subprocess

def obtener_ssid(interfaz):
    try:
        resultado = subprocess.check_output(['iwgetid', '-r', '-a', interfaz])
        ssid = resultado.decode('utf-8').strip()
        return ssid
    except subprocess.CalledProcessError:
        return "No se pudo obtener el SSID"

# Ejemplo de uso
interfaz_wifi = 'wlan0'  # Reemplaza con tu interfaz WiFi
ssid_actual = obtener_ssid(interfaz_wifi)
print(f"El SSID de la red en la interfaz {interfaz_wifi} es: {ssid_actual}")
```

Salida por consola:

```text
El SSID de la red en la interfaz wlan0 es: NombreDeLaRed
```

### Obtener dirección IP

```python
import subprocess

def obtener_ip(interfaz):
    try:
        resultado = subprocess.check_output(['ip', 'addr', 'show', interfaz])
        lineas = resultado.decode('utf-8').split('\n')
        for linea in lineas:
            if 'inet ' in linea:
                ip = linea.split()[1].split('/')[0]
                return ip
        return "No se pudo obtener la IP"
    except subprocess.CalledProcessError:
        return "No se pudo obtener la IP"

# Ejemplo de uso
interfaz_red = 'eth0'  # Reemplaza con tu interfaz de red
ip_actual = obtener_ip(interfaz_red)
print(f"La IP de la red en la interfaz {interfaz_red} es: {ip_actual}")
```

Salida por consola:

```text
La IP de la red en la interfaz eth0 es: 192.168.1.100
```

<br />

## Interfaces de red utilizadas en el proyecto del robot

En el proyecto del robot las interfaces utilizadas son:

*   `wlan0` ⟹ WiFi integrado en la Raspberry Pi.
*   `wlan1` ⟹ Punto de acceso WiFi generado por la Raspberry Pi.
*   `wwan0` ⟹ Interfaz de red 5G.

<br />

## Monitorización De Punto De Acceso

Con la siguiente función se puede monitorizar el número de dispositivos conectados a una interfaz de red.

```python
import subprocess

def obtener_numero_dispositivos_conectados(interfaz):
    try:
        resultado = subprocess.check_output(['iw', 'dev', interfaz, 'station', 'dump'])
        lineas = resultado.decode('utf-8').split('\n')
        dispositivos_conectados = [linea for linea in lineas if "Station" in linea]
        return len(dispositivos_conectados)
    except subprocess.CalledProcessError:
        return "No se pudo obtener la información de dispositivos conectados"

# Ejemplo de uso
interfaz_wifi = 'wlan1'  # Reemplaza con tu interfaz WiFi
numero_dispositivos = obtener_numero_dispositivos_conectados(interfaz_wifi)
print(f"El número de dispositivos conectados a {interfaz_wifi} es: {numero_dispositivos}")
```

Salida por consola:

```text
El número de dispositivos conectados a wlan1 es: 3
```

<br />

## Monitorización De Señal

Con la siguiente función implementada en Python se puede obtener el nivel de señal de la interfaz deseada.

```python
import subprocess

def obtener_nivel_senal(interfaz):
    try:
        resultado = subprocess.check_output(['iwconfig', interfaz])
        lineas = resultado.decode('utf-8').split('\n')
        for linea in lineas:
            if "Signal level" in linea:
                nivel_senal = linea.split("Signal level=")[1].split(" ")[0]
                return nivel_senal
        return "No se pudo obtener el nivel de señal"
    except subprocess.CalledProcessError:
        return "No se pudo obtener la información de la interfaz"

# Ejemplo de uso
interfaz_wifi = 'wlan0'  # Reemplaza con tu interfaz WiFi
nivel_senal = obtener_nivel_senal(interfaz_wifi)
print(f"El nivel de señal en {interfaz_wifi} es: {nivel_senal} dBm")
```

Salida por consola:

```text
El nivel de señal en wlan0 es: -45 dBm
```

