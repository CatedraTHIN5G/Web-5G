---
title: "Copia de Seguridad de la Tarjeta SD"
title_es: "Copia de Seguridad de la Tarjeta SD"
summary: "Guide for creating full sector-by-sector backups of Raspberry Pi SD cards using Win32 Disk Imager."
summary_es: "Guía para realizar copias de seguridad completas sector a sector de tarjetas SD de Raspberry Pi usando Win32 Disk Imager."
tags: ["Raspberry Pi", "Backup", "SD Card", "Windows", "Tools"]
tags_es: ["Raspberry Pi", "Copia de Seguridad", "Tarjeta SD", "Windows", "Herramientas"]
date: 2024-05-15
docUrl: ""
codeUrl: ""
team: ["estudiante-jairo-tunon-diaz"]
---

## Copia de Seguridad Tarjeta SD

Para realizar copias de seguridad completas de una tarjeta SD se recomienda el uso del programa **Win32 Disk Imager**, ya que permite clonar el dispositivo de forma íntegra, sector a sector.

<br />

## Hacer Copia de Seguridad

El procedimiento para realizar una copia de seguridad de la tarjeta SD es el siguiente:

### 1) Creación del archivo de copia

En primer lugar, se debe crear un archivo con extensión `.img`, que será el contenedor de la copia de seguridad. Este archivo puede crearse inicialmente como un archivo vacío y posteriormente cambiarle la extensión a `.img`.

Este archivo almacenará una copia exacta del contenido de la tarjeta SD, por lo que su tamaño final será idéntico a la capacidad total del dispositivo original. Es necesario asegurarse de que el ordenador dispone de suficiente espacio libre para albergar dicho archivo.

### 2) Selección del dispositivo a clonar

Una vez creado el archivo `.img`, se abre el programa **Win32 Disk Imager** y se selecciona dicho archivo como destino de la copia. A continuación, se debe elegir correctamente la unidad correspondiente a la tarjeta SD conectada al ordenador mediante un lector USB.

Es fundamental verificar que la unidad seleccionada corresponde realmente a la tarjeta SD que se desea copiar, ya que el proceso se realizará sobre el dispositivo elegido.

### 3) Lectura del dispositivo

Tras seleccionar tanto el archivo `.img` como el dispositivo correcto, se inicia el proceso de copia mediante la opción de **Lectura** (Read). En este punto, el programa comienza a copiar todo el contenido de la tarjeta SD, incluyendo sistema operativo, particiones y datos, directamente al archivo `.img`.

Durante este proceso se muestra el progreso de la operación y, una vez finalizado, se obtiene una copia exacta de la tarjeta SD original.

<br />

## Restaurar Copia de Seguridad

El procedimiento para restaurar una copia de seguridad previamente creada es el siguiente:

### 1) Selección del archivo de copia

Se selecciona el archivo con extensión `.img` que contiene la copia de seguridad realizada anteriormente. Este archivo actuará como origen de los datos que se van a restaurar.

### 2) Selección del dispositivo de destino

A continuación, se elige el dispositivo donde se desea restaurar la copia de seguridad. La tarjeta SD de destino debe tener la misma capacidad de almacenamiento que la tarjeta original utilizada para crear la copia.

Es importante tener en cuenta que este proceso **sobrescribirá completamente** el contenido del dispositivo seleccionado.

### 3) Escritura de la copia

Una vez seleccionado el archivo `.img` y el dispositivo de destino, se inicia el proceso de restauración mediante la opción de **Escritura** (Write). El contenido del archivo se copia íntegramente en la tarjeta SD, reproduciendo exactamente la estructura, configuración y datos del sistema original.

Tras finalizar el proceso, la tarjeta SD queda lista para su uso, con el mismo contenido que tenía en el momento en que se realizó la copia de seguridad.

