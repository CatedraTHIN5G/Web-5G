---
title: "SD Card Backup Guide"
title_es: "Copia de Seguridad de la Tarjeta SD"
summary: "A practical guide to data preservation for Raspberry Pi projects. This tutorial covers the process of creating full, sector-by-sector backups of SD cards using Win32 Disk Imager, ensuring that complex operating system configurations and project data can be easily restored in case of failure."
summary_es: "Guía práctica para la preservación de datos en proyectos con Raspberry Pi. Este tutorial cubre el proceso de crear copias de seguridad completas sector a sector de tarjetas SD usando Win32 Disk Imager, asegurando que las configuraciones complejas del sistema operativo y los datos del proyecto puedan restaurarse fácilmente en caso de fallo."
tags: ["Raspberry Pi", "Backup", "SD Card", "Windows", "Tools"]
tags_es: ["Raspberry Pi", "Copia de Seguridad", "Tarjeta SD", "Windows", "Herramientas"]
date: 2024-05-15
docUrl: ""
codeUrl: ""
team: ["estudiante-jairo-tunon-diaz"]
---

## SD Card Backup

To perform full backups of an SD card, using the **Win32 Disk Imager** program is recommended, as it allows cloning the device entirely, sector by sector.

<br />

## Making a Backup

The procedure to back up the SD card is as follows:

### 1) Creating the Backup File

First, create a file with the `.img` extension, which will be the container for the backup. This file can be created initially as an empty file and then have its extension changed to `.img`.

This file will store an exact copy of the SD card contents, so its final size will be identical to the total capacity of the original device. Ensure that the computer has enough free space to host this file.

### 2) Selecting the Device to Clone

Once the `.img` file is created, open **Win32 Disk Imager** and select that file as the backup destination. Next, correctly choose the drive corresponding to the SD card connected to the computer via a USB reader.

It is fundamental to verify that the selected drive actually corresponds to the SD card you wish to copy, as the process will be performed on the chosen device.

### 3) Reading the Device

After selecting both the `.img` file and the correct device, start the copy process using the **Read** option. At this point, the program begins copying the entire contents of the SD card, including the operating system, partitions, and data, directly to the `.img` file.

During this process, the operation progress is shown, and once finished, an exact copy of the original SD card is obtained.

<br />

## Restoring a Backup

The procedure to restore a previously created backup is as follows:

### 1) Selecting the Backup File

Select the file with the `.img` extension that contains the previously made backup. This file will act as the source of the data to be restored.

### 2) Selecting the Destination Device

Next, choose the device where you wish to restore the backup. The destination SD card must have the same storage capacity as the original card used to create the copy.

It is important to note that this process will **completely overwrite** the contents of the selected device.

### 3) Writing the Copy

Once the `.img` file and the destination device are selected, start the restoration process using the **Write** option. The file content is copied entirely onto the SD card, exactly reproducing the structure, configuration, and data of the original system.

After the process is finished, the SD card is ready for use, with the same content it had at the moment the backup was made.

