---
title: "Conexión de Cámara a Raspberry Pi"
title_es: "Conexión de Cámara a Raspberry Pi"
summary: "Guide for connecting and configuring the Raspberry Pi Camera Module, capturing video with FFMPEG/raspivid, and setting up a web streaming server."
summary_es: "Guía para conectar y configurar el Módulo de Cámara de Raspberry Pi, capturar video con FFMPEG/raspivid y configurar un servidor de streaming web."
tags: ["Raspberry Pi", "Camera", "FFMPEG", "Streaming", "Python"]
tags_es: ["Raspberry Pi", "Cámara", "FFMPEG", "Streaming", "Python"]
date: 2024-03-01
docUrl: ""
codeUrl: ""
team: ["estudiante-jairo-tunon-diaz"]
---

## Conectar Módulo De Cámara

En este caso vamos a usar el modelo: **Raspberry Pi Camera Board v2 (8 Mp)**.

Este módulo de cámara de 8 Mp es capaz de capturar video de 1080px e imágenes, se puede conectar a todos los modelos de Raspberry Pi. Listo para conectar y usar, muy adecuado para fotografiar por lapsos, grabar video o para usarlo en aplicaciones de seguridad y en detección de movimientos. Sólo hay que conectar el cable incluido al puerto CSI de la Raspberry Pi.

El módulo es pequeño, mide **25mm x 23mm x 9mm** y tiene un peso de 3g, haciéndola perfecta para aplicaciones móviles u otras en donde el peso es un factor muy importante.

El sensor tiene una resolución de 8 megapíxeles y tiene un lente de enfoque. En cuanto a las imágenes, la cámara es capaz de tomar imágenes estáticas hasta de **3280 x 2464 pixeles** y videos de 1080p30 (1830p30 según nota original).

Todos los modelos actuales de Raspberry Pi tienen un puerto para conectar el módulo de la cámara.

<br />

## Instalación Física

Asegúrese de que su Raspberry Pi esté apagada.

**Pasos a seguir:**

1.  Localice el puerto del módulo de la cámara.
2.  Tire suavemente hacia arriba de los bordes del clip de plástico del puerto.
3.  Inserte el cable plano del módulo de la cámara.
    *(Nota: asegúrese de que el cable esté en la dirección correcta. El lado azul del cable va mirando hacia el conector jack y de los puertos USB)*.
4.  Vuelva a colocar el clip de plástico en su lugar.

Podemos comprobar si la cámara ha sido reconocida por la Raspberry Pi con el comando:

```bash
vcgencmd get_camera
```

<br />

## Configuración Utilizando FFMPEG

La captura de vídeo de la cámara RPI con `ffmpeg` puede variar de menos del 5% al 100% de la CPU (RPI Zero) dependiendo de si `ffmpeg` utiliza la aceleración de hardware o no.

**Capturar video:**

```bash
ffmpeg -f video4linux2 -input_format h264 -video_size 1280x720 -framerate 30 -i /dev/video0 -vcodec copy -an test.h264
```

**Capturar una imagen:**

```bash
ffmpeg -f video4linux2 -input_format mjpeg -video_size 1280x720 -i /dev/video0 -vframes 1 -f mjpeg -
```

<br />

## Configuración por VNC

**Pasos a seguir:**

1.  Enciende tu Raspberry Pi.
2.  Ingresa por VNC desde tu ordenador a tu Raspberry.
3.  Vaya al menú principal y abra **Raspberry Pi Configuration**.

NOTA: también se puede utilizar la línea de comandos:

```bash
sudo raspi-config
```

4.  Seleccione la pestaña **Interfaces** y asegúrese de que la cámara esté habilitada (**enabled**).
5.  Reinicia tu Raspberry Pi.

Una vez reiniciada, pasaremos a hacer unos cambios en VNC dentro del escritorio de Raspberry. Al ejecutar algunos comandos nos mostrará la vista previa de lo que va a capturar; en VNC no es posible ver esto a menos de que hagamos estos cambios.

**Configuración en VNC (escritorio):**

1.  Lo primero es dirigirnos al icono de VNC y dar clic.
2.  En el menú **Options**, vaya a la pestaña **Troubleshooting**.
3.  Daremos clic en la casilla **Enable direct capture mode** y después daremos clic en **Apply**.

Esto nos permitirá ver la vista previa de lo que está capturando nuestro módulo cámara. La pantalla se pondrá negra unos segundos y cuando recupere la imagen estará listo. No es necesario, pero puedes reiniciar la Raspberry para comenzar con el siguiente paso.

<br />

## Uso de raspistill (Captura de imágenes)

`raspistill` es una herramienta de comandos para capturar imágenes de la cámara.

Para verificar que la cámara está instalada correctamente y usar la cámara sólo como un visor, sin guardar una foto, abriendo la terminal ingresa este comando:

```bash
raspistill -t 0
```

Nos dará de seguro una imagen borrosa en el caso del módulo HQ, para el módulo V2 no tendrá mayor problema.

**Capturar Imagen:**

Ahora deberías ver una imagen clara y podrás tomar una fotografía de prueba ingresando el comando:

```bash
raspistill -o test.jpg
```

Cuando presione ENTER, aparecerá una imagen de vista previa en vivo, y después de un período predeterminado de cinco segundos, la cámara capturará una única imagen fija. Esto se guardará en su carpeta de inicio con el nombre `test.jpg`.

<br />

## Captura de Video con raspivid

Para grabar videos, `raspivid` es lo que necesitas. Pruébalo con este comando de Terminal:

```bash
raspivid -t 10000 -o testvideo.h264
```

*   `-t 10000` es el tiempo que va a estar grabando video, 10000 milisegundos serían 10 segundos de grabación.
*   `.h264` es el formato de video para reproducir en VLC, reproductor que incluye el Raspberry Pi OS.

En caso de que quieras cambiar el formato por MP4, que es un formato más común y amigable para edición, al final se dejan algunos comandos y ligas para esto.

<br />

## Servidor Web De Cámara

Para lanzar el programa, se necesita instalar las librerías `aiortc` y `aiohttp` principalmente. Se puede hacer a través de `pip` (recuerda hacerlo con `sudo`):

```bash
sudo pip install aiortc
sudo pip install aiohttp
```

Una vez cumplidos los requisitos y el proyecto descargado, se ha de ir a la carpeta principal (`webcam_robot`). Aquí ya se puede ejecutar el código mediante el comando:

```bash
python3 webcam.py
```

También se pueden añadir argumentos para modificar la configuración por defecto del streaming. Por ejemplo:

```bash
python webcam.py --video-codec=video/H264 --resolution "320x240"
```

**Argumentos relevantes:**

*   `--resolution`: cambia la resolución de la cámara (p.ej. `640x480`).
*   `--framerate`: para cambiar las imágenes por segundo del streaming (p.ej. `30`). Linux selecciona de forma automática la interfaz de la cámara.
*   `--video-codec`: para cambiar el codec de video que se usa. En mi experiencia con la mayoría de navegadores, sólo soportan `VP8` y `H264` (sería poner `video/VP8` o `video/H264`).

Una vez con el programa lanzado, si todo ha salido bien, podremos conectarnos a la página web con un navegador usando la IP del ordenador con el puerto 8080 (p.ej. `http://192.168.0.244:8080/`). Se pulsa el botón que aparece en el medio de la pantalla para iniciar la retransmisión de video, y después de unos segundos aparece el feed en directo.

### Atención

*   **Firefox** da problemas con esta implementación, posiblemente porque no estamos usando HTTPS, así que se ha de abrir en otro navegador (Chrome o Edge valen).
*   A partir de cierta resolución (HD), el video se ve muy mal (**H264**): es cuestión de cómo está implementado el codec en la librería de `aiortc`.
    Si se observa el archivo `\src\aiortc\codecs\h264.py`, se puede observar que el bitrate está limitado, por lo que se ha de incrementar todos los márgenes si se quiere transmitir con buena calidad y tasa de frames.
*   A partir de cierta resolución (HD), la retransmisión usa mucho ancho de banda (**VP8**). Si se observa el archivo `\src\aiortc\codecs\vpx.py`, se puede observar que el bitrate está limitado, por lo que se han de ajustar los márgenes.

